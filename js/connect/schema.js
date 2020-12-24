/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "./options.js";
import {xpath} from "./xpath.js";
import {tools} from "./tools.js";

class Schema extends Options
{
    constructor()
    {
        super();

        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];

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

    setFields(fields)
    {
        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];

        var name;
        var type;
        var o;

        fields.forEach((f) =>
        {
            o = new Options();

            name = f["name"];
            o.setOpt("name",name);
            o.setOpt("espType",f["type"]);
            o.setOpt("isNumber",false);
            o.setOpt("isTime",false);
            o.setOpt("isDate",false);
            o.setOpt("isArray",false);

            if (f.hasOwnProperty("label"))
            {
                o.setOpt("label",f["label"]);
            }

            type = o.getOpt("espType");

            if (type == "utf8str")
            {
                o.setOpt("type","string");
            }
            else if (type == "int32" || type == "int64")
            {
                o.setOpt("type","int");
                o.setOpt("isNumber",true);
            }
            else if (type == "double" || type == "money")
            {
                o.setOpt("type","float");
                o.setOpt("isNumber",true);
            }
            else if (type == "array(dbl)")
            {
                o.setOpt("type","float");
                o.setOpt("isNumber",true);
                o.setOpt("isArray",true);
            }
            else if (type == "array(i32)" || type == "array(i64)")
            {
                o.setOpt("type","int");
                o.setOpt("isNumber",true);
                o.setOpt("isArray",true);
            }
            else if (type == "date")
            {
                o.setOpt("type","date");
                o.setOpt("isDate",true);
            }
            else if (type == "timestamp")
            {
                o.setOpt("type","datetime");
                o.setOpt("isTime",true);
            }
            else
            {
                o.setOpt("type",type);
            }

            o.setOpt("isKey",(f.hasOwnProperty("key") && f["key"] == "true"));

            this._fields.push(o);
            this._columns.push(name);

            this._fieldMap[name] = o;

            if (o["isKey"])
            {
                this._keyFields.push(o);
            }
        });
    }

    fromXml(xml)
    {
        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];

        var name;
        var type;
        var o;

        for (var f of xpath.getNodes(".//fields/field",xml))
        {
            o = new Options();

            name = f.getAttribute("name");

            o.setOpt("name",name);
            o.setOpt("espType",f.getAttribute("type"));
            o.setOpt("isNumber",false);
            o.setOpt("isTime",false);
            o.setOpt("isDate",false);
            o.setOpt("isArray",false);

            type = o.getOpt("espType");

            if (type == "utf8str")
            {
                o.setOpt("type","string");
            }
            else if (type == "int32" || type == "int64")
            {
                o.setOpt("type","int");
                o.setOpt("isNumber",true);
            }
            else if (type == "double" || type == "money")
            {
                o.setOpt("type","float");
                o.setOpt("isNumber",true);
            }
            else if (type == "array(dbl)")
            {
                o.setOpt("type","float");
                o.setOpt("isNumber",true);
                o.setOpt("isArray",true);
            }
            else if (type == "array(i32)" || type == "array(i64)")
            {
                o.setOpt("type","int");
                o.setOpt("isNumber",true);
                o.setOpt("isArray",true);
            }
            else if (type == "date")
            {
                o.setOpt("type","date");
                o.setOpt("isDate",true);
            }
            else if (type == "timestamp")
            {
                o.setOpt("type","datetime");
                o.setOpt("isTime",true);
            }
            else
            {
                o.setOpt("type",type);
            }

            o.setOpt("isKey",(f.getAttribute("key") == "true"));

            this._fields.push(o);
            this._columns.push(name);

            this._fieldMap[name] = o;

            if (o.getOpt("isKey",false))
            {
                this._keyFields.push(o);
            }
        }

        //console.log(JSON.stringify(this._fields));
    }

    fromJson(json)
    {
        this._fields = [];
        this._fieldMap = {};
        this._keyFields = [];
        this._columns = [];

        var name;
        var type;
        var o;

        json.fields.forEach((f) =>
        {
            o = new Options();

            name = f["@name"];
            o.setOpt("name",name);
            o.setOpt("espType",f["@type"]);
            o.setOpt("isNumber",false);
            o.setOpt("isTime",false);
            o.setOpt("isDate",false);
            o.setOpt("isArray",false);

            type = o.getOpt("espType");

            if (type == "utf8str")
            {
                o.setOpt("type","string");
            }
            else if (type == "int32" || type == "int64")
            {
                o.setOpt("type","int");
                o.setOpt("isNumber",true);
            }
            else if (type == "double" || type == "money")
            {
                o.setOpt("type","float");
                o.setOpt("isNumber",true);
            }
            else if (type == "array(dbl)")
            {
                o.setOpt("type","float");
                o.setOpt("isNumber",true);
                o.setOpt("isArray",true);
            }
            else if (type == "array(i32)" || type == "array(i64)")
            {
                o.setOpt("type","int");
                o.setOpt("isNumber",true);
                o.setOpt("isArray",true);
            }
            else if (type == "date")
            {
                o.setOpt("type","date");
                o.setOpt("isDate",true);
            }
            else if (type == "timestamp")
            {
                o.setOpt("type","datetime");
                o.setOpt("isTime",true);
            }
            else
            {
                o.setOpt("type",type);
            }

            o.setOpt("isKey",(f.hasOwnProperty("@key") && f["@key"] == "true"));

            this._fields.push(o);
            this._columns.push(name);

            this._fieldMap[name] = o;

            if (o.getOpt("isKey",false))
            {
                this._keyFields.push(o);
            }
        });
    }

    getField(name)
    {
        var f = (this._fieldMap.hasOwnProperty(name)) ? this._fieldMap[name] : null;
        return(f);
    }

    getFields(name)
    {
        return(this._fields)
    }

    getFieldDescriptors(name)
    {
        var a = [];
        this._fields.forEach((f) => {
            a.push(f.getOpts());
        });
        return(a);
    }

    getKeyFields()
    {
        return(this._keyFields)
    }

    getColumnFields()
    {
        var fields = [];

        for (var f of this._fields)
        {
            if (f.getOpt("isKey",false) == false)
            {
                fields.push(f);
            }
        }

        return(fields);
    }

    getKeyFieldNames(name)
    {
        var names = [];
        var fields = this.getKeyFields();
        if (fields != null)
        {
            for (var f of fields)
            {
                names.push(f.getOpt("name"));
            }
        }
        return(names);
    }

    toString()
    {
        return(tools.stringify(this._fieldMap));
    }

    createDataFromCsv(csv,options)
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

        var filter = (tools.supports(delegate,"filter")) ? delegate["filter"] : null;
        var supplement = (tools.supports(delegate,"supplement")) ? delegate["supplement"] : null;

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
                        o[field.getOpt("name")] = a[j];
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
                        o[field.getOpt("name")] = a[j];
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
}

export {Schema};
