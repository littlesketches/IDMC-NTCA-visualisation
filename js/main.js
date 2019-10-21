//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// 	 												 	 												//////////			
//////////  		         SLOOPYS.JS | THE LITTLE LOOPY NETWORK EXPERIMENT v.0.6         	 				//////////
////////// 	 												 	 												//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////// 	 												 	 												//////////
//////////   An experimental Causal Loop Diagram explorer designed to focus on revealing consequences in a   	////////// 
//////////   qualitatively specified  dynamic system, while incorporating social network analysis to aid in  	////////// 
////////// 	 visual node positioning and network structuring. 	 												////////// 
//////////   													 												//////////  
//////////   This work is made by littlesketch.es under Creative Commons 4.0 Share and Share-alike license	 	//////////
////////// 	 Supporting JS libraries under MIT license and code	snippets attributed in code notes.	  			//////////
////////// 	 				 																					//////////
////////// 	 												 	 												//////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////////////////////////////////////////
////////////      GENERAL SETUP & VISUALISATION SETTINGS      /////////////
///////////////////////////////////////////////////////////////////////////

	"use strict"
	const width = 1080, height = 720,														// Setup of visualisation
	      svg = d3.select(elementSelector).attr('viewBox', '0 0 '+width+' '+height)			// with selector,

	let	  links, nodes, nodeControlsUp, nodeControlsDown, nodeControlsUpLabels, 			// initialisation
		  nodeControlsDownLabels, labels, linkBackgrounds, nodeBackgrounds, 				// of layer
		  labelBackgrounds, nodeImages, annotation, loopAnnotation, 						// groups,
	      simulation,																		// force directed simulation,
	      influenceData         															// and object to hold influence data for selected node
          
	const rawData = {						// Object of arrays for holding parsed data from source (Google Sheet)
		nodeData: 				[],
		connectionData: 		[],
		narrativeData: 			[],
	}

	const visData = {						// Object of arrays for holding data prepared for visualisation
		nodeInfluenceData: 		[],
		nodeRadiusArray: 		[], 
		textRadiusArray: 		[], 
		nodeCentrality: 		[],
		networkData: {						// Object structure for adding node/link objects
			"nodes" : 			[], 
			"links" : 			[] 
		}, 							
		loopData: 				[],
		loopScenario: 			{},
		classNameArray: 		[],
		nodeDirectionObject: 	{},
		nodesAnalysedByLoopStrength: 		[],
		centerNodeID: 	       '',
	}

	const interactionState = {				// Variables to keep track of interaction (mouse/touch) states
		'nodeClickTimer' : 		'', 
		'nodeHover': 			false,
		'loopData': 			{},
        'scenarioData':         {},
        reduceTimer:            false
	}

	const G = new jsnx.DiGraph()			// JSNetworkX.js object: sets up a directional graph to calculate centrality measures (i.e. eigenvector and betweenness)	

	// Customisable Settings for System (node-link) Visualisation: overriding these settings (via Google Sheet / "API") can be done
    const settings = {	
    	'controlsVisible'		: false,					// Variable to set visibility of visualisation controls menu: initially "false" to show as hidden on load)
    	'loopMenuVisible'		: false,					// Variable to set visibility of loop menu: initially "false" to show as hidden on load)
    	'scenarioMenuVisible'	: false,					// Variable to set visibility of scenario menu: initially "false" to show as hidden on load)
    	'instructionsVisible'	: false,					// Variable to set visibility of instruction pane (top right): toggled with interactions
    	'descriptionVisible'	: false,					// Variable to set visibility of description pane (bottom left): toggled with interactions
    	'nodeOpacity'			: 100,						// Node circle opacity. Note: the SVG filter effect on node fill/border means that opacity controls the 'fuzziness' and size
    	'linkOpacity'			: 30,						// Link opacity
    	'labelOpacity'			: 100,						// Label opacity
        'labelSize'             : 'fixed',                  // Option to set the label font    	
        'labelScale'            :  1,                  // Option to set the label font     
        'minRadius'				: 20, 						// Minimum radius for a node (i.e. system component) 
    	'maxRadius'				: 43, 						// Max node size (note: node sizes are scaled by centralityMeasure below between min/masRadius)
    	'controlButtonRadius'	: 10,						// Size of the up/down control buttons attached to each node
    	'linkType'				: 'taperedLinks',			// Options are 'taperedLinks' (default), 'curvedLinks' and 'straightLinks'. Note:  curved and straight links require CSS changes to make stroke visible and fill invisible.
    	'taperCurve'			: 0.3,						// For taperedLinks, 0 = straight and  higher +/- increases curvature. 
        'taperedCurveEnd'       : 20,                       // For taperedLinks, sets the width at the start point
        'taperedCurveStart'     : 5,                        //For taperedLinks, sets the width at the endpoint
    	'labelScale'			: 1.0,						// Scales the text label relative to its node (circle)
    	'centralityMeasure' 	: 'degree',			        // Choice of 'degree',  'eigenvector',  'betweenness' centrality: or 'none'
    	'forceCharge'			: -10,						// The default force charge applied to all nodes. Negative charges repel other nodes, positive pulls nodes together 
    	'forceRadiusFactor'		: 1.50,						// The forceCharge radius = node radius x radiusFactor for each node, used to keep nodes 'apart'
		'networkTraceType'		: 'byLoopStrength',			// Sets whether the network influence animation is 
															//	- "byLoopStrength": an algorithm that traces node impact 'step by step' but evaluates nodes in 'loop systems' simultaneously, using "loop strength" to determine influence
															//  - "byDegree"": an algorithm that traces node impacts by stepping through the systems 'branches' one 'step-by-step', where maximum steps - networkOrderLength
															//  - "byPolarity": an algorithm similar to 'byDegree', where the number of steps or degrees is et to the 'networkTraceLength'
															//  Note: "byDegree" and "byPolarity" are similar propagation/branching algorithms the provide results where node impacts are "+, - or neutral when there are multiple opposing influences on a node, which is symptomatic of a complex system.
		'networkTraceLength'	: 'maxPathLength',			// Used if networkTraceType is "byDegree". Default of 'maxPathLength' sets no. orders to the longest path length, meaning that all influenced nodes counted at least once. Otherwise enter a number which will represent the no. of orders that the spanning algorithm will run through for each node.
		'networkOrderLength'	: 1,						// Used if networkTraceType is "byDegree" (where the spanning algorithm is animated in stages). This variable is used to hold degree length shown in system consequence visualisation
		'networkMaxPathLength'	: '',						// Used if networkTraceType is "byDegree". Variable set when a node is selected and showSystemInfluences() is called
		'networkTraceAnimationDuration'	: 5000,		        // Desired time for the network trace animiation
        'menuVisible'           : false,                    // Indicator for whether the user interface menu is toggled into view
		'viewMode'				: 'system',					// Indicator for which 'view mode' is being shown. These in general correspond to the view menus of 'system', 'loops', 'scenarios' and 'controls'
        'centralNode'           : 'displacement',           // Name of a "central" node which can have special properties to:
        'centralNodeSizeFactor' : 1.25,                     //  - increase its size (and styling via css class; and node background SVG if specified)
        'centralNodeStopImpact' : "TRUE",                   //  - stop the propogation of system impacts through the central node if "TRUE" (note: this is a string "TRUE" and not boolean)
        'systemInfluenceCounter': 0,                        // Counter to help indicator the degree for which system impacts are being dynamically calculated (which gets reset to 0 on completion)
        'nodePosition'          : 'float',                   // 


		// OPTIONAL & HIGHLLY CUSTOM SETTINGS SETUP FOR USE WITH EXPERIMENTAL FEATURES
    	'connectionDelayScale'	: d3.scaleOrdinal()			// Mapping of specified time delays to (connection) strength
							 		.range([2.00, 	 0.95, 	 0.70, 	  0.30,  	0.10, 	  0.00])
							 		.domain(['none', 'days', 'weeks', 'months', 'years', 'decades' ]),
		 /// VIEW CLUSTERING DATA
	 	'clusterNames' 			: ['freedom', 'youth', 'economic', 'government', 'lawAndOrder', 'criminalActivity', 'violence'], 	// Note: these could be programatically derived and must match source data. 
		'clusterColours'		: ["#00a6ca","#00ccbc","#90eb9d","#ffff8c","#f9d057","#f29e2e","#e76818","#d7191c"]		    	 	
    }
					
	// Cluster settings for cluster view options: cluster names are specified in node data and position specified in an object 	
	const clusterData = {}


