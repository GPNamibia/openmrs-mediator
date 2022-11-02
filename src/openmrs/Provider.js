const privateConfig = require("../config/private-config.json");
const request = require("request");

class ProviderApi {

    constructor() {}
    sendRequest(options) {
      return new Promise((resolve, reject) => {
        request(options, function (err, response, body) {
          if (err)
            return reject(`Error sending request to OpenMRS: ${err.message}`);
          const contentType = response.headers["content-type"];
          if (contentType && contentType.indexOf("application/json") !== -1) {
            return resolve({ response: response, body: body });
          } else {
            return reject(null);
          }
        });
      });
    }


async getSystemId(username) {
    console.log("***********getting system id**********")

    let options = {
        method: 'GET',
        url: privateConfig.openmrsConfig.apiURL + `/user?q=${username}&v=default`,
        qs: {},
        headers: privateConfig.openmrsConfig.headers,
        form: false,
        auth: {
            user: privateConfig.openmrsConfig.username,
            pass: privateConfig.openmrsConfig.password
        },
        json: true,
        body: {}
    }

    return this.sendRequest(options)
}



async getProviderUuid(system_id) {
    console.log("***********getting provider uuid**********")

    let options = {
        method: 'GET',
        url: privateConfig.openmrsConfig.apiURL + `/provider?q=${system_id}&v=default`,
        qs: {},
        headers: privateConfig.openmrsConfig.headers,
        form: false,
        auth: {
            user: privateConfig.openmrsConfig.username,
            pass: privateConfig.openmrsConfig.password
        },
        json: true,
        body: {}
    }

    return this.sendRequest(options)
}
}


module.exports = { ProviderApi };