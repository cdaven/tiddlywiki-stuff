/*\
title: $:/plugins/cdaven/markdown-export/zip-archive.js
type: application/javascript
module-type: library
\*/

export class ZipArchive {
    private archive: any = null;

    constructor(private title: string) {
        const JSZip = desire("$:/plugins/tiddlywiki/jszip/jszip.js");
        if (JSZip !== undefined) {
            this.archive = new JSZip();
        }
    }

    public isEnabled(): boolean {
        return this.archive != null;
    }

    /** Load archive from a tiddler */
    public load() {
        if (!this.isEnabled()) {
            console.error("JSZip plugin probably missing");
            return;
        }

        const tiddler = $tw.wiki.getTiddler(this.title);
        if (tiddler && tiddler.fields.type === "application/zip") {
            try {
                this.archive.load(tiddler.fields.text, { base64: true });
            } catch (e) {
                console.error("JSZip error: " + e)
            }
        }
        else {
            console.warn("Missing tiddler or wrong type: ", this.title);
        }
    }

    /** Save archive to a tiddler */
    public save() {
        if (!this.isEnabled()) {
            console.error("JSZip plugin probably missing");
            return;
        }

        $tw.wiki.addTiddler({
            title: this.title,
            type: "application/zip",
            text: this.toBase64()
        });
    }

    /** Add file to archive */
    public addFile(filename: string, contents: string) {
        if (!this.isEnabled()) {
            console.error("JSZip plugin probably missing");
            return;
        }

        this.archive.file(filename, contents);
    }

    /** Render archive with Base64-encoding */
    public toBase64(): string {
        return this.archive.generate({ type: "base64" });
    }
}

/** Like require, but doesn't throw errors when module is missing */
function desire(moduleName: string): any | undefined {
    return $tw.modules.titles[moduleName] ? require(moduleName) : undefined;
}
