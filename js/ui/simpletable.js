/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "../connect/options",
    "../connect/schema",
    "../connect/tools"
], function(Options,Schema,tools)
{
    function
    SimpleTable(container,options,delegate)
    {
        Options.call(this,options);

        this._container = container;
        this._delegate = delegate;
        this._container.style.overflow = "auto";
        this._table = document.createElement("table");
        this._table.cellSpacing = 0;
        this._table.cellPadding = 0;
        this._table.style.margin = 0;
        this._table.style.position = "relative";
        this._table.className = "visualTable";
        this._container.appendChild(this._table);
        this._schema = new Schema();
        this._hold = 0;
        this._list = [];
        this._map = {};
        this.size();

        this._keyfield = this.getOpt("key");

        if (this._keyfield == null)
        {
            throw "You must specify a key field";
        }

        Object.defineProperty(this,"name", {
            get() {
                return(this.getOpt("name",""));
            }
        });

        Object.defineProperty(this,"items", {
            get() {
                return(this._list);
            }
        });

        Object.defineProperty(this,"map", {
            get() {
                return(this._map);
            }
        });

        Object.defineProperty(this,"length", {
            get() {
                return(this._list.length);
            }
        });

        Object.defineProperty(this,"fields", {
            get() {
                return(this._schema.getFields());
            }
        });
    }

    SimpleTable.prototype = Object.create(Options.prototype);
    SimpleTable.prototype.constructor = SimpleTable;

    SimpleTable.prototype.getType =
    function()
    {
        return("simpletable");
    }

    SimpleTable.prototype.setFields =
    function(fields)
    {
        this._schema.setFields(fields);

        fields.forEach((f) => {
            if (f.hasOwnProperty("hidden") && f.hidden)
            {
                this.hide(f.name);
            }

            if (f.hasOwnProperty("nobr") && f.nobr)
            {
                this.setProperty(f.name,"nobr");
            }
        });
    }

    SimpleTable.prototype.hide =
    function(name)
    {
        this.setProperty(name,"hidden");
    }

    SimpleTable.prototype.unhide =
    function(name)
    {
        this.unsetProperty(name,"hidden");
    }

    SimpleTable.prototype.isHidden =
    function(name)
    {
        return(this.isSet(name,"hidden"));
    }

    SimpleTable.prototype.setProperty =
    function(name,property)
    {
        var field = this._schema.getField(name);

        if (field != null)
        {
            field.setOpt(property,true);
        }
    }

    SimpleTable.prototype.unsetProperty =
    function(name,property)
    {
        var field = this._schema.getField(name);

        if (field != null)
        {
            field.clearOpt(property);
        }
    }

    SimpleTable.prototype.isSet =
    function(name,property)
    {
        var code = false;
        var field = this._schema.getField(name);

        if (field != null)
        {
            code = field.getOpt(property,false);
        }

        return(code);
    }

    SimpleTable.prototype.setData =
    function(data,clear)
    {
        this.hold();
        if (clear)
        {
            this.clear();
        }
        if (data != null)
        {
            data.forEach((d) =>
            {
                this.setItem(d);
            });
        }
        this.release();
    }

    SimpleTable.prototype.setItem =
    function(data,itemKey)
    {
        var key = itemKey;

        if (key == null)
        {
            key = (data.hasOwnProperty(this._keyfield)) ? data[this._keyfield] : null;
        }

        if (key == null)
        {
            return(null);
        }

        var sort = this.getOpt("sort");
        var item;

        if (this._map.hasOwnProperty(key))
        {
            item = this._map[key];
        }
        else
        {
            item = {};

            this._map[key] = item;
            this._list.push(item);

            Object.defineProperty(item,"key", {
                get() {
                    var key = (this.hasOwnProperty("_key")) ? this._key : "";
                    return(key);
                }
            });

            Object.defineProperty(item,"selected", {
                get() {
                    return(this._selected);
                },
                set(value) {
                    if (value != this._selected)
                    {
                        this._selected = value;

                        if (this._row != null)
                        {
                            if (this._selected)
                            {
                                this._table.addClassTo(this._row,"selected");
                                if (this._row.offsetTop < this._table._container.scrollTop || this._row.offsetTop > (this._table._container.scrollTop + this._table._container.offsetHeight))
                                {
                                    this._row.scrollIntoView(false);
                                }
                            }
                            else
                            {
                                this._table.removeClassFrom(this._row,"selected");
                            }
                        }
                    }
                }
            });

            item._key = key;
            item._table = this;
            item._row = null;

            item.selected = false;
            item["_sort"] = sort;
        }

        item["_data"] = data;

        this._schema.getFields().forEach((field) =>
        {
            name = field.getOpt("name");

            if (data.hasOwnProperty(name))
            {
                item[name] = data[name];
            }
        });

        if (this._hold == 0)
        {
            if (sort != null)
            {
                this._list.sort(this.sortFunc);
            }

            this.draw();
        }

        return(item);
    }

    SimpleTable.prototype.getItem =
    function(key)
    {
        return(this._map.hasOwnProperty(key) ? this._map[key] : null);
    }

    SimpleTable.prototype.removeItem =
    function(data)
    {
        var key = (typeof data == "string") ? data : ((data.hasOwnProperty(this._keyfield)) ? data[this._keyfield] : null);

        if (key == null)
        {
            return(false);
        }

        var item = this.getItem(key);
        var code = false;

        if (item != null)
        {
            delete this._map[key];
            tools.removeFrom(this._list,item);
            code = true;
        }

        return(code);
    }

    SimpleTable.prototype.removeHead =
    function(num)
    {
        var items = this._list.splice(0,num);
        items.forEach((item) => {
            delete this._map[item._key];
        });
        this.draw();
    }

    SimpleTable.prototype.draw =
    function()
    {
        while (this._table.rows.length > 0)
        {
            this._table.deleteRow(this._table.rows[0]);
        }

        this.size();

        var label;
        var type;
        var tr;
        var th;

        this._table.appendChild(tr = document.createElement("tr"));

        var fields = this._schema.getFields();
        var column = 0;

        for (var field of fields)
        {
            if (field.getOpt("hidden",false))
            {
                continue;
            }

            th = document.createElement("th");

            if (column == 0)
            {
                th.className = "first";
            }

            type = field.getOpt("type","");

            if (type == "int" || type == "float")
            {
                th.style.textAlign = "right";
            }
            label = field.getOpt("label",field.getOpt("name"));
            th.innerHTML = label;
            tr.appendChild(th);

            column++;
        }

        var table = this;
        var ownerdraw = this.getOpt("owner_draw");
        var row = 0;
        var show = null;
        var text;
        var type;
        var name;
        var td;

        tr = null;

        this._list.forEach((item) =>
        {
            this._table.appendChild(tr = document.createElement("tr"));

            item._row = tr;

            if (row == 0)
            {
                tr.className = "first";
            }

            if (item.selected)
            {
                if (show == null)
                {
                    show = tr;
                }

                this.addClassTo(tr,"selected");
            }

            tr["context"] = {table:this,item:item,index:row};
            tr.addEventListener("click",function(e){table.clicked(e);});

            column = 0;

            for (var field of fields)
            {
                if (field.getOpt("hidden",false))
                {
                    continue;
                }

                name = field.getOpt("name");
                type = field.getOpt("type");

                td = document.createElement("td");

                if (column == 0)
                {
                    td.className = "first";
                }

                if (type == "int" || type == "float")
                {
                    td.style.textAlign = "right";
                }

                tr.appendChild(td);

                if (ownerdraw != null && ownerdraw.includes(name))
                {
                    this.drawCell(this,name,item,td);
                }
                else
                {
                    text = null;

                    if (item.hasOwnProperty(name))
                    {
                        text = item[name];
                    }

                    if (text == null)
                    {
                        text = "&nbsp;";
                    }
                    else if (field.getOpt("nobr",false))
                    {
                        text = "<nobr>" + text + "</nobr>";
                    }

                    td.innerHTML = text;
                }

                column++;
            }

            row++;
        });

        if (tr != null)
        {
            tr.className = "last";
        }

        if (show == null)
        {
            if (this.getOpt("tail",false))
            {
                show = tr;
            }
        }

        if (show != null)
        {
            if (show.offsetTop < this._container.scrollTop || show.offsetTop > (this._container.scrollTop + this._container.offsetHeight))
            {
                show.scrollIntoView(false);
            }
        }
    }

    SimpleTable.prototype.hold =
    function()
    {
        this._hold++;
    }

    SimpleTable.prototype.release =
    function(force)
    {
        if (force)
        {
            this._hold = 0;
        }
        else if (this._hold > 0)
        {
            this._hold--;
        }

        if (this._hold == 0)
        {
            var sort = this.getOpt("sort");

            if (sort != null)
            {
                this._list.sort(this.sortFunc);
            }

            this.draw();
        }
    }

    SimpleTable.prototype.clear =
    function()
    {
        this._list = [];
        this._map = {};
    }

    SimpleTable.prototype.refresh =
    function()
    {
    }

    SimpleTable.prototype.size =
    function()
    {
        if (this._table != null)
        {
            this._table.style.width = this._container.clientWidth + "px";
        }
    }

    SimpleTable.prototype.sortFunc =
    function(a,b)
    {
        return(b[b._sort.field] - a[a._sort.field]);
    }

    SimpleTable.prototype.deselectAll =
    function()
    {
        this._list.forEach((item) => {
            item.selected = false;
        });
    }

    SimpleTable.prototype.select =
    function(key)
    {
        if (this._map.hasOwnProperty(key))
        {
            if (this.getOpt("multi_select",false) == false)
            {
                this.deselectAll();
            }

            this._map[key].selected = true;
        }
    }

    SimpleTable.prototype.deselect =
    function(key)
    {
        if (this._map.hasOwnProperty(key))
        {
            this._map[key].selected = false;
        }
    }

    SimpleTable.prototype.clicked =
    function(e)
    {
        if (e.currentTarget.hasOwnProperty("context"))
        {
            var context = e.currentTarget["context"];
            if (tools.supports(this._delegate,"itemClicked"))
            {
                this._delegate.itemClicked(context.item);
            }
        }
    }

    SimpleTable.prototype.getSelectedItems =
    function()
    {
        var items = [];

        this._list.forEach((item) => {
            if (item._selected)
            {
                items.push(item);
            }
        });

        return(items);
    }

    SimpleTable.prototype.getSelectedItem =
    function()
    {
        var items = this.getSelectedItems();
        return(items.length > 0 ? items[0] : null);
    }

    SimpleTable.prototype.getSelectedKeys =
    function()
    {
        var keys = [];

        this._list.forEach((item) => {
            if (item._selected)
            {
                keys.push(item._key);
            }
        });

        return(keys);
    }

    SimpleTable.prototype.drawCell =
    function(table,name,item,td)
    {
        td.innerHTML = "&nbsp;";
    }

    SimpleTable.prototype.addClassTo =
    function(element,c)
    {
        var	className = element.className;

        if (className.indexOf(" " + c) == -1)
        {
            className += (" " + c);
            element.className = className;
        }
    }

    SimpleTable.prototype.removeClassFrom =
    function(element,c)
    {
        var	className = element.className;

        if (className.indexOf(" " + c) != -1)
        {
            className = className.replace(" " + c,"");
            element.className = className;
        }
    }

    SimpleTable.prototype.hideToolbar =
    function()
    {
    }

    SimpleTable.prototype.sizeContent =
    function()
    {
        this.size();
    }

    /*
    SimpleTable.prototype.toString =
    function()
    {
        var s = "";

        this._list.forEach((item) => {
            this._schema.getFields().forEach((field) => {
                if (item.hasOwnProperty(field.getOpt("name")))
                {
                    s += field.getOpt("name");
                    s += "=";
                    s += item[field.getOpt("name")];
                }
            });
        });

        return(s);
    }
    */

    return(SimpleTable);
});