///////////////////////////////////////////////////////////////////////////
//////////  DATA VISUALISATION | RENDER FORCE DIRECTED NETWORK   //////////
///////////////////////////////////////////////////////////////////////////

    // A. PARSE DATA to node-link structure for data visualisation and callback (to constructGraphData)
    function parseData(nodes, connections, loops, info, loopScenarios, settings, callback){
    	// 0. Store raw JSON data to variables f0or inspection
    	rawData.nodeData = nodes; 
    	rawData.connectionData = connections, 
    	rawData.narrativeData = info, 	
    	rawData.loopData = loops.slice(1)						// Removes the second row of the source table (used for human readable field descriptions)
    	rawData.loopScenario =  loopScenarios.slice(1)		
    	rawData.settings =  settings	

    	// 1. Parse strings to number and create classNames for node, connection and loop datasets
    	rawData.nodeData.forEach(function(d){							
    		d.nodeID = +d.nodeID;
    		d.nodeDegreeCentrality = +d.nodeDegreeCentrality;
    		d.nodeFixedPosX = +d.nodeFixedPosX;
    		d.nodeFixedPosY = +d.nodeFixedPosY;
            d.nodeCustomPosX = +d.customPosX;
            d.nodeCustomPosY = +d.customPosY;            
    		d.className = camelize(d.nodeName);
    		visData.classNameArray.push(d.className)			// Creates an array of node classnames to help looking up index of object
    	})
    	rawData.connectionData.forEach(function(d){						
    		d.connectionID = +d.connectionID;
    		d.connectionFromNodeID = +d.connectionFromNodeID;
    		d.connectionToNodeID = +d.connectionToNodeID;
    		d.className = camelize('from_'+d.connectionFrom)+' '+camelize('to_'+d.connectionTo)
    		// d.strength =  settings.connectionDelayScale(d.connectionDelay);
    	})
    	rawData.loopData.forEach(function(d){						
    		d.loopIndex = +d.loopIndex;
    		d.loopSystemRank = +d.loopSystemRank;
    		d.loopCentreX = +d.loopCentreX;
    		d.loopCentreY = +d.loopCentreY;
    		d.loopRotation = +d.loopRotation;
    		d.radius = +d.radius;
    		d.className = d.loopSytemID+' '+d.loopType
    	})
		rawData.loopScenario.forEach(function(d){
			d.loopIDs = d.loopIDs.split(",").map(d => d.trim())
			d.loopColours = d.loopColours.split(",").map(d => d.trim())
			d.loopRadius = d.loopRadius.split(",").map(d => +d)
			d.loopXpos = d.loopXpos.split(",").map(d => +d)
			d.loopYpos = d.loopYpos.split(",").map(d => +d)
			d.labelXpos = d.labelXpos.split(",").map(d => +d)
			d.labelYpos = d.labelYpos.split(",").map(d => +d)						
			d.labelScale = d.labelScale.split(",").map(d => +d)						
			d.loopRotation = d.loopRotation.split(",").map(d => +d)
		})

		// 2. Update settings with user settings
		if(applyUserSettings){updateSettings(rawData.settings)}

		// 3. Create SNA metrics and callback (to constructGraphData)
    	createSNA(rawData.nodeData, rawData.connectionData)		// Ensures network is created in JSnetworkX (for centrality measures)
    	callback()												// before networkData (graph dataset) is created
    }; // end parseData()


    // B. CONSTRUCT NETWORK DATA (called after SNA graph is created) with callback (to renderVis)
	function constructGraphData(nodeData, connectionData, callback){
    	// 1. Construct network NODE data object
    	for(let i = 0; i < nodeData.length; i++){
    		let string = nodeData[i]['nodeName'], nodeInputs = [], nodeOutputs = [];

    		// a. Count node inputs and outputs to support degree (and degree centrality) calculations
    		for(let j = 0; j < connectionData.length; j++){
    			if(connectionData[j]['connectionTo'] === nodeData[i]['nodeName'])
    				nodeInputs.push(connectionData[j]['connectionID'])
    			if(connectionData[j]['connectionFrom'] === nodeData[i]['nodeName'])
    				nodeOutputs.push(connectionData[j]['connectionID'])
    		}

    		// b. Data to an object and push to networkData.nodes array
    		let nodeObj = {
    			"id" : 			nodeData[i]['nodeID'], 
    			"group" : 		nodeData[i]['className']+' '+nodeData[i]['nodeType'].toLowerCase()+' '+nodeData[i]['nodeCluster'].toLowerCase(),
    			"description" : nodeData[i]['nodeDescription'],
    			"name" : 		nodeData[i]['nodeName'].charAt(0).toUpperCase() + nodeData[i]['nodeName'].slice(1),	// Node name with capitalised first character
    			"inputs"  : 	nodeInputs, 
    			"outputs" : 	nodeOutputs,
    			"cluster" : 	nodeData[i]['nodeCluster'],															// Assigned node cluster			    			
    			"type" : 		nodeData[i]['nodeType'],															// Assigned node type			    			
    			"degreeCentrality" : 		(nodeInputs.length + nodeOutputs.length) / (nodeData.length-1),			// Network degree centrality measure		
    			"eigenvectorCentrality" : 	(function(){
                                                try{  jsnx.eigenvectorCentrality(G)._numberValues[i+1] }
                                                catch(err){
                                                    console.log('eigenvectorCentrality could not be determined, setting to 1')    
                                                    return 1                                            
                                                }
                                             }()),						// Network eigenvector centrality measure		
    			"betweennessCentrality" : 	(function(){
                                                try{  jsnx.betweennessCentrality(G)._numberValues[i+1] }
                                                catch(err){
                                                    console.log('betweenessCentrality could not be determined, setting to 1')    
                                                    return 1                                            
                                                }
                                             }()), 						// Network betweenness centrality measure	            	
                "customX" :     nodeData[i]['nodeCustomPosX'],
                "customY" :     nodeData[i]['nodeCustomPosY']
    		}
    		visData.networkData.nodes.push(nodeObj)
    	}

    	// 2. Construct LINK / EDGE data from object
    	for(let i = 0; i < connectionData.length; i++){
    		let linkObj = {
    			id 	:          connectionData[i]['connectionID'], 
    			source :       connectionData[i]['connectionFromNodeID'], 
    			target :       connectionData[i]['connectionToNodeID'],
    			group  :       connectionData[i]['className'],
    			description:   connectionData[i]['connectionDescription'],
    			strength :     settings.connectionDelayScale(connectionData[i]['connectionDelay']),
    			polarity:      connectionData[i]['connectionPolarity']
    		}
    		visData.networkData.links.push(linkObj)
    	}

    	// 3. Create centrality array (used for information/comparison only)
		for(let i = 0; i < visData.networkData.nodes.length ; i ++ ){
			let obj = {
				'eigenvectorCentrality': Math.round(visData.networkData.nodes[i]['eigenvectorCentrality']*1000)/1000,
				'betweennessCentrality': Math.round(visData.networkData.nodes[i]['betweennessCentrality']*1000)/1000,
				'degreeCentrality': Math.round(visData.networkData.nodes[i]['degreeCentrality']*1000)/1000,
				'name': visData.networkData.nodes[i]['name']
			}
			visData.nodeCentrality.push(obj);
		}

        // 4. Set centerNodeID (used for stopping rules and attaching highligting/styling properties where required)
            visData.networkData.nodes.forEach(function(d){
                if(d.name.toLowerCase() === settings.centralNode.toLowerCase()){ visData.centerNodeID =  d.id } 
            })

		// 5. Call renderVis() once networkData is complete
    	callback()
	}; // end constructGraphData()


	// C. CONSTRUCT FEEDBACK LOOP DATA (called from renderVis)
	function createLoopData(loopData, loopScenarios){
		let noNodes = rawData.nodeData.length,
			nodeIDArray = Array.apply(null, {length: noNodes}).map(Function.call, Number).map(d => d+1)

		// 1. Create loop data objects for visualisation
		for(let i = 0; i < loopData.length; i++){								
			let	nodeData = [],				// Captures the node ids and their sequence order
				nodeIDs = [],				// Captures the node IDs (1-indexed), eventually in sequence
				linkIDs = [],				// Captures the related link IDs (1-indexed)
				linkPolarity = [],			// Captures the link polarities of the linkID array
				inputNodeIDs = [],			// Node IDs that input into the loop (used for highlighting/storytelling only)
				inputLinkIDs = [],			// Links for input node(s)
				outputNodeIDs = [],			// Node IDs that are outputs from the loop (used for highlighting/storytelling only)
				outputLinkIDs = [],			// Links for output node(s)
				nodeIDeigenvector = [],		// Holds the calculated eigenvectorCentrality by node
				nodeIDbetweeenness = [],	// Holds the calculated betweennessCentrality by node
				nodeIDdegree = []			// Holds the calculated degreeCentrality by node

			// i. Create nodeOrder an nodeID arrays for each loop
			for (let j = 0; j < nodeIDArray.length; j ++){
				let entry 	= loopData[i][nodeIDArray[j]],
				 	nodeObj = {}						
				if(entry !== '' && !Number.isNaN(+entry)){		// Push entries that are numbers (i.e. nodes in the loop)
					nodeObj = {
				 		'nodeID': 	  +nodeIDArray[j],
				 		'nodeOrder':  +entry											
					}
					nodeData.push(nodeObj)
				}
			}

			// ii. Turn node data into sequenced arrays of nodeIDs by sorting on nodeOrder
			nodeData.sort( (a,b) => a.nodeOrder - b.nodeOrder)
			for(let j = 0; j < nodeData.length; j++){
				nodeIDs.push(nodeData[j]['nodeID'] )
			}

			// iii. Find sequenced linkID array corresponding to node loop sequence
			for(let j = 0; j < nodeIDs.length; j++){
				for(let k = 0; k < visData.networkData.links.length; k++){
					let linkData = visData.networkData.links[k]
					if(nodeIDs[j] === linkData.source.id && (nodeIDs[j+1] === linkData.target.id) ){
						linkIDs.push(linkData['index']+1)
						linkPolarity.push(linkData['polarity'])
					}
					if(j === nodeIDs.length - 1 && nodeIDs[j] === linkData.source.id && (nodeIDs[0] === linkData.target.id) ){	
						linkIDs.push(linkData['index']+1)										
						linkPolarity.push(linkData['polarity'])										
					}
				}
			}

			// iv. Find the centrality measures of each loops nodes
			for (let j = 0; j < nodeIDs.length; j++){
				let nodeName = (function(){
						for(let k = 0; k < visData.networkData.nodes.length; k++){
							if(nodeIDs[j] === visData.networkData.nodes[k]['id']) {
								return visData.networkData.nodes[k]['name']
							}
						}
					})()							
				for(let k = 0; k < visData.nodeCentrality.length; k++){
					if(nodeName === visData.nodeCentrality[k]['name']){
						nodeIDeigenvector.push(visData.nodeCentrality[k]['eigenvectorCentrality'])
						nodeIDbetweeenness.push(visData.nodeCentrality[k]['betweennessCentrality'])
						nodeIDdegree.push(visData.nodeCentrality[k]['degreeCentrality'])
					}
				}
			}

			// v. Create data object for loop and push to visData.loopData
			let obj = {
					'id': 				loopData[i]['loopID'],
					'name': 			loopData[i]['loopName'],
		 			'description': 		loopData[i]['loopDescription'],					 			
		 			'type': 			loopData[i]['loopType'],					 			
		 			'loopSystemID': 	loopData[i]['loopSystemID'],					 			
		 			'loopSystemRank': 	loopData[i]['loopSystemRank'],					 			
		 			'nodeIDs': 			nodeIDs,
		 			'linkIDs': 			linkIDs,
		 			'linkPolarity':		linkPolarity,
		 			'inputNodeIDs':		inputNodeIDs,
		 			'inputLinkIDs':		inputLinkIDs,
		 			'outputNodeIDs':	outputNodeIDs,
		 			'outputLinkIDs':	outputLinkIDs,
		 			'centralityEigenvector':	d3.mean(nodeIDeigenvector),
		 			'centralityBetweenness':	d3.mean(nodeIDbetweeenness),
		 			'centralityDegree':			d3.mean(nodeIDdegree),
		 			'centreXpos': 		+loopData[i]['loopCentreX'] * width,
		 			'centreYpos': 		+loopData[i]['loopCentreY'] * height,
		 			'radius': 			+loopData[i]['loopRadius'] * height,
		 			'rotation': 		+loopData[i]['loopRotation']
			}
			visData.loopData.push(obj)
		}

		// 2. Add loop names to loop menu
		for(let i = 0; i < visData.loopData.length; i++){
			d3.select('#loopMenu-list-container')
				.append('li')
				.classed('loop-item', true)
					.insert('a')
					.text(visData.loopData[i]['name'])
					.attr('onclick', 'showLoopForces("'+visData.loopData[i]["id"]+'")')
		}

		// 3. Create loop scenarios data object for visualisation
		for(let i = 0; i < loopScenarios.length; i++){
			visData.loopScenario[loopScenarios[i]['scenarioID']] = {
				"loopIDs"		: 	loopScenarios[i]['loopIDs'],
				"loopXpos"		: 	loopScenarios[i]['loopXpos'].map(d => +d * width),
				"loopYpos"		: 	loopScenarios[i]['loopYpos'].map(d => +d * height),
				"loopRadius"	: 	loopScenarios[i]['loopRadius'].map(d => +d * height),
				"loopRotation"	: 	loopScenarios[i]['loopRotation'].map(d => +d * height),
				"labelXpos"		: 	loopScenarios[i]['labelXpos'].map(d => +d * width),
				"labelYpos"		: 	loopScenarios[i]['labelYpos'].map(d => +d * height),
				"labelScale"	: 	loopScenarios[i]['labelScale'].map(d => +d),
				"name"			: 	loopScenarios[i]['scenarioName'],
				"description"	: 	loopScenarios[i]['scenarioDescription']
			} 
		}

		// 4. Add scenario names to loop scenario menu
		let loopScenariosArray = Object.keys(visData.loopScenario)
		for(let i = 0; i < loopScenariosArray.length; i++){
			d3.select('#scenarioMenu-list-container')
				.append('li')
				.classed('scenario-item', true)
					.insert('a')
					.text(visData.loopScenario[loopScenariosArray[i]]['name'])
					.attr('onclick', 'showLoopScenarioForces("'+loopScenariosArray[i]+'")')
		}
	}; // end createLoopData()


	// D. CONSTRUCT NODE DIRECTION DATA OBJECT for monitoring node direction when calculating system influences
	function createNodeDirectionObj(nodeData){					
		for(let i = 0; i < nodeData.length; i++){
			visData.nodeDirectionObject['node_'+nodeData[i]['nodeID']] = {
				'name'	: 		nodeData[i]['nodeName'],
				'direction': 	undefined
			}
		}
	} // end createNodeDirectionObj()


    // E. RENDER NETWORK VISUALISATION   
	function renderVis(data, callback1, callback2){
	 	// 0. Setup node radius and text label data for visualisation
		 	// a. Determine radius of each node from and push to nodeRadiusArray: setup of three scales for mapping centrality
		 	const extentDegreeCentrality = d3.extent(data.nodes, d => d.degreeCentrality),
		 	 	extentEigenvectorCentrality = d3.extent(data.nodes, d => d.eigenvectorCentrality),
		 	 	extentBetweennessCentrality = d3.extent(data.nodes, d => d.betweennessCentrality),
	 			 	degreeScale = d3.scaleSqrt()									// Scales for mapping centrality measures to node radii
 					.range([settings.minRadius, settings.maxRadius])			// Power scale to visually scale area (instead of radius)
 					.domain(extentDegreeCentrality),
 			 	eigenvectorScale = d3.scaleSqrt()												
 					.range([settings.minRadius, settings.maxRadius ])
 					.domain(extentEigenvectorCentrality),
 			 	betweennessScale = d3.scaleSqrt()												
 					.range([settings.minRadius, settings.maxRadius])
 					.domain(extentBetweennessCentrality)

			for(let i = 0; i < data.nodes.length; i ++ ){						// Create the nodeRadius Array based on the centrality measure chosen in settings
			 	if(settings.centralityMeasure === 'degree')
                    visData.nodeRadiusArray.push( (i+1 === visData.centerNodeID) ? degreeScale(data.nodes[i]['degreeCentrality']) * settings.centralNodeSizeFactor : degreeScale(data.nodes[i]['degreeCentrality']) )
			 	else if(settings.centralityMeasure === 'eigenvector')
					visData.nodeRadiusArray.push( (i+1 === visData.centerNodeID) ? eigenvectorScale(data.nodes[i]['eigenvectorCentrality']) * settings.centralNodeSizeFactor : eigenvectorScale(data.nodes[i]['eigenvectorCentrality']) )
			 	else if(settings.centralityMeasure === 'betweenness')		 		
					visData.nodeRadiusArray.push( (i+1 === visData.centerNodeID) ? betweennessScale(data.nodes[i]['betweennessCentrality']) * settings.centralNodeSizeFactor  : betweennessScale(data.nodes[i]['betweennessCentrality']) )
                else{
                    visData.nodeRadiusArray.push( (i+1 === visData.centerNodeID) ? degreeScale(0.4) * settings.centralNodeSizeFactor : degreeScale(0.4) )
                }
			}
			
			// b. Create dataset of split text lines to be appended as tspans
			let labelWrappedData = [];
			for (let i = 0; i < data.nodes.length; i++){
				let dataObj = wrapCircle(data.nodes[i]);

				labelWrappedData.push(dataObj)
				for (let j = 0; j < labelWrappedData[i].length ; j++){
					labelWrappedData[i][j] = {
						'text' : labelWrappedData[i][j]['text'],
						'width' : labelWrappedData[i][j]['width'],
						'lines': labelWrappedData[i].length
					}
				}
			}

		// 1. BACKGROUND NODE/LINKS ELEMENTS: 
			// These layers are identical the foreground node/links and are help with clarity of focus/unfocus node-link views (i.e. allows highlighted links to be shown 'on top' of unfocused nodes) 
			linkBackgrounds = svg.append("g")
			  	.attr("class", "linkBackgrounds-group")
			    .selectAll("linkBackgrounds")
			    .data(data.links)
			    .enter()
			    	.append("path")
			    	.attr('id', (d, i) => 'linkBackground_'+(i+1) )
			    	.attr('class', d => (d.polarity === '+') ? 'linkBackground positive' : 'linkBackground negative') 
			    	.style('opacity', +settings.linkOpacity/100)				// On init background links are visible at set opacity
			
			nodeBackgrounds = svg.append("g")
			    .attr("class", "nodeBackgrounds-group")
			    .selectAll(".nodeBackgrounds")
			    .data(data.nodes)
			    .enter()
			    	.append("circle")
			    	.attr("class", d => "nodeBackground "+d.group)
					.attr('id', d => 'nodeBackground_'+d.id)
				    .attr("r", (d, i) => visData.nodeRadiusArray[i] )

		// 2. LINKS: Create Link group (append at bottom)
			links = svg.append("g")
			  	.attr("class", "links-group")
			    .selectAll("links")
			    .data(data.links)
			    .enter()
			    	.append("path")
			    	.attr('id', (d, i) => 'link_'+(i+1) )
			    	.attr('class', d => (d.polarity === '+') ? 'link positive' : 'link negative') 
			    	.style('opacity', 0)									// On init opacity set to zero as these links (above node backgrounds) are only req. for focused views

		// 3. NODES: Create Node group and NodeBackground group (append above links)
			// i. Append node group an individual nodes: 
			nodes = svg.append("g")
			    .attr("class", "nodes-group") 
			    .selectAll(".nodes")
			    .data(data.nodes)
			    .enter()
			    	.append("circle")
			    	.attr("class", d => "node "+d.group)
					.attr('id', d => 'node_'+d.id)
				    .attr('r', (d, i) => visData.nodeRadiusArray[i] )
				    .style('opacity', +settings.nodeOpacity/100)		// On init() nodes are set to user set opacity (recommend 100%)
				    .call( function(){ 
                        if(settings.nodePosition !== 'fixed'){
                            d3.drag().on("start", dragstarted ).on("drag",  dragged ).on("end",   dragended)
                        } else {
                            null
                        }   
                    })

        // 4. NODE BACKGROUND IMAGES: These are not expected to be applied to each node but are attached as placeholder groups and included in the force simulation
            nodeImages = svg.append("g")
                .attr("class", "nodeImages-group") 
                .selectAll(".nodeImages")
                .data(data.nodes)
                .enter()
                    .append("g")                    
                    .attr('id', d => 'nodeImage_'+d.id)
                    .attr("class", d => "nodeImage "+d.group)
          
		// 5. NODE LABELS: Create Node labels with circle/zoom wrap:
			// i. Append label group and text elements
			labels = svg.append("g")
			    .attr("class", "label-group")
			    .selectAll("g")
				.data(data.nodes)				    
			    .enter().append("text")
					.attr('id', d => 'label_'+d.id)
				   	.attr('class', d => "label "+d.group)
				   	.style('opacity', +settings.labelOpacity/100)
					
			// ii. Set lineHeight from CSS
			let lineHeight = +d3.select('text.label')
				.style('line-height')
				.replace("px", "")
				.replace("rem", "") ;

          // iii. add lines as tspans
            let wrappedLabels = d3.selectAll('text.label')
                .selectAll("tspan")
                .data( (d, i) =>  labelWrappedData[i])
                .enter().append("tspan")    
                    .style('text-anchor', 'middle')                         
                    .attr("x", 0 )
                    .attr("y", (d, i) => (i - d.lines/2 + 0.8) * lineHeight)
                    .text(d => d.text); 

        // 6. APPLY HIGHLIGHTING STYLE CLASS TO "CENTRAL" NODE 
            if(settings.networkTraceType === 'byDegreeWithCentralStopping' && !isNaN(visData.centerNodeID) ){
                d3.select('#node_'+visData.centerNodeID).classed("centralNode", true)
                d3.select('#label_'+visData.centerNodeID).classed("centralNode", true)
            }

		// 7. NODE BUTTON CONTROLS: Create groups for 'up/down' influence buttons for each node
			nodeControlsUp = svg.append("g")
				.attr("class", "nodeControls-group, nodeControlsUp-group")
				.selectAll(".nodesControl.nodeControl-up")
			    .data(data.nodes)
			    .enter()
			    	.append("circle")
			    	.attr("class", d => "nodeControl nodeControl-up nodeControl-"+d.group)
			    	.attr('id', d => 'nodeControlUp_'+d.id)
			    	.style('r', settings.controlButtonRadius)
			nodeControlsUp.append("title").text(d => "Press '+' to see how an increase in "+d.name+' influences other parts of the system');

			nodeControlsUpLabels = svg.append("g")
				.attr("class", "nodeControlsLabels-group, nodeControlsUpLabels-group")
				.selectAll(".nodesControl.nodeControlLabels-up")
			    .data(data.nodes)
			    .enter()
			    	.append("text")
			    	.attr("class", d => "nodeControl nodeControlLabels nodeControl-"+d.group)
			    	.attr('id', d => 'nodeControlUpLabel_'+d.id)
			    	.style('font-size', 1.5 * settings.controlButtonRadius)
			    	.text('+')

			nodeControlsDown = svg.append("g")
				.attr("class", "nodeControls-group, nodeControlsDown-group")
				.selectAll(".nodesControl.nodeControl-down")
			    .data(data.nodes)
			    .enter()
			    	.append("circle")
			    	.attr("class", d => "nodeControl nodeControl-down nodeControl-"+d.group)
			    	.attr('id', d => 'nodeControlDown_'+d.id)
			    	.style('r', settings.controlButtonRadius)    
			nodeControlsDown.append("title").text(d => "Press '-' to see how a reduction in "+d.name+' influences other parts of the system');

			nodeControlsDownLabels = svg.append("g")
				.attr("class", "nodeControlsLabels-group, nodeControlsDownLabels-group")
				.selectAll(".nodesControl.nodeControlLabels-down")
			    .data(data.nodes)
			    .enter()
			    	.append("text")
			    	.attr("class", d => "nodeControl nodeControlLabels nodeControl-"+d.group)
			    	.attr('id', d => 'nodeControlDownLabel_'+d.id)
			    	.style('font-size', 1.5 * settings.controlButtonRadius)
			    	.style('letter-spacing', -3)
			    	.text('--')

		// 6. LOOP LABELS AND BUTTON CONTROLS: set up group elements to append labels and control buttons
			loopAnnotation = svg.append("g")
				.attr("class", "loopAnnotation-group")
			loopAnnotation.append('g')
				.attr("class", "loopLabel-group")
			loopAnnotation.append('g')
				.attr("class", "loopControls-group")

		// 7. SIMULATIONS: Setup and start simulation
			createForcesSimulation(data) 
            setTimeout(customView, 500)
		
		// 8. INTERACTION:  Add event listeners
			createNodeInfluenceTable(data)
			addListeners()		

		// 9. CALLBACK FUNCTIONS
		 	callback1()					// For calling functions to create loop data and
		 	callback2()					// set intro
	} // end renderVis()


	// F. CREATE FORCE DIRECTED SIMULATION FUNCTIONS: a group of functions to change the view/configuration of nodes
		// i. INITIAL VIEW: Set up the simulation and event to update locations after each tick
			function createForcesSimulation(data) {					
				simulation = d3.forceSimulation()		   
				    .force("charge", 	d3.forceManyBody().strength(settings.forceCharge))			// gravitational force (negative) for all nodes	 
				    .force("collide", 	d3.forceCollide((d,i) => visData.nodeRadiusArray[i] * settings.forceRadiusFactor)) 		// + Collision detection for each node based on node radius
				    .force("x", 		d3.forceX(width * 0.5).strength(0.3))						// + forces to pull nodes to x
				    .force("y", 		d3.forceY(height * 0.5).strength(2))						// and y axis
					.force("link", 		d3.forceLink().id(d => d.id).strength(d => d.strength))		// Declare link and assign id's		

				simulation.nodes(data.nodes) 	// Start simulation
					.velocityDecay(0.7)			// Sets speed that nodes enter and disperse. Lower decay means faster entry rate however this needs to be matched to where the 'x' force is located as this interacts 
				    .on("tick", ticked)
					.force("link")				// Add data for link to tick link path calculations					
			    	.links(data.links)
			} // end createForcesSimulation()

		// ii. CLUSTER VIEW: apply specified cluster force properties
			function showClusterForces() {
			    simulation
				    .force("charge", 	d3.forceManyBody().strength(100))	
					.force("collide", 	d3.forceCollide((d,i) => visData.nodeRadiusArray[i] * settings.forceRadiusFactor * 0.7)) 
				    .force("x", 		d3.forceX(clusterForces.clusterX).strength(10)	)		
				    .force("y", 		d3.forceY(clusterForces.clusterY).strength(5)	)		            
				   	.force("link", 		null)		
				    .alpha(0.05)
				    .restart();
			
				 colourForcesbyCluster()
			} // updateForces()
			    
			    // Add cluster forces based on cluster data
			    let clusterForces = {
			    	'clusterX' : (d) => clusterData[d.cluster]['clusterXpos'],
			    	'clusterY' : (d) => clusterData[d.cluster]['clusterYpos'],
			    }

			    // Colour and uncolour nodes based on cluster type
				function colourForcesbyCluster(duration = 2000){
					for(let i = 0; i < settings.clusterNames.length; i++){
						d3.selectAll('circle.node.'+settings.clusterNames[i].toLowerCase())
							.transition().duration(duration)
							.style('fill', settings.clusterColours[i])							
					}
				} // end colourForces()

		// iii. UNCLUSTERED VIEW: releases the cluster forces
			function showUnclusteredForces() {
			    simulation
				    .force("charge", 	d3.forceManyBody().strength(settings.forceCharge))			
				    .force("collide", 	d3.forceCollide((d,i) => visData.nodeRadiusArray[i] * settings.forceRadiusFactor)) 					
				    .force("x", 		d3.forceX(width * 0.5).strength(0.3))						
				    .force("y", 		d3.forceY(height * 0.5).strength(0.8))						
					.force("link", 		d3.forceLink().id(d => d.id).strength(d => d.strength))			
				    .alpha(0.05)
				    .restart();

				d3.selectAll('circle.node')
					.transition().duration(2000)
					.style('fill', null)				
			} // updateForces()

		// iv. RADIAL "INPUT-OUPUT" CENTERED VIEW: places "output" nodes in the center, endogenous nodes (with inputs and outputs) in a a ring, and input only nodes as an outer ring 
			function showRadialForces(){
				// 1. Find id's of nodes directly influences by an 'input' 
					let outputNodeInfluences = [],			// Direct influences to system output nodes: array to store IDs
						influencedByInputNode = []			// System input nodes: array to store IDs

					for(let i = 0; i < visData.networkData.nodes.length; i++){
						// Get input nodes and find the nodes they influence
						if(visData.networkData.nodes[i]['type'] === 'ZISO' || visData.networkData.nodes[i]['type'] === 'ZIMO'){
							let linkIDs = visData.networkData.nodes[i]['outputs'].map(d => d-1)
							for(let j = 0; j < linkIDs.length; j++){
								let linkData = visData.networkData.links[linkIDs[j]]
								influencedByInputNode.push(+linkData.target.id -1)
							}
						}
						// Get output nodes and find their influnces
						if(visData.networkData.nodes[i]['type'] === 'MIZO' || visData.networkData.nodes[i]['type'] === 'SIZO'){
							let linkIDs = visData.networkData.nodes[i]['inputs'].map(d => d-1)
							for(let j = 0; j < linkIDs.length; j++){
								let linkData = visData.networkData.links[linkIDs[j]]
								outputNodeInfluences.push(+linkData.source.id -1)
							}
						}
					}

				// 2. Run the simulation
			    simulation
				    .force("charge", 	d3.forceManyBody().strength(-1000))							    
				    .force("collide", 	d3.forceCollide((d,i) => visData.nodeRadiusArray[i] * settings.forceRadiusFactor*0.7)) 										
				    .force("x", 		null)						
				    .force("y", 		d3.forceY(height * 0.5).strength(0.3))
				   	.force("link", 		d3.forceLink().strength(100))	
					.force("r", 		d3.forceRadial(function(d){
											if(d.type === 'MIZO' || d.type === 'SIZO'){				// The 'output' nodes
												return 0 
											} else if (outputNodeInfluences.indexOf(d.id-1) > -1){	// These nodes that directly influence the output nodes
												return 100 										
											} else if (d.type === 'ZISO' || d.type === 'ZIMO'){		// The 'input only' nodes are the outermost layer
												return 280										
											} else if (influencedByInputNode.indexOf(d.id-1) > -1){	// The nodes that are influenced directly by the input only nodes
												return 170	
											} else {
												return 130										// All other endogenous system variables to middle layer
											}
										}, width/2, height/2).strength(1.5))
				    .alpha(0.75)
				    .restart();

			    // Colour nodes by ring
				colourByType()
				function colourByType(duration = 2000){
					// Colour the mid layer
					for(let i = 0; i < visData.networkData.nodes.length; i++){
						let id = visData.networkData.nodes[i]['id'] -1

						if (outputNodeInfluences.indexOf(id) > -1){			// Mid layer connected to output nodes (more central)
							d3.select('#node_'+(i+1))							
								.transition().duration(duration)
								.style('fill', '#9cd69a')
						} else if (influencedByInputNode.indexOf(id) > -1){
							d3.select('#node_'+(i+1))						// Mid layer connected to input nodes (more outer)
								.transition().duration(duration)
								.style('fill', '#d9f48a')
						} else {
							d3.select('#node_'+(i+1))					// Center (not connected to inner or outer ring)
								.transition().duration(duration)
								.style('fill', '#C8EC8E')
						}
					}
					// Colour the input (outer) and output (innermost) nodes
					d3.selectAll('.node.ziso, .node.zimo')			// Input (outer)
						.transition().duration(duration)
						.style('fill', '#e4f889')
					d3.selectAll('.node.mizo, .node.sizo')			// Output (center)
						.transition().duration(duration)
						.style('fill', '#8ccaa2')
				} // end colourForces()
			} // end showRadialForces()

		// v. SINGLE LOOP VIEW(S): places nodes for one loopID centrally. The loopRadius argument and simulation forces should be adjusted to keep nodes positioned on the canvas
			function showLoopForces(loopID, loopRadius = 200){
				// Declare loop positioning variables  and gather loop information
				const loopXpos 	= width / 2,
					loopYpos 	= height /2 ,
				 	loopIndex = (function(){
						for(let i = 0; i < visData.loopData.length; i++){
							if(visData.loopData[i]['id'] === loopID){return i ;}
						}
					}()),
					loopData 	= visData.loopData[loopIndex],
					loopNodeIDs = loopData['nodeIDs'],
					loopLinkIDs = loopData['linkIDs'],
					loopRotation =  loopData['rotation'],
					loopNodePositions = {}

				// 1. Calculate node position 'around a circle': Reinforcing loops arranged clockwise and Balancing loops anticlockwise
				for(let i = 0; i < loopNodeIDs.length; i++){
					let angle = (loopData['type'] === 'Reinforcing') ? (i * 360/(loopNodeIDs.length) + loopRotation) * Math.PI/180 : (-i * 360/(loopNodeIDs.length) + loopRotation) * Math.PI/180						
					loopNodePositions[loopNodeIDs[i]] = {
						'xPos': 	loopXpos + Math.cos(angle) * loopRadius,
						'yPos': 	loopYpos + Math.sin(angle) * loopRadius
					}
				}

				// 2. Set link tapering based on the number of nodes in loop
				let upperNodeLimit = d3.max([5,loopNodeIDs.length]),			// Use this to set the domain so that tapering is clamped to the range limit
					taperScale = d3.scaleLinear().domain([upperNodeLimit, 2])	// Max tapering for when there are only two nodes
					// Set direction of taper scale depending on the loop type
					if(loopData['type'] === 'Reinforcing') {
						taperScale.range([-0.2, -0.75])
					} else {
						taperScale.range([0.2, 0.75])
					}							
					// Set taper and update the controls	
					settings.taperCurve = taperScale(loopNodeIDs.length)
					d3.select("#sliderLinkTension").node().value = taperScale(loopNodeIDs.length)*100

				// 3. Run the simulation pushing loop nodes to their loop circled circle
			    simulation
				    .force("charge", 	d3.forceManyBody().strength(-1000))							    
				    .force("collide", 	d3.forceCollide((d,i) => visData.nodeRadiusArray[i] * settings.forceRadiusFactor*0.7)) 	
				    .force("x", 		d3.forceX(function(d, i){
											if(loopNodeIDs.indexOf(d.id) > -1){				// Nodes in the specified loop
				    							return loopNodePositions[d.id]['xPos']
				    						} else {
				    							return width /2
				    						}
									    })
				    					.strength(2)
				    )							
				    .force("y", 		d3.forceY(function(d, i){
											if(loopNodeIDs.indexOf(d.id) > -1){				// Nodes in the specified loop
				    							return loopNodePositions[d.id]['yPos']
				    						} else {
				    							return height /2
				    						}
									    })
				    					.strength(2)
				    )					    
				   	.force("link", 		d3.forceLink().strength(-1000).distance(0))	
					.force("r", 		d3.forceRadial(
											d => (loopNodeIDs.indexOf(d.id) > -1) ? loopRadius : null, 	// Nodes in the specified loop
										 	loopXpos, 
										 	loopYpos
										 )
										.strength(0.25)
					)
				    .alpha(0.75)
				    .restart();

				// 4. Add the loop labeling
				let loopLabelContainer = d3.select('.loopLabel-group')
				loopLabelContainer.selectAll('*').remove()						// Clear any previous label annotation
				let loopLabelData = wrapCircleLoop(loopID),
					labelWrappedData = [],
					loopLabel = loopLabelContainer.append('text').attr('class', 'loopLabel')
						.attr('x', loopXpos)
						.attr('y', loopYpos),
				 	lineHeight = +d3.select('.loopLabel')
						.style('line-height')
						.replace("px", "")
						.replace("rem", "") 

					// Create wrapped data array 
					for (let j = 0; j < loopLabelData.textData.length; j++){
						labelWrappedData[j] = {
							'text' : loopLabelData.textData[j]['text'],
							'width' : loopLabelData.textData[j]['width'],
							'lines': loopLabelData.textData.length
						}
					}
					// Append label 
					d3.select('.loopLabel')
						.attr("transform", (d,i) => 'translate('+loopXpos+' , '+loopYpos+') scale('+ loopRadius / loopLabelData.radius * 1.2 +')')			// Position and scale label text group								
						.selectAll("tspan")
						.data(labelWrappedData)
						.enter().append("tspan")	
							.style('text-anchor', 'middle')							
						    .attr("x", 0)
						    .attr("y", 0)
						    .attr("dy", (d, i) => (i - d.lines/2 + 0.8) * lineHeight)				// Use dy to position lines
						    .text(d => d.text)
						    .style('opacity', 0)
						    .transition().duration(750)
						    	.style('opacity', 1)

				// 5. Highlight the loop visually
				highlightLoop()
				function highlightLoop(duration = 2000, fadeOpacity = 0.2, colour = 'var(--color-main-dark)' ){
					// Fade all the non-loop nodes and links
					d3.selectAll('circle.node')
						.transition().duration(duration/2)
						.style('stroke-opacity', fadeOpacity)
						.style('fill', null)
					d3.selectAll('text.label')
						.transition().duration(duration/2)
						.style('opacity', fadeOpacity)
					d3.selectAll('path.link, path.linkBackground')	
						.transition().duration(duration/2)
						.style('opacity', fadeOpacity/4)	

					for(let i = 0; i < loopNodeIDs.length; i++){									
						d3.select('#node_'+(loopNodeIDs[i]))							
							.transition().duration(duration)
							.style('stroke-opacity', 1)
							.style('fill', colour)
						d3.select('#label_'+(loopNodeIDs[i]))	
							.transition().duration(duration/2)
							.style('fill', 'var(--color-background)')
							.style('opacity', 1)									
						d3.selectAll('#link_'+loopLinkIDs[i]+", #linkBackground_"+loopLinkIDs[i])	
							.transition().duration(duration)
							.style('opacity', 1)	
					}

				// 6. Call instruction/description event
				loopShowIntroduction(loopData)
				} // end colourForces()
			} // end showLoopForces()

		// VII. LOOP SCENARIO VIEW(S): places nodes in loopID according to their scenario specified positions
			function showLoopScenarioForces(scenarioID){
				// 0. Declare variables and data object objects for rendering
				let scenarioData = visData.loopScenario[scenarioID],
					loopIDArray = scenarioData['loopIDs'],
					multiLoopNodeData 		= {},					// Array to hold node data object for each node in ALL loops
					multiLoopNodeIDs 		= [],					// Array to hold ALL nodeIDs in ALL loops
					multiLoopLinkIDs 		= [],					// Array to hold ALL linkIDs in ALL loops
					multiLoopNodeIDsByLoop 	= [],					// Array of arrays to hold nodeIDs by loop
					multiLoopLinkIDsByLoop 	= [],					// Array of arrays to hold linkIDs by loop
					loopLabelContainer 	= d3.select('.loopLabel-group')			// Get the loop label container to attach labels to								
				    loopLabelContainer.selectAll('*').remove()						// and ensure any previous label annotation is cleared 		

				// 1. FOR EACH LOOP TO BE POSITIONED AND HIGHLIGHTED 
				for(let i = 0; i < loopIDArray.length; i++){
					// a. Declare loop positioning variables  and gather loop information
					let loopID = loopIDArray[i],
						loopIndex = (function(){
							for(let i = 0; i < visData.loopData.length; i++){
								if(visData.loopData[i]['id'] === loopID){return i}
							}
						}()),
						loopData = visData.loopData[loopIndex],		 // Use general loop data for finding nodeIDs, linkIDs and loop type
						loopXpos = scenarioData.loopXpos[i],		 // Scenario based 
						loopYpos = scenarioData.loopYpos[i],		 // positioning for nodes
						labelXpos = scenarioData.labelXpos[i],		 // and for 
						labelYpos = scenarioData.labelYpos[i],		 // labels,									
						labelScale = scenarioData.labelScale[i],		 //  label size									
						loopRadius = scenarioData.loopRadius[i], 	 // and radius and 
						loopRotation = scenarioData.loopRotation[i] 	 // and radius and 

					// b. Find if there are any shared nodes (in prior loops), and remove them from the loopIDs to be positioned (i.e. shared position is from the first declared loop). The first declared loop takes 'precedence' in terms of positioning shared nodes.
					let loopIDsToPlot = loopData['nodeIDs'].filter(x => !multiLoopNodeIDs.includes(x))		// Find difference between array loopData['nodeIDs'] and multiLoopNodeIDs

					// c. Update the multiLoopNodeIDs and multiLoopLinkIDs arrays (which contain an unique list of IDs)
					multiLoopNodeIDs = [...new Set(multiLoopNodeIDs.concat(loopData['nodeIDs']) )]
					multiLoopLinkIDs = [...new Set(multiLoopLinkIDs.concat(loopData['linkIDs']) )]

					// d. Calculate node position 'around a circle': Reinforcing loops arranged clockwise and Balancing loops anticlockwise
					for(let j = 0; j < loopIDsToPlot.length; j++){
						let angle = (loopData['type'] === 'Reinforcing') ? (j * 360/(loopIDsToPlot.length) + loopRotation) * Math.PI/180 : (-j * 360/(loopIDsToPlot.length) + loopRotation) * Math.PI/180
						multiLoopNodeData[loopIDsToPlot[j]] = {
							'xPos': 		loopXpos + Math.cos(angle) * loopRadius,
							'yPos': 		loopYpos + Math.sin(angle) * loopRadius,
							'centreX':  	loopXpos,
							'centreY':  	loopYpos,
							'loopRadius':  	loopRadius,
							'loopID': 		loopID
						}
					}	

					// e. Set link tapering based on the number of nodes in loop
					let upperNodeLimit = d3.max([5,multiLoopNodeIDs.length]),			// Use this to set the domain so that tapering is clamped to the range limit
						taperScale = d3.scaleLinear().domain([upperNodeLimit, 2])		// Max tapering for when there are only two nodes
						if(loopData['type'] === 'Reinforcing') {						// Set direction of taper scale depending on the loop type
							taperScale.range([-0.2, -0.75])
						} else {
							taperScale.range([0.2, 0.75])
						}							
						settings.taperCurve = taperScale(multiLoopNodeIDs.length)		// Set taper and update the controls	
						d3.select("#sliderLinkTension").node().value = taperScale(multiLoopNodeIDs.length) * 100

					// f. Add the loop labelling according to specified label positioning
					let loopLabelData = wrapCircleLoop(loopID),
						labelWrappedData = [],
						loopLabel = loopLabelContainer.append('text').attr('class', 'loopLabel')
							.attr('id', 'loopLabel_'+loopID)
							.attr('x', labelXpos)
							.attr('y', labelYpos),
					 	lineHeight = +d3.select('.loopLabel')
							.style('line-height')
							.replace("px", "")
							.replace("rem", "") 

						// Create wrapped data array for label
						for (let j = 0; j < loopLabelData.textData.length; j++){
							labelWrappedData[j] = {
								'text' : loopLabelData.textData[j]['text'],
								'width': loopLabelData.textData[j]['width'],
								'lines': loopLabelData.textData.length
							}
						}

						// Append label 
						d3.select('#loopLabel_'+loopID)
							.attr("transform", (d,i) => 'translate('+labelXpos+' , '+labelYpos+') scale('+ loopRadius / loopLabelData.radius * labelScale +')')			// Position and scale label text group
							.selectAll("tspan")
							.data(labelWrappedData)
							.enter().append("tspan")	
								.style('text-anchor', 'middle')							
							    .attr("x", 0)
							    .attr("y", 0)
							    .attr("dy", (d, i) => (i - d.lines/2 + 0.8) * lineHeight)				// Use dy to position lines
							    .text(d => d.text)
							    .style('opacity', 0)
							    .transition().duration(750)
							    	.style('opacity', 1)
				} // end i loop for loopIDArray

				// 4. Run the simulation pushing loop nodes to their loop circled circle
			    simulation
				    .force("charge", 	d3.forceManyBody().strength(d => (multiLoopNodeIDs.indexOf(d.id) > -1000) ? -1000 : 0) ) 							    
				    .force("collide", 	d3.forceCollide((d,i) => visData.nodeRadiusArray[i] * settings.forceRadiusFactor * 0.7) ) 	
				    .force("x", 		d3.forceX(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? multiLoopNodeData[d.id]['xPos'] : width/2)
				    						.strength(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? 2 : 0.1)  	// Nodes in the specified loop		
				    )				
				    .force("y", 		d3.forceY(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? multiLoopNodeData[d.id]['yPos'] : height/2) 
				    						.strength(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? 2 : 0.1)  		// Nodes in the specified loop	
				    )
				   	.force("link", 		d3.forceLink().strength(-10).distance(0))	
					.force("r", 		customRadial()
											.radius(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? multiLoopNodeData[d.id]['loopRadius'] : width)
					   	 					.x(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? multiLoopNodeData[d.id]['centreX'] : width/2)
					    					.y(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? multiLoopNodeData[d.id]['centreY'] : height/2)
					    				.strength(d => (multiLoopNodeIDs.indexOf(d.id) > -1) ? 0.1 : 0.3)
					 )
				    .alpha(0.75)
				    .restart();

				// 5. Highlight the loops visually
				highlightLoop()							
				function highlightLoop(duration = 2000, fadeOpacity = 0.2, colour = 'null' ){
					d3.selectAll('circle.node, circle.nodeBackground, text.label')
						.style('fill', null)
					d3.selectAll('text.label')
						.transition().duration(duration/2)
						.style('opacity', fadeOpacity)
					d3.selectAll('path.link, path.linkBackground')	
						.transition().duration(duration/2)
						.style('opacity', fadeOpacity/4)	

					// Create selection strings to highlight the nodes and links that are part of the system
					let nodeSelectionString = '' ,
					 	labelSelectionString = '',
						linkSelectionString = ''

					for(let i = 0; i < multiLoopNodeIDs.length; i++){										
						nodeSelectionString += '#node_'+multiLoopNodeIDs[i]+', '
						labelSelectionString += '#label_'+multiLoopNodeIDs[i]+', '
					}
					for(let i = 0; i < multiLoopLinkIDs.length; i++){	
						linkSelectionString += '#link_'+multiLoopLinkIDs[i]+', #linkBackground_'+multiLoopLinkIDs[i]+', '
					}
					nodeSelectionString	= nodeSelectionString.slice(0, -2),
					labelSelectionString = labelSelectionString.slice(0, -2),
					linkSelectionString  = linkSelectionString.slice(0, -2)
						d3.selectAll(nodeSelectionString)							
							.transition().duration(duration)
							.style('stroke-opacity', 1)
							.style('fill', colour)
						d3.selectAll(labelSelectionString)	
							.transition().duration(duration)
							.style('opacity', 1)	
						d3.selectAll(linkSelectionString)	
							.transition().duration(duration)
							.style('opacity', 1)		
				} // end highlightLoop()

                // 6. Call instruction/description event
                scenarioShowIntroduction(scenarioData)

			} // end showLoopScenarioForces()


	// H. CREATE NODE INFLUENCE TABLE: a data table used to trace the system flow through impact of each node from Google sheet consequence data
	function createNodeInfluenceTable(data){
		for(let i = 0; i < data.nodes.length ; i++){				// Loop through each node
			let influenceArray 		= [], 							// This will hold an array of objects with nodeID :
				polarityObjects 	= {},		
				nodeOutLinkIDs 		=  data.nodes[i]['outputs'],	// Find the linkIDs for the node 		 
				nodeTargetNodeIDs	= [],							
				nodeTargetNodePol 	= []						

			for(let j = 0; j < nodeOutLinkIDs.length; j++){
				nodeTargetNodeIDs.push(data.links[nodeOutLinkIDs[j]-1]['target']['id']) 				// Get the target nodeIDs for the link(s)
				nodeTargetNodePol.push(data.links[nodeOutLinkIDs[j]-1]['polarity'] === "+" ? 1 : -1) 	// Get the polarity indicators for the link(s)	
			}
			for(let j = 1; j < data.nodes.length + 1 ; j++){					// For each nodeID in node[i] (i.e. creates an n x n)
				influenceArray.push(nodeTargetNodeIDs.includes(j) ? nodeTargetNodePol[nodeTargetNodeIDs.indexOf(j)] : 0)
			}	    		
			visData.nodeInfluenceData.push(influenceArray)
		} 
	} // end createNodeInfluenceTable()


	// G. FORCE SIMULATION: ANIMATION AND INTERACTION: Tick (animation) and drag (interaction) functions called by the simulation
    	// i. TICK FUNCTION
			function ticked(){
				// a. Update / render links 
				if (settings.linkType === 'taperedLinks'){				// FOR TAPERED CURVED PATH LINKS
					links.attr("d", d => taperedLinks(d))									
					linkBackgrounds.attr("d", d => taperedLinks(d))		
				} else 	{												// FOR STRAIGHT OR CURVED LINKS USING LINE PATH GENERATOR
				    links.classed("stroke", 'true')
						.attr("marker-mid", "url(#arrow)")
						.attr("d", d => settings.linkType === 'straightLinks' ? straightLinks(d) : curvedLinks(d)  )			
				    linkBackgrounds.classed("stroke", 'true')
						.attr("marker-mid", "url(#arrow)")
						.attr("d", d => settings.linkType === 'straightLinks' ? straightLinks(d) : curvedLinks(d)  )	
				}													


                if(settings.nodePosition !== 'fixed'){
                    // b. Update / render labels and node positions (including backgrounds)
                    labels
                        .attr("transform", (d,i) => (settings.labelSize === 'fixed') ? 'translate('+d.x+' , '+d.y+') scale(1)' : 'translate('+d.x+' , '+d.y+') scale('+ visData.nodeRadiusArray[i] / visData.textRadiusArray[i] * settings.labelScale +')' )          // Labels moved as offset to enable text wrapping function
                    nodeImages
                         .attr("transform", (d,i) =>  'translate('+d.x+' , '+d.y+')  scale(1)' )
                    nodeBackgrounds
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)                   
                    nodes
                        .attr("cx", d => d.x)
                        .attr("cy", d => d.y)

                    // c. Update control buttons with node position with 'up' on top and 'down' on bottom. '+/-' labels are adjusted to center of each button
                    nodeControlsUp                  // move buttons with nodes
                        .attr("cx", d => d.x)
                        .attr("cy", (d, i) => d.y - visData.nodeRadiusArray[i]) 
                    nodeControlsUpLabels            
                        .attr("transform", (d, i) => 'translate('+(d.x - 1.5 * settings.controlButtonRadius *0.3)+' , '+ (d.y - visData.nodeRadiusArray[i] + 1.5 * settings.controlButtonRadius * 0.3) +')')
                    nodeControlsDown
                        .attr("cx", d => d.x)
                        .attr("cy", (d, i) => d.y + visData.nodeRadiusArray[i]) 
                    nodeControlsDownLabels
                        .attr("transform", (d, i) => 'translate('+(d.x - 1.5 * settings.controlButtonRadius * 0.275)+' , '+ (d.y + visData.nodeRadiusArray[i] + 1.5 * settings.controlButtonRadius * 0.3) +')')

                } else if (settings.nodePosition === 'fixed'){
                    labels
                        .attr("transform", (d,i) => (settings.labelSize === 'fixed') ? 'translate('+(d.customX * width)+' , '+(d.customY * height)+') scale('+settings.labelScale+')' : 'translate('+d.x+' , '+d.y+') scale('+ visData.nodeRadiusArray[i] / visData.textRadiusArray[i] * settings.labelScale +')' )          // Labels moved as offset to enable text wrapping function
                    nodeImages
                         .attr("transform", (d,i) =>  'translate('+d.x+' , '+d.y+')  scale(1)' )
                         .attr("transform", (d,i) =>  'translate('+(d.customX * width)+' , '+(d.customY * height)+')  scale(1)' )
                    
                    nodeBackgrounds
                        .attr("cx", d => d.customX * width)
                        .attr("cy", d => d.customY * height)                    
                    nodes
                        .attr("cx", d => d.customX * width)
                        .attr("cy", d => d.customY * height)
                    // c. Update control buttons with node position with 'up' on top and 'down' on bottom. '+/-' labels are adjusted to center of each button
                    nodeControlsUp                  // move buttons with nodes
                        .attr("cx", d => (d.customX * width))
                        .attr("cy", (d, i) => (d.customY * height) - visData.nodeRadiusArray[i]) 
                    nodeControlsUpLabels            
                        .attr("transform", (d, i) => 'translate('+((d.customX * width)- 1.5 * settings.controlButtonRadius *0.3)+' , '+ ((d.customY * height) - visData.nodeRadiusArray[i] + 1.5 * settings.controlButtonRadius * 0.3) +')')
                    nodeControlsDown
                        .attr("cx", d => (d.customX * width))
                        .attr("cy", (d, i) => (d.customY * height) + visData.nodeRadiusArray[i]) 
                    nodeControlsDownLabels
                        .attr("transform", (d, i) => 'translate('+((d.customX * width) - 1.5 * settings.controlButtonRadius * 0.275)+' , '+ ((d.customY * height) + visData.nodeRadiusArray[i] + 1.5 * settings.controlButtonRadius * 0.3) +')')
                }
			} // end ticked()

		// ii NODE DRAG FUNCTIONS
			function dragstarted(d) {
			  	if (!d3.event.active) simulation.alphaTarget(0.1).restart();
			  	d.fx = d.x;
			  	d.fy = d.y;           
			}

			function dragged(d) {
			     d.fx = d3.event.x;
			     d.fy = d3.event.y;
			}

			function dragended(d) {
			  if (!d3.event.active) simulation.alphaTarget(0).velocityDecay(0.7);
				  d.fx = null;
				  d.fy = null;
			}

		// iii. LINK RENDERING STYLES: Tapered links are the default setting
		   	// 1. Create straight paths 
		   	function straightLinks(d){
		   		const points = [ [d.source.x, d.source.y] , [d.target.x, d.target.y] ],
				 	  line = d3.line()
				    		.x(d => d[0] )
				    		.y(d => d[1] )
				return line(points);
		   	} // end  straightLinks()
	   
		   	// 2. Create curve paths 
		   	function curvedLinks(d){
		        const dx = d.target.x - d.source.x,
			          dy = d.target.y - d.source.y,
			          dr = Math.sqrt(dx * dx + dy * dy);
		        return "M" + 
		            d.source.x + "," + 
		            d.source.y + "A" + 
		            dr + "," + dr + " 0 0,1 " + 
		            d.target.x + "," + 
		            d.target.y;
		   	} // end curvedLinks()

			// 3. Create tapered link using curved shapes with area fill. Adapted from http://bl.ocks.org/ariutta/raw/5173667/
		    function taperedLinks(d){
				const strength_scale = d3.scaleOrdinal()
					.range([settings.taperedCurveStart, settings.taperedCurveEnd]) 										// Thickness range for flow lines
					.domain(settings.connectionDelayScale.range()) 		// mapped to range of strength

			    const offsetScale = settings.taperCurve; 				// percentage of line line to offset curves 	

				const slope = Math.atan2( 
						(d3.select('#node_' + d.target.id).attr("cy") - d3.select('#node_' + d.source.id).attr("cy")), 
						(d3.select('#node_' + d.target.id).attr("cx") - d3.select('#node_' + d.source.id).attr("cx"))
					);

				const slopePlus90 = Math.atan2(
						(d3.select('#node_' + d.target.id).attr("cy") - d3.select('#node_' + d.source.id).attr("cy")), 
						(d3.select('#node_' + d.target.id).attr("cx") - d3.select('#node_' + d.source.id).attr("cx"))
					) + (Math.PI/2);

				const sourceX = +d3.select('#node_' + d.source.id).attr("cx"),
				 	sourceY = +d3.select('#node_' + d.source.id).attr("cy"),
				 	targetX = +d3.select('#node_' + d.target.id).attr("cx"),
				 	targetY = +d3.select('#node_' + d.target.id).attr("cy"),
				 	halfX = (sourceX + targetX)/2,
				 	halfY = (sourceY + targetY)/2

				const lineLength = Math.sqrt(Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2));

				const MP1X = halfX + (offsetScale * lineLength + strength_scale(d.strength)/2) * Math.cos(slopePlus90),
				 	MP1Y = halfY + (offsetScale * lineLength + strength_scale(d.strength)/2) * Math.sin(slopePlus90),
				 	MP2X = halfX + (offsetScale * lineLength - strength_scale(d.strength)/2) * Math.cos(slopePlus90),
				 	MP2Y = halfY + (offsetScale * lineLength - strength_scale(d.strength)/2) * Math.sin(slopePlus90);

				const points = [];
				points.push([(sourceX - strength_scale(d.strength) * Math.cos(slopePlus90)),(sourceY - strength_scale(d.strength) * Math.sin(slopePlus90))]);
				points.push([MP2X,MP2Y]);
				points.push(([(targetX  + settings.minRadius * Math.cos(slope)), (targetY + settings.minRadius * Math.sin(slope))]));
				points.push(([(targetX  + settings.minRadius * Math.cos(slope)), (targetY + settings.minRadius * Math.sin(slope))]));
				points.push([MP1X, MP1Y]);
				points.push([(sourceX + strength_scale(d.strength) * Math.cos(slopePlus90)),  (sourceY + strength_scale(d.strength) * Math.sin(slopePlus90))]);

				const line = d3.line()
				    .x(function (d) { return d[0]; })
				    .y(function (d) { return d[1]; })
				    .curve(d3.curveBasis)

				return line(points) + "Z";
		    }; // end taperedLinks()


    // H. RENDER ANNOTATION: renders text for headers etc. as defined from the Google Sheet     
	function renderAnnotation(data){
		annotation = svg.append('g').attr('id', 'annotation-group')
		annotation.append('text')
			.attr('id', 'main-header')
			.text(getTextFromData(data, 'main-header'))
			.attr('x', 20)
			.attr('y', 30)
			.style('opacity', 0)
			.transition().duration(750)
				  .style('opacity', 1)	
				  .attr('y', 60)	

		annotation.append('text')
			.attr('id', 'sub-header')
			.text(getTextFromData(data, 'sub-header'))
			.attr('x', 20)
			.attr('y', 60)
			.style('opacity', 0)	    				
			.transition().duration(1250).delay(200)
				  .style('opacity', 1)	
				  .attr('y', 85)		    				

		function getTextFromData(data, id){
			for(let i = 0; i < data.length; i++){
				if(data[i]['id'] === id){
					return data[i]['text']
				}
			}
		}
	} // end renderAnnotation()


	// I. SVG "defs" for markers and filter effects (note: arrow marker in SVG defs only works with the line connector option)
    function addSVGdefs(){
		const defs = svg.append("defs")
		defs.selectAll("marker")					// Arrow marker only applied to path stroke links
		    .data(["arrow"])      					// Note: the use of a marker defined here can only be a applied at the start, middle or end of a path.
		  .enter().append("marker")    				// Setting an arrow marker at the edge of the target node (i.e. taking to account the node radius)
		    .attr("id", String)						// requires a custom function to calculate the desired position of the arrow head along a path
		    .attr("viewBox", "0 -5 10 10")			// and is not (yet) included in this library (it should be defined as marker and grouped with the path).  
		    .attr("refX", 15)
		    .attr("refY", -1.5)
		    .attr("markerWidth", 6)
		    .attr("markerHeight", 6)
		    .attr("orient", "auto")
		  .append("svg:path")
		    .attr("d", "M0,-5L10,0L0,5");

	    // Define gooey effect filter: this blur filter adds a gooey effect to the node fill backgrounds and can be turned off through the CSS (by default through CSS file): or JavaScript
		const filter = defs.append("filter").attr("id","gooeyFilter");
		filter.append("feGaussianBlur")
			.attr("in","SourceGraphic")
			.attr("stdDeviation","10")
			.attr("color-interpolation-filters","sRGB") 	//to fix safari: http://stackoverflow.com/questions/24295043/svg-gaussian-blur-in-safari-unexpectedly-lightens-image
			.attr("result","blur");
		filter.append("feColorMatrix")
			.attr("in","blur")
			.attr("mode","matrix")
			.attr("values","1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7")
			.attr("result","gooey");
    } // end addSVGDefs()


