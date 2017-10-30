const Nightmare = require('nightmare');
const wat_action = require('wat_action_nightmare');
const scenario_str = require('./base_scenario.json');
var scenario_base = new wat_action.Scenario(scenario_str);
var crawl_action = require('./crawl_action.js');
var fs = require('fs');
const argv = require('yargs').argv;
var database = require('./database.js');
var asyncLoop = require('node-async-loop');


function updateStep(dbUrl) {

	database.read_step_collection(dbUrl, (step_result) => {
		console.log(step_result.length);

		let step_num = 0;

		return synchronousLoop(function () {
			// Condition for stopping
			return step_num < step_result.length;
		}, function () {
			// The function to run, should return a promise
			return new Promise(function (resolve, reject) {
				// Arbitrary 250ms async method to simulate async process
				setTimeout(function () {

					var final = gen_bugType(step_result[step_num])
					console.log(final);
					database.write_update_step(dbUrl, final).then(() => {
						resolve();
						step_num++;
					});

				}, 1000);
			});
		})

	})

}



function gen_bugType(result) {
	var TF, IO, END;
	var EndScenario;


	switch (result.flag[0]) {
		case "TF": TF = result.result[0]; break;
		case "IO": IO = result.result[0]; break;
		case "END": END = result.result[0]; EndScenario = result.scenario[0]; break;
	}

	switch (result.flag[1]) {
		case "TF": TF = result.result[1]; break;
		case "IO": IO = result.result[1]; break;
		case "END": END = result.result[1]; EndScenario = result.scenario[1]; break;
	}

	switch (result.flag[2]) {
		case "TF": TF = result.result[2]; break;
		case "IO": IO = result.result[2]; break;
		case "END": END = result.result[2]; EndScenario = result.scenario[2]; break;
	}

	//  if (EndScenario == null) {
	// 	 // only one scenario
	// 	 // means all the scenarios are the same
	// 	 EndScenario= result.scenario[0];
	//  }

	var type = null;

	if (TF === false) {
		type = "FPCA";
	} else {
		if (IO === true && END === false) {
			type = "TPCA_IN_TF";
		} else if (IO === true && END === true) {
			type = "TPCA_IN_TS";
		} else if (IO === false) {
			type = "TPCA_OUT"
		}
	}
	result.type = type;
	result.EndScenario = EndScenario;

	return result;
}


module.exports.gen_bugType = gen_bugType;
module.exports.updateStep = updateStep;
