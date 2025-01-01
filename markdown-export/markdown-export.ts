/*\
title: $:/plugins/cdaven/markdown-export/markdown-export.js
type: application/javascript
module-type: macro
\*/

import { ExportTarget, getExportTarget, titleToFilename } from "./render-helpers.js";
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
    const exportTarget = getExportTarget();
    const twRenderer = new TiddlyWikiRenderer($tw);
    const renderer = new MarkdownRenderer(twRenderer, exportTarget);

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
            zipArchive.addFile(titleToFilename(mdTiddler.title, exportTarget) + ".md", mdTiddler.text);
        }
        return zipArchive.toBase64();
    }
    else {
        return markdownTiddlers.map(t => t.text).join(pageBreak);
    }
};