///////////////////////////////////////////////////////////////////////////
//////////////////    INTERACTION | VIEWS & ANIMATION    //////////////////
///////////////////////////////////////////////////////////////////////////

	/// 0. OVERLAY DATA / TEXT: instruction and view description information
		// Object data for updating overlay (instruction and description) views for mouseover/out and (successive) click events on nodes
		// NOTE: Instructions programmed to display for the prior event
		const eventData = {									
			'introduction': {									// Introduction instruction text loaded and shown after load (i.e. with setStartView)
				'instructionHeader': 		'Explore the system',
				'instructionText': 			'Tap on any "element" (circle) to learn about it',	
				'descriptionHeader': 		'',
				'descriptionText': 			'',						
				'showInstructionDuration': 	0,					// Duration in ms that pane is shown on screen. 
				'showDescriptionDuration': 	0					// 0 indicates that pane is not shown, 'infinite' === sticky	
			},
            ///// NODE CLICKING INTERACTIONS /////
    			'nodeHighlight': {									// Hover event for desktops only
    				'instructionHeader': 		'Explore the system',
    				'instructionText': 			'Tap on any "element" (circle) to learn about it',	
    				'descriptionHeader': 		'About',
    				'descriptionText': 			'[Description loaded from system element from database]',					
    				'showInstructionDuration': 	5000,				// Duration in ms that pane is shown on screen. 
    				'showDescriptionDuration': 	'infinite'			// 0 indicates that pane is not shown, 'infinite' === sticky	
    			},
    			'nodeUnhighlight': {								// Mouseout event (used to reset nodes)
    				'instructionHeader': 		'Explore the system',
    				'instructionText': 			'Tap on any "element" (circle) to learn about it',	
    				'descriptionHeader': 		'',
    				'descriptionText': 			'',
    				'showInstructionDuration':  5000,				// Duration in ms that pane is shown on screen. 
    				'showDescriptionDuration': 	0					// 0 indicates that pane is not shown, 'infinite' === sticky
    			},					
    			'nodeShowDescription': {
    				'instructionHeader': 		'Explore an element',
    				'instructionText': 			'Tap on any "element" (circle) to learn about it',	// Descriptions are for the previous event
    				'descriptionHeader': 		'About',
    				'descriptionText': 			'[Description loaded from system element from database]',								
    				'showInstructionDuration': 	5000,				// Duration in ms that pane is shown on screen. 
    				'showDescriptionDuration': 	8000			// 0 indicates that pane is not shown, 'infinite' === sticky	
    			},
    			'nodeShowSystemImpacts': {									// The +/- buttons on the selected node
    				'instructionHeader': 		'Explore consequences',
    				'instructionText': 			"Tap to explore how changes to this element influences others in the system",
    				'descriptionHeader': 		'System consequences',
    				'descriptionText': 			'[Description constructed from node data]',		
    				'showInstructionDuration': 	10000,			// Duration in ms that pane is shown on screen. 
    				'showDescriptionDuration': 	10000			// 0 indicates that pane is not shown, 'infinite' === sticky	
    			},
    			'nodeShowButtonExplorer': {							// The entire system of influences
    				'instructionHeader': 		'Explore system impacts',
    				'instructionText': 			"",
    				'descriptionHeader': 		'System consequences',
    				'descriptionText': 			'[Description constructed from node data]',	
    				'showInstructionDuration':  5000,				// Duration in ms that pane is shown on screen. 
    				'showDescriptionDuration': 	10000			// 0 indicates that pane is not shown, 'infinite' === sticky		
    			},

            ///// SINGLE LOOP EVENTS: For loops, each objects instruction/description are kept in sync /////
			'loopShowMenu':{
				'instructionHeader': 		'Choose a loop',
				'instructionText': 			"Tap on a system loop name in the list below to arrange and highlight the loop's elements",
				'descriptionHeader': 		"About feedback loops"  ,
				'descriptionText': 			"",	
				'showInstructionDuration': 	8000,				// Duration in ms that pane is shown on screen. 
				'showDescriptionDuration': 'infinite'			// 0 indicates that pane is not shown, 'infinite' === sticky		
			},
			'loopShowIntroduction':{
				'instructionHeader': 		'Explore the loop',
				'instructionText': 			"Tap the center of the loop to learn more about the loop",
				'descriptionHeader': 		"Elements in a loop"  ,
				'descriptionText': 			"",  
				'showInstructionDuration': 	5000,				// Duration in ms that pane is shown on screen. 
				'showDescriptionDuration': 	'infinite'			// 0 indicates that pane is not shown, 'infinite' === sticky		
			},
            'loopShowElements':{
                'instructionHeader':        'Explore loop behaviour',
                'instructionText':          "Tap the center of the loop to learn more about this loops behaviour",
                'descriptionHeader':        "Feedback",
                'descriptionText':          "Feedback involve a series of linked elements that 'circle back' on themselves. This means that a change in any element in the loop will eventually influence itself,  causing either 'reinforcing or balancing' behavior.",  
                'showInstructionDuration':  8000,               // Duration in ms that pane is shown on screen. 
                'showDescriptionDuration':  'infinite'          // 0 indicates that pane is not shown, 'infinite' === sticky        
            },
			'loopShowBehaviour':{
				'instructionHeader': 		'See more',
				'instructionText': 			"Tap the center of the loop to read more about this loop",
				'descriptionHeader': 		"[Header from data]"  ,
				'descriptionText': 			"[Loop behavior from data].",	
				'showInstructionDuration': 	5000,				// Duration in ms that pane is shown on screen. 
				'showDescriptionDuration': 	'infinite'			// 0 indicates that pane is not shown, 'infinite' === sticky		
			},
			'loopShowDescription':{
				'instructionHeader': 		'Explore other loops and views',
				'instructionText': 			"Select another loop or system view to explore from the menu",
				'descriptionHeader': 		"More",
				'descriptionText': 			"[Loop description from data]",	
				'showInstructionDuration': 	5000,				// Duration in ms that pane is shown on screen. 
				'showDescriptionDuration': 	10000			// 0 indicates that pane is not shown, 'infinite' === sticky		
			},			

            ///// SCENARIO / MULTI-LOOP EVENTS: For scenarios, each objects instruction/description are kept in sync /////
            'scenarioShowMenu':{
                'instructionHeader':        'Choose a scenario',
                'instructionText':          "Tap on a scenario from the list below to start exploring it's behaviour",
                'descriptionHeader':        ""  ,
                'descriptionText':          "", 
                'showInstructionDuration':  8000,               // Duration in ms that pane is shown on screen. 
                'showDescriptionDuration': 'infinite'           // 0 indicates that pane is not shown, 'infinite' === sticky        
            },
            'scenarioShowIntroduction':{
                'instructionHeader':        'Explore scenario story',
                'instructionText':          "Tap anywhere to learn about the behaviour of this part of the system",
                'descriptionHeader':        "" ,
                'descriptionText':          "", 
                'showInstructionDuration':  8000,               // Duration in ms that pane is shown on screen. 
                'showDescriptionDuration': 'infinite'           // 0 indicates that pane is not shown, 'infinite' === sticky        
            },
            'scenarioShowDescription':{
                'instructionHeader':        'Explore other scenarios and views',
                'instructionText':          "Tap anywhere to learn more about loop interaction behaviour",
                'descriptionHeader':        "The story"  ,
                'descriptionText':          "[Description from data]", 
                'showInstructionDuration':  5000,               // Duration in ms that pane is shown on screen. 
                'showDescriptionDuration':  10000               // 0 indicates that pane is not shown, 'infinite' === sticky        
            },
		}		

	/// 1. SET OPENING / START VIEW: called on load 
		function setStartView(nodeOpacity = 100, linkOpacity = 10, 	controlsVisible = settings.controlsVisible, instructionsVisible = settings.instructionsVisible,	descriptionVisible = settings.descriptionVisible, loopMenuVisible = settings.loopMenuVisible, scenarioMenuVisible = settings.loopScenarioVisible){
			// a. Set opacity of nodes and links, and control slider position
			d3.selectAll('circle.node, text.label').style('opacity', +nodeOpacity/100)
			d3.selectAll('path.linkBackground').style('opacity', 0)
			d3.selectAll('path.link').style('opacity', +linkOpacity/100)
			document.getElementById("sliderLinkOpacity").value = linkOpacity
			document.getElementById("sliderNodeOpacity").value = nodeOpacity

			// b. Set 'introduction' content of overlays and  (off screen) position of instruction and description panes
			updateEventOverlays('introduction', 'introduction')
			d3.select('#instruction-container').style('transform', () => (instructionsVisible) ? 'translateY(0)' : 'translateY(-25vh)')
			d3.select('#systemDescription-container').style('transform', () => (descriptionVisible) ? 'translateY(0)' : 'translateY(25vh)')

			// c. Set view of control, loop and scenario menus (opacity)
			d3.select('#controlsMenu-container').style('opacity', () => (controlsVisible) ? 1 : 0)
			d3.select('#loopMenu-container').style('opacity', () => (loopMenuVisible) ? 1 : 0)			
			d3.select('#scenarioMenu-container').style('opacity', () => (scenarioMenuVisible) ? 1 : 0)

			// d. Set the system menu icon to be highlighted
			d3.select('#menu-system').style('fill', 'var(--color-main-dark)')
		} // end setStartView()

	/// 2. VIEW/FOCUS HELPERS
		// Sets opacity of all foreground nodes, links and labels from view
		function focusAll(opacity = 0, duration = 500){
			d3.selectAll('circle.node, path.linkBackground, text.label')
				.transition().duration(duration)
				.style('opacity', opacity)
			d3.selectAll('path.link')
				.transition().duration(duration)
				.style('opacity', 0)
			document.getElementById("sliderLinkOpacity").value = opacity * 100
			document.getElementById("sliderNodeOpacity").value = opacity * 100
		} // end focusAll()

	/// 3. EVENT LISTENERS AND INTERACTIVITY FUNCTIONS ///
		// i. ADD EVENT LISTENERS: controls and interactive visual elements (e.g. nodes)
			function addListeners(){
				// a. SLIDERS CONTROL FUNCTIONS
					d3.select("#sliderLinkOpacity").on("input", function(){
					  	d3.selectAll('path.linkBackground').style('opacity', +this.value/100)			// Just change the background link opacity
					  	d3.selectAll('path.link').style('opacity', 0)									// and turn the foreground link off
					})
					d3.select("#sliderNodeOpacity").on("input", function(){
					  	d3.selectAll('circle.node').style('opacity', +this.value/100)					// Change the foreground node only (leaving the background 100% )
					  	if(+this.value < 100){ 	d3.selectAll('path.link').style('opacity', 0) }			// And turn the foreground link off (i.e. make transparent)
					})
					d3.select("#sliderLinkTension").on("input", function(){	
						settings.taperCurve = +this.value/100
						simulation.alpha(0.1).restart()		  	
					})

				// b. VIEW SELECTOR RADIO BUTTONS
					d3.selectAll('input.viewSelector').on('click', viewForceChange)

				// c. NODE MOUSE INTERACTIONS (note: the node click events are added once the mouseover is called)
					d3.selectAll('circle.node')
						.on('mouseover', nodeHighlight)						// Show the hovered node only (and unhighlight the reset). Also calls first click event
						.on('mouseout', nodeUnhighlight)					// Resets all formatting and the click event to the default (below)

				// d. RESET NODES ON CLICK OUTSIDE OF NODES
					svg.on('click', resetNodes)								// Resets all formatting set when the 'system-wide consequences' view is enabled is on

				// e. MENU FUNCTIONALITY
					// 1. Toggle menu into/out of view
					d3.select('#menu-toggle')
						.on('click', function(){
							let duration = 500
							if(!settings.menuVisible){
								d3.select('#menu-button-container')
									.style('top', '100vh')
									.transition().duration(duration)
									.style('top', '69vh')
								d3.select('#menu-toggle')
									.transition().duration(duration)
									.style('transform', 'rotate(180deg)')		
                                d3.select("#menu-toggle-container")
                                    .attr('title', 'Tap to close the system view menu')                                
								settings.menuVisible = true
							} else {
								d3.select('#menu-button-container')
									.transition().duration(duration)
									.style('top', '100vh')
								d3.select('#menu-toggle')
									.transition().duration(duration)
									.style('transform', 'rotate(0deg)')
								d3.selectAll('#controlsMenu-container, #loopMenu-container, #scenarioMenu-container').classed('hidden',true)	
                                d3.select("#menu-toggle-container")
                                    .attr('title', 'Tap to open the system view menu')   
								settings.menuVisible = false
							}
						})
					// 2. Show/reset system view
					d3.select('#menu-system')
						.on('click', function(){
							let duration = 500
							if(settings.viewMode !== 'system'){
								d3.selectAll('.menu-icon')						// Unhighlight all icons
									.transition().duration(duration)	
									.style('fill', null)	
								d3.select('#menu-system')						// Highlight the required icon
									.transition().duration(duration)						
									.style('fill', 'var(--color-main-dark)')							
								d3.selectAll('circle.node')						// Turn on default mouse interactions
									.on('mouseover', nodeHighlight)						
									.on('mouseout', nodeUnhighlight)	
								d3.select('#logo-container')					// Fade logo in
									.transition().duration(duration).delay(duration/2)
									.style('opacity', 1)
								d3.selectAll('#controlsMenu-container, #loopMenu-container, #scenarioMenu-container').classed('hidden',true)
                                settings.taperCurve = 0.3                       // Set taper and update the controls   
                                d3.select("#sliderLinkTension").node().value = settings.taperCurve *100
                                createForcesSimulation(visData.networkData)     // Resets the system visualisation      
							}

							d3.select('.loopLabel-group').selectAll('*').remove()		// Clear any previous label annotation
							setTimeout(function(){nodeUnhighlight(true)}, 250)			// Clear any node fill formatting	
							settings.viewMode = 'system'						// Set the viewMode
						})
					// 3. Show loop menu view
					d3.select('#menu-loops')
						.on('click', function(){
							let duration = 500
							if(settings.viewMode !== 'loop'){
								d3.selectAll('.menu-icon')						// Unhighlight all icons
									.transition().duration(duration)	
									.style('fill', null)	
								d3.select('#menu-loops')						// Highlight the required icon
									.transition().duration(duration)						
									.style('fill', 'var(--color-main-dark)')							
								d3.selectAll('circle.node')						// Turn off node mouse interactions
									.on('mouseover', null)					
									.on('mouseout', null)	
								d3.select('#loopMenu-container')				// Bring controls into view and
									.classed('hidden', false)
									.transition().duration(duration).delay(duration/2)
									.style('opacity', 1)
								d3.select('#logo-container')					// Fade out logo
									.transition().duration(duration/2)
									.style('opacity', 0)
								d3.selectAll('#controlsMenu-container, #scenarioMenu-container').classed('hidden',true)		
								loopShowMenu()						            // Show the menu instruction
								settings.viewMode = 'loop'						// Set the viewMode		
							} else {
								d3.selectAll('#loopMenu-container')
									.transition().duration(duration)
									.style('opacity', 0)
								settings.viewMode = 'loopHidden'				// Set the viewMode		
							}											
						})
					// 4. Show scenario menu view
					d3.select('#menu-scenarios')
						.on('click', function(){
							let duration = 500
							if(settings.viewMode !== 'scenario'){
								d3.selectAll('.menu-icon')						// Unhighlight all icons
									.transition().duration(duration)	
									.style('fill', null)	
								d3.select('#menu-scenarios')					// Highlight the required icon
									.transition().duration(duration)						
									.style('fill', 'var(--color-main-dark)')							
								d3.selectAll('circle.node')						// Turn off node mouse interactions
									.on('mouseover', null)					
									.on('mouseout', null)	
								d3.select('#scenarioMenu-container')			// Bring controls into view and
									.classed('hidden', false)
									.transition().duration(duration).delay(duration/2)
									.style('opacity', 1)
								d3.select('#logo-container')					// Fade out logo
									.transition().duration(duration/2)
									.style('opacity', 0)
								d3.selectAll('#controlsMenu-container, #loopMenu-container').classed('hidden',true)			
                                scenarioShowMenu()                              // Show the menu instruction 
								settings.viewMode = 'scenario'					// Set the viewMode		
							} else {
								d3.selectAll('#scenarioMenu-container')
									.transition().duration(duration)
									.style('opacity', 0)
								settings.viewMode = 'scenarioHidden'			// Set the viewMode		
							}
						})
					// 5. Show controls menu
					d3.select('#menu-controls')
						.on('click', function(){
							let duration = 500
							if(settings.viewMode !== 'controls'){							
								d3.selectAll('.menu-icon')						// Unhighlight all icons
									.transition().duration(duration)	
									.style('fill', null)	
								d3.select('#menu-controls')					// Highlight the required icon
									.transition().duration(duration)						
									.style('fill', 'var(--color-main-dark)')							
								d3.select('#controlsMenu-container')			// Bring controls into view and
									.classed('hidden', false)
									.transition().duration(duration).delay(duration/2)
									.style('opacity', 1)
								d3.select('#logo-container')					// Fade out logo
									.transition().duration(duration/2)
									.style('opacity', 0)
								d3.selectAll('#scenarioMenu-container, #loopMenu-container').classed('hidden',true)			
								settings.viewMode = 'controls'						// Set the viewMode		
							} else {
								d3.selectAll('#controlsMenu-container')
									.transition().duration(duration)
									.style('opacity', 0)
								settings.viewMode = 'controlsoHidden'				// Set the viewMode		
							}		
						})
			} // end addListeners()

		// ii NODE INTERACTIVITY FUNCTION 
			// *** DESKTOP ONLY MOUSEOVER/OUT EVENTS *** //
				// Mouseover/hover: Highlight selected 
				function nodeHighlight(){
					const nodeClassname = d3.select(this).node().classList[1]
					focusNode(nodeClassname)										// Highlight the selected node
					toggleInstructions('nodeShowDescription',)						// Show instructions
                    toggleDescription('nodeShowDescription',)                      // Show instructions
					updateEventOverlays('nodeHighlight', 'nodeShowSystemImpacts', this.__data__)		// Update the overlay text
					
                    d3.selectAll('circle.node').on('click', nodeShowSystemImpacts)	// Update the event listener for next click event
					d3.select('.loopLabel-group').selectAll('*').remove()			// Clear any previous loop label annotation					
				} // nodeHighlight()

				// Mouseout: Un-highlight selected node on mouseout
				function nodeUnhighlight(nodeStyleReset = true){
					focusAll(1, 250)									// Bring nodes and links back to full view
					if(nodeStyleReset){
						d3.selectAll('.label')
							.style('fill', null)						// Labels to original colour
							.style('font-weight', null)					// and font weight
						d3.selectAll('circle.node')						// For each node
							.style('fill', null)						// Reset the fill colour
					}
					d3.selectAll('path.link, path.linkBackground')		// with links set to
						.transition().duration(0)
						.style('opacity', settings.linkOpacity/200)		// default opacity		
					d3.selectAll('circle.node')							// For each node
						.on('click', null)								// Reset the click event handler 
						.style('stroke-opacity', null)					
					d3.select('#instruction-container')					// Clear view of instructions 
						.transition().duration(500)
						.style('transform', 'translateY(-25vh)')
					d3.select('#systemDescription-container')			// Clear view of description
						.transition().duration(500)
						.style('transform', 'translateY(25vh)')
					updateEventOverlays('nodeUnhighlight', 'nodeUnhighlight')	// Resets the overlay text
					hideButtons()										// Clears all node buttons
				} // end nodeUnhighlight()

			// *** UNIVERSAL NODE TOUCH/CLICK EVENTS *** //
				// Declare an object to control the sequencing of node click events
				const eventNodeConsequenceSequence = {
					0 : 'nodeShowSystemImpacts'
				}

				///// INTERACTIVE VIEW FUNCTIONS ////
				// 0. Show the node (element) description
				function nodeShowDescription(){ 	
					// a. Call function to update node event
					nodeEventUpdate(this, 'nodeShowDescription', eventNodeConsequenceSequence)	
				} // end nodeShowDescription()

				// 1. Shows node button (+/-) for selected node
				function nodeShowSystemImpacts(){										
					// a. Call function to update node event
					nodeEventUpdate(this, 'nodeShowSystemImpacts', eventNodeConsequenceSequence)	

                    // b. Turn off interactions (and on again after the nodeEventUpdate is finished)
                    svg.on('click', null)

                    // c. Show system influences from the node
                    settings.networkOrderLength = 1                     // Reset the networkOrder length global variable/counter
                    settings.systemInfluenceCounter = 0                 // Set to 1 to skip the first degree (already highlighted)                   
                    const influenceTotalDuration = 15000
                    interactionState.reduceTimer = false
                    showSystemInfluences(this, 'increase', influenceTotalDuration)

                    d3.selectAll('circle.node')
                        .on('click', function(){d3.event.stopPropagation()   })       // Turn off the node click events until the animation is finished
                        .on('mouseover', null)                          // Turn of mouseover/out interactions
                        .on('mouseout', null)     
				} // end nodeShowSystemImpacts()
				
				    // Helper node consequence button event to animate through ALL positive, negative and then mixed system influences
					function showSystemImpacts(thisButtonElement, nodeClassname){
						// a. Call function to update node event
						const nodeID = 'node'+thisButtonElement.id.slice(thisButtonElement.id.indexOf('_'))			// Get the node id from thisElement (i.e. the control button)
						d3.event.stopPropagation()									// a. Stop propagation back to associated node or vis element
                        // Remove selected node from selections...
                        const selectedNodeID = '#'+nodeID,
                            selectedNodeLabelID = selectedNodeID.replace('node', 'label'),
                            selectedNodeImagelID = selectedNodeID.replace('node', 'nodeImage'),
                            animationTime = 1000,
                            radiusChange = 1.1

                        let nodePositiveSelectionArray =    influenceData.nodePositiveSelection.split(",").filter( d => d !== selectedNodeID),
                            nodeNegativeSelectionArray =    influenceData.nodeNegativeSelection.split(",").filter( d => d !== selectedNodeID),
                            nodeMixedSelectionArray =       influenceData.nodeMixedSelection.split(",").filter( d => d !== selectedNodeID),
                            nodePositiveSelection =         nodePositiveSelectionArray.join(' , '),
                            nodeNegativeSelection =         nodeNegativeSelectionArray.join(' , '),
                            nodeMixedSelection =            nodeMixedSelectionArray.join(' , '),
                            labelPositiveSelection =        nodePositiveSelection.replace(/node/g, 'label'),
                            labelNegativeSelection =        nodeNegativeSelection.replace(/node/g, 'label'),
                            labelMixedSelection =           nodeMixedSelection.replace(/node/g, 'label'),
                            nodeImagePositiveSelection =    nodePositiveSelection.replace(/node/g, 'nodeImage'),
                            nodeImageNegativeSelection =    nodeNegativeSelection.replace(/node/g, 'nodeImage'),
                            nodeImageMixedSelection =       nodeMixedSelection.replace(/node/g, 'nodeImage')

						// NOTE: The influence data is calculated by default for an "increase" and simply switched here for the negative
                        if(d3.select(thisButtonElement).classed('nodeControl-up')){                                                                  
                            if(nodePositiveSelection !== '')
                                d3.selectAll(nodePositiveSelection+' , '+nodePositiveSelection.replace(/node/g, 'nodeBackground'))   
                                    .transition().duration(animationTime)
                                    .style('fill', function(){ return d3.select(this).attr('id') !== 'node_'+visData.centerNodeID ? 'hsl(167.6,41.2%,91.4%)' : null })
                                    .attr('r', function(){return d3.select(this).attr('r') * radiusChange })
                            if(labelPositiveSelection !== '')                                         
                                d3.selectAll(labelPositiveSelection+' , '+nodeImagePositiveSelection)   
                                    .transition().duration(animationTime)
                                    .attr('transform', function(){
                                        const currentTransfrom = d3.select(this).attr('transform'),
                                            stemToScale = currentTransfrom.slice(0,currentTransfrom.indexOf('c')+5),
                                            scaleStem = currentTransfrom.slice(currentTransfrom.indexOf('c')+5, currentTransfrom.length),
                                            newScale = (scaleStem.indexOf(',') === -1) ? +scaleStem.slice(0, -1) * radiusChange : +scaleStem.slice(0, scaleStem.indexOf(',')) * radiusChange      
                                        return stemToScale+newScale+', '+newScale+')'
                                    })
                                    .style('fill', function(){ return d3.select(this).attr('id') === 'label_'+visData.centerNodeID ? 'hsl(167.6,41.2%,91.4%)' : null })

                            if(nodeNegativeSelection !== '')
                                d3.selectAll(nodeNegativeSelection+' , '+nodeNegativeSelection.replace(/node/g, 'nodeBackground'))
                                    .transition().duration(animationTime)       
                                    .style('fill', function(){ return d3.select(this).attr('id') !== 'node_'+visData.centerNodeID ? 'hsl(338.9,80%,91.2%)' : null })    
                                    .attr('r', function(){
                                        return d3.select(this).attr('r') / radiusChange
                                    })
                            if(labelNegativeSelection !== '')                                        
                                d3.selectAll(labelNegativeSelection+' , '+nodeImageNegativeSelection)
                                    .transition().duration(animationTime)
                                    .attr('transform', function(){
                                        const currentTransfrom = d3.select(this).attr('transform'),
                                            stemToScale = currentTransfrom.slice(0,currentTransfrom.indexOf('c')+5),
                                            scaleStem = currentTransfrom.slice(currentTransfrom.indexOf('c')+5, currentTransfrom.length),
                                            newScale = (scaleStem.indexOf(',') === -1) ? +scaleStem.slice(0, -1) / radiusChange : +scaleStem.slice(0, scaleStem.indexOf(',')) / radiusChange      
                                        return stemToScale+newScale+', '+newScale+')'
                                    })       
                                    .style('fill', function(){ return d3.select(this).attr('id') === 'label_'+visData.centerNodeID ? 'hsl(338.9,80%,91.2%)' : null })                                    
                            if(nodeMixedSelection !== '')
                                d3.selectAll(nodeMixedSelection)
                                    .transition().duration(animationTime)              
                                    .style('fill', function(){ return d3.select(this).attr('id') !== 'node_'+visData.centerNodeID ? 'hsl(44.9,100%,90%)' : null })  

                            d3.select(thisButtonElement)
                                .transition().duration(animationTime) 
                                .style('fill', '#3E9583')  
                            d3.select('.nodeControl-down.nodeControl-'+nodeClassname)
                                .transition().duration(animationTime) 
                                .style('fill', 'rgb(168, 166, 167)')                                      
						} else if (d3.select(thisButtonElement).classed('nodeControl-down')){		
                            if(nodePositiveSelection !== '')                        		                   		
                                d3.selectAll(nodePositiveSelection+' , '+nodePositiveSelection.replace(/node/g, 'nodeBackground'))
                                    .transition().duration(animationTime)
                                    .style('fill', function(){ return d3.select(this).attr('id') !== 'node_'+visData.centerNodeID ? 'hsl(338.9,80%,91.2%)' : null})
                                    .attr('r', function(){ return d3.select(this).attr('r') / radiusChange })     
                            if(labelPositiveSelection !== '')                                            
                                d3.selectAll(labelPositiveSelection+' , '+nodeImagePositiveSelection)  
                                    .transition().duration(animationTime)
                                    .attr('transform', function(){
                                        const currentTransfrom = d3.select(this).attr('transform'),
                                            stemToScale = currentTransfrom.slice(0,currentTransfrom.indexOf('c')+5),
                                            scaleStem = currentTransfrom.slice(currentTransfrom.indexOf('c')+5, currentTransfrom.length),
                                            newScale = (scaleStem.indexOf(',') === -1) ? +scaleStem.slice(0, -1) / radiusChange : +scaleStem.slice(0, scaleStem.indexOf(',')) / radiusChange      
                                        return stemToScale+newScale+', '+newScale+')'
                                    })    
                                    .style('fill', function(){ return d3.select(this).attr('id') === 'label_'+visData.centerNodeID ? 'hsl(338.9,80%,91.2%)' : null })

                            if(nodeNegativeSelection !== '')
                                d3.selectAll(nodeNegativeSelection+' , '+nodeNegativeSelection.replace(/node/g, 'nodeBackground'))
                                    .transition().duration(animationTime)
                                    .style('fill', function(){ return d3.select(this).attr('id') !== 'node_'+visData.centerNodeID ? 'hsl(167.6,41.2%,91.4%)' : null})
                                    .attr('r', function(){return d3.select(this).attr('r') * radiusChange })
                            if(labelNegativeSelection !== '')                                    
                                d3.selectAll(labelNegativeSelection+' , '+nodeImageNegativeSelection)
                                    .transition().duration(animationTime)
                                    .attr('transform', function(){
                                        const currentTransfrom = d3.select(this).attr('transform'),
                                            stemToScale = currentTransfrom.slice(0,currentTransfrom.indexOf('c')+5),
                                            scaleStem = currentTransfrom.slice(currentTransfrom.indexOf('c')+5, currentTransfrom.length),
                                            newScale = (scaleStem.indexOf(',') === -1) ? +scaleStem.slice(0, -1) * radiusChange : +scaleStem.slice(0, scaleStem.indexOf(',')) * radiusChange      
                                        return stemToScale+newScale+', '+newScale+')'
                                    })       
                                    .style('fill', function(){ return d3.select(this).attr('id') === 'label_'+visData.centerNodeID ? 'hsl(167.6,41.2%,91.4%)' : null })                                     
                            if(nodeMixedSelection !== '')
                                d3.selectAll(nodeMixedSelection)
                                    .transition().duration(animationTime)
                                    .style('fill', function(){ return d3.select(this).attr('id') !== 'node_'+visData.centerNodeID ? 'hsl(44.9,100%,90%)' : null})   

                            d3.select(thisButtonElement)
                                .transition().duration(animationTime) 
                                .style('fill', '#BD1550')  
                            d3.select('.nodeControl-up.nodeControl-'+nodeClassname)
                                .transition().duration(animationTime) 
                                .style('fill', 'rgb(168, 166, 167)')
						}
					}; // showSystemImpacts()

				// HELPERS FOR NODE INTERACTION EVENTS 
					// Core functions for updating node event listeners: handles selected node highlighting, updating of overlays and next event
					function nodeEventUpdate(thisNode, thisFunction, sequenceObj, buttonUp){
						d3.event.stopPropagation()	
						const node = d3.select(thisNode), 
							  nodeData = thisNode.__data__,					
						 	  nodeClassname = d3.select(thisNode).node().classList[1],
						 	  functionName = window[thisFunction]['name'],
						 	  functionEventIDX = getObjKey(functionName, sequenceObj),
						 	  nextFunctionName = (functionEventIDX < Object.keys(sequenceObj).length - 1) ? sequenceObj[functionEventIDX+1] : sequenceObj[functionEventIDX]
						focusNode(nodeClassname)							// Highlight the selected node
						updateEventOverlays(functionName, nextFunctionName, nodeData, buttonUp)		// Update overlay text for this node
						toggleInstructions(functionName)					// Show instructions linked to the next function
						toggleDescription(functionName)						// Show description
						d3.selectAll('circle.node').on('click', window[sequenceObj[functionEventIDX+1]]) 	// Update click event listener for next interaction
					} // end nodeEventUpdate()

                    function showNodeButtons(thisNode){
                        const nodeClassname = d3.select(thisNode).node().classList[1],
                            animationDuration = 1000                     
                            // Keep node highlighted by turning off the node mouseout function
                            d3.selectAll('circle.node')                         
                                .on('mouseout', null)
                                .on('mouseover', null)
                                .on('click', () => d3.event.stopPropagation() )
                            // Show the +/- buttons for the node
                            d3.selectAll('.nodeControl-'+nodeClassname) 
                                .classed('hidden', false)                           // Unhide buttons from DOM (with zero opacity)
                                .transition().duration(animationDuration)           // Transition to full opacity
                                    .style('opacity', 1)
                            // Add click interactions for the +/- buttons
                            d3.selectAll('circle.nodeControl-'+nodeClassname)       // Add event listeners:                     
                                .on('click', function(){
                                    showSystemImpacts(this, nodeClassname)} 
                                )        
                    } // end showNodeButtons

                    // SYSTEM INFLUENCE FUNCTION: Attached to NODE with NO DIRECTION
                    function showSystemInfluences(node, direction = 'increase', influenceTotalDuration = settings.networkTraceAnimationDuration){
                        // a. Get "associated" node DOM selector
                            const nodeID = node.id,
                                  associatedNode = node,
                                  animationDuration = influenceTotalDuration / settings.networkMaxPathLength,
                                  animationDelay = 1000,
                                  nodeClassname = document.getElementById(nodeID).classList[1]

                        // b. For chosen networkTraceType, Calculate influence data (in preparation for system view)    and highlight the influenced nodes while keeping the master/control node highlighted,
                            /// FOR BY LOOP STRENGTH: Shows all consequences as calculated by the Loop Strength algorithm
                            if(settings.networkTraceType === 'byLoopStrength'){ 
                                visData.nodesAnalysedByLoopStrength = []
                                visData.nodesAnalysedByLoopMasterNodeID = nodeID
                                calculateSystemInfluencesByLoopStrength(nodeID, direction)          
                                colourNodesByDirection(animationDuration)

                            // FOR BY POLARITY: Shows all degrees of consequence at once, but grouped by polarity (same direction first)
                            } else if(settings.networkTraceType === 'byPolarity'){
                                // Calculate system influences without argument for network degree (which if undefined defaults to max path length of the network)
                                calculateSystemInfluencesByBranching(associatedNode.__data__, null, null, direction)
                                // For direction = increase && settings.networkTraceTyoe = "byPolarity" : show increases, then decrease, then mixed
                                if(direction === 'increase'){
                                    showNodesForIncrease(animationDuration, animationDelay)
                                } else if(direction === 'decrease'){
                                    showNodesForDecrease(animationDuration, animationDelay)
                                }

                            // FOR BY DEGREE: Shows all consequences regardless of polarity, but animated by increasing degree
                            } else if (settings.networkTraceType === 'byDegree'){
                                // Calculate system influence with degree of incrementing settings networkMaxPathLength from 1 to networks max path length
                                // Use systemInfluenceCounter to ensure first calculation is whit a zero networkOrderLength
                                if(settings.systemInfluenceCounter === 0){
                                     calculateSystemInfluencesByBranching(associatedNode.__data__, null, null, direction, false, 0)
                                     settings.systemInfluenceCounter = 1
                                } else {
                                    calculateSystemInfluencesByBranching(associatedNode.__data__, null, null, direction, false, settings.networkOrderLength)    
                                }
                                // Animate/highlight nodes
                                if (direction === 'increase' && settings.networkTraceType === 'byDegree'){
                                    showNodesForIncrease(animationDuration, 0)
                                } else if (direction === 'decrease'){
                                    showNodesForDecrease(animationDuration, 0)
                                }
                                // Recursively call with animation delay
                                if(settings.networkOrderLength < settings.networkMaxPathLength){
                                    settings.networkOrderLength++
                                    setTimeout(function(){
                                        showSystemInfluencesFromNode(node, direction)
                                    }, animationDuration)
                                }

                            // FOR BY DEGREE WITH STOPPING : Shows all consequences regardless of polarity, but animated by increasing degree
                            } else if (settings.networkTraceType === 'byDegreeWithCentralStopping'){
                                // Calculate system influence with degree of incrementing settings networkMaxPathLength from 1 to networks max path length
                                // Use systemInfluenceCounter to ensure first calculation is with a zero networkOrderLength
                                if(settings.systemInfluenceCounter === 0){
                                     calculateSystemInfluencesByBranching(associatedNode.__data__, null, null, direction, true, 0)
                                     settings.systemInfluenceCounter = 1
                                } else {
                                    calculateSystemInfluencesByBranching(associatedNode.__data__, null, null, direction, true, settings.networkOrderLength)    
                                }
                                // Animate/highlight nodes                                
                                if (direction === 'increase' && settings.networkTraceType === 'byDegreeWithCentralStopping'){
                                    showNodesForIncrease(animationDuration, 0, false)
                                } else if (direction === 'decrease'){
                                    showNodesForDecrease(animationDuration, 0, false)
                                }
                                showLinks(animationDuration, 0)
                                // Keep selected node in focus
                                    d3.selectAll('.'+nodeClassname)                 // Keeps selected node and label in view
                                        .transition().duration(0)                   // (note: transition required to override 'focusAll')
                                        .style('opacity', 1)    
                                    d3.selectAll('circle.node.'+nodeClassname)      // And highlights the colour of the node
                                        .transition().duration(0)
                                        .style('fill', 'var(--color-main-dark)') 
                                    d3.selectAll('text.label.'+nodeClassname)       // while turning text to white
                                        .transition().duration(0)
                                        .style('fill', 'var(--color-white)') 
                                        .style('font-weight', 'bold')                                 

                                // Recursively call with animation delay
                                if(settings.networkOrderLength < settings.networkMaxPathLength){    
                                    let animationTime = interactionState.reduceTimer ? 0 : animationDuration;                                                                
                                    setTimeout(function(){                                        
                                        showSystemInfluences(node, direction)
                                        settings.networkOrderLength++
                                    },  animationTime )

                                // AND ON COMPLETION
                                } else {
                                    // Show the node buttons only after the impacts are finished / calculated                                    
                                    showNodeButtons(node)

                                    // Add back interactivity
                                    svg.on('click', resetNodes)   

                                    // Show Node button instruction
                                    d3.select('#instruction-text')
                                        .style('opacity', 0)
                                        .html("Tap the + and - buttons to see how increases / decreases in this variable affect the other connected variables")
                                        .transition().duration(500)
                                        .style('opacity', 1)

                                    // Function to update the consequence narrative once the system impacts are detected and recorded
                                    // if(settings.networkTraceType === 'byDegreeWithCentralStopping') {  updateConsequenceDescription(node.__data__)  }
                                    function updateConsequenceDescription(objectData){
                                        let string = ''
                                        const isCentralImpaced =influenceData.spannedNodes.indexOf(visData.centerNodeID-1) > -1 ? true : false,
                                            centralImpactDirection = (function(){
                                                if(isCentralImpaced){                                
                                                    let centralNodeID = '#node_'+visData.centerNodeID
                                                    if(influenceData.nodePositiveSelection.indexOf(centralNodeID)){
                                                        return 'same'
                                                    } else if(influenceData.nodeNegativeSelection.indexOf(centralNodeID)){
                                                        return 'opposite'
                                                    } else {
                                                        return 'unknown'
                                                    }  
                                                } else {
                                                    return 'unknown'
                                                }
                                            }())

                                            // if(influenceData.linkIDX.length === 0){ // If there are no links
                                            //     string = objectData.name+' does not have influencing links to the rest of the system and does not not impact on '+settings.centralNode+'.'
                                            // } else if(isCentralImpaced){
                                            //     string = 'The links between elements mean that an <span class = "description-highlight increase">increase (+)</span> or <span class = "description-highlight decrease">decrease (-)</span> in '+objectData.name+' has system-wide consequences which causes '+settings.centralNode+' to move in the '+centralImpactDirection+' direction.'
                                            // } else{
                                            //     string = 'The links between elements mean that an <span class = "description-highlight increase">increase (+)</span> or <span class = "description-highlight decrease">decrease (-)</span> in '+objectData.name+' has system consequences, however these do not impact on '+settings.centralNode+'.'
                                            // }                   
                                            d3.select('#systemDescription-text').html(string)
                                    }; // end updateConsequenceDescription
                                }
                            }

                            // VISUAL HIGHLIGHTING HELPERS  Highlighting/Animation functions for nodes influence
                                // Colour increase and decrease for by polarity/ by degree
                                function showNodesForIncrease(animationDuration, animationDelay, colour = true){
                                    let opacity = 1
                                    // i. Show (on slight delay) other increased nodes
                                    if(influenceData.multiPositiveNodeIDX.length > 0){
                                        d3.selectAll(influenceData.nodePositiveSelection)   
                                            .transition().duration(animationDuration).delay(animationDelay * 1/4)
                                            .style('fill', colour ? 'var(--color-positive-light)' : null)
                                            .style('opacity', opacity)
                                        d3.selectAll(influenceData.labelPositiveSelection)
                                            .transition().duration(animationDuration).delay(animationDelay * 1/4)
                                            .style('opacity', opacity)
                                    }
                                    // ii. On (further) slight delay, highlight the decreased nodes 
                                    if(influenceData.multiNegativeNodeIDX.length > 0){
                                        d3.selectAll(influenceData.nodeNegativeSelection)       
                                            .transition().duration(animationDuration).delay(animationDelay * 5/4)
                                            .style('fill', colour ? 'var(--color-negative-light)' : null)
                                            .style('opacity', opacity);
                                        d3.selectAll(influenceData.labelNegativeSelection)      
                                            .transition().duration(animationDuration).delay(animationDelay * 5/4)
                                            .style('opacity', opacity);     
                                    }   
                                    // iii. On (further) slight delay, highlight the mixed nodes 
                                    if(influenceData.multiMixedNodeIDX.length > 0){
                                         d3.selectAll(influenceData.nodeMixedSelection)     
                                            .transition().duration(animationDuration).delay(animationDelay * 9/4)
                                            .style('fill', colour ? 'var(--color-neutral-light)' : null)
                                            .style('opacity', opacity); 
                                         d3.selectAll(influenceData.labelMixedSelection)        
                                            .transition().duration(animationDuration).delay(animationDelay * 9/4)
                                            .style('opacity', opacity);     
                                    }
                                } // end showNodesForIncrease()

                                function showNodesForDecrease(animationDuration, animationDelay, colour = true){
                                    // i. Show (on slight delay) other decreased nodes
                                    if(influenceData.multiNegativeNodeIDX.length > 0){
                                        d3.selectAll(influenceData.nodeNegativeSelection)       
                                            .transition().duration(animationDuration).delay(animationDelay * 1/4)
                                            .style('fill', colour ? 'var(--color-negative-light)' : null)
                                            .style('opacity', 1);
                                        d3.selectAll(influenceData.labelNegativeSelection)      
                                            .transition().duration(animationDuration).delay(animationDelay * 1/4)
                                            .style('opacity', 1);       
                                    }   
                                    // ii. On (furher) slight delay, highlight the increased nodes 
                                    if(influenceData.multiPositiveNodeIDX.length > 0){
                                        d3.selectAll(influenceData.nodePositiveSelection)   
                                            .transition().duration(animationDuration).delay(animationDelay * 5/4)
                                            .style('fill', colour ? 'var(--color-negative-light)' : null)
                                            .style('opacity', 1)
                                        d3.selectAll(influenceData.labelPositiveSelection)
                                            .transition().duration(animationDuration).delay(animationDelay * 5/4)
                                            .style('opacity', 1)
                                    }
                                    // iii. On (further) slight delay, highlight the mixed nodes 
                                    if(influenceData.multiMixedNodeIDX.length > 0){
                                         d3.selectAll(influenceData.nodeMixedSelection)     
                                            .transition().duration(animationDuration).delay(animationDelay * 9/4)
                                            .style('fill', colour ? 'var(--color-negative-light)' : null)
                                            .style('opacity', 1);   
                                         d3.selectAll(influenceData.labelMixedSelection)        
                                            .transition().duration(animationDuration).delay(animationDelay * 9/4)
                                            .style('opacity', 1);       
                                    }
                                } // end showNodesForDecrease()

                                // Show link selection
                                function showLinks(animationDuration, animationDelay){
                                    let opacity = 0.5
                                    d3.selectAll(influenceData.linkSelection)   
                                        .transition().duration(animationDuration)
                                        .style('opacity', opacity)
                                } //  end showLinks()

                                // Keep the master node highlighted and fade out links
                                function showNodes(){
                                    d3.select('#node_'+influenceData.masterNodeID)
                                        .classed('masterNode', true)        
                                        .transition().duration(0)
                                        .style('fill', 'var(--color-main-dark)')
                                    d3.selectAll('path.link, path.linkBackground')
                                        .transition().duration(100)
                                        .style('opacity', 0)                                        
                                } // end showNodes()

                                // Colour nodes for loop strength algorithm
                                function colourNodesByDirection(duration = 1000){
                                    let opacity = 1,
                                        keys =  Object.keys(visData.nodeDirectionObject)
                                    d3.selectAll('.label')
                                        // .transition().duration(0)
                                        .style('fill', null)
                                    d3.selectAll('.nodeControl, .nodeControlLabels')
                                        // .transition().duration(duration)
                                        .style('opacity', 0)
                                    d3.selectAll('.node, .label')
                                        .transition().duration(duration)
                                        .style('opacity', opacity)

                                    for(let i = 0; i < keys.length; i++){
                                        let direction = visData.nodeDirectionObject[keys[i]]['direction']
                                        if(direction > 0){
                                            d3.select('#'+keys[i]).style('fill', 'var(--color-positive-light)')
                                        } else if (direction === 0){
                                            d3.select('#'+keys[i]).style('fill', 'var(--color-neutral-light)')
                                        } else if (direction < 0){
                                            d3.select('#'+keys[i]).style('fill', 'var(--color-negative-light)')
                                        }
                                    }

                                    // For the original "MasterNode" copied to visData.nodesAnalysedByLoopMasterNodeID; keep node and button in view
                                    d3.select('#node_'+visData.nodesAnalysedByLoopMasterNodeID)
                                        .style('fill', 'var(--color-main-dark)')
                                    d3.select('#label_'+visData.nodesAnalysedByLoopMasterNodeID)
                                        .style('fill', '#fff')

                                    if(visData.nodeDirectionObject['node_'+visData.nodesAnalysedByLoopMasterNodeID]['direction'] === 1){
                                        d3.selectAll('#nodeControlUp_'+visData.nodesAnalysedByLoopMasterNodeID+', #nodeControlUpLabel_'+visData.nodesAnalysedByLoopMasterNodeID)
                                            .transition().duration(0)
                                            .style('opacity', 1)
                                    } else {
                                        d3.selectAll('#nodeControlDown_'+visData.nodesAnalysedByLoopMasterNodeID+' , #nodeControlDownLabel_'+visData.nodesAnalysedByLoopMasterNodeID)
                                            .transition().duration(0)
                                            .style('opacity', 1)            
                                    }
                                } // end colourNodesByDirection()
                    } // showSystemInfluences()

		// iii LOOP INTERACTIVITY FUNCTIONS: Touch/click events only
			// Called when menu is opened: shows just the instruction to tap on a loop from the menu
			function loopShowMenu(){											
				d3.selectAll('circle.node')
					.on('click', null)
					.on('mouseover', null)
					.on('mouseout', null)
				svg.on('click', null)
				// Change the overlays, however no need to updated the next event as this is called from the loop menu item
				updateEventOverlays('loopShowMenu', 'loopShowMenu')
				toggleInstructions('loopShowMenu')
			} // end loopShowMenu()

            // Called when loop is selected from list (added to list item event listener): shows just the instruction for tapping center to learn more
            function loopShowIntroduction(loopData){
                interactionState.loopData = loopData         // Store current loop data to globally accessible variable
                updateEventOverlays('loopShowIntroduction', 'loopShowIntroduction', interactionState.loopData)
                toggleInstructions('loopShowIntroduction')
                d3.select('.loopLabel-group').on('click', loopShowElements)     // Sets next listener for loop object
            } // end loopShowIntroduction()

            // Shows the loop elements view
            function loopShowElements(){                   
                updateEventOverlays('loopShowElements', 'loopShowElements')
                toggleInstructions('loopShowElements')            
                toggleDescription('loopShowElements') 
                d3.select('.loopLabel-group').on('click', loopShowBehaviour)    // Sets next listener for loop object
            } // end loopShowElements()

			function loopShowBehaviour(){                   
				updateEventOverlays('loopShowBehaviour', 'loopShowBehaviour')
				toggleInstructions('loopShowBehaviour')			
				toggleDescription('loopShowBehaviour')	
				d3.select('.loopLabel-group').on('click', loopShowDescription)  // Sets next listener for loop object
			} // end loopShowBehaviour()

			function loopShowDescription(){
				updateEventOverlays('loopShowDescription', 'loopShowDescription')
				toggleInstructions('loopShowDescription')			
                d3.select('.loopLabel-group').on('click', function(){           
                    createForcesSimulation(visData.networkData);                // Reset to system view
                    d3.select('.loopLabel-group').selectAll('*').remove()       // Clear any previous label annotation
                    setTimeout(function(){nodeUnhighlight(true)}, 250)          // Clear any node fill formatting   
                    loopShowMenu()                                              // Show the intro loop menu instruction

                })
			} // end loopShowDescription()

        // iv. SCENARIO / MULTIPLE LOOP INTERACTIVITY FUNCTIONS: Touch/click events only
            // Called when menu is opened: shows just the instruction to tap on a loop from the menu
            function scenarioShowMenu(){                                            
                d3.selectAll('circle.node')
                    .on('click', null)
                    .on('mouseover', null)
                    .on('mouseout', null)

                svg.on('click', null)
                // Change the overlays, however no need to updated the next event as this is called from the loop menu item
                updateEventOverlays('scenarioShowMenu', 'scenarioShowMenu')
                toggleInstructions('scenarioShowMenu')
            } // end scenarioShowMenu()

            // Called when loop is selected from list (added to list item event listener): shows just the instruction for tapping center to learn more
            function scenarioShowIntroduction(scenarioData){
                console.log(scenarioData)
                interactionState.scenarioData = scenarioData         // Store current scenario data to globally accessible variable
                updateEventOverlays('scenarioShowIntroduction', 'scenarioShowIntroduction', interactionState.loopData)
                toggleInstructions('scenarioShowIntroduction')
                toggleDescription('scenarioShowIntroduction')                 
                svg.on('click', scenarioShowDescription)                   // Sets next listener for loop object
            } // end loopShowIntroduction()

            // Shows the scenario description view
            function scenarioShowDescription(){                   nodeShowImpactsAndInfluences
                updateEventOverlays('scenarioShowDescription', 'scenarioShowDescription')
                toggleInstructions('scenarioShowDescription')            
                toggleDescription('scenarioShowDescription') 
                svg.on('click', function(){           
                    createForcesSimulation(visData.networkData);                // Reset to system view
                    d3.select('.loopLabel-group').selectAll('*').remove()       // Clear any previous label annotation
                    setTimeout(function(){nodeUnhighlight(true)}, 250)          // Clear any node fill formatting   
                    scenarioShowMenu()                                          // Show the intro scenario menu instruction
                })

            } // end loopShowElements()

		// v. EVENT OVERLAYS: function to update overlays on each node , loop or scneario click event
			function updateEventOverlays(eventName, nextEventName, objectData, buttonUp){
				// Dim all text to be updated
					d3.select('#systemDescription-header, #systemDescription-text, #instruction-header, #instruction-text')
						.transition().duration(50)
						.style('opacity', 0)

                // Update the text (after dimming, fade back in)
				setTimeout(function(){
					d3.select('#systemDescription-header').html(eventData[eventName]['descriptionHeader'])

					// NODE AND LOOP CONTEXT SPECIFIC DESCRIPTION MESSAGES
					// 1. Node description for selected node
					if(eventName === 'nodeShowDescription' || eventName === 'nodeHighlight'){							// Use nodeData for description
    						
                        d3.select('#systemDescription-text').html(objectData.description)	 

					// 2. Show System impacts and description of node  increase / decrease buttons
					} else if (eventName === 'nodeShowSystemImpacts'){
						// let buttonDirection = (buttonUp) ? 'increase' : 'decrease',
						//  	string = ''
                        // if(influenceData.linkIDX.length === 0){ // If there are no links
                        //     string = objectData.name+' does not have an influencing links to the rest of the system.'
                        // } else{
                        //     string = 'The links between elements mean that an <span class = "description-highlight increase">increase (+)</span> or <span class = "description-highlight decrease">decrease (-)</span> in '+objectData.name+' has system consequences.'
                        // } 
    					// d3.select('#systemDescription-text').html(string)
                        // d3.select('#systemDescription-text').html(objectData.description)   
                        d3.select('#systemDescription-container')         
                            .transition().duration(500).delay(10000)
                            .style('transform', 'translateY(25vh)')                            
					
                    // 3. Loop behavior
					} else if(eventName === 'loopShowBehaviour'){
                        let string = '"'+interactionState.loopData.name+'" is a '+interactionState.loopData.type.toLowerCase()+' loop: ',
                            header = interactionState.loopData.type.toLowerCase()+' behaviour'
                        if(interactionState.loopData.type === 'Reinforcing'){                            
                            string += 'if you trace the influence of an increase (decrease) in any element around the loop, the impact back to that element will be an increase (decrease).'
                        } else if(interactionState.loopData.type === 'Balancing'){
                            string += 'if you trace the influence of an increase (decrease) in any element around the loop, the impact back to that element will be a decrease (increase).'                       
                        }
                        d3.select('#systemDescription-header').html(header)
                        d3.select('#systemDescription-text').html(string)

                    // 4. Loop description
                    } else if(eventName === 'loopShowDescription'){
                        d3.select('#systemDescription-text').html(interactionState.loopData.description)

                    // 5. Scenario introduction
                    } else if(eventName === 'scenarioShowIntroduction'){                        
                        let string = '',
                            header = ''
                        // If there are multiple interacting loops
                        if(interactionState.scenarioData.loopIDs.length > 1){
                            header = 'The loops'
                            string = 'In this view there are '+interactionState.scenarioData.loopIDs.length+' interacting loops: '                            
                            for(let i = 0; i < interactionState.scenarioData.loopIDs.length; i++){
                                let loopID = interactionState.scenarioData.loopIDs[i],
                                    loopType = '',
                                    loopName = (function(){ 
                                        for (let j = 0; j < visData.loopData.length; j++){
                                            if(loopID === visData.loopData[j]['id']){
                                                loopType = visData.loopData[j]['type'].toLowerCase()
                                                return visData.loopData[j]['name']
                                            }
                                        }
                                    }())
                                // Add a comma between loop names, or a full stop at the end of the list
                                if(i === (interactionState.scenarioData.loopIDs.length -1)){
                                    string += (i+1)+'. '+loopName+' ('+loopType+').'     
                                } else {
                                    string += (i+1)+'. '+loopName+' ('+loopType+'), '   
                                }                           
                            } // end i loop

                        // If there is only a single loop (note: not a likely case)                                      
                        } else {
                            let loopID = interactionState.scenarioData.loopIDs[0],
                                loopType = '',
                                loopName = (function(){ 
                                    for (let j = 0; j < visData.loopData.length; j++){
                                        if(loopID === visData.loopData[j]['id']){
                                            loopType = visData.loopData[j]['type'].toLowerCase()
                                            return visData.loopData[j]['name']
                                        }
                                    }
                                }())   
                            header = 'The loop'                                                         
                            string = 'In this view there is only one loop: the '+loopType+' loop: '+loopName+'.'  
                        }
                        d3.select('#systemDescription-header').html(header)
                        d3.select('#systemDescription-text').html(string)

                    // 6. Scenario description
                    } else if(eventName === 'scenarioShowDescription'){                        
                        d3.select('#systemDescription-text').html(interactionState.scenarioData.description)

					// X. For all other node descriptions, use the 
					} else {
						d3.select('#systemDescription-text').html(eventData[eventName]['descriptionText'])
					}

					d3.select('#instruction-header').html(eventData[nextEventName]['instructionHeader'])
					d3.select('#instruction-text').html(eventData[nextEventName]['instructionText'])
					d3.select('#systemDescription-header, #systemDescription-text, #instruction-header, #instruction-text')
						.transition().duration(500)
						.style('opacity', 1)							
				}, 50)
			} // end updateEventOverlays()

        // vi. GENERAL VIEW AND INTERACTIVITY HELPERS
			// Helper to reset the elements to their starting design
			function resetNodes(duration = 500){
				d3.selectAll('circle.node, circle.nodeBackground, text.label')
					.transition().duration(duration)
					.style('fill', null)	
                    .style('opacity', 1)
                d3.selectAll('path.link')
                    .transition().duration(duration)
                    .style('opacity', settings.linkOpacity/100)                    
				d3.selectAll('text.label')
					.transition().duration(duration)
					.style('fill', null)	
					.style('font-weight', null)
                    .style('opacity', 1)                    
				d3.selectAll('circle.node')
                    .attr("r", (d,i) => visData.nodeRadiusArray[i])
					.on('mouseout', nodeUnhighlight)					
					.on('mouseover', nodeHighlight)					
                d3.selectAll('circle.nodeBackground')
                    .attr("r", (d,i) => visData.nodeRadiusArray[i])
				d3.selectAll('.nodeControl')
					.style('opacity', 0)
                    .style('fill', null)    
                simulation.restart()    

                d3.select('#systemDescription-container')
                    .transition().duration(1000)
                    .style('transform', 'translateY(25vh)')
                d3.select('#instruction-container') 
                    .transition().duration(1000)                                   
                    .style('transform', 'translateY(-25vh)')
			} // end resetNodeColour()

			// Helper to visually highlight selected node
			function focusNode(nodeClassname){               
				focusAll(0.1, 200)								// Quickly fade out other nodes and all links
				d3.selectAll('.'+nodeClassname)					// Keeps selected node and label in view
					.transition().duration(0)					// (note: transition required to override 'focusAll')
					.style('opacity', 1)	
				d3.selectAll('circle.node.'+nodeClassname)		// And highlights the colour of the node
					.transition().duration(0)
					.style('fill', 'var(--color-main-dark)') 
				d3.selectAll('text.label.'+nodeClassname)		// while turning text to white
					.transition().duration(0)
					.style('fill', 'var(--color-white)') 
					.style('font-weight', 'bold') 
			} // end focusNode()

			// Shows/hides the instructions 'wedge'
			function toggleInstructions(eventName){
				let eventVisibilityDuration = eventData[eventName]['showInstructionDuration'],
                    fadeDuration = 1000
				d3.select('#instruction-container')
					.transition().duration(fadeDuration)
					.style('transform', 'translateY(0)')
					.transition().duration(fadeDuration).delay(eventVisibilityDuration)
					.style('transform', 'translateY(-25vh)')
			} // end toggleInstructions()

			// Shows/hides the description 'wedge'
			function toggleDescription(){
                let fadeDuration = 1000
				d3.select('#systemDescription-container')
					.transition().duration(fadeDuration)
					.style('transform', 'translateY(0)')
			} // end toggleDescription()

			// Hide the node + /- buttons
			function hideButtons(){
				d3.selectAll('.nodeControl')
					.classed('hidden', true)						// Hide from DOM 
					.transition().duration(0)						
						.style('opacity', 0)						// Set to zero opacity
			} // end hideButtons()

			// CHANGE EXPERIMENTAL FORCE VIEWS: based on selected forces (from radio buttons)
				function viewForceChange(){
					let view = this.value
					if(view === 'reset'){
						createForcesSimulation(visData.networkData)
					} else if (view === 'cluster'){
						showClusterForces()
					} else if (view === 'uncluster'){
						showUnclusteredForces()
					} else if (view === 'radial'){		
						showRadialForces()
					}
				} // end viewForceChange()
	
	/// 4. LOOP HIGHLIGHT ANIMATION: added as loop menu events on load
		function showLoop(loopData, loopID, animationDuration = 800){
			// 1.WRANGLE DATA
				// Get data for selected loop 
				const loopIndex = (function(){
						for(let i = 0; i < loopData.length; i++){
							if(loopData[i]['id'] === loopID){ return i }
						}
 					})(),						
 				 	id = loopData[loopIndex]['id'],
					name = loopData[loopIndex]['name'],
					description = loopData[loopIndex]['description'],
					nodeIDs = loopData[loopIndex]['nodeIDs'],
					linkIDs = loopData[loopIndex]['linkIDs']

			// 2. VISUALISE LOOP
				// i. Dim all nodes
				focusAll(0.1, 200)	
				// ii. Bring each node in the loop into view with each animationDuration
				for (let i = 0; i < nodeIDs.length; i++){
					d3.selectAll('#node_'+nodeIDs[i]+' , #label_'+nodeIDs[i])
						.transition().duration(animationDuration).delay(animationDuration*(i))
						.style('opacity', 1)
					d3.select('#link_'+linkIDs[i])
						.transition().duration(animationDuration).delay(animationDuration*(i+1))
						.style('opacity', 1)
				}

			// 3. PUT INTO EXPLORE MODE
				d3.selectAll('circle.node')
					.on('mouseout',  null)					
					.on('mouseover', null)
					.on('click', 	 null)
		} // end showLoop()


