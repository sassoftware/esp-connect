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
        projectLoaded:function(name)
        {
            console.log("project " + name + " loaded");
        },

        projectRemovedx:function(name)
        {
            console.log("project " + name + " removed");
        }
    };

    connection.addProjectUpdateDelegate(delegate);
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
        description:"This command listens for project load and delete events.",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
