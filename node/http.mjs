/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

/*
    This runs a NodeJS HTTP server.

    If you are running an HTTPS server, you can use the following commmand to create your key and
    certificate:

    openssl req -nodes -new -x509 -keyout server.key -out server.cert
*/

import {connect as esp} from "@sassoftware/esp-connect";
import {default as https} from "https";
import {default as http} from "http";
import {default as fs} from "fs";
import {default as nodestatic} from "node-static";

var opts = esp.getArgs();
var port = opts.getOpt("port","4444");
var server = null;

var fileserver = new(nodestatic.Server)(process.cwd());

var handler = function(request,response)
{
    fileserver.serve(request,response);
}

if (opts.getOpt("secure",false))
{
    var key = opts.getOpt("key","server.key");
    var cert = opts.getOpt("cert","server.cert");

    const options = {
      key:fs.readFileSync(key),
      cert:fs.readFileSync(cert)
    };

    server = https.createServer(options,handler);
    console.log("https server running on " + port);
}
else
{
    server = http.createServer(handler);
    console.log("http server running on " + port);
}

server.listen(port);
