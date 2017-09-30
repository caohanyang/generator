const Nightmare = require('nightmare');
const wat_action = require('wat-action');
const scenario_str = require('./base_scenario.json');
var scenario_base = new wat_action.Scenario(scenario_str);
var crawl_action = require('./crawl_action.js');
var fs = require('fs');
const argv = require('yargs').argv;
var database = require('./database.js');
var asyncLoop = require('node-async-loop');

const serverNames = {
	mongoServerName : argv.mongo
}

const dbUrl = `mongodb://${serverNames.mongoServerName}:27017/wat_storage`;
  
database.read_result_collection(dbUrl, (candi_result) => {
	console.log(candi_result.length);
    for (var i = 0; i < candi_result.length; i++) {
		var final = gen_bugType(candi_result[i])
		// console.log(final);
		database.write_final_action(dbUrl, final);
	}
})

function gen_bugType(result){
	  var TF = result.result[0];
	  var IO = result.result[1];
	  var END = result.result[2];
	  var type = null;

	  if (TF===false) {
		  type = "FPCA";
	  } else {
		  if (IO===true && END===false) {
			  type = "TPCA_IN_TF";
		  } else if (IO===true && END===true){
			  type = "TPCA_IN_TS";
		  } else if (IO===false) {
			  type = "TPCA_OUT"
		  }
	  }
	 result.type = type;

	 return result;
} 




module.exports.gen_bugType = gen_bugType;
