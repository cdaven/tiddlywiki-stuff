/*\
title: $:/plugins/cdaven/markdown-export/core.js
type: application/javascript
module-type: library
\*/

export interface IWikiRenderer {
    renderWidgetTree(title: string): TW_Node[];
    wikifyText(text: string): string;
    getFields(title: string): TiddlerFields | null;
}

export interface IMarkupRenderer {
    renderTiddler(title: string): string | null;
    renderNode(node: TW_Node): string | null;
    getNextNode(node: TW_Node): TW_Node | null;
}
