/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {ServerConnection} from "./serverconn.js";
import {tools} from "./tools.js";
import {ajax} from "./ajax.js";
import {xpath} from "./xpath.js";
import {Options} from "./options.js";

class K8S
{
    constructor(url)
    {
        this._url = tools.createUrl(decodeURI(url));
        this._proxy = false;

        if (this._url.protocol.indexOf("-") != -1)
        {
            var a = this._url.protocol.split("-");

            if (a[1] != "proxy:")
            {
                tools.exception("invalid protocol: " + this._url.protocol);
            }

            this._url.protocol = a[0] + ":";
            this._proxy = true;
        }

        this._ns = null;
        this._project = null;
        this._pod = null;
        this._saslogon = null;
        this._secret = null;

        var a = (this._url.path != null) ? this._url.path.substr(1).split("/") : [];

        if (a.length > 0)
        {
            if (a[0].length > 0)
            {
                this._ns = a[0];

                if (a.length > 1 && a[1].length > 0)
                {
                    this._project = a[1];
                }
            }
        }

        Object.defineProperty(this,"k8sProtocol", {
            get() {
                var protocol = "k8s";

                if (this._proxy != null)
                {
                    protocol += "-proxy";
                }

                protocol += ":";

                return(protocol);
            }
        });

        Object.defineProperty(this,"httpProtocol", {
            get() {
                var protocol = "";

                if (this._proxy)
                {
                    protocol = "http:";
                }
                else if (this._url.protocol == "k8s:" || this._url.protocol == "https:")
                {
                    protocol = "https:";
                }
                else
                {
                    protocol = "http:";
                }

                return(protocol);
            }
        });

        Object.defineProperty(this,"wsProtocol", {
            get() {
                var protocol = "";

                if (this._proxy)
                {
                    protocol = "ws:";
                }
                else if (this._url.protocol == "k8s:" || this._url.protocol == "https:")
                {
                    protocol = "wss:";
                }
                else
                {
                    protocol = "ws:";
                }

                return(protocol);
            }
        });

        Object.defineProperty(this,"baseUrl", {
            get() {
                var s = this.httpProtocol + "//" + this.host + ":" + this.port + "/";
                return(s);
            }
        });

        Object.defineProperty(this,"baseWsUrl", {
            get() {
                var s = this.wsProtocol + "//" + this.host + ":" + this.port + "/";
                return(s);
            }
        });

        Object.defineProperty(this,"protocol", {
            get() {
                return(this._url.protocol);
            }
        });

        Object.defineProperty(this,"host", {
            get() {
                return(this._url.host);
            }
        });

        Object.defineProperty(this,"port", {
            get() {
                return(this._url.port);
            }
        });

        Object.defineProperty(this,"path", {
            get() {
                return(this._url.path);
            }
        });

        Object.defineProperty(this,"url", {
            get() {
                var url = this.baseUrl;
                url += "apis/iot.sas.com/v1alpha1";
                return(url);
            }
        });

        Object.defineProperty(this,"httpUrl", {
            get() {
                var url = "";

                if (this._url.protocol == "k8s:" || this._url.protocol == "https:")
                {
                    url += "https";
                }
                else
                {
                    url += "http";
                }

                if (this._proxy != null)
                {
                    url += "-proxy";
                }

                url += "://";
                url += this.host;
                url += ":";
                url += this.port;

                return(url);
            }
        });

        Object.defineProperty(this,"k8sUrl", {
            get() {
                return(this.k8sProtocol + "//" + this.host + ":" + this.port);
            }
        });

        Object.defineProperty(this,"namespaceUrl", {
            get() {
                if (this.namespace == null)
                {
                    return(null);
                }
                return(this.k8sUrl + "/" + this.namespace);
            }
        });

        Object.defineProperty(this,"projectUrl", {
            get() {
                if (this.namespace == null || this.project == null)
                {
                    return(null);
                }
                return(this.k8sUrl + "/" + this.namespace + "/" + this.project);
            }
        });

        Object.defineProperty(this,"namespace", {
            get() {
                return(this._ns);
            }
        });

        Object.defineProperty(this,"project", {
            get() {
                return(this._project);
            }
        });

        Object.defineProperty(this,"pod", {
            get() {
                return(this._pod);
            }
        });
    }

    getMyProjects(delegate)
    {
        return(this.getProjects(delegate,this.namespace,this.project));
    }

