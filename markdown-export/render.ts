type NodeRenderer = (node: TW_Element, innerMarkup: string) => string | null;
type RulesRecord = Record<string, NodeRenderer>;

function isTextNode(node: TW_Node): node is TW_TextNode {
    return node.nodeType === Node.TEXT_NODE;
}

function isDomNode(node: TW_Node): node is TW_Element {
    return node.nodeType === Node.ELEMENT_NODE;
}

interface TableCell {
    innerMarkup: string | null;
    header: boolean;
    align: string | undefined;
}

export class TiddlyWikiRenderer {
    private tw: $TW;
    private widgetOptions: any;

    constructor(tw: $TW) {
        this.tw = tw;

        // Imports built-in macros and custom macros in the tiddler, including the $:/tags/Macro/View tag
        const macroImport = "[[$:/core/ui/PageMacros]] [all[shadows+tiddlers]tag[$:/tags/Macro]!has[draft.of]] [all[shadows+tiddlers]tag[$:/tags/Macro/View]!has[draft.of]]";

        this.widgetOptions = {
            document: $tw.fakeDocument,
            mode: "block",
            importVariables: macroImport,
            recursionMarker: "yes",
            variables: {
                currentTiddler: null
            }
        };
    }

    /** Let TiddlyWiki parse the tiddler text and build a widget tree */
    renderWidgetTree(title: string): TW_Node[] {
        this.widgetOptions.variables.currentTiddler = title;
        const widgetNode = this.tw.wiki.makeTranscludeWidget(title, this.widgetOptions);
        const container = this.tw.fakeDocument.createElement("div");
        widgetNode.render(container, null);
        // Get the first-level nodes in the tree
        return container.children[0].children as TW_Node[];
    }

    /** "Wikify" a WikiText string */
    wikifyText(text: string): string {
        return this.tw.wiki.renderText("text/plain", "text/vnd.tiddlywiki", text);
    }

    /** Get tiddler fields */
    getFields(title: string): TiddlerFields | null {
        const tiddler = this.tw.wiki.getTiddler(title);
        if (tiddler == null) {
            console.warn("Found no such tiddler", title);
            return null;
        }
        // Clone tiddler fields
        return { ...tiddler.fields };
    }
}

export class MarkdownRenderer {
    private tw: TiddlyWikiRenderer;
    private rules: RulesRecord;

    constructor(tw: TiddlyWikiRenderer) {
        this.tw = tw;
        this.rules = this.getRules();
    }

    /** Fields from TiddlyWiki, but can also store state from rendering to document head */
    private tiddlerFields: any;

    renderTiddler(title: string): string | null {
        if (this.rules == null) {
            console.warn("Cannot render tiddler without rules");
            return null;
        }

        const nodes = this.tw.renderWidgetTree(title);
        this.tiddlerFields = this.tw.getFields(title);

        let renderedNodes = "";
        for (const node of nodes) {
            const nodeMarkup = this.renderNode(node);
            if (nodeMarkup != null) {
                renderedNodes += nodeMarkup;
            }
        }

        // Prepend meta node last, in case attributes have changed during rendering
        const metaNode: TW_Element = {
            tag: "meta",
            nodeType: Node.ELEMENT_NODE,
            attributes: this.tiddlerFields,
            children: []
        };

        let markup = this.renderNode(metaNode) + renderedNodes;
        return markup.replace(/\n\n\n+/g, "\n\n").trim() + "\n";
    }

