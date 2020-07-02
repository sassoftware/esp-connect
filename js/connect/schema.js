/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "./xpath",
    "./tools",
    "./options"
], function(xpath,tools,Options)
{
    function
    Schema()
    {
        Options.call(this);

        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];
        this._delegates = [];

        Object.defineProperty(this,"size", {
            get() {
                return(this._fields.length);
            }
        });

        Object.defineProperty(this,"numkeys",{
            get() {
                return(this._keyFields.length);
            }
        });
    }

    Schema.prototype = Object.create(Options.prototype);
    Schema.prototype.constructor = Schema;

    Schema.prototype.addDelegate =
    function(delegate)
    {
        tools.addTo(this._delegates,delegate);

        if (this.size > 0)
        {
            if (tools.supports(d,"schemaLoaded"))
            {
                d.schemaLoaded(this);
            }
        }
    }

    Schema.prototype.setFields =
    function(fields)
    {
        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];

        var name;
        var o;

        fields.forEach((f) =>
        {
            o = {};

            name = f["name"];
            o["name"] = name;
            o["espType"] = f["type"];
            o["isNumber"] = false;
            o["isTime"] = false;
            o["isDate"] = false;
            o["isArray"] = false;

            if (f.hasOwnProperty("label"))
            {
                o["label"] = f["label"];
            }

            if (o["espType"] == "utf8str")
            {
                o["type"] = "string";
            }
            else if (o["espType"] == "int32" || o["espType"] == "int64")
            {
                o["type"] = "int";
                o["isNumber"] = true;
            }
            else if (o["espType"] == "double" || o["espType"] == "money")
            {
                o["type"] = "float";
                o["isNumber"] = true;
            }
            else if (o["espType"] == "array(dbl)")
            {
                o["type"] = "float";
                o["isNumber"] = true;
                o["isArray"] = true;
            }
            else if (o["espType"] == "array(i32)" || o["espType"] == "array(i64)")
            {
                o["type"] = "int";
                o["isNumber"] = true;
                o["isArray"] = true;
            }
            else if (o["espType"] == "date")
            {
                o["type"] = "date";
                o["isDate"] = true;
            }
            else if (o["espType"] == "timestamp")
            {
                o["type"] = "datetime";
                o["isTime"] = true;
            }
            else
            {
                o["type"] = o["espType"];
            }

            o["isKey"] = (f.hasOwnProperty("key") && f["key"] == "true");

            this._fields.push(o);
            this._columns.push(name);

            this._fieldMap[name] = o;

            if (o["isKey"])
            {
                this._keyFields.push(o);
            }
        });
    }

    Schema.prototype.fromXml =
    function(xml)
    {
        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];

        var name;
        var o;

        for (var f of xpath.getNodes(".//fields/field",xml))
        {
            o = {};

            name = f.getAttribute("name");
            o["name"] = name;
            o["espType"] = f.getAttribute("type");
            o["isNumber"] = false;
            o["isTime"] = false;
            o["isDate"] = false;
            o["isArray"] = false;

            if (o["espType"] == "utf8str")
            {
                o["type"] = "string";
            }
            else if (o["espType"] == "int32" || o["espType"] == "int64")
            {
                o["type"] = "int";
                o["isNumber"] = true;
            }
            else if (o["espType"] == "double" || o["espType"] == "money")
            {
                o["type"] = "float";
                o["isNumber"] = true;
            }
            else if (o["espType"] == "array(dbl)")
            {
                o["type"] = "float";
                o["isNumber"] = true;
                o["isArray"] = true;
            }
            else if (o["espType"] == "array(i32)" || o["espType"] == "array(i64)")
            {
                o["type"] = "int";
                o["isNumber"] = true;
                o["isArray"] = true;
            }
            else if (o["espType"] == "date")
            {
                o["type"] = "date";
                o["isDate"] = true;
            }
            else if (o["espType"] == "timestamp")
            {
                o["type"] = "datetime";
                o["isTime"] = true;
            }
            else
            {
                o["type"] = o["espType"];
            }

            o["isKey"] = (f.getAttribute("key") == "true");

            this._fields.push(o);
            this._columns.push(name);

            this._fieldMap[name] = o;

            if (o["isKey"])
            {
                this._keyFields.push(o);
            }
        }

        //console.log(JSON.stringify(this._fields));

        for (var d of this._delegates)
        {
            if (tools.supports(d,"schemaLoaded"))
            {
                d.schemaLoaded(this);
            }
        }
    }

    Schema.prototype.fromJson =
    function(json)
    {
        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];

        var name;
        var o;

        json.fields.forEach((f) =>
        {
            o = {};

            name = f["@name"];
            o["name"] = name;
            o["espType"] = f["@type"];
            o["isNumber"] = false;
            o["isTime"] = false;
            o["isDate"] = false;
            o["isArray"] = false;

            if (o["espType"] == "utf8str")
            {
                o["type"] = "string";
            }
            else if (o["espType"] == "int32" || o["espType"] == "int64")
            {
                o["type"] = "int";
                o["isNumber"] = true;
            }
            else if (o["espType"] == "double" || o["espType"] == "money")
            {
                o["type"] = "float";
                o["isNumber"] = true;
            }
            else if (o["espType"] == "array(dbl)")
            {
                o["type"] = "float";
                o["isNumber"] = true;
                o["isArray"] = true;
            }
            else if (o["espType"] == "array(i32)" || o["espType"] == "array(i64)")
            {
                o["type"] = "int";
                o["isNumber"] = true;
                o["isArray"] = true;
            }
            else if (o["espType"] == "date")
            {
                o["type"] = "date";
                o["isDate"] = true;
            }
            else if (o["espType"] == "timestamp")
            {
                o["type"] = "datetime";
                o["isTime"] = true;
            }
            else
            {
                o["type"] = o["espType"];
            }

            o["isKey"] = (f.hasOwnProperty("@key") && f["@key"] == "true");

            this._fields.push(o);
            this._columns.push(name);

            this._fieldMap[name] = o;

            if (o["isKey"])
            {
                this._keyFields.push(o);
            }
        });

        for (var d of this._delegates)
        {
            if (tools.supports(d,"schemaLoaded"))
            {
                d.schemaLoaded(this);
            }
        }
    }

    Schema.prototype.getField =
    function(name)
    {
        var f = (this._fieldMap.hasOwnProperty(name)) ? this._fieldMap[name] : null;
        return(f);
    }

    Schema.prototype.getFields =
    function(name)
    {
        return(this._fields)
    }

    Schema.prototype.getKeyFields =
    function()
    {
        return(this._keyFields)
    }

    Schema.prototype.getColumnFields =
    function()
    {
        var fields = [];

        for (var f of this._fields)
        {
            if (f["isKey"] == false)
            {
                fields.push(f);
            }
        }

        return(fields);
    }

    Schema.prototype.getKeyFieldNames =
    function(name)
    {
        var names = [];
        var fields = this.getKeyFields();
        if (fields != null)
        {
            for (f of fields)
            {
                names.push(f["name"]);
            }
        }
        return(names);
    }

    Schema.prototype.toString =
    function()
    {
        return(tools.stringify(this._fieldMap));
    }

    Schema.prototype.createDataFromCsv =
    function(csv,options)
    {
        var opts = new Options(options);
        var delegate = opts.getOpt("delegate");
        var data = [];
        var lines = csv.split("\n");
        var fields = this.getFields();
        var headers = null;
        var quotes = 0;
        var incomment = false;
        var i = 0;
        var field;
        var index;
        var prev;
        var word;
        var c;
        var s;
        var a;
        var o;

        if (opts.getOpt("header",false))
        {
            s = lines[i].trim();
            headers = s.split(",");
            i++;
        }

        var opcodes = opts.getOpt("opcodes",false);
        var flags = opts.getOpt("flags",false);

        var filter = (delegate != null && tools.supports(delegate,"filter")) ? delegate["filter"] : null;
        var supplement = (delegate != null && tools.supports(delegate,"supplement")) ? delegate["supplement"] : null;

        while (i < lines.length)
        {
            s = lines[i].trim();

            if (s.length == 0)
            {
                i++;
                continue;
            }

            if (s == "/*")
            {
                incomment = true;
                i++;
                continue;
            }
            else if (incomment)
            {
                if (s == "*/")
                {
                    incomment = false;
                    i++;
                    continue;
                }
            }

            if (incomment)
            {
                i++;
                continue;
            }

            a = [];
            word = "";

            for (var idx = 0; idx < s.length; idx++)
            {
                c = s[idx];

                if (c == ',')
                {
                    if (quotes > 0)
                    {
                        word += c;
                    }
                    else
                    {
                        a.push(word);
                        word = "";
                    }
                }
                else if (c == '\"')
                {
                    if (prev == '\\')
                    {
                        word += c;
                    }
                    else
                    {
                        quotes ^= 1;
                    }
                }
                else if (c == '\\')
                {
                    if (prev == '\\')
                    {
                        word += c;
                    }
                }
                else
                {
                    word += c;
                }

                prev = c;
            }

            if (word.length > 0)
            {
                a.push(word);
            }

            o = {};

            if (headers != null)
            {
                for (var j = 0; j < a.length; j++)
                {
                    if ((field = this.getField(headers[j])) != null)
                    {
                        o[field["name"]] = a[j];
                    }
                }
            }
            else
            {
                index = 0;

                for (var j = 0; j < a.length; j++)
                {
                    if (opcodes && j == 0)
                    {
                        s = a[j].trim().toLowerCase();

                        if (s == "i" || 
                            s == "u" || 
                            s == "p" || 
                            s == "d")
                        {
                            if (s == "u")
                            {
                                o["@opcode"] = "update";
                            }
                            else if (s == "p")
                            {
                                o["@opcode"] = "upsert";
                            }
                            else if (s == "d")
                            {
                                o["@opcode"] = "delete";
                            }
                        }

                        continue;
                    }

                    if (flags && j == 1)
                    {
                        s = a[j].trim().toLowerCase();
                        continue;
                    }

                    if (index < fields.length)
                    {
                        field = fields[index];
                        o[field["name"]] = a[j];
                        index++;
                    }
                }
            }

            i++;

            if (filter != null && filter(o) == false)
            {
                continue;
            }

            if (supplement != null)
            {
                supplement(o);
            }

            data.push(o);
        }

        return(data);
    }

    return(Schema);
});
