"use strict";

let GtfsRealtimeBindings = require('gtfs-realtime-bindings');
let async = require('async');
let mongoose = require('mongoose');
let program = require('commander');
let request = require('request');

let NOW = new Date();
let buses = []; // eehhhhhhhhhhhhhh TODO: not do this

program.version('1.0.0')
        .description(require('./package.json').description)
        .option('-m, --mongo <url>', 'MongoDB url [mongodb://localhost:27017/grt]', 'mongodb://localhost:27017/grt')
        .parse(process.argv)
        
// Initialize MongoDB connection
mongoose.connect(program.mongo);
let Bus = mongoose.model('Bus', { id: String, route: String, added: Date, tripStart: Date, tripId: String, status: String });

let gtfsRequestOptions = {
    method: 'GET',
    url: 'http://192.237.29.212:8080/gtfsrealtime/VehiclePositions', // http://www.regionofwaterloo.ca/en/regionalGovernment/GRT_GTFSdata.asp
    encoding: null,
}

// Request the live transit info
request(gtfsRequestOptions, (err, response, body) => {
    if(err) quit(err);
    
    else if(response.statusCode === 200)
    {
        // parse binary data with Google's official product
        let feed = GtfsRealtimeBindings.FeedMessage.decode(body);
        console.log(feed.entity.length);
        for(let b = 0; b < feed.entity.length; b++)
        {
            let bus = feed.entity[b];
            let busId = bus.id.replace(/\D/g, '');
            let routeId = bus.vehicle.trip.route_id;
            console.log(busId + '\t', routeId + '\t', bus.vehicle.current_stop_sequence + '\t', bus.vehicle.current_status+'\t', bus.vehicle.trip.trip_id);
            let tripStartDate = constructTripDate(bus.vehicle.trip.start_date, bus.vehicle.trip.start_time);
            let tripId = bus.vehicle.trip.trip_id;
            let status = bus.vehicle.current_status;
            storeBus(busId, routeId, tripStartDate, tripId, status);
        }
    }
    
    async.each(buses, (bus, callback) => {
        Bus.update({ tripStart: bus.tripStart, id: bus.id }, bus, { upsert: true }, callback)
    }, quit);
})

function storeBus(busId, routeId, tripStartDate, tripId, status)
{
    buses.push({
        id: busId,
        route: routeId,
        added: NOW,
        tripStart: tripStartDate,
        tripId: tripId,
        status: status,
    })
}

function constructTripDate(dateString, timeString) { // YYYYMMDD, HH:MM:SS
    let year = +dateString.substring(0, 4);
    let month = +dateString.substring(4, 6);
    let day = +dateString.substring(6, 8);
    
    let timeSplit = timeString.split(':');
    let hour = +timeSplit[0];
    let minute = +timeSplit[1];
    let seconds = +timeSplit[2];
    
    return new Date(year, month-1, day, hour, minute, seconds);
}

function quit(err)
{
    if(err) console.error(err);
    process.exit(!!err);
}