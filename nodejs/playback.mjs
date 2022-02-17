import {connect as esp} from "@sassoftware/esp-connect";
import {default as url} from "url";
import {default as ws} from "websocket";
import {FileSource} from "./filesource.mjs";

var opts = esp.getArgs();
var server = opts.getOpt("server");
var logfile = opts.getOpt("logfile");

if (server == null || logfile == null)
{
    showUsage();
    process.exit(0);
}

const   start = opts.getOpt("start",-1);
const   end = opts.getOpt("end",-1);
const   restResponses = opts.getOpt("rest-responses",false);
const   wsResponses = opts.getOpt("ws-responses",false);
const   connectordir = opts.getOpt("connector-dir");
const   debug = opts.getOpt("debug",false);
const   verbose = opts.getOpt("verbose",false);

class Playback
{
    constructor(server,logfile)
    {
        this.NO_SECTION      = 1;
        this.HEADER_SECTION  = 2;
        this.REQUEST_SECTION = 3;
        this.DATA_SECTION    = 4;

        this._server = (server != null) ? url.parse(server) : null;
        this._fs = new FileSource(logfile);

        this._wsid = new RegExp(".*: .* \\((.*)\\*(.*)\\*.*\\)");
        this._wsbegin = new RegExp(".*: \\((.*)\\*(.*)\\*.*\\*(ascii|binary)\\)");
        this._wsend = new RegExp("\\((.*)\\)");

        this._wsthreads = {};
        this._websockets = {};

        this._entry = null;
        this._current = 0;

        this._done = false;
    }

    get linenumber()
    {
        return(this._fs.linenumber);
    }
}

class Playback6 extends Playback
{
    constructor(server,logfile)
    {
        super(server,logfile);
    }

    run()
    {
        var request = this._entry;

        this._entry = null;

        if (request != null)
        {
            this._current = request.timestamp;

            if (request.isWebSocket)
            {
                if (this._wsthreads.hasOwnProperty(request.thread))
                {
                    const   entry = this._wsthreads[request.thread];
                    const   self = this;

                    delete this._wsthreads[request.thread];

                    esp.createWebSocket(entry.url,entry).then(
                        function(result) {
                            request._wsdata.setOpt("websocket",result);
                            result._entry = entry;
                            self._websockets[request.websocketId] = request;
                            setTimeout(function(){self.run()},500);
                        },
                        function(error) {
                            console.log("create websocket error: " + error);
                        }
                    );

                    return;
                }
            }
            else
            {
                request.send();
            }
        }

        var content = null;
        var line = null;
        var fileinfo;
        var logger;
        var a;

        for (;;)
        {
//console.log("start loop: " + line);
            if (line == null)
            {
                if ((line = this._fs.getline()) == null)
                {
                    console.log("\ndone reading log...\n");
                    this._done = true;
                    break;
                }
            }

            a = line.split(";");

            logger = (a.length >= 4) ? a[3].trim() : "";
            fileinfo = (a.length >= 5) ? a[4].trim() : "";

            content = null;

            if (logger == "common.http")
            {
                if ((line = this._fs.getline()) == null)
                {
                    console.log("\ndone reading log...\n");
                    this._done = true;
                    break;
                }

                if (line == "-- start request --" ||
                    line.indexOf("websocket start:") == 0 ||
                    line.indexOf("websocket end:") == 0)
                {
                    content = a[a.length - 1].trim();
                    content += "\n";
                    content += line;

                    if (line == "-- start request --")
                    {
                        content += this.collect("-- end request --");
                    }
                    else if (line.indexOf("websocket start:") == 0)
                    {
                    }
                    else if (line.indexOf("websocket end:") == 0)
                    {
                    }
                    line = null;
                }
                /*
                else
                {
                    line = null;
                }
                */
            }
            else if (logger == "common.websocket")
            {
                if ((line = this._fs.getline()) == null)
                {
                    console.log("\ndone reading log...\n");
                    this._done = true;
                    break;
                }

                if (line.indexOf("begin websocket data:") == 0)
                {
                    content = a[a.length - 1].trim();
                    content += "\n";
                    content += line;
                    content += this.collect("end websocket data:",0);

                    line = null;
                }
                /*
                else
                {
                    line = null;
                }
                */
            }
            else
            {
                line = null;
            }

            if (content != null)
            {
                var o = {};
                o._timestamp = a[0];
                o.logger = logger;
                o.loggerLevel = a[1].trim();

                content += "\n";
                o.messageContent = content;
                if (fileinfo.length >= 2)
                {
                    fileinfo = fileinfo.substr(1,fileinfo.length - 2);
                    var fileline = fileinfo.split(":");
                    if (fileline.length == 2)
                    {
                        o.messageFile = fileline[0];
                        o.messageLine = fileline[1];
                    }
                }

                o.thread = a[2].trim();

                var entry = new LogEntry(this,o);

                if (entry.init() == false)
                {
                    continue;
                }

                this._entry = entry;

                const   self = this;

                if (this._current == 0)
                {
                    setTimeout(function(){self.run()},100);
                }
                else
                {
                    var maxwait = opts.getOpt("maxwait",-1);
                    var diff = this._entry.timestamp - this._current;

                    if (maxwait > 0 && diff > maxwait)
                    {
                        diff = maxwait;
                    }

                    if (verbose)
                    {
                        console.log("waiting for " + diff + " milliseconds...");
                    }

                    setTimeout(function(){self.run()},diff);
                }

                break;
            }
            /*
            else
            {
                line = null;
            }
            */
        }
    }

