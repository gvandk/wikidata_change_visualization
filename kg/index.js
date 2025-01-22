'use strict'

const endpointUrl = process.env.LLM_;

const makeLabel = (uri) => {
	const separator = uri.includes('#')?'#':'/';
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
			headers: {'Content-Type': 'application/sparql-query', Accept: 'application/sparql-results+json' },
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
		throw(error);
	});
}

module.exports = {
	wikidata_query: wikidata_query,
	eventkg_query: eventkg_query
}