/*\
title: $:/plugins/cdaven/markdown-export/markdown-export.js
type: application/javascript
module-type: macro
\*/

import { titleToFilename, WikiLinkStyle } from "./render-helpers.js";
import { getAnchorRule } from "./render-rules.js";
import { MarkdownRenderer, TiddlyWikiRenderer } from "./render.js";
import { ZipArchive } from "./zip-archive.js";

export const name = "markdown-export";

export const params = [
    {
        name: "filter",
        default: ""
    },
    {
        name: "note",
        default: ""
    },
    {
        name: "version",
        default: ""
    },
    {
        name: "extension",
        default: ".md"
    },
];

interface MarkdownTiddler {
    title: string;
    text: string;
}

/** Insert note as comment right after front matter */
function insertNote(markdownTiddler: string, note: string): string {
    return markdownTiddler.replace(/(---\n+)(#)/, `$1<!-- ${note.replace(/\$/g, "$$$$")} -->\n\n$2`);
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

function getWikiLinkStyle(): WikiLinkStyle {
    switch (getSetting("$:/plugins/cdaven/markdown-export/wikilinkstyle", "default").toLowerCase()) {
        case "obsidian":
            return "obsidian";
        case "logseq":
            return "logseq";
        default:
            return "default";
    }
}

/** LaTeX page break, recognized by Pandoc */
const pageBreak = "\n\n\\newpage\n\n";

/** Title of temporary zip tiddler */
const tempZipTiddler = "$:/temp/cdaven/markdown.zip";

/** The macro entrypoint */
export function run(filter: string = "", note: string = "", version: string = "", extension: string = ".md"): string {
    console.log(`Running Markdown Export ${version} with filter ${filter} and extension ${extension}`);
    if (!filter) {
        console.warn("No filter specified, exiting");
        return "";
    }

    const createArchive = extension == ".zip";
    const twRenderer = new TiddlyWikiRenderer($tw);
    const renderer = new MarkdownRenderer(twRenderer);

    const wikiLinkStyle = getWikiLinkStyle();
    // Configure how internal links should be rendered
    renderer.setRule("a", getAnchorRule(this, wikiLinkStyle));

    // Expand macros in note
    note = twRenderer.wikifyText(note);

    let markdownTiddlers: MarkdownTiddler[] = [];
    for (const title of $tw.wiki.filterTiddlers(filter)) {
        let markdownTiddler: string | null = null;
        try {
            markdownTiddler = renderer.renderTiddler(title);
        }
        catch (err) {
            console.error(err);
        }
        if (markdownTiddler) {
            if (note) {
                markdownTiddler = insertNote(markdownTiddler, note);
            }

            markdownTiddlers.push({
                title: title,
                text: markdownTiddler.trim()
            });
        }
    }

    if (createArchive) {
        let zipArchive = new ZipArchive(tempZipTiddler);
        if (!zipArchive.isEnabled()) {
            console.error("JSZip plugin is required for generating zip archives");
            return "";
        }

        for (const mdTiddler of markdownTiddlers) {
            zipArchive.addFile(titleToFilename(mdTiddler.title, wikiLinkStyle) + ".md", mdTiddler.text);
        }
        return zipArchive.toBase64();
    }
    else {
        return markdownTiddlers.map(t => t.text).join(pageBreak);
    }
};
