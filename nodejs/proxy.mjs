/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

/*
    This runs a NodeJS Proxy server.
*/

import {connect as esp} from "@sassoftware/esp-connect";

import {default as websocket} from "websocket";
import {default as tunnel} from "tunnel";
import {default as http} from "http";

var opts = esp.getArgs();

if (opts.hasOpt("http") == false && opts.hasOpt("ws") == false)
{
    showUsage();
    process.exit(0);
}

var https_proxy = (process.env.https_proxy != null) ? new URL(process.env.https_proxy) : null
var http_proxy = (process.env.http_proxy != null) ? new URL(process.env.http_proxy) : null

function
getUrl(request)
{
    var tmp = new URL(request.url,"http://${request.headers.host}");
    var pathname = tmp.pathname.substr(1) + tmp.search;
    var url = new URL(pathname);
    return(url);
}

if (opts.hasOpt("http"))
{
    var port = opts.getOpt("http");

    var handler = function(request,response)
    {
        console.log("request: " + request.url);

        var url = getUrl(request);
        var a = url.host.split(":");

        var host = (a.length > 0) ? a[0] : null;
        var port = (a.length > 1) ? a[1] : 80;
        var path = url.pathname + url.search;

        var options = {
            hostname: host,
            port: port,
            path: path,
            method: "GET"
        };

        //options.agent = agent;

        console.log(JSON.stringify(options,null,"\t"));

        try
        {
            var proxy = http.request(options,function(res) {
                res.pipe(response,{end:true});
            });
            request.pipe(proxy,{end:true});
        }
        catch (e)
        {
            console.log("error: " + e);
        }
    }

    server = http.createServer(handler);
    console.log("HTTP proxy server running on " + port);

    var server = http.createServer(handler);
    server.listen(port);
}

class Ws
{
    constructor(request)
    {
        this._connection = request.accept(null,request.origin);
        this._connection._ws = this;

        var self = this;

        this._connection.on("message",function(message) {
            console.log("got message: " + self._websocket);
            if (self._websocket != null)
            {
                if (message.type === "utf8")
                {
                    console.log("Received Message: " + message.utf8Data);
                    self._websocket.send(message.utf8Data);
                }
                else if (message.type === "binary")
                {
                    console.log("Received Binary Message of " + message.binaryData.length + " bytes");
                    self._websocket.sendBytes(message.binaryData);
                }
            }
        });

        this._connection.on("close",function() {
            if (self._websocket != null)
            {
                self._websocket.close();
                self._websocket = null;
            }

            self._connection = null;
        });

        var url = getUrl(request.httpRequest);

        esp.getTools().createWebSocket(url.toString(),this).then(
            function(result) {
                self._websocket = result;
                self._websocket._ws = self;
            },
            function(error) {
                console.log("create websocket error: " + error);
            }
        );
    }

    open()
    {
    }

    close()
    {
        if (this._ws._connection != null)
        {
            this._ws._connection.close();
            this._ws._connection = null;
        }
        this._ws._websocket = null;
    }

    error()
    {
        console.log("ws error");
    }

    message(msg)
    {
        if (typeof(msg.data) == "string")
        {
            this._ws._connection.sendUTF(msg.data);
        }
        else
        {
            this._ws._connection.sendBytes(msg.binaryData);
        }
    }
}

if (opts.hasOpt("ws"))
{
    var server = null;
    var port = opts.getOpt("ws");

    var tmp = function(request,response)
    {
        console.log((new Date()) + " Received request for " + request.url);
        response.writeHead(404);
        response.end();
    }

    console.log("Websocket proxy server running on " + port);

    var httpserver = http.createServer(tmp);
    httpserver.listen(port);

    var config = {
        httpServer:httpserver,
        closeTimeout:0
    };

    var server = new websocket.server(config);
    server.on("request",function(request) {
        new Ws(request);
    });
}

function
showUsage()
{
    const   usage = {
        name:"proxy",
        summary:"NodeJS proxy",
        description:"NodeJS proxy",
        options:[
            {name:"http",arg:"Server HTTP port",description:"Server HTTP port",required:false},
            {name:"ws",arg:"Server Websocket port",description:"Server Websocket port",required:false}
        ],
        show_auth:false,
        show_cert:false
    }

    esp.usage(usage);
}
