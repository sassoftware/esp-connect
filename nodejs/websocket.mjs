import {connect as esp} from "@sassoftware/esp-connect";

var opts = esp.getArgs();
var url = opts.getOpt("url");

if (url == null)
{
    showUsage();
    process.exit(1);
}

var ubjson = opts.getOpt("ubjson",false);

var o =
{
    open:function(e)
    {
        console.log("websocket open");
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
        setTimeout(run,1000);
        console.log("successfully connected to " + url);
    },
    function(error) {
        console.log("connected failed to " + url);
        process.exit(1);
    }
);

function
run()
{
    var stream = process.stdin;
    stream.on("data",(data) => {
        const   s = esp.stringFromBytes(data);
        console.log(s);
        ws.send(s);
    });
}

function
showUsage()
{
    const   usage = {
        name:"websocket",
        summary:"Connect to a websocket",
        description:"Connect to a websocket",
        options:[
            {name:"url",arg:"Websocket Url",description:"Websocket to which to connect",required:true},
            {name:"ubjson",arg:"true | false",description:"Receive UBJSON, defaults to true",required:false}
        ],
        show_auth:false,
        show_cert:false
    }

    esp.usage(usage);
}
