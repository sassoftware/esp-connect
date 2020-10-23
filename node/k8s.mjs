/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {default as connect} from "../dist/esp-connect-api.js";
var esp = connect.api;

var opts = esp.getArgs();

if (opts.getOpt("help",false))
{
    showUsage();
    process.exit(1);
}

var server = opts.getOptAndClear("server");

if (server == null)
{
    showUsage();
    process.exit(0);
}

var k8s = esp.createK8S(server);

if (opts.getOpt("projects",false))
{
    k8s.getMyProjects({
        handleProjects:function(data)
        {
            var a = [];
            var o = {};

            data.forEach((item) => {

                if (item.metadata.name != "sas-event-stream-processing-client-config-server")
                {
                    o = esp.createOptions();
                    o.setOpt("name",item.metadata.name);
                    o.setOpt("namespace",item.metadata.namespace);

                    var s = "";
                    s += "https://";
                    s += item.access.externalURL;
                    s += "/SASEventStreamProcessingServer";
                    s += "/" + item.metadata.name;
                    s += "/eventStreamProcessing/v1";
                    o.setOpt("esp",s);
                    a.push(o);

                    if (opts.getOpt("info",false))
                    {
                        console.log(JSON.stringify(item,null,2));
                    }
                }
            });

            var listing = {};
            listing.fields = ["namespace","name","esp"];
            listing.values = a;
            listing.headers = true;

            console.log(esp.getFormatter().listing(listing));
        }
    });
}

if (opts.getOpt("restart",false))
{
    if (esp.getTools().supports(k8s,"restart") == false)
    {
        console.log("you must specify a project to restart");
        process.exit(1);
    }

    console.log("restarting...");

    k8s.restart({
        loaded:function()
        {
            console.log("project restarted");
        }
    });
}

