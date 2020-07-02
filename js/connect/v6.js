/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

var _isNode = false;

try
{
    _isNode = (require("detect-node") != null);
}
catch (e)
{
}

define([
    "./connection",
    "./resources",
    "./model",
    "./schema",
    "./xpath",
    "./ajax",
    "./tools",
    "./codec",
    "./eventsources",
    "./options"
], function(Connection,resources,Model,Schema,xpath,ajax,tools,codec,eventsources,Options)
{
    function
    Api(connection,options)
    {
        Options.call(this,options);

        this._connection = connection;

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
                return(6.2);
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

        /*
        this._delegates = [];

        if (delegate != null)
        {
            this._delegates.push(delegate);
        }
        this._closed = false;
        */

        this.init();
    }

    Api.prototype = Object.create(Options.prototype);
    Api.prototype.constructor = Api;

    Api.prototype.init =
    function()
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

    Api.prototype.formUrl =
    function(base,path,options)
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

    Api.prototype.getUrl =
    function(path,options)
    {
        var url = this.formUrl(this._connection.urlBase,path,options);
        return(url);
    }

    Api.prototype.getHttpUrl =
    function(path,options)
    {
        var url = this.formUrl(this._connection.httpurlBase,path,options);
        return(url);
    }

    Api.prototype.createRequest =
    function(name,url,delegate)
    {
        var request = ajax.create(name,url,delegate);
        if (this._connection.hasAuthorization)
        {
            request.setRequestHeader("authorization",this._connection.authorization);
        }
        return(request);
    }

    Api.prototype.closed =
    function()
    {
    }

    Api.prototype.close =
    function()
    {
        this._closed = true;

        var request = {"connection":{}};
        var o = request["connection"];
        o["action"] = "close";
        this.sendObject(request);
    }

    Api.prototype.send =
    function(s)
    {
        this._connection.send(s);
    }

    Api.prototype.sendObject =
    function(o)
    {
        this._connection.sendObject(o);
    }

    Api.prototype.sendBinary =
    function(o)
    {
        this._connection.sendBinary(o);
    }

    Api.prototype.message =
    function(data)
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

    Api.prototype.data =
    function(o)
    {
        this.processJson(o);
    }

    Api.prototype.addDelegate =
    function(delegate)
    {
        tools.addTo(this._delegates,delegate);
    }

    Api.prototype.removeDelegate =
    function(delegate)
    {
        tools.removeFrom(this._delegates,delegate);
    }

    Api.prototype.getDatasource =
    function(options)
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

    Api.prototype.getEventCollection =
    function(options)
    {
        options["mode"] = "collection";
        var ec = new EventCollection(this,options);
        this._datasources[ec._id] = ec;
        ec.open();
        return(ec);
    }

    Api.prototype.getEventStream =
    function(options)
    {
        var es = new EventStream(this,options);
        this._datasources[es._id] = es;
        es.open();
        return(es);
    }

    Api.prototype.getPublisher =
    function(options)
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

    Api.prototype.closePublisher =
    function(id)
    {
        if (this._publishers.hasOwnProperty(id))
        {
            var publisher = this._publishers[id];
            publisher.close();
        }
    }

    Api.prototype.clearWindow =
    function(path)
    {
    }

    Api.prototype.publishDataFrom =
    function(path,url,delegate,options)
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

    Api.prototype.publishData =
    function(path,data,delegate,options)
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
        var connection = Connection.createDelegateConnection(o,url,opts.getOpts());
        connection.authorization = this._connection.authorization;
        connection.start();
    }

    Api.prototype.publishUrl =
    function(path,url,delegate,options)
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

    Api.prototype.getStats =
    function(options)
    {
        if (options != null)
        {
            this._stats.setOpts(options);
        }
        return(this._stats);
    }

    Api.prototype.getLog =
    function()
    {
        return(this._log);
    }

    Api.prototype.get =
    function(url,delegate,opts)
    {
        var request = {"get":{}};
        var o = request["get"];
        var id = tools.guid();
        o["id"] = id;
        o["url"] = url;
        o["format"] = "ubjson";

        var get = {};
        get["delegate"] = delegate;
        get["options"] = new Options(opts);
        this._gets[id] = get;

        this.sendObject(request);
    }

    Api.prototype.loadModel =
    function(delegate,options)
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

        this.createRequest("load",url,o).get();
    }

    Api.prototype.loadUrl =
    function(name,url,delegate)
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

    Api.prototype.loadProjectFrom =
    function(name,url,delegate,options)
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

    Api.prototype.loadRouterFrom =
    function(name,url,delegate,options)
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

    Api.prototype.loadProject =
    function(name,data,delegate,options)
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

    Api.prototype.loadRouter =
    function(name,data,delegate,options)
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

    Api.prototype.deleteProject =
    function(name,delegate)
    {
        var url = this.url;
        var request = {"project":{}};
        var o = request["project"];
        o["name"] = name;
        o["action"] = "delete";
        this.sendObject(request);
    }

    Api.prototype.getProjectXml =
    function(name,delegate)
    {
        var opts = (name != null) ? {name:name} : {};
        var url = this.getHttpUrl("projectXml",opts);
        this.createRequest("load",url,delegate).get();
    }

    Api.prototype.getXml =
    function(name,delegate)
    {
        this.getProjectXml(null,delegate);
    }

    Api.prototype.getLoggers =
    function(delegate)
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

    Api.prototype.setLogger =
    function(context,level,delegate)
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

    Api.prototype.createModel =
    function(data)
    {
        return(new Model(data));
    }

    Api.prototype.loadGuids =
    function(delegate,num)
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

    Api.prototype.guid =
    function()
    {
        return(tools.guid());
    }

    Api.prototype.getStatus =
    function()
    {
        this.sendObject({request:"status"});
    }

    Api.prototype.createEventSources =
    function(delegate)
    {
        return(eventsources.createEventSources(this,delegate));
    }

    Api.prototype.toString =
    function()
    {
        var s = "";
        s += this._connection.getUrl();
        return(s);
    }

    function
    Datasource(api,options)
    {
        Options.call(this,options);
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

    Datasource.prototype = Object.create(Options.prototype);
    Datasource.prototype.constructor = Datasource;

    Datasource.prototype.schemaLoaded =
    function()
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"schemaReady"))
            {
                d.schemaReady(this._api,this);
            }
        });
    }

    Datasource.prototype.isArray =
    function()
    {
        return(this._data != null && Array.isArray(this._data));
    }

    Datasource.prototype.setIntervalProperty =
    function()
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

    Datasource.prototype.setFilter =
    function(value)
    {
        this.setOpt("filter",value)
        this.set(true);

        this.deliverFilterChange();
    }

    Datasource.prototype.clearFilter =
    function()
    {
        this.clearOpt("filter");
        this.set(true);
        this.deliverFilterChange();
    }

    Datasource.prototype.getFilter =
    function()
    {
        return(this.getOpt("filter"));
    }

    Datasource.prototype.play =
    function()
    {
        this._paused = false;
    }

    Datasource.prototype.pause =
    function()
    {
        this._paused = true;
    }

    Datasource.prototype.togglePlay =
    function()
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

    Datasource.prototype.setSchemaFromXml =
    function(xml)
    {
        this._schema.fromXml(xml);
    }

    Datasource.prototype.setSchemaFromJson =
    function(json)
    {
        this._schema.fromJson(json);
    }

    Datasource.prototype.getKey =
    function(o)
    {
        var key = "";
        var name;

        this._schema._keyFields.forEach((f) =>
        {
            name = f["name"];

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

        return(key)
    }

    Datasource.prototype.toggleSelectedKeys =
    function(keys,deselect)
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

    Datasource.prototype.isSelected =
    function(item)
    {
        return(item != null && item.hasOwnProperty("@selected") && item["@selected"] == true);
    }

    Datasource.prototype.toggleSelected =
    function(item)
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

    Datasource.prototype.deselectAll =
    function()
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

    Datasource.prototype.setSelectedIndices =
    function(indices,deselect)
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

    Datasource.prototype.toggleSelectedIndices =
    function(indices,deselect)
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

    Datasource.prototype.selectByKeys =
    function(keys)
    {
        this.deselectAll();

        keys.forEach(key =>
        {
            console.log("key: " + key);
        });
    }

    Datasource.prototype.getSelectedItems =
    function()
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

    Datasource.prototype.getSelectedIndices =
    function()
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

    Datasource.prototype.getSelectedKeys =
    function()
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

    Datasource.prototype.getSelectedItem =
    function()
    {
        var a = this.getSelectedItems();
        return(a.length > 0 ? a[0] : null);
    }

    Datasource.prototype.getSelectedIndex =
    function()
    {
        var a = this.getSelectedIndices();
        return(a.length > 0 ? a[0] : null);
    }

    Datasource.prototype.getSelectedKey =
    function()
    {
        var a = this.getSelectedKeys();
        return(a.length > 0 ? a[0] : null);
    }

    Datasource.prototype.getKeyValues =
    function()
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

    Datasource.prototype.getList =
    function()
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

    Datasource.prototype.getValues =
    function(name)
    {
        var f = this._schema.getField(name);

        if (f == null)
        {
            return(null);
        }

        var values = [];
        var numeric = f["isNumber"];

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

    Datasource.prototype.getLimits =
    function(name)
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

    Datasource.prototype.getValuesBy =
    function(keys,names,keyfilter,delimiter = ".")
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

            if (keyfilter != null && keyfilter.hasOwnProperty(f.name))
            {
                continue;
            }

            keyFields.push(f);
            keyFieldValues[f.name] = [];
        }

        var dateKeys = false;
        var timeKeys = false;

        if (keyFields.length == 1)
        {
            f = keyFields[0];

            if (f["isDate"])
            {
                dateKeys = true;
            }
            else if (f["isTime"])
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
                name = f["name"];
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
                    name = f["name"];
                    entry[name] = 0.0;
                }
                data[key] = {key:key,data:entry,selected:this.isSelected(o)};
            }

            for (f of valueFields)
            {
                if (f["isNumber"])
                {
                    name = f["name"];
                    entry[name] += parseFloat(o[name]);
                }
            }
        }

        var values = {};

        for (f of valueFields)
        {
            name = f["name"];
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
                name = f["name"];
                if (f["isNumber"])
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

    Datasource.prototype.getKeyFieldNames =
    function()
    {
        return(this._schema != null ? this._schema.getKeyFieldNames() : null);
    }

    Datasource.prototype.events =
    function(xml)
    {
    }

    Datasource.prototype.info =
    function(xml)
    {
    }

    Datasource.prototype.set =
    function(value)
    {
    }

    Datasource.prototype.addDelegate =
    function(delegate)
    {
        if (tools.supports(delegate,"dataChanged") == false)
        {
            if (_isNode)
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

    Datasource.prototype.removeDelegate =
    function(delegate)
    {
        tools.removeFrom(this._delegates,delegate);
    }

    Datasource.prototype.addSchemaDelegate =
    function(delegate)
    {
        if (tools.supports(delegate,"schemaSet") == false)
        {
            if (_isNode)
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

    Datasource.prototype.removeSchemaDelegate =
    function(delegate)
    {
        tools.removeFrom(this._schemaDelegates,delegate);
    }

    Datasource.prototype.clear =
    function()
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

    Datasource.prototype.deliverDataChange =
    function(data,clear)
    {
        this._delegates.forEach((d) =>
        {
            d.dataChanged(this,data,clear);
        });
    }

    Datasource.prototype.deliverInfoChange =
    function()
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"infoChanged"))
            {
                d.infoChanged(this);
            }
        });
    }

    Datasource.prototype.deliverSchemaSet =
    function()
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

    Datasource.prototype.deliverInfo =
    function(data)
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"info"))
            {
                d.info(this,data);
            }
        });
    }

    Datasource.prototype.deliverFilterChange =
    function()
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"filterChanged"))
            {
                d.filterChanged(this);
            }
        });
    }

    Datasource.prototype.deliverSelectionChange =
    function()
    {
        this._delegates.forEach(d =>
        {
            if (tools.supports(d,"selectionChanged"))
            {
                d.selectionChanged(this);
            }
        });
    }

    Datasource.prototype.getDataByKey =
    function(key)
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

    Datasource.prototype.createDataFromCsv =
    function(data)
    {
        var items = null;

        if (this._schema != null)
        {
            items = this._schema.createDataFromCsv(data);
        }

        return(items);
    }

    function
    EventCollection(api,options)
    {
        Datasource.call(this,api,options);
        this._window = this.getOpt("window");
        this.setOpt("format","xml");
        this._data = {};
        this._list = [];
        this._page = 0;
        this._pages = 0;
        this._sort = null;
        this._sortdir = 0;
    }

    EventCollection.prototype = Object.create(Datasource.prototype);
    EventCollection.prototype.constructor = EventCollection;

    EventCollection.prototype.open =
    function()
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
        this._connection = Connection.createDelegateConnection(this,url,opts);
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

    EventCollection.prototype.set =
    function(load)
    {
        var request = "";

        request += "<properties>";

        request += "<filter>";
        request += this.getOpt("filter");
        request += "</filter>";

        request += "</properties>";

        this._api.send(request);

        if (load)
        {
            this.load();
        }
    }

    EventCollection.prototype.close =
    function()
    {
        this._connection.stop();
        this._connection = null;
    }

    EventCollection.prototype.message =
    function(data)
    {
        var    xml = xpath.createXml(data);
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

    EventCollection.prototype.play =
    function()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "play";
        this._api.sendObject(request);
        Datasource.prototype.play.call(this);
    }

    EventCollection.prototype.pause =
    function()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "pause";
        this._api.sendObject(request);
        Datasource.prototype.play.call(this);
    }

    EventCollection.prototype.sort =
    function(a,b)
    {
        var v1 = parseFloat(a[this._sort]);
        var v2 = parseFloat(b[this._sort]);
        return((this._sortdir == 0) ? (v2 - v1) : (v1 - v2));
    }

    EventCollection.prototype.load =
    function()
    {
        this.loadPage(null);
    }

    EventCollection.prototype.first =
    function()
    {
        this.loadPage("first");
    }

    EventCollection.prototype.last =
    function()
    {
        this.loadPage("last");
    }

    EventCollection.prototype.prev =
    function()
    {
        this.loadPage("prev");
    }

    EventCollection.prototype.next =
    function()
    {
        this.loadPage("next");
    }

    EventCollection.prototype.loadPage =
    function(page)
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

    EventCollection.prototype.setSchemaFromXml =
    function(xml)
    {
        Datasource.prototype.setSchemaFromXml.call(this,xml);
        this.deliverSchemaSet();
    }

    EventCollection.prototype.setSchemaFromJson =
    function(json)
    {
        Datasource.prototype.setSchemaFromJson.call(this,json);
        this.deliverSchemaSet();
    }

    EventCollection.prototype.events =
    function(data)
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

    EventCollection.prototype.eventsXml =
    function(xml)
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

    EventCollection.prototype.info =
    function(data)
    {
        if (data.hasOwnProperty("page"))
        {
            this._page = data["page"];
            this._pages = data["pages"];
            this.deliverInfoChange();
        }
    }

    EventCollection.prototype.process =
    function(events,clear)
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

    function
    EventStream(api,options)
    {
        Datasource.call(this,api,options);
        this._window = this.getOpt("window");
        this.setOpt("format","xml");
        this._data = [];
        this._counter = 1;
    }

    EventStream.prototype = Object.create(Datasource.prototype);
    EventStream.prototype.constructor = EventStream;

    EventStream.prototype.ready =
    function()
    {
        this.set();
    }

    EventStream.prototype.open =
    function()
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
        this._connection = Connection.createDelegateConnection(this,url,opts);
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

    EventStream.prototype.message =
    function(data)
    {
        var    xml = xpath.createXml(data);
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

    EventStream.prototype.set =
    function(load)
    {
        var request = "";

        request += "<properties>";

        request += "<filter>";
        request += this.getOpt("filter");
        request += "</filter>";

        request += "</properties>";

        this._api.send(request);
    }

    EventStream.prototype.close =
    function()
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "close";
        this._api.sendObject(request);
    }

    EventStream.prototype.play =
    function()
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "play";
        this._api.sendObject(request);
        Datasource.prototype.play.call(this);
    }

    EventStream.prototype.pause =
    function()
    {
        var request = {"event-stream":{}};
        var o = request["event-stream"];
        o["id"] = this._id;
        o["action"] = "pause";
        this._api.sendObject(request);
        Datasource.prototype.play.call(this);
    }

    EventStream.prototype.setSchemaFromXml =
    function(xml)
    {
        Datasource.prototype.setSchemaFromXml.call(this,xml);
        this.completeSchema();
        this.deliverSchemaSet();
    }

    EventStream.prototype.setSchemaFromJson =
    function(json)
    {
        Datasource.prototype.setSchemaFromJson.call(this,json);
        this.completeSchema();
        this.deliverSchemaSet();
    }

    EventStream.prototype.completeSchema =
    function()
    {
        for (var i = 0; i < this._schema._fields.length; i++)
        {
            this._schema._fields[i].isKey = false;
        }

        var f;

        f = {"name":"@opcode","espType":"utf8str","type":"string","isKey":false,"isNumber":false,"isDate":false,"isTime":false};
        this._schema._fields.unshift(f);
        this._schema._columns.unshift(f["name"]);
        this._schema._fieldMap[f["name"]] = f;

        f = {"name":"@timestamp","espType":"timestamp","type":"date","isKey":false,"isNumber":true,"isDate":false,"isTime":true};
        this._schema._fields.unshift(f);
        this._schema._columns.unshift(f["name"]);
        this._schema._fieldMap[f["name"]] = f;

        f = {"name":"@counter","espType":"int32","type":"int","isKey":true,"isNumber":true,"isDate":false,"isTime":false};
        this._schema._fields.unshift(f);
        this._schema._columns.unshift(f["name"]);
        this._schema._fieldMap[f["name"]] = f;

        this._schema._keyFields = [f];
    }

    EventStream.prototype.events =
    function(data)
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

    EventStream.prototype.eventsXml =
    function(xml)
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

    EventStream.prototype.process =
    function(events)
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

    EventStream.prototype.info =
    function(xml)
    {
    }

    function
    Stats(api,options)
    {
        Options.call(this,options);

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

    Stats.prototype = Object.create(Options.prototype);
    Stats.prototype.constructor = Stats;

    Stats.prototype.message =
    function(data)
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

    Stats.prototype.process =
    function(o)
    {
    }

    Stats.prototype.start =
    function()
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
            this._connection = Connection.createDelegateConnection(this,url,opts);
            this._connection.authorization = this._api._connection.authorization;
            this._connection.start();
        }
    }

    Stats.prototype.stop =
    function()
    {
        if (this._connection != null)
        {
            this._connection.stop();
            this._connection = null;
        }
    }

    Stats.prototype.sort =
    function(a,b)
    {
        return(b - a);
    }

    Stats.prototype.optionSet =
    function(name,value)
    {
        if (this._delegates != null && this._delegates.length > 0)
        {
            this.set();
        }
    }

    Stats.prototype.set =
    function()
    {
    }

    Stats.prototype.addDelegate =
    function(delegate)
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

    Stats.prototype.removeDelegate =
    function(delegate)
    {
        if (tools.removeFrom(this._delegates,delegate))
        {
            if (this._delegates.length == 0)
            {
                this.stop();
            }
        }
    }

    Stats.prototype.getWindows =
    function()
    {
        return(this._windows);
    }

    Stats.prototype.getMemoryData =
    function()
    {
        return(this._memory);
    }

    Stats.prototype.getConfig =
    function()
    {
        return(this._config);
    }

    function
    Log(api)
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

    Log.prototype.start =
    function()
    {
        if (this._connection == null)
        {
            var url = this._api.getUrl("logs");
            this._connection = Connection.createDelegateConnection(this,url);
            this._connection.authorization = this._api._connection.authorization;
            this._connection.start();
        }
    }

    Log.prototype.stop =
    function()
    {
        if (this._connection != null)
        {
            this._connection.stop();
            this._connection = null;
        }
    }

    Log.prototype.message =
    function(data)
    {
        this._delegates.forEach((d) => {
            d.handleLog(this,data);
        });
    }

    Log.prototype.addDelegate =
    function(delegate)
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

    Log.prototype.removeDelegate =
    function(delegate)
    {
        if (tools.removeFrom(this._delegates,delegate))
        {
            if (this._delegates.length == 0)
            {
                this.stop();
            }
        }
    }

    function
    Publisher(api,options)
    {
        Options.call(this,options);
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

    Publisher.prototype = Object.create(Options.prototype);
    Publisher.prototype.constructor = Publisher;

    Publisher.prototype.open =
    function()
    {
        var o = {};

        this.addOpts(o);

        var opts = {schema:true,format:"json"};

        if (this.hasOpt("dateformat"))
        {
            opts["dateformat"] = this.getOpt("dateformat");
        }

        var url = this._api.getUrl("publishers/" + this._path,opts);
        this._connection = Connection.createDelegateConnection(this,encodeURI(url),opts);
        this._connection.authorization = this._api._connection.authorization;
        this._connection.start();
    }

    Publisher.prototype.close =
    function()
    {
        this._connection.stop();
        this._connection = null;
    }

    Publisher.prototype.ready =
    function()
    {
        this.publish();
    }

    Publisher.prototype.message =
    function(data)
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

    Publisher.prototype.addSchemaDelegate =
    function(delegate)
    {
        if (tools.supports(delegate,"schemaSet") == false)
        {
            if (_isNode)
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

    Publisher.prototype.removeSchemaDelegate =
    function(delegate)
    {
        tools.removeFrom(this._schemaDelegates,delegate);
    }

    Publisher.prototype.setSchemaFromXml =
    function(xml)
    {
        this._schema.fromXml(xml);
        this.deliverSchemaSet();

        if (this._csv != null)
        {
            this.csv();
        }
    }

    Publisher.prototype.setSchemaFromJson =
    function(json)
    {
        this._schema.fromJson(json);
        this.deliverSchemaSet();

        if (this._csv != null)
        {
            this.csv();
        }
    }

    Publisher.prototype.deliverSchemaSet =
    function()
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

    Publisher.prototype.begin =
    function()
    {
        this._o = new Object();
    }

    Publisher.prototype.set =
    function(name,value)
    {
        if (this._o != null)
        {
            this._o[name] = value;
        }
    }

    Publisher.prototype.end =
    function()
    {
        if (this._o != null)
        {
            this._data.push(this._o);
            this._o = new Object();
        }
    }

    Publisher.prototype.add =
    function(o)
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

    Publisher.prototype.publish =
    function()
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

    Publisher.prototype.send =
    function(publisher)
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

    Publisher.prototype.csv =
    function()
    {
        if (this._schema.size == 0)
        {
            return;
        }

        this._csv.items = this._schema.createDataFromCsv(this._csv.data);

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

    Publisher.prototype.publishCsvFrom =
    function(url,options)
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

    Publisher.prototype.publishCsv =
    function(data,options)
    {
        this._csv = {data:data,options:new Options(options),index:0};

        if (this._schema.size == 0)
        {
            return;
        }

        this.csv();
    }

    Publisher.prototype.isBinary =
    function()
    {
        return(false);
    }

    /* Delegates */

    function
    ModelDelegate(api,delegate,request)
    {
        this._api = api;
        this._delegate = delegate;
        this._request = null;
        this._api.sendObject(request);
    }

    ModelDelegate.prototype.deliver =
    function(xml)
    {
        var model = new Model(xml);

        if (tools.supports(this._delegate,"modelLoaded"))
        {
            this._delegate.modelLoaded(model,this._api);
        }
    }

    function
    ResponseDelegate(api,delegate)
    {
        this._api = api;
        this._delegate = delegate;
    }

    ResponseDelegate.prototype.deliver =
    function(data,xml)
    {
        if (tools.supports(this._delegate,"response"))
        {
            this._delegate.response(this._api,data,xml);
        }
    }

    function
    GuidDelegate(api,delegate)
    {
        this._api = api;
        this._delegate = delegate;
    }

    GuidDelegate.prototype.deliver =
    function(data)
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

    /* End Delegates */

    return(Api);
});
