/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "./serverconn",
    "./tools",
    "./ajax",
    "./xpath",
    "./options"
], function(ServerConnection,tools,ajax,xpath,Options)
{
    function
    K8S(url)
    {
        this._url = tools.createUrl(decodeURI(url));
        this._proxy = null;

        if (this._url.protocol.indexOf("-") != -1)
        {
            var a = this._url.protocol.split("-");

            this._url.protocol = a[0] + ":";
            a = a[1].split(":");
            if (a[0].length == 0)
            {
                this._proxy = "/";
            }
            else
            {
                this._proxy = "/" + a[0] + "/";
            }
        }

        this._ns = null;
        this._project = null;
        this._pod = null;

        var a = (this._url.path != null) ? this._url.path.substr(1).split("/") : [];

        if (a.length > 0)
        {
            this._ns = a[0];

            if (a.length > 1)
            {
                this._project = a[1];
            }
        }

        Object.defineProperty(this,"k8sProtocol", {
            get() {
                var protocol = "";

                if (this._url.protocol == "k8ss:" || this._url.protocol == "https:")
                {
                    protocol = "k8ss:";
                }
                else
                {
                    protocol = "k8s:";
                }

                return(protocol);
            }
        });

        Object.defineProperty(this,"httpProtocol", {
            get() {
                var protocol = "";

                if (this._proxy != null)
                {
                    protocol = "http:";
                }
                else if (this._url.protocol == "k8ss:" || this._url.protocol == "https:")
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

                if (this._proxy != null)
                {
                    protocol = "ws:";
                }
                else if (this._url.protocol == "k8ss:" || this._url.protocol == "https:")
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
                var s = this.httpProtocol + "//" + this.host + ":" + this.port;
                if (this._proxy != null)
                {
                    s += this._proxy;
                }
                return(s);
            }
        });

        Object.defineProperty(this,"baseWsUrl", {
            get() {
                var s = this.wsProtocol + "//" + this.host + ":" + this.port;
                if (this._proxy != null)
                {
                    s += this._proxy;
                }
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
                console.log("base: " + url);
                url += "apis/iot.sas.com/v1alpha1";
                console.log(url);
                return(url);
            }
        });

        Object.defineProperty(this,"k8sUrl", {
            get() {
                return(this.k8sProtocol + "//" + this.host + ":" + this.port);
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

    K8S.prototype.getProjects =
    function(delegate)
    {
        if (tools.supports(delegate,"handleProjects") == false)
        {
            tools.exception("the delegate must implement the handleProjects function");
        }

        var url = this.url;

        if (this._ns != null)
        {
            url += "/namespaces/" + this._ns;
        }

        url += "/espservers";

        if (this._project != null)
        {
            url += "/" + this._project;
        }

        var k8s = this;
        var o = {
            response:function(request,text) {
                var data = JSON.parse(text);

                if (data.code == 404)
                {
                    var s = "";
                    if (k8s._ns != null)
                    {
                        s += k8s._ns + "/";
                    }
                    s += k8s._project;

                    if (tools.supports(delegate,"projectNotFound"))
                    {
                        delegate.projectNotFound(s);
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

    K8S.prototype.getPods =
    function(delegate)
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

    K8S.prototype.getPod =
    function(delegate)
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
                    delegate.handlePod(pods[0]);
                }
            }
        });
    }

    K8S.prototype.ls =
    function(path,delegate)
    {
        if (tools.supports(delegate,"handleFiles") == false)
        {
            tools.exception("the delegate must implement the handleFiles function");
        }

        var handler = {
            message:function(message) {
                var decoder = new TextDecoder();
                var s = decoder.decode(message.data);

                if (s.length <= 1)
                {
                    return;
                }

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
            },

            error:function(message) {
                tools.exception(message);
            }
        }

        if (this._pod == null)
        {
            var k8s = this;
            this.getPod({handlePod:function(pod) {
                k8s._pod = pod;
                k8s.exec(["ls","-l",path],k8s._pod,handler);
            }});
        }
        else
        {
            this.exec(["ls","-l",path],this._pod,handler);
        }
    }

    K8S.prototype.get =
    function(path,delegate)
    {
        if (tools.supports(delegate,"handleFile") == false)
        {
            tools.exception("the delegate must implement the handleFile function");
        }

        var buffers = [];

        var handler = {
            message:function(message) {
                console.log("message: " + message.data.byteLength);
                if (message.data.byteLength == 1)
                {
                    return;
                }

                var dv = new DataView(message.data);
                var channel = dv.getUint8(0);

                if (channel == 1)
                {
                    buffers.push(message.data.slice(1));
                }
            },

            close:function() {
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
            error:function(message) {
                tools.exception(message);
            }
        }

        if (this._pod == null)
        {
            var k8s = this;
            this.getPod({handlePod:function(pod) {
                k8s._pod = pod;
                k8s.exec(["tar","cf","-",path],k8s._pod,handler);
            }});
        }
        else
        {
            this.exec(["tar","cf","-",path],this._pod,handler);
        }
    }

    K8S.prototype.put =
    function(data,path,delegate)
    {
        /*
        if (tools.supports(delegate,"handleFile") == false)
        {
            tools.exception("the delegate must implement the handleFile function");
        }
        */

        var handler = {
            open:function() {

                var buf = null;

                if (data instanceof String)
                {
                    buf = new ArrayBuffer(data.length + 1);

                    var dv = new DataView(buf);
                    var index = 1;

                    dv.setUint8(0,0);

                    for (var i = 0; i < data.length; i++)
                    {
                        dv.setUint8(index,data.charCodeAt(i));
                        index++;
                    }
                }
                else
                {
                    console.log("data: " + data);
                    console.log("is ab: " + data instanceof Buffer);
                    var inputData = new ArrayBuffer(data.byteLength);
                    var tmp = new DataView(inputData);

                    for (var i = 0; i < data.byteLength; i++)
                    {
                        tmp[i] = data[i];
                    }
                    buf = new ArrayBuffer(data.byteLength + 1);
                    var input = new DataView(inputData);
                    var dv = new DataView(buf);

                    dv.setUint8(0,0);

                    var index = 1;

                    for (var i = 0; i < input.byteLength; i++)
                    {
                        dv[index] = input[i];
                        index++;
                    }
                }

                console.log("SENDING: " + buf.byteLength);
                this.send(buf);

                var ws = this;
                setTimeout(function(){ws.close()},1000);
            },

            message:function(message) {
                console.log(message.data);
                console.log("message: " + new TextDecoder().decode(message.data));
            },

            error:function(message) {
                tools.exception(message);
                this.send(data);
            }
        }

        const   rgx = new RegExp("/","g");

        path = path.replace(rgx,"%2F");

        if (this._pod == null)
        {
            var k8s = this;
            this.getPod({handlePod:function(pod) {
                k8s._pod = pod;
                //k8s.exec(["tar","-xm","-f","-","-C",path],k8s._pod,handler);
                k8s.exec(["tar","-xmf","-","-C",path],k8s._pod,handler);
            }});
        }
        else
        {
            this.exec(["tar","cf","-",path],this._pod,handler);
            this.exec(["tar","-xmf","-","-C",path],this._pod,handler);
        }
    }

    K8S.prototype.rm =
    function(path,delegate)
    {
        /*
        if (tools.supports(delegate,"handleFile") == false)
        {
            tools.exception("the delegate must implement the handleFile function");
        }
        */

        var handler = {
            message:function(message) {
                var decoder = new TextDecoder();
                var s = decoder.decode(message.data);
                console.log("message: " + s);
            },

            error:function(message) {
                tools.exception(message);
            }
        }

        if (this._pod == null)
        {
            var k8s = this;
            this.getPod({handlePod:function(pod) {
                k8s._pod = pod;
                k8s.exec(["rm",path],k8s._pod,handler);
            }});
        }
        else
        {
            this.exec(["rm",path],this._pod,handler);
        }
    }

    K8S.prototype.exec =
    function(command,pod,delegate)
    {
        var url = this.baseWsUrl;
        url += "api/v1/namespaces/";
        url += this.namespace;
        url += "/pods/";
        url += this._pod.metadata.name;
        url += "/exec";

        for (i = 0; i < command.length; i++)
        {
            url += ((i == 0) ? "?" : "&");
            url += "command=" + command[i];
        }

        url += "&container=" + pod.spec.containers[0].name;
        /*
        url += "&stdin=true";
        */
        url += "&stdout=true";
        url += "&stderr=true";
        console.log(url);
        tools.createWebSocket(url,delegate);
    }

    function
    K8SProject(url)
    {
        K8S.call(this,url);

        if (this._url.protocol.startsWith("k8s") == false)
        {
            tools.exception("The protocol must start with k8s");
        }

        if (this._project == null)
        {
            tools.exception("URL must be in form k8s://server/<namespace>/<project>");
        }

        Object.defineProperty(this,"espurl", {
            get() {
                var url = "";
                if (this._config != null)
                {
                    if (this._url.protocol == "k8ss:" || this._url.protocol == "https:")
                    {
                        url += "https://";
                    }
                    else if (this._url.protocol == "k8ss-proxy:" || this._url.protocol == "https-proxy:")
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
    }

    K8SProject.prototype = Object.create(K8S.prototype);
    K8SProject.prototype.constructor = K8SProject;

    K8SProject.prototype.connect =
    function(connect,delegate,options,start)
    {
        var opts = new Options(options);
        var model = opts.getOptAndClear("model");
        var k8s = this;

        var handler =
        {
            loaded:function()
            {
                if (model == null)
                {
                    k8s.getPod({
                        handlePod:function(pod)
                        {
                            k8s._pod = pod;
                            connect.connect(k8s.espurl,delegate,options,start);
                        }
                    });
                }
                else
                {
                    var o = {
                        modelHandler:function(model) {
                            k8s.load(model,opts.getOpts(),{
                                loaded:function() {
                                    connect.connect(k8s.espurl,delegate,options,start);
                                }
                            });
                        }
                    };

                    k8s.getModel(model,o);
                }
            },

            notFound:function(project)
            {
                if (model == null)
                {
                    if (opts.getOpt("create",true))
                    {
                        var model = k8s.getDefaultModel(project);
                        k8s.load(model,opts.getOpts(),{
                            loaded:function() {
                                connect.connect(k8s.espurl,delegate,options,start);
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
                                    connect.connect(k8s.espurl,delegate,options,start);
                                }
                            });
                        }
                    };

                    k8s.getModel(model,o);
                }
            },

            error:function(request,error)
            {
                tools.exception("error: " + opts);
            }
        };

        this.loadConfig(handler);
    }

    K8SProject.prototype.loadConfig =
    function(delegate)
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

    K8SProject.prototype.load =
    function(model,options,delegate)
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
                    k8s.load(model,opts.getOpts(),delegate);
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
            //console.log(content);
            var request = ajax.create("create",url,o);
            request.setRequestHeader("content-type","application/yaml");
            request.setRequestHeader("accept","application/json");
            request.setData(content);
            request.post();
        }
    }

    K8SProject.prototype.del =
    function(delegate)
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

    K8SProject.prototype.getModel =
    function(model,delegate)
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

    K8SProject.prototype.getYaml =
    function(model)
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
        s += "      meta.meteringhost: \"sas-event-stream-processing-metering-app.roleve\"\n";
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

    K8SProject.prototype.getDefaultModel =
    function(name)
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

    K8SProject.prototype.isReady =
    function(delegate)
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
            var url = this.espurl;
            url += "/internal/ready";
            ajax.create("ready",url,{
                response(request,text) {
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
            }).head();
        }
        else
        {
            this.loadConfig();
            setTimeout(function(){k8s.isReady(delegate)},500);
        }
    }

	function
	Tar()
	{
        Options.call(this);

        this._content = null;

        Object.defineProperty(this,"content", {
            get() {
                return(this._content);
            }
        });
    }

    Tar.prototype = Object.create(Options.prototype);
    Tar.prototype.constructor = Tar;

    Tar.prototype.parse =
    function(data)
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

    Tar.prototype.readString =
    function(bytes)
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

    Tar.prototype.read =
    function(bytes)
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

    var _api =
    {
        create:function(server)
        {
            return(new K8S(server));
        },

        createProject:function(url)
        {
            return(new K8SProject(url));
        }
    };

    return(_api);
});
