const scenario_str = require('./click.json');
// const scenario_str = require('./createProject.json');
// const scenario_str = require('./addManagerToTeam.json');

// const scenario_str = require('./createTeam.json');



// const scenario_str = require('./baseLogin.json');
// const scenario_str = require('./baseLogout.json');
// const scenario_str = require('./selectPeriod.json');
// const scenario_str = require('./deleteProject.json');
// const scenario_str = require('./click.json');
// const scenario_str = require('./selectoption.json');



const Nightmare = require('nightmare');	
const nightmare = new Nightmare({show:true});
const wat_action = require('wat_action_nightmare');
var scenario = new wat_action.Scenario(scenario_str);
test();
function test(){

	scenario.wait = 1000;

	console.log(scenario);
	const wat_actions = createWATScenario(scenario);
	const wat_scenario = new wat_action.Scenario(wat_actions);

	wat_scenario.attachTo(nightmare)
	.evaluate(function () {
		return document;
	})
	.end()
		.then((doc) => {
	})
	.catch ( (e) => {
		console.log(e);
	});

}

function createWATScenario(scenario) {
	var wait = scenario.wait || 0;
	var cssSelector = scenario.cssselector || 'watId';
	var actions = [];
	// winston.info(cssSelector);
	scenario.actions.forEach((action) => {
		var watAction = {
			type: action.type
		};
		watAction.url = action.url || undefined;
		watAction.text = action.text || undefined;
		if (action.selector) {
			watAction.selector = action.selector[cssSelector];
			if (actions.length
			&& action.type === 'TypeAction'
			&& actions[actions.length - 1].type === 'TypeAction'
			&& actions[actions.length - 1].selector === action.selector[cssSelector]) {
				actions.pop();
			}
		}
		actions.push(watAction);
	});

	if (wait > 0) {
		var actionsWithWait = [];
		for (let index = 0; index < actions.length ; index++) {
			actionsWithWait.push(actions[index]);
			actionsWithWait.push({
				type: 'WaitAction',
				ms: Number(wait)
			});
		}
		return actionsWithWait;
	} else {
		return actions;
	}
}