    collect(end,index)
    {
        var s = "";
        var line;

        for (;;)
        {
            if ((line = this._fs.getline()) == null)
            {
                console.log("\ndone reading log...\n");
                this._done = true;
                break;
            }

            s += "\n";
            s += line;

            if (index != null)
            {
                if (line.indexOf(end) == index)
                {
                    break;
                }
            }
            else if (line == end)
            {
                break;
            }
        }

        return(s);
    }
}

class Playback7 extends Playback
{
    constructor(server,logfile)
    {
        super(server,logfile);
    }

    run()
    {
        var request = this._entry;

        this._entry = null;

        if (request != null)
        {
            this._current = request.timestamp;

            if (request.isWebSocket)
            {
                if (this._wsthreads.hasOwnProperty(request.thread))
                {
                    const   entry = this._wsthreads[request.thread];
                    const   self = this;

                    delete this._wsthreads[request.thread];

                    esp.createWebSocket(entry.url,entry).then(
                        function(result) {
                            request._wsdata.setOpt("websocket",result);
                            result._entry = entry;
                            self._websockets[request.websocketId] = request;
                            setTimeout(function(){self.run()},500);
                        },
                        function(error) {
                            console.log("create websocket error: " + error);
                        }
                    );

                    return;
                }
            }
            else
            {
                request.send();
            }
        }

        var line;
        var o;

        for (;;)
        {
            if ((line = this._fs.getline()) == null)
            {
                console.log("\ndone reading log...\n");
                this._done = true;
                //setTimeout(function(){process.exit()},5000);
                break;
            }

            try
            {
                o = JSON.parse(line);
            }
            catch(e)
            {
                continue;
            }

            if (o.logger == "common.http" || o.logger == "common.websocket")
            {
                var entry = new LogEntry(this,o);

                if (entry.init() == false)
                {
                    continue;
                }

                this._entry = entry;

                const   self = this;

                if (this._current == 0)
                {
                    setTimeout(function(){self.run()},100);
                }
                else
                {
                    var maxwait = opts.getOpt("maxwait",-1);
                    var diff = this._entry.timestamp - this._current;

                    if (maxwait > 0 && diff > maxwait)
                    {
                        diff = maxwait;
                    }

                    if (verbose)
                    {
                        console.log("waiting for " + diff + " milliseconds...");
                    }

                    setTimeout(function(){self.run()},diff);
                }

                break;
            }
        }
    }
}

