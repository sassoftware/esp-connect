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
import {default as yaml} from "yaml";
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

var _k8s = null;

if (opts.hasOpt("kubeconfig"))
{
    var filename = opts.getOpt("kubeconfig");

    if (filename == true)
    {
        filename = process.env.KUBECONFIG;
    }

    if (filename.length > 0)
    {
        const   data = fs.readFileSync(filename,"utf-8");

        _k8s = yaml.parse(data);

        console.log("K8S Cluster Server is " + _k8s.clusters[0].cluster.server);
    }
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
        const   k8s = (url.protocol == "k8s:" && _k8s != null);

        if (k8s)
        {
            var tmp = _k8s.clusters[0].cluster.server;
            tmp += url.pathname + url.search;
            url = new URL(tmp);

            if (logging >= 1)
            {
                console.log("got K8S proxy request: " + url);
            }
        }
        else if (logging >= 1)
        {
            console.log("got proxy request: " + url);
        }

        var method = request.method.toLowerCase();
        var proxy = esp.getAjax().create(url);

        if (k8s)
        {
            const   user = _k8s.users[0].user;

            if (user.hasOwnProperty("client-certificate-data"))
            {
                proxy.setOption("cert",atob(user["client-certificate-data"]));
            }

            if (user.hasOwnProperty("client-key-data"))
            {
                proxy.setOption("key",atob(user["client-key-data"]));
            }
        }

        var s;

        for (var x in request.headers)
        {
            s = x.toLowerCase();

            if (logging >= 2)
            {
                console.log("received header: " + x + "=" + request.headers[x]);
            }

            if (s != "host" && 
                s != "origin" &&
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
    var options = {};
    var cert = opts.getOpt("cert","server.pem");
    var a = cert.split(".");
    var suffix = a[a.length - 1];

    if (suffix == "p12")
    {
        options.pfx = fs.readFileSync(cert);
    }
    else
    {
        options.key = fs.readFileSync(opts.getOpt("key",cert));
        options.cert = fs.readFileSync(cert);
    }

    server = https.createServer(options,handler);

    console.log("https server running on " + port);
}
else
{
    server = http.createServer(handler);
    console.log("http server running on " + port);
}

server.listen(port);

class WsProxy
{
    constructor(request)
    {
        this._client = request.accept(null,request.origin);
        this._client._ws = this;

        var self = this;

        this._client.on("message",function(data) {
            if (self._server != null)
            {
                if (data.type === "utf8")
                {
                    if (logging >= 2)
                    {
                        console.log("got UTF 8 data from client");
                    }

                    self._server.send(data.utf8Data);
                }
                else if (data.type === "binary")
                {
                    if (logging >= 2)
                    {
                        console.log("got binary data from client");
                    }

                    self._server.send(data.binaryData);
                }
            }
        });

        this._client.on("close",function() {
            console.log("lost client connection");

            if (self._server != null)
            {
                self._server.close();
                self._server = null;
            }

            self._client = null;
        });

        this._client.on("error",function(error) {
            console.log("client error: " + error);
        });

        var url = getProxyUrl(request.httpRequest);

        if (url != null)
        {
            self._server = null;

            esp.getTools().createWebSocket(url.toString(),this).then(
                function(result) {
                    self._server = result;
                    self._server._ws = self;
                },
                function(error) {
                    console.log("create websocket error: " + error);
                }
            );
        }
    }

    open(ws)
    {
    }

    close(ws)
    {
        console.log("lost server connection to " + ws.url);

        if (this._client != null)
        {
            this._client.close();
            this._client = null;
        }

        this._server = null;
    }

    error(ws)
    {
        console.log("ws error: " + ws);
    }

    message(ws,msg)
    {
        if (typeof(msg.data) == "string")
        {
            this._client.sendUTF(msg.data);
        }
        else if (msg.data instanceof ArrayBuffer)
        {
            this._client.sendBytes(esp.getTools().arrayBufferToBuffer(msg.data));
        }
        else if (msg.data instanceof Blob)
        {
            this._client.sendBytes(msg.binaryData);
        }
    }
}

var config = {
    maxReceivedFrameSize:5000000,
    httpServer:server,
    closeTimeout:0
};

var server = new websocket.server(config);
server.on("request",function(request) {

    if (logging >= 1)
    {
        console.log("websocket request: " + request.httpRequest.url);
    }

    new WsProxy(request);
});

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
            {name:"https-proxy",arg:"HTTPS proxy server",description:"HTTPS proxy server",required:false}
        ],
        show_auth:false,
        show_cert:false
    }

    esp.usage(usage);
}
