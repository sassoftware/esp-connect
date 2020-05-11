/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "./options",
    "./ajax",
    "./xpath",
    "./tools"
], function(Options,ajax,xpath,tools)
{
    /* Datasource */

    function
    Datasource(connection,options)
    {
		Options.call(this,options);

        this._window = this.getOpt("window");

        if (this._window == null)
        {
            tools.exception("no window specified");
        }

        this._fields = {};

        this._connection = connection;
        this._ready = false;
        this._publisher = this._connection.getPublisher({window:this._window});
        this._publisher.addSchemaDelegate(this);

        Object.defineProperty(this,"publisher", {
            get() {
                return(this._publisher);
            }
        });
    }

	Datasource.prototype = Object.create(Options.prototype);
	Datasource.prototype.constructor = Datasource;

    Datasource.prototype.configure =
    function(config)
    {
        var xml = null;

        if (config.hasOwnProperty("nodeType") == false)
        {
            var x = xpath.createXml(config);
            xml = x.documentElement;
        }
        else
        {
            xml = config;
        }

        xpath.getNodes("./options/option",xml).forEach((n) => {
            var name = n.getAttribute("name");
            var value = xpath.nodeText(n);
            this.setOpt(name,value);
        });

        var data = xpath.getNode("//data",xml);

        if (data == null)
        {
            tools.exception("no data element specified");
        }

        if (data != null)
        {
            xpath.getNodes("//fields/field",data).forEach((n) => {
                this._fields[n.getAttribute("name")] = new Function("data",xpath.nodeText(n));
            });

            var n = xpath.getNode("//get-data",data);

            if (n != null)
            {
                if (n.hasAttribute("url"))
                {
                    var url = new URL(n.getAttribute("url"));

                    if (url.protocol == "file:")
                    {
                        var fs = require("fs");
                        var filedata = fs.readFileSync(url.pathname);
                        this._getData = new Function("data",filedata);
                    }
                }
                else
                {
                    this._getData = new Function("data",xpath.nodeText(n));
                }
            }

            if (this._getData == null)
            {
                tools.exception("no get-data function specified");
            }

            this._opcode = "insert";

            if ((n = xpath.getNode("./opcode",data)) != null)
            {
                this._opcode = xpath.nodeText(n);
            }
        }
    }

    Datasource.prototype.schemaSet =
    function(publisher,schema)
    {
        this._ready = true;
    }

    Datasource.prototype.schedule =
    function()
    {
        var interval = this.getInt("interval",60);
        var datasource = this;
        setTimeout(function(){datasource.process()},interval * 1000);
    }

    Datasource.prototype.send =
    function(data)
    {
        if (Array.isArray(data) == false)
        {
            tools.exception("data must be an array");
        }

        var value;
        var o;

        data.forEach((d) => {

            o = {};

            o.opcode = this._opcode;

            for (var name in this._fields)
            {
                if ((value = this._fields[name](d)) != null)
                {
                    o[name] = value;
                }
            }

            this._publisher.add(o);
            this._publisher.publish();
        });
    }

    Datasource.prototype.process =
    function()
    {
    }

    /* End Datasource */

    /* URL Datasource */

    function
    UrlDatasource(connection,options)
    {
		Datasource.call(this,connection,options);
    }

	UrlDatasource.prototype = Object.create(Datasource.prototype);
	UrlDatasource.prototype.constructor = UrlDatasource;

    UrlDatasource.prototype.process =
    function()
    {
        var url = null;

        if (this.hasOpt("url"))
        {
            url = this.getOpt("url");
        }
        else if (this.hasOpt("url-func"))
        {
            var func = new Function(this.getOpt("url-func"));
            url = func();
        }

        if (url != null)
        {
            var datasource = this;
            var format = this.getOpt("format","json");
            var o = {response:function(request,text,xml) {

                var data = null;

                if (format == "json")
                {
                    var o = JSON.parse(text);
                    data = datasource._getData(o);
                }
                else
                {
                    data = datasource._getData(text);
                }

                if (data != null)
                {
                    datasource.send(data);
                }
            }};

            if (this.getOpt("use-connection",false))
            {
                this._connection.get(url,o);
            }
            else
            {
                ajax.create("request",url,o).get();
            }
        }

        this.schedule();
    }

    /* End URL Datasource */

    var _api =
    {
        create:function(connection,options)
        {
            var opts = new Options(options);
            var type = opts.getOpt("type","");
            var datasource = null;

            if (type == "url")
            {
                datasource = new UrlDatasource(connection,options);
            }
            else
            {
                tools.exception("invalid type: " + type);
            }

            return(datasource);
        }
    };

    return(_api);
});
