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

export function isTWDate(value: any): value is Date | string {
    return value
        && (
            typeof value["toISOString"] === "function"
            || datePatternTW.test(value)
        );
}

/** Check if the node is the only node in the paragraph or block */
export function isOnlyNodeInBlock(node: TW_Node): boolean {
    return node.parentNode
        && (node.parentNode.tag == "p" || node.parentNode.tag == "div")
        && node.parentNode.children.length == 1;
}

/** TW date format (spaces added for clarity): [UTC] YYYY 0MM 0DD 0hh 0mm 0ss 0XXX */
const datePatternTW = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{3})$/;

export function formatDate(fieldValue: any): string {
    if (typeof fieldValue["toISOString"] === "function") {
        return fieldValue.toISOString();
    }
    else if (datePatternTW.test(fieldValue)) {
        const parsedDate = new Date($tw.utils.parseDate(fieldValue));
        return parsedDate.toISOString();
    }
    else {
        console.error(`${fieldValue} is not a valid date`);
        return null;
    }
}

/** Field values are converted to strings by TW, we switch them back to types supported by YAML. */
export function formatYAMLString(fieldValue: any, enableNumbers: boolean = true): string {
    if (isTWDate(fieldValue)) {
        fieldValue = "'" + formatDate(fieldValue) + "'";
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

/** Decode HTML special entities <, >, & that can be used in LaTeX math */
export function latex_htmldecode(s: string): string {
    return s.replace(/&lt;|&gt;|&amp;/g, match => ({
        "&lt;": "<",
        "&gt;": ">",
        "&amp;": "&"
    }[match]));
}

/** Escape special characters in title so it can be used as a filename */
export function titleToFilename(title: string, exportTarget: ExportTarget): string {
    let filename = title;
    if (filename[0] == ".") {
        // Escape leading dot in filename à la Logseq
        // Seems like a good enough default in all cases
        filename = "%2E" + filename.substring(1);
    }

    if (exportTarget == "logseq") {
        // Escape triple underscores (corresponds to / in Logseq)
        filename = filename.replace("___", "%5F%5F%5F");
        if (filename[filename.length - 1] == ".") {
            // Escape trailing dot in filename (don't know why Logseq does this)
            filename = filename.substring(0, filename.length - 1) + ".___";
        }
        return filename.replace(/<|>|:|\*|\?|\||\\|\/|"|#/g, match => ({
            "<": "%3C",
            ">": "%3E",
            ":": "%3A",
            "*": "%2A",
            "?": "%3F",
            "|": "%7C",
            "\\": "%5C",
            "\"": "%22",
            "#": "%23",
            // Forward slash is used to create a hierarchy,
            // but all files are still in the same folder
            "/": "___",
        }[match]));
    }
    else {
        // Obsidian doesn't handle illegal filename characters at all,
        // but we must do something with them, so why not do as Logseq does?
        return filename.replace(/<|>|:|\*|\?|\||\\|"|#/g, match => ({
            "<": "%3C",
            ">": "%3E",
            ":": "%3A",
            "*": "%2A",
            "?": "%3F",
            "|": "%7C",
            "\\": "%5C",
            "\"": "%22",
            "#": "%23",
            // Keep forward slashes, since Obsidian expects a folder structure
        }[match]));
    }
}

export type ExportTarget = "obsidian" | "logseq" | "default";

function getSetting(title: string, defaultValue: string): string {
    const tiddler = $tw.wiki.getTiddler(title);
    if (tiddler) {
        return tiddler.fields.text || defaultValue;
    }
    else {
        return defaultValue;
    }
}

export function getExportTarget(): ExportTarget {
    switch (getSetting("$:/plugins/cdaven/markdown-export/exporttarget", "default").toLowerCase()) {
        case "obsidian":
            return "obsidian";
        case "logseq":
            return "logseq";
        default:
            return "default";
    }
}
