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
    var context = opts.getOpt("context");
    var delegate = {
        handleLog:function(log,message)
        {
            console.log(message);
        }
    };
    connection.getLog().addDelegate(delegate);
}

function
showUsage()
{
    console.log("");
    console.log("usage: node logs -server [-context] [-level] [-format]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-format\t\txml | json | text (defaults to xml)");
    console.log("");
}
