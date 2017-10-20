const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const request = require('request');
var pmongo = require('promised-mongo');
const Promise = require('bluebird');
const argv = require('yargs').argv;
const serverNames = {
	mongoServerName: argv.mongo
}
const dbUrl = `mongodb://${serverNames.mongoServerName}:27018/wat_storage`;


function playBaseScenarios(dbUrl) {
	winston.info(`Play Now Request on ${dbUrl}`);

	return new Promise(function (resolve, reject) {
		var db = pmongo(dbUrl);
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
								resolve();
							}
						});
						req_num++;

						console.log("111111")

					}, 1000);
				});
			});
		}).then(() => {
			console.log("ffffff");
			db.close();
			resolve();
		});

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


module.exports.playBaseScenarios = playBaseScenarios;