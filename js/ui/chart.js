/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";
import {Touches} from "./touches.js";

var _windows = (navigator.platform.toLowerCase().indexOf("win") != -1);
var _input = null;

function
next()
{
    this._chart._datasource.next();
    this._chart.info();
}

function
prev()
{
    this._chart._datasource.prev();
    this._chart.info();
}

function
first()
{
    this._chart._datasource.first();
    this._chart.info();
}

function
last()
{
    this._chart._datasource.last();
    this._chart.info();
}

function
playPause()
{
    var code = this._chart._datasource.togglePlay();

    if (this._chart._playPause != null)
    {
        if (code)
        {
            this._chart._playPause.innerHTML = "&#xf4f4;";
        }
        else
        {
            this._chart._playPause.innerHTML = "&#xf513;";
        }
    }
}

function
handleClick()
{
    this._chart.toolbarClick(this._opts);
}

function
handleMouseDown()
{
    this._chart.toolbarMouseDown(this._opts);
}

function
handleMouseUp()
{
    this._chart.toolbarMouseUp(this._opts);
}

function
editFilter()
{
    if (this._chart._datasource != null)
    {
        this._chart._visuals.editFilter(this._chart._datasource);
    }
    else if (tools.supports(this._chart,"getFilter"))
    {
        this._chart._visuals.editFilter(this._chart);
    }
}

function
closeChart()
{
    this._chart.close();
}

function
open()
{
    var url = this._chart.getUrl();
    window.open(url);
}

function
copy()
{
    if (_input == null)
    {
        _input = document.createElement("input");
        _input.style.width = "1px"; 
        _input.style.height = "1px"; 
        _input.style.left = "-100px"; 
        _input.style.top = "-100px"; 
        document.body.appendChild(_input);
    }

    var url = this._chart.getUrl();

    _input.value = url;
    _input.setSelectionRange(0,_input.value.length);
    _input.focus();

    document.execCommand("copy");
}

function
over()
{
    if (this._chart._mobile)
    {
        return;
    }

    this._chart._visuals.hideToolbars();

    if (this._chart._datasource != null)
    {
        if (this._chart._navigation != null)
        {
            this._chart._navigation.style.visibility = "visible";
        }

        if (this._chart._filterContainer != null)
        {
            this._chart._filterContainer.style.visibility = "visible";
        }

        if (this._chart._playPauseContainer != null)
        {
            this._chart._playPauseContainer.style.visibility = "visible";
        }

        this._chart.info();
    }
    else if (this._chart._filterContainer != null)
    {
        this._chart._filterContainer.style.visibility = "visible";
    }

    if (this._chart._share != null)
    {
        if (this._chart._mail != null)
        {
            var subject = document.title;
            subject += " : ";
            subject += encodeURIComponent(this._chart.getOpt("header","ESP"));
            this._chart._mail.href = "mailto:?subject=" + subject + "&body=" + encodeURIComponent(this._chart.getUrl());
        }

        this._chart._share.style.visibility = "visible";
    }

    if (this._chart._custom != null)
    {
        this._chart._custom.style.visibility = "visible";
    }
}

function
out()
{
    if (this._chart._navigation != null)
    {
        this._chart._navigation.style.visibility = "hidden";
    }

    if (this._chart._datasource != null)
    {
        if (this._chart._filterContainer != null)
        {
            this._chart._filterContainer.style.visibility = "hidden";
        }

        if (this._chart._playPauseContainer != null)
        {
            this._chart._playPauseContainer.style.visibility = "hidden";
        }
    }
    else if (this._chart._filterContainer != null)
    {
        this._chart._filterContainer.style.visibility = "hidden";
    }

    if (this._chart._share != null)
    {
        this._chart._share.style.visibility = "hidden";
    }

    if (this._chart._custom != null)
    {
        this._chart._custom.style.visibility = "hidden";
    }
}

