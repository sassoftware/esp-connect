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
    "../connect/tools"
], function(Options,tools)
{
    function
    Splitter()
    {
        this._div = document.createElement("div");
        this._div.className = "splitter";
        this._div.style.overflow = "hidden";

        this._resize = null;
        this._point = null;

        this._blank = new Image();
        this._blank.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

        this._minSize = {"width":100,"height":100};

        this._flags = new Object();

        this.clear();

        Object.defineProperty(this,"rows", {
            get() {
                var rows = [];
                this._rows.forEach((row) => {
                    if (row.isRow())
                    {
                        rows.push(row);
                    }
                });
                return(rows);
            }
        });

        Object.defineProperty(this,"numRows", {
            get() {
                var count = 0;
                this._rows.forEach((row) => {
                    if (row.isRow())
                    {
                        count++;
                    }
                });
                return(count);
            }
        });

        Object.defineProperty(this,"cells", {
            get() {
                return(this._cells);
            }
        });
    }

    Splitter.prototype.addRow =
    function()
    {
        if (this._rows.length > 0)
        {
            var divider = new SplitterDivider(this,{type:"vertical"});
            this._div.appendChild(divider.div());
            this._rows.push(divider);
        }

        var row = new SplitterRow(this,{type:"row"});

        this._div.appendChild(row.div());

        this._rows.push(row);

        this.setDefaultHeights();

        this.size();
    }

    Splitter.prototype.setDefaultHeights =
    function()
    {
        var height = this._div.clientHeight;

        if (height > 0)
        {
            var rows= this.rows;
            var h = parseInt(height / rows.length);
            rows.forEach((row) =>
            {
                row.div().style.height = h + "px";
            });
        }
    }

    Splitter.prototype.addCell =
    function(id,element,options)
    {
        if (this._cells.hasOwnProperty(id))
        {
            //throw("cell '" + id + "' already exists");
            return(this._cells[id]);
        }

        if (this._rows.length == 0)
        {
            this.addRow();
        }

        var row = this._rows[this._rows.length - 1];
        var cell = row.addCell(id,element,options);

        this._cells[id] = cell;

        return(cell);
    }

    Splitter.prototype.removeCell =
    function(id)
    {
        var cell = this.getCell(id);
        var code = false;

        if (cell != null && cell._row != null)
        {
            code = cell._row.removeCell(id);
        }

        if (code)
        {
            delete this._cells[id];

            var row = cell._row;

            if (row.numContainers == 0)
            {
                var index = -1;

                for (var i = 0; i < this._rows.length; i++)
                {
                    if (this._rows[i] == row)
                    {
                        index = i;
                        break;
                    }
                }

                if (index > 0)
                {
                    index--;
                    this._div.removeChild(this._rows[index].div());
                    this._rows.splice(index,1);
                }

                this._div.removeChild(this._rows[index].div());
                this._rows.splice(index,1);
            }

            this.size();
        }
    }

    Splitter.prototype.hasCell =
    function(id)
    {
        return(this._cells.hasOwnProperty(id));
    }

    Splitter.prototype.getCell =
    function(id)
    {
        return(this.hasCell(id) ? this._cells[id] : null);
    }

    Splitter.prototype.getCellSize =
    function(id)
    {
        var size = {width:0,height:0};
        var cell = this.getCell(id);

        if (cell != null)
        {
            size.width = cell._div.clientWidth;
            size.height = cell._div.clientHeight;
        }

        return(size);
    }

    Splitter.prototype.setCellWidth =
    function(id,width)
    {
        var    cell = this.getCell(id);

        if (cell != null)
        {
            if (cell.hasOwnProperty("_element"))
            {
                cell._div.style.width = width + "px";
                this.size();
            }
        }
    }

    Splitter.prototype.getRow =
    function(index)
    {
        var    counter = 0;

        for (var i = 0; i < this._rows.length; i++)
        {
            if (this._rows[i].isDivider())
            {
                continue;
            }

            if (counter == index)
            {
                return(this._rows[i]);
            }

            counter++;
        }

        return(null);
    }

    Splitter.prototype.setRowHeight =
    function(index,height)
    {
        var row = this.getRow(index);

        if (row != null)
        {
            row.div().style.height = height;
            this.size();
        }
    }

    Splitter.prototype.setRowHeightPercentage =
    function(index,percentage)
    {
        var    row = this.getRow(index);

        if (row != null)
        {
            var    height = parseInt(this._div.offsetHeight * (percentage / 100));
            row.div().style.height = height + "px";
            this.size();
        }
    }

    Splitter.prototype.attach =
    function(to)
    {
        to._splitter = this;
        to.appendChild(this._div);
        to.addEventListener("resize",function(){console.log("resize")});
        this.size();
    }

    Splitter.prototype.create =
    function()
    {
        for (var i = 0; i < this._rows.length; i++)
        {
            this._div.appendChild(this._rows[i].div());
        }

        this.size();
    }

    Splitter.prototype.clear =
    function()
    {
        this._div.innerHTML = "";
        this._rows = new Array();
        this._cells = new Object();
    }

    Splitter.prototype.size =
    function()
    {
        var container = this._div.parentNode;

        if (container == null)
        {
            return;
        }

        var numRows = this.numRows;

        if (numRows == 0)
        {
            return;
        }

        var containerBorders = tools.getBorders(container,true);
        var borders = tools.getBorders(this._div,true);
        var row;

        var diffX = this._div.clientWidth - container.clientWidth;
        var h = 0;
        var delta;
        var cell;
        var div;

        for (var i = 0; i < this._rows.length; i++)
        {
            h += this._rows[i].div().clientHeight;
        }

        var diffY = h - this._div.clientHeight;

        this._div.style.height = (container.offsetHeight - borders.vsize - containerBorders.vsize) + "px";

        var delta = parseInt(diffY / numRows);
        var y = this._div.offsetTop + borders.top;
        var div;

        for (var i = 0; i < this._rows.length; i++)
        {
            row = this._rows[i];
            div = row.div();
            div.style.left = (this._div.offsetLeft + borders.left) + "px";
            div.style.top = y + "px";
            div.style.width = (this._div.offsetWidth - borders.hsize) + "px";
            if (row.isRow())
            {
                if (i == (this._rows.length - 1))
                {
                    diffY = this._div.clientHeight - y;
                    div.style.height = diffY + "px";
                }
                else
                {
                    //div.style.height = (div.offsetHeight - delta) + "px";
                    div.style.height = (div.offsetHeight) + "px";
                }
            }
            y += div.offsetHeight;

            row.size();
        }

        this.sized();
    }

    Splitter.prototype.sized =
    function()
    {
    }

    Splitter.prototype.draw =
    function(name,value)
    {
        var    borders = tools.getBorders(this._div);
        var    y = this._div.offsetTop + borders.top;
        var    row;
        var    div;

        for (var i = 0; i < this._rows.length; i++)
        {
            row = this._rows[i];
            div = row.div();
            div.style.top = y + "px";
            y += div.offsetHeight;
            row.draw();
        }
    }

    Splitter.prototype.setFlag =
    function(name,value)
    {
        this._flags[name.toLowerCase()] = value;
    }

    Splitter.prototype.getFlag =
    function(name,dv)
    {
        var    value = dv;
        var    s = name.toLowerCase();
        if (this._flags.hasOwnProperty(s))
        {
            value = this._flags[name];
        }
        return(value);
    }

    Splitter.prototype.start =
    function(event)
    {
        for (var x in this._cells)
        {
            this._cells[x].div().style.border = "1px solid #c0c0c0";
            this._cells[x]._element.style.visibility = "hidden";
        }

        this._resize = event.target;
        this._point = {"x":event.clientX,"y":event.clientY};
        event.dataTransfer.setDragImage(this._blank,0,0);
        event.dataTransfer.effectAllowed = "move";
    }

    Splitter.prototype.over =
    function(event)
    {
        if (this._resize == null || this._point == null)
        {
            return;
        }

        event.preventDefault();

        var    point = {"x":event.clientX,"y":event.clientY};
        var    dx = point.x - this._point.x;
        var    dy = point.y - this._point.y;

        this._point = point;

        if (this._resize._type == "horizontal")
        {
            var    prev = this._resize.previousSibling;
            var    next = this._resize.nextSibling;
            prev.style.width = (prev.clientWidth + dx) + "px";
            next.style.width = (next.clientWidth - dx) + "px";
        }
        else if (this._resize._type == "vertical")
        {
            var    prev = this._resize.previousSibling;
            var    next = this._resize.nextSibling;
            var    prevHeight = prev.clientHeight + dy;
            var    nextHeight = next.clientHeight - dy;
            if (prevHeight > 16 && nextHeight > 16)
            {
                prev.style.height = prevHeight + "px";
                next.style.height = nextHeight + "px";
            }
        }

        for (var i = 0; i < this._rows.length; i++)
        {
            this._rows[i].size();
        }

        this.draw();
        /*
        this.size();
        */
    }

    Splitter.prototype.drop =
    function(event)
    {
        this._resize = null;
        this._point = null;

        var    cell;

        for (var x in this._cells)
        {
            cell = this._cells[x];
            if (cell.div().offsetWidth > this._minSize.width && cell.div().offsetHeight > this._minSize.height)
            {
                cell.div().style.border = "0";
                cell._element.style.visibility = "visible";
            }
        }

        this.size();
    }

    function
    SplitterCell(splitter,options)
    {
        Options.call(this,options);

        Object.defineProperty(this,"type", {
            get() {
                return(this.getOpt("type",""));
            }
        });

        Object.defineProperty(this,"id", {
            get() {
                return(this._id);
            }
        });

        this._splitter = splitter;
        this._id = "";
        this._div = document.createElement("div");
        this._div._splitter = this._splitter;
        this._div._type = this.type;
        this._div.style.position = "absolute";
    }

    SplitterCell.prototype = Object.create(Options.prototype);
    SplitterCell.prototype.constructor = SplitterCell;

    SplitterCell.prototype.size =
    function()
    {
    }

    SplitterCell.prototype.draw =
    function()
    {
    }

    SplitterCell.prototype.isDivider =
    function()
    {
        return(this.type == "horizontal" || this.type == "vertical");
    }

    SplitterCell.prototype.isContainer =
    function()
    {
        return(this.type == "container");
    }

    SplitterCell.prototype.isRow =
    function()
    {
        return(this.type == "row");
    }

    SplitterCell.prototype.div =
    function()
    {
        return(this._div);
    }

    function
    SplitterRow(splitter,options)
    {
        SplitterCell.call(this,splitter,options);
        this._div.className = "splitterRow";
        this._cells = new Array();
        this._numCells = 0;

        Object.defineProperty(this,"containers", {
            get() {
                var containers = [];
                this._cells.forEach((cell) => {
                    if (cell.type == "container")
                    {
                        containers.push(cell);
                    }
                });
                return(containers);
            }
        });
 
        Object.defineProperty(this,"numContainers", {
            get() {
                var count = 0;
                this._cells.forEach((cell) => {
                    if (cell.type == "container")
                    {
                        count++;
                    }
                });
                return(count);
            }
        });
    }

    SplitterRow.prototype = Object.create(SplitterCell.prototype);
    SplitterRow.prototype.constructor = SplitterRow;

    SplitterRow.prototype.addCell =
    function(id,element,options)
    {
        if (element == null)
        {
            throw("you must supply an element for the splitter cell");
        }

        if (element.style.display == "none")
        {
            element.style.display = "block";
        }

        var cell;

        if (this._cells.length > 0)
        {
            cell = new SplitterDivider(this._splitter,{type:"horizontal"});
            this._div.appendChild(cell.div());
            this._cells.push(cell);
        }

        if (options == null)
        {
            options = {};
        }

        options.type = "container";

        cell = new SplitterContainer(id,element,this,options);
        this._div.appendChild(cell.div());
        this._cells.push(cell);
        this._numCells++;

        this.setDefaultWidths();

        this.size();

        return(cell);
    }

    SplitterRow.prototype.removeCell =
    function(id)
    {
        var index = -1;

        for (var i = 0; i < this._cells.length; i++)
        {
            if (this._cells[i].id == id)
            {
                index = i;
                break;
            }
        }

        if (index >= 0)
        {
            this._div.removeChild(this._cells[index].div());
            this._cells.splice(index,1);

            if (index == 0)
            {
                if (this._cells.length > 0)
                {
                    this._div.removeChild(this._cells[index].div());
                    this._cells.splice(index,1);
                }
            }
            else
            {
                index--;
                this._div.removeChild(this._cells[index].div());
                this._cells.splice(index,1);
            }

            this.setDefaultWidths();
        }

        return(index >= 0);
    }

    SplitterRow.prototype.setDefaultWidths =
    function()
    {
        var width = this._div.clientWidth;

        if (width > 0)
        {
            var containers = this.containers;
            var w = parseInt(width / containers.length);
            containers.forEach((cell) =>
            {
                cell.div().style.width = w + "px";
            });
        }
    }

    SplitterRow.prototype.size =
    function()
    {
        if (this._numCells == 0)
        {
            return;
        }

        var    w = 0;
        var    div;

        this._cells.forEach((cell) => {
            div = cell.div();
            w += div.clientWidth;
        });

        var    diffX = w - this._div.clientWidth;
        var    delta = parseInt(diffX / this._numCells);

        var    x = 0;

        var rowBorders = tools.getBorders(this._div);

        for (var i = 0; i < this._cells.length; i++)
        {
            cell = this._cells[i];

            div = cell.div();
            div.style.left = x + "px";
            div.style.height = this._div.clientHeight + "px";

            if (cell.isContainer())
            {
                var borders = tools.getBorders(cell._element,true);
                var containerBorders = tools.getBorders(div,true);

                if (i == (this._cells.length - 1))
                {
                    diffX = this._div.clientWidth - x;
                    div.style.width = diffX + "px";
                }
                else
                {
                    div.style.width = (div.clientWidth - delta) + "px";
                }

                cell._element.style.width = (div.offsetWidth - borders.hsize - containerBorders.hsize) + "px";
                cell._element.style.height = (div.offsetHeight - borders.vsize - containerBorders.vsize) + "px";
                cell.size();
            }
            x += div.clientWidth;
        }
    }

    SplitterRow.prototype.draw =
    function()
    {
        var    x = 0;
        var    cell;
        var    div;

        for (var i = 0; i < this._cells.length; i++)
        {
            cell = this._cells[i];
            div = cell.div();
            div.style.left = x + "px";
            if (cell.isContainer())
            {
                var    borders = tools.getBorders(cell._element);
                cell._element.style.width = (div.offsetWidth - borders.hsize) + "px";
                cell._element.style.height = (div.offsetHeight - borders.vsize) + "px";
            }
            x += div.clientWidth;
        }
    }

    SplitterRow.prototype.cells =
    function()
    {
        return(this._cells);
    }

    function
    SplitterContainer(id,element,row,options)
    {
        SplitterCell.call(this,row._splitter,options);
        this._id = id;
        this._row = row;
        this._div._splitter = this._row._splitter;
        this._div.className = "splitterContainer";
        this._element = element;
        this._div.appendChild(this._element);

        this._div.addEventListener("dragstart",splitterSupport.dragStart);
        this._div.addEventListener("dragover",splitterSupport.dragOver);
        this._div.addEventListener("drop",splitterSupport.drop);
    }

    SplitterContainer.prototype = Object.create(SplitterCell.prototype);
    SplitterContainer.prototype.constructor = SplitterContainer;

    SplitterContainer.prototype.isSplitter =
    function()
    {
        return(this._element.hasOwnProperty("_splitter"));
    }

    SplitterContainer.prototype.size =
    function()
    {
        if (this.isSplitter())
        {
            this._element._splitter.size();
        }
    }

    SplitterContainer.prototype.draw =
    function()
    {
        if (this.isSplitter())
        {
            this._element._splitter.draw();
        }
    }

    function
    SplitterDivider(splitter,orientation)
    {
        SplitterCell.call(this,splitter,orientation);

        this._div.draggable = true;

        this._div.addEventListener("dragstart",splitterSupport.dragStart);
        this._div.addEventListener("dragover",splitterSupport.dragOver);
        this._div.addEventListener("drop",splitterSupport.drop);
        this._div.style.display = "flex";
        this._div.style.textAlign = "center";

        var    drag = document.createElement("span");
        drag._splitter = this._splitter;
        drag._type = this.type;
        drag.style.margin = "auto";

        if (this.type == "vertical")
        {
            this._div.className = "vsplitter";
            drag.style.cursor = "ns-resize";
            drag.innerHTML = "&#xf2c4;";
        }
        else
        {
            this._div.className = "hsplitter";
            drag.style.cursor = "ew-resize";
            drag.innerHTML = "&#xf2c5;";
        }

        this._div.appendChild(drag);
    }

    SplitterDivider.prototype = Object.create(SplitterCell.prototype);
    SplitterDivider.prototype.constructor = SplitterDivider;

    var    splitterSupport =
    {
        findSplitter:function(element)
        {
            var    e = element;

            while (e != null)
            {
                if (e.hasOwnProperty("_splitter"))
                {
                    return(e._splitter);
                }

                e = e.parentNode;
            }

            return(null);
        },

        dragStart:function(event)
        {
            if (event.target.hasOwnProperty("_type") == false)
            {
                return(true);
            }

            if (event.target._type == "horizontal" || event.target._type == "vertical")
            {
                var    splitter = splitterSupport.findSplitter(event.target);

                event.dataTransfer.setData("text/plain","");

                if (splitter != null)
                {
                    splitter.start(event);
                }
                return(false);
            }
            else
            {
                return(true);
            }
        },

        dragOver:function(event)
        {
            var    splitter = splitterSupport.findSplitter(event.target);

            if (splitter != null)
            {
                splitter.over(event);
            }
        },

        drop:function(event)
        {
            var splitter = splitterSupport.findSplitter(event.target);

            if (splitter != null)
            {
                splitter.drop(event);
            }
        },

        create:function()
        {
            return(new Splitter());
        }
    };

    return(splitterSupport);
});