if (opts.getOpt("pods",false))
{
    k8s.getPods({
        handlePods:function(data)
        {
            var a = [];
            var o = {};

            data.forEach((item) => {
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
        }
    });
}

if (opts.getOpt("log",false))
{
    k8s.getLog({
        handleLog:function(log)
        {
            log.forEach((entry) => {
                console.log(JSON.stringify(entry,null,2));
            });
        }
    });
}

if (opts.hasOpt("ls"))
{
    var path = opts.getOpt("ls","/");
    k8s.ls(path, {
        handleFiles:function(files)
        {
            var listing = {};
            listing.fields = ["perms","owner","group","size","modified","name"];
            listing.values = files;
            listing.headers = true;

            console.log("\nListing for " + path + "\n");
            console.log(esp.getFormatter().listing(listing));
        }
    });
}

if (opts.hasOpt("get"))
{
    var path = opts.getOpt("get");
    var outfile = opts.getOpt("out");

    if (outfile == null)
    {
        const   index = path.lastIndexOf("/");

        if (index != -1)
        {
            outfile = path.substr(index + 1);
        }
    }

    k8s.get(path,{
        handleFile:function(tar)
        {
            if (outfile == null)
            {
                const   name = tar.getOpt("name");
                const   index = name.lastIndexOf("/");
                outfile = (index != -1) ? name.substr(index + 1) : name;
            }
            const   fs = require("fs");
            const   data = fs.writeFileSync(outfile,new DataView(tar.content));

            console.log("\nfile transfer complete\n");
        }
    });
}

if (opts.hasOpt("put"))
{
    const   url = opts.getOpt("put");
    const   path = opts.getOpt("path");

    if (url == null || path == null)
    {
        esp.getTools().exception("you must specify input URL and -path <remote path>");
    }

    console.log("\ncopying data...");

    k8s.puturl(url,path,opts.getOpts(),{
        done:function()
        {
            console.log("copy complete\n");
        }
    });
}

if (opts.getOpt("exec",false))
{
    const   command = opts.getOpt("_end");

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

if (opts.getOpt("espurl",false))
{
    setTimeout(function() {
        console.log(k8s.espUrl + "/eventStreamProcessing/v1");
    },1000
    );
}

function
showUsage()
{
    esp.usage({
        name:"k8s",
        summary:"Perform operations in a Kubernetes (K8S) server.",
        description:"This command performs operations in a K8S server. The server is specified by a URL.\n\
        The protocol is as follows:\n\
        <listing>protocols</listing>\
        The host and port point either directly to the K8S server\n\n \
        k8s://espdev-m1<dot>espkafkabroker<dot>sashq-r<dot>openstack<dot>sas<dot>com:6443/\n\n \
        or to a proxy (usually running on localhost):\n\n \
        k8s-proxy://localhost:8001/\n\n \
        You can also specify a namespace and a project in the URL:\n\n \
        k8s-proxy://localhost:8001/mynamespace/trades\n\n \
        The above URL would point directly to an ESP project.\
        ",
        options:[
            {name:"server",arg:"K8S server URL",description:"K8S server to which to connect. This can be either a K8S API server or a K8S Proxy server.",required:true},
            {name:"projects",description:"Retrieve the ESP projects from the K8S server. You can optionally filter the projects by project name and/or K8S namespace.", required:false,
                examples:[
                {
                    title:"Retrieve all ESP projects",
                    command:"--server k8s-proxy://localhost:8001 --projects"
                },
                {
                    title:"Retrieve ESP projects for namespace myns",
                    command:"--server k8s-proxy://localhost:8001/myns --projects"
                },
                {
                    title:"Retrieve ESP projects for project myproject in namespace myns",
                    command:"--server k8s-proxy://localhost:8001/myns/myproject --projects"
                }
            ]},
            {name:"pods",description:"Retrieve the pods from the K8S server."},
            {name:"get",description:"Retrieve a file from a pod.",
                examples:[
                {
                    title:"Get <fg:blue>hello.txt</fg> from /tmp",
                    command:"--server k8s-proxy://localhost:8001/myns/myproject --get /tmp/hello.txt"
                }]
            },
            {name:"put",description:"Copy a file into a pod. The parameter value should be a URL pointing to the file to copy.",
                examples:[
                {
                    title:"Put <fg:blue>hello.txt</fg> into /tmp",
                    command:"--server k8s-proxy://localhost:8001/myns/myproject --put file://hello.txt -path /tmp"
                }]
            },
            {name:"log",description:"Retrieve the log from a K8S pod. The URL must contain both a namespace and a project name."},
            {name:"ls",description:"Execute a file listing in a pod. The URL must contain both a namespace and a project name.",
                examples:[
                {
                    title:"Show files in /tmp",
                    command:"--server k8s-proxy://localhost:8001/myns/myproject --ls /tmp",
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
            },
            {name:"espurl",description:"Output the URL used to connect directly to the ESP server. The URL must contain both a namespace and a project name.",
                examples:[
                {
                    title:"Get ESP server URL",
                    command:"--server k8s-proxy://localhost:8001/myns/myproject --espurl",
                    output:"https://myns.ingress-nginx.espdev-m1.espkafkabroker.sashq-r.openstack.sas.com/SASEventStreamProcessingServer/myproject/eventStreamProcessing/v1"
                }]
            },
            {name:"exec",description:"Execute a command in the pod. Any text after the -- characters will be sent to the pod to be executed.\n\
            The URL must contain both a namespace and a project name.",
                examples:[
                {
                    title:"Cat a file from the pod",
                    command:"--server k8s-proxy://localhost:8001/myns/myproject --exec -- cat /tmp/hello.txt",
                    output:"hello, world"
                }]
            }
        ],
        listings:{"protocols":
                    {"fields":["Protocol","Description"],
                    "values":[
                        {"Protocol":"k8s:","Description":"Use this to connect directly to the K8S server"},
                        {"Protocol":"k8s-proxy:","Description":"Use this to connect to the K8S server through a K8S proxy (preferred)"}
                    ]
                }
            }
    });
}
