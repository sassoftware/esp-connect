import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";
import {dialogs} from "./dialogs.js";
import {uitools} from "./uitools.js";

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
            html += "<span class='material-icons' style='padding:0;padding-right:10px'>";
            html += this.getOpt("icon");
            html += "</span>";
        }
        else
        {
            html += "<span class='material-icons' style='padding:0;padding-right:20px'>";
            html += "&nbsp;";
            html += "</span>";
        }

        if (this.hasOpt("text"))
        {
            html += this.getOpt("text");
        }

        td.innerHTML = html;

        tr.appendChild(td = document.createElement("td"));
        td._item = this;

        if (this.hasChildren)
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

        this._root = new NavigatorItem(this,options);
        this._root.build();

        this._current = this._root;
    }

    get name()
    {
        return(this.getOpt("name",""));
    }

    get current()
    {
        return(_this._current);
    }

    set current(value)
    {
        var item = (typeof(value) == "string") ? this.getItem(value) : value;

        if (item != null)
        {
            this._current = item;
            this.display();
        }
    }

    getItem(key)
    {
        return(this._items.hasOwnProperty(key) ? this._items[key] : null);
    }

    display()
    {
        var table = document.createElement("table");
        table.className = "app";
        table.style.width = "100%";
        table.cellSpacing = 0;
        table.cellPadding = 0;

        var tr;
        var td;

        /*
        if (this._current._parent != null)
        {
            this._app.navigation = "<&nbsp;&nbsp;" + this._current._parent.text;
            this._app.title = this._current.text;
        }
        else
        {
            this._app.navigation = "&nbsp;";
            this._app.title = this.getOpt("text",this.getOpt("name",""));
        }
        */
        if (this._current._parent != null)
        {
            this._app.navigation = "<&nbsp;&nbsp;" + this._current._parent.text;
        }
        else
        {
            this._app.navigation = "&nbsp;";
        }
        this._app.title = this._current.text;

        if (this._current.hasChildren)
        {
            this._current._items.forEach((item) =>
            {
                table.appendChild(item.build());
            });
        }
        else if (this._current.getOpt("dynamic",false))
        {
            var items = null;

            if (tools.supports(this._delegate,"getitems"))
            {
                items = this._delegate.getitems(this._current);
            }

            if (items != null)
            {
                items.forEach((i) =>
                {
                    table.appendChild(new NavigatorItem(this,i,this._current).build());
                });
            }
        }
        else
        {
            var tr = document.createElement("tr");
            var td = document.createElement("td");
            tr.appendChild(td);
            table.appendChild(tr);

            //this._app._delegate.content(this._current,td,title);
            this._app._delegate.content(this._current,td);
        }

        uitools.clearElement(this._app._content);
        this._app._content.appendChild(table);
    }

    back()
    {
        this.current = this._current._parent;
    }

    clear()
    {
    }
}

class Tab extends Options
{
    constructor(app,options)
    {
        super(options);
        this._app = app;

        if (this.getOpt("disabled",false))
        {
            this.disable();
        }
    }

    get name()
    {
        return(this.getOpt("name",""));
    }

