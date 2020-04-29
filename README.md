# SAS Event Stream Processing Javascript API

The esp-connect package enables you to communicate with a SAS Event Stream Processing (ESP) server using Javascript objects.

**NOTE** While esp-connect should work with an ESP 6.2 server, it was designed specifically to work with the ESP 7.1 websocket interface.

## Table of Contents

* [Overview](#overview)
    * [Prerequisites](#prerequisites)
    * [Installation](#installation)
* [Getting Started](#getting-started)
    * [Examples](#examples)
* [Contributing](#contributing)
* [License](#license)
* [Example Pages](#example-pages)
* [Using the Model and Log Viewers](#using-the-model-and-log-viewers)
* [Additional Resources](#additional-resources)

## Overview
The ESP Connect API allows you to communicate with ESP servers from any platform using Javascript objects. These objects can be easily embedded within web pages, and they
also support [Node.js](http://www.nodejs.org) so that they can also be run from the command line.

The Connect API leverages the new ESP websocket API which uses the following connection request:
```
ws://espsrv01:7777/eventStreamProcessing/v1/connect
```
The API includes both objects used for ESP communication as well as graphical objects used to display the ESP data.

Some of the graphical features include:
* Charts (built on [Plotly](https://plot.ly/javascript))
    * Bar Charts
    * Line Charts
    * Time Series
    * Bubble Charts
    * Pie Charts
    * Geo Maps (built on [Leaflet](https://leafletjs.com))
    * Gauges
    * Compasses
    * Tables
* ESP Model Viewers (built on [vis.js](https://visjs.org)) provide the ability to
    * Visualize the directed graphs used by ESP models.
    * Monitor server memory usage (system, virutal, and resident).
    * Monitor CPU usage on a per window basis as events stream through the models
    * See different window attributes including
        * CPU Usage
        * Event Count
        * Window Type
        * Window Schema
        * Index Type
* ESP Log Viewers provide the ability to see the ESP server log in realtime. This uses a websocket interface so there is no polling interval. You see the
log events in the page as soon as each one goes to the console.

There is a full set of examples you can use to get started using the API.

In the case of a lost connection to the ESP server, all graphics should be cleared and the system will automatically begin attempting to reconnect. When the connection
is reestablished, the visualizations should continue displaying the data.

### Prerequisites

In order to run the ESP connect command line utilities you will need to have [Node.js](https://nodejs.org) (at least version 12.x) and [Node Package Manager](https://www.npmjs.com) installed on your machine.

### Installation

Once you have cloned this repository, you can use the API to develop web pages. If you want to use the NodeJS support
in the API, you must perform an *npm install* of the connect API (the *work* directory is where you cloned the API):
* change to your HOME directory.
* Install the Connect API from the directory where you cloned it (the module name is <i>esp-connect</i>):
```
$ npm install @work@/js/connect
```
* change directory to *@work@/node*.
* run a test using the following command (use your own ESP server):
```
$ node connect -server http://espsrv01:7777 -input model.json
```

## Getting Started

Since this API includes graphical elements an HTTP server is required to support this capability. Any HTTP server will work, but for simplicity and demonstration purposes the
python (version 3.x) HTTP server will be used.
To set up the js HTTP server with the Connect API, 
* Clone the connect API into a working directory, *@work@*
* Change directory to @work@
* Start the HTTP server (we will use port 33000):
```
$ python -m http.server 33000
```

Once the HTTP server is running, you can develop web pages. 
 
Depending on the API features you want to use, you should add certain declarations to the head section of the page.

**NOTE** The following HTML fragments assume the pages reside 2 levels below the working directory. Your pages can reside anywhere in your server and the 
relative paths will change accordingly.

If you want to use the basic charting capabilities, you should include the plotly declarations:
```html
<script src="https://cdn.plot.ly/plotly-latest.min.js" charset="utf-8"></script>
```

If you want to use the geographic map visualization, you should include the leaflet declarations:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css" integrity="sha512-xwE/Az9zrjBIphAcBb3F6JVqxf46+CDLwfLMHloNu6KEQCAWi6HcDUbeOfBIptF7tcCzusKFjFw2yuvEpDL9wQ==" crossorigin=""/>
<script src="https://unpkg.com/leaflet@1.6.0/dist/leaflet.js" integrity="sha512-gZwIG9x3wUXg2hdXF6+rVkLF/0Vi9U8D2Ntg4Ga5I5BZpVkVxlJWbSQtXPSiUTtC0TjtGOmxa1AJPuV0CPthew==" crossorigin=""></script>
```

If you want to use the model viewer visualizations, include the vis.js declarations:
```html
<script src="https://visjs.github.io/vis-network/standalone/umd/vis-network.min.js"></script>
```

The following code must be added to bring in the Connect API:
```html
<link rel="stylesheet" href="../../style/connect.css" />

<script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js" data-main="../../js/main"></script>
```

Now you must supply the *esp* function which is called when the module is ready to go. This function is usually used to create one or more connections to 
ESP servers and perform other basic initialization.

As an example, consider a web page that displays some colored areas and publishes events into an ESP model when the user clicks in these areas. The *esp* function
might look like the following (be sure to enclose in the &lt;script&gt; tag):

```javascript
var _esp = null;
var _conn = null;
var _visuals = null;

function
esp(api)
{
    _esp = api;

    var server = _esp.getParm("server");
 
    _visuals = _esp.createVisuals(parms);

    _esp.handleLayout({layout:layout});

    _esp.connect(server,{ready:ready});
}

function
ready(connection)
{
    _conn = connection;

    var  model = "<project threads='4' pubsub='auto'>\
                   <contqueries>\
                     <contquery name='cq'>\
                       <windows>\
                         <window-source name='clicks' insert-only='true' index='pi_EMPTY'>\
                            <schema-string>id*:string,element:string,x:int32,y:int32</schema-string>\
                         </window-source>\
                         <window-copy name='copy'>\
                            <retention type='bytime_sliding'>30 seconds</retention>\
                         </window-copy>\
                         <window-aggregate name='clicksAggr'>\
                            <schema-string>element*:string,count:int32</schema-string>\
                            <output>\
                                <field-expr>ESP_aCount()</field-expr>\
                            </output>\
                         </window-aggregate>\
                       </windows>\
                       <edges>\
                         <edge source='clicks' target='copy' />\
                         <edge source='copy' target='clicksAggr' />\
                       </edges>\
                     </contquery>\
                   </contqueries>\
                </project>";

    _esp.showStatus("Loading project...");

    _conn.loadProject("myproject",model,{loaded:loaded},{overwrite:true});
}

```

This function creates a connection to an ESP server. You must provide a connection delegate to the connect call so that the the system can notify you when the connection has
been established. The connection delegate can implement the following methods:

* *ready* - invoked when the connection has been established and the handshake is complete
* *closed* - invoked when the connection has closed

It also loads a simple model into the server so that it can
publish events into it. Since this is an asynchronous operation, the code provides a delegate that implements the *loaded* function to be called 
when the project has been loaded into the server.

The function also creates a Visuals object to be used later in creating the visualizations.

Now let's look at how to proceed when the project has successfully been loaded. Note that if you are working with a server that already has a model loaded you may 
not need to go through the load process.

The API will invoke the *loaded* delegate function when the server returns. Since the *loaded* function was specified here, that function might look like this:

```javascript
function
loaded()
{
    _esp.clearStatus();

    var clicks  = _conn.getEventCollection({window:"myproject/cq/clicksAggr"});

    _visuals.createBarChart("barchart",clicks,{y:"count",header:"Clicks Chart",xrange:[0,100],orientation:"horizontal",get_color:barcolor});
    _visuals.createGauge("gauges",clicks,{value:"count",segments:5,header:"Clicks Indicators",width:200,range:[0,100],bar_color:"rgba(255,255,255,.7)"});
}
```
### Examples

#### More Documentation
##### [API Objects](doc/api.md)
##### [Using Connect with Node.js](doc/nodejs.md)
##### [The Javascript Router](doc/jsrouter.md)

#### Using the Model and Log Viewers

You can use the model and log viewers by simply double clicking on the HTML files.

1. Download the Connect API into your work area, @work@
2. Navigate to @work@/html
3. Double click on the modelviewer.html and/or logviewer.html files

You can of course access these pages through a web server as well.

#### Example Pages
These example pages contain the features outlined in this document. You only need to start an empty ESP server since these
pages load the projects they need to run. 
* [basic](doc/examples/basic.txt) - basic Connect API usage
* [geofence](doc/examples/paris.txt) - geofence example with trip through Paris
* [weather](doc/examples/weather.txt) - weather data example using gauges and compasses
* [symbols](doc/examples/symbols.txt) - charts with controls for paging and filtering
* [trades](doc/examples/trades.txt) - streaming stock trades and broker violations
* [images](doc/examples/images.txt) - examples with images and object detection in tables

You can run these and other examples by

1. Downloading the Connect API into your work area, @work@
2. Make @work@ accessible to a web server
3. Navigate to http://@work@/examples in your browser providing a *server=http://myserver:5555* parameter (use your own server)



## Contributing

> We are not currently accepting contributions.

## License

> This project is licensed under the [Apache 2.0 License](LICENSE).

## Additional Resources

* [SAS ESP](https://www.sas.com/en_us/software/event-stream-processing.html)
* [SAS ESP User Guide](https://go.documentation.sas.com/?cdcId=espcdc&cdcVersion=6.2&docsetId=espov&docsetTarget=home.htm&locale=en)
