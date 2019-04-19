#!/usr/bin/env node
'use strict';

/**
 * Expressjs Template Application
 * @version 4.0.1
 * @author skitsanos
 */

const program = require('commander');
const winston = require('winston');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

//express bits
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const loggingFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.splat(),
    winston.format.printf(info =>
    {
        return `${moment().format('YYYYMMDD HH:mm:ss.SSSS')} ${info.level}: ${info.message}`;
    }));

const log = winston.createLogger({
    exitOnError: false,
    transports: [
        new winston.transports.Console({
            format: loggingFormat
        })
    ]
});

const app = {
    appRoot: __dirname,
    config: require('./config/app'),
    siteAccess: require('./config/access.json'),
    meta: require('./package'),
    express: express(),
    port: process.env.PORT || 3000,
    server: null,

    handlers: {
        onError: (error) =>
        {
            if (error.syscall !== 'listen')
            {
                throw error;
            }

            const bind = typeof app.port === 'string'
                ? 'Pipe ' + app.port
                : 'Port ' + app.port;

            // handle specific listen errors with friendly messages
            switch (error.code)
            {
                case 'EACCES':
                    log.error(bind + ' requires elevated privileges');
                    process.exit(1);
                    break;

                case 'EADDRINUSE':
                    log.error(bind + ' is already in use');
                    process.exit(1);
                    break;

                default:
                    throw error;
            }
        },

        onListening: () =>
        {
            const addr = app.server.address();
            const bind = typeof addr === 'string'
                ? 'pipe ' + addr
                : 'port ' + addr.port;
            log.info(`Listening on ${bind}`);
        }
    },

    utils: {
        parseHandlers: (p) =>
        {
            for (const f of fs.readdirSync(p, {withFileTypes: true}))
            {
                if (f.isFile())
                {
                    //load command
                    const handlerPath = path.join(p, f.name);
                    const ExpressHandle = require(handlerPath);
                    const cmd = new ExpressHandle(app.express, log);
                    cmd.fullPath = handlerPath;
                    cmd.install();
                }
            }
        },

        loadRouteHandlers: () =>
        {
            return new Promise((resolve, reject) =>
            {
                const path_routes = path.join(__dirname, '/routes/');

                if (!fs.existsSync(path_routes))
                {
                    fs.mkdir(path_routes);
                }

                app.utils.parseHandlers(path_routes);

                return resolve(true);
            });
        },

        registerPartials: () =>
        {
            return new Promise((resolve, reject) =>
            {
                app.viewEngine.registerPartials(path.join(__dirname, '/views/partials'), (err) =>
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        resolve();
                    }
                });
            });

        },

        render: (req, res, template, data) =>
        {
            res.render(template, data, (render_error, html) =>
            {
                if (render_error)
                {
                    res.status(500);
                    res.send(render_error.message);
                }
                else
                {
                    res.send(html);
                }
            });
        }
    },

    middleware: {
        notFound: (req, res, next) =>
        {
            const errMessage = `Not found: [${req.method}] ${req.url}`;
            if (app.config.errors.logHttpErrors)
            {
                log.error(errMessage);
            }

            const err = new Error(errMessage);
            err.status = 404;
            next(err);
        },

        siteError: (err, req, res, next) =>
        {
            log.error(`Error occurred: ${err.message}`);
            if (app.config.errors.showStack)
            {
                log.info(err.stack);
            }

            if (app.config.errors.reportErrorsAs === 'json')
            {
                //res.contentType('application/json');
                res.json({error: {message: err.message}, request: {method: req.method, path: req.path}});
            }
            else
            {
                if (req.accepts('html'))
                {
                    //res.render('404', {url: req.url});
                    res.send(err.message);
                    return;
                }

                // respond with json
                if (req.accepts('json'))
                {
                    //res.contentType('application/json');
                    res.json({error: {message: err.message}, request: {method: req.method, path: req.path}});
                }
            }
        },

        siteAccess: (req, res, next) =>
        {
            //console.log(req.path);
            //console.log((req.session.user !== undefined ? req.session.user.username : 'anonymous') + ' - ' + req.path);

            if (app.siteAccess.public.some(item =>
                {
                    if (item.rule === undefined)
                    {
                        return item === req.path;
                    }
                    else
                    {
                        let matchedValue = req.path.match(new RegExp(item.rule));

                        return matchedValue !== null;
                    }
                })
                || req.path.startsWith('/ui'))
            {
                next();
            }
            else
            {
                if (!req.session || !req.session.authenticated)
                {
                    log.info(`Redirecting to /login for ${req.path}`);
                    res.redirect('/login');
                }
                else
                {
                    console.log(req.path);
                    next();
                }
            }
        }
    },

    installHandlers: () =>
    {
        //[1] site access rules
        app.express.all('*', app.middleware.siteAccess);

        //[2] routes handlers
        app.utils.loadRouteHandlers().then(() =>
        {
            log.info('Route handlers loaded.');
        }).catch(err =>
        {
            log.error(err);
        });

        //[3] catch 404 and forward to error handler
        app.express.use(app.middleware.notFound);

        //[4] error handler to render details back to user
        app.express.use(app.middleware.siteError);
    },

    init: () =>
    {
        log.info(`${app.meta.name} ver. ${app.meta.version}, PID: ${process.pid}`);

        program
            .version(`${app.meta.version}`, '-v, --version')
            .usage('-port -path')
            .option('-p, --port <port>', 'port')
            .parse(process.argv);

        //JSON body parsing
        if (app.config.parsers.json)
        {
            app.express.use(bodyParser.json());
        }

        //URL-Encoded parsing
        if (app.config.parsers.urlEncoded)
        {
            log.info(`Setting upload limit to ${app.config.uploadLimit}`);
            app.express.use(bodyParser.urlencoded({
                extended: true,
                limit: app.config.uploadLimit
            }));
        }

        //Cookies parsing
        if (app.config.parsers.cookies)
        {
            app.express.use(cookieParser());
        }

        //Forms and Uploads parsing
        if (app.config.parsers.forms)
        {
            app.express.set('uploadDir', __dirname + app.config.uploads.storage);
            app.express.set('uploadMaxFileSize', app.config.uploads.limit);

            app.express.formidable = require('formidable');
        }

        //View engine support
        if (app.config.viewEngine)
        {
            //todo: add support for other engines via consolidate.js - https://github.com/tj/consolidate.js
            app.viewEngine = require(app.config.viewEngine);
            app.express.set('view engine', 'html');
            app.express.engine('html', app.viewEngine.__express);

            app.utils.registerPartials().then(r =>
            {
                log.info(`Registered View Partials: ${Object.keys(app.viewEngine.handlebars.partials).length}`);
            }).catch(err =>
            {
                log.error(err.message);
            });
        }

        //Mount SiteAdmin CMS support
        if (app.config.cms.enabled)
        {
            const SiteAdminCMS = require(path.join(__dirname, 'siteadmincms'));
            const cms = new SiteAdminCMS(app.express, app.config.cms.mountPath);
        }

        app.installHandlers();

        if (!program.port)
        {
            log.info(`Port is not set, will be using ${app.port} as default`);
        }
        else
        {
            app.port = program.port;
            app.express.set('port', port);
        }

        app.express.set('x-powered-by', false);
        app.express.set('strict routing', app.config.strictRouting);

        //ref logging utility
        app.express.set('log', log);

        process.title = `${app.meta.name} on port ${app.port}`;

        app.server = http.createServer(app.express);
        app.server.listen(app.port);
        app.server.on('error', app.handlers.onError);
        app.server.on('listening', app.handlers.onListening);
    }
};

global.app = app;

app.init();