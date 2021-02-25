/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";
import {uitools} from "./uitools.js";

class Dialog extends Options
{
    static _modals = null;
    static _cover = null;
    static _obscureCount = 0;
    static _dialogInset = 0;
    static _opts = new Options();

    constructor(options)
    {
		super(options);

        if (Dialog._modals == null)
        {
            Dialog._modals = [];

            Dialog._cover = document.createElement("div");
            Dialog._cover.className = "obscureCover";
            Dialog._cover.style.width = "100%";
            Dialog._cover.style.height = "100%";
            Dialog._cover.style.position = "absolute";
            Dialog._cover.style.left = "0";
            Dialog._cover.style.top = "0";
        }

        this._div = null;
        this._header = null;
        this._content = null;
        this._footer = null;

        this._form = null;
        this._zFactor = 10000;
        this._delegate = null;

        Object.defineProperty(this,"content", {
            get() {
                return(this._content);
            },
            set(value) {
                value.style.position = "absolute";
                this._div.replaceChild(value,this._content);
                this._content = value;
                this.layout();
            }
        });

        Object.defineProperty(this,"title", {
            get() {
                return(this.getOpt("title",""));
            },
            set(value) {
                this.setOpt("title",value);
                this._title.innerHTML = value;
            }
        });

        Object.defineProperty(this,"htmlcontent", {
            get() {
                return(this.getOpt("htmlcontent",""));
            },
            set(value) {
                this.setOpt("htmlcontent",value);
                this._content.innerHTML = value;
            }
        });

        if (this.hasOpt("div"))
        {
            var value = this.getOpt("div");
            this._div = (typeof(value) == "string") ? document.getElementById(value) : value;
        }
        else
        {
            this.init();
        }
    }

    init()
    {
        this._div = document.createElement("div");
        this._div.style.margin = "4px";
        this._div.style.width = this.getOpt("width","50%");
        this._div.style.height = this.getOpt("height","auto");
        this._div.className = "dialog";

        this._header = document.createElement("div");
        this._header.className = "dialogHeader";
        this._header.style.position = "absolute";
        this._div.appendChild(this._header);

        this._title = document.createElement("div");
        this._title.className = "dialogTitle";
        this._header.appendChild(this._title);

        this._content = document.createElement("div");
        this._content.style.position = "absolute";
        this._content.style.overflow = "auto";
        this._content.className = "dialogContent";
        this._div.appendChild(this._content);

        this._footer = document.createElement("div");
        this._footer.style.position = "absolute";
        this._footer.className = "dialogButtons";
        this._footer.style.padding = "5px";
        this._footer.style.paddingRight = "10px";
        this._footer.style.paddingBottom = 0;
        this._div.appendChild(this._footer);

        if (this.hasOpt("title"))
        {
            this._title.innerHTML = this.getOpt("title");
        }

        if (this.hasOpt("form"))
        {
            this.createForm(this.getOpt("form"));
        }
        else if (this.hasOpt("content"))
        {
            this._content.innerHTML = this.getOpt("content");
        }

        this.setButtons();
    }

    layout()
    {
        if (this._content == null)
        {
            return;
        }

        var margins = uitools.getMargins(this._div);
        var	margin = 0;

        if (margins.hasOwnProperty("left"))
        {
            margin = margins.left * 2;
        }

        var	width = this._div.clientWidth - (margin * 2);
        var	height = this._div.clientHeight - (margin * 2);

        var headerSize = uitools.getSize(this._header);
        var contentSize = uitools.getSize(this._content);
        var footerSize = uitools.getSize(this._footer);

        if (height <= 0 && this._div.style.height == "auto")
        {
            var tmp = headerSize.height + contentSize.height + footerSize.height + 50;
            this._div.style.height = tmp + "px";
            height = this._div.clientHeight - (margin * 2);
            this._div.style.height == "auto";
        }

        var	top = margin;

        var	headerBorders = uitools.getBorders(this._header,true);
        this._header.style.left = margin + "px";
        this._header.style.top = margin + "px";
        this._header.style.width = (width - headerBorders.hsize - margin) + "px";
        top = this._header.offsetTop + this._header.offsetHeight;

        var	contentBorders = uitools.getBorders(this._content,true);

        this._content.style.left = margin + "px";
        this._content.style.top = top + "px";
        this._content.style.width = (width - contentBorders.hsize - margin) + "px";

        var h = height - this._content.offsetTop - contentBorders.vsize;

        var	footerBorders = uitools.getBorders(this._footer,true);

        this._footer.style.left = margin + "px";
        this._footer.style.top = (height - this._footer.offsetHeight) + "px";
        this._footer.style.width = (width - footerBorders.hsize - margin) + "px";

        h -= this._footer.offsetHeight;

        this._content.style.height = h + "px";
    }

