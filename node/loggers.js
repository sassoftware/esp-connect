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
    showUsage();
    process.exit(0);
}

var config = {};
var cert = opts.getOptAndClear("cert");

if (cert != null)
{
    const   fs = require("fs");
    config.ca = fs.readFileSync(cert);
}

esp.config = config;

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var context = opts.getOpt("context");
    var delegate = {
        response:function(connection,data)
        {
            console.log(esp.getTools().stringify(data));
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
    console.log("usage: node loggers -server [-context] [-level]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-context\tthe logging context to return (defaults to ALL)");
    console.log("\t-level\t\ttrace | debug | info | warn | error | fatal | none (defaults to empty, do not set the log level)");
    console.log("");
}

function
showUsage()
{
    esp.usage({
        name:"loggers",
        summary:"display and set ESP logging contexts",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"context",arg:"logging context",description:"The name of the logging context. This is used to set the log level when the level option is specified."},
            {name:"level",arg:"level",description:"Set the logging context to this level. Possible values are\n\n\x1b[1mtrace | debug | info | warn | error | fatal | none.\x1b[0m\n"},,
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command is used to both view existing logging contexts and to set the logging level for those contexts.",
        examples:[
        {
            title:"View Loggers",
            command:"",
            output:"[\n\t{\n\t\t\"@level\": \"DEBUG\",\n\t\t\"@name\": \"DF.ESP\"\n\t},\n\t{\n\t\t\"@level\": \"INFO\",\n\t\t\"@name\": \"DF.ESP.AUTH\"\n\t},\n\t{\n\t\t\"@level\": \"DEBUG\",\n\t\t\"@name\": \"DF.ESP.ENGINE\"\n\t},\n\t{\n\t\t\"@level\": \"WARN\",\n\t\t\"@name\": \"DF.ESP.STATS\"\n\t}\n]\n"
        }
        ]
    });
}
