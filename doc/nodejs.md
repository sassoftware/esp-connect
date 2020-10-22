## Using the API with Node.js
In addition to using the Connect API in web pages, you can use it 
with [Node.js](http://www.nodejs.org) to run Javascript programs from the command
line. This enables you to communicate with ESP from any platform supporting Node.js (which is about all of them). 

To use the API with Node.js, perform the following steps (this assumes you have Node.js and [npm](https://www.npmjs.com) installed).
* change to your HOME directory.
* Install the Connect API from the directory where you downloaded it (the module name is *@sassoftware/esp-connect*):

```sh
$ npm install @work@/js/connect
```
* change directory to *@work@/esp/node*
* run a test using the following command (use your own ESP server):

```sh
$ node model.mjs -server http://espsrv01:7777
```

Connect provides several utilities you can use to communicate with an ESP server. These utilities contain JSON objects which are sent to the ESP server in order to perform tasks such
as loading projects, subscribing to events, and model viewing. The utilities are:
* *collection.mjs* - Subscribe to an event collection.</li>
* *stream.mjs* - Subscribe to an event stream.</li>
* *model.mjs* - Retrieve the ESP model.</li>
* *logs.mjs* - Set up a live view of ESP logs.</li>
* *load_project.mjs* - Load an ESP project from a file.</li>
* *load_router.mjs* - Load an ESP router from a file.</li>
* *publish_data.mjs* - Publish ESP event data from a file.</li>
* *publish_url.mjs* - Publish ESP event data from a URL (the server pulls from the URL).</li>
* *stats.mjs* - Set up a live view of ESP usage and memory statistics.</li>
* *xml.mjs* - Retrieve ESP project XML.

To run these utilities you run the *node* command on the desired javascript file:

```sh
$ node model.mjs -server http://espsr01:7777
```

If the utility requires arguments you will get a usage statement. For example, if you run *collection.js* without arguments you will see:

```sh
$ node collection.mjs -server http://espsrv01:7777


collection(1)			ESP Connect Node.js Commands			collection(1)

NAME
    node collection.mjs -- subscribe to an ESP event collection

SYNOPSIS
    collection --server --window [--format] [--pagesize] [--schema] [--sort] [--cert]

DESCRIPTION
    This command subscribes to an ESP window for events.

OPTIONS
    --server ESP server
        ESP Server to which to connect in the form http://espserver:7777

    --window ESP window
        ESP window in the form of project/contquery/window

    --format xml | json | ubjson
        format of events sent to the client (defaults to ubjson)

    --pagesize numevents
        page size of the collection (defaults to 50).

    --schema true | false
        return schema on start, defaults to true.

    --sort field
        sort field

    --cert certificate file
        certificate to use for secure connections.


EXAMPLES
    Subscribe to events
        $ node collection --server http://espsrv01:7777 --window secondary/cq/brokerAlertsAggr
        

SEE ALSO
    ESP User Guide   https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en

SAS ESP Connect				Wed Oct 21 2020				SAS ESP Connect

```

To write your own Node.js programs you will need to follow a couple simple steps. Begin your javascript file with the following code to get a 
handle to the Connect API:

```javascript
import {connect as esp} from "@sassoftware/esp-connect";
```

Then you just use the API handle as you would in a web page. The following code is the *basic.js* program included in the package. You can 
use this as a starting point for NodeJS programs.
```javascript
import {connect as esp} from "@sassoftware/esp-connect";

var opts = esp.getArgs();
var server = opts.getOpt("server");

if (server == null)
{
    showUsage();
    process.exit(0);
}

esp.connect(server,{ready:ready});

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
