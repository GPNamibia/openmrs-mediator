const request = require("request");
const privateConfig = require("../config/private-config.json");
const uuids = require("../config/uuid-dictionary.json");
const districts = require("../config/districts.json");
const countries = require("../config/countries.json");
const facilities = require("../config/mflCodes.json");
const odkCentralStagingData = require("./getODKCentralData");

const {
  stag_odk_anc,
  stag_odk_delivery,
  stag_odk_pnc_mother,
  stag_odk_pnc_infant,
  stag_odk_delivery_infant,
} = require("../../src/models");

const config = privateConfig.odkCentralConfig;

class OpenMrsAPI {
  constructor() { }
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

  async postANCData(ancData) {
    let patient = this.getPatientUsingId(ancData["ptracker_id"]);

    patient.then(async (res) => {
      let result = JSON.parse(res.body);
      let patientRecord = result.results;
      let currentPatient = null;
      this.getLocation(ancData["facility_name"]).then(async (location) => {
        let locationUUID = location.body.results[0].uuid;
        if (patientRecord.length > 0) {
          console.log("**************Patient found********** ");
          currentPatient = patientRecord[0];
          this.createANCEncounter(currentPatient, ancData, locationUUID)
            .then((ancEncounter) => {
              console.log(
                "***************************** Creating ANC Encounter ***************"
              );
              console.log(
                `Encounter successfully created for patient uuid = ${ancEncounter.body.patient.uuid}`
              );
              //update openmrs status
              odkCentralStagingData
                .updateOpenmrsStatus(
                  stag_odk_anc,
                  ancData.submission_uuid,
                  `sent`
                )
                .then((updateResponse) => {
                  console.log(
                    `ODK staging record submission_uuid = ${ancData.submission_uuid}) Openmrs status updated successfully  ✅`
                  );
                })
                .catch((error) => {
                  console.log(error);
                });
            })
            .catch((err) => {
              console.log(
                `Error creating encounter for patient uuid = ${ancData.submission_uuid},${err} :🚫\n`
              );
              //update openmrs status
              odkCentralStagingData
                .updateOpenmrsStatus(
                  stag_odk_anc,
                  ancData.submission_uuid,
                  `pending`
                )
                .then((updateResponse) => {
                  console.log(
                    `ODK staging record submission_uuid = ${ancData.submission_uuid}) Openmrs status updated successfully  ✅`
                  );
                  //update openmrs error table
                  odkCentralStagingData.updateOpenmrsErrorMessage(
                    stag_odk_anc,
                    ancData.submission_uuid,
                    `Error creating encounter for ${ancData.submission_uuid},${err}`
                  );
                })
                .catch((error) => {
                  console.log(error);
                });
            });
        } else {
          console.log("**************Creating new Patient************* ");
          let newPatient = await this.createPatient(ancData, locationUUID);
          let patientBody = newPatient.body;
          console.log(`Patient UUID ${patientBody.uuid}`);
          this.createANCEncounter(patientBody, ancData, locationUUID)
            .then((ancEncounter) => {
              console.log(
                "***************************** Creating ANC Encounter ***************"
              );
              console.log(
                `Encounter successfully created for patient uuid = ${ancEncounter.body.patient.uuid}`
              );
              //update openmrs status
              odkCentralStagingData
                .updateOpenmrsStatus(
                  stag_odk_anc,
                  ancData.submission_uuid,
                  `sent`
                )
                .then((updateResponse) => {
                  console.log(
                    `ODK staging record submission_uuid = ${ancData.submission_uuid}) Openmrs status updated successfully  ✅`
                  );
                })
                .catch((error) => {
                  console.log(error);
                });
            })
            .catch((err) => {
              console.log(
                `Error creating encounter for patient uuid = ${ancData.submission_uuid},${err} :🚫\n`
              );
              //update openmrs status
              odkCentralStagingData
                .updateOpenmrsStatus(
                  stag_odk_anc,
                  ancData.submission_uuid,
                  `pending`
                )
                .then((updateResponse) => {
                  console.log(
                    `ODK staging record submission_uuid = ${ancData.submission_uuid}) Openmrs status updated successfully  ✅`
                  );
                  //update openmrs error table
                  odkCentralStagingData.updateOpenmrsErrorMessage(
                    stag_odk_anc,
                    ancData.submission_uuid,
                    `Error creating encounter for ${ancData.submission_uuid},${err}`
                  );
                })
                .catch((error) => {
                  console.log(error);
                });
            });
        }
      });
    });
  }

  async infantChildInstance(index) {
    let infant_ob = null;
    //Check infant instance
    if (index == 0) {
      infant_ob = uuids.obs.infant_child_instance[1];
      return infant_ob;
    } else if (index == 1) {
      infant_ob = uuids.obs.infant_child_instance[2];
      return infant_ob;
    } else if (index == 2) {
      infant_ob = uuids.obs.infant_child_instance[3];
      return infant_ob;
    } else if (index == 3) {
      infant_ob = uuids.obs.infant_child_instance[4];
      return infant_ob;
    } else if (index == 4) {
      infant_ob = uuids.obs.infant_child_instance[5];
      return infant_ob;
    } else if (index == 5) {
      infant_ob = uuids.obs.infant_child_instance[6];
      return infant_ob;
    } else if (index == 6) {
      infant_ob = uuids.obs.infant_child_instance[7];
      return infant_ob;
    } else if (index == 7) {
      infant_ob = uuids.obs.infant_child_instance[8];
      return infant_ob;
    } else if (8) {
      infant_ob = uuids.obs.infant_child_instance[9];
      return infant_ob;
    } else {
      return "Unknown number of this child.";
    }
    return infant_ob;
  }

