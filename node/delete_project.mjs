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
var name = opts.getOptAndClear("name");

if (server == null || name == null)
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

esp.connect(server,{ready:ready,error:error},opts.getOpts());

function
ready(connection)
{
    var o = {
        deleted:function() {
            console.log("project deleted");
            process.exit(0);
        },
        error:function(conn,name,message) {
            console.log(message);
            process.exit(1);
        }
    };
    connection.deleteProject(name,o);
}

function
error(conn)
{
    console.log("error: " + conn.getUrl());
    process.exit(0);
}

function
showUsage()
{
    esp.usage({
        name:"delete_project",
        summary:"Delete an ESP project from a server",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"name of the ESP project",required:true},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command deletes an ESP model from an ESP server.",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