    getProjects(delegate,namespace,name)
    {
        if (tools.supports(delegate,"handleProjects") == false)
        {
            tools.exception("the delegate must implement the handleProjects function");
        }

        var url = this.url;

        if (namespace != null)
        {
            url += "/namespaces/" + namespace;
        }

        url += "/espservers";

        if (name != null)
        {
            url += "/" + name;
        }

        var k8s = this;
        var o = {
            response:function(request,text) {

                if (request.getStatus() == 404)
                {
                    if (tools.supports(delegate,"notFound"))
                    {
                        delegate.notFound(request,"not found");
                    }
                    else
                    {
                        tools.exception("error: not found");
                    }

                    return;
                }

                var data = JSON.parse(text);

                if (data.code == 404)
                {
                    var s = "";
                    if (k8s._ns != null)
                    {
                        s += k8s._ns + "/";
                    }
                    s += k8s._project;

                    if (tools.supports(delegate,"notFound"))
                    {
                        delegate.notFound(s);
                    }
                    else
                    {
                        tools.exception("project not found: " + s);
                    }
                }
                else
                {
                    var kind = data.kind;
                    var a = null;

                    if (kind == "ESPServer")
                    {
                        a = [data];
                    }
                    else if (kind == "ESPServerList")
                    {
                        a = data.items;
                    }

                    delegate.handleProjects(a);
                }
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(request,error);
                }
                else
                {
                    tools.exception("error: " + error);
                }
            }
        };
        var request = ajax.create("load",url,o);
		request.setRequestHeader("accept","application/json");
        request.get();
    }

    getProject(delegate,namespace,name)
    {
        if (tools.supports(delegate,"handleProject") == false)
        {
            tools.exception("the delegate must implement the handleProjects function");
        }

        if (namespace == null || name == null)
        {
            tools.exception("you must specify project namespace and name");
        }

        this.getProjects({
            handleProjects:function(projects)
            {
                delegate.handleProject(projects[0]);
            },
            notFound:function()
            {
                if (tools.supports(delegate,"notFound"))
                {
                    delegate.notFound();
                }
                else
                {
                    tools.exception("error: not found");
                }
            }
        },namespace,name);
    }

    getPods(delegate)
    {
        if (tools.supports(delegate,"handlePods") == false)
        {
            tools.exception("the delegate must implement the handlePods function");
        }

        var url = this.baseUrl;
        url += "api/v1";

        if (this._ns != null)
        {
            url += "/namespaces/" + this._ns;
        }

        url += "/pods";

        var k8s = this;

        var o = {
            response:function(request,text) {
                var data = JSON.parse(text);
                    var a = [];

                    if (k8s.project != null)
                    {
                        var match = k8s.project + "-";
                        for (var item of data.items)
                        {
                            if (item.metadata.name.startsWith(match))
                            {
                                a.push(item);
                                break;
                            }
                        }
                    }
                    else
                    {
                        a = data.items;
                    }

                    delegate.handlePods(a);
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(request,error);
                }
                else
                {
                    tools.exception("error: " + error);
                }
            }
        };

        var request = ajax.create("pods",url,o);
		request.setRequestHeader("accept","application/json");
        request.get();
    }

    getPod(delegate)
    {
        if (tools.supports(delegate,"handlePod") == false)
        {
            tools.exception("the delegate must implement the handlePod function");
        }

        if (this.namespace == null || this.project == null)
        {
            tools.exception("the instance requires both namespace and project name to get the pod");
        }

        this.getPods({
            handlePods:function(pods) {
                if (pods.length == 0)
                {
                    if (tools.supports(delegate,"notFound"))
                    {
                        delegate.notFound();
                    }
                }
                else
                {
//console.log(JSON.stringify(pods[0],null,2));
                    delegate.handlePod(pods[0]);
                }
            }
        });
    }

    getLog(delegate)
    {
        if (tools.supports(delegate,"handleLog") == false)
        {
            tools.exception("the delegate must implement the handleLog function");
        }

        if (this.namespace == null || this.project == null)
        {
            tools.exception("the instance requires both namespace and project name to get the pod");
        }

        var k8s = this;

        this.getPod({
            handlePod:function(pod)
            {
                var url = k8s.baseUrl;
                url += "api/v1";
                url += "/namespaces/" + k8s.namespace;
                url += "/pods/" + pod.metadata.name;
                url += "/log";

                ajax.create("log",url,{
                    response:function(request,text) {
                        var log = [];
                        var o;
                        text.split("\n").forEach((line) => {
                            if (line.length > 0)
                            {
                                try
                                {
                                    o = JSON.parse(line);
                                }
                                catch (exception)
                                {
                                    o = {};
                                    o.message = line;
                                }

                                log.push(o);
                            }
                        });;
                        delegate.handleLog(log);
                    },
                    error:function(request,error) {
                        if (tools.supports(delegate,"error"))
                        {
                            delegate.error(request,error);
                        }
                        else
                        {
                            tools.exception("error: " + error);
                        }
                    }
                }).get();
            }
        });
    }

    getAuthToken(delegate)
    {
        if (this._saslogon == null)
        {
            var k8s = this;

            this.getSecret({
                handleSecret:function(secret) {
                    var url = k8s.baseUrl;
                    url += "apis/networking.k8s.io/v1beta1";

                    if (k8s.namespace != null)
                    {
                        url += "/namespaces/" + k8s.namespace;
                    }
                    url += "/ingresses/sas-logon-app";

                    var o = {
                        response:function(request,text) {
                            var data = JSON.parse(text);
                            var saslogon = "https://";
                            saslogon += data.spec.tls[0].hosts[0];
                            saslogon += "/SASLogon/oauth/clients/consul";
                            saslogon += "?callback=false&serviceId=app";

                            var handler = {
                                response:function(request,text) {
                                    if (request.getStatus() >= 400)
                                    {
                                        console.log("token error: " + request.getStatus());
                                    }
                                    else
                                    {
                                        var o = JSON.parse(text);
                                        var token = o.access_token;
                                        delegate.handleToken(token);
                                    }
                                },
                                error:function(request,error) {
                                    console.log(error);
                                }
                            };
                            var request = ajax.create("token",saslogon,handler);
                            request.setRequestHeader("X-Consul-Token",secret);
                            request.post();
                        },
                        error:function(request,error) {
                            console.log(error);
                        }
                    }

                    var request = ajax.create("load",url,o);
                    request.get();
                }
            });
        }
    }

    getSecret(delegate)
    {
        if (tools.supports(delegate,"handleSecret") == false)
        {
            tools.exception("the delegate must implement the handleSecret function");
        }

        if (this._secret == null)
        {
            var url = this.baseUrl;
            url += "api/v1";

            if (this.namespace != null)
            {
                url += "/namespaces/" + this.namespace;
            }

            url += "/secrets/sas-consul-client";

            var k8s = this;
            var o = {
                response:function(request,text) {

                    if (request.getStatus() == 404)
                    {
                        if (tools.supports(delegate,"notFound"))
                        {
                            delegate.notFound(request,"not found");
                        }
                        else
                        {
                            tools.exception("error: not found");
                        }

                        return;
                    }

                    var data = JSON.parse(text);

                    if (data.code == 404)
                    {
                        var s = "";
                        if (k8s._ns != null)
                        {
                            s += k8s._ns + "/";
                        }
                        s += k8s._project;

                        if (tools.supports(delegate,"notFound"))
                        {
                            delegate.notFound(s);
                        }
                        else
                        {
                            tools.exception("project not found: " + s);
                        }
                    }
                    else
                    {
                        this._secret = Buffer.from(data.data.CONSUL_HTTP_TOKEN,"base64").toString();
                        delegate.handleSecret(this._secret);
                    }
                },
                error:function(request,error) {
                    if (tools.supports(delegate,"error"))
                    {
                        delegate.error(request,error);
                    }
                    else
                    {
                        tools.exception("error: " + error);
                    }
                }
            };
            var request = ajax.create("load",url,o);
            request.setRequestHeader("accept","application/json");
            request.get();
        }
        else
        {
            delegate.handleSecret(this._secret);
        }
    }

    ls(path,delegate)
    {
        if (tools.supports(delegate,"handleFiles") == false)
        {
            tools.exception("the delegate must implement the handleFiles function");
        }

        var handler = {
            out:function(ws,data) {
                var decoder = new TextDecoder();
                var s = decoder.decode(data);
                var lines = s.split("\n");
                var files = [];
                for (var line of lines)
                {
                    if (line.length == 0)
                    {
                        continue;
                    }

                    var type = line[0]; 

                    if (type != '-' && type != 'd')
                    {
                        continue;
                    }

                    line = line.substr(1);

                    var a = line.splitNoSpaces();
                    var file = new Options();
                    file.setOpt("name",a[8]);
                    file.setOpt("perms",a[0]);
                    file.setOpt("owner",a[2]);
                    file.setOpt("group",a[3]);
                    file.setOpt("size",a[4]);
                    file.setOpt("modified",a[5] + " " + a[6] + " " + a[7]);
                    file.setOpt("directory",((type == 'd') ? true : false));

                    files.push(file);
                }

                delegate.handleFiles(files);
            }
        }

        this.run(["ls","-l",path],handler);
    }

    cat(path,delegate)
    {
        if (tools.supports(delegate,"output") == false)
        {
            tools.exception("the delegate must implement the output function");
        }

        var handler = {
            out:function(ws,data) {
                var decoder = new TextDecoder();
                var s = decoder.decode(data);
                delegate.output(s);
            }
        }

        this.run(["cat",path],handler);
    }

    get(path,delegate)
    {
        if (tools.supports(delegate,"handleFile") == false)
        {
            tools.exception("the delegate must implement the handleFile function");
        }

        var buffers = [];

        var handler = {
            out:function(ws,data) {
                buffers.push(data.slice(1));
            },

            closed:function() {
                var size = 0;
                buffers.forEach((buf) => {
                    size += buf.byteLength;
                });

                var dv = new DataView(new ArrayBuffer(size));
                var index = 0;

                buffers.forEach((b) => {
                    var source = new DataView(b);
                    for (var i = 0; i < b.byteLength; i++)
                    {
                        dv.setUint8(index,source.getUint8(i));
                        index++;
                    }
                });

                var tar = new Tar();
                tar.parse(dv.buffer);
                delegate.handleFile(tar);
            },
            err:function(ws,message) {
                var text = new TextDecoder().decode(message);

                if (text.indexOf("Removing leading") < 0)
                {
                    tools.exception(text);
                }
            }
        }

        this.run(["tar","cf","-",path],handler);
    }

    put(data,path,options,delegate)
    {
        if (tools.isNode)
        {
            if (data instanceof Buffer)
            {
                data = tools.bufferToArrayBuffer(data);
            }
        }

        var handler = {
           ready:function(ws) {
                var tar = new Tar();
                tar.create(data,options);

                const   bufsize = 513;

                var buf = new ArrayBuffer(tar.buffer.byteLength + 1);
                var dv = new DataView(new ArrayBuffer(bufsize));

                dv.setUint8(0,0);

                var index = 1;

                for (var i = 0; i < tar.dv.byteLength; i++)
                {
                    dv.setUint8(index,tar.dv.getUint8(i));

                    index++;

                    if (index == bufsize)
                    {
                        ws.send(dv.buffer);
                        dv.setUint8(0,0);
                        index = 1;
                    }
                }

                var end = new DataView(new ArrayBuffer(2));
                end.setUint8(0,0);
                end.setUint8(0,4);
                ws.send(end.buffer);

                ws.close();
            },

            closed:function(ws) {
                if (tools.supports(delegate,"done"))
                {
                    delegate.done();
                }
            },

            out:function(ws,message) {
                console.log(new TextDecoder().decode(message));
            }
        }

        this.run(["tar","-xmf","-","-C",path],handler);
    }

    puturl(url,path,options,delegate)
    {
        var opts = new Options(options);
        var k8s = this;

        var o = {
            response:function(request,text) {
                k8s.put(text,path,opts.getOpts(),delegate);
            },
            error:function(request,error) {
                tools.exception("error: " + error);
            }
        };

        if (opts.hasOpt("name") == false)
        {
            const   index = url.lastIndexOf("/");
            if (index != -1)
            {
                opts.setOpt("name",url.substr(index));
            }
        }

        ajax.create("load",url,o).get();
    }

    rm(path,delegate)
    {
        var handler = {
            message:function(ws,message) {
                var decoder = new TextDecoder();
                var s = decoder.decode(message.data);
            },

            closed:function(ws) {
                if (tools.supports(delegate,"done"))
                {
                    delegate.done();
                }
            },

            error:function(ws,message) {
                tools.exception(message);
            }
        }

        this.run(["rm",path],handler);
    }

    mkdir(path,delegate)
    {
        var handler = {
            message:function(message) {
                var decoder = new TextDecoder();
                var s = decoder.decode(message.data);
            },

            closed:function(ws) {
                if (tools.supports(delegate,"done"))
                {
                    delegate.done();
                }
            },

            error:function(message) {
                tools.exception(message);
            }
        }

        this.run(["mkdir","-p",path],handler);
    }

    run(command,delegate)
    {
        if (this.namespace == null || this.project == null)
        {
            tools.exception("the instance requires both namespace and project name to execute a command");
        }

        const   a = (Array.isArray(command)) ? command : command.split(" ");

        if (this._pod == null)
        {
            var k8s = this;
            this.getPod({handlePod:function(pod) {
                k8s._pod = pod;
                k8s.exec(a,k8s._pod,delegate);
            }});
        }
        else
        {
            this.exec(a,this._pod,delegate);
        }
    }

    exec(command,pod,delegate)
    {
        var url = this.baseWsUrl;
        url += "api/v1/namespaces/";
        url += this.namespace;
        url += "/pods/";
        url += pod.metadata.name;
        url += "/exec";

        for (var i = 0; i < command.length; i++)
        {
            url += ((i == 0) ? "?" : "&");
            url += "command=" + command[i];
        }

        url += "&container=" + pod.spec.containers[0].name;
        url += "&stdin=true";
        /*
        */
        url += "&stdout=true";
        url += "&stderr=true";
        
        const   k8s = this;

        var o = {
            open:function()
            {
                if (tools.supports(delegate,"ready"))
                {
                    delegate.ready(this);
                }
            },

            error:function(message)
            {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(this,message);
                }
                else
                {
                    tools.exception(new TextDecoder().decode(message.data));
                }
            },

            close:function()
            {
                if (tools.supports(delegate,"closed"))
                {
                    delegate.closed(this);
                }
            },

            message:function(message) {

                var buf = null;

                if (message.constructor.name == "Buffer")
                {
                    buf = tools.bufferToArrayBuffer(message);
                }
                else
                {
                    buf = message.data;
                }
                var dv = new DataView(buf);
                var channel = dv.getUint8(0);

                if (dv.byteLength == 1)
                {
                    return;
                }

                if (channel == 1)
                {
                    if (tools.supports(delegate,"out"))
                    {
                        delegate.out(this,buf);
                    }
                    else
                    {
                        console.log(new TextDecoder().decode(buf));
                    }
                }
                else if (channel == 2)
                {
                    if (tools.supports(delegate,"err"))
                    {
                        delegate.err(this,buf);
                    }
                    else
                    {
                        tools.exception(new TextDecoder().decode(buf));
                    }
                }
            }
        };

        tools.createWebSocket(url,o);
    }
}

