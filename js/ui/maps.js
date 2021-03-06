/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "../connect/options.js";
import {Chart} from "./chart.js";

var _interval = null;

function
mousedown(chart,info)
{
    var msecs = 50;

    if (info.name == "zoomin")
    {
        if (_interval == null)
        {
            _interval = setInterval(function(){chart.zoomIn()},msecs);
        }
    }
    else if (info.name == "zoomout")
    {
        if (_interval == null)
        {
            _interval = setInterval(function(){chart.zoomOut()},msecs);
        }
    }
}

function
mouseup(chart,info)
{
    if (_interval != null)
    {
        clearInterval(_interval);
        _interval = null;
    }
}

class Maps extends Options
{
    constructor(options)
    {
        super(options);
    }

    createMap(visuals,container,datasource,options)
    {
        var opts = new Options(options);
        var engine = opts.getOpt("engine","leaflet");
        var chart = null;

        if (opts.getOpt("allow_zoom",true))
        {
            var toolbar = opts.getOpt("toolbar");

            if (toolbar == null)
            {
                toolbar = [];
                opts.setOpt("toolbar",toolbar);
            }

            toolbar.push({name:"zoomin",text:"&#xf8e1;"});
            toolbar.push({name:"zoomout",text:"&#xf8e2;"});
        }

        if (engine == "plotly")
        {
            chart = new PlotlyMap(visuals,container,datasource,opts.getOpts());
        }
        else if (engine == "choropleth")
        {
            chart = new ChoroplethMap(visuals,container,datasource,opts.getOpts());
        }
        else
        {
            chart = new LeafletMap(visuals,container,datasource,opts.getOpts());
        }

        return(chart);
    }
}

