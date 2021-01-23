/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Connection} from "./connection.js";
import {Options} from "./options.js";
import {Resources} from "./resources.js";
import {Model} from "./model.js";
import {Schema} from "./schema.js";
import {tools} from "./tools.js";
import {ajax} from "./ajax.js";
import {xpath} from "./xpath.js";
import {codec} from "./codec.js";
import {eventsources} from "./eventsources.js";

const   resources = new Resources();

class Api extends Options
{
    constructor(connection,options)
    {
        super(options);

        this._connection = connection;
        this._version = this.createVersion(6.2);

        Object.defineProperty(this,"connection", {
            get() {
                return(this._connection);
            }
        });

        Object.defineProperty(this,"connect", {
            get() {
                return(this._connection.connect);
            }
        });

        Object.defineProperty(this,"version", {
            get() {
                return(this._version);
            },
            set(value) {
                this._version = this.createVersion(value);
            }
        });

        Object.defineProperty(this,"protocol", {
            get() {
                return(this._connection.protocol);
            }
        });

        Object.defineProperty(this,"httpProtocol", {
            get() {
                return(this._connection.httpProtocol);
            }
        });

        Object.defineProperty(this,"host", {
            get() {
                return(this._connection.host);
            }
        });

        Object.defineProperty(this,"port", {
            get() {
                return(this._connection.port);
            }
        });

        Object.defineProperty(this,"isSecure", {
            get() {
                return(this._connection.isSecure);
            }
        });

        Object.defineProperty(this,"urlBase", {
            get() {
                return(this._connection.urlBase);
            }
        });

        Object.defineProperty(this,"url", {
            get() {
                return(this._connection.url);
            }
        });

        Object.defineProperty(this,"httpurlBase", {
            get() {
                return(this._connection.httpurlBase);
            }
        });

        Object.defineProperty(this,"httpurl", {
            get() {
                return(this._connection.httpurl);
            }
        });

        Object.defineProperty(this,"k8s", {
            get() {
                return(this.getOpt("k8s"));
            }
        });

        this._closed = false;

        Object.defineProperty(this,"closed", {
            get() {
                return(this._closed);
            },
            set(value) {
                this._closed = value;
            }
        });

        this.init();
    }

    init()
    {
        this._datasources = {};
        this._handlers = {};
        this._publishers = {};
        this._stats = new Stats(this);
        this._log = new Log(this);
        this._projectUpdateDelegates = [];
    }

    addHandler(id,handler)
    {
        if (tools.supports(handler,"process") == false)
        {
            tools.exception("The handler must implement the process method");
        }

        this._handlers[id] = handler;
    }

    versionGreaterThan(version)
    {
        var v = this.createVersion(version);
        var code = false;

        if (this._version.major >= v.major)
        {
            if (this._version.minor > v.minor)
            {
                code = true;
            }
        }

        return(code);
    }

    versionLessThan(version)
    {
        var v = this.createVersion(version);
        var code = false;

        if (this._version.major <= v.major)
        {
            if (this._version.minor < v.minor)
            {
                code = true;
            }
        }

        return(code);
    }

    stop()
    {
        this._connection.stop();
    }

    closed()
    {
    }

    close()
    {
        this.closed = true;

        var request = {"connection":{}};
        var o = request["connection"];
        o["action"] = "close";
        this.sendObject(request);
    }

    send(o)
    {
        this._connection.send(o);
    }

    sendObject(o)
    {
        this._connection.sendObject(o);
    }

    sendBinary(o)
    {
        this._connection.sendBinary(o);
    }

    message(data)
    {
        if (data.length == 0)
        {
            return;
        }

        var    xml = null;
        var    json = null;

        for (var i = 0; i < data.length; i++)
        {
            if (data[i] == '{' || data[i] == '[')
            {
                json = JSON.parse(data);
                break;
            }
            else if (data[i] == '<')
            {
                xml = xpath.createXml(data);
                break;
            }
        }

        if (json != null)
        {
            this.processJson(json);
        }
        else if (xml != null)
        {
            this.processXml(xml,data);
        }
    }

    data(o)
    {
        this.processJson(o);
    }

    processJson(json)
    {
        if (this.getOpt("debug_receive",false))
        {
            console.log(tools.stringify(json));
        }

        if (json.hasOwnProperty("events"))
        {
            var o = json["events"];

            if (o.hasOwnProperty("@id"))
            {
                var id = o["@id"];
                var datasource = this._datasources[id];

                if (datasource != null)
                {
                    datasource.events(o);
                }
            }
        }
        else if (json.hasOwnProperty("info"))
        {
            var o = json["info"];

            if (o.hasOwnProperty("@id"))
            {
                var id = o["@id"];
                var datasource = this._datasources[id];

                if (datasource != null)
                {
                    if (o.hasOwnProperty("page"))
                    {
                        datasource._page = parseInt(o["page"]);
                        datasource._pages = parseInt(o["pages"]);
                        datasource.deliverInfoChange();
                    }
                }
            }
        }
        /*
        else if (json.hasOwnProperty("schema"))
        {
            var o = json["schema"];
            var id = o["@id"];

            if (this._datasources.hasOwnProperty(id))
            {
                this._datasources[id].setSchemaFromJson(o);
            }
            else if (this._publishers.hasOwnProperty(id))
            {
                this._publishers[id].setSchemaFromJson(o);
            }
        }
        */
        else if (json.hasOwnProperty("schema"))
        {
            var o = json["schema"];
            var id = o["@id"];

            if (this._handlers.hasOwnProperty(id))
            {
                this._handlers[id].process(o);
                delete this._handlers[id];
            }
        }
        else if (json.hasOwnProperty("load-project") || json.hasOwnProperty("load-router"))
        {
            var o = json.hasOwnProperty("load-project") ? json["load-project"] : json["load-router"] ;
            var id = o["@id"];

            if (this._handlers.hasOwnProperty(id))
            {
                this._handlers[id].process(o);
                delete this._handlers[id];
            }
        }
        else if (json.hasOwnProperty("delete-project"))
        {
            var o = json["delete-project"];
            var id = o["@id"];

            if (this._handlers.hasOwnProperty(id))
            {
                this._handlers[id].process(o);
                delete this._handlers[id];
            }
        }
        else if (json.hasOwnProperty("stats"))
        {
            var o = json["stats"];
            this._stats.processJson(o);
        }
        else if (json.hasOwnProperty("response"))
        {
            var o = json["response"];
            var id = o["@id"];

            if (this._handlers.hasOwnProperty(id))
            {
                this._handlers[id].process(o);
                delete this._handlers[id];
            }
        }
        else if (json.hasOwnProperty("url-publisher") || json.hasOwnProperty("data-publisher"))
        {
            var o = (json.hasOwnProperty("url-publisher")) ? json["url-publisher"] : json["data-publisher"];
            var id = o["@id"];

            if (this._handlers.hasOwnProperty(id))
            {
                this._handlers[id].process(o);
                delete this._handlers[id];
            }
        }
        else if (json.hasOwnProperty("loggers"))
        {
            var o = json["loggers"];
            var id = o["@id"];

            if (this._handlers.hasOwnProperty(id))
            {
                this._handlers[id].process(o["contexts"]);
                delete this._handlers[id];
            }
        }
        else if (json.hasOwnProperty("project-loaded") || json.hasOwnProperty("project-removed"))
        {
            if (json.hasOwnProperty("project-loaded"))
            {
                var o = json["project-loaded"];
                var name = o["name"];

                this._projectUpdateDelegates.forEach((d) =>
                {
                    d.projectLoaded(name);
                });
            }
            else
            {
                var o = json["project-removed"];
                var name = o["name"];

                this._projectUpdateDelegates.forEach((d) =>
                {
                    d.projectRemoved(name);
                });
            }
        }
        else if (json.hasOwnProperty("error"))
        {
            var o = json["error"];

            if (o.hasOwnProperty("@id"))
            {
                var id = o["@id"];

                if (this._handlers.hasOwnProperty(id))
                {
                    if (tools.supports(this._handlers[id]),"error")
                    {
                        this._handlers[id].error(o);
                    }
                    else
                    {
                        console.log(tools.stringify(o));
                    }

                    delete this._handlers[id];
                }
                else
                {
                    console.log(tools.stringify(o));
                }
            }
        }
    }

