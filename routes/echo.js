const {Router} = require('express');

module.exports = ({app}) =>
{
    const router = Router();

    router.all(['/echo', '/talkback'], (req, res) =>
    {
        const meta = app.locals.pkg || {};

        res.json({
            meta: {
                name: meta.name,
                description: meta.description,
                version: meta.version
            },
            request: {
                headers: req.headers,
                query: req.query,
                params: req.params,
                body: Object.keys(req.body || {}).length ? req.body : undefined,
                ip: req.ip
            }
        });
    });

    app.use(router);
};
