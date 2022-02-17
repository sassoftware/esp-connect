import {connect as esp} from "@sassoftware/esp-connect";

var opts = esp.getArgs();
var server = opts.getOpt("server");

if (server == null)
{
    showUsage();
    process.exit(0);
}

esp.connect(server,{ready:ready});

function
ready(connection)
{
    connection.getModel().then(
        function(model) {
            model.projects.forEach((p) => {
                console.log(p.name);
                p.contqueries.forEach((cq) => {
                    console.log("  " + cq.name);
                    cq.windows.forEach((w) => {
                        console.log("    " + w.name + " (" + w.type + ")");
                    });
                });
            });

            process.exit(0);
        }
    );
}

function
showUsage()
{
    esp.usage({
        name:"basic",
        summary:"template for NodeJS programs",
        options:[
            {name:"server",arg:"ESP server",description:"ESP Server to which to connect in the form http://espserver:7777",required:true}
        ],
        description:"This command provides a template for users to use to create their own NodeJS programs."
    });
}
