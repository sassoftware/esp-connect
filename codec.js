/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

class Bitset
{
    constructor(size)
    {
        this._size = size;
        this._bits = new Uint8Array(size);
    }

    get value()
    {
        var value = 0;

        for (var i = 0; i < this._size; i++)
        {
            if (this._bits[i] == 1)
            {
                //value |= (1 << i);
                value |= (1 << (this._size - 1 - i));
            }
        }

        return(value);
    }

    set(index)
    {
        if (index < this._size)
        {
            this._bits[this._size - 1 - index] = 1;
        }
    }

    unset(index)
    {
        if (index < this._size)
        {
            this._bits[index] = 0;
        }
    }

    setBits(value)
    {
        for (var i = this._size - 1; i >= 0; i--)
        {
            if (value & (1 << i))
            {
                //this.set(this._size - 1 - i);
                this.set(i);
            }
        }
    }

    to_string()
    {
        var s = "";

        for (var i = 0; i < this._size; i++)
        {
            if (this._bits[i] == 0)
            {
                s += "0";
            }
            else
            {
                s += "1";
            }
        }

        return(s);
    }
}

class JsonEncoder
{
    constructor(o)
    {
        this._size = this.size(o) * 2;
        this._data = new ArrayBuffer(this._size);
        this._view = new DataView(this._data);
        this._index = 0;

        this._debug = false;

        this.encode(o);
    }

    get data()
    {
        var data = (this._index < this._size) ? this._data.slice(0,this._index) : this_data;
        return(data);
    }

