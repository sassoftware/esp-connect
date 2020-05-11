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
    var delegate = {modelLoaded:function(model,conn) {
        console.log("" + model.xml);
        process.exit(0);
    }};
    connection.loadModel(delegate,opts.getOpts());
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
            {name:"schema",arg:"true | false",description:"return schema information in data, defaults to true."}
        ],
        description:"This command subscribes to an ESP window for streaming events.",
        examples:[
        {
            title:"Retrieve all models",
            command:"-server http://espsrv01:7777"
        },
        {
            title:"Retrieve specific model",
            command:"-server http://espsrv01:7777 -name mymodel"
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