    show()
    {
        this._div.style.display = "block";
        document.body.appendChild(this._div);
    }

    hide()
    {
        this._div.style.display = "none";
        document.body.removeChild(this._div);
    }

    push(options)
    {
        this.setOpts(options);

        var xalign = Dialog._opts.getOpt("xalign","center");
        var yalign = Dialog._opts.getOpt("yalign","center");

        this._div.style.display = "block";
        this._div.style.position = "absolute";

        var	d = window.document;
        var	bodyWidth = d.body.offsetWidth;
        var	bodyHeight = d.body.offsetHeight;
        var	width = this._div.offsetWidth;
        var	height = this._div.offsetHeight;

        if (xalign == "left")
        {
            this._div.style.left = Dialog._dialogInset + "px";
        }
        else if (yalign == "right")
        {
            this._div.style.left = (bodyWidth - width - Dialog._dialogInset) + "px";
        }
        else
        {
            this._div.style.left = parseInt((bodyWidth / 2) - (width / 2)) + "px";
        }

        if (yalign == "top")
        {
            this._div.style.top = Dialog._dialogInset + "px";
        }
        else if (yalign == "bottom")
        {
            this._div.style.top = (bodyHeight - height - Dialog._dialogInset) + "px";
        }
        else
        {
            this._div.style.top = parseInt((bodyHeight / 2) - (height / 2)) + "px";
        }

        d.body.appendChild(this._div);

        Dialog._modals.push(this);

        this._div.style.zIndex = this._zFactor + Dialog._modals.length;

        Dialog.obscure(this);

        this.layout();
    }

    pop()
    {
        if (Dialog._modals.length == 0)
        {
            return;
        }

        var	current = Dialog._modals[Dialog._modals.length - 1];

        if (current != this)
        {
            return;
        }

        this._div.style.display = "none";

        Dialog._modals.pop();

        if (Dialog._modals.length == 0)
        {
            Dialog.unobscure(true);
        }
        else
        {
            current = Dialog._modals[Dialog._modals.length - 1];
            current._div.style.display = "block";
            current._div.style.zIndex = current._zFactor + Dialog._modals.length;
            Dialog.obscure(current);
        }
    }

    setButtons()
    {
        const   style = this.getOpt("buttons","ok_cancel");
        var     buttons = null;

        if (style == "ok_cancel")
        {
            buttons = this.getOkCancel();
        }
        else if (style == "done")
        {
            buttons = this.getDone();
        }

        if (buttons != null)
        {
            this._footer.innerHTML = "";
            this._footer.appendChild(buttons);
        }
    }

    getOkCancel()
    {
        var buttons = document.createElement("table");
        var tr = document.createElement("tr");
        var button;
        var span;
        var td;

        const   self = this;

        buttons.style.width = "100%";
        buttons.appendChild(tr);

        tr.appendChild(td = document.createElement("td"));
        td.className = "dialogButton";

        td.appendChild(span = document.createElement("span"));
        span.appendChild(button = document.createElement("button"));
        button.innerText = "Ok";
        button.addEventListener("click",function(){self.ok()});

        td.appendChild(span = document.createElement("span"));
        span.appendChild(button = document.createElement("button"));
        button.innerText = "Cancel";
        button.addEventListener("click",function(){self.cancel()});

        this._footer.innerHTML = "";
        this._footer.appendChild(buttons);
    }

    getDone()
    {
        var buttons = document.createElement("table");
        var tr = document.createElement("tr");
        var button;
        var span;
        var td;

        const   self = this;

        buttons.style.width = "100%";
        buttons.appendChild(tr);

        tr.appendChild(td = document.createElement("td"));
        td.className = "dialogButton";

        td.appendChild(span = document.createElement("span"));
        span.appendChild(button = document.createElement("button"));
        button.innerText = "Done";
        button.addEventListener("click",function(){self.done()});
        return(buttons);
    }

    createForm(values)
    {
        this._form = new Form(this,values);
        this._content.innerHTML = "";
        this._content.appendChild(this._form.table);

    }

    getData()
    {
        return((this._form != null) ? this._form.data : null);
    }

    getValue(name,dv)
    {
        return((this._form != null) ? this._form.getValue(name,dv) : null);
    }

    getControl(name)
    {
        return((this._form != null) ? this._form.getControl(name) : null);
    }

