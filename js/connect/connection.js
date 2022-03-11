/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "./options.js";
import {tools} from "./tools.js";
import {codec} from "./codec.js";

var W3CWS = null;
var TUNNEL = null;

var _nodeWS = null;

var http_proxy = tools.getHttpProxy();
var https_proxy = tools.getHttpsProxy();

if (tools.isNode)
{
    _nodeWS = {
        open:function()
        {
            var conn = this._conn;

            if (conn != null)
            {
                conn._websocket = this;
                conn._ready = true;
                conn.ready();
            }
        },

        close:function(e)
        {
            var conn = this._conn;

            if (conn != null)
            {
                conn.clear();
                conn.closed(e);
            }
        },

        error:function(e)
        {
            var conn = this._conn;

            if (conn != null)
            {
                conn.clear();
                conn.error();
            }
        },

        message:function(e)
        {
            var conn = this._conn;

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
    }

    get websocket()
    {
        return(this._websocket);
    }

    get protocol()
    {
        return(this._secure ? "wss" : "ws");
    }

    get httpProtocol()
    {
        return(this._secure ? "https" : "http");
    }

    get host()
    {
        return(this._host);
    }

    get port()
    {
        return(this._port);
    }

    get path()
    {
        return(this._path);
    }

    get isSecure()
    {
        return(this._secure);
    }

    get parms()
    {
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

    get urlBase()
    {
        var base = "";
        base += this.protocol;
        base += "://";
        base += this.host;
        base += ":";
        base += this.port;
        return(base);
    }

    get url()
    {
        var url = this.urlBase;
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

    get httpurlBase()
    {
        var base = "";

        if (this.hasOpt("k8s"))
        {
            var k8s = this.getOpt("k8s");
            base = k8s.espUrl;
        }
        else
        {
            base += this.httpProtocol;
            base += "://";
            base += this.host;
            base += ":";
            base += this.port;
        }

        return(base);
    }

    get httpurl()
    {
        var url = this.httpurlBase;
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

    get hasAuthorization()
    {
        return(this._authorization != null && this._authorization.length > 0);
    }

    get authorization()
    {
        return(this._authorization);
    }

    set authorization(value)
    {
        this._authorization = value;

        if (this._authorization != null)
        {
            if (this.isConnected() && this.isHandshakeComplete() == false)
            {
                this._websocket.send(this._authorization);
            }
        }
    }

    getType()
    {
        return(this.constructor.name);
    }

    ready()
    {
    }

    closed(e)
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

        var url = this.getUrl();

        if (url == null)
        {
            throw "invalid url";
        }

        this._ready = false;

        var self = this;
        var o =
        {
            open:function(e)
            {
                self._ready = true;
                self.ready(e);
            },

            close:function(e)
            {
                self.clear();
                self.closed(e);
            },

            error:function(e)
            {
                self.clear();
                self.error(e);
            },

            message:function(e)
            {
                if (e.data instanceof ArrayBuffer || e.data instanceof Blob)
                {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var o = codec.decode(e.target.result);
                        self.data(o);
                    };
                    reader.readAsArrayBuffer(e.data);
                }
                else
                {
                    self.message(e.data);
                }
            }
        };

        tools.createWebSocket(url,o).then(
            function(result) {
                self._websocket = result;
                self._ready = true;
            },
            function(error) {
                console.log("create websocket error: " + error);
            }
        );
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

        if (Connection.established(this.getUrl()) == false)
        {
            this._reconnect.interval = 5;
        }
        else
        {
            this._reconnect.interval = interval;
        }

        if (this.isConnected() == false)
        {
            var self = this;
            this._reconnect.timer = setTimeout(function(){self.start();},self._reconnect.interval * 1000);
        }
    }

    message(data)
    {
        if (this._handshakeComplete)
        {
            return;
        }

        var name = "";
        var value = null;
        var c;

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

        var status = this.getHeader("status");

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
                    var scheme = this.getHeader("www-authenticate","").toLowerCase();
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
        var value = dv;

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
        if (this.getOpt("debug_send",false))
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
