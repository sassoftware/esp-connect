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

esp.connect(server,{ready:ready,getCredentials:getCredentials},o);

function
ready(connection)
{
    connection.getModel(opts.getOpts()).then(
        function(result){
            console.log("" + esp.getXPath().xmlString(result.xml));
            process.exit(0);
        },
        function(result) {
            console.log(result);
            process.exit(0);
        }
    );
}

import {default as prompts} from "prompt-sync";

function
getCredentials(options)
{
    console.log("");
    var p = prompts();
    var user = p("User: ");
    var pw = p("Password: ");
    console.log("");
    return({user:user,pw:pw});
}

function
showUsage()
{
    esp.usage({
        name:"model",
        summary:"display one or more ESP models from an ESP server",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"name of the project for which to retrieve the model (defaults to all)"},
            {name:"schema",arg:"true | false",description:"return schema information in data, defaults to true."},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command subscribes to an ESP window for streaming events.",
        examples:[
        {
            title:"Retrieve all models",
            command:"--server http://espsrv01:7777"
        },
        {
            title:"Retrieve specific model",
            command:"--server http://espsrv01:7777 --name mymodel"
        }
        ],
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
