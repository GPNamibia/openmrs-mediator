const express = require("express");
const privateConfig = require('./config/private-config.json');
const db = require('./models');
const app = express();
const PORT = privateConfig.appConfig.PORT
const odkCentralStagingData = require('./openmrs/getODKCentralData');
const {OpenMrsAPI} = require('./openmrs/OpenMrsAPI');
const OpenMrsAPIObject = new OpenMrsAPI();
const {PNCInfantAPI} = require('./openmrs/PNCInfant');
// const PNCInfantAPIObject = new PNCInfantAPI();
const {stag_odk_anc, stag_odk_delivery, stag_odk_pnc_mother, stag_odk_pnc_infant} = require('../src/models');

app.all('*', async (req, res) => {
  // Starts when a new request is triggered by the polling channel
  console.log(`\n---------------------------------------------------------------------------------`,
    `\n${ new Date().toUTCString('en-GB', { timeZone: 'UTC' }) }  - `,
    `The ODK Central staging tables <=> ptracker Mediator has received a new request. \n`
  );
  
  pushANC()
  pushLabourAndDelivery()
  pushMotherPNC()
  pushInfantPNC()
});

function pushANC() {
  odkCentralStagingData.getSubmissionData(stag_odk_anc)
  .then((res)=>{
    console.log('*********************posting ANC encounter *************************')
    
    console.log(res.body)
    // console.log(res);
    for (i=0; i< res.length; i++) {
      console.log('*********************posting ANC encounter record *************************')
      OpenMrsAPIObject.postANCData(res[i])
        .then((ancDataResponse)=>{
          console.log(ancDataResponse)
          odkCentralStagingData.updateOpenmrsStatus(stag_odk_anc, res[i][id])
          .then(updateResponse=>{
            console.log(`ODK staging record id = (${res[i][id]}) openmrs status updated successfully`)
            console.log(updateResponse)
          })

        })
        .catch(error=>{
          console.log(error)
        })
    }
  }).catch(error=>{console.error(error)})
}

function pushLabourAndDelivery() {
  odkCentralStagingData.getSubmissionData(stag_odk_delivery)
  .then((res)=>{
    console.log('*********************posting Labour and Delivery *************************')

    console.log(res.body)

    for (i=0; i< res.length; i++) {
      console.log('*********************posting Labour and Delivery encounter record *************************')
      OpenMrsAPIObject.postDeliveryData(res[i])
        .then((lndDataResponse)=>{
          console.log(lndDataResponse)
          odkCentralStagingData.updateOpenmrsStatus(delivery, res[i][id])
          .then(updateResponse=>{
            console.log(`ODK staging Labor and Delivery record id = (${res[i][id]}) openmrs status updated successfully`)
            console.log(updateResponse)
          })
        })
        .catch(error=>{
          console.log(error)
        })
    }
  })
  .catch(error=>{console.error(error)})
}


function pushMotherPNC() {
  odkCentralStagingData.getSubmissionData(stag_odk_pnc_mother)
  .then((res)=>{
    console.log('*********************posting Mother PNC *************************')

    console.log(res.body)

    for (i=0; i< res.length; i++) {
      console.log('********************* posting Mother PNC *************************')
      OpenMrsAPIObject.postMotherPNCData(res[i])
        .then((motherPNCResponse)=>{
          console.log(motherPNCResponse)
          odkCentralStagingData.updateOpenMRsStatus(stag_odk_pnc_mother, res[i][id])
          .then(updateResponse=>{
            console.log(`ODK staging Mother PNC record id = (${res[i][id]}) openmrs status updated successfully`)
            console.log(updateResponse)
          })
        })
        .catch(error=>{
          console.log(error)
        })
    }
  })
  .catch(error=>{console.error(error)})
}



function pushInfantPNC() {
  odkCentralStagingData.getSubmissionData(stag_odk_pnc_infant)
  .then((res)=>{
    console.log('*********************posting Infant PNC *************************')

    console.log(res.body)

    for (i=0; i< res.length; i++) {
      console.log('********************* posting Infant PNC *************************')
      OpenMrsAPIObject.postInfantPNCData(res[i])
        .then((motherPNCResponse)=>{
          console.log(motherPNCResponse)
          odkCentralStagingData.updateOpenMRsStatus(stag_odk_pnc_mother, res[i][id])
          .then(updateResponse=>{
            console.log(`ODK staging Infant PNC record id = (${res[i][id]}) openmrs status updated successfully`)
            console.log(updateResponse)
          })
        })
        .catch(error=>{
          console.log(error)
        })
    }
  })
  .catch(error=>{console.error(error)})
}

//Server PORT
db.sequelize.sync({}).then((req) => {
  app.listen(privateConfig.appConfig.PORT, (err) => {
      if (err) console.log(`Error: ${err}`)
      console.log(`${privateConfig.appConfig.mediatorName}  listening on port ${privateConfig.appConfig.PORT}...  \n`);
  });
}).then(() => {
  console.log(`Succesfully connected to '${privateConfig.development.database}' database...  \n`)

}).catch(err => { console.log(`Error when connecting to '${privateConfig.development.database}' database...:: \n`, err) })