const Nightmare = require('nightmare');
const wat_action = require('wat-action');
const scenario_str = require('./base_scenario.json');
var scenario_base = new wat_action.Scenario(scenario_str);
var crawl_action = require('./crawl_action.js');
var fs = require('fs');
const argv = require('yargs').argv;
var database = require('./database.js');
var asyncLoop = require('node-async-loop');
var winston = require('winston');

const serverNames = {
	mongoServerName : argv.mongo
}

const dbUrl = `mongodb://${serverNames.mongoServerName}:27017/wat_storage`;


// 1. write base sceanrio into mongodb
database.write_base_scenario(dbUrl, scenario_base, (baseId) => {

	console.log(baseId);

	// 2. generate action for each base action
	asyncLoop(scenario_base.actions, function(action, next)
	{

		database.write_base_action(dbUrl, action, (aid) => {
			console.log(aid);
			next();
	    });
	
	}, function(err) {
		if (err) {
			console.log('Error: ' + err.message);
			return;
		}
	
		console.log('Finished');
	});




	// 3. generate candidate for each action
	var tests = [];
	for (var i = 0; i < scenario_base.actions.length; ++i) {
		tests.push(gen_candi_actions(baseId, i));
	}

	Promise.all(tests).then(function() {
		console.log("all the tests were executed");
	});

	// var j = 0;
	// asyncLoop(scenario_base.actions, function(action, next)
	// {

	// 	gen_candi_actions(baseId, j, ()=> {
	// 		j++;
	// 		next();
	// 	})
       
	// }, function(err) {
	// 	if (err) {
	// 		console.log('Error: ' + err.message);
	// 		return;
	// 	}
	
	// 	console.log('Finished');
	// });


});




function gen_candi_actions(baseId, index) {
	
	var nightmare = new Nightmare({show:true});				
	var scenario = new wat_action.Scenario(scenario_str);
	scenario.actions.splice(index+1,scenario_base.actions.length-index+1);	

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