class Chart extends Options
{
    constructor(visuals,container,datasource,options)
    {
        super(options);

        this._mobile = visuals.isMobile();
        this._visuals = visuals;
        this._datasource = datasource;
        this._container = container;
        this._id = tools.guid();
        this._layout = {};
        this._layout["autosize"] = true;
        this._layout["font"] = this._visuals.font;
        this._layout["xaxis"] = {automargin:true,showline:true,fixedrange:true};
        this._layout["yaxis"] = {automargin:true,showline:true,fixedrange:true};
        this._keyfilter = null;
        this._parent = null;
        this._children = null;

        this._schemaReady = (this._datasource != null && this._datasource.schema.size > 0) ? true : false;

        var margin = this.getOpt("margin",20);
        this._layout["margin"] = {l:margin,r:margin,b:margin,t:margin};

        var range;

        if ((range = this.getOpt("x_range")) != null)
        {
            this._layout["xaxis"]["range"] = range;
        }

        if ((range = this.getOpt("y_range")) != null)
        {
            this._layout["yaxis"]["range"] = range;
        }

        this._keyProperty = "label";

        if (this.getType() != "wrapper")
        {
            this.container.innerHTML = "";
        }

        this._navigation = null;
        this._playPauseContainer = null;
        this._playPause = null;
        this._filterContainer = null;
        this._share = null;
        this._custom = null;

        this._div = document.createElement("div");
        this._div.className = "visual"; 

        this._header = document.createElement("div");
        this._header._chart = this;
        this._header.className = "visualHeader"; 
        this._header.style.overflow = "hidden";
        var table = document.createElement("table");
        table.style.width = "100%";

        var tr = document.createElement("tr");
        var close = null;
        var td;

        if (this.getOpt("enable_close",false))
        {
            tr.appendChild(td = document.createElement("td"));
            td.className = "close";
            td.style.paddingRight = "10px";
            td.title = "Close";
            close = document.createElement("a");
            close._chart = this;
            close.innerHTML = "&#xf10c;"
            close.className = "icon";
            close.href = "#";
            close.addEventListener("click",closeChart);
            td.appendChild(close);
        }

        tr.appendChild(td = document.createElement("td"));
        td.className = "headerText";
        if (close != null)
        {
            td.style.paddingLeft = "10px";
        }
        table.appendChild(tr);
        this._text = td;

        this._header.appendChild(table);

        this._toolbarItems = null;

        var icons = null;
        var toolbar = this.getOptAndClear("toolbar");

        if (toolbar != null)
        {
            this._toolbarItems = {};

            if (icons == null)
            {
                tr.appendChild(icons = document.createElement("td"));
                icons.className = "icons";
            }

            this._custom = document.createElement("span");
            this._custom.className = "custom";
            this._custom.style.visibility = "hidden";
            icons.appendChild(this._custom);

            toolbar.forEach((info) => {
                var item = this.createToolbarItem(info);
                this._custom.appendChild(item);
                this._toolbarItems[item._opts.getOpt("name","")] = item;
            });
        }

        if (this.getType() != "wrapper")
        {
            if (icons == null)
            {
                tr.appendChild(icons = document.createElement("td"));
                icons.className = "icons";
            }

            if (this._datasource != null && this._datasource.isArray() == false)
            {
                this._navigation = document.createElement("span");
                this._navigation.className = "navigation";
                this._navigation.style.visibility = "hidden";
                this._navigation.style.display = "none";
                icons.appendChild(this._navigation);
            }

            if (this.getOpt("enable_filter",false))
            {
                this._filterContainer = document.createElement("span");
                this._filterContainer.className = "filter";
                this._filterContainer.style.visibility = "hidden";
                icons.appendChild(this._filterContainer);
            }

            if (this.getOpt("play_pause",false))
            {
                this._playPauseContainer = document.createElement("span");
                this._playPauseContainer.className = "playPause";
                this._playPauseContainer.style.visibility = "hidden";
                icons.appendChild(this._playPauseContainer);
            }

            if (this.getOpt("enable_share",true))
            {
                this._share = document.createElement("span");
                this._share.className = "share";
                this._share.style.visibility = "hidden";
                icons.appendChild(this._share);
            }

            if (this._navigation != null)
            {
                this._next = document.createElement("a");
                this._next._chart = this;
                this._next.innerHTML = "&#xf4e6;";
                this._next.className = "icon";
                this._next.href = "#";
                this._next.addEventListener("click",next);
                this._navigation.appendChild(this._next);

                this._prev = document.createElement("a");
                this._prev._chart = this;
                this._prev.innerHTML = "&#xf4e5;";
                this._prev.className = "icon";
                this._prev.href = "#";
                this._prev.addEventListener("click",prev);
                this._navigation.appendChild(this._prev);

                this._first = document.createElement("a");
                this._first._chart = this;
                this._first.innerHTML = "&#xf4e4;";
                this._first.className = "icon";
                this._first.href = "#";
                this._first.addEventListener("click",first);
                this._navigation.appendChild(this._first);

                this._last = document.createElement("a");
                this._last._chart = this;
                this._last.innerHTML = "&#xf4e3;";
                this._last.className = "icon";
                this._last.href = "#";
                this._last.addEventListener("click",last);
                this._navigation.appendChild(this._last);
            }

            if (this._playPauseContainer != null)
            {
                this._playPause = document.createElement("a");
                this._playPause._chart = this;
                this._playPause.innerHTML = "&#xf4f4;";
                this._playPause.className = "icon";
                this._playPause.href = "#";
                this._playPause.addEventListener("click",playPause);
                this._playPauseContainer.appendChild(this._playPause);
            }

            if (this._filterContainer != null)
            {
                this._filter = document.createElement("a");
                this._filter._chart = this;
                this._filter.innerHTML = "&#xf25b;";
                this._filter.className = "icon";
                this._filter.href = "#";
                this._filter.addEventListener("click",editFilter);
                this._filterContainer.appendChild(this._filter);
            }

            if (this._share != null)
            {
                this._copy = document.createElement("a");
                this._copy._chart = this;
                this._copy.innerHTML = "&#xf141;";
                this._copy.className = "icon";
                this._copy.href = "#";
                this._copy.addEventListener("click",copy);
                this._share.appendChild(this._copy);

                this._open = document.createElement("a");
                this._open._chart = this;
                this._open.innerHTML = "&#xf4a2;";
                this._open.className = "icon";
                this._open.href = "#";
                this._open.addEventListener("click",open);
                this._share.appendChild(this._open);

                this._mail = document.createElement("a");
                this._mail._chart = this;
                this._mail.innerHTML = "&#xf3f1;";
                this._mail.className = "icon";
                this._mail.href = "javascript:null";
                this._share.appendChild(this._mail);
            }

            this._header.addEventListener("mouseover",over);
            this._header.addEventListener("mouseout",out);
        }

        this._content = document.createElement("div");
        this._content._chart = this;
        this._content.className = "visualContent"; 
        if (this.hasOpt("content_style"))
        {
            var css = this.getOpt("content_style");
            for (var x in css)
            {
                this._content.style[x] = css[x];
            }
        }
        this._content.style.overflow = "auto";
        this._content.id = this._id;
        this._div.appendChild(this._header);
        this._div.appendChild(this._content);
        if (this.getType() != "wrapper")
        {
            this._content.addEventListener("mouseover",over);
            this._content.addEventListener("mouseout",out);
        }

        if (this.getOpt("append_chart",true))
        {
            this.container.appendChild(this._div);
        }

        this.setHeader();

        this._initialized = false;
        this._handlers = false;

        this._defaults = {responsive:true,displayModeBar:false};

        if (this.getOpt("show_header",true) == false)
        {
            this._header.style.display = "none";
        }

        this._touches = null;

        if (this._mobile)
        {
            this._touches = new Touches(this.container,{delegate:this});
        }
    }

