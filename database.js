
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var winston = require('winston');
var baseId = null;
var asyncLoop = require('node-async-loop');

function write_base_scenario(dbUrl, scenario_base, callback) {
	winston.info(`Save base scenario in ${dbUrl}`);
	MongoClient.connect(dbUrl)
	.then(db => {
		db.collection('base', (err, baseCollection) => {
			if (err) {
				winston.error(err);
				db.close();
			} else {

				var baseScenario = {};
                baseScenario._id = ObjectID();
                baseId = baseScenario._id;
                // console.log(baseId);
				//set user id
				baseScenario.uid = new ObjectID("59c23b3d9b77e0b2e2bc9f12");
				baseScenario.actions = scenario_base.actions;
				baseCollection.save(baseScenario)
				    .then(()=> {
						winston.info("Success to save base scenario");
					}).catch(err => {
						winston.error(err);
					})
			}
		});

        db.close();
        callback(baseId);

	}).catch(err => {
		winston.info(err);
	});
}

function write_base_action(dbUrl, action, callback) {
	winston.info(`Save base action in ${dbUrl}`);
	MongoClient.connect(dbUrl)
	.then(db => {
		db.collection('action', (err, actionCollection) => {
			if (err) {
				winston.error(err);
				// db.close();
			} else {

				// create new action item
				var actionItem = {};
				actionItem.action = action;

				// use findOneAndReplace to save unique action in action
				actionCollection.findOneAndReplace({'action':action},actionItem,{upsert:true})
					.then((actionOne)=> {
						winston.info("Success to save base action");
						if (actionOne.value !== null) {
							callback(actionOne.value._id);
						} else {
							callback(actionOne.lastErrorObject.upserted)
						}

						db.close();
					}).catch(err => {
						winston.error(err);
					})

			}
		});
        
	}).catch(err => {
		winston.info(err);
	});
}


function write_noise_scenario(dbUrl, scenario_noise, cid, flag) {
	winston.info(`Save noise scenario in ${dbUrl}`);
	MongoClient.connect(dbUrl)
	.then(db => {
		db.collection('scenario', (err, noiseCollection) => {
			if (err) {
				winston.error(err);
				db.close();
			} else {
      
				var noiseScenario = {};
                noiseScenario._id = ObjectID();
                noiseScenario.cid = cid;
                noiseScenario.flag = flag;
				//set user id
				noiseScenario.actions = scenario_noise.actions;
				noiseCollection.save(noiseScenario)
				    .then(()=> {
						winston.info("Success to save noise scenario");
						db.close();
					}).catch(err => {
						winston.error(err);
						db.close();
					})
			}
		});

       
	}).catch(err => {
		winston.info(err);
	});
}



function write_candidate_action(dbUrl, baseId, index, can_set) {
	winston.info(`Save candidate action in ${dbUrl}, ${baseId}, ${index}, ${can_set.actions.length}`);

	MongoClient.connect(dbUrl)
	.then(db => {
		db.collection('action', (err, actionCollection) => {
			if (err) {
				winston.error(err);
			    db.close();
			} else {

				// var tests = [];
				for (var i = 0; i < can_set.actions.length; ++i) {

					// use findOneAndReplace to save unique action in action
					actionCollection.findOneAndReplace(
						{"action": can_set.actions[i]},
						{"action": can_set.actions[i]},
						{upsert : true, returnOriginal: false}
						
				    )
					.then((actionOne)=> {
						winston.info("Success to save candidate into action table");

						// create new action item
						var actionItem = null;
						var aid = null;		

						if (actionOne.value !== null) {
							// exist one
							aid = actionOne.value._id;
							actionItem = actionOne.value.action;
						} else {
							// add new one
							aid = actionOne.lastErrorObject.upserted;
							actionItem = actionOne.value.action;
						}

						MongoClient.connect(dbUrl)
						.then(db => {
							db.collection('candidate', (err, candidateCollection) => {
								if (err) {
									winston.error(err);
									db.close();
								} else {

									//save every candidate action into candidate
										var can_action = {};
										can_action._id = ObjectID();
										can_action.bid = baseId;
										can_action.abid = index;
										can_action.aid = aid;
										can_action.action = actionItem;
										
										// console.log(can_action);
										candidateCollection.save(can_action)
											.then(()=> {
												winston.info("Success to save candidate action");
											}).catch(err => {
												winston.error(err);
											});
		
								}
							});
					
							db.close();
					
						}).catch(err => {
							winston.info(err);
						});


					}).catch(err => {
						winston.error(err);
					})

					
				}
							
				db.close();
			}
		});
        
	}).catch(err => {
		winston.info(err);
	});

}


function read_candidate_collection(dbUrl, callback) {
	winston.info(`Read candidate collection in ${dbUrl}`);
	MongoClient.connect(dbUrl)
	.then(db => {
		db.collection('candidate', {strict:true}, (err, candiCollection) => {
            if (err) {
                winston.error(err);
                db.close();
            } else {
                candiCollection.find().toArray()
                    .then(candiArray => {     
                        db.close();
                        callback(candiArray);
                    })
                    .catch(err => {
                        db.close();
                    });
            }
        });

    

	}).catch(err => {
		winston.info(err);
	});
}

module.exports.write_base_scenario=write_base_scenario;
module.exports.write_base_action=write_base_action;
module.exports.write_noise_scenario=write_noise_scenario;
module.exports.write_candidate_action=write_candidate_action;
module.exports.read_candidate_collection=read_candidate_collection;