class Map extends Chart
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
        this._lat = null;
        this._lon = null;
        this._interval = null;
    }

    init()
    {
        this._lat = this.getOpt("lat");

        if (this._lat == null)
        {
            throw("you must specify the lat property")
        }

        this._lon = this.getOpt("lon");

        if (this._lon == null)
        {
            throw("you must specify the lon property")
        }

        this._initialized = true;
    }

    getData()
    {
        if (this._datasource.schema == null)
        {
            return;
        }

        this._data = this._datasource.getList();

        if (this._data == null)
        {
            return(null);
        }

        var mapdata = {};
        mapdata.keys = [];
        mapdata.tooltips = this.getOpt("show_tooltips",true) ? [] : null;
        mapdata.colors = [];
        mapdata.lat = [];
        mapdata.lon = [];
        mapdata.sizes = [];
        mapdata.selected = [];

        var html = this.getOpt("html");
        mapdata.html = (html != null) ? [] : null;

        var keys = this.getValues("keys");
        var tooltips = (mapdata.tooltips != null) ? this.getValues("tooltip") : null;
        var tooltip;
        var value;
        var key;
        var s;

        if (keys.length == 0)
        {
            keys = ["@key"];
        }

        if ((value = this.getOpt("size")) != null)
        {
            if ((field = this._datasource.schema.getField(value)) != null)
            {
                var values = this._datasource.getValues(value);
                if (values != null && values.length > 0)
                {
                    var s = this.getOpt("sizes",[10,50]);
                    mapdata.sizes = this._visuals.getSizes(values,s[0],s[1]);
                }
            }
            else
            {
                this._data.forEach((item) => {mapdata.sizes.push(value);});
            }
        }
        else
        {
            this._data.forEach((item) => {mapdata.sizes.push(20)});
        }

        var field;

        if ((value = this.getOpt("color")) != null)
        {
            if ((field = this._datasource.schema.getField(value)) != null)
            {
                var values = this._datasource.getValues(value);

                if (values != null && values.length > 0)
                {
                    var options = {};

                    if (this.hasOpt("colors"))
                    {
                        options["colors"] = this.getOpt("colors");
                    }
                    else if (this.hasOpt("gradient"))
                    {
                        options["gradient"] = this.getOpt("gradient");
                    }

                    if (this.hasOpt("color_range"))
                    {
                        options["range"] = this.getOpt("color_range");
                    }

                    mapdata.colors = this._visuals._colors.createColors(values,options);
                }
            }
            else
            {
                var c = this._visuals._colors.getColor(value);
                this._data.forEach((item) => {mapdata.colors.push(c);});
            }
        }
        else
        {
            this._data.forEach((item) => {mapdata.colors.push("white");});
        }

        var index = 0;

        this._data.forEach((item) => {

            mapdata.selected.push(this._datasource.isSelected(item));

            key = "";

            for (var i = 0; i < keys.length; i++)
            {
                if (i > 0)
                {
                    key += ".";
                }

                s = keys[i];

                if (item.hasOwnProperty(s))
                {
                    key += item[s];
                }
            }

            mapdata.keys.push(key);

            tooltip = "";

            for (var i = 0; i < keys.length; i++)
            {
                if (i > 0)
                {
                    tooltip += ".";
                }

                s = keys[i];

                if (item.hasOwnProperty(s))
                {
                    tooltip += item[s];
                }
            }

            if (mapdata.tooltips != null)
            {
                for (var i = 0; i < tooltips.length; i++)
                {
                    tooltip += "<br>";

                    s = tooltips[i];

                    if (item.hasOwnProperty(s))
                    {
                        tooltip += s + "=" + item[s];
                    }
                }

                mapdata.tooltips.push(tooltip);
            }

            mapdata.lat.push((item.hasOwnProperty(this._lat)) ? item[this._lat] : null);
            mapdata.lon.push((item.hasOwnProperty(this._lon)) ? item[this._lon] : null);

            if (html != null)
            {
                mapdata.html.push(html(this,item,mapdata.colors[index],mapdata.sizes[index],mapdata.selected[index]));
            }

            index++;
        });

        return(mapdata);
    }

    toolbarMouseDown(opts)
    {
        var action = opts.getOpt("name","");
        var map = this;
        var msecs = 50;

        if (action == "zoomin")
        {
            if (this._interval == null)
            {
                this._interval = setInterval(function(){map.zoomIn()},msecs);
            }
        }
        else if (action == "zoomout")
        {
            if (this._interval == null)
            {
                this._interval = setInterval(function(){map.zoomOut()},msecs);
            }
        }
    }

    toolbarMouseUp(opts)
    {
        if (this._interval != null)
        {
            clearInterval(this._interval);
            this._interval = null;
        }
    }

    getZoomDelta()
    {
        return(1);
    }

    getZoom()
    {
        return(this.getOpt("zoom",10));
    }

    setZoom(value)
    {
        this.setOpt("zoom",value);
        this.draw();
    }

    zoomIn()
    {
        var current = this.getZoom();
        this.setZoom(current + this.getZoomDelta());
    }

    zoomOut()
    {
        var current = this.getZoom();
        this.setZoom(current - this.getZoomDelta());
    }

    getText(fields)
    {
        var text = "";
        var type;
        var f;
        var s;
        var v;

        for (var i = 0; i < fields.length; i++)
        {
            f = fields[i];

            if (i > 0)
            {
                text += "<br/>";
            }

            s = f["name"];
            v = value[s];
            type = f["espType"];

            if (type == "date" || type == "datetime")
            {
                v = this._visuals.getDateString(v);
            }
            else if (type == "stamp" || type == "timestamp")
            {
                v = this._visuals.getTimeString(v);
            }

            text += s + "=" + v;
        }

        return(text);
    }
}