    get isSchemaReady()
    {
        return(this._schemaReady);
    }

    get layout()
    {
        return(this._layout);
    }

    get xaxis()
    {
        return(this._layout.xaxis);
    }

    get yaxis()
    {
        return(this._layout.yaxis);
    }

    get id()
    {
        return(this._id);
    }

    get type()
    {
        return(this.getType());
    }

    get isInitialized()
    {
        return(this._initialized);
    }

    set isInitialized(value)
    {
        this._initialized = value;
    }

    get keyProperty()
    {
        return(this._keyProperty);
    }

    set keyProperty(value) 
    {
        this._keyProperty = value;
    }

    get container()
    {
        var container = ((typeof(this._container) == "string") ? document.getElementById(this._container) : this._container);
        return(container);
    }

    set container(value)
    {
        var container = ((typeof(value) == "string") ? document.getElementById(value) : value);
        this._container = container;
    }

    get content()
    {
        return(this._content);
    }

    get header()
    {
        return(this.getOpt("header"));
    }

    set header(value) 
    {
        this.setOpt("header",value);
    }

    get keyfilter()
    {
        return(this._keyfilter);
    }

    set keyfilter(value) 
    {
        this._keyfilter = value;
    }

    get parent()
    {
        return(this._parent);
    }

    set parent(value) 
    {
        this._parent = value;
    }

