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

if (server == null || opts.hasOpts(["window","url"]) == false)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");

api.connect(server,{ready:ready});

function
ready(connection)
{
    var delegate = {
        publishComplete:function() {
            console.log("publish complete");
            process.exit(0);
        }
    };

    connection.publishUrl(opts.getOpt("window"),opts.getOpt("url"),delegate,opts.getOpts());
}

function
showUsage()
{
    console.log("");
    console.log("usage: node publish_url -server -window -url [-informat] [-blocksize] [-dateformat] [-times]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-window\t\tESP source window in the form of project/contquery/window");
    console.log("\t-url\t\tURL containing event data");
    console.log("\t-informat\tcsv | xml | json | bin (input data format, default is to derive from the URL)");
    console.log("\t-blocksize\tevent block size (defaults to 1)");
    console.log("\t-dateformat\tevent date format");
    console.log("\t-times\t\tnumber of times to publish (defaults to 1)");
    console.log("");
}
