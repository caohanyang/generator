const Nightmare = require('nightmare');
const wat_action = require('wat_action_nightmare');
const scenario_str = require('./baseScenario/pastebin.json');
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

  
database.read_candidate_collection(dbUrl, (candi_array) => {
 
    var i = 0;
    function f() {
        console.log( "start one candidate" );
        var candidate = candi_array[i];
        var abid = candidate.abid;
        var cid = candidate._id; 
        
        gen_TF(candidate.action, abid, cid);
        gen_IO(candidate.action, abid, cid);
        gen_end(candidate.action, abid, cid);

        i++;
        if( i < candi_array.length ){
            setTimeout( f, 100 );
        }
    }

    f(candi_array);
    
})

function gen_TF(action, abid, cid){

    var scenario_base = new wat_action.Scenario(scenario_str);
    scenario_base.actions.splice(abid + 1,0, action);

    var addnoiseAction = scenario_base.actions.slice(0,abid + 2);

    var scenarioJson = JSON.stringify(addnoiseAction,null,2);

    // console.log(scenarioJson);
    
    var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));

    database.write_noise_scenario(dbUrl, scenario_noise, cid, "TF")
   
} 


function gen_IO(action, abid, cid){
   
      var scenario_base = new wat_action.Scenario(scenario_str);
      scenario_base.actions.splice(abid + 1,0, action);

      var addnoiseAction = scenario_base.actions.splice(0,abid + 3);
      var scenarioJson = JSON.stringify(addnoiseAction,null,2);
      
    //   console.log(scenarioJson);
      
      var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));
  
      database.write_noise_scenario(dbUrl, scenario_noise, cid, "IO")
      
} 

function gen_end(action, abid, cid, callback){
    
       var scenario_base = new wat_action.Scenario(scenario_str);
       scenario_base.actions.splice(abid + 1,0, action);
 
       var scenarioJson = JSON.stringify(scenario_base.actions,null,2);
       
    //    console.log(scenarioJson);
       
       var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));
   
       database.write_noise_scenario(dbUrl, scenario_noise, cid, "END")
     
 } 




module.exports.gen_IO = gen_IO;
module.exports.gen_TF = gen_TF;
module.exports.gen_end = gen_end;