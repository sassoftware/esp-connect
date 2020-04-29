/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

if (typeof(define) !== "function")
{
    var define = require("amdefine")(module);
}

define([
    "../connect/options"
], function(Options)
{
	function
	StoredData(name)
	{
		this._name = name;

		var	options = localStorage.getItem(name);
        Options.call(this,options);
	}

    StoredData.prototype = Object.create(Options.prototype);
    StoredData.prototype.constructor = StoredData;

    StoredData.prototype.optionSet =
    function(name,value)
	{
		this.save();
	}

    StoredData.prototype.optionCleared =
    function(name,value)
	{
		this.save();
	}

	StoredData.prototype.save =
	function()
	{
		localStorage.setItem(this._name,this.toString());
	}

	StoredData.prototype.recreate =
	function()
	{
        this.reset();
		this.save();
	}

	return(StoredData);
});
