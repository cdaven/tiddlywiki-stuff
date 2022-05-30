const tiddlercalendar = require('./tiddlercalendar');

// var output = tiddlercalendar.run(null, 1);

var fd = tiddlercalendar.getFirstDayOfTheCalendar(new Date(), 1);
var ld = tiddlercalendar.getLastDayOfTheCalendar(new Date(), 0);

console.log("first", fd);
console.log("lasst", ld);
