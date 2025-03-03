
/*

import {
   extractWikidataCodeFromWikipediaLink,
   //getDataDirect,
   compare,
   getDbpName,
   getEventsTemp,
   getEventsText,
   collectEvents,
   //fetchEvents,
   //generateResponse,
   masterExplanationFunction

 } from 'js/functions.js';

*/


async function createGraph() {
  showSpinner()
  let wikidataCode = document.getElementById('wikidata-code').value;
  const year1 = document.getElementById('year1').value;
  const year2 = document.getElementById('year2').value;
  const includeID = document.getElementById('include-id-statements').checked;

  if (!wikidataCode || !year1 || !year2) {
    alert('Please provide a Wikidata code or Wikipedia link and select two timepoints.');
    return;
  }

  const wikipediaLinkPattern = /^https?:\/\/(?:\w{2}\.)?wikipedia\.org\/wiki\/.+$/;
  if (wikipediaLinkPattern.test(wikidataCode)) {
    wikidataCode = await extractWikidataCodeFromWikipediaLink(wikidataCode);
    if (!wikidataCode) {
      return;
    }
  }



  /////////////////////

  const rawResponse = await fetch('/fetchData', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ wikidataCode: wikidataCode, year1: year1, year2: year2, includeID: includeID })
  });
  const content = await rawResponse.json();


  console.log('111111')
  console.log(content);
  console.log('222222')


  //////////////////////////// Move to server
  // const jsonNew = await fetchData(`/getDataDirect/${wikidataCode}/${year1}/${includeID}`);
  // const jsonOld = await fetchData(`/getDataDirect/${wikidataCode}/${year2}/${includeID}`);


  // const name = await getDbpName(wikidataCode)
  // const eventsTemp = await getEventsTemp(name, year2, year1)
  // const eventsText = await getEventsText(name, year2, year1)

  // const eventsAll = await collectEvents(eventsTemp, eventsText)

  // totalStatementsYear1 = jsonNew.totalStatements;
  // totalStatementsYear2 = jsonOld.totalStatements;
  ///////////////////////////////

  const { added, removed } = compare(jsonNew, jsonOld);
  const allStatements = added.concat(removed);

  const nodes = {};
  const links = [];

  allStatements.forEach((statement) => {
    const { subject, subjectLabel, predicate, predicateLabel, object, objectLabel } = statement;

    nodes[subject] = { id: subject, label: subjectLabel, type: "subject", size: 50 };
    nodes[predicate] = { id: predicate, label: predicateLabel, type: "predicate", size: 25 };
    nodes[object] = { id: object, label: objectLabel, type: "object", size: 35 };

    const isAdded = added.includes(statement);
    const color = isAdded ? "#117733" : "#AA4499";

    links.push({ source: subject, target: predicate, color: color });
    links.push({ source: predicate, target: object, color: color });

    nodes[object].color = color;
  });

  const nodeArray = Object.values(nodes);

  nodesData = nodeArray;

  const svg = d3.select("svg");
  svgGroup.selectAll("*").remove();
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const legendData = [
    { label: "Subject", color: "#88CCEE" },
    { label: "Predicate", color: "#44AA99" },
    { label: "Added Object", color: "#117733" },
    { label: "Removed Object", color: "#AA4499" }
  ];

  const simulation = d3.forceSimulation(nodeArray)
    .force("link", d3.forceLink(links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svgGroup.append("g")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("class", "link")
    .attr("stroke", d => d.color)
    .attr("stroke-width", 2);

  const node = svgGroup.append("g")
    .selectAll("circle")
    .data(nodeArray)
    .enter()
    .append("circle")
    .attr("r", d => d.size)
    .attr("fill", d => d.type === "subject" ? "#88CCEE" : d.type === "predicate" ? "#44AA99" : d.color)
    .attr("stroke", "#cccccc")
    .attr("stroke-width", 1)
    .call(drag(simulation))
    .on("click", handleNodeClick)
    .on("mouseover", function (event, d) {
      // Highlight node on hover only if not already selected
      if (selectedNode !== d && !highlightedNodes.includes(d)) {
        d3.select(this).attr("stroke", "#DDCC77").attr("stroke-width", 3);
      }
    })
    .on("mouseout", function (event, d) {
      // Remove hover effect only if not selected
      if (selectedNode !== d && !highlightedNodes.includes(d)) {
        d3.select(this).attr("stroke", "#cccccc").attr("stroke-width", 1);
      }
    });


  const label = svgGroup.append("g")
    .selectAll("text")
    .data(nodeArray)
    .enter()
    .append("text")
    .text(d => d.type === "subject" ? (d.label.length <= 15 ? d.label : d.id) : (d.id.length <= 10 ? d.id : ''))
    .attr("dy", ".35em")
    .attr("text-anchor", "middle");

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    label
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  // Apply filters after rendering the graph
  const showAdded = document.getElementById('show-added').checked;
  const showRemoved = document.getElementById('show-removed').checked;
  toggleVisibility(showAdded, showRemoved);
  hideSpinner()
  function handleNodeClick(event, d) {
    // Clear highlights from all nodes (including search-related highlights)
    d3.selectAll("circle").attr("stroke", "#cccccc").attr("stroke-width", 1);

    // Clear search highlights
    highlightedNodes = []; // Reset the search highlights tracker

    // Update the selected node
    selectedNode = d;

    // Highlight the clicked node
    d3.select(this).attr("stroke", "#DDCC77").attr("stroke-width", 3);

    // Show the details of the clicked node
    showNodeDetails(d);
  }

  function drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  async function showNodeDetails(d) {
    const infoBox = document.getElementById('details');
    infoBox.innerHTML = `<p><strong>Code:</strong> ${d.id}</p><p><strong>Label:</strong> ${d.label}</p>`;

    if (d.type === "subject") {
      const addedCount = added.length;
      const removedCount = removed.length;

      infoBox.innerHTML += `<p><strong>Statements in ${year1}:</strong> ${totalStatementsYear1}</p>`;
      infoBox.innerHTML += `<p><strong>Statements in ${year2}:</strong> ${totalStatementsYear2}</p>`;
      infoBox.innerHTML += `<p><strong>Added Objects:</strong> ${addedCount}</p>`;
      infoBox.innerHTML += `<p><strong>Removed Objects:</strong> ${removedCount}</p>`;
    } else if (d.type === "object") {
      const connectedPredicates = links
        .filter(link => link.target.id === d.id && nodes[link.source.id].type === "predicate")
        .map(link => ({ predicateNode: nodes[link.source.id], link }));

      infoBox.innerHTML += `<p><strong>Connected Predicates:</strong> ${connectedPredicates.map(pred => pred.predicateNode.label).join(', ')}</p>`;

      // Add a placeholder message for explanation
      infoBox.innerHTML += `<p>Gathering causal event ...</p>`;

      // Find the statement the object node is part of
      const relatedStatement = added.find(item => item.object === d.id) || removed.find(item => item.object === d.id);

      // Determine category: "added" or "removed"
      const category = added.includes(relatedStatement) ? "added" : "removed";

      try {


        // TODO: call remote function
        // Call masterExplanationFunction with required data
        const explanationResult = await masterExplanationFunction(
          category,
          relatedStatement, // Entire statement the object node is part of
          year2,
          year1,
          eventsAll, // Collected events
          eventsTemp, // Temporal events
          eventsText // Textual events
        );

        // Update the info box with explanation or event details
        if (explanationResult.event) {
          const { beginTime, endTime, source } = explanationResult.event;
          infoBox.innerHTML = `
       <p><strong>Code:</strong> ${d.id}</p>
       <p><strong>Label:</strong> ${d.label}</p>
       <p><strong>Event:</strong> ${explanationResult.event[1]}</p>
       <p><strong>Time:</strong> ${beginTime} - ${endTime}</p>
       <p><strong>Source:</strong> ${source}</p>`;
        } else if (explanationResult.explanation) {
          infoBox.innerHTML = `
       <p><strong>Code:</strong> ${d.id}</p>
       <p><strong>Label:</strong> ${d.label}</p>
       <p><strong>Explanation:</strong> ${explanationResult.explanation}</p>`;
        }
      } catch (error) {
        console.error("Error generating explanation:", error);
        infoBox.innerHTML += `<p>Error generating explanation.</p>`;
      }
    }

    if (d.type === "predicate") {
      const connectedAddedObjects = added
        .filter(item => item.predicate === d.id)
        .map(item => item.objectLabel);
      const connectedRemovedObjects = removed
        .filter(item => item.predicate === d.id)
        .map(item => item.objectLabel);

      infoBox.innerHTML += `<p><strong>Added Objects:</strong> ${connectedAddedObjects.join(', ')}</p>`;
      infoBox.innerHTML += `<p><strong>Removed Objects:</strong> ${connectedRemovedObjects.join(', ')}</p>`;

      const checkboxId = `toggle-children-${d.id}`;
      const isChecked = hiddenChildStates[d.id] !== false;

      infoBox.innerHTML += `
         <label for="${checkboxId}">
           <input type="checkbox" id="${checkboxId}" ${isChecked ? 'checked' : ''}> Show Connected Objects and Links
         </label>
       `;

      document.getElementById(checkboxId).addEventListener('change', function (event) {
        const isChecked = event.target.checked;
        hiddenChildStates[d.id] = isChecked;

        const allConnectedObjects = added.concat(removed)
          .filter(item => item.predicate === d.id)
          .map(item => item.object);

        allConnectedObjects.forEach(objectId => {
          const objectElement = d3.selectAll("circle").filter(node => node.id === objectId);
          objectElement.style("visibility", isChecked ? "visible" : "hidden");

          const objectLabel = d3.selectAll("text").filter(textNode => textNode.id === objectId);
          objectLabel.style("visibility", isChecked ? "visible" : "hidden");

          const linkElement = d3.selectAll("line").filter(link => link.target.id === objectId);
          linkElement.style("visibility", isChecked ? "visible" : "hidden");
        });

        const predicateElement = d3.selectAll("circle").filter(node => node.id === d.id);
        const predicateText = d3.selectAll("text").filter(textNode => textNode.id === d.id);

        if (isChecked) {
          predicateElement.attr("fill", "#44AA99");
          predicateText.style("opacity", 1);
        } else {
          predicateElement.attr("fill", "white");
          predicateText.style("opacity", 0.5);
        }
      });
    }
  }
  function toggleVisibility(showAdded, showRemoved) {
    // Update visibility for nodes and links based on their color
    d3.selectAll('circle')
      .style('visibility', function (d) {
        if (d.type === "object" && d.color === '#117733') { // Added objects
          return showAdded ? 'visible' : 'hidden';
        }
        if (d.type === "object" && d.color === '#AA4499') { // Removed objects
          return showRemoved ? 'visible' : 'hidden';
        }
        return d3.select(this).style('visibility'); // Preserve existing visibility for others
      });

    d3.selectAll('line')
      .style('visibility', function (d) {
        if (d.color === '#117733') { // Links for added objects
          return showAdded ? 'visible' : 'hidden';
        }
        if (d.color === '#AA4499') { // Links for removed objects
          return showRemoved ? 'visible' : 'hidden';
        }
        return d3.select(this).style('visibility'); // Preserve existing visibility for others
      });

    d3.selectAll('text')
      .style('visibility', function (d) {
        if (d.type === "object" && d.color === '#117733') { // Labels for added objects
          return showAdded ? 'visible' : 'hidden';
        }
        if (d.type === "object" && d.color === '#AA4499') { // Labels for removed objects
          return showRemoved ? 'visible' : 'hidden';
        }
        return d3.select(this).style('visibility'); // Preserve existing visibility for others
      });

    // Hide predicate nodes and their labels if all their connections are hidden
    d3.selectAll('circle')
      .filter(d => d.type === "predicate")
      .style('visibility', function (d) {
        const connectedLinks = d3.selectAll('line')
          .filter(link => link.source.id === d.id || link.target.id === d.id)
          .nodes();

        const allLinksHidden = connectedLinks.every(link => d3.select(link).style('visibility') === 'hidden');

        const connectedObjects = d3.selectAll('circle')
          .filter(node => {
            return node.type === "object" &&
              d3.selectAll('line').filter(link => link.target.id === node.id && link.source.id === d.id).size() > 0;
          })
          .nodes();

        const allObjectsHidden = connectedObjects.every(node => d3.select(node).style('visibility') === 'hidden');

        return allLinksHidden && allObjectsHidden ? 'hidden' : 'visible';
      });

    d3.selectAll('text')
      .filter(d => d.type === "predicate")
      .style('visibility', function (d) {
        const predicateNode = d3.selectAll('circle')
          .filter(node => node.id === d.id)
          .style('visibility');

        return predicateNode === 'hidden' ? 'hidden' : 'visible';
      });
  }

  // Add event listeners to call the updated toggleVisibility function
  document.getElementById('show-added').addEventListener('change', function () {
    const showAdded = this.checked;
    const showRemoved = document.getElementById('show-removed').checked;
    toggleVisibility(showAdded, showRemoved);
  });

  document.getElementById('show-removed').addEventListener('change', function () {
    const showRemoved = this.checked;
    const showAdded = document.getElementById('show-added').checked;
    toggleVisibility(showAdded, showRemoved);
  });

}














function searchNode() {
  const searchValue = document.getElementById('search-node').value.trim().toLowerCase();

  if (!searchValue) {
    alert('Please enter a node code or label.');
    return;
  }

  // Find all nodes matching the search query (by id or label)
  const matchingNodes = nodesData.filter(n =>
    n.id.toLowerCase() === searchValue ||
    n.label?.toLowerCase() === searchValue
  );

  if (matchingNodes.length === 0) {
    alert('No matching nodes found.');
    return;
  }

  // Filter only visible nodes
  const visibleNodes = d3.selectAll("circle")
    .filter(d => matchingNodes.some(n => n.id === d.id))
    .filter(function () {
      return d3.select(this).style("visibility") !== "hidden";
    });

  if (visibleNodes.empty()) {
    alert('No matching nodes are visible.');
    return;
  }

  // Clear previous highlights
  d3.selectAll("circle").attr("stroke", "#cccccc").attr("stroke-width", 1);
  highlightedNodes = []; // Clear tracked highlights from previous searches
  selectedNode = null; // Clear any manually selected node

  if (visibleNodes.size() === 1) {
    // Single match: Simulate a click on the node and zoom to it
    const singleNodeElement = visibleNodes.node();
    const nodeData = d3.select(singleNodeElement).datum();

    singleNodeElement.dispatchEvent(new MouseEvent('click'));

    // Get the node's position
    const transform = d3.zoomTransform(svg.node());
    const x = nodeData.x;
    const y = nodeData.y;
    const zoomLevel = 1.5; // Adjust as needed for zoom level

    // Smoothly pan and zoom to the node
    svg.transition()
      .duration(750)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(svg.attr("width") / 1.5 - x * zoomLevel, svg.attr("height") / 1.5 - y * zoomLevel).scale(zoomLevel)
      );
  } else {
    // Multiple matches: highlight all and show summary in info box
    visibleNodes
      .attr("stroke", "#DDCC77")
      .attr("stroke-width", 3);

    highlightedNodes = visibleNodes.data(); // Track all highlighted nodes

    // Count object and predicate nodes
    const selectedObjectNodes = visibleNodes.data().filter(d => d.type === "object").length;
    const selectedPredicateNodes = visibleNodes.data().filter(d => d.type === "predicate").length;

    // Update the info box with counts
    const infoBox = document.getElementById('details');
    infoBox.innerHTML = `
   <p>Multiple nodes matched. Please refine your search.</p>
   <p><strong>Object Nodes:</strong> ${selectedObjectNodes}</p>
   <p><strong>Predicate Nodes:</strong> ${selectedPredicateNodes}</p>
 `;
  }
}





// Function to reset the zoom to the initial position
function resetZoom() {
  svg.transition()
    .duration(750)
    .call(
      zoom.transform,
      d3.zoomIdentity.translate(svg.attr("width") / 2, svg.attr("height") / 2).scale(0.5)
    );
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

// Add event listener to the reset zoom button
document.getElementById('reset-zoom-btn').addEventListener('click', resetZoom);
document.getElementById('search-node-btn').addEventListener('click', searchNode);