    ok()
    {
        const   delegate = this.getOpt("delegate");

        if (tools.supports(delegate,"ok"))
        {
            if (delegate.ok(this))
            {
                this.pop();
            }
        }
        else
        {
            this.pop();
        }
    }

    cancel()
    {
        const   delegate = this.getOpt("delegate");

        if (tools.supports(delegate,"cancel"))
        {
            if (delegate.cancel(this))
            {
                this.pop();
            }
        }
        else
        {
            this.pop();
        }
    }

    done()
    {
        const   delegate = this.getOpt("delegate");

        if (tools.supports(delegate,"done"))
        {
            if (delegate.done(this))
            {
                this.pop();
            }
        }
        else
        {
            this.pop();
        }
    }

    static setOptions(options)
    {
        Dialog._opts.setOpts(options);
    }

    static obscure(dialog)
    {
        if (Dialog._cover != null)
        {
            Dialog._cover.style.display = "block";
            Dialog._cover.style.zIndex = dialog._zFactor + Dialog._modals.length - 1;
            document.body.appendChild(Dialog._cover);
        }

        Dialog._obscureCount++;

        Dialog.placeModals();
    }

    static unobscure(force)
    {
        if (force)
        {
            Dialog._obscureCount = 0;
        }
        else
        {
            Dialog._obscureCount--;
        }

        if (Dialog._obscureCount == 0)
        {
            Dialog._cover.style.display = "none";
        }

        Dialog.placeModals();
    }

    static placeModals()
    {
        if (Dialog._modals == null || Dialog._modals.length == 0)
        {
            return;
        }

        var	d = window.document;
        var	bodyWidth = d.body.offsetWidth;
        var	bodyHeight = d.body.offsetHeight;
        var xalign;
        var yalign;
        var	element;
        var borders;
        var	width;
        var	height;
        var	x;
        var	y;

        Dialog._modals.forEach((dialog) => {

            dialog.layout();

            width = dialog._div.offsetWidth;
            height = dialog._div.offsetHeight;

            xalign = Dialog._opts.getOpt("xalign","center");
            yalign = Dialog._opts.getOpt("yalign","center");

            if (xalign == "left")
            {
                dialog._div.style.left = Dialog._dialogInset + "px";
            }
            else if (yalign == "right")
            {
                dialog._div.style.left = (bodyWidth - width - Dialog._dialogInset) + "px";
            }
            else
            {
                dialog._div.style.left = parseInt((bodyWidth / 2) - (width / 2)) + "px";
            }

            if (yalign == "top")
            {
                dialog._div.style.top = Dialog._dialogInset + "px";
            }
            else if (yalign == "bottom")
            {
                dialog._div.style.top = (bodyHeight - height - Dialog._dialogInset) + "px";
            }
            else
            {
                dialog._div.style.top = parseInt((bodyHeight / 2) - (height / 2)) + "px";
            }
        });

        Dialog._cover.style.width = bodyWidth + "px";
        Dialog._cover.style.height = bodyHeight + "px";
    }

    static clearModals()
    {
        if (Dialog._modals != null)
        {
            for (var i = 0; i < Dialog._modals.length; i++)
            {
                Dialog._modals[i]._div.style.display = "none";
            }

            Dialog._modals = new Array();

            Dialog.unobscure(true);
        }
    }
}

class Form extends Options
{
    constructor(dialog,values,options)
    {
		super(options);

        this._dialog = dialog;
        this._table = null;
        this._opts = [];
        this._optsmap = {};

        Object.defineProperty(this,"table", {
            get() {
                return(this._table);
            }
        });

        Object.defineProperty(this,"data", {
            get() {
                var data = {};

                this._opts.forEach((opts) => {
                    if (opts.hasOpt("control"))
                    {
                        data[opts.getOpt("name")] = opts.getOpt("control").value;
                    }
                });

                return(data);
            }
        });

        this.create(values);
    }

