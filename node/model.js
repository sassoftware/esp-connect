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

if (server == null)
{
    showUsage();
    process.exit(0);
}

var o = (opts.hasOpt("access_token")) ? {access_token:opts.getOpt("access_token")} : {};

api.connect(server,{ready:ready},o);

function
ready(connection)
{
    var delegate = {modelLoaded:function(model,conn) {
        console.log("" + model.xml);
        process.exit(0);
    }};
    connection.loadModel(delegate,opts.getOpts());
}

function
showUsage()
{
    console.log("");
    console.log("usage: node model -server [-name] [-format]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-name\t\tname of the project for which to retrieve the model (defaults to all)");
    console.log("\t-format\t\txml | json | ubjson (defaults to xml)");
    console.log("\t-schema\t\ttrue | false (return schema, defaults to false)");
    console.log("");
}
