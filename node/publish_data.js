/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var api = require("@sassoftware/esp-connect");
var opts = api.getArgs();

if (opts.getOpt("help",false))
{
    showUsage();
    process.exit(1);
}

var server = opts.getOpt("server");

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

api.connect(server,{ready:ready});

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
    console.log("usage: node publish_data -server -window -events");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-window\t\tESP source window in the form of project/contquery/window");
    console.log("\t-events\t\tfile containing the ESP events");
    console.log("");

    /*
    console.log("\t-\t\t");
    */
}
