/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoia2NodW1hayIsImEiOiJjbGliaDN3ZmowZGs3M3FtdGx2NGJma283In0.rCx_1fsTIq5B00zNmh_K3w';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/kchumak/clibhc3jo02xq01png9uh6mui',
    scrollZoom: false,
    // center: [-118.340182, 34.054748],
    // zoom: 10,
    // interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create a marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add a marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add a popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description} </p>`)
      .addTo(map);

    // extend ma bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: { top: 200, bottom: 200, left: 100, right: 100 },
  });
};