///////////////////////////////////////////////////////////////////////////
//////////////////    NODE-SYSTEM INFLUENCE ALGORITHMS   //////////////////
/// Options for calculating node influence sequence from selected node   //
///////////////////////////////////////////////////////////////////////////

	// A. "NODE OR LOOP SYSTEM-NODE" TO "NODE OR LOOP-SYSTEM" aka LOOP STRENGTH: Recursive algorithm to transverse nodes and loop systems in single steps. Expected 'direction' for nodes inside loops (i.e. subject to balancing/reinforcing force from the inputted direction), are resolved on the basis of the directional force of the 
	function calculateSystemInfluencesByLoopStrength(controlNodeID, direction = 'increase', reset = true){
		//////////////////////////////////////////////////////////////////////////		
		/// 0 | RE-INTIALISE NODE VALUES AND ARRAYS FOR STORING ANY LOOP DATA  ///		
		//////////////////////////////////////////////////////////////////////////									
			if(reset){resetNodeInitialisation() }			
			let loopsIncludedIn				= [],			// Temporary array to store object of "loopID" and "loop system rank" for any loops the node is DIRECTLY included in 	
				loopsIncludedInSystemID 	= [], 			// Array of System ID's of nodesIncluded in (note: this should be the same for all loopsIncludedIN nodes). A check is made to alert for errors in specification	
				loopSystemID,				 				// Variable to hold the systemID of the loops being analysed
				loopIDsAllinSystem 			= [],			// Array of loopIDs for all loops in the loopSystemID
				nodeIDsAllinSystem 			= [],			// Array of nodeIDs contained in all loops in the loopSystemID
				linkIDsAllinSystem 			= [],			// Array of linkIDs contained in all loops in the loopSystemID
				loopIDsRanked				= [],			// Array of loopIDs ranked by system strength (1 to n)
			 	loopSystemOutputNodeIDs 	= []			// Array to store node IDs for nodes that are affected by the loop but are NOT part of any of the interacting loop 'system'	

		///////////////////////////////////////////////////////////////////////	
		/// 1 | LOOK FOR WHETHER SELECTED 'CONTROL' NODE IS PART OF A LOOP  ///
		///////////////////////////////////////////////////////////////////////								
			// a. For  selected controlNodeID (i.e. the 'clicked' node), find which loops it is included in (and return empty selection if 'not in a loop').		
				for(let i = 0; i < visData.loopData.length; i++){				// Loop through each loopData object to search for the control node
					let nodeIDsForLoop = visData.loopData[i]['nodeIDs']			// Array of nodeIDs
					if(nodeIDsForLoop.indexOf(+controlNodeID) > -1){			// Test to see if control node is part of loop
						loopsIncludedIn.push({									// And if so, push Loop ID to the loopsIncludedIn array
							'id': visData.loopData[i]['id'],
							'rank': visData.loopData[i]['loopSystemRank']
						})			
						if(loopsIncludedInSystemID.indexOf(visData.loopData[i]['loopSystemID']) === -1){			// Then add to the loopsIncludedInSystemID array 			
							loopsIncludedInSystemID.push(visData.loopData[i]['loopSystemID'])						// if it hasn't been added before (i.e. unique array)
						}
					}										
				}
			// b. Sort loopsIncludedIn array of objects into rank order (weakest to strongest as processing is by ascending strength)
				loopsIncludedIn.sort( (a,b) => b.rank - a.rank) 	

			// c. Check if node as already been evaluated
			let nodeEvaluated = (visData.nodesAnalysedByLoopStrength.indexOf(+controlNodeID) > 0) ? true : false							

		////////////////////////////////////////////////////////////////////////////
		/// 2 | BRANCH CONDITION FOR WHETHER NODE IS "IN LOOP" VS "OUT OF LOOP"  ///
		////////////////////////////////////////////////////////////////////////////

			///  #2A SELECTED NODE IS NOT PART OF A LOOP | NON-LOOP TRACING  ///
			if(loopsIncludedIn.length === 0 && !nodeEvaluated){			
				// i. Push node ID to nodesAnalysedByLoopStrength
				visData.nodesAnalysedByLoopStrength.push(+controlNodeID)

				// ii. Set its direction is "it's own" (i.e. an increase in node is just an increase in itself). 
				visData.nodeDirectionObject['node_'+controlNodeID]['direction'] = (direction === 'increase') ? 1 : -1 		// Sets the nodeDirectionObject for the selected node to the direction (i.e. no loop influences will change this)

				// iii. Test its immediate downstream (1st degree) nodes
					// Create array and find IDs of all 1st degree nodes
					let downstreamNodeIDs 		= [],			// Array of downstream node IDs
						downstreamNodeLinkIDs	= [], 			// Array of link IDs between selected node and 1st degree nodes
						downstreamLinkPolarity	= []			// Array of link polarities (req. to set the direction for recursively called function) 
					// a. Find downstreamNodeLinkIDs from the node data (i.e. node 'outputs' are linkIDs)
						downstreamNodeLinkIDs = visData.networkData.nodes[controlNodeID-1]['outputs']	

					// b. Find downstreamNodeIDs from the 'targets' data of each downstream link 
						for(let j = 0; j < downstreamNodeLinkIDs.length; j++){
							downstreamNodeIDs.push(visData.networkData.links[downstreamNodeLinkIDs[j]-1]['target']['id'])
						}
					// c. Find downstreamLinkPolarity from targets of each downstream link
						for(let j = 0; j < downstreamNodeLinkIDs.length; j++){
							if(visData.networkData.links[downstreamNodeLinkIDs[j]-1]['polarity'] === '+'){
								downstreamLinkPolarity.push(1)
							} else {
								downstreamLinkPolarity.push(-1)
							}							
						}

				// iv. Recursively call this calculateSystemInfluencesByLoopStrength function for each downstream node
					for(let j = 0; j < downstreamNodeIDs.length; j++){		
						let directionPolarity = (direction === 'increase') ? 1 : -1,
						 	inputDirection = (directionPolarity * downstreamLinkPolarity[j] === 1) ? 'increase' : 'decrease'	
						calculateSystemInfluencesByLoopStrength(downstreamNodeIDs[j], inputDirection, false)
					}

			/// #2B: SELECTED 'CONTROL' NODE IS PART OF A LOOP | LOOP STRENGTH ALGORITHM ///	
			} else if(loopsIncludedIn.length > 0 && !nodeEvaluated){												
				// The "loop strength algorithm" provides a 'shorthand evaluation' of ultimate node influence/impact, by assigning a 'strength' priority of every interacting loop (in a set of interacting loops). The idea is that this prioritisation is a proxy for which loop(s) will 'dominate' each other over time, allowing for an output of 'expected impact or influence of the systems nodes', from a given selected node and direction (i.e. a user selecting a node and wanting to forecast the impact of it going up or down). Note: If an node is part of a loop, it is expected - if the CLD is properly specfied - that interacting loops should exist (i.e. there should be a balancing loop at least to bring the system to a dynamic equilibrium) In the event of a CLD specfified WITHOUT a balancing loop, the algorithm will still work as that node will be assumed to dominate.
				// A. CALCULATE LOOP SYSTEM AND LOOP OUTPUT DATA
					// i. Set the loopSystem and warn user if there is a mis-specification of loop systems (i.e. if intersecting loops are assigned to different loop systems)
						loopSystemID = loopsIncludedInSystemID[0]
						if(loopsIncludedInSystemID.length > 1){ alert('Check loop system specification: some intersecting loops appear to belong to different loop systems')}

					// ii. Find all loops and nodes in the loopSystem > loopIDsAllinSystem array
						let loopsBySystem = d3.nest()
											.key(d => d.loopSystemID)
											.entries(visData.loopData)	
						// Add all loopIDsAllinSystem array									
						for(let i = 0; i < loopsBySystem.length; i++){
							if(loopsBySystem[i]['key'] === loopSystemID){
								let loopBySystemData = loopsBySystem[i]['values']
								for(let j = 0; j < loopBySystemData.length; j++){
									loopIDsAllinSystem.push({ 
										'id' 	: loopBySystemData[j]['id'],
										'rank'	: (loopBySystemData[j]['loopSystemRank'] === 0)	? loopBySystemData[j]['centralityEigenvector'] : loopBySystemData[j]['loopSystemRank']				
									})
									nodeIDsAllinSystem.push(loopBySystemData[j]['nodeIDs'])
									linkIDsAllinSystem.push(loopBySystemData[j]['linkIDs'])
								}
							}
						}
						// Flatten array of arrays nodes and links 
						nodeIDsAllinSystem = [...new Set([].concat(...nodeIDsAllinSystem))]
						linkIDsAllinSystem = [...new Set([].concat(...linkIDsAllinSystem))]
						// Sort loopIDsAllinSystem array of objects into rank order (weakest to strongest as processing is by ascending strength)
						if(d3.mean(loopIDsAllinSystem.map(d => +d.rank)) > 0.5){		// Test to see if loopRankings are provided by user (i.e. will have average above 1)
							loopIDsAllinSystem.sort( (a,b) => b.rank - a.rank) 
						} else {
							loopIDsAllinSystem.sort( (a,b) => a.rank - b.rank) 
						}
						loopIDsRanked = loopIDsAllinSystem.map( d => d.id)	

					// iii. Determine the output nodes from the loop system
						let allLoopDownstreamNodes = [], 
							allLoopDownstreamLinks = [] 
						for(let i = 0; i < nodeIDsAllinSystem.length; i++){
							let thisNodeID = nodeIDsAllinSystem[i]
							for(let j = 0; j < visData.networkData.nodes.length; j++){
								let nodeData = visData.networkData.nodes[j]
								if(thisNodeID === nodeData['id']){
									allLoopDownstreamLinks.push(nodeData['outputs'])
								}
							}
						}
						// Flatten the allLoopDownstreamLinks array of arrays ; AND use Set to make it a unique set
						allLoopDownstreamLinks = [...new Set([].concat(...allLoopDownstreamLinks))]	
						// Find end nodes for each link
						for(let i = 0; i < allLoopDownstreamLinks.length; i++){
							let thisLinkID = allLoopDownstreamLinks[i]
							for(let j = 0; j < visData.networkData.links.length; j++){
								let linkData = visData.networkData.links[j]
								if(thisLinkID === linkData.id){
									allLoopDownstreamNodes.push(linkData.target.id)
								}
							}
						}
						// Compare to nodes in loop system and set the difference array to be the output nodes (i.e. all output nodes not within the loop system)
						loopSystemOutputNodeIDs = [...new Set(allLoopDownstreamNodes.filter(x => !nodeIDsAllinSystem.includes(x)) )];

				// B. START WITH  "LOOPS THAT NODE IS IN" 
					// For each loop in that the node is directly part of ('direct loops'),  we start by assigning expected influence using the selected node direction and link polarity. These loops are assessed starting from the 'weakest' to 'strongest' loop so that the most dominant loop determines the influence (on any node that's part of multiple loops).
					setLoopSystemDirections(loopsIncludedIn, controlNodeID, direction)

					// Generalised function to loop through an array of ranked loopIDs and set their influence direction based on an inputNodeID and inputDirection
					function setLoopSystemDirections(loopIDArray, inputNodeID, inputDirection){
						for (let i = 0; i < loopIDArray.length; i++){
							// a. Get loop and node data
							let loopID = loopIDArray[i]['id'],
								loopIndex = (function(){
									for(let j = 0; j < visData.loopData.length; j++){
										if(visData.loopData[j]['id'] === loopID){ return j }
									} 
								}()),
								loopNodeIDs = visData.loopData[loopIndex]['nodeIDs'],					// Array of node IDs that are in this loop
								loopLinkIDs = visData.loopData[loopIndex]['linkIDs'],					// Array of link IDs that are in this loop. 
								loopLinkPolarities	 = visData.loopData[loopIndex]['linkPolarity'].map( d => (d === "+") ? 1 : -1),		// Link polarity associated with loopLinkID array (i.e. matched array indexes)
								controlNodeIndex 	 = loopNodeIDs.indexOf(+inputNodeID),				// Index of the selected node in the loopNodeIDs array
								controlNodeDirection = (inputDirection === 'increase') ? 1 : -1 ,									// Inputted direction of selected node
								loopSystemRank 		 = visData.loopData[loopIndex]['loopSystemRank']	// Loop system ID

							// b. Create a set of re-indexed loopNodeID and linkNodeID Arrays: 
							let newLoopNodeIDs = [],				// Such that the selected control node is first in the array 
								newLoopInfluence = [],				// Array of direction of how the newLoopNodeID is influenced
								nextIndex = controlNodeIndex		// Counter for the next index an array to push node/linkIDs to
							
							for(let j = 0; j < loopNodeIDs.length; j++){
								newLoopNodeIDs.push(loopNodeIDs[nextIndex])
								newLoopInfluence.push(loopLinkPolarities[nextIndex])
								nextIndex = (nextIndex +1) % loopNodeIDs.length
							}

							// c. Step through the newLoopNodeIDs and newLoopInfluence arrays and determine the expected influence on each inputNodeID in the loopID array, accounting for influencing link polarities and direction of selected node
							let expectedInfluenceOnLoopNodes = []
							for(let j = 0; j < newLoopNodeIDs.length; j++ ){
								// First node (j=0) is influenced only by the input direction (note: this could  also be selectedNodeDirection  * expectedInfluenceOnLoopNodes[newLoopNodeIDs.length] if the "balancing" influence of the loop is greater than the initial 'direction' ). Each subsequent node is fodun from the polarity multiplication of "Influencing link direction" x Previous nodes direction
								let influence = (j === 0) ? controlNodeDirection : newLoopInfluence[j-1] * expectedInfluenceOnLoopNodes[j-1]
								expectedInfluenceOnLoopNodes.push(influence) 			// And then push the influence to the expectedInfluenceOnLoopNodes
								// Update the nodes with calculated ''newInfluence': the process of overwriting influences takes into account that successive updates are for 'stronger' loops
								let nodeIDtoUpdate = newLoopNodeIDs[j],
									currentNodeDirection = visData.nodeDirectionObject['node_'+nodeIDtoUpdate]['direction'],
									calculatedInfluence = expectedInfluenceOnLoopNodes[j],
									newInfluence = (j === 0) ? controlNodeDirection : calculatedInfluence	
								visData.nodeDirectionObject['node_'+nodeIDtoUpdate]['direction'] = newInfluence
							}
						}
					} // end setLoopSystemDirections()

					// The implication of 'strength' simply means that the direction of change in the stronger loop will determine: 
					// a) the direction to assign to nodes that intersect between two nodes' 'tendency'
					// b) what the influence on nodes in the weaker link should be (from the direction of the intersecting node and loop link polarity)

				// C. FOR ALL LOOPS IN THE THE 'LOOP SYSTEM': 								
					// For each loop in the loop system that the node is not part of, find the 'intersecting' node(s) from the loops that the selected node is in. These 'intersecting' nodes  set the direction of influence to these non-direct or 'intersecting loops' that are part of the loop system. The strength of intesecting loops IS ASSUMED to be subordinate to the direct loops for convenience (as modelling a stronger 'feedback' to the direct part of the system is difficult to implement. This may be explored further)
					let loopsNotIncludedIn = loopIDsRanked.filter(x => !loopsIncludedIn.map( d => d.id).includes(x)),
						loopsNotIncludedInNodes = []					// Store the nodeIDs for these loops to check previously declared directions / look for intersection
						for(let i = 0; i < loopsNotIncludedIn.length; i++){
							let nodeArray = (function(){
								for(let j =0; j < visData.loopData.length; j++){
									if(loopsNotIncludedIn[i] === visData.loopData[j]['id']){ return visData.loopData[j]['nodeIDs'] }
								}
							})()												
							loopsNotIncludedInNodes.push(nodeArray)		// Push node arrays in order
						}

					/// If Loop system extends beyond loops in direct system, initialise direction of all other loops nodes from any 'intersecting nodes' 
					if(loopsNotIncludedIn.length > 0){	
						let intersectingLoopData = {}
						
						// For each non-included loop, find the intersecting nodes and initial direction: This is a modified version of the setLoopSystemDirections function
						for(let i = 0; i < loopsNotIncludedIn.length; i++){
							// a. Get loop and node data
							let loopID = loopsNotIncludedIn[i],
								loopIndex = (function(){
									for(let j = 0; j < visData.loopData.length; j++){
										if(visData.loopData[j]['id'] === loopID){ return j }
									} 
								}()),
								loopNodeIDs = visData.loopData[loopIndex]['nodeIDs'],				
								loopLinkIDs = visData.loopData[loopIndex]['linkIDs'],					
								loopLinkPolarities	 = visData.loopData[loopIndex]['linkPolarity'].map( d => (d === "+") ? 1 : -1),
								intersectingNodeID, 			// IntersectingNodeID replaces controlNodeID
								intersectingNodeDirection,		// intersectingNodeDirection replaces controlNodeDirection
								intersectingNodeIndex			// intersectingNodeIndex replaces controlNodeIndex

							// b. Find intersecting nodes and influencing direction. Note: if there are multiple 'opposing' entries to an intersecting loop, only the last is picked up here
							for(let j = 0; j < loopNodeIDs.length; j++){
								if(typeof(visData.nodeDirectionObject['node_'+loopNodeIDs[j]]['direction']) !== 'undefined'){
									intersectingNodeID = loopsNotIncludedInNodes[i][j]
									intersectingNodeDirection = visData.nodeDirectionObject['node_'+loopNodeIDs[j]]['direction']	 
									intersectingNodeIndex = loopNodeIDs.indexOf(intersectingNodeID)	
									intersectingLoopData[loopsNotIncludedIn[i]] = {
										'nodeID'	: intersectingNodeID,
										'direction' : intersectingNodeDirection,
										'nodeIndex' : intersectingNodeIndex
									}
								}	
							}
							// c. Create a set of re-indexed loopNodeID and linkNodeID Arrays. If no intersection is found, no re-indexing occurs: 
							let newLoopNodeIDs = [], newLoopInfluence = [],	
								nextIndex = typeof(intersectingNodeIndex) !== 'undefined' ? intersectingNodeIndex : 0
							for(let j = 0; j < loopNodeIDs.length; j++){
								newLoopNodeIDs.push(loopNodeIDs[nextIndex])
								newLoopInfluence.push(loopLinkPolarities[nextIndex])
								nextIndex = (nextIndex +1) % loopNodeIDs.length
							}
							// d. Step through the newLoopNodeIDs and newLoopInfluence arrays and determine the expected influence on each controlNodeID in the loopID array, accounting for influencing link polarities and direction of selected node
							let expectedInfluenceOnLoopNodes = []
							for(let j = 0; j < newLoopNodeIDs.length; j++ ){
								let influence = (j === 0) ? intersectingNodeDirection : newLoopInfluence[j-1] * expectedInfluenceOnLoopNodes[j-1]						
								expectedInfluenceOnLoopNodes.push(influence) 		
								// Update the nodes with calculated ''newInfluence'
								let nodeIDtoUpdate = newLoopNodeIDs[j],
									currentNodeDirection = visData.nodeDirectionObject['node_'+nodeIDtoUpdate]['direction'],
									calculatedInfluence = isNaN(expectedInfluenceOnLoopNodes[j]) ? undefined : expectedInfluenceOnLoopNodes[j],
									newInfluence = (j === 0) ? intersectingNodeDirection : calculatedInfluence	
								visData.nodeDirectionObject['node_'+nodeIDtoUpdate]['direction'] = newInfluence
							}
						}
					} 

			/// #2C: RECUSRIVE CALL TO MASTER FUNCTION TO EACH LOOP SYSTEM OUTPUT NODE IF THERE ARE OUTPUT NODES ///
				//i. Make sure call is not made to a node that has already been determined (i.e. an out of loop upstream, or a node in an evaluated system)
					// Determine the unique set of nodeIDs already evaluated
					visData.nodesAnalysedByLoopStrength = [...new Set([].concat(...visData.nodesAnalysedByLoopStrength.concat(nodeIDsAllinSystem)))]	
					// Then find ust the difference nodeIDS
					loopSystemOutputNodeIDs = loopSystemOutputNodeIDs.filter(x => !visData.nodesAnalysedByLoopStrength.includes(x))

				if(loopSystemOutputNodeIDs.length > 0){
					for(let i = 0; i < loopSystemOutputNodeIDs.length; i++){
						// a. Find the "direction" outputted from the loop system
						let outputNodeID = loopSystemOutputNodeIDs[i],			// Node outside of the loop system
							inputNodeID,										// Node in the loop system that leads out of the system	
							inputNodeDirection,									// Direction of node leading out of the system
							inputLinkID,										// Link ID leading out of the loop system
							inputPolarity,										// Polarity of link leading out
							inputDirection 										// Direction of the out of loop node (inputNodeDirection x inputPolarity)

						for(let j = 0; j < visData.networkData.links.length; j++){
							if(outputNodeID === visData.networkData.links[j]['target']['id'] && nodeIDsAllinSystem.indexOf(visData.networkData.links[j]['source']['id']) > -1 ){
								inputLinkID = visData.networkData.links[j]['id']
								inputNodeID = visData.networkData.links[j]['source']['id']
								inputNodeDirection = visData.nodeDirectionObject['node_'+inputNodeID]['direction']
								inputPolarity = (visData.networkData.links[j]['polarity'] === '+') ? 1 : -1
								inputDirection =(inputNodeDirection * inputPolarity === 1)? 'increase' : 'decrease'	
							}
						}
						// Call the calculateSystemInfluencesByLoopStrength function								
						calculateSystemInfluencesByLoopStrength(outputNodeID, inputDirection, false)	
					}
				}
			} // end of IF node is part of a loop 

			// Helper to reset nodeDirectionObject
			function resetNodeInitialisation(){
				let keys = Object.keys(visData.nodeDirectionObject)
				for(let i = 0; i < keys.length; i++){
					visData.nodeDirectionObject[keys[i]]['direction'] = undefined
				}
			} // end resetNodeInitialisation()
	} // calculateSystemInfluencesByLoopStrength()


	// B. NODE-TO-NODE: PROPOGATE AND BRANCH (BY DEGREE AND BY POLARITY) : Algorithm is set to transverse 'downstream' (i.e. step through) by the "Order" length
	function calculateSystemInfluencesByBranching(d, index, parentNodeList, direction = 'increase', showLinks = false, networkTraceLength = settings.networkOrderLength, networkTraceType = settings.networkTraceType) {
		// d3.event.stopPropagation()					// Stop click propagation to SVG (which is set to reset node colours)
		influenceData = {							// Reset influences data (prevents persistent data from 
			'masterNodeID':  '',						
			'multiNodeIDX': [],			
			'multiPositiveNodeIDX': [],			
			'multiNegativeNodeIDX': [],		
			'multiMixedNodeIDX': [],			
			'nodeUnimpactedIDX': [],				
			'nodeUnimpactedSelection': 	'',			
			'nodePositiveSelection': '',	
			'nodeNegativeSelection': '',	
			'nodeMixedSelection' : '',		
			'labelUnimpactedSelection': '',			
			'labelPositiveSelection': '',
			'labelNegativeSelection': '',
			'labelMixedSelection' : '',
            'linkIDX': [],
            'linkSelection': [],
            'spannedNodes': []  
		}
	
		//////////////////////////////////////////////////////////////////////////////////////////
		/// A | CALCULATE INFLUENCE DATA FOR SELECTED NODE (INFLUENCE PROPOGATION ALGORITHM )  ///
		//////////////////////////////////////////////////////////////////////////////////////////

			// 0. Get MASTER node information (i.e. the selected node)
				const masterNode 	           = d3.select(this),
					masterNodeData 	           = d, 								   // Get data bound to node (note: returns as first argument of this). Can be accessed from d3.select(this)._groups[0][0]['__data__']
				  	masterNodeLinkIDs          = masterNodeData['outputs'],			   // Specified link IDs						
					masterNodeIndex 	       = masterNodeData['id'] - 1,             // Convert nodeIDs to 0 indexed ID, where node IDs are assumed to be numbers starting from 1 (e.g. Kumu table output)
					masterNodeLinkIndex        = masterNodeLinkIDs.map(d => d-1), 	   // Convert linkIDs to 0 indexed ID
					masterNodeLinkTargetIDXs   = masterNodeLinkIndex.map(d => visData.networkData.links[d]['target']['id']).map(d => d-1),		// Array of target node IDs (arranged in order of link indexes)					  
					masterNodePolarity 	       = ( () => direction === 'increase' ? 1 : -1 )(),	   // The direction of movement of the master node (which affects the polarity of all downstream nodes)
					masterNodeLinkPolarity 	   = masterNodeLinkIndex.map(d => (visData.networkData.links[d]['polarity'] === "+" ? 1 : -1) * masterNodePolarity)	// Polarity of links, expressed as +1 /-1 and accounting for master node direction
				
				influenceData.masterNodeID = d['id']		          // Specified node ID	
				settings.networkMaxPathLength = 0					  // Set with an initial length of 0

			// 1. Determine order length to run in the algorithm (i.e. how many 'levels' or orders to span in the network to trace influence)
				// a. Find the maximum path length in the network 									 	
				const	nodeIndexKeys = Object.keys(jsnx.allPairsShortestPath(G)._numberValues[influenceData.masterNodeID]['_numberValues'])											
					// Set the longest path length to be the number of settings.networkMaxPathLength | this ensures all impacted nodes are reached
					for(let i = 0; i < nodeIndexKeys.length; i++){		
						let pathLength = jsnx.allPairsShortestPath(G)._numberValues[influenceData.masterNodeID]['_numberValues'][nodeIndexKeys[i]].length; 		
						settings.networkMaxPathLength = pathLength > settings.networkMaxPathLength ? pathLength : settings.networkMaxPathLength		
					}

				// b. Set orderLength depending on the settings.networkTraceType and whether a networkTraceLength is provided as an argument
                const orderLength = (function(){
                    if(networkTraceType === 'byDegree' || networkTraceType === 'byDegreeWithCentralStopping'){              // If type is 'byDegree' or 'byDegreeWithCentralStopping', the tracelength will start at 1 and be incremented on every call
                        return networkTraceLength                       // Note: this networkTraceLength is an argument incremented when animating consequences 'byDegree'
                    } else if(networkTraceType === 'byPolarity'){       // if type is 'byPolarity' and 
                        if(networkTraceLength === 'maxPathLength'){     // if the string 'maxPathLength' is specified as the length, orderLength set to maxPathLength 
                            return  settings.networkMaxPathLength       // This ensures all impacted nodes are reached (used for animating all consequences "byPolarity")
                        } else if(!isNaN(networkTraceLength) && networkTraceLength <= settings.networkMaxPathLength) {  // If a networkTraceLength degree is provided as a number for a byPolarity type (a custom case)
                            return networkTraceLength            // Set length to the number of degrees provided as an argument (networkTranceLength). 
                        }
                    }           
                }()) 

			// 2. Declare INFLUENCE Arrays to store all influenced nodes/links (for all 'orders'. And set first order from master node data. Each additional 'order' pushes data to these nodes
				// Note: Each element in theses arrays is an array for each Order
                let nodeIndexSpannedArray            = [masterNodeIndex]                                    // Array to keep track of all nodes reached/spanned in the network (for the specified order of degrees)
				const influenceAllNodeArray 		= [nodeInfluenceArray(masterNodeIndex)],				// Each entry stores one number (-1, 0, +1) for each node that indicates its direction of movement with an increase in master node (i.e. isolated polarity). This number is only the initial movement (i.e. not showing feedback)
					influenceNodeIndexesArray 	    = [nodeInfluenceIndexes(influenceAllNodeArray[0])],		// Array of target node indexes  (for tracing downstream impacts and highlighting visually)
					influenceLinkIndexesArray 	    = [masterNodeLinkIndex],								// Array of link indexes  (for highlighting visually)
					influenceLinkTargetIndexesArray	= [masterNodeLinkTargetIDXs],							// Array of link node targets  
					influencOutDegreeByOrder 	    = [influenceNodeIndexesArray[0].length],				// Tracks the number of Nodes/Links (i.e. out degrees) for each (first, second, third etc.) "Order"  of influence through the system
					influencePolarityArray		    = [masterNodeLinkPolarity]								// Direction of change propagated from master node > children

			// 3. FOR EACH 'ORDER' (OR LEVEL) OF DOWNSTREAM INFLUENCE (i.e. how many downstream orders/levels to trace through the system structure)
				for(let i = 0; i < orderLength; i++){
					influenceNodeIndexesArray[i] = influenceNodeIndexesArray[i].flat()						// Flatten any array of arrays, 
					influencePolarityArray[i] = influencePolarityArray[i].flat()							// which is the 
					influenceLinkIndexesArray[i] = influenceLinkIndexesArray[i].flat()						// format pushed 

					// 3a. Declare empty arrays for summarising child nodes of this order (where each child is pushed to)
					let childAllNodeArray = [],					// n-node length array with (-1, 0 ,1's) > push each child directly to influenceAllNodeArray
						childNodeIndexesArray =[],				// shortened array with indexes for non-zero elements in nextInfluenceArray
						childLinkIndexesArray = [],				// Holds the index of downstream links
						childLinkTargetIndexesArray = [],		// Holds the index of downstream target nodes
					 	childPolarityArray = []					// Holds the polarity of child links

                    // 3b. Apply spanning stopping rules if networkTraceType is byDegreeWithCentralStopping
                    if(settings.networkTraceType === 'byDegreeWithCentralStopping' && settings.centralNodeStopImpact === "TRUE"){
                        if(influenceLinkTargetIndexesArray[i].indexOf(visData.centerNodeID -1) > -1){
                            influenceNodeIndexesArray[i] = influenceNodeIndexesArray[i].filter( d => d !== (visData.centerNodeID -1))
                            influenceLinkIndexesArray[i] = influenceLinkIndexesArray[i].filter( d => d !== (visData.centerNodeID -1))
                        }                           
                    }

                    // 3e. Speed up iterations if no more target node are detected (i.e. all nodes spanned)
                    interactionState.reduceTimer = (influenceLinkTargetIndexesArray[i].length ===0) ? true : false

					// 3c. FOR EVERY CHILD: Loop through each identified target node to find their target node/links 
					for(let j = 0; j < influenceLinkTargetIndexesArray[i].length; j++){
						const nodeIndex = influenceLinkTargetIndexesArray[i][j],							// Node index of the downstream node
							  polarityIndex = influenceLinkTargetIndexesArray[i].indexOf(nodeIndex),		
							  parentPolarity = influencePolarityArray[i][polarityIndex]						// Polarity of parent
				
						// Build node and link arrays for each Child node 
						childAllNodeArray = nodeInfluenceArray([influenceLinkTargetIndexesArray[i][j]])		// Influence array of the node
												.map(d => d * influencePolarityArray[i][polarityIndex])		// and apply the polarity multiplier FOR THE node 
                    	childNodeIndexesArray.push(nodeInfluenceIndexes(childAllNodeArray))					// Array of node IDs for nodes influenced 
						childLinkIndexesArray.push(nodeLinksIndexes([nodeIndex]))							// Array of link indexes for node in question (i.e. shortened) (with ID converted to index by -1)
					
                    	childLinkTargetIndexesArray.push(
                            nodeLinksIndexes([nodeIndex])						                             
							     .map(d => visData.networkData.links[d]['target']['id']).map(d => d-1)   // Array of link target node indexes
                            )
						childPolarityArray.push(nodeLinksIndexes([nodeIndex])								// Polarity of links, expressed as +1 /-1 and accounting for master node direction
							.map(d => (visData.networkData.links[d]['polarity'] === "+" ? 1 : -1) * influencePolarityArray[i][polarityIndex]))	

						// Add every child 'AllNodeArray' to the influenceAllNodeArray (if not already spannned): 
						if(nodeIndexSpannedArray.indexOf(nodeIndex) === -1){
							influenceAllNodeArray.push(childAllNodeArray)									// This 'array' or arrays format is required for summarising the influence.		
						}
					} // END LOOP FOR CHILDREN 
					
					// 3d. Add to data arrays for each Order: each added array is flattened so that the index of the array = order spanned
					influenceNodeIndexesArray.push(childNodeIndexesArray.flat())				
					influenceLinkIndexesArray.push(childLinkIndexesArray.flat())											
					influenceLinkTargetIndexesArray.push(childLinkTargetIndexesArray.flat())											
					influencePolarityArray.push(childPolarityArray.flat())													
					influencOutDegreeByOrder.push(childLinkIndexesArray.flat().length)						// Counts the number of spanned at each order

					// 3e. Add nodes reached/spanned in the network to the nodeIndexSpannedArray
					nodeIndexSpannedArray = nodeIndexSpannedArray.concat(influenceNodeIndexesArray[i]).filter(onlyUnique)		
				} // END OF LOOP FOR ORDER

			// 4. Insert the Master node: This is done for convenience to show the master node as the zero index. Outlinks and target nodes now relate (index-wise) to the master node
				influenceNodeIndexesArray.unshift([masterNodeIndex])
				influencePolarityArray.unshift([masterNodePolarity])
				influencOutDegreeByOrder.unshift(1)				// Adds a '1' as the 0 order only includes the master-node

			// 5. Create "direction array" which compresses all influence array to single polarity (or neutrality) of influence 
				let directionArray = []							
                if(networkTraceType !== 'byDegreeWithCentralStopping' ){
                    createDirectionArray(influenceAllNodeArray)            // A simple count of the +/- influences on each node 
                } else {
                    createDirectionArrayWithoutLooping(influenceAllNodeArray)            // An alternate compilation method that takes into account the central/stopping node
                }
				           
				// Clean up arrays by removing duplicates
				influenceData.multiMixedNodeIDX = influenceData.multiMixedNodeIDX.filter(onlyUnique)
				influenceData.multiNodeIDX = influenceData.multiNodeIDX.filter(onlyUnique).filter( (el) => !influenceData.multiMixedNodeIDX.includes(el)) 
				influenceData.multiPositiveNodeIDX = influenceData.multiPositiveNodeIDX.filter(onlyUnique).filter( (el) => !influenceData.multiMixedNodeIDX.includes(el)) 
				influenceData.multiNegativeNodeIDX = influenceData.multiNegativeNodeIDX.filter(onlyUnique).filter( (el) => !influenceData.multiMixedNodeIDX.includes(el)) 
                influenceData.linkIDX = influenceLinkIndexesArray.flat().filter(onlyUnique)
                influenceData.spannedNodes = nodeIndexSpannedArray

		//////////////////////////////////////////////////////
		/// B | DETERMINE NODE IMPACT / INFLUENCE GROUPS   ///
		//////////////////////////////////////////////////////

			// Find all nodes NOT impacted by the selected (Master) node				
			for(let i = 0; i < directionArray.length; i++ ){
				if(directionArray[i] === 0){
					influenceData.nodeUnimpactedIDX.push(i)
					influenceData.nodeUnimpactedSelection = influenceData.nodeUnimpactedSelection+'circle#node_'+(i+1)+','
					influenceData.labelUnimpactedSelection = influenceData.labelUnimpactedSelection+'text#label_'+(i+1)+','
				}
			 }
			influenceData.nodeUnimpactedIDX.filter( (el) => !influenceData.multiMixedNodeIDX.includes(el))		// Make sure no mixed node indexes are listed as unimpacted

			// Find all nodes positively impacted by the selected node
			for(let i = 0; i < influenceData.multiPositiveNodeIDX.length; i++ ){
				if(i !== influenceData.multiPositiveNodeIDX.length-1){
					influenceData.nodePositiveSelection = influenceData.nodePositiveSelection+'#node_'+(+influenceData.multiPositiveNodeIDX[i]+1)+','
					influenceData.labelPositiveSelection = influenceData.labelPositiveSelection+'#label_'+(+influenceData.multiPositiveNodeIDX[i]+1)+','
				} else {
					influenceData.nodePositiveSelection = influenceData.nodePositiveSelection+'#node_'+(+influenceData.multiPositiveNodeIDX[i]+1)
					influenceData.labelPositiveSelection = influenceData.labelPositiveSelection+'#label_'+(+influenceData.multiPositiveNodeIDX[i]+1)
				}
			}

			// Find and nodes negatively impacted by the selected node
			for(let i = 0; i < influenceData.multiNegativeNodeIDX.length; i++ ){
				if(i !== influenceData.multiNegativeNodeIDX.length-1){
					influenceData.nodeNegativeSelection = influenceData.nodeNegativeSelection+'#node_'+(+influenceData.multiNegativeNodeIDX[i]+1)+','
					influenceData.labelNegativeSelection = influenceData.labelNegativeSelection+'#label_'+(+influenceData.multiNegativeNodeIDX[i]+1)+','
				} else {
					influenceData.nodeNegativeSelection = influenceData.nodeNegativeSelection+'#node_'+(+influenceData.multiNegativeNodeIDX[i]+1)
					influenceData.labelNegativeSelection = influenceData.labelNegativeSelection+'#label_'+(+influenceData.multiNegativeNodeIDX[i]+1)
				}
			}

			// Find all nodes with feedback
			for(let i = 0; i < influenceData.multiMixedNodeIDX.length; i++ ){
				if(i !== influenceData.multiMixedNodeIDX.length-1){									
					influenceData.nodeMixedSelection = influenceData.nodeMixedSelection+'#node_'+(+influenceData.multiMixedNodeIDX[i]+1)+','
					influenceData.labelMixedSelection = influenceData.labelMixedSelection+'#label_'+(+influenceData.multiMixedNodeIDX[i]+1)+','
				} else {
					influenceData.nodeMixedSelection = influenceData.nodeMixedSelection+'#node_'+(+influenceData.multiMixedNodeIDX[i]+1)
					influenceData.labelMixedSelection = influenceData.labelMixedSelection+'#label_'+(+influenceData.multiMixedNodeIDX[i]+1)
				}
			}	

            // Construct the link selection
            for(let i = 0; i < influenceData.linkIDX.length; i++ ){
                if(i !== influenceData.linkIDX.length-1){                                 
                    influenceData.linkSelection = influenceData.linkSelection+'#link_'+(+influenceData.linkIDX[i]+1)+','
                } else {
                    influenceData.linkSelection = influenceData.linkSelection+'#link_'+(+influenceData.linkIDX[i]+1)
                }
            }   

		///////////////////////////////////////////////////////////////
		/// C | HELPER FUNCTIONS FOR INFLUENCE BRANCHING ALGORITHM  ///
		///////////////////////////////////////////////////////////////

			// Compare and summarise direction array (from influence arrays): This algorithm resolves multiple influences by assinign a 
			function createDirectionArray(influenceArray){
				const masterInfluenceArray =[]
				for (index = 0; index  <influenceArray[0].length; index++){
					masterInfluenceArray.push((index === masterNodeIndex) ? 1 : 0)
				}
				directionArray = masterInfluenceArray		 // Sets the 'current' polarity to the influences of the master node
				// Loop through every impacted node to compare the (link) polarity and update the impact of the master node, starting at index = 1 (as 0 is the master)
				for(index = 0; index < influenceArray.length; index++){
					directionArray = directionArray.map(function (current, nodeIndex) {
					 let next = influenceArray[index][nodeIndex]
				  		// FOR NEWLY SPAWNED NODES in the propagated network
						if(current === 0){ 											// A zero indicates that the node has yet to be spanned
							if(next === 0){			
								return 0											// return 0 if node remains unspanned
							} else if (next === 1){
								influenceData.multiPositiveNodeIDX.push(nodeIndex)	// push node index to multiPositive tracker array (note: mixed influence nodes are later taken out of this array)
								return next 										// return +1/-1 if the node is now spawned (i.e. is impacted by change in master node)
							} else if( next === -1){
								influenceData.multiNegativeNodeIDX.push(nodeIndex)	// push node index to multiNegative tracker array (note: mixed influence nodes are later taken out of this array)
								return next
							}
						
						// FOR NODES ALREADY SPAWNED in the propagated network
						// For nodes moving in the same direction as the master
						} else if(current >= 1 ){ 			
							if(next === 0){											// If no influence (0) 
								return current 										// return current influence
							} else if(next === 1){									// If +ive is increased (+1) 
								influenceData.multiPositiveNodeIDX.push(nodeIndex)	// push node index to multiPositive tracker array (note: mixed influence nodes are later taken out of this array)
								return current + next								// and add 1 to impact polarity
							} else if (next === -1){								// If +ive is decreased (-1), then there is an opposing influence so 
								influenceData.multiMixedNodeIDX.push(nodeIndex)		// push node index to mixedNode tracker array										
								return current + next								// and add next to impact polarity (although this is only a simple addition of influences, it is preferable to doing nothing)
							}
						// For nodes moving in the opposite direction as the master
						} else if(current <= -1){ 			
							if(next === 0){											// If no influence (0) 
								return current 										// return current influence
							} else if(next === -1){									// If -ive is decreased (-1) 
								influenceData.multiNegativeNodeIDX.push(nodeIndex)	// push node index to multiNegative tracker array (note: mixed influence nodes are later taken out of this array)
								return current + next								// and -1 to impact polarity
							} else if (next === 1){									// If -ive is increased (+1), then there is an opposing influence so 
								influenceData.multiMixedNodeIDX.push(nodeIndex)		// push node index to mixedNode tracker array	
								return current + next								// and add next to impact polarity (although this is only a simple addition of influences, it is preferable to doing nothing)
							}
						}												
					 });								
				}
			} // end createDirectionArray()	
			
            function createDirectionArrayWithoutLooping(influenceArray){
                const masterInfluenceArray =[]
                for (index = 0; index  <influenceArray[0].length; index++){
                    masterInfluenceArray.push((index === masterNodeIndex) ? 1 : 0)
                }
                directionArray = masterInfluenceArray        // Sets the 'current' polarity to the influences of the master node
                // Loop through every impacted node to compare the (link) polarity and update the impact of the master node, starting at index = 1 (as 0 is the master)

                for(index = 0; index < influenceArray.length; index++){
                    directionArray = directionArray.map(function (current, nodeIndex) {
                     let next = influenceArray[index][nodeIndex]
                        // FOR NEWLY SPAWNED NODES in the propagated network
                        if(current === 0){                                          // A zero indicates that the node has yet to be spanned
                            if(next === 0){         
                                return 0                                            // return 0 if node remains unspanned
                            } else if (next === 1){
                                influenceData.multiPositiveNodeIDX.push(nodeIndex)  // push node index to multiPositive tracker array (note: mixed influence nodes are later taken out of this array)
                                return next                                         // return +1/-1 if the node is now spawned (i.e. is impacted by change in master node)
                            } else if( next === -1){
                                influenceData.multiNegativeNodeIDX.push(nodeIndex)  // push node index to multiNegative tracker array (note: mixed influence nodes are later taken out of this array)
                                return next
                            }
                        // FOR NODES ALREADY SPAWNED in the propagated network
                        // For nodes moving in the same direction as the master
                        } else if(current >= 1 ){           
                            if(next === 0){                                         // If no influence (0) 
                                return current                                      // return current influence
                            } else if(next === 1){                                  // If +ive is increased (+1) 
                                influenceData.multiPositiveNodeIDX.push(nodeIndex)  // push node index to multiPositive tracker array (note: mixed influence nodes are later taken out of this array)
                                return current + next                               // and add 1 to impact polarity
                            } else if (next === -1){                                // If +ive is decreased (-1), then there is an opposing influence so 
                                influenceData.multiPositiveNodeIDX.push(nodeIndex)  // REMAINS POSITIVE: i.e. do not change fro conflicting loop behavior                                       
                                return current + next                               // and add next to impact polarity (although this is only a simple addition of influences, it is preferable to doing nothing)
                            }
                        // For nodes moving in the opposite direction as the master
                        } else if(current <= -1){           
                            if(next === 0){                                         // If no influence (0) 
                                return current                                      // return current influence
                            } else if(next === -1){                                 // If -ive is decreased (-1) 
                                influenceData.multiNegativeNodeIDX.push(nodeIndex)  // push node index to multiNegative tracker array (note: mixed influence nodes are later taken out of this array)
                                return current + next                               // and -1 to impact polarity
                            } else if (next === 1){                                 // If -ive is increased (+1), then there is an opposing influence so 
                                influenceData.multiNegativeNodeIDX.push(nodeIndex)  //  REMAINS NEGATIVE: i.e. do not change fro conflicting loop behavior  
                                return current + next                               // and add next to impact polarity (although this is only a simple addition of influences, it is preferable to doing nothing)
                            }
                        }                                               
                     });                                
                }
            } // end createDirectionArray() 

			function nodeInfluenceArray(nodeIndex){
				return visData.nodeInfluenceData[nodeIndex]	
			}
			function nodeInfluenceIndexes(array){
				const outputArray = []
				for(index = 0; index < array.length; index++){
					if(array[index] !== 0){ outputArray.push(index) }
				} 
				return outputArray
			}
			function nodeLinksIndexes(nodeIndex){
				return visData.networkData.nodes[nodeIndex]['outputs'].map(d => d-1)
			}
			function onlyUnique(value, index, self) { 
			    return self.indexOf(value) === index;
			}
	} // end calculateInfluences()


