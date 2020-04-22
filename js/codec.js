/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
], function()
{
    var _node = null;

    try
    {
        _node = require("nodejs-websocket");
    }
    catch (exception)
    {
    }

    function
    JsonEncoder(o)
    {
        var size = this.size(o);
        size *= 2;

        this._data = new ArrayBuffer(size);
        this._view = new DataView(this._data);
        this._index = 0;

        this._debug = false;

        Object.defineProperty(this,"data", {
            get() {return(this._data);}
        });

        this.encode(o);
    }

    JsonEncoder.prototype.encode =
    function(o,name)
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

    JsonEncoder.prototype.writeValue =
    function(value,name)
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

    /*
    JsonEncoder.prototype.writeValue =
    function(value,name)
    {
        var s = new String(value);
        this.writeName(name);
        this.writeType('S');
        this.writeLength(s.length);

        if (this._debug)
        {
            var tmp = (value.length > 50) ? (value.substr(0,20) + "...") : s;
            console.log("index: " + this._index + " write string: " + tmp);
        }

        for (var i = 0; i < s.length; i++)
        {
            this._view.setUint8(this._index,s.charCodeAt(i));
            this._index++;
        }
    }
    */

    JsonEncoder.prototype.writeString =
    function(value,name)
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

    JsonEncoder.prototype.writeI32 =
    function(value,name)
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

    JsonEncoder.prototype.writeI64 =
    function(value,name)
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

    JsonEncoder.prototype.writeBuffer =
    function(value,name)
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

    JsonEncoder.prototype.writeName =
    function(name)
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

    JsonEncoder.prototype.writeType =
    function(type)
    {
        if (this._debug)
        {
            console.log("index: " + this._index + " write type: " + type);
        }
        this._view.setUint8(this._index,type.charCodeAt());
        this._index++;
    }

    JsonEncoder.prototype.writeLength =
    function(length)
    {
        if (this._debug)
        {
            console.log("index: " + this._index + " write length: " + length);
        }
        this._view.setUint32(this._index,length);
        this._index += 4;
    }

    JsonEncoder.prototype.beginObject =
    function()
    {
        this.writeType('{');
    }

    JsonEncoder.prototype.endObject =
    function()
    {
        this.writeType('}');
    }

    JsonEncoder.prototype.beginArray =
    function()
    {
        this.writeType('[');
    }

    JsonEncoder.prototype.endArray =
    function()
    {
        this.writeType(']');
    }

    JsonEncoder.prototype.size =
    function(object)
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

        return(bytes);
    }

    JsonEncoder.prototype.dump =
    function()
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

    function
    JsonDecoder(data)
    {
        this._data = new DataView(data,0);
        this._size = this._data.buffer.byteLength;
        this._index = 0;
        this._o = null;

        this._debug = false;

        this.addTo();
    }

    JsonDecoder.prototype.addTo =
    function(name,to)
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

    JsonDecoder.prototype.addObject =
    function(name,to)
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

    JsonDecoder.prototype.addArray =
    function(name,to)
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

    JsonDecoder.prototype.addValue =
    function(name,to)
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

                if (_node != null)
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

    JsonDecoder.prototype.getType =
    function(increment)
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

    JsonDecoder.prototype.getLength =
    function()
    {
        var length = this._data.getInt32(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get length: " + length);
        }

        this._index += 4;
        return(length);
    }

    JsonDecoder.prototype.getString =
    function(length)
    {
        var s = String.fromCharCode.apply(null,new Uint8Array(this._data.buffer,this._index,length));

        if (this._debug)
        {
            console.log("index: " + this._index + " get string: " + s);
        }

        this._index += length;
        return(s);
    }

    JsonDecoder.prototype.getI32 =
    function()
    {
        var value = this._data.getInt32(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get i32: " + value);
        }

        this._index += 4;
        return(value);
    }

    JsonDecoder.prototype.getI64 =
    function()
    {
        var value = this._data.getBigInt64(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get i64: " + value);
        }

        this._index += 8;
        return(value);
    }

    JsonDecoder.prototype.getDouble =
    function()
    {
        var value = this._data.getFloat64(this._index);

        if (this._debug)
        {
            console.log("index: " + this._index + " get double: " + value);
        }

        this._index += 8;

        return(value);
    }

    var _support =
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

    return(_support);
});
