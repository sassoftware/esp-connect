/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Connection} from "../connect/connection.js";
import {connect} from "../connect/connect.js";
import {k8s} from "../connect/k8s.js";
import {uitools} from "./uitools.js";
import {dialogs} from "./dialogs.js";
import {Storage as StoredData} from "./storage.js";
import {splitter} from "./splitter.js";
import {Tabs} from "./tabs.js";
import {Visuals} from "./visuals.js";
import {menu} from "./menu.js";
import {app} from "./app.js";

var	_api =
{
    _visuals:[],
    _statusTimer:null,
    _layoutDelegate:null,
    _parms:null,
    _prompted:{},
    _user:"bob",
    _pw:"Esppass1*",

    connect:function(url,delegate,options)
    {
        var delegates = [];
        if (delegate != null)
        {
            delegates.push(delegate);
        }
        delegates.push(this);
        connect.connect(url,delegates,options,true);
    },

    getToken:function()
    {
        return(new Promise((resolve,reject) => {
            var o =
            {
                ok:function(data)
                {
                    resolve(data.token);
                    dialogs.hideDialog();
                },
                cancel:function()
                {
                    reject(data.token);
                    dialogs.hideDialog();
                },
                header:"Enter Token",
                values:[{name:"token",label:"OAuth Token",type:"textarea"}]
            };
            dialogs.showDialog(o);
        }));
    },

    getCredentials:function()
    {
        return(new Promise((resolve,reject) => {
            var o = {
                ok:function(dialog)
                {
                    dialog.hide();
                    _api._user = dialog.getValue("user");
                    _api._pw = dialog.getValue("password");
                    resolve({user:_api._user,password:_api._pw});
                    return(true);
                },
                cancel:function(dialog)
                {
                    dialog.hide();
                    reject();
                    return(true);
                }
            };

            var form = [];
            form.push({name:"user",label:"User:",value:_api._user});
            form.push({name:"password",label:"Password:",type:"password",value:_api._pw});
            _esp.getDialogs().showDialog({title:"Enter User and Password",delegate:o,label_width:"40px",form:form});
        }));
    },

    /*
    authenticate:function(connection,scheme)
    {
        if (scheme == "bearer")
        {
            var conn = this;
            var o =
            {
                ok:function(data)
                {
                    connection.setBearer(data.token);
                    dialogs.hideDialog();
                },
                cancel:dialogs.hideDialog,
                header:"Enter Token",
                values:[{name:"token",label:"OAuth Token",type:"textarea"}]
            };
            dialogs.showDialog(o);
        }
        else if (scheme == "basic")
        {
            var conn = this;
            var o =
            {
                ok:function(data)
                {
                    var credentials = connect.b64Encode(data.user + ":" + data.password);
                    connection.setBasic(credentials);
                    dialogs.hideDialog();
                },
                cancel:dialogs.hideDialog,
                header:"Enter User and Password",
                values:[{name:"user",label:"User"},{name:"password",label:"Password",type:"password"}]
            };
            dialogs.showDialog(o);
        }
    },
    */

    error:function(connection,error)
    {
        if (Connection.established(connection.getUrl()) == false)
        {
            if (connection.isSecure)
            {
                /*
                var o = new URL(connection.getUrl());

                o.protocol = "https:";

                var tmp = o.pathname;
                var index = tmp.lastIndexOf("/");

                if (index != -1)
                {
                    tmp = tmp.substr(0,index);
                    tmp += "/server";
                    o.pathname = tmp;
                }

                var url = o.toString();

                if (this._prompted.hasOwnProperty(url) == false)
                {
                    this._prompted[url] = true;
                    window.open(url,"espconnect","width=800,height=800");
                }
                */
            }
        }
    },

    closed:function(connection)
    {
        for (var v of this._visuals)
        {
            v.closed(connection);
        }
    },

    showConnectDialog:function(delegate,server)
    {
        if (connect.getTools().supports(delegate,"connect") == false)
        {
            throw "The delegate must implement the connect method";
        }

        var storage = new StoredData("esp-connect");
        var k8s = null;

        if (server != null && server.length > 0)
        {
            var u = new URL(server);

            if (u.protocol.startsWith("k8s"))
            {
                k8s = this.createK8S(server);
            }
        }

        if (server == null || server.length == 0)
        {
            server = storage.getOpt("esp-server","");
        }

        var o = {
            ok:function(dialog) {
                var s = (k8s == null) ? dialog.getValue("server","").trim() : dialog.getValue("k8s_project","").trim();

                if (s.length == 0)
                {
                    return(false);
                }

                storage.setOpt("esp-server",s);

                delegate.connect(s);

                return(true);
            }
        };

        var form = [];

        if (k8s == null)
        {
            if (server == null)
            {
                server = "";
            }
            form.push({name:"server",label:"ESP Server",value:server});
            dialogs.showDialog({title:"Connect to ESP Server",label_width:"40px",delegate:o,form:form});
        }
        else
        {
            const   self = this;

            var value = {name:"k8s_ns",label:"K8S Namespace",type:"select"};
            if (k8s.namespace != null)
            {
                value.value = k8s.namespace;
            }
            value.options = [];
            value.options.push({name:"",value:""});

            k8s.getNamespaces().then(
                function(result)
                {
                    return(new Promise((resolve,reject) => {
                        result.forEach((p) => {
                            var url = "";
                            url += k8s.k8sUrl;
                            url += "/" + p.metadata.name;
                            var o = {};
                            o.name = p.metadata.name;
                            o.value = url;
                            value.options.push(o);
                        });

                        value.onchange = function(e) {self.loadK8SProjects(e)};
                        form.push(value);

                        resolve();
                    }));
                },
                function(result)
                {
                    throw("error: " + result);
                }
            ).then(
                function() {
                    return(new Promise((resolve,reject) => {

                        var value = {name:"k8s_project",label:"K8S Project",type:"select"};
                        form.push(value);

                        if (k8s.namespace == null)
                        {
                            resolve();
                            return;
                        }
                        else
                        {
                            k8s.getProjects(k8s.namespace).then(
                                function(result)
                                {
                                    if (k8s.project != null)
                                    {
                                        value.value = k8s.project;
                                    }

                                    value.options = [];

                                    result.forEach((p) => {
                                        var url = "";
                                        url += k8s.k8sUrl;
                                        url += "/" + p.metadata.namespace;
                                        url += "/" + p.metadata.name;
                                        var o = {};
                                        o.name = p.metadata.name;
                                        o.value = url;
                                        value.options.push(o);
                                    });

                                    resolve();
                                }
                            );
                        }
                    }));
                }
            ).then(
                function(result) {
                    dialogs.showDialog({title:"Connect to ESP Server",delegate:o,form:form});
                }
            );
        }
    },

    loadK8SProjects:function(e)
    {
        const   url = e.target.value;
        const   k8s = this.createK8S(url);
        const   self = this;

        var projects = e.target.dialog.getControl("k8s_project");

        while (projects.options.length > 0)
        {
            projects.remove(0);
        }

        k8s.getProjects(k8s.namespace).then(
            function(result)
            {
                result.forEach((p) => {

                    var url = "";
                    url += k8s.k8sUrl;
                    url += "/" + p.metadata.namespace;
                    url += "/" + p.metadata.name;

                    var option = document.createElement("option");
                    option.value = url;
                    option.appendChild(document.createTextNode(p.metadata.name));
                    projects.add(option);
                });
            },
            function(result)
            {
                throw("error: " + result);
            }
        );
    },

    showCodeDialog:function(header,code,options)
    {
        var opts = connect.createOptions(options);
        opts.setOpt("title",header);
        opts.setOpt("code",code);
        dialogs.showCodeDialog(opts.getOpts());
    },

    showFrameDialog:function(header,url,options)
    {
        var opts = connect.createOptions(options);
        opts.setOpt("title",header);
        opts.setOpt("url",url);
        dialogs.showFrameDialog(opts.getOpts());
    },

    createVisuals:function(options)
    {
        var visuals = new Visuals(_api,options);
        this._visuals.push(visuals);
        return(visuals);
    },

    createWebSocket:function(url,delegate)
    {
        return(connect.createWebSocket(url,delegate));
    },

    getAjax:function()
    {
        return(connect.getAjax());
    },

    getTools:function()
    {
        return(connect.getTools());
    },

    getXPath:function()
    {
        return(connect.getXPath());
    },

    createDatasource:function(connection,config)
    {
        return(connect.createDatasource(connection,config));
    },

    getResources:function()
    {
        return(connect.getResources());
    },

    createRouter:function()
    {
        return(connect.createRouter());
    },

    createOptions:function(o)
    {
        return(connect.createOptions());
    },

    createOptionsFromArgs:function()
    {
        return(connect.createOptionsFromArgs());
    },

    createK8S:function(url)
    {
        if (url == null)
        {
            const   u = new URL(".",document.URL);
            url = "";
            url += u.protocol;
            url += "//";
            url += u.host;
        }

        return(connect.createK8S(url));
    },

    getArgs:function()
    {
        return(connect.getArgs());
    },

    getArg:function(name,dv)
    {
        return(connect.getArg(name,dv));
    },

    hasArg:function(name)
    {
        return(connect.hasArg(name));
    },

    getParms:function()
    {
        if (this._parms == null)
        {
            var s = window.location.search;
            var	o = new Object();
            s.replace(new RegExp("([^?=&]+)(=([^&]*))?","g"),function($0,$1,$2,$3){o[$1] = $3;});

            for (var name in o)
            {
                s = decodeURIComponent(o[name]);
                o[name] = this.createValue(s);
            }

            this._parms = o;
        }

        return(this._parms);
    },

    hasParm:function(name)
    {
        return(this.getParms().hasOwnProperty(name) && this._parms[name] != null);
    },

    getParm:function(name,dv)
    {
        var value = (dv != null) ? dv : null;
        var parms = this.getParms();

        if (parms.hasOwnProperty(name))
        {
            value = parms[name];
        }

        return(value);
    },

    setParm:function(name,value)
    {
        var parms = this.getParms();
        parms[name] = value;
    },

    removeParm:function(name)
    {
        var parms = this.getParms();

        if (parms.hasOwnProperty(name))
        {
            delete parms[name];
        }
    },

    getServerFromParms:function(parms,project)
    {
        var server = null;

        if (parms.hasOwnProperty("namespace"))
        {
            const   namespace = parms["namespace"];

            delete parms["namespace"];

            const   url = new URL(".",document.URL);
            var     s = "k8s-proxy://localhost:8001/" + namespace;
            if (project != null)
            {
                s += "/" + project;
            }

            server = s;
        }
        else if (parms.hasOwnProperty("server"))
        {
            server = parms["server"];
            delete parms["server"];
        }

        return(server);
    },

    createValue:function(s)
    {
        var value = s;

        if (s.indexOf("[") == 0 && s.lastIndexOf("]") == (s.length - 1))
        {
            value = JSON.parse(s);
        }
        else if (s.indexOf("{") == 0 && s.lastIndexOf("}") == (s.length - 1))
        {
            value = JSON.parse(s);
        }
        else if (s == "true")
        {
            value = true;
        }
        else if (s == "false")
        {
            value = false;
        }
        else if (s == "null")
        {
            value = null;
        }

        return(value);
    },

    size:function(after)
    {
        if (after != null)
        {
            setTimeout(layout,after);
        }
        else
        {
            layout();
        }
    },

    handleLayout:function(delegate)
    {
        window.addEventListener("resize",layout);

        if (delegate != null)
        {
            if (connect.getTools().supports(delegate,"layout") == false)
            {
                throw "The layout delegate must implement the layout method";
            }

            this._layoutDelegate = delegate;
        }

        this.size();
    },

    showStatus:function(text,seconds)
    {
        if (this._statusTimer != null)
        {
            clearTimeout(this._statusTimer);
            this._statusTimer = null;
        }

        var	footer = document.getElementById("footer");

        if (footer != null)
        {
            footer.innerHTML = text;
        }

        if (seconds != null)
        {
            var api = this;
            this._statusTimer = setTimeout(function(){api.clearStatus();},seconds * 1000);
        }
    },

    clearStatus:function()
    {
        var	footer = document.getElementById("footer");

        if (footer != null)
        {
            footer.innerHTML = "&nbsp;";
        }
    },

    setLinkState:function(link,enabled)
    {
        uitools.setLinkState(link,enabled);
    },

    guid:function()
    {
        return(connect.guid());
    },

    createTimer:function()
    {
        return(connect.createTimer());
    },

    createFunction:function(text,options)
    {
        return(connect.createFunction(text,options));
    },

    formatDate:function(date,format)
    {
        return(connect.formatDate(date,format));
    },

    encode:function(o)
    {
        return(connect.encode(o));
    },

    decode:function(data)
    {
        return(connect.decode(data));
    },

    createBuffer:function(s)
    {
        return(connect.createBuffer(s));
    },

    refresh:function(after)
    {
        if (after != null)
        {
            var api = this;
            setTimeout(function() {api.refresh()},after);
        }
        else
        {
            this._visuals.forEach((v) => {
                v.refresh();
            });
        }
    },

    b64Encode:function(o)
    {
        return(connect.b64Encode(o));
    },

    b64Decode:function(o)
    {
        return(connect.b64Decode(o));
    },

    stringify:function(o)
    {
        return(connect.stringify(o));
    },

    checkCertificate:function(connection)
    {
        var url = connection.httpurlBase;
        url += "/eventStreamProcessing/v1/";
        window.location = url;
    },

    showConnectionError:function(connection,error)
    {
        var message = "";

        message += "Failed to connect to ESP server " + connection.httpurlBase + ".";

        if (error != null)
        {
            if (error.length < 1024)
            {
                message += "<br/><br/>";
                message += error;
            }
        }
        if (connection.isSecure)
        {
            var url = connection.httpurlBase;
            url += "/eventStreamProcessing/v1/";

            message += "<br/><br/> If this is a certificate issue you may need to go ";
            message += "<a href='" + url + "' target='_blank'>here</a> and accept the certificate.";
            /*
            message += "<a href='" + url + "'>here</a> and accept the certificate.";
            */
        }

        dialogs.message("Connect Failed",message);
    },

    getStorage:function(name)
    {
        return(new StoredData(name));
    },

    getSplitter:function()
    {
        return(splitter);
    },

    createTabs:function()
    {
        return(new Tabs());
    },

    getDialogs:function()
    {
        return(dialogs);
    },

    createMenu:function(options,delegate)
    {
        return(menu.create(options,delegate));
    },

    hideMenus:function()
    {
        menu.hideAll();
    },

    createApp:function(options,delegate)
    {
        return(app.create(options,delegate));
    },

    setWsProxy:function(url)
    {
        connect.getTools().setWsProxy(url);
    },

    setHttpProxy:function(url)
    {
        connect.getAjax().setHttpProxy(url);
    },

    setProxies:function()
    {
        var tmp = new URL(".",document.URL);

        var secure = (tmp.protocol == "https:");

        var proxy = "";
        proxy = secure ? "https://" : "http://";
        proxy += tmp.hostname;
        proxy += ":";
        proxy += tmp.port;
        this.setHttpProxy(proxy);

        proxy = secure ? "wss://" : "ws://";
        proxy += tmp.hostname;
        proxy += ":";
        proxy += tmp.port;
        this.setWsProxy(proxy);
    }
};

