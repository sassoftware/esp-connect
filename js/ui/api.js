/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

define([
    "../connect/connect",
    "./tools",
    "./dialogs",
    "./storage",
    "./splitter",
	"./tabs",
    "./visuals"
], function(connect,tools,dialogs,StoredData,splitter,Tabs,Visuals)
{
	var	__api =
	{
        _visuals:[],
        _statusTimer:null,
        _layoutDelegate:null,
		_parms:null,

		connect:function(url,delegate,options)
		{
            var delegates = [];
            if (delegate != null)
            {
                delegates.push(delegate);
            }
            delegates.push(this);
            connect.connect(url,delegates,options,true);
		},

        authenticate:function(connection,scheme)
        {
            if (scheme == "bearer")
            {
                var conn = this;
                var o =
                {
                    ok:function(data)
                    {
                        connection.setBearer(data.token);
                        dialogs.hideDialog();
                    },
                    cancel:dialogs.hideDialog,
                    header:"Enter Token",
                    values:[{name:"token",label:"OAuth Token",type:"textarea"}]
                };
                dialogs.showDialog(o);
            }
            else if (scheme == "basic")
            {
                var conn = this;
                var o =
                {
                    ok:function(data)
                    {
                        var credentials = connect.b64Encode(data.user + ":" + data.password);
                        connection.setBasic(credentials);
                        dialogs.hideDialog();
                    },
                    cancel:dialogs.hideDialog,
                    header:"Enter User and Password",
                    values:[{name:"user",label:"User"},{name:"password",label:"Password",type:"password"}]
                };
                dialogs.showDialog(o);
            }
        },

        closed:function(connection)
        {
            for (var v of this._visuals)
            {
                v.closed(connection);
            }
        },

        showConnectDialog:function(delegate,k8s)
        {
            if (connect.getTools().supports(delegate,"connect") == false)
            {
                throw "The delegate must implement the connect method";
            }

            var storage = new StoredData("esp-connect");
            var server = storage.getOpt("esp-server","");

            var o = {
                ok:function(data) {
                    var server = "";

                    if (data.hasOwnProperty("server"))
                    {
                        server = data.server.trim();
                    }

                    if (server.length == 0)
                    {
                        if (data.hasOwnProperty("k8s"))
                        {
                            server = data.k8s.trim();
                        }
                    }

                    if (server.length == 0)
                    {
                        return(false);
                    }

                    storage.setOpt("esp-server",server);
                    delegate.connect(server);

                    return(true);
                },
                header:"Connect to ESP Server",
            };

            var values = [];

            if (k8s != null)
            {
                var value = {name:"k8s",label:"ESP K8S Server",type:"select"};
                var options = {};
                options[""] = "";

                var handler =
                {
                    handleProjects:function(data)
                    {
                        data.forEach((p) => {
                            var url = "";
                            url += k8s.k8sUrl;
                            url += "/" + p.metadata.namespace;
                            url += "/" + p.metadata.name;
                            var s = p.metadata.namespace + "/" + p.metadata.name;
                            options[s] = url;
                        });

                        //values.push({name:"server",label:"ESP Server",value:""});

                        value.options = options;
                        values.push(value);

                        o.values = values;
                        dialogs.showDialog(o);
                    },

                    error:function(request,error)
                    {
                        tools.exception("error: " + opts);
                    }
                };

                k8s.getProjects(handler);
            }
            else
            {
                values.push({name:"server",label:"ESP Server",value:server});
                o.values = values;
                dialogs.showDialog(o);
            }
        },

        showCodeDialog:function(header,code,options)
        {
            var opts = connect.createOptions(options);
            opts.setOpt("header",header);
            opts.setOpt("code",code);
            dialogs.showCodeDialog(opts.getOpts());
        },

        showFrameDialog:function(header,url,options)
        {
            var opts = connect.createOptions(options);
            opts.setOpt("header",header);
            opts.setOpt("url",url);
            dialogs.showFrameDialog(opts.getOpts());
        },

        createVisuals:function(options)
        {
            var visuals = new Visuals(__api,options);
            this._visuals.push(visuals);
            return(visuals);
        },

        createWebSocket:function(url,delegate)
        {
            return(connect.createWebSocket(url,delegate));
        },

		getAjax:function()
		{
			return(connect.getAjax());
		},

		getTools:function()
		{
			return(connect.getTools());
		},

		getXPath:function()
		{
			return(connect.getXPath());
		},

		createDatasource:function(connection,config)
        {
			return(connect.createDatasource(connection,config));
        },

		getResources:function()
		{
			return(connect.getResources());
		},

		createRouter:function()
		{
			return(connect.createRouter());
		},

		createOptions:function(o)
		{
			return(connect.createOptions());
		},

		createOptionsFromArgs:function()
		{
			return(connect.createOptionsFromArgs());
		},

        createK8S:function(server)
        {
            return(connect.createK8S(server));
        },

		getArgs:function()
        {
			return(connect.getArgs());
        },

        getArg:function(name,dv)
        {
            return(connect.getArg(name,dv));
        },

        hasArg:function(name)
        {
            return(connect.hasArg(name));
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
            return(this.getParms().hasOwnProperty(name) && this._parms[name] != null);
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

        getServerFromParms:function(parms,project)
        {
            var server = null;

            if (parms.hasOwnProperty("k8s"))
            {
                const   k8s = this.createK8S(parms["k8s"]);

                if (k8s.namespace == null)
                {
                    dialogs.popup("Invalid K8S URL","The K8S URL must include a namespace");
                    return;
                }

                server = k8s.k8sUrl;
                server += "/" + k8s.namespace + "/";
                server += project;
            }
            else if (parms.hasOwnProperty("server"))
            {
                server = parms["server"];
                delete parms["server"];
            }

            return(server);
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
            else if (s == "null")
            {
                value = null;
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
                if (connect.getTools().supports(delegate,"layout") == false)
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
            return(connect.guid());
        },

        createTimer:function()
        {
            return(connect.createTimer());
        },

        formatDate:function(date,format)
        {
            return(connect.formatDate(date,format));
        },

        encode:function(o)
        {
            return(connect.encode(o));
        },

        decode:function(data)
        {
            return(connect.decode(data));
        },

        createBuffer:function(s)
        {
            return(connect.createBuffer(s));
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
            return(connect.b64Encode(o));
        },

        b64Decode:function(o)
        {
            return(connect.b64Decode(o));
        },

        stringify:function(o)
        {
            return(connect.stringify(o));
        },

		getStorage:function(name)
		{
			return(new StoredData(name));
		},

		getSplitter:function()
		{
			return(splitter);
		},

		createTabs:function()
		{
			return(new Tabs());
		},

        getDialogs:function()
        {
            return(dialogs);
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
