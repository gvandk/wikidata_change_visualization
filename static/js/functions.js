

async function extractWikidataCodeFromWikipediaLink(wikipediaLink) {
	try {
		const langPattern = /^https?:\/\/(\w{2,3})\.wikipedia\.org\/wiki\/.+$/;
		const match = wikipediaLink.match(langPattern);
		if (!match || match.length < 2) {
			throw new Error('Invalid Wikipedia link. Unable to detect language code.');
		}

		const languageCode = match[1];

		const sparqlQuery = `
			SELECT ?subject WHERE {
				<${wikipediaLink}> schema:about ?subject ;
													 schema:isPartOf <https://${languageCode}.wikipedia.org/>.
			}
		`;

		const endpoint = 'https://query.wikidata.org/sparql';
		const response = await axios.post(endpoint, sparqlQuery, {
			headers: {
				'Content-Type': 'application/sparql-query',
				'Accept': 'application/sparql-results+json'
			}
		});

		if (response.data && response.data.results.bindings.length > 0) {
			const wikidataUrl = response.data.results.bindings[0].subject.value;
			return wikidataUrl.split('/').pop();
		} else {
			throw new Error('Wikidata code not found for the given Wikipedia link.');
		}
	} catch (error) {
		console.error('Error extracting Wikidata code:', error);
		alert('Error extracting Wikidata code from Wikipedia link. Please check the link.');
		return null;
	}
}



 async function getDbpName(sqlQuery) {
  const sparqlQuery = `
    SELECT ?wikipediaPage
    WHERE {
        ?wikipediaPage schema:about wd:${sqlQuery} ;
                       schema:inLanguage "en" ;
                       schema:isPartOf <https://en.wikipedia.org/>.
    }`;
  
  const endpoint = "https://query.wikidata.org/sparql";
  const userAgent = "WU_Visualisation_Thesis/Node.js";
  
  try {
    const response = await axios.post(endpoint, sparqlQuery, {
        headers: {
            'Content-Type': 'application/sparql-query',
            'Accept': 'application/sparql-results+json',
            'User-Agent': userAgent,
        },
    });
  
    if (
        response.data.results &&
        response.data.results.bindings &&
        response.data.results.bindings.length > 0
    ) {
        return response.data.results.bindings[0].wikipediaPage.value.replace(
            'https://en.wikipedia.org/wiki/',
            ''
        );
    } else {
        throw new Error("No results found for the query.");
    }
  } catch (error) {
    console.error("Error in getDbpName:", error.message);
    return null;
  }
  }


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




async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error.message);
  }
}



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

// Master function that integrates the provided functions
async function collectEvents(eventsTemp, eventsText) {
	try {
		let eventsAll = [];

		if (eventsTemp.propertyLabel.length < 31) {
			for (let i = 0; i < eventsTemp.propertyLabel.length; i++) {
				const temp = [
					i,
					eventsTemp.propertyLabel[i],
					eventsTemp.objectLabel[i],
				];
				eventsAll.push(temp);
			}
		} else {
			console.log("Too many temporal relations!");
			const eventsTempPreproc = eventsTemp.propertyLabel.map((label, index) => [
				label,
				eventsTemp.objectLabel[index],
			]);

			const reductionInput = JSON.stringify(eventsTempPreproc) +
				" Choose only the most influential provided events and their stated indices. Do not provide more than 30 indices. You must not output any text, just the indices separated by commas.";
			const eventsTempLess = await generateResponse(reductionInput, "reduction");

			if (eventsTempLess && eventsTempLess.response) {
				const indices = eventsTempLess.response.replace(/\s+/g, "").split(",");
				indices.forEach((index) => {
					const i = parseInt(index, 10);
					if (i >= 0 && i < eventsTemp.propertyLabel.length) {
						const temp = [
							i,
							eventsTemp.propertyLabel[i],
							eventsTemp.objectLabel[i],
						];
						eventsAll.push(temp);
					}
				});
			} else {
				console.error("Wrong Reduction Formatting!");
			}
		}

		if (eventsText.description.length < 31) {
			for (let i = 0; i < eventsText.description.length; i++) {
				const temp = [i + 1000, eventsText.description[i]];
				eventsAll.push(temp);
			}
		} else {
			console.log("Too many textual events!");
			const reductionInput = JSON.stringify(eventsText.description) +
				" Choose only the most influential provided events and their stated indices. Do not provide more than 30 indices. You must not output any text, just the indices separated by commas.";
			const eventsTextLess = await generateResponse(reductionInput, "reduction");

			if (eventsTextLess && eventsTextLess.response) {
				const indices = eventsTextLess.response.replace(/\s+/g, "").split(",");
				indices.forEach((index) => {
					const i = parseInt(index, 10);
					if (i >= 0 && i < eventsText.description.length) {
						const temp = [i + 1000, eventsText.description[i]];
						eventsAll.push(temp);
					}
				});
			} else {
				console.error("Wrong Reduction Formatting!");
			}
		}

		console.log("Event collection done!");

		return eventsAll;
	} catch (error) {
		console.error("Error in collectEvents:", error.message);
		return [];
	}
}