    processXml(xml)
    {
        const   root = xml.documentElement;
        const   tag = root.nodeName;
        const   id = (root.hasAttribute("id")) ? root.getAttribute("id") : "";

        if (this.getOpt("debug",false))
        {
            console.log(xpath.format(xml.documentElement));
        }

        if (this._handlers.hasOwnProperty(id))
        {
            this._handlers[id].process(xml);
            delete this._handlers[id];
        }
        else if (tag == "events" || tag == "info")
        {
            if (this._datasources.hasOwnProperty(id))
            {
                var datasource = this._datasources[id];

                if (tag == "events")
                {
                    datasource.eventsXml(root);
                }
                else if (tag == "info")
                {
                    datasource.info(root);
                }
            }
        }
        else if (tag == "schema")
        {
            if (id.length > 0)
            {
                if (this._datasources.hasOwnProperty(id))
                {
                    this._datasources[id].setSchemaFromXml(root);
                }
            }
            else if (root.hasAttribute("publisher"))
            {
                id = root.getAttribute("publisher");

                if (this._publishers.hasOwnProperty(id))
                {
                    this._publishers[id].setSchemaFromXml(root);
                }
            }
        }
        else if (tag == "stats")
        {
            this._stats.processXml(xml);
        }
        else if (tag == "log")
        {
            this._log.process(xml);
        }
        else if (tag == "publisher")
        {
            if (this._publishers.hasOwnProperty(id))
            {
                var publisher = this._publishers[id];

                if (root.getAttribute("complete") == "true")
                {
                    publisher._complete = true;
                }
            }
        }
        else if (tag == "connection")
        {
            console.log(xpath.format(root));
        }
        else
        {
            //console.log(xpath.format(root));
        }
    }

    addProjectUpdateDelegate(delegate)
    {
        if (tools.supports(delegate,"projectLoaded") == false || tools.supports(delegate,"projectRemoved") == false)
        {
            tools.exception("The project update delegate must implement the projectLoaded and projectRemoved methods");
        }

        if (tools.addTo(this._projectUpdateDelegates,delegate))
        {
            if (this._projectUpdateDelegates.length == 1)
            {
                var    o = {};
                var request = {"project-status":{}};
                var o = request["project-status"];
                o["on"] = true;
                this.sendObject(request);
            }
        }
    }

    removeProjectUpdateDelegate(delegate)
    {
        if (tools.removeFrom(this._projectUpdateDelegates,delegate))
        {
            if (this._projectUpdateDelegates.length == 0)
            {
                var    o = {};

                var request = {"project-status":{}};
                var o = request["project-status"];
                o["on"] = false;
                this.sendObject(request);
            }
        }
    }

    getDatasource(options)
    {
        var opts = new Options(options);
        var mode = "stream";

        if (opts.hasOpt("mode"))
        {
            mode = opts.getOpt("mode");
        }

        if (mode == "collection")
        {
            return(this.getEventCollection(opts.getOpts()));
        }
        else
        {
            return(this.getEventStream(opts.getOpts()));
        }
    }

    getEventCollection(options)
    {
        return(new Promise((resolve,reject) => {
            options["mode"] = "collection";
            var ec = new EventCollection(this,options);
            this._datasources[ec._id] = ec;
            ec.open().then(
                function(result) {
                    resolve(result);
                },
                function(result) {
                    reject(result);
                }
            );
        }));
    }

    getEventStream(options)
    {
        return(new Promise((resolve,reject) => {
            var es = new EventStream(this,options);
            this._datasources[es._id] = es;
            es.open().then(
                function(result) {
                    resolve(result);
                },
                function(result) {
                    reject(result);
                }
            );
        }));
    }

    getPublisher(options)
    {
        return(new Promise((resolve,reject) => {
            if (options.hasOwnProperty("id"))
            {
                var id = options["id"];

                if (this._publishers.hasOwnProperty(id))
                {
                    return(this._publishers[id]);
                }
            }
            var publisher = new Publisher(this,options);
            this._publishers[publisher._id] = publisher;
            publisher.open().then(
                function(result) {
                    resolve(publisher);
                },
                function(result) {
                    reject(publisher);
                }
            );
        }));
    }

    closePublisher(id)
    {
        if (this._publishers.hasOwnProperty(id))
        {
            var publisher = this._publishers[id];
            publisher.close();
        }
    }

    clearWindow(path)
    {
        var    o = {};

        var request = {"clear-window":{}};
        var o = request["clear-window"];
        o["window"] = path;
        this.sendObject(request);
    }

    publishDataFrom(path,url,options)
    {
        return(new Promise((resolve,reject) => {
            var self = this;
            ajax.create(url).get().then(
                function(result) {
                    self.publishData(path,result.text,options);
                },
                function(result) {
                    console.log(result);
                }
            );
        }));
    }

    publishData(path,data,options)
    {
        return(new Promise((resolve,reject) => {
            var opts = new Options(options);
            var blocksize = opts.getOpt("blocksize",1);
            var times = opts.getOpt("times",1);
            var pause = opts.getOpt("pause",0);
            var id = opts.getOpt("id",tools.guid());
            var o = {};

            var request = {"data-publisher":{}};
            var o = request["data-publisher"];
            o["id"] = id;
            o["window"] = path;
            o["data"] = tools.b64Encode(data);
            o["blocksize"] = blocksize;
            o["times"] = times;
            o["pause"] = pause;
            o["informat"] = opts.getOpt("informat","csv");

            if (opts.hasOpt("dateformat"))
            {
                o["dateformat"] = opts.getOpt("dateformat");
            }

            this.addHandler(id,{
                process:function() {
                    resolve();
                }
            });

            this.sendObject(request);
        }));
    }

    publishUrl(path,url,delegate,options)
    {
        return(new Promise((resolve,reject) => {
            var opts = new Options(options);
            var blocksize = opts.getOpt("blocksize",1);
            var times = opts.getOpt("times",1);
            var o = {};
            var id = tools.guid();

            var request = {"url-publisher":{}};
            var o = request["url-publisher"];
            o["id"] = id;
            o["window"] = path;
            o["url"] = url;
            o["blocksize"] = blocksize;
            o["times"] = times;

            if (opts.hasOpt("informat"))
            {
                o["informat"] = opts.getOpt("informat");
            }

            if (opts.hasOpt("dateformat"))
            {
                o["dateformat"] = opts.getOpt("dateformat");
            }

            this.addHandler(id,{
                process:function() {
                    resolve();
                }
            });

            this.sendObject(request);
        }));
    }

    getStats(options)
    {
        if (options != null)
        {
            this._stats.setOpts(options);
        }
        return(this._stats);
    }

    getLog()
    {
        return(this._log);
    }

    get(url,options)
    {
        return(new Promise((resolve,reject) => {
            var request = {"get":{}};
            var o = request["get"];
            var id = tools.guid();
            o["id"] = id;
            o["url"] = url;
            o["format"] = "ubjson";

            this.addHandler(id,{
                process:function(result) {
                    if (result.hasOwnProperty("data"))
                    {
                        const   opts = new Options(options);
                        var     data = result["data"];

                        if (opts.getOpt("decode",true))
                        {
                            data = tools.b64Decode(data);
                        }

                        resolve(data);
                    }
                    else
                    {
                        reject();
                    }
                }
            });

            this.sendObject(request);
        }));
    }

