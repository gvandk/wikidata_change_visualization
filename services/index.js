'use strict'

const axios = require('axios');


const endpointUrl = process.env.WD_ENDPOINT;

const makeLabel = (uri) => {
	const separator = uri.includes('#') ? '#' : '/';
	return uri.split(separator).pop();
}




async function getEventsTemp(name, start, end) {
	if (end === "present") {
		end = "3000";
	}

	const sparqlQuery = `
	SELECT DISTINCT ?beginTime ?endTime (STR(?propertyLabel) AS ?propertyLabel) (STR(?objectLabel) AS ?objectLabel) ?graph
	WHERE {
			?actor owl:sameAs dbr:${name} .
			?relation rdf:subject ?actor .
			?relation rdf:object ?object .

			GRAPH ?graph {
					?object rdfs:label ?objectLabel .
			}

			?relation sem:roleType ?roleType .
			?roleType rdfs:label ?propertyLabel .
			FILTER(LANG(?propertyLabel) = "en") .
			FILTER(LANG(?objectLabel) = "en") .

			?relation sem:hasBeginTimeStamp ?beginTime .
			OPTIONAL {  
					?relation sem:hasEndTimeStamp ?endTime .
			}
			FILTER (?beginTime >= "${start}-01-01"^^xsd:date) 
	}
	ORDER BY ?beginTime
`;

	const endpoint = "https://eventkginterface.l3s.uni-hannover.de/sparql";

	try {
		const results = await fetchEvents(sparqlQuery, endpoint);

		const processDict = {
			beginTime: [],
			endTime: [],
			propertyLabel: [],
			objectLabel: [],
			source: [],
		};

		const seenPairs = new Set();

		for (const result of results) {
			const propertyLabel = result.propertyLabel.value;
			const objectLabel = result.objectLabel.value;
			const pair = `${propertyLabel}:${objectLabel}`;

			if (seenPairs.has(pair)) continue;
			seenPairs.add(pair);

			try {
				if (result.endTime?.value && result.endTime.value <= `${end}-12-31`) {
					processDict.endTime.push(result.endTime.value);
				} else {
					continue;
				}
			} catch {
				processDict.endTime.push("");
			}

			processDict.beginTime.push(result.beginTime.value);
			processDict.propertyLabel.push(propertyLabel);
			processDict.objectLabel.push(objectLabel);
			processDict.source.push(
				result.graph.value.replace("https://eventkg.l3s.uni-hannover.de/graph/", "")
			);
		}

		// callback(null, processDict);
		return processDict;
	} catch (error) {
		console.error("Error in getEventsTemp:", error.message);
		return null;
		// callback(error.message, null);
	}
}

async function getEventsText(name, start, end, callback) {
	if (end === "present") {
		end = "3000";
	}

	const sparqlQuery = `
	SELECT DISTINCT ?beginTime ?endTime STR(?description) AS ?description ?graph
	WHERE {
			?actor owl:sameAs dbr:${name} .
			?event rdf:type eventkg-s:TextEvent .
			?event sem:hasActor ?actor.
			GRAPH ?graph { 
					?event sem:hasBeginTimeStamp ?startTime . 
			}
			?event dcterms:description ?description .
			FILTER(LANG(?description) = "en") .
			?event sem:hasBeginTimeStamp ?beginTime .
			OPTIONAL { ?event sem:hasEndTimeStamp ?endTime . }
			FILTER (?beginTime >= "${start}-01-01"^^xsd:date) 
	}
	ORDER BY ?beginTime
`;

	const endpoint = "https://eventkginterface.l3s.uni-hannover.de/sparql";

	try {
		const results = await fetchEvents(sparqlQuery, endpoint);

		const processDict = {
			beginTime: [],
			endTime: [],
			description: [],
			source: [],
		};

		for (const result of results) {
			const description = result.description.value;

			if (processDict.description.includes(description)) continue;

			try {
				if (result.endTime?.value && result.endTime.value <= `${end}-12-31`) {
					processDict.endTime.push(result.endTime.value);
				} else {
					continue;
				}
			} catch {
				processDict.endTime.push("");
			}

			processDict.description.push(description);
			processDict.beginTime.push(result.beginTime.value);
			processDict.source.push(
				result.graph.value.replace("https://eventkg.l3s.uni-hannover.de/graph/", "")
			);
		}

		// callback(null, processDict);
		return processDict;
	} catch (error) {
		console.error("Error in getEventsText:", error.message);
		return null;
		// callback(error.message, null);
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
			const result = response.data.results.bindings[0].wikipediaPage.value.replace('https://en.wikipedia.org/wiki/', '');
			return result;
			// callback(null, result)
			return
		} else {
			throw new Error("No results found for the query.");
			return null;
			// callback("No results found for the query.", null);
		}
	} catch (error) {
		console.error("Error in getDbpName:", error.message);
		return null;
		// callback(error.message, null);
	}
}






