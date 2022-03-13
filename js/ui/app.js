import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";
import {dialogs} from "./dialogs.js";
import {uitools} from "./uitools.js";
import {Touches} from "./touches.js";

class NavigatorItem extends Options
{
    constructor(navigator,options,p)
    {
        super(options);

        this._navigator = navigator;
        this._parent = p;

        var parentname = (this._parent != null) ? this._parent.getOpt("name") : null;
        var name = this.getOpt("name");

        this._key = (this._parent != null) ? this._parent.key + "." + name : name;

        this._navigator._items[this._key] = this;

        this._items = [];

        this.getOpt("items",[]).forEach((item) =>
        {
            this._items.push(new NavigatorItem(this._navigator,item,this));
        });
    }

    get name()
    {
        return(this.getOpt("name",""));
    }

    get text()
    {
        return(this.getOpt("text",""));
    }

    get key()
    {
        return(this._key);
    }

    get parentName()
    {
        return(this._parent != null ? this._parent.getOpt("name","") : "");
    }

    get parentKey()
    {
        return(this._parent != null ? this._parent._key : "");
    }

    get hasChildren()
    {
        return(this._items.length > 0);
    }

    build()
    {
        var tr = document.createElement("tr");
        tr.className = "item";
        tr._item = this;

        var td;

        tr.appendChild(td = document.createElement("td"));
        td.style.verticalAlign = "middle";
        td._item = this;

        var html = "";

        if (this.hasOpt("icon"))
        {
            html += "<span class='" + this._navigator._app.getOpt("icons","material-icons") + "' style='padding:0;padding-right:10px'>";
            html += this.getOpt("icon");
            html += "</span>";
        }
        else
        {
            html += "<span class='" + this._navigator._app.getOpt("icons","material-icons") + "' style='padding:0;padding-right:10px'>";
            html += "&nbsp;";
            html += "</span>";
        }

        if (this.hasOpt("text"))
        {
            html += "<span class='label'>";
            html += this.getOpt("text");
            html += "</span>";
        }

        td.innerHTML = html;

        tr.appendChild(td = document.createElement("td"));
        td.className = "forward";
        td.style.textAlign = "right";
        td._item = this;

        //if (this.hasChildren)
        {
            td.innerHTML = ">";
        }

        tr.onclick = function(e) {
            var element = e.srcElement;
            var tag = element.tagName.toLowerCase();
            var tr = (tag == "tr") ? element : element.parentNode;
            var item = tr._item;
            item._navigator.current = item;
        };

        if (this.hasChildren)
        {
            this._items.forEach((item) =>
            {
                item.build();
            });
        }

        return(tr);
    }

    setText()
    {
        var text = "";

        if (this.getOpt("separator",false))
        {
            text = "&nbsp;";
        }
        else
        {
            if (this.getOpt("checked",false))
            {
                text = "<span class='icon'>&#xf15e;</span>";
            }

            if (this.hasOpt("text"))
            {
                text += item.getOpt("text");
            }
        }

        this._textCell.innerHTML = text;
    }
}

class Navigator extends Options
{
    constructor(app,options)
    {
        super(options);

        this._app = app;
        this._items = {};

        this._root = new NavigatorItem(this,options,null);
        this._root.build();

        this._tab = null;

        this._current = this._root;
    }

    get tab()
    {
        return(this._tab);
    }

    set tab(value)
    {
        this._tab = value;
    }

    get name()
    {
        return(this.getOpt("name",""));
    }

    get current()
    {
        return(this._current);
    }

    set current(value)
    {
        var item = (typeof(value) == "string") ? this.getItem(value) : value;

        if (item != null)
        {
            this._current = item;

            if (this._tab != null)
            {
                this._tab.navigator = (this._current._parent != null) ? this : null;
                this._tab.display();
            }
        }
    }

    getItem(key)
    {
        return(this._items.hasOwnProperty(key) ? this._items[key] : null);
    }

