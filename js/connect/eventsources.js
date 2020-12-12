/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "./options.js";
import {ajax} from "./ajax.js";
import {xpath} from "./xpath.js";
import {tools} from "./tools.js";

class EventSources
{
    constructor(api,delegate)
    {
        this._api = api;
        this._delegate = delegate;
        this._eventsources = {};
        this._running = false;
        this._paused = false;
        this._restart = false;
        this._config = null;

        Object.defineProperty(this,"connect", {
            get() {
                return(this._api.connect);
            }
        });

        Object.defineProperty(this,"running", {
            get() {
                return(this._running);
            }
        });

        Object.defineProperty(this,"configuration", {
            get() {
                return(this._config);
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

        this._api.connection.addDelegate(this);
    }

    ready(conn)
    {
        if (this._restart)
        {
            this._restart = false;
            this.start();
        }
    }

    closed(conn)
    {
        Object.values(this._eventsources).forEach((es) => {
            es.reset();
        });

        this._restart = true;
    }

    configure(config,parms)
    {
        this._config = config;

        var content = config.hasOwnProperty("nodeType") ? xpath.xmlString(config) : config;

        if (parms != null)
        {
            var opts = new Options(parms);
            content = opts.resolve(content);
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

    configureFromUrl(url,parms,delegate)
    {
        var eventsources = this;
        var opts = new Options(parms);
        var start = opts.getOptAndClear("start",false);
        var o = {response:function(request,text,xml) {

            eventsources.configure(text,opts.getOpts());

            if (start)
            {
                eventsources.start();
            }

            if (delegate != null && tools.supports(delegate,"ready"))
            {
                delegate.ready(eventsources);
            }
        },

        error(request,message) {
            console.log("error: " + message);
        }
        };
        ajax.create("request",url,o).get();
    }

    createEventSource(options)
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

    addEventSource(eventsource)
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

    addEdge(source,target)
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

    getEventSource(name)
    {
        return(this._eventsources.hasOwnProperty(name) ? this._eventsources[name] : null);
    }

    togglePause()
    {
        this._paused = this._paused ? false : true;
        return(this._paused);
    }

    start()
    {
        Object.values(this._eventsources).forEach((es) => {
            es.init();
        });

        this._running = true;

        var eventsources = this;
        setTimeout(function(){eventsources.run()},1000);
    }

    run()
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
        var minInterval = 5000;
        var completed = 0;

        Object.values(this._eventsources).forEach((es) => {

            if (es.repeat >= 0 && es.done == false)
            {
                if (es.sending == false)
                {
                    if (es.checkDependencies())
                    {
                        var diff = current.getTime() - es.timestamp;
                        var interval = es.interval;

                        if (diff > interval)
                        {
                            if (interval < minInterval)
                            {
                                minInterval = interval;
                            }

                            eventsources.push(es);
                        }
                        else
                        {
                            diff = current.getTime() - es.timestamp + interval;

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

        eventsources.forEach((es) => {
            if (es.repeat >= 0)
            {
                es.process();
            }
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
        console.log("done sources run");
    }

    publish(name,options)
    {
        if (this._eventsources.hasOwnProperty(name) == false)
        {
            tools.exception("cannot find event source " + name);
        }

        var es = this._eventsources[name];

        es.process(options);
    }
}

class EventSource extends Options
{
    constructor(eventsources,options)
    {
        super(options);

        this._window = this.getOpt("window");

        if (this._window == null)
        {
            tools.exception("no window specified");
        }

        Object.defineProperty(this,"esp", {
            get() {
                return(this._eventsources.connect);
            }
        });

        Object.defineProperty(this,"tools", {
            get() {
                return(tools);
            }
        });

        this._eventsources = eventsources;
        this._api = eventsources._api;
        this._ready = false;
        this._done = false;
        this._sources = [];

        this._times = 0;
        this._timestamp = 0;

        this._senders = [];

        this._publisher = null;

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
            },
            set(value) {
                this._done = value;
            }
        });

        Object.defineProperty(this,"sending", {
            get() {
                return(this._senders.length > 0);
            }
        });
    }

    configure(config)
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

    init()
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
        if (this._api.version < 7)
        {
            opts.format = "json";
        }
        this._publisher = this._api.getPublisher(opts);
        this._publisher.addSchemaDelegate(this);
    }

    reset()
    {
        this._times = 0;
        this._timestamp = 0;
        this._senders = [];
        this._publisher = null;
    }

    schemaSet(publisher,schema)
    {
        this._ready = true;
    }

    send(data)
    {
        new Sender(this,data).run();
    }

    dependsOn(es)
    {
        var code = false;

        for (var source of this._sources)
        {
            if (source == es || source.dependsOn(es))
            {
                code = true;
                break;
            }
        }

        return(code);
    }

    checkCycles()
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

    checkDependencies()
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

    process(options)
    {
        if (this.run(options))
        {
            this._timestamp = new Date().getTime();
            this._times++;

            if (this.repeat > 0 && this._times >= this.repeat)
            {
                this._done = true;
            }
        }
    }

    run(options)
    {
        return(false);
    }

    createXml(text)
    {
        return(xpath.createXml(text));
    }

    getNodes(xml,expr)
    {
        return(xpath.getNodes(expr,xml));
    }

    getNode(xml,expr)
    {
        return(xpath.getNode(expr,xml));
    }

    getNodeText(node,expr)
    {
        var text = "";
        var n = (expr != null) ? this.getNode(node,expr) : node;

        if (n != null)
        {
            text = xpath.nodeText(n);
        }

        return(text);
    }
}

class UrlEventSource extends EventSource
{
    constructor(eventsources,options)
    {
        super(eventsources,options);

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

    configure(config)
    {
        EventSource.prototype.configure.call(this,config);

        if (this.hasOpt("transform"))
        {
            this._transform = new Function("eventsource","data",this.getOpt("transform"));
        }
    }

    init()
    {
        super.init(this);

        if (this._transform == null)
        {
            tools.exception("you must specify the transform value for the UrlEventSource");
        }

        if (this.hasOpt("url") == false && this.hasOpt("url-func") == false)
        {
            tools.exception("you must specify the either a url or a url function value for the UrlEventSource");
        }
    }

    run(options)
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
            if (options != null)
            {
                var opts = new Options(options);
                url = opts.resolve(url);
            }

            var eventsource = this;

            if (this._api.version > 7 && this.getOpt("use-connect",false))
            {
                this._api.get(url,{
                    response:function(text) {
                        var data = eventsource._transform(eventsource,text);

                        if (data != null)
                        {
                            eventsource.send(data);
                        }
                    },

                    error(request,message) {
                        console.log("error: " + message);
                    }
                });
            }
            else
            {
                ajax.create("request",url,{
                    response:function(request,text,xml) {
                        var data = eventsource._transform(eventsource,text);

                        if (data != null)
                        {
                            eventsource.send(data);
                        }
                    },

                    error(request,message) {
                        console.log("error: " + message);
                    }
                }).get();
            }

            code = true;
        }

        return(code);
    }
}

class CsvEventSource extends EventSource
{
    constructor(eventsources,options)
    {
        super(eventsources,options);
        this._data = null;
        this._filter = null;
        this._supplement = null;
    }

    init()
    {
        super.init();

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
            var es = this;
            var o = {
                response:function(request,text) {
                    es._data = text;
                },
                error:function(request,message) {
                    console.log("error: " + es.getOpt("url") + " " + message);
                }
            };

            ajax.create("load",this.getOpt("url"),o).get();
        }

        if (this.hasOpt("filter"))
        {
            this._filter = new Function("o",this.getOpt("filter"));
        }

        if (this.hasOpt("supplement"))
        {
            this._supplement = new Function("o",this.getOpt("supplement"));
        }
    }

    run(options)
    {
        console.log("csv run");
        var code = false;

        if (this._publisher.schema.size > 0)
        {
            if (this._data != null)
            {
                code = true;

                var delegate = {};

                if (this._filter != null)
                {
                    delegate["filter"] = this._filter;
                }
                if (this._supplement != null)
                {
                    delegate["supplement"] = this._supplement;
                }
                var opts = this.clone();
                opts["delegate"] = delegate;
                var data = this.publisher._schema.createDataFromCsv(this._data,opts);
                this.send(data);
            }
        }

        return(code);
    }
}

class CodeEventSource extends EventSource
{
    constructor(eventsources,options)
    {
        super(eventsources,options);
        this._code = null;
    }

    configure(config)
    {
        super.configure(config);

        if (this.hasOpt("code"))
        {
            this._code = new Function("esp","publisher",this.getOpt("code"));
        }
    }

    init()
    {
        super.init();

        if (this._code == null)
        {
            tools.exception("you must specify the code value for the UrlEventSource");
        }
    }

    run(options)
    {
        this._code(this._eventsources,this._publisher);
        return(true);
    }
}

class Sender
{
    constructor(eventsource,data)
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

    run()
    {
        if (this._eventsource._publisher == null)
        {
            tools.removeFrom(this._eventsource._senders,this);
            return;
        }

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
}

var _api =
{
    createEventSources:function(connection,delegate)
    {
        var eventsources = new EventSources(connection,delegate);
        return(eventsources);
    }
};

export {_api as eventsources};
