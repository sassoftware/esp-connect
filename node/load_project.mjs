/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {connect as esp} from "@sassoftware/esp-connect";

var opts = esp.getArgs();

if (opts.getOpt("help",false))
{
    showUsage();
    process.exit(1);
}

var server = opts.getOptAndClear("server");

if (server == null || opts.hasOpts(["name","model"]) == false)
{
    showUsage();
    process.exit(0);
}

import {default as fs} from "fs";

var config = {};
var cert = opts.getOptAndClear("cert");

if (cert != null)
{
    config.ca = fs.readFileSync(cert);
}

esp.config = config;

opts.setOpt("model",{name:opts.getOpt("name"),url:opts.getOpt("model")});

esp.connect(server,{ready:ready,error:error},opts.getOpts());

function
ready(connection)
{
    console.log("project loaded and ready to go");
    process.exit(0);
}

function
error(connection,message)
{
    console.log(message);
    process.exit(0);
}

function
showUsage()
{
    esp.usage({
        name:"load_project",
        summary:"Load an ESP project from a file",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"name of the ESP project",required:true},
            {name:"model",arg:"URL",description:"URL containing the ESP model",required:true},
            {name:"connectors",arg:"true | false",description:"start connectors, defaults to true",required:false},
            {name:"overwrite",arg:"true | false",description:"overwrite project if it exists, defaults to false",required:false},
            {name:"validate",arg:"true | false",description:"validate project, defaults to true",required:false},
            {name:"start",arg:"true | false",description:"start the project, defaults to true",required:false},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command sends an ESP model from a file to the ESP server.",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
