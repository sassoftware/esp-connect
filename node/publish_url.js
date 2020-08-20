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

if (server == null || opts.hasOpts(["window","url"]) == false)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");

var config = {};
var cert = opts.getOptAndClear("cert");

if (cert != null)
{
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
    var delegate = {
        publishComplete:function() {
            console.log("publish complete");
            process.exit(0);
        }
    };

    connection.publishUrl(opts.getOpt("window"),opts.getOpt("url"),delegate,opts.getOpts());
}

function
showUsage()
{
    esp.usage({
        name:"publish_url",
        summary:"publish ESP events from a URL",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"window",arg:"ESP window",description:"ESP source window in the form of project/contquery/window",required:true},
            {name:"url",arg:"URL",description:"URL containing the ESP events",required:true},
            {name:"informat",arg:"csv | xml | json | bin",description:"input data format, default is to derive from the URL"},
            {name:"blocksize",arg:"size",description:"event block size (defaults to 1)"},
            {name:"dateformat",arg:"format",description:"event date format"},
            {name:"times",arg:"number",description:"number of times to publish (defaults to 1)"},
            {name:"cert",arg:"certificate file",description:"certificate to use for secure connections."}
        ],
        description:"This command publishes events from a URL into an ESP source window.<br/><br/>\
<note> It is important to note that the URL must \
be accessible to the ESP server. The command simply sends the URL to the server and the server connects to it in order to \
retrieve the events.",
        examples:[
        {
            title:"Publish events over HTTP",
            command:"-server http://espsrv01:7777 -window primary/cq/trades -url http://espserver:21000/events.csv"
        },
        {
            title:"Publish events from a file local to the ESP server",
            command:"-server http://espsrv01:7777 -window primary/cq/trades -url file:///mnt/data/espdata/events.csv"
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
