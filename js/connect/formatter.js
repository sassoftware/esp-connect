/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "./options.js";

class Formatter extends Options
{
    constructor(options)
    {
        super(options);
        this._index = 0;
        this._tabs = this.getOpt("tabs",4);
        this._incommand = false;
        this._command = null;
        this._prev = null;
        this._text = null;
        this._listing = null;

        this._cl = '<';
        this._cr = '>';

        this._colors = {"black":30,"red":31,"green":32,"yellow":33,"blue":34,"magenta":35,"cyan":36,"white":37};
    }

    format(text,length,indent,init)
    {
        this._text = (init != null) ? init : "";
        this._index = 0;
        this._prev = null;
        this._incommand = false;
        this._command = null;
        if (Array.isArray(text))
        {
            text.forEach((t) => {
                this.process(t,length,indent);
                this._text += "\n\n";
                this._text += (init != null) ? init : "";
                this._index = 0;
                this._prev = null;
                this._incommand = false;
                this._command = null;
            });
        }
        else
        {
            this.process(text,length,indent);
        }

        return(this._text);
    }

    process(text,length,indent)
    {
        var word = "";
        var c;

        for (var i = 0; i < text.length; i++)
        {
            c = text[i];

            if (c == this._cl)
            {
                this.word(word);
                word = "";

                this._incommand = true;
                this._command = "";
            }
            else if (c == this._cr)
            {
                this.word(word);
                word = "";

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
            else if (this._listing != null)
            {
                this._listing += c;
            }
            else if (c == ' ' || c == '\t' || c == '\n' || c == '.')
            {
                if (c == ' ')
                {
                    if (this._index == 0 && word.length == 0)
                    {
                        continue;
                    }
                }

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
                else if (c == '.')
                {
                    this._text += c;
                    //this._text += " ";
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

    command(indent)
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
            this._text += "\x1b[22m";
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
            this._text += "\x1b[30m";
        }
        else if (this._command == "/bg")
        {
            this._text += "\x1b[47m";
        }
        else if (this._command == "listing")
        {
            this._listing = "";
        }
        else if (this._command == "/listing")
        {
            const   listing = this.getListing(this._listing);
            var     values = [];
            listing.values.forEach((value) => {
                values.push(new Options(value));
            });
            listing.values = values;
            listing.indent = indent;
            listing.headers = true;
            this._text += "\n";
            this._text += this.listing(listing);
            this._text += "\n" + indent;
            this._listing = null;
        }
        else if (this._command == "dot")
        {
            this._text += ".";
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

    word(text)
    {
        this._text += text;
        this._index += text.length;
    }

    tab(times)
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

    listing(options)
    {
        var opts = new Options(options);
        var fields = opts.getOpt("fields");
        var values = opts.getOpt("values");
        var indent = opts.getOpt("indent","");
        var listing = "";
        var lengths = {};

        fields.forEach((f) => {
            lengths[f] = 0;
        });

        var s;

        if (opts.getOpt("headers",false))
        {
            fields.forEach((f) => {
                if (f.length > lengths[f])
                {
                    lengths[f] = new Number(f.length);
                }
            });
        }

        values.forEach((item) => {

            fields.forEach((f) => {
                s = item.getOpt(f,"");

                if (s.length > lengths[f])
                {
                    lengths[f] = new Number(s.length);
                }
            });
        });

        const   spacing = opts.getOpt("spacing",2);

        if (opts.getOpt("headers",false))
        {
            fields.forEach((f) => {
                listing += indent;
                listing += f;
                listing += this.spaces((lengths[f] - f.length) + spacing);
            });
            listing += "\n";

            fields.forEach((f) => {
                listing += indent;
                s = "-";
                s = s.pad(lengths[f],'-');
                listing += s;
                listing += this.spaces((lengths[f] - s.length) + spacing);
            });
            listing += "\n";
        }

        values.forEach((item) => {
            fields.forEach((f) => {
                s = item.getOpt(f,"");
                listing += indent;
                listing += s;
                listing += this.spaces((lengths[f] - s.length) + spacing);
            });
            listing += "\n";
        });

        return(listing);
    }

    spaces(num)
    {
        var s = "";

        for (var i = 0; i < num; i++)
        {
            s += " ";
        }

        return(s);
    }

    getListing(name)
    {
        var listing = null;

        if (this.getOpt("listings",false))
        {
            const   listings = this.getOpt("listings");

            if (listings.hasOwnProperty(name))
            {
                listing = listings[name];
            }
        }

        return(listing);
    }
}

export {Formatter};