const blank_query = (subject, property) =>
	`SELECT ?bnode ?property ?value WHERE {<${subject}> <${property}> ?bnode . ?bnode ?property ?value .}`;


const geometry_query = (feature_id) =>
	`PREFIX geo: <http://www.opengis.net/ont/geosparql#>
SELECT * WHERE {<${default_ns}${feature_id}> geo:hasGeometry/geo:asGeoJSON ?geometry}`;



const wikidata_query = async (year, entity_id, callback) => {
	const response = await run_sparql(geometry_query(feature_id))
	const data = JSON.parse(response.results.bindings[0].geometry.value);
	callback(null, data);
}

const eventkg_query = async (year, entity_id, callback) => {
	const response = await run_sparql(geometry_query(feature_id))
	const data = JSON.parse(response.results.bindings[0].geometry.value);
	callback(null, data);
}


async function fetchEvents(query, endpoint) {

	var url = new URL(endpoint);

	var params = new URLSearchParams({
		query: query,
		format: 'application/sparql-results+json',
	}).toString();

	url.search = params;

	return fetch(url)
		.then(response => response.text())
		.then(data => {
			console.log(data);
			return JSON.parse(data).results.bindings;
		})
		.catch(error => {
			console.error(`Failed to fetch events from ${endpoint}: ${error.message}`);
			throw (error);
		});

	// try {
	// 	const response = await axios.get(endpoint, {
	// 		params: { query, format: 'json' },
	// 	});

	// 	return response.data.results.bindings;
	// } catch (error) {
	// 	console.error(`Failed to fetch events from ${endpoint}: ${error.message}`);
	// 	throw error;
	// }
}



const run_sparql = (sparqlQuery) => {
	return fetch(endpointUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/sparql-query', Accept: 'application/sparql-results+json' },
		body: sparqlQuery,
	})
		.then(response => response.text())
		.then(data => {
			if (default_ns != rewrite_ns) {
				data = data.replaceAll(default_ns, rewrite_ns);
			}
			return JSON.parse(data);
		})
		.catch(error => {
			throw (error);
		});
}










async function getDataDirect(sqlQuery, timepoint = 'present', includeID = false) {
	try {
		const entityIdPattern = /^(Q\d+|P\d+)$/;
		if (!entityIdPattern.test(sqlQuery)) {
			throw new Error('Invalid sqlQuery format. It should be a valid Wikidata entity ID.');
		}

		const endpoint = timepoint !== 'present'
			? `https://wikidata.ai.wu.ac.at/wd${timepoint}`
			: 'https://query.wikidata.org/sparql';

		const sparqlQuery = `
			PREFIX bd: <http://www.bigdata.com/rdf#>
			PREFIX wd: <http://www.wikidata.org/entity/>
			PREFIX wikibase: <http://wikiba.se/ontology#>
			SELECT ?subject ?subjectLabel ?predicate ?realpredicateLabel ?object ?objectLabel 
			WHERE {
				BIND(wd:${sqlQuery} AS ?subject).
				?subject ?predicate ?object.
				?realpredicate wikibase:directClaim ?predicate
				SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
			}`;

		const response = await axios.post(endpoint, sparqlQuery, {
			headers: {
				'Content-Type': 'application/sparql-query',
				'Accept': 'application/sparql-results+json',
				'User-Agent': 'WU_Visualisation_Thesis/Node.js'
			},
			timeout: 10000
		});

		if (response.status !== 200) {
			throw new Error(`Network response was not ok: ${response.statusText}`);
		}
		if (!response.data || !response.data.results || !Array.isArray(response.data.results.bindings)) {
			throw new Error('Malformed response.');
		}

		const results = response.data;
		if (results.results.bindings.length === 0) {
			return { status: 'no_data', message: 'No data found for the given query.' };
		}

		const finalData = results.results.bindings.map(result => ({
			subject: result.subject.value.replace('http://www.wikidata.org/entity/', ''),
			subjectLabel: result.subjectLabel.value,
			predicate: result.predicate.value.replace('http://www.wikidata.org/prop/direct/', ''),
			predicateLabel: result.realpredicateLabel.value,
			object: result.object.value.replace('http://www.wikidata.org/entity/', ''),
			objectLabel: result.objectLabel.value
		})).filter(row => includeID || !row.predicateLabel.includes('ID'))
			.sort((a, b) => a.predicate.localeCompare(b.predicate));

		return { status: 'success', data: finalData, totalStatements: finalData.length };

	} catch (error) {
		console.error('Error:', error.message);
		return null;
		// callback(error.message, null);
	}
}





