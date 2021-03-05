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
$ node connect.mjs --server http://espsrv01:7777 --model
```

Connect provides the *connect.mjs* utility to allow you to run ESP connect commands against an ESP server.
This utility contains JSON objects which are sent to the ESP server in order to perform tasks such
as loading projects, subscribing to events, and model viewing.

You can get a list of options by running the command with *--help* specified:

```sh
$ node connect.mjs --help
```

```sh
connect(1)			ESP Connect Node.js Commands			connect(1)

NAME
    connect -- Run ESP Connect commands

SYNOPSIS
    node connect.mjs [--load-project] [--delete-project] [--collection] [--stream] [--model] [--xml] [--stats] [--logs] [--publish-data] [--publish-url] [--loggers] [--load-router] [--router] [--eventsource] [--project-updates] [--k8s-projects] [--k8s-log] [--k8s-ls] [--k8s-get] [--k8s-put] [--k8s-cat] [--k8s-rm] [--k8s-restart] [--k8s-exec]

DESCRIPTION
    Run ESP Connect commands

OPTIONS
    --load-project
        Load a project from a file

    --delete-project
        Delete a project

    --collection
        Subscribe to an ESP event collection

    --stream
        Subscribe to an ESP event stream

    --model
        Display one or more ESP models from an ESP server

    --xml
        Display project XML from an ESP server

    --stats
        Display ESP server statistics

    --logs
        View realtime ESP server logs

    --publish-data
        Publish ESP events from a file

    --publish-url
        Publish ESP events from a URL

    --loggers
        Display and set ESP logging contexts

    --load-router
        Load an ESP router from a file

    --router
        Run a javascript router

    --eventsource
        Read a configuration file and create event sources to publish data into
        an ESP server

    --project-updates
        Listen for and report project load and delete events

    --k8s-projects
        List ESP projects in a Kubernetes cluster

    --k8s-log
        Retrieve the log from a K8S pod. The URL must contain both a namespace and a
        project name

    --k8s-ls
        Execute a file listing in a pod. The URL must contain both a namespace and a
        project name

    --k8s-get
        Retrieve a file from a pod

    --k8s-put
        Copy a file into a pod

    --k8s-cat
        Display file contents from a pod

    --k8s-rm
        Remove a file from a pod

    --k8s-restart
        Restart a project in a pod. The URL must contain both a namespace and a project
        name.

    --k8s-exec
        Execute a command in the pod. Any text after the -- characters will be sent
        to the pod to be executed.


SEE ALSO
    ESP User Guide   https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en

SAS ESP Connect				Thu Mar 04 2021				SAS ESP Connect
```

Note that there are several available Kubernetes commands you can use to communicate with ESP servers in K8S Clusters. All of the
other commands work seamlessly with ESP servers in Kubernetes.

To get usage information on a specific command, run with the specified command and *--help*.
For example, to get usage information on event collections:

```sh
$ node connect.mjs --collection --help
```

```sh
connect(1)			ESP Connect Node.js Commands			connect(1)

NAME
    connect -- Run ESP Connect commands

SYNOPSIS
    node connect.mjs --server --collection --window [--format] [--pagesize] [--schema] [--sort]

DESCRIPTION
    This command subscribes to an ESP window for events.

OPTIONS
    --server ESP server
        ESP Server to which to connect in the form http://espserver:7777

    --collection
        subscribe to an ESP event collection

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


SEE ALSO
    ESP User Guide   https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en

SAS ESP Connect				Thu Mar 04 2021				SAS ESP Connect
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
    connection.getModel().then(
        function(model) {
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
    );
}

function
showUsage()
{
    esp.usage({
        name:"basic",
        summary:"template for NodeJS programs",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true}
        ],
        description:"This command provides a template for users to use to create their own NodeJS programs."
    });
}
```
