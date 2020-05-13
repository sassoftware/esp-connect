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
    /* Datasources */

    function
    Datasources(connection,options)
    {
		Options.call(this,options);
        this._connection = connection;
        this._datasources = {};
    }

	Datasources.prototype = Object.create(Options.prototype);
	Datasources.prototype.constructor = Datasources;

    Datasources.prototype.configure =
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

        xpath.getNodes("./datasource",xml).forEach((node) => {
            var name = node.hasAttribute("name") ? node.getAttribute("name") : "";
            var type = node.hasAttribute("type") ? node.getAttribute("type") : "";
            var w = node.hasAttribute("window") ? node.getAttribute("window") : "";

            if (name.length == 0 || type.length == 0 || w.length == 0)
            {
                tools.exception("you must specify name, type, and window for each datasource");
            }

            var options = {name:name,type:type,window:w};
            var datasource = null;

            if (type == "url")
            {
                datasource = new UrlDatasource(this._connection,options);
            }

            if (datasource == null)
            {
                tools.exception("failed to create datasource from \n\n" + xpath.xmlString(node) + "\n");
            }

            datasource.configure(node);

            this._datasources[name] = datasource;
        });
    }

    Datasources.prototype.process =
    function()
    {
        Object.values(this._datasources).forEach((ds) => {
            ds.process();
        });
    }

    Datasources.prototype.start =
    function()
    {
        /*
        var datasources = this;
        setTimeout(function()
        */
    }

    /* End Datasources */

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

        if (("nodeType" in config) == false)
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

        var data = xpath.getNode("./data",xml);

        if (data == null)
        {
            tools.exception("no data element specified");
        }

        if (data != null)
        {
            var n = xpath.getNode("./javascript",data);

            if (n != null)
            {
                this._javascript = new Function("data",xpath.nodeText(n));
            }

            if (this._javascript == null)
            {
                tools.exception("no javascript function specified");
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

        data.forEach((o) => {
            o.opcode = this._opcode;
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
            var o = {response:function(request,text,xml) {

                var data = datasource._javascript(text);

                if (data != null)
                {
                    datasource.send(data);
                }
            },

            error(request,message) {
                console.log("error: " + message);
            }
            };

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
        createDatasources:function(connection,options)
        {
            var datasources = new Datasources(connection,options);
            return(datasources);
        },

        createDatasource:function(connection,options)
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
