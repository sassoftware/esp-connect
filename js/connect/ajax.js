/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "./xpath",
    "./tools"
], function(xpath,tools)
{
    var _node = null;

    try
    {
        _node = require("xmlhttprequest");
    }
    catch (exception)
    {
    }

	function
	Ajax(name,url,delegate,context)
	{
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

	Ajax.prototype.get =
	function()
	{
		this.send("GET");
	}

	Ajax.prototype.post =
	function()
	{
		this.send("POST");
	}

	Ajax.prototype.put =
	function()
	{
		this.send("PUT");
	}

	Ajax.prototype.del =
	function()
	{
		this.send("DELETE");
	}

	Ajax.prototype.head =
	function()
	{
		this.send("HEAD");
	}

	Ajax.prototype.send =
	function(method)
	{
		if (method != null)
		{
			this._method = method;
		}

        var url = _node ? new URL(this._url) : new URL(this._url,document.URL);
		var protocol = url.protocol.toLowerCase();

        if (protocol == "file:")
        {
            if (_node != null)
            {
                var filename = this._url.substr(7);
                var request = this;

                require("fs").readFile(filename,"utf8",function(error,contents) {
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
            }

            return;
        }

        var request = null;
		var	received = false;

        if (_node != null)
        {
		    request = new _node.XMLHttpRequest();
        }
        else
        {
		    request = new XMLHttpRequest();
        }

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

				if (this._ajax._method != null && this._ajax._method == "HEAD")
				{
					if (this.status == 0 || this.status >= 400)
					{
						if (tools.supports(this._ajax._delegate,"error"))
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
						var	url = this._protocol;
						url += "//";
						url += this._a.host;
						url += "/SASESP";
						window.open(url,url,"");
					}
					else if (tools.supports(this._ajax._delegate,"error"))
					{
						this._ajax._delegate.error(this._ajax,null,null);
					}
				}
				else
				{
					var	contentType = this.getResponseHeader("content-type");

                    if (_node != null)
                    {
                        if (contentType.indexOf("text/xml") != -1 || contentType.indexOf("application/xml") != -1)
                        {
                            this._ajax._xml = xpath.createXml(this.responseText);
                        }
                    }
					else if (this.responseXML != null)
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

	Ajax.prototype.setAccept =
	function(value)
	{
		this.setRequestHeader("accept",value);
	}

	Ajax.prototype.setRequestHeaders =
	function(o)
	{
        for (var x in o)
        {
		    this.setRequestHeader(x,o[x]);
        }
	}

	Ajax.prototype.setRequestHeader =
	function(name,value)
	{
		this._requestHeaders[name] = value;
	}

	Ajax.prototype.getResponseHeader =
	function(name)
	{
		var	value = this._request.getResponseHeader(name);
		return(value);
	}

	Ajax.prototype.setData =
	function(data,type)
	{
		this._data = data;

		if (type != null)
		{
			this.setRequestHeader("content-type",type);
		}
	}

	Ajax.prototype.getContext =
	function(value)
	{
		return(this._context);
	}

	Ajax.prototype.getName =
	function()
	{
		return(this._name);
	}

	Ajax.prototype.getUrl =
	function()
	{
		return(this._url);
	}

	Ajax.prototype.getResponseText =
	function()
	{
		return((this._request != null) ? this._request.responseText : "");
	}

	Ajax.prototype.getResponseXml =
	function()
	{
		return((this._request != null) ? this._request._xml : null);
	}

	Ajax.prototype.getStatus =
	function(token)
	{
		var	status = 0;

		if (this._request != null)
		{
			status = this._request.status;
		}

		return(status);
	}

	var	__ajax =
	{
		create:function(name,url,delegate,context)
		{
			return(new Ajax(name,url,delegate,context));
		}
	};

	return(__ajax);
});