class K8SProject extends K8S 
{
    constructor(url)
    {
        super(url);

        if (this._project == null)
        {
            tools.exception("URL must be in form protocol://server/<namespace>/<project>");
        }

        Object.defineProperty(this,"espUrl", {
            get() {
                var url = "";
                if (this._config != null)
                {
                    if (this._url.protocol == "k8s:" || this._url.protocol == "https:")
                    {
                        url += "https://";
                    }
                    else if (this._url.protocol == "k8s-proxy:" || this._url.protocol == "https-proxy:")
                    {
                        url += "https://";
                    }
                    else
                    {
                        url += "http://";
                    }
                    url += this._config.access.externalURL;
                    url += "/SASEventStreamProcessingServer";
                    url += "/" + this._project;
                }
                return(url);
            }
        });

        Object.defineProperty(this,"modelXml", {
            get() {
                var xml = "";
                if (this._config != null)
                {
                    xml = this._config.spec.espProperties["server.xml"];
                }
                return(xml);
            }
        });

        this._config = null;

        this.loadConfig();
    }

    connect(connect,delegate,options,start)
    {
        var opts = new Options(options);
        var modelconfig = opts.getOpt("model");
        var k8s = this;

        var handler =
        {
            loaded:function()
            {
                if (modelconfig == null)
                {
                    k8s.getPod({
                        handlePod:function(pod)
                        {
                            k8s._pod = pod;
                            /*
                            k8s.readiness(delegate);
                            */
                            connect.connect(k8s.espUrl,delegate,options,start);
                        }
                    });
                }
                else
                {
                    var o = {
                        modelHandler:function(model) {
                            k8s.load(model,opts.getOpts(),{
                                loaded:function() {
                                    connect.connect(k8s.espUrl,delegate,options,start);
                                }
                            });
                        }
                    };

                    k8s.getModel(modelconfig,o);
                }
            },

            notFound:function(project)
            {
                if (modelconfig == null)
                {
                    if (opts.getOpt("create",true))
                    {
                        var model = k8s.getDefaultModel();
                        k8s.load(model,opts.getOpts(),{
                            loaded:function() {
                                connect.connect(k8s.espUrl,delegate,options,start);
                            }
                        });
                    }
                    else if (tools.supports(delegate,"error"))
                    {
                        delegate.error("project not found: " + project);
                    }
                }
                else
                {
                    var o = {
                        modelHandler:function(model) {
                            k8s.load(model,opts.getOpts(),{
                                loaded:function() {
                                    connect.connect(k8s.espUrl,delegate,options,start);
                                }
                            });
                        }
                    };

                    k8s.getModel(modelconfig,o);
                }
            },

            error:function(request,error)
            {
                tools.exception("error: " + opts);
            }
        };

        this.loadConfig(handler);
    }

