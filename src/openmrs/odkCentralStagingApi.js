const request = require('request');
const privateConfig = require('../config/private-config.json');

const config = privateConfig.odkCentralConfig;

class OdkCentralStaging {
    constructor() {}
    sendRequest(options) {
        return new Promise((resolve, reject) => {
            request(options, function(err, response, body) {
                if (err) return reject(`Error sending request to ODK Central Staging: ${err.message}`)
                const contentType = response.headers['content-type']
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return resolve({ response: response, body: body })
                } else {
                    return reject(null)
                }
            });
        })
    }

    getANCSubmissionData(){
      return {'test': 1}
	
    }
}

module.exports = {OdkCentralStaging}