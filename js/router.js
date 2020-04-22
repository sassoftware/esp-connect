/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "./connections",
    "./xpath",
    "./tools",
    "./options"
], function(connections,xpath,tools,Options)
{
    function
    Router()
    {
        this._servers = {};
        this._connections = {};
        this._destinations = {};
        this._routes = {};
        this._models = {};
        this._errors = {};
    }

    Router.prototype.configure =
    function(config)
    {
        var xml = xpath.createXml(config);

        xpath.getNodes("//esp-engines/esp-engine",xml).forEach((node) =>
        {
            var name = node.getAttribute("name");
            var url = "http://" + node.getAttribute("host") + ":" + node.getAttribute("port");
            this.addServer(name,url);
        });

        xpath.getNodes("//esp-destinations/*",xml).forEach((node) =>
        {
            if (node.tagName == "publish-destination")
            {
                var name = node.getAttribute("name");
                var target = xpath.getNode("publish-target",node);
                if (target == null)
                {
                    throw("no target for publish destination");
                }

                var destination = new PublishDestination(this);
                var n;

                destination.opcode = node.getAttribute("opcode");

                if ((n = xpath.getNode("engine-func",target)) != null)
                {
                    destination.getEngine = new Function("data",xpath.nodeText(n));
                }
                else
                {
                    throw("you must supply the engine-func element");
                }

                if ((n = xpath.getNode("project-func",target)) != null)
                {
                    destination.getProject = new Function("data",xpath.nodeText(n));
                }
                else
                {
                    throw("you must supply the project-func element");
                }

                if ((n = xpath.getNode("contquery-func",target)) != null)
                {
                    destination.getContquery = new Function("data",xpath.nodeText(n));
                }
                else
                {
                    throw("you must supply the contquery-func element");
                }

                if ((n = xpath.getNode("window-func",target)) != null)
                {
                    destination.getWindow = new Function("data",xpath.nodeText(n));
                }
                else
                {
                    throw("you must supply the window-func element");
                }

                this._destinations[name] = destination;
            }
        });

        this._routes = {};

        xpath.getNodes("//esp-routes/esp-route",xml).forEach((node) =>
        {
            var name = node.getAttribute("name");
            var route = new Route(name,this);

            route.to = node.getAttribute("to");

            var n;

            if ((n = xpath.getNode("engine-expr",node)) != null)
            {
                route.engine = xpath.nodeText(n);
            }

            if ((n = xpath.getNode("project-expr",node)) != null)
            {
                route.project = xpath.nodeText(n);
            }

            if ((n = xpath.getNode("contquery-expr",node)) != null)
            {
                route.contquery = xpath.nodeText(n);
            }

            if ((n = xpath.getNode("window-expr",node)) != null)
            {
                route.win = xpath.nodeText(n);
            }

            this._routes[name] = route;
        });
    }

    Router.prototype.addServer =
    function(name,url)
    {
        this._servers[name] = url;
    }

    Router.prototype.addDestination =
    function(name)
    {
        var destination = new Destination(this);
        this._destinations[name] = destination;
        return(destination);
    }

    Router.prototype.addPublishDestination =
    function(name)
    {
        var destination = new PublishDestination(this);
        this._destinations[name] = destination;
        return(destination);
    }

    Router.prototype.addRoute =
    function(name)
    {
        var route = new Route(name,this);
        this._routes[name] = route;
        return(route);
    }

    Router.prototype.ready =
    function(connection)
    {
        connection.loadModel(this);
    }

    Router.prototype.error =
    function(connection)
    {
        var name = connection.getOpt("name");

        if (this._errors.hasOwnProperty(name) == false)
        {
            console.log("server error " + connection);
            this._errors[name] = connection;
        }

        delete this._models[name];
    }

    Router.prototype.getEngine =
    function(name)
    {
        return(this._connections.hasOwnProperty(name) ? this._connections[name] : null);
    }

    Router.prototype.getModel =
    function(name)
    {
        return(this._models.hasOwnProperty(name) ? this._models[name] : null);
    }

    Router.prototype.modelLoaded =
    function(model,connection)
    {
        var name = connection.getOpt("name");
        this._models[name] = model;

        if (this._errors.hasOwnProperty(name))
        {
            console.log("server back up " + connection);
            delete this._errors[name];
        }

        var responses = Object.keys(this._models).length + Object.keys(this._errors).length;

        if (responses == Object.keys(this._connections).length)
        {
            Object.values(this._destinations).forEach((dest) =>
            {
                dest.init();
            });

            Object.values(this._routes).forEach((route) =>
            {
                route.init();
            });
        }
    }

    Router.prototype.start =
    function()
    {
        Object.values(this._connections).forEach((engine) => {
            engine.close();
        });

        this._connections = {};

        Object.keys(this._servers).forEach((name) => {
            var url = this._servers[name];
            var u = tools.createUrl(decodeURI(url));
            var conn = connections.connect(u["host"],u["port"],u["path"],u["secure"],this,{name:name});
            this._connections[name] = conn;
            conn.start();
        });
    }

    Router.prototype.stop =
    function()
    {
        Object.values(this._connections).forEach((engine) => {
            engine.close();
        });
    }

    function
    Destination(router)
    {
        this._router = router;
    }

    Destination.prototype.init =
    function()
    {
        if (tools.supports(this,"process") == false)
        {
            throw("destination must implement the process(data) method");
        }
    }

    function
    PublishDestination(router)
    {
        Destination.call(this,router);
        this._publishers = {};
        this._opcode = null;
        Object.defineProperty(this,"opcode", {
            set(value) {
                this._opcode = value;
            },

            get() {
                return(this._opcode);
            }
        });
    }

	PublishDestination.prototype = Object.create(Destination.prototype);
	PublishDestination.prototype.constructor = PublishDestination;

    PublishDestination.prototype.init =
    function()
    {
		Destination.prototype.init.call(this);

        ["getEngine","getProject","getContquery","getWindow"].forEach((method) => {
            if (tools.supports(this,method) == false)
            {
                throw("destination must implement the " + method + " method");
            }
        });

        this._publishers = {};
    }

    PublishDestination.prototype.process =
    function(data)
    {
        var e = this.getEngine(data);

        if (e == null)
        {
            return;
        }

        var engine = this._router.getEngine(e);

        if (engine == null)
        {
            console.log("cannot find engine: " + e);
            return;
        }

        var p = this.getProject(data);
        var cq = this.getContquery(data);
        var w = this.getWindow(data);
        var key = e + "/" + p + "/" + cq + "/" + w;

        var publisher = null;

        if (this._publishers.hasOwnProperty(key))
        {
            publisher = this._publishers[key];
        }
        else
        {
            var id = p + "/" + cq + "/" + w;
            publisher = engine.getPublisher({window:id,id:id,binary:true});
            this._publishers[key] = publisher;
        }

        publisher.add(data);
        publisher.publish();
    }

    function
    Route(name,router)
    {
        this._name = name;
        this._router = router;

        this._engine = null;
        this._project = null;
        this._contquery = null;
        this._window = null;
        this._to = null;
        this._destinations = [];

        Object.defineProperty(this,"name", {
            get:function() {
                return(this._name);
            }
        });

        Object.defineProperty(this,"engine", {
            set:function(value) {
                this._engine = (value != null) ? new RegExp(value) : null;
            },
            get:function() {
                return(this._engine);
            }
        });

        Object.defineProperty(this,"project", {
            set:function(value) {
                this._project = (value != null) ? new RegExp(value) : null;
            },
            get:function() {
                return(this._project);
            }
        });

        Object.defineProperty(this,"contquery", {
            set:function(value) {
                this._contquery = (value != null) ? new RegExp(value) : null;
            },
            get:function() {
                return(this._contquery);
            }
        });

        Object.defineProperty(this,"win", {
            set:function(value) {
                this._window = (value != null) ? new RegExp(value) : null;
            },
            get:function() {
                return(this._window);
            }
        });

        Object.defineProperty(this,"to", {
            set:function(value) {
                this._to = (value != null) ? value.split(",") : null;
            },
            get:function() {
                return(this._to);
            }
        });
    }

    Route.prototype.init =
    function()
    {
        if (this._to == null)
        {
            throw("route " + this.name + " does not have any destinations associated with it");
        }

        if (this._engine != null)
        {
            Object.keys(this._router._connections).forEach((key) => {
                if (this._engine.test(key))
                {
                    var engine = this._router._connections[key];
                    var projects = [];
                    var model = this._router.getModel(engine.getOpt("name"));
                    model.projects.forEach((p) => {
                        if (this._project == null || this._project.test(p.name))
                        {
                            projects.push(p);
                        }
                    });

                    var contqueries = [];

                    projects.forEach((p) => {
                        p.contqueries.forEach((cq) =>
                        {
                            if (this._contquery == null || this._contquery.test(cq.name))
                            {
                                contqueries.push(cq);
                            }
                        });
                    });

                    var windows = [];

                    contqueries.forEach((cq) => {
                        cq.windows.forEach((w) => {
                            if (this._window == null || this._window.test(w.name))
                            {
                                windows.push(w);
                            }
                        });
                    });

                    windows.forEach((w) => {
                        var events = engine.getEventStream({window:w.key,maxevents:0,schema:false});
                        events.addDelegate(this);
                    });
                }
            });
        }

        this._destinations = [];
        this._to.forEach((s) => {
            if (this._router._destinations.hasOwnProperty(s))
            {
                this._destinations.push(this._router._destinations[s]);
            }
        });
    }

    Route.prototype.dataChanged =
    function(datasource,data,clear)
    {
        data.forEach((item) => {
            this._destinations.forEach((dest) => {
                dest.process(item);
            });
        });
    }

    return(Router);
});
