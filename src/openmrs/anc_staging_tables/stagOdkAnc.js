const { tableColumns, visit_type, table_name } = require('./tableColumns');
const { stag_odk_anc } = require("../../models")
const odkCentral = require('../getODKCentralData.js');
const sqlBuilder = require('../../db/sqlBuilder')


async function getAncSubmissionData() {
    return new Promise(async(resolve, reject) => {
        data = await sqlBuilder.getAncSubmissionData(stag_odk_anc)
        return await odkCentral.updateReviewStateFromOdkCentralAndInsertToMysql(stag_odk_anc, tableColumns, visit_type, table_name)
            .then(async(result) => {
                return resolve(result);
            })
            .catch(err => {
                console.error(`Error: ${err} \n`);
                return reject(err);
            })
    })
}


module.exports = { getAncSubmissionData };