    loadConfig(delegate)
    {
        this._config = null;

        var url = this.url;

        if (this._ns != null)
        {
            url += "/namespaces/" + this._ns;
        }

        url += "/espservers";
        url += "/" + this._project;

        var k8s = this;
        var o = {
            response:function(request,text) {
                var data = JSON.parse(text);

                if (data.code == 404)
                {
                    if (tools.supports(delegate,"notFound"))
                    {
                        delegate.notFound(k8s.namespace + "/" + k8s.project);
                    }
                }
                else
                {
                    k8s._config = data;
                    if (tools.supports(delegate,"loaded"))
                    {
                        delegate.loaded();
                    }
                }
            },
            error:function(request,error) {
                tools.exception("error: " + error);
            }
        };
        var request = ajax.create("load",url,o);
		request.setRequestHeader("accept","application/json");
        request.get();
    }

    load(model,options,delegate)
    {
        var opts = new Options(options);
        var xml = xpath.createXml(model);
        xml.documentElement.setAttribute("name",this._project);

        var newmodel = "b64" + tools.b64Encode(xpath.xmlString(xml));

        if (newmodel == this.modelXml)
        {
            if (opts.getOpt("force",false) == false)
            {
                if (tools.supports(delegate,"loaded"))
                {
                    delegate.loaded();
                }

                return;
            }
        }

        var k8s = this;

        if (this._config != null)
        {
            var o = {
                deleted:function() {
                    k8s._config = null;
                    setTimeout(function(){k8s.load(model,opts.getOpts(),delegate)},1000);
                },
                error:function(message) {
                    tools.exception(message);
                }
            };

            this.del(o);
        }
        else
        {
            var url = this.url;

            if (this._ns != null)
            {
                url += "/namespaces/" + this._ns;
            }

            url += "/espservers";

            var o = {
                response:function(request,text) {

                    const   code = request.getStatus();

                    if (code != 200 && code != 201)
                    {
                        tools.exception(text);
                    }

                    k8s.loadConfig();

                    k8s.isReady({
                        ready:function() {
                            if (tools.supports(delegate,"loaded"))
                            {
                                delegate.loaded();
                            }
                        }
                    });
                },
                error:function(request,error) {
                    if (tools.supports(delegate,"error"))
                    {
                        delegate.error(request,error);
                    }
                    else
                    {
                        tools.exception("error: " + error);
                    }
                }
            };

            var content = this.getYaml(newmodel);
            var request = ajax.create("create",url,o);
            request.setRequestHeader("content-type","application/yaml");
            request.setRequestHeader("accept","application/json");
            request.setData(content);
            request.post();
        }
    }

