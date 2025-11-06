const {Router} = require('express');
const formidable = require('formidable');
const createHttpError = require('http-errors');

module.exports = ({app, logger}) =>
{
    const router = Router();

    router.head('/upload', (_req, res) => res.sendStatus(204));

    router.get('/upload', (req, res) =>
    {
        const meta = app.locals.pkg || {};

        res.json({
            meta: {
                name: meta.name,
                description: meta.description,
                version: meta.version
            },
            uploads: app.locals.uploadSettings || {}
        });
    });

    router.post('/upload', (req, res, next) =>
    {
        const uploadSettings = app.locals.uploadSettings || {};
        const createFormidable = req.app.locals.formidable
            || (typeof formidable === 'function' ? formidable : formidable.formidable);

        if (typeof createFormidable !== 'function')
        {
            logger.error('Formidable factory is not available. Ensure parsers.forms is enabled.');
            return next(createHttpError(500, 'File uploads are not configured.'));
        }

        const form = createFormidable({
            uploadDir: uploadSettings.dir,
            maxFileSize: uploadSettings.maxFileSize,
            keepExtensions: true,
            multiples: true
        });

        form.parse(req, (err, fields, files) =>
        {
            if (err)
            {
                logger.warn(`File upload failed: ${err.message}`);
                return next(createHttpError(400, err.message));
            }

            res.json({
                fields,
                files
            });
        });
    });

    app.use(router);
};
