/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

/*
    This runs a NodeJS HTTP server.

    If you are running an HTTPS server, you can use the following commmand to create your key and
    certificate:

    openssl req -nodes -new -x509 -keyout server.key -out server.cert
*/

import {connect as esp} from "@sassoftware/esp-connect";

import {default as https} from "https";
import {default as http} from "http";
import {default as fs} from "fs";
import {default as nodestatic} from "node-static";
import {default as websocket} from "websocket";

var opts = esp.getArgs();

if (opts.hasOpt("port") == false)
{
    showUsage();
    process.exit(0);
}

if (opts.hasOpt("http-proxy"))
{
    var tmp = opts.getOpt("http-proxy");
    esp.setHttpProxy((tmp != "off") ? tmp : null);
}

if (opts.hasOpt("https-proxy"))
{
    var tmp = opts.getOpt("https-proxy");
    esp.setHttpsProxy((tmp != "off") ? tmp : null);
}

function
getProxyUrl(request)
{
    var url = null;

    try
    {
        var tmp = new URL(request.url,"http://${request.headers.host}");
        var pathname = tmp.pathname.substr(1) + tmp.search;

        url = new URL(pathname);
    }
    catch (e)
    {
    }

    return(url);
}

var port = opts.getOpt("port",4444);
var logging = opts.getOpt("logging",0);
var server = null;

var fileserver = new(nodestatic.Server)(process.cwd());

var handler = function(request,response)
{
    if (logging >= 1)
    {
        console.log("http request: " + request.url);
    }

    var url = getProxyUrl(request);

    if (url != null)
    {
        if (logging >= 1)
        {
            console.log("got proxy request: " + url);
        }

        var method = request.method.toLowerCase();
        var proxy = esp.getAjax().create(url);
        var s;

        for (var x in request.headers)
        {
            s = x.toLowerCase();

            if (s != "host" &&
                s != "accept-encoding")
            {
                proxy.setRequestHeader(x,request.headers[x]);
            }
        }

        if (method == "post" || method == "put")
        {
            var data = "";

            request.on("data", function(chunk) {
                data += chunk;
            });

            request.on("end", function() {
                if (logging >= 2)
                {
                    console.log("set data: " + data);
                }
                proxy.setData(data);
                proxy.send(method).then(
                    function(result) {
                        if (logging >= 2)
                        {
                            console.log("status is: " + result.status);
                            console.log("response: " + result.text);
                        }
                        response.writeHead(result.status);
                        response.write(result.text);
                        response.end();
                    },
                    function(result) {
                        console.log(proxy._options);
                        console.log("error: " + result.error.toString());

                        response.writeHead(500);
                        response.write(result.error.toString());
                        response.end();
                    }
                );
            });
        }
        else
        {
            proxy.send(method).then(
                function(result) {
                    if (logging >= 2)
                    {
                        console.log("status is: " + result.status);
                        console.log("response: " + result.text);
                    }
                    response.writeHead(result.status);
                    response.write(result.text);
                    response.end();
                },
                function(result) {
                    console.log(proxy._options);
                    console.log("error: " + result.error.toString());

                    response.writeHead(500);
                    response.write(result.error.toString());
                    response.end();
                }
            );
        }
    }
    else
    {
        fileserver.serve(request,response);
    }
}

if (opts.getOpt("secure",false))
{
    var cert = opts.getOpt("cert","server.pem");
    var key = opts.getOpt("key",cert);

    const options = {
      key:fs.readFileSync(key),
      cert:fs.readFileSync(cert)
    };

    server = https.createServer(options,handler);

    console.log("https server running on " + port);
}
else
{
    server = http.createServer(handler);
    console.log("http server running on " + port);
}

server.listen(port);

if (opts.getOpt("wsproxy",false))
{
    class Ws
    {
        constructor(request)
        {
            this._connection = request.accept(null,request.origin);
            this._connection._ws = this;

            var self = this;

            this._connection.on("message",function(message) {
                if (self._websocket != null)
                {
                    if (message.type === "utf8")
                    {
                        self._websocket.send(message.utf8Data);
                    }
                    else if (message.type === "binary")
                    {
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

            var url = getProxyUrl(request.httpRequest);

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

        error(e)
        {
            console.log("ws error: " + this._ws._connection);
        }

        message(msg)
        {
            if (typeof(msg.data) == "string")
            {
                this._ws._connection.sendUTF(msg.data);
            }
            else if (msg.data instanceof ArrayBuffer)
            {
                this._ws._connection.sendBytes(esp.getTools().arrayBufferToBuffer(msg.data));
            }
            else if (msg.data instanceof Blob)
            {
                this._ws._connection.sendBytes(msg.binaryData);
            }
        }
    }

    var config = {
        httpServer:server,
        closeTimeout:0
    };

    var server = new websocket.server(config);
    server.on("request",function(request) {

        if (logging >= 1)
        {
            console.log("websocket request: " + request.httpRequest.url);
        }

        new Ws(request);
    });
}

function
showUsage()
{
    const   usage = {
        name:"http",
        summary:"NodeJS HTTP Server",
        description:"NodeJS HTTP Server",
        options:[
            {name:"port",arg:"HTTP port",description:"HTTP port",required:true},
            {name:"http-proxy",arg:"HTTP proxy server",description:"HTTP proxy server",required:false},
            {name:"https-proxy",arg:"HTTPS proxy server",description:"HTTPS proxy server",required:false},
            {name:"wsproxy",arg:"true | false",description:"Run websocket proxy server, defaults to false",required:false}
        ],
        show_auth:false,
        show_cert:false
    }

    esp.usage(usage);
}
