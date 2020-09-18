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

var server = opts.getOptAndClear("k8s");

if (server == null)
{
    showUsage();
    process.exit(0);
}

var o =
{
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
};

esp.createK8S(server).getProjects(o,opts.getOpts());

function
showUsage()
{
    esp.usage({
        name:"k8s_projects",
        summary:"Retrieve K8S projects",
        options:[
            {name:"k8s",arg:"Kubernetes server",description:"Kubernetes server to which to connect",required:true},
            {name:"ns",arg:"Kubernetes Namespace",description:"Return projects for this namespace",required:false},
            {name:"name",arg:"Project Name",description:"Return projects with this name",required:false}
        ],
        description:"This command retrieves the ESP projects from a Kubernetes server. You can optionally filter the projects by project name and/or Kubernetes namespace.",
        examples:[
        {
            title:"Retrieve all ESP projects",
            command:"-k8s https://10.104.16.129:6443"
        },
        {
            title:"Retrieve ESP projects for namespace myns",
            command:"-k8s https://10.104.16.129:6443 -ns myns"
        },
        {
            title:"Retrieve ESP projects for namespace myns called myproject",
            command:"-k8s https://10.104.16.129:6443 -ns myns -name myproject"
        }
        ]
    });
}