    display()
    {
        if (this._current._parent != null)
        {
            var text = this._current._parent.text;
            if (text.length == 0)
            {
                if (this._tab != null)
                {
                    text = this._tab.text;
                }
            }
            this._app.navigation = "<&nbsp;" + text;
        }
        else
        {
            this._app.navigation = "&nbsp;";
        }

        this._app.title = (this._tab != null) ? this._tab.text : this._current.text;

        if (this._current.hasChildren || this._current.getOpt("dynamic",false))
        {
            var table = document.createElement("table");
            table.className = "app";
            table.cellSpacing = 0;
            table.cellPadding = 0;

            var tr;
            var td;

            if (this.hasOpt("text"))
            {
                table.appendChild(tr = document.createElement("tr"));
                tr.appendChild(td = document.createElement("td"));
                tr.className = "navigatorTitle";
                td.colSpan = 2;
                td.innerHTML = this.getOpt("text");
            }

            if (this._current.hasChildren)
            {
                var item;

                for (var i = 0; i < this._current._items.length; i++)
                {
                    item = this._current._items[i];
                    tr = item.build();
                    if (i == 0)
                    {
                        uitools.addClassTo(tr,"first");
                    }
                    if (i == this._current._items.length - 1)
                    {
                        uitools.addClassTo(tr,"last");
                    }
                    table.appendChild(tr);
                }
            }
            else
            {
                var items = null;

                if (tools.supports(this._delegate,"getitems"))
                {
                    items = this._delegate.getitems(this,this._current);
                }

                if (items != null)
                {
                    items.forEach((i) =>
                    {
                        table.appendChild(new NavigatorItem(this,i,this._current).build());
                    });
                }
            }

            /*
            uitools.clearElement(this._app._content);
            */
            this._app._content.appendChild(table);
        }
        else
        {
            this._app._delegate.content(this._app,this._current);
        }
    }

    back()
    {
        this.current = this._current._parent;
        /*
        if (this.current._parent == null)
        {
            if (this.tab != null)
            {
                this.tab.display();
            }
        }
        */
    }

    clear()
    {
    }
}

class Tab extends Options
{
    constructor(options)
    {
        super(options);
        this._navigators = null;
        this._navigator = null;
    }

    init(app)
    {
        this._app = app;

        if (this.hasOpt("navigators"))
        {
            var navigator;

            this.getOpt("navigators").forEach((o) => {
                navigator = new Navigator(this._app,o);
                navigator.tab = this;

                if (this._navigators == null)
                {
                    this._navigators = [];
                }

                this._navigators.push(navigator);
            });
        }

        if (this.getOpt("disabled",false))
        {
            this.disable();
        }
    }

    get name()
    {
        return(this.getOpt("name",""));
    }

    get text()
    {
        return(this.getOpt("text",""));
    }

    get navigator()
    {
        return(this._navigator);
    }

    set navigator(value)
    {
        var navigator = (typeof(value) == "string") ? this.getNavigator(value) : value;

        //if (navigator != null)
        {
            this._navigator = navigator;
            this._app._navigator = navigator;

            uitools.clearElement(this._app._actions);
        }
    }

    getNavigator(name)
    {
        return(this._app.findNavigator(name,this._navigators));
    }

    findNavigator(name,list)
    {
        var navigator = null;

        if (list != null)
        {
            for (var n of list)
            {
                if (n.name == name)
                {
                    navigator = n;
                    break;
                }
            }
        }

        return(navigator);
    }

    get disabled()
    {
        return(this.getOpt("enabled",true) == false);
    }
    
    display()
    {
        if (this._navigator != null)
        {
            uitools.clearElement(this._app._content);
            this._navigator.display();
        }
        else if (this._navigators != null)
        {
            uitools.clearElement(this._app._content);
            this._navigators.forEach((navigator) => {
                navigator.display();
            });
        }
        else if (tools.supports(this._app._delegate,"tabSelected"))
        {
            this._app.navigation = "&nbsp;";
            this._app._delegate.tabSelected(this._app,this);
            this._app.navigator = null;
        }
    }

    enable()
    {
        this.setOpt("enabled",true);
        if (this._td != null)
        {
            this._td.style.opacity = 1;
            this._td.style.cursor = "pointer";
        }
    }

    disable()
    {
        this.setOpt("enabled",false);
        if (this._td != null)
        {
            this._td.style.opacity = .2;
            this._td.style.cursor = "unset";
        }
    }
}

