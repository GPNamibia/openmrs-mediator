// upsert record into MYSQL
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

async function readData(model) {
	const foundItems = await model.findAll(
    { where:
     { 
       openmrs_status: { 
         [Op.or]: { 
           [Op.not]: '1',
            [Op.eq]: null, }, },}
  })
	return foundItems
    }

async function updateOpenMRSStatus(model, submission_uuid) {
  const foundItem = await model.findOne({ where: { submission_uuid: submission_uuid } })
    if (foundItem) {
        const item = await model.update({ openmrs_status: 1 }, { where: { submission_uuid: submission_uuid } })
        return { item, created: false }
    }
}
async function getInfants(model, ptrackerId) {
  infants = model.findAll(
    { where: { ptracker_id: ptrackerId } }
  )
    return infants
}

module.exports = {
	readData, updateOpenMRSStatus, getInfants
}