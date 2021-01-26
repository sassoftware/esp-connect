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

var names = ["access_token","token","credentials","user","pw"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var data = fs.readFileSync(opts.getOpt("model"));
    var name = opts.getOpt("name");

    opts.clearOpts(["name","model"]);

    connection.loadRouter(name,data,opts.getOpts()).then(
        function(result) {
            console.log("router loaded: " + name);
            process.exit(0);
        },
        function(result) {
            console.log("error: " + result);
            process.exit(0);
        }
    );
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
            {name:"overwrite",arg:"true | false",description:"overwrite router if it exists, defaults to false",required:false}
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
