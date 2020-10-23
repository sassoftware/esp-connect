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

if (server == null || opts.hasOpts(["name","model"]) == false)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");

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
    var data = fs.readFileSync(opts.getOpt("model"));
    var name = opts.getOpt("name");

    var delegate = {
        loaded:function(connection,name) {
            console.log("router loaded: " + name);
            process.exit(0);
        },
        error:function(connection,name,message) {
            console.log("error: " + message);
            process.exit(0);
        }
    };

    opts.clearOpts(["name","model"]);

    connection.loadRouter(name,data,delegate,opts.getOpts());
}

function
showUsage()
{
    esp.usage({
        name:"load_router",
        summary:"Load an ESP router from a file",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"router name",description:"name of the ESP router",required:true},
            {name:"model",arg:"filename",description:"file containing the ESP router configuration",required:true},
            {name:"overwrite",arg:"true | false",description:"overwrite router if it exists, defaults to false",required:false},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command sends an ESP router from a file to the ESP server.",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
