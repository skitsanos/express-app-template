# express-app-template
Fresh, fast, and production-minded: an Express 5 starter that keeps the boilerplate out of your way while wiring in modern middleware, structured configuration, sessions, and file uploads.

## Highlights
- Express 5 + Helmet 8, compression, and morgan baked in.
- JSON-driven config (`config/app.json`) for parsers, view engines, sessions, and uploads.
- Auto-discovered route modules—drop a file into `routes/` and it mounts itself.
- Session-ready demo login/logout flow with optional ephemeral secret generation.
- Formidable-powered multipart uploads and Handlebars view support out of the box.

## Quick start
```sh
git clone https://github.com/skitsanos/express-app-template.git
cd express-app-template

# install dependencies (npm, pnpm, or bun all work)
npm install

# run the server on http://localhost:3000
npm start
```

Want the entry point to behave like a CLI? Make it executable:
```sh
chmod u+x app.js
```

## Configuration at a glance
All runtime knobs live in `config/app.json`. The defaults ship with sensible security presets and enable forms, cookies, JSON parsers, and sessions.

- `errors`: toggle logging, stack traces, and response format (`html` or `json`).
- `bodyLimit`: express-style size string for JSON/urlencoded payloads.
- `parsers`: enable/disable JSON, urlencoded, multipart (Formidable), and cookies.
- `uploads`: destination path and max file size for multipart uploads.
- `session`: turn sessions on, provide a `secret`, and shape the cookie. If no secret is set, the app generates a random one for the process (great for demos—set `SESSION_SECRET` in production).
- `viewEngine` / `viewExtension`: plug any engine supported by Express; Handlebars (`hbs`) is preconfigured.
- `cms`: reserved hook for a future SiteAdmin CMS mount.
- `strictRouting`: match `/foo` and `/foo/` separately when you need to.

`config/access.json` controls which routes skip authentication. Entries can be literal paths or `{ "rule": "<regex>" }` objects—anything missing falls back to the session gate defined in `app.js`.

## Routing model
Routes are plain factories that receive `{app, logger, config, pkg}` and mount their own `Router` instances. Async handlers work without wrappers on Express 5.

```js
const {Router} = require('express');

module.exports = ({app}) =>
{
    const router = Router();

    router
        .route('/secret')
        .get(async (_req, res) => res.render('secret'))
        .post(async (req, res) => res.json({message: 'Secret updated'}));

    app.use(router);
};
```

Add as many modules as you like—every `.js` file in `routes/` is loaded at boot. Need ES module compatibility? Export a default function; the loader understands both styles.

## Out-of-the-box routes
- `GET /` – Handlebars landing page with project metadata, ready to rebrand.
- `GET /echo` – Reflects headers, params, and body for quick testing.
- `POST /login` – Marks the session as authenticated (`{"username":"demo"}` is enough).
- `POST /logout` – Destroys the session and clears the cookie.
- `POST /upload` – Multipart uploads via Formidable; requires an authenticated session.

### Demo flow
```sh
# 1. authenticate and store the cookie
curl -c cookie.txt -H "Content-Type: application/json" \
  -d '{"username":"demo"}' http://localhost:3000/login

# 2. upload a file with the same session
curl -b cookie.txt -F file=@app.js http://localhost:3000/upload

# 3. log out when you’re done
curl -b cookie.txt -X POST http://localhost:3000/logout
```

## Project layout
```
app.js               # Bootstrap: config, middleware, route discovery, server start
config/              # JSON configuration (app + access rules)
routes/              # Auto-loaded route modules (index, echo, upload, login, …)
views/               # Handlebars templates and partials (optional)
uploads/             # Runtime upload directory (auto-created)
```

## Next steps
- Swap in your own view engine or API-only responses.
- Replace the demo login with real authentication logic.
- Extend `config/access.json` as your auth surface grows.
- Deploy with a persistent `SESSION_SECRET` and external session store (Redis, DB, …) for horizontal scale.

Built with ♥ by [Skitsanos](https://github.com/skitsanos). Licensed under MIT—fork, remix, and ship something great.
