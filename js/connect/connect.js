/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var _prompts = null;
var _fs = null;

import {serverconn} from "./serverconn.js";
import {tools} from "./tools.js";
import {ajax} from "./ajax.js";
import {xpath} from "./xpath.js";
import {Resources} from "./resources.js";
import {codec} from "./codec.js";
import {Options} from "./options.js";
import {Router} from "./router.js";
import {Formatter} from "./formatter.js";

var _api =
{
    _args:null,
    _config:null,

    isNode:function()
    {
        return(tools.isNode);
    },

    connect:function(url,delegates,options,start)
    {
        const self = this;

        var opts = new Options(options);
        var mopts = opts.hasOpt("model") ? new Options(opts.getOpt("model")) : null;
        var name = mopts.getOpt("name");

        const   k8s = opts.hasOpt("k8s") ? opts.getOpt("k8s") : this.isK8sUrl(url);

        if (k8s && mopts == null)
        {
            tools.exception("You must supply a model for Kubernetes");
            return;
        }

        var token = null;
        var credentials = null;

        if (opts.hasOpt("token"))
        {
            token = opts.getOptAndClear("token");
        }

        if (opts.hasOpt("credentials"))
        {
            credentials = opts.getOptAndClear("credentials");
        }

        var complete = function() {

            var connection = serverconn.create(self,url,delegates,opts.getOpts());

            if (token != null)
            {
                connection.setBearer(token);
            }
            else if (credentials != null)
            {
                connection.setBasic(credentials);
            }

            if (start == null || start)
            {
                try
                {
                    connection.start();
                }
                catch(e)
                {
                    if (tools.anySupports(delegates,"connectionError") != null)
                    {
                        delegates.forEach((d) => {
                            if (tools.supports(d,"connectionError"))
                            {
                                d.connectionError(connection,e);
                            }
                        });
                    }
                    else
                    {
                        alert(e);
                    }
                }
            }
        }

        if (mopts != null)
        {
            var load = function(model) {
                var loadurl = url;
                loadurl += "/eventStreamProcessing/v1/projects/" + name;
console.log("LOADURL: " + loadurl);
                var loadreq = ajax.create(loadurl);
                loadreq.setData(model);
                loadreq.setRequestHeader("Content-Type","text/xml");
                loadreq.put().then(
                    function(result) {
                        if (result.status >= 400)
                        {
                        }
                        else
                        {
                            complete();
                        }
                    },
                    function(result) {
                        console.log("error loading");
                    }
                );
            }

            self.getModelFrom(mopts).then (
                function(model) {

                    var xml = xpath.createXml(model);
                    xml.documentElement.setAttribute("name",name);

                    model = xpath.xmlString(xml.documentElement);

                    var s = url;
                    s += "/eventStreamProcessing/v1/projectXml?name=" + name;

                    ajax.create(s).get().then(
                        function(result) {
                        console.log("STATUS: " + result.status);
                            if (result.status >= 400)
                            {
                                load(model);
                            }
                            else
                            {
                                var xml = xpath.createXml(result.text);
                                var nodes = xpath.getNodes("//project[@name='" + name + "']",xml);
                                var loadmodel = true;

                                if (nodes.length == 1)
                                {
                                    const   tmp = xpath.xmlString(nodes[0]);
                                    loadmodel = model != tmp;
                                }

                                if (loadmodel)
                                {
                                    load(model);
                                }
                                else
                                {
                                    complete();
                                }
                            }
                        },
                        function(result) {
                        console.log("ERR STATUS: " + result.status);
                            if (result.status >= 400)
                            {
                                load(model);
                            }
                        }
                    );
                }
            );
        }
    },

    closed:function(connection)
    {
        for (var v of this._visuals)
        {
            v.closed(connection);
        }
    },

    getModelFrom:function(opts)
    {
        if (opts.hasOpt("url") == false && opts.hasOpt("data") == false)
        {
            tools.exception("the model must contain either a data or url field");
        }

        return(new Promise((resolve,reject) => {
            if (opts.hasOpt("data"))
            {
                resolve(opts.getOpt("data"));
            }
            else if (opts.hasOpt("url"))
            {
                ajax.create(opts.getOpt("url")).get().then(
                    function(result) {
                        resolve(result.text);
                    },
                    function(result) {
                        reject();
                    }
                );
            }
        }));
    },

    createWebSocket:function(url,delegate)
    {
        return(tools.createWebSocket(url,delegate));
    },

    getAjax:function()
    {
        return(ajax);
    },

    getTools:function()
    {
        return(tools);
    },

    getFormatter:function()
    {
        return(new Formatter());
    },

    getXPath:function()
    {
        return(xpath);
    },

    getResources:function()
    {
        return(resources);
    },

    createRouter:function()
    {
        return(new Router());
    },

    createOptions:function(o)
    {
        return(new Options(o));
    },

    createOptionsFromArgs:function()
    {
        return(new Options(this.getArgs()));
    },

    getArgs:function()
    {
        if (this._args == null)
        {
            this._args = tools.createCommandLineOpts();
        }

        return(this._args);
    },

    getArg:function(name,dv)
    {
        return(this.getArgs().getOpt(name,dv));
    },

    hasArg:function(name)
    {
        return(this.getArgs().hasOpt(name));
    },

    guid:function()
    {
        return(tools.guid());
    },

    createTimer:function()
    {
        return(tools.createTimer());
    },

    createFunction:function(text,options)
    {
        return(tools.createFunction(text,options));
    },

    isK8sUrl:function(url)
    {
        var code = false;
        var a = url.split("/");

        if (a.length >= 2)
        {
            code = (a[a.length - 1] == "esp" || a[a.length - 2] == "esp");
        }

        return(code);
    },

    formatDate:function(date,format)
    {
        return(tools.formatDate(date,format));
    },

    encode:function(o)
    {
        return(codec.encode(o));
    },

    decode:function(data)
    {
        return(codec.decode(data));
    },

    createBuffer:function(s)
    {
        return(tools.createBuffer(s));
    },

    stringFromBytes:function(bytes)
    {
        return(tools.stringFromBytes(bytes));
    },

    bytesFromString:function(s)
    {
        return(tools.bytesFromString(s));
    },

    b64Encode:function(o)
    {
        return(tools.b64Encode(o));
    },

    b64Decode:function(o)
    {
        return(tools.b64Decode(o));
    },

    stringify:function(o)
    {
        return(tools.stringify(o));
    },

    setHttpProxy:function(value)
    {
        tools.setHttpProxy(value);
    },

    setHttpsProxy:function(value)
    {
        tools.setHttpsProxy(value);
    },

    setNoProxy:function(value)
    {
        tools.setNoProxy(value);
    },

    usage:function(doc)
    {
        var docopts = new Options(doc);
        var f = new Formatter(doc);
        var command = docopts.getOpt("name","");
        var summary = docopts.getOpt("summary","");

        const   width = docopts.getOpt("width",60);

        console.log("");
        console.log("\x1b[1m\x1b[34m" + command + "(1)" + "\t\t\tESP Connect Node.js Commands\t\t\t" + command + "(1)\x1b[30m\x1b[0m");

        console.log("");
        console.log("\x1b[1m%s\x1b[0m","NAME");
        //console.log(f.tab() + "node " + command + ".mjs -- " + summary);
        console.log(f.tab() + command + " -- " + summary);

        console.log("");
        console.log("\x1b[1m%s\x1b[0m","SYNOPSIS");

        var options = docopts.getOpt("options",[]);

        if (docopts.getOpt("show_auth",true))
        {
            options.push({name:"access_token",arg:"OAuth Token",description:"OAuth authentiation token",required:false});
            options.push({name:"user",arg:"Auth User",description:"Authentication user",required:false});
            options.push({name:"pw",arg:"Auth Password",description:"Authentication password",required:false});
        }

        if (docopts.getOpt("show_cert",true))
        {
            options.push({name:"cert",arg:"certificate file",description:"certificate to use for secure connections."});
        }

        var maxoptlen = 0;

        var s = "";

        if (options != null)
        {
            options.forEach((o) => {

                s += " ";

                var opts = new Options(o);
                var name = opts.getOpt("name","");
                var arg = opts.getOpt("arg","");
                var tmp = name;
                if (arg.length > 0)
                {
                    tmp += " " + arg;
                }

                if (tmp.length > maxoptlen)
                {
                    maxoptlen = tmp.length;
                }

                if (opts.getOpt("required",false))
                {
                    s += "--" + name;
                }
                else
                {
                    s += "[--" + name + "]";
                }
            });
        }

        console.log("%s\x1b[1m%s\x1b[0m",f.tab(),"node " + command + ".mjs" + s);
        console.log("");

        console.log("\x1b[1m%s\x1b[0m","DESCRIPTION");

        if (docopts.hasOpt("description"))
        {
            var desc = f.format(docopts.getOpt("description",""),width,f.tab(),f.tab());
            console.log(desc);
        }

        if (options != null)
        {
            console.log("");
            console.log("\x1b[1m%s\x1b[0m","OPTIONS");

            maxoptlen = 10;

            var index = 0;

            options.forEach((o) => {
                var opts = new Options(o);
                var name = opts.getOpt("name","");
                var arg = opts.getOpt("arg","");
                s = name;
                if (arg.length > 0)
                {
                    s += " " + arg;
                }

                var prefix = f.tab();

                for (var i = 0; i < maxoptlen; i++)
                {
                    prefix += " ";
                }

                prefix += "   ";

                if (index > 0)
                {
                    console.log("");
                }

                var desc = f.format(opts.getOpt("description"),50 + maxoptlen,f.tab(2),f.tab(2));
                console.log("%s--%s \x1b[4m%s\x1b[0m",f.tab(),name,arg);
                console.log(desc);

                if (opts.hasOpt("examples"))
                {
                    var spaces = f.spaces((maxoptlen - s.length + 2) * 2);
                    console.log("");
                    console.log("%s\x1b[1m%s\x1b[0m",f.tab(3),"Examples");
                    var index = 0;
                    opts.getOpt("examples").forEach((example) => {
                        var opts = new Options(example);
                        var title = opts.getOpt("title","Example " + index);
                        title = f.format(title,null,f.tab(0),f.tab(0));
                        console.log("%s\x1b[1m%s\x1b[0m",f.tab(4),title);
                        console.log(f.tab(5) + "$ node " + command + " " + opts.getOpt("command",""));
                        var output = f.format(opts.getOpt("output",""),null,f.tab(5),f.tab(5));
                        console.log(output);
                    });
                    index++;
                }

                console.log("");
            });
        }

        if (docopts.hasOpt("examples"))
        {
            console.log("");
            console.log("\x1b[1m%s\x1b[0m","EXAMPLES");
            var index = 0;
            docopts.getOpt("examples").forEach((example) => {
                var opts = new Options(example);
                var title = opts.getOpt("title","Example " + index);
                title = f.format(title,null,f.tab(0),f.tab(0));
                console.log("%s\x1b[1m%s\x1b[22m",f.tab(),title);
                console.log(f.tab(2) + "$ node " + command + " " + opts.getOpt("command",""));
                var output = f.format(opts.getOpt("output",""),null,f.tab(2),f.tab(2));
                console.log(output);
            });
        }

        if (docopts.hasOpt("see_also"))
        {
            console.log("");
            console.log("\x1b[1m%s\x1b[0m","SEE ALSO");

            var maxlen = 0;

            docopts.getOpt("see_also").forEach((see) => {
                var opts = new Options(see);
                var name = opts.getOpt("name","");
                if (name.length > maxlen)
                {
                    maxlen = name.length;
                }
            });

            docopts.getOpt("see_also").forEach((see) => {
                var opts = new Options(see);
                var name = opts.getOpt("name","");
                var link = opts.getOpt("link","");
                var spaces = "";

                for (var i = 0; i < maxlen - name.length; i++)
                {
                    spaces += " ";
                }

                spaces += "   ";

                console.log("%s\x1b[1m%s\x1b[0m%s%s",f.tab(),name,spaces,link);
            });
        }

        console.log("");
        console.log("\x1b[1m\x1b[34m%s\x1b[0m","SAS ESP Connect\t\t\t\t"+ new Date().toDateString() + "\t\t\t\tSAS ESP Connect\x1b[30m\x1b[0m");
        console.log("");
    },

    getCredentials:function()
    {
        if (tools.isNode)
        {
            return(new Promise((resolve,reject) => {

                var p = function() {
                    console.log("");
                    var p = _prompts();
                    var user = p("User: ");
                    if (user.length == 0)
                    {
                        process.exit(1);
                    }
                    var pw = p("Password: ");
                    console.log("");
                    resolve({user:user,password:pw});
                }

                if (_prompts == null)
                {
                    import("prompt-sync").then(
                        function(result) {
                            _prompts = result.default;
                            p();
                        },
                        function() {
                            console.log("failed to import prompt-sync");
                            process.exit(1);
                        }
                    );
                }
                else
                {
                    p();
                }
            }));
        }
    }
};

Object.defineProperty(_api,"config", {
    get() {
        return(this._config);
    },

    set(value) {
        this._config = value;
    }
});

export {_api as connect};
