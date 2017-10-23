const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
var winston = require('winston');
var baseId = null;
var asyncLoop = require('node-async-loop');
var pmongo = require('promised-mongo');

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
					baseScenario.uid = new ObjectID("59b93998eb13c900013461ad");
					baseScenario.actions = scenario_base.actions;

					if (!baseScenario.wait) {
						baseScenario.wait = 0;
					}
					if (!baseScenario.cssselector) {
						baseScenario.cssselector = 'watId';
					}
					if (!baseScenario.name) {
						baseScenario.name = 'MyScenario';
					}
					if (!baseScenario.assert) {
						baseScenario.assert = {
							end: true,
							selector: 'body',
							property: 'innerHTML',
							contains: 'success'
						};
					}

					baseCollection.save(baseScenario)
						.then(() => {
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
					actionCollection.findOneAndReplace({ 'action': action }, actionItem, { upsert: true })
						.then((actionOne) => {
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


function write_final_action(dbUrl, result) {
	winston.info(`Save final result in ${dbUrl}`);
	MongoClient.connect(dbUrl)
		.then(db => {
			db.collection('result', (err, finalCollection) => {
				if (err) {
					winston.error(err);
					db.close();
				} else {

					// create new action item
					var finalItem = {};
					finalItem.aid = result.aid;
					finalItem.action = result.action;

					var newOne = null;
					switch (result.type) {
						case "FPCA": newOne = {
							$set: finalItem,
							$inc: { "FPCA": 1, "TPCA_OUT": 0, "TPCA_IN_TS": 0, "TPCA_IN_TF": 0 },
							$push: { "cid": result._id, "FPCA_Scenario": result.EndScenario }
						}; break;
						case "TPCA_OUT": newOne = {
							$set: finalItem,
							$inc: { "FPCA": 0, "TPCA_OUT": 1, "TPCA_IN_TS": 0, "TPCA_IN_TF": 0 },
							$push: { "cid": result._id, "TPCA_OUT_Scenario": result.EndScenario }
						}; break;
						case "TPCA_IN_TS": newOne = {
							$set: finalItem,
							$inc: { "FPCA": 0, "TPCA_OUT": 0, "TPCA_IN_TS": 1, "TPCA_IN_TF": 0 },
							$push: { "cid": result._id, "TPCA_IN_TS_Scenario": result.EndScenario }
						}; break;
						case "TPCA_IN_TF": newOne = {
							$set: finalItem,
							$inc: { "FPCA": 0, "TPCA_OUT": 0, "TPCA_IN_TS": 0, "TPCA_IN_TF": 1 },
							$push: { "cid": result._id, "TPCA_IN_TF_Scenario": result.EndScenario }
						}; break;
					}

					// console.log(newOne);
					// use findOneAndReplace to save unique action in action
					finalCollection.findOneAndReplace(
						{ 'aid': result.aid },
						newOne,
						{ upsert: true })
						.then((actionOne) => {
							winston.info("Success to save final action");
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

function initStepTable(dbUrl) {
	winston.info(`Initial Step in ${dbUrl}`);
	return new Promise((resolve, reject) => {

		MongoClient.connect(dbUrl)
			.then(db => {
				db.collection('action', (err, actionCollection) => {
					if (err) {
						winston.error(err);
						db.close();
					} else {

						actionCollection.find().toArray()
							.then(actionArray => {
								db.collection('step', (err, stepCollection) => {
									if (err) {
										winston.error(err);
										db.close();
									} else {

										var promiseList = [];

										for (var s = 0; s < actionArray.length; s++) {

											var stepItem = {};
											stepItem.aid = actionArray[s]._id;
											stepItem.action = actionArray[s].action;
											stepItem.FPCA = 0;
											stepItem.TPCA_OUT = 0;
											stepItem.TPCA_IN_TS = 0;
											stepItem.TPCA_IN_TF = 0;

											promiseList.push(
												stepCollection.findOneAndReplace(
													{ 'aid': stepItem.aid },
													stepItem,
													{ upsert: true })
											);

										}

										Promise.all(promiseList).then(() => {
											console.log("initial all step actions");
											db.close();
											resolve();
										})

									}
								})

							}).catch(err => {
								winston.info(err);
								db.close();
							});

					}
				})

			}).catch(err => {
				winston.info(err);
				reject();
			});

	})
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
					// console.log(scenario_noise.actions);
					if (!noiseScenario.wait) {
						noiseScenario.wait = 0;
					}
					if (!noiseScenario.cssselector) {
						noiseScenario.cssselector = 'watId';
					}
					if (!noiseScenario.name) {
						noiseScenario.name = 'MyScenario';
					}
					if (!noiseScenario.assert) {
						noiseScenario.assert = {
							end: true,
							selector: 'body',
							property: 'innerHTML',
							contains: 'success'
						};
					}

					noiseScenario.actions = scenario_noise.actions;
					noiseCollection.save(noiseScenario)
						.then(() => {
							winston.info("Success to save noise scenario " + flag);
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
							{ "action": can_set.actions[i] },
							{ "action": can_set.actions[i] },
							{ upsert: true, returnOriginal: false }

						)
							.then((actionOne) => {
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
													.then(() => {
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
			db.collection('candidate', { strict: true }, (err, candiCollection) => {
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

function read_result_collection(dbUrl, callback) {
	winston.info(`Read candidate result in ${dbUrl}`);
	MongoClient.connect(dbUrl)
		.then(db => {
			db.collection('candidate').aggregate([
				{
					$lookup: {
						from: "scenario",
						localField: "_id",
						foreignField: "cid",
						as: "scenario"
					}
				},

				{ $unwind: "$scenario" },
				{
					$lookup: {
						from: "run",
						localField: "scenario._id",
						foreignField: "sid",
						as: "run"
					}
				},
				{ $unwind: "$run" },
				{
					$group: {
						_id: "$_id",
						aid: { $addToSet: "$aid" },
						flag: { $push: "$scenario.flag" },
						result: { $push: "$run.isSuccess" },
						action: { $addToSet: "$action" },
						scenario: { $push: "$scenario.actions" }
					}
				},
				{ $unwind: "$aid" }
			], function (err, result) {
				callback(result);

				db.close();
			});



		}).catch(err => {
			winston.info(err);
		});
}


module.exports.write_base_scenario = write_base_scenario;
module.exports.write_base_action = write_base_action;
module.exports.write_noise_scenario = write_noise_scenario;
module.exports.write_candidate_action = write_candidate_action;
module.exports.read_candidate_collection = read_candidate_collection;
module.exports.read_result_collection = read_result_collection;
module.exports.write_final_action = write_final_action;
module.exports.initStepTable = initStepTable;