# GIS AI Agent – Spatial Analysis

This project is a simple web-based GIS tool that allows you to upload TopoJSON files, visualize them on an interactive map, and perform spatial analysis using natural language prompts.

## Features

- Upload and visualize TopoJSON/GeoJSON data on a map (powered by MapLibre GL JS)
- Analyze spatial relationships using prompts, e.g.:
  - `features within 10km of Hartlepool`
- See results highlighted on the map and in a tabular format
- Uses [Turf.js](https://turfjs.org/) for spatial analysis and [TopoJSON](https://github.com/topojson/topojson-client) for data conversion

## Getting Started

1. **Clone this repository:**
   ```sh
   git clone https://github.com/zansangeeth/AI-GIS.git
   cd AI-GIS
   ```

2. **Open `index.html` in your browser.**

   No build step is required. All dependencies are loaded via CDN.

## Usage

1. Click the "Choose File" button and upload a TopoJSON file.
2. Enter a prompt in the textarea, such as:
   ```
   features within 10km of Hartlepool
   ```
3. Click "Analyze" to see the results on the map and in the table below.

## File Structure

- [`index.html`](index.html): Main HTML file
- [`app.js`](app.js): Application logic (file upload, map rendering, analysis)
- [`style.css`](style.css): Basic styles

## Dependencies

- [MapLibre GL JS](https://maplibre.org/)
- [Turf.js](https://turfjs.org/)
- [TopoJSON Client](https://github.com/topojson/topojson-client)

All dependencies are included via CDN links in `index.html`.


*Created by Sangeeth Amirthanathan*