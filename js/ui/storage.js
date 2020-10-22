/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {Options} from "../connect/options.js";

class StoredData extends Options
{
	constructor(name)
	{
		var	options = localStorage.getItem(name);
        super(options);
		this._name = name;
	}

    optionSet(name,value)
	{
		this.save();
	}

    optionCleared(name,value)
	{
		this.save();
	}

	save()
	{
		localStorage.setItem(this._name,this.toString());
	}

	recreate()
	{
        this.reset();
		this.save();
	}
}

export {StoredData as Storage};
