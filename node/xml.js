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

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

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
    esp.usage({
        name:"xml",
        summary:"display project XML from an ESP server",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"The name of the project for which to retrieve the xml (defaults to all)"}
        ],
        description:"This command is used to view project XML from an ESP server."
    });
}