    getModel(options)
    {
        return(new Promise((resolve,reject) => {
            var id = tools.guid();
            var opts = new Options(options);
            var request = {"model":{}};
            var o = request["model"];
            o["id"] = id;
            o["schema"] = opts.getOpt("schema",false);
            o["index"] = opts.getOpt("index",true);
            o["xml"] = opts.getOpt("xml",false);
            if (opts.hasOpt("name"))
            {
                o["name"] = opts.getOpt("name");
            }

            this.addHandler(id,{
                process:function(xml) {
                    resolve(new Model(xml));
                }
            });

            this.sendObject(request);
        }));
    }

    loadUrl(name,url)
    {
        return(new Promise((resolve,reject) => {
            ajax.create(url).get().then(
                function(result) {
                    resolve(result);
                },
                function(result) {
                    reject(result);
                }
            );
        }));
    }

    loadProjectFrom(name,url,options)
    {
        return(new Promise((resolve,reject) => {

            var self = this;

            ajax.create(url).get().then(
                function(response) {
                    self.loadProject(name,response.text,options).then(
                        function() {
                            resolve();
                        },
                        function() {
                            reject();
                        }
                    );
                },
                function(result) {
                    reject(result);
                }
            );
        }));
    }

    loadRouterFrom(name,url,options)
    {
        return(new Promise((resolve,reject) => {

            var self = this;

            ajax.create(url).get().then(
                function(response) {
                    self.loadRouter(name,response.text,options).then(
                        function() {
                            resolve();
                        },
                        function() {
                            reject();
                        }
                    );
                },
                function(result) {
                    reject(result);
                }
            );
        }));
    }

    loadProject(name,data,options)
    {
        return(new Promise((resolve,reject) => {
            if (this.k8s != null)
            {
                this.k8s.load(data,options).then(
                    function() {
                        resolve();
                    },
                    function() {
                        reject();
                    }
                );
            }
            else
            {
                var id = tools.guid();
                var request = {"project":{}};
                var o = request["project"];
                o["name"] = name;
                o["id"] = id;
                o["action"] = "load";
                if (options != null)
                {
                    for (var x in options)
                    {
                        o[x] = options[x];
                    }
                }
                o["data"] = tools.b64Encode(data);

                this.addHandler(id,{
                    process:function(result) {
                        var code = result["@code"];

                        if (code == 0)
                        {
                            resolve();
                        }
                        else
                        {
                            var message = "";

                            if (result.hasOwnProperty("text"))
                            {
                                message += result["text"];
                            }

                            if (result.hasOwnProperty("details"))
                            {
                                var details = result["details"];
                                for (var detail of details)
                                {
                                    message += "\n";
                                    message += detail["detail"];
                                }
                            }

                            reject(message);
                        }
                    }
                });

                this.sendObject(request);
            }
        }));
    }

    loadRouter(name,data,options)
    {
        return(new Promise((resolve,reject) => {
            var id = tools.guid();
            var request = {"router":{}};
            var o = request["router"];
            o["name"] = name;
            o["id"] = id;
            o["action"] = "load";
            if (options != null)
            {
                for (var x in options)
                {
                    o[x] = options[x];
                }
            }
            o["data"] = tools.b64Encode(data);

            this.addHandler(id,{
                process:function(result) {
                    var code = result["@code"];

                    if (code == 0)
                    {
                        resolve();
                    }
                    else
                    {
                        var message = "";

                        if (result.hasOwnProperty("text"))
                        {
                            message += result["text"];
                        }

                        if (result.hasOwnProperty("details"))
                        {
                            var details = result["details"];
                            for (var detail of details)
                            {
                                message += "\n";
                                message += detail["detail"];
                            }
                        }

                        reject(message);
                    }
                }
            });

            this.sendObject(request);
        }));
    }

    deleteProject(name)
    {
        return(new Promise((resolve,reject) => {
            if (this.k8s != null)
            {
                this.k8s.del().then(
                    function(result) {
                        resolve(result);
                    },
                    function(result) {
                        reject(result);
                    }
                );
            }
            else
            {
                var id = tools.guid();
                var url = this.url;
                var request = {"project":{}};
                var o = request["project"];
                o["name"] = name;
                o["id"] = id;
                o["action"] = "delete";

                this.addHandler(id,{
                    process:function(result) {
                        var code = result["@code"];

                        if (code == 0)
                        {
                            resolve(result);
                        }
                        else
                        {
                            reject(result);
                        }
                    }
                });

                this.sendObject(request);
            }
        }));
    }

    getProjectXml(name,options)
    {
        return(new Promise((resolve,reject) => {
            var id = tools.guid();

            var request = {"xml":{}};
            var o = request["xml"];
            o["id"] = id;
            if (name != null)
            {
                o["name"] = name;
            }

            if (options != null)
            {
                for (var n in options)
                {
                    o[n] = options[n];
                }
            }

            this.addHandler(id,{
                process:function(xml) {
                    var root = xml.documentElement;
                    var node = xml;
                    var code = -1;

                    if (root.hasAttribute("code"))
                    {
                        code = parseInt(root.getAttribute("code"));
                    }

                    if (code == 0)
                    {
                        node = xpath.getNode(".//project",xml);
                    }

                    //var s = xpath.format(node);

                    resolve(node);
                }
            });

            this.sendObject(request);
        }));
    }

    getXml(name,delegate)
    {
        this.getProjectXml(null,delegate);
    }

    getLoggers()
    {
console.log("get loggers");
        return(new Promise((resolve,reject) => {
            var id = tools.guid();

            var request = {"loggers":{}};
            var o = request["loggers"];
            o["id"] = id;

            this.addHandler(id,{
                process:function(result) {
console.log("get loggers results");
                    resolve(result)
                }
            });

            this.sendObject(request);
        }));
    }

    setLogger(context,level)
    {
        return(new Promise((resolve,reject) => {
            var id = tools.guid();
            var request = {"loggers":{}};
            var o = request["loggers"];
            o["id"] = id;
            o["context"] = context;
            o["level"] = level;

            this.addHandler(id,{
                process:function(result) {
                    resolve(result)
                }
            });

            this.sendObject(request);
        }));
    }

    createModel(data)
    {
        return(new Model(data));
    }

    getGuids(num)
    {
        return(new Promise((resolve,reject) => {
            var id = tools.guid();

            var request = {"guids":{}};
            var o = request["guids"];
            o["id"] = id;
            if (num != null)
            {
                o["num"] = num;
            }

            this.addHandler(id,{
                process:function(xml) {
                    var guids = [];
                    var nodes = xpath.getNodes("./guid",xml.documentElement);
                    for (var i = 0; i < nodes.length; i++)
                    {
                        guids.push(xpath.nodeText(nodes[i]));
                    }
                    resolve(guids);
                }
            });

            this.sendObject(request);
        }));
    }

    guid()
    {
        return(tools.guid());
    }

    getStatus()
    {
        this.sendObject({request:"status"});
    }

    createVersion(value)
    {
        var s = new String(value);
        var a = s.split(".");
        var major = 0;
        var minor = 0;

        if (a.length == 2)
        {
            major = parseInt(a[0]);
            minor = parseInt(a[1]);
        }

        return({major:major,minor:minor});
    }

    createEventSources(delegate)
    {
        return(eventsources.createEventSources(this,delegate));
    }

    handleError(o,delegate)
    {
        var message = "";

        if (o.hasOwnProperty("text"))
        {
            message += o["text"];
        }

        if (o.hasOwnProperty("details"))
        {
            var details = o["details"];
            for (var detail of details)
            {
                message += "\n";
                message += detail["detail"];
            }
        }

        if (tools.supports(delegate,"error"))
        {
            delegate.error(message);
        }
        else
        {
            console.log(message);
        }
    }