////////////////////////////////////////////////////////////////////////////
//////////////////////////   HELPER FUNCTIONS   ////////////////////////////
////////////////////////////////////////////////////////////////////////////

	// Camelcase text string
	function camelize(str){ 
		return str.replace(/\W+(.)/g, function(match, chr){ return chr.toUpperCase(); } ); 
	} // end camelize()

	// General wrap to width function
    function wrap(text, width, lineHeight = 1.1) {
      text.each(function() {
        let text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            y = text.attr("y"),
            x = text.attr("x"),
            dy = (text.attr("dy")) ? parseFloat(text.attr("dy")) : 0,
            tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
	            if (tspan.node().getComputedTextLength() > width) {
	                line.pop();
	                tspan.text(line.join(" "));
	                line = [word];
	                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
	            }
            }
      })
    } // end wrap() 

    // Wrap lines to box to fit in circle: adapted from https://beta.observablehq.com/@mbostock/fit-text-to-circle
    function wrapCircle(data, lineHeight = 1.1) {
    	let node = d3.select(this),
    		label = data.name,
    		words = label.split(/\s+/g),				        	
    	 	targetWidth = Math.sqrt(measureWidth(label.trim()) * lineHeight * 10)

    	// Split to lines and return as an object
		let line,
		 	lineWidth0 = Infinity,
		 	lines = [];
		for(let i = 0; i < words.length; ++i) {
			let lineText1 = (line ? line.text + " " : "") + words[i],
			 	lineWidth1 = measureWidth(lineText1);
			if ((lineWidth0 + lineWidth1) / 2 < targetWidth) {
				line.width = lineWidth0 = lineWidth1;
				line.text = lineText1;
			} else {
			  	lineWidth0 = measureWidth(words[i]);
			  	line = {width: lineWidth0, text: words[i]};
			  	lines.push(line);
			}
		}
		// Find text radius and push to array for scaling text
	  	let radius = 0;
	  	for(let i = 0; i < lines.length; ++i) {
	    	const dy = (Math.abs(i - lines.length / 2 + 0.5) + 0.5) * lineHeight;
	    	const dx = lines[i].width / 2;
	    	radius = Math.max(radius, d3.max([dx, dy]));					    
	  	}
		visData.textRadiusArray.push(radius)
		return lines;		// Return the lines object
    } // end wrapCircle() 

    // Wrap lines to box to fit in circle: adapted from https://beta.observablehq.com/@mbostock/fit-text-to-circle
    function wrapCircleLoop(loopID, lineHeight = 1.1) {
    	let	loopData = (function(){
    			for(let i = 0; i < visData.loopData.length; i++){
    				if(loopID === visData.loopData[i]['id']){return visData.loopData[i] }
    			}
    		}()),
    		label = loopData['name'],
    		words = label.split(/\s+/g),				        	
    	 	targetWidth = Math.sqrt(measureWidth(label.trim()) * lineHeight * 10)

    	// Split to lines and return as an object
		let line,
		 	lineWidth0 = Infinity,
		 	lines = [];
		for(let i = 0; i < words.length; ++i) {
			let lineText1 = (line ? line.text + " " : "") + words[i],
			 	lineWidth1 = measureWidth(lineText1);
			if ((lineWidth0 + lineWidth1) / 2 < targetWidth) {
				line.width = lineWidth0 = lineWidth1;
				line.text = lineText1;
			} else {
			  	lineWidth0 = measureWidth(words[i]);
			  	line = {width: lineWidth0, text: words[i]};
			  	lines.push(line);
			}
		}
		// Find text radius and push to array for scaling text
	  	let radius = 0;
	  	for(let i = 0; i < lines.length; ++i) {
	    	const dy = (Math.abs(i - lines.length / 2 + 0.5) + 0.5) * lineHeight;
	    	const dx = lines[i].width / 2;
	    	radius = Math.max(radius, d3.max([dx, dy]));					    
	  	}
	  	// Return the object with lines and radius
		return {
			'textData': lines,
			'radius': radius
		}							
    } // end wrapCircleLoop() 

    	// Helper functions for circle wrap
		function measureWidth(text) {
		  	const context = document.createElement("canvas").getContext("2d");
		  	return context.measureText(text).width;
		}

	// Helper to return the object key for a given value			
	function getObjKey(name, obj){
		for (let i = 0; i < Object.keys(obj).length; i++){
			if(name === obj[i]){ return i }
		}
		return -1
	} // end getObjKey()

	// https://github.com/d3/d3-force/blob/326245bc4f2ba4e75d8e72bea5adab22e81d0f0f/src/radial.js
	// Credit to Gerardo Furtado for this extension to d3.v5 that allows for multiple radial forces to be applied
	function customRadial(radius, x, y) {
	  var constant = function(x) {
	    return function() {
	      return x;
	    };
	  };
	  var nodes,
	    strength = constant(0.1),
	    strengths,
	    radiuses,
	    xs,
	    ys;

	  if (typeof radius !== "function") radius = constant(+radius);
	  if (typeof x !== "function") x = constant(x == null ? 0 : +x);
	  if (typeof y !== "function") y = constant(y == null ? 0 : +y);

	  function force(alpha) {
	    for (var i = 0, n = nodes.length; i < n; ++i) {
	      var node = nodes[i],
	        dx = node.x - xs[i] || 1e-6,
	        dy = node.y - ys[i] || 1e-6,
	        r = Math.sqrt(dx * dx + dy * dy),
	        k = (radiuses[i] - r) * strengths[i] * alpha / r;
	      node.vx += dx * k;
	      node.vy += dy * k;
	    }
	  }

	  function initialize() {
	    if (!nodes) return;
	    var i, n = nodes.length;
	    strengths = new Array(n);
	    radiuses = new Array(n);
	    xs = new Array(n);
	    ys = new Array(n);
	    for (i = 0; i < n; ++i) {
	      radiuses[i] = +radius(nodes[i], i, nodes);
	      xs[i] = +x(nodes[i], i, nodes);
	      ys[i] = +y(nodes[i], i, nodes);
	      strengths[i] = isNaN(radiuses[i]) ? 0 : +strength(nodes[i], i, nodes);
	    }
	  }

	  force.initialize = function(_) {
	    nodes = _, initialize();
	  };

	  force.strength = function(_) {
	    return arguments.length ? (strength = typeof _ === "function" ? _ : constant(+_), initialize(), force) : strength;
	  };

	  force.radius = function(_) {
	    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
	  };

	  force.x = function(_) {
	    return arguments.length ? (x = typeof _ === "function" ? _ : constant(+_), initialize(), force) : x;
	  };

	  force.y = function(_) {
	    return arguments.length ? (y = typeof _ === "function" ? _ : constant(+_), initialize(), force) : y;
	  };

	  return force;
	} // end customRadial()

    // Difference between two arrays
    function arrayDifference(arr1, arr2) {
        let returnedArray = [];
        for(let i = 0; i < arr1.length; i++) {
            if(arr2.indexOf(arr1[i]) === -1){   // If the value is NOT in the second array, return it!!
                returnedArray.push(arr1[i]);
            }
        }
        return returnedArray;
    }; // end arrayDifference
    // Duplicates between two arrays
    function arrayDuplicates(arr1, arr2) {
        let returnedArray = [];
        for(let i = 0; i < arr1.length; i++) {
            if(arr2.indexOf(arr1[i]) !== -1){
                returnedArray.push(arr1[i]);
            }
        }
        return returnedArray;
    }; // end arrayDifference


