const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const request = require('request');
var pmongo = require('promised-mongo');
const Promise = require('bluebird');
const argv = require('yargs').argv;
const ObjectID = require('mongodb').ObjectID;

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

function calculate(stepItem, N) {

    var a = 1/N;
    var b1 = -1;
    var b2 = -1/(2*N);
    var b3 = 1/(2*N);
    var b4 = 1/(2*N);

    var p = a + b1*stepItem.FPCA + b2*stepItem.TPCA_OUT + b3*stepItem.TPCA_IN_TS + b4*stepItem.TPCA_IN_TF;

    console.log(a + " "+b1 + " "+b2 + " "+b3 + " "+ b4 + " " + p);
    return p;
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


module.exports.calculatePro = calculatePro;