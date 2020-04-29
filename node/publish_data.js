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
    server = process.env.ESP_SERVER;
}

if (server == null || opts.hasOpts(["window","events"]) == false)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var data = fs.readFileSync(opts.getOpt("events"));

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
    console.log("");
    console.log("usage: node publish_data -server -window -events [-dataformat] [-blocksize]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-window\t\tESP source window in the form of project/contquery/window");
    console.log("\t-events\t\tfile containing the ESP events");
    console.log("\t-blocksize\tevent block size (defaults to 1)");
    console.log("\t-dateformat\tevent date format");
    console.log("");
}