class App extends Tab
{
    constructor(options,delegate)
    {
        super(options);

        this._mobile = uitools.isMobile();

        this.init(this);

        if (this.hasOpt("container"))
        {
            var o = this.getOpt("container");
            this._container = (typeof(o) == "string") ? document.getElementById(o) : o;
        }
        else
        {
            this._container = document.body;
        }
        this._delegate = delegate;

        if (tools.supports(this._delegate,"content") == false)
        {
            throw "The delegate must implement the content method";
        }

        this._splash = null;

        this._tabs = [];

        if (this.hasOpt("tabs"))
        {
            this.getOpt("tabs").forEach((o) => {
                var tab = new Tab(o);
                tab.init(this);
                this._tabs.push(tab);
            });
        }

        this._tab = null;

        const   self = this;
        window.addEventListener("resize",function(){self.layout()});

        uitools.clearElement(this._container);

        this._header = document.createElement("div");
        this._header.className = "appheader";

        var table = document.createElement("table");
        table.className = "appheader";
        table.style.width = "100%";
        table.cellSpacing = 0;
        table.cellPadding = 0;

        var tr;
        var td;

        table.appendChild(tr = document.createElement("tr"));
        tr.className = "actions";

        this._navigation = document.createElement("td");
        this._navigation.className = "navigation";
        this._navigation.style.cursor = "pointer";
        this._navigation.style.width = "10%";
        this._navigation.style.textAlign = "left";
        this._navigation._app = this;

        this._navigation.onclick = function(e) {
            var element = e.srcElement;
            var app = element._app;

            e.cancelBubble = true;

            if (app._navigator != null)
            {
                if (tools.supports(app._delegate,"leaving"))
                {
                    app._delegate.leaving(app._navigator._current);
                }

                app._navigator.back();
            }
        };

        this.navigation = "&nbsp;";

        tr.appendChild(this._navigation);

        this._actions = document.createElement("td");
        this._actions.className = "actions";
        this._actions.style.width = "90%";
        this._actions.style.textAlign = "right";
        this._actions.style.paddingRight = "20px";
        tr.appendChild(this._actions);

        this._title = document.createElement("td");
        this._title.colSpan = 2;
        table.appendChild(tr = document.createElement("tr"));
        tr.className = "title";
        tr.appendChild(this._title);

        this.title = "&nbsp;";

        this._header.appendChild(table);

        this._content = document.createElement("div");
        this._content.className = "appcontent";

        this._header.onclick = function(e) {
            if (self.getOpt("show_footer",true))
            {
                self.setOpt("show_footer",false);
            }
            else
            {
                self.setOpt("show_footer",true);
            }
            self.layout();
        };

        this._footer = null;

        if (this._tabs.length > 0)
        {
            this._footer = document.createElement("div");
            this._footer.className = "appfooter";

            var table = document.createElement("table");
            table.style.width = "100%";
            table.cellSpacing = 0;
            table.cellPadding = 0;

            var tr = table.appendChild(document.createElement("tr"));
            var td;

            this._tabs.forEach((tab) => {
                td = tr.appendChild(document.createElement("td"));
                td.className = "apptab";
                if (tab.disabled)
                {
                    td.style.opacity = .2;
                }
                else
                {
                    td.style.cursor = "pointer";
                }
                tab._td = td;
                var html = "";
                if (tab.hasOpt("icon"))
                {
                    html += "<span class='" + this.getOpt("icons","material-icons") + "'>";
                    html += tab.getOpt("icon");
                    html += "</span>";
                    html += "<br/>";
                }

                html += tab.getOpt("text",tab.getOpt("name",""));

                td.innerHTML = html;

                td._app = this;

                td.onclick = function(e) {
                    var td = uitools.climb(e.srcElement,"td",true);
                    var app = td._app;
                    if (tab.disabled == false)
                    {
                        app.tab = tab.name;
                    }
                };
            });

            this._footer.appendChild(table);
        }

        this._contentOpts = new Options();

        this.title = this.getOpt("name","App");

        this.layout();
    }

    set navigation(value)
    {
        this._navigation.innerHTML = value;
    }

    set title(value)
    {
        this._title.innerHTML = value;
    }

    get contentOpts()
    {
        return(this._contentOpts);
    }

    get content()
    {
        return(this._content);
    }

    set content(value)
    {
        uitools.clearElement(this._content);

        if (value != null)
        {
            this._contentOpts = new Options(value);
            var element = this._contentOpts.getOpt("element");
            if (element != null)
            {
                this._content.appendChild(this._contentOpts.getOpt("element"));
            }
            else
            {
                uitools.clearElement(this._content);
            }

            this.title = this._contentOpts.getOpt("title","");

            uitools.clearElement(this._actions);

            if (this._contentOpts.hasOpt("actions"))
            {
                var actions = this._contentOpts.getOpt("actions");
                var count = 0;
                var span;
                actions.forEach((action) => {
                    var opts = new Options(action);

                    if (count > 0)
                    {
                        span = document.createElement("span");
                        span.innerHTML = "&nbsp;&nbsp;&nbsp;";
                        this._actions.appendChild(span);
                    }

                    span = document.createElement("span");
                    span.className = this.getOpt("icons","material-icons");
                    span.style.cursor = "pointer";
                    span.innerHTML = opts.getOpt("icon");
                    span._app = this;
                    span._opts = opts;
                    this._actions.appendChild(span);

                    span.onclick = function(e) {
                        var span = e.srcElement;
                        var app = span._app;

                        e.cancelBubble = true;

                        if (tools.supports(app._delegate,"action"))
                        {
                            app._delegate.action(app,span._opts);
                        }
                    };

                    count++;
                });
            }
        }
        else
        {
            this._contentOpts = new Options();
        }

        this.layout();
    }

