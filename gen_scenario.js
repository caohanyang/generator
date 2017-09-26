const Nightmare = require('nightmare');
const wat_action = require('wat-action');
const scenario_str = require('./base_scenario.json');
var scenario_base = new wat_action.Scenario(scenario_str);
var crawl_action = require('./crawl_action.js');
var fs = require('fs');
const argv = require('yargs').argv;
var database = require('./database.js');

const serverNames = {
	mongoServerName : argv.mongo
}

const dbUrl = `mongodb://${serverNames.mongoServerName}:27017/wat_storage`;

database.read_candidate_collection(dbUrl, (candi_array) => {
    var tests = [];

    //generate 3 scenario for each candiate action
    for (var i = 0; i < candi_array.length; i++) {
        var candidate = candi_array[i];
        // 1. generate TF
        var aid = candidate.aid;
        var cid = candidate._id;
        console.log(cid);
        tests.push(gen_TF(candidate.action, aid, cid));
        tests.push(gen_IO(candidate.action, aid, cid));
        tests.push(gen_end(candidate.action, aid, cid));
        
    }

    Promise.all(tests).then(function() {
		console.log("all the tests were executed");
	});
})





function gen_TF(action, aid, cid){

    var scenario_base = new wat_action.Scenario(scenario_str);
    scenario_base.actions.splice(aid + 1,0, action);

    var addnoiseAction = scenario_base.actions.slice(0,aid + 2);

    var scenarioJson = JSON.stringify(addnoiseAction,null,2);

    // console.log(scenarioJson);
    
    var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));

    database.write_noise_scenario(dbUrl, scenario_noise, cid, "TF")
    
} 


function gen_IO(action, aid, cid){
   
      var scenario_base = new wat_action.Scenario(scenario_str);
      scenario_base.actions.splice(aid + 1,0, action);

      var addnoiseAction = scenario_base.actions.splice(0,aid + 3);
      var scenarioJson = JSON.stringify(addnoiseAction,null,2);
      
    //   console.log(scenarioJson);
      
      var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));
  
      database.write_noise_scenario(dbUrl, scenario_noise, cid, "IO")


} 

function gen_end(action, aid, cid){
    
       var scenario_base = new wat_action.Scenario(scenario_str);
       scenario_base.actions.splice(aid + 1,0, action);
 
       var scenarioJson = JSON.stringify(scenario_base.actions,null,2);
       
    //    console.log(scenarioJson);
       
       var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));
   
       database.write_noise_scenario(dbUrl, scenario_noise, cid, "END")
 
 
 } 




module.exports.gen_IO = gen_IO;
module.exports.gen_TF = gen_TF;
module.exports.gen_end = gen_end;