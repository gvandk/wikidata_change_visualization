'use strict'

const endpointUrl = process.env.WD_ENDPOINT;

const makeLabel = (uri) => {
	const separator = uri.includes('#') ? '#' : '/';
	return uri.split(separator).pop();
}






async function getEventsTemp(name, start, end, callback) {
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

		callback(null, processDict);
	} catch (error) {
		console.error("Error in getEventsTemp:", error.message);
		callback(error.message, null);
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

		callback(null, processDict);
	} catch (error) {
		console.error("Error in getEventsText:", error.message);
		callback(error.message, null);
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
		return { status: 'error', message: `Request error: ${error.message}` };
	}
}
















module.exports = {
	wikidata_query: wikidata_query,
	eventkg_query: eventkg_query,
	getEventsText: getEventsText,
	getEventsTemp: getEventsTemp
}