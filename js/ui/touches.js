/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "../connect/options.js";
import {tools} from "../connect/tools.js";

class Touches extends Options
{
    constructor(o,options)
    {
        super(options);

        this._delegate = this.getOpt("delegate");

        var element = (typeof(o) == "string") ? document.getElementById(o) : o;

        this.init();

        const   self = this;

        element.addEventListener("touchstart",function(e) {
            self.start(e);
        },false);

        element.addEventListener("touchmove",function(e) {
            self.move(e);
        },false);

        element.addEventListener("touchcancel",function(e) {
            self.cancel(e);
        },false);

        element.addEventListener("touchend",function(e) {
            self.end(e);
        },false);
    }

    init()
    {
        this._start = null;
        this._current = null;
        this._end = null;
        this._target = null;
        this._touches = 0;
    }

    start(e)
    {
        this.init();

        this._target = e.targetTouches[0].target;
        this._touches = e.touches.length;
        this._start = {x:e.touches[0].clientX,y:e.touches[0].clientY};
    }

    move(e)
    {
        this._current = {x:e.touches[0].clientX,y:e.touches[0].clientY};
    }

    cancel(e)
    {
        this.init();
    }

    end(e)
    {
        this._end = this._current;

        var deltaX = this._end.x - this._start.x;
        var deltaY = this._end.y - this._start.y;
        var minswipe = this.getOpt("minswipe",50);

        var left = deltaX < 0;

        if (left)
        {
            deltaX = -deltaX;
        }

        var up = deltaY < 0;

        if (up)
        {
            deltaY = -deltaY;
        }

        if (deltaX >= minswipe || deltaY >= minswipe)
        {
            if (deltaX >= minswipe)
            {
                if (left)
                {
                    if (tools.supports(this._delegate,"swipeLeft"))
                    {
                        this._delegate.swipeLeft(this,deltaX);
                    }
                }
                else if (tools.supports(this._delegate,"swipeRight"))
                {
                    this._delegate.swipeRight(this,deltaX);
                }
            }

            if (deltaY >= minswipe)
            {
                if (up)
                {
                    if (tools.supports(this._delegate,"swipeUp"))
                    {
                        this._delegate.swipeUp(this,deltaY);
                    }
                }
                else if (tools.supports(this._delegate,"swipeDown"))
                {
                    this._delegate.swipeDown(this,deltaY);
                }
            }
        }
        else if (tools.supports(this._delegate,"touch"))
        {
            this._delegate.touch(this);
        }
    }
}

export {Touches};
