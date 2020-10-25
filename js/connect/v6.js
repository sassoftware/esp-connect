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

const   resources = new Resources();

class Api extends Options
{
    constructor(connection,options)
    {
        super(options);

        this._connection = connection;
        this._version - 6.2;

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
                this._version = parseFloat(value);
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

        Object.defineProperty(this,"url", {
            get() {
                return(this._connection.url);
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
        this._publishers = {};
        this._stats = new Stats(this);
        this._log = new Log(this);
        this._modelDelegates = {};
        this._publisherDelegates = {};
        this._guidDelegates = {};
        this._loadDelegates = {};
        this._responseDelegates = {};
        this._gets = {};
    }

    versionGreaterThan(version)
    {
        return(this._version > version);
    }

    versionLessThan(version)
    {
        return(this._version < version);
    }

    stop()
    {
        this._connection.stop();
    }

    formUrl(base,path,options)
    {
        var url = base;
        url += "/eventStreamProcessing/v1/";
        url += path;

        var parms = "";

        if (options != null)
        {
            for (var name in options)
            {
                var value = options[name];

                if (typeof(value) == "object")
                {
                    for (var n in value)
                    {
                        parms += (parms.length > 0) ? "&" : "?";
                        parms += n + "=" + value[n];
                    }
                }
                else
                {
                    parms += (parms.length > 0) ? "&" : "?";
                    parms += name + "=" + value;
                }
            }
        }

        if (parms.length > 0)
        {
            url += parms;
        }

        return(url);
    }

    getUrl(path,options)
    {
        var url = this.formUrl(this._connection.urlBase,path,options);
        return(url);
    }

    getHttpUrl(path,options)
    {
        var url = this.formUrl(this._connection.httpurlBase,path,options);
        return(url);
    }

    createRequest(name,url,delegate)
    {
        var request = ajax.create(name,url,delegate);
        if (this._connection.hasAuthorization)
        {
            request.setRequestHeader("authorization",this._connection.authorization);
        }
        return(request);
    }

    closed()
    {
    }

    close()
    {
        this._closed = true;
    }

    send(s)
    {
        this._connection.send(s);
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

        var xml = null;
        var json = null;

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

    addProjectUpdateDelegate(delegate)
    {
        tools.exception("addProjectUpdateDelegate is not supported");
    }

    removeProjectUpdateDelegate(delegate)
    {
        tools.exception("removeProjectUpdateDelegate is not supported");
    }

    data(o)
    {
        this.processJson(o);
    }

    addDelegate(delegate)
    {
        tools.addTo(this._delegates,delegate);
    }

    removeDelegate(delegate)
    {
        tools.removeFrom(this._delegates,delegate);
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
        options["mode"] = "collection";
        var ec = new EventCollection(this,options);
        this._datasources[ec._id] = ec;
        ec.open();
        return(ec);
    }

    getEventStream(options)
    {
        var es = new EventStream(this,options);
        this._datasources[es._id] = es;
        es.open();
        return(es);
    }

    getPublisher(options)
    {
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
        publisher.open();
        return(publisher);
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
    }

    publishDataFrom(path,url,delegate,options)
    {
        var api = this;
        var o = {
            response:function(request,text,data) {
                api.publishData(path,text,delegate,options);
            },
            error:function(request,error) {
                console.log("error: " + error);
            }
        };
        ajax.create("load",url,o).get();
    }

    publishData(path,data,delegate,options)
    {
        var opts = new Options(options);
        opts.setOpt("format","csv");

        var times = opts.getOpt("times",1);

        var o = {
            ready:function()
            {
                for (var i = 0; i < times; i++)
                {
                    connection.send(data);
                }

                setTimeout(function() {
                    if (delegate != null && tools.supports(delegate,"publishComplete"))
                    {
                        delegate.publishComplete();
                    }

                    connection.stop();
                },1000);
            }
        }

        var url = this.getUrl("publishers/" + path);
        var connection = Connection.createDelegateConnection(o,url,opts.getOpts(),this._connection._connect.config);
        connection.authorization = this._connection.authorization;
        connection.start();
    }

    publishUrl(path,url,delegate,options)
    {
        if (options == null)
        {
            options = {};
        }

        options["value"] = "injected";
        options["eventUrl"] = url;
        var publish = this.getHttpUrl("windows/" + path + "/state",options);
        var api = this;
        var o = {
            response:function(request,text,data) {
                if (delegate != null && tools.supports(delegate,"publishComplete"))
                {
                    delegate.publishComplete();
                }
            },
            error:function(request,error) {
                console.log("error: " + error);
            }
        };
        ajax.create("publish",publish,o).put();
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

    get(url,delegate,opts)
    {
    }

    loadModel(delegate,options)
    {
        if (tools.supports(delegate,"modelLoaded") == false)
        {
            throw "The delegate must implement the modelLoaded method";
        }

        var url = this.getHttpUrl("projects",options);
        var api = this;

        var o = {
            response:function(request,text,data) {
                if (tools.supports(delegate,"modelLoaded"))
                {
                    var model = new Model(data);
                    delegate.modelLoaded(model,api);
                }
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(request.getName(),error);
                }
            }
        };

        this.createRequest("load",url,o).get(this._connection._config);
    }

    loadUrl(name,url,delegate)
    {
        var o = {
            response:function(request,text,data) {
                if (tools.supports(delegate,"loaded"))
                {
                    delegate.loaded(name,text,data);
                }
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(name,text);
                }
            }
        };
        ajax.create("load",url,o).get();
    }

    loadProjectFrom(name,url,delegate,options)
    {
        var api = this;
        var o = {
            response:function(request,text,data) {
                api.loadProject(name,text,delegate,options);
            },
            error:function(request,error) {
                console.log("error: " + error);
            }
        };
        ajax.create("load",url,o).get();
    }

    loadRouterFrom(name,url,delegate,options)
    {
        var api = this;
        var o = {
            response:function(request,text,data) {
                api.loadRouter(name,text,delegate,options);
            },
            error:function(request,error) {
                console.log("error: " + error);
            }
        };
        ajax.create("load",url,o).get();
    }

    loadProject(name,data,delegate,options)
    {
        var connection = this;

        var o = {
            response:function(request,text,data) {
                if (tools.supports(delegate,"loaded"))
                {
                    delegate.loaded(connection,name);
                }
            },
            error:function(request,error,data) {
                if (tools.supports(delegate,"error"))
                {
                    var message = xpath.getString("//message",data);
                    delegate.error(connection,request.getName(),message);
                }
            }
        };

        var url = this.getHttpUrl("projects/" + name,options);
        var request = this.createRequest("loadProject",url,o);
        request.setData(data);
        request.put();
    }

    loadRouter(name,data,delegate,options)
    {
        var o = {
            response:function(request,text,data) {
                if (tools.supports(delegate,"loaded"))
                {
                    var message = xpath.getString("//message",data);
                    delegate.loaded(this,message);
                }
            },
            error:function(request,error,data) {
                if (tools.supports(delegate,"error"))
                {
                    var message = xpath.getString("//message",data);
                    delegate.error(this,request.getName(),message);
                }
            }
        };

        var url = this.getHttpUrl("routers/" + name,options);
        var request = this.createRequest("loadRouter",url,o);
        request.setData(data);
        request.put();
    }

    deleteProject(name,delegate)
    {
        var url = this.url;
        var request = {"project":{}};
        var o = request["project"];
        o["name"] = name;
        o["action"] = "delete";
        this.sendObject(request);
    }

    getProjectXml(name,delegate)
    {
        var opts = (name != null) ? {name:name} : {};
        var url = this.getHttpUrl("projectXml",opts);
        this.createRequest("load",url,delegate).get();
    }

    getXml(name,delegate)
    {
        this.getProjectXml(null,delegate);
    }

    getLoggers(delegate)
    {
        if (tools.supports(delegate,"response") == false)
        {
            throw "The delegate must implement the response method";
        }

        var o = {
            response:function(request,text,data) {
                var loggers = [];
                xpath.getNodes("//loggers/logger",data).forEach((n) =>
                {
                    loggers.push({"@level":n.getAttribute("level"),"@name":n.getAttribute("name")});
                });
                delegate.response(this,loggers);
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    console.log("error: " + error);
                    delegate.error(request.getName(),error);
                }
            }
        };

        var url = this.getHttpUrl("loggers");
        this.createRequest("loggers",url,o).get();
    }

    setLogger(context,level,delegate)
    {
        var o = {
            response:function(request,text,data) {
                var message = xpath.getString("//message",data);
                delegate.response(this,message);
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    console.log("error: " + error);
                    delegate.error(request.getName(),error);
                }
            }
        };

        var url = this.getHttpUrl("loggers/" + context + "/level",{value:level});

        this.createRequest("setLogger",url,o).put();
    }

    createModel(data)
    {
        return(new Model(data));
    }

    loadGuids(delegate,num)
    {
        if (tools.supports(delegate,"guidsLoaded") == false)
        {
            throw "The stats delegate must implement the guidsLoaded method";
        }

        var id = tools.guid();
        this._guidDelegates[id] = new GuidDelegate(this,delegate);

        var request = {"guids":{}};
        var o = request["guids"];
        o["id"] = id;
        if (num != null)
        {
            o["num"] = num;
        }

        this.sendObject(request);
    }

    guid()
    {
        return(tools.guid());
    }

    getStatus()
    {
        this.sendObject({request:"status"});
    }

    createEventSources(delegate)
    {
        return(eventsources.createEventSources(this,delegate));
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
        this._schema.addDelegate(this);

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
        this._schemaDelegates = [];

        this._paused = false;
    }

    schemaLoaded()
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"schemaReady"))
            {
                d.schemaReady(this._api,this);
            }
        });
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
        this._schema.fromJson(json);
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

    isSelected(item)
    {
        return(item != null && item.hasOwnProperty("@selected") && item["@selected"] == true);
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

        //this.deliverDataChange(null,false);
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

        var items = null;

        if (Array.isArray(this._data))
        {
            items = this._data;
        }
        else
        {
            items = [];

            Object.values(this._data).forEach(item =>
            {
                items.push(item);
            });
        }

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
            if (tools.isNode)
            {
                throw new Error("The datasource delegate must implement the dataChanged method");
            }
            else
            {
                throw "The datasource delegate must implement the dataChanged method";
            }
        }

        tools.addTo(this._delegates,delegate);
    }

    removeDelegate(delegate)
    {
        tools.removeFrom(this._delegates,delegate);
    }

    addSchemaDelegate(delegate)
    {
        if (tools.supports(delegate,"schemaSet") == false)
        {
            if (tools.isNode)
            {
                throw new Error("The datasource schema delegate must implement the schemaSet method");
            }
            else
            {
                throw "The datasource schema delegate must implement the schemaSet method";
            }
        }

        tools.addTo(this._schemaDelegates,delegate);
    }

    removeSchemaDelegate(delegate)
    {
        tools.removeFrom(this._schemaDelegates,delegate);
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

    deliverSchemaSet()
    {
        if (this.getOpt("debug"))
        {
            console.log("schema set for " + this + "\n" + this._schema.toString());
        }

        this._schemaDelegates.forEach((d) =>
        {
            if (tools.supports(d,"schemaSet"))
            {
                d.schemaSet(this,this._schema);
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
        this._window = this.getOpt("window");
        this.setOpt("format","xml");
        this._data = {};
        this._list = [];
        this._page = 0;
        this._pages = 0;
        this._sort = null;
        this._sortdir = 0;
    }

    open()
    {
        var url = this._api.getUrl("subscribers/" + this._path);
        var opts = {mode:"updating",schema:true,format:"xml",snapshot:true};
        var interval = this.getInt("interval",0);

        if (this.hasOpt("pagesize"))
        {
            opts.pagesize = this.getOpt("pagesize");
        }
        if (this.hasOpt("filter"))
        {
            opts.filter = this.getOpt("filter");
        }

        if (this.hasOpt("sort"))
        {
            opts.sort = this.getOpt("sort");

            if (interval == 0)
            {
                interval = 1000;
            }

            opts.interval = interval;
        }
        else if (interval > 0)
        {
            opts.interval = interval;
        }
        this._connection = Connection.createDelegateConnection(this,url,opts,this._api.connection._connect.config);
        this._connection.authorization = this._api._connection.authorization;
        this._connection.start();
        this.setIntervalProperty();

        /*
        var options = this.getOpts();
        if (this.hasOpt("filter") == false)
        {
            o["filter"] = "";
        }
        this._api.sendObject(request);
        */
    }

    set(load)
    {
        var request = "";

        request += "<properties>";

        request += "<filter>";
        request += this.getOpt("filter");
        request += "</filter>";

        request += "</properties>";

        this._connection.send(request);

        if (load)
        {
            this.load();
        }
    }

    close()
    {
        this._connection.stop();
        this._connection = null;
    }

    message(data)
    {
        var xml = xpath.createXml(data);
        var root = xml.documentElement;
        if (root.tagName == "schema")
        {
            this.setSchemaFromXml(xml);
        }
        else if (root.tagName == "events")
        {
            this.eventsXml(xml.documentElement);
        }
    }

    play()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "play";
        this._api.sendObject(request);
        super.play();
    }

    pause()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "pause";
        this._api.sendObject(request);
        super.pause();
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
        var request = "<load";
        if (page != null)
        {
            request += " page='" + page + "'";
        }
        request += "/>";
        this._connection.send(request);
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
        var datatype;
        var content;
        var values;
        var opcode;
        var s;

        xpath.getNodes("//events/event",xml).forEach((n) =>
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
        this._window = this.getOpt("window");
        this.setOpt("format","xml");
        this._data = [];
        this._counter = 1;
    }

    ready()
    {
        this.set();
    }

    open()
    {
        this.setIntervalProperty();

        var url = this._api.getUrl("subscribers/" + this._path);
        var opts = {mode:"streaming",schema:true,format:"xml"};
        if (this.hasOpt("filter"))
        {
            opts.filter = this.getOpt("filter");
        }
        if (this.hasOpt("maxevents"))
        {
            opts.maxevents = this.getOpt("maxevents");
        }
        this._connection = Connection.createDelegateConnection(this,url,opts,this._api.connection._connect.config);
        this._connection.authorization = this._api._connection.authorization;
        this._connection.start();

        /*
        if (this.hasOpt("filter") == false)
        {
            o["filter"] = "";
        }

        this._api.sendObject(request);
        */
    }

    message(data)
    {
        var xml = xpath.createXml(data);
        var root = xml.documentElement;
        if (root.tagName == "schema")
        {
            this.setSchemaFromXml(xml);
        }
        else if (root.tagName == "events")
        {
            this.eventsXml(xml.documentElement);
        }
    }

    set(load)
    {
        var request = "";

        request += "<properties>";

        request += "<filter>";
        request += this.getOpt("filter");
        request += "</filter>";

        request += "</properties>";

        this._connection.send(request);
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
        super.play();
    }

    pause()
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "pause";
        this._api.sendObject(request);
        super.play();
    }

    setSchemaFromXml(xml)
    {
        super.setSchemaFromXml(xml);
        this.completeSchema();
        this.deliverSchemaSet();
    }

    setSchemaFromJson(json)
    {
        super.setSchemaFromJson(json);
        this.completeSchema();
        this.deliverSchemaSet();
    }

    completeSchema()
    {
        for (var i = 0; i < this._schema._fields.length; i++)
        {
            this._schema._fields[i].setOpt("isKey",false);
        }

        var f;

        f = new Options({"name":"@opcode","espType":"utf8str","type":"string","isKey":false,"isNumber":false,"isDate":false,"isTime":false});
        this._schema._fields.unshift(f);
        this._schema._columns.unshift(f.getOpt("name"));
        this._schema._fieldMap[f.getOpt("name")] = f;

        f = new Options({"name":"@timestamp","espType":"timestamp","type":"date","isKey":false,"isNumber":true,"isDate":false,"isTime":true});
        this._schema._fields.unshift(f);
        this._schema._columns.unshift(f.getOpt("name"));
        this._schema._fieldMap[f.getOpt("name")] = f;

        f = new Options({"name":"@counter","espType":"int32","type":"int","isKey":true,"isNumber":true,"isDate":false,"isTime":false});
        this._schema._fields.unshift(f);
        this._schema._columns.unshift(f.getOpt("name"));
        this._schema._fieldMap[f.getOpt("name")] = f;

        this._schema._keyFields = [f];
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

        var    nodes = xpath.getNodes("//events/event",xml);
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
        this._connection = null;

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

    message(data)
    {
        var xml = xpath.createXml(data);
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

    process(o)
    {
    }

    start()
    {
        if (this._connection == null)
        {
            var opts = {};
            opts["minCpu"] = this.getOpt("mincpu",5);
            opts["counts"] = this.getOpt("counts",true);
            opts["config"] = this.getOpt("config",true);
            opts["memory"] = this.getOpt("memory",true);
            opts["format"] = "xml";

            var url = this._api.getUrl("projectStats");
            this._connection = Connection.createDelegateConnection(this,url,opts,this._api.connection._connect.config);
            this._connection.authorization = this._api._connection.authorization;
            this._connection.start();
        }
    }

    stop()
    {
        if (this._connection != null)
        {
            this._connection.stop();
            this._connection = null;
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
                this.start();
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

        this._connection = null;
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

    start()
    {
        if (this._connection == null)
        {
            var url = this._api.getUrl("logs");
            this._connection = Connection.createDelegateConnection(this,url,null,this._api.connection._connect.config);
            this._connection.authorization = this._api._connection.authorization;
            this._connection.start();
        }
    }

    stop()
    {
        if (this._connection != null)
        {
            this._connection.stop();
            this._connection = null;
        }
    }

    message(text)
    {
        var o = {};
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

        this._delegates.forEach((d) => {
            d.handleLog(this,o);
        });
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
        this._csv = null;

        Object.defineProperty(this,"schema", {
            get() {
                return(this._schema);
            }
        });

        this._schemaDelegates = [];
    }

    open()
    {
        var o = {};

        this.addOpts(o);

        var opts = {schema:true,format:"json"};

        if (this.hasOpt("dateformat"))
        {
            opts["dateformat"] = this.getOpt("dateformat");
        }

        var url = this._api.getUrl("publishers/" + this._path,opts);
        this._connection = Connection.createDelegateConnection(this,encodeURI(url),opts,this._api.connection._connect.config);
        this._connection.authorization = this._api._connection.authorization;
        this._connection.start();
    }

    close()
    {
        this._connection.stop();
        this._connection = null;
    }

    ready()
    {
        this.publish();
    }

    message(data)
    {
        var o = JSON.parse(data);
        if (o.hasOwnProperty("schema"))
        {
            var schema = {};
            var field;
            schema.fields = [];
            o.schema[0].fields.forEach((f) => {
                field = {};
                field["@name"] = f.field.attributes.name;
                field["@type"] = f.field.attributes.type;
                if (f.field.attributes.hasOwnProperty("key"))
                {
                    field["@key"] = f.field.attributes.key;
                }
                schema.fields.push(field);
            });

            this.setSchemaFromJson(schema);
        }
    }

    addSchemaDelegate(delegate)
    {
        if (tools.supports(delegate,"schemaSet") == false)
        {
            if (tools.isNode)
            {
                throw new Error("The datasource schema delegate must implement the schemaSet method");
            }
            else
            {
                throw "The datasource schema delegate must implement the schemaSet method";
            }
        }

        tools.addTo(this._schemaDelegates,delegate);
    }

    removeSchemaDelegate(delegate)
    {
        tools.removeFrom(this._schemaDelegates,delegate);
    }

    setSchemaFromXml(xml)
    {
        this._schema.fromXml(xml);
        this.deliverSchemaSet();

        if (this._csv != null)
        {
            this.csv();
        }
    }

    setSchemaFromJson(json)
    {
        this._schema.fromJson(json);
        this.deliverSchemaSet();

        if (this._csv != null)
        {
            this.csv();
        }
    }

    deliverSchemaSet()
    {
        if (this.getOpt("debug"))
        {
            console.log("schema set for " + this + "\n" + this._schema.toString());
        }

        this._schemaDelegates.forEach((d) =>
        {
            d.schemaSet(this,this._schema);
        });
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
        if (this._connection.isConnected() == false)
        {
            return;
        }

        if (this._data.length > 0)
        {
            var a = [];
            a.push(this._data);
            this._connection.sendObject(a);
            this._data = new Array();
        }
    }

    send(publisher)
    {
        if (this._csv.index < this._csv.items.length)
        {
            this.add(this._csv.items[this._csv.index]);
            this.publish();

            this._csv.index++;

            var pause = this._csv.options.getOpt("pause",0);

            if (pause > 0)
            {
                var publisher = this;
                setTimeout(function(){publisher.send();},pause);
            }
        }
    }

    csv()
    {
        if (this._schema.size == 0)
        {
            return;
        }

        this._csv.items = this._schema.createDataFromCsv(this._csv.data,this._csv.options.getOpts());

        var pause = this._csv.options.getOpt("pause",0);
        var opcode = this._csv.options.getOpt("opcode","insert");

        if (pause > 0)
        {
            var publisher = this;
            setTimeout(function(){publisher.send();},pause);
        }
        else
        {
            for (var o of this._csv.items)
            {
                o["opcode"] = (o.hasOwnProperty("@opcode")) ? o["@opcode"] : opcode;
                this.add(o);
                this.publish();
            }

            if (this._csv.options.getOpt("close",false))
            {
                this.close();
            }
        }
    }

    publishCsvFrom(url,options)
    {
        var publisher = this;
        var o = {
            response:function(request,text,data) {
                publisher.publishCsv(text,options);
            },
            error:function(request,error) {
                console.log("error: " + error);
            }
        };
        ajax.create("load",url,o).get();
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
        return(false);
    }
}

    /* Delegates */

class ModelDelegate
{
    constructor(api,delegate,request)
    {
        this._api = api;
        this._delegate = delegate;
        this._request = null;
        this._api.sendObject(request);
    }

    deliver(xml)
    {
        var model = new Model(xml);

        if (tools.supports(this._delegate,"modelLoaded"))
        {
            this._delegate.modelLoaded(model,this._api);
        }
    }
}

class ResponseDelegate
{
    constructor(api,delegate)
    {
        this._api = api;
        this._delegate = delegate;
    }

    deliver(data,xml)
    {
        if (tools.supports(this._delegate,"response"))
        {
            this._delegate.response(this._api,data,xml);
        }
    }
}

class GuidDelegate
{
    constructor(api,delegate)
    {
        this._api = api;
        this._delegate = delegate;
    }

    deliver(data)
    {
        if (tools.supports(this._delegate,"guidsLoaded"))
        {
            var guids = [];
            var nodes = xpath.getNodes("./guid",data);
            for (var i = 0; i < nodes.length; i++)
            {
                guids.push(xpath.nodeText(nodes[i]));
            }
            this._delegate.guidsLoaded(guids,this._api);
        }
    }
}

/* End Delegates */

export {Api as v6};
