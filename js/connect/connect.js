/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

var _isNode = false;
var _fs = null;

try
{
    _isNode = (require("detect-node") != null);
}
catch (e)
{
}

define([
    "./serverconn",
    "./ajax",
    "./xpath",
    "./resources",
	"./tools",
	"./codec",
	"./options",
	"./router",
	"./k8s",
	"./formatter"
], function(ServerConnection,ajax,xpath,resources,tools,codec,Options,Router,k8s,Formatter)
{
	var	__api =
	{
		_args:null,
        _config:null,

		isNode:function()
        {
            return(_isNode);
        },

		connect:function(url,delegate,options,start)
		{
            var u = tools.createUrl(decodeURI(url));

            if (u.protocol.startsWith("k8s"))
            {
                var project = k8s.createProject(url);
                if (options == null)
                {
                    options = {};
                }
                options["k8s"] = project;
                project.connect(this,delegate,options,start);
            }
            else
            {
                var opts = new Options(options);
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

                var connection = ServerConnection.create(this,url,delegate,opts.getOpts());

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
                    connection.start();
                }
            }
		},

        closed:function(connection)
        {
            for (var v of this._visuals)
            {
                v.closed(connection);
            }
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
            return(args.getOpt(name,dv));
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

        createK8S:function(server)
        {
            return(k8s.create(server));
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

        usage:function(doc)
        {
            var f = new Formatter();

            var docopts = new Options(doc);
            var command = docopts.getOpt("name","");
            var summary = docopts.getOpt("summary","");

            console.log("");
            console.log("\x1b[1m\x1b[34m" + command + "(1)" + "\t\t\tESP Connect Node.js Commands\t\t\t" + command + "(1)\x1b[30m\x1b[0m");

            console.log("");
            console.log("\x1b[1m%s\x1b[0m","NAME");
            console.log(f.tab() + "node " + command + " -- " + summary);

            console.log("");
            console.log("\x1b[1m%s\x1b[0m","SYNOPSIS");

            var options = docopts.getOpt("options");
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
                        s += "-" + name;
                    }
                    else
                    {
                        s += "[-" + name + "]";
                    }
                });
            }

            console.log("%s\x1b[1m%s\x1b[0m",f.tab(),command + s);
            console.log("");

            console.log("\x1b[1m%s\x1b[0m","DESCRIPTION");

            if (docopts.hasOpt("description"))
            {
                var desc = f.format(docopts.getOpt("description",""),80,f.tab(),f.tab());
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

                    if (s.length > maxoptlen)
                    {
                        var desc = f.format(opts.getOpt("description"),50 + maxoptlen,f.tab(2),f.tab(2));
                        console.log("%s-%s \x1b[4m%s\x1b[0m",f.tab(),name,arg);
                        console.log(desc);
                    }
                    else
                    {
                        var spaces = f.spaces(maxoptlen - s.length + 2);
                        var desc = f.format(opts.getOpt("description"),50,f.tab() + f.spaces(maxoptlen + 3),spaces);

                        if (arg.length > 0)
                        {
                            console.log("%s-%s \x1b[4m%s\x1b[0m%s",f.tab(),name,arg,desc);
                        }
                        else
                        {
                            console.log("%s-%s%s%s",f.tab(),name,spaces,desc);
                        }
                    }

                    index++;
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
                    console.log("%s\x1b[1m%s\x1b[0m",f.tab(),title);
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
        }
	};

    Object.defineProperty(__api,"config", {
        get() {
            return(this._config);
        },

        set(value) {
            this._config = value;
        }
    });

	return(__api);
});
