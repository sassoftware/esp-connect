/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {tools} from "../connect/tools.js";

class Tabs
{
    constructor(orientation)
    {
        this._orientation = (orientation != null) ? orientation : "horizontal";

        this._table = document.createElement("table");
        this._table.className = "tabs";
        this._table.cellSpacing = 0;
        this._table.cellPadding = 0;
        this._table.border = "1";

        this._body = document.createElement("tbody");
        this._table.appendChild(this._body);

        this.getTabs = function() {return(this._buttons)};

        if (this._orientation == "vertical")
        {
            this._afterRow = document.createElement("tr");
        }

        this._beforeRow = null;
        this._before = null;

        this._afterRow = null;
        this._after = null;

        this.clear();

        Object.defineProperty(this,"container", {
            get() {
                return(this._container);
            }
        });
    }

    setButtonClass(buttonClass)
    {
        this._buttonClass = buttonClass;
    }

    addButton(object)
    {
        var    button = new Object();
        button._tabs = this;
        button._index = this._buttons.length;

        for (var name in object)
        {
            button[name] = object[name];
        }

        button._td = document.createElement("td");
        button._td.className = "tabs";
        button._td.style.verticalAlign = "middle";
        button._td._button = button;

        button._button = document.createElement("button");
        button._button.addEventListener("click",__tabs.select);
        button._button.style.background = "transparent";
        button._button.style.width = "100%";
        button._button.style.textAlign = "left";
        button._button.style.borderWidth = 0;

        var    nobr = document.createElement("nobr");
        button._td.appendChild(nobr);

        if (button.hasOwnProperty("image"))
        {
            button._button.style.width = "80%";

            var    image = document.createElement("img");
            image.src = button.image;
            image.style.align = "middle";
            image.style.verticalAlign = "middle";
            image.style.cursor = "none";
            nobr.appendChild(image);
        }

        if (button.hasOwnProperty("text"))
        {
            //button._button.disabled = true;
            button._button.innerText = button.text;
        }

        button.div.style.position = "absolute";
        button.div.style.zIndex = 99;

        nobr.appendChild(button._button);

        if (button.hasOwnProperty("tooltip"))
        {
            button._td.title = button.tooltip;
        }

        button.getIndex = function() {return(this._index);};
        button.setText = function(value) {this._button.innerText = value;};

        this._buttons.push(button);

        if (this._orientation == "vertical")
        {
            var    tr = document.createElement("tr");
            this._body.insertBefore(tr,this._afterRow);
            tr.appendChild(button._td);
        }
        else
        {
            this._tr.insertBefore(button._td,this._after);
        }

        return(button);
    }

    size()
    {
        var p = this.container.parentNode;

        if (p != null)
        {
            var parentBorders = tools.getBorders(this.container,true);
            var offset = tools.getOffset(p);
            var size = {width:p.offsetWidth,height:p.offsetHeight};
            var borders;

            this._buttons.forEach((button) =>
            {
                borders = tools.getBorders(button.div,true);
                button.div.style.top = (this.container.offsetHeight + offset._parentY - 1) + "px";
                button.div.style.width = (size.width - borders.hsize) + "px";
                button.div.style.height = (size.height - this.container.offsetHeight - borders.vsize + 2) + "px";
            });
        }
    }

    removeButton(o)
    {
        var    button = this.getButton(o);

        if (button != null)
        {
            var    index = button._index;
            button._td.parentNode.removeChild(button._td);
            this._buttons.splice(index,1);
        }
    }

    setEnabled(o,value)
    {
        var    button = this.getButton(o);

        if (button != null)
        {
            button._button.disabled = (value == false);
        }
    }

    getButton(o,operator)
    {
        var    button = null;

        if (typeof(o) == "number")
        {
            if (this._buttons.length > o)
            {
                button = this._buttons[o];
            }
        }
        else
        {
            var    or = (operator == null || operator == "or");
            var    match;
            var    name;
            var    b;

            for (var i = 0; i < this._buttons.length; i++)
            {
                b = this._buttons[i];

                match = or ? false : true;

                for (name in o)
                {
                    if (b[name] == o[name])
                    {
                        if (or)
                        {
                            match = true;
                            break;
                        }
                    }
                    else if (or == false)
                    {
                        match = false;
                        break;
                    }
                }

                if (match)
                {
                    button = b;
                    break;
                }
            }
        }

        return(button);
    }

    select(o)
    {
        var    match = null;
        var    button;

        for (var i = 0; i < this._buttons.length; i++)
        {
            button = this._buttons[i];

            match = button;

            for (var name in o)
            {
                if (o[name] != button[name])
                {
                    match = null;
                    break;
                }
            }

            if (match)
            {
                break;
            }
        }

        if (match != null)
        {
            this.selectIndex(match._index);
            this.selected();
        }
    }

