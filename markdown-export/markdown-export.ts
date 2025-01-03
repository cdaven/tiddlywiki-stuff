/*\
title: $:/plugins/cdaven/markdown-export/markdown-export.js
type: application/javascript
module-type: macro
\*/

import { getExportTarget, titleToFilename } from "./render-helpers.js";
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