class LogEntry
{
    constructor(playback,o)
    {
        this._playback = playback;
        this._o = o;
        this._linenumber = this._playback.linenumber;
        this._opts = esp.createOptions();
        this._info = esp.createOptions();
        this._headers = esp.createOptions();
        this._wsdata = null;
        this._websocket = null;

        if (o.hasOwnProperty("thread"))
        {
            this._opts.setOpt("thread",o["thread"]);
        }

        Object.defineProperty(this,"url",{
            get() {
                return(this._opts.getOpt("url").toString());
            }
        });

        Object.defineProperty(this,"data",{
            get() {
                return(this._opts.getOpt("data"));
            }
        });

        Object.defineProperty(this,"timestamp",{
            get() {
                var ts = null;

                if (this._websocket != null)
                {
                    ts = this._websocket._wsdata.getOpt("timestamp");
                }
                else
                {
                    ts = this._opts.getOpt("timestamp");
                }
                return(ts);
            }
        });

        Object.defineProperty(this,"date",{
            get() {
                var date = new Date();
                var ts = this.timestamp;
                if (ts != null)
                {
                    date.setTime(ts);
                }
                return(date);
            }
        });

        Object.defineProperty(this,"isWebSocket",{
            get() {
                //return(this._opts.getOpt("isWebSocket",false));
                return(this._wsdata != null);
            }
        });

        Object.defineProperty(this,"websocketId",{
            get() {
                var id = (this._wsdata != null) ? this._wsdata.getOpt("id") : null;
                return(id);
            }
        });

        Object.defineProperty(this,"thread",{
            get() {
                return(this._opts.getOpt("thread",0));
            }
        });
    }

    init()
    {
/*
console.log(JSON.stringify(this._o,null,"\t"));
*/
        var lines = this._o.messageContent.split("\n");
        var a = [];

        lines.forEach((line) => {
            a.push(line);
        });
        this._o.messageContent = a;

        var section = this._playback.NO_SECTION;
        var wsdata = null;
        var value;
        var index;
        var name;
        var tmp;

        for (var line of a)
        {
            if (line == "-- start headers --")
            {
                section = this._playback.HEADER_SECTION;
            }
            else if (line == "-- start request --")
            {
                section = this._playback.REQUEST_SECTION;
                this._opts.setOpt("isrequest",true);
            }
            else if (line == "-- start data --")
            {
                section = this._playback.DATA_SECTION;
            }
            else if (line == "-- end data --")
            {
                section = this._playback.NO_SECTION;
            }
            else if (line.indexOf("websocket start:") == 0)
            {
                var results = this._playback._wsid.exec(line);

                if (results != null && results.length == 3)
                {
                    var id = results[1];
                    this._wsdata = esp.createOptions({id:id});
                }
            }
            else if (line.indexOf("websocket end:") == 0)
            {
                var results = this._playback._wsid.exec(line);
                if (results != null && results.length == 3)
                {
                    var id = results[1];
                    if (this._playback._websockets.hasOwnProperty(id))
                    {
                        this._websocket = this._playback._websockets[id];
                        this._websocket._wsdata.setOpt("close",true);
                    }
                    /*
                    if (this._playback._websockets.hasOwnProperty(id))
                    {
                        var ws = this._playback._websockets[id];
                        ws.close();
                        delete this._playback._websockets[id];
                    }
                    */
                }
            }
            else if (line.indexOf("begin websocket data:") == 0)
            {
                var results = this._playback._wsbegin.exec(line);

                if (results != null && results.length == 4)
                {
                    var id = results[1];

                    if (this._playback._websockets.hasOwnProperty(id))
                    {
                        this._websocket = this._playback._websockets[id];
                        wsdata = this._websocket._wsdata; 
                        wsdata.setOpt("timestamp",parseInt(results[2]));
                        wsdata.setOpt("type",results[3]);
                        //wsdata.setOpt("line",results[3]);
                        wsdata.setOpt("data","");
                    }
                }
            }
            else if (line.indexOf("end websocket data:") == 0)
            {
                wsdata = null;
            }
            else if (wsdata != null)
            {
                var data = wsdata.getOpt("data");
                data += line;
                wsdata.setOpt("data",data);
            }
            else if (section == this._playback.DATA_SECTION)
            {
                if (this._data == null)
                {
                    this._data = line;
                }
                else
                {
                    this._data += line;
                }
            }
            else if (section == this._playback.HEADER_SECTION || section == this._playback.REQUEST_SECTION)
            {
                if ((index = line.indexOf(":")) != -1)
                {
                    name = line.substr(0,index);
                    value = line.substr(index + 2);

                    if (section == this._playback.REQUEST_SECTION)
                    {
                        if (name == "timestamp")
                        {
                            tmp = value.split(" ");
                            value = tmp[0];
                            this._opts.setOpt("timestamp",new Number(value));
                        }

                        this._info.setOpt(name,value);
                    }
                    else
                    {
                        this._headers.setOpt(name,value);
                    }
                }
            }
        }

        if (this.isWebSocket || this._websocket != null)
        {
            return(true);
        }

        if (this._opts.getOpt("isrequest",false) == false)
        {
            return(false);
        }

        var url = new URL(this._info.getOpt("request"));
        url.hostname = this._playback._server.hostname;
        url.port = this._playback._server.port;
        this._opts.setOpt("url",url);

        if (url.protocol == "ws:" || url.protocol == "wss:")
        {
            this._playback._wsthreads[this.thread] = this;
            //this._opts.setOpt("isWebSocket",true);
            return(false);
        }

        return(true);
    }

