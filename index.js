"use strict";

let GtfsRealtimeBindings = require('gtfs-realtime-bindings');
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
let Bus = mongoose.model('Bus', { id: String, route: String });

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
            storeBus(bus.id.replace(/\D/g, ''), bus.vehicle.trip.route_id.replace(/\D/g, ''))
        }
    }
    
    Bus.collection.insert(buses, quit);
})

function storeBus(busId, routeId)
{
    buses.push({id: busId, route: routeId, added: NOW })
}

function quit(err)
{
    if(err) console.error(err);
    process.exit(!!err);
}