    create(values)
    {
        this._values = values;
        this._opts = [];
        this._optsmap = {};
        this._table = document.createElement("table");
        this._table.style.width = "80%";
        this._table.style.margin = "auto";

        if (this._values == null)
        {
            return;
        }

        var tr;
        var td;

        values.forEach((o) => {
            var opts = new Options(o);
            var id = opts.getOpt("id",tools.guid());
            var name = opts.getOpt("name","");
            var value = opts.getOpt("value","");
            var label = opts.getOpt("label",name);
            var classname = opts.getOpt("class","dialogValue");
            var type = opts.getOpt("type","input");
            var style = opts.getOpt("style");

            this._table.appendChild(tr = document.createElement("tr"));
            tr.appendChild(td = document.createElement("td"));
            td.className = "dialogLabel";
            td.innerHTML = label;

            this._table.appendChild(tr = document.createElement("tr"));
            tr.appendChild(td = document.createElement("td"));
            td.className = classname;

            var control = null;

            if (type == "select")
            {
                control = document.createElement("select");

                if (opts.hasOpt("options"))
                {
                    var tmp = opts.getOpt("options");

                    tmp.forEach((opt) => {
                        var n = opt.name;
                        var v = opt.hasOwnProperty("value") ? opt.value : name;
                        var option = document.createElement("option");
                        option.value = v;
                        option.appendChild(document.createTextNode(n));
                        if (n == value || v == value)
                        {
                            option.selected = true;
                        }
                        control.add(option);
                    });
                }
            }
            else if (type == "textarea")
            {
                control = document.createElement("textarea");
            }
            else if (type == "code")
            {
                control = document.createElement("pre");
                control.style.overflow = "auto";

                control.id = id;
                control.innerText = value;

                if (style != null)
                {
                    control.style = style;
                }

                td.appendChild(control);

                control = null;
            }
            else
            {
                control = document.createElement("input");
                control.type = opts.getOpt("type","text");
            }

            if (control != null)
            {
                control.dialog = this._dialog;

                control.id = id;

                if (type != "select")
                {
                    control.value = value;
                }

                if (style != null)
                {
                    control.style = style;
                }

                if (opts.hasOpt("onchange"))
                {
                    control.addEventListener("change",opts.getOpt("onchange"));
                }

                td.appendChild(control);

                opts.setOpt("control",control);
            }

            this._opts.push(opts);
            this._optsmap[name] = opts;
        });
    }

    getValue(name,dv)
    {
        var value = (dv != null) ? dv : null;
        var control = this.getControl(name);

        if (control != null)
        {
            value = control.value;
        }

        return(value);
    }

    getControl(name)
    {
        var control = null;

        if (this._optsmap.hasOwnProperty(name))
        {
            var opts = this._optsmap[name];
            control = opts.getOpt("control");
        }

        return(control);
    }
}

var	_api =
{
    showDialog:function(options)
    {
        var dialog = new Dialog(options);
        dialog.push();
        return(dialog);
    },

    showCodeDialog:function(options)
    {
        options.buttons = "done";
        var dialog = new Dialog(options);
        var pre = document.createElement("pre");
        pre.style.width = "100%";
        pre.style.height = "100%";
        pre.className = "dialogCode";
        pre.innerText = dialog.getOpt("code");
        pre.style.margin = "auto";
        dialog._div.style.width = "80%";
        dialog._div.style.height = "80%";
        dialog.content = pre;
        dialog.push();
        return(dialog);
    },

    showDivDialog:function(div,options)
    {
        options.buttons = "done";
        var dialog = new Dialog(options);
        div.className = "dialogCode";
        dialog._div.style.width = "80%";
        dialog._div.style.height = "80%";
        dialog.content = div;
        dialog.push();
        return(dialog);
    },

    showFrameDialog:function(options)
    {
        options.buttons = "done";
        var frame = document.createElement("iframe");
        frame.style.width = "100%";
        frame.style.height = "100%";
        frame.className = "dialogCode";
        var dialog = new Dialog(options);
        frame.src = dialog.getOpt("url","");
        frame.className = "dialogFrame";
        dialog._div.style.width = "80%";
        dialog._div.style.height = "80%";
        dialog.content = frame;
        dialog.push();
        return(dialog);
    },

    pushModal:function(modal,options)
    {
        if (options == null)
        {
            options = {};
        }
        options["div"] = modal;
        var dialog = new Dialog(options);
        dialog.push();
        return(dialog);
    },

    popModal:function(modal)
    {
        if (Dialog._modals.length == 0)
        {
            return;
        }

        var	element = (typeof(modal) == "string") ? document.getElementById(modal) : modal;

        if (element == null)
        {
            return;
        }

        var	current = Dialog._modals[Dialog._modals.length - 1];

        if (current._div != element)
        {
            return;
        }

        current.pop();
    },

    popup:function(options)
    {
        var dialog = this.create(options);
        dialog.show();
        return(dialog);
    },

    create:function(options)
    {
        var dialog = new Dialog(options);
        return(dialog);
    },

    placeModals:function()
    {
        Dialog.placeModals();
    },

    clearModals:function()
    {
        Dialog.clearModals();
    }
}

export {_api as dialogs};
