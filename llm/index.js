'use strict'

const endpointUrl = process.env.LLM_ENDPOINT;

 
const call_ollama = async (changes, callback) => {
	//const response = await run_sparql(geometry_query(feature_id))
	const data = JSON.parse({});
	callback(null, data);
}



module.exports = {
	call_ollama: call_ollama
}