function compare(jsonNew, jsonOld) {
	const results = { added: [], removed: [] };

	if (jsonNew.status !== "success" || jsonOld.status !== "success") {
		return results;
	}

	const mapNew = new Map();
	jsonNew.data.forEach(item => {
		const key = `${item.predicate}:${item.object}`;
		mapNew.set(key, item);
	});

	const mapOld = new Map();
	jsonOld.data.forEach(item => {
		const key = `${item.predicate}:${item.object}`;
		mapOld.set(key, item);
	});

	mapNew.forEach((value, key) => {
		if (!mapOld.has(key)) {
			results.added.push(value);
		}
	});

	mapOld.forEach((value, key) => {
		if (!mapNew.has(key)) {
			results.removed.push(value);
		}
	});

	return results;
}


async function masterExplanationFunction(category, change, yearOld, yearNew, eventsAll, eventsTemp, eventsText) {
	const results = {};
	let finish = false;
	let result = {};

	try {
		// Determine the setting based on eventsAll
		const setting = eventsAll.length > 0 ? "events" : "no events";

		// Build the prompt based on the setting
		let prompt;
		if (setting === "events") {
			prompt = `Change_type: ${category} ; Statement: ${JSON.stringify(change)} ; Events: ${JSON.stringify(eventsAll)}; Only use the provided events. Put your final answer inside asterisks.`;
		} else if (setting === "no events") {
			prompt = `Change_type: ${category} ; Statement: ${JSON.stringify(change)} ; Period: ${yearNew}-${yearOld}; Do not include the statement codes inside the explanation. Put the search terms inside square brackets separated by commas. Do not add any additional flavour text.`;
		} else {
			throw new Error("Invalid setting for generating explanation.");
		}

		// Generate the response using the `generateResponse` function
		let response = await generateResponse(prompt, setting);

		// Handle the response based on the setting
		if (setting === "events") {
			// Extract the event index from the response
			const indexMatch = response.match(/\*(.*?)\*/);
			const index = indexMatch ? indexMatch[1] : null;

			if (index === "-1") {
				// If no relevant event found, switch to "no events" explanation
				prompt = `Change_type: ${category} ; Statement: ${JSON.stringify(change)} ; Period: ${yearNew}-${yearOld}; Do not include the statement codes inside the explanation. Put the search terms inside square brackets separated by commas. Do not add any additional flavour text.`;
				response = await generateResponse(model, prompt, "no events");

				result["statement"] = change;
				result["explanation"] = response;
				results.push(result);
				finish = true;
			} else if (index) {
				// Extract the explanation for the specific event
				const indexNum = parseInt(index, 10);
				let explanationEvent;

				if (indexNum >= 1000) {
					explanationEvent = eventsText.find((_, i) => i + 1000 === indexNum);
				} else {
					explanationEvent = eventsTemp.find((_, i) => i === indexNum);
				}

				result["statement"] = change;
				result["event"] = explanationEvent;
				results.push(result);
				finish = true;
			} else {
				console.error("Wrong formatting in response:", response);
			}
		}

		if (!finish) {
			// If no explanation based on events, fallback to "no events"
			result["statement"] = change;
			result["explanation"] = response;
			results[category].push(result);
		}

	} catch (error) {
		console.error("Error in masterExplanationFunction:", error.message);
		throw error;
	}

	return results;
}




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



