package main

import
(
    "crypto/tls"
    "io/ioutil"
    "net/http"
    "net/url"
    "strings"
    "flag"
    "bytes"
    "log"
    "fmt"
    "os"

    "github.com/gorilla/websocket"
)

var _loglevel int = 0

func proxy(w http.ResponseWriter, req *http.Request) {
    log.Println("got a proxy")
    os.Exit(0)
}

type MyHandler struct {
    http.Handler

    _root string
}

func (this MyHandler) getProxyUrl(req *http.Request) *url.URL {
    tmp := req.URL.Path[1:]
    if (len(req.URL.RawQuery) > 0) {
        tmp += "?" + req.URL.RawQuery
    }
    value,err := url.Parse(tmp)
    if (err != nil) {
        log.Println(err)
        return nil
    }
    if (len(value.Scheme) == 0) {
        return nil
    }

    if (_loglevel >= 1) {
        fmt.Printf("Got proxy URL %s\n",value)
    }

    return value
}

var upgrader = websocket.Upgrader{
    ReadBufferSize: 5000000,
    WriteBufferSize: 5000000,
}

func (this MyHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
    url := this.getProxyUrl(request)
    if (url != nil) {
        if (url.Scheme == "ws" || url.Scheme == "wss") {
            log.Println("got a websocket")
            ws := NewWsProxy(url,writer,request)
            ws.Run()
        } else {
            method := strings.ToUpper(request.Method)

            var body []byte
            if (method == "POST" || method == "PUT") {
                body,_ = ioutil.ReadAll(request.Body)
            }

            http.DefaultTransport.(*http.Transport).TLSClientConfig = &tls.Config{InsecureSkipVerify: true}

            client := http.Client{}
            proxy,_ := http.NewRequest(method,url.String(),bytes.NewReader(body))

            for key,value := range request.Header {
                name := strings.ToLower(key)
                if (name != "host" && name != "origin" && name != "accept-encoding") {
                    for _,s := range value {
                        proxy.Header.Add(key,s)
                    }
                }
            }

            response,_ := client.Do(proxy)
            body,_ = ioutil.ReadAll(response.Body)
            if (_loglevel >= 1) {
                fmt.Printf("Returning status code %d\n",response.StatusCode)
            }
            writer.WriteHeader(response.StatusCode)
            writer.Write(body)
        }
    } else {
        filename := this._root + "/" + request.URL.Path[1:]
        //http.ServeFile(writer,request,request.URL.Path[1:])
        http.ServeFile(writer,request,filename)
    }
    //os.Exit(0)
}

type WsProxy struct {
    _client *websocket.Conn
    _server *websocket.Conn
}

func NewWsProxy(url *url.URL,
                writer http.ResponseWriter,
                request *http.Request) *WsProxy {

    client,err := upgrader.Upgrade(writer,request,nil)

    if (err != nil) {
        log.Print(err)
        return nil
    }

	dialer := *websocket.DefaultDialer
    dialer.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
    server, _, err := dialer.Dial(url.String(),nil)

    if (err != nil) {
        log.Print("got an error to server: " + url.String())
        log.Print(err)
        return nil
    }

    return(&WsProxy{_client:client,_server:server})
}

func (this WsProxy) Run() {

    clientDone := make(chan int)
    serverDone := make(chan int)

    go this.ReadServer(serverDone)
    go this.ReadClient(clientDone)

    var done bool = false

fmt.Printf("running\n")
    for done == false {
        select {
            case <-clientDone:
                fmt.Printf("client is done\n")
                done = true
                break
            case <-serverDone:
                fmt.Printf("server is done\n")
                done = true
                break
        }
    }

    this._client.Close()
    this._server.Close()

    fmt.Printf("all done\n")
}

func (this WsProxy) ReadServer(done chan int) {
    for {
        mtype, message, err := this._server.ReadMessage()
        if (err != nil) {
            log.Print("error reading from server")
            done <- 1
            break
        }
        this._client.WriteMessage(mtype,message)
    }
}

func (this WsProxy) ReadClient(done chan int) {
    for {
        mtype, message, err := this._client.ReadMessage()
        if (err != nil) {
            log.Print("error reading from client")
            done <- 1
            break
        }
        this._server.WriteMessage(mtype,message)
    }
}

func main() {
    port := flag.Int("port",4444,"HTTP port")
    root := flag.String("root",".","Root directory for serving files")
    logging := flag.Int("logging",0,"Log level")
    secure := flag.Bool("secure",false,"Run with TLS")
    cert := flag.String("cert","cert.pem","TLS Certificate file")
    key := flag.String("key","key.pem","TLS Private Key file")

    flag.Parse()

    fmt.Printf("\nHTTP server running on port %d\n",*port)

    _loglevel = *logging

    //var handler = new MyHandler{_root:*root}
    handler := MyHandler{_root:*root}
    if (*secure) {
        http.ListenAndServeTLS(fmt.Sprintf(":%d",*port),*cert,*key,handler)
    } else {
        http.ListenAndServe(fmt.Sprintf(":%d",*port),handler)
    }
}