    get disabled()
    {
        return(this.getOpt("enabled",true) == false);
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

class App extends Options
{
    constructor(options,delegate)
    {
        super(options);

        this._delegate = delegate;

        if (tools.supports(this._delegate,"content") == false)
        {
            throw "The delegate must implement the content method";
        }

        this._navigators = {};

        if (this.hasOpt("navigators"))
        {
            this.getOpt("navigators").forEach((o) => {
                var nav = new Navigator(this,o);
                this._navigators[nav.name] = nav;
            });
        }

        this._navigator = null;

        this._tabs = [];

        if (this.hasOpt("tabs"))
        {
            this.getOpt("tabs").forEach((o) => {
                var tab = new Tab(this,o);
                this._tabs.push(tab);
            });
        }

        this._tab = null;

        const   self = this;
        window.addEventListener("resize",function(){self.layout()});
        /*
        document.addEventListener("touchmove",
            function(e)
            {
                alert('doit');
                e.preventDefault();
                return(false);
            });
        */

        /*
        uitools.clearElement(document.body);
        */

        this._header = document.createElement("div");
        this._header.className = "appheader";

        var table = document.createElement("table");
        table.style.width = "100%";
        table.cellSpacing = 0;
        table.cellPadding = 0;

        var tr;
        var td;

        table.appendChild(tr = document.createElement("tr"));

        this._navigation = document.createElement("td");
        this._navigation.style.cursor = "pointer";
        this._navigation._app = this;

        this._navigation.onclick = function(e) {
            var td = e.srcElement;
            var app = td._app;

            if (app._navigator != null)
            {
                if (tools.supports(app._delegate,"leaving"))
                {
                    app._delegate.leaving(app._navigator._current);
                }

                app._navigator.back();
            }
        };

        this._title = document.createElement("td");

        this._navigation.style.position = "absolute";
        this._title.style.textAlign = "center";

        this.navigation = "&nbsp;";
        this.title = "&nbsp;";

        tr.appendChild(this._navigation);
        tr.appendChild(this._title);

        this._header.appendChild(table);

        this._content = document.createElement("div");
        this._content.className = "appcontent";

        document.body.appendChild(this._header);
        document.body.appendChild(this._content);

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
                    html += "<span class='material-icons'>";
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

            document.body.appendChild(this._footer);
        }

        this.title = this.getOpt("name","App");

        this.layout();
    }

    get name()
    {
        return(this.getOpt("name",""));
    }

    set navigation(value)
    {
        this._navigation.innerHTML = value;
    }

    set title(value)
    {
        this._title.innerHTML = value;
    }

    get content()
    {
        return(this._content);
    }

    set content(value)
    {
        var opts = new Options(value);
        uitools.clearElement(this._content);
        var element = opts.getOpt("element");
        if (element != null)
        {
            this._content.appendChild(opts.getOpt("element"));
        }
        else
        {
            uitools.clearElement(this._content);
        }
        this.title = opts.getOpt("title","");
        this.navigator = null;
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

            if (t.hasOpt("navigator"))
            {
                this.navigator = t.getOpt("navigator");
            }
            else if (tools.supports(this._delegate,"tabSelected"))
            {
                this._delegate.tabSelected(t);
            }
        }
    }

    get navigator()
    {
        return(this._navigator);
    }

    set navigator(value)
    {
        if (value == null)
        {
            this.navigation = "";
        }
        else if (this._navigators.hasOwnProperty(value))
        {
            this._navigator = this._navigators[value];
            this.title = this._navigator.getOpt("text",this._navigator.getOpt("name",""));
            this._navigator.display();
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

    disableTab(name)
    {
        var tab = this.getTab(name);
        if (tab != null)
        {
            tab.disable();
        }
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

        var	spacing = 5;
        var	top = bodyMargin;

        if (this._header != null)
        {
            var	bannerBorders = uitools.getBorders(this._header,true);
            this._header.style.left = bodyMargin + "px";
            this._header.style.top = bodyMargin + "px";
            this._header.style.width = (width - bannerBorders.hsize - bodyMargin) + "px";
            top = this._header.offsetTop + this._header.offsetHeight;
        }

        var	contentBorders = uitools.getBorders(this._content,true);

        this._content.style.left = bodyMargin + "px";
        this._content.style.top = top + "px";
        this._content.style.width = (width - contentBorders.hsize - bodyMargin) + "px";

        var h = height - this._content.offsetTop - contentBorders.vsize;

        if (this._footer != null)
        {
            var	tabBorders = uitools.getBorders(this._footer,true);

            this._footer.style.left = bodyMargin + "px";
            this._footer.style.top = (height - this._footer.offsetHeight) + "px";
            this._footer.style.width = (width - tabBorders.hsize - bodyMargin) + "px";

            h -= this._footer.offsetHeight;
        }

        this._content.style.height = h + "px";

        dialogs.placeModals();
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