  async postDeliveryData(deliveryData, infantDeliveryData) {
    return new Promise((resolve, reject) => {
      let patient = this.getPatientUsingId(deliveryData["ptracker_id"]);
      patient.then(async (res) => {
        let result = JSON.parse(res.body);
        let patientRecord = result.results;
        let currentPatient = null;
        this.getLocation(deliveryData["facility_name"]).then(
          async (location) => {
            let locationUUID = location.body.results[0].uuid;
            if (patientRecord.length > 0) {
              console.log("**************Patient found********** ");
              currentPatient = patientRecord[0];
              //Creating delivery encounter
              await this.createDeliveryEncounter(currentPatient, deliveryData, locationUUID)
                .then(async (deliveryEncounter) => {
                  console.log("***************************** Creating Delivery Encounter ***************");
                  let encounter = deliveryEncounter.body;
                  console.log("***************************** Creating Infant Person ***************");
                    //Creating infant person
                    await this.createInfantPatient(infantDeliveryData,deliveryData,locationUUID)
                      .then(async (infant) => {
                        // console.log(infant)
                        console.log(
                          `Successfully created infant person for = ${infantDeliveryData["infant_id"]}   ✅`
                        );
                        //Creating relationship infant-parent
                         this.createInfantRelationShip(infant, deliveryData["ptracker_id"])
                          .then((res) => {
                            // console.log(res);
                            console.log(
                              `Successfully created relationship for = ${infantDeliveryData["infant_id"]}   ✅`
                            );
                          }).catch((err) => {
                            console.log(
                              `Error when creating relationship for = ${infantDeliveryData["infant_id"]}   🚫`
                            );
                          });
                        //update openmrs status
                        odkCentralStagingData.updateOpenmrsStatusLD(stag_odk_delivery_infant, infantDeliveryData["infant_id"], `created`)
                          .then((updateResponse) => {
                            console.log(
                              `ODK staging record submission_uuid = ${infantDeliveryData["infant_id"]} Openmrs status updated successfully  ✅`
                            );
                          }).catch((error) => {
                            console.log(error);
                          });
                      }).catch((err) => {
                        console.log(`Error creating infant person for = ${infantDeliveryData["infant_id"]} :🚫\n`);
                        //update openmrs status
                        odkCentralStagingData.updateOpenmrsStatusLD(stag_odk_delivery_infant, infantDeliveryData["infant_id"], `pending`)
                          .then((updateResponse) => {
                            odkCentralStagingData.updateOpenmrsStatus(stag_odk_delivery, deliveryData.submission_uuid, `pending`);
                            // console.log(`ODK staging record submission_uuid = ${infantDeliveryData["Submissions_uuid"]}) Openmrs status updated successfully  ✅`);
                            //update openmrs error table
                            odkCentralStagingData.updateOpenmrsErrorMessageLD(stag_odk_delivery_infant, infantDeliveryData["infant_id"], `Error creating infant person for ${infantDeliveryData["infant_id"]},${err}`);
                            odkCentralStagingData.updateOpenmrsErrorMessage(stag_odk_delivery, deliveryData.submission_uuid, `Error creating infant person for ${deliveryData.submission_uuid},${err}`);
                          }).catch((error) => {
                            console.log(error);
                          });
                      });
                  console.log(
                    "*****************************Getting Infant Obs ***************"
                  );
                  setTimeout(async() => {
                  //Getting infant obs
                  await this.getInfantObs(deliveryData["ptracker_id"], deliveryData["visit_date"], encounter
                  ).then(async(infantObs) => {
                    // console.log(encounter)
                    //infant instance
                    infantObs.forEach(async(result, index) => {
                     await this.infantChildInstance(index).then(async (res) => {
                        let body = {
                          obsDatetime: deliveryData["visit_date"],
                          person: currentPatient.uuid,
                          groupMembers: result,
                          encounter: encounter.uuid,
                          concept: res,
                        };
                        let options = {
                          method: "POST",
                          url: privateConfig.openmrsConfig.apiURL + `obs`,
                          qs: {},
                          headers: privateConfig.openmrsConfig.headers,
                          form: false,
                          auth: {
                            user: privateConfig.openmrsConfig.username,
                            pass: privateConfig.openmrsConfig.password,
                          },
                          json: true,
                          body: body,
                        };
                        return resolve(this.sendRequest(options));
                      }).catch((error) => {
                        console.log(error);
                      });
                    });
                  }).catch((error) => {
                    console.log(error);
                  });
                }, 5000);
                  console.log(
                    `Delivery Encounter successfully created for patient uuid = ${encounter.patient.uuid}   ✅`
                  );
                  //update openmrs status
                  odkCentralStagingData
                    .updateOpenmrsStatus(stag_odk_delivery, deliveryData.submission_uuid, `sent`)
                    .then((updateResponse) => {
                      console.log(
                        `ODK staging record submission_uuid = ${deliveryData.submission_uuid}) Openmrs status updated successfully  ✅`
                      );
                    }).catch((error) => {
                      console.log(error);
                    });
                }).catch((err) => {
                  console.log(
                    `Error creating encounter for patient uuid = ${deliveryData.submission_uuid},${err} :🚫\n`
                  );
                  //update openmrs status
                  odkCentralStagingData
                    .updateOpenmrsStatus(stag_odk_delivery, deliveryData.submission_uuid, `pending`)
                    .then((updateResponse) => {
                      console.log(
                        `ODK staging record submission_uuid = ${deliveryData.submission_uuid}) Openmrs status updated successfully  ✅`
                      );
                      //update openmrs error table
                      odkCentralStagingData.updateOpenmrsErrorMessage(stag_odk_delivery, deliveryData.submission_uuid, `Error creating encounter for ${deliveryData.submission_uuid},${err}`);
                    }).catch((error) => {
                      console.log(error);
                    });
                });
            } else {
              console.log("**************Creating new Patient************* ");
              let patient = await this.createPatient(deliveryData, locationUUID);
              let patientBody = patient.body;
              console.log(`Patient UUID ${patientBody.uuid}`);
              //Creating delivery encounter
              await this.createDeliveryEncounter(patientBody, deliveryData, locationUUID)
                .then(async (deliveryEncounter) => {
                  console.log(
                    "***************************** Creating Delivery Encounter ***************"
                  );
                  let encounter = deliveryEncounter.body;
                  // console.log(encounter);
                  console.log(
                    "***************************** Creating Infant Person ***************"
                  );
                    //Creating infant person
                    await this.createInfantPatient(infantDeliveryData,deliveryData,locationUUID)
                      .then(async (infant) => {
                        // console.log(infant)
                        console.log(
                          `Successfully created infant person for = ${infantDeliveryData["infant_id"]}   ✅`
                        );
                        //Creating relationship infant-parent
                         this.createInfantRelationShip(infant, deliveryData["ptracker_id"])
                          .then((res) => {
                            // console.log(res);
                            console.log(
                              `Successfully created relationship for = ${infantDeliveryData["infant_id"]}   ✅`
                            );
                          })
                          .catch((err) => {
                            console.log(
                              `Error when creating relationship for = ${infantDeliveryData["infant_id"]}   🚫`
                            );
                          });
                        //update openmrs status
                        odkCentralStagingData
                          .updateOpenmrsStatusLD(stag_odk_delivery_infant, infantDeliveryData["infant_id"], `created`)
                          .then((updateResponse) => {
                            console.log(
                              `ODK staging record submission_uuid = ${infantDeliveryData["infant_id"]}) Openmrs status updated successfully  ✅`
                            );
                          }).catch((error) => {
                            console.log(error);
                          });
                      }).catch((err) => {
                        console.log(
                          `Error creating infant person for = ${infantDeliveryData["infant_id"]} :🚫\n`
                        );
                        //update openmrs status
                        odkCentralStagingData
                          .updateOpenmrsStatusLD(stag_odk_delivery_infant, infantDeliveryData["infant_id"], `pending`)
                          .then((updateResponse) => {
                            odkCentralStagingData.updateOpenmrsStatus(stag_odk_delivery, deliveryData.submission_uuid, `pending`);
                            console.log(
                              `ODK staging record submission_uuid = ${infantDeliveryData["infant_id"]}) Openmrs status updated successfully  ✅`
                            );
                            //update openmrs error table
                            odkCentralStagingData.updateOpenmrsErrorMessageLD(stag_odk_delivery_infant, infantDeliveryData["infant_id"], `Error creating infant person for ${infantDeliveryData["infant_id"]},${err}`);
                            odkCentralStagingData.updateOpenmrsErrorMessage(stag_odk_delivery, deliveryData.submission_uuid, `Error creating infant person for ${deliveryData.submission_uuid},${err}`);
                          }).catch((error) => {
                            console.log(error);
                          });
                      });
                    console.log(
                      "*****************************Getting Infant Obs ***************"
                    );
                    setTimeout(async() => {
                    await this.getInfantObs(deliveryData["ptracker_id"], deliveryData["visit_date"], encounter)
                    .then(async(infantObs) => {
                      infantObs.forEach(async(result, index) => {
                        //infant instance
                        await this.infantChildInstance(index).then(async (res) => {
                          let body = {
                            obsDatetime: deliveryData["visit_date"],
                            person: patientBody.uuid,
                            groupMembers: result,
                            encounter: encounter.uuid,
                            concept: res,
                          };
                          let options = {
                            method: "POST",
                            url: privateConfig.openmrsConfig.apiURL + `obs`,
                            qs: {},
                            headers: privateConfig.openmrsConfig.headers,
                            form: false,
                            auth: {
                              user: privateConfig.openmrsConfig.username,
                              pass: privateConfig.openmrsConfig.password,
                            },
                            json: true,
                            body: body,
                          };
                          return resolve(this.sendRequest(options));
                        }).catch((error) => {
                          console.log(error);
                        });
                      });
                    }).catch((error) => {
                      console.log(error);
                    });
                  }, 5000);
                    console.log(
                      `Delivery Encounter successfully created for patient uuid = ${encounter.patient.uuid}   ✅`
                    );
                    //update openmrs status
                    odkCentralStagingData
                      .updateOpenmrsStatus(stag_odk_delivery, deliveryData.submission_uuid, `sent`)
                      .then((updateResponse) => {
                        console.log(
                          `ODK staging record submission_uuid = ${deliveryData.submission_uuid}) Openmrs status updated successfully  ✅`
                        );
                      }).catch((error) => {
                        console.log(error);
                      });
                  }).catch((err) => {
                    console.log(
                      `Error creating encounter for patient uuid = ${deliveryData.submission_uuid},${err} :🚫\n`
                    );
                    //update openmrs status
                    odkCentralStagingData
                      .updateOpenmrsStatus(stag_odk_delivery, deliveryData.submission_uuid, `pending`)
                      .then((updateResponse) => {
                        console.log(
                          `ODK staging record submission_uuid = ${deliveryData.submission_uuid}) Openmrs status updated successfully  ✅`
                        );
                        //update openmrs error table
                        odkCentralStagingData.updateOpenmrsErrorMessage(stag_odk_delivery, deliveryData.submission_uuid, `Error creating encounter for ${deliveryData.submission_uuid},${err}`);
                      }).catch((error) => {
                        console.log(error);
                      });
                  });
                }
          }
        );
      });
    });
  }

