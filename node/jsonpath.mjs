import {connect as esp} from "@sassoftware/esp-connect";
import {default as jp} from "jsonpath";

var opts = esp.getArgs();

if (opts.getOpt("help",false))
{
    showUsage();
    process.exit(1);
}

var server = opts.getOptAndClear("server");

if (opts.hasOpts(["input","expr"]) == false)
{
    showUsage();
    process.exit(0);
}

var data = "";

import {default as fs} from "fs";

var input = opts.getOpt("input");

if (input == "-")
{
    data = fs.readFileSync(0);
}
else
{
    data = fs.readFileSync(input);
}

var o = JSON.parse(data.toString());
//var results = jp.query(o,opts.getOpt("expr"));
var results = jp.value(o,opts.getOpt("expr"));

//console.log(data.toString());
console.log(results);

function
showUsage()
{
    esp.usage({
        name:"jsonpath",
        summary:"Run a jsonpath query on a JSON object",
        options:[
            {name:"input",arg:"filename",description:"ESP Server to which to connect in the form http://espserver:7777",required:true},
            {name:"expr",arg:"expression",description:"The jsonpath expression",required:true}
        ],
        description:"This command runs a jsonpath expression on a JSON object.",
        see_also:[
        {
            name:"The NodeJS jsonpath module",
            link:"https://www.npmjs.com/package/jsonpath"
        }
        ]
    });
}