    toString()
    {
        var s = "";
        s += this._connection.getUrl();
        return(s);
    }
}

class Datasource extends Options
{
    constructor(api,options)
    {
        super(options);
        this._api = api;
        this._id = this.getOpt("id",tools.guid());
        this._path = this.getOpt("window");
        this._schema = new Schema();

        Object.defineProperty(this,"id", {
            get() {
                return(this._id);
            }
        });

        Object.defineProperty(this,"api", {
            get() {
                return(this._api);
            }
        });

        Object.defineProperty(this,"schema", {
            get() {
                return(this._schema);
            }
        });

        Object.defineProperty(this,"name", {
            get() {
                var s = this.getOpt("name","");
                if (s.length == 0)
                {
                    s = this.getOpt("window");
                }
                return(s);
            },
            set(value) {
                this.setOpt("name",value);
            }
        });

        Object.defineProperty(this,"size", {
            get() {
                var size = 0;
                if (this._data != null)
                {
                    if (Array.isArray(this._data))
                    {
                        size = this._data.length;
                    }
                    else
                    {
                        size = Object.keys(this._data).length;
                    }
                }
                return(size);
            }
        });

        this._data = null;
        this._list = null;
        this._delegates = [];

        this._paused = false;
    }

    isArray()
    {
        return(this._data != null && Array.isArray(this._data));
    }

    setIntervalProperty()
    {
        var interval = null;

        if (this.hasOpt("interval"))
        {
            interval = this.getOpt("interval");
        }
        else if (this._api.hasOpt("interval"))
        {
            interval = this._api.getOpt("interval");
        }

        if (interval == null)
        {
            interval = 0;
        }

        this.setOpt("interval",interval);
    }

    setFilter(value)
    {
        this.setOpt("filter",value)
        this.set(true);
        this.deliverFilterChange();
    }

    clearFilter()
    {
        this.clearOpt("filter");
        this.set(true);
        this.deliverFilterChange();
    }

    getFilter()
    {
        return(this.getOpt("filter"));
    }

    play()
    {
        this._paused = false;
    }

    pause()
    {
        this._paused = true;
    }

    togglePlay()
    {
        var code = false;

        if (this._paused)
        {
            this.play();
            code = true;
        }
        else
        {
            this.pause();
        }

        return(code);
    }

    setSchemaFromXml(xml)
    {
        this._schema.fromXml(xml);
    }

    setSchemaFromJson(json)
    {
        this._schema.fromJson(json,this);
    }

    getKey(o)
    {
        var key = "";
        var name;

        this._schema._keyFields.forEach((f) =>
        {
            name = f.getOpt("name");

            if (o.hasOwnProperty(name) == false)
            {
                return;
            }

            if (key.length > 0)
            {
                key += "-";
            } 

            key += o[name];
        });

        return(key);
    }

    isSelected(item)
    {
        return(item != null && item.hasOwnProperty("@selected") && item["@selected"] == true);
    }

    toggleSelectedKeys(keys,deselect)
    {
        if (deselect)
        {
            this.deselectAll();
        }

        var item;

        keys.forEach((key) => {
            if ((item = this.getDataByKey(key)) != null)
            {
                this.toggleSelected(item);
            }
        });

        this.deliverSelectionChange(null,false);
    }

    toggleSelected(item)
    {
        if (item.hasOwnProperty("@selected"))
        {
            item["@selected"] = item["@selected"] ? false : true;
        }
        else
        {
            item["@selected"] = false;
        }

        return(item["@selected"]);
    }

    deselectAll()
    {
        if (Array.isArray(this._data))
        {
            this._data.forEach(item =>
            {
                item["@selected"] = false;
            });
        }
        else
        {
            Object.values(this._data).forEach(item =>
            {
                item["@selected"] = false;
            });
        }
    }

    setSelectedIndices(indices,deselect)
    {
        if (deselect)
        {
            this.deselectAll();
        }

        var items = this.getList();
        var item;

        indices.forEach(index =>
        {
            if (index < items.length)
            {
                item = items[index];
                item["@selected"] = true;
            }
        });

        //this.deliverDataChange(null,false);
        this.deliverSelectionChange(null,false);
    }

    toggleSelectedIndices(indices,deselect)
    {
        if (deselect)
        {
            this.deselectAll();
        }

        var items = this.getList();

        indices.forEach(index =>
        {
            if (index < items.length)
            {
                this.toggleSelected(items[index]);
            }
        });

        this.deliverSelectionChange(null,false);
    }

    selectByKeys(keys)
    {
        this.deselectAll();

        keys.forEach(key =>
        {
            console.log("key: " + key);
        });
    }

    getSelectedItems()
    {
        var items = [];

        this.getList().forEach(item =>
        {
            if (this.isSelected(item))
            {
                items.push(item);
            }
        });

        return(items);
    }

    getSelectedIndices()
    {
        var indices = [];
        var i = 0;

        this.getList().forEach(item =>
        {
            if (this.isSelected(item))
            {
                indices.push(i);
            }

            i++;
        });

        return(indices);
    }

    getSelectedKeys()
    {
        var keys = [];

        this.getList().forEach(item =>
        {
            if (this.isSelected(item))
            {
                keys.push(item["@key"]);
            }
        });

        return(keys);
    }

    getSelectedItem()
    {
        var a = this.getSelectedItems();
        return(a.length > 0 ? a[0] : null);
    }

    getSelectedIndex()
    {
        var a = this.getSelectedIndices();
        return(a.length > 0 ? a[0] : null);
    }

    getSelectedKey()
    {
        var a = this.getSelectedKeys();
        return(a.length > 0 ? a[0] : null);
    }

    getKeyValues()
    {
        var values = [];

        if (Array.isArray(this._data))
        {
            for (var item of this._data)
            {
                values.push(item["@key"]);
            }
        }
        else
        {
            for (var key in this._data)
            {
                values.push(key);
            }
        }

        return(values);
    }

    getList()
    {
        var a = null;

        if (this._data != null)
        {
            if (Array.isArray(this._data))
            {
                a = this._data;
            }
            else if (this._list != null)
            {
                a = this._list;
            }
            else
            {
                a = [];
                for (var key in this._data)
                {
                    a.push(this._data[key]);
                }
            }
        }

        return(a);
    }

    getValues(name)
    {
        var f = this._schema.getField(name);

        if (f == null)
        {
            return(null);
        }

        var values = [];
        var numeric = f.getOpt("isNumber",false);

        if (Array.isArray(this._data) || this._list != null)
        {
            var a = (this._list != null) ? this._list : this._data;

            a.forEach((item) =>
            {
                if (item.hasOwnProperty(name))
                {
                    if (numeric)
                    {
                        values.push(parseFloat(item[name]));
                    }
                    else
                    {
                        values.push(item[name]);
                    }
                }
                else if (numeric)
                {
                    values.push(0.0);
                }
                else
                {
                    values.push("");
                }
            });
        }
        else
        {
            var item;

            for (var key in this._data)
            {
                item = this._data[key];

                if (item.hasOwnProperty(name))
                {
                    if (numeric)
                    {
                        values.push(parseFloat(item[name]));
                    }
                    else
                    {
                        values.push(item[name]);
                    }
                }
                else if (numeric)
                {
                    values.push(0.0);
                }
                else
                {
                    values.push("");
                }

            }
        }

        return(values);
    }

    getLimits(name)
    {
        var limits = null;
        var a = this.getValues(name);

        if (a.length > 0)
        {
            var min = Math.min.apply(Math,a);
            var max = Math.max.apply(Math,a);
            limits = {min:min,max:max,values:a};
        }

        return(limits);
    }

