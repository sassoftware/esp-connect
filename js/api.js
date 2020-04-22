/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

var _isNode = false;

try
{
    _isNode = (require("detect-node") != null);
}
catch (e)
{
}

define([
    "./connections",
    "./ajax",
    "./xpath",
    "./resources",
	"./dialogs",
	"./storage",
	"./visuals",
	"./tools",
	"./codec",
	"./options",
	"./router",
	"./splitter",
	"./tabs"
], function(connections,ajax,xpath,resources,dialogs,StoredData,Visuals,tools,codec,Options,Router,splitter,Tabs)
{
	var	__api =
	{
		_parms:null,
		_args:null,
        _visuals:[],
        _statusTimer:null,
        _layoutDelegate:null,

		isNode:function()
        {
            return(_isNode);
        },

		connect:function(url,delegate,options)
		{
            var u = tools.createUrl(decodeURI(url));
            var conn = connections.connect(u["host"],u["port"],u["path"],u["secure"],delegate,options);
            conn.addDelegate(this);
            conn.start();
            return(conn);
		},

        closed:function(connection)
        {
            for (var v of this._visuals)
            {
                v.closed(connection);
            }
        },

        createWebSocket:function(url,delegate)
        {
            return(connections.createWebSocket(url,delegate));
        },

        createVisuals:function(options)
        {
            var visuals = new Visuals(options);
            this._visuals.push(visuals);
            return(visuals);
        },

		getAjax:function()
		{
			return(ajax);
		},

		getTools:function()
		{
			return(tools);
		},

		getXPath:function()
		{
			return(xpath);
		},

		getResources:function()
		{
			return(resources);
		},

		getDialogs:function()
		{
			return(dialogs);
		},

		createRouter:function()
		{
			return(new Router());
		},

		getSplitter:function()
		{
			return(splitter);
		},

		createTabs:function()
		{
			return(new Tabs());
		},

		createOptions:function(o)
		{
			return(new Options(o));
		},

		createOptionsFromArgs:function()
		{
			return(new Options(this.getArgs()));
		},

		getStorage:function(name)
		{
			return(new StoredData(name));
		},

		getArgs:function()
        {
			if (this._args == null)
            {
                this._args = tools.createCommandLineOpts();
            }

            return(this._args);
        },

        getArg:function(name,dv)
        {
            return(args.getOpt(name,dv));
        },

        hasArg:function(name)
        {
            return(this.getArgs().hasOpt(name));
        },

		getParms:function()
		{
			if (this._parms == null)
			{
				var s = window.location.search;
				var	o = new Object();
				s.replace(new RegExp("([^?=&]+)(=([^&]*))?","g"),function($0,$1,$2,$3){o[$1] = $3;});

				for (var name in o)
				{
					s = decodeURIComponent(o[name]);
                    o[name] = this.createValue(s);
				}

				this._parms = o;
			}

			return(this._parms);
		},

        hasParm:function(name)
        {
            return(this.getParms().hasOwnProperty(name));
        },

        getParm:function(name,dv)
        {
            var value = (dv != null) ? dv : null;
            var parms = this.getParms();

            if (parms.hasOwnProperty(name))
            {
                value = parms[name];
            }

            return(value);
        },

        setParm:function(name,value)
        {
            var parms = this.getParms();
            parms[name] = value;
        },

        removeParm:function(name)
        {
            var parms = this.getParms();

            if (parms.hasOwnProperty(name))
            {
                delete parms[name];
            }
        },

        hasParm:function(name)
        {
            return(this.getParms().hasOwnProperty(name));
        },

        createValue:function(s)
        {
            var value = s;

            if (s.indexOf("[") == 0 && s.lastIndexOf("]") == (s.length - 1))
            {
                s = s.substr(1,s.length - 2);
                s = s.split(",");
                value = s;
            }
            else if (s.indexOf("{") == 0 && s.lastIndexOf("}") == (s.length - 1))
            {
                value = JSON.parse(s);
            }
            else if (s == "true")
            {
                value = true;
            }
            else if (s == "false")
            {
                value = false;
            }

            return(value);
        },

        size:function(after)
        {
            if (after != null)
            {
                setTimeout(layout,after);
            }
            else
            {
                layout();
            }
        },

        handleLayout:function(delegate)
        {
            window.addEventListener("resize",layout);

            if (delegate != null)
            {
                if (tools.supports(delegate,"layout") == false)
                {
                    throw "The layout delegate must implement the layout method";
                }

                this._layoutDelegate = delegate;
            }

            this.size();
        },

        showStatus:function(text,seconds)
        {
            if (this._statusTimer != null)
            {
                clearTimeout(this._statusTimer);
                this._statusTimer = null;
            }

            var	footer = document.getElementById("footer");

            if (footer != null)
            {
                footer.innerHTML = text;
            }

            if (seconds != null)
            {
                var api = this;
                this._statusTimer = setTimeout(function(){api.clearStatus();},seconds * 1000);
            }
        },

        clearStatus:function()
        {
            var	footer = document.getElementById("footer");

            if (footer != null)
            {
                footer.innerHTML = "&nbsp;";
            }
        },

        guid:function()
        {
            return(tools.guid());
        },

        formatDate:function(date,format)
        {
            return(tools.formatDate(date,format));
        },

        encode:function(o)
        {
            return(codec.encode(o));
        },

        decode:function(data)
        {
            return(codec.decode(data));
        },

        createBuffer:function(s)
        {
            return(tools.createBuffer(s));
        },

        refresh:function(after)
        {
            if (after != null)
            {
                var api = this;
                setTimeout(function() {api.refresh()},after);
            }
            else
            {
                this._visuals.forEach((v) => {
                    v.refresh();
                });
            }
        },

        b64Encode:function(o)
        {
            return(tools.b64Encode(o));
        },

        b64Decode:function(o)
        {
            return(tools.b64Decode(o));
        },

        stringify:function(o)
        {
            return(tools.stringify(o));
        }
	};

    function
    layout()
    {
        var margins = tools.getMargins(document.body);
        var	bodyMargin = 0;

        if (margins.hasOwnProperty("left"))
        {
            bodyMargin = margins.left * 2;
        }

        var	width = document.body.clientWidth - (bodyMargin * 2);
        var	height = document.body.clientHeight - (bodyMargin * 2);
        var	banner = document.getElementById("banner");
        var	content = document.getElementById("content");
        var	footer = document.getElementById("footer");

        var	spacing = 5;
        var	top = bodyMargin;

        if (banner != null)
        {
            var	bannerBorders = tools.getBorders(banner,true);
            banner.style.left = bodyMargin + "px";
            banner.style.top = bodyMargin + "px";
            banner.style.width = (width - bannerBorders.hsize - bodyMargin) + "px";
            top = banner.offsetTop + banner.offsetHeight;
        }

        var	content = document.getElementById("content");
        var	contentBorders = tools.getBorders(content,true);

        content.style.left = bodyMargin + "px";
        content.style.top = top + "px";
        content.style.width = (width - contentBorders.hsize - bodyMargin) + "px";

        var h = height - content.offsetTop - contentBorders.vsize;

        if (footer != null)
        {
            var	footerBorders = tools.getBorders(footer,true);

            footer.style.left = bodyMargin + "px";
            footer.style.top = (height - footer.offsetHeight) + "px";
            footer.style.width = (width - footerBorders.hsize - bodyMargin) + "px";

            h -= footer.offsetHeight;
        }

        content.style.height = h + "px";

        for (var v of __api._visuals)
        {
            v.size();
        }

        dialogs.placeModals();

        if (__api != null)
        {
            if (__api._layoutDelegate != null)
            {
                __api._layoutDelegate.layout();
            }
        }
    }

	return(__api);
});