    /** Get rules for rendering a TiddlyWiki widget tree consisting of HTML-ish elements/nodes */
    private getRules(): RulesRecord {
        let rules: RulesRecord = {
            // The <meta> tag contains the document's title and other attributes
            "meta": (node) => {
                const fields = node.attributes;
                let frontMatter: string[] = [];
                if (fields.title) {
                    frontMatter.push(`title: '${fields.title}'`);
                }
                if (fields.author) {
                    frontMatter.push(`author: '${fields.author}'`);
                }
                if (fields.modified) {
                    frontMatter.push(`date: '${fields.modified.toISOString()}'`);
                }
                if (fields.description) {
                    frontMatter.push(`abstract: '${fields.description}'`);
                }
                if (fields.tags && fields.tags.length > 0) {
                    frontMatter.push(`tags: ['${fields.tags.join(',')}']`);
                }
                return `---\n${frontMatter.join("\n")}\n---\n\n# ${fields.title}\n\n`;
            },
            // Add newlines after paragraphs
            "p": (_, im) => `${im.trim()}\n\n`,
            "em": (_, im) => `*${im}*`,
            "strong": (_, im) => `**${im}**`,
            "u": (_, im) => `<u>${im}</u>`,
            "strike": (_, im) => `~~${im}~~`,
            // Force line-break
            "br": (node) => {
                const nextNode = this.getNextNode(node);
                if (nextNode == null || (isTextNode(nextNode) && nextNode.textContent === "\n")) {
                    // If the next line is blank, shouldn't end with a \
                    return "\n";
                }
                else {
                    return "\\\n";
                }
            },
            "hr": () => `---\n\n`,
            "label": (_, im) => im,
            "mark": (_, im) => `<mark>${im}</mark>`,
            "span": (node, im) => {
                const katexStart = '<annotation encoding="application/x-tex">';
                if (node.rawHTML && node.rawHTML.indexOf(katexStart) !== -1) {
                    let mathEq = node.rawHTML.substring(node.rawHTML.indexOf(katexStart) + katexStart.length);
                    mathEq = mathEq.substring(0, mathEq.indexOf('</annotation>'));

                    if (mathEq.startsWith("\n") && mathEq.endsWith("\n")) {
                        // As a block equation
                        return `$$${mathEq}$$\n\n`;
                    }
                    else {
                        // As an inline equation
                        return `$${mathEq}$`;
                    }
                }
                else {
                    return im;
                }
            },
            "sub": (_, im) => `~${im.replace(/ /g, "\\ ")}~`,
            "sup": (_, im) => `^${im.replace(/ /g, "\\ ")}^`,
            "h1": (_, im) => `# ${im}\n\n`,
            "h2": (_, im) => `## ${im}\n\n`,
            "h3": (_, im) => `### ${im}\n\n`,
            "h4": (_, im) => `#### ${im}\n\n`,
            // Definition lists
            "dl": (_, im) => `${im.trim()}\n\n`,
            "dt": (_, im) => `${im}\n`,
            "dd": (_, im) => ` ~ ${im}\n\n`,
            // Code blocks
            "pre": (node, im) => {
                if (node.children.every(child => isDomNode(child) && child.tag === "code")) {
                    // <pre> with nested <code> elements, just pass through
                    return im;
                }
                else {
                    // <pre> without nested <code>
                    return `\`\`\`\n${im.trim()}\n\`\`\`\n\n`;
                }
            },
            "code": (node, im) => {
                if (node.parentNode?.tag === "pre") {
                    // <code> nested inside <pre>
                    // The Highlight plugin puts the language in the "class" attribute
                    let classRx = node.attributes?.class?.match(/^(.+) hljs$/);
                    if (classRx) {
                        const lang = classRx[1];
                        return `\`\`\`${lang}\n${im.trim()}\n\`\`\`\n\n`;
                    }
                    else {
                        return `\`\`\`\n${im.trim()}\n\`\`\`\n\n`;
                    }
                }
                else {
                    // As inline code
                    return `\`${im}\``;
                }
            },
            "blockquote": (_, im) => {
                // Insert "> " at the beginning of each line
                return `> ${im.trim().replace(/\n/g, "\n> ")}\n\n`
            },
            "cite": (_, im) => {
                return `<cite>${im}</cite>`;
            },
            // Lists
            "ul": (node, im) => {
                if (node.parentNode && node.parentNode.tag === "li") {
                    // Nested list, should not end with double newlines
                    return `\n${im}`;
                }
                else {
                    return `${im.trim()}\n\n`;
                }
            },
            "li": (node, im) => {
                let curNode = node.parentNode;
                if (curNode == null) {
                    console.error("Found <li> without parent");
                    return null;
                }
                const listType = curNode.tag === "ul" ? "*" : "1.";
                const listTags = ["ul", "ol", "li"];
                let depth = -1;
                // Traverse up the path to count nesting levels
                while (curNode && listTags.indexOf(curNode.tag) !== -1) {
                    if (curNode.tag !== "li") {
                        depth++;
                    }
                    curNode = curNode.parentNode;
                }
                return `${"    ".repeat(depth)}${listType} ${im}\n`;
            },
            "input": (node) => {
                if (node.attributes?.type === "checkbox") {
                    if (node.attributes?.checked) {
                        return "[x]";
                    }
                    else {
                        return "[ ]";
                    }
                }
                else {
                    console.warn("Unsupported input node type", node);
                    return null;
                }
            },
            "a": (node, im) => {
                const href = node.attributes?.href as string;
                if (href == null || href?.startsWith("#")) {
                    // Render internal links as plain text, since the links probably lose all meaning outside the TiddlyWiki.
                    return im;
                } else if (im && im != href) {
                    return `[${im}](${href})`;
                }
                else {
                    return `<${href}>`;
                }
            },
            "img": (node) => {
                let caption = node.attributes?.title || "";
                let src = node.attributes?.src || "";
                const svgPrefix = "data:image/svg+xml,";
                if (src.startsWith(svgPrefix)) {
                    // SVGs should also be Base64-encoded for compatibility
                    src = svgPrefix.replace("svg+xml,", "svg+xml;base64,") +
                        btoa(
                            decodeURIComponent(
                                src.substring(svgPrefix.length)
                            )
                        );
                }
                return `![${caption}](${src})`;
            },
            // Tables
            "table": (node) => {
                let tbody: TW_Element | null = null;
                for (const child of node.children) {
                    if (isDomNode(child) && child.tag === "tbody") {
                        tbody = child;
                        break;
                    }
                }
                if (tbody == null) {
                    return null;
                }

                let justifyLeft = (s: string | null, w: number) => {
                    const sLen = s?.length || 0;
                    return s + ' '.repeat(w - sLen);
                }
                let justifyRight = (s: string | null, w: number) => {
                    const sLen = s?.length || 0;
                    return ' '.repeat(w - sLen) + s;
                }
                let center = (s: string | null, w: number) => {
                    const sLen = s?.length || 0;
                    const spacesLeft = Math.ceil((w - sLen) / 2);
                    const spacesRight = w - sLen - spacesLeft;
                    return ' '.repeat(spacesLeft) + s + ' '.repeat(spacesRight);
                }

                let grid: TableCell[][] = [];
                for (const row of tbody.children) {
                    if (isDomNode(row) && row.tag === "tr") {
                        let cellsInCurrentRow: TableCell[] = [];
                        for (const cell of row.children) {
                            if (isDomNode(cell)) {
                                cellsInCurrentRow.push({
                                    innerMarkup: this.renderNode(cell),
                                    header: cell.tag === "th",
                                    align: cell.attributes.align,
                                });
                            }
                        }
                        grid.push(cellsInCurrentRow);
                    }
                }

                let columnWidths: number[] = [];
                for (let i = 0; i < grid[0].length; i++) {
                    // Check max length of each column's inner markup
                    columnWidths.push(Math.max(...grid.map(row => row[i].innerMarkup?.length || 0)));
                }

                let tableMarkup: string[] = [];
                let isFirstRow = true;
                for (const row of grid) {
                    let rowMarkup: string[] = [];
                    for (const column in row) {
                        const cell = row[column];
                        const innerMarkup = cell.innerMarkup;
                        const columnWidth = columnWidths[column];
                        if (cell.align === "center") {
                            rowMarkup.push(center(innerMarkup, columnWidth));
                        }
                        else if (cell.align === "right") {
                            rowMarkup.push(justifyRight(innerMarkup, columnWidth));
                        }
                        else {
                            rowMarkup.push(justifyLeft(innerMarkup, columnWidth));
                        }
                    }
                    tableMarkup.push("| " + rowMarkup.join(" | ") + " |");
                    if (isFirstRow) {
                        // Markdown requires the first row to be a header row
                        let rowMarkup: string[] = [];
                        for (const column in row) {
                            const columnWidth = columnWidths[column];
                            rowMarkup.push("-".repeat(columnWidth));
                        }
                        tableMarkup.push("|-" + rowMarkup.join("-|-") + "-|");
                        isFirstRow = false;
                    }
                }
                return tableMarkup.join("\n") + "\n\n";
            },
            // The <tr> tag is handled by the <table> rule
            "tr": () => null,
            "td": (_, im) => im,
            "th": (_, im) => im,
            // Wildcard rule
            "*": (node, im) => {
                return `<${node.tag}>${im.trim()}</${node.tag}>\n`;
            },
        };

        // Inherit identical rules
        rules["div"] = rules["p"];
        rules["ol"] = rules["ul"];

        // Note: you can also reuse rules inside a rule function above,
        // by calling e.g. `this.executeRule("p", node, im)`, since "this"
        // is the current renderer object.

        return rules;
    }

