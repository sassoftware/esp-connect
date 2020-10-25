/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "./options.js";
import {tools} from "./tools.js";
import {codec} from "./codec.js";

var WS = null;
var W3CWS = null;

var _nodeWS = null;
var _nodeWebsockets = null;

if (tools.isNode)
{
    if (process.env.NODE_WEBSOCKETS == "ws")
    {
        _nodeWS = {
            open:function(e)
            {
                var	conn = this._connection;

                if (conn != null)
                {
                    conn._websocket = this;
                    conn._ready = true;
                    conn.ready();
                }
            },

            close:function(e)
            {
                var	conn = this._connection;

                if (conn != null)
                {
                    conn.clear();
                    conn.closed();
                }
            },

            error:function(e)
            {
                var	conn = this._connection;

                if (conn != null)
                {
                    console.log(conn.getUrl() + ": " + e);
                    conn.clear();
                    conn.error();
                }
            },

            message:function(message)
            {
                var	conn = this._connection;

                if (conn != null)
                {
                    if (typeof(message) == "string")
                    {
                        conn.message(message);
                    }
                    else
                    {
                        var buffer = new ArrayBuffer(message.length);
                        var view = new Uint8Array(buffer);
                        for (var i = 0; i < message.length; ++i)
                        {
                           view[i] = message[i];
                        }

                        var o = codec.decode(buffer);
                        conn.data(o);
                    }
                }
            },

            data:function(stream)
            {
                var	conn = this._connection;

                if (conn != null)
                {
                    var data = Buffer.alloc(0);

                    stream.on("readable",function()
                    {
                        var newData = stream.read();

                        if (newData != null)
                        {
                            data = Buffer.concat([data,newData],data.length + newData.length);
                        }
                    });

                    stream.on("end",function()
                    {
                        var buffer = new ArrayBuffer(data.length);
                        var view = new Uint8Array(buffer);
                        for (var i = 0; i < data.length; ++i)
                        {
                           view[i] = data[i];
                        }

                        var o = codec.decode(buffer);
                        conn.data(o);
                    });
                }
            }
        };
    }
    else
    {
        /*
        W3CWS = require("websocket").w3cwebsocket;
        import {w3cwebsocket} as W3CWS from "websocket"; 

        function
        WebSocketClient(url,connection)
        {
            this._conn = connection;
            this.binaryType = "arraybuffer";
            var config = {};
            config.tlsOptions = (this._conn._config != null) ? this._conn._config : {};
            W3CWS.call(this,url,null,null,null,null,config);
        }

        WebSocketClient.prototype = Object.create(W3CWS.prototype);
        WebSocketClient.prototype.constructor = WebSocketClient;
        */

        _nodeWebsockets = {
            open:function()
            {
                var	conn = this._conn;

                if (conn != null)
                {
                    conn._websocket = this;
                    conn._ready = true;
                    conn.ready();
                }
            },

            close:function(e)
            {
                var	conn = this._conn;

                if (conn != null)
                {
                    conn.clear();
                    conn.closed();
                }
            },

            error:function(e)
            {
                var	conn = this._conn;

                if (conn != null)
                {
                    conn.clear();
                    conn.error();
                }
            },

            message:function(e)
            {
                var	conn = this._conn;

                if (conn != null)
                {
                    if (typeof(e.data) == "string")
                    {
                        conn.message(e.data);
                    }
                    else
                    {
                        var o = codec.decode(e.data);
                        conn.data(o);
                    }
                }
            }
        };
    }
}

