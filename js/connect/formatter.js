/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

var _isNode = false;
var _fs = null;

try
{
    _isNode = (require("detect-node") != null);
}
catch (e)
{
}

define([
    "./options"
], function(Options)
{

    function
    Formatter(options)
    {
		Options.call(this,options);
        this._index = 0;
        this._tabs = this.getOpt("tabs",4);
        this._incommand = false;
        this._command = null;
        this._prev = null;

        this._cl = '<';
        this._cr = '>';

        this._colors = {"black":30,"red":31,"green":32,"yellow":33,"blue":34,"magenta":35,"cyan":36,"white":37};
    }

	Formatter.prototype = Object.create(Options.prototype);
	Formatter.prototype.constructor = Formatter;

	Formatter.prototype.format =
    function(text,length,indent,init)
    {
        this._text = (init != null) ? init : "";
        this._index = 0;
        this._prev = null;
        this._incommand = false;
        this._command = null;
        this.process(text,length,indent);
        return(this._text);
    }

	Formatter.prototype.process =
    function(text,length,indent)
    {
        var word = "";
        var c;

        for (var i = 0; i < text.length; i++)
        {
            c = text[i];

            if (c == this._cl)
            {
                this._incommand = true;
                this._command = "";
            }
            else if (c == this._cr)
            {
                if (this._incommand)
                {
                    this._incommand = false;
                    this.command(indent);
                }
            }
            else if (this._incommand)
            {
                this._command += c;
            }
            else if (c == ' ' || c == '\t' || c == '\n' || c == '.')
            {
                this.word(word);

                word = "";

                if (c == ' ')
                {
                    if (length != null)
                    {
                        if (this._index >= length)
                        {
                            this._text += "\n";
                            this._index = 0;
                            if (indent != null)
                            {
                                this._text += indent;
                            }
                        }
                        else
                        {
                            this._text += c;
                        }
                    }
                    else
                    {
                        this._text += c;
                    }
                }
                else if (c == '\t')
                {
                    for (var j = 0; j < this._tabs; j++)
                    {
                        this._text += " ";
                    }
                }
                else if (c == '\n')
                {
                    this._text += "\n";
                    this._index = 0;
                    if (indent != null)
                    {
                        this._text += indent;
                    }
                }
                else
                {
                    this._text += c;
                }
            }
            else
            {
                this._prev = c;
                word += c;
            }
        }

        if (word.length > 0)
        {
            this.word(word);
        }
    }

	Formatter.prototype.command =
    function(indent)
    {
        if (this._command == "note")
        {
            var s = "NOTE";
            this._text += "\x1b[7m" + s + "\x1b[0m";
            this._index += s.length;
        }
        else if (this._command == "b")
        {
            this._text += "\x1b[1m";
        }
        else if (this._command == "/b")
        {
            this._text += "\x1b[0m";
        }
        else if (this._command == "br/")
        {
            this._text += '\n';
            if (indent != null)
            {
                this._text += indent;
            }
            this._index = 0;
        }
        else if (this._command.indexOf("fg:") == 0)
        {
            var a = this._command.split(":");
            var color = a[1];

            if (this._colors.hasOwnProperty(color))
            {
                this._text += "\x1b[" + this._colors[color] + "m";
            }
        }
        else if (this._command.indexOf("bg:") == 0)
        {
            var a = this._command.split(":");
            var color = a[1];

            if (this._colors.hasOwnProperty(color))
            {
                this._text += "\x1b[" + (this._colors[color] + 10) + "m";
            }
        }
        else if (this._command == "/fg")
        {
            this._text += "\x1b[0m";
        }
        else if (this._command == "/bg")
        {
            this._text += "\x1b[47m";
        }

        /*
        if (_fs == null)
        {
            _fs = require("fs");
        }

        var data = _fs.readFileSync(this._command);
        this.process(new String(data));
        */
    }

	Formatter.prototype.word =
    function(text)
    {
        this._text += text;
        this._index += text.length;
    }

    Formatter.prototype.tab =
    function(times)
    {
        var s = "";

        if (times == null)
        {
            times = 1;
        }

        var indent = this.getOpt("tabs","    ");

        for (var i = 0; i < times; i++)
        {
            s += indent;
        }

        return(s);
    }

    Formatter.prototype.spaces =
    function(num)
    {
        var s = "";

        for (var i = 0; i < num; i++)
        {
            s += " ";
        }

        return(s);
    }

    return(Formatter);
});
