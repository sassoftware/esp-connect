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

var connection = api.connect(server,{ready:ready});

function
ready()
{
    var context = opts.getOpt("context");
    var delegate = {
        response:function(connection,data)
        {
            console.log(api.getTools().stringify(data));
            process.exit(0);
        }
    };

    if (context != null)
    {
        connection.setLogger(context,opts.getOpt("level","debug"),delegate);
    }
    else
    {
        connection.getLoggers(delegate);
    }
}

function
showUsage()
{
    console.log("");
    console.log("usage: node loggers -server [-context] [-level] [-format] [-auth] [-access_token] [-help]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-context\t\tthe logging context to return (defaults to ALL)");
    console.log("\t-level\t\ttrace | debug | info | warn | error | fatal | none (defaults to empty, do not set the log level)");
    console.log("\t-format\t\txml | json (defaults to json)");
    console.log("\t-auth\t\tauthentication information to send to the server, i.e. Bearer <token> or Basic <credentials>");
    console.log("\t-access_token\tOAuth token to send to the server");
    console.log("\t-help\t\tshow usage information");
    console.log("");

    /*
    console.log("\t-\t\t");
    */
}
