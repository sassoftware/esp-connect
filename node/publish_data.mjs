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

if (server == null || opts.hasOpts(["window","events"]) == false)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");

var config = {};
var cert = opts.getOptAndClear("cert");

if (cert != null)
{
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
    var data = fs.readFileSync(opts.getOpt("events"));

    console.log("begin publish...");

    var delegate = {
        publishComplete:function() {
            console.log("publish complete");
            process.exit(0);
        }
    };

    connection.publishData(opts.getOpt("window"),data,delegate,opts.getOpts());
}

function
showUsage()
{
    esp.usage({
        name:"publish_data",
        summary:"publish ESP events",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"window",arg:"ESP window",description:"ESP window in the form of project/contquery/window",required:true},
            {name:"events",arg:"filename",description:"file containing the ESP events",required:true},
            {name:"blocksize",arg:"size",description:"event block size (defaults to 1)"},
            {name:"dateformat",arg:"format",description:"event date format"},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command publishes events from a file into an ESP source window."
    });
}
