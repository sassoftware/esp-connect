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
$ node model -server http://espsrv01:7777
```

Connect provides several utilities you can use to communicate with an ESP server. These utilities contain JSON objects which are sent to the ESP server in order to perform tasks such
as loading projects, subscribing to events, and model viewing. The utilities are:
* *collection.js* - Subscribe to an event collection.</li>
* *stream.js* - Subscribe to an event stream.</li>
* *model.js* - Retrieve the ESP model.</li>
* *logs.js* - Set up a live view of ESP logs.</li>
* *load_project.js* - Load an ESP project from a file.</li>
* *load_router.js* - Load an ESP router from a file.</li>
* *publish_data.js* - Publish ESP event data from a file.</li>
* *publish_url.js* - Publish ESP event data from a URL (the server pulls from the URL).</li>
* *stats.js* - Set up a live view of ESP usage and memory statistics.</li>
* *xml.js* - Retrieve ESP project XML.

To run these utilities you run the *node* command on the desired javascript file:

```sh
$ node model -server http://espsr01:7777
```

**NOTE:** If you set the **ESP_SERVER** environment variable you can bypass specifying the *-server* parameter each time.

If the utility requires arguments you will get a usage statement. For example, if you run *collection.js* without arguments you will see:

```sh
$ node collection -server http://espsrv01:7777

usage: node collection -server -window [-pagesize] [-format] [-schema]

options:
	-server     ESP Server to which to connect in the form http://espserver:7777
	-window     ESP window in the form of project/contquery/window
	-format     xml | json | ubjson (defaults to ubjson)
	-pagesize   page size of the collection (defaults to 50)
	-schema     true | false (return schema on start, defaults to true)
	-sort       sort field

authentication:
	-auth		    authentication information to send to the server, i.e. Bearer <token> or Basic <credentials>
	-access_token	OAuth token to send to the server
```

To write your own Node.js programs you will need to follow a couple simple steps. Begin your javascript file with the following code to get a 
handle to the Connect API:

```javascript
var api = require("@sassoftware/espconnect");
```

Then you just use the API handle as you would in a web page. The following code is the *basic.js* program included in the package. You can 
use this as a starting point for NodeJS programs.
```javascript
var api = require("@sassoftware/espconnect");
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
