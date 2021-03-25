/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {connect as esp} from "@sassoftware/esp-connect";
import {default as fs} from "fs";
import {default as url} from "url";

var opts = esp.getArgs();
var server = opts.getOpt("server");
var logfile = opts.getOpt("logfile");

if (server == null || logfile == null)
{
    showUsage();
    process.exit(0);
}

var _websockets = {};

import {default as ws} from "websocket";

function
SendRequestMgr(server,logfile)
{
    this._server = url.parse(server);
    this._logfile = logfile;

    this._wsId = new RegExp(".*: .* \\((.*)\\*(.*)\\*.*\\)");
    this._wsData = new RegExp(".*: \\((.*)\\*(.*)\\*.*\\*(ascii|binary)\\)");
    this._header = new RegExp("(.*): (.*)");

    this._request = null;
    this._ws = null;
    this._wsdata = null;

    this._timestamp = 0;

    this._fd = null;
    this._index = 0;
    this._buffer = Buffer.alloc(256);

    var mgr = this;

    this._fd = fs.openSync(this._logfile);
    this._line = "";
    this._lineNumber = 1;

    this._bytes = fs.readSync(this._fd,this._buffer,0,this._buffer.length,this._offset);
    this._offset = this._bytes;
    this._index = 0;

    if (opts.hasOpt("start"))
    {
        var start = opts.getOpt("start");

        for (var i = 0; i < start; i++)
        {
            this.getline();
        }
    }
}

SendRequestMgr.prototype.getline =
function()
{
    var c;

    for (;;)
    {
        if (this._index < this._bytes)
        {
            c = this._buffer[this._index];
            if (c == 10)
            {
                this._index++;
                break;
            }
            else if (c == 13)
            {
                this._index++;
                continue;
            }
            this._line += String.fromCharCode(c);
            this._index++;
        }
        else
        {
            if ((this._bytes = fs.readSync(this._fd,this._buffer,0,this._buffer.length,this._offset)) == 0)
            {
                break;
            }
            this._offset += this._bytes;
            this._index = 0;
        }
    }

    if (this._bytes == 0)
    {
        return(null);
    }

    this._lineNumber++;

    var line = this._line;
    this._line = "";
    return(line);
}

SendRequestMgr.prototype.run =
function()
{
    var request = this._request;

    this._request = null;

    if (request != null)
    {
        if (request._isWebSocket)
        {
            const   self = this;
            request.createWebSocket().then(
                function(result) {
                    self._ws = result;
                    setTimeout(function(){mgr.run()},100);
                },
                function(result) {
                }
            );
        }
        else
        {
            request.send();
        }
    }

    var line;
    var ws = null;

    while ((line = this.getline()) != null)
    {
//console.log(this._lineNumber + ": " + line);
        if (line == "-- start request --")
        {
            var request = new SendRequest(this);
            try
            {
                request.init();
            }
            catch (e)
            {
                continue;
            }
            this._request = request;
            break;
        }
        else if (line.indexOf("websocket start:") == 0)
        {
            if (this._ws != null)
            {
                var results = this._wsId.exec(line);
                if (results != null && results.length == 3)
                {
                    var id = results[1];
                    _websockets[id] = this._ws;
                    this._ws = null;
                }
            }
        }
        else if (line.indexOf("websocket end:") == 0)
        {
            var results = this._wsId.exec(line);
            if (results != null && results.length == 3)
            {
                var id = results[1];
                if (_websockets.hasOwnProperty(id))
                {
                    var ws = _websockets[id];
                    ws.close();
                    delete _websockets[id];
                }
            }
        }
        else if (line.indexOf("begin websocket data:") == 0)
        {
            var results = this._wsData.exec(line);
            if (results != null && results.length == 4)
            {
                var id = results[1];

                if (_websockets.hasOwnProperty(id))
                {
                    this._wsdata = {_websocket:_websockets[id],_timestamp:parseInt(results[2]),_type:results[3],_lineNumber:this._lineNumber,_data:""};
                    break;
                }
            }
        }
        else if (line.indexOf("end websocket data:") == 0)
        {
            if (this._wsdata != null)
            {
                if (opts.getOpt("debug",false))
                {
                    console.log("sending: " + this._wsdata._data);
                }

                if (this._wsdata._type == "binary")
                {
                    var data = esp.getTools().b64Decode(this._wsdata._data);
                    this._wsdata._websocket.send(data);
                }
                else
                {
                    this._wsdata._websocket.send(this._wsdata._data);
                }

                this._wsdata = null;
            }
        }
        else if (this._wsdata != null)
        {
            this._wsdata._data += line;
        }
    }

    if (this._request != null || this._wsdata != null)
    {
        var diff = 0;
        var lineNumber = 0;

        if (this._request != null)
        {
            diff = (this._timestamp > 0) ? (this._request._timestamp - this._timestamp) : 500;
            this._timestamp = this._request._timestamp;
            lineNumber = this._request._lineNumber;
        }
        else
        {
            diff = (this._timestamp > 0) ? (this._wsdata._timestamp - this._timestamp) : 500;
            this._timestamp = this._wsdata._timestamp;
            lineNumber = this._wsdata._lineNumber;
        }

        if (diff == 0)
        {
            diff = 1;
        }

        var maxwait = opts.getOpt("maxwait",-1);

        if (maxwait > 0 && diff > maxwait)
        {
            console.log("changing wait " + diff + " to " + maxwait);
            diff = maxwait;
        }

        console.log("waiting for " + diff + " milliseconds");

        var mgr = this;
        setTimeout(function(){mgr.run()},diff);
    }
}

