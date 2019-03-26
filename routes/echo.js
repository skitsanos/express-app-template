const RequestHandler = require('./_request_handler');
const path = require('path');

class handler extends RequestHandler
{
    constructor()
    {
        super();
    }

    all(req, res, next)
    {
        super.all(req, res, next).then(result =>
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
                file: req.file,
                //body: req.body
            };

            res.json(doc);
        }).catch(err =>
        {
            res.json({error: {message: 'Failed to process request', reason: err}});
        });
    }
}

module.exports = new handler();