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

        Object.defineProperty(this,"keys", {
            get() {
                var keys = [];

                for (var x in this._options)
                {
                    keys.push(x);
                }

                return(keys);
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
        //var code = (this._options.hasOwnProperty(s) && this._options[s] != null);
        var code = (this._options.hasOwnProperty(s));
        return(code);
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

	Options.prototype.getOptAndClear =
    function(name,dv)
    {
        var value = this.getOpt(name,dv);
        this.clearOpt(name);
        return(value);
    }

	Options.prototype.getInt =
    function(name,dv)
    {
        var num = 0;
        var value = this.getOpt(name,dv);

        if (value != null)
        {
            num = parseInt(value);
        }

        return(num);
    }

	Options.prototype.getArray =
    function(name,dv)
    {
        var a = null;
        var value = this.getOpt(name,dv);

        if (value != null && Array.isArray(value))
        {
            a = value;
        }

        return(a);
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
    function(to,names)
    {
        if (names != null)
        {
            names.forEach((name) => {
                if (this._options.hasOwnProperty(name))
                {
                    to[name] = this._options[name];
                }
            });
        }
        else
        {
            for (var x in this._options)
            {
                to[x] = this._options[x];
            }
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

	Options.prototype.resolve =
    function(value)
    {
        for (var name in this._options)
        {
            var rgx = new RegExp("@" + name + "@","g");
            value = value.replace(rgx,this._options[name]);
        }

        return(value);
    }

	Options.prototype.clone =
    function(names)
    {
        var o = {};
        this.addOpts(o,names);
        return(o);
    }

	Options.prototype.toString =
    function()
    {
        return(JSON.stringify(this._options));
    }

    return(Options);
});
