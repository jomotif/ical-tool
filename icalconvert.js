/*
	Add calendar events for a given date range for a community

	Input 1: Exisitng community calendar .json file (including testing calendar)
	Input 2: Google Calendar for the community

	Process:
		Compare with existing events  
			if no events found in the given date range, proceed
			else abort		
		Loop through ical events, expand reoccuring events
			Generate events within date range, with event id

	Output: updated .json file (currently the new events, to be appended to existing event.json file)

	NOTE: NEED to change calURL or path if this scirpt is added to the-real-app project
*/

'use strict';

var ical = require('ical'),
		_ = require('lodash'),
		fs = require('fs'),
		uuid = require('node-uuid'),
		async = require('async'),
		RRule = require('rrule').RRule,
		moment = require('moment');

var facilityIds = {
		"TEST":"1e792b6a-4389-4a0c-a74b-4c4519281545",
		"PLZM": "7de2d0db-1106-4cf6-84a8-9014d2897c26",
		"ARC": "584091d3-7898-4bc2-8859-cc5182c522da",
		"15CS": "6b89f2a0-1d71-46b5-be4f-2d42452141ba"
};

var calURLs = {
		// "TEST": "https://www.google.com/calendar/ical/hisagely%40gmail.com/private-1cb4edeef56590a5c8a7374fe5c73c31/basic.ics",
		"TEST": "https://www.google.com/calendar/ical/tsmijhd3k1bqcuhrtec7k8n2a0%40group.calendar.google.com/private-31ccf03b8881970dea83f924bf93445f/basic.ics",
		"PLZM": "https://www.google.com/calendar/ical/u8mmqivklumu76pphe13s4mcf8%40group.calendar.google.com/private-e6d574fecfa2027cd52f8d33423b60e7/basic.ics",
		"ARC": "https://www.google.com/calendar/ical/0s2vnhlr8qqm9kvk707mupt5g4%40group.calendar.google.com/private-8c955f19ad3ae7c0f03c82f24e1e1a6c/basic.ics",
		"15CS": "https://www.google.com/calendar/ical/8qve8mfi7ju2a2e65n42ttgcu0%40group.calendar.google.com/private-f3ee71450231a01d4813e39e262f8c63/basic.ics"
};

var path = '../the-real-app/etc/data/',
		eventLists = {
			"TEST": "event-test.json",
			"PLZM": "event-plaza.json",
			"ARC": "event-arcadia.json",
			"15CS": "event-15craigside.json"
		};

if (process.argv.length < 4) {
	console.log('Usage: icalconvert.js [CommunityAbbr(PLZM, ARC, 15CS, TEST)] [From date YYYY-MM-DD] [To date YYYY-MM-DD]' +
	' e.g., icalconvert.js PLZM 2014-09-01 2014-09-30');
  process.exit(1);
}

var abbr = process.argv[2],
		facilityId = facilityIds[abbr],
		calURL = calURLs[abbr],
		eventList = require(path + eventLists[abbr]),
		calFrom = new Date(process.argv[3]+'T00:00:00-10:00'),
		calTo	= new Date(process.argv[4]+'T23:59:59-10:00');

console.log('Calendar From ' + calFrom + 'To ' + calTo);

if (_.find(eventList, function(ev){
			var curr = new Date(ev.startTime);
			return (curr >= calFrom) && (curr <= calTo);})) {
	console.log('Event exists for the given date range, abort');
	process.exit(1);
}


//console.log ('community ' + abbr + ' ID' + facilityId);



var calEventList = [];

/* 
Output .json
*/
var newEventFile = function (eventList, dateFrom, dateTo) {
	//fs.writeFile(eventList, JSON.stringify(
	fs.writeFile("test.json", JSON.stringify(
		// _.sortBy(eventList, function (events) {
		_.sortBy(_.filter(eventList, function(ev) {
							var curr = new Date(ev.startTime);
							// console.log('event start: ' + curr );
							return (curr >= dateFrom) && (curr <= dateTo); }),
						function (events) {
						var eventDate = new Date(events.startTime);
						return eventDate.toISOString();}), null, 2), function (err) {
							if (err) {
								console.log('error: ' + err);
							}
							else {
								console.log('File created');
							}
		}
	);
};

/* 
Testing file, parsed .ics json file 
*/
var parsedICSFile = function (data) {
	fs.writeFile("testICS.json", JSON.stringify(data, null, "  "), function (err) {
			if (err) {
				console.log('error: ' + err);
			}
			else {
				console.log('ics parsed json created');
			}
		}
	);
};

/*
Process:
*/
//var data = ical.parseFile('basic.ics');
ical.fromURL(calURL, {}, function(err, data){
	var chgEvents = []; // data is a json object - try to find all changed events out of a rrule
	/*
	*/


  _.forEach(data, function(ev) {
		if (ev.type == 'VEVENT') {
		// deal with recurring events - ical.js has a bug using rrule.js to parse RRULE - should use original dtstart 
		// instead of default current date
		// this version is not handling changed instances of a recurring series, only deleted ones
		// Double check recurring rules that generate no instance!!!!!
		if (ev.rrule) {
			var rule = new RRule({
				freq: ev.rrule.options.freq,
				dtstart: new Date(ev.start.getFullYear(),
													ev.start.getMonth(),
													ev.start.getDate(),
													ev.start.getHours(),
													ev.start.getMinutes(),
													ev.start.getSeconds()),
				interval: ev.rrule.options.interval,
				wkst: ev.rrule.options.wkst,
				count: ev.rrule.options.count,
				bysetpos: ev.rrule.options.bysetpos,
				bymonth: ev.rrule.options.bymonth,
				bymonthday: ev.rrule.options.bymonthday,
				byyearday: ev.rrule.options.byyearday,
				byweekno: ev.rrule.options.byweekno,
				byweekday: ev.rrule.options.byweekday
			});

			// set until option only if it exists
			if (ev.rrule.options.until) {
				rule.options.until = new Date(ev.rrule.options.until.getFullYear(),
																			ev.rrule.options.until.getMonth(),
																			ev.rrule.options.until.getDate(),
																			ev.start.getHours(),
																			ev.start.getMinutes(),
																			ev.start.getSeconds());
			}

			// Get all individula occurance
			var repeatDates = rule.all(),
					exceptionDates = [];

			// If there are expections (individual recur removed), remove them	
			// Compare using the value of date object	
			if (ev.exdate) {
				_.forEach(ev.exdate,function(date){
					exceptionDates.push(date.valueOf());
				});
				_.remove(repeatDates, function(date){
						return _.find(exceptionDates, function(val){
							return (val == date.valueOf());
							});
						});
			}


			if (repeatDates) {
				_.forEach(repeatDates, function(date){
					calEventList.push({
						"facilityId": facilityId,
						"name": ev.summary,
						"startTime": moment(new Date(date.getFullYear(),
																					date.getMonth(),
																					date.getDate(),
																					ev.start.getHours(),
																					ev.start.getMinutes(),
																					ev.start.getSeconds())).format(),
						"location": (ev.location === "") ? null : ev.location,
						"department": (ev.description === "") ? null : ev.description,
						"id": uuid.v4()
					});
				});
			}
			console.log(repeatDates);

		}
		else {
			calEventList.push({
				"facilityId": facilityId,
				"name": ev.summary,
				"startTime": moment(ev.start).format(),
				"location": (ev.location === "") ? null : ev.location,
				"department": (ev.description === "") ? null : ev.description,
				"id": uuid.v4()
			});
		}
		}
	});

  parsedICSFile(data);
  newEventFile(calEventList, calFrom, calTo);
});