    getValuesBy(keys,names,keyfilter,delimiter = ".")
    {
        if (this.schema.size == 0)
        {
            return(null);
        }

        var keyFieldValues = {};
        var keyFields = [];
        var f;

        for (var s of keys)
        {
            if ((f = this._schema.getField(s)) == null)
            {
                throw("field " + s + " not found");
            }

            if (keyfilter != null && keyfilter.hasOwnProperty(f.getOpt("name")))
            {
                continue;
            }

            keyFields.push(f);
            keyFieldValues[f.getOpt("name")] = [];
        }

        var dateKeys = false;
        var timeKeys = false;

        if (keyFields.length == 1)
        {
            f = keyFields[0];

            if (f.getOpt("isDate",false))
            {
                dateKeys = true;
            }
            else if (f.getOpt("isTime",false))
            {
                timeKeys = true;
            }
        }

        var valueFields = [];

        for (var s of names)
        {
            if ((f = this._schema.getField(s)) == null)
            {
                throw("field " + s + " not found");
            }
            valueFields.push(f);
        }

        var items = this.getList();

        if (items == null)
        {
            throw("invalid data");
        }

        var data = {};
        var value;
        var entry;
        var name;
        var key;

        for (var o of items)
        {
            if (keyfilter != null)
            {
                var match = true;

                for (var x in keyfilter)
                {
                    if (keyfilter[x] != o[x])
                    {
                        match = false;
                        break;
                    }
                }

                if (match == false)
                {
                    continue;
                }
            }

            key = "";

            keyFields.forEach((f) =>
            {
                name = f.getOpt("name");
                if (o.hasOwnProperty(name))
                {
                    value = o[name];
                    if (key.length > 0)
                    {
                        key += delimiter;
                    }
                    key += value;

                    if (keyFieldValues[name].includes(value) == false)
                    {
                        keyFieldValues[name].push(value);
                    }
                }
            });

            if (data.hasOwnProperty(key))
            {
                entry = data[key];
            }
            else
            {
                entry = {};
                for (f of valueFields)
                {
                    name = f.getOpt("name");
                    entry[name] = 0.0;
                }
                data[key] = {key:key,data:entry,selected:this.isSelected(o)};
            }

            for (f of valueFields)
            {
                if (f.getOpt("isNumber",false))
                {
                    name = f.getOpt("name");
                    entry[name] += parseFloat(o[name]);
                }
            }
        }

        var values = {};

        for (f of valueFields)
        {
            name = f.getOpt("name");
            values[name] = [];
        }

        var keyValues = [];
        var selected = [];

        Object.values(data).forEach((o) =>
        {
            key = o["key"];
            entry = o["data"];

            if (dateKeys)
            {
                var date = new Date();
                var seconds = new Number(key) * 1000;
                date.setTime(seconds);
                keyValues.push(date);
            }
            else if (timeKeys)
            {
                var date = new Date();
                var seconds = new Number(key) / 1000;
                date.setTime(seconds);
                keyValues.push(date);
            }
            else
            {
                keyValues.push(key);
            }

            selected.push(o["selected"]);

            for (f of valueFields)
            {
                name = f.getOpt("name");
                if (f.getOpt("isNumber",false))
                {
                    values[name].push(parseFloat(entry[name]));
                }
                else
                {
                    values[name].push(entry[name]);
                }
            }
        });

        var v = {keys:keyValues,keyvalues:keyFieldValues,values:values,selected:selected};
        return(v);
    }

    getKeyFieldNames()
    {
        return(this._schema != null ? this._schema.getKeyFieldNames() : null);
    }

    events(xml)
    {
    }

    info(xml)
    {
    }

    set(value)
    {
    }

    addDelegate(delegate)
    {
        if (tools.supports(delegate,"dataChanged") == false)
        {
            tools.exception("The datasource delegate must implement the dataChanged method");
        }

        tools.addTo(this._delegates,delegate);
    }

    removeDelegate(delegate)
    {
        tools.removeFrom(this._delegates,delegate);
    }

    clear()
    {
        if (this._data != null)
        {
            if (Array.isArray(this._data))
            {
                this._data = [];
            }
            else
            {
                this._data = [];
            }
        }

        this.deliverDataChange(null,true);
    }

    deliverDataChange(data,clear)
    {
        this._delegates.forEach((d) =>
        {
            d.dataChanged(this,data,clear);
        });
    }

    deliverInfoChange()
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"infoChanged"))
            {
                d.infoChanged(this);
            }
        });
    }

    deliverInfo(data)
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"info"))
            {
                d.info(this,data);
            }
        });
    }

    deliverFilterChange()
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"filterChanged"))
            {
                d.filterChanged(this);
            }
        });
    }

    deliverSelectionChange()
    {
        this._delegates.forEach(d =>
        {
            if (tools.supports(d,"selectionChanged"))
            {
                d.selectionChanged(this);
            }
        });
    }

    getDataByKey(key)
    {
        var data = null;

        if (this._data != null)
        {
            if (Array.isArray(this._data))
            {
                for (var d of this._data)
                {
                    if (key == d["@key"])
                    {
                        data = d;
                        break;
                    }
                }
            }
            else
            {
                data = this._data[key];
            }
        }

        return(data);
    }

    createDataFromCsv(data)
    {
        var items = null;

        if (this._schema != null)
        {
            items = this._schema.createDataFromCsv(data);
        }

        return(items);
    }
}

class EventCollection extends Datasource
{
    constructor(conn,options)
    {
        super(conn,options);
        this.setOpt("format","ubjson");
        this._data = {};
        this._list = [];
        this._page = 0;
        this._pages = 0;
        this._sort = null;
        this._sortdir = 0;
    }

    open()
    {
        return(new Promise((resolve,reject) => {
            var request = {"event-collection":{}};
            var o = request["event-collection"];
            o["id"] = this._id;
            o["action"] = "set";
            o["window"] = this._path;
            o["schema"] = true;
            o["load"] = true;
            o["info"] = 5;
            o["format"] = "xml";

            this.setIntervalProperty();

            var options = this.getOpts();
            for (var x in options)
            {
                o[x] = options[x];
            }

            if (this.hasOpt("filter") == false)
            {
                o["filter"] = "";
            }

            const   self = this;

            this._api.addHandler(this._id,{
                process:function(result) {
                    self._schema.fromJson(result);
                    resolve(self);
                },
                error:function(result) {
                    reject(self);
                }
            });

            this._api.sendObject(request);
        }));
    }

    set(load)
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "set";

        this.setIntervalProperty();

        var options = this.getOpts();
        for (var x in options)
        {
            o[x] = options[x];
        }

        if (this.hasOpt("filter") == false)
        {
            o["filter"] = "";
        }

        o["load"] = (load == true);

