/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var api = require("@sassoftware/esp-connect");
var opts = api.getArgs();
var server = opts.getOpt("server");
var input = opts.getOpt("input");

if (server == null)
{
    server = process.env.ESP_SERVER;
}

if (server == null || input == null)
{
    showUsage();
    process.exit(0);
}

opts.clearOpts(["server","input","exit"]);

var readline = require("readline-sync");
var fs = require("fs");
var WS = require("ws");
var u = api.getTools().createUrl(decodeURI(server));

if (u["port"] == null)
{
    u["port"] = u["secure"] ? 443 : 80;
}

var url = u["secure"] ? "wss://" : "ws://";
var path = u["path"];
url += u["host"];
url += ":";
url += u["port"];
if (path.length > 1)
{
    url += path;
}
if (url.endsWith("/") == false)
{
    url += "/";
}
url += "eventStreamProcessing/v1/connect";

if (opts.hasOpt("access_token"))
{
    url += ("?access_token=" + opts.getOpt("access_token"));
}

//console.log("\n" + url + "\n");

var _authentication = opts.getOpt("auth");
var _handshakeComplete = false;
var _exitOnResponse = false;
var _request = null;
var _info = null;
var _ws = null;

function
createRequest()
{
    var filedata = fs.readFileSync(input);
    var content = filedata.toString();
    var json = JSON.parse(content);

    if (Array.isArray(json) == false)
    {
        throw("the input JSON must be an array");
    }

    var parms = {};

    for (var i = 0; i < json.length; i++)
    {
        if (json[i].hasOwnProperty("info"))
        {
            _info = json[i].info;
            break;
        }
    }

    var usage = null;

    if (_info != null)
    {
        if (_info.hasOwnProperty("defaults"))
        {
            var o = _info["defaults"];

            for (var x in o)
            {
                parms[x] = o[x];
            }
        }

        usage = (_info.hasOwnProperty("usage")) ? _info.usage : null;
    }

    if (usage != null && opts.getOpt("help",false))
    {
        console.log(outputUsage(usage));
        process.exit(1);
    }

    if (opts.numOpts > 0)
    {
        var o = opts.getOpts();

        for (var x in o)
        {
            parms[x] = o[x];
        }
    }

    var rgx;
    var results;

    rgx = new RegExp("#guid#","g");

    while ((results = rgx.exec(content)) != null)
    {
        content = content.replace(results[0],api.guid());
    }

    rgx = new RegExp("\"#include\":\"([A-z0-9_]*)\"","g");

    while ((results = rgx.exec(content)) != null)
    {
        if (parms.hasOwnProperty(results[1]))
        {
            var o = parms[results[1]];
            var s = "";

            s += "\"" + results[1] + "\":{";

            var i = 0;

            for (var x in o)
            {
                if (i > 0)
                {
                    s += ",";
                }
                s += "\"" + x + "\":\"" + o[x] + "\"";
                i++;
            }

            s += "}";
            content = content.replace(results[0],s);
        }
    }

    rgx = new RegExp("@([A-z0-9_]*)@");

    while ((results = rgx.exec(content)) != null)
    {
        var name = results[1];
        if (parms.hasOwnProperty(name) == false)
        {
            if (usage != null)
            {
                throw(outputUsage(usage,"you must provide a value for '" + name + "'"));
            }
            else
            {
                throw("you must provide a value for '" + name + "'");
            }
        }
        content = content.replace(new RegExp("@" + name + "@","g"),parms[name]);
    }

    rgx = new RegExp("\\$([A-z0-9_]*)\\$","g");

    while ((results = rgx.exec(content)) != null)
    {
        var name = results[1];
        if (parms.hasOwnProperty(name) == false)
        {
            if (usage != null)
            {
                throw(outputUsage(usage,"you must provide a value for '" + name + "'"));
            }
            else
            {
                throw("you must provide a value for '" + name + "'");
            }
        }

        var data = fs.readFileSync(parms[name]);
        content = content.replace(new RegExp("\\$" + name + "\\$","g"),data.toString("base64"));
    }

    _request = JSON.parse(content);

    if (_info != null)
    {
        _exitOnResponse = _info.hasOwnProperty("exit-on-response") ? (_info["exit-on-response"] == true) : false;
    }
}

function
connect()
{
    _handshakeComplete = false;

    var headers = {};

    if (opts.getOpt("auth") != null)
    {
        headers["authorization"] = opts.getOpt("auth");
    }

    _ws = new WS(url,{"headers":headers});
    _ws.on("open",wsOpen);
    _ws.on("close",wsClose);
    _ws.on("error",wsError);
    _ws.on("message",wsText);
}

