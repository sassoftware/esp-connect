/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

define([
    "../connect/options",
    "../connect/tools",
    "./chart",
    "./viewers",
    "./maps",
    "./colors",
    "./dialogs",
    "./simpletable"
], function(Options,tools,Chart,Viewers,Maps,Colors,dialogs,SimpleTable)
{
    var _dataHeader = "_data://";

    function
    Visuals(options)
    {
        Options.call(this,options);
        this._viewers = new Viewers();
        this._maps = new Maps();
        this._visuals = [];
        this._delegates = [];

        this._languages = null;

        if (navigator.hasOwnProperty("language"))
        {
            this._languages = [navigator.language];
        }

        if (this._languages == null)
        {
            this._languages = navigator.languages;
        }

        this._dateformat = null;

        Object.defineProperty(this,"dateformat", {
            get() {
                return(this._dateformat);
            },
            set(value) {
                this._dateformat = value;
            }
        });

        if (this.hasOpt("theme"))
        {
            this._colors = new Colors({theme:this.getOpt("theme")});
        }
        else if (this.hasOpt("colors"))
        {
            this._colors = new Colors({colors:this.getOpt("colors")});
        }
        else
        {
            this._colors = new Colors();
        }

        this._titleStyle = new Options({fontsize:"14pt",font_family:"AvenirNextforSAS"});
        this._font = this.getOpt("font",{family:"AvenirNextforSAS",size:14});
        this._titleFont = this.getOpt("title_font",{family:"AvenirNextforSAS",size:18});
        //this._selectedFont = this.getOpt("selected_font","font-family:AvenirNextforSAS;font-size:12pt;font-weight:normal;font-style:italic;text-decoration:underline");
        this._selectedFont = this.getOpt("selected_font","font-family:AvenirNextforSAS;font-size:12pt;font-weight:normal;font-style:italic");

        this._span = null;

        Object.defineProperty(this,"languages", {
            get() {
                return(this._languages);
            }
        });

        Object.defineProperty(this,"colors", {
            get() {
                return(this._colors);
            }
        });

        Object.defineProperty(this,"font", {
            get() {
                return(this._font);
            }
        });

        Object.defineProperty(this,"titleFont", {
            get() {
                return(this._titleFont);
            }
        });

        Object.defineProperty(this,"selectedFont", {
            get() {
                return(this._selectedFont);
            }
        });

        Object.defineProperty(this,"selectedBorder", {
            get() {
                var color = this._colors.getColor(this.getOpt("selected_border_color","black"));
                var width = this.getOpt("selected_border_color","3");
                return({color:color,width:width});
            }
        });

        Object.defineProperty(this,"theme", {
            get() {
                return(this._colors);
            },
            set(value) {
                this._colors = new Colors({theme:value});
                this.refresh();
            }
        });

        this._types = ["bar","line","timeseries","pie","radar","polar","bubble","gauge","compass","map","table","imageviewer"];
    }

    Visuals.prototype = Object.create(Options.prototype);
    Visuals.prototype.constructor = Visuals;

    Visuals.prototype.isChartType =
    function(type)
    {
        return(this._types.includes(type));
    }

    Visuals.prototype.createChart =
    function(type,container,datasource,options)
    {
        var chart = null;

        if (type == "bar")
        {
            chart = this.createBarChart(container,datasource,options);
        }
        else if (type == "line")
        {
            chart = this.createLineChart(container,datasource,options);
        }
        else if (type == "timeseries")
        {
            chart = this.createTimeSeries(container,datasource,options);
        }
        else if (type == "pie")
        {
            chart = this.createPieChart(container,datasource,options);
        }
        else if (type == "radar")
        {
            chart = this.createRadarChart(container,datasource,options);
        }
        else if (type == "polar")
        {
            chart = this.createPolarChart(container,datasource,options);
        }
        else if (type == "bubble")
        {
            chart = this.createBubbleChart(container,datasource,options);
        }
        else if (type == "gauge")
        {
            chart = this.createGauge(container,datasource,options);
        }
        else if (type == "compass")
        {
            chart = this.createCompass(container,datasource,options);
        }
        else if (type == "map")
        {
            chart = this.createMap(container,datasource,options);
        }
        else if (type == "table")
        {
            chart = this.createTable(container,datasource,options);
        }
        else if (type == "imageviewer")
        {
            chart = this.createImageViewer(container,datasource,options);
        }

        return(chart);
    }

    Visuals.prototype.createBarChart =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new BarChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createLineChart =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new LineChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createTimeSeries =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new TimeSeries(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createPieChart =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new PieChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createRadarChart =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new RadarChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createPolarChart =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new PolarChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createBubbleChart =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new BubbleChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createGauge =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new Gauge(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createCompass =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new Compass(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createMap =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = this._maps.createMap(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createTable =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new Table(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createImageViewer =
    function(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new ImageViewer(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createSimpleTable =
    function(container,options,delegate)
    {
        var chart = new SimpleTable(container,options,delegate);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createWrapper =
    function(container,options)
    {
        var chart = new Wrapper(this,container,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createModelViewer =
    function(container,connection,options)
    {
        var chart = this._viewers.createModelViewer(this,container,connection,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.createLogViewer =
    function(container,connection,options)
    {
        var chart = this._viewers.createLogViewer(this,container,connection,options);
        this._visuals.push(chart);
        return(chart);
    }

    Visuals.prototype.addDelegate =
    function(delegate)
    {
        tools.addTo(this._delegates,delegate);
    }

    Visuals.prototype.getById =
    function(id)
    {
        var visual = null;

        for (var v of this._visuals)
        {
            if (v.id == id)
            {
                visual = v;
                break;
            }
        }

        return(visual);
    }

    Visuals.prototype.closed =
    function(connection)
    {
        this.clear(connection);
    }

    Visuals.prototype.clear =
    function(connection)
    {
        var i = 0;
        var v;

        while (i < this._visuals.length)
        {
            v = this._visuals[i];
 
            if (connection == null || tools.supports(v,"usesConnection") && v.usesConnection(connection))
            {
                if (tools.supports(v,"remove"))
                {
                    v.remove();
                }

                this._visuals.splice(i,1);
            }
            else
            {
                i++;
            }
        }
    }

    Visuals.prototype.createGradientColors =
    function(options)
    {
        return(this._colors.createGradientColors(options));
    }

    Visuals.prototype.getSizes =
    function(values,minSize,maxSize)
    {
        var min = Math.min.apply(Math,values);
        var max = Math.max.apply(Math,values);
        var range = tools.createRange(min,max,maxSize - minSize);
        var sizes = [];
        var s;

        values.forEach(value =>
        {
            s = range.index(value);
            if (s < minSize)
            {
                s = minSize;
            }
            else if (s > maxSize)
            {
                s = maxSize;
            }

            sizes.push(s);
        });

        return(sizes);
    }

    Visuals.prototype.hideToolbars =
    function()
    {
        this._visuals.forEach(v =>
        {
            v.hideToolbar();
        });
    }

    Visuals.prototype.formatTitle =
    function(text,id)
    {
        var content = "";

        if (text != null && text.length > 0)
        {
            content += "<div class='visualHeaderText'";
            if (id != null)
            {
                content += " id='" + id + "'";
            }

            content += " style='";

            var opts = this._titleStyle.getOpts();
            var i = 0;
            var v;
            var s;

            for (var key in opts)
            {
                v = opts[key];
                key = key.replace("_","-");
                if (i > 0)
                {
                    content += ";";
                }
                content += key + ":" + v;
                i++;
            }

            //content += ";text-align:center"
            content += "'>";
            content += text;
            content += "</div>";
        }

        return(content)
    }

    Visuals.prototype.getColorAt =
    function(index)
    {
        return(this._colors.get(index));
    }

    Visuals.prototype.getColors =
    function(index)
    {
        return(this._colors.colors);
    }

    Visuals.prototype.getTimeString =
    function(value,format)
    {
        var v = new Number(value) / 1000;
        var date = new Date(v);
        var text = null;
        if (this._dateformat != null)
        {
            text = "";
            /*
            text += date.toLocaleDateString(this.languages,this._dateformat);
            text += " ";
            text += date.toLocaleTimeString(this.languages,this._dateformat);
            */
            text += date.toLocaleDateString(this.languages);
            text += " ";
            text += date.toLocaleTimeString(this.languages);
        }
        else
        {
            text = date.toISOString();
        }

        return(text);
    }

    Visuals.prototype.getDateString =
    function(value,format)
    {
        var v = new Number(value) * 1000;
        var date = new Date(v);
        var text = null;
        if (this._dateformat != null)
        {
            text = "";
            text += date.toLocaleDateString(this.languages);
            text += " ";
            text += date.toLocaleTimeString(this.languages);
        }
        else
        {
            text = date.toISOString();
        }
        return(text);
    }

    Visuals.prototype.refresh =
    function()
    {
        this._visuals.forEach(function(visual)
        {
            visual.refresh();
        });
    }

    Visuals.prototype.dataChanged =
    function(datasource,data,clear)
    {
        this._visuals.forEach(function(visual)
        {
            if (visual._datasource == datasource)
            {
                visual.draw(data,clear);
            }
        });
    }

    Visuals.prototype.infoChanged =
    function(datasource)
    {
        this._visuals.forEach(function(visual)
        {
            if (visual._datasource == datasource)
            {
                visual.info();
            }
        });
    }

    Visuals.prototype.filterChanged =
    function(datasource)
    {
        this._visuals.forEach(function(visual)
        {
            if (visual._datasource == datasource)
            {
                visual.filterChanged();
            }
        });
    }

    Visuals.prototype.selectionChanged =
    function(datasource)
    {
        this._visuals.forEach(visual =>
        {
            if (visual._datasource == datasource)
            {
                visual.draw();
            }
        });

        this._delegates.forEach(d =>
        {
            if (tools.supports(d,"selectionChanged"))
            {
                d.selectionChanged(datasource);
            }
        });
    }

    Visuals.prototype.size =
    function()
    {
        this._visuals.forEach((v) => {
            v.sizeContent();

            if (v.isInitialized)
            {
                v.draw();
            }

            v.hideToolbar();
        });
    }

    Visuals.prototype.getChartTextSize =
    function(text)
    {
        return(this.getTextSize(text,this._font.family,this._font.size));
    }

    Visuals.prototype.getTextSize =
    function(text,fontname,fontsize)
    {
        if (this._span == null)
        {
            this._span = document.createElement("span");
            this._span.style.visibility = "hidden";
            this._span.style.position = "absolute"; 
            this._span.style.left = "10px"; 
            this._span.style.top = "10px"; 
            document.body.appendChild(this._span);
        }

        this._span.style.font = fontname + " " + fontsize;
        this._span.innerHTML = text;
        return({width:this._span.offsetWidth,height:this._span.offsetHeight});
    }

    Visuals.prototype.addImageText =
    function(image)
    {
        var data = image._data;

        if (data == null)
        {
            return;
        }

        var canvas = image._canvas;
        var div = image._div;

        image._context.fillStyle = image._opts.getOpt("image_text_color","black");
        /*
        image._context.textAlign = "right";
        image._context.textBaseline = "bottom";
        */
        image._context.font = image._font;

        if (data.hasOwnProperty("_nObjects_"))
        {
            var numObjects = parseInt(data["_nObjects_"]);
            var text;
            var x;
            var y;
            var s;

            for (var i = 0; i < numObjects; i++)
            {
                s = "_Object" + i + "_";
                text = data[s];
                text = text.trim();
                s = "_Object" + i + "_x";
                x = parseInt(image.offsetWidth * parseFloat(data[s]));
                s = "_Object" + i + "_y";
                y = parseInt(image.offsetHeight * parseFloat(data[s]));
                image._context.moveTo(0,0);
                image._context.fillText(text,x,y);
            }
        }
        else if (data.hasOwnProperty("objCount"))
        {
            var ratioX = image.width / image.naturalWidth;
            var ratioY = image.height / image.naturalHeight;
            var numObjects = parseInt(data["objCount"]);
            var text;
            var x;
            var y;
            var s;

            for (var i = 0; i < numObjects; i++)
            {
                s = "Object" + i + "_label";
                text = data[s];
                text = text.trim();
                s = "Object" + i + "_center_x";
                x = parseInt(parseFloat(data[s]) * ratioX);
                s = "Object" + i + "_center_y";
                y = parseInt(parseFloat(data[s]) * ratioY);
                image._context.fillText(text,x,y);
            }
        }
    }

    Visuals.prototype.editFilter =
    function(delegate)
    {
        if (_filterDelegate != null)
        {
            return;
        }

        if (this._filterDialog == null)
        {
            this._filterDialog = document.createElement("div");
            this._filterDialog.id = "_editfilter_";
            this._filterDialog.className = "dialog";
            this._filterDialog.style.width = "60%";
            this._filterDialog.innerHTML = "<div class='dialogTop'>\
                    <div  class='dialogHeader'>\
                        <div class='dialogTitle'>\
                            <table style='width:100%;border:0' cellspacing='0' cellpadding='0'>\
                                <tr>\
                                    <td><div class='dialogTitle'>Edit Filter</div></td>\
                                </tr>\
                            </table>\
                        </div>\
                    </div>\
                    <div class='dialogContent'>\
                        <table border='0' style='width:100%;height:100%' cellspacing='0' cellpadding='0'>\
                            <tr>\
                                <td class='dialogLabel'>Filter:</td>\
                            </tr>\
                            <tr>\
                                <td class='dialogValue'><input id='_filtertext_' type='text' style='width:90%'></input><a class='icon dialogTitle' href='javascript:_clearFilter_()'>&#xf10c;</a></td>\
                            </tr>\
                        </table>\
                    </div>\
                </div>\
                <div class='dialogButtons'>\
                    <table style='width:100%'>\
                        <tr>\
                            <td class='dialogButton'>\
                                <span><button class='ok' onclick='javascript:_setFilter_()'>Ok</button></span>\
                                <span><button class='cancel' onclick='javascript:_cancelFilterEdit_()'>Cancel</button></span>\
                            </td>\
                        </tr>\
                    </table>\
                </div>";

            document.body.appendChild(this._filterDialog);
        }

        _filterDelegate = delegate;

        document.getElementById("_filtertext_").value = _filterDelegate.getFilter();

        dialogs.pushModal("_editfilter_");
    }

    /* Bar Chart */

    function
    BarChart(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
        if (this.getOpt("stacked"))
        {
            this._layout["barmode"] = "stack";
        }
    }

    BarChart.prototype = Object.create(Chart.prototype);
    BarChart.prototype.constructor = BarChart;

    BarChart.prototype.getType =
    function()
    {
        return("bar");
    }

    BarChart.prototype.draw =
    function()
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        var orientation = this.getOpt("orientation","vertical");
        var xValues = this.getValues("x");
        var yValues = this.getValues("y");
        var data = [];
        var index = 0;
        var o;

        if (xValues.length == 0)
        {
            xValues = this._datasource.getKeyFieldNames();
        }

        var values = this._datasource.getValuesBy(xValues,yValues);

        if (values == null)
        {
            return;
        }

        var items = this._datasource.getList();
        var markers = [];
        var lines = {color:[],width:[]};
        var color = this.getOpt("color");
        var colors = null;

        if (color != null)
        {
            if (items.length > 0)
            {
                var v = values["values"][color];

                if (v != null)
                {
                    var options = {};

                    if (this.hasOpt("gradient"))
                    {
                        options["gradient"] = this.getOpt("gradient","lightest");
                        options["gradient_end"] = this.getOpt("gradient_end",false);
                    }

                    colors = this._visuals._colors.createColors(v,options);
                }
            }
        }
        else if (this.hasOpt("get_color"))
        {
            var get_color = this.getOpt("get_color");
            var error = false;

            colors = [];

            for (item of items)
            {
                try
                {
                    colors.push(get_color(item));
                }
                catch (exc)
                {
                    error = true;
                    break;
                }
            }

            if (error)
            {
                colors = [];

                items.forEach(item =>
                {
                    colors.push(this._visuals._colors.middle);
                });
            }
        }

        var selectedBorder = this._visuals.selectedBorder;

        values["selected"].forEach(selected =>
        {
            if (selected)
            {
                lines["color"].push(selectedBorder.color);
                lines["width"].push(selectedBorder.width);
            }
            else
            {
                lines["color"].push("black");
                lines["width"].push(0);
            }
        });

        for (var y of yValues)
        {
            o = {};
            if (orientation == "horizontal")
            {
                o["y"] = values["keys"];
                o["x"] = values["values"][y];
                o["orientation"] = "h";
            }
            else
            {
                o["x"] = values["keys"];
                o["y"] = values["values"][y];
                o["orientation"] = "v";
            }
            o["name"] = y;
            o["type"] = "bar";

            var marker = {};
            marker["color"] = colors;
            marker["line"] = lines;
            o["marker"] = marker;
            index++;
            data.push(o);
        }

        Plotly.react(this._content,data,this._layout);

        this.setHandlers();
        this.setHeader();
    }

    /* End Bar Chart */

    /* Line Chart */

    function
    LineChart(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
    }

    LineChart.prototype = Object.create(Chart.prototype);
    LineChart.prototype.constructor = LineChart;

    LineChart.prototype.getType =
    function()
    {
        return("line");
    }

    LineChart.prototype.draw =
    function()
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        if (this._datasource.schema.size == 0)
        {
            return;
        }

        var xValues = this.getValues("x");
        var yValues = this.getValues("y");
        var width = this.getOpt("line_width",2);
        var data = [];
        var line = {};
        var index = 0;
        var o;

        line["width"] = width;

        if (this.getOpt("curved",false))
        {
            line["shape"] = "spline";
        }

        var colors = this.getOpt("colors");

        if (colors == null)
        {
            colors = this._visuals.colors.colors;
        }

        if (xValues.length > 0)
        {
            var values = this._datasource.getValuesBy(xValues,yValues);
            var o;

            yValues.forEach((v) => {
                o = {};
                o["x"] = values["keys"];
                o["y"] = values["values"][v];
                o["type"] = "scatter";
                o["line"] = line;
                o["mode"] = "lines";
                o["name"] = v;
                if (this.getOpt("fill",false))
                {
                    o["fill"] = "tonexty";
                }
                o["marker"] = {color:colors[index]};index++;
                data.push(o);
            });
        }
        else
        {
            var x = this._datasource.getKeyValues();

            yValues.forEach((y) => {
                o = {};
                o["x"] = x;
                o["y"] = this._datasource.getValues(y);
                o["type"] = "scatter";
                o["line"] = line;
                o["mode"] = "lines";
                o["name"] = y;
                if (this.getOpt("fill",false))
                {
                    o["fill"] = "tonexty";
                }
                o["marker"] = {color:colors[index]};index++;
                data.push(o);
            });
        }

        //console.log(tools.stringify(data));
        Plotly.react(this._content,data,this._layout);

        this.setHeader();
        this.setHandlers();
    }

    /* End Line Chart */

    /* Time Series */

    function
    TimeSeries(visuals,container,datasource,options)
    {
        LineChart.call(this,visuals,container,datasource,options);

        if (this.hasOpt("time") == false)
        {
            throw("must specify time field for a TimeSeries")
        }

        this._rendered = 0;
        this._value = {};

        this._continuous = this.getOpt("continuous",0);

        if (this._continuous > 0)
        {
            var ts = this;
            setTimeout(function(){ts.fired()},this._continuous);
        }
    }

    TimeSeries.prototype = Object.create(LineChart.prototype);
    TimeSeries.prototype.constructor = TimeSeries;

    TimeSeries.prototype.getType =
    function()
    {
        return("timeseries");
    }

    TimeSeries.prototype.fired =
    function()
    {
        var current = new Date().getTime();

        if ((current - this._rendered) > this._continuous)
        {
            var x = this.getValues("time");
            var y = this.getValues("y");
            var values = this._datasource.getValuesBy(x,y);
            var date = new Date();
            values["keys"].push(this._value["time"]);
            for (var n in this._value["values"])
            {
                values["values"][n].push(this._value["values"][n]);
            }
            this.render(values,y);
        }

        this._continuous = this.getOpt("continuous",0);

        if (this._continuous > 0)
        {
            var ts = this;
            setTimeout(function(){ts.fired()},this._continuous);
        }
    }

    TimeSeries.prototype.draw =
    function()
    {
        var x = this.getValues("time");
        var y = this.getValues("y");
        var values = this._datasource.getValuesBy(x,y);
        this.render(values,y);
    }

    TimeSeries.prototype.render =
    function(values,y)
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        if (this._datasource.schema.size == 0)
        {
            return;
        }

        var width = this.getOpt("line_width",2);
        var data = [];
        var line = {};
        var index = 0;

        line["width"] = width;

        if (this.getOpt("curved",false))
        {
            line["shape"] = "spline";
        }

        var colors = this.getOpt("colors");

        if (colors == null)
        {
            colors = this._visuals.colors.colors;
        }

        y.forEach((v) => {
            var o = {};
            o["x"] = values["keys"];
            o["y"] = values["values"][v];
            o["type"] = "scatter";
            o["line"] = line;
            o["mode"] = "lines";
            o["name"] = v;
            if (this.getOpt("fill",false))
            {
                o["fill"] = "tonexty";
            }
            o["marker"] = {color:colors[index]};index++;
            data.push(o);
        });

        Plotly.react(this._content,data,this._layout);

        this.setHeader();
        this.setHandlers();

        var len = values["keys"].length;
        var last = (len > 0) ? values["keys"][len - 1] : null;
        var date = new Date();

        this._value =  {};
        this._value["time"] = date;
        this._value["values"] = {};

        if (last != null)
        {
            date.setTime(last.getTime() + this._continuous);
            y.forEach((f) => {
                this._value["values"][f] = values["values"][f][len - 1];
            });
        }
        else
        {
            y.forEach((f) => {
                this._value["values"][f] = 0;
            });
        }

        this._rendered = new Date().getTime();
    }

    /* End Time Series */

    /* Pie Chart */

    function
    PieChart(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
    }

    PieChart.prototype = Object.create(Chart.prototype);
    PieChart.prototype.constructor = PieChart;

    PieChart.prototype.getType =
    function()
    {
        return("pie");
    }

    PieChart.prototype.draw =
    function()
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        var label = null;
        var value = null;
        var a = this.getValues("labels");

        if (a.length == 0)
        {
            try
            {
                a.push(this._datasource.getKeyFieldNames());
            }
            catch (exc)
            {
            }
        }

        if (a.length > 0)
        {
            label = a[0];
        }

        a = this.getValues("value");

        if (a.length > 0)
        {
            value = a[0];
        }

        if (label == null || value == null)
        {
            return;
        }

        var data = [];

        try
        {
            var items = this._datasource.getList();
            var selectedBorder = this._visuals.selectedBorder;
            var labels = [];
            var values = [];
            var pull = [];
            var width = [];

            for (var item of items)
            {
                if (item.hasOwnProperty(label) && item.hasOwnProperty(value))
                {
                    labels.push(item[label]);
                    values.push(item[value]);

                    if (this._datasource.isSelected(item))
                    {
                        pull.push(.1);
                        width.push(selectedBorder.width);
                    }
                    else
                    {
                        pull.push(0);
                        width.push(0);
                    }
                }
            }

            var o = {};
            o["labels"] = labels;
            o["values"] = values;
            o["pull"] = pull;
            o["marker"] = {color:this._visuals.getColors(),line:{width:width}};
            o["type"] = "pie";
            o["name"] = this.id;

            data.push(o);

            Plotly.react(this._content,data,this._layout);
            this.setHandlers();
            this.setHeader();
        }
        catch (exc)
        {
        }
    }

    /* End Pie Chart */

    /* Radar Chart */

    function
    RadarChart(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
    }

    RadarChart.prototype = Object.create(Chart.prototype);
    RadarChart.prototype.constructor = RadarChart;

    RadarChart.prototype.getType =
    function()
    {
        return("radar");
    }

    RadarChart.prototype.draw =
    function()
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        var label = null;
        var value = null;
        var a = this.getValues("labels");

        if (a.length == 0)
        {
            try
            {
                a.push(this._datasource.getKeyFieldNames());
            }
            catch (exc)
            {
            }
        }

        if (a.length > 0)
        {
            label = a[0];
        }

        var values = this.getValues("values");

        if (label == null || values.length == 0)
        {
            return;
        }

        try
        {
            var data = [];
            var colors = this.getOpt("colors");

            if (colors == null)
            {
                colors = this._visuals.colors.colors;
            }

            var i = 0;

            values.forEach((value) => {
                var o = {};
                o["_value"] = value;
                o["theta"] = [];
                o["r"] = [];
                o["type"] = "scatterpolar";
                o["fill"] = "toself";
                o["name"] = value;
                o["fillcolor"] = colors[i];
                o["opacity"] = .5;
                data.push(o);
                i++;
            });

            var items = this._datasource.getList();
            var selectedBorder = this._visuals.selectedBorder;

            items.forEach((item) => {
                data.forEach((d) => {
                    d.theta.push(item.hasOwnProperty(label) ? item[label] : "");
                    d.r.push(item.hasOwnProperty(d._value) ? item[d._value] : 0);
                });
            });

            if (items.length > 0)
            {
                data.forEach((d) => {
                    d.theta.push(d.theta[0]);
                    d.r.push(d.r[0]);
                });
            }

            this._layout.polar = {
                radialaxis: {
                  visible:true
                },
                showlegend:false
            }

            Plotly.react(this._content,data,this._layout);
            this.setHandlers();
            this.setHeader();
        }
        catch (exc)
        {
            console.log(exc);
        }
    }

    /* End Radar Chart */

    /* Polar Chart */

    function
    PolarChart(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
    }

    PolarChart.prototype = Object.create(Chart.prototype);
    PolarChart.prototype.constructor = PolarChart;

    PolarChart.prototype.getType =
    function()
    {
        return("polar");
    }

    PolarChart.prototype.draw =
    function()
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        var values = this.getValues("values");

        if (values.length == 0)
        {
            return;
        }

        var f;
        var isArray = false;

        values.forEach((value) => {
            if ((f = this._datasource.schema.getField(value)) != null)
            {
                if (f.isArray)
                {
                    isArray = true;
                }
            }
        });

        if (values.length > 1 && isArray)
        {
            throw("you can only plot a single array field");
        }

        var data = [];
        var items = this._datasource.getList();
        var colors = this.getOpt("colors");

        if (colors == null)
        {
            colors = this._visuals.colors.colors;
        }

        var theta = this.getOpt("theta",[[0,360]]);
        var angles = [];
        theta.forEach((t) => {
            for (var i = t[0]; i < 359 && i < t[1]; i++)
            {
                angles.push(i);
            }
        });

        if (isArray)
        {
            items.forEach((item) => {
                var o = {};
                var r = [];

                if (item.hasOwnProperty(values[0]))
                {
                    a = item[values[0]];

                    angles.forEach((angle) => {
                        r.push((angle < a.length) ? a[angle] : 0);
                    });
                }

                o["theta"] = angles;
                o["r"] = r;
                o["type"] = "scatterpolar";
                o["name"] = values[0];
                o["fillcolor"] = null;
                o["mode"] = "lines";
                o["opacity"] = .5;
                data.push(o);
            });
        }
        else
        {
            var i = 0;

            values.forEach((value) => {
                var o = {};
                o["_value"] = value;
                o["theta"] = [];
                o["r"] = [];
                o["type"] = "scatterpolar";
                o["fill"] = "toself";
                o["name"] = value;
                o["fillcolor"] = colors[i];
                o["opacity"] = .5;
                data.push(o);
                i++;
            });

            var selectedBorder = this._visuals.selectedBorder;

            items.forEach((item) => {
                data.forEach((d) => {
                    d.theta.push(item.hasOwnProperty(label) ? item[label] : "");
                    d.r.push(item.hasOwnProperty(d._value) ? item[d._value] : 0);
                });
            });

            if (items.length > 0)
            {
                data.forEach((d) => {
                    d.theta.push(d.theta[0]);
                    d.r.push(d.r[0]);
                });
            }

            this._layout.polar = {
                radialaxis: {
                    type:"log"
                },
                showlegend:false
            }
        }

        var margin = 30;
        this._layout["margin"] = {l:margin,r:margin,b:margin,t:margin};

        Plotly.react(this._content,data,this._layout);
        this.setHandlers();
        this.setHeader();
    }

    /* End Polar Chart */

    /* Bubble Chart */

    function
    BubbleChart(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
    }

    BubbleChart.prototype = Object.create(Chart.prototype);
    BubbleChart.prototype.constructor = BubbleChart;

    BubbleChart.prototype.getType =
    function()
    {
        return("bubble");
    }

    BubbleChart.prototype.draw =
    function()
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        var data = [];

        var x = this.getValues("x");
        if (x.length == 0)
        {
            x = this._datasource.getKeyFieldNames();
        }
        var y = this.getValues("y");
        var size = this.getOpt("size");
        var color = this.getOpt("color");
        var selected = this._datasource.getSelectedIndices();

        var a = [];
        y.forEach(v => { a.push(v); });

        if (size != null)
        {
            if (a.includes(size) == false)
            {
                a.push(size);
            }
        }

        if (color != null)
        {
            if (a.includes(color) == false)
            {
                a.push(color);
            }
        }

        try
        {
            values = this._datasource.getValuesBy(x,a);
        }
        catch (exc)
        {
            console.log(exc);
            return;
        }

        var keys = values["keys"];

        if (keys.length == 0)
        {
            var o;
            for (var v of y)
            {
                o = {};
                o["x"] = [""];
                o["y"] = [0];
                o["name"] = v;
                data.push(o);
            }
            Plotly.react(this._content,data,this._layout);
            return;
        }

        var lines = {color:[],width:[]};
        var selectedBorder = this._visuals.selectedBorder;

        for (var i = 0; i < keys.length; i++)
        {
            if (selected.includes(i))
            {
                lines["color"].push(selectedBorder.color);
                lines["width"].push(selectedBorder.width);
            }
            else
            {
                lines["color"].push("black");
                lines["width"].push(0);
            }
        }

        var marker = {};
        var text = null;

        if (size != null || color != null)
        {
            text = [];

            keys.forEach(k => {text.push("")});

            if (size != null)
            {
                if (values["values"].hasOwnProperty(size))
                {
                    var v = values["values"][size];

                    if (v != null && v.length > 0)
                    {
                        var s = this.getOpt("sizes",[10,50]);
                        marker["size"] = this._visuals.getSizes(v,s[0],s[1]);
                        for (var i = 0; i < v.length; i++)
                        {
                            text[i] += size + "=" + v[i];
                        }
                    }
                }
            }

            if (color != null)
            {
                if (values["values"].hasOwnProperty(color))
                {
                    var v = values["values"][color];

                    if (v != null && v.length > 0)
                    {
                        var options = {};

                        if (this.hasOpt("gradient"))
                        {
                            options["gradient"] = this.getOpt("gradient","lightest");
                        }

                        var colors = this._visuals._colors.createColors(v,options);
                        marker["color"] = colors;

                        for (var i = 0; i < v.length; i++)
                        {
                            if (size != null)
                            {
                                text[i] += "</br>";
                            }

                            if (color != size)
                            {
                                text[i] += color + "=" + v[i];
                            }
                        }
                    }
                }
            }
        }

        data = [];

        marker["line"] = lines;

        y.forEach(v =>
        {
            var o = {};
            o["mode"] = "markers";
            o["marker"] = marker;
            o["x"] = keys;
            o["y"] = values["values"][v];
            o["name"] = v;
            o["text"] = text;
            data.push(o);
        });

        Plotly.react(this._content,data,this._layout);
        this.setHandlers();
        this.setHeader();
    }

    /* End Bubble Chart */

    /* Compass */

    function
    Compass(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);

        this._content.style.display = "flex";
        this._content.style.flexWrap = "wrap";

        this._values = [13,12,13,12,13,12,13,12];
        this._labels = ["N","NE","E","SE","S","SW","W","NW"];
        this._colors = null;
        this._entries = {};

        var useTheme = this.getOpt("use_theme",false);
        var color = this.getOpt("color");

        this._outerColor = this.getOpt("outer_color",color);
        this._bgColor = this.getOpt("bg_color",color);

        if (this._outerColor == null)
        {
            if (useTheme)
            {
                this._outerColor = this._visuals.colors.middle;
            }
            else
            {
                this._outerColor = "#D0D3D4";
            }
        }

        if (this._bgColor == null)
        {
            if (useTheme)
            {
                this._bgColor = this._visuals.colors.lightest;
            }
            else
            {
                this._bgColor = "white";
            }
        }

        this._lightBg = this._visuals.colors.addAlpha(this._bgColor,.4);
        this._lightOuter = this._visuals.colors.addAlpha(this._outerColor,.4);

        this._needleColor = this.getOpt("needle_color","white");
        this._centerColor = this.getOpt("center_color",this._outerColor);
        this._lineWidth = this.getOpt("line_width",1);
    }

    Compass.prototype = Object.create(Chart.prototype);
    Compass.prototype.constructor = Compass;

    Compass.prototype.getType =
    function()
    {
        return("compass");
    }

    Compass.prototype.init =
    function()
    {
        this._initialized = true;
    }

    Compass.prototype.draw =
    function(data,clear)
    {
        if (this._initialized == false)
        {
            this.init();
        }

        if (data == null || data.length == 0)
        {
            data = this._datasource.getList();
        }

        if (data == null)
        {
            return;
        }

        var field = this.getOpt("value");

        if (field == null)
        {
            return;
        }

        var items = null;
        var currentLength = this._entries.length;
        var entry;
        var key;

        if (clear)
        {
            for (key in this._entries)
            {
                entry = this._entries[key];
                this._content.removeChild(entry._div);
            }

            this._entries = {};
        }

        for (var o of data)
        {
            if (o.hasOwnProperty("@key") == false)
            {
                continue;
            }

            key = o["@key"]

            if (o.hasOwnProperty("@opcode") && o["@opcode"] == "delete")
            {
                entry = this._entries[key];
                this._content.removeChild(entry._div);
                delete this._entries[key];
            }
            else
            {
                if (this._entries.hasOwnProperty(key) == false)
                {
                    entry = new CompassEntry(this);
                    entry.setOpt("title",key);
                    this._entries[key] = entry;
                    this._content.appendChild(entry._div);
                }
                else
                {
                    entry = this._entries[key];
                }

                value = parseFloat(o[field]);
                entry._heading = value;
            }
        }

        for (var key in this._entries)
        {
            entry = this._entries[key];
            this._entries[key].draw();
        }

        this.setHeader();
    }

    function
    CompassEntry(compass,options)
    {
        Options.call(this,options);
        this._compass = compass;

        var size = this._compass.getOpt("size",300);

        this._div = document.createElement("div");
        this._div.style.margin = "auto";
        this._div.style.padding = "10px";

        this._inner = document.createElement("div");
        this._div.appendChild(this._inner);

        this._inner.style.border = this._compass.getOpt("border","1px solid #d8d8d8");

        this._header = document.createElement("div");
        this._header.className = "compassHeader";
        this._inner.appendChild(this._header);

        this._container = document.createElement("div");
        this._container.style.width = size + "px";
        this._container.style.height = size + "px";
        this._container.style.padding = "10px";
        this._inner.appendChild(this._container);

        this._layout = {};
        this._heading = 0;

        this._labels = [];

        this._data = [];

        this._initialized = false;
    }

    CompassEntry.prototype = Object.create(Options.prototype);
    CompassEntry.prototype.constructor = CompassEntry;

    CompassEntry.prototype.init =
    function()
    {
        var size = this._compass.getOpt("size",300)

        this._data = [];

        this._intervals = {values:this._compass._values,
            labels:this._compass._labels,
            marker:{colors:new Array(10).fill(this._compass._outerColor),line:{width:this._compass._lineWidth}},
            hole:this._compass.getOpt("compass_size",.90),
            sort:false,
            direction:"clockwise",
            showlegend:false,
            hoverinfo:"none",
            textposition:"outside",
            textposition:"bottom",
            textinfo:"none",
            type:"pie"};

        this._data.push(this._intervals);

        //var margin = this._compass.getOpt("margin",10);
        var margin = this._compass.getOpt("margin",this._compass._lineWidth);
        this._layout["margin"] = {l:margin,r:margin,b:margin,t:margin};

        var hole = this._intervals["hole"];
        var radius = hole / 2;
        var center = {x:.5,y:.5};

        var luma = this._compass._visuals.colors.getLuma(this._compass._bgColor);
        var textcolor = (luma < 170) ? "white" : "black";
        var textangle = 0;
        var angle = 0;
        var radians;
        var x;
        var y;
        var h;

        this._labels = [];
        //var headings = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
        var headings = ["N", "E", "S", "W"];

        for (var i = 0; i < headings.length; i++)
        {
            text = headings[i];

            if (angle == 135 || angle == 315)
            {
                h = (450 - angle - 3) % 360;
            }
            else
            {
                h = (450 - angle) % 360;
            }

            radians = h * (Math.PI / 180);

            fontsize = 16;
            length = (angle == 90 || angle == 270) ? radius - .12 : radius - .10;

            x = center["x"] + (length * Math.cos(radians))
            y = center["y"] + (length * Math.sin(radians))
            //label = {text:headings[i],x:x,y:y,showarrow:false,font:{family:"AvenirNextforSAS",size:fontsize,color:textcolor},textangle:textangle};
            label = {text:"<b>" + headings[i] + "</b>",x:x,y:y,showarrow:false,font:{family:"AvenirNextforSAS",size:fontsize,color:textcolor},textangle:textangle};
            this._labels.push(label);
            angle += (360 / headings.length);
            //textangle += (360 / headings.length);
        }

        textangle = 0;
        angle = 0;

        for (var i = 0; i < 8; i++)
        {
            if (angle == 135 || angle == 315)
            {
                h = (450 - angle - 2) % 360;
            }
            else
            {
                h = (450 - angle) % 360;
            }
            radians = h * (Math.PI / 180);
            if (i % 2 == 1)
            {
                length = radius + .05;
            }
            else
            {
                length = radius;
            }
            x = center["x"] + (length * Math.cos(radians));
            y = center["y"] + (length * Math.sin(radians));
            label = {text:angle,x:x,y:y,showarrow:false,font:{size:10},textangle:textangle}
            this._labels.push(label)
            angle += 45;
            textangle += 45;
        }

        h = (hole / 2) - .1;
        //this._innerCircle = {type:"circle",x0:center["x"] - h,y0:center["y"] - h,x1:center["x"] + h,y1:center["y"] + h,fillcolor:this._compass._bgColor,line:{width:this._compass._lineWidth}}
        this._innerCircle = {type:"circle",x0:center["x"] - h,y0:center["y"] - h,x1:center["x"] + h,y1:center["y"] + h,fillcolor:this._compass._bgColor,line:{width:1}}

        h = (hole / 2);
        this._outerCircle = {type:"circle",x0:center["x"] - h,y0:center["y"] - h,x1:center["x"] + h,y1:center["y"] + h,fillcolor:this._compass._lightBg,line:{width:0}}

        this._layout["annotations"] = this._labels;
        this._layout["shapes"] = [this._innerCircle];

        this._initialized == true;
    }

    CompassEntry.prototype.draw =
    function()
    {
        if (this._initialized == false)
        {
            this.init();
        }

        var heading = (450 - this._heading) % 360;
        var hole = this._intervals["hole"];
        var radius = hole / 2;

        var center = {x:.5,y:.5};

        var r = .05;

        // Heading Pointer

        var radians = heading * (Math.PI / 180);
        var length = radius - .20;

        var x = center["x"] + (length * Math.cos(radians));
        var y = center["y"] + (length * Math.sin(radians));

        radians = (heading - 75) * (Math.PI / 180);
        var x0 = center["x"] + (r * Math.cos(radians));
        var y0 = center["y"] + (r * Math.sin(radians));

        radians = (heading + 75) * (Math.PI / 180);
        var x1 = center["x"] + (r * Math.cos(radians));
        var y1 = center["y"] + (r * Math.sin(radians));

        var path = "";
        path += "M " + x0 + " " + y0;
        path += "L " + x + " " + y;
        path += "L " + x1 + " " + y1;

        var headingBase = {type:"path",path:path,fillcolor:"white",line:{width:this._compass._lineWidth}};
        //var headingPointer = {type:"path",path:path,fillcolor:this._compass._needleColor,line:{width:this._compass._lineWidth,layer:"above"}};
        var headingPointer = {type:"path",path:path,fillcolor:this._compass._needleColor,line:{width:1,layer:"above"}};

        // End Heading Pointer

        // Opposite Pointer

        radians = ((heading + 180) % 360) * (Math.PI / 180);

        length = radius - .30;

        x = center["x"] + (length * Math.cos(radians));
        y = center["y"] + (length * Math.sin(radians));

        radians = (heading - 75) * (Math.PI / 180);
        x0 = center["x"] + (r * Math.cos(radians));
        y0 = center["y"] + (r * Math.sin(radians));

        radians = (heading + 75) * (Math.PI / 180);
        x1 = center["x"] + (r * Math.cos(radians));
        y1 = center["y"] + (r * Math.sin(radians));

        path = "";
        path += "M " + x0 + " " + y0;
        path += "L " + x + " " + y;
        path += "L " + x1 + " " + y1;

        /*
        var reciprocalBase = {type:"path",path:path,fillcolor:"white",line:{width:1}};
        var reciprocalPointer = {type:"path",path:path,fillcolor:this._compass._bgColor,line:{width:1}};
        */
        var reciprocalPointer = {type:"path",path:path,fillcolor:"white",line:{width:1}};

        // End Reciprocal Pointer

        //var rr = r + .01;
        var rr = r + .005;
        //var needleCenterColor = this._compass.getOpt("needle_center_color",this._compass._outerColor);
        var needleCenterColor = this._compass.getOpt("needle_center_color",this._compass._lightOuter);
        var needleCenter = {type:"circle",x0:center["x"] - rr,y0:center["y"] - rr,x1:center["x"] + rr,y1:center["y"] + rr,fillcolor:"white",line:{width:1},layer:"above"};
        var needleTop = {type:"circle",x0:center["x"] - rr,y0:center["y"] - rr,x1:center["x"] + rr,y1:center["y"] + rr,fillcolor:needleCenterColor,line:{width:1},layer:"above"};
        //this._layout["shapes"] = [this._outerCircle,this._innerCircle,headingBase,headingPointer,reciprocalBase,reciprocalPointer,needleCenter,needleTop];
        this._layout["shapes"] = [this._outerCircle,this._innerCircle,headingBase,headingPointer,reciprocalPointer,needleCenter,needleTop];

        Plotly.react(this._container,this._data,this._layout,this._compass._defaults);

        this.setHeader();
    }

    CompassEntry.prototype.setHeader =
    function()
    {
        var s = this.getOpt("title");

        if (s != null)
        {
            var heading = parseInt(this._heading);
            var tmp = "" + heading;
            tmp = tmp.padStart(3,"0");
            title = s + " (" + tmp + ")";
            title = this._compass._visuals.formatTitle(title);
            this._header.innerHTML = title;
        }
    }

    /* End Compass */

    /* Table */

    function
    Table(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
        this._table = document.createElement("table");
        this._table.cellSpacing = 0;
        this._table.cellPadding = 0;
        this._table.style.margin = 0;
        this._table.style.position = "relative";
        this._table.className = "visualTable";
        this._content.appendChild(this._table);
        this.size();
    }

    Table.prototype = Object.create(Chart.prototype);
    Table.prototype.constructor = Table;

    Table.prototype.getType =
    function()
    {
        return("table");
    }

    Table.prototype.size =
    function()
    {
        if (this._table != null)
        {
            this._table.style.width = this._content.clientWidth + "px";
        }
    }

    Table.prototype.draw =
    function(data,clear)
    {
        this.clear();

        var values = this.getTableValues();
        var fields = [];
        var field;
        var tr;
        var th;

        for (var v of values)
        {
            if ((field = this._datasource.schema.getField(v)) != null)
            {
                fields.push(field);
            }
        }

        this._table.appendChild(tr = document.createElement("tr"));

        for (var i = 0; i < fields.length; i++)
        {
            field = fields[i];

            th = document.createElement("th");

            if (i == 0)
            {
                th.className = "first";
            }

            if (field.type == "int" || field.type == "float")
            {
                th.style.textAlign = "right";
            }
            th.innerHTML = field["name"];
            tr.appendChild(th);
        }

        var items = this._datasource.getList();

        if (items == null || items.length == 0)
        {
            return;
        }

        var imageWidth = this.getOpt("image_width");
        var imageHeight = this.getOpt("image_height");
        var color = this.getOpt("color");
        var colors = null;

        if (color != null && items.length > 0)
        {
            var values = this._datasource.getValues(color);

            if (values != null)
            {
                var options = {};

                if (this.hasOpt("gradient"))
                {
                    options["gradient"] = this.getOpt("gradient","lightest");
                    options["gradient_end"] = this.getOpt("gradient_end",false);
                }

                colors = this._visuals._colors.createColors(values,options);
            }
        }

        var links = this._datasource.getOpt("links");
        var images = this._datasource.getOpt("images");
        var draw = this.getOpt("draw_cell");
        var selectedFont = this._visuals.selectedFont;
        var firstSelected = null;
        var lastSelected = null;
        var visual = this;
        var image;
        var link;

        var text;
        var esptype;
        var selected;
        var style;
        var type;
        var name;
        var item;
        var td;

        var reversed = this.getOpt("reversed",false);
        var i = reversed ? (items.length - 1) : 0;

        var firstRow = true;
        var classname;

        for (;;)
        {
            item = items[i];

            style = "";

            this._table.appendChild(tr = document.createElement("tr"));

            if (firstRow)
            {
                classname = "first";
                firstRow = false;
            }
            else
            {
                classname = "";
            }

            if (selected = this._datasource.isSelected(item))
            {
                classname += " selected";
            }

            tr.className = classname;

            tr["context"] = {visual:this,index:i};
            tr.addEventListener("click",function(e){visual.clicked(e);});

            if (selected)
            {
                if (firstSelected == null)
                {
                    firstSelected = tr;
                }

                lastSelected = tr;
            }

            if (colors != null)
            {
                var c = colors[i];
                var luma = this._visuals._colors.getLuma(c);

                style += "background:" + c;

                if (luma < 170)
                {
                    style += ";color:white";
                }
                else
                {
                    style += ";color:black";
                }
            }

            if (selected)
            {
                if (style.length > 0)
                {
                    style += ";";
                }

                style += this._visuals.selectedFont;
            }

            if (style.length > 0)
            {
                tr.style = style;
            }

            for (var j = 0; j < fields.length; j++)
            {
                field = fields[j];

                tr.appendChild(td = document.createElement("td"));

                if (j == 0)
                {
                    td.className = "first";
                }

                name = field["name"];

                if (draw != null)
                {
                    try
                    {
                        if (draw(td,item,name))
                        {
                            continue;
                        }
                    }
                    catch (e)
                    {
                    }
                }

                image = null;

                if (images != null)
                {
                    if (images.includes(name))
                    {
                        if (item.hasOwnProperty(name))
                        {
                            var s = item[name];

                            if (s.length > 0)
                            {
                                image = "";
                                image += "<img src='" + s + "'";
                                if (imageWidth != null || imageHeight != null)
                                {
                                    image += " style=";
                                    if (imageWidth != null)
                                    {
                                        image += "width:" + imageWidth + "px";
                                    }
                                    if (imageHeight != null)
                                    {
                                        if (imageWidth != null)
                                        {
                                            image += ";";
                                        }
                                        image += "height:" + imageHeight + "px";
                                    }
                                }
                                image += " />";
                            }
                        }
                    }
                }

                link = null;

                if (links != null)
                {
                    if (links.hasOwnProperty(name))
                    {
                        var lf = links[name];
                        var s = "";

                        if (item.hasOwnProperty(lf))
                        {
                            s = item[lf];
                        }

                        if (s.length > 0)
                        {
                            link = "<a href='" + s + "' target='_blank'>";
                        }
                    }
                }

                text = item.hasOwnProperty(name) ? item[name] : "";

                esptype = field["espType"];
                type = field["type"];

                if (esptype == "date" || esptype == "datetime")
                {
                    text = this._visuals.getDateString(text);
                }
                else if (esptype == "stamp" || esptype == "timestamp")
                {
                    text = this._visuals.getTimeString(text);
                }
                else if (type == "int" || type == "float")
                {
                    if (field.isKey == false)
                    {
                        var    num = new Number(text);
                        text = num.toLocaleString();
                        td.style.textAlign = "right";
                    }
                }

                if (text != null && field.type == "blob")
                {
				    var	div = document.createElement("div");
                    var canvas = document.createElement("canvas");
                    canvas.style.position = "absolute";
                    canvas.style.left = 0;
                    canvas.style.top = 0;
                    canvas.style.zIndex = "5000";
				    var	img = new Image();
                    img._data = item;
                    img._table = this;
                    img._div = div;
                    img._canvas = canvas;
                    img._context = canvas.getContext("2d");
                    img._opts = this;
                    img._font = this.getOpt("imagefont","18px AvenirNextforSAS ");
                    img.onload = this.addImageText;

                    div.style.position = "relative";
                    div.style.margin = "auto";
                    div.style.padding = 0;
                    div.style.zIndex = "-1000";

				    div.appendChild(img);
				    div.appendChild(canvas);
				    td.appendChild(div);

                    if (imageWidth != null)
                    {
                        div.style.width = imageWidth + "px";
                        img.width = imageWidth;
                    }

                    if (imageHeight > 0)
                    {
                        div.style.height = imageHeight + "px";
                        img.height = imageHeight;
                        canvas.height = imageHeight;
                    }

				    img.src = "data:application/octet-stream;base64," + text;
                    td.style.textAlign = "center";
                }
                else if (image != null)
                {
                    td.style.textAlign = "center";
                    td.innerHTML = image;
                }
                else
                {
                    td.innerHTML = (link != null) ? (link + text + "</a>") : text;
                }
            }

            if (reversed)
            {
                if (i == 0)
                {
                    break;
                }

                i--;
            }
            else if (i == (items.length - 1))
            {
                break;
            }
            else
            {
                i++;
            }
        }

        tr.className = "last";

        var show = null;

        if (lastSelected != null)
        {
            show = lastSelected;
        }
        else if (this.getOpt("tail",false))
        {
            show = tr;
        }

        if (show != null)
        {
            if (show.offsetTop < this._content.scrollTop || show.offsetTop > (this._content.scrollTop + this._content.offsetHeight))
            {
                show.scrollIntoView(false);
            }
        }
    }

    Table.prototype.addImageText =
    function()
    {
        this._table._visuals.addImageText(this);
    }

    Table.prototype.clicked =
    function(e)
    {
        if (e.currentTarget.hasOwnProperty("context"))
        {
            var index = e.currentTarget["context"].index;
            this._datasource.toggleSelectedIndices([index],this.isCtrl(e) == false);
        }
    }

    Table.prototype.clear =
    function()
    {
        while (this._table.rows.length > 0)
        {
            this._table.deleteRow(this._table.rows[0]);
        }
    }

    Table.prototype.getTableValues =
    function()
    {
        var values = this.getValues("values");

        if (values.length == 0)
        {
            if (this._datasource.schema.size > 0)
            {
                for (var f of this._datasource.schema.getKeyFields())
                {
                    values.push(f["name"]);
                }

                for (var f of this._datasource.schema.getColumnFields())
                {
                    values.push(f["name"]);
                }
            }
        }

        return(values);
    }

    /* End Table */

    /* Gauge */

    function
    Gauge(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);

        this._content.style.display = "flex";
        this._content.style.flexWrap = "wrap";

        this._colors = null;
        this._segments = 0;
        this._entries = {};
        Object.defineProperty(this,"range", {
            get() {
                return(this._range);
            },
            set(value) {
                if (value[1] > value[0])
                {
                    this._range = value;
                    this.create();
                }
            }
        });

        this._range = this.getOpt("range",[0,100]);
        this._decimals = this.getOpt("decimals",true);
    }

    Gauge.prototype = Object.create(Chart.prototype);
    Gauge.prototype.constructor = Gauge;

    Gauge.prototype.getType =
    function()
    {
        return("gauge");
    }

    Gauge.prototype.init =
    function()
    {
        this._segments = this.getOpt("segments",3);

        this._colors = this.getOpt("colors");

        if (this._colors == null)
        {
            this._colors = [];

            if (this.hasOpt("color"))
            {
                var color = this.getOpt("color");

                for (var i = 0; i < this._segments; i++)
                {
                    this._colors.push(this._visuals._colors.darken(color,(i * 20)));
                }
            }
            else if (this.hasOpt("gradient"))
            {
                var color = this._visuals._colors.getColor(this.getOpt("gradient"));
                var delta = this.getOpt("gradient_delta",20);

                for (var i = 0; i < this._segments; i++)
                {
                    this._colors.push(this._visuals._colors.darken(color,i * delta));
                }
            }
            else
            {
                var colors = this._visuals._colors.getSpread(this._segments);

                for (var i = 0; i < this._segments; i++)
                {
                    this._colors.push(colors[i]);
                }
            }
        }

        this._intervals = tools.createRange(this._range[0],this._range[1],this._segments);
        this._initialized = true;
    }

    Gauge.prototype.draw =
    function(data,clear)
    {
        if (this._initialized == false)
        {
            this.init();
        }

        if (data == null || data.length == 0)
        {
            data = this._datasource.getList();
        }

        if (data == null)
        {
            return;
        }

        var field = this.getOpt("value");

        if (field == null)
        {
            return;
        }

        var items = null;
        var entry;
        var key;

        if (clear)
        {
            for (key in this._entries)
            {
                entry = this._entries[key];
                this._content.removeChild(entry._div);
            }

            this._entries = {};
        }

        for (var o of data)
        {
            if (o.hasOwnProperty("@key") == false)
            {
                continue;
            }

            key = o["@key"]

            if (o.hasOwnProperty("@opcode") && o["@opcode"] == "delete")
            {
                if (this._entries.hasOwnProperty(key))
                {
                    entry = this._entries[key];
                    this._content.removeChild(entry._div);
                    delete this._entries[key];
                }
            }
            else
            {
                if (this._entries.hasOwnProperty(key) == false)
                {
                    entry = new GaugeEntry(this);
                    entry.setOpt("title",key);
                    this._entries[key] = entry;
                    this._content.appendChild(entry._div);
                }
                else
                {
                    entry = this._entries[key];
                }

                value = parseFloat(o[field]);
                entry.value = value;
            }
        }

        for (var key in this._entries)
        {
            entry = this._entries[key];
            this._entries[key].draw();
        }
    }

    function
    GaugeEntry(gauge,options)
    {
        Options.call(this,options);

        this._gauge = gauge;

        this._div = document.createElement("div");
        this._div.style.margin = "auto";
        this._div.style.padding = "10px";

        this._container = document.createElement("div");
        this._container.style.padding = "10px";
        this._container.style.border = this._gauge.getOpt("border","1px solid #d8d8d8");
        this._div.appendChild(this._container);

        this._value = 0;
        this._layout = {};
        this._layout["autosize"] = true;
        this._layout["font"] = this._gauge._visuals.font;
        this._layout["xaxis"] = {automargin:true};
        this._layout["yaxis"] = {automargin:true};

        //var margin = this._gauge.getOpt("margin",30);
        var margin = this._gauge.getOpt("margin",5);
        this._layout["margin"] = {l:margin,r:margin,b:margin,t:margin};

        Object.defineProperty(this,"value",{
            get() {return(this._value);},
            set(value)
            {
                var num;

                if (this._gauge._decimals)
                {
                    num = parseFloat(value);
                }
                else
                {
                    num = parseInt(value);
                }

                if (this._data != null)
                {
                    this._data.delta = {reference:this._value};
                }

                this._value = num;
            }
        });

        this._initialized = false;
    }

    GaugeEntry.prototype = Object.create(Options.prototype);
    GaugeEntry.prototype.constructor = GaugeEntry;

    GaugeEntry.prototype.init =
    function()
    {
        this._data = {};
        this._data.type = "indicator";

        var mode = this._gauge.getOpt("mode","gauge+number");

        if (this._gauge.getOpt("delta",false))
        {
            mode += "+delta";
        }

        this._data.mode = mode;

        var range = this._gauge.getOpt("range");
        var gauge = {};
        var shape = this._gauge.getOpt("shape","gauge");

        gauge.axis = {range:range};

        if (this._gauge.getOpt("show_title",true))
        {
            var title = this.getOpt("title");

            if (title != null)
            {
                this._data.title = {text:title,font:this._gauge._visuals.titleFont,align:"left"};
            }
        }

        var defaultWidth = 300;
        var defaultHeight = 200;

        if (shape == "bullet")
        {
            gauge.shape = "bullet";
            gauge.axis.visible = false;

            defaultWidth = 400;
            defaultHeight = 150;
        }
        else
        {
            gauge.shape = "angular";
        }

        this._data["gauge"] = gauge;

        var steps = this._gauge._intervals.createSteps(this._gauge._colors);
        this._data["gauge"].steps = steps;

        var width = this._gauge.getOpt("width",defaultWidth);
        var height = this._gauge.getOpt("height",defaultHeight);

        this._layout["width"] = width;
        this._layout["height"] = height;

        this._data.gauge.bar = {color:this._gauge.getOpt("bar_color","rgba(0,0,0,.5)")};

        this._initialized = true;

        Plotly.newPlot(this._container,[this._data],this._layout,this._gauge._defaults);
    }

    GaugeEntry.prototype.draw =
    function()
    {
        if (this._initialized == false)
        {
            this.init();
        }

        if (this._gauge.getOpt("show_title",true))
        {
            var title = this.getOpt("title");

            if (title != null)
            {
                var size = this._gauge._visuals.getChartTextSize(title);

                if (this._gauge.getOpt("shape","") == "bullet")
                {
                    this._layout["margin"].l = parseFloat(size.width + 30);
                }
                else
                {
                    this._layout["margin"].t = parseFloat(size.height + 10);
                }
            }
        }

        this._data.value = this._value;

        Plotly.react(this._container,[this._data],this._layout);
    }

    /* End Gauge */

    /* Image */

    function
    ImageViewer(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);
        this._viewerDiv = document.createElement("div");
        this._canvas = document.createElement("canvas");
        this._context = this._canvas.getContext("2d");
        this._canvas.style.position = "absolute";
        this._canvas.style.left = 0;
        this._canvas.style.top = 0;
        this._canvas.style.zIndex = "5000";
        this._canvas.style.border = this.getOpt("image_border","10px solid #d8d8d8");
        this._viewerDiv.style.position = "relative";
        this._viewerDiv.style.margin = "auto";
        this._viewerDiv.style.padding = 0;
        this._image = new Image();
        this._image._viewer = this;
        this._image._canvas = this;
        this._image._context = this._context;
        this._image._div = this._viewerDiv;
        this._image._opts = this;
        this._image._font = this.getOpt("imagefont","18px AvenirNextforSAS ");
        this._image.style.position = "absolute";
        this._viewerDiv.appendChild(this._image);
        this._viewerDiv.appendChild(this._canvas);
        this._content.appendChild(this._viewerDiv);
        this._image.onload = this.loaded;
        this._data = null;
        this.size();
    }

    ImageViewer.prototype = Object.create(Chart.prototype);
    ImageViewer.prototype.constructor = ImageViewer;

    ImageViewer.prototype.getType =
    function()
    {
        return("imageviewer");
    }

    ImageViewer.prototype.loaded =
    function()
    {
        this._viewer.drawImage();
    }

    ImageViewer.prototype.draw =
    function(data,clear)
    {
        if (data != null && data.length > 0)
        {
            this._data = data[data.length - 1];
            var field = this.getOpt("image");

            if (this._data.hasOwnProperty(field))
            {
                this._image._data = this._data;
                var imagedata = this._data[field];
                this._image.src = "data:application/octet-stream;base64," + imagedata;
            }
        }
    }

    ImageViewer.prototype.drawImage =
    function()
    {
        this._context.clearRect(0,0,this._canvas.width,this._canvas.height);

        var width = this.getOpt("image_width",this._image.naturalWidth);
        var height = this.getOpt("image_height",this._image.naturalHeight);

        if (this.hasOpt("scale"))
        {
            var scale = this.getOpt("scale");
            width *= scale;
            height *= scale;
        }

        var	borders = tools.getBorders(this._canvas,true);

        this._image.style.width = width + "px";
        this._image.style.height = height + "px";
        this._canvas.width = width;
        this._canvas.height = height;

        var x = parseInt((this._content.offsetWidth / 2) - (width / 2));
        var y = parseInt((this._content.offsetHeight / 2) - (height / 2));

        this._canvas.style.left = x + "px";
        this._canvas.style.top = y + "px";

        this._image.style.left = (x + borders.left) + "px";
        this._image.style.top = (y + borders.top) + "px";

        if (this._data != null)
        {
            if (this.getOpt("annotations",true))
            {
                this._visuals.addImageText(this._image);
            }

            this.drawn(this._data,this._context);
        }
    }

    ImageViewer.prototype.drawn =
    function(data,context)
    {
    }

    ImageViewer.prototype.size =
    function()
    {
        if (this._viewerDiv != null)
        {
            this._viewerDiv.style.width = this._content.clientWidth + "px";
            this._viewerDiv.style.height = this._content.clientHeight + "px";
            this.drawImage();
        }
    }

    /* End Image */

    /* Wrapper */

    function
    Wrapper(visuals,container,options)
    {
        var opts = new Options(options);
        opts.setOpt("append_chart",false);

        Chart.call(this,visuals,container,null,opts.toString());

        this._wrapper = document.createElement("div");
        this._wrapper.style.margin = 0;
        this._wrapper.style.padding = 0;
        this._wrapper.appendChild(this._div);

        if (this.hasOpt("style"))
        {
            var style = this.getOpt("style");

            for (var x in style)
            {
                this._wrapper.style[x] = style[x];
            }
        }

        if (this.hasOpt("class"))
        {
            this._wrapper.className = this.getOpt("class");
        }
        else
        {
            this._wrapper.className = "box";
        }

        this._wrapped = this.container;
        var p = this._wrapped.parentNode;

        p.replaceChild(this._wrapper,this._wrapped);
        this._content.appendChild(this._wrapped);

        this._container = this._wrapper;

        this._content.style.display = "flex";
        this._content.style.flexWrap = "wrap";
        this._content.style.alignItems = "center";
        this._content.style.justifyContent = "center";

        this.sizeContent();
    }

    Wrapper.prototype = Object.create(Chart.prototype);
    Wrapper.prototype.constructor = Wrapper;

    Wrapper.prototype.getType =
    function()
    {
        return("wrapper");
    }

    Wrapper.prototype.sizeContent =
    function()
    {
        if (this.getOpt("size_to_content",false))
        {
        }
        else
        {
            Chart.prototype.sizeContent.call(this);
        }
    }

    Wrapper.prototype.draw =
    function()
    {
    }

    /* End Wrapper */

    var _filterDelegate = null;

    if (typeof window !== "undefined")
    {
        window._setFilter_ = 
        function()
        {
            if (_filterDelegate != null)
            {
                _filterDelegate.setFilter(document.getElementById("_filtertext_").value);
            }

            dialogs.popModal("_editfilter_");

            _filterDelegate = null;
        }

        window._cancelFilterEdit_ = 
        function()
        {
            dialogs.popModal("_editfilter_");
            _filterDelegate = null;
        }

        window._clearFilter_ = 
        function()
        {
            document.getElementById("_filtertext_").value = "";
            document.getElementById("_filtertext_").focus();
        }
    }

    return(Visuals);
});
