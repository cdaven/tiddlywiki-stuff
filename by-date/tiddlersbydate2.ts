module TiddlersByDate2 {
    /** The macro name */
    exports.name = "tiddlersbydate2";

    const defaultFilter = "[all[tiddlers]!is[system]]";
    const defaultStartDate = null;
    const defaultEndDate = null; // Is set to today inside run()
    const defaultNumWeeks = "5";
    const defaultFirstDayOfWeek = "1";

    exports.params = [
        {
            // Tiddler filter
            name: "filter",
            default: defaultFilter
        },
        {
            // First day of list
            name: "startDate",
            default: defaultStartDate
        },
        {
            // Last day of list
            name: "endDate",
            default: defaultEndDate
        },
        {
            // Number of weeks from start OR end date
            name: "numWeeks",
            default: defaultNumWeeks
        },
        {
            // First day of week (1 = Monday, 0 = Sunday)
            name: "firstDayOfWeek",
            default: defaultFirstDayOfWeek
        }
    ];

    /** Get date of tiddler */
    function getTiddlerDate(tiddler: Tiddler): Date {
        if (tiddler.fields.at) {
            return $tw.utils.parseDate(tiddler.fields.at);
        }
        else {
            return tiddler.fields.created;
        }
    }

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

    /** Convert Date to a ISO date string, without time */
    function stringifyDateOnly(d: Date): string {
        return $tw.utils.stringifyDate(d).substr(0, 8);
    }

    /** Get the first day of the week containing `d` */
    function getFirstDayOfTheCalendar(d: Date, firstDayOfWeek: number): Date {
        let clone = new Date(d);
        // Back until first day of week
        while (clone.getDay() != firstDayOfWeek) {
            subDays(clone, 1);
        }
        return clone;
    }

    /** Get the last day of the week containing `d` */
    function getLastDayOfTheCalendar(d: Date, lastDayOfWeek: number): Date {
        let clone = new Date(d);
        // Advance until last day of week
        while (clone.getDay() != lastDayOfWeek) {
            addDays(clone, 1);
        }
        return clone;
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

    function getFirstAndLastDays(startDateString: string | null, endDateString: string | null, numWeeks: number, firstWeekDay: number): [Date, Date] {
        const lastWeekDay = (firstWeekDay + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;

        let startDate: Date | null = startDateString ? $tw.utils.parseDate(startDateString) : null;
        let endDate: Date | null = endDateString ? $tw.utils.parseDate(endDateString) : null;

        if (startDate == null && endDate == null) {
            // If both are omitted, should end with today
            endDate = new Date();
        }

        if (startDate == null && endDate != null) {
            // Set startDate based on endDate and numWeeks
            startDate = new Date(endDate.getTime() - MS_PER_DAY * 7 * numWeeks);
        }
        else if (startDate != null && endDate == null) {
            // Set endDate based on startDate and numWeeks
            endDate = new Date(startDate.getTime() + MS_PER_DAY * 7 * numWeeks);
        }

        const firstDay = getFirstDayOfTheCalendar(startDate!, firstWeekDay);
        const lastDay = getLastDayOfTheCalendar(endDate!, lastWeekDay);

        return [firstDay, lastDay];
    }

    exports.run = (filter: string = defaultFilter, startDate: string = "", endDate: string = "", numWeeks: string = defaultNumWeeks, firstDayOfWeek: string = defaultFirstDayOfWeek): string => {
        const firstWeekDay = parseInt(firstDayOfWeek);
        const numWeeksInt = parseInt(numWeeks);


        // const tiddlersByDate = getTiddlerLookup<string>(
        //     filter,
        //     (tiddler) => {
        //         const td = getTiddlerDate(tiddler);
        //         return td >= firstDay && td <= lastDay;
        //     },
        //     (tiddler) => stringifyDateOnly(getTiddlerDate(tiddler))
        // );

        // let output: string[] = [];
        // if (Object.keys(tiddlersByDate).length > 0) {
        //     let currentDay = new Date(firstDay);

        //     while (currentDay <= lastDay) {
        //         if (currentDay.getDay() == firstWeekDay) {
        //             output.push(`* Week ${$tw.utils.formatDateString(currentDay, "WW")}`);
        //         }

        //         const dayLabel = $tw.utils.formatDateString(currentDay, "DDD");
        //         const tiddlers = tiddlersByDate[stringifyDateOnly(currentDay)];
        //         if (tiddlers) {
        //             output.push(`** ${dayLabel}`);
        //             for (const tiddler of tiddlers) {
        //                 const tags = tiddler.fields.tags
        //                     ? tiddler.fields.tags.map(t => `<<tag-pill "${t}">>`)
        //                     : [];

        //                 output.push(`*** [[${tiddler.fields.title}]] ${tags.join(" ")}`);
        //             }
        //         }
        //         else {
        //             output.push(`** <span class="text-muted">${dayLabel}</span>`);
        //         }

        //         addDays(currentDay, 1);
        //     }
        // }
        // return output.join("\r\n");

        return "";
    };
}