  postMotherPNCData(pncData) {
    return new Promise((resolve, reject) => {
      let patient = this.getPatientUsingId(pncData["ptracker_id"]);

      patient.then(async (res) => {
        let result = JSON.parse(res.body);
        let patientRecord = result.results;
        let currentPatient = null;
        this.getLocation(pncData["facility_name"]).then(async (location) => {
          let locationUUID = location.body.results[0].uuid;
          if (patientRecord.length > 0) {
            console.log("**************Patient found********** ");
            currentPatient = patientRecord[0];
            //creating encounter
            this.createMotherPNCEncounter(currentPatient, pncData, locationUUID)
              .then((pncMotherEncounter) => {
                console.log(
                  "***************************** Creating PNC Mother Encounter ***************"
                );
                console.log(
                  `Encounter successfully created for patient uuid = ${pncMotherEncounter.body.patient.uuid}`
                );
                // return resolve(ancEncounter);
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_mother,
                    pncData.submission_uuid,
                    `sent`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              })
              .catch((err) => {
                console.log(
                  `Error creating encounter for patient uuid = ${pncData.submission_uuid},${err} :🚫\n`
                );
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_mother,
                    pncData.submission_uuid,
                    `pending`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                    //update openmrs error table
                    odkCentralStagingData.updateOpenmrsErrorMessage(
                      stag_odk_pnc_mother,
                      pncData.submission_uuid,
                      `Error creating encounter for ${pncData.submission_uuid},${err}`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              });
          } else {
            console.log("**************Creating new Patient************* ");
            let patient = await this.createPatient(pncData, locationUUID);
            let patientBody = patient.body;
            console.log(`Patient UUID ${patientBody.uuid}`);
            //creating encounter
            this.createMotherPNCEncounter(patientBody, pncData, locationUUID)
              .then((pncMotherEncounter) => {
                console.log(
                  "***************************** Creating PNC Mother Encounter ***************"
                );
                console.log(
                  `Encounter successfully created for patient uuid = ${pncMotherEncounter.body.patient.uuid}`
                );
                // return resolve(ancEncounter);
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_mother,
                    pncData.submission_uuid,
                    `sent`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              })
              .catch((err) => {
                console.log(
                  `Error creating encounter for patient uuid = ${pncData.submission_uuid},${err} :🚫\n`
                );
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_mother,
                    pncData.submission_uuid,
                    `pending`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                    //update openmrs error table
                    odkCentralStagingData.updateOpenmrsErrorMessage(
                      stag_odk_pnc_mother,
                      pncData.submission_uuid,
                      `Error creating encounter for ${pncData.submission_uuid},${err}`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              });
          }
        });
      });
    });
  }

  postInfantPNCData(pncData) {
    return new Promise((resolve, reject) => {
      let patient = this.getPatientUsingId(pncData["ptracker_id"]);

      patient.then(async (res) => {
        let result = JSON.parse(res.body);
        let patientRecord = result.results;
        let currentPatient = null;
        this.getLocation(pncData["facility_name"]).then(async (location) => {
          let locationUUID = location.body.results[0].uuid;
          if (patientRecord.length > 0) {
            console.log(
              "**************Patient found with specified identifier **********"
            );
            currentPatient = patientRecord[0];

            if (pncData["parent_ptracker_id"]) {
              console.log(
                "**********************linking mother to child**********************"
              );
              this.createRelationShip(
                currentPatient,
                pncData["parent_ptracker_id"]
              )
                .then((patientLink) => {
                  console.log(
                    "****************linked mother to child**********************"
                  );
                })
                .catch((error) => {
                  console.error(`Error linking infant to parent: ${error}`);
                });
            }
            //creating encounter
            this.createInfantPNCEncounter(currentPatient, pncData, locationUUID)
              .then((pncInfantEncounter) => {
                console.log(
                  "***************************** Creating PNC Infant Encounter ***************"
                );
                console.log(pncInfantEncounter.body)
                console.log(
                  `Encounter successfully created for patient uuid = ${pncInfantEncounter.body.patient.uuid}`
                );
                // return resolve(ancEncounter);
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_infant,
                    pncData.submission_uuid,
                    `sent`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              })
              .catch((err) => {
                console.log(
                  `Error creating encounter for patient uuid = ${pncData.submission_uuid},${err} :🚫\n`
                );
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_infant,
                    pncData.submission_uuid,
                    `pending`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                    //update openmrs error table
                    odkCentralStagingData.updateOpenmrsErrorMessage(
                      stag_odk_pnc_infant,
                      pncData.submission_uuid,
                      `Error creating encounter for ${pncData.submission_uuid},${err}`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              });
          } else {
            console.log("**************Creating new Patient************* ");
            let newPatient = await this.createPatient(pncData, locationUUID);
            if (pncData["parent_ptracker_id"]) {
              console.log(
                "**********************linking parent to child**********************"
              );
              try {
                let relationship = await this.createRelationShip(
                  newPatient,
                  pncData["parent_ptracker_id"]
                );
                console.log(
                  "****************linked parent to child**********************"
                );
              } catch (error) {
                console.log(
                  "****************Error linking parent to child**********************"
                );
                console.log(error);
              }
            }
            let patientBody = newPatient.body;
            console.log(`Patient UUID ${patientBody.uuid}`);
            //creating encounter
            this.createInfantPNCEncounter(patientBody, pncData, locationUUID)
              .then((pncInfantEncounter) => {
                console.log(
                  "***************************** Creating PNC Infant Encounter ***************"
                );
                console.log(
                  `Encounter successfully created for patient uuid = ${pncInfantEncounter.body.patient.uuid}`
                );
                // return resolve(ancEncounter);
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_infant,
                    pncData.submission_uuid,
                    `sent`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              })
              .catch((err) => {
                console.log(
                  `Error creating encounter for patient uuid = ${pncData.submission_uuid},${err} :🚫\n`
                );
                //update openmrs status
                odkCentralStagingData
                  .updateOpenmrsStatus(
                    stag_odk_pnc_infant,
                    pncData.submission_uuid,
                    `pending`
                  )
                  .then((updateResponse) => {
                    console.log(
                      `ODK staging record submission_uuid = ${pncData.submission_uuid}) Openmrs status updated successfully  ✅`
                    );
                    //update openmrs error table
                    odkCentralStagingData.updateOpenmrsErrorMessage(
                      stag_odk_pnc_infant,
                      pncData.submission_uuid,
                      `Error creating encounter for ${pncData.submission_uuid},${err}`
                    );
                  })
                  .catch((error) => {
                    console.log(error);
                  });
              });
          }
        });
      });
    });
  }

  createRelationShip(currentPatient, parentPtrackerId) {
    return new Promise((resolve, reject) => {
      this.getPatientUsingId(parentPtrackerId).then((parent) => {
        let results = JSON.parse(parent.body)["results"];
        console.log(results);
        if (results && results.length > 0) {
          let body = {
            relationshipType: uuids.relationshipType.parentToChild,
            personA: results[0].uuid,
            personB: currentPatient.uuid,
          };
          let options = {
            method: "POST",
            url: privateConfig.openmrsConfig.apiURL + `relationship`,
            qs: {},
            headers: privateConfig.openmrsConfig.headers,
            form: false,
            auth: {
              user: privateConfig.openmrsConfig.username,
              pass: privateConfig.openmrsConfig.password,
            },
            json: true,
            body:body,
          };
          return resolve(this.sendRequest(options));
        }
        return reject("Relationship not created");
      });
    });
  }
  //L & D infant relationship
  createInfantRelationShip(currentPatient, parentPtrackerId) {
    return new Promise((resolve, reject) => {
      if(currentPatient.body.uuid){
        this.getPatientUsingId(parentPtrackerId).then((parent) => {
          let results = JSON.parse(parent.body)["results"];
          if (results && results.length > 0) {
            let body = {
              relationshipType: uuids.relationshipType.parentToChild,
              personA: results[0].uuid,
              personB: currentPatient.body.uuid,
            };
            let options = {
              method: "POST",
              url: privateConfig.openmrsConfig.apiURL + `relationship`,
              qs: {},
              headers: privateConfig.openmrsConfig.headers,
              form: false,
              auth: {
                user: privateConfig.openmrsConfig.username,
                pass: privateConfig.openmrsConfig.password,
              },
              json: true,
              body:body,
            };
            return resolve(this.sendRequest(options));
          }
          return reject("Relationship not created");
        });
      }else{
        console.log("Infant openMRS data missing !!");
      }
    });
  }


  createANCEncounter(newPatient, ancData, locationUUID) {
    console.log("*******************PRINTING ANC obs*********************");
    let obs = this.getObs(ancData);
    console.log(obs);
    console.log("*******************fetching ANC obs*********************");

    let body = {
      encounterDatetime: ancData["visit_date"],
      patient: newPatient.uuid,
      encounterType: uuids.encounters.anc,
      location: locationUUID,
      encounterProviders: [
        {
          provider: uuids.encounters.odk_user_provider_uuid,
          encounterRole: uuids.encounters.encounter_role_uuid,
        },
      ],
      form: uuids.forms.anc_form,
      obs,
    };
    let options = {
      method: "POST",
      url: privateConfig.openmrsConfig.apiURL + `encounter`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
      json: true,
      body: body,
    };
    return this.sendRequest(options);
  }

  createMotherPNCEncounter(newPatient, motherPncData, locationUUID) {
    let obs = this.getMotherPNCObs(motherPncData);
    console.log("*******************obs*********************");
    console.log(obs);
    let body = {
      encounterDatetime: motherPncData["visit_date"],
      patient: newPatient.uuid,
      encounterType: uuids.encounters.mother_pnc,
      location: locationUUID,
      encounterProviders: [
        {
          provider: uuids.encounters.odk_user_provider_uuid,
          encounterRole: uuids.encounters.encounter_role_uuid,
        },
      ],
      form: uuids.forms.mother_pnc_form,
      obs,
    };
    let options = {
      method: "POST",
      url: privateConfig.openmrsConfig.apiURL + `encounter`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
      json: true,
      body: body,
    };
    return this.sendRequest(options);
  }

  createInfantPNCEncounter(newPatient, infantPncData, locationUUID) {
    let obs = this.getInfantPNCObs(infantPncData);
    console.log("*******************obs*********************");
    console.log(obs);

    let body = {
      encounterDatetime: infantPncData["visit_date"],
      patient: newPatient.uuid,
      encounterType: uuids.encounters.infant_pnc,
      location: locationUUID,
      encounterProviders: [
        {
          provider: uuids.encounters.odk_user_provider_uuid,
          encounterRole: uuids.encounters.encounter_role_uuid,
        },
      ],
      form: uuids.forms.infant_pnc_form,
      obs,
    };
    let options = {
      method: "POST",
      url: privateConfig.openmrsConfig.apiURL + `encounter`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
      json: true,
      body: body,
    };
    return this.sendRequest(options);
  }

  createDeliveryEncounter(newPatient, data, locationUUID) {
    return new Promise((resolve, reject) => {
      console.log("*******************delivery obs*********************");
      let obs = this.getDeliveryObs(data);
      let body = {
        encounterDatetime: data["visit_date"],
        patient: newPatient.uuid,
        encounterType: uuids.encounters.labor_and_delivery,
        location: locationUUID,
        encounterProviders: [
          {
            provider: uuids.encounters.odk_user_provider_uuid,
            encounterRole: uuids.encounters.encounter_role_uuid,
          },
        ],
        form: uuids.forms.labor_and_delivery_form,
        obs,
      };

      let options = {
        method: "POST",
        url: privateConfig.openmrsConfig.apiURL + `encounter`,
        qs: {},
        headers: privateConfig.openmrsConfig.headers,
        form: false,
        auth: {
          user: privateConfig.openmrsConfig.username,
          pass: privateConfig.openmrsConfig.password,
        },
        json: true,
        body: body,
      };
      return resolve(this.sendRequest(options));
    });
  }
  getPatientUsingId(patient_id) {
    let options = {
      method: "GET",
      url:
        privateConfig.openmrsConfig.apiURL + `patient?q=${patient_id}&limit=1`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
    };
    return this.sendRequest(options);
  }
//Country maping
async countryMapping(country) {
  if (country in countries.Countries) {
    return countries.Countries[country];
  }
  return "Unknown country specified.";
}
//District maping
async districtMapping(district) {
  if (district in districts.Districts) {
    return districts.Districts[district];
  }
  return "Unknown district specified.";

}
  //Create patient
  async createPatient(data, locationUUID) {
    var country= await this.countryMapping(data["country"]);
    var district=await this.districtMapping(data["district"]);

    console.log(country)
    console.log(district)
    let postalCode = "";
    let person = await this.createPerson(
      data["family"],
      data["given"],
      data["middle"],
      data["sex"],
      data["dob"],
      data["address"],
      district,
      data["location"],
      country,
      postalCode,
      data["age"],
      data["kin_name"],
      data["kin_contact"],
      data["phone_number"]
    );

    console.log("***********Created person**************");
    let personBody = person.body;
    // console.log(personBody.body);
    console.log("***************Getting location****************");
    let location = await this.getLocation(data["facility_name"]);
    let locationBody = location.body;

    console.log("***************Getting openmrs ID ****************");
    let openmrsIDResult = await this.generateOpenMRSID();
    let openMRSID = openmrsIDResult.body.identifiers[0];

    let patientBody = {
      person: personBody.uuid,
      identifiers: [
        {
          identifier: data["ptracker_id"],
          identifierType: uuids.identifier_type.ptracker_number,
          location: locationUUID,
          preferred: false,
        },
        {
          identifier: openMRSID,
          identifierType: uuids.identifier_type.openmrs_id,
          location: locationUUID,
          preferred: false,
        },
      ],
    };

    console.log("******************creating patient options****************");
    let options = {
      method: "POST",
      url: privateConfig.openmrsConfig.apiURL + `patient`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
      json: true,
      body: patientBody,
    };
    return this.sendRequest(options);
  }
  //Create infnt patient
  async createInfantPatient(infantData,motherData,locationUUID) {
    //Check if infant has ptracker id
    if(infantData["infant_ptracker_id"]){
      var country= await this.countryMapping(motherData["country"]);
      var district=await this.districtMapping(motherData["district"]);

      let postalCode = "";
      let family="TBD";
      let given="TBD";
      let middle="TBD";
      let age="";
      let kinName="";
      let kinContact="";
      let contact="";
      let person = await this.createPerson(
        family,
        given,
        middle,
        infantData["infant_sex"],
        infantData["infant_dob"],
        motherData["address"],
        district,
        motherData["location"],
        country,
        postalCode,
        age,
        kinName,
        kinContact,
        contact
      );
  
      console.log("***********Created person**************");
      let personBody = person.body;
      console.log(infantData);
      console.log(personBody.body);
      console.log("***************Getting location****************");
      let location = await this.getLocation(motherData["facility_name"]);
      let locationBody = location.body;
  
      console.log("***************Getting openmrs ID ****************");
      let openmrsIDResult = await this.generateOpenMRSID();
      let openMRSID = openmrsIDResult.body.identifiers[0];
  
      let patientBody = {
        person: personBody.uuid,
        identifiers: [
          {
            identifier: infantData["infant_ptracker_id"],
            identifierType: uuids.identifier_type.ptracker_number,
            location: locationUUID,
            preferred: false,
          },
          {
            identifier: openMRSID,
            identifierType: uuids.identifier_type.openmrs_id,
            location: locationUUID,
            preferred: false,
          },
        ],
      };  
      console.log("******************creating patient options****************");
      let options = {
        method: "POST",
        url: privateConfig.openmrsConfig.apiURL + `patient`,
        qs: {},
        headers: privateConfig.openmrsConfig.headers,
        form: false,
        auth: {
          user: privateConfig.openmrsConfig.username,
          pass: privateConfig.openmrsConfig.password,
        },
        json: true,
        body: patientBody,
      };
      return this.sendRequest(options);
    }else{
      console.log("infant Ptracker id missing !!")
    }
  }

  getLocation(facilityName) {
    console.log("***********getting location**********");

    let options = {
      method: "GET",
      url:
        privateConfig.openmrsConfig.apiURL +
        `/location?q=${facilityName}&v=default`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
      json: true,
      body: {},
    };

    return this.sendRequest(options);
  }

  generateOpenMRSID() {
    let body = {
      generateIdentifiers: true,
      sourceUuid: "691eed12-c0f1-11e2-94be-8c13b969e334",
      numberToGenerate: 1,
    };
    let options = {
      method: "POST",
      url: privateConfig.openmrsConfig.apiURL + `/idgen/identifiersource`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
      json: true,
      body: body,
    };
    return this.sendRequest(options);
  }

  createPerson(
    lastName,
    givenName,
    middleName,
    gender,
    dateOfBirth,
    address1,
    district,
    location,
    country,
    postalCode,
    age,
    kin_name,
    kin_contact,
    odk_contact
  ) {
    console.log("*********************** creating person ************");
    const newAge = Math.floor(age);
    let body = {};
    //Check if dataOfBirth is specified ,if not pass the age
    if (dateOfBirth != null) {
      body = {
        names: [
          {
            givenName: givenName,
            familyName: lastName,
            middleName: middleName,
          },
        ],
        gender: gender,
        age: newAge,
        birthdate: dateOfBirth,
        addresses: [
          {
            address1: address1,
            address2:location,
            countyDistrict:district,
            country: country,
            postalCode: postalCode,
          }
        ],
        attributes: [
          {
            attributeType: uuids.kin_attributes.odk_kin_name,
            value: kin_name,
          },
          {
            attributeType: uuids.kin_attributes.odk_phone_number,
            value: kin_contact,
          },
        ],
      };
    } else {
      body = {
        names: [
          {
            givenName: givenName,
            familyName: lastName,
            middleName: middleName,
          },
        ],
        gender: gender,
        age: newAge,
        addresses: [
          {
            address1: address1,
            address2:location,
            countyDistrict:district,
            country: country,
            postalCode: postalCode,
          }
        ],
        attributes: [
          {
            attributeType: uuids.kin_attributes.odk_kin_name,
            value: kin_name,
          },
          {
            attributeType: uuids.kin_attributes.odk_kin_contact,
            value: kin_contact,
          },
          {
            attributeType: uuids.kin_attributes.odk_phone_number,
            value: odk_contact,
          },
        ],
      };
    }

    console.log(body);
    let options = {
      method: "POST",
      url: privateConfig.openmrsConfig.apiURL + `person`,
      qs: {},
      headers: privateConfig.openmrsConfig.headers,
      form: false,
      auth: {
        user: privateConfig.openmrsConfig.username,
        pass: privateConfig.openmrsConfig.password,
      },
      json: true,
      body,
    };
    return this.sendRequest(options);
  }

  getObs(data) {
    if (data) {
      let obs = [];
      // --ANC--
      //anc_first_visit
      if (data["anc_first_visit"]) {
          if (data["anc_first_visit"] == "1") {
              obs.push({
                  concept: uuids.obs.anc_first_visit,
                  value: uuids.odkYesNo["1"],
              });
          }
          if (data["anc_first_visit"] == "0") {
              obs.push({
                  concept: uuids.obs.anc_first_visit,
                  value: uuids.odkYesNo["2"],
              });
          }
      } else {
          obs.push({
              concept: uuids.obs.anc_first_visit,
              value: uuids.odkYesNo["66"],
          });
      }
      //anc_gravida
      if (data["anc_gravida"]) {
          obs.push({
              concept: uuids.obs.anc_gravida,
              value: data["anc_gravida"],
          });
      } else {
          console.log("anc_gravida");
      }
      //anc_para
      if (data["anc_para"]) {
          obs.push({
              concept: uuids.obs.anc_para,
              value: data["anc_para"],
          });
      } else {
          console.log("Missing anc_para!");
      }
      //anc_edd_calculated
      if (data["anc_edd_calculated"]) {
          obs.push({
              concept: uuids.obs.anc_edd_calculated, // edd obs uuid
              value: data["anc_edd_calculated"],
          });
      } else if (data["anc_edd"]) {
          obs.push({
              concept: uuids.obs.anc_edd_calculated, // edd obs uuid
              value: data["anc_edd"],
          });
      } else {
          console.log("Missing anc_edd_calculated!");
      }
      //anc_lnmp
      if (data["anc_lnmp"]) {
          obs.push({
              concept: uuids.obs.anc_lnmp,
              value: data["anc_lnmp"],
          });
      } else {
          console.log("Missing anc_lnmp!");
      }
      //next_visit_date
      if (data["next_visit_date"]) {
          obs.push({
              concept: uuids.obs.next_visit_date,
              value: data["next_visit_date"],
          });
      } else {
          console.log("Missing next_visit_date!");
      }
      //next_visit_date_missing
      if (data["next_visit_date_missing"]) {
          obs.push({
              concept: uuids.obs.next_visit_date_missing,
              value: true,
          });
      } else {
          console.log("Missing next_visit_date_missing!");
      }
      //next_facility_to_visit
      if (data["next_facility_to_visit"]) {
          obs.push({
              concept: uuids.obs.next_facility_to_visit,
              value: uuids.odkNextFacilityToVisit[data["next_facility_to_visit"]],
          });
      } else {
          obs.push({
              concept: uuids.obs.next_facility_to_visit,
              value: uuids.odkNextFacilityToVisit["66"],
          });
      }
      //next_facility_to_visit_transfered
      if (data["next_facility_to_visit_transfered"]) {
          obs.push({
              concept: uuids.obs.next_facility_to_visit_transfered,
              value: data["next_facility_to_visit_transfered"],
          });
      } else {
          console.log("Missing next_facility_to_visit_transfered!");
      }
      //next_facility_to_visit_transfered_other
      if (data["next_facility_to_visit_transfered_other"]) {
          obs.push({
            concept: uuids.obs.next_facility_to_visit_transfered_other,
            value: data["next_facility_to_visit_transfered_other"],
          });
        } else {
          console.log("Missing next_facility_to_visit_transfered_other");
        }
      //--HIV STATUS--

      //hiv_test_status
      if (data["hiv_test_status"]) {
          obs.push({
              concept: uuids.obs.hiv_test_status,
              value: uuids.odkHIVTestStatus[data["hiv_test_status"]],
          });
      } else {
          obs.push({
              concept: uuids.obs.hiv_test_status,
              value: uuids.odkHIVTestStatus["66"],
          });
      }
      //hiv_test_result
      if (data["hiv_test_result"]) {
          obs.push({
              concept: uuids.obs.hiv_test_result,
              value: uuids.odkHivTestResult[data["hiv_test_result"].toString()],
          });
      } else {
          obs.push({
              concept: uuids.obs.hiv_test_result,
              value: uuids.odkHivTestResult["66"],
          });
      }
      //art_int_status
      if (data["art_int_status"]) {
          obs.push({
              concept: uuids.obs.art_int_status,
              value:
                  uuids.odkARTInitiationStatus[data["art_int_status"].toString()],
          });
      } else {
          obs.push({
              concept: uuids.obs.art_int_status,
              value: uuids.odkARTInitiationStatus["66"],
          });
      }
      //art initiation
      if (data["art_int_status_refused_reason"]) {
          obs.push({
              concept: uuids.obs.art_int_refused_reason,
              value: data["art_int_status_refused_reason"],
          });
      } else {
          console.log("Missing art_int_status_refused_reason!");
      }
      //art_int_status_refused_reason_missing
      if (data["art_int_status_refused_reason_missing"] == "66") {
          obs.push({
              concept: uuids.obs.art_int_status_refused_reason_missing,
              value: true,
          });
      } else {
          console.log("Missing art_int_status_refused_reason_missing!");
      }
      //art_number
      if (data["art_number"]) {
          obs.push({
              concept: uuids.obs.art_number,
              value: data["art_number"],
          });
      } else {
          if (data["art_number_missing"]) {
              obs.push({
                  concept: uuids.obs.art_number_missing,
                  value: true,
              });
          } else {
              console.log("Missing art_number_missing");
          }
      }
      //art_start_date
      if (data["art_start_date"]) {
          obs.push({
              concept: uuids.obs.art_start_date,
              value: data["art_start_date"],
          });
      } else {
          console.log("Missing art_start_date!");
      }
      //art_start_date_missing
      if (data["art_start_date_missing"]) {
          obs.push({
              concept: uuids.obs.artStartDateMissing,
              value: true,
          });
      } else {
          console.log("Missing art_start_date_missing!");
      }
      //vl_test_done
      if (data["vl_test_done"]) {
          obs.push({
              concept: uuids.obs.vl_test_done,
              value: uuids.odkVLTestDone[data["vl_test_done"].toString()],
          });
      } else {
          obs.push({
              concept: uuids.obs.vl_test_done,
              value: uuids.odkVLTestDone["66"],
          });
      }
      //vl_test_date
      if (data["vl_test_date"]) {
          obs.push({
              concept: uuids.obs.vl_test_date,
              value: data["vl_test_date"],
          });
      } else {
          console.log("Missing vl_test_date!");
      }
      //vl_test_result
      if (data["vl_test_result"]) { 
          if (data["vl_test_result"] == "2") {
            obs.push({
              concept: uuids.obs.vl_test_result,
              value: uuids.odkVLTestResult["0"],
            });
          }
          obs.push({
            concept: uuids.obs.vl_test_result,
            value: uuids.odkVLTestResult[data["vl_test_result"].toString()],
          });
        } else {
          obs.push({
            concept: uuids.obs.vl_test_result,
            value: uuids.odkVLTestResult["66"],
          });
        }
         //vl_test_result_value
      if (data["vl_test_result_value"]) {
          obs.push({
              concept: uuids.obs.vl_test_result_value,
              value: data["vl_test_result_value"],
          });
      } else {
          console.log("Missing vl_test_result_value!");
      }

       //--PATNER TESTING--
       //partner_hivtest_done
      if (data["partner_hivtest_done"]) {
          obs.push({
              concept: uuids.obs.partner_hivtest_done,
              value: uuids.odkHIVTestDone[data["partner_hivtest_done"].toString()],
          });
      } else {
          obs.push({
              concept: uuids.obs.partner_hivtest_done,
              value: uuids.odkHIVTestDone["66"],
          });
      }
      //partner_hivtest_date
      if (data["partner_hivtest_date"]) {
          obs.push({
              concept: uuids.obs.partner_hivtest_date,
              value: data["partner_hivtest_date"],
          });
      } else {
          console.log("Missing partner_hivtest_date!");
      }
      //partner_hivtest_date_missing_id
      if (data["ptrackerpartner_hivtest_date_missing_id"]) {
          obs.push({
              concept: uuids.obs.ptrackerpartner_hivtest_date_missing_id,
              value: true,
          });
      } else {
          console.log("Missing ptrackerpartner_hivtest_date_missing_id!");
      }
      //partner_hiv_test_result
      if (data["partner_hiv_test_result"]) {
          obs.push({
              concept: uuids.obs.partner_hiv_test_result,
              value: uuids.odkHivTestResult[data["partner_hiv_test_result"]],
          });
      } else {
          obs.push({
              concept: uuids.obs.partner_hiv_test_result,
              value: uuids.odkHivTestResult["66"],
          });
      }
      //art_number_missing
      // if (data["art_number_missing"]) {
      //     obs.push({
      //         concept: uuids.obs.art_number_missing,
      //         value: 1,
      //     });
      // } else {
      //     obs.push({
      //         concept: uuids.obs.art_number_missing,
      //         value: 0,
      //     });
      // }
      /////////////////
      // if (data["anc_first_hiv_test_status"]) {
      //     obs.push({
      //         concept: uuids.obs.anc_first_hiv_test_status,
      //         value:
      //             uuids.odkANCFirstHIVTestStatus[
      //             data["anc_first_hiv_test_status"].toString()
      //             ],
      //     });
      // } else {
      //     obs.push({
      //         concept: uuids.obs.anc_first_hiv_test_status,
      //         value: uuids.odkANCFirstHIVTestStatus["66"],
      //     });
      // }
      return obs;
  } else {
      return [];
  }
  }

  getMotherPNCObs(data) {
    let obs = [];
    //pnc
    //next_pnc_visit_date
    if (data["next_pnc_visit_date"]) {
        obs.push({
          concept: uuids.obs.next_visit_date,
          value: data["next_pnc_visit_date"],
        });
      } else {
        console.log("Missing next_pnc_visit_date!");
      }
      //next_pnc_visit_facility
    if (data["next_pnc_visit_facility"]) {
      obs.push({
        concept: uuids.obs.next_facility_to_visit,
        value: uuids.odkNextFacilityToVisit[data["next_pnc_visit_facility"]],
      });
    } else {
      obs.push({
        concept: uuids.obs.next_facility_to_visit,
        value: uuids.odkNextFacilityToVisit["66"],
      });
    }
   //next_pnc_visit_facility_transfered
    if (data["next_pnc_visit_facility_transfered"]) {
      obs.push({
        concept: uuids.obs.next_facility_to_visit_transfered,
        value: data["next_pnc_visit_facility_transfered"],
      });
    } else {
      console.log("Missing next_pnc_visit_facility_transfered!");
    }
    //next_pnc_visit_facility_transfered_other

    //next_facility_to_visit_transfered_date

    //--HIV STATUS--

        //hiv_test_status
        if (data["hiv_test_status"]) {
            obs.push({
                concept: uuids.obs.hiv_test_status,
                value: uuids.odkHIVTestStatus[data["hiv_test_status"]],
            });
        } else {
            obs.push({
                concept: uuids.obs.hiv_test_status,
                value: uuids.odkHIVTestStatus["66"],
            });
        }
        //hiv_test_result
        if (data["hiv_test_result"]) {
            obs.push({
                concept: uuids.obs.hiv_test_result,
                value: uuids.odkHivTestResult[data["hiv_test_result"].toString()],
            });
        } else {
            obs.push({
                concept: uuids.obs.hiv_test_result,
                value: uuids.odkHivTestResult["66"],
            });
        }
        //art_int_status
        if (data["art_int_status"]) {
            obs.push({
                concept: uuids.obs.art_int_status,
                value:
                    uuids.odkARTInitiationStatus[data["art_int_status"].toString()],
            });
        } else {
            obs.push({
                concept: uuids.obs.art_int_status,
                value: uuids.odkARTInitiationStatus["66"],
            });
        }
        //art initiation
        if (data["art_int_status_refused_reason"]) {
            obs.push({
                concept: uuids.obs.art_int_refused_reason,
                value: data["art_int_status_refused_reason"],
            });
        } else {
            console.log("Missing art_int_status_refused_reason!");
        }
        //art_int_status_refused_reason_missing
        if (data["art_int_status_refused_reason_missing"] == "66") {
            obs.push({
                concept: uuids.obs.art_int_status_refused_reason_missing,
                value: true,
            });
        } else {
            console.log("Missing art_int_status_refused_reason_missing!");
        }
        //art_number
        if (data["art_number"]) {
            obs.push({
                concept: uuids.obs.art_number,
                value: data["art_number"],
            });
        } else {
            if (data["art_number_missing"]) {
                obs.push({
                    concept: uuids.obs.art_number_missing,
                    value: true,
                });
            } else {
                console.log("Missing art_number_missing");
            }
        }
        //art_start_date
        if (data["art_start_date"]) {
            obs.push({
                concept: uuids.obs.art_start_date,
                value: data["art_start_date"],
            });
        } else {
            console.log("Missing art_start_date!");
        }
        //art_start_date_missing
        if (data["art_start_date_missing"]) {
            obs.push({
                concept: uuids.obs.artStartDateMissing,
                value: true,
            });
        } else {
            console.log("Missing art_start_date_missing!");
        }
        //vl_test_done
        if (data["vl_test_done"]) {
            obs.push({
                concept: uuids.obs.vl_test_done,
                value: uuids.odkVLTestDone[data["vl_test_done"].toString()],
            });
        } else {
            obs.push({
                concept: uuids.obs.vl_test_done,
                value: uuids.odkVLTestDone["66"],
            });
        }
        //vl_test_date
        if (data["vl_test_date"]) {
            obs.push({
                concept: uuids.obs.vl_test_date,
                value: data["vl_test_date"],
            });
        } else {
            console.log("Missing vl_test_date!");
        }
        //vl_test_result
        if (data["vl_test_result"]) { 
            if (data["vl_test_result"] == "2") {
              obs.push({
                concept: uuids.obs.vl_test_result,
                value: uuids.odkVLTestResult["0"],
              });
            }
            obs.push({
              concept: uuids.obs.vl_test_result,
              value: uuids.odkVLTestResult[data["vl_test_result"].toString()],
            });
          } else {
            obs.push({
              concept: uuids.obs.vl_test_result,
              value: uuids.odkVLTestResult["66"],
            });
          }
           //vl_test_result_value
        if (data["vl_test_result_value"]) {
            obs.push({
                concept: uuids.obs.vl_test_result_value,
                value: data["vl_test_result_value"],
            });
        } else {
            console.log("Missing vl_test_result_value!");
        }
         /////////////////////////////////////////////////////
         //partner_hivtest_done
        if (data["partner_hivtest_done"]) {
            obs.push({
                concept: uuids.obs.partner_hivtest_done,
                value: uuids.odkHIVTestDone[data["partner_hivtest_done"].toString()],
            });
        } else {
            obs.push({
                concept: uuids.obs.partner_hivtest_done,
                value: uuids.odkHIVTestDone["66"],
            });
        }
        //partner_hivtest_date
        if (data["partner_hivtest_date"]) {
            obs.push({
                concept: uuids.obs.partner_hivtest_date,
                value: data["partner_hivtest_date"],
            });
        } else {
            console.log("Missing partner_hivtest_date!");
        }
        //partner_hivtest_date_missing_id
        if (data["ptrackerpartner_hivtest_date_missing_id"]) {
            obs.push({
                concept: uuids.obs.ptrackerpartner_hivtest_date_missing_id,
                value: true,
            });
        } else {
            console.log("Missing ptrackerpartner_hivtest_date_missing_id!");
        }
        //partner_hiv_test_result
        if (data["partner_hiv_test_result"]) {
            obs.push({
                concept: uuids.obs.partner_hiv_test_result,
                value: uuids.odkHivTestResult[data["partner_hiv_test_result"]],
            });
        } else {
            obs.push({
                concept: uuids.obs.partner_hiv_test_result,
                value: uuids.odkHivTestResult["66"],
            });
        }
    return obs;
  }

  getInfantPNCObs(data) {
    let obs = [];
    //infant pnc
    //arv_prophylaxis_status
    if (data["arv_prophylaxis_status"]) {
      obs.push({
        concept: uuids.obs.arv_prophylaxis_status,
        value:
          uuids.arvProphylaxisStatus[data["arv_prophylaxis_status"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.arv_prophylaxis_status,
        value: uuids.arvProphylaxisStatus["66"],
      });
    }
    //ctx_prophylaxis_status
    if (data["ctx_prophylaxis_status"]) {
      obs.push({
        concept: uuids.obs.ctx_prophylaxis_status,
        value:
          uuids.ctxProphylaxisStatus[data["ctx_prophylaxis_status"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.ctx_prophylaxis_status,
        value: uuids.ctxProphylaxisStatus["66"],
      });
    }
    //infant_hiv_tested
    if (data["infant_hiv_tested"]) {
      obs.push({
        concept: uuids.obs.hiv_test_status,
        value: uuids.odkInfantHIVTested[data["infant_hiv_tested"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.hiv_test_status,
        value: uuids.odkInfantHIVTested["66"],
      });
    }
    //arv_prophylaxis_adherence
    if (data["arv_prophylaxis_adherence"]) {
      obs.push({
        concept: uuids.obs.arv_prophylaxis_adherence,
        value:
          uuids.odkARVAdherence[data["arv_prophylaxis_adherence"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.arv_prophylaxis_adherence,
        value: uuids.odkARVAdherence["66"],
      });
    }
    //ctx_prophylaxis_adherence
    if (data["ctx_prophylaxis_adherence"]) {
      obs.push({
        concept: uuids.obs.ctx_prophylaxis_adherence,
        value:
          uuids.odkARVAdherence[data["ctx_prophylaxis_adherence"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.ctx_prophylaxis_adherence,
        value: uuids.odkARVAdherence["66"],
      });
    }
    //infant_hiv_test_used
    if (data["infant_hiv_test_used"]) {
      obs.push({
        concept: uuids.obs.infant_hiv_test_used,
        value: uuids.odkHIVTestUsed[data["infant_hiv_test_used"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.infant_hiv_test_used,
        value: uuids.odkHIVTestUsed["66"],
      });
    }
    //infant_hiv_test_result_pcr
    if (data["infant_hiv_test_result_pcr"]) {
      obs.push({
        concept: uuids.obs.infant_hiv_test_result_pcr,
        value:
          uuids.odkTestResult[data["infant_hiv_test_result_pcr"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.infant_hiv_test_result_pcr,
        value: uuids.odkTestResult["66"],
      });
    }
    //infant_hiv_test_result
    if (data["infant_hiv_test_result"]) {
      console.log(data["infant_hiv_test_result"]);
      obs.push({
        concept: uuids.obs.infant_hiv_test_result,
        value:
          uuids.odkRapidTestResult[data["infant_hiv_test_result"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.infant_hiv_test_result,
        value: uuids.odkRapidTestResult["66"],
      });
    }
    //infant_hiv_test_conf
    if (data["infant_hiv_test_conf"]) {
      obs.push({
        concept: uuids.obs.infant_hiv_test_conf,
        value: uuids.odkYesNoMissing[data["infant_hiv_test_conf"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.infant_hiv_test_conf,
        value: uuids.odkYesNoMissing["66"],
      });
    }
    //infant_hiv_test_conf_result
    // if (data["infant_hiv_test_conf_result"]) {
    //   obs.push({
    //     concept: uuids.obs.infant_hiv_test_conf_result,
    //     value: uuids.odkInfantConfResults[data["infant_hiv_test_conf_result"].toString()],
    //   });
    // } else {
    //   obs.push({
    //     concept: uuids.obs.infant_hiv_test_conf_result,
    //     value: uuids.odkInfantConfResults["66"],
    //   });
    // }
    //infant_breastfeeding_status
    if (data["infant_breastfeeding_status"]) {
      obs.push({
        concept: uuids.obs.infant_breastfeeding_status,
        value: uuids.odkInfantBreastFeedingStatus[data["infant_breastfeeding_status"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.infant_breastfeeding_status,
        value: uuids.odkInfantBreastFeedingStatus["66"],
      });
    }
    //infant_event_date
    if (data["infant_event_date"]) {
      obs.push({
        concept: uuids.obs.infant_event_date,
        value: data["infant_event_date"],
      });
    } else {
      console.log("Missing infant_event_date");
    }
    //infant_event_date_missing
    if (data["infant_event_date_missing"]) {
      obs.push({
        concept: uuids.obs.infant_event_date_missing,
        value:true,
      });
    } else {
      console.log("Missing infant_event_date_missing");
    }
    //infant_transferto_artclinic_date
    if (data["infant_transferto_artclinic_date"]) {
      obs.push({
        concept: uuids.obs.infant_transferto_artclinic_date,
        value:true,
      });
    } else {
      console.log("Missing infant_transferto_artclinic_date");
    }
    //infant_transferto_artclinic_date_missing
    if (data["infant_transferto_artclinic_date_missing"]) {
      obs.push({
        concept: uuids.obs.infant_transferto_artclinic_date_missing,
        value:true,
      });
    } else {
      console.log("Missing infant_transferto_artclinic_date_missing");
    }
    //infant_transferto_artclinic
    if (data["infant_transferto_artclinic"]) {
      obs.push({
        concept: uuids.obs.infant_transferto_artclinic,
        value: data["infant_transferto_artclinic"],
      });
    } else {
      console.log("Missing infant_transferto_artclinic");
    }
    //infant_transferto_artclinic_missing
    if (data["infant_transferto_artclinic_missing"]) {
      obs.push({
        concept: uuids.obs.infant_transferto_artclinic_missing,
        value:true,
      });
    } else {
      console.log("Missing infant_transferto_artclinic_missing");
    }
    //infant_transfer_status
    if (data["infant_transfer_status"]) {
      obs.push({
        concept: uuids.obs.infant_transfer_status,
        value: uuids.odkInfantTransferStatus[data["infant_transfer_status"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.infant_transfer_status,
        value: uuids.odkInfantTransferStatus["66"],
      });
    }
    //infant_transferin
    if (data["infant_transferin"]) {
      obs.push({
        concept: uuids.obs.infant_transferin,
        value: "true",
      });
    } else {
      console.log("Missing infant_transferin");
    }
    //infant_transferin_other
    if (data["infant_transferin_other"]) {
      obs.push({
        concept: uuids.obs.infant_transferin_other,
        value: data["infant_transferin_other"],
      });
    } else {
      console.log("Missing infant_transferin_other");
    }
    //infant_transferin_date
    if (data["infant_transferin_date"]) {
      obs.push({
        concept: uuids.obs.infant_transferin_date,
        value: data["infant_transferin_date"],
      });
    } else {
      console.log("Missing infant_transferin_date");
    }
  
    //infant_transferin_date_missing
    if (data["infant_transferin_date_missing"]) {
      obs.push({
        concept: uuids.obs.infant_transferin_date_missing,
        value: data["infant_transferin_date_missing"],
      });
    } else {
      console.log("Missing infant_transferin_date_missing");
    }
    //infant_transfer_out
    if (data["infant_transfer_out"]) {
      obs.push({
        concept: uuids.obs.infant_transfer_out,
        value: "true",
      });
    } else {
      console.log("Missing infant_transfer_out");
    }
    //infant_transfer_out_other
    if (data["infant_transfer_out_other"]) {
      obs.push({
        concept: uuids.obs.infant_transfer_out_other,
        value: data["infant_transfer_out_other"],
      });
    } else {
      console.log("Missing infant_transfer_out_other");
    }
    //infant_transfer_out_date
    if (data["infant_transfer_out_date"]) {
      obs.push({
        concept: uuids.obs.infant_transfer_out_date,
        value: data["infant_transfer_out_date"],
      });
    } else {
      console.log("Missing infant_transfer_out_date");
    }
    //infant_transfer_out_date_missing
    if (data["infant_transfer_out_date_missing"]) {
      obs.push({
        concept: uuids.obs.infant_transfer_out_date_missing,
        value: data["infant_transfer_out_date_missing"],
      });
    } else {
      console.log("Missing infant_transfer_out_date_missing");
    }
    //infant_next_visit_date
    if (data["infant_next_visit_date"]) {
      obs.push({
        concept: uuids.obs.next_visit_date,
        value: data["infant_next_visit_date"],
      });
    } else {
      console.log("Missing infant_next_visit_date");
    }
    //infant_next_visit_date_missing
    if (data["infant_next_visit_date_missing"]) {
      obs.push({
        concept: uuids.obs.infant_next_visit_date_missing,
        value: true,
      });
    } else {
      console.log("Missing infant_next_visit_date_missing");
    }
    //infant_art_linked
    if (data["infant_art_linked"]) {
      obs.push({
        concept: uuids.obs.infant_art_linked,
        value: uuids.odkYesNoMissing[data["infant_art_linked"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.infant_art_linked,
        value: uuids.odkYesNoMissing["66"],
      });
    }
  //art_number
    if (data["art_number"]) {
      obs.push({
        concept: uuids.obs.art_number,
        value: data["art_number"],
      });
    } else {
      if (data["art_number_missing"]) {
        obs.push({
          concept: uuids.obs.art_number_missing,
          value: data["art_number_missing"],
        });
      } else {
        console.log("Missing art_number_missing");
      }
    }
      //art_number_missing
      if (data["art_number_missing"]) {
        obs.push({
          concept: uuids.obs.art_number_missing,
          value: 1,
        });
      } else {
        obs.push({
          concept: uuids.obs.art_number_missing,
          value: 0,
        });
      }
      //infant_date_death
      if (data["infant_date_death"]) {
        obs.push({
          concept: uuids.obs.infant_dod,
          value: data["infant_date_death"],
        });
      } else {
        if (data["infant_date_death_mising"]) {
          obs.push({
            concept: uuids.obs.infant_dod,
            value: data["infant_date_death_mising"],
          });
        } else {
          console.log("Missing infant_date_death_mising");
        }
      }
      //////////////////////////////////////////
    if (data["hiv_exposure_status"]) {
      obs.push({
        concept: uuids.obs.hiv_exposure_status,
        value: uuids.odkHIVExposureStatus[data["hiv_exposure_status"]],
      });
    } else {
      obs.push({
        concept: uuids.obs.hiv_exposure_status,
        value: uuids.odkHIVExposureStatus["66"],
      });
    }
    if (data["next_pnc_visit_facility_transfered"]) {
      obs.push({
        concept: uuids.obs.next_facility_to_visit_transfered,
        value: data["next_pnc_visit_facility_transfered"],
      });
    } else {
      console.log("Missing next_pnc_visit_facility_transfered");
    }
  
    if (data["hiv_test_status"]) {
      if (data["hiv_test_status"] == "1") {
        obs.push({
          concept: uuids.obs.anc_first_visit,
          value: uuids.odkHIVTestStatus["1"],
        });
      }
      if (data["hiv_test_status"] == "0") {
        obs.push({
          concept: uuids.obs.anc_first_visit,
          value: uuids.odkHIVTestStatus["2"],
        });
      }
    } else {
      obs.push({
        concept: uuids.obs.anc_first_visit,
        value: uuids.odkHIVTestStatus["66"],
      });
    }
  
    if (data["next_pnc_visit_date"]) {
      obs.push({
        concept: uuids.obs.next_visit_date,
        value: data["next_pnc_visit_date"],
      });
    } else {
      console.log("Missing next_pnc_visit_date");
    }
  
    if (data["next_visit_date_missing"]) {
      obs.push({
        concept: uuids.obs.next_visit_date_missing,
        value: true,
      });
    } else {
      console.log("Missing next_visit_date_missing");
    }
    if (data["art_int_status_refused_reason"]) {
      obs.push({
        concept: uuids.obs.art_int_refused_reason,
        value: data["art_int_status_refused_reason"],
      });
    } else {
      console.log("Missing art_int_status_refused_reason!");
    }
  
    if (data["art_int_status_refused_reason_missing"] == "66") {
      obs.push({
        concept: uuids.obs.art_int_status_refused_reason_missing,
        value: true,
      });
    } else {
      console.log("Missing art_int_status_refused_reason_missing!");
    }
  
    if (data["art_int_status"]) {
      obs.push({
        concept: uuids.obs.art_int_status,
        value: uuids.odkARTInitiationStatus[data["art_int_status"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.art_int_status,
        value: uuids.odkARTInitiationStatus["66"],
      });
    }
  
  
    if (data["art_start_date"]) {
      obs.push({
        concept: uuids.obs.art_start_date,
        value: data["art_start_date"],
      });
    } else {
      console.log("Missing art_start_date!");
    }
  
    if (data["art_start_date_missing"]) {
      obs.push({
        concept: uuids.obs.artStartDateMissing,
        value: 1,
      });
    } else {
      console.log("Missing art_start_date_missing!");
    }
  
    if (data["hiv_test_result"]) {
      obs.push({
        concept: uuids.obs.hiv_test_result,
        value: uuids.odkHivTestResult[data["hiv_test_result"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.hiv_test_result,
        value: uuids.odkHivTestResult["66"],
      });
    }
  
    if (data["hiv_test_status"]) {
      obs.push({
        concept: uuids.obs.hiv_test_status,
        value: uuids.odkHIVTestStatus[data["hiv_test_status"]],
      });
    } else {
      obs.push({
        concept: uuids.obs.hiv_test_status,
        value: uuids.odkHIVTestStatus["66"],
      });
    }
  
    if (data["vl_test_done"]) {
      obs.push({
        concept: uuids.obs.vl_test_done,
        value: uuids.odkVLTestDone[data["vl_test_done"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.vl_test_done,
        value: uuids.odkVLTestDone["66"],
      });
    }
  
    if (data["vl_test_result"]) {
      if (data["vl_test_result"] == "2") {
        obs.push({
          concept: uuids.obs.vl_test_result,
          value: uuids.odkVLTestResult["0"],
        });
      }
      obs.push({
        concept: uuids.obs.vl_test_result,
        value: uuids.odkVLTestResult[data["vl_test_result"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.vl_test_result,
        value: uuids.odkVLTestResult["66"],
      });
    }
    return obs;
  }

  getDeliveryObs(data) {
    let obs = [];

    if (data["ld_has_pinkbook"]) {
      if (data["ld_has_pinkbook"] == "1") {
        obs.push({
          concept: uuids.obs.ld_has_pinkbook,
          value: uuids.odkYesNoMissing["1"],
        });
      }
      if (data["ld_has_pinkbook"] == "0") {
        obs.push({
          concept: uuids.obs.ld_has_pinkbook,
          value: uuids.odkYesNoMissing["0"],
        });
      }
    } else {
      obs.push({
        concept: uuids.obs.ld_has_pinkbook,
        value: uuids.odkYesNoMissing["66"],
      });
    }

    if (data["ld_motherstatus"]) {
      obs.push({
        concept: uuids.obs.ld_motherstatus,
        value: uuids.odkMotherStatus[data["ld_motherstatus"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.ld_motherstatus,
        value: uuids.odkMotherStatus["66"],
      });
    }

    if (data["hiv_retest_status"]) {
      obs.push({
        concept: uuids.obs.hiv_retest_status,
        value: uuids.odkHIVReTestStatus[data["hiv_retest_status"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.hiv_retest_status,
        value: uuids.odkHIVReTestStatus["66"],
      });
    }

    if (data["next_facility_to_visit"]) {
      obs.push({
        concept: uuids.obs.next_facility_to_visit,
        value: uuids.odkNextFacilityToVisit[data["next_facility_to_visit"]],
      });
    } else {
      obs.push({
        concept: uuids.obs.next_facility_to_visit,
        value: uuids.odkNextFacilityToVisit["66"],
      });
    }

    if (data["ld_numberof_infants"]) {
      obs.push({
        concept: uuids.obs.ld_numberof_infants, // edd obs uuid
        value: data["ld_numberof_infants"],
      });
    }

    if (data["anc_first_hiv_test_status"]) {
      obs.push({
        concept: uuids.obs.anc_first_hiv_test_status,
        value:
          uuids.odkANCFirstHIVTestStatus[
          data["anc_first_hiv_test_status"].toString()
          ],
      });
    } else {
      obs.push({
        concept: uuids.obs.anc_first_hiv_test_status,
        value: uuids.odkANCFirstHIVTestStatus["66"],
      });
    }

    if (data["anc_gravida"]) {
      obs.push({
        concept: uuids.obs.anc_gravida,
        value: data["anc_gravida"],
      });
    }else {
      console.log("anc_gravida");
    }

    if (data["anc_lnmp"]) {
      obs.push({
        concept: uuids.obs.anc_lnmp,
        value: data["anc_lnmp"],
      });
    }

    if (data["next_visit_date"]) {
      obs.push({
        concept: uuids.obs.next_visit_date,
        value: data["next_visit_date"],
      });
    }

    if (data["next_visit_date_missing"]) {
      obs.push({
        concept: uuids.obs.next_visit_date_missing,
        value: true,
      });
    }

    if (data["anc_para"]) {
      obs.push({
        concept: uuids.obs.anc_para,
        value: data["anc_para"],
      });
    }

    if (data["partner_hivtest_date"]) {
      obs.push({
        concept: uuids.obs.partner_hivtest_date,
        value: data["partner_hivtest_date"],
      });
    }

    if (data["partner_hivtest_date_missing_id"]) {
      obs.push({
        concept: uuids.obs.partner_hivtest_date_missing_id,
        value: true,
      });
    }

    if (data["partner_hivtest_done"]) {
      obs.push({
        concept: uuids.obs.partner_hivtest_done,
        value: uuids.odkHIVTestDone[data["partner_hivtest_done"]],
      });
    } else {
      obs.push({
        concept: uuids.obs.partner_hivtest_done,
        value: uuids.odkHIVTestDone["66"],
      });
    }

    if (data["partner_hiv_test_result"]) {
      obs.push({
        concept: uuids.obs.partner_hiv_test_result,
        value: uuids.odkHivTestResult[data["partner_hiv_test_result"]],
      });
    } else {
      obs.push({
        concept: uuids.obs.partner_hiv_test_result,
        value: uuids.odkHivTestResult["66"],
      });
    }

    if (data["art_int_status_refused_reason"]) {
      obs.push({
        concept: uuids.obs.art_int_refused_reason,
        value: data["art_int_status_refused_reason"],
      });
    }

    if (data["art_int_status_refused_reason_missing"] == "66") {
      obs.push({
        concept: uuids.obs.art_int_status_refused_reason_missing,
        value: true,
      });
    } else {
      console.log("Missing art_int_status_refused_reason_missing!");
    }

    if (data["art_int_status"]) {
      obs.push({
        concept: uuids.obs.art_int_status,
        value: uuids.odkARTInitiationStatus[data["art_int_status"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.art_int_status,
        value: uuids.odkARTInitiationStatus["66"],
      });
    }

    if (data["art_number_missing"]) {
      obs.push({
        concept: uuids.obs.art_number_missing,
        value: 1,
      });
    } else {
      obs.push({
        concept: uuids.obs.art_number_missing,
        value: 0,
      });
    }

    if (data["art_start_date"]) {
      obs.push({
        concept: uuids.obs.art_start_date,
        value: data["art_start_date"],
      });
    }

    if (data["art_start_date_missing"]) {
      obs.push({
        concept: uuids.obs.artStartDateMissing,
        value: 1,
      });
    }

    if (data["hiv_test_result"]) {
      obs.push({
        concept: uuids.obs.hiv_test_result,
        value: uuids.odkHivTestResult[data["hiv_test_result"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.hiv_test_result,
        value: uuids.odkHivTestResult["66"],
      });
    }

    if (data["hiv_test_status"]) {
      obs.push({
        concept: uuids.obs.hiv_test_status,
        value: uuids.odkHIVTestStatus[data["hiv_test_status"]],
      });
    } else {
      obs.push({
        concept: uuids.obs.hiv_test_status,
        value: uuids.odkHIVTestStatus["66"],
      });
    }

    if (data["vl_test_done"]) {
      obs.push({
        concept: uuids.obs.vl_test_done,
        value: uuids.odkVLTestDone[data["vl_test_done"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.vl_test_done,
        value: uuids.odkVLTestDone["66"],
      });
    }

    if (data["vl_test_result"]) {
      if (data["vl_test_result"] == "2") {
        obs.push({
          concept: uuids.obs.vl_test_result,
          value: uuids.odkVLTestResult["0"],
        });
      }
      obs.push({
        concept: uuids.obs.vl_test_result,
        value: uuids.odkVLTestResult[data["vl_test_result"].toString()],
      });
    } else {
      obs.push({
        concept: uuids.obs.vl_test_result,
        value: uuids.odkVLTestResult["66"],
      });
    }

    return obs;
  }

  getInfantObs(ptrackerID, obsDatetime, encounter) {
    return new Promise((resolve, reject) => {
      console.log("**********************************")
      console.log("12::",encounter.uuid)
      odkCentralStagingData
        .getInfants(stag_odk_delivery_infant, ptrackerID)
        .then((infants) => {
          let observations = [];
          for (let i = 0; i < infants.length; i++) {
            let obs = [];
            if (infants[i]["infant_status"]) {
              obs.push({
                concept: uuids.obs.infant_status,
                value: uuids.odkInfantStatus[infants[i]["infant_status"]],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            } else {
              obs.push({
                concept: uuids.obs.infant_status,
                value: uuids.odkInfantStatus["66"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            }

            if (infants[i]["infant_stillbirth"]) {
              obs.push({
                concept: uuids.obs.infant_stillbirth,
                value:
                  uuids.odkInfantStillbirth[infants[i]["infant_stillbirth"]],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            } else {
              obs.push({
                concept: uuids.obs.infant_stillbirth,
                value: uuids.odkInfantStillbirth["66"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            }

            if (infants[i]["infant_sex"]) {
              obs.push({
                concept: uuids.obs.infant_sex,
                value: uuids.odkSex[infants[i]["infant_sex"]],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            } else {
              obs.push({
                concept: uuids.obs.infant_sex,
                value: uuids.odkSex["66"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            }

            if (infants[i]["infant_feeding"]) {
              obs.push({
                concept: uuids.obs.infant_feeding,
                value: uuids.odkInfantFeeding[infants[i]["infant_feeding"]],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            } else {
              obs.push({
                concept: uuids.obs.infant_feeding,
                value: uuids.odkInfantFeeding["66"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            }

            if (infants[i]["infant_arv_status"]) {
              obs.push({
                concept: uuids.obs.infant_arv_status,
                value: uuids.odkInfantArvStatus[infants[i]["infant_feeding"]],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            } else {
              obs.push({
                concept: uuids.obs.infant_arv_status,
                value: uuids.odkInfantArvStatus["66"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            }

            if (infants[i]["infant_arv_reason_for_refusal"]) {
              obs.push({
                concept: uuids.obs.infant_arv_reason_for_refusal,
                value: infants[i]["infant_arv_reason_for_refusal"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            } else {
              if (infants[i]["infant_arv_reason_for_refusal_missing"]) {
                obs.push({
                  concept: uuids.obs.infant_arv_reason_for_refusal_missing,
                  value: infants[i]["infant_arv_reason_for_refusal_missing"],
                  encounter: encounter.uuid,
                  person: encounter.patient.uuid,
                  obsDatetime: obsDatetime,
                });
              }
            }

            if (infants[i]["infant_ptracker_id"]) {
              obs.push({
                concept: uuids.obs.infant_ptracker_id,
                value: infants[i]["infant_ptracker_id"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            }

            if (infants[i]["infant_dob"]) {
              obs.push({
                concept: uuids.obs.infant_dob,
                value: infants[i]["infant_dob"],
                encounter: encounter.uuid,
                person: encounter.patient.uuid,
                obsDatetime: obsDatetime,
              });
            }
            observations.push(obs);
          }
          return resolve(observations);
        })
        .catch((error) => {
          console.log("*".repeat(60));
          console.log(error);
          console.log("*".repeat(60));
          return reject(error);
        });
    });
  }

  postANCEncounter(rec) {
    if (ancData) {
      let options = {
        method: "POST",
        url: privateConfig.openmrsConfig.apiURL + `encounter`,
        qs: {},
        headers: privateConfig.headers,
        form: false,
        auth: {
          user: privateConfig.openmrsConfig.username,
          pass: config.password,
        },
        json: true,
        body: {
          encounterDatetime: ancData.collect_date,
          patient: patient_uuid,
          encounterType: uuids.encounters.ancEncounter,
          location: uuids.encounters.unknown_location_uuid,
          // encounterProviders: [{
          //     provider: uuids.encounters.provider_uuid,
          //     encounterRole: uuids.encounters.encounter_role_uuid
          // }],
          form: uuids.form_uuid,
          obs: this.parseObservationsANCEncounter(
            patient_uuid,
            anData.collect_date,
            ancData,
            null
          ),
        },
      };
      return this.sendRequest(options);
    } else {
      return Promise.reject(
        `- Cannot create lab encounter without ANC data result data.\n`
      );
    }
  }
}

module.exports = { OpenMrsAPI };
