const Nightmare = require('nightmare');
const wat_action = require('wat_action_nightmare');
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

const dbUrl = `mongodb://${serverNames.mongoServerName}:27018/wat_storage`;
  
database.read_result_collection(dbUrl, (candi_result) => {
	console.log(candi_result.length);

	var i = 0;
    function f() {

        var final = gen_bugType(candi_result[i])
		// console.log(final);
		database.write_TI_step(dbUrl, final);

        i++;
        if( i < candi_result.length ){
            setTimeout( f, 100 );
        }
    }

    f(candi_result);	
})

function gen_bugType(result){
      var TF, IO, END;
	  var EndScenario;
	  
	  
	  switch (result.flag[0]) {
		case "TF":  TF = result.result[0]; break;
		case "IO":  IO = result.result[0]; break;
		case "END": END = result.result[0]; EndScenario = result.scenario[0]; break;
	  }
	
	  switch (result.flag[1]) {
		case "TF":  TF = result.result[1]; break;
		case "IO":  IO = result.result[1]; break;
		case "END": END = result.result[1]; EndScenario = result.scenario[1]; break;
	  }

	  switch (result.flag[2]) {
		case "TF":  TF = result.result[2]; break;
		case "IO":  IO = result.result[2]; break;
		case "END": END = result.result[2]; EndScenario = result.scenario[2]; break;
	  }
	  
    //  if (EndScenario == null) {
	// 	 // only one scenario
	// 	 // means all the scenarios are the same
	// 	 EndScenario= result.scenario[0];
	//  }

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
	 result.EndScenario = EndScenario;

	 return result;
} 




module.exports.gen_bugType = gen_bugType;