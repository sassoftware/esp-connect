/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";
import {uitools} from "./uitools.js";
import {Chart} from "./chart.js";
import {Viewers} from "./viewers.js";
import {Maps} from "./maps.js";
import {Colors} from "./colors.js";
import {dialogs} from "./dialogs.js";
import {SimpleTable} from "./simpletable.js";

var _dataHeader = "_data://";

class Visuals extends Options
{
    constructor(api,options)
    {
        super(options);
        this._mobile = uitools.isMobile();
        this._api = api;
        this._viewers = new Viewers();
        this._maps = new Maps();
        this._visuals = [];
        this._delegates = [];

        this._languages = null;
        this._modelDivs = {};

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

        var style = window.getComputedStyle(document.body);
        var font = style.getPropertyValue("font-family");

        //this._fontFamily = (font != null) ? font : "Verdana";
        this._fontFamily = (font != null) ? font : "Arial, Helvetica, sans-serif";

        Object.defineProperty(this,"fontFamily", {
            get() {
                return(this._fontFamily);
            }
        });

        this._titleStyle = new Options({fontsize:"14pt",font_family:this.fontFamily});
        this._font = this.getOpt("font",{family:this.fontFamily,size:(this._mobile ? 30 : 14)});
        this._titleFont = this.getOpt("title_font",{family:this.fontFamily,size:18});
        this._selectedFont = this.getOpt("selected_font","font-family:" + this.fontFamily + ";font-size:1.2rem;font-weight:normal;font-style:italic");

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

    isMobile()
    {
        return(this._mobile);
    }

    isChartType(type)
    {
        return(this._types.includes(type));
    }

    createChart(type,container,datasource,options)
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

    createBarChart(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new BarChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createLineChart(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new LineChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createTimeSeries(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new TimeSeries(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createPieChart(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new PieChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createRadarChart(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new RadarChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createPolarChart(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new PolarChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createBubbleChart(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new BubbleChart(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createGauge(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new Gauge(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createCompass(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new Compass(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createMap(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = this._maps.createMap(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createTable(container,datasource,options)
    {
        datasource.addDelegate(this);
        var chart = new Table(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createImageViewer(container,datasource,options)
    {
        if (datasource != null)
        {
            datasource.addDelegate(this);
        }
        var chart = new ImageViewer(this,container,datasource,options);
        this._visuals.push(chart);
        return(chart);
    }

    createSimpleTable(container,options,delegate)
    {
        var chart = new SimpleTable(container,options,delegate);
        this._visuals.push(chart);
        return(chart);
    }

    createWrapper(container,options)
    {
        var chart = new Wrapper(this,container,options);
        this._visuals.push(chart);
        return(chart);
    }

    createModelViewer(container,connection,options)
    {
        var chart = this._viewers.createModelViewer(this,container,connection,options);
        this._visuals.push(chart);
        return(chart);
    }

    createLogViewer(container,connection,options)
    {
        var chart = this._viewers.createLogViewer(this,container,connection,options);
        this._visuals.push(chart);
        return(chart);
    }

    showModel(connection,options)
    {
        if (options.hasOwnProperty("width") == false)
        {
            options["width"] = "80%";
        }
        if (options.hasOwnProperty("height") == false)
        {
            options["height"] = "80%";
        }
        var div = (this._modelDivs.hasOwnProperty(connection.url)) ? this._modelDivs[connection.url] : null;
        var viewer = null;

        if (div == null)
        {
            div = document.createElement("div");
            viewer = this.createModelViewer(div,connection,options);
            this._modelDivs[connection.url] = div;

            div._viewer = viewer;
        }
        else
        {
            viewer = div._viewer;
        }

        dialogs.showDivDialog(div,options);

        this._api.size();
    }

    addDelegate(delegate)
    {
        tools.addTo(this._delegates,delegate);
    }

    getById(id)
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

    closed(connection)
    {
        if (this.getOpt("clear_on_close",true))
        {
            this.clear(connection);
        }
    }

    clear(connection)
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

    createGradientColors(options)
    {
        return(this._colors.createGradientColors(options));
    }

    getSizes(values,minSize,maxSize)
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

    hideToolbars()
    {
        this._visuals.forEach(v =>
        {
            v.hideToolbar();
        });
    }

    formatTitle(text,id)
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

    getColorAt(index)
    {
        return(this._colors.get(index));
    }

    getColors(index)
    {
        return(this._colors.colors);
    }

    getTimeString(value,format)
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
            //text = date.toISOString();
            text = "";
            text += "<nobr>";
            text += date.toLocaleDateString(this.languages);
            text += " ";
            text += date.toLocaleTimeString(this.languages);
            text += "</nobr>";
        }

        return(text);
    }

    getDateString(value,format)
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

    refresh()
    {
        this._visuals.forEach(function(visual)
        {
            visual.refresh();
        });
    }

    dataChanged(datasource,data,clear)
    {
        this._visuals.forEach(function(visual)
        {
            if (visual._datasource == datasource)
            {
                if (visual.isSchemaReady)
                {
                    visual.draw(data,clear);
                }
            }
        });
    }

    infoChanged(datasource)
    {
        this._visuals.forEach(function(visual)
        {
            if (visual._datasource == datasource)
            {
                visual.info();
            }
        });
    }

    schemaReady(api,datasource)
    {
        this._visuals.forEach(function(visual)
        {
            if (visual._datasource == datasource)
            {
                visual.schemaReady(visual._datasource.schema);
                visual.draw();
            }
        });
    }

    filterChanged(datasource)
    {
        this._visuals.forEach(function(visual)
        {
            if (visual._datasource == datasource)
            {
                visual.filterChanged();
            }
        });
    }

    selectionChanged(datasource)
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

    size()
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

    getChartTextSize(text)
    {
        return(this.getTextSize(text,this._font.family,this._font.size));
    }

    getTextSize(text,fontname,fontsize)
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

    addObjects(image,options,delegate)
    {
        var data = image._data;

        if (data == null)
        {
            return;
        }

        var opts = new Options(options);
        var canvas = image._canvas;
        var div = image._div;
        var searchtext = null;
        var scale = opts.getOpt("scale",1);

        if (opts.getOpt("search",false))
        {
            s = opts.getOpt("searchtext","");

            if (Array.isArray(s))
            {
                searchtext = s;
            }
            else if (s.length > 0)
            {
                searchtext = [s];
            }
        }

        var lineWidth = image._opts.getOpt("line_width",2);

        image._context.fillStyle = image._opts.getOpt("text_color","black");
        image._context.strokeStyle = image._opts.getOpt("rect_color","green");
        image._context.lineWidth = lineWidth;
        image._context.font = image._font;
        image._context.textAlign = "center";
        image._context.textBaseline = "middle";

        var coordsType = data.hasOwnProperty("coords_type") ? data["coords_type"] : "";

        if (coordsType == "coco")
        {
            var nobjects = parseInt(data["n_objects"]);

            if (nobjects == 0)
            {
                return;
            }

            var minscore = opts.getOpt("min_score",0);
            var rects = opts.getOpt("rects",true);
            var coords = data["coords"];
            var scores = data["scores"];
            var labels = data["labels"].split(",");
            var index = 0;
            var score;
            var text;
            var x1;
            var y1;
            var x2;
            var y2;

            for (var i = 0; i < nobjects; i++)
            {
                text = labels[i];

                text = text.trim();

                if (searchtext != null)
                {
                    for (var j = 0; j < searchtext.length; j++)
                    {
                        if (text.indexOf(searchtext[j]) != -1)
                        {
                            break;
                        }
                    }

                    if (j == searchtext.length)
                    {
                        continue;
                    }
                }

                score = scores[i] * 100;

                if (minscore > 0 && score < minscore)
                {
                    continue;
                }

                text += " " + parseInt(scores[i] * 100) + "%";

                x1 = coords[index++];
                y1 = coords[index++];
                x2 = coords[index++];
                y2 = coords[index++];

                var border = rects ? lineWidth : 0;

                x1 = parseInt(image.offsetWidth * x1);
                y1 = parseInt(image.offsetHeight * y1);
                x2 = parseInt(image.offsetWidth * x2);
                y2 = parseInt(image.offsetHeight * y2);

                if (rects)
                {
                    image._context.beginPath();
                    image._context.moveTo(x1,y1);
                    image._context.lineTo(x2,y1);
                    image._context.lineTo(x2,y2);
                    image._context.lineTo(x1,y2);
                    image._context.lineTo(x1,y1);
                    image._context.closePath();
                    image._context.stroke();
                }

                image._context.fillText(text,x1,y1);

                if (delegate != null)
                {
                    delegate.objectFound({name:text,x:x1,y:y1,width:x2 - x1,height:y2 - y1});
                }
            }
        }
        else if (data.hasOwnProperty("_nObjects_"))
        {
            var rects = opts.getOpt("rects",true);
            var nobjects = parseInt(data["_nObjects_"]);
            var text;
            var x;
            var y;
            var w;
            var h;

            for (var i = 0; i < nobjects; i++)
            {
                s = "_Object" + i + "_";

                if ((text = data[s]) == null)
                {
                    continue;
                }

                text = text.trim();

                if (searchtext != null)
                {
                    for (var j = 0; j < searchtext.length; j++)
                    {
                        if (text.indexOf(searchtext[j]) != -1)
                        {
                            break;
                        }
                    }

                    if (j == searchtext.length)
                    {
                        continue;
                    }
                }

                s = "_Object" + i + "_x";
                x = parseInt(image.offsetWidth * parseFloat(data[s]));
                s = "_Object" + i + "_y";
                y = parseInt(image.offsetHeight * parseFloat(data[s]));
                s = "_Object" + i + "_width";
                w = parseInt(image.offsetWidth * parseFloat(data[s])) - (lineWidth * 2);
                s = "_Object" + i + "_height";
                h = parseInt(image.offsetHeight * parseFloat(data[s])) - (lineWidth * 2);

                x = x - (w / 2);
                y = y - (h / 2);

                if (rects)
                {
                    image._context.strokeRect(x,y,w,h);
                }

                image._context.fillText(text,x + (w / 2),y + (h / 2));

                if (delegate != null)
                {
                    delegate.objectFound({name:text,x:x,y:y,width:w,height:h});
                }
            }
        }
        else if (data.hasOwnProperty("n_objects"))
        {
            var nobjects = parseInt(data["n_objects"]);

            if (nobjects == 0)
            {
                return;
            }

            var minscore = opts.getOpt("min_score",0);
            var rects = opts.getOpt("rects",true);
            var coords = data["coords"];
            var scores = data["scores"];
            var labels = data["labels"].split(",");
            var index = 0;
            var score;
            var text;
            var x;
            var y;
            var w;
            var h;

            for (var i = 0; i < nobjects; i++)
            {
                text = labels[i];

                text = text.trim();

                if (searchtext != null)
                {
                    for (var j = 0; j < searchtext.length; j++)
                    {
                        if (text.indexOf(searchtext[j]) != -1)
                        {
                            break;
                        }
                    }

                    if (j == searchtext.length)
                    {
                        continue;
                    }
                }

                score = scores[i] * 100;

                if (minscore > 0 && score < minscore)
                {
                    continue;
                }

                text += " " + parseInt(scores[i] * 100) + "%";

                x = coords[index++];
                y = coords[index++];
                w = coords[index++];
                h = coords[index++];

                var border = rects ? lineWidth : 0;

                x = parseInt(image.offsetWidth * x);
                y = parseInt(image.offsetHeight * y);
                w = parseInt(image.offsetWidth * w);
                h = parseInt(image.offsetHeight * h);

                if (rects)
                {
                    image._context.strokeRect(x - (w / 2),y - (h / 2),w,h);
                }

                image._context.fillText(text,x,y);

                if (delegate != null)
                {
                    delegate.objectFound({name:text,x:x,y:y,width:w,height:h});
                }
            }
        }
        else if (data.hasOwnProperty("objCount"))
        {
            var ratioX = image.width / image.naturalWidth;
            var ratioY = image.height / image.naturalHeight;
            var nobjects = parseInt(data["objCount"]);
            var text;
            var x;
            var y;
            var s;

            for (var i = 0; i < nobjects; i++)
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

        if (data.hasOwnProperty("lines_coords"))
        {
            var color = image._opts.getOpt("line_color","white");
            image._context.strokeStyle = color;

            var coords = data["lines_coords"];
            var x1;
            var y1;
            var x2;
            var y2;

            for (var i = 0; i < coords.length; i += 4)
            {
                /*
                x1 = coords[i] * scale;
                y1 = coords[i + 1] * scale;
                x2 = coords[i + 2] * scale;
                y2 = coords[i + 3] * scale;
                */

                x1 = coords[i] * image.offsetWidth;
                y1 = coords[i + 1] * image.offsetHeight;
                x2 = coords[i + 2] * image.offsetWidth;
                y2 = coords[i + 3] * image.offsetHeight;

                image._context.beginPath();
                image._context.moveTo(x1,y1);
                image._context.lineTo(x2,y2);
                image._context.closePath();
                image._context.stroke();
            }
        }

        if (data.hasOwnProperty("points_coords"))
        {
            var color = image._opts.getOpt("point_color","white");
            image._context.strokeStyle = color;

            var radius = image._opts.getOpt("radius",10);
            var coords = data["points_coords"];
            var x;
            var y;

            for (var i = 0; i < coords.length; i += 2)
            {
                x = coords[i] * image.offsetWidth;
                y = coords[i + 1] * image.offsetHeight;
                image._context.beginPath();
                image._context.ellipse(x,y,radius,radius,Math.PI / 4,0,2 * Math.PI);
                image._context.closePath();
                image._context.stroke();
            }
        }
    }

    editFilter(delegate)
    {
        if (tools.supports(delegate,"setFilter") == false || tools.supports(delegate,"getFilter") == false)
        {
            throw "The delegate must implement the getFilter and setFilter methods";
        }

        var o = {
            ok:function(dialog) {
                var value = dialog.getValue("filter","");
                delegate.setFilter(value);
                dialog.pop();
            }
        };

        var form = [];
        form.push({name:"filter",label:"Filter",value:delegate.getFilter()});
        dialogs.showDialog({title:"Set Filter",delegate:o,label_width:"50px",form:form});
    }
}

class BarChart extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
        if (this.getOpt("stacked"))
        {
            this._layout["barmode"] = "stack";
        }
    }

    getType()
    {
        return("bar");
    }

    createChild(container,options)
    {
        return(new BarChart(this._visuals,container,this._datasource,options));
    }

    draw()
    {
        if (this.isInitialized == false)
        {
            try
            {
                Plotly.newPlot(this._id,[],this._layout,this._defaults);
                this.isInitialized = true;
            }
            catch(e)
            {
                return;
            }
        }

        var xValues = this.getValues("x");
        var yValues = this.getValues("y");

        if (xValues.length == 0)
        {
            xValues = this._datasource.getKeyFieldNames();
        }

        var values = this._datasource.getValuesBy(xValues,yValues,this.keyfilter);

        if (values == null)
        {
            return;
        }

        if (xValues.length > 1 && this._parent == null && this.getOpt("enable_children",true))
        {
            var field = xValues[0];
            var keyValues = values["keyvalues"][field];
            var child;

            keyValues.forEach((kv) => {
                if ((child = this.getChild(kv)) == null)
                {
                    child = this.addChild(kv);
                    child.keyfilter = {};
                    child.keyfilter[field] = kv;
                    child.header = kv;
                }

                child.draw();
            });

            return;
        }

        var orientation = this.getOpt("orientation","vertical");
        var data = [];
        var o;

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
                        options["gradient"] = this.getOpt("gradient");
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

            for (var item of items)
            {
                try
                {
                    colors.push(get_color(item));
                }
                catch (e)
                {
                    console.log(e);
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

        var index = 0;
        var spread = (colors == null) ? this._visuals._colors.getSpread(yValues.length) : null;

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
            marker["color"] = (spread != null) ? spread[index] : colors;
            marker["line"] = lines;
            o["marker"] = marker;
            index++;
            data.push(o);
        }

        this._layout["hovermode"] = this.getOpt("hover_mode","closest");
        this._layout["hoverlabel"] = this.getOpt("hover_style");

        Plotly.react(this._content,data,this._layout);

        this.setHandlers();
        this.setHeader();
    }
}

class LineChart extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
    }

    getType()
    {
        return("line");
    }

    createChild(container,options)
    {
        return(new LineChart(this._visuals,container,this._datasource,options));
    }

    draw()
    {
        if (this.isInitialized == false)
        {
            Plotly.newPlot(this._id,[],this._layout,this._defaults);
            this.isInitialized = true;
        }

        var xValues = this.getValues("x");
        var yValues = this.getValues("y");

        if (xValues.length == 0)
        {
            xValues = this._datasource.getKeyFieldNames();
        }

        var values = this._datasource.getValuesBy(xValues,yValues,this.keyfilter);

        if (values == null)
        {
            return;
        }

        if (xValues.length > 1 && this._parent == null && this.getOpt("enable_children",true))
        {
            var field = xValues[0];
            var keyValues = values["keyvalues"][field];
            var child;

            keyValues.forEach((kv) => {
                if ((child = this.getChild(kv)) == null)
                {
                    child = this.addChild(kv);
                    child.keyfilter = {};
                    child.keyfilter[field] = kv;
                    child.header = kv;
                }

                child.draw();
            });

            return;
        }

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

        {
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

        Plotly.react(this._content,data,this._layout);

        this.setHeader();
        this.setHandlers();
    }
}

class TimeSeries extends LineChart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);

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

    getType()
    {
        return("timeseries");
    }

    fired()
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

    draw()
    {
        var x = this.getValues("time");
        var y = this.getValues("y");
        var values = this._datasource.getValuesBy(x,y);
        this.render(values,y);
    }

    render(values,y)
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
        else if (this.hasOpt("line_shape"))
        {
            line["shape"] = this.getOpt("line_shape");
        }

        var colors = this.getOpt("colors");

        if (colors == null)
        {
            colors = this._visuals.colors.colors;
        }

        var showMarkers = this.getOpt("show_markers",false);
        var showText = this.getOpt("show_text",false);
        var mode = "lines";
        var textfont = {family:this._visuals.fontFamily,size:30};

        if (showMarkers)
        {
            mode += "+markers";
        }

        if (showText)
        {
            mode += "+text";
        }

        y.forEach((v) => {
            var o = {};
            o["x"] = values["keys"];
            o["y"] = values["values"][v];
            o["type"] = "scatter";
            o["line"] = line;
            o["mode"] = mode;
            if (showText)
            {
                o["text"] = o["y"];
            }
            o["name"] = v;
            if (this.getOpt("fill",false))
            {
                o["fill"] = "tonexty";
            }
            o["textfont"] = textfont;
            o["hoverlabel"] = this.getOpt("hoverstyle");
            o["marker"] = {color:colors[index]};index++;
            data.push(o);
        });

        this._layout["xaxis"].tickfont = this.getOpt("tick_style");
        this._layout["yaxis"].tickfont = this.getOpt("tick_style");
        this._layout["hovermode"] = this.getOpt("hover_mode","closest");
        this._layout["hoverlabel"] = this.getOpt("hover_style");

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
}

class PieChart extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
    }

    getType()
    {
        return("pie");
    }

    draw()
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
}

class RadarChart extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
    }

    getType()
    {
        return("radar");
    }

    draw()
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
}

class PolarChart extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
    }

    getType()
    {
        return("polar");
    }

    draw()
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
}

class BubbleChart extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
    }

    getType()
    {
        return("bubble");
    }

    draw()
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
                            options["gradient"] = this.getOpt("gradient");
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
}

class Compass extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);

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

    getType()
    {
        return("compass");
    }

    init()
    {
        this._initialized = true;
    }

    draw(data,clear)
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

                var value = parseFloat(o[field]);
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
}

class CompassEntry extends Options
{
    constructor(compass,options)
    {
        super(options);

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

    init()
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
        var fontsize;
        var label;
        var text;

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
            label = {text:"<b>" + headings[i] + "</b>",x:x,y:y,showarrow:false,font:{family:this._compass._visuals.fontFamily,size:fontsize,color:textcolor},textangle:textangle};
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

    draw()
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

    setHeader()
    {
        var s = this.getOpt("title");

        if (s != null)
        {
            var heading = parseInt(this._heading);
            var tmp = "" + heading;
            tmp = tmp.padStart(3,"0");
            var title = s + " (" + tmp + ")";
            title = this._compass._visuals.formatTitle(title);
            this._header.innerHTML = title;
        }
    }
}

class Table extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
        this._table = document.createElement("table");
        this._table.cellSpacing = 0;
        this._table.cellPadding = 0;
        this._table.style.margin = 0;
        this._table.style.position = "relative";
        this._table.className = "visualTable";
        this._content.appendChild(this._table);
        this.size();
    }

    getType()
    {
        return("table");
    }

    size()
    {
        if (this._table != null)
        {
            this._table.style.width = this._content.clientWidth + "px";
        }
    }

    draw(data,clear)
    {
        this.clear();

        var values = this.getTableValues();
        var fields = [];
        var field;
        var type;
        var tr;
        var th;

        for (var v of values)
        {
            if ((field = this._datasource.schema.getField(v)) != null)
            {
                fields.push(field);
            }
        }

        if (fields.length == 0)
        {
            fields = this._datasource.schema.getFields();
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

            type = field.getOpt("type","");

            if (type == "int" || type == "float")
            {
                th.style.textAlign = "right";
            }
            th.innerHTML = field.getOpt("name");
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
                    options["gradient"] = this.getOpt("gradient");
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

                name = field.getOpt("name");

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

                esptype = field.getOpt("espType");
                type = field.getOpt("type");

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
                    if (field.getOpt("isKey",false) == false)
                    {
                        var    num = new Number(text);
                        text = num.toLocaleString();
                        td.style.textAlign = "right";
                    }
                }

                if (text != null && type == "blob")
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
                    img._font = this.getOpt("imagefont","18px " + this._visuals.fontFamily);
                    img.onload = this.addObjects;

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

        tr.className = tr.className + " last";

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

    addObjects()
    {
        this._table._visuals.addObjects(this);
    }

    clicked(e)
    {
        if (e.currentTarget.hasOwnProperty("context"))
        {
            var index = e.currentTarget["context"].index;
            this._datasource.toggleSelectedIndices([index],this.isCtrl(e) == false);
        }
    }

    clear()
    {
        while (this._table.rows.length > 0)
        {
            this._table.deleteRow(this._table.rows[0]);
        }
    }

    getTableValues()
    {
        var values = this.getValues("values");

        if (values.length == 0)
        {
            if (this._datasource.schema.size > 0)
            {
                for (var f of this._datasource.schema.getKeyFields())
                {
                    values.push(f.getOpt("name"));
                }

                for (var f of this._datasource.schema.getColumnFields())
                {
                    values.push(f.getOpt("name"));
                }
            }
        }

        return(values);
    }
}

class Gauge extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);

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
    }

