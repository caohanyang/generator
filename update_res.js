const Nightmare = require('nightmare');
const wat_action = require('wat_action_nightmare');
const scenario_str = require('./base_scenario.json');
var scenario_base = new wat_action.Scenario(scenario_str);
var crawl_action = require('./crawl_action.js');
var fs = require('fs');
const argv = require('yargs').argv;
var database = require('./database.js');
var asyncLoop = require('node-async-loop');


function update_TFIO_step(dbUrl, TIruns) {
    
	

	var step_num = 0;

	return synchronousLoop(function () {
			// Condition for stopping
			return step_num < TIruns.length;
		}, function () {
			// The function to run, should return a promise
			return new Promise(function (resolve, reject) {
				// Arbitrary 250ms async method to simulate async process
				setTimeout(function () {

					// Print out the sum thus far to show progress
					var final = gen_bugType_TI(TIruns[i]);

					if (final.type !== null) {
						database.write_TI_step(dbUrl, final);
					}
					
					step_num++;
					resolve();
				}, 100);
			});
		});

}


function gen_bugType_TI(result) {
	var TF, IO;

	switch (result.flag[0]) {
		case "TF": TF = result.result[0]; break;
		case "IO": IO = result.result[0]; break;
	}

	switch (result.flag[1]) {
		case "TF": TF = result.result[1]; break;
		case "IO": IO = result.result[1]; break;
	}

	var type = null;

	if (TF === false) {
		type = "FPCA";
	} else {
		if (IO === false) {
			type = "TPCA_OUT"
		}
	}
	result.type = type;

	return result;
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



module.exports.gen_bugType_TI = gen_bugType_TI;
module.exports.update_step = update_step;
