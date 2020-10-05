/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var esp = require("@sassoftware/esp-connect");
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
    k8s.getProjects({
        handleProjects:function(data)
        {
            data.forEach((item) => {
                console.log(item.metadata.name);
                if (opts.getOpt("info",false))
                {
                    console.log(JSON.stringify(item,null,2));
                }
            });
        }
    });
}

if (opts.getOpt("pods",false))
{
    k8s.getPods({
        handlePods:function(data)
        {
            data.forEach((item) => {
                console.log(item.metadata.name);
                if (opts.getOpt("info",false))
                {
                    console.log(JSON.stringify(item,null,2));
                }
            });
        }
    });
}

if (opts.getOpt("pod",false))
{
    k8s.getPod({
        handlePod:function(pod)
        {
            console.log(pod.metadata.name);
            if (opts.getOpt("info",false))
            {
                console.log(JSON.stringify(pod,null,2));
            }
        }
    });
}

if (opts.hasOpt("ls"))
{
    var path = opts.getOpt("ls","/");
    k8s.ls(path, {
        handleFiles:function(files)
        {
            var f = new esp.getFormatter();
            var listing = f.listing(files,["perms","owner","group","size","modified","name"]);
            console.log("Listing for " + path + "\n");
            console.log(listing);
        }
    });
}

if (opts.hasOpt("cat"))
{
    var path = opts.getOpt("cat");
    k8s.cat(path, {
        output:function(data)
        {
            console.log(data);
        }
    });
}

if (opts.hasOpt("get"))
{
    var path = opts.getOpt("get");

    k8s.get(path,{
        handleFile:function(tar)
        {
            var outfile = opts.getOpt("out");
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

if (opts.getOpt("mkdir",false))
{
    const   path = opts.getOpt("mkdir");
    k8s.mkdir(path,{
        done:function()
        {
            console.log("\n" + path + " created\n");
        }
    });
}

if (opts.getOpt("rm",false))
{
    const   path = opts.getOpt("rm");
    k8s.rm(path,{
        done:function()
        {
            console.log("\n" + path + " removed\n");
        }
    });
}

if (opts.getOpt("test",false))
{
    k8s.test(opts);
}

function
showUsage()
{
    esp.usage({
        name:"k8s_projects",
        summary:"Retrieve K8S projects",
        options:[
            {name:"server",arg:"Kubernetes server",description:"Kubernetes server to which to connect.",required:true}
        ],
        description:"This command retrieves the ESP projects from a Kubernetes server. You can optionally filter the projects by project name and/or Kubernetes namespace.",
        examples:[
        {
            title:"Retrieve all ESP projects through a kubectl proxy",
            command:"-server k8ss-proxy://localhost:8001"
        },
        {
            title:"Retrieve ESP projects for namespace myns directly from the server",
            command:"-k8s https://10.104.16.129:6443/myns"
        },
        {
            title:"Retrieve ESP projects for namespace myns called myproject through a kubectl proxy",
            command:"-server k8ss-proxy://localhost:8001/myns/myproject"
        }
        ]
    });
}
