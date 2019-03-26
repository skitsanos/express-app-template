const RequestHandler = require('./_request_handler');

class handler extends RequestHandler
{
    constructor()
    {
        super();
    }

    get(req, res, next)
    {
        super.all(req, res, next).then(result =>
        {
            global.app.utils.render(req, res, 'index');
        }).catch(err =>
        {
            res.send({error: {message: 'Failed to process request', reason: err, url: req.url}});
        });
    }
}

module.exports = new handler();
