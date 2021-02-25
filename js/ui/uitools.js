/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

var _uitools =
{
    getBorders:function(element,includePadding)
    {
        var o = {left:0,top:0,right:0,bottom:0};

        Object.defineProperty(o,"hsize", {
            get() {
                return(this.left + this.right);
            }
        });

        Object.defineProperty(o,"vsize", {
            get() {
                return(this.top + this.bottom);
            }
        });

        if (element == null || element.style.display == "none")
        {
            return(o);
        }

        var style = window.getComputedStyle(element,null);

        o.left = parseInt(style.getPropertyValue('border-left-width'));
        o.top = parseInt(style.getPropertyValue('border-top-width'));
        o.right = parseInt(style.getPropertyValue('border-right-width'));
        o.bottom = parseInt(style.getPropertyValue('border-bottom-width'));

        if (includePadding)
        {
            o.left += parseInt(style.getPropertyValue('padding-left'));
            o.top += parseInt(style.getPropertyValue('padding-top'));
            o.right += parseInt(style.getPropertyValue('padding-right'));
            o.bottom += parseInt(style.getPropertyValue('padding-bottom'));
        }

        if (isNaN(o.left))
        {
            o.left = 0;
        }
        if (isNaN(o.top))
        {
            o.top = 0;
        }
        if (isNaN(o.right))
        {
            o.right = 0;
        }
        if (isNaN(o.bottom))
        {
            o.bottom = 0;
        }

        return(o);
    },

    getMargins:function(element)
    {
        var margins = {left:0,top:0,right:0,bottom:0};

        if (element == null || element.style.display == "none")
        {
            return(margins);
        }

        var style = window.getComputedStyle(element,null);

        margins.left = parseInt(style['marginLeft']);
        margins.top = parseInt(style['marginTop']);
        margins.right = parseInt(style['marginRight']);
        margins.bottom = parseInt(style['marginBottom']);

        if (isNaN(margins.left))
        {
            margins.left = 0;
        }
        if (isNaN(margins.top))
        {
            margins.top = 0;
        }
        if (isNaN(margins.right))
        {
            margins.right = 0;
        }
        if (isNaN(margins.bottom))
        {
            margins.bottom = 0;
        }

        return(margins);
    },

    getPadding:function(element)
    {
        var o = {left:0,top:0,right:0,bottom:0};

        Object.defineProperty(o,"hsize", {
            get() {
                return(this.left + this.right);
            }
        });

        Object.defineProperty(o,"vsize", {
            get() {
                return(this.top + this.bottom);
            }
        });

        if (element == null || element.style.display == "none")
        {
            return(o);
        }

        var    style = window.getComputedStyle(element,null);

        o.left += parseInt(style.getPropertyValue('padding-left'));
        o.top += parseInt(style.getPropertyValue('padding-top'));
        o.right += parseInt(style.getPropertyValue('padding-right'));
        o.bottom += parseInt(style.getPropertyValue('padding-bottom'));

        return(o);
    },

    getSize:function(element)
    {
        var size = {width:0,height:0};

        if (element != null)
        {
            size.width = element.offsetWidth;
            size.height = element.offsetHeight;
        }

        size.toString = function()
        {
            return("width=" + this.width + ", height=" + this.height);
        }

        return(size);
    },

    getOffset:function(element)
    {
        var	offset = new Object();
        offset._x = 0;
        offset._y = 0;
        offset._parentX = -1;
        offset._parentY = -1;
        offset._width = 0;
        offset._height = 0;

        var	e = element;

        if (element.firstChild != null)
        {
            if (element.firstChild.nodeType == 1)
            {
                e = element.firstChild;
            }
        }

        while (e != null)
        {
            offset._x += e.offsetLeft;
            offset._y += e.offsetTop;

            if (offset._parentX == -1)
            {
                offset._parentX = e.offsetLeft;
                offset._parentY = e.offsetTop;
            }

            offset._x -= e.scrollLeft;
            offset._y -= e.scrollTop;

            e = e.offsetParent;
        }

        offset._width = element.offsetWidth;
        offset._height = element.offsetHeight;

        offset.right = function() {return(this._x + this._width);};
        offset.bottom = function() {return(this._y + this._height);};

        return(offset);
    },

    getCbState:function(label)
    {
        var element = (typeof(label) == "string") ? document.getElementById(label) : label;
        var code = false;

        if (element != null)
        {
            var cb = element.firstChild;

            if (cb.disabled == false)
            {
                code = cb.checked;
            }
        }

        return(code);
    },

    setCbState:function(label,options)
    {
        var element = (typeof(label) == "string") ? document.getElementById(label) : label;
        var code = false;

        if (element != null)
        {
            var cb = element.firstChild;

            if (options.hasOwnProperty("checked"))
            {
                cb.checked = options.checked;
            }

            if (options.hasOwnProperty("enabled"))
            {
                if (options.enabled)
                {
                    element.style.opacity = 1.0;
                    cb.disabled = false;
                    code = cb.checked;
                }
                else
                {
                    element.style.opacity = .3;
                    cb.disabled = true;
                }
            }
        }

        return(code);
    },

    setLinkState:function(link,enabled)
    {
        var a = (typeof(link) == "string") ? document.getElementById(link) : link;

        if (a != null)
        {
            if (a.hasOwnProperty("_enabled") == false)
            {
                a._enabled = true;
                a._href = a.href;
            }

            if (enabled)
            {
                a.href = a._href;
                a.style.opacity = 1.0;
                a.style.cursor = "pointer";
            }
            else
            {
                a.href = "#";
                a.style.opacity = 0.3;
                a.style.cursor = "default";
            }
        }

        return(enabled);
    }
};

export {_uitools as uitools};
