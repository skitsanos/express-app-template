const RequestHandler = require('./_request_handler');

class handler extends RequestHandler
{
    constructor(req, res)
    {
        super();
    }

    get(req, res)
    {
        super.get(req, res).then(result =>
        {
            const manifest = require(global.appRoot + '/package');

            const doc = {
                meta: {
                    name: manifest.name,
                    description: manifest.description,
                    version: manifest.version
                },
                request: req.headers,
                query: req.query,
                params: req.params,
                form: req.form,
                files: req.files,
                body: req.body
            };

            res.contentType('application/json');
            res.send(JSON.stringify(doc));
        }).catch(err =>
        {
            res.send({error: {message: 'Failed to process request', reason: err}});
        });
    }

    post(req, res)
    {
        super.post(req, res).then(result =>
        {
            const log = req.app.settings.log;

            const form = new req.app.formidable.IncomingForm();
            form.uploadDir = req.app.settings.uploadDir;
            form.maxFileSize = req.app.settings.uploadMaxFileSize;
            form.keepExtensions = true;

            form.on('fileBegin', (name, file) =>
            {
                //rename the incoming file to the file's name
                file.path = form.uploadDir + '/' + file.name;
            });

            form.on('error', (err) =>
            {
                const e = new Error(err.message);
                e.status = 500;
                res.send({error: {message: err.message}});
            });

            form.on('aborted', function ()
            {
                log.error('user aborted request to ' + req.url);
            });

            form.parse(req, (err, fields, files) =>
            {
                if (err)
                {
                    const e = new Error(err.message);
                    e.status = 400;
                    if (!req.aborted)
                    {
                        res.send({error: {message: err.message}});
                    }
                }
                else
                {
                    req.form = fields;
                    req.files = files;

                    if (!req.aborted)
                    {
                        res.send('ok');
                    }
                }
            });
        }).catch(err =>
        {
            res.send({error: {message: 'Failed to process request', reason: err}});
        });
    }
}

module.exports = new handler();
