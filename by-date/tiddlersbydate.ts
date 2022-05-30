module TiddlersByDate {
    exports.name = "tiddlersbydate";

    exports.params = [
        {
            name: "days",
            default: "30"
        },
        {
            name: "dateFormat",
            default: "YYYY-0MM-0DD (DDD)"
        }
    ];

    exports.run = (days: string, dateFormat: string): string => {
        console.log("Running macro TiddlersByDate with arguments", days, dateFormat);

        let allTiddlers: Record<string, Tiddler[]> = {};
        let dateSet = new Set<string>();
        $tw.wiki.each((currentTiddler: Tiddler) => {
            if (!$tw.wiki.isSystemTiddler(currentTiddler.fields.title)
                && typeof currentTiddler.fields["draft.of"] === "undefined"
                && (currentTiddler.fields.type === "text/vnd.tiddlywiki" || currentTiddler.fields.type === "text/x-markdown")) {
                let atDate: Date = currentTiddler.fields.created;
                if (typeof currentTiddler.fields.at !== "undefined") {
                    atDate = $tw.utils.parseDate(currentTiddler.fields.at);
                }
                let dateString: string = $tw.utils.stringifyDate(atDate).substr(0, 8);
                if (typeof allTiddlers[dateString] !== "undefined") {
                    allTiddlers[dateString].push(currentTiddler);
                }
                else {
                    allTiddlers[dateString] = [currentTiddler];
                }
                dateSet.add(dateString);
            }
        });

        let output = "";
        let dateArray = [...dateSet].sort().reverse().slice(0, parseInt(days));
        for (let dte of dateArray) {
            output += `\r\n!! ${$tw.utils.formatDateString($tw.utils.parseDate(dte), dateFormat)}\r\n\r\n`;
            for (let tdlr of allTiddlers[dte]) {
                output += `* [[${tdlr.fields.title}]]\r\n`;
            }
        }
        return output;
    };
}
