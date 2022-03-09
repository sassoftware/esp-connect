/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var _isNode = false;

if (typeof process === "object")
{
    if (process.hasOwnProperty("versions"))
    {
        if (process.versions.hasOwnProperty("node"))
        {
            _isNode = true;
        }
    }
}

var W3CWS = null;
var TUNNEL = null;

var http_proxy = null;
var https_proxy = null;
var no_proxy = null;

if (_isNode)
{
    if (process.env.http_proxy != null)
    {
        http_proxy = new URL(process.env.http_proxy);
    }

    if (process.env.https_proxy != null)
    {
        https_proxy = new URL(process.env.https_proxy);
    }

    if (process.env.NO_PROXY != null)
    {
        no_proxy = [];

        var tmp = process.env.NO_PROXY.split(",");

        for (var s of tmp)
        {
            no_proxy.push(s.trim());
        }
    }
}

import {Options} from "./options.js";

class Range
{
    constructor(lower,upper,num)
    {
        this._a = [];

        this._lower = parseFloat(lower) - .01;
        this._upper = parseFloat(upper) + .01;
        this._num = parseFloat(num);

        this._interval = (this._upper - this._lower) / this._num;

        var value = new Number(this._lower);

        for (var i = 0; i < (this._num + 1); i++)
        {
            this._a.push(value);
            value += this._interval;
        }

        //this._a.push(value);
    }

    get lower()
    {
        return(this._lower);
    }

    get upper()
    {
        return(this._upper);
    }

    get interval()
    {
        return(this._interval);
    }

    get length()
    {
        return(this._a.length);
    }

    index(value)
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

    createSteps(colors)
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

    toString()
    {
        return(JSON.stringify(this._a));
    }
}

class Timer
{
    constructor()
    {
        this._items = [];
        this._running = false;
    }

    add(item)
    {
        if (_api.supports(item,"run") == false)
        {
            _api.exception("The timer entry must implement the run method");
        }

        if (_api.supports(item,"getInterval") == false)
        {
            _api.exception("The timer entry must implement the getInterval method");
        }

        Object.defineProperty(item,"fired", {
            get() {
                return(this._fired);
            },
            set(value) {
                this._fired = value;
            }
        });

        item._fired = 0;

        this._items.push(item);
    }

    start()
    {
        this._running = true;
        var timer = this;
        setTimeout(function(){timer.run()},1000);
    }

    stop()
    {
        this._running = false;
    }

    run()
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
}

