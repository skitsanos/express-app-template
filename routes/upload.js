const path = require('path');
const RequestHandler = require(path.join(process.cwd(), 'njsf/express/route'));

class handler extends RequestHandler
{
    constructor(express_instance, log)
    {
        super(express_instance, log);
        this.path = '/upload';
        this.description = 'Upload handler';
    }

    get(req, res)
    {
        const manifest = require(path.join(process.cwd(), +'/package'));

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
    }

    post(req, res)
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
    }
}

module.exports = handler;