///////////////////////////////////////////////////////////////////////////
///////////////////////   SOCIAL NETWORK ANALYSIS  ////////////////////////
//////    Use jsnetworkx.js to build a network graph for analysis     /////
///////////////////////////////////////////////////////////////////////////

	function createSNA(nodeData, connectionData){
		for(let i = 0 ; i < nodeData.length; i++){
			G.addNode( i+1, {'name': nodeData[i]['nodeName']} )
		}
		for(let i = 0 ; i < connectionData.length; i++){
			G.addEdge(connectionData[i]['connectionFromNodeID'], connectionData[i]['connectionToNodeID'], {'weight': 1})
		}

		// Perform SNA analyis & Fill node centrality array 
		for(let i = 0; i < visData.networkData.nodes.length ; i ++ ){
			let obj = {
				'eigenvectorCentrality': Math.round(visData.networkData.nodes[i]['eigenvectorCentrality']*1000)/1000,
				'betweennessCentrality': Math.round(visData.networkData.nodes[i]['betweennessCentrality']*1000)/1000,
				'degreeCentrality': Math.round(visData.networkData.nodes[i]['degreeCentrality']*1000)/1000,
				'name': visData.networkData.nodes[i]['name']
			}
			visData.nodeCentrality.push(obj)	
		}
	} // end createSNA()


