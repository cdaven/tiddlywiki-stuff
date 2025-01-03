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
    let isoString = "";
    if (typeof fieldValue["toISOString"] === "function") {
        isoString = fieldValue.toISOString();
    }
    else if (datePatternTW.test(fieldValue)) {
        const parsedDate = new Date($tw.utils.parseDate(fieldValue));
        isoString = parsedDate.toISOString();
    }
    else {
        console.error(`${fieldValue} is not a valid date`);
        return null;
    }
 
    // Remove ".123Z" suffix (milliseconds and UTC marker),
    // so that it matches Obsidian's "date & time" type.
    return isoString.substring(0, isoString.lastIndexOf("."));
}

/** Format property values for the YAML frontmatter */
export function formatYamlPropertyValue(fieldValue: any, enableNumbers: boolean = true): string {
    if (isTWDate(fieldValue)) {
        return formatDate(fieldValue);
    }
    else if (enableNumbers && !isNaN(parseFloat(fieldValue)) && isFinite(fieldValue as any)) {
        return fieldValue.toString();
    }
    else {
        return '"' + 
            fieldValue.toString()
                // Remove newlines
                .replace(/[\r\n]+/g, " ")
                // Escape backslashes
                .replace(/\\/g, "\\\\")
                // Escape double quotes
                .replace(/"/g, '\\"')
            + '"';
    }
}

/** Format property values for the Logseq frontmatter */
export function formatLogseqPropertyValue(fieldValue: any, enableNumbers: boolean = true): string {
    if (isTWDate(fieldValue)) {
        return formatDate(fieldValue);
    }
    else if (enableNumbers && !isNaN(parseFloat(fieldValue)) && isFinite(fieldValue as any)) {
        return fieldValue.toString();
    }
    else {
        // Remove newlines
        return fieldValue.toString().replace(/[\r\n]+/g, " ");
    }
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
        // Obsidian accepts some "special characters" in wikilinks,
        // that are also accepted by the operating systems. Forward
        // slashes are retained, so that we can create a folder structure
        // in a zip archive. I believe Pandoc and Obsidian could be
        // handled with the same logic here.
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
            // Keep forward slashes to create a folder structure
        }[match]));
    }
}

export type ExportTarget = "pandoc" | "obsidian" | "logseq";
const validExportTargets = ["pandoc", "obsidian", "logseq"] as ExportTarget[];
const defaultExportTarget = "pandoc" as ExportTarget;
function isValidExportTarget(value: string): value is ExportTarget {
    return validExportTargets.indexOf(value as ExportTarget) !== -1;
}

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
    const value = getSetting("$:/plugins/cdaven/markdown-export/exporttarget", defaultExportTarget).toLowerCase();
    return isValidExportTarget(value) ? value : defaultExportTarget;
}
