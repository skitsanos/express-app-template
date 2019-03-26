const RequestHandler = require('./_request_handler');

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
                file: req.file,
                //body: req.body
            };

            res.contentType('application/json');
            res.send(JSON.stringify(doc));
        }).catch(err =>
        {
            res.send({error: {message: 'Failed to process request', reason: err}});
        });
    }
}

module.exports = new handler();