/*
* Ollama Services
*/

const OLLAMA_ENDPOINT = process.env.LLM_ENDPOINT;


const call_ollama = async (changes, callback) => {
	//const response = await run_sparql(geometry_query(feature_id))
	const data = JSON.parse({});
	callback(null, data);
}


async function generateResponse(model = "llama3.1", prompt, setting) {
	// Define system messages based on the `setting` parameter
	let sysMessage;
	if (setting === "events") {
		sysMessage = "0. Write out your entire process as listed here. 1. You will receive an added or removed Wikidata statement outgoing from a subject and events that are connected to the same subject in this format (Change_type: ... ; Statement: {...} ; Events: [[event_code, event], ...]) 2. Analyze the meaning of the statement and the events. Concentrate on events related to the meaning of the statement. 3. Identify if any of the events directly caused the statement. Be conservative and only choose an event if all the necessary information is provided and no assumptions are needed. Pick only one event. 4. At the end of your process, return -1 if no event caused the statement. If there is such an event, return the event code. 5. Make sure to put your answer inside asterisks, for example: *-1*.";
	} else if (setting === "reduction") {
		sysMessage = "You will be provided with a dictionary containing events. Your task is to choose which of the provided events are the most influential and return their index number. Do not provide more than 30 indices. You must not output any text, instead use the following output format: 1,2,3,4";
	} else if (setting === "no events") {
		sysMessage = "You are an assistant with expert knowledge of world events as well as Wikidata triple statement logic. You will be provided with an added or removed Wikidata statement and the time period during which this change happened in this format (Change_type: ... ; Statement: {...} ; Period: year1 - year2). Your task is to use your knowledge of the subject and its history to explain why the statement change happened. Think about the statement logically. Consider if the change is something that was caused by an outside event or just a routine fix. You will respond with a brief explanation, as well as search terms that can be used to find more information about the event in brackets. Do not add any further text into your response. Keep the statement codes out of your explanation.";
	} else {
		return ("Invalid setting provided.", null)
		//throw new Error("Invalid setting provided.");
	}

	try {
		// Send the request using the Ollama SDK
		const response = await ollama.generate({
			model: model,
			system: sysMessage,
			prompt: prompt.replace(/[^\w\s,.:;!?\[\]{}()]/g, ""), // Sanitize the prompt
			options: {
				seed: 42,
				temperature: 0.8,
				top_k: 40,
			},
		});

		//console.log("Response:", response.text);
		//return response.text; // Return the generated response
		// callback(null, esponse.text);
		return response.text;
	} catch (error) {
		 console.error("Error in generateResponse:", error.message);
		// throw error;
		return null;
		// callback("Error in generateResponse: "+ error.message, null)
	}
}



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

		// console.log("Event collection done!");
		// return eventsAll;
		// callback(null, eventsAll);
		return eventsAll;
	} catch (error) {
		console.error("Error in collectEvents:", error.message);
		return [];
		// callback("Error in collectEvents:" + error.message, [])
	}
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





module.exports = {
	wikidata_query: wikidata_query,
	eventkg_query: eventkg_query,
	getEventsText: getEventsText,
	getEventsTemp: getEventsTemp,
	getDataDirect: getDataDirect,
	getDbpName: getDbpName
}