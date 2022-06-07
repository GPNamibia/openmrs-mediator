// upsert record into MYSQL
var Sequelize = require('sequelize');
const Op = Sequelize.Op;

async function readData(model) {
	const foundItems = await model.findAll(
    { where:
     { openmrs_status:null }
  })
	return foundItems
    }

async function updateOpenMRSStatus(model, id) {
  model.update(
    { openmrs_status: '1' },
    { where: { _id: id } }
  )
    .success(result =>
      handleResult(result)
    )
    .error(err =>
      handleError(err)
    )
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