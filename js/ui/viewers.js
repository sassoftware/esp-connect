/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "../connect/model",
    "../connect/options",
    "../connect/tools",
    "./chart",
    "./simpletable",
    "./dialogs"
], function(Model,Options,tools,Chart,SimpleTable,dialogs)
{
    function
    Viewers(options)
    {
        Options.call(this,options);
    }

	Viewers.prototype = Object.create(Options.prototype);
	Viewers.prototype.constructor = Viewers;

    Viewers.prototype.createModelViewer =
    function(visuals,container,connection,options)
    {
        return(new ModelViewer(visuals,container,connection,options));
    }

    Viewers.prototype.createLogViewer =
    function(visuals,container,connection,options)
    {
        return(new LogViewer(visuals,container,connection,options));
    }

    /* Viewer Base */

    function
    ViewerBase(visuals,container,connection,options)
    {
        Chart.call(this,visuals,container,null,options);
        this._connection = connection;
    }

	ViewerBase.prototype = Object.create(Chart.prototype);
	ViewerBase.prototype.constructor = ViewerBase;

    ViewerBase.prototype.usesConnection =
    function(connection)
    {
        var code = (this._connection == connection);
        return(code);
    }

    /* End Viewer Base */

    /* Model Viewer */

    function
    propertyChanged()
    {
        this._viewer.setOpt(this.name,this.checked);
        this._viewer.draw();
        this._viewer.deliverPropertyChange(this.name,this.checked);
    }

    function
    projectChanged()
    {
        this._viewer.project = this.value;
    }

    function
    ModelViewer(visuals,container,connection,options)
    {
        var opts = new Options(options);
        var toolbar = [];
        opts.setOpt("toolbar",toolbar);

        toolbar.push({name:"reload",text:"&#xf59c;",right_border:true,style:{borderRight:"1px solid #d8d8d8",paddingRight:"10px"}});
        toolbar.push({name:"zoomIn",text:"&#xf8e1;",style:{paddingLeft:"10px"}});
        toolbar.push({name:"zoomOut",text:"&#xf8e2;"});
        toolbar.push({name:"fit",text:"&#xf7e6;"});

        opts.setOpt("toolbar",toolbar);

        ViewerBase.call(this,visuals,container,connection,opts.getOpts());

        this._project = null;

        Object.defineProperty(this,"connection", {
            get() {
                return(this._connection);
            },

            set(value) {

                //this._project = "*";
                this._data = null;

                if (this._modelDiv != null)
                {
                    this._system.innerText = "";
                    this._virtual.innerText = "";
                    this._resident.innerText = "";
                }

                if (this._connection != null)
                {
                    this._connection.getStats().removeDelegate(this);
                }

                this._connection = value;
                this._model = null;
                this.draw();

                if (this._connection != null)
                {
                    this._stats = this._connection.getStats();
                    this.setStats();
                    this._connection.loadModel(this,{schema:true,index:true,xml:true});
                }
            }
        });

        Object.defineProperty(this,"project", {
            get() {
                return(this._project);
            },

            set(value) {
                this._project = value;

                if (this._nodes != null)
                {
                    this._nodes.clear();
                    this._edges.clear();
                }

                this.draw();

                if (this._projectSelect != null)
                {
                    this._projectSelect.value = this._project;
                }

                this._delegates.forEach((d) =>
                {
                    if (tools.supports(d,"projectLoaded"))
                    {
                        d.projectLoaded(this);
                    }
                });
            }
        });

        Object.defineProperty(this,"model", {
            get() {
                return(this._model);
            }
        });

        this._data = null;
        this._model = null;
        this._projects = null;
        this._id = tools.guid();

        this._delegates = [];

        this._headerDiv = null;
        this._modelDiv = null;

        this._gradient = this._visuals._colors.createGradient();

        if (connection != null)
        {
            this.connection = connection;
        }
    }

	ModelViewer.prototype = Object.create(ViewerBase.prototype);
	ModelViewer.prototype.constructor = ModelViewer;

    ModelViewer.prototype.getType =
    function()
    {
        return("modelviewer");
    }

    ModelViewer.prototype.reload =
    function()
    {
        if (this._connection != null)
        {
            this._connection.loadModel(this,{schema:true,index:true,xml:true});
        }
    }

    ModelViewer.prototype.addDelegate =
    function(delegate)
    {
        this._delegates.push(delegate);
    }

    ModelViewer.prototype.init =
    function()
    {
        this._content.style.overflow = "hidden";

        this._headerDiv = document.createElement("div");
        this._headerDiv.className = "modelViewerHeader";

        this._footerDiv = document.createElement("div");
        this._footerDiv.className = "modelViewerFooter";
        this._footerDiv.style.display = "none";

        this._headerTable = document.createElement("table");
        this._headerTable.className = "modelViewerHeader";
        this._headerTable.cellspacing = 0;
        this._headerTable.cellpadding = 0;
        this._headerDiv.appendChild(this._headerTable);

        this._modelDiv = document.createElement("div");
        this._modelDiv.className = "modelViewerContent";
        this._modelDiv.style.textAlign = "center";
        this._modelDiv.style.overflow = "auto";

        this._content.appendChild(this._headerDiv);
        this._content.appendChild(this._modelDiv);
        this._content.appendChild(this._footerDiv);

        var controlTable = null;
        this._projectSelect = document.createElement("select");

        if (this.getOpt("show_projects",true) || this.getOpt("show_controls",true))
        {
            controlTable = document.createElement("table");
            controlTable.className = "controls";
            controlTable.appendChild(tr = document.createElement("tr"));

            if (this.getOpt("show_projects",true))
            {
                tr.appendChild(td = document.createElement("td"));
                td.innerText = "Project: ";
                tr.appendChild(td = document.createElement("td"));
                td.className = "project";
                td.appendChild(this._projectSelect);
                this._projectSelect._viewer = this;
                this._projectSelect.style.outline = "none";
                this._projectSelect.addEventListener("change",projectChanged);
            }

            if (this.getOpt("show_controls",true))
            {
                var span;
                var a;

                tr.appendChild(td = document.createElement("td"));
                td.className = "display cpu";
                td.appendChild(this._cpuLabel = document.createElement("label"));
                this._cpuLabel.appendChild(this._cpu = document.createElement("input"));
                this._cpuLabel.appendChild(span = document.createElement("span"));
                span.innerHTML = "   CPU";
                this._cpu.type = "checkbox";
                this._cpu.name = "cpu";
                this._cpu._viewer = this;
                this._cpu.addEventListener("change",propertyChanged);
                this._cpu.checked = this.getOpt("cpu",false);

                tr.appendChild(td = document.createElement("td"));
                td.className = "display";
                td.appendChild(this._countsLabel = document.createElement("label"));
                this._countsLabel.appendChild(this._counts = document.createElement("input"));
                this._countsLabel.appendChild(span = document.createElement("span"));
                span.innerHTML = "   Counts";
                this._counts.name = "counts";
                this._counts.type = "checkbox";
                this._counts._viewer = this;
                this._counts.addEventListener("change",propertyChanged);
                this._counts.checked = this.getOpt("counts",false);

                tr.appendChild(td = document.createElement("td"));
                td.className = "display";
                td.appendChild(this._typesLabel = document.createElement("label"));
                this._typesLabel.appendChild(this._types = document.createElement("input"));
                this._typesLabel.appendChild(span = document.createElement("span"));
                span.innerHTML = "   Types";
                this._types.type = "checkbox";
                this._types.name = "type";
                this._types._viewer = this;
                this._types.addEventListener("change",propertyChanged);
                this._types.checked = this.getOpt("type",false);

                tr.appendChild(td = document.createElement("td"));
                td.className = "display";
                td.appendChild(this._indexLabel  = document.createElement("label"));
                this._indexLabel .appendChild(this._indices = document.createElement("input"));
                this._indexLabel .appendChild(span = document.createElement("span"));
                span.innerHTML = "   Indices";
                this._indices.name = "index";
                this._indices.type = "checkbox";
                this._indices._viewer = this;
                this._indices.addEventListener("change",propertyChanged);
                this._indices.checked = this.getOpt("index",false);

                tr.appendChild(td = document.createElement("td"));
                td.className = "display";
                td.appendChild(this._memoryLabel = document.createElement("label"));
                this._memoryLabel.appendChild(this._memory = document.createElement("input"));
                this._memoryLabel.appendChild(span = document.createElement("span"));
                span.innerHTML = "   Memory";
                this._memory.name = "memory";
                this._memory.type = "checkbox";
                this._memory._viewer = this;
                this._memory.addEventListener("change",propertyChanged);
                this._memory.checked = this.getOpt("memory",false);
            }
        }
        else
        {
            this._headerDiv.style.display = "none";
        }

        this._memoryTable = document.createElement("table");
        this._memoryTable.appendChild(tr = document.createElement("tr"));

        /*
        tr.appendChild(td = document.createElement("td"));
        td.className = "memoryHeader";
        td.innerHTML = "Memory";
        */

        tr.appendChild(td = document.createElement("td"));
        td.className = "memoryLabel";
        td.innerHTML = "System: ";

        tr.appendChild(this._system = document.createElement("td"));
        this._system.className = "memoryValue";

        tr.appendChild(td = document.createElement("td"));
        td.className = "memoryLabel";
        td.innerHTML = "Virtual: ";

        tr.appendChild(this._virtual = document.createElement("td"));
        this._virtual.className = "memoryValue";

        tr.appendChild(td = document.createElement("td"));
        td.className = "memoryLabel";
        td.innerHTML = "Resident: ";

        tr.appendChild(this._resident = document.createElement("td"));
        this._resident.className = "memoryValue";

        var navTable = null;

        if (this.getOpt("show_header",true) == false)
        {
            navTable = document.createElement("table");
            navTable.className = "navigation";
            navTable.appendChild(tr = document.createElement("tr"));

            tr.appendChild(td = document.createElement("td"));
            td.className = "action";
            td.appendChild(this.createToolbarItem({name:"reload",text:"&#xf59c;",right_border:true,style:{borderRight:"1px solid #c8c8c8",paddingRight:"10px"}}));

            tr.appendChild(td = document.createElement("td"));
            td.className = "action";
            td.appendChild(this.createToolbarItem({name:"zoomIn",text:"&#xf8e1;"}));

            tr.appendChild(td = document.createElement("td"));
            td.className = "action";
            td.appendChild(this.createToolbarItem({name:"zoomOut",text:"&#xf8e2;"}));

            tr.appendChild(td = document.createElement("td"));
            td.className = "action";
            td.appendChild(this.createToolbarItem({name:"fit",text:"&#xf7e6;"}));
        }

        this._headerTable.appendChild(tr = document.createElement("tr"));
        if (navTable != null)
        {
            tr.appendChild(td = document.createElement("td"));
            td.appendChild(navTable);
        }
        if (controlTable != null)
        {
            tr.appendChild(td = document.createElement("td"));
            td.appendChild(controlTable);
        }

        /*
        this._headerTable.appendChild(tr = document.createElement("tr"));
        tr.appendChild(td = document.createElement("td"));
        td.appendChild(navTable);
        */

        /*
        tr.appendChild(td = document.createElement("td"));
        td.appendChild(this._memoryTable);
        */
        this._footerDiv.appendChild(this._memoryTable);

        this._nodes = new vis.DataSet();
        this._edges = new vis.DataSet();

        var options = {
            autoResize: true,
            nodes: {
                font: {
                    color: "black",
                    align: "center",
                    multi: true
                },
                shape: "box",
                chosen: {
                    label: function(values, id, selected, hovering) {
                        values.color = "black";
                    }
                },
                color: {
                    border: "black",
                    background: "white"
                },
                shadow: {
                    enabled: true
                },
                shapeProperties: {
                }
            },
            edges: {
                arrows: {
                    to: {
                        enabled: true,
                        type: "vee"
                    },
                },
                smooth: {
                    enabled: true
                },
                arrowStrikethrough: false
            },
            physics: {
                stabilization: {
                    enabled: false
                },
                enabled:true
            },
            layout: {
                hierarchical: {
                    direction: "UD",
                    direction: "LR",
                    parentCentralization: false,
                    sortMethod: "directed",
                    shakeTowards: "leaves",
                    enabled: true
                }
            },
            interaction: {
                dragNodes: false,
                zoomView: false
            },
            width:"100%",
            height:"100%",
            clickToUse: false
        };

        this._network = new vis.Network(this._modelDiv,{nodes:this._nodes,edges:this._edges},options);

        var viewer = this;

        this._network.on("click",function(properties) {
            var nodes = properties.nodes;
            if (nodes.length == 1)
            {
                var w = viewer._model.getWindow(nodes[0]);
                if (w != null)
                {
                    viewer._delegates.forEach((d) => 
                    {
	                    if (tools.supports(d,"nodeSelected"))
                        {
                            d.nodeSelected(w);
                        }
                    });
                }
            }
            else
            {
                viewer._delegates.forEach((d) => 
                {
                    if (tools.supports(d,"deselected"))
                    {
                        d.deselected(w);
                    }
                });
            }
            //console.log("click: " + JSON.stringify(nodes));
        });

        if (this.hasOpt("project"))
        {
            this.project = this.getOptAndClear("project");
        }
    }

    ModelViewer.prototype.zoom =
    function()
    {
    }

    ModelViewer.prototype.size =
    function()
    {
        if (this._modelDiv != null)
        {
            var width = this._content.offsetWidth;
            var height = this._content.offsetHeight;
            height -= this._headerDiv.offsetHeight;
            var	borders = tools.getBorders(this._modelDiv,true);
            this._modelDiv.style.width = (width - borders.hsize) + "px";
            this._modelDiv.style.height = (height - borders.vsize - this._footerDiv.offsetHeight) + "px";
        }
    }

    ModelViewer.prototype.draw =
    function()
    {
        if (this._modelDiv == null)
        {
            this.init();
        }

        this.build();

        if (this.getOpt("memory",false))
        {
            if (this._footerDiv.style.display == "none")
            {
                this._footerDiv.style.display = "block";
                this.size();
            }
        }
        else
        {
            if (this._footerDiv.style.display == "block")
            {
                this._footerDiv.style.display = "none";
            }
            this.size();
        }

        var header = this.getOpt("header","");

        if (this.getOpt("show_projects",true) == false)
        {
            if (this._project != null && this._project != "*")
            {
                header += " (" + this._project + ")";
            }
        }

        this.setHeader(header);
    }

    ModelViewer.prototype.setStats =
    function()
    {
        this._data = {};
        this._stats.addDelegate(this);

        var counts = this.getOpt("counts",false);

        this._stats.setOpts(this.getOpts());
        this._stats.setOpt("interval",5);
        this._stats.setOpt("counts",counts);
    }

    ModelViewer.prototype.load =
    function(data)
    {
        var model = new Model(data);
        this.modelLoaded(model,null);
    }

    ModelViewer.prototype.modelLoaded =
    function(model,connection)
    {
        if (this._modelDiv == null)
        {
            this.init();
        }

        this._memoryTable.style.display = (connection != null) ? "block" : "none";
        this._model = model;

        while (this._projectSelect.length > 0)
        {
            this._projectSelect.remove(0);
        }

        if (this._project != "*")
        {
            var exists = false;

            for (var p of this._model._projects)
            {
                if (p["name"] == this._project)
                {
                    exists = true;
                    break;
                }
            }

            if (exists == false)
            {
                this._project = "*";
            }
        }

        var option;
        var name;

        option = document.createElement("option");
        option.value = "*";
        option.appendChild(document.createTextNode("ALL"));
        this._projectSelect.add(option);

        for (var p of this._model._projects)
        {
            option = document.createElement("option");
            option.value = p["name"];
            option.appendChild(document.createTextNode(option.value));
            if (this._project != null && this._project == option.value)
            {
                option.selected = true;
            }
            this._projectSelect.add(option);
        }

        var colors = this._visuals._colors.colors;
        var index = 0;
        var type;

        this._windowColors = {};

        this._model._windows.forEach((w) => {
            if (this._windowColors.hasOwnProperty(w.type) == false)
            {
                if (index >= colors.length)
                {
                    index = 0;
                }

                this._windowColors[w.type] = colors[index];
                index++;
            }
        });

        this.clearNetwork();

        if (this.getOpt("show_controls",true))
        {
            this.setOpt("cpu",tools.setCbState(this._cpuLabel,{enabled:connection != null}));
            this.setOpt("counts",tools.setCbState(this._countsLabel,{enabled:connection != null}));
            this.setOpt("type",tools.setCbState(this._typesLabel,{enabled:true}));
            this.setOpt("index",tools.setCbState(this._indexLabel,{enabled:true}));
            this.setOpt("memory",tools.setCbState(this._memoryLabel,{enabled:connection != null}));
        }

        this.fit(1000);

        this._delegates.forEach((d) => 
        {
            if (tools.supports(d,"modelLoaded"))
            {
                d.modelLoaded(this,this._model);
            }
        });
    }

    ModelViewer.prototype.deliverPropertyChange =
    function(name,on)
    {
        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"propertyChanged"))
            {
                d.propertyChanged(this,name,on);
            }
        });
    }

    ModelViewer.prototype.refresh =
    function()
    {
        this._windowColors = {};

        if (this._model != null)
        {
            var colors = this._visuals._colors.colors;
            var index = 0;

            this._model._windows.forEach((w) => {
                if (this._windowColors.hasOwnProperty(w.type) == false)
                {
                    if (index >= colors.length)
                    {
                        index = 0;
                    }

                    this._windowColors[w.type] = colors[index];
                    index++;
                }
            });
        }

        this.clearNetwork();
        this.build();
    }

    ModelViewer.prototype.clearNetwork =
    function()
    {
        this._nodes.clear();
        this._edges.clear();
    }

    ModelViewer.prototype.build =
    function()
    {
        if (this._model == null)
        {
            return(null);
        }

        var projects = [];

        if (this._project == "*")
        {
            this._model._projects.forEach((p) => {
                projects.push(p["name"]);
            });
        }
        else
        {
            projects.push(this._project);
        }

        if (projects.length == 0)
        {
            return(null);
        }

        var showCpu = this.getOpt("cpu",false);
        var showCounts = this.getOpt("counts",false);
        var showType = this.getOpt("type",false);
        var showIndex = this.getOpt("index",false);
        var showProperties = showCpu || showCounts || showType || showIndex;

        var cpuColor = this.getOpt("cpu_color");

        if (cpuColor != null)
        {
            this._gradient.color = cpuColor;
        }

        var windows = [];
        var color;
        var label;
        var count;
        var aKey;
        var zKey;
        var edgeKey;
        var luma;
        var font;
        var cpu;
        var o;

        for (var a of this._model._windows)
        {
            p = a["p"];

            if (projects.includes(p) == false)
            {
                continue;
            }

            if (a["type"] == "source" || a["type"] == "window-source" || a["incoming"].length > 0 || a["outgoing"].length > 0)
            {
                if (tools.contains(windows,a) == false)
                {
                    windows.push(a);
                }

                var nodes = [a];

                for (var z of a["outgoing"])
                {
                    if (tools.contains(windows,z) == false)
                    {
                        windows.push(z);
                    }

                    nodes.push(z);
                }

                nodes.forEach((node) =>
                {
                    key = node["key"];

                    cpu = node.cpu;
                    count = node.count;
                    color = null;

                    if (cpuColor != null)
                    {
                        color = this._gradient.darken(cpu);
                    }

                    if (color == null)
                    {
                        if (this._windowColors != null)
                        {
                            color = this._windowColors[node["type"]];
                        }
                    }

                    label = "<b>" + node["name"] + "</b>";

                    if (showType)
                    {
                        label += "\n" + node["type"];
                    }

                    if (showIndex)
                    {
                        label += "\n" + node["index"];
                    }

                    if (showCpu)
                    {
                        label += "\ncpu: " + cpu;
                    }

                    if (showCounts)
                    {
                        label += "\ncount: " + count;
                    }

                    luma = this._visuals._colors.getLuma(color);

                    if (luma < 170)
                    {
                        font = {color:"white"};
                    }
                    else
                    {
                        font = {color:"black"};
                    }

                    this._nodes.update({id:key,label:label,color:{background:color},font:font});
                });

                aKey = a["key"];

                for (var z of a["outgoing"])
                {
                    zKey = z["key"];

                    edgeKey = aKey + "-" + zKey;

                    if (this._edges.get(edgeKey) == null)
                    {
                        this._edges.add({id:edgeKey,from:aKey,to:zKey});
                    }
                }
            }
        }
    }

    ModelViewer.prototype.setNetworkOptions =
    function(options)
    {
        this._network.setOptions(options);
        this.build();
    }

    ModelViewer.prototype.selectNodes =
    function(nodes)
    {
        this._network.selectNodes(nodes);
    }

    ModelViewer.prototype.handleStats =
    function(stats)
    {
        this._data = {};

        if (this._model != null)
        {
            this._model.getWindows().forEach((w) =>
            {
                w.cpu = 0;
                w.count = 0;
            });
        }

        var w;

        stats.windows.forEach((o) =>
        {
            key = o["project"]
            key += "/"
            key += o["contquery"]
            key += "/"
            key += o["window"]
            this._data[key] = o;
            if ((w = this._model.getWindow(key)) != null)
            {
                w.cpu = parseInt(o.cpu);
                w.count = o.count;
            }
        });

        var memory = stats.memory;

        if (memory != null)
        {
            this._system.innerText = memory["system"];
            this._virtual.innerText = memory["virtual"];
            this._resident.innerText = memory["resident"];
        }

        this.draw();

        this._delegates.forEach((d) =>
        {
            if (tools.supports(d,"handleStats"))
            {
                d.handleStats(this,this._data);
            }
        });
    }

    ModelViewer.prototype.toolbarMouseDown =
    function(opts)
    {
        var action = opts.getOpt("name","");
        var viewer = this;
        var msecs = 50;

        if (action == "zoomIn")
        {
            this._interval = setInterval(function(){viewer.zoomIn()},msecs);
        }
        else if (action == "zoomOut")
        {
            this._interval = setInterval(function(){viewer.zoomOut()},msecs);
        }
        else if (action == "moveLeft")
        {
            this._interval = setInterval(function(){viewer.moveLeft()},msecs);
        }
        else if (action == "moveRight")
        {
            this._interval = setInterval(function(){viewer.moveRight()},msecs);
        }
        else if (action == "moveUp")
        {
            this._interval = setInterval(function(){viewer.moveUp()},msecs);
        }
        else if (action == "moveDown")
        {
            this._interval = setInterval(function(){viewer.moveDown()},msecs);
        }
    }

    ModelViewer.prototype.toolbarMouseUp =
    function(opts)
    {
        if (this._interval != null)
        {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    ModelViewer.prototype.toolbarClick =
    function(opts)
    {
        var action = opts.getOpt("name","");

        if (action == "fit")
        {
            this._network.fit();
        }
        else if (action == "reload")
        {
            this.reload();
        }
    }

    ModelViewer.prototype.zoomIn =
    function()
    {
        var scale = this._network.getScale();
        scale *= 1.1;
        this._network.moveTo({scale:scale});
    }

    ModelViewer.prototype.zoomOut =
    function()
    {
        var scale = this._network.getScale();
        scale /= 1.1;
        this._network.moveTo({scale:scale});
    }

    ModelViewer.prototype.moveUp =
    function()
    {
        var position = this._network.getViewPosition();
        position.y -= 50;
        this._network.moveTo({position:position});
    }

    ModelViewer.prototype.moveDown =
    function()
    {
        var position = this._network.getViewPosition();
        position.y += 50;
        this._network.moveTo({position:position});
    }

    ModelViewer.prototype.moveLeft =
    function()
    {
        var position = this._network.getViewPosition();
        position.x -= 50;
        this._network.moveTo({position:position});
    }

    ModelViewer.prototype.moveRight =
    function()
    {
        var position = this._network.getViewPosition();
        position.x += 50;
        this._network.moveTo({position:position});
    }

    ModelViewer.prototype.fitNetwork =
    function()
    {
        if (this._viewer != null)
        {
            this._viewer.fit();
        }
    }

    ModelViewer.prototype.fit =
    function(after)
    {
        if (after != null)
        {
            var viewer = this;
            setTimeout(function(){viewer.fit()},after);
        }
        else
        {
            this._network.fit();
        }
    }

    /* End Model Viewer */

    /* Log Viewer */

    function
    LogViewer(visuals,container,connection,options)
    {
        var opts = new Options(options);
        var toolbar = [];
        opts.setOpt("toolbar",toolbar);

        toolbar.push({name:"playPause",text:"&#xf4f4;",tooltip:"Pause"});
        toolbar.push({name:"copyToClipboard",text:"&#xf3ca;",tooltip:"Copy Log to Clipboard"});
        toolbar.push({name:"clear",text:"&#xf108;",tooltip:"Clear Log"});
        toolbar.push({name:"contexts",text:"&#xf499;",tooltip:"Show Logging Contexts..."});

        //toolbar.push({name:"clear",text:"&#xf108;",style:{paddingLeft:"10px"}});

        opts.setOpt("toolbar",toolbar);
        opts.setOpt("enable_filter",true);

        ViewerBase.call(this,visuals,container,connection,opts.getOpts());

        this._paused = false;
        this._jsonformat = false;
        this._table = null;
        this._copy = null;
        this._id = 1;

        this._newlines = /\n/gi;
        this._spaces = / /gi;

        Object.defineProperty(this,"connection", {
            get() {
                return(this._connection);
            },

            set(value) {
                if (this._connection != null)
                {
                    this._connection.getLog().removeDelegate(this);
                }

                this._connection = value;

                if (this._connection != null)
                {
                    if (this.hasOpt("filter"))
                    {
                        this._connection.getLog().filter = this.getOpt("filter");
                    }

                    this._connection.getLog().addDelegate(this);

                    this._jsonformat = this._connection.versionGreaterThan(7.4);
                }

                this.draw();
            }
        });

        this.connection = connection;
    }

	LogViewer.prototype = Object.create(ViewerBase.prototype);
	LogViewer.prototype.constructor = LogViewer;

    LogViewer.prototype.getType =
    function()
    {
        return("logviewer");
    }

    LogViewer.prototype.init =
    function()
    {
        this._content.style.overflow = "hidden";

        this._logDiv = document.createElement("div");
        this._logDiv.style.className = "Logviewer";
        this._logDiv.style.margin = 0;
        this._logDiv.style.padding = 0;

        this._content.appendChild(this._logDiv);

        var fields = [];
        fields.push({name:"id",type:"string",hidden:true});
        fields.push({name:"_timestamp",type:"string",label:"Time",nobr:true});
        fields.push({name:"messageContent",type:"string",label:"Text"});
        fields.push({name:"messageFile",type:"string",label:"File"});
        fields.push({name:"messageLine",type:"int",label:"Line"});
        fields.push({name:"logName",type:"string",label:"Logger"});
        fields.push({name:"logLevel",type:"string",label:"Level"});

        var options = {key:"id",tail:true};

        this._logDiv.innerHTML = "";

        this._table = new SimpleTable(this._logDiv,options);
        this._table.setFields(fields);
        this._table.draw();

        this.size();
    }

    LogViewer.prototype.toolbarClick =
    function(opts)
    {
        var action = opts.getOpt("name","");

        if (action == "playPause")
        {
            this.togglePlay();
        }
        else if (action == "copyToClipboard")
        {
            this.copyToClipboard();
        }
        else if (action == "clear")
        {
            this.clear();
        }
        else if (action == "contexts")
        {
            this.showContexts();
        }
    }

    LogViewer.prototype.showContexts =
    function()
    {
        if (this._loggerTable == null)
        {
            this._showContextsId = tools.guid();
            this._contextDialog = document.createElement("div");
            this._contextDialog.innerHTML = this.getContextHtml(this._showContextsId);
            document.body.appendChild(this._contextDialog);

            var fields = new Array();
            fields.push({name:"@name",type:"string",label:"Logging Context"});
            fields.push({name:"@level",type:"string",label:"Level"});

            const   tableDiv = document.getElementById(this._showContextsId + "-table");
            tableDiv.style.border = "1px solid #d8d8d8";
            tableDiv.style.height = "300px";

            const   viewer = this;

            const    delegate = {
                itemClicked:function(item) {

                    viewer._loggerTable.deselectAll();
                    item.selected = true;

                    document.getElementById(viewer._showContextsId + "-loglevel").value = item["@level"].toLowerCase();
                    document.getElementById(viewer._showContextsId + "-setLevel").disabled = false;
                }
            };

            this._loggerTable = this._visuals.createSimpleTable(tableDiv,{name:"loggers",key:"@name"},delegate);
            this._loggerTable.setFields(fields);
            this._loggerTable.draw();

            const   click = function() {
                var item = viewer._loggerTable.getSelectedItem();
                if (item != null)
                {
                    const   value = document.getElementById(viewer._showContextsId + "-loglevel").value;
                    viewer._connection.setLogger(item["@name"],value,{response:function(connection,data){
                        if (Array.isArray(data))
                        {
                            table.setData(data);
                        }
                    }
                    });
                }
            };

            document.getElementById(viewer._showContextsId + "-setLevel").addEventListener("click",click);
        }

        dialogs.pushModal(this._showContextsId);

        const   table = this._loggerTable;

        table.deselectAll();

        this._connection.getLoggers({
            response:function(connection,data)
            {
                if (Array.isArray(data))
                {
                    table.setData(data);
                }
            }
        });
    }

    LogViewer.prototype.getFilter =
    function()
    {
        return(this.getOpt("filter"));
    }

    LogViewer.prototype.setFilter =
    function(value)
    {
        this._connection.getLog().filter = value;
        this.setOpt("filter",value);
        this.setHeader();
    }

    LogViewer.prototype.copyToClipboard =
    function()
    {
        var copy = this._copy;

        if (copy == null)
        {
            copy = document.createElement("textarea");
            copy.style.display.width = "1px";
            copy.style.display.height = "1px";
            copy.style.display.left = "-10px";
            copy.style.display.top = "-10px";
            document.body.appendChild(copy);
            this._copy = copy;
        }

        var s = "";
        var value;

        const   newlines = /\<br\/\>/gi;
        const   spaces = /&nbsp;/gi;

        this._table.items.forEach((item) => {

            this._table.fields.forEach((field) => {
                if (this._table.isHidden(field.getOpt("name")) == false)
                {
                    value = item[field.getOpt("name")];

                    if (field.getOpt("name") == "messageContent")
                    {
                        value = value.replace(newlines,"\n");
                        value = value.replace(spaces," ");
                    }

                    s += field.getOpt("name");
                    s += "=";
                    s += value;
                    s += "\n";
                }
            });

            s += "------------------------------------------------------\n";
        });

        copy.value = s;
        copy.setSelectionRange(0,copy.value.length);
        copy.focus();
        document.execCommand("copy");
    }

    LogViewer.prototype.togglePlay =
    function()
    {
        var code = false;
        var item = this.getToolbarItem("playPause");

        if (this._paused)
        {
            this._paused = false;
            this._connection.getLog().addDelegate(this);
            item.innerHTML = "&#xf4f4;";
            code = true;
        }
        else
        {
            this._paused = true;
            this._connection.getLog().removeDelegate(this);
            item.innerHTML = "&#xf513;";
        }

        return(code);
    }

    LogViewer.prototype.draw =
    function()
    {
        if (this._logDiv == null)
        {
            this.init();
        }

        if (this._table != null)
        {
            this._table.draw();
        }

        this.setHeader();
    }

    LogViewer.prototype.size =
    function()
    {
        if (this._logDiv != null)
        {
            var	outerBorders = tools.getBorders(this._logDiv,true);
            this._logDiv.style.width = (this._content.offsetWidth - outerBorders.hsize) + "px";
            this._logDiv.style.height = (this._content.offsetHeight - outerBorders.vsize) + "px";
        }
    }

    LogViewer.prototype.clear =
    function()
    {
        if (this._table != null)
        {
            this._table.clear();
        }
        this.draw();
    }

    LogViewer.prototype.handleLog =
    function(connection,message)
    {
        var text = message.messageContent.replace(this._newlines,"<br/>");
        text = text.replace(this._spaces,"&nbsp;");
        message.messageContent = text;

        this._table.hold();

        message.id = new String(this._id++);

        this._table.setItem(message);

        var diff = this._table.length - this.getOpt("max",50);

        if (diff > 0)
        {
            this._table.removeHead(diff);
        }

        this._table.release();

        this.draw();
    }

    LogViewer.prototype.getContextHtml =
    function(id)
    {
        var s = "";

        s += "    <div id=\"" + id + "\" class=\"dialog\" style=\"width:50%\">\n";
        s += "\n";
        s += "        <table class=\"dialogClose\" style=\"width:100%\" cellspacing=\"0\" cellpadding=\"0\">\n";
        s += "            <tr><td class=\"icon\"><a class=\"icon dialogTitle\" href=\"javascript:_esp.getDialogs().popModal('" + id + "')\">&#xf10c;</a></td></tr>\n";
        s += "        </table>\n";
        s += "\n";
        s += "        <div class=\"dialogTop\">\n";
        s += "\n";
        s += "            <div  class=\"dialogHeader\">\n";
        s += "                <div class=\"dialogTitle\">\n";
        s += "                    <table style=\"width:100%;border:0\" cellspacing=\"0\" cellpadding=\"0\">\n";
        s += "                        <tr>\n";
        s += "                            <td><div class=\"dialogTitle\">Log Levels</div></td>\n";
        s += "                        </tr>\n";
        s += "                    </table>\n";
        s += "                </div>\n";
        s += "            </div>\n";
        s += "\n";
        s += "            <div class=\"dialogContent\">\n";
        s += "                <div id=\"" + id + "-table\"></div>\n";
        s += "                <table border=\"0\" style=\"width:100%;height:100%\" cellspacing=\"0\" cellpadding=\"0\">\n";
        s += "                    <tr>\n";
        s += "                        <td class=\"dialogLabel\">Level:</td>\n";
        s += "                    </tr>\n";
        s += "                    <tr>\n";
        s += "                        <td class=\"dialogValue\">\n";
        s += "                            <select id=\"" + id + "-loglevel\">\n";
        s += "                                <option value=\"trace\">Trace</option>\n";
        s += "                                <option value=\"debug\">Debug</option>\n";
        s += "                                <option value=\"info\">Info</option>\n";
        s += "                                <option value=\"warn\">Warn</option>\n";
        s += "                                <option value=\"error\">Error</option>\n";
        s += "                                <option value=\"fatal\">Fatal</option>\n";
        s += "                                <option value=\"off\">None</option>\n";
        s += "                            </select>\n";
        s += "                        </td>\n";
        s += "                    </tr>\n";
        s += "                    <tr>\n";
        s += "                        <td style=\"padding-top:10px\">\n";
        s += "                            <button id=\"" + id + "-setLevel\" style=\"font-size:12pt\" disabled=\"true\">Set Level</button>\n";
        s += "                        </td>\n";
        s += "                    </tr>\n";
        s += "                </table>\n";
        s += "            </div>\n";
        s += "        </div>\n";
        s += "    </div>\n";
        s += "\n";

        return(s);
    }

    /* End Log Viewer */

    return(Viewers);
});
