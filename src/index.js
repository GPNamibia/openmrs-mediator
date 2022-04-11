const express = require("express");
const privateConfig = require('./config/private-config.json');
const db = require('./models');
const app = express();
const PORT = privateConfig.appConfig.PORT
const odkCentralStagingData = require('./openmrs/getODKCentralData');
const {OpenMrsAPI} = require('./openmrs/OpenMrsAPI');
const OpenMrsAPIObject = new OpenMrsAPI();
const {stag_odk_anc} = require('../src/models')

app.all('*', async (req, res) => {
  // Starts when a new request is triggered by the polling channel
  console.log(`\n---------------------------------------------------------------------------------`,
    `\n${ new Date().toUTCString('en-GB', { timeZone: 'UTC' }) }  - `,
    `The ODK Central staging tables <=> ptracker Mediator has received a new request. \n`
  );
  odkCentralStagingData.getSubmissionData(stag_odk_anc)
  .then((res)=>{
    

    // console.log(res);
    for (i=0; i< res.length; i++) {
      
      console.log('**********************************************')
      
      // console.log(res[i])
      ancDataResponse = OpenMrsAPIObject.postANCData(res[res.length - 1])
      console.log(ancDataResponse)
      break
      

    }
  }).catch(error=>{console.error(error)})
});

//Server PORT
db.sequelize.sync({}).then((req) => {
  app.listen(privateConfig.appConfig.PORT, (err) => {
      // anc_data = odkCentralStagingData.getSubmissionData(stag_odk_anc)
      // console.log(anc_data)
      if (err) console.log(`Error: ${err}`)
      console.log(`${privateConfig.appConfig.mediatorName}  listening on port ${privateConfig.appConfig.PORT}...  \n`);
  });
}).then(() => {
  console.log(`Succesfully connected to '${privateConfig.development.database}' database...  \n`)

}).catch(err => { console.log(`Error when connecting to '${privateConfig.development.database}' database...:: \n`, err) })