const { OdkCentralStaging } = require("./odkCentralStagingApi");
const OdkCentral = new OdkCentralStaging();
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


module.exports = {
    getSubmissionData
};