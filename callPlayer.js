const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const request = require('request');
var pmongo = require('promised-mongo');
const Promise = require('bluebird');
const argv = require('yargs').argv;
const ObjectID = require('mongodb').ObjectID;
const serverNames = {
	mongoServerName: argv.mongo
}
var runWait = 5000;

function sendScenarioRequests(dbUrl) {
	winston.info(`Play Now Request on ${dbUrl}`);

	return new Promise(function (resolve, reject) {
		var db = pmongo(dbUrl);
		var scenarioIdList = [];
		db.scenario.find().toArray().then(function (founds) {
			// docs is an array of all the documents in mycollection 
			var req_num = 0;

			return synchronousLoop(function () {
				// Condition for stopping
				return req_num < founds.length;
			}, function () {
				// The function to run, should return a promise
				return new Promise(function (resolve, reject) {
					// Arbitrary 250ms async method to simulate async process
					setTimeout(function () {

						var obj = founds[req_num];
						console.log(obj._id);

						request('http://localhost:8090/playNow/' + obj._id, function (error, response, body) {
							if (!error) {
								console.log("body" + body);
								scenarioIdList.push(obj._id);
								resolve(obj._id);
							}
						});
						req_num++;

					}, 1000);
				});
			});

		}).then(() => {
			console.log("finish send all requests");
			// console.log(scenarioIdList);
			db.close();
			resolve(scenarioIdList);
		});

	})
}


function waitAllRuns(dbUrl, scenarioIdList) {
	winston.info(`Play Now Request on ${dbUrl}`);

	return new Promise(function (resolve, reject) {
		var db = pmongo(dbUrl);

		// generate object id list
		var objectIdList = [];
		for (var i = 0; i < scenarioIdList.length; i++) {
			objectIdList.push(new ObjectID(scenarioIdList[i]));
		}


		var run_num = 0;
		var runs;
		return synchronousLoop(function () {
			// Condition for stopping
			console.log("run_num: "+run_num);
			return run_num < objectIdList.length;
		}, function () {
			// The function to run, should return a promise
			return new Promise(function (resolve, reject) {

				// Arbitrary 5000ms async method to simulate async process
				setTimeout(function () {

					// get first elements for ids in objectIdList
					db.run.aggregate(
						{
							$match:
							{ 'sid': { $in: objectIdList } }
						},
						{
							$group:
							{
								_id: "$sid",
								uid: { $first: "$uid" },
								isSuccess: { $first: "$isSuccess" },
								read: { $first: "$read" },
								date: { $first: "$date" }
							}
						}
					)
					.then(function (founds) {
						// docs is an array of all the documents in mycollection 
						console.log("find " + founds.length + " runs.");
						console.log(founds);

						run_num = founds.length;
						runs = founds;
						db.close();
						resolve();
					}).catch(() => {
						console.log("not yet find all runs");
						run_num = 0;
						reject("not yet find all runs");
						db.close();
					})

				}, runWait);
			});
		}).then(() => {
			console.log("finish run now");

			resolve(runs);
		});;


	})
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


module.exports.sendScenarioRequests = sendScenarioRequests;
module.exports.waitAllRuns = waitAllRuns;