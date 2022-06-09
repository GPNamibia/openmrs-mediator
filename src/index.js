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
const { getQueryParameters } = require('./openhim/initialize');
const {stag_odk_anc, stag_odk_delivery, stag_odk_pnc_mother, stag_odk_pnc_infant} = require('../src/models');

//openHIM
getQueryParameters();

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
    res.forEach(result => {
      OpenMrsAPIObject.postANCData(result)
        .then((ancDataResponse)=>{
          if(result) {
            console.log(result.submission_uuid)
            odkCentralStagingData.updateOpenmrsStatus(stag_odk_anc, result.submission_uuid)
            .then(updateResponse=>{
              console.log(`ODK staging record submission_uuid = ${result.submission_uuid}) Openmrs status updated successfully`)
            })
            .catch(error=>{
              console.log(error)
            })
          }
        })
        .catch(error=>{
          console.log(error)
        }) 
      
    });
  }).catch(error=>{console.error(error)})
}

function pushLabourAndDelivery() {
  odkCentralStagingData.getSubmissionData(stag_odk_delivery)
  .then((res)=>{
    console.log('*********************posting Labour and Delivery *************************')
    let counter = 0
    res.forEach(result => {
      counter += 1

      OpenMrsAPIObject.postDeliveryData(result)
        .then((lndDataResponse)=>{
          if(result) {
            console.log(result.submission_uuid)
            odkCentralStagingData.updateOpenmrsStatus(stag_odk_delivery, result.submission_uuid)
            .then(updateResponse=>{
              console.log(`ODK staging record for labor and delivery submission_uuid = ${result.submission_uuid}) Openmrs status updated successfully`)
            })
            .catch(error=>{
              console.log(error)
            })
          }
          
        })
        .catch(error=>{
          console.log(error)
        }) 
    });
  })
  .catch(error=>{console.error(error)})
}


function pushMotherPNC() {
  odkCentralStagingData.getSubmissionData(stag_odk_pnc_mother)
  .then((res)=>{
    console.log('*********************posting Mother PNC *************************')

    res.forEach(result => {
      OpenMrsAPIObject.postMotherPNCData(result)
        .then((motherPNCResponse)=>{
          if(result) {
            console.log(result.submission_uuid)
            odkCentralStagingData.updateOpenmrsStatus(stag_odk_pnc_mother, result.submission_uuid)
            .then(updateResponse=>{
              console.log(`ODK staging PNC mother record submission_uuid = ${result.submission_uuid}) Openmrs status updated successfully`)
            })
            .catch(error=>{
              console.log(error)
            })
          }
        })
        .catch(error=>{
          console.log(error)
        }) 
      
    });
  })
  .catch(error=>{console.error(error)})
}



function pushInfantPNC() {
  odkCentralStagingData.getSubmissionData(stag_odk_pnc_infant)
  .then((res)=>{
    console.log('*********************posting Infant PNC *************************')
    res.forEach(result => {
      OpenMrsAPIObject.postInfantPNCData(result)
        .then((infantPNCResponse)=>{
          if(result) {
            console.log(result.submission_uuid)
            odkCentralStagingData.updateOpenmrsStatus(stag_odk_pnc_infant, result.submission_uuid)
            .then(updateResponse=>{
              console.log(`ODK staging PNC Infant record submission_uuid = ${result.submission_uuid}) Openmrs status updated successfully`)
            })
            .catch(error=>{
              console.log(error)
            })
          }
        })
        .catch(error=>{
          console.log(error)
        }) 
      
    });
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