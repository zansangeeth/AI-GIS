let map;
let geojsonData;
let layerId = 'geojson-layer';

document.getElementById('fileInput').addEventListener('change', event => {
  const reader = new FileReader();
  reader.onload = e => {
  const topo = JSON.parse(e.target.result);
  const objectKey = Object.keys(topo.objects)[0]; // "lad" in your case
  geojsonData = topojson.feature(topo, topo.objects[objectKey]);

  // Ensure all features have `id`s
  geojsonData.features.forEach((f, i) => {
    if (!f.id && f.properties?.LAD13CD) {
      f.id = f.properties.LAD13CD; // like E06000001
    } else if (!f.id) {
      f.id = `feat-${i}`;
    }
  });

  loadMap(geojsonData);
};
  reader.readAsText(event.target.files[0]);
});

function loadMap(data) {
  if (!map) {
    map = new maplibregl.Map({
      container: 'map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 0],
      zoom: 2,
    });

    map.on('load', () => {
      addGeojsonToMap(data);
    });
  } else {
    map.getSource('geojson-data').setData(data);
  }
}

function addGeojsonToMap(data) {
  if (map.getSource('geojson-data')) {
    map.removeLayer(layerId);
    map.removeSource('geojson-data');
  }

  map.addSource('geojson-data', {
    type: 'geojson',
    data: data,
  });

  map.addLayer({
    id: layerId,
    type: 'fill',
    source: 'geojson-data',
    paint: {
      'fill-color': '#007cbf',
      'fill-opacity': 0.5,
    },
  });

  const bounds = new maplibregl.LngLatBounds();
  data.features.forEach(f => {
    const coords = f.geometry.coordinates.flat(Infinity);
    for (let i = 0; i < coords.length; i += 2) {
      bounds.extend([coords[i], coords[i + 1]]);
    }
  });
  map.fitBounds(bounds, { padding: 20 });
}

function analyze() {
  const prompt = document.getElementById('prompt').value.trim();
  if (!geojsonData || !prompt) {
    return alert("Please upload a GeoJSON and enter a prompt.");
  }

  // Match prompt: "features within 10km of Hartlepool"
const match = prompt.match(/within\s+(\d+)\s*(km|kilometers)\s+of\s+(.*)/i);
if (match) {
  const distance = parseFloat(match[1]);
  const unit = match[2].toLowerCase().startsWith("km") ? "kilometers" : "meters";
  const placeName = match[3].trim().toLowerCase();

  const targetFeature = geojsonData.features.find(f =>
    f.properties?.LAD13NM?.toLowerCase() === placeName
  );

  if (!targetFeature) {
    const names = geojsonData.features.map(f => f.properties?.LAD13NM).join(', ');
    return alert(`Place "${placeName}" not found.\nTry one of:\n${names}`);
  }

  const buffer = turf.buffer(targetFeature, distance, { units: unit });

  const results = geojsonData.features.filter(f =>
    f !== targetFeature && turf.booleanIntersects(buffer, f)
  );

  map.getSource('geojson-data').setData({
    type: "FeatureCollection",
    features: [targetFeature, buffer, ...results]
  });

  renderTable(results);
} else {
    alert("Prompt not recognized. Try: 'features within 10km of feature ID X'");
  }
}


function renderTable(features) {
  const container = document.getElementById('results');
  if (!features.length) {
    container.innerHTML = "<p>No matching features found.</p>";
    return;
  }

  let html = `<table><thead><tr><th>ID</th><th>Type</th><th>Properties</th></tr></thead><tbody>`;
  features.forEach(f => {
    html += `<tr>
      <td>${f.id || "N/A"}</td>
      <td>${f.geometry.type}</td>
      <td><pre>${JSON.stringify(f.properties, null, 2)}</pre></td>
    </tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
}
