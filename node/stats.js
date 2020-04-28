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

opts.clearOpt("server");

api.connect(server,{ready:ready});

function
ready(connection)
{
    var delegate = {
        handleStats:function(stats)
        {
            console.log(api.getTools().stringify(stats.getMemoryData()));

            var windows = stats.getWindows();

            if (windows.length > 0)
            {
                console.log(api.getTools().stringify(windows));
            }
        }
    };
    connection.getStats().setOpts(opts.getOpts());
    connection.getStats().addDelegate(delegate);
}

function
showUsage()
{
    console.log("");
    console.log("usage: node stats -server [-mincpu] [-interval] [-format] [-counts] [-config] [-memory]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-mincpu\t\tThe minimum CPU usage, in percentage, to report (defaults to 5)");
    console.log("\t-interval\tThe interval, in seconds, at which to report information (defaults to 1)");
    console.log("\t-format\t\txml | json | ubjson (defaults to ubjson)");
    console.log("\t-counts\t\tboolean value determining whether or not to report window event counts (defaults to false)");
    console.log("\t-config\t\tboolean value determining whether or not to report server configuration info (defaults to false)");
    console.log("\t-memory\t\tboolean value determining whether or not to report server memory usage info (defaults to true)");
    console.log("");
}
