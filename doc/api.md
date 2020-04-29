## API Objects
### The ServerConnection Object
In order to create the datasources used to feed the visualizations, you must first create a ServerConnection object. This is a 
persistent connection to the ESP server. You can create an instance of this object through the API instance passed into the *esp* function:
```javascript
var conn = api.connect("http://espsrv01:7777",{ready:initialize});
```

The API uses this connection to communicate with the ESP server. 
You must provide a connection delegate to the connect call so that the the system can notify you when the connection has
been established. The connection delegate can implement the following methods:

* *ready* - invoked when the connection has been established and the handshake is complete
* *closed* - invoked when the connection has closed

This connection is used to monitor the health of the server. If the server goes down
while the connection is active, the API will wait for the server to return. When the server comes back, the *ready* property of the connection delegate will be
called so that the client can use the new connection to perform initialization.

* **Methods**
    * *getEventCollection(options)*
        * **Description**
            * Create and return an EventCollection object
        * **Option  Parameters**
            * *window* - the path of the ESP window, i.e. project/contquery/window.
            * *pagesize* -the page size for the collection (defaults to 50).
            * *filter* - the functional filter for the collection.
            * *interval* - The time, in milliseconds, for the server to wait before delivering any events that occurred. If this is not specified, the interval defaults to 1 second.
        * **Returns**
            * An EventCollection object
        * **Examples**
            ```javascript
            var brokerAlerts = conn.getEventCollection({window:"secondary/cq/brokerAlertsAggr"})
            var venueAlerts = conn.getEventCollection({window:"secondary/cq/venueAlertsAggr",filter:"in($city,'raleigh','atlanta')})
            ```

    * *getEventStream(options)*
        * **Description**
            * Create and return an EventStream object
        * **Option  Parameters**
            * *window* - the path of the ESP window, i.e. project/contquery/window.
            * *maxevents* - the maximumn number of events to store (defaults to 100).
            * *interval* - The time, in milliseconds, for the server to wait before delivering any events that occurred. If this is not specified, the interval defaults to 1 second.
        * **Returns**
            * An EventStream object
        * **Examples**
            ```javascript
            var rates = conn.getEventStream({window:"primary/cq/counter",maxevents:20});
            ```

    * *getPublisher(options)*
        * **Description**
            * Create and return a Publisher object
        * **Option  Parameters**
            * *window* - the path of the ESP window, i.e. project/contquery/window.
        * **Returns**
            * A Publisher object 
        * **Examples**
            ```javascript
            var publisher = conn.getPublisher({window:"primary/cq/rawTrades"});
            ```

    * *getStats(options)*
        * **Description**
            * Return the Stats object for the connection.
        * **Option  Parameters**
            * *interval* - the interval, in seconds, at which the server will send data to the client.
            * *mincpu* - the minimum CPU usage, in percentage, which will be reported (defaults to 5).
            * *memory* - boolean value determining whether to report memory usage information (defaults to true).
            * *counts* - boolean value determining whether to report window event counts (defaults to false).
            * *config* - boolean value determining whether to report server config information (defaults to false).
        * **Returns**
            * A Stats object 
        * **Examples**
            ```javascript
            var stats = conn.getStats({mincpu:5,memory:true,counts:true});
            ```

    * *getLog()*
        * **Description**
            * Return the Log object for the connection.
        * **Returns**
            * A Log object 

### The EventCollection Object

An event collection is a view into a stateful ESP window. The view of the collection into the ESP window is defined by the current *page*.
When an event collection is created, it sets the page size for that collection. This determines the maximum number of events that will be
sent from the server to the client. In addition, the server sets up an internal pub/sub instance to receive events for that window. If an event
occurs that is not in the current page, that event is ignored. Otherwise, the event is delivered to the client.

You create event collections through the ServerConnection object.
```javascript
var alerts = conn.getEventCollection({window:"secondary/cq/brokerAlertsAttr"});
```
The event collection manages itself and delivers change events to its delegates. If you are interested in receiving collection change notifications,
you must register a delegate that implements the *dataChanged* method:
```javascript
function
handle(collection,data,clear)
{
    console.log("data changed: " + JSON.stringify(data,null,"\t"));
}

alerts.addDelegate({dataChanged:handle});
```

The *dataChanged* method receives the collection that changed along with the new data in the *data* parameter. If the collection was cleared of data,
the *clear* parameter is set to *true*.