    selectIndex(index)
    {
        this._selectedIndex = -1;

        if (this._after != null)
        {
            this._after.className = this._after.className.replace(" tabAfterSelected","");
        }

        var    selected = false;
        var    className;
        var    i;

        for (i = 0; i < this._buttons.length; i++)
        {
            className = "tabs";

            if (this._buttonClass != null)
            {
                className += " " + this._buttonClass;
            }

            if (i == index)
            {
                className += " tabSelected";
                this._selectedIndex = i;

                if (i > 0)
                {
                    this._buttons[i - 1]._td.className = this._buttons[i - 1]._td.className + " tabBeforeSelected";
                }

                selected = true;
            }
            else if (selected)
            {
                className += " tabAfterSelected";
                selected = false;
            }

            if (i == 0)
            {
                className += " tabFirst";
            }

            if (i == (this._buttons.length - 1))
            {
                className += " tabLast";

                if (i == index)
                {
                    if (this._after != null)
                    {
                        this._after.className += " tabAfterSelected";
                    }
                }
            }

            this._buttons[i]._td.className = className;
        }
    }

    selectFirst()
    {
        if (this._buttons.length > 0)
        {
            this.selectIndex(0);
            this.selected();
        }
    }

    selectLast()
    {
        if (this._buttons.length > 0)
        {
            this.selectIndex(this._buttons.length - 1);
            this.selected();
        }
    }

    getSelected()
    {
        return(this._buttons[this._selectedIndex]);
    }

    getSelectedIndex()
    {
        return(this._selectedIndex);
    }

    attach(container)
    {
        this._container = (typeof(container) == "string") ? document.getElementById(container) : container;
        if (this._container != null)
        {
            this._container.appendChild(this._table);
            this._container.style.position = "absolute";
            this._container.style.zIndex = 100;
        }
    }

    selected(index)
    {
    }

    selectDiv()
    {
        var tabs = this.getTabs();
        var selected = this.getSelected();
        var index = -1;
        var tab;

        for (var i = 0; i < tabs.length; i++)
        {
            tab = tabs[i];

            if (tab.hasOwnProperty("key") == false ||
                tab.hasOwnProperty("div") == false)
            {
                continue;
            }

            if (tab.key == selected.key)
            {
                tab.div.style.display = "block";
                index = i;
            }
            else
            {
                tab.div.style.display = "none";
            }
        }

        return(index);
    }

    clear()
    {
        while (this._table.rows.length > 0)
        {
            this._table.deleteRow(this._table.rows[0]);
        }

        if (this._orientation == "vertical")
        {
            if (this._before != null)
            {
                this._body.appendChild(this._beforeRow);
                this._beforeRow.appendChild(this._before);
            }

            if (this._after != null)
            {
                this._body.appendChild(this._afterRow);
                this._afterRow.appendChild(this._after);
            }
        }
        else
        {
            this._tr = document.createElement("tr");
            this._body.appendChild(this._tr);

            if (this._before != null)
            {
                this._tr.appendChild(this._before);
            }

            if (this._after != null)
            {
                this._tr.appendChild(this._after);
            }
        }

        this._buttons = new Array();

        this._selectedIndex = -1;
    }

    getBefore()
    {
        if (this._before == null)
        {
            this._before = document.createElement("td");
            this._before.className = "tabBefore";

            if (this._orientation == "vertical")
            {
                this._beforeRow = document.createElement("tr");
                this._beforeRow.appendChild(this._before);
                this._body.insertBefore(this._beforeRow,this._body.firstChild);
            }
            else
            {
                this._tr.insertBefore(this._before,this._tr.firstChild);
            }
        }

        return(this._before);
    }

    getAfter()
    {
        if (this._after == null)
        {
            this._after = document.createElement("td");
            this._after.className = "tabAfter";

            if (this._orientation == "vertical")
            {
                this._afterRow = document.createElement("tr");
                this._afterRow.appendChild(this._after);
                this._body.appendChild(this._afterRow);
            }
            else
            {
                this._tr.appendChild(this._after);
            }
        }

        return(this._after);
    }
}

var    tabSupport =
{
    climb:function(element,tag,inclusive)
    {
        var    e = (inclusive) ? element : element.parentNode;

        while (e != null)
        {
            if (e.tagName == tag)
            {
                return(e);
            }

            e = e.parentNode;
        }
    }
};

var    __tabs =
{
    select:function(e)
    {
        var    source = e.hasOwnProperty("srcElement") ? e.srcElement : e.target;
        var    td = tabSupport.climb(source,"TD",true);

        while (td != null && td.hasOwnProperty("_button") == false)
        {
            td = tabSupport.climb(td,"TD",false);
        }

        if (td != null && td.hasOwnProperty("_button"))
        {
            var    button = td._button;
            var    tabs = button._tabs;
            tabs.selectIndex(button._index);
            tabs.selected();
        }
    }
};

export {Tabs};
