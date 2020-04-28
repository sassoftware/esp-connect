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

if (server == null || opts.hasOpts(["name","model"]) == false)
{
    showUsage();
    process.exit(0);
}

opts.clearOpt("server");

var fs = require("fs");

api.connect(server,{ready:ready});

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
    console.log("");
    console.log("usage: node load_router -server -name -model [-overwrite]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-name\t\tname of the ESP router");
    console.log("\t-model\t\tfile containing the ESP router configuration");
    console.log("\t-overwrite\ttrue | false (overwrite router if it exists, defaults to false)");
    console.log("");
}
