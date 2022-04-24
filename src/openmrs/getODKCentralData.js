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

function updateReviewStateFromOdkCentralAndInsertToMysql(tableName, id) {
    return new promises((resolve, reject) =>{
        sqlBuilder.updateReviewState(tableName, id)
          .then(result => {
            return resolve(result)
          })
          .catch(error => {
            return reject(`Error while updating record in staging table ${tableName}: ${error}\n`)
          })
    })
}


module.exports = {
    getSubmissionData, updateReviewStateFromOdkCentralAndInsertToMysql
};