* **Methods**
    * *addDelegate(delegate)*
        * **Description**
            * Add a delegate to receive collection change notifications. The delegate must implement the *dataChanged* method.
        * **Parameters**
            * *delegate* - The object to receive change notifications.
    * *removeDelegate(delegate)*
        * **Description**
            * Remove a delegate from the collection.
        * **Parameters**
            * *delegate* - The delegate to remove.
    * *getData()*
        * **Description**
            * Return the current collection of events. The data is a dictionary of objects representing the ESP events keyed by the event keys.
        * **Returns**
            * The collection event data. 
    * *getList()*
        * **Description**
            * Return the current collection of events as an array. The data is an of array of objects.
        * **Returns**
            * The collection event data as an array of objects.
    * *setFilter(filter)*
        * **Description**
            * Set the functional filter to use on the events in the ESP window. For example, to see only stock trades with a price greater than 200:
            ```javascript
            coll.setFilter("gt($price,200)");
            ```
    * *load()*
        * **Description**
            * Load the current page of events from the server. The events are delivered to the delegates via *dataChanged()*.
    * *first()*
        * **Description**
            * Load the first page of events from the server. The events are delivered to the delegates via *dataChanged()*.
    * *last()*
        * **Description**
            * Load the last page of events from the server. The events are delivered to the delegates via *dataChanged()*.
    * *next()*
        * **Description**
            * Load the next page of events from the server. The events are delivered to the delegates via *dataChanged()*.
    * *prev()*
        * **Description**
            * Load the previous page of events from the server. The events are delivered to the delegates via *dataChanged()*.
    * *play()*
        * **Description**
            * Set the state of the collection to playing. This means that the server will deliver events to the client when they occur. If the 
                state is changed from paused to playing, the server will send an initial page load.
    * *pause()*
        * **Description**
            * Set the state of the collection to paused. This means that the server will not deliver events to the client when they occur. 

### The EventStream Object
An event stream is a flow of events similar to a UNIX tail. When an event occurs in the ESP model in the server, it is placed into the stream. The clients
can read this stream and see the events as they occur. If a window produces a huge number of events, you can throttle the number of events that get put
into the stream by specifying *maxevents* and *interval*. The *maxevents* property limits the number of events that will get put into the
stream at any one time. The *interval* property specifies a time, in milliseconds, that the ESP server will wait before putting events into the stream.
So, if you set *maxevents* to 1000, and *interval* to 1000 ms (or 1 second), then the server will collect events from the pub/sub interface for 1 second.
If more than *maxevents* events occur in that time, the oldest are dropped and will not be put into the stream. At the end of 1 second, the server puts all
events it has into the stream. For clients that have heavy processing duties (graph rendering for example), this allows the client to limit the number of events
it must process (as long as a sampling of events is sufficient).

If you are not interested in *delete* events, you can specify *ignore_delete=true* when creating the event stream. This will throw away any delete events the
stream receives.

You create event streams through the ServerConnection object.
```javascript
var rates = conn.getEventStream({window:"primary/cq/counter",maxevents:20})</pre>
```
The event stream delivers change events to its delegates. If you are interested in receiving stream change notifications,
you must register a delegate that implements the *dataChanged* method:
```javascript
function
handle(collection,data,clear)
{
    console.log("data changed: " + JSON.stringify(data,null,"\t"));
}

alerts.addDelegate({dataChanged:handle});
```

The *dataChanged* method receives the collection that changed along with the new data in the *data* parameter. If the collection was cleared of data,
the *clear* parameter is set to *true*

* **Methods**
    * *addDelegate(delegate)*
        * **Description**
            * Add a delegate to receive stream change notifications. The delegate must implement the *dataChanged* method.
        * **Parameters**
            * *delegate* - The object to receive change notifications.
    * *removeDelegate(delegate)*
        * **Description**
            * Remove a delegate from the stream .
        * **Parameters**
            * *delegate* - The delegate to remove.
    * *getList()*
        * **Description**
            * Return the current stream of events as an array. The data is an of array of objects.
        * **Returns**
            * The event stream data as an array of objects.
    * *setFilter(filter)*
        * **Description**
            * Set the functional filter to use on the events in the ESP window. For example, to see only stock trades with a price greater than 200:
```javascript
coll.setFilter("gt($price,200)");
```

### The Publisher Object
The Publisher object allows you to publish events into an ESP source window. You can add data to the send queue either by one or more sequences 
of *begin(), set(), end()* calls, or by using the *add()* method which adds an object to the send queue directly. The publisher stores the objects 
to be published until the *publish()* method is called.

