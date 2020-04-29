/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

var _isNode = false;

try
{
    _isNode = (require("detect-node") != null);
}
catch (e)
{
}

define([
    "./serverconn",
    "./ajax",
    "./xpath",
    "./resources",
	"./tools",
	"./codec",
	"./options",
	"./router"
], function(ServerConnection,ajax,xpath,resources,tools,codec,Options,Router)
{
	var	__api =
	{
		_args:null,

		isNode:function()
        {
            return(_isNode);
        },

		connect:function(url,delegate,options,start)
		{
            var conn = ServerConnection.create(url,delegate,options);
            if (start == null || start)
            {
                conn.start();
            }
            return(conn);
		},

        closed:function(connection)
        {
            for (var v of this._visuals)
            {
                v.closed(connection);
            }
        },

        createVisuals:function(options)
        {
            var visuals = new Visuals(options);
            this._visuals.push(visuals);
            return(visuals);
        },

		getAjax:function()
		{
			return(ajax);
		},

		getTools:function()
		{
			return(tools);
		},

		getXPath:function()
		{
			return(xpath);
		},

		getResources:function()
		{
			return(resources);
		},

		createRouter:function()
		{
			return(new Router());
		},

		createOptions:function(o)
		{
			return(new Options(o));
		},

		createOptionsFromArgs:function()
		{
			return(new Options(this.getArgs()));
		},

		getArgs:function()
        {
			if (this._args == null)
            {
                this._args = tools.createCommandLineOpts();
            }

            return(this._args);
        },

        getArg:function(name,dv)
        {
            return(args.getOpt(name,dv));
        },

        hasArg:function(name)
        {
            return(this.getArgs().hasOpt(name));
        },

        guid:function()
        {
            return(tools.guid());
        },

        formatDate:function(date,format)
        {
            return(tools.formatDate(date,format));
        },

        encode:function(o)
        {
            return(codec.encode(o));
        },

        decode:function(data)
        {
            return(codec.decode(data));
        },

        createBuffer:function(s)
        {
            return(tools.createBuffer(s));
        },

        b64Encode:function(o)
        {
            return(tools.b64Encode(o));
        },

        b64Decode:function(o)
        {
            return(tools.b64Decode(o));
        },

        stringify:function(o)
        {
            return(tools.stringify(o));
        }
	};

	return(__api);
});
