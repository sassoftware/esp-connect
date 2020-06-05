/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

var	_dialogs_ = null;

define([
    "../connect/tools",
    "../connect/options"
], function(tools,Options)
{
	var	__dialogs =
	{
		_okText:"Ok",
		_cancelText:"Cancel",
        _codeDiv:null,
        _codeId:null,

		init:function(okText,cancelText)
		{
			this._okText = okText;
			this._cancelText = cancelText;

			var	d = window.document;

			this._popup = d.createElement("div");
			this._popup.className = "dialog";
			this._popup.id = "_popup";
			this._popupTimer = null;

			this._dialog = d.createElement("div");
			this._dialog.className = "dialog";
			this._dialog.id = "_dialog";

			this._modals = new Array();

			var	cover = d.createElement("div");
			cover.className = "obscureCover";
			cover.style.width = "100%";
			cover.style.height = "100%";
			cover.style.position = "absolute";
			cover.style.left = "0";
			cover.style.top = "0";

			d._cover = cover;

			this._obscureCount = 0;

			var	s = "";

			s = "";
			s += "<div class='dialogTop'>";
			s += "<div class='dialogHeader'>";
			s += "<div class='dialogTitle' id='_popupTitle'>&nbsp;</div>";
			s += "</div>";
			/*
			s += "<div class='dialogDivider'>&nbsp;</div>";
			*/
			s += "<div class='dialogContent' id='_popupContent'>&nbsp;</div>";
			/*
			s += "<div class='dialogDivider'>&nbsp;</div>";
			*/
			s += "</div>";
			s += "<div class='dialogButtons'>";
			s += "<table style='width:100%'>";
			s += "<tr>";
			s += "<td class='dialogButton'><span><button onclick='_dialogs_.removePopup()'>" + this._okText + "</button></span></td>";
			s += "</tr>";
			s += "</table>";
			s += "</div>";

			this._popup.innerHTML = s;

			s = "";
			s += "<div class='dialogTop'>";
			s += "<div class='dialogHeader'>";
			s += "<div class='dialogTitle' id='_dialogTitle'>&nbsp;</div>";
			s += "</div>";
			s += "<div class='dialogContent' id='_dialogContent'>&nbsp;</div>";
			s += "</div>";
			s += "<div class='dialogButtons'>";
			s += "<table style='width:100%'>";
			s += "<tr>";
			s += "<td class='dialogButton'><span><button onclick='_dialogs_.ok()'>" + this._okText + "</button></span><span><button onclick='_dialogs_.cancel()'>" + this._cancelText + "</button></span></td>";
			s += "</tr>";
			s += "</table>";
			s += "</div>";

			this._dialog.innerHTML = s;

			this._ok = null;
			this._cancel = null;

			this._zFactor = 10000;

            this._formdata = [];

			this._dialogInset = 0;

			this._focus = null;
			this._selection = null;
			this._interval = null;
		},

		check:function()
		{
			if (this._dialog == null)
			{
				this.init("Ok","Cancel");
			}
		},

		showDialog:function(options)
        {
            var opts = new Options(options);

			this.check();

			this._ok = opts.getOpt("ok");
			this._cancel = opts.getOpt("cancel");

            this._dialog.style.width = opts.getOpt("width","50%");
            this._dialog.style.height = opts.getOpt("height","auto");

			var	d = window.document;

			d.body.appendChild(this._dialog);

            var values = opts.getOpt("values",[]);
            var form = this.createForm(values);

			d.getElementById("_dialogTitle").innerHTML = opts.getOpt("header","");
			d.getElementById("_dialogContent").innerHTML = form;

			this.pushModal("_dialog");

            if (this._formdata.length > 0)
            {
                var element;
                this._formdata.forEach((item) => {
                    if (item.getOpt("type") == "code")
                    {
                        if ((element = d.getElementById(item.getOpt("id"))) != null)
                        {
                            element.innerText = item.getOpt("value");
                        }
                    }
                });

                if ((element = d.getElementById(this._formdata[0].getOpt("id"))) != null)
                {
                    element.focus();
                }
            }
		},

		hideDialog:function()
        {
			this.popModal("_dialog");
        },

		showCodeDialog:function(options)
        {
            var opts = new Options(options);

            if (this._codeDiv == null)
            {
                this._codeId = tools.guid();
                this._codeDiv = document.createElement("div");
                this._codeDiv.className = "dialog";
                this._codeDiv.innerHTML = "<table class='dialogClose' style='width:100%' cellspacing='0' cellpadding='0'>\
                        <tr><td class='icon'><a class='icon dialogTitle' href='javascript:_dialogs_.clearCodeDialog()'>&#xf10c;</a></td></tr>\
                    </table>\
                    <div class='dialogTop'>\
                        <div  class='dialogHeader'>\
                            <div class='dialogTitle'>\
                                <table style='width:100%;border:0' cellspacing='0' cellpadding='0'>\
                                    <tr>\
                                        <td><div id='_dialogCodeHeader' class='dialogTitle'></div></td>\
                                    </tr>\
                                </table>\
                            </div>\
                        </div>\
                    </div>\
                    <div class='dialogContent' style='width:95%;height:70%;margin:auto'>\
                        <pre id='_dialogCode' class='dialogCode'></pre>\
                    </div>\
                    <div class='dialogButtons'>\
                        <table style='width:100%'>\
                            <tr>\
                                <td class='dialogButton'>\
                                    <span><button class='close' onclick='javascript:_dialogs_.clearCodeDialog()'>Done</button></span>\
                                </td>\
                            </tr>\
                        </table>\
                    </div>";
            }

            this._codeDiv.style.width = opts.getOpt("width","90%");
            this._codeDiv.style.height = opts.getOpt("height","90%");

            this.pushModal(this._codeDiv);

            document.getElementById("_dialogCodeHeader").innerHTML = opts.getOpt("header","");
            document.getElementById("_dialogCode").innerText = opts.getOpt("code","");
        },

		clearCodeDialog:function(options)
        {
            if (this._codeDiv != null)
            {
                this.popModal(this._codeDiv);
            }
        },

		dialog:function(content,ok,header,cancel,values)
		{
			this.check();

			this._ok = ok;
			this._cancel = cancel;

			var	d = window.document;

			d.body.appendChild(this._dialog);

			d.getElementById("_dialogTitle").innerHTML = header;
			d.getElementById("_dialogContent").innerHTML = content;

			this.pushModal("_dialog");

			if (values != null)
			{
				var	element;

				for (var x in values)
				{
					if ((element = document.getElementById(x)) != null)
					{
						element.value = values[x];
					}
				}
			}
		},

		ok:function()
		{
            var data = {};

            this._formdata.forEach((fd) => {
                data[fd.getOpt("name")] = document.getElementById(fd.getOpt("id")).value;
            });

			if (this._ok != null)
			{
				if (this._ok(data) == false)
				{
					return;
				}
			}

			this.popModal("_dialog");
		},

		cancel:function()
		{
			if (this._cancel != null)
			{
				this._cancel();
			}

			this.popModal("_dialog");
		},

		createForm:function(values)
		{
            this._formdata = [];

            var code = {};
			var	html = "";
			html += "<table style='margin:auto;width:80%'>";
            values.forEach((value) => {
                var opts = new Options(value);
                var id = opts.getOpt("id",tools.guid());
                var name = opts.getOpt("name","");
                var value = opts.getOpt("value","");
                var label = opts.getOpt("label",name);
                var classname = opts.getOpt("class","dialogValue");
                var type = opts.getOpt("type","input");
                var style = opts.getOpt("style");
                if (label.length > 0)
                {
				    html += "<tr><td class='dialogLabel'>" + label + "</td></tr>";
                }
				html += "<tr><td class='" + classname + "'>";
                if (type == "textarea")
                {
                    html += "<textarea id='" + id + "' type='" + opts.getOpt("type","text") + "' value='" + value + "'";
                    if (style != null)
                    {
                        html += " style='" + style + "'";
                    }
                    html += "></textarea>";
                }
                else if (type == "code")
                {
                    html += "<pre id='" + id + "' style='overflow:auto";
                    if (style != null)
                    {
                        html += ";" + style + "'";
                    }
                    html += ">" + "</pre>";
                }
                else
                {
                    html += "<input id='" + id + "' type='" + opts.getOpt("type","text") + "' value='" + value + "'";
                    if (style != null)
                    {
                        html += " style='" + style + "'";
                    }
                    html += "></input>";
                }
                html += "</td></tr>";
                opts.setOpt("id",id);

                this._formdata.push(opts);
			});
			html += "</table>";
			return(html);
		},

		popup:function(title,text,duration)
		{
			this.check();

			var	d = window.document;
			var	bodyWidth = d.body.offsetWidth;
			var	bodyHeight = d.body.offsetHeight;

			d.body.appendChild(this._popup);

			var	popupTitle = d.getElementById("_popupTitle");
			var	popupText = d.getElementById("_popupContent");
			popupTitle.innerHTML = title;
			popupText.innerHTML = text;

			if (this._popupTimer != null)
			{
				clearTimeout(this._popupTimer);
				this._popupTimer = null;
			}

			if (duration > 0)
			{
				this._popupTimer = setTimeout(function(){_dialogs_.removePopup()},(duration * 1000));
			}

			this.pushModal("_popup");

			var	x = (bodyWidth / 2) - (this._popup.offsetWidth / 2);
			var	y = (bodyHeight / 2) - (this._popup.offsetHeight / 2);

			this._popup.style.left = parseInt(x) + "px";
			this._popup.style.top = parseInt(y) + "px";
			this._popup.style.position = "absolute";
		},

		removePopup:function()
		{
			this.popModal("_popup");
		},

		pushModal:function(modal,xAlign,yAlign)
		{
			this.check();

			var	element = (typeof(modal) == "string") ? document.getElementById(modal) : modal;

			if (element == null)
			{
				return;
			}

			element._xAlign = (xAlign != null) ? xAlign : "center";
			element._yAlign = (yAlign != null) ? yAlign : "center";

			element.style.display = "block";
			element.style.position = "absolute";

			var	d = window.document;
			var	bodyWidth = d.body.offsetWidth;
			var	bodyHeight = d.body.offsetHeight;
			var	width = element.offsetWidth;
			var	height = element.offsetHeight;

			if (element._xAlign == "left")
			{
				element.style.left = this._dialogInset + "px";
			}
			else if (element._xAlign == "right")
			{
				element.style.left = (bodyWidth - width - this._dialogInset) + "px";
			}
			else
			{
				element.style.left = parseInt((bodyWidth / 2) - (width / 2)) + "px";
			}

			if (element._yAlign == "top")
			{
				element.style.top = this._dialogInset + "px";
			}
			else if (element._yAlign == "bottom")
			{
				element.style.top = (bodyHeight - height - this._dialogInset) + "px";
			}
			else
			{
				element.style.top = parseInt((bodyHeight / 2) - (height / 2)) + "px";
			}

			d.body.appendChild(element);

			this._modals.push(element);

			element.style.zIndex = this._zFactor + this._modals.length;

			this.obscure();
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

			if (current != element)
			{
				return;
			}

			current.style.display = "none";

			this._modals.pop();

			if (this._modals.length == 0)
			{
				this.unObscure(true);
			}
			else
			{
				current = this._modals[this._modals.length - 1];
				current.style.display = "block";
				current.style.zIndex = this._zFactor + this._modals.length;
				this.obscure();
			}
		},

		getTopModal:function()
		{
			return((this._modals.length > 0) ? this._modals[0] : null);
		},

		getTopModalId:function()
		{
			var	modal = this.getTopModal();
			return((modal != null) ? modal.id : "");
		},

		getBottomModal:function()
		{
			return((this._modals.length > 0) ? this._modals[this._modals.length - 1] : null);
		},

		getBottomModalId:function()
		{
			var	modal = this.getBottomModal();
			return((modal != null) ? modal.id : "");
		},

		clearModals:function()
		{
			if (this._modals != null)
			{
				for (var i = 0; i < this._modals.length; i++)
				{
					this._modals[i].style.display = "none";
				}

				this._modals = new Array();

				this.unObscure(true);
			}
		},

		hasModals:function()
		{
			return(this._modals != null && this._modals.length > 0);
		},

		isDisplayed:function(id)
		{
			var	code = false;

			if (this._modals != null)
			{
				for (var i = 0; i < this._modals.length; i++)
				{
					if (this._modals[i].id == id)
					{
						code = true;
						break;
					}
				}
			}

			return(code);
		},

		placeModals:function()
		{
			if (this._modals == null || this._modals.length == 0)
			{
				return;
			}

			var	d = window.document;
			var	bodyWidth = d.body.offsetWidth;
			var	bodyHeight = d.body.offsetHeight;
			var	element;
            var borders;
			var	width;
			var	height;
			var	x;
			var	y;

			for (var i = 0; i < this._modals.length; i++)
			{
				element = this._modals[i];

				width = element.offsetWidth;
				height = element.offsetHeight;

				if (element._xAlign == "left")
				{
					element.style.left = this._dialogInset + "px";
				}
				else if (element._xAlign == "right")
				{
					element.style.left = (bodyWidth - width - this._dialogInset) + "px";
				}
				else
				{
					element.style.left = parseInt((bodyWidth / 2) - (width / 2)) + "px";
				}

				if (element._yAlign == "top")
				{
					element.style.top = this._dialogInset + "px";
				}
				else if (element._yAlign == "bottom")
				{
					element.style.top = (bodyHeight - height - this._dialogInset) + "px";
				}
				else
				{
					element.style.top = parseInt((bodyHeight / 2) - (height / 2)) + "px";
				}
			}

			d._cover.style.width = bodyWidth + "px";
			d._cover.style.height = bodyHeight + "px";
		},

		focusIn:function(id,milliseconds)
		{
			if (this._focus != null)
			{
				return;
			}

			this._focus = id;

			var	dialogs = this;

			setInterval(function(){dialogs.focus()},milliseconds);
		},

		focus:function()
		{
			if (this._focus != null)
			{
				var	element = document.getElementById(this._focus);

				if (element != null)
				{
					element.focus();
				}

				this._focus = null;
			}
		},

		selectIn:function(id,milliseconds)
		{
			if (this._select != null)
			{
				return;
			}

			this._selection = id;

			var	dialogs = this;

			setInterval(function(){dialogs.select()},milliseconds);
		},

		select:function()
		{
			if (this._selection != null)
			{
				var	element = document.getElementById(this._selection);

				if (element != null)
				{
					element.setSelectionRange(0,element.value.length);
					element.focus();
				}

				this._selection = null;
			}
		},

		obscure:function()
		{
			this.check();

			var	d = window.document;

			if (d.hasOwnProperty("_cover"))
			{
				d._cover.style.display = "block";
				d._cover.style.zIndex = this._zFactor + this._modals.length - 1;
				d.body.appendChild(d._cover);
			}

			this._obscureCount++;

			this.placeModals();
		},

		unObscure:function(force)
		{
			this.check();

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
				var	d = window.document;

				if (d.hasOwnProperty("_cover"))
				{
					d._cover.style.display = "none";
				}
			}

			this.placeModals();
		},
	};

	_dialogs_ = __dialogs;

	return(__dialogs);
});
