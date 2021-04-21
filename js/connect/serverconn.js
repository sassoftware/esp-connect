/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Connection} from "./connection.js";
import {Options} from "./options.js";
import {v6} from "./v6.js";
import {v7} from "./v7.js";
import {tools} from "./tools.js";
import {ajax} from "./ajax.js";
import {xpath} from "./xpath.js";

var _prompted = {};

class ServerConnection extends Connection
{
    constructor(connect,host,port,path,secure,delegate,options)
    {
        super(host,port,path,secure,options,connect.config);
        this._connect = connect;
        this._delegates = [];

        Object.defineProperty(this,"connect", {
            get() {
                return(this._connect);
            }
        });

        if (delegate != null)
        {
            if (Array.isArray(delegate))
            {
                delegate.forEach((d) => {
                    tools.addTo(this._delegates,d);
                });
            }
            else
            {
                tools.addTo(this._delegates,delegate);
            }
        }

        var certConfirm = this.httpurlBase;
        certConfirm  += "/eventStreamProcessing/v1/server";
        this.setOpt("cert-confirm-url",certConfirm);

        this._impl = null;
    }

    handshakeComplete()
    {
        var version = this.getHeader("version");

        if (version == null)
        {
            this._impl = new v6(this,this.getOpts());
        }
        else
        {
            this._impl = new v7(this,this.getOpts());
        }

        if (this._impl != null)
        {
            this._impl.version = version;

            if (this._impl.k8s == null && this.hasOpt("model"))
            {
                var model = this.getOpt("model");

                var opts = new Options(model);
                var name = opts.getOpt("name");
                var data = opts.getOpt("data");
                var url = opts.getOpt("url");

                if (name == null)
                {
                    tools.exception("the model must contain a name value");
                }

                if (data == null && url == null)
                {
                    tools.exception("the model must contain either a data or url field");
                }

                const   self = this;

                if (url != null)
                {
                    ajax.create(url).get().then(
                        function(result) {

                            var data = result.xml;

                            if (model.hasOwnProperty("_xml") == false)
                            {
                                data.documentElement.removeAttribute("name");
                                model.data = xpath.xmlString(data);
                            }

                            self.load(model).then(
                                function() {
                                    self._delegates.forEach((d) => {
                                        if (tools.supports(d,"ready"))
                                        {
                                            d.ready(self._impl);
                                        }
                                    });
                                },
                                function(result) {
                                    self._delegates.forEach((d) => {
                                        if (tools.supports(d,"error"))
                                        {
                                            //d.error(self._impl,result.text);
                                            d.error(self,result);
                                        }
                                    });
                                }
                            );
                        },
                        function(result) {
                            self._delegates.forEach((d) => {
                                if (tools.supports(d,"error"))
                                {
                                    //d.error(self._impl,result.text);
                                    d.error(self,result);
                                }
                            });
                        }
                    );
                }
                else
                {
                    if (model.hasOwnProperty("_xml") == false)
                    {
                        model._xml = xpath.createXml(model.data);
                        model._xml.documentElement.removeAttribute("name");
                        model.data = xpath.xmlString(model._xml);
                    }

                    this.load(model).then(
                        function(result) {
                            self._delegates.forEach((d) => {
                                if (tools.supports(d,"ready"))
                                {
                                    d.ready(self._impl);
                                }
                            });
                        },
                        function(result) {
                            self._delegates.forEach((d) => {
                                if (tools.supports(d,"error"))
                                {
                                    d.error(self._impl,result);
                                }
                            });
                        }
                    );
                }
            }
            else
            {
                this._delegates.forEach((d) => {
                    if (tools.supports(d,"ready"))
                    {
                        d.ready(this._impl);
                    }
                });
            }
        }
    }

