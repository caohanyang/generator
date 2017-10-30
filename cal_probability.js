const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const wat_action = require('wat_action_nightmare');
const request = require('request');
const pmongo = require('promised-mongo');
const Promise = require('bluebird');
const argv = require('yargs').argv;
const ObjectID = require('mongodb').ObjectID;
const arrayShuffle = require('array-shuffle');
const database = require('./database.js');
const updator = require('./update_res.js');

function calculatePro(dbUrl) {
    winston.info(`Calculate probability Step table in ${dbUrl}`);
    return new Promise((resolve, reject) => {

        MongoClient.connect(dbUrl)
            .then(db => {
                db.collection('step', (err, stepCollection) => {
                    if (err) {
                        winston.error(err);
                        db.close();
                    } else {

                        stepCollection.find().toArray()
                            .then(stepArray => {

                                var N = stepArray.length;
                                var pList = [];
                                for (var s = 0; s < stepArray.length; s++) {

                                    var p = calculate(stepArray[s], N);
                                    stepArray[s].probability = p;
                                    pList.push(stepArray[s]);
                                }

                                resolve(pList);
                                db.close();
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


function getNextScenarios(dbUrl, scenario_str, runList, randomLocation, flag) {

    if (flag === "TFIO") {
        return getTFIOScenarios(dbUrl, scenario_str, runList, randomLocation);
    } else if (flag === "END") {
        return getENDScenarios(dbUrl, scenario_str, runList, randomLocation);
    }

}


function getENDScenarios(dbUrl, scenario_str, runList, randomLocation) {
    // first update TI step
    return updator.updateTIStep(dbUrl, runList).then((TIruns)=>{
        // 1. generate end scenario
        console.log(TIruns);
        var endList = findEndActions(TIruns);
        console.log(endList);
        // 2. update step
    });
    
}

function findEndActions(TIruns) {
    var endList = [];
    for (let i = 0; i< TIruns.length; i++) {
        if (TIruns[i].scenario.flag === "TF" | TIruns[i].scenario.flag === "IO") {
            if (TIruns[i].isSuccess === true) {
                endList.push(TIruns[i]);
            }
        }
    }
    return endList;
}


function getTFIOScenarios(dbUrl, scenario_str, runList, randomLocation) {
    var selectNum = randomLocation.length;

    // shuffle the array first
    // sort the pList according to the probability

    //get the top selectNumber 
    var aList = arrayShuffle(runList).sort(compare).splice(0, selectNum);

    let noise_num = 0;


    return new Promise((resolve, reject) => {
        var sidList = [];

        return synchronousLoop(function () {
            // Condition for stopping
            return noise_num < aList.length;
        }, function () {
            // The function to run, should return a promise
            return new Promise(function (resolve, reject) {
                // Arbitrary 250ms async method to simulate async process
                setTimeout(function () {

                    var promiseList = [];

                    promiseList.push(gen_TF(dbUrl, scenario_str, aList[noise_num].action, randomLocation[noise_num], aList[noise_num].aid).then((sid) => {
                        sidList.push(sid);
                    }));
                    promiseList.push(gen_IO(dbUrl, scenario_str, aList[noise_num].action, randomLocation[noise_num], aList[noise_num].aid).then((sid) => {
                        sidList.push(sid);
                    }));

                    Promise.all(promiseList).then(() => {
                        resolve();
                        console.log("finish generate scenarios for 1 action");
                        noise_num++;
                    })


                }, 2000);
            });
        }).then(()=>{
            console.log("finish TF IO scenarios ");
            //this is the resolve for upper promise
            resolve(sidList);
        })

    })
}

function calculate(stepItem, N) {

    var a = 1 / N;
    var b1 = -1;
    var b2 = -1 / (2 * N);
    var b3 = 1 / (2 * N);
    var b4 = 1 / (2 * N);

    var p = a + b1 * stepItem.FPCA + b2 * stepItem.TPCA_OUT + b3 * stepItem.TPCA_IN_TS + b4 * stepItem.TPCA_IN_TF;

    // console.log(a + " " + b1 + " " + b2 + " " + b3 + " " + b4 + " " + p);
    return p;
}

function gen_TF(dbUrl, scenario_str, action, abid, aid) {

    var scenario_base = new wat_action.Scenario(scenario_str);
    scenario_base.actions.splice(abid + 1, 0, action);

    var addnoiseAction = scenario_base.actions.slice(0, abid + 2);

    var scenarioJson = JSON.stringify(addnoiseAction, null, 2);

    // console.log(scenarioJson);

    var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));

    return database.write_noise_scenario(dbUrl, scenario_noise, aid, "TF")

}


function gen_IO(dbUrl, scenario_str, action, abid, aid) {

    var scenario_base = new wat_action.Scenario(scenario_str);
    scenario_base.actions.splice(abid + 1, 0, action);

    var addnoiseAction = scenario_base.actions.splice(0, abid + 3);
    var scenarioJson = JSON.stringify(addnoiseAction, null, 2);

    //   console.log(scenarioJson);

    var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));

    return database.write_noise_scenario(dbUrl, scenario_noise, aid, "IO")

}

function gen_end(dbUrl, scenario_str, action, abid, aid, callback) {

    var scenario_base = new wat_action.Scenario(scenario_str);
    scenario_base.actions.splice(abid + 1, 0, action);

    var scenarioJson = JSON.stringify(scenario_base.actions, null, 2);

    //    console.log(scenarioJson);

    var scenario_noise = new wat_action.Scenario(JSON.parse(scenarioJson));

    return database.write_noise_scenario(dbUrl, scenario_noise, aid, "END")

}


function synchronousLoop(condition, action) {
    var resolver = Promise.defer();

    var loop = function () {
        if (!condition()) return resolver.resolve();
        return Promise.cast(action())
            .then(loop)
            .catch(resolver.reject);
    };

    process.nextTick(loop);

    return resolver.promise;
};

// sort by value
function compare(a, b) {
    return b.probability - a.probability;
};


module.exports.calculatePro = calculatePro;
module.exports.getNextScenarios = getNextScenarios;
