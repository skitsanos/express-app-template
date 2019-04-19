# express-app-template
Template for creating ExpressJs applications with very minimum coding required. Just write your own route handlers, the rest is done for you already

### Installing

In order to use it, just clone the repo from GitHub and run _npm install_ inside the directory you've just got.

```sh
git clone https://github.com/skitsanos/express-app-template.git

cd express-app-template

npm install
```

If you want to run your web app as shell script you can add to it execute rights:

```sh
chmod u+x app.js
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


#### Routes configuration 

Writing middleware/route handlers became even more easier thann it was in earlier versions.

The following handler is executed for requests to _/secret_ whether using GET, POST, PUT, DELETE, or any other HTTP request method.

```js
const path = require('path');
const RequestHandler = require(path.join(process.cwd(), 'njsf/express/route'));

class handler extends RequestHandler
{
    constructor(express_instance, log)
    {
        super(express_instance, log);
        this.path = '/secret';
        this.description = 'Some secret route';
    }

    all(req, res, next)
    {
        global.app.utils.render(req, res, 'secret');
    }
}

module.exports = handler;
```

**route path**

When you creating a path handler, you need to specify at least _this.path_. The path for which the middleware function is invoked; can be any of:

- A string representing a path.
- A path pattern.
- A regular expression pattern to match paths.
- An array of combinations of any of the above.

**route method**

_this.method_ property, that can be a string or string array, will tell handler to accept incoming requests for the the methods you specify.

```js
class handler extends RequestHandler
{
    constructor(express_instance, log)
    {
        super(express_instance, log);
        this.path = '/secret';
        this.method = ['GET', 'POST'];
        this.description = 'Some secret route';
    }

    put(req, res, next)
    {
        global.app.utils.render(req, res, 'secret');
    }
}

```

In the example above, you telling your handler to accept connections via GET and POST methods, although you don't have any functionality for these, as result handler loader will reject it.

#### Access rules configuration (/config/access.json)

This configuration file defines access rules for your routes and it might look like this:

```json
{
  "public": [
    "/",
    "/login",
    "/echo",
    "/privacy-policy",
    "/terms",
    "/public/message",
    "/public/plufinder/browse",
    {
      "rule": "\/public\/plu\/([^\/]+)"
    },
    {
      "rule": "\/public\/plufinder\/plu\/([^\/]+)"
    },
    {
      "rule": "\/public\/plufinder\/varieties\/([^\/]+)"
    },
    {
      "rule": "\/public\/ppi\/([^\/]+)"
    }
  ]
}
```

Basically, anything that defined within _public_ array node will be served without authentication, otherwise user will receive redirect to _/login_ route.

This array item can be a string or an object that has _rule_ property in it that represents regex rule.
