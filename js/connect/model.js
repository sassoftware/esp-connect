/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {ajax} from "./ajax.js";
import {xpath} from "./xpath.js";
import {Schema} from "./schema.js";

class Model
{
    constructor(data)
    {
        this._projects = [];
        this._contqueries = [];
        this._windows = [];
        this._sourceWindows = [];

        var projects = xpath.getNodes("//project",data);

        var contqueries;
        var contquery;
        var project;
        var windows;
        var targets;
        var source;
        var edges;
        var edge;
        var win;
        var cq;
        var aw;
        var zw;
        var p;
        var a;
        var z;
        var s;

        for (var i = 0; i < projects.length; i++)
        {
            p = projects[i].getAttribute("name");

            project = new Object();
            project.xml = projects[i];
            project.key = p;
            project.name = p;
            project.index = projects[i].getAttribute("index");
            s = projects[i].getAttribute("read");
            project.hasReadPermission = (s != null && s.length > 0) ? (s == "true") : true;
            s = projects[i].getAttribute("write");
            project.hasWritePermission = (s != null && s.length > 0) ? (s == "true") : true;
            this._projects.push(project);

            project.contqueries = new Array();

            contqueries = xpath.getNodes(".//contquery",projects[i]);

            for (var j = 0; j < contqueries.length; j++)
            {
                cq = contqueries[j].getAttribute("name");

                contquery = new Object();
                contquery.key = p + "/" + cq;
                contquery.name = cq;
                contquery.index = contqueries[j].getAttribute("index");
                s = contqueries[j].getAttribute("read");
                contquery.hasReadPermission = (s != null && s.length > 0) ? (s == "true") : true;
                s = contqueries[j].getAttribute("write");
                contquery.hasWritePermission = (s != null && s.length > 0) ? (s == "true") : true;
                project.contqueries.push(contquery);
                this._contqueries.push(contquery);

                contquery.windows = new Array();
                contquery.edges = new Array();

                windows = xpath.getNodes(".//window",contqueries[j]);

                if (windows.length == 0)
                {
                    windows = xpath.getNodes(".//windows/*",contqueries[j]);
                }

                if (windows.length == 0)
                {
                    continue;
                }

                var xmlsource;
                var doc;

                for (var k = 0; k < windows.length; k++)
                {
                    win = this.addWindow(project,contquery,windows[k]);
                    win.xml = windows[k];
                    xmlsource = xpath.getNode("./xml",windows[k]);
                    if (xmlsource != null)
                    {
                        doc = xpath.createXml(xpath.nodeText(xmlsource));
                        win.xmlsource = xpath.xmlString(doc.documentElement);
                    }
                    else
                    {
                        win.xmlsource = xpath.format(win.xml);
                    }
                    win.pubsubEnabled = (windows[k].getAttribute("pubsub") == "true");
                    s = windows[k].getAttribute("read");
                    win.hasReadPermission = (s != null && s.length > 0) ? (s == "true") : true;
                    s = windows[k].getAttribute("write");
                    win.hasWritePermission = (s != null && s.length > 0) ? (s == "true") : true;
                    contquery.windows.push(win);
                }

                edges = xpath.getNodes("./edges/edge",contqueries[j]);

                for (var k = 0; k < edges.length; k++)
                {
                    source = edges[k].getAttribute("source").split(" ");
                    targets = edges[k].getAttribute("target").split(" ");

                    for (var l = 0; l < source.length; l++)
                    {
                        a = p + "/" + cq + "/" + source[l].trim();

                        aw = this.getWindow(a);

                        if (aw == null)
                        {
                            continue;
                        }

                        for (var m = 0; m < targets.length; m++)
                        {
                            s = targets[m].trim();

                            if (s.length > 0)
                            {
                                z = p + "/" + cq + "/" + s;

                                zw = this.getWindow(z);

                                if (zw != null)
                                {
                                    aw.outgoing.push(zw);
                                    zw.incoming.push(aw);

                                    edge = new Object();
                                    edge.a = aw.key;
                                    edge.z = zw.key;
                                    contquery.edges.push(edge);
                                }
                            }
                        }
                    }
                }
            }
        }

        for (var i = 0; i < this._contqueries.length; i++)
        {
            this._contqueries[i].windows.sort(_models.compareNames);
        }

        this._xml = data;
        this._xml.documentElement.removeAttribute("id");

        Object.defineProperty(this,"xml", {
            get() {
                return(this._xml);
            }
        });

        Object.defineProperty(this,"xmlstring", {
            get() {
                return(xpath.xmlString(this._xml));
            }
        });

        Object.defineProperty(this,"projects", {
            get() {
                return(this._projects);
            }
        });
    }

