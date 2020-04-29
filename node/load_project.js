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

var server = opts.getOptAndClear("server");

if (server == null)
{
    server = process.env.ESP_SERVER;
}

if (server == null || opts.hasOpts(["name","model"]) == false)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

api.connect(server,{ready:ready},o);

function
ready(connection)
{
    var data = fs.readFileSync(opts.getOpt("model"));
    var name = opts.getOpt("name");

    var delegate = {
        loaded:function(connection,name) {
            console.log("project loaded: " + name);
            process.exit(0);
        },
        error:function(connection,name,message) {
            console.log("error: " + message);
            process.exit(0);
        }
    };

    opts.clearOpts(["name","model"]);

    connection.loadProject(name,data,delegate,opts.getOpts());
}

function
showUsage()
{
    console.log("");
    console.log("usage: node load_project -server -name -model [-connectors] [-overwrite] [-validate] [-start]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-name\t\tname of the ESP project");
    console.log("\t-model\t\tfile containing the ESP model");
    console.log("\t-connectors\ttrue | false (start connectors, defaults to true)");
    console.log("\t-overwrite\ttrue | false (overwrite project if it exists, defaults to false)");
    console.log("\t-validate\ttrue | false (validate the project, defaults to true)");
    console.log("\t-start\t\ttrue | false (start the project, defaults to true)");
    console.log("");
}
