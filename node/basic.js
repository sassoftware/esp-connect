/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var api = require("@sassoftware/esp-connect");
var opts = api.getArgs();
var server = opts.getOpt("server");

if (server == null)
{
    showUsage();
    process.exit(0);
}

api.connect(server,{ready:ready});

function
ready(connection)
{
    connection.loadModel({modelLoaded:loaded});
}

function
loaded(model)
{
    model.projects.forEach((p) => {
        console.log(p.name);
        p.contqueries.forEach((cq) => {
            console.log("  " + cq.name);
            cq.windows.forEach((w) => {
                console.log("    " + w.name + " (" + w.type + ")");
            });
        });
    });
    process.exit(0);
}

function
showUsage()
{
    console.log("");
    console.log("usage: node basic -server");
    console.log("");
    console.log("options:");
    console.log("\t-server\tESP Server from which to receive the model (in the form http://espserver:7777)");
    console.log("");
}
