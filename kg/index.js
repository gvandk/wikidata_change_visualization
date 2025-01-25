'use strict'

const endpointUrl = process.env.WD_ENDPOINT;

const makeLabel = (uri) => {
	const separator = uri.includes('#') ? '#' : '/';
	return uri.split(separator).pop();
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
	eventkg_query: eventkg_query
}