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
    "./options",
], function(Options)
{
    function
    Range(lower,upper,num)
    {
        this._a = [];

        this._lower = parseFloat(lower) - .01;
        this._upper = parseFloat(upper) + .01;
        this._num = parseFloat(num);

        this._interval = (this._upper - this._lower) / this._num;

        Object.defineProperty(this,"lower", {
            get() {return(this._lower);}
        });

        Object.defineProperty(this,"upper", {
            get() {return(this._upper);}
        });

        Object.defineProperty(this,"interval", {
            get() {return(this._interval);}
        });

        var value = new Number(this._lower);

        for (var i = 0; i < (this._num + 1); i++)
        {
            this._a.push(value);
            value += this._interval;
        }

        //this._a.push(value);

        Object.defineProperty(this,"length", {
            get() {return(this._a.length);}
        });
    }

    Range.prototype.index =
    function(value)
    {
        var index = -1;

        for (var i = 0; i < (this._a.length - 1); i++)
        {
            if (value >= this._a[i] && value <= this._a[i + 1])
            {
                index = i;
                break;
            }
        }

        return(index);
    }

    Range.prototype.createSteps =
    function(colors)
    {
        var steps = [];
        var low;
        var high;

        for (var i = 0; i < this._a.length - 1; i++)
        {
            low = parseFloat(this._a[i]);
            high = parseFloat(this._a[i + 1]);
            steps.push({range:[low,high],color:colors[i]});
        }

        return(steps);
    }

    Range.prototype.toString =
    function()
    {
        return(JSON.stringify(this._a));
    }

    function
    Timer()
    {
        this._items = [];
        this._running = false;
    }

    Timer.prototype.add =
    function(item)
    {
        if (__tools.supports(item,"run") == false)
        {
            __tools.exception("The timer entry must implement the run method");
        }

        if (__tools.supports(item,"getInterval") == false)
        {
            __tools.exception("The timer entry must implement the getInterval method");
        }

        item._fired = 0;

        Object.defineProperty(item,"fired", {
            get() {
                return(this._fired);
            },
            set(value) {
                this._fired = value;
            }
        });

        this._items.push(item);
    }

    Timer.prototype.start =
    function()
    {
        this._running = true;
        var timer = this;
        setTimeout(function(){timer.run()},1000);
    }

    Timer.prototype.stop =
    function()
    {
        this._running = false;
    }

    Timer.prototype.run =
    function()
    {
        var current = new Date();
        var items = [];
        var minInterval = 1000;

        this._items.forEach((item) => {

            var diff = current.getTime() - item.fired;
            var interval = item.getInterval();

            if (diff > interval)
            {
                if (interval < minInterval)
                {
                    minInterval = interval;
                }

                items.push(item);
            }
            else
            {
                diff = current.getTime() - item.fired + interval;

                if (diff < minInterval)
                {
                    minInterval = diff;
                }
            }
        });

        items.forEach((item) => {
            item.run();
        });

        if (this._running)
        {
            var timer = this;
            setTimeout(function(){timer.run()},minInterval);
        }
    }

    var __tools =
    {
        s4()
        {
            return(((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); 
        },

        guid()
        {
            var guid = (this.s4() + this.s4() + "-" + this.s4() + "-4" + this.s4().substr(0,3) + "-" + this.s4() + "-" + this.s4() + this.s4() + this.s4()).toLowerCase();
            return(guid);
        },
    
        supports(o,f)
        {
            return(o != null && (f in o) && typeof(o[f]) == "function");
        },

        contains(list,o)
        {
            if (list != null)
            {
                for (var i = 0; i < list.length; i++)
                {
                    if (list[i] == o)
                    {
                        return(true);
                    }
                }
            }

            return(false);
        },

        indexOf(list,o)
        {
            if (list != null)
            {
                for (var i = 0; i < list.length; i++)
                {
                    if (list[i] == o)
                    {
                        return(i);
                    }
                }
            }

            return(-1);
        },

        addTo(list,o)
        {
            if (this.contains(list,o) == false)
            {
                list.push(o);
                return(true);
            }

            return(false);
        },

        setItem(list,o)
        {
            var item = null;

            for (var i = 0; i < list.length; i++)
            {
                if (list[i] == o)
                {
                    item = list[i];
                    break;
                }
            }

            if (item == null)
            {
                item = o;
                list.push(o);
            }
            else
            {
                for (var x in o)
                {
                    item[x] = o[x];
                }
            }

            return(item);
        },

        removeFrom(list,o)
        {
            var index = this.indexOf(list,o);

            if (index >= 0)
            {
                list.splice(index,1);
                return(true);
            }

            return(false);
        },

        createRange(lower,upper,num)
        {
            return(new Range(lower,upper,num));
        },

        createTimer()
        {
            return(new Timer());
        },

        createUrl(url)
        {
            var u = {};
            var nodeUrl = null;

            try
            {
                nodeUrl = require("url");
            }
            catch (exception)
            {
            }

            if (nodeUrl != null)
            {
                var o = nodeUrl.parse(url);
                u["protocol"] = o["protocol"];
                u["host"] = o["hostname"];
                u["port"] = o["port"];
                u["path"] = o["path"];
                u["secure"] = (o["protocol"] == "https:" || o["protocol"] == "wss:");
            }
            else
            {
                var o = new URL(url,document.URL);
                u["protocol"] = o["protocol"];
                if (o["protocol"] != "http")
                {
                    o["protocol"] = "http";
                    o = new URL(o.toString());
                }
                u["host"] = o.hostname;
                u["port"] = o.port;
                u["path"] = o.pathname;
                u["secure"] = (u["protocol"] == "https:" || u["protocol"] == "wss:");
            }

            u.toString = function()
            {
                return(this.protocol + "//" + this.host + ":" + this.port + this.path);
            }

            return(u);
        },

        reverse(list)
        {
            var reversed = [];

            for (var i = list.length - 1; i >= 0; i--)
            {
                reversed.push(list[i]);
            }

            return(reversed);
        },

        createBuffer:function(s)
        {
            var dv = new DataView(new ArrayBuffer(s.length));

            for (var i = 0; i < s.length; i++)
            {
                dv.setUint8(i,s.charCodeAt(i));
            }

            return(dv.buffer);
        },

        stringFromBytes:function(bytes)
        {
            var s = "";

            bytes.forEach((b) => {
                s += String.fromCharCode(b);
            });

            return(s);
        },

        bytesFromString:function(s)
        {
            var bytes = [];

            for (var i = 0; i < s.length; i++)
            {
console.log("HERE: " + s.charCodeAt(i));
                //bytes.concat(s.charCodeAt(i));
                bytes.push(s.charCodeAt(i));
            }

console.log("bytes: " + bytes + " :: " + bytes.length);
            return(bytes);
        },

        createWebSocket:function(url,delegate)
        {
            var ws = null;

            if (_isNode)
            {
                if (process.env.NODE_WEBSOCKETS == "ws")
                {
                    const   WS = require("ws");

                    ws = new WS(url);

                    if (tools.supports(delegate,"open"))
                    {
                        ws.on("open",delegate.open);
                    }
                    if (tools.supports(delegate,"close"))
                    {
                        ws.on("close",delegate.close);
                    }
                    if (tools.supports(delegate,"error"))
                    {
                        ws.on("error",delegate.error);
                    }
                    if (tools.supports(delegate,"message"))
                    {
                        ws.on("message",delegate.message);
                    }
                }
                else
                {
                    var W3CWS = require("websocket").w3cwebsocket;

                    ws = new W3CWS(url);

                    if (this.supports(delegate,"open"))
                    {
                        ws.onopen = delegate.open;
                    }
                    if (this.supports(delegate,"close"))
                    {
                        ws.onclose = delegate.close;
                    }
                    if (this.supports(delegate,"error"))
                    {
                        ws.onerror = delegate.error;
                    }
                    if (this.supports(delegate,"message"))
                    {
                        ws.onmessage = delegate.message;
                    }
                }
            }
            else
            {
                ws = new WebSocket(url);

                if (this.supports(delegate,"open"))
                {
                    ws.onopen = delegate.open;
                }
                if (this.supports(delegate,"close"))
                {
                    ws.onclose = delegate.close;
                }
                if (this.supports(delegate,"error"))
                {
                    ws.onerror = delegate.error;
                }
                if (this.supports(delegate,"message"))
                {
                    ws.onmessage = delegate.message;
                }
            }

            return(ws);
        },

        createDataFromCsv:function(csv,options)
        {
            var opts = new Options(options);
            var data = [];
            var lines = csv.split("\n");
            var headers = null;
            var fields = null;
            var quotes = 0;
            var i = 0;
            var words;
            var field;
            var index;
            var prev;
            var word;
            var c;
            var s;
            var o;

            if (opts.hasOpt("fields"))
            {
                fields = opts.getOpt("fields");
            }
            else if (opts.getOpt("header",false))
            {
                s = lines[i].trim();
                headers = s.split(",");
                i++;
            }

            while (i < lines.length)
            {
                s = lines[i].trim();

                if (s.length == 0)
                {
                    i++;
                    continue;
                }

                words = [];
                word = "";

                for (var idx = 0; idx < s.length; idx++)
                {
                    c = s[idx];

                    if (c == ',')
                    {
                        if (quotes > 0)
                        {
                            word += c;
                        }
                        else
                        {
                            words.push(word);
                            word = "";
                        }
                    }
                    else if (c == '\"')
                    {
                        if (prev == '\\')
                        {
                            word += c;
                        }
                        else
                        {
                            quotes ^= 1;
                        }
                    }
                    else if (c == '\\')
                    {
                        if (prev == '\\')
                        {
                            word += c;
                        }
                    }
                    else
                    {
                        word += c;
                    }

                    prev = c;
                }

                if (word.length > 0)
                {
                    words.push(word);
                }

                if (fields != null)
                {
                    o = {};

                    for (var j = 0; j < words.length; j++)
                    {
                        if (fields.hasOwnProperty(j))
                        {
                            o[fields[j]] = words[j];
                        }
                    }
                }
                else if (headers != null)
                {
                    o = {};

                    for (var j = 0; j < words.length; j++)
                    {
                        o[headers[j]] = words[j];
                    }
                }
                else
                {
                    o = words;
                }

                data.push(o);

                i++;
            }

            return(data);
        },

        formatDate:function(date,format)
        {
            var field;
            var s;
            var c;

            s = "";

            for (var i = 0; i < format.length; i++)
            {
                c = format[i];

                if (c == '%')
                {
                    if (i < (format.length - 1))
                    {
                        i++;
                        field = format[i];

                        if (field == 'm')
                        {
                            s += date.getUTCMonth();
                        }
                        else if (field == 'd' || field == 'e')
                        {
                            s += date.getUTCDate();
                        }
                        else if (field == 'Y')
                        {
                            s += date.getFullYear();
                        }
                        else if (field == '%')
                        {
                            s += '%';
                        }
                    }
                }
                else
                {
                    s += c;
                }
            }

            return(s);
        },

        b64Encode:function(s)
        {
            var value = null;

            if (_isNode)
            {
                value = Buffer.from(s).toString("base64");
            }
            else
            {
                value = btoa(s);
            }

            return(value);
        },

        b64Decode:function(s)
        {
            var value = null;

            if (_isNode)
            {
                value = Buffer.from(s,"base64");
            }
            else
            {
                value = atob(s);
            }

            return(value);
        },

        stringify:function(o)
        {
            var tmp = JSON.parse(JSON.stringify(o,(key,value) =>
            typeof value === "bigint" ? value.toString() : value
            ));
            return(JSON.stringify(tmp,null,"    "));
        },

        createCommandLineOpts:function()
        {
            var opts = new Options();
            var key = null;
            var s;

            for (var i = 2; i < process.argv.length; i++)
            {
                s = process.argv[i];

                if (s[0] == '-')
                {
                    if (key != null)
                    {
                        opts.setOpt(key,true);
                    }

                    key = s.substr(1);
                }
                else if (key != null)
                {
                    opts.setOpt(key,this.createValue(s));
                    key = null;
                }
            }

            if (key != null)
            {
                opts.setOpt(key,true);
            }

            return(opts);
        },

        createValue:function(s)
        {
            var value = s;

            if (s.indexOf("[") == 0 && s.lastIndexOf("]") == (s.length - 1))
            {
                s = s.substr(1,s.length - 2);
                s = s.split(",");
                value = s;
            }
            else if (s.indexOf("{") == 0 && s.lastIndexOf("}") == (s.length - 1))
            {
                value = JSON.parse(s);
            }
            else if (s == "true")
            {
                value = true;
            }
            else if (s == "false")
            {
                value = false;
            }

            return(value);
        },

        getBorders:function(element,includePadding)
        {
            var o = {left:0,top:0,right:0,bottom:0};

            Object.defineProperty(o,"hsize", {
                get() {
                    return(this.left + this.right);
                }
            });

            Object.defineProperty(o,"vsize", {
                get() {
                    return(this.top + this.bottom);
                }
            });

            if (element == null || element.style.display == "none")
            {
                return(o);
            }

            var style = window.getComputedStyle(element,null);

            o.left = parseInt(style.getPropertyValue('border-left-width'));
            o.top = parseInt(style.getPropertyValue('border-top-width'));
            o.right = parseInt(style.getPropertyValue('border-right-width'));
            o.bottom = parseInt(style.getPropertyValue('border-bottom-width'));

            if (includePadding)
            {
                o.left += parseInt(style.getPropertyValue('padding-left'));
                o.top += parseInt(style.getPropertyValue('padding-top'));
                o.right += parseInt(style.getPropertyValue('padding-right'));
                o.bottom += parseInt(style.getPropertyValue('padding-bottom'));
            }

            if (isNaN(o.left))
            {
                o.left = 0;
            }
            if (isNaN(o.top))
            {
                o.top = 0;
            }
            if (isNaN(o.right))
            {
                o.right = 0;
            }
            if (isNaN(o.bottom))
            {
                o.bottom = 0;
            }

            return(o);
        },

        getMargins:function(element)
        {
            var margins = {left:0,top:0,right:0,bottom:0};

            if (element == null || element.style.display == "none")
            {
                return(margins);
            }

            var style = window.getComputedStyle(element,null);

            margins.left = parseInt(style['marginLeft']);
            margins.top = parseInt(style['marginTop']);
            margins.right = parseInt(style['marginRight']);
            margins.bottom = parseInt(style['marginBottom']);

            if (isNaN(margins.left))
            {
                margins.left = 0;
            }
            if (isNaN(margins.top))
            {
                margins.top = 0;
            }
            if (isNaN(margins.right))
            {
                margins.right = 0;
            }
            if (isNaN(margins.bottom))
            {
                margins.bottom = 0;
            }

            return(margins);
        },

        getPadding:function(element)
        {
            var o = {left:0,top:0,right:0,bottom:0};

            Object.defineProperty(o,"hsize", {
                get() {
                    return(this.left + this.right);
                }
            });

            Object.defineProperty(o,"vsize", {
                get() {
                    return(this.top + this.bottom);
                }
            });

            if (element == null || element.style.display == "none")
            {
                return(o);
            }

            var    style = window.getComputedStyle(element,null);

            o.left += parseInt(style.getPropertyValue('padding-left'));
            o.top += parseInt(style.getPropertyValue('padding-top'));
            o.right += parseInt(style.getPropertyValue('padding-right'));
            o.bottom += parseInt(style.getPropertyValue('padding-bottom'));

            return(o);
        },

        getOffset:function(element)
        {
            var offset = new Object();
            offset._x = 0;
            offset._y = 0;
            offset._parentX = -1;
            offset._parentY = -1;
            offset._width = 0;
            offset._height = 0;

            var e = element;

            if (element.firstChild != null)
            {
                if (element.firstChild.nodeType == 1)
                {
                    e = element.firstChild;
                }
            }

            while (e != null)
            {
                offset._x += e.offsetLeft;
                offset._y += e.offsetTop;

                if (offset._parentX == -1)
                {
                    offset._parentX = e.offsetLeft;
                    offset._parentY = e.offsetTop;
                }

                offset._x -= e.scrollLeft;
                offset._y -= e.scrollTop;

                e = e.offsetParent;
            }

            offset._width = element.offsetWidth;
            offset._height = element.offsetHeight;

            offset.right = function() {return(this._x + this._width);};
            offset.bottom = function() {return(this._y + this._height);};

            return(offset);
        },

        getCbState:function(label)
        {
            var element = (typeof(label) == "string") ? document.getElementById(label) : label;
            var code = false;

            if (element != null)
            {
                var cb = element.firstChild;

                if (cb.disabled == false)
                {
                    code = cb.checked;
                }
            }

            return(code);
        },

        setCbState:function(label,options)
        {
            var element = (typeof(label) == "string") ? document.getElementById(label) : label;
            var code = false;

            if (element != null)
            {
                var cb = element.firstChild;

                if (options.hasOwnProperty("checked"))
                {
                    cb.checked = options.checked;
                }

                if (options.hasOwnProperty("enabled"))
                {
                    if (options.enabled)
                    {
                        element.style.opacity = 1.0;
                        cb.disabled = false;
                        code = cb.checked;
                    }
                    else
                    {
                        element.style.opacity = .3;
                        cb.disabled = true;
                    }
                }
            }

            return(code);
        },

        setLinkState:function(link,enabled)
        {
            var a = (typeof(link) == "string") ? document.getElementById(link) : link;

            if (a != null)
            {
                if (a.hasOwnProperty("_enabled") == false)
                {
                    a._enabled = true;
                    a._href = a.href;
                }

                if (enabled)
                {
                    a.href = a._href;
                    a.style.opacity = 1.0;
                    a.style.cursor = "pointer";
                }
                else
                {
                    a.href = "#";
                    a.style.opacity = 0.3;
                    a.style.cursor = "default";
                }
            }

            return(enabled);
        },

        exception:function(message)
        {
            if (_isNode)
            {
                throw new Error(message);
            }
            else
            {
                throw(message);
            }
        }
    };

    String.prototype.splitNoSpaces = function()
    {
         return(this.split(" ").filter(function(i){return i}));
     };

    return(__tools);
});
