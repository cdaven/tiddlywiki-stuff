export const name = "tiddlercalendar";

const defaultFilter = "[all[tiddlers]!is[system]]";
const defaultFirstDayOfWeek = "1";
const defaultDateFormat = "mmm DD";
const defaultWeekDayFormat = "DDD";

export const params = [
    {
        name: "filter",
        default: defaultFilter
    },
    {
        name: "year",
        default: null
    },
    {
        name: "firstDayOfWeek",
        default: defaultFirstDayOfWeek
    },
    {
        name: "dateFormat",
        default: defaultDateFormat
    },
    {
        name: "weekDayFormat",
        default: defaultWeekDayFormat
    }
];

const MS_PER_DAY = 24 * 3600 * 1000;
const DAYS_PER_WEEK = 7;

/** Add days to date, in place */
function addDays(d: Date, numDays: number): void {
    d.setTime(d.getTime() + numDays * MS_PER_DAY);
}

/** Subtract days from date, in place */
function subDays(d: Date, numDays: number): void {
    d.setTime(d.getTime() - numDays * MS_PER_DAY);
}

/** Get the first day of the first week of a month containing `d` */
function getFirstDayOfTheCalendar(d: Date, firstDayOfWeek: number): Date {
    let clone = new Date(d);
    // Set first day of month
    clone.setDate(1);
    // Back until first day of week
    while (clone.getDay() != firstDayOfWeek) {
        subDays(clone, 1);
    }
    return clone;
}

/** Get the last day of the week containing `d` */
function getFirstDayOfTheWeek(d: Date, firstDayOfWeek: number): Date {
    let clone = new Date(d);
    // Back until first day of week
    while (clone.getDay() != firstDayOfWeek) {
        subDays(clone, 1);
    }
    return clone;
}

/** Get the last day of the week containing `d` */
function getLastDayOfTheWeek(d: Date, lastDayOfWeek: number): Date {
    let clone = new Date(d);
    // Advance until last day of week
    while (clone.getDay() != lastDayOfWeek) {
        addDays(clone, 1);
    }
    return clone;
}

/** Get the last day of the last week of a month containing `d` */
function getLastDayOfTheCalendar(d: Date, lastDayOfWeek: number): Date {
    let clone = new Date(d);
    // Add days to end up in the next month
    addDays(clone, 32 - clone.getDate());
    // Set to first of next month
    clone.setDate(1);
    // Go back one day
    subDays(clone, 1);
    // Advance until last day of week
    while (clone.getDay() != lastDayOfWeek) {
        addDays(clone, 1);
    }
    return clone;
}

/** Get date of tiddler, either from "at" field or "created" */
function getTiddlerDate(tiddler: Tiddler): Date | undefined {
    if (tiddler.fields.at) {
        return $tw.utils.parseDate(tiddler.fields.at);
    }
    else {
        return tiddler.fields.created;
    }
}

/** Get local date as the number of days since Unix Epoch 0 */
function getDateAsNumber(d: Date): number {
    return Math.floor((d.getTime() - (d.getTimezoneOffset() * 60000)) / MS_PER_DAY);
}

/** Get string array of weekday names starting with the given date */
function getWeekDays(firstDay: Date, dateFormat: string): string[] {
    let weekDays: string[] = [];
    let currentDay = new Date(firstDay);
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
        weekDays.push($tw.utils.formatDateString(currentDay, dateFormat));
        addDays(currentDay, 1);
    }
    return weekDays;
}

function isNormalTiddler(currentTiddler: Tiddler): boolean {
    return !$tw.wiki.isSystemTiddler(currentTiddler.fields.title)
        && !$tw.wiki.isImageTiddler(currentTiddler.fields.title)
        && !$tw.wiki.isBinaryTiddler(currentTiddler.fields.title);
}

type RecordKeyTypes = string | number | symbol;

function getTiddlerLookup<T extends RecordKeyTypes>(filter: string, filterFun: (tiddler: Tiddler) => boolean, keyFun: (tiddler: Tiddler) => T): Record<T, Tiddler[]> {
    const tiddlerTitles = $tw.wiki.filterTiddlers(filter);
    const tiddlerIterator = $tw.wiki.makeTiddlerIterator(tiddlerTitles);

    let tiddlers = {} as Record<T, Tiddler[]>;
    tiddlerIterator((tiddler: Tiddler, _) => {
        if (!filterFun(tiddler)) {
            return;
        }

        const key = keyFun(tiddler);
        if (tiddlers[key]) {
            tiddlers[key].push(tiddler);
        }
        else {
            tiddlers[key] = [tiddler];
        }
    });
    return tiddlers;
}

