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

var k8s = opts.getOptAndClear("k8s");

if (k8s == null)
{
    showUsage();
    process.exit(0);
}

esp.k8s = k8s;

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

esp.k8s.getProjects(o,opts.getOpts());

function
showUsage()
{
    esp.usage({
        name:"k8s_projects",
        summary:"Retrieve K8S projects",
        options:[
            {name:"server",arg:"Kubernetes server",description:"Kubernetes server to which to connect",required:true},
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
