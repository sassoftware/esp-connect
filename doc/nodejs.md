## Using the API with Node.js
In addition to using the Connect API in web pages, you can use it 
with [Node.js](http://www.nodejs.org) to run Javascript programs from the command
line. This enables you to communicate with ESP from any platform supporting Node.js (which is about all of them). 

To use the API with Node.js, perform the following steps (this assumes you have Node.js and [npm](https://www.npmjs.com) installed).
* change to your HOME directory.
* Install the Connect API from the directory where you downloaded it (the module name is *@sassoftware/esp-connect*):

```sh
$ npm install @work@/js
```
* change directory to *@work@/esp/node*
* run a test using the following command (use your own ESP server):

```sh
$ node connect -server http://espsrv01:7777 -input model.json
```

Connect provides several utilities you can use to communicate with an ESP server. These utilities contain JSON objects which are sent to the ESP server in order to perform tasks such
as loading projects, subscribing to events, and model viewing. The utilities are:
* *collection.json* - Subscribe to an event collection.</li>
* *stream.json* - Subscribe to an event stream.</li>
* *model.json* - Retrieve the ESP model.</li>
* *logs.json* - Set up a live view of ESP logs.</li>
* *load_project.json* - Load an ESP project from a file.</li>
* *load_router.json* - Load an ESP router from a file.</li>
* *publish_data.json* - Publish ESP event data from a file.</li>
* *publish_url.json* - Publish ESP event data from a URL (the server pulls from the URL).</li>
* *stats.json* - Set up a live view of ESP usage and memory statistics.</li>
* *xml.json* - Retrieve ESP project XML.
To run these utilities you run the *node* command to execute *connect.js* and supply the target ESP server along with the utility file to run:
```sh
$ node connect -server http://espsr01:7777 -input collection.json
```
**NOTE:** If you set the **ESP_SERVER** environment variable you can bypass specifying the *-server* parameter each time.

If the utility requires arguments you will get a usage statement. For example, if you run *collection.json* without arguments you will see:

```sh
$ node connect -server http://espsrv01:7777 -input collection.json

usage: -window [-format] [-schema]
options:
	-window		ESP window in the form of project/contquery/window
	-format		xml | json | ubjson (defaults to ubjson)
	-schema		true | false (return schema on start, defaults to true)
```

To write your own Node.js programs you will need to follow a couple simple steps. Begin your javascript file with the following code to get a 
handle to the Connect API:

```javascript
var api = require('espconnect');
```

Then you just use the API handle as you would in a web page. The following code is the *basic.js* program included in the package. You can 
use this as a starting point for NodeJS programs.
```javascript
var api = require("espconnect");
var opts = api.getArgs();
var server = opts.getOpt("server");

if (server == null)
{
    showUsage();
    process.exit(0);
}

api.connect(server,{ready:ready});

function
ready(connection)
{
    connection.loadModel({modelLoaded:loaded});
}

function
loaded(model)
{
    model.projects.forEach((p) => {
        console.log(p.name);
        p.contqueries.forEach((cq) => {
            console.log("  " + cq.name);
            cq.windows.forEach((w) => {
                console.log("    " + w.name + " (" + w.type + ")");
            });
        });
    });
    process.exit(0);
}

function
showUsage()
{
    console.log("");
    console.log("usage: node basic -server");
    console.log("");
    console.log("options:");
    console.log("\t-server\tESP Server from which to receive the model (in the form http://espserver:7777)");
    console.log("");
}
```