function
layout()
{
    var margins = uitools.getMargins(document.body);
    var	bodyMargin = 0;

    if (margins.hasOwnProperty("left"))
    {
        bodyMargin = margins.left * 2;
    }

    var	width = document.body.clientWidth - (bodyMargin * 2);
    var	height = document.body.clientHeight - (bodyMargin * 2);
    var	banner = document.getElementById("banner");
    var	content = document.getElementById("content");
    var	footer = document.getElementById("footer");

    var	spacing = 5;
    var	top = bodyMargin;

    if (banner != null)
    {
        var	bannerBorders = uitools.getBorders(banner,true);
        banner.style.left = bodyMargin + "px";
        banner.style.top = bodyMargin + "px";
        banner.style.width = (width - bannerBorders.hsize - bodyMargin) + "px";
        top = banner.offsetTop + banner.offsetHeight;
    }

    var	content = document.getElementById("content");
    var	contentBorders = uitools.getBorders(content,true);

    content.style.left = bodyMargin + "px";
    content.style.top = top + "px";
    content.style.width = (width - contentBorders.hsize - bodyMargin) + "px";

    var h = height - content.offsetTop - contentBorders.vsize;

    if (footer != null)
    {
        var	footerBorders = uitools.getBorders(footer,true);

        footer.style.left = bodyMargin + "px";
        footer.style.top = (height - footer.offsetHeight) + "px";
        footer.style.width = (width - footerBorders.hsize - bodyMargin) + "px";

        h -= footer.offsetHeight;
    }

    content.style.height = h + "px";

    for (var v of _api._visuals)
    {
        v.size();
    }

    dialogs.placeModals();

    if (_api != null)
    {
        if (_api._layoutDelegate != null)
        {
            _api._layoutDelegate.layout();
        }
    }
}

export {_api as esp};
