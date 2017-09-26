
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var winston = require('winston');
var baseId = null;

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
					}).catch(err => {
						winston.error(err);
					})
			}
		});

        db.close();

	}).catch(err => {
		winston.info(err);
	});
}



function write_candidate_action(dbUrl, baseId, index, scenario) {
	winston.info(`Save candidate action in ${dbUrl}`);
	MongoClient.connect(dbUrl)
	.then(db => {
		db.collection('candidate', (err, candidateCollection) => {
			if (err) {
				winston.error(err);
				db.close();
			} else {
                //save every candidate action into candidate
                for (var i = 0; i < scenario.actions.length; i++) {
                    var can_action = {};
                    can_action._id = ObjectID();
                    can_action.bid = baseId;
                    can_action.aid = index;
                    can_action.action = scenario.actions[i];

                    candidateCollection.save(can_action)
                        .then(()=> {
                            winston.info("Success to save candidate action");
                        }).catch(err => {
                            winston.error(err);
                        });
                }
				
			}
		});

        db.close();

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
module.exports.write_noise_scenario=write_noise_scenario;
module.exports.write_candidate_action=write_candidate_action;
module.exports.read_candidate_collection=read_candidate_collection;