///////////////////////////////////////////////////////////////////////////
/////////////////   INTRO AND NARRATIVE OPTIONS    ////////////////////////
///////////////////////////////////////////////////////////////////////////

	// Currently reveals visualisation immediately after data load/processing (with loader animation shown prior)
	// *** in future interactions this could load to an intro page with options to start the visualisation rending
	function showIntro(){
		let introFadeTime = 500
		d3.select('#intro-container')
		 .transition().duration(introFadeTime)
		 .style('opacity', 0)

		setTimeout(function(){
			d3.select('#intro-container').classed('hidden', true)
		}, introFadeTime)
	}; // end showIntro


    // Center and highlight the "Motivation to displace" node
    function customView(centerNodeName = settings.centralNode){
        // 1. Run the simulation with custom node forces applied (for bespoke positioning)
        simulation
            .force("charge",    d3.forceManyBody().strength(500))                             
            .force("collide",   d3.forceCollide((d,i) => visData.nodeRadiusArray[i] * settings.forceRadiusFactor*1.05))                                      
            .force("x",         d3.forceX( d => d.customX * width )
                                .strength(0.5))
            .force("y",         d3.forceY( d =>  (1 - d.customY) * height)
                                .strength(0.5))
            .force("link",      d3.forceLink().strength(10))   
            .alpha(0.75)
            .restart();

        // 2. Add node image to the centerNode 
        const nodeRadius = d3.select('#node_'+visData.centerNodeID).attr('r'),
            scalingFactor = 0.7
        const iconGroup = d3.select('#nodeImage_'+visData.centerNodeID).append('g')
                             .attr('transform' ,'translate(-'+(nodeRadius * scalingFactor)+' , -'+(nodeRadius * scalingFactor)+')' ),
            iconSVG = iconGroup.append('svg')
                        .classed('centralNode', true)
                        .attr('viewBox', '0 0 100 100')
                        .attr('width', nodeRadius*2 *scalingFactor)
                        .attr('height', nodeRadius*2* scalingFactor)
                        
        // Append the paths ()
        iconSVG.append('path').attr('d', "M46.704 7.505c.798 4.876-2.501 9.475-7.372 10.278-4.883.798-9.487-2.501-10.285-7.378C28.249 5.522 31.548.918 36.431.12c4.87-.803 9.487 2.502 10.273 7.385z")
        iconSVG.append('path').attr('d', "M43.912 42.976l7.916 12.654a3.904 3.904 0 0 0 5.269 1.287 3.89 3.89 0 0 0 1.427-5.228l-2.007-3.638c-1.74-3.106-3.444-6.224-5.172-9.342l-3.542-6.412c-.398-.731-.797-1.565-1.22-2.447-2.176-4.562-5.572-11.608-13.004-10.961-6.357.55-12.811 3.571-19.167 8.974C6.87 33.803 1.613 42.419 1.395 42.788a22.33 22.33 0 0 0-.665 1.13c-.012.018-.024.03-.036.042v.006C-.007 45.295-.358 46.51.525 48.05a3.886 3.886 0 0 0 3.384 1.977c1.692 0 2.562-.798 3.396-2.019.012-.006.012-.018.024-.03.229-.344.459-.725.713-1.118.048-.078 4.459-7.154 11.288-12.979 2.103-1.65 4.109-2.786 5.994-3.414l-1.522 18.418c-.145 1.825-.725 4.967-1.221 6.726l-3.42 12.001c-.447 1.517-1.74 4.03-2.743 5.264L7.172 84.338C6 85.794 4.67 87.444 5.77 89.728a3.878 3.878 0 0 0 3.505 2.206c1.789 0 2.755-1.033 3.976-2.345l9.366-10.104c1.668-1.801 3.843-4.937 4.919-7.148l4.653-9.457 17.186 28.885c.846 1.426 1.91 3.196 4.242 3.196 1.33 0 2.562-.683 3.275-1.795 1.221-1.897.411-3.649-.302-5.196L42.691 57.781c-.544-1.185-.846-3.602-.617-4.889l1.838-9.916z")
        iconSVG.append('path').attr('d', "M58.48 74.41h20.825v6.188l20.696-11.953-20.696-11.952v6.187H58.48z")
    }; // end customView()