var _api =
{
    s4:function()
    {
        return(((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); 
    },

    guid:function()
    {
        var guid = (this.s4() + this.s4() + "-" + this.s4() + "-4" + this.s4().substr(0,3) + "-" + this.s4() + "-" + this.s4() + this.s4() + this.s4()).toLowerCase();
        return(guid);
    },

    supports:function(o,f)
    {
        return(o != null && (f in o) && typeof(o[f]) == "function");
    },

    anySupports:function(o,f)
    {
        var result = null;

        if (o != null)
        {
            if (Array.isArray(o))
            {
                for (var entry of o)
                {
                    if (this.supports(entry,f))
                    {
                        result = entry;
                        break;
                    }
                }
            }
            else if (this.supports(o,f))
            {
                result = o;
            }
        }

        return(result);
    },

    contains:function(list,o)
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

    indexOf:function(list,o)
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

    addTo:function(list,o)
    {
        if (this.contains(list,o) == false)
        {
            list.push(o);
            return(true);
        }

        return(false);
    },

    setItem:function(list,o)
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

    removeFrom:function(list,o)
    {
        var index = this.indexOf(list,o);

        if (index >= 0)
        {
            list.splice(index,1);
            return(true);
        }

        return(false);
    },

    createRange:function(lower,upper,num)
    {
        return(new Range(lower,upper,num));
    },

    createTimer:function()
    {
        return(new Timer());
    },

    createFunction:function(text,options)
    {
        var f = null;
        var index = text.indexOf("function");

        if (index != -1)
        {
            var start = text.indexOf("(",index);
            var end = text.indexOf(")",start);
            var s = text.substring(start + 1,end);
            var parms = s.split(",");

            start = text.indexOf("{",end + 1);

            if (start != -1)
            {
                end = -1;

                start++;

                var count = 1;

                for (var i = start; i < text.length; i++)
                {
                    if (text[i] == '}')
                    {
                        count--;
                        if (count == 0)
                        {
                            end = i;
                            break;
                        }
                    }
                    else if (text[i] == '{')
                    {
                        count++;
                    }
                }

                if (end != -1)
                {
                    var code = text.substring(start,end);
                    f = new Function(parms,code);
                }
            }
        }

        return(f);
    },

    createUrl:function(url)
    {
        var u = {};
        var base = null;
        var o = _isNode ? new URL(url) : new URL(url,document.URL);

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
        u["searchParams"] = o.searchParams;

        u.toString = function()
        {
            return(this.protocol + "//" + this.host + ":" + this.port + this.path);
        }

        return(u);
    },

    reverse:function(list)
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

    arrayBufferToBuffer:function(ab)
    {
        var buf = new Buffer(ab.byteLength);
        var view = new Uint8Array(ab);

        for (var i = 0; i < buf.length; i++)
        {
                buf[i] = view[i];
        }

        return(buf);
    },

    bufferToArrayBuffer:function(buf)
    {
        var out = new ArrayBuffer(buf.length);
        var dv = new Uint8Array(out);
        for (var i = 0; i < buf.length; i++)
        {
            dv[i] = buf[i];
        }
        return(out);
    },

    stringFromBytes:function(bytes)
    {
        var s = "";

        bytes.forEach((b) => {
            s += String.fromCharCode(b);
        });

        return(s);
    },

    stringFromArrayBuffer:function(buf)
    {
        var s = "";
        var dv = new DataView(buf);

        for (var i = 0; i < buf.byteLength; i++)
        {
            s += String.fromCharCode(dv.getUint8(i));
        }

        return(s);
    },

    bytesFromString:function(s)
    {
        var bytes = [];

        for (var i = 0; i < s.length; i++)
        {
            bytes.push(s.charCodeAt(i));
        }

        return(bytes);
    },

    createWebSocket:function(url,delegate)
    {
        return(new Promise((resolve,reject) => {
            var ws = null;

            if (_isNode)
            {
                const   self = this;

                var ws = function() {

                    function
                    WebSocketClient(url)
                    {
                        this._conn = self;
                        this.binaryType = "arraybuffer";
                        var config = {};
                        config.tlsOptions = (this._conn._config != null) ? this._conn._config : {};

                        var u = new URL(url);
                        var secure = (u.protocol.toLowerCase() == "wss:");

                        var proxyHost = null;
                        var proxyPort = 80;

                        if (secure)
                        {
                            if (https_proxy != null)
                            {
                                proxyHost = https_proxy.hostname;
                                proxyPort = https_proxy.port;
                            }
                        }
                        else if (http_proxy != null)
                        {
                            proxyHost = http_proxy.hostname;
                            proxyPort = http_proxy.port;
                        }

                        var options = null;

                        if (proxyHost != null)
                        {
                            var agent = null;

                            if (secure)
                            {
                                agent = TUNNEL.httpsOverHttp({
                                  proxy: {
                                    host: proxyHost,
                                    port: proxyPort
                                  }
                                });
                            }
                            else
                            {
                                agent = TUNNEL.httpOverHttp({
                                  proxy: {
                                    host: proxyHost,
                                    port: proxyPort
                                  }
                                });
                            }

                            options = {};
                            options.agent = agent;
                        }

                        W3CWS.call(this,url,null,null,null,options,config);
                    }

                    WebSocketClient.prototype = Object.create(W3CWS.prototype);
                    WebSocketClient.prototype.constructor = WebSocketClient;

                    var ws = new WebSocketClient(url,this);

                    if (self.supports(delegate,"open"))
                    {
                        ws.onopen = delegate.open;
                    }
                    if (self.supports(delegate,"close"))
                    {
                        ws.onclose = delegate.close;
                    }
                    if (self.supports(delegate,"error"))
                    {
                        ws.onerror = delegate.error;
                    }
                    if (self.supports(delegate,"message"))
                    {
                        ws.onmessage = delegate.message;
                    }

                    resolve(ws);
                }

                var checkProxy = function() {
                    if (http_proxy != null)
                    {
                        if (TUNNEL == null)
                        {
                            import("tunnel").then(
                                function(result) {
                                    TUNNEL = result.default;
                                    ws();
                                }
                            );
                        }
                        else
                        {
                            ws();
                        }
                    }
                    else
                    {
                        ws();
                    }
                }

                if (W3CWS == null)
                {
                    import("websocket").then(
                        function(result) {
                            W3CWS = result.default.w3cwebsocket;
                            checkProxy();
                        }).
                        catch((e) => {
                            console.log("import error on websocket: " + e);
                        });
                }
                else
                {
                    checkProxy();
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

                resolve(ws);
            }
        }));
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

    btoa:function(s)
    {
        var value = encodeURIComponent(s).replace(/%([0-9A-F]{2})/g,
            function(match,p) {
                return(String.fromCharCode("0x" + p));
            }
        );

        return(btoa(value));
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
            value = this.btoa(s);
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
        var end = null;
        var s;

        for (var i = 2; i < process.argv.length; i++)
        {
            s = process.argv[i];

            if (end != null)
            {
                if (end.length > 0)
                {
                    end += " ";
                }
                end += s;
            }
            else if (s == '--')
            {
                end = "";
                continue;
            }
            else if (s.startsWith("--"))
            {
                if (key != null)
                {
                    opts.setOpt(key,true);
                }

                key = s.substr(2);
            }
            else if (key != null)
            {
                opts.setOpt(key,this.createValue(s));
                key = null;
            }
        }

        if (end != null)
        {
            opts.setOpt("_end",end);
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

    build(o,fields)
    {
        var current = o;

        fields.forEach((f) => {
            if (current.hasOwnProperty(f) == false)
            {
                current[f] = {};
                current = current[f];
            }
        });
    },

    exception:function(message)
    {
        var text = (typeof(message) == "string") ? message : this.stringify(message);

        if (_isNode)
        {
            throw new Error(text);
        }
        else
        {
            throw(text);
        }
    },

    readfile:function(path)
    {
        return(new Promise((resolve,reject) => {
            import("fs").then(
                function(result) {
                    const   fs = result.default;
                    const   contents = fs.readFileSync(path);
                    resolve(contents);
                }
            );
        }));
    },

    tokens:function(s,values)
    {
        for (var x in values)
        {
            s = s.replaceAll("@" + x + "@",values[x]);
        }
        
        return(s);
    },

    getHttpProxy:function()
    {
        return(http_proxy);
    },

    setHttpProxy:function(value)
    {
        http_proxy = (value != null) ? new URL(value) : null;
    },

    getHttpsProxy:function()
    {
        return(https_proxy);
    },

    setHttpsProxy:function(value)
    {
        https_proxy = (value != null) ? new URL(value) : null;
    },

    getNoProxy:function()
    {
        return(no_proxy);
    },

    setNoProxy:function(value)
    {
        no_proxy = value;
    },

    isNoProxy:function(hostname)
    {
        var code = (hostname == "localhost");

        if (code == false && no_proxy != null)
        {
            code = _api.contains(no_proxy,hostname);
        }

        return(code);
    }
};

String.prototype.splitNoSpaces =
function()
{
    return(this.split(" ").filter(function(i){return i}));
};

String.prototype.equalsIgnoreCase =
function(s)
{
    return(this.toLowerCase() == s.toLowerCase());
};

String.prototype.pad =
function(length,c)
{
    var s = "";

    for (var i = 0; i < length - this.length; i++)
    {
        s += c;
    }

    s += this;

    return(s);
};

Object.defineProperty(_api,"isNode", {
    get(){
        return(_isNode);
    }
});

export {_api as tools};
