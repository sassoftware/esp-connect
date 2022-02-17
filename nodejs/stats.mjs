/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {connect as esp} from "@sassoftware/esp-connect";
import {default as fs} from "fs";

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
    config.ca = fs.readFileSync(cert);
}

esp.config = config;

var names = ["access_token","token","credentials","user","pw"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var delegate = {
        handleStats:function(stats)
        {
            console.log(esp.getTools().stringify(stats.getMemoryData()));

            var windows = stats.getWindows();

            if (windows.length > 0)
            {
                console.log(esp.getTools().stringify(windows));
            }
        }
    };
    connection.getStats().setOpts(opts.getOpts());
    connection.getStats().addDelegate(delegate);
}

function
showUsage()
{
    esp.usage({
        name:"stats",
        summary:"Display ESP server statistics",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"mincpu",arg:"minimum CPU",description:"The minimum CPU usage, in percentage, to report (defaults to 5)",required:false},
            {name:"interval",arg:"seconds",description:"The interval, in seconds, at which to report information (defaults to 1)",required:false},
            {name:"format",arg:"format",description:"format",required:false},
            {name:"counts",arg:"true | false",description:"boolean value determining whether or not to report window event counts (defaults to false)",required:false},
            {name:"config",arg:"true | false",description:"boolean value determining whether or not to report server configuration info (defaults to false)",required:false},
            {name:"memory",arg:"true | false",description:"boolean value determining whether or not to report server memory usage info (defaults to false)",required:false}
        ],
        description:"Display ESP server statistics",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