    getType()
    {
        return("gauge");
    }

    init()
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
                var gopts = new Options(this.getOpt("gradient"));
                var color = this._visuals._colors.getColor(gopts.getOpt("color","lightest"));
                var delta = gopts.getOpt("delta",20);

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

    draw(data,clear)
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

                var value = parseFloat(o[field]);
                entry.value = value;
            }
        }

        if (this.hasOpt("gradient"))
        {
            var gopts = new Options(this.getOpt("gradient"));
            var entries = [];
            var values = [];

            for (var key in this._entries)
            {
                entry = this._entries[key];
                entries.push(entry);
                values.push(entry.value);
            }

            var opts = {gradient:this.getOpt("gradient")};

            const   colors = this._visuals._colors.createColors(values,opts);

            for (var i = 0; i < entries.length; i++)
            {
                entries[i].setOpt("bg",colors[i]);
            }
        }

        for (var key in this._entries)
        {
            entry = this._entries[key];
            this._entries[key].draw();
        }
    }
}

class GaugeEntry extends Options
{
    constructor(gauge,options)
    {
        super(options);

        this._gauge = gauge;

        this._div = document.createElement("div");
        this._div.style.margin = "auto";
        this._div.style.padding = "10px";

        this._container = document.createElement("div");
        this._container.style.padding = this._gauge.getOpt("padding","10px");
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

                if (this._gauge.getOpt("integer",false))
                {
                    num = parseInt(value);
                }
                else
                {
                    num = parseFloat(value);
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

    init()
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

        if (this._gauge.hasOpt("plotly"))
        {
            const    options = this._gauge.getOpt("plotly");

            for (var x in options)
            {
                this._data[x] = options[x];
            }
        }

        if (this._gauge.hasOpt("gauge"))
        {
            const   options = this._gauge.getOpt("gauge");

            for (var x in options)
            {
                this._data.gauge[x] = options[x];
            }
        }

        this._initialized = true;

        Plotly.newPlot(this._container,[this._data],this._layout,this._gauge._defaults);
    }

    draw()
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

        if (this.hasOpt("bg"))
        {
            const   color = this.getOpt("bg");
            const   luma = this._gauge._visuals._colors.getLuma(color);

            this._layout.paper_bgcolor = color;

            tools.build(this._data,["number","font"]);

            if (luma < 170)
            {
                this._data.title.font.color = "white";
                this._data.number.font.color = "white";
            }
            else
            {
                this._data.title.font.color = "black";
                this._data.number.font.color = "black";
            }
        }

        Plotly.react(this._container,[this._data],this._layout);
    }
}

