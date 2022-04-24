const request = require('request');
const privateConfig = require('../config/private-config.json');
const uuids = require('../config/uuid-dictionary.json')
const facilities = require('../config/mflCodes.json')

const config = privateConfig.odkCentralConfig;

class OpenMrsAPI {
    constructor() {}
    sendRequest(options) {
        return new Promise((resolve, reject) => {
            request(options, function(err, response, body) {
                if (err) return reject(`Error sending request to OpenMRS: ${err.message}`)
                const contentType = response.headers['content-type']
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return resolve({ response: response, body: body })
                } else {
                    return reject(null)
                }
            });
        })
    }

    async postANCData(ancData) {
        console.log(ancData['ptracker_id'])
        let patient = this.getPatientUsingId(ancData['ptracker_id'])

        patient.then(async(res) => {
            let result = JSON.parse(res.body);
            let patientRecord = result.results
            let currentPatient = null
            this.getLocation(ancData['facility_name']).then(async(location) => {
                let locationUUID = location.body.results[0].uuid
                if (patientRecord.length > 0) {
                    console.log("**************Patient found********** ")
                    currentPatient = patientRecord[0]
                    this.createANCEncounter(currentPatient, ancData, locationUUID).then(ancEncounter => {
                        console.log('***************************** Creating ANC Encounter ***************')
                        console.log(ancEncounter.body)
                    }).catch(err => {
                        console.log(err)
                    })

                } else {
                    console.log("**************Creating new Patient************* ")
                    await this.createPatient(ancData, locationUUID).then(async(response)=>{
                        await this.createANCEncounter(response, ancData, locationUUID).then(ancEncounter => {
                            console.log('***************************** CREATING ANC ENCOUNTER ***************')
                            let encounter = ancEncounter.body
                            console.log(encounter)
    
                        }).catch(err => {
                            console.log(err)
                        })
                     })
                }
            })

        })
    }

    createANCEncounter(newPatient, ancData, locationUUID) {
        let obs = this.getObs(ancData)
        console.log("*******************obs*********************")
        console.log(obs)

        let body = {
            encounterDatetime: ancData['visit_date'],
            patient: newPatient.uuid,
            encounterType: uuids.encounters.anc,
            location: locationUUID,
            encounterProviders: [{
                provider: uuids.encounters.odk_user_provider_uuid,
                encounterRole: uuids.encounters.encounter_role_uuid
            }],
            form: uuids.forms.anc_form,
            obs

        }
        let options = {
            method: 'POST',
            url: privateConfig.openmrsConfig.apiURL + `encounter`,
            qs: {},
            headers: privateConfig.openmrsConfig.headers,
            form: false,
            auth: {
                user: privateConfig.openmrsConfig.username,
                pass: privateConfig.openmrsConfig.password
            },
            json: true,
            body: body
        }
        return this.sendRequest(options)
    }
    getPatientUsingId(patient_id) {
        let options = {
            method: 'GET',
            url: privateConfig.openmrsConfig.apiURL + `patient?q=${patient_id}&limit=1`,
            qs: {},
            headers: privateConfig.openmrsConfig.headers,
            form: false,
            auth: {
                user: privateConfig.openmrsConfig.username,
                pass: privateConfig.openmrsConfig.password
            }
        }
        return this.sendRequest(options)
    }


    async createPatient(data, locationUUID) {
        let personBody;
        let postalCode = ""
       await this.createPerson(data['family'], data['given'], data['sex'], data['dob'], data['address'], data['location'], data['country'], postalCode)
            .then((person) => {
                console.log("***********Created person**************")
                let person_body = person.body
                personBody=person_body;
                return person_body;
            }).catch(err => console.error(err));

           await  this.getLocation(data)
            .then(location => {
                console.log("****************Location created************")
                return location;
            }).catch(err => {
                console.log("error")
                console.error(err)
            });

           await this.generateOpenMRSID()
            .then(openMRSIDResult => {
                console.log("generating openmrs id")
                let openMRSID = openMRSIDResult.body.identifiers[0]
                let patientBody = {
                    "person": personBody.uuid,
                    "identifiers": [{
                            "identifier": data['ptracker_id'],
                            "identifierType": uuids.identifier_type.ptracker_number,
                            "location": locationUUID,
                            "preferred": false
                        },
                        {
                            "identifier": openMRSID,
                            "identifierType": uuids.identifier_type.openmrs_id,
                            "location": locationUUID,
                            "preferred": false
                        }

                    ]
                }
                console.log('******************creating patient options****************')
                let options = {
                    method: 'POST',
                    url: privateConfig.openmrsConfig.apiURL + `patient`,
                    qs: {},
                    headers: privateConfig.openmrsConfig.headers,
                    form: false,
                    auth: {
                        user: privateConfig.openmrsConfig.username,
                        pass: privateConfig.openmrsConfig.password
                    },
                    json: true,
                    body: patientBody
                }
                console.log("****************sending post for patient********************")
                return this.sendRequest(options);  
            }).catch(err => {
                console.error("error creating patient")
                console.error(err)
            });
    }

    getLocation(facilityName) {
        console.log("***********getting location**********")

        let options = {
            method: 'GET',
            url: privateConfig.openmrsConfig.apiURL + `/location?q=${facilityName}&v=default`,
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

    generateOpenMRSID() {
        let body = {
            "generateIdentifiers": true,
            "sourceUuid": "691eed12-c0f1-11e2-94be-8c13b969e334",
            "numberToGenerate": 1
        }
        let options = {
            method: 'POST',
            url: privateConfig.openmrsConfig.apiURL + `/idgen/identifiersource`,
            qs: {},
            headers: privateConfig.openmrsConfig.headers,
            form: false,
            auth: {
                user: privateConfig.openmrsConfig.username,
                pass: privateConfig.openmrsConfig.password
            },
            json: true,
            body: body
        }
        return this.sendRequest(options)
    }

    createPerson(lastName, givenName, gender, dateOfBirth, address1, cityVillage, country, postalCode) {
        console.log("*********************** creating person ************")
        let body = {
            names: [{ givenName: givenName, familyName: lastName }],
            gender: gender,
            birthdate: dateOfBirth,
            addresses: [{
                address1: address1,
                cityVillage: cityVillage,
                country: country,
                postalCode: postalCode
            }]
        }


        let options = {
                method: 'POST',
                url: privateConfig.openmrsConfig.apiURL + `person`,
                qs: {},
                headers: privateConfig.openmrsConfig.headers,
                form: false,
                auth: {
                    user: privateConfig.openmrsConfig.username,
                    pass: privateConfig.openmrsConfig.password
                },
                json: true,
                body
            }
        return this.sendRequest(options)

    }

    getObs(data) {
        let obs = []
        if (data['anc_edd_calculated']) {
            obs.push({
                "concept": uuids.obs.anc_edd_calculated, // edd obs uuid
                "value": data['anc_edd_calculated']
            })
        }
        else if (data['anc_edd']) {
          obs.push({
              "concept": uuids.obs.anc_edd_calculated, // edd obs uuid
              "value": data['anc_edd']
          })
      }

        if (data["next_facility_to_visit"]) {
            obs.push({
                "concept": uuids.obs.next_facility_to_visit,
                "value": uuids.odkNextFacilityToVisit[data["next_facility_to_visit"]]
            })
        } else {
            obs.push({
                "concept": uuids.obs.next_facility_to_visit,
                "value": uuids.odkNextFacilityToVisit["66"]
            })
        }


        if (data["next_facility_to_visit_transfered"]) {
            obs.push({
                "concept": uuids.obs.next_facility_to_visit_transfered,
                "value": data["next_facility_to_visit_transfered"]
            })
        }


        if (data["anc_first_hiv_test_status"]) {
          if (data["anc_first_hiv_test_status"] == "1") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkYesNo["1"]
              })
          }
          if (data["anc_first_hiv_test_status"] == "0") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkYesNo["2"]
          })
        }

        } else {
            obs.push({
                "concept": uuids.obs.anc_first_visit,
                "value": uuids.odkYesNo[data["66"]]
            })
        }

        if (data["partner_hivtest_done"].length > 0) {
          if (data["partner_hivtest_done"] == "1") {
            obs.push({
              "concept": uuids.obs.partner_hivtest_done,
              "value": uuids.odkPartnerHIVTestDone["1"]
            })
          }
          if (data["partner_hivtest_done"] == "2") {
            obs.push({
              "concept": uuids.obs.partner_hivtest_done,
              "value": uuids.odkPartnerHIVTestDone["2"]
            })
          }
          if (data["partner_hivtest_done"] == "0") {

                obs.push({
                    "concept": uuids.obs.partner_hivtest_done,
                    "value": uuids.odkPartnerHIVTestDone["0"]
                })
            }

        } else {
            obs.push({
                "concept": uuids.obs.partner_hivtest_done,
                "value": uuids.odkPartnerHIVTestDone[data["66"]]
            })
        }

        if (data["anc_gravida"]) {
            obs.push({
                "concept": uuids.obs.anc_gravida,
                "value": data["anc_gravida"]
            })
        }

        if (data["anc_lnmp"]) {
            obs.push({
                "concept": uuids.obs.anc_lnmp,
                "value": data["anc_lnmp"]
            })
        }

        if (data["next_visit_date"]) {
            obs.push({
                "concept": uuids.obs.next_visit_date,
                "value": data["next_visit_date"]
            })
        }

        if (data["next_visit_date_missing"]) {
            obs.push({
                "concept": uuids.obs.next_visit_date_missing,
                "value": true
            })
        }

        if (data["anc_para"]) {
            obs.push({
                "concept": uuids.obs.anc_para,
                "value": data["anc_para"]
            })
        }

        if (data["partner_hivtest_date"]) {
            obs.push({
                "concept": uuids.obs.partner_hivtest_date,
                "value": data["partner_hivtest_date"]
            })
        }

        if (data["ptrackerpartner_hivtest_date_missing_id"]) {
            obs.push({
                "concept": uuids.obs.ptrackerpartner_hivtest_date_missing_id,
                "value": true
            })
        }


        // if (data["anc_art_initiation"]) {
        //   if (data["anc_art_initiation"] == 1)
        //   obs.push({
        //       "concept": uuids.obs.anc_art_initiation,
        //       "value": uuids.odkARTInitiation["1"]
        //     })
        //   }
        //   else if (data["anc_art_initiation"] == 0) {
        //   obs.push({
        //       "concept": uuids.obs.anc_art_initiation,
        //       "value": uuids.odkARTInitiation["2"]
        //     })
        //   }
        //   else {
        //     obs.push({
        //       "concept": uuids.obs.anc_art_initiation,
        //       "value": uuids.odkARTInitiation["66"]
        //     })
        //   }



        if (data["partner_hiv_test_result"]) {
            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHivTestResult[data["partner_hiv_test_result"]]
            })
        } else {
            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHivTestResult["66"]
            })
        }

        if (data["art_int_status_refused_reason"]) {
          
          obs.push({
            "concept": uuids.obs.art_int_refused_reason,
            "value": data["art_int_status_refused_reason"]
          })
        }
        
        if (data["art_int_status_refused_reason_missing"]) {
            obs.push({
                "concept": uuids.obs.art_int_status_refused_reason_missing,
                "value": data["art_int_status_refused_reason_missing"]
            })
        }

        if (data["art_int_status"]) {
            obs.push({
                "concept": uuids.obs.art_int_status,
                "value": uuids.odkARTInitiationStatus[data["art_int_status"].toString()]
            })
        } else {
            obs.push({
                "concept": uuids.obs.art_int_status,
                "value": uuids.odkARTInitiationStatus["66"]

            })
        }

        if (data["art_number_missing"]) {
            obs.push({
                "concept": uuids.obs.art_number_missing,
                "value": 1
            })
        }

        else {
          obs.push({
            "concept": uuids.obs.art_number_missing,
            "value": 0
        })
        }

        if (data["art_start_date"]) {
            obs.push({
                "concept": uuids.obs.art_start_date,
                "value": data["art_start_date"]
            })
        }

        if (data["art_start_date_missing"]) {
            obs.push({
                "concept": uuids.obs.artStartDateMissing,
                "value": 1
            })
        }

        if (data["hiv_test_result"]) {
            obs.push({
                "concept": uuids.obs.hiv_test_result,
                "value": uuids.odkHivTestResult[data["hiv_test_result"].toString()]
            })
        } else {
            

            obs.push({
                "concept": uuids.obs.hiv_test_result,
                "value": uuids.odkHivTestResult["66"]
            })
        }


        if (data["hiv_test_status"]) {
            obs.push({
                "concept": uuids.obs.hiv_test_status,
                "value": uuids.odkHIVTestStatus[data["hiv_test_status"]]
            })
        } else {
            obs.push({
                "concept": uuids.obs.hiv_test_status,
                "value": uuids.odkHIVTestStatus["66"]
            })
        }


        if (data["vl_test_done"]) {
          obs.push({
            "concept": uuids.obs.vl_test_done,
              "value": uuids.odkVLTestDone[data["vl_test_done"].toString()]
            })
          }  
        else {
          obs.push({
            "concept": uuids.obs.vl_test_done,
            "value": uuids.odkVLTestDone["66"]
          })
        }

        if (data["vl_test_result"]) {
          if (data["vl_test_result"] == "2"){
            obs.push({
                "concept": uuids.obs.vl_test_result,
                "value": uuids.odkVLTestResult["0"]
              })
          }
          obs.push({
            "concept": uuids.obs.vl_test_result,
              "value": uuids.odkVLTestResult[data["vl_test_result"].toString()]
            })
          }
        else {
          obs.push({
            "concept": uuids.obs.vl_test_result,
            "value": uuids.odkVLTestResult["66"]
          })
        }


        return obs
    }

    postANCEncounter(rec) {
        if (ancData) {
            let options = {
                method: 'POST',
                url: privateConfig.openmrsConfig.apiURL + `encounter`,
                qs: {},
                headers: privateConfig.headers,
                form: false,
                auth: {
                    user: privateConfig.openmrsConfig.username,
                    pass: config.password
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
                    obs: this.parseObservationsANCEncounter(patient_uuid, anData.collect_date, ancData, null)
                }
            }
            return this.sendRequest(options)
        } else {
            return Promise.reject(`- Cannot create lab encounter without ANC data result data.\n`)
        }
    }
}

module.exports = { OpenMrsAPI }