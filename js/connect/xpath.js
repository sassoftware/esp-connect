/*
    Copyright © 2020, SAS Institute Inc., Cary, NC, USA.  All Rights Reserved.
    SPDX-License-Identifier: Apache-2.0
*/

import {tools} from "./tools.js";

var _serialize = null;
var _xpath = null;
var _dom = null;

if (tools.isNode)
{
    import("xpath").
        then((module) => {
            _xpath = module.default;
        }).
        catch((e) => {
            console.log("import error on xpath: " + e);
        });

    import("xmldom").
        then((module) => {
            var DOMParser = module.default.DOMParser;
            var XMLSerializer = module.default.XMLSerializer;
            _dom = new DOMParser();
            _serialize = new XMLSerializer();
        }).
        catch((e) => {
            console.log("import error on xmldom: " + e);
        });
}

var _api =
{
    getNodes:function(expression,context)
    {
        var nodes = new Array();

        if (tools.isNode)
        {
            var results = this.getXPath().select(expression,context);

            if (results != null)
            {
                for (var i = 0; i < results.length; i++)
                {
                    nodes.push(results[i]);
                }
            }
        }
        else
        {
            var d = null;

            if (context == null)
            {
                d = context = document;
            }
            else
            {
                d = (context.ownerDocument != null) ? context.ownerDocument : context;
            }

            var node;
            var results = d.evaluate(expression,context,null,XPathResult.ORDERED_NODE_ITERATOR_TYPE,null);

            while ((node = results.iterateNext()) != null)
            {
                nodes.push(node);
            }
        }

        return(nodes);
    },

    getElements:function(context)
    {
        var nodes = [];

        for (var i = 0; i < context.children.length; i++)
        {
            nodes.push(context.children.item(i));
        }

        return(nodes);
    },

    getChildren:function(context)
    {
        var nodes = [];

        for (var i = 0; i < context.childNodes.length; i++)
        {
            nodes.push(context.childNodes.item(i));
        }

        return(nodes);
    },

    getNode:function(expression,context)
    {
        var node = null;
        var nodes = this.getNodes(expression,context);

        if (nodes.length > 0)
        {
            node = nodes[0];
        }

        return(node);
    },

    getString:function(expression,context)
    {
        var s = "";

        this.getNodes(expression,context).forEach((node) => {
            s += (node.textContent != null) ? node.textContent : node.nodeValue;
        });

        return(s);
    },

    nodeText:function(node)
    {
        var text = "";
        var n = node;

        if (node.firstChild != null)
        {
            if (node.firstChild.nodeType == 4)
            {
                n = node.firstChild;
            }

            text = (n.textContent != null) ? n.textContent : n.nodeValue;
        }

        return(text);
    },

    xmlString:function(xml)
    {
        if (tools.isNode)
        {
            return(_serialize.serializeToString(xml));
        }
        else
        {
            return(new XMLSerializer().serializeToString(xml));
        }
    },

    setNodeText:function(node,value)
    {
        node.textContent = value;
    },

    format:function(xml,indent)
    {
        var result = new Object();
        result._s = "";

        if (indent == null)
        {
            indent = "  ";
        }

        this.formatNode(result,xml,0,indent);

        return(result._s);
    },

    formatNode:function(result,node,depth,indent)
    {
        if (node.nodeType == 1)
        {
            for (var i = 0; i < depth; i++)
            {
                result._s += indent;
            }

            result._s += "<" + node.tagName;

            if (node.attributes.length > 0)
            {
                var attr;

                for (var i = 0; i < node.attributes.length; i++)
                {
                    attr = node.attributes[i];
                    result._s += (" " + attr.nodeName + "='" + attr.nodeValue + "'");
                }
            }

            if (node.hasChildNodes())
            {
                result._s += ">";

                var isText = false;
                var isCData = false;
                var hasChildElements = false;
                var n;

                for (var i = 0; i < node.childNodes.length; i++)
                {
                    n = node.childNodes[i];

                    if (n.nodeType == 3)
                    {
                        isText = true;
                    }
                    else if (n.nodeType == 4)
                    {
                        isCData = true;
                    }
                    else
                    {
                        hasChildElements = true;
                    }
                }

                if (hasChildElements == false && (isText || isCData))
                {
                    if (isCData)
                    {
                        result._s += ("<![CDATA[" + node.textContent + "]]>");
                    }
                    else
                    {
                        result._s += node.textContent;
                    }

                    result._s += ("</" + node.tagName + ">");

                    if (depth > 0)
                    {
                        result._s += "\n";
                    }
                }
                else
                {
                    result._s += "\n";

                    for (var i = 0; i < node.childNodes.length; i++)
                    {
                        this.formatNode(result,node.childNodes[i],depth + 1,indent);
                    }

                    for (var i = 0; i < depth; i++)
                    {
                        result._s += indent;
                    }

                    result._s += ("</" + node.tagName + ">");

                    if (depth > 0)
                    {
                        result._s += "\n";
                    }
                }
            }
            else
            {
                result._s += ("></" + node.tagName + ">\n");
            }
        }
        /*
        else if (node.nodeType == 3)
        {
            result._s += node.nodeValue;
        }
        else if (node.nodeType == 4)
        {
            result._s += node.nodeValue;
        }
        */
    },

    createXml:function(s)
    {
        var xml = null;

        if (tools.isNode)
        {
            xml = _dom.parseFromString(s,"application/xml");
        }
        else
        {
            xml = new DOMParser().parseFromString(s,"application/xml");
        }

        return(xml);
    },

    addOpts:function(element,to)
    {
        this.getNodes("*",element).forEach((node) => {
            var name = node.tagName;
            var value = this.nodeText(node);
            to.setOpt(name,value);
        });
    },

    getXPath:function()
    {
        return(_xpath);
    }
}

export {_api as xpath};