function
SendRequest(mgr)
{
    this._mgr = mgr;
    this._headers = {method:"method: ",request:"request: ",timestamp:"timestamp: "};

    this._lineNumber = this._mgr._lineNumber;

    this._method = null;
    this._timestamp = null;
    this._request = null;

    this._headers = {};
    this._data = null;

    this._url = null;

    this._isWebSocket = false;
}

SendRequest.prototype.init =
function()
{
    var s = this._mgr.getline();
    var result = this._mgr._header.exec(s);

    if (result != null && result.length == 3)
    {
        this._method = result[2].toLowerCase();
    }

    s = this._mgr.getline();

    result = this._mgr._header.exec(s);

    if (result != null && result.length == 3)
    {
        this._request = result[2];
    }

    s = this._mgr.getline();

    result = this._mgr._header.exec(s);

    if (result != null && result.length == 3)
    {
        var a = result[2].split(" ");
        if (a.length > 0)
        {
            this._timestamp = parseInt(a[0]);
        }
    }

    if (this._method == null || this._request == null || this._timestamp == null)
    {
        throw("bad request: " + this._lineNumber);
        return(null);
    }

    this._url = new URL(this._request);
    this._url.hostname = this._mgr._server.hostname;
    this._url.port = this._mgr._server.port;

    if (this._url.protocol == "ws:" || this._url.protocol == "wss:")
    {
        this._isWebSocket = true;
    }
    else
    {
        var headers = {};
        var inHeaders = false;
        var s;

        while ((s = this._mgr.getline()) != null)
        {
            if (s == "-- start headers --")
            {
                inHeaders = true;
            }
            else if (s == "-- end headers --")
            {
                break;
            }
            else if (inHeaders)
            {
                var result = this._mgr._header.exec(s);
                if (result != null && result.length == 3)
                {
                    headers[result[1]] = result[2];
                }
            }
        }

        if (this._method == "put" || this._method == "post")
        {
            while ((s = this._mgr.getline()) != null)
            {
                if (s == "-- start data --")
                {
                    inData = true;
                }
                else if (s == "-- end data --")
                {
                    break;
                }
                else if (inData)
                {
                    if (this._data == null)
                    {
                        this._data = s;
                    }
                    else
                    {
                        this._data += s;
                    }
                }
            }
        }
    }
}

SendRequest.prototype.send =
function()
{
    if (this._url == null)
    {
        console.log("invalid request: " + this._request + " (" + this._lineNumber + ")");
        return;
    }

    var request = esp.getAjax().create("request",this._url.toString(),this);

    request.setRequestHeaders(this._headers);

    console.log("sending request " + this._url.toString());

    if (this._method == "put" || this._method == "post")
    {
        if (this._data != null)
        {
            request.setData(this._data);
        }

        if (this._method == "put")
        {
            request.put();
        }
        else
        {
            request.post();
        }
    }
    else if (this._method == "delete")
    {
        request.del();
    }
    else
    {
        request.get();
    }
}

SendRequest.prototype.createWebSocket =
function()
{
    return(new Promise((resolve,reject) => {
        const   self = this;
        const   delegate = {open:wsOpen,close:wsClose,error:wsError,message:wsText};
        esp.createWebSocket(this._url.toString(),delegate).then(
            function(result) {
                result._handler = new WebsocketHandler(self);
                resolve(result);
            },
            function(result) {
                reject(result);
            }
        );
    }));
}

SendRequest.prototype.response =
function(request,content)
{
    if (opts.getOpt("responses",false))
    {
        console.log(content);
    }
    else
    {
        console.log(this._url.toString() + " : " + request.getStatus());
    }
}

SendRequest.prototype.error =
function(request,error)
{
    console.log(error);
}

function
WebsocketHandler(request)
{
    this._request = request;
    this._handshakeComplete = false;
}

WebsocketHandler.prototype.open =
function()
{
    console.log("open: " + this._request._url.toString());
}

WebsocketHandler.prototype.close =
function()
{
    console.log("close: " + this._request._url.toString());
}

WebsocketHandler.prototype.error =
function()
{
    console.log("error: " + this._request._url.toString());
}

WebsocketHandler.prototype.message =
function(message)
{
    if (opts.getOpt("responses",false))
    {
        console.log("message: " + this._request._url.toString());

        if (typeof(message) == "string")
        {
            console.log(message);
        }
        else
        {
            var buffer = new ArrayBuffer(message.length);
            var view = new Uint8Array(buffer);
            for (var i = 0; i < message.length; ++i)
            {
               view[i] = message[i];
            }

            var o = esp.decode(buffer);
            console.log(esp.getTools().stringify(o));
        }
    }
}

var mgr = new SendRequestMgr(server,logfile);
mgr.run();

function
wsOpen()
{
    this._handler.open();
}

function
wsClose()
{
    this._handler.close();
}

function
wsError()
{
    this._handler.error();
}

function
wsText(message)
{
    this._handler.message(message);
}

function
showUsage()
{
    const   usage = {
        name:"playback",
        summary:"Playback ESP requests from the server log",
        description:"Playback ESP requests from the server log",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"logfile",arg:"filename",description:"file containing ESP server log",required:true},
            {name:"start",arg:"line number",description:"name of the ESP router"},
            {name:"responses",arg:"true | false",description:"output the responses to the console"},
            {name:"maxwait",arg:"milliseconds",description:"the maximum number of milliseconds to wait before sending requests"}
        ],
        show_auth:false,
        show_cert:false
    }

    esp.usage(usage);
}
