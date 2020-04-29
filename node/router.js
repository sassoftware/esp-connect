/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var esp = require("@sassoftware/esp-connect");
var opts = esp.getArgs();
var config = opts.getOpt("config");

if (config == null)
{
    showUsage();
    process.exit(0);
}

var fs = require('fs');
var filedata = fs.readFileSync(config);
var router = esp.createRouter();

router.configure(filedata.toString());
router.start();

function
showUsage()
{
    console.log("");
    console.log("usage: node router -config");
    console.log("");
    console.log("options:");
    console.log("\t-config\trouter configuration");
    console.log("");
}
