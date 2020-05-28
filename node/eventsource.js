/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var esp = require("@sassoftware/esp-connect");
var opts = esp.getArgs();

if (opts.hasOpts(["server","config"]) == false)
{
    showUsage();
    process.exit(0);
}

var server = opts.getOptAndClear("server");
var config = opts.getOptAndClear("config");
var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var fs = require("fs");
    var filedata = fs.readFileSync(config);
    var configuration = new String(filedata);
    var delegate = {complete:function() {
        console.log("eventsources complete");
        process.exit(0);
    }};
    var eventsources = connection.createEventSources(delegate);
    eventsources.configure(configuration,opts.getOpts());
    eventsources.start();
}

function
showUsage()
{
    esp.usage({
        name:"eventsource",
        summary:"Read a configuration file and create event sources to publish data into an ESP server",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777.",required:true},
            {name:"config",arg:"filename",description:"file containing the event source configuration.",required:true}
        ],
        description:"Read data from a URL and publish it into ESP",
    });
}