/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "../connect/options.js";
import {Schema} from "../connect/schema.js";
import {tools} from "../connect/tools.js";
import {dialogs} from "./dialogs.js";

class SimpleTable extends Options
{
    constructor(container,options,delegate)
    {
        super(options);

        this._container = container;

        var container = ((typeof(this._container) == "string") ? document.getElementById(this._container) : this._container);

        this._delegate = delegate;
        this._table = document.createElement("table");
        this._table.cellSpacing = 0;
        this._table.cellPadding = 0;
        this._table.style.margin = 0;
        this._table.style.position = "relative";
        this._table.className = "simpletable";

        container.style.overflow = "auto";
        container.appendChild(this._table);

        this._schema = new Schema();
        this._hold = 0;
        this._list = [];
        this._map = {};
        this.size();

        this._keyfield = this.getOpt("key");

        var actions = this.getOpt("actions",null);

        if (actions != null)
        {
            var a = [];

            actions.forEach((action) => {
                a.push(new Options(action));
            });

            this.setOpt("actions",a);
        }

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

        Object.defineProperty(this,"container", {
            get() {
                var container = ((typeof(this._container) == "string") ? document.getElementById(this._container) : this._container);
                return(container);
            }
        });
    }

    getType()
    {
        return("simpletable");
    }

    setFields(fields)
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

    showFields(names)
    {
        var fields = this._schema.getFields();

        fields.forEach((f) =>
        {
            this.hide(f.getOpt("name"));
        });

        names.forEach((name) =>
        {
            this.show(name);
        });
    }

    show(name)
    {
        this.unsetBoolProperty(name,"hidden");
    }

    hide(name)
    {
        this.setBoolProperty(name,"hidden");
    }

    isDisplayed(name)
    {
        return(this.isSet(name,"hidden") == false);
    }

    isHidden(name)
    {
        return(this.isSet(name,"hidden"));
    }

    showFieldDialog()
    {
        var form = [];
        var fields = this._schema.getFields();
        fields.forEach((f) =>
        {
            var name = f.getOpt("name");
            //form.push({name:f.getOpt("name"),label:f.getOpt("label"),type:"checkbox",value:this.isDisplayed(name)});
            form.push({name:name,type:"checkbox",value:this.isDisplayed(name)});
        });

        var self = this;

        var o = {
            ok:function(dialog) {
                var names = [];

                fields.forEach((f) =>
                {
                    var name = f.getOpt("name");
                    var value = dialog.getValue(name);
                    if (value)
                    {
                        self.show(name);
                        names.push(name);
                    }
                    else
                    {
                        self.hide(name);
                    }
                });

                self.draw();

                if (tools.supports(self._delegate,"fieldsChanged"))
                {
                    self._delegate.fieldsChanged(self,names);
                }

                return(true);
            }
        } 

        dialogs.showDialog({title:"Show Fields",delegate:o,form:form,height:"90%"});
    }

    setProperty(name,property,value)
    {
        var a = (Array.isArray(name)) ? name : [name];

        a.forEach((f) =>
        {
            var field = this._schema.getField(f);

            if (field != null)
            {
                field.setOpt(property,value);
            }
        });
    }

    clearProperty(name,property)
    {
        var field = this._schema.getField(name);

        if (field != null)
        {
            field.clearOpt(property);
        }
    }

    setBoolProperty(name,property)
    {
        this.setProperty(name,property,true);
    }

    unsetBoolProperty(name,property)
    {
        this.setProperty(name,property,false);
    }

    isSet(name,property)
    {
        var code = false;
        var field = this._schema.getField(name);

        if (field != null)
        {
            code = field.getOpt(property,false);
        }

        return(code);
    }

    setData(data,clear)
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

    getData()
    {
        return(this._list);
    }