var	_websockets =
{
    _established:new Object(),

    open:function(e)
    {
        var	conn = this._connection;

        if (conn != null)
        {
            _websockets._established[conn.getUrl()] = true;
            conn._websocket = this;
            conn._ready = true;
            conn.ready();
        }
    },

    close:function(e)
    {
        var	conn = this._connection;

        if (conn != null)
        {
            conn.clear();
            conn.closed();
        }
    },

    error:function(e)
    {
        var	conn = this._connection;

        if (conn != null)
        {
            conn.clear();
            conn.error();
        }
    },

    message:function(e)
    {
        var	conn = this._connection;

        if (conn != null)
        {
            if (e.data instanceof ArrayBuffer || e.data instanceof Blob)
            {
                var reader = new FileReader();
                reader.onload = function(e) {
                    var o = codec.decode(e.target.result);
                    conn.data(o);
                };
                reader.readAsArrayBuffer(e.data);
            }
            else
            {
                conn.message(e.data);
            }
        }
    },
    prompted:function(url)
    {
        return(this._prompted.hasOwnProperty(url));
    }
};

class Connection extends Options
{
    constructor(host,port,path,secure,options,config)
	{
		super(options);
        this._host = host;
        this._port = new Number(port);
        this._path = path;
        this._secure = secure;
        this._config = config;

        if (this._port == 0)
        {
            this._port = this._secure ? 443 : 80;
        }

		this._reconnect = {"interval":5,"attempts":0,"timestamp":0,"timer":null};
		this._websocket = null;

        Object.defineProperty(this,"websocket", {
            get() {
		        return(this._websocket);
            }
        });

        Object.defineProperty(this,"protocol", {
            get() {
		        return(this._secure ? "wss" : "ws");
            }
        });

        Object.defineProperty(this,"httpProtocol", {
            get() {
		        return(this._secure ? "https" : "http");
            }
        });

        Object.defineProperty(this,"host", {
            get() {
                return(this._host);
            }
        });

        Object.defineProperty(this,"port", {
            get() {
                return(this._port);
            }
        });

        Object.defineProperty(this,"path", {
            get() {
                return(this._path);
            }
        });

        Object.defineProperty(this,"isSecure", {
            get() {
                return(this._secure);
            }
        });

        Object.defineProperty(this,"parms", {
            get() {
                var parms = "";
                var opts = this.getOpts();

                for (var x in opts)
                {
                    if (parms.length > 0)
                    {
                        parms += "&";
                    }
                    parms += x + "=" + opts[x];
                }

                return(parms);
            }
        });

        Object.defineProperty(this,"urlBase", {
            get() {
                var	base = "";
                base += this.protocol;
                base += "://";
                base += this.host;
                base += ":";
                base += this.port;
                return(base);
            }
        });

        Object.defineProperty(this,"url", {
            get() {
                var	url = this.urlBase;
                if (this._path != null && this._path.length > 0)
                {
                    url += this._path;
                }

                if (this.numOpts > 0)
                {
                    url += "?";
                    url += this.parms;
                }

		        return(url);
            }
        });

        Object.defineProperty(this,"httpurlBase", {
            get() {
                var	base = "";
                base += this.httpProtocol;
                base += "://";
                base += this.host;
                base += ":";
                base += this.port;
                return(base);
            }
        });

        Object.defineProperty(this,"httpurl", {
            get() {
                var	url = this.httpurlBase;
                if (this._path != null && this._path.length > 0)
                {
                    url += this._path;
                }

                if (this.numOpts > 0)
                {
                    url += "?";
                    url += this.parms;
                }

		        return(url);
            }
        });

        Object.defineProperty(this,"hasAuthorization", {
            get() {
                return(this._authorization != null && this._authorization.length > 0);
            }
        });

        Object.defineProperty(this,"authorization", {
            get() {
                return(this._authorization);
            },
            set(value) {
                this._authorization = value;

                if (this._authorization != null)
                {
                    if (this.isConnected() && this.isHandshakeComplete() == false)
                    {
                        this._websocket.send(this._authorization);
                    }
                }
            }
        });
	}

	getType()
	{
		return(this.constructor.name);
	}

	ready()
	{
	}

	closed()
	{
	}

	error()
	{
	}

	handshakeComplete()
	{
	}

