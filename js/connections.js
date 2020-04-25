/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "./serverconn",
    "./options"
], function(ServerConnection,Options)
{
    var __connections = 
    {
        connect:function(host,port,path,secure,delegate,options)
        {
            var conn = new ServerConnection(host,port,path,secure,delegate,options);
            return(conn);
        },
    };

    return(__connections);
});
