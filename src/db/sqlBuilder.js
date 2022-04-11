// upsert record into MYSQL
async function readData(model) {
	const foundItems = await model.findAll()
	return foundItems
    }

module.exports = {
	readData
}