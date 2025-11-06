const {Router} = require('express');

module.exports = ({app, logger}) =>
{
    const router = Router();

    router.get('/login', (req, res) =>
    {
        const isAuthenticated = Boolean(req.session && req.session.authenticated);
        res.json({
            authenticated: isAuthenticated,
            user: isAuthenticated ? req.session.user || null : null
        });
    });

    router.post('/login', (req, res) =>
    {
        if (!req.session)
        {
            logger.error('Session middleware is required for /login.');
            return res.status(500).json({error: {message: 'Session middleware not configured'}});
        }

        const {username = 'demo'} = req.body || {};

        req.session.authenticated = true;
        req.session.user = {username};

        res.json({
            message: 'Authenticated',
            user: req.session.user
        });
    });

    router.post('/logout', (req, res, next) =>
    {
        if (!req.session)
        {
            return res.status(204).end();
        }

        req.session.destroy((err) =>
        {
            if (err)
            {
                return next(err);
            }

            res.clearCookie('connect.sid', {path: '/'});
            res.status(204).end();
        });
    });

    app.use(router);
};
