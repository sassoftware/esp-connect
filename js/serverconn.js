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
    "./tools"
], function(Connection,v6,v7,tools)
{
    function
    ServerConnection(host,port,path,secure,delegate,options)
    {
		Connection.call(this,host,port,path,secure,options);
        this._delegates = [];

        if (delegate != null)
        {
            this._delegates.push(delegate);
        }

        this._closed = false;
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
            for (var d of this._delegates)
            {
                if (tools.supports(d,"ready"))
                {
                    d.ready(this._impl);
                }
            }
        }
    }

    ServerConnection.prototype.closed =
    function(conn)
    {
        if (this._closed)
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
            this._impl.closed();
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
        if (this._closed)
        {
            return;
        }

        if (_isNode == false)
        {
            if (this.established() == false)
            {
                if (this.isSecure)
                {
                    var url = this.url;
                    url += "/eventStreamProcessing/v1/server";
                    if (_websockets.prompted(url) == false)
                    {
                        _websockets._prompted[url] = true;
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

    ServerConnection.prototype.close =
    function()
    {
        this._closed = true;
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
		return(url);
	}

    return(ServerConnection);
});
