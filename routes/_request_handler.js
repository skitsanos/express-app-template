'use strict';

class RequestHandler
{
    constructor()
    {
    }

    all(req, res, next)
    {
        //console.dir(module.parent.exports.all)
        const log = req.app.settings.log;
        log.info(`processing request on ${req.url} (${req.method}) to ${req.ip} over ${req.protocol}`);

        return new Promise((resolve, reject) =>
        {
            return resolve(next);
        });
    }

    get(req, res, next)
    {
        const log = req.app.settings.log;
        log.info(`processing request on ${req.url} (${req.method})`);

        return new Promise((resolve, reject) =>
        {
            /*if (!req.headers['X-Device-ID'])
            {
                return reject('Wrong device id');
            }*/
            return resolve(next);
        });
    }

    post(req, res, next)
    {
        const log = req.app.settings.log;
        log.info(`processing request on ${req.url} (${req.method})`);

        return new Promise((resolve, reject) =>
        {
            //log.error('rejecting');
            //return reject(new Error('crap!'));
            return resolve(next);
        });
    }

    put(req, res, next)
    {
        const log = req.app.settings.log;
        log.info(`processing request on ${req.url} (${req.method})`);

        return new Promise((resolve, reject) =>
        {
            return resolve(next);
        });
    }

    delete(req, res, next)
    {
        const log = req.app.settings.log;
        log.info(`processing request on ${req.url} (${req.method})`);

        return new Promise((resolve, reject) =>
        {
            return resolve(next);
        });
    }
}

module.exports = RequestHandler;