function getAllTiddlersInDateRangeByDate(filter: string, minDate: Date, maxDate: Date): Record<number, Tiddler[]> {
    const minDateNum = getDateAsNumber(minDate);
    const maxDateNum = getDateAsNumber(maxDate);

    return getTiddlerLookup<number>(
        filter,
        (tiddler) => {
            if (!isNormalTiddler(tiddler)) {
                return false;
            }
    
            const _td = getTiddlerDate(tiddler);
            if (_td == null) {
                console.error("Couldn't get date from tiddler", tiddler);
                return false;
            }
            const tiddlerDate = getDateAsNumber(_td);
            return tiddlerDate >= minDateNum && tiddlerDate <= maxDateNum;
        },
        (tiddler) => getDateAsNumber(getTiddlerDate(tiddler)!)
    );
}

export function run(filter: string = defaultFilter, year: string = "", firstDayOfWeek: string = defaultFirstDayOfWeek, dateFormat: string = defaultDateFormat, weekDayFormat: string = defaultWeekDayFormat): string {
    console.log("Running macro TiddlerCalendar with arguments", { filter, year, firstDayOfWeek, dateFormat, weekDayFormat });

    const _year = parseInt(year);
    const _firstDayOfWeek = parseInt(firstDayOfWeek);
    const _lastDayOfWeek = (_firstDayOfWeek + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
    const today = new Date();

    let firstDayOfTheCalendar: Date;
    let lastDayOfTheCalendar: Date;

    if (isNaN(_year)) {
        // Let calendar start 4 weeks back
        firstDayOfTheCalendar = getFirstDayOfTheWeek(today, _firstDayOfWeek);
        subDays(firstDayOfTheCalendar, 3 * 7);

        // Let calendar end the current week
        lastDayOfTheCalendar = getLastDayOfTheWeek(today, _lastDayOfWeek);
    }
    else {
        // Let calendar include the whole week of January 1
        let jan1 = new Date(_year, 0, 1);
        firstDayOfTheCalendar = getFirstDayOfTheWeek(jan1, _firstDayOfWeek);

        // Let calendar include the whole week of December 31
        let lastDay = new Date(_year, 11, 31);
        if (lastDay.getTime() > today.getTime()) {
            // Not December 31 yet, let calendar end current week
            lastDay = today;
        }
        lastDayOfTheCalendar = getLastDayOfTheWeek(lastDay, _lastDayOfWeek);
    }

    const tiddlers = getAllTiddlersInDateRangeByDate(filter, firstDayOfTheCalendar, lastDayOfTheCalendar);
    const weekDays = getWeekDays(firstDayOfTheCalendar, weekDayFormat);

    let tbody = "";
    let weekRow = [];
    for (let currentDay = new Date(firstDayOfTheCalendar); getDateAsNumber(currentDay) <= getDateAsNumber(lastDayOfTheCalendar); addDays(currentDay, 1)) {

        const dayTiddlers = tiddlers[getDateAsNumber(currentDay)] ?? [];
        const dateString = getDateAsNumber(currentDay) === getDateAsNumber(today)
            ? "<mark>TODAY</mark>"
            : $tw.utils.formatDateString(currentDay, dateFormat);

        weekRow.push(`<td><p>${dateString}</p> <ul>${dayTiddlers.map((tiddler) => `<li>[[${tiddler.fields.title}]]</li>`).join("")}</ul></td>`);
        if (weekRow.length === DAYS_PER_WEEK) {
            // The week row is complete
            tbody += `<tr>${weekRow.join("")}</tr>`;
            // Start over with next week
            weekRow = [];
        }

    }

    return `
        <style type="text/css">
            table.tiddlercalendar { font-size: 85%; }
            table.tiddlercalendar th,
            table.tiddlercalendar td { width: 14.29%; vertical-align: top; text-align: center; }
            table.tiddlercalendar ul { min-height: 100px; text-align: left; padding-left: 20px; }
            table.tiddlercalendar li { margin-bottom: 6px; }
        </style>
        <table class="tiddlercalendar">
            <thead>${weekDays.map((wd) => `<th>${wd}</th>`).join("")}</thead>
            <tbody>${tbody}</tbody>
        </table>
    `;
};
