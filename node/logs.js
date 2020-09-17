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

esp.k8s = opts.getOptAndClear("k8s");

var config = {};
var cert = opts.getOptAndClear("cert");

if (cert != null)
{
    const   fs = require("fs");
    config.ca = fs.readFileSync(cert);
}

esp.config = config;

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var delegate = {
        handleLog:function(log,message)
        {
            console.log(JSON.stringify(message,null,2));
        }
    };

    if (opts.hasOpt("filter"))
    {
        connection.getLog().filter = opts.getOpt("filter");
    }
    connection.getLog().addDelegate(delegate);
}

function
showUsage()
{
    esp.usage({
        name:"logs",
        summary:"view realtime ESP server logs",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command sets up a connection to an ESP server and reads the server logs. The logs are output to the screen.",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
