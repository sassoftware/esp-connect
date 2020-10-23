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

if (server == null || opts.hasOpts(["window"]) == false)
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
    var collection = connection.getEventCollection(opts.getOpts());
    collection.addDelegate({
        dataChanged:function(conn,data,clear) {

        if (data != null && data.length > 0)
        {
            console.log(esp.getTools().stringify(data));
        }
    },
        schemaReady:function(conn,datasource) {
            console.log("schema");
            console.log(datasource.schema.toString());
            console.log("end schema");
        }
    });
}

function
showUsage()
{
    esp.usage({
        name:"collection",
        summary:"subscribe to an ESP event collection",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"window",arg:"ESP window",description:"ESP window in the form of project/contquery/window",required:true},
            {name:"format",arg:"xml | json | ubjson",description:"format of events sent to the client (defaults to ubjson)"},
            {name:"pagesize",arg:"numevents",description:"page size of the collection (defaults to 50)."},
            {name:"schema",arg:"true | false",description:"return schema on start, defaults to true."},
            {name:"sort",arg:"field",description:"sort field"},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command subscribes to an ESP window for events.",
        examples:[
        {
            title:"Subscribe to events",
            command:"--server http://espsrv01:7777 --window secondary/cq/brokerAlertsAggr"
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
