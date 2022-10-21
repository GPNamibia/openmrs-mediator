const flatten = require("flat");
const sqlBuilder = require("../db/sqlBuilder");

async function getSubmissionData(table_name,sqlLimit) {
  return new Promise(async (resolve, reject) => {
    //new records
    sqlBuilder.readData(table_name,sqlLimit).then(async (res) => {
      return resolve(res);
    });
    //pending records
     sqlBuilder.readPendingData(table_name).then((res) => {
      return resolve(res);
    })
  });
}

function updateOpenmrsStatus(tableName, id, message) {
  return new Promise((resolve, reject) => {
    sqlBuilder
      .updateOpenMRSStatus(tableName, id, message)
      .then((result) => {
        return resolve(result);
      })
      .catch((error) => {
        return reject(
          `Error while updating record in staging table ${tableName}: ${error}\n`
        );
      });
  });
}

function updateOpenmrsErrorMessage(tableName, id, error) {
  return new Promise((resolve, reject) => {
    sqlBuilder
      .updateOpenmrsErrorMessage(tableName, id, error)
      .then((result) => {
        return resolve(result);
      })
      .catch((error) => {
        return reject(
          `Error while updating error message column ${tableName}: ${error}\n`
        );
      });
  });
}

//L & D status
function updateOpenmrsStatusLD(tableName, id, message) {
  return new Promise((resolve, reject) => {
    sqlBuilder
      .updateOpenMRSStatusLD(tableName, id, message)
      .then((result) => {
        return resolve(result);
      })
      .catch((error) => {
        return reject(
          `Error while updating record in staging table ${tableName}: ${error}\n`
        );
      });
  });
}

function updateOpenmrsErrorMessageLD(tableName, id, error) {
  return new Promise((resolve, reject) => {
    sqlBuilder
      .updateOpenmrsErrorMessageLD(tableName, id, error)
      .then((result) => {
        return resolve(result);
      })
      .catch((error) => {
        return reject(
          `Error while updating error message column ${tableName}: ${error}\n`
        );
      });
  });
}

function getInfants(tableName, ptrackerId,sqlLimit) {
  return new Promise((resolve, reject) => {
    sqlBuilder
      .getInfants(tableName, ptrackerId,sqlLimit)
      .then((result) => {
        return resolve(result);
      })
      .catch((error) => {
        return reject(
          `Error while reading data record from staging table ${tableName}: ${error}\n`
        );
      });
  });
}

module.exports = {
  getSubmissionData,
  updateOpenmrsStatus,
  getInfants,
  updateOpenmrsErrorMessage,
  updateOpenmrsStatusLD,
  updateOpenmrsErrorMessageLD,
};
