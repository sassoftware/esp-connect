/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {tools} from "./tools.js";

class JsonEncoder
{
    constructor(o)
    {
        this._size = this.size(o) * 2;
        this._data = new ArrayBuffer(this._size);
        this._view = new DataView(this._data);
        this._index = 0;

        this._debug = false;

        Object.defineProperty(this,"data", {
            get() {return(this._data);}
        });

        this.encode(o);
    }

    encode(o,name)
    {
        if (o instanceof Object)
        {
            if (Array.isArray(o))
            {
                this.writeName(name);
                this.beginArray();
                o.forEach(item =>
                {
                    this.encode(item);
                });
                this.endArray();
            }
            else if (o instanceof ArrayBuffer)
            {
                this.writeBuffer(o,name);
            }
            else
            {
                this.writeName(name);
                this.beginObject();
                for (var x in o)
                {
                    this.encode(o[x],x);
                }
                this.endObject();
            }
        }
        else
        {
            this.writeValue(o,name);
        }
    }

    writeValue(value,name)
    {
        var type = typeof value;

        if (type == "string")
        {
            this.writeString(value,name);
        }
        else if (type == "number")
        {
            this.writeI32(value,name);
        }
        else if (type == "bigint")
        {
            this.writeI64(value,name);
        }
        else if (type == "boolean")
        {
            this.writeString(value ? "true" : "false",name);
        }
    }

    writeString(value,name)
    {
        this.writeName(name);
        this.writeType('S');
        this.writeLength(value.length);

        if (this._debug)
        {
            var tmp = (value.length > 50) ? (value.substr(0,20) + "...") : value;
            console.log("index: " + this._index + " write string: " + tmp);
        }

        for (var i = 0; i < value.length; i++)
        {
            this._view.setUint8(this._index,value.charCodeAt(i));
            this._index++;
        }
    }

    writeI32(value,name)
    {
        this.writeName(name);
        this.writeType('l');

        if (this._debug)
        {
            console.log("index: " + this._index + " write i32: " + value);
        }
        this._view.setInt32(this._index,value);
        this._index += 4;
    }

    writeI64(value,name)
    {
        this.writeName(name);
        this.writeType('L');

        if (this._debug)
        {
            console.log("index: " + this._index + " write i64: " + value);
        }
        this._view.setBigInt64(this._index,value);
        this._index += 8;
    }

    writeBuffer(value,name)
    {
        this.writeName(name);
        this.writeType('B');
        this.writeLength(value.byteLength);

        var dv = new DataView(value);

        for (var i = 0; i < value.byteLength; i++)
        {
            this._view.setUint8(this._index,dv.getUint8(i));
            this._index++;
        }
    }

    writeName(name)
    {
        if (name != null && name.length > 0)
        {
            this.writeLength(name.length);

            if (this._debug)
            {
                console.log("index: " + this._index + " write name: " + name);
            }
            for (var i = 0; i < name.length; i++)
            {
                this._view.setUint8(this._index,name.charCodeAt(i));
                this._index++;
            }
        }
    }

    writeType(type)
    {
        if (this._debug)
        {
            console.log("index: " + this._index + " write type: " + type);
        }
        this._view.setUint8(this._index,type.charCodeAt());
        this._index++;
    }

    writeLength(length)
    {
        if (this._debug)
        {
            console.log("index: " + this._index + " write length: " + length);
        }
        this._view.setUint32(this._index,length);
        this._index += 4;
    }

    beginObject()
    {
        this.writeType('{');
    }

    endObject()
    {
        this.writeType('}');
    }

    beginArray()
    {
        this.writeType('[');
    }

    endArray()
    {
        this.writeType(']');
    }

    size(object)
    {
        var bytes = 0;
        var type = typeof object;

        if (type == "string")
        {
            bytes = object.length * 2;
        }
        else if (type == "number")
        {
            bytes = 8;
        }
        else if (type == "bigint")
        {
            bytes = 8;
        }
        else if (type == "boolean")
        {
            bytes = 4;
        }
        else if (type == "object")
        {
            if (object instanceof ArrayBuffer)
            {
                bytes = object.byteLength;
            }
            else
            {
                for (var x in object)
                {
                    bytes += this.size(object[x]);
                }
            }
        }
        else if (type == "array")
        {
            object.forEach(item=>
            {
                bytes += this.size(item);
            });
        }
        else
        {
            throw("unknown type: " + type);
        }

        bytes += 5;

        return(bytes);
    }

    dump()
    {
        var braces = 0;
        var c;

        for (var i = 0; i < this._data.byteLength; i++)
        {
            c = String.fromCharCode(this._view.getUint8(i));
            if (c == '{')
            {
                braces++;
            }

            console.log(i + " :: " + this._view.getUint8(i) + " ::: " + c);

            if (c == '}')
            {
                braces--;

                if (braces == 0)
                {
                    break;
                }
            }
        }
    }
}