The first method:
```javascript
var publisher = conn.getPublisher({window:"p/cq/uievents"});
publisher.begin();
publisher.set("x",mouse.x);
publisher.set("y",mouse.y);
publisher.set("type","click");
publisher.end();
publisher.publish();
```
and the second:
```javascript
var publisher = conn.getPublisher({window:"p/cq/uievents"});
publisher.add({"x":mouse.x,"y":mouse.y,"type":"move");
publisher.add({"x":mouse.x,"y":mouse.y,"type":"click");
publisher.publish();
```
* **Methods**
    * *begin()*
        * **Description**
            * Initialize the current data.
    * *set(name,value)*
        * **Description**
            * Set a field value in the current data.
        * **Parameters**
            * *name* - the name of the field to set.
            * *value* - the value of the field.
    * *end()*
        * **Description**
            * Close input to the current data and add it to the publish list.
    * *add(data)*
        * **Description**
            * Add data to the publish list.
        * **Parameters**
            * *data* - the data object to add the the publish list.
    * *publish()*
        * **Description**
            * Publish the publish list into the ESP source window.
    * *publishCsv(data,options)*
        * **Description**
            * Publish CSV data into an ESP source window.
        * **Parameters**
            * *data* - the CSV data.
        * **Option Parameters**
            * *pause* - the interval, in milliseconds, to pause between events (defaults to 0).
            * *close* - boolean value determining whether to close the publisher when the publishing of the data has completed (defaults to false).

### The Stats Object

The Stats object allows you to monitor ESP server stats such as memory usage and CPU usage on a per window basis. 

#### The Stats Object Options
There are several properties you can set which determine how the Stats object reports data:
* *interval* - the interval, in seconds, at which the server will send data to the client.
* *mincpu* - the minimum CPU usage, in percentage, which will be reported (defaults to 5).
* *memory* - boolean value determining whether to report memory usage information (defaults to true).
* *counts* - boolean value determining whether to report window event counts (defaults to false).
* *config* - boolean value determining whether to report server config information (defaults to false).
In order to receive notifications when the stats data changes,
you must add a delegate object which implements the *handleStats(s,data,memory)* method:

```javascript
function
handle(stats)
{
    console.log("windows");
    console.log("\t" + JSON.stringify(stats.getWindows(),null,"\t"));
    console.log("memory");
    console.log("\t" + JSON.stringify(stats.getMemory(),null,"\t"));
}

conn.getStats().addDelegate({dataChanged:handle});
```
#### Stats Windows Format
```json
[{
    'project': 'primary',
    'contquery': 'cq',
    'window': 'transform',
    'cpu': 100.598,
    'interval': 1101676.0,
    'count': 0,
    '@key': 'primary.cq.transform'
}, {
    'project': 'primary',
    'contquery': 'cq',
    'window': 'rawTrades',
    'cpu': 31.9233,
    'interval': 1101676.0,
    'count': 0,
    '@key': 'primary.cq.rawTrades'
}]
```
#### Stats Memory Format
```json
{
    'system': 386696,
    'virtual': 1452,
    'resident': 241
}
```
The *stats* array contains cpu and window count information for any window that has CPU usage greater than the minimum value and/or a window event count that is greater than 0.

The *memory* object contains values for system, virtual, and resident memory currently being consumed in the ESP server.

* **Methods**
    * *addDelegate(delegate)*
        * **Description**
            * Add a delegate to receive stats change notifications. The delegate must implement the *handleStats(s,stats,memory)* method.
        * **Parameters**
            * *delegate* - The object to receive change notifications.
    * *removeDelegate(delegate)*
        * **Description**
            * Remove a delegate from the Stats object.
        * **Parameters**
            * *delegate* - The delegate to remove.
    * *setOpts(options)*
        * **Description**
            * Set a stats reporting option from the set of [options](#The-Stats-Object-Options).
        * **Option  Parameters**
            * Any option(s) from the supported set of [options](#The-Stats-Object-Options).
    * *getWindows()*
        * **Description**
            * Return the windows statistic information in this [format](#Stats-Windows-Format).
        * **Returns**
            * The windows statistic information in this [format](#Stats-Windows-Format).
    * *getMemoryData()*
        * **Description**
            * Return the memory information in this [format](#Stats-Memory-Format).
        * **Returns**
            * The memory information in this [format](#Stats-Memory-Format).
    * *getConfig()*
        * **Description**
            * Return the config information.
        * **Returns**
            * The config information.

### The Log Object
The Log object allows you to monitor ESP server logs.

In order to receive notifications when the stats data changes, you must add a delegate object which implements the *handleLog(log,message)* method:

```javascript
function
handleLog(log,message)
{
    console.log("got a message: " + message);
}

conn.getLog().addDelegate({handleLog:handle});
```

The parameters are:
* *log* - the Log instance.
* *message* - the log message.


* **Methods**
    * *addDelegate(delegate)*
        * **Description**
            * Add a delegate to receive log messages. The delegate must implement the *handleLog(log,message)* method.
        * **Parameters**
            * *delegate* - The object to receive log messages.
    * *removeDelegate(delegate)*
        * **Description**
            * Remove a delegate from the Log instance.
        * **Parameters**
            * *delegate* - The delegate to remove.
