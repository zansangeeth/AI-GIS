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

      const tooltip = document.getElementById('tooltip');

      map.on('mousemove', layerId, (e) => {
        map.getCanvas().style.cursor = 'pointer';

        if (e.features.length > 0) {
          const feature = e.features[0];
          const name = feature.properties?.LAD13NM || 'Unknown';

          tooltip.innerHTML = name;
          tooltip.style.left = `${e.originalEvent.pageX + 10}px`;
          tooltip.style.top = `${e.originalEvent.pageY + 10}px`;
          tooltip.style.display = 'block';
        }
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        tooltip.style.display = 'none';
      });

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
async function analyze() {
  const prompt = document.getElementById('prompt').value.trim();

  if (!prompt || !geojsonData) {
    alert("Please upload GeoJSON and enter a prompt.");
    return;
  }

  try {
    // Step 1: Call your FastAPI backend
    const response = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error("Backend error: " + (await response.text()));
    }

    const data = await response.json();
    console.log("Parsed LLM result:", data);

    // Step 2: Act on LLM structured output
    handleGISOperation(data);
  } catch (err) {
    console.error(err);
    alert("Failed to analyze prompt.");
  }
}

function handleGISOperation(data) {
  const { operation, target, distance, unit } = data;

  const features = geojsonData.features;

  if (operation === "buffer") {
    const feature = features.find(f =>
      f.properties?.LAD13NM?.toLowerCase() === target.toLowerCase()
    );

    if (!feature) return alert(`Feature "${target}" not found`);

    const buffered = turf.buffer(feature, distance, { units: unit || 'kilometers' });

    map.getSource('geojson-data').setData({
      type: "FeatureCollection",
      features: [feature, buffered]
    });

    renderTable([buffered]);
  }

  else if (operation === "merge") {
    const targets = target.split(",").map(t => t.trim().toLowerCase());
    const selected = features.filter(f =>
      targets.includes(f.properties?.LAD13NM?.toLowerCase())
    );

    if (selected.length < 2) return alert("At least two valid features required for merging");

    let merged = selected[0];
    for (let i = 1; i < selected.length; i++) {
      merged = turf.union(merged, selected[i]);
    }

    merged.properties = { note: `Merged: ${targets.join(" + ")}` };

    map.getSource('geojson-data').setData({
      type: "FeatureCollection",
      features: [merged]
    });

    renderTable([merged]);
  }

  else {
    alert(`Unsupported operation: ${operation}`);
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