class JsonDecoder
{
    constructor(data)
    {
        this._data = new DataView(data,0);
        this._size = this._data.buffer.byteLength;
        this._index = 0;
        this._o = null;

        this._debug = false;

        this.addTo();
    }

    addTo(name,to)
    {
        var type = this.getType(true);

        if (type == '{')
        {
            this.addObject(name,to);
        }
        else if (type == '[')
        {
            this.addArray(name,to);
        }
        else
        {
            this.addValue(name,to);
        }
    }

    addObject(name,to)
    {
        if (this._debug)
        {
            console.log("index: " + this._index + " add object: " + name + " to " + to);
        }

        var o = {};

        if (this._o == null)
        {
            this._o = o;
        }
        else if (Array.isArray(to))
        {
            to.push(o);
        }
        else
        {
            to[name] = o;
        }

        var length;
        var name;
        var value;
        var type;

        while (this._index < this._size)
        {
            type = this.getType(false);

            if (type == '}')
            {
                this._index++;
                break;
            }
            else
            {
                length = this.getLength();
                name = this.getString(length);
                type = this.getType();

                if (type == '{')
                {
                    this.addTo(name,o);
                }
                else if (type == '[')
                {
                    this.addTo(name,o);
                }
                else
                {
                    this.addValue(name,o);
                }
            }
        }

        if (this._debug)
        {
            console.log("index: " + this._index + " add object: " + name + " to " + to + " complete");
        }
    }

    addArray(name,to)
    {
        if (this._debug)
        {
            console.log("index: " + this._index + " add array: " + name + " to " + to);
        }

        var a = [];

        if (this._o == null)
        {
            this._o = a;
        }
        else if (Array.isArray(to))
        {
            to.push(a);
        }
        else
        {
            to[name] = a;
        }

        var type;

        while (this._index < this._size)
        {
            type = this.getType(false);

            if (type == '[')
            {
                this.addTo("",a);
            }
            else if (type == ']')
            {
                this._index++;
                break;
            }
            else if (type == '{')
            {
                this.addTo("",a);
            }
            else
            {
                this.addValue("",a);
            }
        }

        if (this._debug)
        {
            console.log("index: " + this._index + " add array: " + name + " to " + to + " complete");
        }
    }

    addValue(name,to)
    {
        if (this._debug)
        {
            console.log("index: " + this._index + " add value: " + name + " to " + to);
        }

        var type = this.getType(true);
        var value = null;

        if (type == 'S')
        {
            var length = this.getLength();
            if (length > 0)
            {
                if (this._debug)
                {
                    console.log("index: " + this._index + " get string of " + length + " bytes");
                }

                var data = new Uint8Array(this._data.buffer,this._index,length);
                value = data.reduce(
                    function (data,byte) {
                        return(data + String.fromCharCode(byte));
                        },
                    '');

                this._index += length;
            }
        }
        else if (type == 'B')
        {
            var length = this.getLength();
            if (length > 0)
            {
                if (this._debug)
                {
                    console.log("index: " + this._index + " get blob of " + length + " bytes");
                }

                value = new Uint8Array(this._data.buffer,this._index,length);

                if (tools.isNode)
                {
                    value = Buffer.from(value).toString("base64");
                }
                else
                {
                    value = btoa(value.reduce(
                        function (data,byte) {
                            return(data + String.fromCharCode(byte));
                            },
                        ''));
                }
                this._index += length;
            }
        }
        else if (type == 'l')
        {
            value = this.getI32();
        }
        else if (type == 'L')
        {
            value = this.getI64();
        }
        else if (type == 'D')
        {
            value = this.getDouble();
        }

        if (value != null)
        {
            if (Array.isArray(to))
            {
                to.push(value);
            }
            else
            {
                to[name] = value;
            }
        }
    }

    getType(increment)
    {
        var type = String.fromCharCode(this._data.getInt8(this._index));

        if (this._debug)
        {
            console.log("index: " + this._index + " get type: " + type);
        }

        if (increment)
        {
            this._index++;
        }
        return(type);
    }

    getLength()
    {
        var length = this._data.getInt32(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get length: " + length);
        }

        this._index += 4;
        return(length);
    }

    getString(length)
    {
        var s = String.fromCharCode.apply(null,new Uint8Array(this._data.buffer,this._index,length));

        if (this._debug)
        {
            console.log("index: " + this._index + " get string: " + s);
        }

        this._index += length;
        return(s);
    }

    getI32()
    {
        var value = this._data.getInt32(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get i32: " + value);
        }

        this._index += 4;
        return(value);
    }

    getI64()
    {
        var value = this._data.getBigInt64(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get i64: " + value);
        }

        this._index += 8;
        return(value);
    }

    getDouble()
    {
        var value = this._data.getFloat64(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get double: " + value);
        }

        this._index += 8;

        return(value);
    }
}

var _api =
{
    encode:function(o)
    {
        var encoder = new JsonEncoder(o);
        return(encoder.data);
    },

    decode:function(data)
    {
        var data = new JsonDecoder(data);
        return(data._o);
    }
};

export {_api as codec};