class LeafletMap extends Map
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);

        if (window.L == null)
        {
            throw("you must include the leaflet javascript library");
        }

        this.sizeContent();

        const   showzoom = this.getOpt("show_zoom",false);

        this._map = new L.map(this._content,{zoom:this.getZoom(),zoomControl:showzoom,zoomSnap:.1,zoomDelta:this.getOpt("zoom_delta",.1)});

        this._markers = {};

        this._circles = [];
        this._polygons = [];

        var osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        var osmAttrib = "Map data © <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors";
        var osm = new L.TileLayer(osmUrl,{attribution:osmAttrib});

        this._map.addLayer(osm);

        if (this.hasOpt("circles"))
        {
            var a = this.getOpt("circles");

            if (Array.isArray(a) == false)
            {
                var tmp = a;
                a = [];
                a.push(tmp);
            }

            for (var o of a)
            {
                this.addCircles(o);
            }
        }

        if (this.hasOpt("polygons"))
        {
            var a = this.getOpt("polygons");

            if (Array.isArray(a) == false)
            {
                var tmp = a;
                a = [];
                a.push(tmp);
            }

            for (var o of a)
            {
                this.addPolygons(o);
            }
        }

        this._data = null;
    }

    getType()
    {
        return("map");
    }

    init(data,clear)
    {
		Map.prototype.init.call(this);

        if (this.hasOpt("zoom"))
        {
            this._map.setZoom(this.getOpt("zoom"));
        }

        if (this.hasOpt("center"))
        {
            this._map.setView(this.getOpt("center"));
        }
    }

    draw(data,clear)
    {
        var mapdata = this.getData();

        if (mapdata == null)
        {
            return;
        }

        if (this._initialized == false)
        {
            this.init();
        }

        var polylineOpts = this.getOpt("polyline");

        var opacity = this.getOpt("marker_opacity",1);
        var marker = null;
        var lastMarker = null;
        var html = null;
        var key = null;

        var selectedBorder = this._visuals.selectedBorder;
        var borderWidth = this.getOpt("border_width","1");
        var borderColor = this.getOpt("border_color","black");
        var firstSelected = null;

        var remove = {};

        for (var x in this._markers)
        {
            remove[x] = this._markers[x];
        }

        var points = null;

        if (polylineOpts != null)
        {
            points = [];
        }

        for (var i = 0; i < mapdata.keys.length; i++)
        {
            if (mapdata.lat[i] == null || mapdata.lon[i] == null)
            {
                continue;
            }

            key = mapdata.keys[i];

            html = (mapdata.html != null) ? mapdata.html[i] : null;

            var latLng = new L.LatLng(mapdata.lat[i],mapdata.lon[i]);

            if (points != null)
            {
                points.push(latLng);
            }

            if (remove.hasOwnProperty(key))
            {
                delete remove[key];
            }

            if (this._markers.hasOwnProperty(key))
            {
                marker = this._markers[key];
            }
            else
            {
                if (html != null)
                {
                    var icon = new L.DivIcon({className:"maphtml",html:html});
                    marker = new L.Marker(latLng,{icon:icon});
                }
                else
                {
                    marker = new L.circleMarker(latLng);
                    marker.setStyle({fillOpacity:opacity});
                }

                var map = this;

                marker.on("click",function(e) {
                    map.clicked(e);
                });

                if (this.getOpt("mouseover") != null)
                {
                    marker.on("mouseover",function(e) {
                        map.mouseover(e);
                    });
                }

                this._map.addLayer(marker);
                this._markers[key] = marker;
            }

            marker.setLatLng(latLng);
            lastMarker = marker;

            if (mapdata.selected[i])
            {
                if (firstSelected == null)
                {
                    firstSelected = marker;
                }
            }

            if (html != null)
            {
                marker.setIcon(new L.DivIcon({className:"maphtml",html:html}));
            }
            else
            {
                if (mapdata.selected[i])
                {
                    marker.setStyle({weight:selectedBorder.width});
                    marker.setStyle({color:selectedBorder.color});
                }
                else
                {
                    marker.setStyle({weight:borderWidth});
                    marker.setStyle({color:borderColor});
                }

                /*
                if (sizePixels != null)
                {
                    marker.setRadius(sizePixels);
                }
                else if (sizes != null)
                */
                if (mapdata.sizes != null)
                {
                    marker.setRadius(mapdata.sizes[i] / 2);
                }

                if (mapdata.colors != null)
                {
                    marker.setStyle({fillColor:mapdata.colors[i]});
                }
            }

            if (mapdata.tooltips[i].length > 0)
            {
                marker.bindTooltip(mapdata.tooltips[i]);
            }
        }

        for (var key in remove)
        {
            marker = remove[key];
            this._map.removeLayer(marker);
            delete this._markers[key];
        }

        if (points != null)
        {
            if (this._polyline == null)
            {
                this._polyline = L.polyline([]);
                this._map.addLayer(this._polyline);
                this._polyline.setStyle(polylineOpts);
            }

            this._polyline.setLatLngs(points);
        }

        if (this.getOpt("track_selected",false))
        {
            if (firstSelected != null)
            {
                this._map.setView(firstSelected.getLatLng());
            }
        }

        if (this.getOpt("tracking",false))
        {
            if (lastMarker != null)
            {
                this._map.setView(lastMarker.getLatLng());
            }
        }
    }

    clicked(e)
    {
        var key = null;

        for (var s in this._markers)
        {
            if (this._markers[s] == e.target)
            {
                key = s;
                break;
            }
        }

        var index = null;

        if (key != null)
        {
            for (var i = 0; i < this._data.length; i++)
            {
                if (key == this._datasource.getKey(this._data[i]))
                {
                    index = i;
                    break;
                }
            }
        }

        if (index != null)
        {
            this._datasource.toggleSelectedIndices([index],this.isCtrl(e.originalEvent) == false);
        }
    }

    mouseover(e)
    {
        var key = null;

        for (var s in this._markers)
        {
            if (this._markers[s] == e.target)
            {
                key = s;
                break;
            }
        }

        if (key == null)
        {
            return;
        }

        var data = this._datasource.getDataByKey(key);

        if (data != null)
        {
            this.getOpt("mouseover")(data);
        }
    }

    setZoom(value)
    {
        Map.prototype.setZoom.call(this,value);
        this._map.setZoom(value);
    }

    addCircles(options)
    {
        var opts = new Options(options);

        if (opts.hasOpt("lat") == false || opts.hasOpt("lon") == false)
        {
            throw "You must specify lat and lon values";
        }

        opts.setOpt("pagesize",0);

        const   self = this;

        function add(datasource) {
            var o = {};
            o["lat"] = opts.getOpt("lat");
            o["lon"] = opts.getOpt("lon");
            o["datasource"] = datasource;
            o["layers"] = new L.layerGroup();
            if (opts.hasOpt("radius"))
            {
                var value = opts.getOpt("radius");

                try
                {
                    num = int(value)
                    o["radius"] = num
                }
                catch (e)
                {
                    o["radius_field"] = value
                }
            }
            if (opts.hasOpt("text"))
            {
                o["text"] = opts.getOpt("text");
            }
            self._circles.push(o);
            self.loadCircles(o);
            datasource.addDelegate(self);
        }

        if (opts.hasOpt("datasource"))
        {
            add(opts.getOpt("datasource"));
        }
        else
        {
            this._datasource._api.getDatasource(opts.getOpts()).then(
                function(result) {
                    add(result);
                }
            );
        }
    }

    loadCircles(o)
    {
        o["layers"].clearLayers()

        var data = o["datasource"].getList();

        if (data == null)
        {
            return;
        }

        var circle;
        var radius;
        var key;
        var lat;
        var lon;
        var bw;

        for (var value of data)
        {
            if (value.hasOwnProperty(o["lat"]) == false || value.hasOwnProperty(o["lon"]) == false)
            {
                continue;
            }

            key = value["@key"];

            lat = value[o["lat"]];
            lon = value[o["lon"]];

            radius = 50;

            if (o.hasOwnProperty("radius"))
            {
                radius = o["radius"]
            }
            else if (o.hasOwnProperty("radius_field"))
            {
                var num = parseFloat(value[o["radius_field"]]);
                radius = parseInt(num);
            }

            circle = L.circle([lat,lon],{radius:radius})

            bw = this.getOpt("circle_border_width",2);
            circle.setStyle({weight:bw});

            if (bw > 0)
            {
                circle.setStyle({stroke:true,color:this.getOpt("circle_border_color","black")});
            }
            else
            {
                circle.setStyle({stroke:false});
            }

            circle.setStyle({fillColor:this.getOpt("circle_fill_color","white")});

            if (this.hasOpt("circle_fill_opacity"))
            {
                circle.setStyle({fillOpacity:this.getOpt("circle_fill_opacity")});
            }

            if (o.hasOwnProperty("text"))
            {
                var text = value[o["text"]];
                //circle.bindPopup(text);
                circle.bindTooltip(text);
            }

            o["layers"].addLayer(circle);
        }

        if (this._map != null)
        {
            if (this._map.hasLayer(o["layers"]) == false)
            {
                this._map.addLayer(o["layers"]);
            }
        }
    }

    addPolygons(options)
    {
        var opts = new Options(options);

        if (opts.hasOpt("coords") == false)
        {
            throw "You must specify coords value";
        }

        const   self = this;

        function add(datasource) {
            var o = {};
            o["coords"] = opts.getOpt("coords");
            o["radius"] = opts.getOpt("radius");
            o["datasource"] = datasource;
            o["layers"] = new L.layerGroup();
            if (opts.hasOpt("text"))
            {
                o["text"] = opts.getOpt("text");
            }
            o["order"] = opts.getOpt("order","lat_lon");
            self._polygons.push(o);
            self.loadPolygons(o);
            datasource.addDelegate(self);
        }

        if (opts.hasOpt("datasource"))
        {
            add(opts.getOpt("datasource"));
        }
        else
        {
            this._datasource._api.getDatasource(opts.getOpts()).then(
                function(result) {
                    add(result);
                }
            );
        }
    }

    loadPolygons(o)
    {
        o["layers"].clearLayers()

        var data = o["datasource"].getList();

        if (data == null)
        {
            return;
        }

        var lonlat = (o["order"] == "lon_lat")
        var coords;
        var points;
        var key;
        var bw;
        var a;
        var i;

        for (var value of data)
        {
            if (value.hasOwnProperty(o["coords"]) == false)
            {
                continue;
            }

            coords = value[o["coords"]];

            a = coords.split(" ");
            points = [];
            i = 0;

            while (true)
            {
                if (lonlat)
                {
                    points.push([a[i + 1],a[i]]);
                }
                else
                {
                    points.push([a[i],a[i + 1]]);
                }

                i += 2;

                if (i >= a.length)
                {
                    break;
                }
            }

            if (points.length == 1)
            {
                var radius = 100;
                if (o.hasOwnProperty("radius"))
                {
                    if (value.hasOwnProperty(o["radius"]))
                    {
                        radius = value[o["radius"]];
                    }
                }
                var lat = points[0][0];
                var lon = points[0][1];
                var circle = L.circle([lat,lon],{radius:radius})

                var bw = this.getOpt("circle_border_width",2);
                circle.setStyle({weight:bw});

                if (bw > 0)
                {
                    circle.setStyle({stroke:true,color:this.getOpt("circle_border_color","black")});
                }
                else
                {
                    circle.setStyle({stroke:false});
                }

                circle.setStyle({fillColor:this.getOpt("circle_fill_color","white")});

                if (this.hasOpt("circle_fill_opacity"))
                {
                    circle.setStyle({fillOpacity:this.getOpt("circle_fill_opacity")});
                }

                if (o.hasOwnProperty("text"))
                {
                    var text = value[o["text"]];
                    circle.bindTooltip(text);
                }

                o["layers"].addLayer(circle);
            }
            else
            {
                var polygon = L.polygon(points);

                bw = this.getOpt("poly_border_width",2);
                polygon.setStyle({weight:bw});

                if (bw > 0)
                {
                    polygon.setStyle({stroke:true,color:this.getOpt("poly_border_color","black")});
                }
                else
                {
                    polygon.setStyle({stroke:false});
                }

                polygon.setStyle({fillColor:this.getOpt("poly_fill_color","white")});
                polygon.setStyle({fillOpacity:this.getOpt("poly_fill_opacity",.2)});

                if (o.hasOwnProperty("text"))
                {
                    var text = value[o["text"]];
                    //polygon.bindPopup(text);
                    polygon.bindTooltip(text);
                }

                o["layers"].addLayer(polygon);
            }
        }

        if (this._map != null)
        {
            if (this._map.hasLayer(o["layers"]) == false)
            {
                this._map.addLayer(o["layers"]);
            }
        }
    }

    dataChanged(datasource,data,clear)
    {
        var o = null;

        for (var circle of this._circles)
        {
            if (circle["datasource"] == datasource)
            {
                o = circle;
                break;
            }
        }

        if (o != null)
        {
            this.loadCircles(o);
        }
        else
        {
            for (var polygon of this._polygons)
            {
                if (polygon["datasource"] == datasource)
                {
                    o = polygon;
                    break;
                }
            }
            if (o != null)
            {
                this.loadPolygons(o);
            }
        }
    }

    getZoomDelta()
    {
        return(this.getOpt("zoom_delta",.1));
    }
}

