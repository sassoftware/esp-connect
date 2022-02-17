/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {connect as esp} from "@sassoftware/esp-connect";
import {default as fs} from "fs";

class FileSource
{
    constructor(path,options)
    {
        this._opts = esp.createOptions(options);
        this._path = path;
        this._fd = fs.openSync(this._path);
        this._buffer = Buffer.alloc(4096);
        this._start = this._opts.getOpt("start",0);
        this._end = this._opts.getOpt("end",0);
        this.reset();
    }

    get linenumber()
    {
        return(this._linenumber);
    }

    reset()
    {
        this._offset = 0;
        this._bytes = fs.readSync(this._fd,this._buffer,0,this._buffer.length,this._offset);
        this._offset = this._bytes;
        this._index = 0;

        this._current = 0;

        this._linenumber = 0;
    }

    getline()
    {
        var line = "";
        var c;

        for (;;)
        {
            if (this._index < this._bytes)
            {
                c = this._buffer[this._index];
                if (c == 10)
                {
                    this._index++;
                    this._linenumber++;

                    if (this._start > 0 && this._linenumber < this._start)
                    {
                        line = "";
                        continue;
                    }

                    break;
                }
                else if (c == 13)
                {
                    this._index++;
                    continue;
                }
                line += String.fromCharCode(c);
                this._index++;
            }
            else
            {
                if ((this._bytes = fs.readSync(this._fd,this._buffer,0,this._buffer.length,this._offset)) == 0)
                {
                    break;
                }
                this._offset += this._bytes;
                this._index = 0;
            }
        }

        if (this._bytes == 0)
        {
            return(null);
        }

        if (this._end > 0 && this._linenumber > this._end)
        {
            return(null);
        }

        return(line);
    }
}

export {FileSource};
