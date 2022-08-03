const flatten = require('flat');
const sqlBuilder = require('../db/sqlBuilder');



function getSubmissionData(table_name) {
    return new Promise((resolve, reject) => {
    sqlBuilder.readData(table_name)
        .then((res)=>{
            return resolve(res);
        }).catch(error=>{return reject(`Error while retrieving Data from ANC staging table: ${error} 🚫\n`)})    
    });
}

function updateOpenmrsStatus(tableName, id,message) {
  return new Promise((resolve, reject) =>{
      sqlBuilder.updateOpenMRSStatus(tableName, id,message)
        .then(result => {
          return resolve(result)
        })
        .catch(error => {
          return reject(`Error while updating record in staging table ${tableName}: ${error}\n`)
        })
  })
}

function updateOpenmrsErrorMessage  (tableName, id,error) {
  return new Promise((resolve, reject) =>{
      sqlBuilder.updateOpenmrsErrorMessage(tableName, id,error)
        .then(result => {
          return resolve(result)
        })
        .catch(error => {
          return reject(`Error while updating error message column ${tableName}: ${error}\n`)
        })
  })
}


function getInfants(tableName, ptrackerId) {
    return new Promise((resolve, reject) =>{
        sqlBuilder.getInfants(tableName, ptrackerId)
          .then(result => {
            return resolve(result)
          })
          .catch(error => {
            return reject(`Error while reading data record from staging table ${tableName}: ${error}\n`)
          })
    })
}

module.exports = {
    getSubmissionData, updateOpenmrsStatus, getInfants,updateOpenmrsErrorMessage
};