        this._api.sendObject(request);
    }

    close()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "close";
        this._api.sendObject(request);
    }

    play()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "play";
        this._api.sendObject(request);
        super.play(this);
    }

    pause()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "pause";
        this._api.sendObject(request);
        super.play(this);
    }

    sort(a,b)
    {
        var v1 = parseFloat(a[this._sort]);
        var v2 = parseFloat(b[this._sort]);
        return((this._sortdir == 0) ? (v2 - v1) : (v1 - v2));
    }

    load()
    {
        this.loadPage(null);
    }

    first()
    {
        this.loadPage("first");
    }

    last()
    {
        this.loadPage("last");
    }

    prev()
    {
        this.loadPage("prev");
    }

    next()
    {
        this.loadPage("next");
    }

    loadPage(page)
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "load";
        if (page != null)
        {
            o["page"] = page;
        }
        this._api.sendObject(request);
    }

    setSchemaFromXml(xml)
    {
        super.setSchemaFromXml(xml);
        this.deliverSchemaSet();
    }

    setSchemaFromJson(json)
    {
        super.setSchemaFromJson(json);
        this.deliverSchemaSet();
    }

    events(data)
    {
        if (this.getOpt("debug"))
        {
            console.log("events for " + this._path);
            console.log(tools.stringify(data));
        }

        if (data.hasOwnProperty("entries") == false)
        {
            return;
        }

        var events = [];
        var entries = data["entries"];

        if (entries != null)
        {
            var o;

            entries.forEach((e) =>
            {
                o = {};
                for (var k in e)
                {
                    o[k] = e[k];
                }
                if (o.hasOwnProperty("@opcode") == false)
                {
                    o["@opcode"] = "insert";
                }

                o["@key"] = this.getKey(o);
                events.push(o);
            });
        }

        var info = (data.hasOwnProperty("info")) ? data["info"] : null;

        this.process(events,info != null);

        if (info != null)
        {
            this.info(info);
        }
    }

    eventsXml(xml)
    {
        if (this.getOpt("debug"))
        {
            console.log("events for " + this._path);
            console.log(xpath.format(xml));
        }

        var data = [];
        var    nodes = xpath.getNodes("//entries/event",xml);
        var datatype;
        var content;
        var values;
        var opcode;
        var s;

        xpath.getNodes("//entries/event",xml).forEach((n) =>
        {
            opcode = n.getAttribute("opcode");
            if (opcode == null || opcode.length == 0)
            {
                opcode = "insert";
            }

            o = {};
            o["@opcode"] = opcode;

            s = n.getAttribute("timestamp");

            if (s != null && s.length > 0)
            {
                o["@timestamp"] = s;
            }

            xpath.getNodes("./*",n).forEach(function(v)
            {
                datatype = v.getAttribute("type")
                content = v.textContent;

                if (datatype != null && datatype.length > 0)
                {
                    o[v.nodeName] = "_data://" + datatype + ":" + content;
                }
                else
                {
                    o[v.nodeName] = content;
                }
            });

            o["@key"] = this.getKey(o);
            data.push(o);
        });

        var clear = xml.hasAttribute("page");

        this.process(data,clear);

        if (clear)
        {
            this.info(xml);
        }

        //console.log(JSON.stringify(data));
    }

    info(data)
    {
        if (data.hasOwnProperty("page"))
        {
            this._page = data["page"];
            this._pages = data["pages"];
            this.deliverInfoChange();
        }
    }

    process(events,clear)
    {
        var selected = null;

        if (clear)
        {
            selected = this.getSelectedKeys();
            this._data = {};
            this._list = [];
        }

        var opcode;
        var key;
        var o;

        events.forEach((e) =>
        {
            key = e["@key"]

            if (key != null)
            {
                opcode = e["@opcode"]

                if (opcode == "delete")
                {
                    if (this._data.hasOwnProperty(key))
                    {
                        tools.removeFrom(this._list,this._data[key]);
                        delete this._data[key];
                    }
                }
                else if (clear)
                {
                    o = {};
                    o["@key"] = key;
                    this._data[key] = o;
                    this._list.push(o);
                    o["@selected"] = selected.includes(key);

                    this._schema._columns.forEach((column) =>
                    {
                        if (e.hasOwnProperty(column))
                        {
                            o[column] = e[column];
                        }
                    });
                }
                else
                {
                    if (this._data.hasOwnProperty(key))
                    {
                        o = this._data[key];
                        tools.setItem(this._list,o);
                    }
                    else
                    {
                        o = {};
                        o["@key"] = key;
                        o["@selected"] = false;
                        this._data[key] = o;
                        this._list.push(o);
                    }

                    this._schema._columns.forEach((column) =>
                    {
                        if (e.hasOwnProperty(column))
                        {
                            o[column] = e[column];
                        }
                    });
                }
            }
        });

        this.deliverDataChange(events,clear)
    }
}

class EventStream extends Datasource
{
    constructor(conn,options)
    {
        super(conn,options);
        this.setOpt("format","ubjson");
        this._data = [];
        this._counter = 1;
    }

    open()
    {
        return(new Promise((resolve,reject) => {
            var request = {"event-stream":{}};
            var o = request["event-stream"];
            o["id"] = this._id;
            o["action"] = "set";
            o["window"] = this._path;
            o["schema"] = true;
            o["load"]= true;
            o["format"] = "xml";

            this.setIntervalProperty();

            var options = this.getOpts();
            for (var x in options)
            {
                o[x] = options[x];
            }

            if (this.hasOpt("filter") == false)
            {
                o["filter"] = "";
            }

            const   self = this;

            this._api.addHandler(this._id,{
                process:function(result) {
                    self._schema.fromJson(result);

                    for (var i = 0; i < self._schema._fields.length; i++)
                    {
                        self._schema._fields[i].setOpt("isKey",false);
                    }

                    var f;

                    f = new Options({"name":"@opcode","espType":"utf8str","type":"string","isKey":false,"isNumber":false,"isDate":false,"isTime":false});
                    self._schema._fields.unshift(f);
                    self._schema._columns.unshift(f.getOpt("name"));
                    self._schema._fieldMap[f.getOpt("name")] = f;

                    f = new Options({"name":"@timestamp","espType":"timestamp","type":"date","isKey":false,"isNumber":true,"isDate":false,"isTime":true});
                    self._schema._fields.unshift(f);
                    self._schema._columns.unshift(f.getOpt("name"));
                    self._schema._fieldMap[f.getOpt("name")] = f;

                    f = new Options({"name":"@counter","espType":"int32","type":"int","isKey":true,"isNumber":true,"isDate":false,"isTime":false});
                    self._schema._fields.unshift(f);
                    self._schema._columns.unshift(f.getOpt("name"));
                    self._schema._fieldMap[f.getOpt("name")] = f;

                    self._schema._keyFields = [f];

                    resolve(self);
                },
                error:function(result) {
                    reject(self);
                }
            });

            this._api.sendObject(request);
        }));
    }

    set(load)
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "set";

        this.setIntervalProperty();

        var options = this.getOpts();
        for (var x in options)
        {
            o[x] = options[x];
        }

        if (this.hasOpt("filter") == false)
        {
            o["filter"] = "";
        }

        o["load"] = (load == true);

