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

esp.connect(server,{ready:ready,error:error,debug:true},o);

function
ready(connection)
{
    var delegate = {
        response:function(connection,data,xml) {
            console.log("" + esp.getXPath().xmlString(xml));
            process.exit(0);
        },
        error:function(message) {
            console.log(message);
            process.exit(0);
        }
    };
    connection.getProjectXml(opts.getOpt("name"),delegate);
}

function
error(message)
{
    console.log(message);
    process.exit(0);
}

function
showUsage()
{
    esp.usage({
        name:"xml",
        summary:"display project XML from an ESP server",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"The name of the project for which to retrieve the xml (defaults to all)"},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command is used to view project XML from an ESP server."
    });
}
