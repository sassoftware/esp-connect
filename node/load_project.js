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

if (server == null || opts.hasOpts(["name","model"]) == false)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");

var names = ["access_token","token","credentials"];
var o = opts.clone(names);
opts.clearOpts(names);

esp.connect(server,{ready:ready},o);

function
ready(connection)
{
    var data = fs.readFileSync(opts.getOpt("model"));
    var name = opts.getOpt("name");

    var delegate = {
        loaded:function(connection,name) {
            console.log("project loaded: " + name);
            process.exit(0);
        },
        error:function(connection,name,message) {
            console.log("error: " + message);
            process.exit(0);
        }
    };

    opts.clearOpts(["name","model"]);

    connection.loadProject(name,data,delegate,opts.getOpts());
}

function
showUsage()
{
    esp.usage({
        name:"load_project",
        summary:"Load an ESP project from a file",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"name",arg:"project name",description:"name of the ESP project",required:true},
            {name:"model",arg:"filename",description:"file containing the ESP model",required:true},
            {name:"connectors",arg:"true | false",description:"start connectors, defaults to true",required:false},
            {name:"overwrite",arg:"true | false",description:"overwrite project if it exists, defaults to false",required:false},
            {name:"validate",arg:"true | false",description:"validate project, defaults to true",required:false},
            {name:"start",arg:"true | false",description:"start the project, defaults to true",required:false}
        ],
        description:"This command sends an ESP model from a file to the ESP server.",
        see_also:[
        {
            name:"ESP User Guide",
            link:"https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en"
        }
        ]
    });
}
