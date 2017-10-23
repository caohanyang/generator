const Nightmare = require('nightmare');
const wat_action = require('wat_action_nightmare');
const scenario_str = require('./baseScenario/pastebin.json');
const scenario_base = new wat_action.Scenario(scenario_str);
const numberArrayGenerator = require('number-array-generator');
const Combinatorics = require('js-combinatorics');
const fs = require('fs');
const Promise = require('bluebird');
const argv = require('yargs').argv;
const asyncLoop = require('node-async-loop');
const winston = require('winston');

const crawl_action = require('./crawl_action.js');
const callPlayer = require('./callPlayer.js');
const database = require('./database.js');
const calculator = require('./cal_probability.js');

var safeStart = 6
var baseDelay = 1000;
var candidateDelay = 10000;
var scenarioDelay = 30000;


const serverNames = {
	mongoServerName: argv.mongo
}

const dbUrl = `mongodb://${serverNames.mongoServerName}:27018/wat_storage`;


// 1. write base sceanrio into mongodb
database.write_base_scenario(dbUrl, scenario_base, (baseId) => {

	console.log(baseId);
	// 3. generate candidate for each action
	var can_num = safeStart;
	var baseLength = scenario_base.actions.length;

	// 2. generate base action
	gen_base_actions(scenario_base).then(() => {

		console.log("===========step 2 CANDIDATE ACTIONS===================");
		console.log("Done write base actions");
		console.log("start to generate candidate actions");

		candidateDelay = baseLength * 1000;

		// return synchronousLoop(function () {
		// 	// Condition for stopping
		// 	return can_num < baseLength - 1;
		// }, function () {
		// 	// The function to run, should return a promise
		// 	return new Promise(function (resolve, reject) {
		// 		// Arbitrary 250ms async method to simulate async process
		// 		setTimeout(function () {
		// 			can_num++;
		// 			// Print out the sum thus far to show progress
		// 			gen_candi_actions(baseId, can_num)

		// 			resolve();
		// 		}, candidateDelay);
		// 	});
		// });

	}).then((scenario_base)=> {
		console.log("===========step 3 LOOP===================");
		console.log("Loop to generate scenarios");
		var loopNum = 0;
		return synchronousLoop(function () {
			// Condition for stopping
			return loopNum < 3;
		}, function () {
			// The function to run, should return a promise
			return new Promise(function (resolve, reject) {
				// Arbitrary 250ms async method to simulate async process
				setTimeout(function () {

					loopNum++;
					console.log("wait seconds to execute");
					gen_random_scenario(scenario_base, baseLength, loopNum).then(()=>{
						//finish loop
						console.log("===========finsish loop "+loopNum+"===================");
						resolve();
					});
					
				}, scenarioDelay);
			});
		});

	}).then(()=>{
		console.log("===========finish all steps===================");
	})
	
});


function gen_random_scenario(scenario_base, baseLength, loopNum) {

	return new Promise((resolve, reject)=>{

		console.log("===========step 3.1 loop "+loopNum+"===================");
		console.log("Done generate all actions");
		console.log("start to generate length for new scenario");
		
		var effectBaseLength = baseLength - safeStart;
		var increaseLength = Math.round(Math.random() * effectBaseLength);
		while (increaseLength === 0) {
			increaseLength = Math.round(Math.random() * effectBaseLength);
		}
		console.log("increaseLength: " + increaseLength);

		return resolve(increaseLength);

	}).then((increaseLength) => {
		console.log("===========step 3.2 loop "+loopNum+"===================");
		console.log("generate location for new scenario");

		var availablelist = numberArrayGenerator(safeStart, baseLength - 1);

		var allPermutation = Combinatorics.combination(availablelist, increaseLength).toArray();

		var randomLocation = allPermutation[Math.floor(Math.random() * allPermutation.length)];
		console.log(randomLocation);


	}).then(() => {
		console.log("===========step 3.3 loop "+loopNum+"===================");
		console.log("generate probability for each actions");
		if (loopNum === 0) {
		    return database.initStepTable(dbUrl);
		} else {
			return calculator.calculatePro(dbUrl);
		}
		
	}).then((pList)=>{
		console.log("===========step 3.4 loop "+loopNum+"===================");
		console.log("generate test scenarios");
		console.log(pList);
	}).then(() => {
		console.log("===========step 3.5 loop "+loopNum+"===================");
		console.log("put all pre_scenarios to play");

		return callPlayer.sendScenarioRequests(dbUrl);
	}).then((scenarioIdList) => {
		console.log("===========step 3.6 loop "+loopNum+"===================");
		console.log("Wait until all the runs finish");
		console.log(scenarioIdList);
		return callPlayer.waitAllRuns(dbUrl, scenarioIdList);
	}).then((data) => {
		console.log("===========step 3.7 loop "+loopNum+"===================");
		console.log("handle all runs results");
		console.log(data);
	})
}


function gen_base_actions(scenario_base) {

	console.log("===========step 1 BASE ACTIONS===================");
	console.log("generate actions for base scenario ");

	// And below is a sample usage of this promiseWhile function
	var sum = 0,
		stop = scenario_base.actions.length;

	return synchronousLoop(function () {
		// Condition for stopping
		return sum < stop;
	}, function () {
		// The function to run, should return a promise
		return new Promise(function (resolve, reject) {
			// Arbitrary 250ms async method to simulate async process
			setTimeout(function () {
				sum++;
				// Print out the sum thus far to show progress
				console.log("start to write base action");
				var action = scenario_base.actions[sum];
				database.write_base_action(dbUrl, action, (aid) => {
					console.log(aid);

				});

				resolve();
			}, baseDelay);
		});

	});

}



function gen_candi_actions(baseId, index) {

	var nightmare = new Nightmare({ show: true });
	var scenario = new wat_action.Scenario(scenario_str);
	// scenario.actions.split(index+1,scenario_base.actions.length-index+1);	
	var newActions = scenario.actions.slice(0, index + 1);
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
		.catch((e) => {
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
		for (let index = 0; index < actions.length; index++) {
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


function synchronousLoop(condition, action) {
	var resolver = Promise.defer();

	var loop = function () {
		if (!condition()) return resolver.resolve();
		return Promise.cast(action())
			.then(loop)
			.catch(resolver.reject);
	};

	process.nextTick(loop);

	return resolver.promise;
};

