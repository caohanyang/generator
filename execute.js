const winston = require('winston');
const MongoClient = require('mongodb').MongoClient;
const request = require('request');
const argv = require('yargs').argv;
const serverNames = {
	mongoServerName : argv.mongo,
	rabbitServerName : argv.rabbit    
}
const dbUrl = `mongodb://${serverNames.mongoServerName}:27018/wat_storage`;
getScenarios();

function getScenarios() {
	winston.info(`Play Now Request on ${dbUrl}`);
	MongoClient.connect(dbUrl)
	.then(db => {
		db.collection('scenario', (err, scenarioCollection) => {
			if (err) {
				winston.error(`Play Now Request Error : ${err}`);
				db.close();
			} else {
			
				scenarioCollection.find().toArray()
				.then(founds => {
					var i = 0;
					function f() {
			 
						var obj = founds[i];
						console.log(obj._id);	

						request('http://localhost:8090/playNow/'+obj._id, function (error, response, body) {
							if (!error) {
								console.log("body"+body);
							}
						})
				
						i++;
						if( i < founds.length ){
							setTimeout( f, 1000 );
						}
					}
				
					f();

					db.close();
				}).catch(err => {
					
					db.close();
				});


			}
		});

	}).catch(err => {
		winston.info(err);
	});
}