    encode(o,name)
    {
        if (o instanceof Object)
        {
            if (Array.isArray(o))
            {
                if (name != null)
                {
                    this.writeString(name);
                }

                this.beginArray();
                const self = this;
                o.forEach(item =>
                {
                    self.encode(item);
                });
                this.endArray();
            }
            else if (o instanceof ArrayBuffer)
            {
                this.writeBuffer(o,name);
            }
            else
            {
                if (name != null)
                {
                    this.writeString(name);
                }
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

    beginArray()
    {
        var bits = new Bitset(8);
        bits.setBits(31);
        bits.set(7);
        this._view.setUint8(this._index,bits.value);
        this._index += 1;
    }

    endArray()
    {
        this.writeStopCode();
    }

    beginObject()
    {
        var bits = new Bitset(8);
        bits.setBits(31);
        bits.set(5);
        bits.set(7);
        this._view.setUint8(this._index,bits.value);
        this._index += 1;
    }

    endObject()
    {
        this.writeStopCode();
    }

    writeStopCode()
    {
        var bits = new Bitset(8);
        bits.setBits(31);

        bits.set(5);
        bits.set(6);
        bits.set(7);

        this._view.setUint8(this._index,bits.value);
        this._index += 1;
    }

    writeValue(value,name)
    {
        if (isNaN(value) == false)
        {
            if (Number.isInteger(value))
            {
                //this.writeI64(value,name);
                this.writeI32(value,name);
            }
            else
            {
                this.writeDouble(value,name);
            }
        }
        else
        {
            var type = typeof value;

            if (type == "string")
            {
                this.writeString(value,name);
            }
            else if (type == "boolean")
            {
                this.writeBool(value,name);
            }
        }
    }

    writeString(value,name)
    {       
        if (name != null && name.length > 0)
        {
            this.writeString(name,null);
        }
        
        var info = 0;
        
        if (value.length < 24)
        {
            var bits = new Bitset(8);
            bits.setBits(value.length);
            bits.set(5);
            bits.set(6);
            this._view.setInt8(this._index,bits.value);
            this._index += 1;
        }
        else
        {
            var bits = new Bitset(8);
            bits.set(1);
            bits.set(3);
            bits.set(4);
            bits.set(5);
            bits.set(6);
                
            this._view.setInt8(this._index,bits.value);
            this._index += 1;
            this._view.setInt32(this._index,value.length);
            this._index += 4;
        }

        for (var i = 0; i < value.length; i++)
        {
            this._view.setUint8(this._index,value.charCodeAt(i));
            this._index++;
        }
    }

    writeI8(value,name)
    {
        if (name != null && name.length > 0)
        {
            this.writeString(name,null);
        }

        var info = 0;

        if (value.length < 24)
        {
            var bits = new Bitset(8);
            bits.setBits(value.length);
            bits.set(5);
            bits.set(6);
            this._view.setInt8(this._index,bits.value);
            this._index += 1;
        }
        else
        {
            var bits = new Bitset(8);
            bits.set(1);
            bits.set(3);
            bits.set(4);
            bits.set(5);
            bits.set(6);

            this._view.setInt8(this._index,bits.value);
            this._index += 1;
            this._view.setInt32(this._index,value.length);
            this._index += 4;
        }

        if (value >= 24)
        {
            var bits = new Bitset(8);
            bits.set(3);
            bits.set(4);

            if (negative)
            {
                bits.set(5);
            }

            this._view.setInt8(this._index,bits.value);
        }
        else if (negative)
        {
            var bits = new Bitset(8);
            bits.setBits(value);
            bits.set(5);

            this._view.setInt8(this._index,bits.value);
        }
        else
        {
            this._view.setInt8(this._index,value);
        }

        this._index += 1;
    }

    writeI8(value,name)
    {
        if (name != null && name.length > 0)
        {
            this.writeString(name,null);
        }

        var negative = value < 0;

        if (negative)
        {
            value = -1 - value;
        }

        if (value >= 24)
        {
            var bits = new Bitset(8);
            bits.set(3);
            bits.set(4);

            if (negative)
            {
                bits.set(5);
            }

            this._view.setInt8(this._index,bits.value);
        }
        else if (negative)
        {
            var bits = new Bitset(8);
            bits.setBits(value);
            bits.set(5);

            this._view.setInt8(this._index,bits.value);
        }
        else
        {
            this._view.setInt8(this._index,value);
        }

        this._index += 1;
    }

    writeI32(value,name)
    {
        if (name != null && name.length > 0)
        {
            this.writeString(name,null);
        }

        var negative = value < 0;

        if (negative)
        {
            value = -1 - value;
        }

        var bits = new Bitset(8);

        bits.set(1);
        bits.set(3);
        bits.set(4);

        if (negative)
        {
            bits.set(5);
        }

        this._view.setInt8(this._index,bits.value);
        this._index += 1;
        this._view.setInt32(this._index,value);
        this._index += 4;
    }

    writeI64(value,name)
    {
        if (name != null && name.length > 0)
        {
            this.writeString(name,null);
        }

        var negative = value < 0;

        if (negative)
        {
            value = -1 - value;
        }

        var bits = new Bitset(8);
        bits.set(0);
        bits.set(1);
        bits.set(3);
        bits.set(4);

        if (negative)
        {
            bits.set(5);
        }

        this._view.setInt8(this._index,bits.value);
        this._index += 1;

        this._view.setBigInt64(this._index,value);
        this._index += 8;
    }

    writeDouble(value,name)
    {
        if (name != null && name.length > 0)
        {
            this.writeString(name,null);
        }

        var bits = new Bitset(8);
        bits.set(0);
        bits.set(1);
        bits.set(3);
        bits.set(4);

        bits.set(5);
        bits.set(6);
        bits.set(7);

        this._view.setUint8(this._index,bits.value);
        this._index += 1;

        this._view.setFloat64(this._index,value);
        this._index += 8;
    }

    writeBuffer(value,name)
    {
        if (name != null && name.length > 0)
        {
            this.writeString(name,null);
        }

        var bits = new Bitset(8);

        bits.set(1);
        bits.set(3);
        bits.set(4);
        bits.set(6);

        this._view.setUint8(this._index,bits.value);
        this._index += 1;

        var dv = new DataView(value);

        this._view.setUint32(this._index,dv.byteLength);

        for (var i = 0; i < dv.byteLength; i++)
        {
            this._view.setUint8(this._index,dv.getUint8(i));
            this._index += 1;
        }
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

        var type;
        var info;

        var header = this.getHeader();
        this.addTo(header.type,header.info,null);
    }

    addTo(type,info,to)
    {
        if (type == 5)
        {
            this.addObject(info,to);
        }
        else if (type == 4)
        {
            this.addArray(info,to);
        }
        else
        {
            this.addValue(type,info,"",to);
        }
    }

    addArray(info,to)
    {
        if (this._o == null)
        {
            this._o = [];
            to = this._o;
        }

        var size = (info != 31) ? this.getUnsigned(info) : null;
        var header;

        while ((header = this.getHeader()) != null)
        {
            if (size == null)
            {
                if (header.type == 7 && header.info == 31)
                {
                    break;
                }
            }

            if (header.type == 4)
            {
                if (Array.isArray(to))
                {
                    var o = [];
                    this.addTo(header.type,header.info,o);
                    to.push(o);
                }
            }
            else if (header.type == 5)
            {
                if (Array.isArray(to))
                {
                    var o = {};
                    this.addTo(header.type,header.info,o);
                    to.push(o);
                }
            }
            else
            {
                this.addTo(header.type,header.info,to);
            }

            if (size != null)
            {
                if (--size == 0)
                {
                    break;
                }
            }
        }
    }

    addObject(info,to)
    {
        if (this._o == null)
        {
            this._o = {};
            to = this._o;
        }

        var size = (info != 31) ? this.getUnsigned(info) : null;
        var name = null;
        var header;

        while ((header = this.getHeader()) != null)
        {
            if (size == null)
            {
                if (header.type == 7 && header.info == 31)
                {
                    break;
                }
            }

            if (header.type != 3)
            {
                console.log("====== bad");
                break;
            }

            name = this.getString(header.info);

            header = this.getHeader();

            if (header.type == 4)
            {
                to[name] = [];
                this.addTo(header.type,header.info,to[name]);
            }
            else if (header.type == 5)
            {
                to[name] = {}
                this.addTo(header.type,header.info,to[name]);
            }
            else
            {
                this.addValue(header.type,header.info,name,to);
            }

            if (size != null)
            {
                if (--size == 0)
                {
                    break;
                }
            }
        }
    }

    addValue(type,info,name,to)
    {
        var value = null;

        if (type == 0 || type == 1 || type == 2 || type == 3 || type == 7)
        {
            if (type == 0)
            {
                value = this.getUnsigned(info);
            }
            else if (type == 1)
            {
                var tmp = this.getUnsigned(info);
                var value = BigInt(-1) - tmp;
            }
            else if (type == 2)
            {
                var size = this.getUnsigned(info);

                if (size > 0)
                {
                    value = new Uint8Array(this._data.buffer,this._index,size);

                    if (_api._isNode)
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

                    this._index += size;
                }
            }
            else if (type == 3)
            {
                value = this.getString(info);
            }
            else if (type == 7)
            {
                value = this.getDouble(info);
            }
        }

        if (value != null)
        {
            if (this._o == null)
            {
                this._o = value;
            }
            else if (Array.isArray(to))
            {
                to.push(value);
            }
            else
            {
                to[name] = value;
            }
        }
    }

    getHeader()
    {
        if (this._index >= this._size)
        {
            return(null);
        }

        var header = this._data.getUint8(this._index);
        var o = {};
        o.type = (header & 0xe0) >> 5;
        o.info = (header & 0x1f);

        /*
        console.log(JSON.stringify(o));
        */

        this._index++;

        return(o);
    }

    getString(info)
    {
        var s = null;
        var size = this.getUnsigned(info);

        if (size > 0)
        {
            var data = new Uint8Array(this._data.buffer,this._index,size);
            s = data.reduce(
                function (data,byte) {
                    return(data + String.fromCharCode(byte));
                    },
                '');

            this._index += size;
        }

        return(s);
    }

    /*
    getString(info)
    {
        var s = null;
        var size = this.getUnsigned(info);

        if (size > 0)
        {
            s = String.fromCharCode.apply(null,new Uint8Array(this._data.buffer,this._index,size));
            this._index += size;
        }

        return(s);
    }
    */

    getUnsigned(info)
    {
        var value = 0;

        if (info < 24)
        {
            value = info;
        }
        else if (info <= 27)
        {
            if (info == 24)
            {
                value = this._data.getUint8(this._index);
                this._index += 1;
            }
            else if (info == 25)
            {
                value = this._data.getUint16(this._index);
                this._index += 2;
            }
            else if (info == 26)
            {
                value = this._data.getUint32(this._index);
                this._index += 4;
            }
            else if (info == 27)
            {
                value = this._data.getBigInt64(this._index);
                this._index += 8;
            }
        }

        return(value);
    }

    getDouble(info)
    {
        var value = 0.0;

        if (info < 25)
        {
            if (info < 24)
            {
                value = info;
            }
            else
            {
                this._index += 1;
            }
        }
        else if (info == 25)
        {
            this._index += 2;
        }
        else if (info == 26)
        {
            value = this._data.getFloat32(this._index);
            this._index += 4;
        }
        else if (info == 27)
        {
            value = this._data.getFloat64(this._index);
            this._index += 8;
        }

        return(value);
    }
}

var _api =
{
    _isNode:false,
    _supportsGetBigInt:false,

    init:function()
    {
        var buf = new ArrayBuffer(2);
        var dv = new DataView(buf);
        dv.setInt16(0,256,true);
        this._supportsGetBigInt = (("getBigInt64" in dv) && typeof(dv["getBigInt64"]) == "function");

        if (typeof process === "object")
        {
            if (process.hasOwnProperty("versions"))
            {
                if (process.versions.hasOwnProperty("node"))
                {
                    this._isNode = true;
                }
            }
        }
    },

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

_api.init();

export {_api as codec};
