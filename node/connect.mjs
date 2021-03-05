/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {connect as esp} from "@sassoftware/esp-connect";
import {default as prompts} from "prompt-sync";
import {default as fs} from "fs";

var opts = esp.getArgs();

var server = opts.getOptAndClear("server","");

/*
if (server.length == 0)
{
    showUsage();
    process.exit(0);
}
*/

if (opts.hasOpt("load-project"))
{
    const   usage = {
        description:"Load an ESP project from a URL",
        options:[
            {name:"load-project",description:"Load project",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"name of the ESP project",required:true},
            {name:"model",arg:"URL",description:"URL containing the ESP model",required:true},
            {name:"connectors",arg:"true | false",description:"start connectors, defaults to true",required:false},
            {name:"overwrite",arg:"true | false",description:"overwrite project if it exists, defaults to false",required:false},
            {name:"validate",arg:"true | false",description:"validate project, defaults to true",required:false},
            {name:"start",arg:"true | false",description:"start the project, defaults to true",required:false}
        ]
    }

    var name = opts.getOpt("name","");

    if (server.length > 0)
    {
        var u = new URL(server);

        if (u.protocol.startsWith("k8s"))
        {
            const   index = u.pathname.lastIndexOf("/");

            if (index != -1)
            {
                name = u.pathname.substr(index + 1);
            }
        }
    }

    var url = opts.getOpt("model","");

    if (opts.getOpt("help",false) || server.length == 0 || name.length == 0 || url.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    opts.setOpt("model",{name:name,url:url});

    var o = {
        ready:function(connection) {
            console.log("project loaded and ready to go");
            process.exit(0);
        },
        error:function(connection,message) {
            console.log("error: " + message);
            process.exit(0);
        }
    }

    console.log("loading model for project " + name + "...");

    esp.connect(server,o,opts.getOpts());
}
else if (opts.hasOpt("router"))
{
    const   usage = {
        description:"Run a javascript router",
        options:[
            {name:"router",description:"Load router",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"config",arg:"configuration file",description:"The router configuration file",required:true}
        ]
    }

    var config = opts.getOpt("config","");

    if (opts.getOpt("help",false) || config.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    var filedata = fs.readFileSync(config);
    var router = esp.createRouter();

    router.configure(filedata.toString());
    router.start();
}
else if (opts.hasOpt("k8s-projects"))
{
    const   usage = {
        description:"List ESP projects in a cluster. The projects retrieved depend on the server URL.\n\
        <listing>urls</listing>\
        The output looks like\n\n\
        Namespace  Name     Ingress\n\
        ---------  -------  ------------------------------------------------------------------------------------------------------------\n\
        myns       basic    https://myns.ingress-nginx.espdev.sas.com/SASEventStreamProcessingServer/basic/eventStreamProcessing/v1\n\
        myns       sailing  https://myns.ingress-nginx.espdev.sas.com/SASEventStreamProcessingServer/sailing/eventStreamProcessing/v1\n\
        myns       trades   https://myns.ingress-nginx.espdev.sas.com/SASEventStreamProcessingServer/trades/eventStreamProcessing/v1\n\
        ",
        options:[
            {name:"k8s-projects",description:"List projects.",required:true},
            {name:"server",arg:"K8S Url",description:"ESP Server Pod to which to connect in the form k8s-proxy://localhost:8001/namespace/project.",required:true}
        ],
        listings:{"urls":
                    {"fields":["URL","Retrieves"],
                    "values":[
                        {"URL":"k8s-proxy://localhost:8001","Retrieves":"All the ESP projects in the cluster"},
                        {"URL":"k8s-proxy://localhost:8001/namespace","Retrieves":"All the ESP projects in the specified namespace"},
                        {"URL":"k8s-proxy://localhost:8001/namespace/project","Retrieves":"Only the single specified ESP project"}
                    ]
                }
            }
    }

    if (opts.getOpt("help",false) || server.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    var k8s = esp.createK8S(server,opts.getOpts());
    k8s.getMyProjects().then(
        function(items) {
            var a = null;
            var o = {};

            items.forEach((item) => {

                var s = "";
                s += "https://";
                s += item.access.externalURL;
                s += "/SASEventStreamProcessingServer";
                s += "/" + item.metadata.name;
                s += "/eventStreamProcessing/v1";

                if (a == null)
                {
                    a = [];
                }
                o = esp.createOptions();
                o.setOpt("name",item.metadata.name);
                o.setOpt("namespace",item.metadata.namespace);

                o.setOpt("ingress",s);
                a.push(o);

                if (opts.getOpt("info",false))
                {
                    console.log(JSON.stringify(item,null,2));
                }
            });

            if (a != null)
            {
                var listing = {};
                listing.fields = ["Namespace","Name","Ingress"];
                listing.values = a;
                listing.headers = true;

                console.log(esp.getFormatter().listing(listing));
            }
        },
        function(data) {
            console.log("error: " + data);
        }
    );
}
else if (opts.hasOpt("k8s-pods"))
{
    var k8s = esp.createK8S(server,opts.getOpts());
    k8s.getPods().then(
        function(data)
        {
            var a = [];
            var o = {};

            data.pods.forEach((item) => {
                o = esp.createOptions();
                o.setOpt("name",item.metadata.name);
                o.setOpt("namespace",item.metadata.namespace);
                o.setOpt("created",item.metadata.creationTimestamp);
                o.setOpt("status",item.status.phase);
                o.setOpt("restarts",item.status.containerStatuses[0].restartCount);
                a.push(o);

                if (opts.getOpt("info",false))
                {
                    console.log(JSON.stringify(item,null,2));
                }
            });

            var listing = {};
            listing.fields = ["namespace","name","created","status","restarts"];
            listing.values = a;
            listing.headers = true;

            console.log(esp.getFormatter().listing(listing));
        },
        function(data) {
            console.log("Error");
        }
    );
}
else if (opts.hasOpt("k8s-log"))
{
    var k8s = esp.createK8S(server,opts.getOpts());
    k8s.getLog().then(
        function(log)
        {
            log.forEach((entry) => {
                console.log(JSON.stringify(entry,null,2));
            });
        }
    );
}
else if (opts.hasOpt("k8s-ls"))
{
    const   usage = {
        description:"List a remote directory",
        options:[
            {name:"k8s-rm",description:"List remote directory.",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server Pod to which to connect in the form k8s-proxy://localhost:8001/namespace/project.",required:true},
            {name:"path",arg:"filename",description:"Remote directory to list.",required:true}
        ],
        examples:[
        {
            title:"Show files in /tmp",
            command:"--server k8s-proxy://localhost:8001/myns/myproject --k8s-ls --path /tmp",
            output:"\nListing for /tmp\n\n\
            perms      owner  group  size      modified      name              \n\
            ---------  -----  -----  --------  ------------  ----------------  \n\
            rwxr-xr-x  root   root   17        Jul 30 20:08  hsperfdata_root   \n\
            rw-r--r--  sas    sas    51782272  Oct 9 12:07   images.astore     \n\
            rwx------  root   root   836       Mar 10 2020   ks-script-u6CFR9  \n\
            rw-r--r--  sas    sas    2922      Oct 9 17:52   loggers.js        \n\
            rw-r--r--  sas    sas    3136420   Oct 9 12:06   sample.mp4        \n\
            rw-------  root   root   0         Mar 10 2020   yum.log           \n\
            "
        }]
    }

    var path = opts.getOpt("path","");

    if (opts.getOpt("help",false) || path.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    var k8s = esp.createK8S(server,opts.getOpts());
    k8s.ls(path).then(
        function(data)
        {
            var files = data["files"];
            var listing = {};
            listing.fields = ["perms","owner","group","size","modified","name"];
            listing.values = files;
            listing.headers = true;

            console.log("\nListing for " + path + "\n");
            console.log(esp.getFormatter().listing(listing));
        }
    );
}
else if (opts.hasOpt("k8s-get"))
{
    const   usage = {
        description:"Copy a local from a pod",
        options:[
            {name:"k8s-get",description:"Get a file.",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server Pod to which to connect in the form k8s-proxy://localhost:8001/namespace/project.",required:true},
            {name:"from",arg:"filename",description:"Remote file to copy.",required:true},
            {name:"to",arg:"filename",description:"Local file to which to copy."}
        ],
        examples:[
        {
            title:"Get <fg:blue>input.csv</fg> from /mnt/data/input",
            command:"--k8s-get --server k8s-proxy://localhost:8001/myns/myproject --from /mnt/data/input/input.csv --to myinput.csv"
        }]
    }

    var from = opts.getOpt("from","");
    var to = opts.getOpt("to","");

    if (opts.getOpt("help",false) || server.length == 0 || from.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    var k8s = esp.createK8S(server,opts.getOpts());

    if (to.length == 0)
    {
        const   index = from.lastIndexOf("/");

        if (index != -1)
        {
            to = from.substr(index + 1);
        }
        else
        {
            to = from;
        }
    }

    k8s.get(from).then(
        function(tar)
        {
            const   data = fs.writeFileSync(to,new DataView(tar.content));
            console.log("\nfile transfer complete to " + to + "\n");
        }
    );
}
else if (opts.hasOpt("k8s-put"))
{
    const   usage = {
        description:"Copy a local file into a pod",
        options:[
            {name:"k8s-put",description:"Copy file.",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server Pod to which to connect in the form k8s-proxy://localhost:8001/namespace/project.",required:true},
            {name:"from",arg:"filename",description:"Local file to copy.",required:true},
            {name:"to",arg:"remote path",description:"Remote file path.",required:true},
            {name:"name",arg:"filename",description:"Local file to copy."}
        ],
        examples:[
        {
            title:"Put <fg:blue>input.csv</fg> into /mnt/data/input",
            command:"--k8s-put --server k8s-proxy://localhost:8001/myns/myproject --from input.csv --to /mnt/data/input"
        },
        {
            title:"Put <fg:blue>input.csv</fg> into /mnt/data/input as <fg:blue>junk.csv</fg> ",
            command:"--k8s-put --server k8s-proxy://localhost:8001/myns/myproject --from input.csv --to /mnt/data/input --name junk.csv"
        }]
    }

    var from = opts.getOpt("from","");
    var to = opts.getOpt("to","");

    if (opts.getOpt("help",false) || server.length == 0 || from.length == 0 || to.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    var k8s = esp.createK8S(server,opts.getOpts());

    console.log("\ncopying data...");

    k8s.putFile(from,to,opts.getOpts()).then(
        function() {
            console.log("\ncopy complete\n");
        },
        function(result) {
            console.log("\ncopy error: " + result + "\n");
        }
    );
}
else if (opts.hasOpt("k8s-cat"))
{
    const   usage = {
        description:"Display a remote file on the screen",
        options:[
            {name:"k8s-cat",description:"Display file.",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server Pod to which to connect in the form k8s-proxy://localhost:8001/namespace/project.",required:true},
            {name:"file",arg:"filename",description:"Remote file to display.",required:true}
        ]
    }

    var file = opts.getOpt("file","");

    if (opts.getOpt("help",false) || file.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }


    var k8s = esp.createK8S(server,opts.getOpts());
    var path = opts.getOpt("file");
    k8s.cat(path).then(
        function(contents)
        {
            console.log(contents);
        }
    );
}
else if (opts.hasOpt("k8s-rm"))
{
    const   usage = {
        description:"Remove a remote file",
        options:[
            {name:"k8s-rm",description:"Remove file.",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server Pod to which to connect in the form k8s-proxy://localhost:8001/namespace/project.",required:true},
            {name:"file",arg:"filename",description:"Remote file to remove.",required:true}
        ]
    }

    var file = opts.getOpt("file","");

    if (opts.getOpt("help",false) || server.length == 0 || file.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    var k8s = esp.createK8S(server,opts.getOpts());
    k8s.rm(file).then(
        function()
        {
            console.log("\n" + file + " removed\n");
        }
    );
}
else if (opts.hasOpt("k8s-restart"))
{
    const   usage = {
        description:"Restart an ESP project in a cluster. The server URL must contain both a namespace and a project.",
        options:[
            {name:"k8s-restart",description:"Restart project.",required:true},
            {name:"server",arg:"ESP server",description:"ESP Server Pod to which to connect in the form k8s-proxy://localhost:8001/namespace/project.",required:true}
        ]
    }

    if (opts.getOpt("help",false) || server.length == 0)
    {
        showUsage(usage);
        process.exit(1);
    }

    var k8s = esp.createK8S(server,opts.getOpts());

    if (k8s.supports("restart") == false)
    {
        console.log("you must specify a project to restart");
        process.exit(1);
    }

    console.log("restarting...");

    k8s.restart().then(
        function()
        {
            console.log("project restarted");
        },
        function(error)
        {
            console.log(error);
        }
    );
}
else if (opts.hasOpt("k8s-auth"))
{
    var k8s = esp.createK8S(server,opts.getOpts());
    const   delegate = {
        getCredentials:function(options)
        {
            console.log("");
            var p = prompts();
            var user = p("User: ");
            var pw = p("Password: ");
            console.log("");
            return({user:user,pw:pw});
        }
    };
    function auth() {
        k8s.authenticate(delegate).then(
            function() {
                if (k8s.hasOpt("access_token"))
                {
                    console.log(k8s.getOpt("access_token"));
                }
            },
            function() {
                if (k8s.getOpt("saslogon-error",false))
                {
                }
                else
                {
                    auth();
                }
            }
        );
    }

    auth();
}
else if (opts.hasOpt("k8s-token"))
{
    var k8s = esp.createK8S(server,opts.getOpts());
    k8s.getAuthToken().then(
        function(result) {
            console.log(result);
        },
        function(result) {
            console.log("error: " + result);
        }
    );
}
else if (opts.hasOpt("k8s-secret"))
{
    var k8s = esp.createK8S(server,opts.getOpts());
    k8s.getSecret().then(
        function(result) {
            console.log(result.secret);
        },
        function(result) {
            console.log("error: " + result);
        }
    );
}
else if (opts.hasOpt("k8s-exec"))
{
    var k8s = esp.createK8S(server,opts.getOpts());
    var command = opts.getOpt("_end");

    k8s.run(command,{
        out:function(ws,message)
        {
            console.log(new TextDecoder().decode(message));
        },
        error:function(message)
        {
            console.log("error: " + message);
        }
    });
}
else
{
    var names = ["access_token","token","credentials","user","pw"];
    var o = opts.clone(names);
    opts.clearOpts(names);

    if (server.length > 0)
    {
        esp.connect(server,{ready:ready},o);
    }
    else
    {
        ready(null);
    }

    function
    ready(connection)
    {
        if (opts.getOpt("collection",false))
        {
            const   usage = {
                description:"This command subscribes to an ESP window for events.",
                options:[
                    {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
                    {name:"collection",description:"subscribe to an ESP event collection",required:true},
                    {name:"window",arg:"ESP window",description:"ESP window in the form of project/contquery/window",required:true},
                    {name:"format",arg:"xml | json | ubjson",description:"format of events sent to the client (defaults to ubjson)"},
                    {name:"pagesize",arg:"numevents",description:"page size of the collection (defaults to 50)."},
                    {name:"schema",arg:"true | false",description:"return schema on start, defaults to true."},
                    {name:"sort",arg:"field",description:"sort field"}
                ]
            }

            if (opts.getOpt("help",false))
            {
                showUsage(usage);
                process.exit(1);
            }

            connection.getEventCollection(opts.getOpts()).then(
                function(result) {

                    console.log("schema");
                    console.log(result.schema.toString());
                    console.log("end schema");

                    result.addDelegate({
                        dataChanged:function(conn,data,clear) {

                        if (data != null && data.length > 0)
                        {
                            console.log(esp.getTools().stringify(data));
                        }
                    }});
                },
                function(result) {
                    console.log("error: " + JSON.stringify(result,null,2));
                    process.exit(1);
                }
            );
        }
        else if (opts.getOpt("stream",false))
        {
            const   usage = {
                description:"This command subscribes to an ESP event stream.",
                options:[
                    {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
                    {name:"stream",description:"subscribe to an ESP event stream",required:true},
                    {name:"window",arg:"ESP window",description:"ESP window in the form of project/contquery/window",required:true},
                    {name:"format",arg:"xml | json | ubjson",description:"format of events sent to the client (defaults to ubjson)"},
                    {name:"interval",arg:"milliseconds",description:"the interval, in milliseconds, at which to deliver events (defaults to 0 which delivers events as they occur)."},
                    {name:"maxevents",arg:"numevents",description:"the maximum number of events to deliver at any one time (delivers to 0 which means no maximum)"},
                    {name:"schema",arg:"true | false",description:"return schema on start, defaults to true."}
                ]
            }

            if (opts.getOpt("help",false))
            {
                showUsage(usage);
                process.exit(1);
            }

            connection.getEventStream(opts.getOpts()).then(
                function(result) {

                    console.log("schema");
                    console.log(result.schema.toString());
                    console.log("end schema");

                    result.addDelegate({
                        dataChanged:function(conn,data,clear) {

                        if (data != null && data.length > 0)
                        {
                            console.log(esp.getTools().stringify(data));
                        }
                    }});
                },
                function(result) {
                    console.log("error: " + JSON.stringify(result,null,2));
                    process.exit(1);
                }
            );
        }
        else if (opts.hasOpt("logs"))
        {
            var delegate = {
                handleLog:function(log,message)
                {
                    var s = "";

                    if (opts.getOpt("json",false))
                    {
                        s = JSON.stringify(message,null,2);
                    }
                    else
                    {
                        for (var name in message)
                        {
                            s += name;
                            s += "=";
                            s += message[name];
                            s += "\n";
                        }
                    }

                    console.log(s);
                }
            };

            if (opts.hasOpt("filter"))
            {
                connection.getLog().filter = opts.getOpt("filter");
            }
            connection.getLog().addDelegate(delegate);
        }
        else if (opts.hasOpt("delete-project"))
        {
            var name = opts.getOpt("delete-project");

            connection.deleteProject(name).then(
                function(result) {
                    console.log(result.text);
                    process.exit(0);
                },
                function(result) {
                    console.log(result.text);
                    process.exit(1);
                }
            );
        }
        else if (opts.getOpt("model",false))
        {
            connection.getModel(opts.getOpts()).then(
                function(result){
                    console.log("" + esp.getXPath().xmlString(result.xml));
                    process.exit(0);
                },
                function(result) {
                    console.log(result);
                    process.exit(0);
                }
            );
        }
        else if (opts.getOpt("stats",false))
        {
            var delegate = {
                handleStats:function(stats)
                {
                    console.log(esp.getTools().stringify(stats.getMemoryData()));
                    var windows = stats.getWindows();

                    if (windows.length > 0)
                    {
                        console.log(esp.getTools().stringify(windows));
                    }
                }
            };
            connection.getStats().setOpts(opts.getOpts());
            connection.getStats().addDelegate(delegate);
        }
        else if (opts.getOpt("xml",false))
        {
            connection.getProjectXml(opts.getOpt("name"),opts.getOpts()).then(
                function(result) {
                    console.log("" + esp.getXPath().xmlString(result));
                    process.exit(0);
                }
            );
        }
        else if (opts.hasOpt("publish-data"))
        {
            const   usage = {
                description:"Publish ESP events from a file",
                options:[
                    {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
                    {name:"publish-data",description:"Publish data",required:true},
                    {name:"window",arg:"ESP window",description:"ESP window in the form of project/contquery/window",required:true},
                    {name:"events",arg:"filename",description:"file containing the ESP events",required:true},
                    {name:"blocksize",arg:"size",description:"event block size (defaults to 1)"},
                    {name:"dateformat",arg:"format",description:"event date format"}
                ]
            }

            var events = opts.getOpt("events","");
            var w = opts.getOpt("window","");

            if (events.length == 0 || w.length == 0)
            {
                showUsage(usage);
                process.exit(1);
            }

            var data = fs.readFileSync(events);

            console.log("begin publish...");

            connection.publishData(w,data,opts.getOpts()).then(
                function(result) {
                    console.log("publish complete");
                    process.exit(0);
                },
                function(result) {
                    console.log("publish error: " + result);
                    process.exit(0);
                }
            );
        }
        else if (opts.hasOpt("publish-url"))
        {
            var url = opts.getOpt("publish-url","");
            var w = opts.getOpt("window","");

            if (url.length == 0 || w.length == 0)
            {
                const usage = {
                    description:"Publish a URL into an ESP model",
                    options:[
                        {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
                        {name:"publish-url",arg:"URL",description:"URL containing the ESP events",required:true},
                        {name:"window",arg:"ESP window",description:"ESP source window in the form of project/contquery/window",required:true},
                        {name:"informat",arg:"csv | xml | json | bin",description:"input data format, default is to derive from the URL"},
                        {name:"blocksize",arg:"size",description:"event block size (defaults to 1)"},
                        {name:"dateformat",arg:"format",description:"event date format"},
                        {name:"times",arg:"number",description:"number of times to publish (defaults to 1)"}
                    ]
                }

                showUsage(usage);
                process.exit(1);
            }

            connection.publishUrl(w,url,delegate,opts.getOpts()).then(
                function(result) {
                    console.log("publish complete");
                    process.exit(0);
                },
                function(result) {
                    console.log("publish error: " + result);
                    process.exit(0);
                }
            );
        }
        else if (opts.hasOpt("eventsource"))
        {
            const   usage = {
                description:"Read a configuration file and create event sources to publish data into an ESP server",
                options:[
                    {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
                    {name:"eventsource",description:"Publish event sources",required:true},
                    {name:"config",arg:"filename",description:"file containing the event source configuration.",required:true}
                ]
            }

            var config = opts.getOptAndClear("config");

            if (config == null)
            {
                showUsage(usage);
                process.exit(0);
            }

            var filedata = fs.readFileSync(config);
            var configuration = new String(filedata);
            var delegate = {complete:function() {
                console.log("eventsources complete");
                process.exit(0);
            }};
            var eventsources = connection.createEventSources(delegate);
            eventsources.configure(configuration.toString(),opts.getOpts());
            eventsources.start();
        }
        else if (opts.hasOpt("project-updates"))
        {
            var delegate = {
                projectLoaded:function(name)
                {
                    console.log("project " + name + " loaded");
                },

                projectRemoved:function(name)
                {
                    console.log("project " + name + " removed");
                }
            };

            connection.addProjectUpdateDelegate(delegate);
        }
        else if (opts.hasOpt("loggers"))
        {
            var context = opts.getOpt("context");
            var level = opts.getOpt("level");

            if (context != null && level != null)
            {
                connection.setLogger(context,level).then(
                    function(result) {
                        console.log(JSON.stringify(result,null,"\t"));
                        process.exit(0);
                    }
                );
            }
            else
            {
                connection.getLoggers(context).then(
                    function(result) {
                        console.log(JSON.stringify(result,null,"\t"));
                        process.exit(0);
                    }
                );
            }
        }
        else if (opts.hasOpt("load-router"))
        {
            const   usage = {
                description:"Load an ESP router from a URL",
                options:[
                    {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
                    {name:"load-project",description:"Load router",required:true},
                    {name:"name",arg:"router name",description:"name of the ESP router",required:true},
                    {name:"model",arg:"filename",description:"file containing the ESP router configuration",required:true},
                    {name:"overwrite",arg:"true | false",description:"overwrite router if it exists, defaults to false",required:false}
                ]
            }

            var name = opts.getOpt("name","");
            var model = opts.getOpt("model","");

            if (name.length == 0 || model.length == 0)
            {
                showUsage(usage);
                process.exit(1);
            }

            var data = fs.readFileSync(model);

            opts.clearOpts(["name","model"]);

            connection.loadRouter(name,data,opts.getOpts()).then(
                function(result) {
                    console.log("router loaded: " + name);
                    process.exit(0);
                },
                function(result) {
                    console.log("error: " + result);
                    process.exit(0);
                }
            );
        }
        /*
        else if (opts.getOpt("help",false))
        {
            showUsage();
            process.exit(1);
        }
        else
        {
            process.exit(1);
        }
        */
        else
        {
            const   usage = {
                description:"Run ESP Connect commands",
                options:[
                    {name:"load-project",description:"Load a project from a file"},
                    {name:"delete-project",description:"Delete a project"},
                    {name:"collection",description:"Subscribe to an ESP event collection"},
                    {name:"stream",description:"Subscribe to an ESP event stream"},
                    {name:"model",description:"Display one or more ESP models from an ESP server"},
                    {name:"xml",description:"Display project XML from an ESP server"},
                    {name:"stats",description:"Display ESP server statistics"},
                    {name:"logs",description:"View realtime ESP server logs"},
                    {name:"publish-data",description:"Publish ESP events from a file"},
                    {name:"publish-url",description:"Publish ESP events from a URL"},
                    {name:"loggers",description:"Display and set ESP logging contexts"},
                    {name:"load-router",description:"Load an ESP router from a file"},
                    {name:"router",description:"Run a javascript router"},
                    {name:"eventsource",description:"Read a configuration file and create event sources to publish data into an ESP server"},
                    {name:"project-updates",description:"Listen for and report project load and delete events"},
                    {name:"k8s-projects",description:"List ESP projects in a Kubernetes cluster"},
                    //{name:"k8s-pods",description:"List ESP project pods in a Kubernetes cluster"},
                    {name:"k8s-log",description:"Retrieve the log from a K8S pod. The URL must contain both a namespace and a project name"},
                    {name:"k8s-ls",description:"Execute a file listing in a pod. The URL must contain both a namespace and a project name"},
                    {name:"k8s-get",description:"Retrieve a file from a pod"},
                    {name:"k8s-put",description:"Copy a file into a pod"},
                    {name:"k8s-cat",description:"Display file contents from a pod"},
                    {name:"k8s-rm",description:"Remove a file from a pod"},
                    {name:"k8s-restart",description:"Restart a project in a pod. The URL must contain both a namespace and a project name."},
                    //{name:"k8s-auth",description:""},
                    //{name:"k8s-token",description:""},
                    //{name:"k8s-secret",description:""},
                    {name:"k8s-exec",description:"Execute a command in the pod. Any text after the -- characters will be sent to the pod to be executed."}
                ]
            }

            showUsage(usage);
            process.exit(1);
        }
    }
}

function
showUsage(o)
{
    o.summary = "Run ESP Connect commands";
    o.name = "connect";
    o.see_also = [
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
    ];

    o.show_auth = false;
    o.show_cert = false;

    esp.usage(o);
}
