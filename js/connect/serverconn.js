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
    "./connection",
    "./v6",
    "./v7",
    "./tools",
    "./ajax",
    "./options"
], function(Connection,v6,v7,tools,ajax,Options)
{
    var _prompted = {};

    function
    ServerConnection(connect,host,port,path,secure,delegate,options)
    {
		Connection.call(this,host,port,path,secure,options,connect.config);
        this._connect = connect;
        this._delegates = [];

        Object.defineProperty(this,"connect", {
            get() {
                return(this._connect);
            }
        });

        if (delegate != null)
        {
            if (Array.isArray(delegate))
            {
                delegate.forEach((d) => {
                    tools.addTo(this._delegates,d);
                });
            }
            else
            {
                tools.addTo(this._delegates,delegate);
            }
        }

        this._impl = null;
    }

	ServerConnection.prototype = Object.create(Connection.prototype);
	ServerConnection.prototype.constructor = ServerConnection;

	ServerConnection.prototype.handshakeComplete =
	function()
    {
        var version = this.getHeader("version");

        if (version == null)
        {
            this._impl = new v6(this,this.getOpts());
        }
        else
        {
            this._impl = new v7(this,this.getOpts());
        }

        if (this._impl != null)
        {
            this._impl.version = version;

            if (this._impl.k8s == null && this.hasOpt("model"))
            {
                var model = this.getOptAndClear("model");
                var opts = new Options(model);
                var name = opts.getOpt("name");
                var data = opts.getOpt("data");
                var url = opts.getOpt("url");

                if (name == null)
                {
                    tools.exception("the model must contain a name value");
                }

                if (data == null && url == null)
                {
                    tools.exception("the model must contain either a data or url field");
                }

                var conn = this;

                if (url != null)
                {
                    var o = {
                        response:function(request,text,data) {
                            var o1 = {
                                loaded:function(connection,name) {
                                    conn._delegates.forEach((d) => {
                                        if (tools.supports(d,"ready"))
                                        {
                                            d.ready(conn._impl);
                                        }
                                    });
                                },
                                error:function(connection,name,message) {
                                    conn._delegates.forEach((d) => {
                                        if (tools.supports(d,"error"))
                                        {
                                            d.error(message);
                                        }
                                    });
                                }
                            };
                            conn._impl.loadProject(model.name,text,o1,conn.getOpts());
                        },
                        error:function(request,error) {
                            conn._delegates.forEach((d) => {
                                if (tools.supports(d,"error"))
                                {
                                    d.error(conn._impl,error);
                                }
                            });
                        }
                    };

                    ajax.create("load",url,o).get();
                }
                else
                {
                    var o = {
                        loaded:function(connection,name) {
                        console.log("loaded");
                            conn._delegates.forEach((d) => {
                                if (tools.supports(d,"ready"))
                                {
                                    d.ready(conn._impl);
                                }
                            });
                        },
                        error:function(connection,name,message) {
                        console.log("error");
                            conn._delegates.forEach((d) => {
                                if (tools.supports(d,"error"))
                                {
                                    d.error(message);
                                }
                            });
                        }
                    };
                    this._impl.loadProject(model.name,model.data,o,this.getOpts());
                }
            }
            else
            {
                this._delegates.forEach((d) => {
                    if (tools.supports(d,"ready"))
                    {
                        d.ready(this._impl);
                    }
                });
            }
        }
    }

    ServerConnection.prototype.closed =
    function(conn)
    {
        if (this._impl != null && this._impl.closed)
        {
            return;
        }

        for (var d of this._delegates)
        {
            if (tools.supports(d,"closed"))
            {
                d.closed(this._impl);
            }
        }

        if (this._impl != null)
        {
            this._impl = null;
        }

        var reconnect = this.getOpt("reconnect",1);

        if (reconnect > 0)
        {
            this.reconnect(reconnect);
        }
    }

    ServerConnection.prototype.error =
    function(conn)
    {
        if (this._impl != null && this._impl.closed)
        {
            return;
        }

        if (_isNode == false)
        {
            if (Connection.established(this.getUrl()) == false)
            {
                if (this.isSecure)
                {
                    var url = this.httpProtocol;
                    url += "://";
                    url += this.host;
                    url += ":";
                    url += this.port;
                    url += "/";
                    url += this.path;
                    url += "/eventStreamProcessing/v1/server";
                    if (_prompted.hasOwnProperty(url) == false)
                    {
                        _prompted[url] = true;
                        window.open(url,"espconnect","width=800,height=800");
                    }
                }
            }
        }

		if (tools.supports(this._delegate,"error"))
        {
            this._delegate.error(this);
        }

        for (var d of this._delegates)
        {
            if (tools.supports(d,"error"))
            {
                d.error(this);
            }
        }

        var reconnect = this.getOpt("reconnect",1);

        if (reconnect > 0)
        {
            this.reconnect(reconnect);
        }
    }

	ServerConnection.prototype.message =
	function(data)
	{
		if (this.isHandshakeComplete() == false)
		{
			Connection.prototype.message.call(this,data);
			return;
		}

        if (this._impl != null)
        {
            this._impl.message(data);
        }
    }

	ServerConnection.prototype.data =
	function(o)
    {
        if (this._impl != null)
        {
            this._impl.data(o);
        }
    }

    ServerConnection.prototype.addDelegate =
    function(delegate)
    {
        tools.addTo(this._delegates,delegate);

        if (this._impl != null && tools.supports(delegate,"ready"))
        {
            delegate.ready(this._impl);
        }
    }

    ServerConnection.prototype.removeDelegate =
    function(delegate)
    {
        tools.removeFrom(this._delegates,delegate);
    }

	ServerConnection.prototype.getUrl =
	function()
	{
		var	url = "";
		url += this.protocol;
		url += "://";
		url += this.host;
		url += ":";
		url += this.port;
        if (this._path != null && this._path.length > 0)
        {
            url += this._path;
        }
        if (url.endsWith("/") == false)
        {
            url += "/";
        }
		url += "eventStreamProcessing/v2/connect";

        if (this.hasOpt("access_token"))
        {
            url += "?";
            url += "access_token=" + this.getOpt("access_token");
        }

		return(url);
	}

    ServerConnection.create =
    function(connect,url,delegate,options)
    {
        var u = tools.createUrl(decodeURI(url));
        return(new ServerConnection(connect,u["host"],u["port"],u["path"],u["secure"],delegate,options));
    }

    return(ServerConnection);
});
