/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "../connect/options",
    "../connect/tools",
    "./scales"
], function(Options,tools,scales)
{
    var _sasThemes = {
        "sas_base":["#00929f", "#f08000", "#90b328", "#3d5aae", "#ffca39", "#a6427c", "#9c2910", "#736519"],
        "sas_dark":["#90b328", "#9c2910", "#ffca39", "#00929f", "#736519", "#f08000", "#a6427c"],
        "sas_highcontrast":["#a1d73b", "#ff791d", "#ffd736", "#cb66ff", "#ff5252", "#57b2ff", "#fa96e0", "#33f7b0"],
        "sas_light":["#3d5aae", "#90b328", "#9c2910", "#ffca39", "#00929f", "#736519", "#f08000", "#a6427c"],
        "sas_marine":["#00929f", "#f08000", "#90b328", "#3d5aae", "#ffca39", "#a6427c", "#9c2910", "#736519"],
        "sas_midnight":["#2470ad", "#98863c", "#5954ad", "#985b30", "#238a92", "#84414b", "#17785f", "#985186"],
        "sas_opal":["#33a3ff", "#ffcc32", "#9471ff", "#ff8224", "#2ad1d1", "#dd5757", "#15b57b", "#ff6fbd"],
        "sas_sail":["#21b9b7", "#4141e0", "#7db71a", "#8e2f8a", "#d38506", "#0abf85", "#2f90ec", "#db3851"],
        "sas_snow":["#3d5aae", "#90b328", "#9c2910", "#ffca39", "#00929f", "#736519", "#f08000", "#a6427c"],
        "sas_umstead":["#00929f", "#f08000", "#90b328", "#3d5aae", "#ffca39", "#a6427c", "#9c2910", "#736519"],
        "sas_corporate":["#00929f", "#f08000", "#90b328", "#3d5aae", "#ffca39", "#a6427c", "#9c2910", "#736519"],
        "sas_hcb":["#7cbf00", "#f77107", "#f1d700", "#bd77ff", "#ff6d65", "#4aacff", "#ff6fbd", "#00d692"],
        "sas_ignite":["#2470ad", "#98863c", "#5954ad", "#985b30", "#238a92", "#84414b", "#17785f", "#985186"],
        "sas_inspire":["#21b9b7", "#4141e0", "#7db71a", "#8e2f8a", "#d38506", "#0abf85", "#2f90ec", "#db3851"]
    };

    var _groups = {
        "pinks":["#FFC0CB", "#FFB6C1", "#FF69B4", "#FF1493", "#DB7093", "#C71585"],
        "purples":["#E6E6FA", "#D8BFD8", "#DDA0DD", "#DA70D6", "#EE82EE", "#FF00FF", "#FF00FF", "#BA55D3", "#9932CC", "#9400D3", "#8A2BE2", "#8B008B", "#800080", "#9370DB", "#7B68EE", "#6A5ACD", "#483D8B", "#663399", "#4B0082"],
        "reds":["#FFA07A", "#FA8072", "#E9967A", "#F08080", "#CD5C5C", "#DC143C", "#FF0000", "#B22222", "#8B0000"],
        "oranges":["#FFA500", "#FF8C00", "#FF7F50", "#FF6347", "#FF4500"],
        "yellows":["#FFD700", "#FFFF00", "#FFFFE0", "#FFFACD", "#FAFAD2", "#FFEFD5", "#FFE4B5", "#FFDAB9", "#EEE8AA", "#F0E68C", "#BDB76B"],
        "greens":["#ADFF2F", "#7FFF00", "#7CFC00", "#00FF00", "#32CD32", "#98FB98", "#90EE90", "#00FA9A", "#00FF7F", "#3CB371", "#2E8B57", "#228B22", "#008000", "#006400", "#9ACD32", "#6B8E23", "#556B2F", "#66CDAA", "#8FBC8F", "#20B2AA", "#008B8B", "#008080"],
        "cyans":["#00FFFF", "#00FFFF", "#E0FFFF", "#AFEEEE", "#7FFFD4", "#40E0D0", "#48D1CC", "#00CED1"],
        "blues":["#5F9EA0", "#4682B4", "#B0C4DE", "#ADD8E6", "#B0E0E6", "#87CEFA", "#87CEEB", "#6495ED", "#00BFFF", "#1E90FF", "#4169E1", "#0000FF", "#0000CD", "#00008B", "#000080", "#191970"],
        "browns":["#FFF8DC", "#FFEBCD", "#FFE4C4", "#FFDEAD", "#F5DEB3", "#DEB887", "#D2B48C", "#BC8F8F", "#F4A460", "#DAA520", "#B8860B", "#CD853F", "#D2691E", "#808000", "#8B4513", "#A0522D", "#A52A2A", "#800000"],
        "whites":["#FFFFFF", "#FFFAFA", "#F0FFF0", "#F5FFFA", "#F0FFFF", "#F0F8FF", "#F8F8FF", "#F5F5F5", "#FFF5EE", "#F5F5DC", "#FDF5E6", "#FFFAF0", "#FFFFF0", "#FAEBD7", "#FAF0E6", "#FFF0F5", "#FFE4E1"],
        "greys":["#DCDCDC", "#D3D3D3", "#C0C0C0", "#A9A9A9", "#696969", "#808080", "#778899", "#708090", "#2F4F4F", "#000000"],
		"pastel1":["#f2dcd3", "#e7bdb3", "#3b3638", "#f9f7f7", "#c9a4a0", "#eed7db", "#d6b7b1", "#ae8094", "#85506e", "#58443e"],
		"pastel2":["#eacdd0", "#fbf9f9", "#5a5b5b", "#a3a6a3", "#878384", "#f274bc", "#cc5079", "#ca9ca9", "#f7f7f7", "#cdc8ca"],
		"pastel3":["#da8363", "#e7b7a6", "#f2f2f2", "#ca705f", "#dc9787", "#fcbcbc", "#12987d", "#9bd3cb", "#fadae2", "#f39ca4"],
		"pastel4":["#744622", "#392313", "#b5dccd", "#f0e7e3", "#a87550", "#edddd1", "#f2e3e3", "#b6cdc8", "#fbfbfb", "#cce0da"],
		"pastel5":["#dc7684", "#e4ca99", "#eaf2f4", "#2d7f9d", "#a4c9d7", "#f1d7bb", "#aedde0", "#fbfbfb", "#958676", "#a186b4"],
		"pastel6":["#b1becd", "#c9d1d8", "#eceded", "#717d84", "#9ca4a4", "#b5a25d", "#d3c99f", "#a5b3c0", "#3b3846", "#fafbfa"],
		"pastel7":["#f0df93", "#f9f2d4", "#abdbe3", "#fbfbfb", "#ede6b2", "#77628e", "#594665", "#a891a0", "#eae9e8", "#c6b9c0"],
		"pastel8":["#fcece4", "#e8cedb", "#fbfbfb", "#cce0db", "#b8d1cb", "#e5b163", "#d4868e", "#f0eef4", "#563c2d", "#978ea0"],
		"pastel9":["#fcbc7b", "#f6a24e", "#e6cfc5", "#a63d11", "#cba593", "#fcb293", "#fcbca4", "#fcdbc4", "#fcf8f5", "#fcecdc"],
		"pastel10":["#fae1d0", "#fbe4dc", "#e1b464", "#fbfaf9", "#efd4a9", "#e97140", "#ed8e63", "#f6f0ed", "#6a6767", "#a9b8b2"],
		"pastel11":["#d0b090", "#64a49e", "#dee1e5", "#3f4848", "#818773", "#c2a669", "#d1c2a3", "#f5f3ec", "#f0d8c6", "#a49c94"],
		"pastel12":["#f0d774", "#f1e2b2", "#f9f9f9", "#7d643a", "#654a51", "#fae383", "#ebe3b3", "#f8f7f4", "#4d9163", "#a1a87c"],
		"pastel13":["#ffec8b", "#c6c3aa", "#4c4a43", "#777571", "#fbfbfa", "#f6f3a9", "#ebe5bd", "#ece6f3", "#444747", "#934a32"]
    };

    function
    Colors(options)
    {
		Options.call(this,options);

        this._colors = null;

        if (this.hasOpt("theme"))
        {
            this.createFromTheme(this.getOpt("theme"));
        }
        else if (this.hasOpt("colors"))
        {
            this.createFromColors(this.getOpt("colors"));
        }
        else
        {
            this.createFromTheme("sas_corporate");
        }

        Object.defineProperty(this,"colors", {
            get() {
                var colors = [];

                for (var c of this._colors)
                {
                    colors.push(c.color);
                }
                return(colors);
            }
        });

        Object.defineProperty(this,"lightest", {
            get() {
                var maxLuma = 0;
                var color = null;
                var luma;

                for (var i = 0; i < this._colors.length; i++)
                {
                    luma = this._colors[i].luma;

                    if (luma > maxLuma)
                    {
                        maxLuma = luma;
                        color = this._colors[i].color;
                    }
                }

                return(color);
            }
        });

        Object.defineProperty(this,"darkest", {
            get() {
                var minLuma = Number.MAX_VALUE;
                var color = null;
                var luma;


                for (var i = 0; i < this._colors.length; i++)
                {
                    luma = this._colors[i].luma;

                    if (luma < minLuma)
                    {
                        minLuma = luma;
                        color = this._colors[i].color;
                    }
                }

                return(color);
            }
        });

        Object.defineProperty(this,"middle", {
            get() {
                var color = "#ffffff";
                var a = this._colors.slice(0);
                a.sort(this.sortLuma);
                if (a.length > 0)
                {
                    var index = (a.length % 2 == 0) ? (a.length / 2) : ((a.length - 1) / 2);
                    color = a[index].color;
                }

                return(color);
            }
        });
    }

	Colors.prototype = Object.create(Options.prototype);
	Colors.prototype.constructor = Colors;

    Colors.prototype.createFromTheme =
    function(colormap)
    {
        this._colors = [];

        if (colormap == null)
        {
            colormap = "sas_corporate";
        }

        if (colormap.indexOf("sas_") == 0)
        {
            var theme = _sasThemes["sas_corporate"];

            if (_sasThemes.hasOwnProperty(colormap))
            {
                theme = _sasThemes[colormap];
            }

            for (var c of theme)
            {
                this.addColor(c);
            }
        }
        else if (_groups.hasOwnProperty(colormap))
        {
            var theme = _groups[colormap];

            theme.forEach((c) => {
                this.addColor(c);
            });
        }
        else if (scales.hasOwnProperty(colormap))
        {
            var scale = scales[colormap];

            for (var entry of scale)
            {
                this.addColor(entry[1]);
            }
        }
    }

    Colors.prototype.createFromColors =
    function(colors)
    {
        this._colors = [];

        for (var color of colors)
        {
            this.addColor(color);
        }
    }

    Colors.prototype.get =
    function(index)
    {
        var color = null;

        if (this._colors != null)
        {
            if (index < this._colors.length)
            {
                color = this._colors[index].color;
            }
        }

        return(color);
    }

    Colors.prototype.getColors =
    function(num,increment)
    {
        var colors = [];

        if (this._colors != null)
        {
            var index = 0;

            for (var i = 0; i < num; i++)
            {
                colors.push(this._colors[index].color);

                index += increment;

                if (index == this._colors.length)
                {
                    index = 0;
                }
            }
        }

        return(colors);
    }

    Colors.prototype.getColor =
    function(name)
    {
        if (name.indexOf("#") == 0)
        {
            return(name);
        }

        var color = name;

        if (name == "lightest")
        {
            color = this.lightest;
        }
        else if (name == "darkest")
        {
            color = this.darkest;
        }
        else
        {
            color = createColor(name);
        }

        return(color);
    }

    Colors.prototype.getSpread =
    function(num) 
    {
        var colors = [];

        if (this._colors != null)
        {
            var delta = parseInt(this._colors.length / num);
            colors = this.getColors(num,delta);
        }

        return(colors);
    }

    Colors.prototype.createGradientColors =
    function(options)
    {
        var opts = new Options(options);
        var c = this.getColor(opts.getOpt("color","lightest"));
        var num = opts.getOpt("num",10);
        var end = opts.getOpt("end",false);
        var delta = opts.getOpt("delta",25);
        var colors = [];

        for (var i = 0; i < num; i++)
        {
            if (end)
            {
                colors.unshift(this.lighten(c,i * delta));
            }
            else
            {
                colors.push(this.darken(c,i * delta));
            }
        }

        return(colors);
    }

    Colors.prototype.createGradient =
    function(options) 
    {
        return(new Gradient(this,options));
    }

    Colors.prototype.lighten =
    function(color,amount)
    {
        return(this.adjust(color,amount));
    }

    Colors.prototype.darken =
    function(color,amount)
    {
        return(this.adjust(color,-amount));
    }

    Colors.prototype.adjust =
    function(color,amount)
    {
        if (color[0] == "#")
        {
            color = color.substr(1);
        }

        var num = parseInt(color,16);
        var rgb = [];

        rgb.push((num >> 16) + amount);
        rgb.push(((num >> 8) & 0x00FF) + amount);
        rgb.push((num & 0x0000FF) + amount);

        var s = "#";
        var value;

        for (var i = 0; i < rgb.length; i++)
        {
            if (rgb[i] > 255)
            {
                rgb[i] = 255;
            }
            else if (rgb[i] < 0)
            {
                rgb[i] = 0;
            }

            value = rgb[i].toString(16);
            if (value.length == 1)
            {
                value = "0" + value;
            }
            s += value;
        }

        return(s);
    }

    Colors.prototype.addColor =
    function(color)
    {
        var rgb = this.toRgb(color);
        var luma = ((rgb.red * 299) + (rgb.green * 587) + (rgb.blue * 114)) / 1000;
        var o = {color:color,rgb:rgb,luma:luma};
        this._colors.push(o);
    }

    Colors.prototype.toRgb =
    function(s) 
    {
        if (s.length == 0)
        {
            return(rgb(0,0,0));
        }

        if (s[0] != '#')
        {
            s = createColor(s);
        }

        if (s[0] == '#')
        {
            var index = 1;
            var o = {};
            o["red"] = parseInt(s.substr(index,2),16);index += 2;
            o["green"] = parseInt(s.substr(index,2),16);index += 2;
            o["blue"] = parseInt(s.substr(index,2),16);index += 2;
            o["alpha"] = 1;

            if (index > s.length)
            {
                var value = parseInt(s.substr(index,2),16);
                o["alpha"] = value / 255;
            }
        }

        return(o);
    }

    Colors.prototype.createColors =
    function(values,options)
    {
        var opts = new Options(options);
        var min = Math.min.apply(Math,values);
        var max = Math.max.apply(Math,values);
        var range = opts.getOpt("range");
        var colors = [];

        if (range == null)
        {
            range = [min,max];
        }

        if (opts.hasOpt("gradient"))
        {
            var c = this.getColor(opts.getOpt("gradient","lightest"));
            var levels = opts.getOpt("levels",100);
            var base = opts.getOpt("base",this.lightest);
            var gradient = this.createGradient({color:c,levels:levels,min:range[0],max:range[1]});
            var gradientEnd = opts.getOpt("gradient_end",false);

            values.forEach(value =>
            {
                if (gradientEnd)
                {
                    value = max - (value - min);
                    colors.push(gradient.lighten(value));
                }
                else
                {
                    colors.push(gradient.darken(value));
                }
            });
        }
        else
        {
            var a = this._colors;

            if (opts.hasOpt("colors"))
            {
                a = [];

                var c = opts.getOpt("colors");

                c.forEach(cv =>
                {
                    a.push({color:cv});
                });
            }

            var cr = new ColorRange(a,range[0],range[1]);

            values.forEach(value =>
            {
                colors.push(cr.get(value));
            });
        }

        return(colors);
    }

    Colors.prototype.getLuma =
    function(color) 
    {
        var rgb = this.toRgb(color);
        var luma = ((rgb.red * 299) + (rgb.green * 587) + (rgb.blue * 114)) / 1000;
        return(luma);
    }

    Colors.prototype.createRange =
    function(colors,lower,upper) 
    {
        return(new ColorRange(colors,lower,upper));
    }

    Colors.prototype.addAlpha =
    function(color,alpha)
    {
        var rgb = this.toRgb(color);
        var c = "rgba(" + rgb.red + "," + rgb.green + "," + rgb.blue + "," + alpha + ")";
        return(c);
    }

    Colors.prototype.sortLuma =
    function(a,b)
    {
        return(a.luma - b.luma);
    }

    function
    Gradient(colors,options)
    {
		Options.call(this,options);
        this._colors = colors;

        Object.defineProperty(this,"color",{
            get() {return(this._color);},
            set(value)
            {
                this._color = createColor(value);
                this._value = parseInt(this._color.substr(1),16);
            }
        });

        this._levels = this.getOpt("levels",100);

        var minv = this.getOpt("min",0);
        var maxv = this.getOpt("max",100);

        this._range = tools.createRange(minv,maxv,this._levels);

        this._div = null;

        if (this.hasOpt("color"))
        {
            this.color = this.getOpt("color");
        }
    }

	Gradient.prototype = Object.create(Options.prototype);
	Gradient.prototype.constructor = Gradient;

    Gradient.prototype.lighten =
    function(amount)
    {
        var index = this._range.index(amount);
        return(this.adjust(index));
    }

    Gradient.prototype.darken =
    function(amount)
    {
        if (this._range == null)
        {
            return("#ffffff");
        }

        var index = this._range.index(amount);
        return(this.adjust(-index));
    }

    Gradient.prototype.adjust =
    function(amount)
    {
        var rgb = [];

        rgb.push((this._value >> 16) + amount);
        rgb.push(((this._value >> 8) & 0x00FF) + amount);
        rgb.push((this._value & 0x0000FF) + amount);

        var s = "#";
        var value;

        for (var i = 0; i < rgb.length; i++)
        {
            if (rgb[i] > 255)
            {
                rgb[i] = 255;
            }
            else if (rgb[i] < 0)
            {
                rgb[i] = 0;
            }

            value = rgb[i].toString(16);
            if (value.length == 1)
            {
                value = "0" + value;
            }
            s += value;
        }

        return(s);
    }

    function
    ColorRange(colors,lower,upper)
    {
        this._range = tools.createRange(lower,upper,colors.length);
        this._colors = colors;
    }

    ColorRange.prototype.get =
    function(value)
    {
        var index = this._range.index(value);
        var color = "#ffffff";

        if (index >= 0 && index < this._colors.length)
        {
            color = this._colors[index].color;
        }

        return(color);
    }

    var _div = null;

    function
    createColor(color)
    {
        if (color == null || color.length == 0)
        {
            throw "invalid color: " + color;
        }

        if (color[0] == '#')
        {
            return(color);
        }

        if (_div == null)
        {
            _div = document.createElement("div");
        }

        document.body.appendChild(_div);
        _div.style.backgroundColor = color;
        var style = window.getComputedStyle(_div);
        var bg = style.getPropertyValue("background-color");
        document.body.removeChild(_div);

        var s = "#";
        var i1 = bg.indexOf("(");

        if (i1 > 0)
        {
            var i2 = bg.indexOf(")");
            bg = bg.substring(i1 + 1,i2);
            var a = bg.split(",");
            var value;

            for (var i = 0; i < a.length; i++)
            {
                value = new Number(a[i]).toString(16);
                if (value.length == 1)
                {
                    value = "0" + value;
                }
                s += value;
            }
        }

        return(s);
    }

    return(Colors);
});
