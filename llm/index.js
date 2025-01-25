'use strict'

const endpointUrl = process.env.LLM_ENDPOINT;

 
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
		throw new Error("Invalid setting provided.");
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

		console.log("Response:", response.text);
		return response.text; // Return the generated response
	} catch (error) {
		console.error("Error in generateResponse:", error.message);
		throw error;
	}
}





module.exports = {
	call_ollama: call_ollama
}