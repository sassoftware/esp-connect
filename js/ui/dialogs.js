import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";
import {uitools} from "./uitools.js";
import {SimpleTable} from "./simpletable.js";

class Dialog extends Options
{
    constructor(options)
    {
		super(options);

        if (_api._modals == null)
        {
            _api._modals = [];

            _api._cover = document.createElement("div");
            _api._cover.className = "obscure";
            _api._cover.style.position = "absolute";
        }

        this._div = null;
        this._header = null;
        this._content = null;
        this._footer = null;

        this._form = null;
        this._zFactor = 10000;
        this._delegate = null;

        Object.defineProperty(this,"div", {
            get() {
                return(this._div);
            }
        });

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
        /*
        this._div.style.margin = "4px";
        */
        this._div.style.width = this.getOpt("width","50%");
        this._div.style.height = this.getOpt("height","auto");
        this._div.className = "dialog";

        if (this.getOpt("show_header",true))
        {
            this._header = document.createElement("div");
            this._header.className = "header";
            this._header.style.position = "absolute";
            this._div.appendChild(this._header);

            this._title = document.createElement("div");
            this._title.className = "title";
            this._title.innerHTML = this.getOpt("title","");
            this._header.appendChild(this._title);
        }

        this._content = document.createElement("div");
        this._content.style.position = "absolute";
        this._content.style.overflow = "auto";
        this._content.className = "content";
        this._div.appendChild(this._content);

        this._footer = document.createElement("div");
        this._footer.style.position = "absolute";
        this._footer.className = "buttons";
        this._footer.style.padding = "5px";
        this._footer.style.paddingRight = "10px";
        this._footer.style.paddingBottom = 0;
        this._div.appendChild(this._footer);

        if (this.hasOpt("form"))
        {
            this._form = this.createForm(this.getOpt("form"));
            this._content.innerHTML = "";
            this._content.appendChild(this._form.table);
            this._form.focus();
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
        if (this._header != null)
        {
            this._header.style.left = margin + "px";
            this._header.style.top = margin + "px";
            this._header.style.width = (width - headerBorders.hsize - margin) + "px";
            top = this._header.offsetTop + this._header.offsetHeight;
        }

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

        if (this._form != null)
        {
            this._form.sizeTables();
        }

        //return((this._form != null) ? this._form.getValues() : null);
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

        var xalign = _api._opts.getOpt("xalign","center");
        var yalign = _api._opts.getOpt("yalign","center");

        this._div.style.display = "block";
        this._div.style.position = "absolute";

        var	d = window.document;
        var	bodyWidth = d.body.offsetWidth;
        var	bodyHeight = d.body.offsetHeight;
        var	width = this._div.offsetWidth;
        var	height = this._div.offsetHeight;

        if (xalign == "left")
        {
            this._div.style.left = _api._dialogInset + "px";
        }
        else if (yalign == "right")
        {
            this._div.style.left = (bodyWidth - width - _api._dialogInset) + "px";
        }
        else
        {
            this._div.style.left = parseInt((bodyWidth / 2) - (width / 2)) + "px";
        }

        if (yalign == "top")
        {
            this._div.style.top = _api._dialogInset + "px";
        }
        else if (yalign == "bottom")
        {
            this._div.style.top = (bodyHeight - height - _api._dialogInset) + "px";
        }
        else
        {
            this._div.style.top = parseInt((bodyHeight / 2) - (height / 2)) + "px";
        }

        d.body.appendChild(this._div);

        _api._modals.push(this);

        this._div.style.zIndex = this._zFactor + _api._modals.length;

        _api.obscure(this);

        this.layout();
    }

    pop()
    {
        if (_api._modals.length == 0)
        {
            return;
        }

        var	current = _api._modals[_api._modals.length - 1];

        if (current != this)
        {
            return;
        }

        this._div.style.display = "none";

        _api._modals.pop();

        if (_api._modals.length == 0)
        {
            _api.unobscure(true);
        }
        else
        {
            current = _api._modals[_api._modals.length - 1];
            current._div.style.display = "block";
            current._div.style.zIndex = current._zFactor + _api._modals.length;
            _api.obscure(current);
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
        else if (style == "ok")
        {
            buttons = this.getOk();
        }
        else if (style == "done")
        {
            buttons = this.getDone();
        }
        else if (style == "close")
        {
            buttons = this.getClose();
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
        buttons.className = "buttons";
        var tr = document.createElement("tr");
        var button;
        var span;
        var td;

        const   self = this;

        buttons.style.width = "100%";
        buttons.appendChild(tr);

        tr.appendChild(td = document.createElement("td"));
        td.className = "button";

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

    getOk()
    {
        return(this.getDoneButton("Ok"));
    }

    getDone()
    {
        return(this.getDoneButton("Done"));
    }

    getClose()
    {
        return(this.getDoneButton("Close"));
    }

    getDoneButton(text)
    {
        var buttons = document.createElement("table");
        buttons.className = "buttons";
        var tr = document.createElement("tr");
        var button;
        var span;
        var td;

        const   self = this;

        buttons.style.width = "100%";
        buttons.appendChild(tr);

        tr.appendChild(td = document.createElement("td"));
        td.className = "button";

        td.appendChild(span = document.createElement("span"));
        span.appendChild(button = document.createElement("button"));
        button.innerText = text;
        button.addEventListener("click",function(){self.done()});
        return(buttons);
    }

    createForm(values)
    {
        var form = new Form(this,values,this.getOpts());
        return(form);
    }

    getData()
    {
        return((this._form != null) ? this._form.data : null);
    }

    getValues()
    {
        return((this._form != null) ? this._form.getValues() : null);
    }

    getChangedValues()
    {
        return((this._form != null) ? this._form.getChangedValues() : null);
    }

    getValue(name,dv)
    {
        return((this._form != null) ? this._form.getValue(name,dv) : null);
    }

    getControl(name)
    {
        return((this._form != null) ? this._form.getControl(name) : null);
    }

    getButton(name)
    {
        return((this._form != null) ? this._form.getButton(name) : null);
    }

    getTable(name)
    {
        return((this._form != null) ? this._form.getTable(name) : null);
    }

    showControl(name)
    {
        if (this._form != null)
        {
            this._form.show(name);
        }
    }

    hideControl(name)
    {
        if (this._form != null)
        {
            this._form.hide(name);
        }
    }

    enable(name)
    {
        if (this._form != null)
        {
            this._form.enable(name);
        }
    }

    disable(name)
    {
        if (this._form != null)
        {
            this._form.disable(name);
        }
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
        this._values = null;
        this._opts = [];
        this._optsmap = {};
        this._table = document.createElement("table");
        this._table.className = "form";
        this._table.style.width = "80%";
        this._table.style.margin = "auto";

        if (values == null)
        {
            return;
        }

        this._values = [];

        const   self = this;

        var tr;
        var td;

        values.forEach((o) => {

            var opts = new Options(o);
            this._values.push(opts);

            var id = opts.getOpt("id",tools.guid());
            var name = opts.getOpt("name","");
            var value = opts.getOpt("value","");
            var label = opts.getOpt("label",name);
            var classname = opts.getOpt("class","value");
            var type = opts.getOpt("type","input");
            var style = opts.getOpt("style");
            var oneline = this.getOpt("oneline",true);

            opts.setOpt("current",value);

            var rows = [];

            this._table.appendChild(tr = document.createElement("tr"));
            tr.appendChild(td = document.createElement("td"));
            td.className = "label";
            if (this._dialog.hasOpt("label_width"))
            {
                td.style.width = this._dialog.getOpt("label_width");
            }
            if (this._dialog.hasOpt("wrap_labels",false) == false)
            {
                td.style.whiteSpace = "nowrap";
            }
            td.innerHTML = label;

            rows.push(tr);

            opts.setOpt("_rows",rows);

            if (oneline == false)
            {
                this._table.appendChild(tr = document.createElement("tr"));
                rows.push(tr);
            }

            tr.appendChild(td = document.createElement("td"));
            if (opts.hasOpt("button"))
            {
                td.className = classname + " buttoncontrol";
            }
            else
            {
                td.className = classname;
            }

            var control = null;

            if (type == "select")
            {
                control = document.createElement("select");

                if (opts.hasOpt("options"))
                {
                    var tmp = opts.getOpt("options");

                    tmp.forEach((opt) => {
                        var n = opt.name;
                        var v = opt.hasOwnProperty("value") ? opt.value : n;
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
            else if (type == "table")
            {
                control = document.createElement("div");
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
            else if (type == "image")
            {
                var img = document.createElement("img");
                img.onload = function() {
                    //console.log("image is loaded: " + this.naturalWidth + " :: " + this.naturalHeight);
                };
                var input = document.createElement("input");
                img.src = value;
                img.style.border = "1px solid #d8d8d8";
                if (uitools.isMobile())
                {
                    img.style.height = opts.getOpt("height","100px");
                }
                else
                {
                    img.style.height = opts.getOpt("height","200px");
                }
                img.style.cursor = "pointer";
                img.style.float = "left";
                img._form = this;

                input.type = "file";
                input.style.display = "none";

                input.addEventListener("change",function(event) {
                    var files = event.target.files;
                    var file = files[0];
                    var reader = new FileReader();
                    reader.onload = function() {
                        var data = reader.result;
                        if (self.hasOpt("maximagesize") && data.length > self.getOpt("maximagesize"))
                        {
                            var tmp = document.createElement("img");
                            tmp.onload = function() {
                                var w = tmp.naturalWidth;
                                var h = tmp.naturalHeight;
                                var ratio = w / h;
                                h = 200;
                                w = 200 * ratio;
                                _api.context.drawImage(tmp,0,0,w,h);
                                var quality = .5;
                                data = _api.canvas.toDataURL("image/jpeg",quality);
                                img.style.width = w + "px";
                                img.style.height = h + "px";
                                img.src = data;
                                opts.setOpt("_data",data);
                                opts.setOpt("_changed",true);
                            };
                            tmp.src = data;
                        }
                        else
                        {
                            img.src = data;
                            opts.setOpt("_data",data);
                            opts.setOpt("_changed",true);
                        }
                    };
                    reader.readAsDataURL(file);
                },false);
                td.style.verticalAlign = "top";
                td.addEventListener("click",function(e) {
                    input.click();
                });
                var clear = document.createElement("span");
                clear.className = "material-icons";
                clear.style.cursor = "pointer";
                clear.innerText = "clear";
                clear.addEventListener("click",function(e) {
                    img.src = "";
                    opts.setOpt("_data","");
                    opts.setOpt("_changed",true);
                    e.cancelBubble = true;
                });

                var spacer = document.createElement("span");
                spacer.innerHTML = "&nbsp;&nbsp;";

                td.appendChild(img);
                td.appendChild(spacer);
                td.appendChild(clear);
                td.appendChild(input);

                opts.setOpt("control",img);
                opts.setOpt("_image",img);
                opts.setOpt("_changed",false);
            }
            else if (type == "boolean")
            {
                var div = document.createElement("div");
                var span = document.createElement("i");
                div.className = "boolean";
                //span.className = "material-icons";
                div.appendChild(span);
                //span.innerText = value ? "check" : "clear";
                span.innerHTML = value ? "Yes" : "No";
                div._opts = opts;
                td.appendChild(div);

                opts.setOpt("value",value ? true : false);

                div.addEventListener("click",function() {
                    var current = this._opts.getOpt("value");
                    var value = current ? false : true;
                    span.innerHTML = value ? "Yes" : "No";
                    //span.innerText = value ? "check" : "clear";
                    this._opts.setOpt("value",value);
                });
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

                if (type == "table")
                {
                    var st = new SimpleTable(control,opts.getOpts(),this.getOpt("delegate"));
                    st.setFields(opts.getOpt("fields",[]));
                    st.size();
                    st.draw();

                    opts.setOpt("_table",st);
                }
                else if (type != "select" && type != "image")
                {
                    if (type == "textarea")
                    {
                        if (Array.isArray(value))
                        {
                            var s = "";
                            value.forEach((v) => {
                                if (s.length > 0)
                                {
                                    s += "\n";
                                }
                                s += v;
                            });
                            control.value = s;
                        }
                        else
                        {
                            control.value = value;
                        }
                    }
                    else if (type == "checkbox")
                    {
                        control.checked = value;
                    }
                    else
                    {
                        control.value = value;
                    }
                }

                if (style != null)
                {
                    for (var x in style)
                    {
                        control.style[x] = style[x];
                    }
                }
                else if (type == "table")
                {
                    control.style.border = "1px solid #d8d8d8";
                }

                if (opts.hasOpt("onchange"))
                {
                    control.addEventListener("change",opts.getOpt("onchange"));
                }

                td.appendChild(control);

                opts.setOpt("control",control);

                if (opts.hasOpt("button"))
                {
                    var bopts = new Options(opts.getOpt("button"));
                    var button = document.createElement("button");
                    button.innerText = bopts.getOpt("text","Button");
                    if (bopts.hasOpt("click"))
                    {
                        button.addEventListener("click",bopts.getOpt("click"));
                    }
                    button.disabled = bopts.getOpt("disabled",false);

                    var span = document.createElement("span");
                    span.innerHTML = "&nbsp;&nbsp;";

                    td.appendChild(span);
                    td.appendChild(button);

                    opts.setOpt("_button",button);
                }
            }

            this._opts.push(opts);
            this._optsmap[name] = opts;
        });
    }

    focus()
    {
        for (var opt of this._opts)
        {
            if (opt.getOpt("focus",false))
            {
                opt.getOpt("control").focus();
                break;
            }
        }
    }

    getValues()
    {
        var values = null;

        this._values.forEach((v) =>
        {
            if (values == null)
            {
                values = {};
            }

            var name = v.getOpt("name");
            var value = this.getValue(name);
            if (value != null)
            {
                values[name] = value;
            }
        });

        return(values);
    }

    hasChangedValues()
    {
        return(this.getChangedValues() != null);
    }

    getChangedValues()
    {
        var values = null;

        this._values.forEach((v) =>
        {
            var name = v.getOpt("name");
            var type = v.getOpt("type");
            var current = v.getOpt("current");
            var value = this.getValue(name);
            if (type == "image")
            {
                if (v.hasOpt("_data"))
                {
                    if (values == null)
                    {
                        values = {};
                    }

                    values[name] = v.getOpt("_data");
                }
            }
            else if (current != value)
            {
                if (values == null)
                {
                    values = {};
                }
                values[name] = value;
            }
        });

        return(values);
    }

    getValue(name,dv)
    {
        var value = null;
        var entry = this.getEntry(name);

        if (entry != null)
        {
            var control = entry.getOpt("control");
            var type = entry.getOpt("type");

            if (type == "image")
            {
                value = control.src;
            }
            else if (type == "boolean")
            {
                value = entry.getOpt("value");
            }
            else if (control.type != null)
            {
                if (control.type == "checkbox")
                {
                    value = control.checked;
                }
            }

            if (value == null)
            {
                value = control.value;
            }
        }

        if (value == null && dv != null)
        {
            value = dv;
        }

        return(value);
    }

    getControl(name)
    {
        var control = null;
        var entry = this.getEntry(name);

        if (entry != null)
        {
            control = entry.getOpt("control");
        }

        return(control);
    }

    getButton(name)
    {
        var button = null;
        var entry = this.getEntry(name);

        if (entry != null)
        {
            button = entry.getOpt("_button");
        }

        return(button);
    }

    getTable(name)
    {
        var table = null;
        var entry = this.getEntry(name);

        if (entry != null)
        {
            table = entry.getOpt("_table");
        }

        return(table);
    }

    show(name)
    {
        var entry = this.getEntry(name);

        if (entry != null)
        {
            var rows = entry.getOpt("_rows");
            rows.forEach((row) => {
                row.style.display = "table-row";
            });
        }
    }

    hide(name)
    {
        var entry = this.getEntry(name);

        if (entry != null)
        {
            var rows = entry.getOpt("_rows");
            rows.forEach((row) => {
                row.style.display = "none";
            });
        }
    }

    enable(name)
    {
        var entry = this.getEntry(name);

        if (entry != null)
        {
            entry.getOpt("control").disabled = false;
        }
    }

    disable(name)
    {
        var entry = this.getEntry(name);

        if (entry != null)
        {
            entry.getOpt("control").disabled = true;
        }
    }

    getEntry(name)
    {
        var entry = null;

        if (this._optsmap.hasOwnProperty(name))
        {
            entry = this._optsmap[name];
        }

        return(entry);
    }

    sizeTables()
    {
        for (var x in this._optsmap)
        {
            var entry = this._optsmap[x];
            if (entry.hasOpt("_table"))
            {
                var table = entry.getOpt("_table");
                table.size();
                table.draw();
            }
        }
    }
}

var	_api =
{
    _modals:null,
    _cover:null,
    _obscureCount:0,
    _dialogInset:0,
    _opts:new Options(),
    _canvas:null,
    _context:null,

    createDialog:function(options)
    {
        var dialog = new Dialog(options);
        return(dialog);
    },

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
        if (options == null)
        {
            options = {};
        }

        if (options.hasOwnProperty("buttons") == false)
        {
            options.buttons = "done";
        }

        var dialog = new Dialog(options);
        /*
        dialog._div.style.width = "80%";
        dialog._div.style.height = "80%";
        dialog.content.appendChild(div);
        */
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
        if (this._modals.length == 0)
        {
            return;
        }

        var	element = (typeof(modal) == "string") ? document.getElementById(modal) : modal;

        if (element == null)
        {
            return;
        }

        var	current = this._modals[this._modals.length - 1];

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

    status:function(options)
    {
        if (options == null)
        {
            options = {};
        }

        if (options.hasOwnProperty("buttons") == false)
        {
            options.buttons = "none";
        }

        if (options.hasOwnProperty("width") == false)
        {
            options["width"] = "50%";
        }

        if (options.hasOwnProperty("height") == false)
        {
            options["height"] = "200px";
        }

        var table = document.createElement("table");
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        var div = document.createElement("div");
        table.appendChild(tr);
        tr.appendChild(td);
        td.appendChild(div);
        var opts = new Options(options);
        div.className = "status";
        div.innerHTML = opts.getOpt("text","");
        var dialog = new Dialog(options);
        dialog.content = table;
        dialog.push();
        return(dialog);
    },

    message:function(title,text,options)
    {
        if (options == null)
        {
            options = {};
        }
        options.title = title;
        if (options.hasOwnProperty("buttons") == false)
        {
            options.buttons = "ok";
        }
        var dialog = this.create(options);
        dialog.htmlcontent = "<div class='message'>" + text + "</div>";
        dialog.push();
        return(dialog);
    },

    confirmAction:function(title,text,delegate)
    {
        var options = {};
        options.title = title;
        options.delegate = delegate;
        var dialog = this.create(options);
        dialog.htmlcontent = "<div>" + text + "</div>";
        dialog.push();
        return(dialog);
    },

    create:function(options)
    {
        var dialog = new Dialog(options);
        return(dialog);
    },

    setOptions:function(options)
    {
        _opts.setOpts(options);
    },

    obscure:function(dialog)
    {
        if (this._cover != null)
        {
            this._cover.style.left = document.documentElement.scrollLeft + "px";
            this._cover.style.top = document.documentElement.scrollTop + "px";
            this._cover.style.width = document.documentElement.clientWidth + "px";
            this._cover.style.height = document.documentElement.clientHeight + "px";
            this._cover.style.display = "block";
            this._cover.style.zIndex = dialog._zFactor + this._modals.length - 1;
            document.body.appendChild(this._cover);
        }

        this._obscureCount++;

        this.placeModals();
        document.body.style.overflow = "hidden";
    },

    unobscure:function(force)
    {
        if (force)
        {
            this._obscureCount = 0;
        }
        else
        {
            this._obscureCount--;
        }

        if (this._obscureCount == 0)
        {
            this._cover.style.display = "none";
            document.body.style.overflow = "auto";
        }

        this.placeModals();
    },

    placeModals:function()
    {
        if (this._modals == null || this._modals.length == 0)
        {
            return;
        }

        var	d = window.document;
        var	bodyWidth = d.documentElement.clientWidth;
        var	bodyHeight = d.documentElement.clientHeight;
        var	bodyLeft = d.documentElement.scrollLeft;
        var	bodyTop = d.documentElement.scrollTop;
        var xalign;
        var yalign;
        var	element;
        var borders;
        var	width;
        var	height;
        var	x;
        var	y;

        this._modals.forEach((dialog) => {

            dialog.layout();

            width = dialog._div.offsetWidth;
            height = dialog._div.offsetHeight;

            xalign = this._opts.getOpt("xalign","center");
            yalign = this._opts.getOpt("yalign","center");

            if (xalign == "left")
            {
                dialog._div.style.left = bodyLeft + this._dialogInset + "px";
            }
            else if (yalign == "right")
            {
                dialog._div.style.left = (bodyLeft + bodyWidth - width - this._dialogInset) + "px";
            }
            else
            {
                dialog._div.style.left = parseInt((bodyLeft + bodyWidth / 2) - (width / 2)) + "px";
            }

            if (yalign == "top")
            {
                dialog._div.style.top = bodyTop + this._dialogInset + "px";
            }
            else if (yalign == "bottom")
            {
                dialog._div.style.top = (bodyTop + bodyHeight - height - this._dialogInset) + "px";
            }
            else
            {
                dialog._div.style.top = parseInt(bodyTop + (bodyHeight / 2) - (height / 2)) + "px";
            }
        });

        this._cover.style.width = bodyWidth + "px";
        this._cover.style.height = bodyHeight + "px";
    },

    clearModals:function()
    {
        if (this._modals != null)
        {
            for (var i = 0; i < this._modals.length; i++)
            {
                this._modals[i]._div.style.display = "none";
            }

            this._modals = new Array();

            this.unobscure(true);
        }
    }
}

Object.defineProperty(_api,"canvas", {
    get() {
        if (this._canvas == null)
        {
            this._canvas = document.createElement("canvas");
        }
        return(this._canvas);
    }
});

Object.defineProperty(_api,"context", {
    get() {
        if (this._context == null)
        {
            var canvas = this.canvas;
            this._context = canvas.getContext("2d");
        }
        return(this._context);
    }
});

export {_api as dialogs};
