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
    var stream = connection.getEventStream(opts.getOpts());
    stream.addDelegate({
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
        name:"stream",
        summary:"subscribe to an ESP event stream",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"window",arg:"ESP window",description:"ESP window in the form of project/contquery/window",required:true},
            {name:"format",arg:"xml | json | ubjson",description:"format of events sent to the client (defaults to ubjson)"},
            {name:"interval",arg:"milliseconds",description:"the interval, in milliseconds, at which to deliver events (defaults to 0 which delivers events as they occur)."},
            {name:"maxevents",arg:"numevents",description:"the maximum number of events to deliver at any one time (delivers to 0 which means no maximum)"},
            {name:"schema",arg:"true | false",description:"return schema on start, defaults to true."},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command subscribes to an ESP window for streaming events.",
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
