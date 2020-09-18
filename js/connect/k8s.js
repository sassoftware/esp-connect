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
    "./options"
], function(ServerConnection,tools,ajax,Options)
{
    function
    K8S(url)
    {
        this._url = tools.createUrl(decodeURI(url));

console.log("URL: " + this._url);
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
    function(delegate,options)
    {
        if (tools.supports(delegate,"handleProjects") == false)
        {
            tools.exception("the delegate must implement the handleProjects function");
        }

        var opts = new Options(options);
        var url = this.url;

        if (opts.hasOpt("ns"))
        {
            url += "/namespaces/" + opts.getOpt("ns");
        }

        url += "/espservers";

        if (opts.hasOpt("name"))
        {
            url += "/" + opts.getOpt("name");
        }

        var k8s = this;
        var o = {
            response:function(request,text) {
                var data = JSON.parse(text);

                if (data.code == 404)
                {
                    if (tools.supports(delegate,"projectNotFound"))
                    {
                        delegate.projectNotFound(request,opts.toString());
                    }
                    else
                    {
                        console.log("project not found: " + opts.toString());
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
                    console.log("error: " + error);
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

        this._ns = a[0];
        this._project = a[1];
    }

    K8SProject.prototype = Object.create(K8S.prototype);
    K8SProject.prototype.constructor = K8SProject;

    K8SProject.prototype.connect =
    function(connect,delegate,options,start)
    {
        var k8s = this;
        var opts = new Options();
        opts.setOpt("ns",this._ns);
        opts.setOpt("project",this._project);

        var o =
        {
            handleProjects:function(data)
            {
                var item = data[0];
                var k8sUrl = "";
                k8sUrl += k8s.httpProtocol + "//";
                k8sUrl += item.access.externalURL;
                k8sUrl += "/SASEventStreamProcessingServer";
                k8sUrl += "/" + opts.getOpt("project");
                connect.connect(k8sUrl,delegate,options,start);
            },

            projectNotFound:function(request)
            {
                var delegate = 
                {
                    projectCreated:function()
                    {
                    }
                };

                k8s.createProject(delegate,opts.getOpts());
            },

            error:function(request,error)
            {
                tools.exception("error: " + opts);
            }
        };

        this.getProjects(o,opts.getOpts());
    }

    K8SProject.prototype.create =
    function(delegate,options)
    {
        var opts = new Options(options);
        var url = this._server;
        url += "/apis/iot.sas.com/v1alpha1";

        if (opts.hasOpt("ns"))
        {
            url += "/namespaces/" + opts.getOpt("ns");
        }

        url += "/espservers";

        var yaml = this.getProjectYaml(options);
        var o = {
            response:function(request,text) {
                var data = JSON.parse(text);
                console.log(JSON.stringify(data,null,2));
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(request,error);
                }
                else
                {
                    console.log("error: " + error);
                }
            }
        };
        var request = ajax.create("create",url,o);
		request.setRequestHeader("content-type","text/x-yaml");
		request.setRequestHeader("accept","application/json");
        console.log(yaml);
        request.setData(yaml);
        request.post();
    }

    K8SProject.prototype.getYaml =
    function(options)
    {
        var opts = new Options(options);
        var s = "";

        s += "apiVersion: iot.sas.com/v1alpha1\n";
        s += "kind: ESPServer\n";
        s += "metadata:\n";
        s += "  name: " + opts.getOpt("name") + "\n";
        s += "  namespace: " + opts.getOpt("ns","") + "\n";
        s += "spec:\n";
        s += "    loadBalancePolicy: \"default\" \n";
        s += "    espProperties:\n";
        s += "      server.xml: \n";
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

    var _api =
    {
        create:function(server)
        {
            return(new K8S(server));
        },

        createProject:function(connect,url)
        {
            return(new K8SProject(connect,url));
        }
    };

    return(_api);
});
