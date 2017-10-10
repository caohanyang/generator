const Nightmare = require('nightmare');
const wat_action = require('wat_action_nightmare');
const scenario_str = require('./baseScenario/pastebin.json');
var scenario_base = new wat_action.Scenario(scenario_str);
var crawl_action = require('./crawl_action.js');
var fs = require('fs');
const argv = require('yargs').argv;
var database = require('./database.js');
var asyncLoop = require('node-async-loop');
var winston = require('winston');
var safeStart = 6

const serverNames = {
	mongoServerName : argv.mongo
}

const dbUrl = `mongodb://${serverNames.mongoServerName}:27018/wat_storage`;


// 1. write base sceanrio into mongodb
database.write_base_scenario(dbUrl, scenario_base, (baseId) => {

	console.log(baseId);

	// 2. generate action for each base action	
	var i = 0;
    function f() {
		console.log( "start one action" );
		var action = scenario_base.actions[i];
        database.write_base_action(dbUrl, action, (aid) => {
			console.log(aid);
			
	    });

        i++;
        if( i < scenario_base.actions.length ){
            setTimeout( f, 1000 );
        }
    }

	f(scenario_base.actions);
	

	// // sleep 
	// wait.miliseconds(20*1000);

	// 3. generate candidate for each action
	var j = safeStart;
    function g() {

		gen_candi_actions(baseId, j)

        j++;
        if( j < scenario_base.actions.length - 1 ){
            setTimeout( g, 20000 );
        }
    }

	g(scenario_base.actions);

});




function gen_candi_actions(baseId, index) {
	
	var nightmare = new Nightmare({show:true});				
	var scenario = new wat_action.Scenario(scenario_str);
	// scenario.actions.split(index+1,scenario_base.actions.length-index+1);	
	var newActions = scenario.actions.slice(0,index+1);
	console.log("begin to crawl " + baseId + " " + index);
	scenario.actions = newActions;
	console.log(scenario.actions);

	scenario.attachTo(nightmare)
	.url()
	.end()
	.then((url) => {
		console.log(url);
		crawl_action.crawl(dbUrl, url, baseId, index);
	})
	.catch ( (e) => {
		winston.error(e);
	});

}









