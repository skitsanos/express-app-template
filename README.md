# express-app-template
Template for creating ExpressJs applications with very minimum coding required. Just write your own route handlers, the rest is done for you already

### Installing

In order to use it, just clone the repo from GitHub and run _npm install_ inside the directory you've just got.

```
git clone https://github.com/skitsanos/express-app-template.git

cd express-app-template

npm install
```


### Configuration

Application configuration is pretty straight forward, there are just 3 things to set:

- Application itself,
- Routes, and
- Access rules

#### Application configuration (/config/app.json)

There is number of things can be configured for your applications, from various parsers to how error handling is done. You can leave default configuration like this: 

```json
{
  "errors": {
    "logHttpErrors": true,
    "reportErrorsAs": "html",
    "showStack": true
  },
  "parsers": {
    "json": true,
    "urlEncoded": true,
    "forms": true,
    "cookies": true
  },
  "uploads": {
    "storage": "/uploads/",
    "limit": 10485760
  },
  "cms": {
    "enabled": true,
    "mountPath": "/cms"
  },
  "strictRouting": false,
  "viewEngine": "hbs"
}
```

**_errors_ section configutration**

- _reportErrorsAs_ - Specifies on how to report site errors back to the client side, possible formats are _json_ or _html_.
- _showStack_ - if enabled, will also printout into log site error stack data which is handy for debug purpose, keep it disabled (_false_) in production.
 - _ logHttpErrors_ - logs errors like 'Page not found', keep it disabled (_false_) in production.

**_parsers_ section configutration**
 
This section defines how your site requests are going to be parsed.
 
- _json_ - Enables JSON body parser
- _urlEncoded_ - Enables URLEncoded body parser
- _forms_ - Enables Forms parser (via [Formidable](https://github.com/felixge/node-formidable))
- _cookies_ - Enables Cookies parser

**_uploads_ section configutration**

Processing file uploading via [Formidable](https://github.com/felixge/node-formidable)

- _storage_ - location where uploaded files will be stored. Available in route handler as _req.app.settings.uploadDir_
- _limit_ - file uploading limit in bytes. Available in route handler as _req.app.settings.uploadMaxFileSize_

**_cms_ section configutration**

Reserved for SiteAdmin CMS module.

- _enabled_ - reserved for mounting SiteAdminCMS module
- _mountPath_ - url path where CMS is being mounted

**other bits configutration**

- _strictRouting_ - Disabled by default, “/foo” and “/foo/” are treated the same by the router.
- _viewEngine_ - Expressjs view engine, by default is hbs, but you free to use whatever else you like.


#### Routes configuration (/config/routes.json)

Routes configuration is defined in _routes.json file in JSON format, like this:

```json
{
  "routes": [
    {
      "path": "/",
      "handler": "index"
    },
    {
      "path": [
        "/echo",
        "/talkback"
      ],
      "handler": "echo",
      "method": "all"
    },
    {
      "path": "/echo/:id",
      "handler": "echo"
    },
    {
      "path": "/upload",
      "handler": "upload",
      "method": "post"
    }
  ]
}
```

_routes_ element of your JSON file contains array of _route_ objects that have the following properties:

- _path_ - application path that will be handled by route handler, can be a string or array of strings
- _handler_ - node.js module (see below for an exmaple) that will be handling request to your route
- _method_ - HTTP method to be used on this hanlder (get, post, put, etc...), or _all_ to accept all HTTP methods. This parameter is optional and if not specified, GET method will be assumed.

**Route handler example**

```js
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
```

#### Application configuration