    restart(delegate)
    {
        const   k8s = this;
        const   handler = {
            handleProject:function(p) 
            {
                const   s = p.spec.espProperties["server.xml"];
                const   xml = tools.b64Decode(s.substr(3)).toString();
                const   delHandler = {
                    deleted:function() {
                        k8s.load(xml,{force:true},
                        {
                            loaded:function() 
                            {
                                if (tools.supports(delegate,"loaded"))
                                {
                                    delegate.loaded();
                                }
                            }
                        });
                    }
                };

                k8s.del(delHandler);
            },
            notFound:function()
            {
                tools.exception("project not found");
            }
        }

        this.getProject(handler,this.namespace,this.project);
    }

    del(delegate)
    {
        var url = this.url;

        if (this._ns != null)
        {
            url += "/namespaces/" + this._ns;
        }

        url += "/espservers/";
        url += this._project;

        var o = {
            response:function(request,text) {
                if (tools.supports(delegate,"deleted"))
                {
                    delegate.deleted();
                }
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(error);
                }
                else
                {
                    tools.exception("error: " + error);
                }
            }
        }; 

        var request = ajax.create("create",url,o);
		request.setRequestHeader("accept","application/json");
        request.del();
    }

    getModel(model,delegate)
    {
        if (tools.supports(delegate,"modelHandler") == false)
        {
            tools.exception("the delegate must implement the modelHandler function");
        }

        var modelOpts = new Options(model);
        var data = modelOpts.getOpt("data");
        var url = modelOpts.getOpt("url");

        if (data == null && url == null)
        {
            tools.exception("the model must contain either a data or url field");
        }

        if (data != null)
        {
            delegate.modelHandler(data);
        }
        else
        {
            var k8s = this;
            var o = {
                response:function(request,text,data) {
                    delegate.modelHandler(text);
                },
                error:function(request,error) {
                }
            };

            ajax.create("load",url,o).get();
        }
    }

    getYaml(model)
    {
        var s = "";

        s += "apiVersion: iot.sas.com/v1alpha1\n";
        s += "kind: ESPServer\n";
        s += "metadata:\n";
        s += "  name: " + this._project + "\n";
        if (this._ns != null)
        {
            s += "  namespace: " + this._ns + "\n";
        }
        s += "spec:\n";
        s += "    loadBalancePolicy: \"default\" \n";
        s += "    espProperties:\n";
        s += "      server.xml: \"" + model + "\"\n";
        s += "      meta.meteringhost: \"sas-event-stream-processing-metering-app." + this._ns + "\"\n";
        s += "      meta.meteringport: \"80\"\n";
        s += "    projectTemplate:\n";
        s += "      autoscale:\n";
        s += "        minReplicas: 1\n";
        s += "        maxReplicas: 1\n";
        s += "        metrics:\n";
        s += "        - type: Resource\n";
        s += "          resource:\n";
        s += "            name: cpu\n";
        s += "            target:\n";
        s += "              type: Utilization\n";
        s += "              averageUtilization: 50\n";
        s += "      deployment:\n";
        s += "        spec:\n";
        s += "          selector:\n";
        s += "            matchLabels:\n";
        s += "          template:\n";
        s += "            spec:\n";
        s += "               volumes:\n";
        s += "               - name: data\n";
        s += "                 persistentVolumeClaim:\n";
        s += "                   claimName: esp-pv\n";
        s += "               containers:\n";
        s += "               - name: ((PROJECT_SERVICE_NAME))\n";
        s += "                 resources:\n";
        s += "                   requests:\n";
        s += "                     memory: \"1Gi\"\n";
        s += "                     cpu: \"1\"\n";
        s += "                   limits:\n";
        s += "                     memory: \"2Gi\"\n";
        s += "                     cpu: \"2\"\n";
        s += "                 volumeMounts:\n";
        s += "                 - mountPath: /mnt/data\n";
        s += "                   name: data\n";
        s += "    loadBalancerTemplate:\n";
        s += "      deployment:\n";
        s += "        spec:\n";
        s += "          template:\n";
        s += "            spec:\n";
        s += "              containers:\n";
        s += "              - name: ((PROJECT_SERVICE_NAME)) \n";
        s += "access:\n";
        s += "  state: \"Pending\" \n";
        s += "  internalHostName:  foo\n";
        s += "  internalHttpPort:  0\n";
        s += "  externalURL: foo\n";

        return(s);
    }

    getDefaultModel()
    {
        var s = "";
		s += "<project pubsub='auto' threads='4'>\n";
		s += "    <contqueries>\n";
		s += "        <contquery name='cq'>\n";
		s += "            <windows>\n";
		s += "                <window-source name='s'>\n";
		s += "                    <schema>\n";
		s += "                        <fields>\n";
		s += "                            <field name='id' type='string' key='true'/>\n";
		s += "                            <field name='data' type='string'/>\n";
		s += "                        </fields>\n";
		s += "                    </schema>\n";
		s += "                </window-source>\n";
		s += "            </windows>\n";
		s += "        </contquery>\n";
		s += "    </contqueries>\n";
		s += "</project>\n";
        return(s);
    }

    isReady(delegate)
    {
        if (tools.supports(delegate,"ready") == false)
        {
            tools.exception("the delegate must implement the ready function");
        }

        var state = "";

        if (this._config != null)
        {
            state = this._config.access.state;
        }

        const   k8s = this;

        if (state == "Succeeded")
        {
            k8s.getPod({
                handlePod:function(pod)
                {
                    var ready = false;

                    if (pod.status.phase == "Running")
                    {
                        for (var i = 0; i < pod.status.conditions.length; i++)
                        {
                            var condition = pod.status.conditions[i];

                            if (condition.status != "True")
                            {
                                break;
                            }
                        }

                        ready = (i == pod.status.conditions.length);
                    }

                    if (ready)
                    {
                        k8s._pod = pod;
                        setTimeout(function(){delegate.ready(k8s)},1000);
                        /*
                        delegate.ready(k8s);
                        */
                    }
                    else
                    {
                        setTimeout(function(){k8s.isReady(delegate)},1000);
                    }
                }
            });
        }
        else
        {
            this.loadConfig();
            setTimeout(function(){k8s.isReady(delegate)},500);
        }
    }

    readiness(delegate)
    {
        var url = this.espUrl;
        url += "/internal/ready";
        const   req = ajax.create("ready",url,{
            response(request,text) {
                console.log("ready status: " + request.getStatus());
                if (request.getStatus() == 200)
                {
                    delegate.ready(this);
                }
                else
                {
                    setTimeout(function(){k8s.readiness(delegate)},500);
                }
            },
            error(request,text) {
                tools.exception(text);
            }
        });

        /*
        var certConfirm  = this.espUrl;
        certConfirm  += "/eventStreamProcessing/v1/server";
        req.setOpt("cert-confirm-url",certConfirm);
        */
        setTimeout(function() {req.head()},1000);
    }

    /*
    readiness(delegate)
    {
        var url = this.espUrl;
        url += "/internal/ready";
        const   req = ajax.create("ready",url,{
            response(request,text) {
                console.log("ready status: " + request.getStatus());
                if (request.getStatus() == 200)
                {
                    k8s.getPod({
                        handlePod:function(pod)
                        {
                            k8s._pod = pod;
                            delegate.ready(this);
                        }
                    });
                }
                else
                {
                    setTimeout(function(){k8s.isReady(delegate)},500);
                }
            },
            error(request,text) {
                tools.exception(text);
            }
        });
        var certConfirm  = this.espUrl;
        certConfirm  += "/eventStreamProcessing/v1/server";
        req.setOpt("cert-confirm-url",certConfirm);
        setTimeout(function() {req.head()},1000);
    }
    */
}

