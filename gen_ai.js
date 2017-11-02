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
const updator = require('./update_res.js');

var safeStart = 6
var baseDelay = 1000;
var candidateDelay = 10000;
var scenarioDelay = 30000;
var loopMax = 2;

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
			return loopNum < loopMax;
		}, function () {
			// The function to run, should return a promise
			return new Promise(function (resolve, reject) {
				// Arbitrary 250ms async method to simulate async process
				setTimeout(function () {

					console.log("wait seconds to execute");
					gen_random_scenario(baseLength, loopNum).then(()=>{
						//finish loop
						console.log("===========finsish loop "+loopNum+"===================");
						loopNum++;
						resolve();
					});
										
				}, scenarioDelay);
			});
		});

	}).then(()=>{
		console.log("===========finish all steps===================");
	})
	
});






function gen_random_scenario(baseLength, loopNum) {

	let increaseLength, randomLocation;
	var sid_one_loop = [];
	
	return new Promise((resolve, reject)=>{

		console.log("===========step 3.1 loop "+loopNum+"===================");
		console.log("Done generate all actions");
		console.log("start to generate length for new scenario");
		
		var effectBaseLength = baseLength - safeStart;
		increaseLength = Math.round(Math.random() * effectBaseLength);
		while (increaseLength === 0) {
			increaseLength = Math.round(Math.random() * effectBaseLength);
		}
		console.log("increaseLength: " + increaseLength);

		return resolve();

	}).then(() => {
		console.log("===========step 3.2 loop "+loopNum+"===================");
		console.log("generate location for new scenario");

		var availablelist = numberArrayGenerator(safeStart, baseLength - 1);

		var allPermutation = Combinatorics.combination(availablelist, increaseLength).toArray();

		randomLocation = allPermutation[Math.floor(Math.random() * allPermutation.length)];
		console.log(randomLocation);


	}).then(() => {
		console.log("===========step 3.3 loop "+loopNum+"===================");
		console.log("generate probability for each actions");
		if (loopNum === 0) {
		    database.init_step(dbUrl);
		} 
		return calculator.calculatePro(dbUrl);
		
		
	}).then((pList)=>{
		console.log("===========step 3.4 loop "+loopNum+"===================");
		console.log("generate TF IO scenarios");
		return calculator.getNextScenarios(dbUrl, scenario_str, pList, randomLocation, "TFIO")
		
	}).then((sidList) => {
		console.log("===========step 3.5 loop "+loopNum+"===================");
		console.log("put all TF IO scenarios to play");
		sid_one_loop.push(sidList);
        console.log(sidList);
		return callPlayer.sendScenarioRequests(dbUrl, sidList);
	}).then((ti_id_list) => {
		console.log("===========step 3.6 loop "+loopNum+"===================");
		console.log("Wait until all TF IO runs finish");
		console.log(ti_id_list);
		return callPlayer.waitAllRuns(dbUrl, ti_id_list);
	}).then((runTI)=>{
		console.log("===========step 3.7 loop "+loopNum+"===================");
		console.log("generate END scenarios");
		return calculator.getNextScenarios(dbUrl, scenario_str, runTI, randomLocation, "END")
		
	}).then((sidList) => {
		console.log("===========step 3.8 loop "+loopNum+"===================");
	
		if (sidList.length === 0) {
			console.log("No END scenario to play");
			return sidList;
		} else {
			console.log("put all END scenarios to play");
			sid_one_loop.push(sidList);
			return callPlayer.sendScenarioRequests(dbUrl,  sidList);
		}
	}).then((end_id_list) => {
		console.log("===========step 3.9 loop "+loopNum+"===================");
		console.log("Wait until all END runs finish");
		console.log(end_id_list);

		if (end_id_list.length === 0) {
			console.log("No END scenario to wait");	
		} else {
			return callPlayer.waitAllRuns(dbUrl, end_id_list);
		}
	}).then(() => {
		console.log("===========step 3.10 loop "+loopNum+"===================");
		console.log("update all runs results");
		updator.update_step(dbUrl, sid_one_loop);
		// console.log(data);
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

