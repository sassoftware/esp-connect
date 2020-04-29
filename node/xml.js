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

if (server == null)
{
    showUsage();
    process.exit(0);
}

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

api.connect(server,{ready:ready},o);

function
ready(connection)
{
    var delegate = {response:function(connection,data,xml) {
        console.log("" + xml);
        process.exit(0);
    }};
    connection.getProjectXml(opts.getOpt("name"),delegate);
}

function
showUsage()
{
    console.log("");
    console.log("usage: node xml -server [-name] [-format]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-name\t\tname of the project for which to retrieve the xml (defaults to all)");
    console.log("\t-format\t\txml | json | ubjson (defaults to xml)");
    console.log("");

    /*
    console.log("\t-\t\t");
    */
}