class PlotlyMap extends Map
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
        this._type = "scattergeo";
        this._geo = new Options({scope:"usa"});
        Object.defineProperty(this,"geo", {
            get() {
                return(this._geo);
            }
        });

        Object.defineProperty(this,"center", {
            get() {
                var center = this._geo.getOpt("center");
                return(center);
            },
            set(value) {
                this._geo.setOpt("center",value);
            }
        });

        this.keyProperty = "location";
    }

    getType()
    {
        return("map");
    }

    draw(data,clear)
    {
        var mapdata = this.getData();

        if (mapdata == null)
        {
            return;
        }

        if (this._initialized == false)
        {
            this.init();
        }

        var data = [{
            type: this._type,
            mode: "markers",
            locationmode: "USA-states",
            lat: mapdata.lat,
            lon: mapdata.lon,
            hoverinfo: "text",
            text: mapdata.tooltips,
            marker: {
                size: mapdata.sizes,
                color:mapdata.colors,
                line: {
                    color: "black",
                    width: 1
                },
            }
        }];

        this._layout.geo = this._geo.getOpts();

        /*

        this._layout.geo = {
            showland: true,
            landcolor: "rgb(217, 217, 217)",
            landcolor: "rgb(233, 233, 233)",
            subunitwidth: 1,
            countrywidth: 1,
            subunitcolor: "rgb(255,255,255)",
            countrycolor: "rgb(255,255,255)"
        };


        this._layout.geo = {
            scope: "usa",
            projection: {
                type: "albers usa"
            },
            showland: true,
            landcolor: "rgb(217, 217, 217)",
            landcolor: "rgb(233, 233, 233)",
            subunitwidth: 1,
            countrywidth: 1,
            subunitcolor: "rgb(255,255,255)",
            countrycolor: "rgb(255,255,255)"
        };
        */

        this._layout["hovermode"] = this.getOpt("hover_mode","closest");
        this._layout["hoverlabel"] = this.getOpt("hover_style");

        Plotly.react(this._content,data,this._layout,this._defaults);
    }

    getZoomDelta()
    {
        return(.25);
    }

    getZoom()
    {
        var level = 1;
        var projection = this._geo.getOpt("projection");
        if (projection != null && projection.hasOwnProperty("scale"))
        {
            level = projection.scale;
        }
        return(level);
    }

    setZoom(value)
    {
        var projection = this._geo.hasOpt("projection") ? this._geo.getOpt("projection") : {};
        projection.scale = value;
        this._geo.setOpt("projection",projection);
        this.draw();
    }

    setCenter(lat,lon,zoom)
    {
        this.center = {lat:lat,lon:lon};
        if (zoom != null)
        {
            this.setZoom(zoom);
        }
        else
        {
            this.draw();
        }
    }
}

