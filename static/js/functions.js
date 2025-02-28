








const svg = d3.select("svg");

// Group to hold all graph elements for zooming and panning
const svgGroup = svg.append("g");
const infoBox = document.getElementById("info-box");

// Independent legend creation function
function createLegend() {
  const legendData = [
    { label: "Subject", color: "#88CCEE" },
    { label: "Predicate", color: "#44AA99" },
    { label: "Added Object", color: "#117733" },
    { label: "Removed Object", color: "#AA4499" }
  ];

  const legend = d3.select("#graph-container")
    .append("div")
    .attr("id", "legend")
    .style("position", "absolute")
    .style("top", "20px")
    .style("left", "20px")
    .style("background-color", "#f9f9f9")
    .style("padding", "10px")
    .style("border", "1px solid black")
    .style("box-shadow", "0px 0px 10px rgba(0, 0, 0, 0.1)");

  legendData.forEach(item => {
    const legendItem = legend.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "5px");

    legendItem.append("div")
      .style("width", "18px")
      .style("height", "18px")
      .style("background-color", item.color)
      .style("margin-right", "10px");

    legendItem.append("span")
      .text(item.label);
  });
}

// Call the legend creation function on page load
createLegend();

// Set up zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.5, 3]) // Limit zoom levels between 50% and 500%
  .on("zoom", (event) => {
    svgGroup.attr("transform", event.transform); // Apply zoom transformation
  });

// Attach zoom behavior to the SVG
svg.call(zoom);

// Function to dynamically resize SVG
function resize() {
  const container = document.getElementById("graph-container");
  svg.attr("width", container.clientWidth * 0.65); // 90% width
  svg.attr("height", container.clientHeight * 0.6); // 90% height
}

// Function to center the graph
function centerGraph() {
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity.translate(svg.attr("width") / 2, svg.attr("height") / 2).scale(0.5));
}

// Attach resize listener
window.addEventListener("resize", resize);
resize(); // Trigger resize on page load

document.getElementById("create-graph").addEventListener("click", () => {
  createGraph();
  centerGraph(); // Center the graph after creation
});

let selectedNode = null;
let hiddenChildStates = {}; // To store the hidden state of each predicate node
let totalStatementsYear1 = 0;
let totalStatementsYear2 = 0;
let highlightedNodes = []; // Stores nodes highlighted during a search



// Utility functions for showing and hiding the spinner
function showSpinner() {
  document.getElementById("spinner").style.display = "block";
}

function hideSpinner() {
  document.getElementById("spinner").style.display = "none";
}

let nodesData = [];




// async function fetchData(url) {
//   try {
//     const response = await fetch(url);
//     if (!response.ok) {
//       throw new Error(`Response status: ${response.status}`);
//     }

//     const json = await response.json();
//     return json;
//   } catch (error) {
//     console.error(error.message);
//   }
// }



// async function getEventsTemp(name, start, end) {
// 	if (end === "present") {
// 		end = "3000";
// 	}

// 	const sparqlQuery = `
// 	SELECT DISTINCT ?beginTime ?endTime (STR(?propertyLabel) AS ?propertyLabel) (STR(?objectLabel) AS ?objectLabel) ?graph
// 	WHERE {
// 			?actor owl:sameAs dbr:${name} .
// 			?relation rdf:subject ?actor .
// 			?relation rdf:object ?object .

// 			GRAPH ?graph {
// 					?object rdfs:label ?objectLabel .
// 			}

// 			?relation sem:roleType ?roleType .
// 			?roleType rdfs:label ?propertyLabel .
// 			FILTER(LANG(?propertyLabel) = "en") .
// 			FILTER(LANG(?objectLabel) = "en") .

// 			?relation sem:hasBeginTimeStamp ?beginTime .
// 			OPTIONAL {  
// 					?relation sem:hasEndTimeStamp ?endTime .
// 			}
// 			FILTER (?beginTime >= "${start}-01-01"^^xsd:date) 
// 	}
// 	ORDER BY ?beginTime
// `;

// 	const endpoint = "https://eventkginterface.l3s.uni-hannover.de/sparql";

// 	try {
// 		const results = await fetchEvents(sparqlQuery, endpoint);

// 		const processDict = {
// 			beginTime: [],
// 			endTime: [],
// 			propertyLabel: [],
// 			objectLabel: [],
// 			source: [],
// 		};

// 		const seenPairs = new Set();

// 		for (const result of results) {
// 			const propertyLabel = result.propertyLabel.value;
// 			const objectLabel = result.objectLabel.value;
// 			const pair = `${propertyLabel}:${objectLabel}`;

// 			if (seenPairs.has(pair)) continue;
// 			seenPairs.add(pair);

// 			try {
// 				if (result.endTime?.value && result.endTime.value <= `${end}-12-31`) {
// 					processDict.endTime.push(result.endTime.value);
// 				} else {
// 					continue;
// 				}
// 			} catch {
// 				processDict.endTime.push("");
// 			}

// 			processDict.beginTime.push(result.beginTime.value);
// 			processDict.propertyLabel.push(propertyLabel);
// 			processDict.objectLabel.push(objectLabel);
// 			processDict.source.push(
// 				result.graph.value.replace("https://eventkg.l3s.uni-hannover.de/graph/", "")
// 			);
// 		}

// 		return processDict;
// 	} catch (error) {
// 		console.error("Error in getEventsTemp:", error.message);
// 		return null;
// 	}
// }

// async function getEventsText(name, start, end) {
// 	if (end === "present") {
// 		end = "3000";
// 	}

// 	const sparqlQuery = `
// 	SELECT DISTINCT ?beginTime ?endTime STR(?description) AS ?description ?graph
// 	WHERE {
// 			?actor owl:sameAs dbr:${name} .
// 			?event rdf:type eventkg-s:TextEvent .
// 			?event sem:hasActor ?actor.
// 			GRAPH ?graph { 
// 					?event sem:hasBeginTimeStamp ?startTime . 
// 			}
// 			?event dcterms:description ?description .
// 			FILTER(LANG(?description) = "en") .
// 			?event sem:hasBeginTimeStamp ?beginTime .
// 			OPTIONAL { ?event sem:hasEndTimeStamp ?endTime . }
// 			FILTER (?beginTime >= "${start}-01-01"^^xsd:date) 
// 	}
// 	ORDER BY ?beginTime
// `;

// 	const endpoint = "https://eventkginterface.l3s.uni-hannover.de/sparql";

// 	try {
// 		const results = await fetchEvents(sparqlQuery, endpoint);

// 		const processDict = {
// 			beginTime: [],
// 			endTime: [],
// 			description: [],
// 			source: [],
// 		};

// 		for (const result of results) {
// 			const description = result.description.value;

// 			if (processDict.description.includes(description)) continue;

// 			try {
// 				if (result.endTime?.value && result.endTime.value <= `${end}-12-31`) {
// 					processDict.endTime.push(result.endTime.value);
// 				} else {
// 					continue;
// 				}
// 			} catch {
// 				processDict.endTime.push("");
// 			}

// 			processDict.description.push(description);
// 			processDict.beginTime.push(result.beginTime.value);
// 			processDict.source.push(
// 				result.graph.value.replace("https://eventkg.l3s.uni-hannover.de/graph/", "")
// 			);
// 		}

// 		return processDict;
// 	} catch (error) {
// 		console.error("Error in getEventsText:", error.message);
// 		return null;
// 	}
// }





/*
export { 
  extractWikidataCodeFromWikipediaLink,
  compare,
  getDbpName,
  getEventsTemp,
  getEventsText,
  collectEvents,
  masterExplanationFunction 
};*/



