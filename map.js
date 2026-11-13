import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN_HERE';

const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/z2ong/cmwesa851008g01st13frhsh0', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});

const svg = d3.select('#map').select('svg');

let circles;

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point); // Project to pixel coordinates
  return { cx: x, cy: y }; // Return as object for use in SVG attributes
}

function updatePositions() {
  circles
    .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
    .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
}

map.on('load', async () => {

    map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
    });

    map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': '#32D400',
      'line-width': 5,
      'line-opacity': 0.6
    },
    });

    map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': '#32D400',
      'line-width': 5,
      'line-opacity': 0.6
    },
    });


    let jsonData;
    try {
      const jsonurl = 'bluebikes-stations.json';
      const jsonData = await d3.json(jsonurl);
      console.log('Loaded JSON Data:', jsonData); // Log to verify structure

      const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
      const trips = await d3.csv(trafficUrl);
      console.log('Loaded Traffic Data (Trips):', trips);

      const departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id
      );

      const arrivals = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.end_station_id
      );

      let stations = jsonData.data.stations;
    
      stations = stations.map((station) => {
        let id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures
        return station;
      });

      console.log('Processed Stations with Traffic:', stations);

      const radiusScale = d3
        .scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);

      circles = svg
        .selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue') // Circle fill color
        .attr('stroke', 'white') // Circle border color
        .attr('stroke-width', 1) // Circle border thickness
        .attr('opacity', 0.8) // Circle opacity
        .each(function (d) {
          d3.select(this)
            .append('title')
            .text(
              `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
            );
        });
      
      updatePositions();
      map.on('move', updatePositions); // Update during map movement
      map.on('zoom', updatePositions); // Update during zooming
      map.on('resize', updatePositions); // Update on window resize
      map.on('moveend', updatePositions); // Final adjustment after movement ends
    } catch (error) {
      console.error('Error loading JSON:', error); // Handle errors
    }
});