    getType()
    {
        return("");
    }

    schemaReady(schema)
    {
        this._schemaReady = true;
    }

    init(schema)
    {
    }

    swipeLeft(distance)
    {
        if (this._datasource != null)
        {
            this._datasource.next();
            this.info();
        }
    }

    swipeRight(distance)
    {
        if (this._datasource != null)
        {
            this._datasource.prev();
            this.info();
        }
    }

    getToolbarItem(name)
    {
        var item = null;

        if (this._toolbarItems != null && this._toolbarItems.hasOwnProperty(name))
        {
            item = this._toolbarItems[name];
        }

        return(item);
    }

    getChild(keyvalue)
    {
        var child = (this._children != null && this._children.hasOwnProperty(keyvalue)) ? this._children[keyvalue] : null;
        return(child);
    }

    addChild(value)
    {
        var child = this.getChild(value);

        if (child != null)
        {
            return(child);
        }

        if (this._children == null)
        {
            this._content.innerHTML = "";
            this._content.style.display = "flex";
            this._content.style.flexWrap = "wrap";
            this._content.style.alignItems = "center";
            this._content.style.justifyContent = "center";
            this._children = {};
        }

        var width = this.getOpt("child_width","300");
        var height = this.getOpt("child_height","300");
        var div = document.createElement("div");
        div.style.width = width + "px";
        div.style.height = height + "px";
        var container = document.createElement("div");
        container.style.overflow = "auto";
        container.className = "component";
        container.style.width = this.getOpt("child_width","300px");
        container.style.height = this.getOpt("child_height","300px");
        container.style.width = width + "px";
        container.style.height = height + "px";
        container.style.padding = "10px";
        container.appendChild(div);
        this._content.appendChild(container);
        var opts = new Options(this.getOpts());
        opts.setOpt("enable_share",false);
        if ((child = this.createChild(div,opts.getOpts())) != null)
        {
            child.parent = this;
            this._children[value] = child;
            child.sizeContent();
        }

        return(child);
    }

    createChild()
    {
        return(null);
    }

    usesConnection(connection)
    {
        var code = false;

        if (this._datasource != null)
        {
            code = (this._datasource._api == connection);
        }

        return(code);
    }

    close()
    {
        this.container.innerHTML = "";
    }

    getUrl()
    {
        var serverRequest = false;

        if (this._datasource != null)
        {
            serverRequest = this._datasource.api.versionGreaterThan(7.6);
        }
        else if (this.hasOwnProperty("_connection") && this._connection != null)
        {
            serverRequest = this._connection.versionGreaterThan(7.6);
        }
        else
        {
            return(null);
        }

        if (serverRequest)
        {
            return(this.getEncodedUrl());
        }

        var base = "/esp-connect/html/visual.html";
        var parms = "";

        if (this._datasource != null)
        {
            parms += "server=" + this._datasource._api.httpurlBase;
            parms += "&datasource=" + this._datasource;
        }

        parms += "&visual=" + this.type;

        var opts = this.getOpts();
        var o;

        for (var name in opts)
        {
            o = opts[name];
            parms += "&" + this.addToUrl(o,name);
        }

        if (this._visuals.hasOpt("theme"))
        {
            parms += "&theme=" + this._visuals.getOpt("theme");
        }

        const   url = base + "?" + parms;

        return(url);
    }

    getEncodedUrl()
    {
        var opts = new Options();

        opts.setOpt("visual",this.type);

        if (this._visuals.hasOpt("theme"))
        {
            opts.setOpt("theme",this._visuals.getOpt("theme"));
        }

        var parms = "";
        var ui = "";
        var conn = null;

        if (this._datasource != null)
        {
            var o = {};
            this._datasource.addOpts(o);
            opts.setOpt("datasource",o);
            ui = this._datasource._api.httpurlBase;
            conn = this._datasource.connection;
        }
        else if (this.hasOwnProperty("_connection") && this._connection != null)
        {
            ui = this._connection.httpurlBase;
            conn = this._connection;
        }

        this.addOpts(opts.getOpts());
        if (this._visuals.hasOpt("connect-ui"))
        {
            opts.setOpt("_ui",this._visuals.getOpt("connect-ui"));
        }
        else
        {
            opts.setOpt("_ui",ui + "/eventStreamProcessing/v1/connect-ui");
        }
        opts.setOpt("show_header",false);
        opts.setOpt("enable_share",false);
        opts.setOpt("content_style",{border:"0"});
        if (conn.hasOpt("k8s"))
        {
            var k8s = conn.getOpt("k8s");
            opts.setOpt("_server",k8s.projectUrl);
        }
        else
        {
            opts.setOpt("_server",ui);
        }

        var url = ui;
        url += "/eventStreamProcessing/v1/connect-visual?_opts=";

        url += tools.btoa(opts.toString());

        return(url);
    }