        this._api.sendObject(request);
    }

    close()
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "close";
        this._api.sendObject(request);
    }

    play()
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "play";
        this._api.sendObject(request);
        super.play(this);
    }

    pause()
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "pause";
        this._api.sendObject(request);
        super.play(this);
    }

    setSchemaFromXml(xml)
    {
        super.setSchemaFromXml(xml,this);
        this.deliverSchemaSet();
    }

    setSchemaFromJson(json)
    {
        super.setSchemaFromJson(json);
        this.deliverSchemaSet();
    }

    events(data)
    {
        if (this.getOpt("debug"))
        {
            console.log("events for " + this._path);
            console.log(tools.stringify(data));
        }

        if (data.hasOwnProperty("entries") == false)
        {
            return;
        }

        var entries = data["entries"];
        var events = [];

        if (entries != null)
        {
            var ignoreDeletes = this.getOpt("ignore_deletes",false);
            var o;

            for (var e of entries)
            {
                o = {};
                for (var k in e)
                {
                    o[k] = e[k];
                }
                if (o.hasOwnProperty("@opcode") == false)
                {
                    o["@opcode"] = "insert";
                }
                else if (ignoreDeletes && o["@opcode"] == "delete")
                {
                    continue;
                }

                o["@key"] = this.getKey(o);
                events.push(o);
            }
        }

        this.process(events);
    }

    eventsXml(xml)
    {
        if (this.getOpt("debug"))
        {
            console.log("events for " + this._path);
            console.log(xpath.format(xml));
        }

        var    nodes = xpath.getNodes("//entries/event",xml);
        var    data = new Array();
        var    content;
        var    values;
        var    opcode;
        var    type;
        var    key;
        var    e;
        var    o;

        var ignoreDeletes = this.getOpt("ignore_deletes",false);

        for (var i = 0; i < nodes.length; i++)
        {
            e = nodes[i];

            opcode = e.getAttribute("opcode");

            if (opcode == null || opcode.length == 0)
            {
                opcode = "insert";
            }

            if (opcode == "delete" && ignoreDeletes)
            {
                continue;
            }

            o = {};
            o["@opcode"] = opcode;

            s = e.getAttribute("timestamp");

            if (s != null && s.length > 0)
            {
                o["@timestamp"] = s;
            }
            values = xpath.getNodes("./*",e);
            for (var j = 0; j < values.length; j++)
            {
                type = values[j].getAttribute("type");
                content = values[j].textContent;

                if (type != null && type.length > 0)
                {
                    //o[values[j].nodeName] = "_data://" + type + ":" + content;
                    o[values[j].nodeName] = content;
                }
                else
                {
                    o[values[j].nodeName] = content;
                }
            }

            data.push(o);
        }

        this.process(data);
    }

    process(events)
    {
        var o;

        for (var e of events)
        {
            o = {}

            for (var column of this._schema._columns)
            {
                if (e.hasOwnProperty(column))
                {
                    o[column] = e[column];
                }
            }

            o["@counter"] = this._counter;
            o["@key"] = this.getKey(o);
            o["@selected"] = false;
            e["@counter"] = o["@counter"];
            e["@key"] = o["@key"];

            this._counter += 1;

            this._data.push(o);
        }

        var maxEvents = this.getOpt("maxevents",50);
        var diff = this._data.length - maxEvents;

        if (diff > 0)
        {
            for (var i = 0; i < diff; i++)
            {
                this._data.shift();
            }
        }
 
        this.deliverDataChange(events,false);
    }

    info(xml)
    {
    }
}

class Stats extends Options
{
    constructor(api,options)
    {
        super(options);
        this._api = api;

        var    projectLabel = resources.getString("Project");
        var    contqueryLabel = resources.getString("Contquery");
        var    windowLabel = resources.getString("Window");
        var    cpuLabel = resources.getString("CPU");
        var    intervalLabel = resources.getString("Interval");
        var    countLabel = resources.getString("Count");

        var    fields = new Array();
        fields.push({"name":"project","label":projectLabel,"isKey":true});
        fields.push({"name":"contquery","label":contqueryLabel,"isKey":true});
        fields.push({"name":"window","label":windowLabel,"isKey":true});
        fields.push({"name":"cpu","label":cpuLabel,"type":"int"});
        fields.push({"name":"interval","label":intervalLabel,"type":"int"});
        fields.push({"name":"count","label":countLabel,"type":"int"});

        Object.defineProperty(this,"api", {
            get() {
                return(this._api);
            }
        });

        Object.defineProperty(this,"windows", {
            get() {
                return(this._windows);
            }
        });

        Object.defineProperty(this,"memory", {
            get() {
                return(this._memory);
            }
        });

        Object.defineProperty(this,"config", {
            get() {
                return(this._config);
            }
        });

        this._windows = [];
        this._memory = {};
        this._config = {};
        this._delegates = [];
    }

    process(o)
    {
    }

    processJson(json)
    {
        this._windows = [];

        if (json.hasOwnProperty("projects"))
        {
            var    projects = json["projects"];

            for (var i = 0; i < projects.length; i++)
            {
                var project = projects[i];

                if (project.hasOwnProperty("contqueries") == false)
                {
                    continue;
                }

                var p = project["@name"];
                var contqueries = project["contqueries"];

                for (var j = 0; j < contqueries.length; j++)
                {
                    var contquery = contqueries[j];

                    if (contquery.hasOwnProperty("windows") == false)
                    {
                        continue;
                    }

                    var cq = contquery["@name"];
                    var    windows = contquery["windows"];

                    for (var k = 0; k < windows.length; k++)
                    {
                        var w = windows[k];
                        var o = new Object();
                        o["project"] = p;
                        o["contquery"] = cq;
                        o["window"] = w["@name"];
                        o["cpu"] = new Number(w["@cpu"]);
                        o["interval"] = new Number(w["@interval"]);
                        o["count"] = w.hasOwnProperty("@count") ? new Number(w["@count"]) : 0;
                        o["@key"] = p + "." + cq + "." + w["@name"];
                        this._windows.push(o);
                    }
                }
            }
        }

        this._windows.sort(this.sort);

        this._memory = {};

        if (json.hasOwnProperty("server-memory"))
        {
            var    memory = json["server-memory"];
            this._memory["system"] = memory["system"];
            this._memory["virtual"] = memory["virtual"];
            this._memory["resident"] = memory["resident"];
        }

        this._config = {};

        if (json.hasOwnProperty("properties"))
        {
            var    properties = json["properties"];
            var name;
            var value;

            for (var i = 0; i < properties.length; i++)
            {
                name = properties[i]["@name"];
                value = properties[i]["*value"];
                this._config[name] = (value != null && value.length > 0) ? value : true;
            }
        }

        for (var i = 0; i < this._delegates.length; i++)
        {
            this._delegates[i].handleStats(this);
        }
    }

    processXml(xml)
    {
        this._windows = [];

        var    projects = xpath.getNodes(".//project",xml);
        var    contqueries;
        var    windows;
        var    p;
        var    cq;
        var    w;
        var    o;

        for (var i = 0; i < projects.length; i++)
        {
            p = projects[i].getAttribute("name");

            contqueries = xpath.getNodes("./contquery",projects[i]);

            for (var j = 0; j < contqueries.length; j++)
            {
                cq = contqueries[j].getAttribute("name");

                windows = xpath.getNodes("./window",contqueries[j]);

                for (var k = 0; k < windows.length; k++)
                {
                    w = windows[k];
                    o = new Object();
                    o["project"] = p;
                    o["contquery"] = cq;
                    o["window"] = w.getAttribute("name");
                    o["cpu"] = new Number(w.getAttribute("cpu"));
                    o["interval"] = new Number(w.getAttribute("interval"));
                    o["count"] = new Number(w.getAttribute("count"));
                    this._windows.push(o);
                }
            }
        }

        this._windows.sort(this.sort);

        this._memory = {};

        var    memory = xpath.getNode(".//server-memory",xml);

        if (memory != null)
        {
            this._memory["system"] = parseInt(xpath.getString("system",memory));
            this._memory["virtual"] = parseInt(xpath.getString("virtual",memory));
            this._memory["resident"] = parseInt(xpath.getString("resident",memory));
        }

        this._config = {};

        var    nodes = xpath.getNodes(".//properties/property",xml);

        if (nodes.length > 0)
        {
            var name;
            var value;
            for (var x of nodes)
            {
                name = x.getAttribute("name");
                value = xpath.nodeText(x);
                this._config[name] = (value.length > 0) ? value : true;
            }
        }

        for (var i = 0; i < this._delegates.length; i++)
        {
            this._delegates[i].handleStats(this);
        }
    }

    sort(a,b)
    {
        return(b - a);
    }

    optionSet(name,value)
    {
        if (this._delegates != null && this._delegates.length > 0)
        {
            this.set();
        }
    }

    set()
    {
        var request = {"stats":{}};
        var o = request["stats"];
        o["action"] = "set";
        o["interval"] = this.getOpt("interval",1);

        o["minCpu"] = this.getOpt("mincpu",5);
        o["counts"] = this.getOpt("counts",false);
        o["config"] = this.getOpt("config",false);
        o["memory"] = this.getOpt("memory",true);
        o["format"] = "xml";
        o["format"] = "ubjson";

        this._api.sendObject(request);
    }

    stop()
    {
        var request = {"stats":{}};
        var o = request["stats"];
        o["action"] = "stop";
        this._api.sendObject(request);
    }

