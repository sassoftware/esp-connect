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
    /* EventSources */

    function
    EventSources(api,delegate)
    {
        this._api = api;
        this._delegate = delegate;
        this._eventsources = {};
        this._running = false;
        this._paused = false;

        Object.defineProperty(this,"running", {
            get() {
                return(this._running);
            }
        });

        Object.defineProperty(this,"paused", {
            get() {
                return(this._paused);
            },
            set(value) {
                this._paused = value;
            }
        });
    }

    EventSources.prototype.configure =
    function(config,parms)
    {
        var content = config.hasOwnProperty("nodeType") ? xpath.xmlString(config) : config;
        var rgx = new RegExp("@([A-z0-9_]*)@");
        var results;

        while ((results = rgx.exec(content)) != null)
        {
            var name = results[1];

            if (parms == null || parms.hasOwnProperty(name) == false)
            {
                tools.exception("you must provide a value for '" + name + "'");
            }

            content = content.replace(new RegExp("@" + name + "@","g"),parms[name]);
        }

        var xml = xpath.createXml(content).documentElement;

        xpath.getNodes("./event-sources/*",xml).forEach((node) => {
            var name = node.hasAttribute("name") ? node.getAttribute("name") : "";
            var w = node.hasAttribute("window") ? node.getAttribute("window") : "";

            if (name.length == 0 || w.length == 0)
            {
                tools.exception("you must specify name and window for each event source");
            }

            var type = node.tagName;
            var options = {name:name,window:w};
            var eventsource = null;

            if (type == "url-event-source")
            {
                eventsource = new UrlEventSource(this,options);
            }
            else if (type == "code-event-source")
            {
                eventsource = new CodeEventSource(this,options);
            }
            else if (type == "csv-event-source")
            {
                eventsource = new CsvEventSource(this,options);
            }

            if (eventsource == null)
            {
                tools.exception("failed to create event source from \n\n" + xpath.xmlString(node) + "\n");
            }

            this.addEventSource(eventsource);

            eventsource.configure(node);
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

    EventSources.prototype.configureFromUrl =
    function(url,parms)
    {
        var eventsources = this;
        var o = {response:function(request,text,xml) {
            eventsources.configure(text,parms);
        },
        error(request,message) {
            console.log("error: " + message);
        }
        };
        ajax.create("request",url,o).get();
    }

    EventSources.prototype.createEventSource =
    function(options)
    {
        var opts = new Options(options);
        var type = opts.getOpt("type","");
        var name = opts.getOpt("name","");
        var w = opts.getOpt("window","");

        if (type.length == 0 || name.length == 0 || w.length == 0)
        {
            tools.exception("you must specify type, name and window for each event source");
        }

        var eventsource = null;
        var options = {name:name,window:w};

        if (type == "url")
        {
            eventsource = new UrlEventSource(this,options);
        }
        else if (type == "code")
        {
            eventsource = new CodeEventSource(this,options);
        }
        else if (type == "csv")
        {
            eventsource = new CsvEventSource(this,options);
        }

        if (eventsource == null)
        {
            tools.exception("invalid event source type: " + type);
        }

        eventsource.setOpts(opts.getOpts());

        this.addEventSource(eventsource);

        return(eventsource);
    }

    EventSources.prototype.addEventSource =
    function(eventsource)
    {
        if ("name" in eventsource == false)
        {
            tools.exception("the event source must have a name property");
        }

        if (this._eventsources.hasOwnProperty(eventsource.name))
        {
            tools.exception("event source " + eventsource.name + " already exists");
        }

        this._eventsources[eventsource.name] = eventsource;
    }

    EventSources.prototype.addEdge =
    function(source,target)
    {
        var s = this.getEventSource(source);

        if (s == null)
        {
            tools.exception("cannot find event source " + source);
        }

        var t = this.getEventSource(target);

        if (t == null)
        {
            tools.exception("cannot find event source " + target);
        }

        t._sources.push(s);
    }

    EventSources.prototype.getEventSource =
    function(name)
    {
        return(this._eventsources.hasOwnProperty(name) ? this._eventsources[name] : null);
    }

    EventSources.prototype.togglePause =
    function()
    {
        this._paused = this._paused ? false : true;
        return(this._paused);
    }

    EventSources.prototype.start =
    function()
    {
        Object.values(this._eventsources).forEach((ds) => {
            ds.init();
        });

        this._running = true;

        var eventsources = this;
        setTimeout(function(){eventsources.run()},1000);
    }

    EventSources.prototype.run =
    function()
    {
        if (this._paused)
        {
            var eventsources = this;
            setTimeout(function(){eventsources.run()},1000);
            return;
        }

        var current = new Date();
        var eventsources = [];
        var depsPending = false;
        //var minInterval = 10000;
var minInterval = 5000;
        var completed = 0;

        Object.values(this._eventsources).forEach((ds) => {

            if (ds.done == false)
            {
                if (ds.sending == false)
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

                            eventsources.push(ds);
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
            }
            else
            {
                completed++;
            }
        });

        eventsources.forEach((ds) => {
            ds.process();
        });

        if (completed == Object.keys(this._eventsources).length)
        {
            this._running = false;

            if (tools.supports(this._delegate,"complete"))
            {
                var eventsources = this;
                setTimeout(function(){eventsources._delegate.complete(eventsources)},1000);
            }
        }
        else
        {
            var interval = depsPending ? 1000 : minInterval;
            var eventsources = this;
            setTimeout(function(){eventsources.run()},interval);
        }
    }

    /* End EventSources */

    /* EventSource */

    function
    EventSource(eventsources,options)
    {
		Options.call(this,options);

        this._window = this.getOpt("window");

        if (this._window == null)
        {
            tools.exception("no window specified");
        }

        this._eventsources = eventsources;
        this._api = eventsources._api;
        this._ready = false;
        this._done = false;
        this._sources = [];

        this._times = 0;
        this._timestamp = 0;

        this._senders = [];

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
                return(this._done && this.sending == false);
            }
        });

        Object.defineProperty(this,"sending", {
            get() {
                return(this._senders.length > 0);
            }
        });
    }

	EventSource.prototype = Object.create(Options.prototype);
	EventSource.prototype.constructor = EventSource;

    EventSource.prototype.configure =
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

    EventSource.prototype.init =
    function()
    {
        this._times = 0;
        this._timestamp = 0;
        this.done = false;
        this.checkCycles();

        var opts = {window:this._window};
        if (this.hasOpt("dateformat"))
        {
            opts.dateformat = this.getOpt("dateformat");
        }
        this._publisher = this._api.getPublisher(opts);
        this._publisher.addSchemaDelegate(this);
    }

    EventSource.prototype.schemaSet =
    function(publisher,schema)
    {
        this._ready = true;
    }

    EventSource.prototype.send =
    function(data)
    {
        new Sender(this,data).run();
    }

    EventSource.prototype.dependsOn =
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

    EventSource.prototype.checkCycles =
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

    EventSource.prototype.checkDependencies =
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

    EventSource.prototype.process =
    function()
    {
        if (this.run())
        {
            this._timestamp = new Date().getTime();
            this._times++;

            if (this.repeat > 0 && this._times >= this.repeat)
            {
                this._done = true;
            }
        }
    }

    EventSource.prototype.run =
    function()
    {
        return(false);
    }

    /* End EventSource */

    /* URL EventSource */

    function
    UrlEventSource(eventsources,options)
    {
		EventSource.call(this,eventsources,options);

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

	UrlEventSource.prototype = Object.create(EventSource.prototype);
	UrlEventSource.prototype.constructor = UrlEventSource;

    UrlEventSource.prototype.configure =
    function(config)
    {
        EventSource.prototype.configure.call(this,config);

        if (this.hasOpt("transform"))
        {
            this._transform = new Function("esp","data",this.getOpt("transform"));
        }
    }

    UrlEventSource.prototype.init =
    function()
    {
        EventSource.prototype.init.call(this);

        if (this._transform == null)
        {
            tools.exception("you must specify the transform value for the UrlEventSource");
        }

        if (this.hasOpt("url") == false && this.hasOpt("url-func") == false)
        {
            tools.exception("you must specify the either a url or a url function value for the UrlEventSource");
        }
    }

    UrlEventSource.prototype.run =
    function()
    {
        var code = false;
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
            var eventsource = this;
            var o = {response:function(request,text,xml) {
                var data = eventsource._transform(connect,text);

                if (data != null)
                {
                    eventsource.send(data);
                }
            },

            error(request,message) {
                console.log("error: " + message);
            }
            };

            if (this.getOpt("use-connection",false))
            {
                this._api.get(url,o);
            }
            else
            {
                ajax.create("request",url,o).get();
            }

            code = true;
        }

        return(code);
    }

    /* End URL EventSource */

    /* CSV EventSource */

    function
    CsvEventSource(eventsources,options)
    {
		EventSource.call(this,eventsources,options);
        this._data = null;
    }

	CsvEventSource.prototype = Object.create(EventSource.prototype);
	CsvEventSource.prototype.constructor = CsvEventSource;

    CsvEventSource.prototype.init =
    function()
    {
        EventSource.prototype.init.call(this);

        if (this.hasOpt("csv") == false && this.hasOpt("url") == false)
        {
            tools.exception("you must specify CSV data for the event source with either the csv or url option");
        }

        if (this.hasOpt("csv"))
        {
            this._data = this.getOpt("csv");
        }
        else
        {
            var ds = this;
            var o = {
                response:function(request,text) {
                    ds._data = text;
                },
                error:function(request,message) {
                    console.log("error: " + ds.getOpt("url") + " " + message);
                }
            };
		    ajax.create("load",this.getOpt("url"),o).get();
        }
    }

    CsvEventSource.prototype.run =
    function()
    {
        var code = false;

        if (this._publisher.schema.size > 0)
        {
            if (this._data != null)
            {
                code = true;

                var data = this.publisher._schema.createDataFromCsv(this._data);
                this.send(data);
            }
        }

        return(code);
    }

    /* End CSV EventSource */

    /* Code EventSource */

    function
    CodeEventSource(eventsources,options)
    {
		EventSource.call(this,eventsources,options);
        this._code = null;
    }

	CodeEventSource.prototype = Object.create(EventSource.prototype);
	CodeEventSource.prototype.constructor = CodeEventSource;

    CodeEventSource.prototype.configure =
    function(config)
    {
        EventSource.prototype.configure.call(this,config);

        if (this.hasOpt("code"))
        {
            this._code = new Function("esp","publisher",this.getOpt("code"));
        }
    }

    CodeEventSource.prototype.init =
    function()
    {
        EventSource.prototype.init.call(this);

        if (this._code == null)
        {
            tools.exception("you must specify the code value for the UrlEventSource");
        }
    }

    CodeEventSource.prototype.run =
    function()
    {
        this._code(connect,this._publisher);
        return(true);
    }

    /* End Code EventSource */

    /* Sender */

    function
    Sender(eventsource,data)
    {
        if (Array.isArray(data) == false)
        {
            tools.exception("data must be an array");
        }

        this._eventsource = eventsource;
        this._data = data;
        this._opcode = eventsource.getOpt("opcode","upsert");
        this._delay = eventsource.getInt("delay",0);
        this._index = eventsource.getInt("start",0);
        this._chunksize = eventsource.getInt("chunk_size",1);

        tools.addTo(this._eventsource._senders,this);
    }

    Sender.prototype.run =
    function()
    {
        var target = this._eventsource.getOpt("maxevents",0);

        if (target == 0)
        {
            target = this._data.length;
        }

        if (this._delay == 0)
        {
            this._data.forEach((o) => {
                o.opcode = this._opcode;
                this._eventsource._publisher.add(o);
            });

            this._eventsource._publisher.publish();

            tools.removeFrom(this._eventsource._senders,this);
        }
        else if (this._index < target)
        {
            var sender = this;

            if (this._eventsource._eventsources.paused == false)
            {
                for (var i = 0; i < this._chunksize && this._index < target; i++)
                {
                    this._data[this._index].opcode = this._opcode;
                    this._eventsource._publisher.add(this._data[this._index]);
                    this._index++;
                }

                this._eventsource._publisher.publish();

                setTimeout(function(){sender.run();},this._delay);
            }
            else
            {
                setTimeout(function(){sender.run();},1000);
            }
        }
        else
        {
            tools.removeFrom(this._eventsource._senders,this);
        }
    }

    /* End Sender */

    var _api =
    {
        createEventSources:function(connection,delegate)
        {
            var eventsources = new EventSources(connection,delegate);
            return(eventsources);
        }
    };

    return(_api);
});
