/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {default as connect} from "../dist/esp-connect-api.js";
var esp = connect.api;

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

esp.connect(server,{ready:ready,error:error},o);

const   json = opts.getOpt("json",false);

function
ready(connection)
{
    var delegate = {
        handleLog:function(log,message)
        {
            var s = "";

            if (json)
            {
                s = JSON.stringify(message,null,2);
            }
            else
            {
                for (var name in message)
                {
                    s += name;
                    s += "=";
                    s += message[name];
                    s += "\n";
                }
            }

            console.log(s);
        }
    };

    if (opts.hasOpt("filter"))
    {
        connection.getLog().filter = opts.getOpt("filter");
    }
    connection.getLog().addDelegate(delegate);
}

function
error(conn)
{
    console.log("error: " + conn.getUrl());
    process.exit(0);
}

function
showUsage()
{
    esp.usage({
        name:"logs",
        summary:"view realtime ESP server logs",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command sets up a connection to an ESP server and reads the server logs. The logs are output to the screen.",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
