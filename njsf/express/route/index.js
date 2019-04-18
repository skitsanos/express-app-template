'use strict';

class ExpressjsRouteHandler
{
    constructor(express_instance, log)
    {
        this.log = log;
        this.path = undefined;
        this.method = 'GET';
        this.express = express_instance;
    }

    install()
    {
        if (this.path === undefined)
        {
            this.log.error(`Missing path (this.path) property in constructor at ${this.fullPath}`);
            return;
        }

        let _method = this.method;

        if (typeof this.all === 'function')
        {
            _method = 'all';
            this.express.all(this.path, this.all);
        }
        else
        {
            if (typeof this[this.method.toLowerCase()] === 'function')
            {
                this.express[this.method.toLowerCase()](this.path, this[this.method.toLowerCase()]);
            }
            else
            {
                this.log.warn('Skipping. Couldn\'t find any handlers');
                return;
            }
        }

        this.log.info(`Installed handler for ${this.path} with ${_method} method...`);
        if (this.hasOwnProperty('description'))
        {
            this.log.info(`[i] ${this.description}`);
        }
    }
}

module.exports = ExpressjsRouteHandler;