class Tar extends Options
{
	constructor()
	{
        super();

        this._index = 0;
        this._dv = null;

        this._content = null;

        Object.defineProperty(this,"content", {
            get() {
                return(this._content);
            }
        });

        Object.defineProperty(this,"dv", {
            get() {
                return(this._dv);
            }
        });

        Object.defineProperty(this,"buffer", {
            get() {
                return(this._dv.buffer);
            }
        });
    }

    create(data,options)
    {
        var opts = new Options(options);

        if (opts.hasOpt("name") == false)
        {
            tools.exception("must supply name for remote file");
        }

        var dv = null;
        var size = 0;

        if (typeof(data) == "string" || data instanceof String)
        {
            size = data.length;
            dv = new DataView(tools.createBuffer(data));
        }
        else
        {
            size = data.byteLength;
            dv = new DataView(data);
        }

        var bytes = (size + (512 - (size % 512))) + 512 + (512 * 2);
        this._dv = new DataView(new ArrayBuffer(bytes));

        this.putString(opts.getOpt("name"),0,100);

        const   mode = "000" + opts.getOpt("mode","644") + " ";
        this.putString(mode,100,8);

        this.putString(opts.getOpt("userid","001001 "),108,8);
        this.putString(opts.getOpt("groupid","001001 "),116,8);

        this.putString("0",156,1);
        this.putString("ustar",257,6);
        this.putString("00",263,2);

        this.putString(opts.getOpt("owner","sas"),265,32);
        this.putString(opts.getOpt("group","sas"),297,32);

        var s;

        s = size.toString(8);
        s = s.pad(11,'0');
        s += " ";
        this.putString(s,124,12);

        /*
        s = "13735354337 ";
        this.putString(s,136,12);
        */

        s = " ";
        s = s.pad(8,' ');
        this.putString(s,148,8);
        s += " ";

        s = "0";
        s = s.pad(6,'0');
        s += " ";
        this.putString(s,329,8);

        this.putString(s,337,8);

        s = this.checksum();
        s = s.pad(6,'0');
        this.putString(s,148,6);
        this._dv.setUint8(154,0);

        var index = 512;

        for (var i = 0; i < size; i++)
        {
            this._dv.setUint8(index + i,dv.getUint8(i));
        }
    }

