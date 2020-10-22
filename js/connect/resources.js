/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {tools} from "./tools.js";
import {ajax} from "./ajax.js";
import {xpath} from "./xpath.js";

class Resources
{
    constructor()
    {
        this._languages = null;

        this._parms = null;
        this._strings = null;
        this._delegate = null;
        this._locale = null;

        try
        {
            if (navigator.hasOwnProperty("language"))
            {
                this._languages = [navigator.language];
            }

            if (this._languages == null)
            {
                this._languages = navigator.languages;
            }

            var s = window.location.search;
            var o = new Object();
            s.replace(new RegExp("([^?=&]+)(=([^&]*))?","g"),function($0,$1,$2,$3){o[$1] = $3;});

            for (var x in o)
            {
                o[x] = decodeURIComponent(o[x]);
            }

            this._parms = o;
            this._strings = new Object();
        }
        catch (exception)
        {
        }
    }

    getParm(name)
    {
        var value = null;

        if (this._parms != null && this._parms.hasOwnProperty(name))
        {
            value = unescape(this._parms[name]);
        }

        return(value);
    }

    getParms()
    {
        return(this._parms);
    }

    load(config,delegate)
    {
        this._delegate = delegate;

        var request = ajax.create("resources",config,this);
        request.get();
    }

    response(request,text,xml)
    {
        this._strings = new Object();

        var inComment = false;
        var index;
        var value;
        var name;
        var s = "";

        for (var i = 0; i < text.length; i++)
        {
            if (text[i] == '\n')
            {
                if (inComment == false)
                {
                    if ((index = s.indexOf("=")) > 0)
                    {
                        name = s.substr(0,index);
                        value = s.substr(index + 1);
                        this._strings[name] = value;
                    }
                }

                s = "";
                inComment = false;
            }
            else if (s.length == 0)
            {
                if (text[i] == '#')
                {
                    inComment = true;
                }
                else
                {
                    s += text[i];
                }
            }
            else if (inComment == false)
            {
                s += text[i];
            }
        }

        if (tools.supports(this._delegate,"resourcesLoaded"))
        {
            this._delegate.resourcesLoaded(this);
        }
    }

    error(request)
    {
        var text = request.getUrl();
        text += "<br/>"
        text += request.getResponseText();
        alert(text);
    }

    getString(name,parms)
    {
        var s = null;

        if (this._strings != null && this._strings.hasOwnProperty(name))
        {
            s = this._strings[name];
        }

        if (s == null)
        {
            return(name + " not found");
        }

        if (parms != null)
        {
            for (var x in parms)
            {
                s = s.replace("$" + x,parms[x]);
            }
        }

        return(s);
    }

    findString(name,parms)
    {
        var s = null;

        if (this._strings != null && this._strings.hasOwnProperty(name))
        {
            s = this._strings[name];
        }

        if (s != null && parms != null)
        {
            for (var x in parms)
            {
                s = s.replace("$" + x,parms[x]);
            }
        }

        return(s);
    }

    getStrings()
    {
        return(this._strings);
    }

    getLanguages()
    {
        return(this._languages);
    }

    getLocale()
    {
        return(this._locale);
    }

    setClassText(className,resource,opts)
    {
        var o = (opts != null) ? opts : new Object();
        var contains = (o.hasOwnProperty("contains") && o.contains);
        var space = (o.hasOwnProperty("space") && o.space);
        var tips = o.hasOwnProperty("tips") ? o.tips : false;
        var element = (o.hasOwnProperty("element")) ? o.element : "*";
        var text = this.getString(resource);
        var search = "";
        search += "//";
        search += element;
        if (contains)
        {
            search += "[contains(@class,'";
            search += className;
            if (space)
            {
                search += " ";
            }
            search += "')";
        }
        else
        {
            search += "[@class='";
            search += className;
            search += "'";
        }

        search += "]";

        var nodes = xpath.getNodes(search,document.body);
        var element;

        for (var i = 0; i < nodes.length; i++)
        {
            element = nodes[i];

            if (element.className.indexOf("icon") == -1)
            {
                element.textContent = text;
            }
            else
            {
                element.title = text;
            }
        }
    }

    toString()
    {
        var s = "";

        for (var x in this._strings)
        {
            s += x;
            s += "=";
            s += this._strings[x];
        }

        return(s);
    }
}

//module.exports = Resources;
export {Resources};
