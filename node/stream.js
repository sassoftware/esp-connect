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

if (server == null || opts.hasOpts(["window"]) == false)
{
    showUsage();
    process.exit(0);
}

api.connect(server,{ready:ready});

function
ready(connection)
{
    var stream = connection.getEventStream(opts.getOpts());
    stream.addDelegate({
        dataChanged:function(conn,data,clear) {

        if (data != null && data.length > 0)
        {
            console.log(api.getTools().stringify(data));
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
    console.log("usage: node stream -server -window [-format] [-interval] [-maxevents] [-schema]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-window\t\tESP window in the form of project/contquery/window");
    console.log("\t-format\t\txml | json | ubjson (defaults to ubjson)");
    console.log("\t-interval\tthe interval, in milliseconds, at which to deliver events (defaults to 0 which delivers events as they occur)");
    console.log("\t-maxevents\tthe maximum number of events to deliver at any one time (delivers to 0 which means no maximum)");
    console.log("\t-schema\t\ttrue | false (return schema on start, defaults to true)");
    console.log("\t-sort\t\tsort field");
    console.log("");
}
