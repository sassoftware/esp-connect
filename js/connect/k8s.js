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

                if (this._url.protocol == "k8ss:" || this._url.protocol == "https:")
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

        Object.defineProperty(this,"server", {
            get() {
                return(this.httpProtocol + "//" + this.host + ":" + this.port);
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

        Object.defineProperty(this,"baseurl", {
            get() {
                var url = this.server;
                return(url);
            }
        });

        Object.defineProperty(this,"url", {
            get() {
                var url = this.baseurl;
                url += "/apis/iot.sas.com/v1alpha1";
                return(url);
            }
        });

        Object.defineProperty(this,"k8sUrl", {
            get() {
                return(this.k8sProtocol + "//" + this.host + ":" + this.port);
            }
        });
    }

    K8S.prototype.getProjects =
    function(delegate,project,ns)
    {
        if (tools.supports(delegate,"handleProjects") == false)
        {
            tools.exception("the delegate must implement the handleProjects function");
        }

        var url = this.url;

        if (ns != null)
        {
            url += "/namespaces/" + ns;
        }

        url += "/espservers";

        if (project != null)
        {
            url += "/" + project;
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

    function
    K8SProject(url)
    {
        K8S.call(this,url);

        if (this.protocol != "k8s:" && this.protocol != "k8ss:")
        {
            tools.exception("The K8S url must use the k8s or k8ss protocol.");
        }

        var a = (this.path != null) ? this.path.substr(1).split("/") : [];

        if (a.length < 2)
        {
            tools.exception("URL must be in form k8s://server/<namespace>/<project>");
        }

        Object.defineProperty(this,"espurl", {
            get() {
                var url = "";
                if (this._config != null)
                {
                    url += this.httpProtocol + "//";
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

        this._ns = a[0];
        this._project = a[1];

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
                    connect.connect(k8s.espurl,delegate,options,start);
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

            notfound:function(project)
            {
                if (model == null)
                {
                    if (tools.supports(delegate,"error"))
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
                    if (tools.supports(delegate,"notfound"))
                    {
                        delegate.notfound();
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

        var ready = false;

        if (state == "Succeeded")
        {
            var url = this.espurl;
            url += "/internal/ready";
            ajax.create("ready",url,{
                response(request,text) {
                    if (request.getStatus() == 200)
                    {
                        ready = true;
                        delegate.ready(this);
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
        }

        if (ready == false)
        {
            const   k8s = this;
            setTimeout(function(){k8s.isReady(delegate)},500);
        }
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
