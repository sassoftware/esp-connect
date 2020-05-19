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
    "./connect",
    "./ajax",
    "./xpath",
    "./tools"
], function(Options,connect,ajax,xpath,tools)
{
    /* Datasources */

    function
    Datasources(connection,delegate)
    {
        this._connection = connection;
        this._delegate = delegate;
        this._datasources = {};
    }

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

        xpath.getNodes("./datasources/*",xml).forEach((node) => {
            var name = node.hasAttribute("name") ? node.getAttribute("name") : "";
            var w = node.hasAttribute("window") ? node.getAttribute("window") : "";

            if (name.length == 0 || w.length == 0)
            {
                tools.exception("you must specify name and window for each datasource");
            }

            var type = node.tagName;
            var options = {name:name,window:w};
            var datasource = null;

            if (type == "url-datasource")
            {
                datasource = new UrlDatasource(this._connection,options);
            }
            else if (type == "code-datasource")
            {
                datasource = new CodeDatasource(this._connection,options);
            }

            if (datasource == null)
            {
                tools.exception("failed to create datasource from \n\n" + xpath.xmlString(node) + "\n");
            }

            this.addDatasource(datasource);

            datasource.configure(node);
        });

        xpath.getNodes("./edges/edge",xml).forEach((node) => {
            var sources = node.getAttribute("source").split(" ");
            var targets = node.getAttribute("target").split(" ");

            sources.forEach((s) => {
                targets.forEach((t) => {
                    this.addEdge(s,t);
                });
            });
        });
    }

    Datasources.prototype.addDatasource =
    function(datasource)
    {
        if ("name" in datasource == false)
        {
            tools.exception("the datasource must have a name property");
        }

        if (this._datasources.hasOwnProperty(datasource.name))
        {
            tools.exception("datasource " + datasource.name + " already exists");
        }

        this._datasources[datasource.name] = datasource;
    }

    Datasources.prototype.addEdge =
    function(source,target)
    {
        var s = this.getDatasource(source);

        if (s == null)
        {
            tools.exception("cannot find datasource " + source);
        }

        var t = this.getDatasource(target);

        if (t == null)
        {
            tools.exception("cannot find datasource " + target);
        }

        t._sources.push(s);
    }

    Datasources.prototype.getDatasource =
    function(name)
    {
        return(this._datasources.hasOwnProperty(name) ? this._datasources[name] : null);
    }

    Datasources.prototype.start =
    function()
    {
        Object.values(this._datasources).forEach((ds) => {
            ds.init();
        });

        var datasources = this;
        setTimeout(function(){datasources.run()},1000);
    }

    Datasources.prototype.run =
    function()
    {
        console.log("run datasources");

        var current = new Date();
        var datasources = [];
        var depsPending = false;
        var minInterval = 10000;
        var completed = 0;

        Object.values(this._datasources).forEach((ds) => {

            if (ds.done == false)
            {
                if (ds.checkDependencies())
                {
                    var diff = current.getTime() - ds.timestamp;
                    var interval = ds.interval;

                    if (diff > interval)
                    {
                        if (interval < minInterval)
                        {
                            minInterval = interval;
                        }

                        datasources.push(ds);
                    }
                    else
                    {
                        diff = current.getTime() - ds.timestamp + interval;

                        if (diff < minInterval)
                        {
                            minInterval = diff;
                        }
                    }
                }
                else
                {
                    depsPending = true;
                }
            }
            else
            {
                completed++;
            }
        });

        datasources.forEach((ds) => {
            console.log("running " + ds.name);
            ds.process();
        });

        if (completed == Object.keys(this._datasources).length)
        {
            if (tools.supports(this._delegate,"complete"))
            {
                var datasources = this;
                setTimeout(function(){datasources._delegate.complete(datasources)},1000);
            }
        }
        else
        {
            var interval = depsPending ? 1000 : minInterval;
            var datasources = this;
            setTimeout(function(){datasources.run()},interval);
        }
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
        this._done = false;
        this._sources = [];
        this._publisher = this._connection.getPublisher({window:this._window});
        this._publisher.addSchemaDelegate(this);

        this._times = 0;
        this._timestamp = 0;

        Object.defineProperty(this,"publisher", {
            get() {
                return(this._publisher);
            }
        });

        Object.defineProperty(this,"repeat", {
            get() {
                return(this.getOpt("repeat","1"));
            }
        });

        this._interval = 30000;

        Object.defineProperty(this,"interval", {
            get() {
                return(this._interval);
            },
            set(value) {
                var a = value.split(" ");
                var value = parseFloat(a[0]);
                var unit = (a.length == 2) ? a[1] : "milliseconds";

                if (unit == "second" || unit == "seconds")
                {
                    value *= 1000;
                }
                else if (unit == "minute" || unit == "minutes")
                {
                    value *= (1000 * 60);
                }
                else if (unit == "hour" || unit == "hours")
                {
                    value *= (1000 * 60 * 60);
                }

                this._interval = value;
            }
        });

        Object.defineProperty(this,"timestamp", {
            get() {
                return(this._timestamp);
            },
            set(value) {
                this._timestamp = value;
            }
        });

        Object.defineProperty(this,"name", {
            get() {
                return(this.getOpt("name",""));
            },
            set(value) {
                this.setOpt("name",value);
            }
        });

        Object.defineProperty(this,"done", {
            get() {
                return(this._done);
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

            if (name == "interval")
            {
                this.interval = value;
            }
        });
    }

    Datasource.prototype.init =
    function()
    {
        this._times = 0;
        this._timestamp = 0;
        this.done = false;
        this.checkCycles();
    }

    Datasource.prototype.schemaSet =
    function(publisher,schema)
    {
        this._ready = true;
    }

    Datasource.prototype.send =
    function(data)
    {
        if (Array.isArray(data) == false)
        {
            tools.exception("data must be an array");
        }

        var opcode = this.getOpt("opcode","upsert");
        var value;
        var o;

        data.forEach((o) => {
            o.opcode = opcode;
            this._publisher.add(o);
        });

        this._publisher.publish();
    }

    Datasource.prototype.dependsOn =
    function(ds)
    {
        var code = false;

        for (var source of this._sources)
        {
            if (source == ds || source.dependsOn(ds))
            {
                code = true;
                break;
            }
        }

        return(code);
    }

    Datasource.prototype.checkCycles =
    function()
    {
        for (var source of this._sources)
        {
            if (source.dependsOn(this))
            {
                tools.exception("cyclical dependency detected on " + source.name + " to " + this.name);
            }

            source.checkCycles();
        }
    }

    Datasource.prototype.checkDependencies =
    function()
    {
        var code = true;

        for (var source of this._sources)
        {
            if (source.done == false)
            {
                code = false;
                break;
            }

            if (source.checkDependencies() == false)
            {
                code = false;
                break;
            }
        }

        return(code);
    }

    Datasource.prototype.process =
    function()
    {
        this.run();

        this._timestamp = new Date().getTime();
        this._times++;

console.log("PROCESS: " + this.name + " :::: " + this.repeat + " :: " + this._times);
        if (this.repeat > 0 && this._times >= this.repeat)
        {
            this._done = true;
        }
    }

    Datasource.prototype.run =
    function()
    {
    }

    /* End Datasource */

    /* URL Datasource */

    function
    UrlDatasource(connection,options)
    {
		Datasource.call(this,connection,options);

        this._transform = null;

        Object.defineProperty(this,"transform", {
            get() {
                return(this._transform);
            },
            set(value) {
                this._transform = value;
            }
        });
    }

	UrlDatasource.prototype = Object.create(Datasource.prototype);
	UrlDatasource.prototype.constructor = UrlDatasource;

    UrlDatasource.prototype.configure =
    function(config)
    {
        Datasource.prototype.configure.call(this,config);

        if (this.hasOpt("transform"))
        {
            this._transform = new Function("esp","data",this.getOpt("transform"));
        }
    }

    UrlDatasource.prototype.init =
    function()
    {
        Datasource.prototype.init.call(this);

        if (this._transform == null)
        {
            tools.exception("you must specify the transform value for the UrlDatasource");
        }

        if (this.hasOpt("url") == false && this.hasOpt("url-func") == false)
        {
            tools.exception("you must specify the either a url or a url function value for the UrlDatasource");
        }
    }

    UrlDatasource.prototype.run =
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

                var data = datasource._transform(connect,text);

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
    }

    /* End URL Datasource */

    /* CSV Datasource */

    function
    CSVDatasource(connection,options)
    {
		Datasource.call(this,connection,options);
    }

	CSVDatasource.prototype = Object.create(Datasource.prototype);
	CSVDatasource.prototype.constructor = CSVDatasource;

    CSVDatasource.prototype.init =
    function()
    {
        Datasource.prototype.init.call(this);

        if (this.hasOpt("csv") == false)
        {
            tools.exception("you must specify CSV data for the datasource");
        }
    }

    CSVDatasource.prototype.run =
    function()
    {
        if (this._schema.size == 0)
        {
            return;
        }

        var data = this._schema.createDataFromCsv(this.getOpt("csv",""));

        this.send(data);
    }

    /* End CSV Datasource */

    /* Code Datasource */

    function
    CodeDatasource(connection,options)
    {
		Datasource.call(this,connection,options);
        this._code = null;
    }

	CodeDatasource.prototype = Object.create(Datasource.prototype);
	CodeDatasource.prototype.constructor = CodeDatasource;

    CodeDatasource.prototype.configure =
    function(config)
    {
        Datasource.prototype.configure.call(this,config);

        if (this.hasOpt("code"))
        {
            this._code = new Function("esp","publisher",this.getOpt("code"));
        }
    }

    CodeDatasource.prototype.init =
    function()
    {
        Datasource.prototype.init.call(this);

        if (this._code == null)
        {
            tools.exception("you must specify the code value for the UrlDatasource");
        }
    }

    CodeDatasource.prototype.run =
    function()
    {
        this._code(connect,this._publisher);
    }

    /* End Code Datasource */

    var _api =
    {
        createDatasources:function(connection,delegate)
        {
            var datasources = new Datasources(connection,delegate);
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
