/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "./options.js";
import {tools} from "./tools.js";
import {xpath} from "./xpath.js";

var node_proxy = null;

var _https = null;
var _http = null;

class Ajax extends Options
{
    constructor(url)
    {
        super();
        this._url = url;
        this._requestHeaders = new Object();
        this._responseHeaders = null;
        this._response = this;
        this._method = "GET";
        this._request = null;
        this._data = null;
    }

    get url()
    {
        return(this._url);
    }

    get status()
    {
        return((this._request != null) ? this._request.status : 0);
    }

    get text()
    {
        return((this._request != null) ? this._request.responseText : "");
    }

    get xml()
    {
        var xml = null;

        if (this._request != null)
        {
            if ((xml = this._request.responseXML) == null)
            {
                var type = this.getResponseHeader("content-type");
                if (type.indexOf("text/xml") != -1 || type.indexOf("application/xml") != -1)
                {
                    xml = xpath.createXml(this._request.responseText);
                }
            }
        }

        return(xml);
    }

    send(method)
    {
        return(new Promise((resolve,reject) => {
            if (method != null)
            {
                this._method = method;
            }

            var u = new URL(this._url,document.URL);
            var protocol = u.protocol.toLowerCase();

            if (protocol == "file:")
            {
                tools.exception("file protocol is not supported");
            }

            this._request = new XMLHttpRequest();
            this._request.withCredentials = true;

            var received = false;

            /*
            request._url = this._url;
            */

            var self = this;

            this._request.onreadystatechange = 
            function()
            {
                if (this.readyState == 3)
                {
                    received = true;
                }
                else if (this.readyState == 4)
                {
                    if (this.status == 401)
                    {
                        reject(self);
                        return;
                    }

                    if (self._method == "HEAD")
                    {
                        if (this.status == 0)
                        {
                            reject(self);
                        }
                        else
                        {
                            resolve(self);
                        }
                    }
                    else if (received == false)
                    {
                        reject(self);
                    }
                    else
                    {
                        var contentType = this.getResponseHeader("content-type");

                        if (this.status == 0)
                        {
                            if ((this.responseText != null && this.responseText.length > 0) || this.responseXML != null)
                            {
                                resolve(self);
                            }
                            else
                            {
                                reject(self);
                            }
                        }
                        else
                        {
                            resolve(self);
                        }
                    }
                }
            };

            this._request.onerror = 
            function(e)
            {
                reject(self);
            }

            var url = this._url;

            if (node_proxy != null)
            {
                if (u.hostname != node_proxy.hostname || u.port != node_proxy.port)
                {
                    var tmp = node_proxy + url;
                    url = tmp;
                }
            }

            this._request.open(this._method,url,true);

            if (this._requestHeaders != null)
            {
                for (var name in this._requestHeaders)
                {
                    this._request.setRequestHeader(name,this._requestHeaders[name]);
                }
            }

            try
            {
                this._request.send(this._data);
            }
            catch (e)
            {
                console.log("error: " + this._url + " : " + e);

                /*
                if (tools.supports(request._ajax._delegate,"error"))
                {
                    request._ajax._delegate.error(this,null,null);
                }
                */
            }
        }));
    }

    get()
    {
        return(this.send("GET"));
    }

    post()
    {
        return(this.send("POST"));
    }

    put()
    {
        return(this.send("PUT"));
    }

    del()
    {
        return(this.send("DELETE"));
    }

    head()
    {
        return(this.send("HEAD"));
    }

    setRequestHeaders(o)
    {
        for (var x in o)
        {
            this.setRequestHeader(x,o[x]);
        }
    }

    setRequestHeader(name,value)
    {
        this._requestHeaders[name] = value;
    }

    getRequestHeader(name)
    {
        return(this._requestHeaders[name]);
    }

    getResponseHeader(name)
    {
        var value = this._request.getResponseHeader(name);
        return(value);
    }

    setData(data,type)
    {
        this._data = data;

        if (type != null)
        {
            this.setRequestHeader("content-type",type);
        }
    }

    toString()
    {
        var s = "";
        s += this._url;
        s += ", ";
        s += "status=" + this.status;
        return(s);
    }
}

var TUNNEL = null;

if (tools.isNode)
{
    import("tunnel").then(
        function(result) {
            TUNNEL = result.default;
        }
    );
}

class NodeAjax extends Options
{
    constructor(url)
    {
        super();
        this._url = url;
        this._requestHeaders = new Object();
        this._options = {};

        this._response = null;
        this._text = "";
        this._data = null;
        this._xml = null;
        this._bearer = null;
    }

    get url()
    {
        return(this._url);
    }

    get status()
    {
        return((this._response != null) ? this._response.statusCode : 0);
    }

    get text()
    {
        return(this._text);
    }

    get xml()
    {
        var xml = null;

        if (this._text != null)
        {
            xml = xpath.createXml(this._text);
        }

        return(xml);
    }

    get bearer()
    {
        return(this._bearer);
    }

    set bearer(value)
    {
        this._bearer = value;
    }