    getString(s,index,length)
    {
        var s = "";
        var b;

        for (var i = 0; i < bytes; i++)
        {
            b = this._dv.getUint8(index);
            if (b > 0)
            {
                s += String.fromCharCode(b);
            }
            index++;
        }

        return(s);
    }

    putString(s,index,length)
    {
        for (var i = 0; i < length; i++)
        {
            if (s.length > i)
            {
                this._dv.setUint8(index + i,s.charCodeAt(i));
            }
            else
            {
                //this._dv.setUint8(0);
            }
        }
    }

    parse(data)
    {
        this._index = 0;
        this._dv = new DataView(data);

        this.setOpt("name",this.readString(100));
        this.setOpt("mode",this.readString(8));
        this.setOpt("userId",this.readString(8));
        this.setOpt("groupId",this.readString(8));

        var size = parseInt(this.readString(12),8);
        this.setOpt("size",size);
        this.setOpt("modified",this.readString(12));
        this.setOpt("checksum",this.readString(8));
        this.setOpt("type",this.readString(1));
        this.setOpt("link",this.readString(100));

        this.setOpt("ustar",this.readString(6));
        this.setOpt("ustarVersion",this.readString(2));
        this.setOpt("ownerName",this.readString(32));
        this.setOpt("ownerGroup",this.readString(32));
        this.setOpt("deviceMajor",this.readString(8));
        this.setOpt("deviceMinor",this.readString(8));
        this.setOpt("prefix",this.readString(155));

        this._index = 512;
        var size = parseInt(this.getOpt("size"),8);

        this._content = this.read(this.getOpt("size"));
    }

    readString(bytes)
    {
        var s = "";
        var b;

        for (var i = 0; i < bytes; i++)
        {
            b = this._dv.getUint8(this._index);
            if (b > 0)
            {
                s += String.fromCharCode(b);
            }
            this._index++;
        }

        return(s);
    }

    read(bytes)
    {
        var buf = new ArrayBuffer(bytes);
        var dv = new DataView(buf);

        for (var i = 0; i < bytes; i++)
        {
            dv.setUint8(i,this._dv.getUint8(this._index));
            this._index++;
        }

        return(buf);
    }

    checksum()
    {
        var value = 0;

        for (var i = 0; i < this._dv.byteLength; i++)
        {
            value += this._dv.getUint8(i);
        }

        var s = value.toString(8);

        return(s);
    }
}

var _api =
{
    create:function(url)
    {
        var u = tools.createUrl(decodeURI(url));
        var o = null;

        if (u.path != null && u.path.split("/").length == 3)
        {
            o = new K8SProject(url);
        }
        else
        {
            o = new K8S(url);
        }

        return(o);
    }
};

export {_api as k8s};
