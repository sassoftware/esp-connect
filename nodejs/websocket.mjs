import {connect as esp} from "@sassoftware/esp-connect";
import {FileSource} from "./filesource.mjs";

var opts = esp.getArgs();
var url = opts.getOpt("url");

if (url == null)
{
    showUsage();
    process.exit(1);
}

var logging = opts.getOpt("logging",0);
var ubjson = opts.getOpt("ubjson",false);
var input = opts.getOpt("input");
var requests = null;

if (input != null)
{
    var fs = new FileSource(input);
    var content = "";
    var s;

    while ((s = fs.getline()) != null)
    {
        content += s;
    }

    requests = JSON.parse(content);
}

var o =
{
    open:function(e)
    {
        console.log("successfully connected to " + url);
        if (requests != null)
        {
            setTimeout(send,1000);
        }
    },

    close:function(e)
    {
        console.log("websocket close");
        process.exit(0);
    },

    error:function(e)
    {
        console.log("websocket error");
        process.exit(0);
    },

    message:function(ws,e)
    {
        if (typeof(e.data) == "string")
        {
            console.log(e.data);
        }
        else if (ubjson)
        {
            var o = esp.decode(e.data);
            console.log(esp.getTools().stringify(o));
        }
        else
        {
            console.log("got data of " + e.data.byteLength + " bytes");
        }
    }
};

var ws = null;

esp.getTools().createWebSocket(url,o).then(
    function(result) {
        ws = result;
    },
    function(error) {
        console.log("connected failed to " + url);
        process.exit(1);
    }
);

var index = 0;

function
send()
{
    while (index < requests.length)
    {
        const   o = requests[index];

        index++;

        if (logging == 1)
        {
            console.log(JSON.stringify(o,null,"\t"));
        }

        if (o.hasOwnProperty("sleep"))
        {
            setTimeout(send,o.sleep);
            return;
        }

        ws.send(JSON.stringify(o));
    }
}

function
showUsage()
{
    var desc = "";
    desc += "This command connects to a websocket and prints any output to the console.\n\n You can optionally ";
    desc += "specify an input file containing JSON objects to send to the server over the websocket.";

    const   usage = {
        name:"websocket",
        summary:"Connect to a websocket",
        description:desc,
        options:[
            {name:"url",arg:"Websocket Url",description:"Websocket to which to connect",required:true},
            {name:"input",arg:"Filename",description:"Input JSON file",required:false},
            {name:"logging",arg:"Level",description:"Logging level",required:false},
            {name:"ubjson",arg:"true | false",description:"Receive UBJSON, defaults to false",required:false}
        ],
        show_auth:false,
        show_cert:false
    }

    esp.usage(usage);
}