    send()
    {
        if (this._websocket != null)
        {
            var wsdata = this._websocket._wsdata;
            var ws = wsdata.getOpt("websocket");
            var id = wsdata.getOpt("id");
            var close = wsdata.getOpt("close",false);

            if (close)
            {
                ws.close();
                delete this._playback._websockets[id];
            }
            else
            {
                var data = wsdata.getOpt("data");

                if (wsdata.getOpt("type","") == "binary")
                {
                    data = esp.getTools().b64Decode(data);
                }

                wsdata.getOpt("websocket").send(data);
            }
        }
        else
        {
            var request = esp.getAjax().create(this.url);
            var method = this._info.getOpt("method","get").toLowerCase();
            var self = this;

            if (method == "get")
            {
                request.get().then(
                    function(response) {

                        if (response.status == 0)
                        {
                            process.exit(0);
                        }

                        if (restResponses)
                        {
                            console.log("GET " + self.url + " (" + self._linenumber + ")");
                        }

                        if (response.status >= 400 && restResponses)
                        {
                            console.log(response.status + ": " + response.text);
                        }
                        else if (restResponses)
                        {
                            console.log(response.text);
                        }
                    },
                    function(error) {
                        if (restResponses)
                        {
                            console.log("GET " + self.url + " (" + self._linenumber + ")");
                        }
                        console.log("got error: " + error);
                        //process.exit(0);
                    }
                );
            }
            else if (method == "put")
            {
                if (this._data != null)
                {
                    if (connectordir != null)
                    {
                        var isproject = false;
                        var url = this._opts.getOpt("url");
                        var a = url.pathname.split("/");

                        for (var i = 0; i < a.length; i++)
                        {
                            if (a[i] == "projects")
                            {
                                isproject = true;
                                break;
                            }
                        }

                        if (isproject)
                        {
                            var xp = esp.getXPath();
                            var xml = xp.createXml(this._data);
                            var files = xp.getNodes("//property[@name='fsname']",xml);
                            var path;
                            var base;

                            files.forEach((file) => {
                                path = xp.nodeText(file);
                                a = path.split("/");
                                base = a[a.length - 1];
                                path = connectordir + "/" + base;
                                xp.setNodeText(file,path);
                            });

                            this._data = xp.xmlString(xml);
                        }
                    }

                    request.setData(this._data);
                }

                request.put().then(
                    function(response) {

                        if (response.status == 0)
                        {
                            process.exit(0);
                        }

                        if (restResponses)
                        {
                            console.log("PUT " + self.url + " (" + self._linenumber + ")");
                        }

                        if (response.status >= 400 && restResponses)
                        {
                            console.log(response.status + ": " + response.text);
                        }
                        else if (restResponses)
                        {
                            console.log(response.text);
                        }
                    },
                    function(error) {
                        if (restResponses)
                        {
                            console.log("PUT " + self.url + " (" + self._linenumber + ")");
                        }
                        console.log("got error: " + error);
                        //process.exit(0);
                    }
                );
            }
            else if (method == "post")
            {
                if (this._data != null)
                {
                    request.setData(this._data);
                }

                request.post().then(
                    function(response) {

                        if (response.status == 0)
                        {
                            process.exit(0);
                        }

                        if (restResponses)
                        {
                            console.log("POST " + self.url + " (" + self._linenumber + ")");
                        }

                        if (response.status >= 400 && restResponses)
                        {
                            console.log(response.status + ": " + response.text);
                        }
                        else if (restResponses)
                        {
                            console.log(response.text);
                        }
                    },
                    function(error) {
                        if (restResponses)
                        {
                            console.log("POST " + self.url + " (" + self._linenumber + ")");
                        }
                        console.log("got error: " + error);
                        //process.exit(0);
                    }
                );
            }
            else if (method == "delete")
            {
                request.del().then(
                    function(response) {

                        if (response.status == 0)
                        {
                            process.exit(0);
                        }

                        if (restResponses)
                        {
                            console.log("DELETE " + self.url + " (" + self._linenumber + ")");
                        }

                        if (response.status >= 400 && restResponses)
                        {
                            console.log(response.status + ": " + response.text);
                        }
                        else if (restResponses)
                        {
                            console.log(response.text);
                        }
                    },
                    function(error) {
                        if (restResponses)
                        {
                            console.log("DELETE " + self.url + " (" + self._linenumber + ")");
                        }
                        console.log("got error: " + error);
                        //process.exit(0);
                    }
                );
            }
        }
    }