///////////////////////////////////////////////////////////////////////////
////////   OVERRIDE USER SETTINGS FROM GOOGLE SHEET SETTINGS    ///////////
///////////////////////////////////////////////////////////////////////////

	function updateSettings(data){				
		let settingsKeys = Object.keys(settings)
		for(let i = 0; i < settingsKeys.length; i++){
			for(let j = 0 ; j < data.length; j++){
				if(data[j]['settingName'] === settingsKeys[i]){
					settings[settingsKeys[i]] = !isNaN(+data[j]['setting']) ? +data[j]['setting'] : data[j]['setting']
					console.log('Replacing '+settingsKeys[i]+' with user setting of '+data[j]['setting'] )
				}
			}
		}				
	} // end updateSettings()


///////////////////////////////////////////////////////////////////////////
///////////  INITIALISATION FUNCTION WITH CALLBACK STRUCTURE   ////////////
///////////////////////////////////////////////////////////////////////////

	// Invoke Initialisation function to load data and render visualisation
	(function init(){
		renderFromGS()		// Pull system data from a Google Sheet template
	}()) // end init()


	// GET NETWORK DATA: pull the Google Sheets data onload (i.e. the initiation function)
	// *** IMPORTANT: NODES AND LINK IDS ARE ASSUMED TO BE CONSECUTIVE NUMBERED STARTING FROM 1 (i.e. matching Kumu.io table output) ***
    function renderFromGS(){
        setStartView()
		Tabletop.init(
			{key: dataURL,
			    callback: function(d){
			    	// updateSettings(d.settings.elements)
			    	parseData(d.nodes.elements, d.links.elements, d.loops.elements, d.info.elements, d.loopScenarios.elements,  d.settings.elements,			// Parse data to node-link layout format and text information (headers etc.)
			    		function(){constructGraphData(rawData.nodeData, rawData.connectionData, 					// Includes callback to construct graphData after data is parsed
			    			function(){renderVis(visData.networkData, 												// with another callback to Render vis to canvas using constructed network data
			    				function(){createLoopData(rawData.loopData, rawData.loopScenario)}, 										// and final callback to process loop data
			    				function(){showIntro()}																// show intro options
			    			)}												
			    		)
			    	});									    							    																
			    	renderAnnotation(rawData.narrativeData);														// Separate call to renderAnnotation (which only requires narrativeData to parse)
			    	createNodeDirectionObj(rawData.nodeData)
			    },		    
			    simpleSheet: false,
			    wanted: ['nodes', 'links', 'loops', 'info',  'loopScenarios', 'settings'] 							// Specifies which Google sheet to bring in (and in what order)
		});
    	addSVGdefs()																								// Add the defs element for filters and markers to the SVG element							
	} // end renderFromGS()
