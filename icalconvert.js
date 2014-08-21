'use strict';

var ical = require('ical'),
		_ = require('lodash'),
  	fs = require('fs'),
  	uuid = require('node-uuid'),
  	async = require('async'),
  	RRule = require('rrule').RRule;

var facilityIds = {
		"TPTEST":"1e792b6a-4389-4a0c-a74b-4c4519281545",
		"PLZM": "7de2d0db-1106-4cf6-84a8-9014d2897c26",
		"ARC": "584091d3-7898-4bc2-8859-cc5182c522da",
		"15CS": "6b89f2a0-1d71-46b5-be4f-2d42452141ba"
};

var calURLs = {
		"TPTEST": "https://www.google.com/calendar/ical/hisagely%40gmail.com/private-1cb4edeef56590a5c8a7374fe5c73c31/basic.ics",
		"PLZM": "https://www.google.com/calendar/ical/hisagely%40gmail.com/private-1cb4edeef56590a5c8a7374fe5c73c31/basic.ics",
		"ARC": "https://www.google.com/calendar/ical/hisagely%40gmail.com/private-1cb4edeef56590a5c8a7374fe5c73c31/basic.ics",
		"15CS": "https://www.google.com/calendar/ical/hisagely%40gmail.com/private-1cb4edeef56590a5c8a7374fe5c73c31/basic.ics"
};

var path = '../the-real-app/etc/data/',
		eventLists = {
			"TPTEST": "event-test.json",
			"PLZM": "event-plaza.json",
			"ARC": "event-arcadia.json",
			"15CS": "event-15craigside.json"
		};

// if (process.argv.length < 4) {
//   console.log('Usage: ecal2.js [CommunityAbbr] [YYYY-MM] e.g., ecal2.js PLZM 2014-09 (PLZM, ARC, 15CS, TPTEST)');
//   process.exit(1);
// }

var abbr = process.argv[2],
		facilityId = facilityIds[abbr],
		calURL = calURLs[abbr],
		eventList = require(path + eventLists[abbr]);

//console.log ('community ' + abbr + ' ID' + facilityId);

/*

	Update A new month calendar for a facility

	Input 1: Exisitng facility calendar .json file (including testing calendar)
	Input 2: Google Calendar for the facility, restricted by month

	Process:
		loop through ical event, expand reoccuring events
			if event doesn't exist, add, with event id
			if event exist, update - don't touch event id

	Output: updated .json file
*/

var calEventList = [];

/* 
Output .json
*/
var newEventFile = function (eventList) {
	//fs.writeFile(eventList, JSON.stringify(
	fs.writeFile("test.json", JSON.stringify(
		_.sortBy(eventList, function (events) {
	  		var eventDate = new Date(events.startTime);
	  		return eventDate.toISOString();
		}), null, 2), function (err) { 
			if (err) { 
				console.log('error: ' + err); 
			}
			else {
				console.log('File created');
			}
		}
	)};

/* 
Testing file, parsed .ics json file 
*/
var parsedICSFile = function (data) {
	//fs.writeFile(eventList, JSON.stringify(
	fs.writeFile("testICS.json", JSON.stringify(data, null, "  "), function (err) { 
			if (err) { 
				console.log('error: ' + err); 
			}
			else {
				console.log('ics parsed json created');
			}
		}
	)};

/*
Process:
*/
//var data = ical.parseFile('basic.ics');
ical.fromURL(calURL, {}, function(err, data){
  _.forEach(data, function(ev) {
  	if (ev.type == 'VEVENT'){
  		// deal with recurring events
  		// this version is not handling changed instances of a recurring series, only deleted ones
  		// Double check recurring rules that generate no instance!!!!!
  		if (ev.rrule){
  			var rule = new RRule({
  					freq: ev.rrule.options.freq,
  					dtstart: new Date(ev.rrule.options.dtstart.getFullYear()
															,ev.rrule.options.dtstart.getMonth()
															,ev.rrule.options.dtstart.getDate()),
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

  			// Only set until option if it exists
  			if (ev.rrule.options.until) {
  				rule.options.until = new Date(ev.rrule.options.until.getFullYear()
															,ev.rrule.options.until.getMonth()
															,ev.rrule.options.until.getDate()
															,11,59,59);
  			};
		    
  			// Get all individula occurance
		    var repeatDates = rule.all(),
		    		exceptionDates = [];

		    // If there are expections (individual recur removed), remove them	
		    // Compare using the value of date object	
  			if (ev.exdate) {
  				_.forEach(ev.exdate,function(date){ 
  						date.setHours(0,0,0,0);
  						exceptionDates.push(date.valueOf());
  					});
			    _.remove(repeatDates, function(date){ return _.find(exceptionDates, function(val){ 
    					return (val == date.valueOf());
    					});
	    			}); 
		    };

		    if (repeatDates) {
		    	_.forEach(repeatDates, function(date){
		      		calEventList.push({
			  			"facilityId": facilityId,
						  "name": ev.summary,
						  "startTime": new Date(date.getFullYear() 
						  											,date.getMonth() 
						  											,date.getDate()
						  											,ev.start.getHours()
						  											,ev.start.getMinutes()
						  											,ev.start.getSeconds()),
						  "location": ev.location,
						  "department": ev.description,
						  "id": uuid.v4()
		  				});		
		    	});
		    };
  			//console.log(repeatDates);

  		}
	  	else {
	  		calEventList.push({
	  			"facilityId": facilityId,
				  "name": ev.summary,
				  "startTime": ev.start,
				  "location": ev.location,
				  "department": ev.description,
				  "id": uuid.v4()
			  });
	  	};
		};
  });
  parsedICSFile(data);
  newEventFile(calEventList);
});






