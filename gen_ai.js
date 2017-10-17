const Nightmare = require('nightmare');
const wat_action = require('wat_action_nightmare');
const scenario_str = require('./baseScenario/pastebin.json');
var scenario_base = new wat_action.Scenario(scenario_str);
var crawl_action = require('./crawl_action.js');
var fs = require('fs');
var Promise = require('bluebird');
const argv = require('yargs').argv;
var database = require('./database.js');
var asyncLoop = require('node-async-loop');
var winston = require('winston');
var safeStart = 6
var baseDelay = 1000;
var scenarioDelay = 10000;

const serverNames = {
	mongoServerName : argv.mongo
}

const dbUrl = `mongodb://${serverNames.mongoServerName}:27017/wat_storage`;


// 1. write base sceanrio into mongodb
database.write_base_scenario(dbUrl, scenario_base, (baseId) => {

	console.log(baseId);

	// 2. generate base action
	gen_base_actions(scenario_base).then(()=>{

		// 3. generate candidate for each action
		var can_num = safeStart;
		scenarioDelay = scenario_base.actions.length * 1000;

		return synchronousLoop(function() {
			// Condition for stopping
			return can_num < scenario_base.actions.length - 1;
		}, function() {
			// The function to run, should return a promise
			return new Promise(function(resolve, reject) {
				// Arbitrary 250ms async method to simulate async process
				setTimeout(function() {
					can_num++;
					// Print out the sum thus far to show progress
					gen_candi_actions(baseId, can_num)
		
					resolve();
				}, scenarioDelay);
			});
		}).then(function() {
			console.log("===========step 2===================");
			console.log("Done candidate actions");
		});

	}).then(function() {
		console.log("===========step 3===================");
		console.log("Done generate all actions");
		console.log("try to generate length");
	});
	

});


function synchronousLoop(condition, action) {
	var resolver = Promise.defer();

	var loop = function() {
		if (!condition()) return resolver.resolve();
		return Promise.cast(action())
			.then(loop)
			.catch(resolver.reject);
	};

	process.nextTick(loop);

	return resolver.promise;
};

function gen_base_actions(scenario_base) {
	

	// And below is a sample usage of this promiseWhile function
	var sum = 0,
		stop = scenario_base.actions.length;
	
	return synchronousLoop(function() {
		// Condition for stopping
		return sum < stop;
	}, function() {
		// The function to run, should return a promise
		return new Promise(function(resolve, reject) {
			// Arbitrary 250ms async method to simulate async process
			setTimeout(function() {
				sum++;
				// Print out the sum thus far to show progress
				console.log( "start one action" );
				var action = scenario_base.actions[sum];
				database.write_base_action(dbUrl, action, (aid) => {
					console.log(aid);
					
				});
	
				resolve();
			}, baseDelay);
		});
	}).then(function() {
		console.log("===========step 1===================");
		console.log("Done base scenario actions");
	});

}



function gen_candi_actions(baseId, index) {
	
	var nightmare = new Nightmare({show:true});				
	var scenario = new wat_action.Scenario(scenario_str);
	// scenario.actions.split(index+1,scenario_base.actions.length-index+1);	
	var newActions = scenario.actions.slice(0,index+1);
	console.log("begin to crawl " + baseId + " " + index);
	scenario.actions = newActions;
	console.log(scenario.actions);

	const wat_actions = createWATScenario(scenario);
	const wat_scenario = new wat_action.Scenario(wat_actions);

	wat_scenario.attachTo(nightmare)
	.url()
	.end()
	.then((url) => {
		console.log(url);
		crawl_action.crawl(dbUrl, url, baseId, index);
	})
	.catch ( (e) => {
		winston.error(e);
	});

}




function createWATScenario(scenario) {
	var wait = scenario.wait || 0;
	var cssSelector = scenario.cssselector || 'watId';
	var actions = [];
	winston.info(cssSelector);
	scenario.actions.forEach((action) => {
		var watAction = {
			type: action.type
		};
		watAction.url = action.url || undefined;
		watAction.text = action.text || undefined;
		if (action.selector) {
			watAction.selector = action.selector[cssSelector];
			if (actions.length
			&& action.type === 'TypeAction'
			&& actions[actions.length - 1].type === 'TypeAction'
			&& actions[actions.length - 1].selector === action.selector[cssSelector]) {
				actions.pop();
			}
		}
		actions.push(watAction);
	});

	if (wait > 0) {
		var actionsWithWait = [];
		for (let index = 0; index < actions.length ; index++) {
			actionsWithWait.push(actions[index]);
			actionsWithWait.push({
				type: 'WaitAction',
				ms: Number(wait)
			});
		}
		return actionsWithWait;
	} else {
		return actions;
	}
}




