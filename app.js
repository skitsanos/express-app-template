#!/usr/bin/env node
'use strict';

/**
 * Express application bootstrap (modernised)
 * @author skitsanos
 */

const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const {createServer} = require('http');

const {Command} = require('commander');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const formidable = require('formidable');
const createHttpError = require('http-errors');
const winston = require('winston');

const config = require('./config/app.json');
const accessRules = require('./config/access.json');
const pkg = require('./package.json');

const DEFAULT_PORT = 3000;
const DEFAULT_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10MB

const logger = createLogger();

function createLogger()
{
    const format = winston.format.printf(({timestamp, level, message, ...meta}) =>
    {
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${extra}`;
    });

    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        exitOnError: false,
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss.SSS'}),
            format
        ),
        transports: [
            new winston.transports.Console()
        ]
    });
}

async function ensureUploadPath(app)
{
    const uploadConfig = config.uploads || {};
    const storageSetting = uploadConfig.storage || './uploads';
    const uploadDir = path.resolve(__dirname, storageSetting.replace(/^\//, ''));
    const uploadLimit = uploadConfig.limit || DEFAULT_UPLOAD_LIMIT;

    await fsp.mkdir(uploadDir, {recursive: true});

    app.set('uploadDir', uploadDir);
    app.set('uploadMaxFileSize', uploadLimit);
    app.locals.uploadSettings = {dir: uploadDir, maxFileSize: uploadLimit};
}

function configureViewEngine(app)
{
    if (!config.viewEngine)
    {
        return;
    }

    const viewEngineModule = require(config.viewEngine);
    const extension = config.viewExtension || 'html';

    if (typeof viewEngineModule.__express !== 'function')
    {
        logger.warn(`View engine ${config.viewEngine} does not expose __express handler.`);
        return;
    }

    app.set('views', path.join(__dirname, 'views'));
    app.engine(extension, viewEngineModule.__express);
    app.set('view engine', extension);

    if (typeof viewEngineModule.registerPartials === 'function')
    {
        const partialsDir = path.join(__dirname, 'views', 'partials');
        if (fs.existsSync(partialsDir))
        {
            viewEngineModule.registerPartials(partialsDir, (err) =>
            {
                if (err)
                {
                    logger.warn(`Failed to register view partials: ${err.message}`);
                }
                else
                {
                    const partialSource = viewEngineModule.handlebars ? viewEngineModule.handlebars.partials : {};
                    const partialNames = Object.keys(partialSource || {});
                    logger.info(`Registered ${partialNames.length} view partial(s).`);
                }
            });
        }
    }
}

function configureSession(app)
{
    const sessionConfig = config.session || {};
    if (!sessionConfig.enabled)
    {
        return;
    }

    let secret = process.env.SESSION_SECRET || sessionConfig.secret;
    let generatedSecret = false;

    if (!secret)
    {
        secret = require('crypto').randomBytes(32).toString('hex');
        generatedSecret = true;
        logger.warn('SESSION_SECRET was not provided; generated an ephemeral secret for this process. Set SESSION_SECRET in production.');
    }

    const cookie = sessionConfig.cookie || {};

    app.use(session({
        secret,
        resave: Boolean(sessionConfig.resave),
        saveUninitialized: Boolean(sessionConfig.saveUninitialized),
        cookie: {
            httpOnly: cookie.httpOnly !== false,
            sameSite: cookie.sameSite || 'lax',
            secure: Boolean(cookie.secure),
            maxAge: cookie.maxAge != null ? cookie.maxAge : undefined
        }
    }));

    logger.info(`Session middleware enabled${generatedSecret ? ' (ephemeral secret)' : ''}.`);
}

function configureMiddleware(app)
{
    app.disable('x-powered-by');
    app.set('strict routing', Boolean(config.strictRouting));

    app.locals.logger = logger;
    app.locals.config = config;
    app.locals.pkg = pkg;
    app.locals.runtime = {node: process.version};

    app.use(helmet());
    app.use(compression());

    if (config.parsers && config.parsers.json)
    {
        app.use(express.json({limit: config.bodyLimit || '1mb'}));
    }

    if (config.parsers && config.parsers.urlEncoded)
    {
        app.use(express.urlencoded({extended: true, limit: config.bodyLimit || '1mb'}));
    }

    if (config.parsers && config.parsers.cookies)
    {
        app.use(cookieParser());
    }

    if (config.parsers && config.parsers.forms)
    {
        const formidableFactory = typeof formidable === 'function' ? formidable : formidable.formidable;
        if (typeof formidableFactory === 'function')
        {
            app.locals.formidable = formidableFactory;
        }
        else
        {
            logger.warn('Unable to load Formidable factory; file uploads will be disabled.');
        }
    }

    app.use(morgan('combined', {
        stream: {
            write: (message) =>
            {
                logger.info(message.trim());
            }
        }
    }));
}

function compileAccessRules(rules = [])
{
    return rules
        .map((rule) =>
        {
            if (typeof rule === 'string')
            {
                return (pathname) => pathname === rule;
            }

            if (rule && typeof rule.rule === 'string')
            {
                const regex = new RegExp(rule.rule);
                return (pathname) => regex.test(pathname);
            }

            return null;
        })
        .filter(Boolean);
}

function createAccessMiddleware()
{
    const checks = compileAccessRules(accessRules.public || []);

    return (req, res, next) =>
    {
        const pathname = req.path;
        const isPublic = checks.some((fn) => fn(pathname)) || pathname.startsWith('/ui');

        if (isPublic)
        {
            return next();
        }

        if (req.session && req.session.authenticated)
        {
            return next();
        }

        logger.info(`Access denied for ${pathname}, redirecting to /login.`);

        if ((config.errors && config.errors.reportErrorsAs === 'json') || req.accepts('json'))
        {
            return res.status(401).json({error: {message: 'Authentication required'}, request: {method: req.method, path: pathname}});
        }

        return res.redirect('/login');
    };
}

async function loadRoutes(app)
{
    const routesDir = path.join(__dirname, 'routes');
    let entries;

    try
    {
        entries = await fsp.readdir(routesDir, {withFileTypes: true});
    }
    catch (error)
    {
        if (error.code === 'ENOENT')
        {
            logger.warn('Routes directory is missing; no additional routes were loaded.');
            return;
        }

        throw error;
    }

    for (const entry of entries)
    {
        if (!entry.isFile() || !entry.name.endsWith('.js'))
        {
            continue;
        }

        const fullPath = path.join(routesDir, entry.name);

        try
        {
            const moduleExport = require(fullPath);
            const resolvedExport = moduleExport && typeof moduleExport === 'object' && typeof moduleExport.default === 'function'
                ? moduleExport.default
                : moduleExport;

            if (typeof resolvedExport === 'function')
            {
                await Promise.resolve(resolvedExport({app, logger, config, pkg}));
                logger.info(`Loaded route module: ${entry.name}`);
            }
            else if (resolvedExport && resolvedExport.router)
            {
                const mountPath = resolvedExport.mountPath || '/';
                app.use(mountPath, resolvedExport.router);
                logger.info(`Mounted router from ${entry.name} on ${mountPath}`);
            }
            else
            {
                logger.warn(`Route module ${entry.name} does not export a function or {router, mountPath}.`);
            }
        }
        catch (error)
        {
            logger.error(`Failed to load route module ${entry.name}: ${error.message}`);
        }
    }
}

function registerFallbackHandlers(app)
{
    app.use((req, res, next) =>
    {
        const message = `Not found: [${req.method}] ${req.originalUrl}`;
        if (config.errors && config.errors.logHttpErrors)
        {
            logger.warn(message);
        }

        next(createHttpError(404, message));
    });

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) =>
    {
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal Server Error';

        const logFn = status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
        logFn(message);

        if (status >= 500 && config.errors && config.errors.showStack && err.stack)
        {
            logger.error(err.stack);
        }

        res.status(status);

        const wantsJson = (config.errors && config.errors.reportErrorsAs === 'json') || req.accepts('json');
        if (wantsJson)
        {
            return res.json({
                error: {message},
                request: {method: req.method, path: req.originalUrl}
            });
        }

        return res.type('text/plain').send(message);
    });
}

async function mountCms(app)
{
    if (!config.cms || !config.cms.enabled)
    {
        return;
    }

    try
    {
        const CmsModule = require(path.join(__dirname, 'siteadmincms'));
        const mountPath = config.cms.mountPath || '/cms';

        if (typeof CmsModule === 'function')
        {
            try
            {
                // Try constructor-style first.
                // eslint-disable-next-line new-cap
                const instance = new CmsModule(app, mountPath);
                logger.info('SiteAdmin CMS mounted.');
                return instance;
            }
            catch (ctorError)
            {
                try
                {
                    CmsModule(app, mountPath);
                    logger.info('SiteAdmin CMS mounted.');
                }
                catch (invokeError)
                {
                    logger.error(`Failed to initialise SiteAdmin CMS module: ${invokeError.message}`);
                }
            }
        }
        else if (CmsModule && typeof CmsModule.default === 'function')
        {
            CmsModule.default(app, mountPath);
            logger.info('SiteAdmin CMS mounted.');
        }
        else
        {
            logger.warn('SiteAdmin CMS module does not export a function.');
        }
    }
    catch (error)
    {
        logger.error(`Failed to mount SiteAdmin CMS: ${error.message}`);
    }
}

function handleServerError(error, port)
{
    if (error.syscall !== 'listen')
    {
        throw error;
    }

    const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

    switch (error.code)
    {
        case 'EACCES':
            logger.error(`${bind} requires elevated privileges.`);
            process.exit(1);
            break;

        case 'EADDRINUSE':
            logger.error(`${bind} is already in use.`);
            process.exit(1);
            break;

        default:
            throw error;
    }
}

async function bootstrap()
{
    const program = new Command();

    program
        .version(pkg.version, '-v, --version', 'Output the current version')
        .option('-p, --port <port>', 'Port to listen on', (value) => parseInt(value, 10))
        .option('-H, --host <host>', 'Hostname to bind', process.env.HOST || '0.0.0.0')
        .parse(process.argv);

    const options = program.opts();
    const port = options.port || parseInt(process.env.PORT, 10) || DEFAULT_PORT;
    const host = options.host || process.env.HOST || '0.0.0.0';

    const app = express();

    await ensureUploadPath(app);
    configureViewEngine(app);
    configureSession(app);
    configureMiddleware(app);

    app.use(createAccessMiddleware());

    await loadRoutes(app);
    await mountCms(app);
    registerFallbackHandlers(app);

    const server = createServer(app);
    server.listen(port, host, () =>
    {
        logger.info(`${pkg.name} v${pkg.version} listening on http://${host}:${port} (pid ${process.pid})`);
    });
    server.on('error', (err) => handleServerError(err, port));
}

process.on('unhandledRejection', (reason) =>
{
    logger.error(`Unhandled promise rejection: ${reason instanceof Error ? reason.stack : reason}`);
});

process.on('uncaughtException', (error) =>
{
    logger.error(`Uncaught exception: ${error.stack || error.message}`);
    process.exit(1);
});

bootstrap().catch((error) =>
{
    logger.error(`Fatal error during bootstrap: ${error.stack || error.message}`);
    process.exit(1);
});