    addToUrl(o,name,options)
    {
        var opts = new Options(options);
        var s = "";

        if (name != null)
        {
            if (opts.getOpt("quotes",false))
            {
                if (name.length > 0)
                {
                    if (name[0] != '"')
                    {
                        s += "\"" + name + "\"";
                    }
                    else
                    {
                        s += name;
                    }
                }
                s += ":";
            }
            else
            {
                s += name;
                s += "=";
            }
        }

        if (o != null)
        {
            var tmp;

            if (Array.isArray(o))
            {
                s += "[";

                var i = 0;

                for (var item of o)
                {
                    if (i > 0)
                    {
                        s += ",";
                    }

                    s += this.addToUrl(item,null,{quotes:true});

                    i++;
                }
                s += "]";
            }
            else if (o.constructor == Object)
            {
                s += "{";

                var i = 0;

                for (var y in o)
                {
                    if (i > 0)
                    {
                        s += ",";
                    }

                    s += this.addToUrl(o[y],y,{quotes:true});

                    i++;
                }
                s += "}";
            }
            else
            {
                tmp = o.toString();
                tmp = tmp.replace("#","%23");
                if (opts.getOpt("quotes",false))
                {
                    if (tmp.length > 0)
                    {
                        if (tmp[0] != '"')
                        {
                            s += "\"" + tmp + "\"";
                        }
                        else
                        {
                            s += tmp;
                        }
                    }
                }
                else
                {
                    s += tmp;
                }
            }
        }

        return(s);
    }

    createToolbarItem(info)
    {
        var a = document.createElement("a");
        var opts = new Options(info);
        a._opts = opts;
        a._chart = this;
        a.innerHTML = opts.getOpt("text","");
        a.className = opts.getOpt("classname","icon");
        if (opts.hasOpt("style"))
        {
            var style = opts.getOpt("style");
            for (var x in style)
            {
                a.style[x] = style[x];
            }
        }
        if (opts.hasOpt("id"))
        {
            a.id = opts.getOpt("id");
        }
        if (opts.hasOpt("tooltip"))
        {
            a.title = opts.getOpt("tooltip");
        }

        a.href = "#";
        a.addEventListener("click",handleClick);
        a.addEventListener("mousedown",handleMouseDown);
        a.addEventListener("mouseup",handleMouseUp);

        return(a);
    }

    getBorderSize()
    {
        var container = this.container;
        var containerBorders = tools.getBorders(container,true);
        var myBorders = tools.getBorders(this._div,true);
        var contentBorders = tools.getBorders(this._content,true);

        var w = containerBorders.hsize + myBorders.hsize + contentBorders.hsize;
        var h = containerBorders.vsize + myBorders.vsize + contentBorders.vsize;
        /*
        var w = myBorders.hsize + contentBorders.hsize;
        var h = myBorders.vsize + contentBorders.vsize;
        */

        return({width:w,height:h});
    }

    sizeContent()
    {
        var size = this.getBorderSize();
        var container = this.container;
        if (container != null)
        {
            var width = container.offsetWidth - size.width;
            var height = container.offsetHeight - this._header.offsetHeight - size.height;

            this._content.style.width = width + "px";
            this._content.style.height = height + "px";
            this._layout["width"] = width;
            this._layout["height"] = height;

            this.size();
        }
    }

    getVerticalPadding()
    {
        var padding = this._header.offsetHeight;
        return(padding);
    }

    toolbarClick(info)
    {
    }

    toolbarMouseDown(opts)
    {
    }

    toolbarMouseUp(opts)
    {
    }

    size(opts)
    {
    }

    refresh()
    {
        this.draw();
    }

    hideToolbar()
    {
        if (this._navigation != null)
        {
            this._navigation.style.display = "none";
        }
        if (this._playPauseContainer != null)
        {
            this._playPauseContainer.style.visibility = "hidden";
        }
        if (this._filterContainer != null)
        {
            this._filterContainer.style.visibility = "hidden";
        }
        if (this._share != null)
        {
            this._share.style.visibility = "hidden";
        }
        if (this._custom != null)
        {
            this._custom.style.visibility = "hidden";
        }
    }

