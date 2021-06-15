/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "./options.js";
import {tools} from "./tools.js";
import {xpath} from "./xpath.js";

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
                var	type = this.getResponseHeader("content-type");
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

            var url = new URL(this._url,document.URL);
            var protocol = url.protocol.toLowerCase();

            if (protocol == "file:")
            {
                tools.exception("file protocol is not supported");
            }

            this._request = new XMLHttpRequest();

            var	received = false;

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
                        var	contentType = this.getResponseHeader("content-type");

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

            this._request.open(this._method,this._url,true);

            //this._request.setRequestHeader("accept","text/xml");

            /*
            var	authorization = null;

            if (tools.supports(this._delegate,"authorization"))
            {
                authorization = this._delegate.authorization();
            }

            if (authorization != null && authorization.length > 0)
            {
                request.setRequestHeader("authorization",authorization);
            }
            */

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

	getResponseHeader(name)
	{
		var	value = this._request.getResponseHeader(name);
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
                for (var name in self._requestHeaders)
                {
                    request.setHeader(name,self._requestHeaders[name]);
                }

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
                    reject(self);
                });

                request.end(self._data);
            }

            if (protocol == "https:")
            {
                if (_https == null)
                {
                    import("https").
                        then((module) => {
                            _https = module.default;
                            complete(_https.request(this._options));
                        }).
                        catch((e) => {
                            console.log("import error on https: " + e);
                        });
                }
                else
                {
                    complete(_https.request(this._options));
                }
            }
            else
            {
                if (_http == null)
                {
                    import("http").
                        then((module) => {
                            _http = module.default;
                            complete(_http.request(this._options));
                        }).
                        catch((e) => {
                            console.log("import error on http: " + e);
                        });
                }
                else
                {
                    complete(_http.request(this._options));
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
        this._requestHeaders[name] = value;
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
    }
};

export {_api as ajax};
