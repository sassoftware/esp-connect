## The Javascript Router

ESP provides a mechanism whereby events can be routed between ESP servers by creating a router configuration such as the following:

```xml
<router output-stats-interval="5">
    <esp-engines>
        <esp-engine name="from" host="espsrv01" port="3501"/>
        <esp-engine name="to" host="espsrv01" port="3511"/>
    </esp-engines>
    <esp-destinations>
        <publish-destination name="dest" opcode="insert">
            <publish-target>
                <engine-func>to</engine-func>
                <project-func>secondary</project-func>
                <contquery-func>cq</contquery-func>
                <window-func>preparedTrades</window-func>
            </publish-target>
        </publish-destination>
    </esp-destinations>
    <esp-routes>
        <esp-route name="route" to="dest">
            <engine-expr>from</engine-expr>
            <window-expr>transform</window-expr>
        </esp-route>
    </esp-routes>
</router>
```
The Connect API provides a router which works in a similar manner. There are a couple of differences between the embedded server router and the 
Javascript router configuration:
* The port in the *esp-engine* definition is the ESP server HTTP port, not the pubsub port (since it is using the connect webspcket API).
* The routing functions are written in Javascript instead of ESP functional notation.

The ability to write the routing functions in Javascript is very powerful. For example, if you wanted to route trade data to different 
servers based on the broker, the configuration might look like this:
```xml
<router>
    <esp-engines>
        <esp-engine name="from" host="espsrv01" port="3500"/>
        <esp-engine name="to_1" host="espsrv01" port="3510"/>
        <esp-engine name="to_2" host="espsrv01" port="3520"/>
    </esp-engines>
    <esp-destinations>
        <publish-destination name="dest" opcode="insert">
            <publish-target>
                <engine-func>
                    if (data.brokerName == "Joe" || data.brokerName == "Sally")
                    {
                        return("to_1");
                    }
                    else if (data.brokerName == "John")
                    {
                        return("to_2");
                    }
                    else
                    {
                        return(null);
                    }
                </engine-func>
                <project-func>
                    return("secondary")
                </project-func>
                <contquery-func>
                    return("cq");
                </contquery-func>
                <window-func>
                    return("preparedTrades");
                </window-func>
            </publish-target>
        </publish-destination>
    </esp-destinations>
    <esp-routes>
        <esp-route name="the-route" to="dest">
            <engine-expr>from</engine-expr>
            <window-expr>transform</window-expr>
        </esp-route>
    </esp-routes>
</router>
```
This will route events for brokers *Joe* and *Sally* to server *to_1* and events for broker *John* to server *to_2*. Any event with a different broker name will be discarded.

To create run a router from a configuration your code would look something like this (this is from *router.js* which is supplied with the package):
```javascript
var api = require("espconnect");
var opts = api.getArgs();
var config = opts.getOpt("config");

if (config == null)
{
    showUsage();
    process.exit(0);
}

var fs = require("fs");
var filedata = fs.readFileSync(config);
var router = api.createRouter();

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
```

You can also create a router from scratch by using API calls.

```javascript
var router = api.createRouter();
router.addServer("esp","http://espsrv01:7777");

var dest = router.addPublishDestination("to");

dest.getEngine = function(data) {
    return("esp");
};

dest.getProject = function(data) {
    return("secondary");
};

dest.getContquery = function(data) {
    return("cq");
};

dest.getWindow = function(data) {
    return("preparedTrades");
};

var route = router.addRoute("from");
route.engine = "esp";
route.to = "to";
route.project = "primary";
route.win = "transform";

router.start();
```

You can add any custom destinations you need very easily. The destination just needs to implement the *process(data)* function.

```javascript
var logger = router.addDestination("logger");
logger.process = function(data) {
    console.log("got event: " + JSON.stringify(data));
};

route.to = "to,logger";
```
