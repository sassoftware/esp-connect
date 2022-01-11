import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";
import {uitools} from "./uitools.js";

class Item extends Options
{
    constructor(menu,options,p)
    {
        super(options);

        this._menu = menu;
        this._parent = p;
        this._table = null;
        this._tr = null;

        var parentname = (this._parent != null) ? this._parent.getOpt("name") : null;
        var name = this.getOpt("name");

        this._key = (parentname != null) ? parentname + "." + name : name;

        this._items = [];

        this.getOpt("items",[]).forEach((item) =>
        {
            this._items.push(new Item(this._menu,item,this));
        });

        this.build();

        this._table = (this._items.length > 0) ? document.createElement("table") : null;

        if (this._table != null)
        {
            this._table._menu = this;
            this._table.style.position = "absolute";
            this._table.style.display = "none";
            this._table.className = "menu";
            this._table.cellSpacing = 0;
            this._table.cellPadding = 0;

            document.body.appendChild(this._table);

            this._items.forEach((item) => {
                this._table.appendChild(item.build());
            });
        }
    }

    get name() 
    {
        return(this.getOpt("name",""));
    }

    get text() 
    {
        return(this.getOpt("text",this.name));
    }

    get parentName() 
    {
        return(this._parent != null ? this._parent.getOpt("name","") : "");
    }

    get key() 
    {
        return(this._key);
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
        this._tr = document.createElement("tr");
        this._tr.className = "item";
        this._tr._item = this;

        var td = document.createElement("td");
        td.className = "content";
        td.style.verticalAlign = "middle";
        td._item = this;
        this._tr.appendChild(td);

        var nav = document.createElement("td");
        nav.className = "nav";
        this._tr.appendChild(nav);

        if (this.hasOpt("image"))
        {
            var opts = new Options(this.getOpt("image"));
            var img = document.createElement("img");
            if (opts.hasOpt("data"))
            {
                img.src = opts.getOpt("data");
            }
            img.style.width = this._app.getOpt("image_width","100") + "px";
            img.style.height = this._app.getOpt("image_height","100") + "px";
            td.appendChild(img);
        }

        if (this.hasOpt("text"))
        {
            var span = document.createElement("span");
            span.innerHTML = this.getOpt("text");
            td.appendChild(span);
        }

        const   self = this;

        if (this.hasChildren)
        {
            nav.innerHTML = "&gt;";
        }
        else
        {
            nav.innerHTML = "&nbsp;";

            this._tr.addEventListener("click",function() {
                self._menu.select(self);
            });
        }

        this._tr.addEventListener("mouseover",function() {
            self._menu.over(self);
        });

        return(this._tr);
    }

    show(x,y)
    {
        if (this._table != null)
        {
            this._table.style.left = x + "px";
            this._table.style.top = y + "px";
            this._table.style.display = "block";
            this._table.style.zIndex = 1000;

            var offset = uitools.getOffset(this._table);
            var redraw = false;

            if (offset.right > document.documentElement.clientWidth)
            {
                x = document.documentElement.scrollLeft + document.documentElement.clientWidth - this._table.offsetWidth - 20;
                redraw = true;
            }

            if (offset.bottom > document.documentElement.clientHeight)
            {
                y = document.documentElement.scrollTop + document.documentElement.clientHeight - this._table.offsetHeight - 20;
                redraw = true;
            }

            if (redraw)
            {
                if (this._parent != null)
                {
                    var poffset = uitools.getOffset(this._parent._table);
                    this._table.style.left = (poffset.left - offset._width) + "px";
                    this._table.style.top = y + "px";
                }
                else
                {
                    this._table.style.left = x + "px";
                    this._table.style.top = y + "px";
                }
            }
        }
    }

    showFrom(element,options)
    {
        var opts = new Options(options);
        var offset = uitools.getOffset(element);

        var x = offset.left;
        var y = offset.top;

        var xalign = opts.getOpt("xalign","left");
        var yalign = opts.getOpt("yalign","bottom");

        if (xalign == "right")
        {
            x = offset.right;
        }

        if (yalign == "bottom")
        {
            y = offset.bottom;
        }

        this.show(x,y);
    }

    hide()
    {
        if (this._table != null)
        {
            this._table.style.display = "none";
        }

        this._items.forEach((item)=> {
            item.hide();
        });
    }
}

class Menu extends Options
{
    constructor(options,delegate)
    {
        super(options);
        this._delegate = delegate;

        this._root = new Item(this,options);
        this._root.build();

        if (this.getOpt("hide_on_out",false))
        {
            const   self = this;

            this._root._table.addEventListener("mouseleave",function() {
                self.hide();
            });
        }
    }

    get name() 
    {
        return(this.getOpt("name",""));
    }

    show(x,y)
    {
        _api.hideAll();
        this._root.show(x,y);
    }

    showFrom(element,options)
    {
        _api.hideAll();
        this._root.showFrom(element,options);
    }

    hide()
    {
        this._root.hide();
    }

    select(item)
    {
        if (tools.supports(this._delegate,"selected"))
        {
            this._delegate.selected(this,item.key,item);
        }
    }

    over(item)
    {
        if (item._parent != null)
        {
            if (item._parent._submenu != null)
            {
                if (item._parent._submenu != this)
                {
                    item._parent._submenu.hide();
                }
            }
        }

        if (item.hasChildren)
        {
            if (item._parent != null)
            {
                item._parent._submenu = item;
            }

            item.showFrom(item._tr,{xalign:"right",yalign:"top"});
        }
    }
}

var _api =
{
    _menus:[],

    create:function(options,delegate)
    {
        var menu = new Menu(options,delegate);
        this._menus.push(menu);
        return(menu);
    },

    hideAll:function()
    {
        this._menus.forEach((menu) => {
            menu.hide();
        });
    }
};

export {_api as menu};
