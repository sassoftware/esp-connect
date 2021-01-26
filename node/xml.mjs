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

esp.connect(server,{ready:ready,error:error,debug:true},o);

function
ready(connection)
{
    connection.getProjectXml(opts.getOpt("name"),opts.getOpts()).then(
        function(result) {
            console.log("" + esp.getXPath().xmlString(result));
            process.exit(0);
        }
    );
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
        name:"xml",
        summary:"display project XML from an ESP server",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"The name of the project for which to retrieve the xml (defaults to all)"}
        ],
        description:"This command is used to view project XML from an ESP server."
    });
}
