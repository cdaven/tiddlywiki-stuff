/*\
title: $:/plugins/cdaven/markdown-export/render-rules.js
type: application/javascript
module-type: library
\*/

import { IMarkupRenderer } from "./core";
import { btoa, isDomNode, isTextNode, trimEnd } from "./render-helpers";

type NodeRenderer = (node: TW_Element, innerMarkup: string) => string | null;
export type RulesRecord = Record<string, NodeRenderer>;

interface TableCell {
    innerMarkup: string | null;
    header: boolean;
    align: string | undefined;
}

function parseAndFormatDate(str: string): string {
    // TW date format (spaces added for clarity): [UTC] YYYY 0MM 0DD 0hh 0mm 0ss 0XXX
    const regex = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{3})$/;
    const match = str.match(regex);
    if (match) {
        const isoDateString = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
        const date = new Date(isoDateString);
        return date.toISOString();
    } else {
        console.warn("Invalid date format", str);
        return str;
    }
}

/** Field values are converted to strings by TW, we can switch them back */
function formatYAMLString(fieldValue: any, enableNumbers : boolean = true): string {
    const datePatternTW = /^\d{17}$/;
    if (fieldValue.toISOString) {
        fieldValue = "'" + fieldValue.toISOString() + "'";
    }
    else if (datePatternTW.test(fieldValue)) {
        fieldValue = "'" + parseAndFormatDate(fieldValue) + "'";
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

/** Get rules for rendering a TiddlyWiki widget tree consisting of HTML-ish elements/nodes */
export function getRules(renderer: IMarkupRenderer): RulesRecord {
    let rules: RulesRecord = {
        // The <meta> tag contains the document's title and other attributes
        "meta": (node) => {
            const fields = node.attributes as Record<string, any>;
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
                // Enclose tags with single quotes and escape single quotes inside the tags
                const tags: string[] = fields.tags.map((t: string) => formatYAMLString(t, false));
                frontMatter.push(`tags: [${tags.join(', ')}]`);
            }
            for (const field in fields) {
                if (["text", "title", "author", "modified", "description", "tags"].indexOf(field) !== -1)
                    // Ignore full text and the fields already taken care of
                    continue;

                // Clean up field name and value
                const fieldName = field.replace(/\s+/g, "-").replace(/[\:]+$/, "");
                let fieldValue = formatYAMLString(fields[field]);
                frontMatter.push(`${fieldName}: ${fieldValue}`);
            }
            return `---\n${frontMatter.join("\n")}\n---\n\n# ${fields.title}\n\n`;
        },
        "p": (node, im) => {
            if (node.parentNode?.tag === "li") {
                const newlines = renderer.isLastChild(node)
                    ? "\n" // End with one newline for the last child
                    : "\n\n"; // End with two newlines between paragraphs
                if (node.parentNode.children[0] == node) {
                    // The first <p> inside a <li> is rendered as inline text
                    return `${im.trim()}${newlines}`;
                }
                else {
                    // Subsequent <p> inside a <li> is rendered with indentation
                    return `    ${im.trim()}${newlines}`;
                }
            }
            else {
                // Add newlines after paragraphs
                return `${im.trim()}\n\n`;
            }
        },
        "em": (_, im) => `*${im}*`,
        "strong": (_, im) => `**${im}**`,
        "u": (_, im) => `<u>${im}</u>`,
        "strike": (_, im) => `~~${im}~~`,
        // Force line-break
        "br": (node) => {
            const nextNode = renderer.getNextNode(node);
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
        // Pandoc 3.0 supports highlighted text using ==, if you specify --from markdown+mark
        "mark": (_, im) => `==${im}==`,
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
        "blockquote": (node, im) => {
            let indentation = "";
            if (node.parentNode?.tag === "li") {
                indentation = "    ";
            }
            // Insert "> " at the beginning of each line
            const prefix = `${indentation}> `;
            return `${prefix}${im.trim().replace(/\n/g, `\n${prefix}`)}\n\n`
        },
        "cite": (_, im) => {
            return `<cite>${im}</cite>`;
        },
        // Lists
        "ul": (node, im) => {
            if (node.parentNode?.tag === "li") {
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
            const indent = "    ".repeat(depth);
            return `${indent}${listType} ${im.trim()}\n`;
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
        "i": (node, im) => {
            if (node.attributes?.class) {
                const classes: string[] = node.attributes.class.split(" ");
                if (im.trim().length === 0 && classes.some(c => c.startsWith("fa-"))) {
                    // Lazily render all FontAwesome icons as a replacement character
                    return "�";
                }
            }
            return null;
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

            const justifyLeft = (s: string | null, w: number) => {
                const sLen = s?.length || 0;
                return s + ' '.repeat(w - sLen);
            }
            const justifyRight = (s: string | null, w: number) => {
                const sLen = s?.length || 0;
                return ' '.repeat(w - sLen) + s;
            }
            const center = (s: string | null, w: number) => {
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
                                innerMarkup: renderer.renderNode(cell),
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
        // Generic block element rule
        "block": (node, im) => {
            if (im.trim().length > 0) {
                return `<${node.tag}>${im.trim()}</${node.tag}>\n`;
            }
            else {
                return null;
            }
        },
        // Wildcard rule, catching all other inline elements
        "*": (node, im) => {
            if (im.trim().length > 0) {
                return `<${node.tag}>${im.trim()}</${node.tag}>`;
            }
            else {
                return null;
            }
        },
    };

    // Inherit identical rules
    rules["div"] = rules["p"];
    rules["ol"] = rules["ul"];

    // Generic block elements
    rules["address"] = rules["block"];
    rules["article"] = rules["block"];
    rules["aside"] = rules["block"];
    rules["details"] = rules["block"];
    rules["dialog"] = rules["block"];
    rules["fieldset"] = rules["block"];
    rules["figcaption"] = rules["block"];
    rules["figure"] = rules["block"];
    rules["footer"] = rules["block"];
    rules["form"] = rules["block"];
    rules["header"] = rules["block"];
    rules["hgroup"] = rules["block"];
    rules["main"] = rules["block"];
    rules["nav"] = rules["block"];
    rules["section"] = rules["block"];

    return rules;
}
