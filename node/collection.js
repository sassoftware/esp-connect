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

if (server == null || opts.hasOpts(["window"]) == false)
{
    showUsage();
    process.exit(0);
}

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var collection = connection.getEventCollection(opts.getOpts());
    collection.addDelegate({
        dataChanged:function(conn,data,clear) {

        if (data != null && data.length > 0)
        {
            console.log(esp.getTools().stringify(data));
        }
    },
        schemaReady:function(conn,datasource) {
            console.log("schema");
            console.log(datasource.schema.toString());
            console.log("end schema");
        }
    });
}

function
showUsage()
{
    console.log("");
    console.log("usage: node collection -server -window [-pagesize] [-format] [-schema] [-sort]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-window\t\tESP window in the form of project/contquery/window");
    console.log("\t-format\t\txml | json | ubjson (defaults to ubjson)");
    console.log("\t-pagesize\tpage size of the collection (defaults to 50)");
    console.log("\t-schema\t\ttrue | false (return schema on start, defaults to true)");
    console.log("\t-sort\t\tsort field");
    console.log("");
}
