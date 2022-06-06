import { TiddlyWikiRenderer, MarkdownRenderer } from "./render.js";

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
];

/** Insert note as comment right after front matter */
function insertNote(markdownTiddler: string, note: string): string {
    return markdownTiddler.replace(/(---\n+)(#)/, `$1<!-- ${note.replace(/\$/g, "$$$$")} -->\n\n$2`);
}

/** The macro entrypoint */
export function run(filter: string = "", note: string = "", version: string = ""): string {
    console.log(`Running Markdown Export ${version} with filter ${filter}`);
    if (!filter) {
        console.warn("No filter specified, exiting");
        return "";
    }

    const twRenderer = new TiddlyWikiRenderer($tw);
    const renderer = new MarkdownRenderer(twRenderer);

    // Expand macros in note
    note = twRenderer.wikifyText(note);

    let markdownTiddlers: string[] = [];
    for (const title of $tw.wiki.filterTiddlers(filter)) {
        console.log(`Rendering [[${title}]] to Markdown`);
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

            markdownTiddlers.push(markdownTiddler.trim());
        }
    }

    // LaTeX page break, recognized by Pandoc
    const pageBreak = "\n\n\\newpage\n\n";

    return markdownTiddlers.join(pageBreak);
};

/** Make stuff available for unit testing */
export const exportedForTesting = {
    insertNote
};

// export {};