class ChoroplethMap extends PlotlyMap
{
    constructor(visuals,container,datasource,options)
    {
        super(visuals,container,datasource,options);
        this._type = "choropleth";
    }

    draw(data,clear)
    {
        var mapdata = this.getData();

        if (mapdata == null)
        {
            return;
        }

        if (this._initialized == false)
        {
            this.init();
        }

        var values = this.getValues("locations");

        if (values.length == 0)
        {
            throw("you must specify the locations property");
        }

        var locations = this._datasource.getValues(values[0]);

        values = this.getValues("values");

        if (values.length == 0)
        {
            throw("you must specify the values property")
        }

        var z = this._datasource.getValues(values[0]);
        var min = Math.min.apply(Math,z);
        var max = Math.max.apply(Math,z);
        var colorscale = null;

        var colorscale = this._visuals.colors.createColorScale(this);

        var data = [{
            type: this._type,
            locations:locations,
            geojson: this.getOpt("geojson"),
            featureidkey:this.getOpt("key"),
            showscale:this.getOpt("show_scale",true),
            z:z,
            zmin:min,
            zmax:max,
            hoverinfo: "text",
            text: mapdata.tooltips,
            colorscale:colorscale,
            marker: {
                size: mapdata.sizes,
                line: {
                    color: this.getOpt("boundary_color","black"),
                    width: this.getOpt("boundary_width",1)
                },
            },
            selected: {
                marker: {
                    color:"red"
                }
            }
        }];

        this._layout.geo = this._geo.getOpts();

        /*
        if (this._layout.hasOwnProperty("geo"))
        {
            if (this._layout.geo.hasOwnProperty("projection"))
            {
                console.log("ZOOM: " + this._layout.geo.projection.scale);
            }
        }

        this._layout.geo = {
            scope: "world",
            showland:true,
            showocean:true,
            showrivers:true,
            landcolor: "rgb(217, 217, 217)",
            landcolor: "rgb(233, 233, 233)",
            oceancolor: "#3399FF",
            subunitwidth: 1,
            countrywidth: 1,
            subunitcolor: "rgb(255,255,255)",
            countrycolor: "rgb(255,255,255)"
        };
        */

        this._defaults.scrollZoom = this.getOpt("scroll_zoom",true);

        this._layout["hovermode"] = this.getOpt("hover_mode","closest");
        this._layout["hoverlabel"] = this.getOpt("hover_style");

        Plotly.react(this._content,data,this._layout,this._defaults);

        this.setHandlers();
        this.setHeader();
    }
}

export {Maps};
