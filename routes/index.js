const {Router} = require('express');

module.exports = ({app}) =>
{
    const router = Router();

    router.get('/', (req, res) =>
    {
        if (typeof res.render === 'function')
        {
            return res.render('index');
        }

        const meta = app.locals.pkg || {};
        return res.json({
            meta: {
                name: meta.name,
                description: meta.description,
                version: meta.version
            }
        });
    });

    app.use(router);
};
