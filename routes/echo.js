const path = require('path');
const RequestHandler = require(path.join(process.cwd(), 'njsf/express/route'));

class handler extends RequestHandler
{
    constructor(express_instance, log)
    {
        super(express_instance, log);
        this.path = ['/echo', '/talkback'];
    }

    all(req, res, next)
    {
        const manifest = require(path.join(global.app.appRoot, '/package'));

        const doc = {
            meta: {
                name: manifest.name,
                description: manifest.description,
                version: manifest.version
            },
            request: req.headers,
            query: req.query,
            params: req.params,
            file: req.file
            //body: req.body
        };

        res.json(doc);
    }
}

module.exports = handler;