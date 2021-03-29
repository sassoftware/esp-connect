/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

class Options
{
    constructor(options)
    {
        this._options = {};
        this.setOpts(options);
    }

    get numOpts()
    {
        return(Object.keys(this._options).length);
    }

    get keys()
    {
        var keys = [];

        for (var x in this._options)
        {
            keys.push(x);
        }

        return(keys);
    }

    setOpts(options)
    {
        if (options != null)
        {
            var o = options;

            if (typeof(options) == "string")
            {
                try
                {
                    o = JSON.parse(options);
                }
                catch (e)
                {
                }
            }

            for (var name in o)
            {
                this.setOpt(name,o[name]);
            }
        }
    }

    getOpts()
    {
        return(this._options);
    }

    hasOpt(name)
    {
        var	s = name.toLowerCase();
        //var code = (this._options.hasOwnProperty(s) && this._options[s] != null);
        var code = (this._options.hasOwnProperty(s));
        return(code);
    }

    hasOpts(opts)
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

    getOpt(name,dv)
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

    getOptAndClear(name,dv)
    {
        var value = this.getOpt(name,dv);
        this.clearOpt(name);
        return(value);
    }

    getInt(name,dv)
    {
        var num = 0;
        var value = this.getOpt(name,dv);

        if (value != null)
        {
            num = parseInt(value);
        }

        return(num);
    }

    getArray(name,dv)
    {
        var a = null;
        var value = this.getOpt(name,dv);

        if (value != null && Array.isArray(value))
        {
            a = value;
        }

        return(a);
    }

    setOpt(name,value)
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

    clearOpt(name)
    {
        var	s = name.toLowerCase();

        if (this._options.hasOwnProperty(s))
        {
            delete this._options[s];
            this.optionCleared(s);
        }
    }

    clearOpts(names)
    {
        for (var name of names)
        {
            this.clearOpt(name);
        }
    }

    reset()
    {
        this._options = {};
    }

    addOpts(to,names)
    {
        if (names != null)
        {
            names.forEach((name) => {
                if (this._options.hasOwnProperty(name))
                {
                    const   value = this._options[name];
                    if (value instanceof Function)
                    {
                        to[name] = value.toString();
                    }
                    else
                    {
                        to[name] = value;
                    }
                }

            });
        }
        else
        {
            for (var x in this._options)
            {
                const   value = this._options[x];
                if (value instanceof Function)
                {
                    to[x] = value.toString();
                }
                else
                {
                    to[x] = value;
                }
            }
        }
    }

    optionSet()
    {
    }

    optionCleared()
    {
    }

    resolve(value)
    {
        for (var name in this._options)
        {
            var rgx = new RegExp("@" + name + "@","g");
            value = value.replace(rgx,this._options[name]);
        }

        return(value);
    }

    clone(names)
    {
        var o = {};
        this.addOpts(o,names);
        return(o);
    }

    supports(name)
    {
        var value = this.getOpt(name);
        return(value != null && typeof(value) == "function");
    }

    toString()
    {
        return(JSON.stringify(this._options));
    }
}

export {Options};
