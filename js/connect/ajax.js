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
	constructor(name,url,delegate,context)
	{
        super();
		this._name = name;
		this._url = url;
		this._delegate = delegate;
		this._context = context;
		this._requestHeaders = new Object();
		this._responseHeaders = null;
		this._data = null;
		this._method = null;
		this._xml = null;
	}

	get()
	{
		this.send("GET");
	}

	post()
	{
		this.send("POST");
	}

	put()
	{
		this.send("PUT");
	}

	del()
	{
		this.send("DELETE");
	}

	head()
	{
		this.send("HEAD");
	}

	send(method)
	{
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

        var request = new XMLHttpRequest();
		var	received = false;

		request._url = this._url;
		request._protocol = protocol;
		request._ajax = this;

		this._request = request;
		this._xml = null;

		request.onreadystatechange = 
		function()
		{
			if (this.readyState == 1)
			{
				//request.withCredentials = true;
			}
			else if (this.readyState == 2)
			{
			}
			else if (this.readyState == 3)
			{
				received = true;
			}
			else if (this.readyState == 4)
			{
				if (this.status == 401)
				{
					var	auth = this.getResponseHeader("www-authenticate");
					var	scheme = null;

					if (auth != null && auth.length > 0)
					{
						var	a = auth.split(" ");

						if (a.length > 0)
						{
							scheme = a[0].toLowerCase();
						}
					}

					if (scheme == null)
					{
						if (this.responseXML != null)
						{
							scheme = this.responseXML.firstChild.getAttribute("scheme");
						}
					}

					if (scheme != null)
					{
						if (tools.supports(this._ajax._delegate,"authenticate"))
						{
							this._ajax._delegate.authenticate(scheme,this._ajax);
						}
					}

					return;
				}

				if (this._ajax._method == "HEAD")
				{
				    if (received == false)
                    {
                        if (this._protocol == "https:")
                        {
                            if (this._ajax.hasOpt("cert-confirm-url"))
                            {
                                var url = this._ajax.getOpt("cert-confirm-url");
                                window.open(url,url,"");
                            }
                        }
                        else if (tools.supports(this._ajax._delegate,"error"))
                        {
                            this._ajax._delegate.error(this._ajax,null,null);
                        }
                    }
                    else if (tools.supports(this._ajax._delegate,"response"))
					{
						this._ajax._delegate.response(this._ajax,null,null);
					}
				}
				else if (received == false)
				{
					if (this._protocol == "https:")
					{
                        if (this._ajax.hasOpt("cert-confirm-url"))
                        {
                            var url = this._ajax.getOpt("cert-confirm-url");
                            window.open(url,url,"");
                        }
					}
					else if (tools.supports(this._ajax._delegate,"error"))
					{
						this._ajax._delegate.error(this._ajax,null,null);
					}
				}
				else
				{
					var	contentType = this.getResponseHeader("content-type");

					if (this.responseXML != null)
					{
						this._ajax._xml = this.responseXML;
					}
                    else if (contentType.indexOf("text/xml") != -1 || contentType.indexOf("application/xml") != -1)
					{
                        this._ajax._xml = xpath.createXml(this.responseText);
					}

					if (this.status == 0)
					{
						if ((this.responseText != null && this.responseText.length > 0) || this.responseXML != null)
						{
							if (tools.supports(this._ajax._delegate,"response"))
							{
								if (this.responseXML != null)
								{
									this._ajax._xml = this.responseXML;
								}

								this._ajax._delegate.response(this._ajax,this.responseText,this._ajax._xml);
							}
						}
						else if (tools.supports(this._ajax._delegate,"error"))
						{
							this._ajax._delegate.error(this._ajax,null,null);
						}
					}
                    /*
					else if (this.status >= 400)
					{
						if (tools.supports(this._ajax._delegate,"error"))
						{
							var	text = this.responseText;

							if (this._ajax._xml != null)
							{
								var	node = xpath.getNode("//message/text()",this._ajax._xml);
								if (node != null)
								{
									text = xpath.nodeText(node);
								}
							}

							this._ajax._delegate.error(this._ajax,text,this._ajax._xml);
						}
					}
                    */
					else if (tools.supports(this._ajax._delegate,"response"))
					{
						this._ajax._delegate.response(this._ajax,this.responseText,this._ajax._xml);
					}
				}
			}
		};

		request.open(this._method,this._url,true);

		request.setRequestHeader("accept","text/xml");

		var	authorization = null;

		if (tools.supports(this._delegate,"authorization"))
		{
			authorization = this._delegate.authorization();
		}

		if (authorization != null && authorization.length > 0)
		{
			request.setRequestHeader("authorization",authorization);
		}

		if (this._requestHeaders != null)
		{
			for (var name in this._requestHeaders)
			{
				request.setRequestHeader(name,this._requestHeaders[name]);
			}
		}

		try
		{
			request.send(this._data);
		}
		catch (e)
		{
			console.log("error: " + this._url + " : " + e);

			if (tools.supports(request._ajax._delegate,"error"))
			{
				request._ajax._delegate.error(this,null,null);
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

	getContext(value)
	{
		return(this._context);
	}

	getName()
	{
		return(this._name);
	}

	getUrl()
	{
		return(this._url);
	}

	getResponseText()
	{
		return((this._request != null) ? this._request.responseText : "");
	}

	getResponseXml()
	{
		return((this._request != null) ? this._request._xml : null);
	}

	getStatus(token)
	{
		var	status = 0;

		if (this._request != null)
		{
			status = this._request.status;
		}

		return(status);
	}
}

class NodeAjax extends Options
{
    constructor(name,url,delegate,context)
    {
        super();
        this._name = name;
        this._url = url;
        this._delegate = delegate;
        this._context = context;
		this._requestHeaders = new Object();
        this._options = {};
        this._response = null;
        this._responseText = "";
        this._data = null;
        this._xml = null;
    }

    get(options)
    {
        this.setOptions(options);
        this.send("GET");
    }

    post(options)
    {
        this.setOptions(options);
        this.send("POST");
    }

    put(options)
    {
        this.setOptions(options);
        this.send("PUT");
    }

    del(options)
    {
        this.setOptions(options);
        this.send("DELETE");
    }

    head()
    {
        this.send("HEAD");
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

    send(method)
    {
        if (method != null)
        {
            this._options.method = method;
        }

        var url = new URL(this._url);

        this._options.hostname = url.hostname;
        this._options.port = url.port;
        this._options.path = url.pathname;

        var protocol = url.protocol.toLowerCase();

        if (protocol == "file:")
        {
            var filename = this._url.substr(7);
            var request = this;
            var ajax = this;

            import("fs").then((module) => {
                const   fs = module.default;
                fs.readFile(filename,null,function(error,contents) {
                    ajax._responseText = contents;

                    if (error != null)
                    {
                        if (tools.supports(request._delegate,"error"))
                        {
                            request._delegate.error(request,error);
                        }
                    }
                    else if (tools.supports(request._delegate,"response"))
                    {
                        request._delegate.response(request,contents,null);
                    }
                });
            }).
            catch((e) => {
                console.log("import error on fs: " + e);
            });

            return;
        }

        if (protocol == "https:")
        {
            if (_https == null)
            {
                import("https").
                    then((module) => {
                        _https = module.default;
                        this.complete(_https.request(this._options));
                    }).
                    catch((e) => {
                        console.log("import error on https: " + e);
                    });
            }
            else
            {
                this.complete(_https.request(this._options));
            }
        }
        else
        {
            if (_http == null)
            {
                import("http").
                    then((module) => {
                        _http = module.default;
                        this.complete(_http.request(this._options));
                    }).
                    catch((e) => {
                        console.log("import error on http: " + e);
                    });
            }
            else
            {
                this.complete(_http.request(this._options));
            }
        }
    }

    complete(request)
    {
        var ajax = this;

        for (var name in this._requestHeaders)
        {
            request.setHeader(name,this._requestHeaders[name]);
        }

        request.on("response", function (response) {

            ajax._response = response;

            var contentType = response.headers["content-type"];
            var content = "";

            response.on("data", function(data) {
                content += data.toString();
            });

            response.on("end", function(data) {

                ajax._responseText = content;

                if (contentType != null)
                {
                    if (contentType.indexOf("text/xml") != -1 || contentType.indexOf("application/xml") != -1)
                    {
                        ajax._xml = xpath.createXml(content);
                    }
                }

                if (tools.supports(ajax._delegate,"response"))
                {
                    ajax._delegate.response(ajax,content,ajax._xml);
                }
            });
        });

        request.on("error", function(e) {
            console.log("got error: " + e.toString());
        });

        if (this._data != null)
        {
            request.write(this._data);
        }

        request.end();
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

    getContext(value)
    {
        return(this._context);
    }

    getName()
    {
        return(this._name);
    }

    getUrl()
    {
        return(this._url);
    }

    getResponseText()
    {
        return(this._responseText);
    }

    getResponseXml()
    {
        return(this._xml);
    }

    getStatus(token)
    {
        return((this._response != null) ? this._response.statusCode : 0);
    }
}

var _api =
{
    create:function(name,url,delegate,context)
    {
        if (tools.isNode)
        {
            return(new NodeAjax(name,url,delegate,context));
        }
        else
        {
            return(new Ajax(name,url,delegate,context));
        }
    }
};

export {_api as ajax};
