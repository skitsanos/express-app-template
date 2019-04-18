const path = require('path');
const RequestHandler = require(path.join(process.cwd(), 'njsf/express/route'));

class handler extends RequestHandler
{
    constructor(express_instance, log)
    {
        super(express_instance, log);
        this.path = '/';
        this.description = 'Site index page';
    }

    get(req, res, next)
    {
        global.app.utils.render(req, res, 'index');
    }
}

module.exports = handler;