    /** Get raw text from node */
    private getNodeText(node: TW_Node): string | null {
        if (isTextNode(node)) {
            return node.textContent || "";
        }
        else if (isDomNode(node)) {
            return node.children.map(child => this.getNodeText(child)).join(" ");
        }
        else {
            return null;
        }
    }

    /** Render specified node to Markdown */
    private renderNode(node: TW_Node): string | null {
        if (isTextNode(node)) {
            return node.textContent || "";
        }
        else if (isDomNode(node)) {
            // Render markup from children depth-first
            const innerMarkup = node.children.map(child => this.renderNode(child)).join("");
            return this.executeRule(node, innerMarkup);
        }
        else {
            console.error("Unknown type of node", node);
            throw new Error("Unknown type of node");
        }
    }

    /** Get next sibling of specified node */
    private getNextNode(node: TW_Node): TW_Node | null {
        if (node.parentNode == null) {
            return null;
        }

        let isNext = false;
        for (const n of node.parentNode.children) {
            if (isNext) {
                return n;
            }
            else if (n === node) {
                isNext = true;
            }
        }
        return null;
    }

    private executeRule(node: TW_Element, innerMarkup: string): string | null {
        if (node.tag in this.rules) {
            return this.rules[node.tag](node, innerMarkup);
        }
        else {
            // Use wildcard rule when tag doesn't have its own rule
            return this.rules["*"](node, innerMarkup);
        }
    }
}