    setItem(data,itemKey)
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
                },
                set(value) {
                    this._key = value;
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

    getItem(key)
    {
        return(this._map.hasOwnProperty(key) ? this._map[key] : null);
    }

    moveToTop(data)
    {
        var key = (typeof data == "string") ? data : ((data.hasOwnProperty(this._keyfield)) ? data[this._keyfield] : null);

        for (var i = 0; i < this._list.length; i++)
        {
            if (this._list[i]._key == key)
            {
                var item = this._list.splice(i,1);
                this._list.unshift(item[0]);
                break;
            }
        }
    }

    removeItem(data)
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

    removeHead(num)
    {
        var items = this._list.splice(0,num);
        items.forEach((item) => {
            delete this._map[item._key];
        });
        this.draw();
    }

    setFieldValues(field,values)
    {
        this.setProperty(field,"values",values);
    }

    draw()
    {
        while (this._table.rows.length > 0)
        {
            this._table.deleteRow(this._table.rows[0]);
        }

        this.size();

        var fields = this._schema.getFields();
        var actions = this.getOpt("actions",null);
        var self = this;
        var label;
        var type;
        var tr;
        var th;

        this._table.appendChild(tr = document.createElement("tr"));

        var column = 0;

        if (actions != null)
        {
            th = document.createElement("th");
            th.className = "first";
            tr.appendChild(th);

            var hasGlobal = false;
            var nobr = null;

            actions.forEach((action) => {
                if (action.getOpt("global",false))
                {
                    if (nobr == null)
                    {
                        nobr = document.createElement("nobr");
                        th.appendChild(nobr);
                    }

                    var span = document.createElement("span");
                    var icon = document.createElement("i");
                    span.className = "action";
                    icon.className = "material-icons";
                    icon.innerText = action.getOpt("icon","");
                    span.appendChild(icon);
                    nobr.appendChild(span);

                    icon["context"] = {table:this,name:action.getOpt("name",""),item:null};
                    icon.addEventListener("click",function(e){self.action(e);});

                    hasGlobal = true;
                }
            });

            if (hasGlobal == false)
            {
                th.innerHTML = "&nbsp;";
            }

            column++;
        }

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
            tr.addEventListener("click",function(e){self.clicked(e);});

            column = 0;

            if (actions != null)
            {
                var content = "";

                td = document.createElement("td");
                td.className = "first icon";
                tr.appendChild(td);

                var nobr = null;

                actions.forEach((action) => {
                    if (action.getOpt("global",false) == false)
                    {
                        if (nobr == null)
                        {
                            nobr = document.createElement("nobr");
                            td.appendChild(nobr);
                        }

                        var span = document.createElement("span");
                        var icon = document.createElement("i");
                        span.className = "action";
                        icon.className = "material-icons";
                        icon.innerText = action.getOpt("icon","");
                        icon["context"] = {table:this,name:action.getOpt("name",""),item:item};
                        icon.addEventListener("click",function(e){self.action(e);});
                        span.appendChild(icon);
                        nobr.appendChild(span);
                    }
                });

                column++;
            }

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
                    text = (item.hasOwnProperty(name)) ? item[name] : null;

                    if (field.hasOpt("values"))
                    {
                        var values = field.getOpt("values");

                        if (values.hasOwnProperty(text))
                        {
                            text = values[text];
                        }
                    }

                    if (field.hasOpt("image"))
                    {
                        if (text == null || text.length == 0)
                        {
                            td.innerHTML = "&nbsp;";
                        }
                        else
                        {
                            var i = field.getOpt("image");
                            var img = document.createElement("img");
                            img.src = text;

                            if (i.hasOwnProperty("width"))
                            {
                                img.style.width = i["width"];
                            }

                            if (i.hasOwnProperty("height"))
                            {
                                img.style.height = i["height"];
                            }

                            td.style.textAlign = "center";

                            td.appendChild(img);
                        }
                    }
                    else
                    {
                        if (text == null || text.length == 0)
                        {
                            text = "&nbsp;";
                        }
                        else if (field.getOpt("dl",false))
                        {
                            var tmp = "";
                            var a = text.split("\n");

                            for (var i = 0; i < a.length; i++)
                            {
                                if (i > 0)
                                {
                                    tmp += "<br/>";
                                }

                                var s = a[i];

                                if (s.length > 0)
                                {
                                    tmp += " - " + a[i];
                                }
                            }

                            text = tmp;
                        }
                        else if (field.getOpt("nobr",false))
                        {
                            text = "<nobr>" + text + "</nobr>";
                        }

                        td.innerHTML = text;
                    }
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

    hold()
    {
        this._hold++;
    }

    release(force)
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

    clear()
    {
        this._list = [];
        this._map = {};
    }

    refresh()
    {
    }

    size()
    {
        if (this._table != null)
        {
            this._table.style.width = this._container.clientWidth + "px";
        }
    }

    sizeIn(wait)
    {
        var self = this;
        setInterval(function(){self.size()},wait);
    }

    sortFunc(a,b)
    {
        return(b[b._sort.field] - a[a._sort.field]);
    }

    deselectAll()
    {
        this._list.forEach((item) => {
            item.selected = false;
        });
    }

    select(key)
    {
        var numselected = 0;

        if (this._map.hasOwnProperty(key))
        {
            if (this.getOpt("multi_select",false) == false)
            {
                this.deselectAll();
                this._map[key].selected = true;
                numselected = 1;
            }
            else
            {
                this._map[key].selected = true;
                numselected = this.getNumSelectedItems();
            }
        }

        return(numselected);
    }

    deselect(key)
    {
        if (this._map.hasOwnProperty(key))
        {
            this._map[key].selected = false;
        }
    }

    clicked(e)
    {
        if (e.currentTarget.hasOwnProperty("context"))
        {
            var context = e.currentTarget["context"];
            if (tools.supports(this._delegate,"itemClicked"))
            {
                this._delegate.itemClicked(context.table,context.item._key,context.item,e.metaKey,e.shiftKey);
            }
        }
    }

    action(e)
    {
        if (e.currentTarget.hasOwnProperty("context"))
        {
            var context = e.currentTarget["context"];

            if (tools.supports(this._delegate,"action"))
            {
                var item = context.item;
                if (item != null)
                {
                    this._delegate.action(context.table,context.name,item._key,item);
                }
                else
                {
                    this._delegate.action(context.table,context.name);
                }
            }
        }
    }

    getSelectedItems()
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

    getNumSelectedItems()
    {
        var count = 0;

        this._list.forEach((item) => {
            if (item._selected)
            {
                count++;
            }
        });

        return(count);
    }

    getSelectedItem()
    {
        var items = this.getSelectedItems();
        return(items.length > 0 ? items[0] : null);
    }

    getSelectedKeys()
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

    drawCell(table,name,item,td)
    {
        td.innerHTML = "&nbsp;";
    }

    addClassTo(element,c)
    {
        var className = element.className;

        if (className.indexOf(" " + c) == -1)
        {
            className += (" " + c);
            element.className = className;
        }
    }

    removeClassFrom(element,c)
    {
        var className = element.className;

        if (className.indexOf(" " + c) != -1)
        {
            className = className.replace(" " + c,"");
            element.className = className;
        }
    }

    hideToolbar()
    {
    }

    sizeContent()
    {
        this.size();
    }
    /*
    toString()
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
}

export {SimpleTable};
