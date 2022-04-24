// upsert record into MYSQL
async function readData(model) {
	const foundItems = await model.findAll(
    { where:{ openmrs_status: null }}
  )
	return foundItems
    }

async function updateReviewState(model, id) {
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

module.exports = {
	readData
}