	start()
	{
		this._reconnect.timer = null;

		if (this.isConnected())
		{
			return;
		}

		this.clear();

		var	url = this.getUrl();

		if (url == null)
		{
            throw "invalid url";
		}

		this._ready = false;

        if (tools.isNode)
        {
            if (process.env.NODE_WEBSOCKETS == "ws")
            {
                if (WS == null)
                {
                    import("ws").
                        then((module) => {
                            WS = module.default;
                            var ws = new WS(url);
                            ws._connection = this;
                            ws.on("open",_nodeWS.open);
                            ws.on("close",_nodeWS.close);
                            ws.on("error",_nodeWS.error);
                            ws.on("message",_nodeWS.message);
                        }).
                        catch((e) => {
                            console.log("import error on ws: " + e);
                        });
                }
                else
                {
                    var ws = new WS(url);
                    ws._connection = this;
                    ws.on("open",_nodeWS.open);
                    ws.on("close",_nodeWS.close);
                    ws.on("error",_nodeWS.error);
                    ws.on("message",_nodeWS.message);
                }
            }
            else
            {
                if (W3CWS == null)
                {
                    import("websocket").
                        then((module) => {
                            W3CWS = module.default.w3cwebsocket;

                            function
                            WebSocketClient(url,connection)
                            {
                                this._conn = connection;
                                this.binaryType = "arraybuffer";
                                var config = {};
                                config.tlsOptions = (this._conn._config != null) ? this._conn._config : {};
                                W3CWS.call(this,url,null,null,null,null,config);
                            }

                            WebSocketClient.prototype = Object.create(W3CWS.prototype);
                            WebSocketClient.prototype.constructor = WebSocketClient;

                            var ws = new WebSocketClient(url,this);
                            ws.onopen = _nodeWebsockets.open;
                            ws.onclose = _nodeWebsockets.close;
                            ws.onerror = _nodeWebsockets.error;
                            ws.onmessage = _nodeWebsockets.message;
                        }).
                        catch((e) => {
                            console.log("import error on ws: " + e);
                        });
                }
                else
                {
                    function
                    WebSocketClient(url,connection)
                    {
                        this._conn = connection;
                        this.binaryType = "arraybuffer";
                        var config = {};
                        config.tlsOptions = (this._conn._config != null) ? this._conn._config : {};
                        W3CWS.call(this,url,null,null,null,null,config);
                    }

                    WebSocketClient.prototype = Object.create(W3CWS.prototype);
                    WebSocketClient.prototype.constructor = WebSocketClient;

                    var ws = new WebSocketClient(url,this);
                    ws.onopen = _nodeWebsockets.open;
                    ws.onclose = _nodeWebsockets.close;
                    ws.onerror = _nodeWebsockets.error;
                    ws.onmessage = _nodeWebsockets.message;
                }
            }
        }
        else
        {
            var ws = new WebSocket(url);
            ws._connection = this;
            ws.onopen = _websockets.open;
            ws.onclose = _websockets.close;
            ws.onerror = _websockets.error;
            ws.onmessage = _websockets.message;
        }
	}

	stop()
	{
		if (this.isConnected())
		{
			this.clear();
			return(true);
		}

		return(false);
	}

	restart()
	{
		this.clear();
        this.start();
	}

	reconnect(interval)
	{
		if (this._reconnect.timer != null)
		{
			return;
		}

		if (interval != null)
		{
			this._reconnect.interval = interval;
		}

		if (this.isConnected() == false)
		{
			var	connection = this;
			this._reconnect.timer = setTimeout(function(){connection.start();},this._reconnect.interval * 1000);
		}
	}