    addDelegate(delegate)
    {
        if (tools.supports(delegate,"handleStats") == false)
        {
            throw "The stats delegate must implement the handleStats method";
        }

        if (tools.addTo(this._delegates,delegate))
        {
            if (this._delegates.length == 1)
            {
                this.set();
            }
        }
    }

    removeDelegate(delegate)
    {
        if (tools.removeFrom(this._delegates,delegate))
        {
            if (this._delegates.length == 0)
            {
                this.stop();
            }
        }
    }

    getWindows()
    {
        return(this._windows);
    }

    getMemoryData()
    {
        return(this._memory);
    }

    getConfig()
    {
        return(this._config);
    }
}

class Log
{
    constructor(api)
    {
        this._api = api;
        this._delegates = [];

        this._filter = null;

        Object.defineProperty(this,"filter", {
            get() {
                return(this._filter);
            },
            set(value) {
                this._filter = value;
                var request = {"logs":{}};
                var o = request["logs"];
                o["filter"] = this._filter;
                this._api.sendObject(request);
            }
        });
    }

    process(xml)
    {
        var message = xpath.nodeText(xml.documentElement);

        for (var i = 0; i < this._delegates.length; i++)
        {
            this._delegates[i].handleLog(this,this.createObject(message));
        }
    }

    createObject(text)
    {
        if (text == null || text.length == 0)
        {
            return(null);
        }

        var o = null;

        if (text[0] == '{')
        {
            try
            {
                o = JSON.parse(text);
            }
            catch (e)
            {
                console.log("log parse error");
            }
        }
        else
        {
            o = {};
            o["_timestamp"] = text.substr(0,19);

            var i1 = text.indexOf("[");
            var i2;

            if (i1 != -1)
            {
                i2 = text.indexOf("]",i1);

                if (i2 != -1)
                {
                    var s = text.substring(i1 + 1,i2 - 1)
                    var a = s.split(":");

                    if (a.length == 3)
                    {
                        o["logLevel"] = a[0];
                        o["messageFile"] = a[1];
                        o["messageLine"] = a[2];
                    }
                }
            }

            if (i2 != -1)
            {
                var i1 = text.indexOf("[",i2 + 1);

                if (i1 != -1)
                {
                    i2 = text.indexOf("]",i1 + 1);
                }

                if (i2 != -1)
                {
                    var s = text.substr(i2 + 1);
                    s = text.replace(this._newlines,"<br/>");
                    s = text.replace(this._spaces,"&nbsp;");
                    o["messageContent"] = s;
                }
            }
        }

        return(o);
    }

    start()
    {
        var request = {"logs":{}};
        var o = request["logs"];
        o["capture"] = true;
        this._api.sendObject(request);
    }

    stop()
    {
        var request = {"logs":{}};
        var o = request["logs"];
        o["capture"] = true;
        o["capture"] = false;
        this._api.sendObject(request);
    }

    addDelegate(delegate)
    {
        if (tools.supports(delegate,"handleLog") == false)
        {
            throw "The stats delegate must implement the handleLog method";
        }

        if (tools.addTo(this._delegates,delegate))
        {
            if (this._delegates.length == 1)
            {
                this.start();
            }
        }

        return(true);
    }

    removeDelegate(delegate)
    {
        if (tools.removeFrom(this._delegates,delegate))
        {
            if (this._delegates.length == 0)
            {
                this.stop();
            }
        }
    }
}

class Publisher extends Options
{
    constructor(api,options)
    {
        super(options);
        this._api = api;
        this._path = this.getOpt("window");
        this._id = this.getOpt("id",tools.guid());
        this._data = new Array();
        this._schema = new Schema();
        this._total = 0;
        this._csv = null;

        Object.defineProperty(this,"schema", {
            get() {
                return(this._schema);
            }
        });

        Object.defineProperty(this,"size", {
            get() {
                return(this._data.length);
            }
        });

        Object.defineProperty(this,"total", {
            get() {
                return(this._total);
            }
        });
    }

    open()
    {
        return(new Promise((resolve,reject) => {
            var o = {};

            this.addOpts(o);

            var request = {"publisher":{}};
            var o = request["publisher"];
            o["id"] = this._id;
            o["action"] = "set";
            o["window"] = this._path;
            o["schema"] = true;

            if (this.hasOpt("dateformat"))
            {
                o["dateformat"] = this.getOpt("dateformat");
            }

            if (this._api._publishers.hasOwnProperty(this._id) == false)
            {
                this._api._publishers[this._id] = this;
            }

            const   self = this;

            this._api.addHandler(this._id,{
                process:function(result) {
                    self._schema.fromJson(result);
                    resolve();
                },
                error:function(result) {
                    console.log("error");
                    reject();
                }
            });

            this._api.sendObject(request);
        }));
    }

    close()
    {
        var request = {"publisher":{}};
        var o = request["publisher"];
        o["id"] = this._id;
        o["action"] = "delete";

        if (this._api._publishers.hasOwnProperty(this._id))
        {
            delete this._api._publishers[this._id];
        }

        this._api.sendObject(request);
    }

    begin()
    {
        this._o = new Object();
    }

    set(name,value)
    {
        if (this._o != null)
        {
            this._o[name] = value;
        }
    }

    end()
    {
        if (this._o != null)
        {
            this._data.push(this._o);
            this._o = new Object();
        }
    }

    add(o)
    {
        if (Array.isArray(o))
        {
            for (var data of o)
            {
                this._data.push(o);
            }
        }
        else
        {
            this._data.push(o);
        }
    }

    publish()
    {
        if (this._data.length > 0)
        {
            var request = {"publisher":{}};
            var o = request["publisher"];
            o["id"] = this._id;
            o["action"] = "publish";
            o["data"] = this._data;
            if (this.getOpt("binary",false))
            {
                this._api.sendBinary(request);
            }
            else
            {
                this._api.sendObject(request);
            }
            this._total += this._data.length;
            this._data = new Array();
        }
    }

    send()
    {
        if (this._csv.index < this._csv.items.length)
        {
            const   blocksize = this.getOpt("blocksize",1);

            while (this._csv.index < this._csv.items.length)
            {
                this.add(this._csv.items[this._csv.index]);
                this._csv.index++;

                if (this.size >= blocksize)
                {
                    break;
                }
            }

            this.publish();

            var pause = this._csv.options.getOpt("pause",0);

            if (pause > 0)
            {
                var self = this;
                setTimeout(function(){self.send();},pause);
            }
        }
    }

    csv()
    {
        this._csv.items = this._schema.createDataFromCsv(this._csv.data,this._csv.options.getOpts());

        const   blocksize = this._csv.options.getOpt("blocksize",1);
        const   pause = this._csv.options.getOpt("pause",0);
        const   opcode = this._csv.options.getOpt("opcode","insert");

        if (pause > 0)
        {
            var self = this;
            setTimeout(function(){self.send();},pause);
        }
        else
        {
            for (var o of this._csv.items)
            {
                o["opcode"] = (o.hasOwnProperty("@opcode")) ? o["@opcode"] : opcode;
                this.add(o);
                if (this.size >= blocksize)
                {
                    this.publish();
                }
            }

            this.publish();

            if (this._csv.options.getOpt("close",false))
            {
                this.close();
            }
        }
    }

    publishCsvFrom(url,options)
    {
        var self = this;

        ajax.create(url).get().then(
            function(response) {
                self.publishCsv(response.text,options);
            },
            function(error) {
                console.log("error: " + error);
            }
        );
    }

    publishCsv(data,options)
    {
        this._csv = {data:data,options:new Options(options),index:0};

        if (this._schema.size == 0)
        {
            return;
        }

        this.csv();
    }

    isBinary()
    {
        return(this.getOpt("binary",true));
    }
}

export {Api as v7};