    info()
    {
        if (this._datasource != null)
        {
            if (this._navigation != null)
            {
                var page = this._datasource._page;
                var pages = this._datasource._pages;

                if (pages <= 1)
                {
                    this._navigation.style.display = "none";
                }
                else
                {
                    this._navigation.style.display = "inline";
                    _controller.setLinkState(this._next,page < (pages - 1));
                    _controller.setLinkState(this._prev,page > 0);
                    _controller.setLinkState(this._first,page > 0);
                    _controller.setLinkState(this._last,page < (pages - 1));
                }
            }

            if (this._playPause != null)
            {
                this._playPause.innerHTML = this._datasource._paused ? "&#xf513;" : "&#xf4f4;";
            }
        }

        this.setHeader();
    }

    filterChanged()
    {
    }

    isCtrl(e)
    {
        return(_windows ? e.ctrlKey : e.metaKey);
    }

    clicked(data)
    {
        var keys = [];

        for (var i = 0; i < 1; i++)
        {
            var point = data.points[i];
            if (point.hasOwnProperty(this.keyProperty))
            {
                keys.push(point[this.keyProperty]);
            }
        }

        this._datasource.toggleSelectedKeys(keys,this.isCtrl(data.event) == false);
    }

    selected(data)
    {
        if (data == null)
        {
            return;
        }

        var indices = [];

        for (var i = 0; i < data.points.length; i++)
        {
            indices.push(data.points[i].pointNumber);
        }

        this._datasource.setSelectedIndices(indices);
    }

    setHandlers()
    {
        if (this._handlers == false)
        {
            var chart = this;
            this._content.on("plotly_click",function(data) {
                chart.clicked(data);
            });
            this._content.on("plotly_selected",function(data) {
                chart.selected(data);
            });
            this._content.on("plotly_hover",function(data) {
                return("jasfjasdfjajdfjasdfj");
            });
            this._handlers = true;
        }
    }

    setHeader(header)
    {
        if (header == null)
        {
            header = this.getOpt("header");
        }

        if (this._datasource != null)
        {
            if (header == null)
            {
                header = this._datasource._path;
            }

            if (this._datasource.isArray() == false)
            {
                if (this._datasource._pages > 1)
                {
                    header += " (Page " + (this._datasource._page + 1) + " of " + (this._datasource._pages) + ")";
                }
            }

            if (this.getOpt("filter_in_title",true))
            {
                var filter = this._datasource.getOpt("filter","");

                if (filter.length > 0)
                {
                    header += "<br>";
                    header += filter;
                }
            }
        }
        else if (this.hasOpt("filter"))
        {
            var filter = this.getOpt("filter","");

            if (filter.length > 0)
            {
                header += "<br>";
                header += "Filter: " + filter;
            }
        }

        var text = this._visuals.formatTitle(header);
        var height = this._header.offsetHeight;

        this._text.innerHTML = text;

        if (this._header.offsetHeight != height)
        {
            this.sizeContent();
        }
    }

    getValues(name)
    {
        var values = [];
        var value = this.getOpt(name);

        if (value != null)
        {
            if (Array.isArray(value))
            {
                for (var i = 0; i < value.length; i++)
                {
                    values.push(value[i]);
                }
            }
            else
            {
                values.push(value);
            }
        }

        return(values);
    }

    remove(name)
    {
        if (window.Plotly != null)
        {
            Plotly.purge(this._container);
        }
        this._div.innerHTML = "";
    }
}

class Controller
{
    constructor()
    {
        this.setLinkState = function(link,enabled)
        {
            var a = (typeof(link) == "string") ? document.getElementById(link) : link;

            if (a != null)
            {
                if (enabled)
                {
                    if (a.hasOwnProperty("_href"))
                    {
                        a.href = a._href;
                    }
                    a.style.opacity = 1.0;
                    a.style.cursor = "pointer";
                }
                else
                {
                    if (a.href != "#")
                    {
                        a._href = a.href;
                        a.href = "#";
                    }
                    a.style.opacity = 0.3;
                    a.style.cursor = "default";
                }
            }

            return(enabled);
        };
    }
}

var _controller = new Controller();

export {Chart};
