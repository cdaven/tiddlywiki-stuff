/*\
title: $:/plugins/cdaven/markdown-export/render-helpers.js
type: application/javascript
module-type: library
\*/

/* Polyfill browser stuff when run from Node.js */
export const Node = globalThis.Node || {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
};

/* Polyfill browser stuff when run from Node.js */
export const btoa = globalThis.btoa || function (data: string): string {
    const ascii = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let len = data.length - 1,
        i = -1,
        b64 = '';
    while (i < len) {
        const code = data.charCodeAt(++i) << 16 | data.charCodeAt(++i) << 8 | data.charCodeAt(++i);
        b64 += ascii[(code >>> 18) & 63] + ascii[(code >>> 12) & 63] + ascii[(code >>> 6) & 63] + ascii[code & 63];
    }
    const pads = data.length % 3;
    if (pads > 0) {
        b64 = b64.slice(0, pads - 3);
        while (b64.length % 4 !== 0) {
            b64 += '=';
        }
    }
    return b64;
};

export function trimEnd(s: string): string {
    return s.replace(/\s+$/, "");
}

export function isTextNode(node: TW_Node): node is TW_TextNode {
    if (node.nodeType === Node.TEXT_NODE)
        return true;
    else if (typeof node.nodeType === "undefined")
        return node.hasOwnProperty("textContent");
    else
        return false;
}

export function isDomNode(node: TW_Node): node is TW_Element {
    if (node.nodeType === Node.ELEMENT_NODE)
        return true;
    else if (typeof node.nodeType === "undefined")
        return node.hasOwnProperty("children");
    else
        return false;
}

/* Field values are converted to strings by TW, we switch them back to types supported by YAML. */
export function formatYAMLString(fieldValue: any, enableNumbers: boolean = true): string {
    // TW date format (spaces added for clarity): [UTC] YYYY 0MM 0DD 0hh 0mm 0ss 0XXX
    const datePatternTW = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{3})$/;

    if (fieldValue.toISOString) {
        fieldValue = "'" + fieldValue.toISOString() + "'";
    }
    else if (datePatternTW.test(fieldValue)) {
        const parsedDate = new Date($tw.utils.parseDate(fieldValue));
        fieldValue = "'" + parsedDate.toISOString() + "'";
    }
    else if (enableNumbers && !isNaN(parseFloat(fieldValue)) && isFinite(fieldValue as any)) {
        fieldValue = fieldValue.toString();
    }
    else {
        // Remove newlines and escape quotes
        fieldValue = fieldValue.toString().replace(/[\r\n]+/g, "");
        if (fieldValue.includes("'")) {
            fieldValue = '"' + fieldValue.replace('"', '\\"') + '"';
        } else {
            fieldValue = "'" + fieldValue.replace("'", "''") + "'";
        }
    }    
    return fieldValue;
}
