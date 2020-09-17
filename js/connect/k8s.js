/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "./tools",
    "./ajax",
    "./options"
], function(tools,ajax,Options)
{
    function
    Kubernetes(server)
    {
        this._server = server;
    }

    Kubernetes.prototype.getProjects =
    function(delegate,options)
    {
        if (tools.supports(delegate,"handleProjects") == false)
        {
            tools.exception("the delegate must implement the handleProjects function");
        }

        var opts = new Options(options);
        var url = this._server;
        url += "/apis/iot.sas.com/v1alpha1";

        if (opts.hasOpt("ns"))
        {
            url += "/namespaces/" + opts.getOpt("ns");
        }

        url += "/espservers";

        if (opts.hasOpt("name"))
        {
            url += "/" + opts.getOpt("name");
        }

        var k8s = this;
        var o = {
            response:function(request,text) {
                var data = JSON.parse(text);

                if (data.code == 404)
                {
                    if (tools.supports(delegate,"projectNotFound"))
                    {
                        delegate.projectNotFound(request,opts.toString());
                    }
                    else
                    {
                        console.log("project not found: " + opts.toString());
                    }
                }
                else
                {
                    var kind = data.kind;
                    var a = null;

                    if (kind == "ESPServer")
                    {
                        a = [data];
                    }
                    else if (kind == "ESPServerList")
                    {
                        a = data.items;
                    }

                    delegate.handleProjects(a);
                }
            },
            error:function(request,error) {
                if (tools.supports(delegate,"error"))
                {
                    delegate.error(request,error);
                }
                else
                {
                    console.log("error: " + error);
                }
            }
        };
        var request = ajax.create("load",url,o);
		request.setRequestHeader("accept","application/json");
        request.get();
    }

    return(Kubernetes);
});