    set tab(value)
    {
        var t = null;

        for (var i = 0; i < this._tabs.length; i++)
        {
            if (this._tabs[i].name == value)
            {
                t = this._tabs[i];
            }
            else
            {
                uitools.removeClassFrom(this._tabs[i]._td,"selected");
            }
        }

        if (t != null)
        {
            uitools.addClassTo(t._td,"selected");
            this._navigator = t._navigator;
            t.display();

            /*
            if (t.hasOpt("navigator"))
            {
                this.navigator = t.getOpt("navigator");
            }
            else if (tools.supports(this._delegate,"tabSelected"))
            {
                this._delegate.tabSelected(this,t);
                this.navigator = null;
            }
            */
        }
    }

    set splash(value)
    {
        uitools.clearElement(this._container);
        this._splash = value;
        this._splash.style.display = "block";
        this._container.appendChild(value);
        this.layout();
    }

    get isMobile()
    {
        return(this._mobile);
    }

    addComponents()
    {
        uitools.clearElement(this._container);
        this._container.appendChild(this._header);
        this._container.appendChild(this._content);
        if (this._footer != null)
        {
            this._container.appendChild(this._footer);
        }
        this.layout();
    }

    show(tab,navigator,item)
    {
        if (this._splash != null)
        {
            uitools.clearElement(this._content);
            this._splash = null;
        }

        if (this._content.firstChild == null)
        {
            this.addComponents();
        }

        var t = (tab != null) ? this.getTab(tab) : this;

        if (t != null)
        {
            this.tab = t.name;

            if (navigator != null)
            {
                var nav = t.getNavigator(navigator);
                if (nav != null)
                {
                    if (item != null)
                    {
                        nav.current = item;
                    }
                }
            }
        }
    }

    enableTab(name)
    {
        var tab = this.getTab(name);
        if (tab != null)
        {
            tab.enable();
        }
    }

    enableTabs(names)
    {
        names.forEach((name) => {
            this.enableTab(name);
        });
    }

    disableTab(name)
    {
        var tab = this.getTab(name);
        if (tab != null)
        {
            tab.disable();
        }
    }

    disableTabs(names)
    {
        names.forEach((name) => {
            this.disableTab(name);
        });
    }

    getTab(name)
    {
        var t = null;

        for (var i = 0; i < this._tabs.length; i++)
        {
            if (this._tabs[i].name == name)
            {
                t = this._tabs[i];
                break;
            }
        }

        return(t);
    }

    start()
    {
        this._splash = null;

        this.addComponents();

        for (var i = 0; i < this._tabs.length; i++)
        {
            if (this._tabs[i].getOpt("start",false))
            {
                this.tab = this._tabs[i].name;
                break;
            }
        }
    }

    layout()
    {
        var landscape = false;

        if (window.hasOwnProperty("orientation"))
        {
            landscape = (window.orientation == 90 || window.orientation == -90);
        }

        var margins = uitools.getMargins(this._container);
        var	width = this._container.clientWidth - (margins.left + margins.right);
        var	height = this._container.clientHeight - (margins.top + margins.bottom);
        var showFooter = this.getOpt("show_footer",true);

        if (this._splash != null)
        {
            this._splash.style.left = margins.left + "px";
            this._splash.style.top = margins.top + "px";
            this._splash.style.width = width + "px";
            this._splash.style.height = height + "px";
        }
        else
        {
            var	top = margins.top;

            if (this._header != null)
            {
                var	bannerBorders = uitools.getBorders(this._header,true);
                this._header.style.left = margins.left + "px";
                this._header.style.top = margins.left + "px";
                this._header.style.width = (width - bannerBorders.hsize - margins.width) + "px";
                top = this._header.offsetTop + this._header.offsetHeight;
            }

            var	contentBorders = uitools.getBorders(this._content,true);

            this._content.style.left = margins.left + "px";
            this._content.style.top = top + "px";
            this._content.style.width = (width - contentBorders.hsize - margins.width) + "px";

            var h = height - this._content.offsetTop - contentBorders.vsize;

            if (this._footer != null)
            {
                if (showFooter == false)
                {
                    this._footer.style.display = "none";
                }
                else
                {
                    this._footer.style.display = "block";
                    var	tabBorders = uitools.getBorders(this._footer,true);

                    this._footer.style.left = margins.left + "px";
                    this._footer.style.top = (height - this._footer.offsetHeight) + "px";
                    this._footer.style.width = (width - tabBorders.hsize - margins.width) + "px";
                    h -= this._footer.offsetHeight;
                }
            }

            this._content.style.height = h + "px";

            dialogs.placeModals();

            this.size();
        }
    }

    size()
    {
    }
}

var _api =
{
    create:function(options,delegate)
    {
        return(new App(options,delegate));
    }
};

export {_api as app};