class ImageViewer extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
        this._viewerDiv = document.createElement("div");
        this._canvas = document.createElement("canvas");
        this._context = this._canvas.getContext("2d");
        this._canvas.style.position = "absolute";
        this._canvas.style.left = 0;
        this._canvas.style.top = 0;
        this._canvas.style.zIndex = "5000";
        this._canvas.style.border = this.getOpt("image_border","0");
        this._viewerDiv.style.position = "relative";
        this._viewerDiv.style.margin = "auto";
        this._viewerDiv.style.padding = 0;
        this._image = new Image();
        this._image._viewer = this;
        this._image._canvas = this;
        this._image._context = this._context;
        this._image._div = this._viewerDiv;
        this._image._opts = this;
        this._image._font = this.getOpt("imagefont","1rem " + this._visuals.fontFamily);
        this._image.style.position = "absolute";
        this._viewerDiv.appendChild(this._image);
        this._viewerDiv.appendChild(this._canvas);
        this._content.appendChild(this._viewerDiv);
        this._image.onload = this.loaded;
        this._field = this.getOpt("image");
        this._objectDelegate = null;
        this._data = null;

        Object.defineProperty(this,"image",{
            get() {
                return(this._image);
            },
            set(value) {
                this._data = value;

                if (this._data != null && this._data.hasOwnProperty(this._field))
                {
                    this._image._data = this._data;
                    var imagedata = this._data[this._field];
                    this._image.src = "data:application/octet-stream;base64," + imagedata;
                }
            }
        });
        Object.defineProperty(this,"objectDelegate",{
            get() {
                return(this._objectDelegate);
            },
            set(value) {
                if (tools.supports(value,"objectFound") == false)
                {
                    throw "The delegate must implement the objectFound methods";
                }
                this._objectDelegate = value;
            }
        });
        this.size();
    }

    getType()
    {
        return("imageviewer");
    }

    loaded()
    {
        this._viewer.drawImage();
    }

    draw(data,clear)
    {
        if (data != null && data.length > 0)
        {
            this.image = data[data.length - 1];
        }
    }

    drawImage()
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
            if (this.getOpt("objects",true))
            {
                this._visuals.addObjects(this._image,this.getOpts(),this._objectDelegate);
            }

            this.drawn(this._data,this._context);
        }
    }

    drawn(data,context)
    {
    }

    size()
    {
        if (this._viewerDiv != null)
        {
            this._viewerDiv.style.width = this._content.clientWidth + "px";
            this._viewerDiv.style.height = this._content.clientHeight + "px";
            this.drawImage();
        }
    }
}

class Wrapper extends Chart
{
    constructor(visuals,container,options)
    {
        var opts = new Options(options);
        opts.setOpt("append_chart",false);

        super(visuals,container,null,opts.toString());

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

        Object.defineProperty(this,"element",{
            get() {
                return(this._wrapper);
            }
        });
    }

    getType()
    {
        return("wrapper");
    }

    remove()
    {
    }

    sizeContent()
    {
        if (this.getOpt("size_to_content",false))
        {
        }
        else
        {
            Chart.prototype.sizeContent.call(this);
        }
    }

    draw()
    {
    }
}

export {Visuals};
