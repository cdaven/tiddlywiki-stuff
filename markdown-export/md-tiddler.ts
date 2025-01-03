/*\
title: $:/plugins/cdaven/markdown-export/md-tiddler.js
type: application/javascript
module-type: macro

Macro to output a single tiddler to Markdown, e.g. for use with a template, possibly from the command line.
\*/

import { getExportTarget } from "./render-helpers.js";
import { MarkdownRenderer, TiddlyWikiRenderer } from "./render.js";

export const name = "mdtiddler";

export const params = [
    {
        name: "title",
        default: ""
    },
];

/** The macro entrypoint */
export function run(this: any, title: string = ""): string {
    title = title || this.getVariable("currentTiddler");
    if (!title) {
        console.warn("No title specified, exiting");
        return "";
    }

    if (title === "$:/plugins/cdaven/markdown-export/md-tiddler") {
        // TODO: This avoids a Javascript error, but there should be a better solution
        console.warn("Shouldn't render itself...?");
        return "";
    }

    const exportTarget = getExportTarget();
    const twRenderer = new TiddlyWikiRenderer($tw);
    const renderer = new MarkdownRenderer(twRenderer, exportTarget);

    return renderer.renderTiddler(title) || "";
};
