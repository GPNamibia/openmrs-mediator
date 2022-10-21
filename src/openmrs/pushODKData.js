const odkCentralStagingData = require("./getODKCentralData");
const { OpenMrsAPI } = require("./OpenMrsAPI");
const OpenMrsAPIObject = new OpenMrsAPI();
const {
  stag_odk_anc,
  stag_odk_delivery,
  stag_odk_pnc_mother,
  stag_odk_pnc_infant,
  stag_odk_delivery_infant,
} = require("../../src/models");
const { resolve } = require("path");

async function pushODKData(sqlLimit) {
  return new Promise(async (resolve, reject) => {
    let anc = await pushANC(sqlLimit);
    let labor_and_delivery = await pushLabourAndDelivery(sqlLimit);
    let motherPNC = await pushMotherPNC(sqlLimit);
    let pncInfant = await pushInfantPNC(sqlLimit);
    return resolve();
  });
}

async function pushANC(sqlLimit) {
  odkCentralStagingData
    .getSubmissionData(stag_odk_anc,sqlLimit)
    .then((res) => {
      return new Promise((resolve, reject) => {
        if (res.length < 1) {
          console.log(
            "************** NO ANC Data found to process ***************"
          );
          return resolve();
        }
        res.forEach((result) => {
          console.log(
            `*********************posting ANC encounter submission UUID = ${result.submission_uuid} *************************`
          );
          OpenMrsAPIObject.postANCData(result)
            .then((ancDataResponse) => {
              if (result) {
                console.log(result.submission_uuid);
              }
            })
            .catch((error) => {
              console.log(error);
            });
        });
        return resolve();
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

async function pushLabourAndDelivery(sqlLimit) {
  odkCentralStagingData.getSubmissionData(stag_odk_delivery,sqlLimit).then((res) => {
    return new Promise((resolve, reject) => {
      if (res.length < 1) {
        console.log(
          "************** NO Labour & Delivery Data found to process ***************"
        );
      }
      res.forEach((result) => {
        console.log(
          `*********************posting Labour and Delivery record submission UUID = ${result.submission_uuid}*************************`
        );

        //Infant data
        odkCentralStagingData
          .getInfants(stag_odk_delivery_infant, result.ptracker_id,sqlLimit)
          .then((res) => {
            return new Promise((resolve, reject) => {
              res.forEach((response) => {
                OpenMrsAPIObject.postDeliveryData(result, response)
                  .then((lndDataResponse) => {
                    if (result) {
                      console.log("Updating L & D records");
                      console.log(result.submission_uuid);
                    }
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              });
            });
          });
      });
      return resolve();
    }).catch((error) => {
      console.error(error);
    });
  });
}

async function pushMotherPNC(sqlLimit) {
  odkCentralStagingData
    .getSubmissionData(stag_odk_pnc_mother,sqlLimit)
    .then((res) => {
      return new Promise((resolve, reject) => {
        if (res.length < 1) {
          console.log(
            "************** NO Mother PNC Data found to process ***************"
          );
        }

        res.forEach((result) => {
          console.log(
            `*********************Pushing mother PNC record uuid = ${result.submission_uuid} *************************`
          );
          OpenMrsAPIObject.postMotherPNCData(result)
            .then((motherPNCResponse) => {
              if (result) {
                console.log("Updating Mother PNC records");
                console.log(result.submission_uuid);
              }
            })
            .catch((error) => {
              console.log(error);
            });
        });
        return resolve();
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

async function pushInfantPNC(sqlLimit) {
  odkCentralStagingData
    .getSubmissionData(stag_odk_pnc_infant,sqlLimit)
    .then((results) => {
      return new Promise((resolve, reject) => {
        if (results.length < 1) {
          console.log(
            "************** NO Infant PNC Data found to process ***************"
          );
        }
        results.forEach((result) => {
          console.log(
            `*********************posting Infant PNC record uuid = ${result.submission_uuid}*************************`
          );

          OpenMrsAPIObject.postInfantPNCData(result)
            .then((infantPNCResponse) => {
              if (result) {
                console.log("Updating Infant PNC records");
                console.log(result.submission_uuid);
              }
            })
            .catch((error) => {
              console.log(error);
            });
        });
        return resolve();
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

module.exports = { pushODKData };