    addWindow(p,cq,w)
    {
        var name = w.getAttribute("name");
        var type = w.getAttribute("type");

        if (type == null || type.length == 0)
        {
            type = w.nodeName;
        }

        var a = type.split("-");

        if (a.length > 1)
        {
            type = "";

            for (var i = 1; i < a.length; i++)
            {
                if (type.length > 0)
                {
                    type += "-";
                }

                type += a[i];
            }
        }

        var win = new Object();

        win["p"] = p["name"];
        win["cq"] = cq["name"];
        win["name"] = name;
        win["type"] = type;
        win["index"] = w.getAttribute("index");
        win["class"] = (_models._windowClasses.hasOwnProperty(type)) ? _models._windowClasses[type] : "unknown";

        if (win["index"] == null)
        {
            if ((win["index"] = cq["index"]) == null)
            {
                if ((win["index"] = p["index"]) == null)
                {
                    win["index"] = "pi_HASH";
                }
            }
        }

        var schema = new Schema();
        schema.fromXml(w);

        win["schema"] = schema;

        win["key"] = p["name"] + "/" + cq["name"] + "/" + name;

        win.incoming = new Array();
        win.outgoing = new Array();

        win.cpu = 0.0;
        win.count = 0;

        this._windows.push(win);

        if (win.type == "window-source")
        {
            this.sourceWindows[win.key] = true;
        }

        return(win);
    }

    getProjects(key)
    {
        return(this._projects);
    }

    getProject(key)
    {
        return(this.get(key,this._projects));
    }

    getContqueries(key)
    {
        return(this._contqueries);
    }

    getContquery(key)
    {
        return(this.get(key,this._contqueries));
    }

    getWindows()
    {
        return(this._windows);
    }

    getSourceWindows()
    {
        var windows = [];

        this._windows.forEach((w) =>
        {
            if (w.type == "source")
            {
                windows.push(w);
            }
        });

        return(windows);
    }

    getWindowsForProject(project)
    {
        var windows = [];

        this._windows.forEach((w) =>
        {
            if (project == "*" || project == w.p)
            {
                windows.push(w);
            }
        });

        return(windows);
    }

    getWindow(key)
    {
        return(this.get(key,this._windows));
    }

    getWindowType(key)
    {
        var type = null;
        var w = this.getWindow(key);

        if (w != null)
        {
            type = w.type;
        }

        return(type);
    }

    get(key,a)
    {
        for (var i = 0; i < a.length; i++)
        {
            if (a[i].key == key)
            {
                return(a[i]);
            }
        }

        return(null);
    }

    removeIsolated(contquery)
    {
        var windows = new Array();
        var win;

        for (var i = 0; i < contquery.windows.length; i++)
        {
            win = contquery.windows[i];

            if ((win.type == "source" || win.type == "window-source") || (win.incoming.length > 0 || win.outgoing.length > 0))
            {
                windows.push(win);
            }
        }

        contquery.windows = windows;
    }
}

var _models = 
{
    _windowClasses:new Object(),

    init()
    {
        this._windowClasses["source"] = "input";

        this._windowClasses["filter"] = "transformation";
        this._windowClasses["aggregate"] = "transformation";
        this._windowClasses["compute"] = "transformation";
        this._windowClasses["union"] = "transformation";
        this._windowClasses["join"] = "transformation";
        this._windowClasses["copy"] = "transformation";
        this._windowClasses["functional"] = "transformation";

        this._windowClasses["notification"] = "utility";
        this._windowClasses["pattern"] = "utility";
        this._windowClasses["counter"] = "utility";
        this._windowClasses["geofence"] = "utility";
        this._windowClasses["procedural"] = "utility";

        this._windowClasses["model-supervisor"] = "analytics";
        this._windowClasses["model-reader"] = "analytics";
        this._windowClasses["train"] = "analytics";
        this._windowClasses["calculate"] = "analytics";
        this._windowClasses["score"] = "analytics";

        this._windowClasses["text-context"] = "textanalytics";
        this._windowClasses["text-category"] = "textanalytics";
        this._windowClasses["text-sentiment"] = "textanalytics";
        this._windowClasses["text-topic"] = "textanalytics";
    },

    compareNames:function(a,b)
    {
        return(a.name.localeCompare(b.name));
    },

    create(data)
    {
        return(new Model(data));
    }
};

_models.init();

//module.exports = Model;
export {Model};