	message(data)
	{
		if (this._handshakeComplete)
		{
			return;
		}

		var	name = "";
		var	value = null;
		var	c;

		for (var i = 0; i < data.length; i++)
		{
			c = data.charAt(i);

			if (c == '\n')
			{
				if (name.length == 0)
				{
					break;
				}

				if (this._headers == null)
				{
					this._headers = new Object();
				}

				if (value != null)
				{
					this._headers[name] = value.trim();
				}
				else
				{
					this._headers[name] = "";
				}

				name = "";
				value = null;
			}
			else if (value != null)
			{
				value += c;
			}
			else if (c == ':')
			{
				value = "";
			}
			else
			{
				name += c;
			}
		}

		var	status = this.getHeader("status");

		if (status != null)
		{
			if (status == 200)
			{
				this._handshakeComplete = true;
				this.handshakeComplete();
			}
			else if (status == 401)
			{
				if (this._authorization != null)
				{
					this._websocket.send(this._authorization);
				}
                else
                {
                    var	scheme = this.getHeader("www-authenticate","").toLowerCase();
                    var a = scheme.split(" ");
                    if (a.length > 1)
                    {
                        scheme = a[0];
                    }

                    var code = false;

                    this._delegates.forEach((d) => {
                        if (tools.supports(d,"authenticate"))
                        {
                            d.authenticate(this,scheme);
                            code = true;
                        }
                    });

                    if (code == false)
                    {
                        var message = this.getHeader("status");
                        message += "\n";
                        message += this.getHeader("www-authenticate","");
                        message += "\n";
                        if (tools.isNode)
                        {
                            throw new Error(message);
                        }
                        else
                        {
                            throw(message);
                        }
                    }
                }
			}
		}
	}

	setBearer(token)
    {
        this.authorization = "Bearer " + token;
    }

	setBasic(credentials)
    {
        this.authorization = "Basic " + credentials;
    }

	data(data)
    {
    }

	clear()
	{
		if (this._websocket != null)
		{
			this._websocket._connection = null;
			this._websocket.close();
			this._websocket = null;
		}

		this._ready = false;
		this._handshakeComplete = false;
		this._headers = null;
	}

	getHeader(name,dv)
	{
		var	value = dv;

		if (this._headers != null)
		{
			if (this._headers.hasOwnProperty(name))
			{
				value = this._headers[name];
			}
		}

		return(value);
	}

	isHandshakeComplete()
	{
		return(this._handshakeComplete);
	}

	send(data)
	{
		if (this._websocket == null)
        {
            //throw "The web socket is not connected";
            return;
        }

		this._websocket.send(data);
	}

	sendObject(o)
	{
        if (this.getOpt("debug",false))
        {
            console.log(JSON.stringify(o,null,"\t"));
        }

        this.send(tools.stringify(o));
    }

	sendBinary(o)
	{
        var data = codec.encode(o);
        this.send(data);
    }

	isConnected()
	{
		return(this._websocket != null);
	}

	getUrl()
    {
        return(this.url);
    }

	established()
    {
        var url = this.getUrl();
        return(_websockets.established(url));
    }

    static create(url,options)
    {
        var u = tools.createUrl(decodeURI(url));
        var conn = new Connection(u["host"],u["port"],u["path"],u["secure"],options);
        return(conn);
    }

    static createDelegateConnection(delegate,url,options,config)
    {
        var u = tools.createUrl(decodeURI(url));
        var conn = new DelegateConnection(delegate,u["host"],u["port"],u["path"],u["secure"],options,config);
        return(conn);
    }

    static established(url)
    {
        return(_websockets._established.hasOwnProperty(url));
    }
}

class DelegateConnection extends Connection
{
    constructor(delegate,host,port,path,secure,options,config)
    {
		super(host,port,path,secure,options,config);
        this._delegate = delegate;
    }

	ready()
	{
        if (tools.supports(this._delegate,"ready"))
        {
            this._delegate.ready();
        }
	}

	closed()
	{
        if (tools.supports(this._delegate,"closed"))
        {
            this._delegate.closed();
        }
	}

	error()
	{
        if (tools.supports(this._delegate,"error"))
        {
            this._delegate.error();
        }
	}

	handshakeComplete()
	{
        if (tools.supports(this._delegate,"handshakeComplete"))
        {
            this._delegate.handshakeComplete();
        }
	}

	message(data)
	{
		if (this.isHandshakeComplete() == false)
		{
			super.message(data);
			return;
		}

        if (tools.supports(this._delegate,"message"))
        {
            this._delegate.message(data);
        }
	}

	data(o)
	{
        if (tools.supports(this._delegate,"data"))
        {
            this._delegate.data(o);
        }     
	}
}

export {Connection};
