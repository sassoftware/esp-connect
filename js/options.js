/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
], function()
{
    function
    Options(options)
    {
        this._options = {};

        Object.defineProperty(this,"numOpts", {
            get() {
		        return(Object.keys(this._options).length);
            }
        });

        this.setOpts(options);
    }

	Options.prototype.setOpts =
    function(options)
    {
        if (options != null)
        {
            var o = options;

            if (typeof(options) == "string")
            {
                o = JSON.parse(options);
            }

            for (var name in o)
            {
                this.setOpt(name,o[name]);
            }
        }
    }

	Options.prototype.getOpts =
    function()
    {
        return(this._options);
    }

	Options.prototype.hasOpt =
    function(name)
    {
		var	s = name.toLowerCase();
        return(this._options.hasOwnProperty(s));
    }

	Options.prototype.hasOpts =
    function(opts)
    {
        var code = true;

        for (var o of opts)
        {
            if (this.hasOpt(o) == false)
            {
                code = false;
            }
        }

        return(code);
    }

	Options.prototype.getOpt =
    function(name,dv)
    {
        var value = null;
		var	s = name.toLowerCase();

        if (this._options.hasOwnProperty(s))
        {
            value = this._options[s];
        }

        if (value == null && dv != null)
        {
            value = dv;
        }

        return(value);
    }

	Options.prototype.getInt =
    function(name,dv)
    {
        var num = 0;
        var value = this.get(name,dv);

        if (value != null)
        {
            num = parseInt(value);
        }

        return(num);
    }

	Options.prototype.setOpt =
    function(name,value)
    {
		var	s = name.toLowerCase();

        if (value == null)
        {
            if (this._options.hasOwnProperty(s))
            {
                delete this._options[s];
                this.optionCleared(s,value);
            }
        }
        else
        {
            this._options[s] = value;
            this.optionSet(s,value);
        }
    }

	Options.prototype.clearOpt =
    function(name)
    {
		var	s = name.toLowerCase();

        if (this._options.hasOwnProperty(s))
        {
            delete this._options[s];
            this.optionCleared(s);
        }
    }

	Options.prototype.clearOpts =
    function(names)
    {
        for (var name of names)
        {
            this.clearOpt(name);
        }
    }

	Options.prototype.reset =
    function()
    {
        this._options = {};
    }

	Options.prototype.addOpts =
    function(to)
    {
        for (var x in this._options)
        {
            to[x] = this._options[x];
        }
    }

	Options.prototype.optionSet =
    function()
    {
    }

	Options.prototype.optionCleared =
    function()
    {
    }

	Options.prototype.toString =
    function()
    {
        return(JSON.stringify(this._options));
    }

    return(Options);
});
