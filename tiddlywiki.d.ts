declare let exports: TWMacro;
declare let $tw: $TW;

interface TWMacro {
    name: string;
    params: TWMacroParam[];
    run: (...args: any[]) => string;
}

interface TWMacroParam {
    name: string;
    default: string | null;
}

interface $TW {
    wiki: TW_Wiki;
    utils: TW_Utils;
    fakeDocument: any;
}

type _tiddler_callback = (tiddler: Tiddler, title: string) => void;

interface TW_Wiki {
    each: (callback: _tiddler_callback) => void;
    getTiddler: (title: string) => Tiddler;
    isSystemTiddler: (title: string) => boolean;
    isTemporaryTiddler: (title: string) => boolean;
    isVolatileTiddler: (title: string) => boolean;
    isImageTiddler: (title: string) => boolean;
    isBinaryTiddler: (title: string) => boolean;
    filterTiddlers: (filterString: string, widget?: any, source?: any) => string[];
    makeTiddlerIterator: (titles: string[]) => (callback: _tiddler_callback) => void;
    makeWidget: (parser: TW_Parser, options?: any) => TW_Widget;
    makeTranscludeWidget: (title: string, options?: any) => TW_Widget;
    parseTiddler: (title: string, options?: any) => TW_Parser;
    parseText: (type: string, text?: string, options?: any) => TW_Parser;
    renderTiddler: (outputType: string, title: string, options?: any) => string;
    renderText: (outputType: string, textType: string, text: string, options?: any) => string;
}

interface TW_Node {
    nodeType: number;
    parentNode?: TW_Element;
}

interface TW_Element extends TW_Node {
    tag: string;
    attributes: any;
    children: TW_Node[];
    rawHTML?: string;
}

interface TW_TextNode extends TW_Node {
    textContent: string;
}

interface TW_Widget {
    render: (parent: any, nextSibling: any) => void;
}

interface TW_Parser {
    tree: TW_ParserNode[];
}

interface TW_ParserNode {
    type: string;
    tag: string;
    text?: string;
    children?: TW_ParserNode[];
    attributes?: any;
}

interface TW_Utils {
    parseDate: (value: string | Date) => Date;
    stringifyDate: (value: Date) => string;
    formatDateString: (value: Date, format: string) => string;
}

interface Tiddler {
    fields: TiddlerFields;
}

interface TiddlerFields {
    at?: string;
    bag: string;
    caption?: string;
    created: Date;
    "draft.of"?: string;
    modified: Date;
    revision: string;
    tags: string[];
    text?: string;
    title: string;
    type: TiddlerType;
}

type TiddlerType = "text/vnd.tiddlywiki" | "text/x-markdown";