try
{
    createRequest();
}
catch (exception)
{
    console.log(exception);
    process.exit(1);
}

connect();

function
wsOpen()
{
}

function
wsClose()
{
}

function
wsError(error)
{
    console.log("error: " + error);
    setTimeout(connect,1000);
}

function
wsText(message)
{
    if (_handshakeComplete == false)
    {
		var	name = "";
		var	value = null;
        var headers = null;
		var	c;

		for (var i = 0; i < message.length; i++)
		{
			c = message.charAt(i);

			if (c == '\n')
			{
				if (name.length == 0)
				{
					break;
				}

				if (headers == null)
				{
					headers = new Object();
				}

				if (value != null)
				{
					headers[name] = value.trim();
				}
				else
				{
					headers[name] = "";
				}

				name = "";
				value = null;
			}
			else if (value != null)
			{
				value += c;
			}
			else if (c == ':')
			{
				value = "";
			}
			else
			{
				name += c;
			}
		}

        if (headers == null)
        {
            return;
        }

		var	status = headers.hasOwnProperty("status") ? headers.status : null;

		if (status != null)
		{
			if (status == 200)
			{
				_handshakeComplete = true;

                try
                {
                    _request.forEach((o) =>
                    {
                        if (o.hasOwnProperty("info") == false)
                        {
                            _ws.send(JSON.stringify(o));
                        }
                    });

                    if (_info != null && _info.hasOwnProperty("exit"))
                    {
                        var seconds = _info["exit"];
                        setTimeout(function(){process.exit(0)},seconds * 1000);
                    }
                }
                catch (exception)
                {
                    console.log(exception);
                    process.exit(1);
                }
			}
			else if (status == 401)
			{
				if (_authentication != null)
				{
					_ws.send(_authentication);
                    _authentication = null;
				}
                else
                {
		            var	schema = headers.hasOwnProperty("www-authenticate") ? headers["www-authenticate"] : "";
                    var a = schema.toLowerCase().split(" ");

                    schema = a.length > 0 ? a[0] : "";

                    if (schema == "basic")
                    {
                        console.log("\n");
                        var user = readline.question("User: ");
                        var pass = readline.question("Pass: ", {
                            hideEchoBack: true
                        });

                        _ws.send("Basic " + api.b64Encode(user + ":" + pass));
                    }
                    else if (schema == "bearer")
                    {
                        console.log("\n");
                        var token = readline.question("Token: ");
                        _ws.send("Bearer " + token);
                    }
                }
			}
		}

        return;
    }

    if (typeof(message) == "string")
    {
        if (message.startsWith("{\"ping\":"))
        {
            //console.log("got ping");
            return;
        }

        console.log(message);
    }
    else
    {
        var buffer = new ArrayBuffer(message.length);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < message.length; ++i)
        {
           view[i] = message[i];
        }

        var o = api.decode(buffer);
        console.log(api.getTools().stringify(o));
    }

    if (_exitOnResponse)
    {
        process.exit(0);
    }
}

function
wsData(stream)
{
    var data = Buffer.alloc(0);

    stream.on("readable",function()
    {
        var newData = stream.read();

        if (newData != null)
        {
            data = Buffer.concat([data,newData],data.length + newData.length);
        }
    });

    stream.on("end",function()
    {
        var buffer = new ArrayBuffer(data.length);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < data.length; ++i)
        {
           view[i] = data[i];
        }

        var o = api.decode(buffer);
        console.log(api.getTools().stringify(o));
    });
}

function
outputUsage(usage,info)
{
    var s = "";

    if (info != null)
    {
        s += "\n" + info + "\n";
    }

    s += "\nusage: ";
    s += usage.hasOwnProperty("usage") ? usage.usage : "";

    if (usage.hasOwnProperty("options"))
    {
        s += "\noptions:";

        for (var x in usage.options)
        {
            s += "\n\t-" + x;
            s += "\t";
            if (x.length < 7)
            {
                s += "\t";
            }
            s += usage.options[x];
        }
    }

    s += "\n";

    return(s);
}

function
showUsage()
{
    console.log("");
    console.log("usage: node connect -server -input [-auth] [-access_token] [-help]");
    console.log("");
    console.log("options:");
    console.log("\t-server\t\tESP Server to which to connect in the form http://espserver:7777");
    console.log("\t-input\t\tfile containing JSON messages to send to the server");
    console.log("\t-auth\t\tauthentication information to send to the server, i.e. Bearer <token> or Basic <credentials>");
    console.log("\t-access_token\tOAuth token to send to the server");
    console.log("\t-help\t\tshow usage information for specified input");
    console.log("");
}