    open()
    {
        if (debug)
        {
            console.log("websocket " + this._entry.url + " open, line: " + this._entry._linenumber);
        }
    }

    close()
    {
        if (debug)
        {
            console.log("websocket " + this._entry.url + " closed, line: " + this._entry._linenumber);
        }
    }

    error(message)
    {
    }

    message(message)
    {
        if (wsResponses)
        {
            console.log("\n" + this.url);

            if (typeof(message.data) == "string")
            {
                console.log(message.data);
            }
            else
            {
                var o = esp.decode(message.data);
                console.log(esp.getTools().stringify(o));
            }
        }
    }
}

//var version = new RegExp("esp engine started, version (.*),");
var versionExp = new RegExp("esp engine started, version ([^,]*),");
var extractExp = new RegExp("\\((.*)\\)");

//2021-10-05T12:33:17,552; INFO ; 00000005; esp.server; (Esp.cpp:641); {551f981c-3ec8-4a3f-a8c7-5769ecd68be5}[XMLServer0001] esp engine started, version 6.2, pubsub: 2223

function
createPlayback(server,logfile)
{
    var playback = null;
    var fs = new FileSource(logfile);
    var version = null;
    var s;

    while ((s = fs.getline()) != null)
    {
        if (s.indexOf("esp engine started") != -1)
        {
            var results = versionExp.exec(s);
            if (results != null && results.length == 2)
            {
                s = results[1];

                if (s.indexOf("(") != -1)
                {
                    results = extractExp.exec(s);
                    if (results != null && results.length == 2)
                    {
                        version = results[1];
                        break;
                    }
                }
                else
                {
                    version = results[1];
                    break;
                }
            }

        }
    }

    var major = null;
    var minor = null;

    if (version != null)
    {
        var a = version.split("\.");

        if (a.length == 2)
        {
            major = new Number(a[0]);
            minor = new Number(a[1]);
        }
    }

    if (major >= 7)
    {
        playback = new Playback7(server,logfile);
    }
    else
    {
        playback = new Playback6(server,logfile);
    }

    return(playback);
}

var playback = createPlayback(server,logfile);
playback.run();

function
showUsage()
{
    const   usage = {
        name:"playback",
        summary:"Playback ESP requests from the server log",
        description:"Playback ESP requests from the server log",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"logfile",arg:"filename",description:"file containing ESP server log",required:true},
            {name:"start",arg:"line number",description:"Line number of the log at which to start"},
            {name:"end",arg:"line number",description:"The last line number of the log to process"},
            {name:"rest-responses",arg:"true | false",description:"output the responses to HTTP requests to the console"},
            {name:"ws-responses",arg:"true | false",description:"output the responses to websocket requests to the console"},
            {name:"maxwait",arg:"milliseconds",description:"the maximum number of milliseconds to wait before sending requests"}
        ],
        show_auth:false,
        show_cert:false
    }

    esp.usage(usage);
}