    send(method)
    {
        return(new Promise((resolve,reject) => {
            if (method != null)
            {
                this._options.method = method;
            }

            var url = new URL(this._url);

            this._options.hostname = url.hostname;
            this._options.port = url.port;
            this._options.path = url.pathname + url.search;

            var protocol = url.protocol.toLowerCase();
            var self = this;

            if (protocol == "file:")
            {
                var filename = this._url.substr(7);
                var request = this;

                import("fs").then(
                    function(module){
                        const   fs = module.default;
                        fs.readFile(filename,null,
                            function(error,contents) {
                                if (error != null)
                                {
                                    reject(self);
                                }
                                else
                                {
                                    self._text = contents.toString();
                                   resolve(self);
                                }
                            }
                        );
                    }
                );

                return;
            }
 
            var complete = function(request)
            {
                request.shouldKeepAlive = false;

                /*
                request.setTimeout(1000,function() {
                    console.log("======================== : timeout");
                    request.abort();
                });
                */

                request.on("response", function(response) {

                    self._response = response;

                    var contentType = response.headers["content-type"];
                    var content = "";

                    response.on("data", function(data) {
                        content += data.toString();
                    });

                    response.on("end", function(data) {

                        self._text = content;

                        if (contentType != null)
                        {
                            if (contentType.indexOf("text/xml") != -1 || contentType.indexOf("application/xml") != -1)
                            {
                                self._xml = xpath.createXml(content);
                            }
                        }

                        resolve(self);
                    });
                });

                request.on("error", function(e) {
                    self.error = e;
                    reject(self);
                });

                request.on("timeout", function(response) {
                    console.log("++++++++++++++++++++++ TIME OUT");
                    request.abort();
                    reject(self);
                });

                for (var name in self._requestHeaders)
                {
                    request.setHeader(name,self._requestHeaders[name]);
                }

                if (self._requestHeaders.hasOwnProperty("connection") == false)
                {
                    request.setHeader("Connection","close");
                }

                if (self._bearer != null)
                {
                    request.setHeader("Authorization","Bearer " + self._bearer);
                }

                if (self._data != null)
                {
                    request.write(self._data);
                }

                request.end();
            }

            var sendrequest = function(protocol) {
                self.setProxy().then(
                    function() {
                        var request = protocol.request(self._options);
                        complete(request);
                    }
                );
            }

            if (protocol == "https:")
            {
                if (_https == null)
                {
                    import("https").
                        then((module) => {
                            _https = module.default;
                            sendrequest(_https);
                        }).
                        catch((e) => {
                            console.log("import error on https: " + e);
                        });
                }
                else
                {
                    sendrequest(_https);
                }
            }
            else
            {
                if (_http == null)
                {
                    import("http").
                        then((module) => {
                            _http = module.default;
                            sendrequest(_http);
                        }).
                        catch((e) => {
                            console.log("import error on http: " + e);
                        });
                }
                else
                {
                    sendrequest(_http);
                }
            }
        }));
    }

    get(options)
    {
        this.setOptions(options);
        return(this.send("GET"));
    }

    post(options)
    {
        this.setOptions(options);
        return(this.send("POST"));
    }

    put(options)
    {
        this.setOptions(options);
        return(this.send("PUT"));
    }

    del(options)
    {
        this.setOptions(options);
        return(this.send("DELETE"));
    }

    head()
    {
        return(this.send("HEAD"));
    }

    setOptions(options)
    {
        if (options != null)
        {
            for (var name in options)
            {
                this._options[name] = options[name];
            }
        }
    }

    setOption(name,value)
    {
        this._options[name] = value;
    }

    setAccept(value)
    {
        this.setRequestHeader("accept",value);
    }

    setRequestHeaders(o)
    {
        for (var x in o)
        {
            this.setRequestHeader(x,o[x]);
        }
    }

    setRequestHeader(name,value)
    {
        var n = name.toLowerCase();

        if (value != null)
        {
            this._requestHeaders[n] = value;
        }
    }

    getRequestHeader(name)
    {
        return(this._requestHeaders[name.toLowerCase()]);
    }

    setData(data,type)
    {
        this._data = data;

        if (type != null)
        {
            this.setRequestHeader("content-type",type);
        }
    }

    setProxy()
    {
        return(new Promise((resolve,reject) => {
            var u = new URL(this._url);

            if (tools.isNoProxy(u.hostname))
            {
                resolve();
                return;
            }

            var http_proxy = tools.getHttpProxy();
            var secure = (u.protocol.toLowerCase() == "https:");

            var proxyHost = null;
            var proxyPort = 80;

            if (secure)
            {
                var https_proxy = tools.getHttpsProxy();

                if (https_proxy != null)
                {
                    proxyHost = https_proxy.hostname;
                    if (https_proxy.port != 0)
                    {
                        proxyPort = https_proxy.port;
                    }
                }
            }
            else if (http_proxy != null)
            {
                proxyHost = http_proxy.hostname;
                if (http_proxy.port != 0)
                {
                    proxyPort = http_proxy.port;
                }
            }

            if (proxyHost != null)
            {
                var agent = null;

                if (secure)
                {
                    agent = TUNNEL.httpsOverHttp({
                      proxy: {
                        host: proxyHost,
                        port: proxyPort
                      }
                    });
                }
                else
                {
                    agent = TUNNEL.httpOverHttp({
                      proxy: {
                        host: proxyHost,
                        port: proxyPort
                      }
                    });
                }

                this._options.agent = agent;

                resolve();
            }
            else
            {
                resolve();
            }
        }));
    }

    toString()
    {
        var s = "";
        s += this._url;
        s += ", ";
        s += "status=" + this.status;
        return(s);
    }
}

var _api =
{
    create:function(url)
    {
        if (tools.isNode)
        {
            return(new NodeAjax(url));
        }
        else
        {
            return(new Ajax(url));
        }
    },

    setHttpProxy:function(url)
    {
        //node_proxy = url;
        node_proxy = new URL(url);
    }
};

export {_api as ajax};
