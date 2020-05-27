/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

define([
    "../connect/options",
    "../connect/tools"
], function(Options,tools)
{
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

        if (code)
        {
            this._chart._playPause.innerHTML = "&#xf4f4;";
        }
        else
        {
            this._chart._playPause.innerHTML = "&#xf513;";
        }
    }

    function
    editFilter()
    {
        this._chart._visuals.editFilter(this._chart._datasource);
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
        this._chart._visuals.hideToolbars();

        var subject = document.title;
        subject += " : ";
        subject += encodeURIComponent(this._chart.getOpt("header","ESP"));
        this._chart._mail.href = "mailto:?subject=" + subject + "&body=" + encodeURIComponent(this._chart.getUrl());

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

            if (this._chart._closeContainer != null)
            {
                this._chart._closeContainer.style.visibility = "visible";
            }

            this._chart._playPauseContainer.style.visibility = "visible";

            this._chart.info();
        }

        if (this._chart._share != null)
        {
            this._chart._share.style.visibility = "visible";
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

            if (this._chart._closeContainer != null)
            {
                this._chart._closeContainer.style.visibility = "hidden";
            }

            this._chart._playPauseContainer.style.visibility = "hidden";
        }

        if (this._chart._share != null)
        {
            this._chart._share.style.visibility = "hidden";
        }
    }

    function
    Chart(visuals,container,datasource,options)
    {
        Options.call(this,options);

        this._visuals = visuals;
        this._datasource = datasource;
        this._container = container;
        this._id = tools.guid();
        this._layout = {};
        this._layout["autosize"] = true;
        this._layout["font"] = this._visuals.font;
        this._layout["xaxis"] = {automargin:true,showline:true};
        this._layout["yaxis"] = {automargin:true,showline:true};

        var margin = this.getOpt("margin",20);
        this._layout["margin"] = {l:margin,r:margin,b:margin,t:margin};

        var range;

        if ((range = this.getOpt("xrange")) != null)
        {
            this._layout["xaxis"]["range"] = range;
        }

        if ((range = this.getOpt("yrange")) != null)
        {
            this._layout["yaxis"]["range"] = range;
        }

        Object.defineProperty(this,"id", {
            get() {
                return(this._id);
            }
        });

        Object.defineProperty(this,"type", {
            get() {
                return(this.getType());
            }
        });

        Object.defineProperty(this,"container", {
            get() {
                var container = ((typeof(this._container) == "string") ? document.getElementById(this._container) : this._container);
                return(container);
            }
        });

        Object.defineProperty(this,"content", {
            get() {
                return(this._content);
            }
        });

        Object.defineProperty(this,"header",{
            get() {
                return(this.getOpt("header"));
            },

            set(value) {
                this.setOpt("header",value);
            }
        });

        if (this.getType() != "wrapper")
        {
            this.container.innerHTML = "";
        }

        this._div = document.createElement("div");
        this._div.className = "visual"; 

        this._header = document.createElement("div");
        this._header._chart = this;
        this._header.className = "visualHeader"; 
        this._header.style.overflow = "hidden";
        var table = document.createElement("table");
        table.style.width = "100%";
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.className = "headerText";
        table.appendChild(tr);
        tr.appendChild(td);
        this._text = td;
        this._header.appendChild(table);

        this._navigation = null;
        this._playPauseContainer = null;
        this._filterContainer = null;
        this._closeContainer = null;
        this._share = null;

        if (this.getType() != "wrapper")
        {
            tr.appendChild(td = document.createElement("td"));
            td.className = "icons";

            if (this._datasource != null && this._datasource.isArray() == false)
            {
                this._navigation = document.createElement("span");
                this._navigation.className = "navigation";
                this._navigation.style.visibility = "hidden";
                this._navigation.style.display = "none";
                td.appendChild(this._navigation);
            }

            if (this.getOpt("enable_filter",false))
            {
                this._filterContainer = document.createElement("span");
                this._filterContainer.className = "filter";
                this._filterContainer.style.visibility = "hidden";
                td.appendChild(this._filterContainer);
            }

            this._playPauseContainer = document.createElement("span");
            this._playPauseContainer.className = "playPause";
            this._playPauseContainer.style.visibility = "hidden";
            td.appendChild(this._playPauseContainer);

            this._share = document.createElement("span");
            this._share.className = "share";
            this._share.style.visibility = "hidden";
            td.appendChild(this._share);

            if (this.getOpt("enable_close",false))
            {
                this._closeContainer = document.createElement("span");
                this._closeContainer.className = "close";
                this._closeContainer.style.visibility = "hidden";
                td.appendChild(this._closeContainer);
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

            this._playPause = document.createElement("a");
            this._playPause._chart = this;
            this._playPause.innerHTML = "&#xf4f4;";
            this._playPause.className = "icon";
            this._playPause.href = "#";
            this._playPause.addEventListener("click",playPause);
            this._playPauseContainer.appendChild(this._playPause);

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

            if (this._closeContainer != null)
            {
                this._close = document.createElement("a");
                this._close._chart = this;
                this._close.innerHTML = "&#xf10c;"
                this._close.className = "icon";
                this._close.href = "#";
                this._close.addEventListener("click",closeChart);
                this._closeContainer.appendChild(this._close);
            }

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

            this._header.addEventListener("mouseover",over);
            this._header.addEventListener("mouseout",out);
        }

        this._content = document.createElement("div");
        this._content._chart = this;
        this._content.className = "visualContent"; 
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

        Object.defineProperty(this,"isInitialized", {
            get() {
                return(this._initialized);
            },

            set(value) {
                this._initialized = value;
            }
        });

        this._defaults = {responsive:true,displayModeBar:false};

        if (this.getOpt("show_header",true) == false)
        {
            this._header.style.display = "none";
        }
    }

    Chart.prototype = Object.create(Options.prototype);
    Chart.prototype.constructor = Chart;

    Chart.prototype.getType =
    function()
    {
        return("");
    }

    Chart.prototype.usesConnection =
    function(connection)
    {
        var code = false;

        if (this._datasource != null)
        {
            code = (this._datasource._api == connection);
        }

        return(code);
    }

    Chart.prototype.close =
    function()
    {
        this.container.innerHTML = "";
    }

    Chart.prototype.getUrl =
    function()
    {
        var url = "/esp-connect/html/visual.html";
        if (this._datasource != null)
        {
            url += "?server=" + this._datasource._api.httpurl;
            url += "&datasource=" + this._datasource;
        }
        else if (this.hasOwnProperty("_connection") && this._connection != null)
        {
            url += "?server=" + this._connection.url;
        }
        url += "&visual=" + this.type;

        var opts = this.getOpts();
        var o;

        for (var name in opts)
        {
            o = opts[name];
            url += "&";
            url += this.addToUrl(o,name);
        }

        var a = document.createElement("a");
        a.href = url;

        return(a.toString());
    }

    Chart.prototype.addToUrl =
    function(o,name,json)
    {
        var s = "";

        if (name != null)
        {
            if (json)
            {
                s += "\"" + name + "\"";
                s += ":";
            }
            else
            {
                s += name;
                s += "=";
            }
        }

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

                s += this.addToUrl(item);

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

                s += this.addToUrl(o[y],y,true);

                i++;
            }
            s += "}";
        }
        else
        {
            tmp = o.toString();
            tmp = tmp.replace("#","%23");
            if (json)
            {
                s += "\"" + tmp + "\"";
            }
            else
            {
                s += tmp;
            }
        }

        return(s);
    }

    Chart.prototype.getBorderSize =
    function()
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

    Chart.prototype.sizeContent =
    function()
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

    Chart.prototype.getVerticalPadding =
    function()
    {
        var padding = this._header.offsetHeight;
        return(padding);
    }

    Chart.prototype.size =
    function(name)
    {
    }

    Chart.prototype.refresh =
    function()
    {
        this.draw();
    }

    Chart.prototype.hideToolbar =
    function()
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
    }

    Chart.prototype.info =
    function()
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

            this._playPause.innerHTML = this._datasource._paused ? "&#xf513;" : "&#xf4f4;";
        }

        this.setHeader();
    }

    Chart.prototype.filterChanged =
    function()
    {
    }

    Chart.prototype.isCtrl =
    function(e)
    {
        return(_windows ? e.ctrlKey : e.metaKey);
    }

    Chart.prototype.clicked =
    function(data)
    {
        var indices = [];

        for (var i = 0; i < 1; i++)
        {
            indices.push(data.points[i].pointNumber);
        }

        this._datasource.toggleSelectedIndices(indices,this.isCtrl(data.event) == false);
    }

    Chart.prototype.selected =
    function(data)
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

    Chart.prototype.setHandlers =
    function()
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
            this._handlers = true;
        }
    }

    Chart.prototype.setHeader =
    function(header)
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

            filter = this._datasource.getOpt("filter");

            if (filter != null)
            {
                header += "<br>";
                header += filter;
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

    Chart.prototype.getValues =
    function(name)
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

    Chart.prototype.remove =
    function(name)
    {
        if (window.Plotly != null)
        {
            Plotly.purge(this._container);
        }
        this._div.innerHTML = "";
    }

    function
    Controller()
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
    };

    var _controller = new Controller();

    return(Chart);
});
