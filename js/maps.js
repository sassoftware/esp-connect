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
    "./chart",
    "./options"
], function(Chart,Options)
{
    function
    Maps(options)
    {
        Options.call(this,options);
    }

    Maps.prototype = Object.create(Options.prototype);
    Maps.prototype.constructor = Maps;

    Maps.prototype.createMap =
    function(visuals,container,datasource,options)
    {
        var chart = new Map(visuals,container,datasource,options);
        return(chart);
    }

    /* Map */

    function
    Map(visuals,container,datasource,options)
    {
        Chart.call(this,visuals,container,datasource,options);

        if (window.L == null)
        {
            throw("you must include the leaflet javascript library");
        }

        this.sizeContent();

        this._map = new L.map(this._content,{zoom:4});

        this._lat = null;
        this._lon = null;
        this._markers = {};

        this._circles = [];
        this._polygons = [];

        var osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        var osmAttrib = "Map data © <a href='https://openstreetmap.org'>OpenStreetMap</a> contributors";
        var osm = new L.TileLayer(osmUrl,{attribution:osmAttrib});

        //this._map.setView(new L.LatLng(37.0,-95));
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

        this._polylineOpts = this.getOpt("polyline");
    }

    Map.prototype = Object.create(Chart.prototype);
    Map.prototype.constructor = Map;

    Map.prototype.getType =
    function()
    {
        return("map");
    }

    Map.prototype.init =
    function(data,clear)
    {
        if (this.hasOpt("zoom"))
        {
            this._map.setZoom(this.getOpt("zoom"));
        }

        if (this.hasOpt("center"))
        {
            this._map.setView(this.getOpt("center"));
        }

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

    Map.prototype.draw =
    function(data,clear)
    {
        if (this._datasource.schema == null)
        {
            return;
        }

        if (this._initialized == false)
        {
            this.init();
        }

        this._data = this._datasource.getList();

        if (this._data == null)
        {
            return;
        }

        var popup = [];
        var s = this.getValues("popup");

        if (s.length > 0)
        {
            var f;

            for (var x of s)
            {
                if ((f = this._datasource.schema.getField(x)) != null)
                {
                    if (popup == null)
                    {
                        popup = [];
                    }
                    popup.push(f);
                }
            }
        }

        var value;
        var field;
        var sizePixels = null;
        var sizes = null;
        var colors = null;

        if ((value = this.getOpt("size")) != null)
        {
            if ((field = this._datasource.schema.getField(value)) != null)
            {
                var values = this._datasource.getValues(value);
                if (values != null && values.length > 0)
                {
                    var s = this.getOpt("sizes",[10,50]);
                    sizes = this._visuals.getSizes(values,s[0],s[1]);
                }
            }
            else
            {
                sizes = [];
                this._data.forEach(item => {sizes.push(value);});
            }
        }
        else
        {
            sizes = [];
            this._data.forEach(item => {sizes.push(20);});
        }

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
                        options["gradient"] = this.getOpt("gradient","lightest");
                        options["gradient_end"] = this.getOpt("gradient_end",false);
                    }

                    if (this.hasOpt("color_range"))
                    {
                        options["range"] = this.getOpt("color_range");
                    }

                    colors = this._visuals._colors.createColors(values,options);
                }
            }
            else
            {
                colors = [];
                var c = this._visuals._colors.getColor(value);
                this._data.forEach(item => {colors.push(c);});
            }
        }
        else
        {
            colors = [];
            this._data.forEach(item => {colors.push("white");});
        }

        var htmlFunc = this.getOpt("html");
        var opacity = this.getOpt("marker_opacity",1);
        var marker = null;
        var lastMarker = null;
        var html = null;

        var keyValues = this.getValues("keys");

        if (keyValues.length == 0)
        {
            keyValues = ["@key"];
        }

        var selectedBorder = this._visuals.selectedBorder;
        var borderWidth = this.getOpt("border_width","1");
        var borderColor = this.getOpt("border_color","black");
        var firstSelected = null;
        var keys = [];
        var index = 0;
        var selected;
        var key;

        var remove = {};

        for (var x in this._markers)
        {
            remove[x] = this._markers[x];
        }

        var points = null;

        if (this._polylineOpts != null)
        {
            points = [];
        }

        for (var value of this._data)
        {
            selected = this._datasource.isSelected(value);
            
            key = "";

            html = (htmlFunc != null) ? htmlFunc(this,value,colors[index],sizes[index],selected) : null;

            for (var i = 0; i < keyValues.length; i++)
            {
                k = keyValues[i];

                if (i > 0)
                {
                    key += ".";
                }

                if (value.hasOwnProperty(k))
                {
                    key += value[k];
                }
            }
                
            keys.push(key);

            var latLng = null;

            if (value.hasOwnProperty(this._lat) && value.hasOwnProperty(this._lon))
            {
                lat = value[this._lat];
                lon = value[this._lon];

                if (lat != 0 && lon != 0)
                {
                    latLng = new L.LatLng(lat,lon);
                }
            }

            if (latLng == null)
            {
                continue;
            }

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

            if (selected)
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
                if (selected)
                {
                    marker.setStyle({weight:selectedBorder.width});
                    marker.setStyle({color:selectedBorder.color});
                }
                else
                {
                    marker.setStyle({weight:borderWidth});
                    marker.setStyle({color:borderColor});
                }

                if (sizePixels != null)
                {
                    marker.setRadius(sizePixels);
                }
                else if (sizes != null)
                {
                    marker.setRadius(sizes[index] / 2);
                }

                if (colors != null)
                {
                    marker.setStyle({fillColor:colors[index]});
                }
            }

            if (popup.length > 0)
            {
                var text = ""
                var esptype;
                var v;
                var f;
                var s;

                for (var i = 0; i < popup.length; i++)
                {
                    f = popup[i];

                    if (i > 0)
                    {
                        text += "<br/>";
                    }

                    s = f["name"];
                    v = value[s];
                    esptype = f["espType"];

                    if (esptype == "date" || esptype == "datetime")
                    {
                        v = this._visuals.getDateString(v);
                    }
                    else if (esptype == "stamp" || esptype == "timestamp")
                    {
                        v = this._visuals.getTimeString(v);
                    }

                    text += s + "=" + v;
                }

                /*
                marker.bindPopup(text);
                */
                marker.bindTooltip(text);
            }

            index++;
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
                this._polyline.setStyle(this._polylineOpts);
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



    Map.prototype.clicked =
    function(e)
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

    Map.prototype.mouseover =
    function(e)
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

    Map.prototype.addCircles =
    function(options)
    {
        var opts = new Options(options);

        if (opts.hasOpt("lat") == false || opts.hasOpt("lon") == false)
        {
            throw "You must specify lat and lon values";
        }

        opts.setOpt("pagesize",0);

        var datasource = null;

        if (opts.hasOpt("datasource"))
        {
            datasource = opts.getOpt("datasource");
        }
        else
        {
            datasource = this._datasource._conn.getDatasource(opts.getOpts());
        }

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
        this._circles.push(o);
        this.loadCircles(o);
        datasource.addDelegate(this);
    }

    Map.prototype.loadCircles =
    function(o)
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

    Map.prototype.addPolygons =
    function(options)
    {
        var opts = new Options(options);
        var datasource = null;

        if (opts.hasOpt("datasource"))
        {
            datasource = opts.getOpt("datasource");
        }
        else
        {
            datasource = this._datasource._conn.getDatasource(opts.getOpts());
        }

        if (opts.hasOpt("coords") == false)
        {
            throw "You must specify coords value";
        }

        var o = {};
        o["coords"] = opts.getOpt("coords");
        o["datasource"] = datasource;
        o["layers"] = new L.layerGroup();
        if (opts.hasOpt("text"))
        {
            o["text"] = opts.getOpt("text");
        }
        o["order"] = opts.getOpt("order","lat_lon");
        this._polygons.push(o);
        this.loadPolygons(o);
        datasource.addDelegate(this);
    }

    Map.prototype.loadPolygons =
    function(o)
    {
        o["layers"].clearLayers()

        var data = o["datasource"].getList();

        if (data == null)
        {
            return;
        }

        var lonlat = (o["order"] == "lon_lat")
        var polygon;
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

            polygon = L.polygon(points);

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

        if (this._map != null)
        {
            if (this._map.hasLayer(o["layers"]) == false)
            {
                this._map.addLayer(o["layers"]);
            }
        }
    }

    Map.prototype.dataChanged =
    function(datasource,data,clear)
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
                this.loadPolygons(o)
            }
        }
    }

    /* End Map */

    return(Maps);
});
