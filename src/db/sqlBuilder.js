// upsert record into MYSQL
var Sequelize = require("sequelize");
const Op = Sequelize.Op;

async function readData(model) {
  const foundItems = await model.findAll({
    limit: 10 ,
    where: {
      [Op.or]: [{openmrs_status: null}, {openmrs_status: "pending"}]
    },
  });
  return foundItems;
}

async function updateOpenMRSStatus(model, submission_uuid, message) {
  const foundItem = await model.findOne({
    where: { submission_uuid: submission_uuid },
  });
  if (foundItem) {
    const item = await model.update(
      { openmrs_status: message },
      { where: { submission_uuid: submission_uuid } }
    );
    return { item, created: false };
  }
}

async function updateOpenmrsErrorMessage(model, submission_uuid, error) {
  const foundItem = await model.findOne({
    where: { submission_uuid: submission_uuid },
  });
  if (foundItem) {
    const item = await model.update(
      { openmrs_error_message: error },
      { where: { submission_uuid: submission_uuid } }
    );
    return { item, created: false };
  }
}

//L & D status
async function updateOpenMRSStatusLD(model, infant_id, message) {
  const foundItem = await model.findOne({ where: { infant_id: infant_id } });
  if (foundItem) {
    const item = await model.update(
      { openmrs_status: message },
      { where: { infant_id: infant_id } }
    );
    return { item, created: false };
  }
}

async function updateOpenmrsErrorMessageLD(model, infant_id, error) {
  const foundItem = await model.findOne({ where: { infant_id: infant_id } });
  if (foundItem) {
    const item = await model.update(
      { openmrs_error_message: error },
      { where: { infant_id: infant_id } }
    );
    return { item, created: false };
  }
}

async function getInfants(model, ptrackerId) {
  infants = model.findAll({
    limit: 10 ,
    where: {
      [Op.or]: [{openmrs_status: null}, {openmrs_status: "created"}],
      [Op.and]: { ptracker_id: ptrackerId },
    },
  });
  return infants;
}

module.exports = {
  readData,
  updateOpenMRSStatus,
  getInfants,
  updateOpenmrsErrorMessage,
  updateOpenMRSStatusLD,
  updateOpenmrsErrorMessageLD,
};
