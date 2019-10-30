const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.clockDrift = functions.https.onRequest((request, response) => {
    var serverTimeUST = new Date();
  
    response.set('Access-Control-Allow-Origin', "*");
    response.set('Access-Control-Allow-Methods', 'GET');
    
    var userDateString = request.query.userDateTimeUST;
    if (!userDateString) {
        response.json({'error': 'No userDateTimeUST supplied'})
      return;
    }
    var userTimeUST = new Date(userDateString);
    
    var clockDrift = userTimeUST - serverTimeUST;
    var functionExecutionTime = new Date() - serverTimeUST;
    response.json({'serverTimeUST': serverTimeUST.toISOString(), 
                   'clockDrift': clockDrift, 
                   'functionExecutionTime': functionExecutionTime});
});