    load(model)
    {
        return(new Promise((resolve,reject) => {
            if (this.getOpt("force",false))
            {
                this._impl.loadProject(model.name,model.data,this.getOpts()).then(
                    function() {
                        resolve();
                    },
                    function(result) {
                        reject(result);
                    }
                );
            }
            else
            {
                const   self = this;

                this._impl.getProjectXml(model.name).then(
                    function(xml) {
                        var node = null;
                        if (xml.nodeType == 1)
                        {
                            node = xml;
                        }
                        else if (xml.nodeType == 9)
                        {
                            node = xml.documentElement;
                        }

                        if (node == null)
                        {
                            self._impl.loadProject(model.name,model.data,self.getOpts()).then(
                                function() {
                                    resolve();
                                },
                                function(result) {
                                    reject(result);
                                }
                            );
                        }
                        else
                        {
                            node.removeAttribute("name");

                            const   s = xpath.xmlString(node);

                            if (model.data != s)
                            {
                                self._impl.loadProject(model.name,model.data,self.getOpts()).then(
                                    function() {
                                        resolve();
                                    },
                                    function(result) {
                                        reject(result);
                                    }
                                );
                            }
                            else
                            {
                                resolve();
                            }
                        }
                    }
                );
            }
        }));
    }

    closed(conn)
    {
        if (this._impl != null)
        {
            for (var d of this._delegates)
            {
                if (tools.supports(d,"closed"))
                {
                    d.closed(this._impl);
                }
            }

            const   closed = this._impl.closed;

            if (this._impl != null)
            {
                this._impl = null;
            }

            if (closed == false)
            {
                var reconnect = this.getOpt("reconnect",1);

                if (reconnect > 0)
                {
                    this.reconnect(reconnect);
                }
            }
        }
    }

    error()
    {
        if (this._impl != null && this._impl.closed)
        {
            return;
        }

        if (Connection.established(this.getUrl()) == false)
        {
            if (tools.isNode)
            {
                if (this.isSecure)
                {
                    var msg = "\n\nconnection to " + this.getUrl() + " failed. If you are using self-signed certificates you may need to\n\nexport NODE_TLS_REJECT_UNAUTHORIZED=0\n\nin your environment\n\n";
                    throw new Error(msg);
                }
            }
            else
            {
                if (this.isSecure)
                {
                    if (this.hasOpt("cert-confirm-url"))
                    {
                        var url = this.getOpt("cert-confirm-url");

                        if (_prompted.hasOwnProperty(url) == false)
                        {
                            _prompted[url] = true;
                            window.open(url,"espconnect","width=800,height=800");
                        }
                    }
                }
            }
        }

        if (tools.supports(this._delegate,"error"))
        {
            this._delegate.error(this);
        }

        for (var d of this._delegates)
        {
            if (tools.supports(d,"error"))
            {
                d.error(this);
            }
        }

        var reconnect = this.getOpt("reconnect",1);

        if (reconnect > 0)
        {
            this.reconnect(reconnect);
        }
    }

    message(data)
    {
        if (this.isHandshakeComplete() == false)
        {
            super.message(data);
            return;
        }

        if (this._impl != null)
        {
            this._impl.message(data);
        }
    }

    data(o)
    {
        if (this._impl != null)
        {
            this._impl.data(o);
        }
    }

    addDelegate(delegate)
    {
        tools.addTo(this._delegates,delegate);

        if (this._impl != null && tools.supports(delegate,"ready"))
        {
            delegate.ready(this._impl);
        }
    }

    removeDelegate(delegate)
    {
        tools.removeFrom(this._delegates,delegate);
    }

    getUrl()
    {
        var url = "";
        url += this.protocol;
        url += "://";
        url += this.host;
        url += ":";
        url += this.port;
        if (this._path != null && this._path.length > 0)
        {
            url += this._path;
        }
        if (url.endsWith("/") == false)
        {
            url += "/";
        }
        url += "eventStreamProcessing/v1/connect";

        var parms = "";
        var threads = "";

        if (this.hasOpt("access_token"))
        {
            parms += "access_token=" + this.getOpt("access_token");
        }

        if (this.hasOpt("threadin"))
        {
            threads += "incoming";
        }

        if (this.hasOpt("threadout"))
        {
            if (threads.length > 0)
            {
                threads += ",";
            }
            threads += "outgoing";
        }

        if (threads.length > 0)
        {
            if (parms.length > 0)
            {
                parms += "&";
            }

            parms += "_threads=" + threads;
        }

        if (parms.length > 0)
        {
            url += "?" + parms;
        }

        return(url);
    }

    static create(connect,url,delegate,options)
    {
        var u = tools.createUrl(decodeURI(url));
        return(new ServerConnection(connect,u["host"],u["port"],u["path"],u["secure"],delegate,options));
    }
}

export {ServerConnection}
