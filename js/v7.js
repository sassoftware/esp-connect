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
    "./options",
    "./visuals",
    "./dialogs"
], function(Connection,resources,Model,Schema,xpath,ajax,tools,codec,Options,Visuals,dialogs)
{
    function
    Api(connection,options)
    {
        Options.call(this,options);

        this._connection = connection;

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

		var	xml = null;
		var	json = null;

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

	Api.prototype.processJson =
	function(json)
    {
        if (this.getOpt("debug",false))
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
        else if (json.hasOwnProperty("load-project") || json.hasOwnProperty("load-router"))
        {
            var o = json.hasOwnProperty("load-project") ? json["load-project"] : json["load-router"] ;
            var id = o["@id"];

            if (this._loadDelegates.hasOwnProperty(id))
            {
                var d = this._loadDelegates[id];
                var code = o["@code"];

                if (code == 0)
                {
                    if (tools.supports(d.delegate,"loaded"))
                    {
                        var name = json.hasOwnProperty("load-project") ? d.request.project.name : d.request.router.name;
                        d.delegate.loaded(this,name);
                    }
                }
                else if (tools.supports(d.delegate,"error"))
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

                    d.delegate.error(this,d.request.name,message);
                }

                delete this._loadDelegates[id];
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
            var get = this._gets[id];

            if (get != null)
            {
                delete this._gets[id];

                if (o.hasOwnProperty("data"))
                {
                    var delegate = get["delegate"];
                    var options = get["options"];

                    if (tools.supports(delegate,"response"))
                    {
                        var data = o["data"];

                        if (options.getOpt("decode",true))
                        {
                            data = tools.b64Decode(data);
                        }

                        delegate.response(data);
                    }
                }
            }
        }
        else if (json.hasOwnProperty("url-publisher") || json.hasOwnProperty("data-publisher"))
        {
            var o = (json.hasOwnProperty("url-publisher")) ? json["url-publisher"] : json["data-publisher"];
            var id = o["@id"];

            if (this._publisherDelegates.hasOwnProperty(id))
            {
                var o = this._publisherDelegates[id];
                o.delegate.publishComplete(o.request.url);
                delete this._publisherDelegates[id];
            }
        }
        else if (json.hasOwnProperty("loggers"))
        {
            var o = json["loggers"];
            var id = o["@id"];

            if (this._responseDelegates.hasOwnProperty(id))
            {
                var contexts = o["contexts"];
                this._responseDelegates[id].deliver(contexts);
                delete this._responseDelegates[id];
            }
        }
    }

	Api.prototype.processXml =
	function(xml,data)
    {
        var	root = xml.documentElement;
        var	tag = root.nodeName;

        if (this.getOpt("debug",false))
        {
            console.log(xpath.format(xml.documentElement));
        }

        if (tag == "events" || tag == "info")
        {
            var id = root.getAttribute("id");

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
            if (root.hasAttribute("id"))
            {
                var id = root.getAttribute("id");

                if (this._datasources.hasOwnProperty(id))
                {
                    this._datasources[id].setSchemaFromXml(root);
                }
            }
            else if (root.hasAttribute("publisher"))
            {
                var id = root.getAttribute("publisher");

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
        else if (tag == "model")
        {
            var id = root.getAttribute("id");

            if (this._modelDelegates.hasOwnProperty(id))
            {
                var delegate = this._modelDelegates[id];
                delegate.deliver(xml);
                delete this._modelDelegates[id];
            }
        }
        else if (tag == "url-publisher")
        {
            var id = root.getAttribute("id");

            if (this._publisherDelegates.hasOwnProperty(id))
            {
                var o = this._publisherDelegates[id];
                o.delegate.publishComplete(o.request.url);
                delete this._publisherDelegates[id];
            }
        }
        else if (tag == "guids")
        {
            var id = root.getAttribute("id");

            if (this._guidDelegates.hasOwnProperty(id))
            {
                var delegate = this._guidDelegates[id];
                delegate.deliver(root);
                delete this._guidDelegates[id];
            }
        }
        else if (tag == "publisher")
        {
            var id = root.getAttribute("id");

            if (this._publishers.hasOwnProperty(id))
            {
                var publisher = this._publishers[id];

                if (root.getAttribute("complete") == "true")
                {
                    publisher._complete = true;
                }
            }
        }
        else if (tag == "load-project" || tag == "load-router")
        {
            var id = root.getAttribute("id");

            if (this._loadDelegates.hasOwnProperty(id))
            {
                var d = this._loadDelegates[id];
                var code = parseInt(root.getAttribute("code"));

                if (code == 0)
                {
                    if (tools.supports(d.delegate,"loaded"))
                    {
                        d.delegate.loaded(this,d.request.name);
                    }
                }
                else if (tools.supports(d.delegate,"error"))
                {
                    var message = xpath.getString("text",root);
                    d.delegate.error(this,d.request.name,message);
                }

                delete this._loadDelegates[id];
            }
        }
        else if (tag == "xml")
        {
            var id = root.getAttribute("id");

            if (this._responseDelegates.hasOwnProperty(id))
            {
                var code = parseInt(root.getAttribute("code"));
                var node = xml;
                var s = data;
                if (code == 0)
                {
                    node = xpath.getNode(".//project",xml);
                    s = xpath.format(node);
                }
                this._responseDelegates[id].deliver(s,node);
                delete this._responseDelegates[id];
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

	Api.prototype.publishDataFrom =
	function(path,url,delegate,options)
    {
        var conn = this;
        var o = {
            response:function(request,text,data) {
                conn.publishData(path,text,delegate,options);
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
        var blocksize = opts.getOpt("blocksize",1);
        var times = opts.getOpt("times",1);
        var id = opts.getOpt("id",tools.guid());
        var	o = {};

        var request = {"data-publisher":{}};
        var o = request["data-publisher"];
        o["id"] = id;
        o["window"] = path;
        o["data"] = tools.b64Encode(data);
        o["blocksize"] = blocksize;
        o["times"] = times;
        o["informat"] = opts.getOpt("informat","csv");

        if (opts.hasOpt("dateformat"))
        {
            o["dateformat"] = opts.getOpt("dateformat");
        }

        if (delegate != null)
        {
            if (tools.supports(delegate,"publishComplete") == false)
            {
                throw "The publisher delegate must implement the publishComplete method";
            }

            this._publisherDelegates[id] = {request:o,delegate:delegate};
        }

        this.sendObject(request);
    }

	Api.prototype.publishUrl =
	function(path,url,delegate,options)
	{
        var opts = new Options(options);
        var blocksize = opts.getOpt("blocksize",1);
        var times = opts.getOpt("times",1);
        var	o = {};
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

        if (delegate != null)
        {
            if (tools.supports(delegate,"publishComplete") == false)
            {
                throw "The url publisher delegate must implement the publishComplete method";
            }

            this._publisherDelegates[id] = {request:o,delegate:delegate};
        }

        this.sendObject(request);
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

        var id = tools.guid();
        var opts = new Options(options);
        var request = {"model":{}};
        var o = request["model"];
        o["id"] = id;
        o["schema"] = opts.getOpt("schema",false);
        o["index"] = opts.getOpt("index",true);
        o["xml"] = opts.getOpt("xml",false);
        this._modelDelegates[id] = new ModelDelegate(this,delegate,request);
    }

    Api.prototype.loadUrl =
    function(name,url,delegate)
    {
        var conn = this;
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
        var conn = this;
        var o = {
            response:function(request,text,data) {
                conn.loadProject(name,text,delegate,options);
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
        var conn = this;
        var o = {
            response:function(request,text,data) {
                conn.loadRouter(name,text,delegate,options);
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

		this._loadDelegates[id] = {connection:this,request:request,delegate:delegate};

        this.sendObject(request);
    }

    Api.prototype.loadRouter =
    function(name,data,delegate,options)
    {
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

		this._loadDelegates[id] = {connection:this,request:request,delegate:delegate};

        this.sendObject(request);
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
        var id = tools.guid();
        this._responseDelegates[id] = new ResponseDelegate(this,delegate);

        var request = {"xml":{}};
        var o = request["xml"];
        o["id"] = id;
        o["name"] = name;

        this.sendObject(request);
    }

    Api.prototype.getLoggers =
    function(delegate)
    {
	    if (tools.supports(delegate,"response") == false)
        {
            throw "The delegate must implement the response method";
        }

        var id = tools.guid();
        this._responseDelegates[id] = new ResponseDelegate(this,delegate);

        var request = {"loggers":{}};
        var o = request["loggers"];
        o["id"] = id;
        this.sendObject(request);
    }

    Api.prototype.setLogger =
    function(context,level,delegate)
    {
        var id = tools.guid();

        if (delegate != null)
        {
            this._responseDelegates[id] = new ResponseDelegate(this,delegate);
        }

        var request = {"loggers":{}};
        var o = request["loggers"];
        o["id"] = id;
        o["context"] = context;
        o["level"] = level;
        this.sendObject(request);
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
    function(keys,names,delimiter = ".")
    {
        var keyFields = [];
        var f;

        for (var s of keys)
        {
            if ((f = this._schema.getField(s)) == null)
            {
                throw("field " + s + " not found");
            }
            keyFields.push(f);
        }

        var timeKeys = false;

        if (keyFields.length == 1)
        {
            f = keyFields[0];

            if (f["isDate"])
            {
                timeKeys = true;
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
        var entry;
        var name;
        var key;

        items.forEach((o) =>
        {
            key = "";

            keyFields.forEach((f) =>
            {
                name = f["name"];
                if (o.hasOwnProperty(name))
                {
                    if (key.length > 0)
                    {
                        key += delimiter;
                    }
                    key += o[name];
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
        });

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

            if (timeKeys)
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

        var v = {keys:keyValues,values:values,selected:selected};
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
    EventCollection(conn,options)
    {
		Datasource.call(this,conn,options);
        this.setOpt("format","ubjson");
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
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"]= this._id;
        o["action"]= "set";
        o["window"]= this._path;
        o["schema"]= true;
        o["load"]= true;
        o["info"] = 5;
        o["format"]= "xml";

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

        this._api.sendObject(request);
    }

    EventCollection.prototype.set =
    function(load)
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

    EventCollection.prototype.close =
    function()
    {
        var request = {"event-collection":{}};
        var o = request["event-collection"];
        o["id"] = this._id;
        o["action"] = "close";
        this._api.sendObject(request);
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
        var	nodes = xpath.getNodes("//entries/event",xml);
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
    EventStream(conn,options)
    {
		Datasource.call(this,conn,options);
        this.setOpt("format","ubjson");
        this._data = [];
        this._counter = 1;
    }

	EventStream.prototype = Object.create(Datasource.prototype);
	EventStream.prototype.constructor = EventStream;

    EventStream.prototype.open =
    function()
    {
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

        this._api.sendObject(request);
    }

    EventStream.prototype.set =
    function(load)
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

        var	nodes = xpath.getNodes("//entries/event",xml);
        var	data = new Array();
        var	content;
        var	values;
        var	opcode;
        var	type;
        var	key;
        var	e;
        var	o;

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

		var	projectLabel = resources.getString("Project");
		var	contqueryLabel = resources.getString("Contquery");
		var	windowLabel = resources.getString("Window");
		var	cpuLabel = resources.getString("CPU");
		var	intervalLabel = resources.getString("Interval");
		var	countLabel = resources.getString("Count");

		var	fields = new Array();
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

    Stats.prototype.process =
    function(o)
    {
    }

    Stats.prototype.processJson =
    function(json)
    {
        this._windows = [];

        if (json.hasOwnProperty("projects"))
        {
            var	projects = json["projects"];

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
                    var	windows = contquery["windows"];

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
		    var	memory = json["server-memory"];
            this._memory["system"] = memory["system"];
            this._memory["virtual"] = memory["virtual"];
            this._memory["resident"] = memory["resident"];
        }

        this._config = {};

        if (json.hasOwnProperty("properties"))
        {
		    var	properties = json["properties"];
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

    Stats.prototype.processXml =
    function(xml)
    {
        this._windows = [];

		var	projects = xpath.getNodes(".//project",xml);
		var	contqueries;
		var	windows;
		var	p;
		var	cq;
		var	w;
		var	o;

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

		var	memory = xpath.getNode(".//server-memory",xml);

        if (memory != null)
        {
            this._memory["system"] = parseInt(xpath.getString("system",memory));
            this._memory["virtual"] = parseInt(xpath.getString("virtual",memory));
            this._memory["resident"] = parseInt(xpath.getString("resident",memory));
        }

        this._config = {};

		var	nodes = xpath.getNodes(".//properties/property",xml);

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

    Stats.prototype.stop =
    function()
    {
        var request = {"stats":{}};
        var o = request["stats"];
        o["action"] = "stop";
        this._api.sendObject(request);
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
                this.set();
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

    Log.prototype.process =
    function(xml)
    {
        var message = xpath.nodeText(xml.documentElement);

        for (var i = 0; i < this._delegates.length; i++)
        {
            this._delegates[i].handleLog(this,message);
        }
    }

    Log.prototype.start =
    function()
    {
        var request = {"logs":{}};
        var o = request["logs"];
        o["capture"] = true;
        this._api.sendObject(request);
    }

    Log.prototype.stop =
    function()
    {
        var request = {"logs":{}};
        var o = request["logs"];
        o["capture"] = true;
        o["capture"] = false;
        this._api.sendObject(request);
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

        var request = {"publisher":{}};
        var o = request["publisher"];
        o["id"] = this._id;
        o["action"] = "set";
        o["window"] = this._path;
        o["schema"] = true;

        if (this._api._publishers.hasOwnProperty(this._id) == false)
        {
            this._api._publishers[this._id] = this;
        }

        this._api.sendObject(request);
    }

	Publisher.prototype.close =
	function()
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
        return(this.getOpt("binary",false));
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
