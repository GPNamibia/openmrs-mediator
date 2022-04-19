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

    postANCData(ancData) {
        //  console.log(ancData)
        console.log(ancData['ptracker_id'])

        let patient = this.getPatientUsingId(ancData['ptracker_id'])

        patient.then(res => {
            let result = JSON.parse(res.body);
            let patientRecord = result.results
            let currentPatient = null
            this.getLocation(ancData['facility_name']).then(location => {
                let locationUUID = location.body.results[0].uuid
                if (patientRecord.length > 0) {
                    console.log("**************Patient found********** ")
                    currentPatient = patientRecord[0]
                    this.createANCEncounter(currentPatient, ancData, locationUUID).then(ancEncounter => {
                        console.log('***************************** Creating ANC Encounter ***************')
                        console.log(ancEncounter.body)
                            // console.log(currentPatient)
                        console.log(ancEncounter.body)
                    }).catch(err => {
                        console.log(err)
                    })

                } else {
                    console.log("**************Creating new Patient************* ")
                    currentPatient = this.createPatient(ancData, locationUUID);
                    console.log(currentPatient);

                    this.createANCEncounter(currentPatient, ancData, locationUUID).then(ancEncounter => {
                        console.log('***************************** Creating ANC Encounter ***************')
                        console.log(currentPatient)
                        console.log(ancEncounter.body)
                        let encounter = ancEncounter.body

                        console.log(encounter)

                    }).catch(err => {
                        console.log(err)
                    })
                }
            })

        })
    }

    createANCEncounter(newPatient, ancData, locationUUID) {
        console.log("===========================================")
        console.log(ancData['provider_uuid'])

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
        console.log(body)
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

    createPatient(data, locationUUID) {
        // lastName, givenName, gender, dateOfBirth, address1, cityVillage, country, postalCode
        let postalCode = ""
        this.createPerson(data['family'], data['given'], data['sex'], data['dob'], data['address'], data['location'], data['country'], postalCode)
            .then((person) => {
                console.log("***********Created person**************")
                console.log(person.body)
                let person_body = person.body

                this.getLocation(data)
                    .then(location => {
                        console.log("****************Location created************")
                        this.generateOpenMRSID()
                            .then(openMRSIDResult => {
                                console.log("generating openmrs id")
                                let openMRSID = openMRSIDResult.body.identifiers[0]
                                let patientBody = {
                                    "person": person_body.uuid,
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
                                console.log("*******************patientBody*****************")

                                console.log(patientBody)
                                console.log('creating patient options')
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
                                console.log("sending post for patient")
                                this.sendRequest(options).then(patientResult => {
                                        return patientResult.body
                                    })
                                    .catch(patientErr => {
                                        console.log(patientErr)
                                    })
                                console.log(openMRSIDResult.body)
                            })

                        return true
                    }).catch(err => {
                        console.log("error")
                        console.error(err)
                    })

            }).catch(err => console.error(err));
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
            // console.log(options)
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

        if (data["next_facility_to_visit"]) {
            console.log("next facility to visit data")
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
            console.log("=======================NEXT================")
            console.log(data["next_facility_to_visit_transfered"])
            obs.push({
                "concept": uuids.obs.next_facility_to_visit_transfered, // edd obs uuid
                "value": facilities[data["next_facility_to_visit_transfered"]]
            })
        }


        if (data["anc_first_hiv_test_status"]) {
            if (data["anc_first_hiv_test_status"] == "1") {
                obs.push({
                    "concept": uuids.obs.anc_first_visit,
                    "value": uuids.odkYesNo[data["1"]]
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

        if (data["partner_hivtest_done"]) {
            console.log("----------patner hivtest done------");
            console.log(data["partner_hivtest_done"]);
            if (data["partner_hivtest_done"] == "1") {
                obs.push({
                    "concept": uuids.obs.partner_hivtest_done,
                    "value": uuids.odkHIVTestDone["1"]
                })
            }
            if (data["partner_hivtest_done"] == "2") {
                obs.push({
                    "concept": uuids.obs.partner_hivtest_done,
                    "value": uuids.odkHIVTestDone["2"]
                })
            }
            if (data["partner_hivtest_done"] == "0") {
                obs.push({
                    "concept": uuids.obs.partner_hivtest_done,
                    "value": uuids.odkHIVTestDone["2"]
                })
            }

        } else {
            obs.push({
                "concept": uuids.obs.partner_hivtest_done,
                "value": uuids.odkHIVTestDone[data["66"]]
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
            console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%")
            console.log(data["next_visit_date"])
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

        if (data["partner_hivtest_done"]) {

            obs.push({
                "concept": uuids.obs.partner_hivtest_done,
                "value": uuids.odkHIVTestDone[data["partner_hivtest_done"]]
            })
        } else {
            obs.push({
                "concept": uuids.obs.partner_hivtest_done,
                "value": uuids.odkHIVTestDone["66"]
            })
        }

        // if (data["anc_art_initiation"]) {
        //   obs.push({
        //       "concept": uuids.obs.anc_art_initiation,
        //       "value": uuids.odkARTInitiation[data["anc_art_initiation"]]
        //     })
        //   }
        //   else {
        //     obs.push({
        //       "concept": uuids.obs.anc_art_initiation,
        //       "value": uuids.odkARTInitiation["66"]
        //     })
        //   }



        if (data["partner_hiv_test_result"]) {
            console.log("==============Result Found=============")

            console.log(uuids.odkHivTestResult[data["partner_hiv_test_result"]])
            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHivTestResult[data["partner_hiv_test_result"]]
            })
        } else {
            console.log("==============No result=============")

            console.log(uuids.odkHivTestResult["66"])

            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHivTestResult["66"]
            })
        }

        if (data["art_int_status_refused_reason"] && !data["art_int_refused_reason_missing"]) {
            console.log("ART initiation reason available")
            obs.push({
                "concept": uuids.obs.art_int_refused_reason,
                "value": uuids.odkARTInitiationStatus[data["art_int_status_refused_reason"]]
            })
        }

        if (data["art_int_refused_reason_missing"]) {
            console.log("ART initiation reason available")
            obs.push({
                "concept": uuids.obs.art_int_refused_reason_missing,
                "value": data["art_int_refused_reason_missing"]
            })
        }

        if (data["art_int_status"]) {
            console.log("==============ART initiation Status available=============")

            // console.log(uuids.art_int_status[data["art_int_status"]])
            obs.push({
                "concept": uuids.obs.art_int_status,
                "value": uuids.odkARTInitiationStatus[data["art_int_status"]]
            })
        } else {
            console.log("==============No ART initiation status =============")

            obs.push({
                "concept": uuids.obs.art_int_status,
                "value": uuids.odkARTInitiationStatus["66"]

            })
        }

        if (data["art_number_missing"]) {
            console.log("ART Number Missing available")
            obs.push({
                "concept": uuids.obs.art_number_missing,
                "value": data["art_number_missing"]
            })
        }

        if (data["art_start_date"]) {
            console.log("ART Start Date")
            obs.push({
                "concept": uuids.obs.art_start_date,
                "value": data["art_start_date"]
            })
        }

        if (data["art_start_date_missing"]) {
            console.log("ART Number Start Date Missing")
            obs.push({
                "concept": uuids.obs.artStartDateMissing,
                "value": data["art_start_date_missing"]
            })
        }

        if (data["hiv_test_result"]) {
            console.log("==============Result Found=============")

            console.log(uuids.odkHivTestResult[data["hiv_test_result"]])
            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHivTestResult[data["hiv_test_result"]]
            })
        } else {
            console.log("==============No result=============")

            console.log(uuids.odkHivTestResult["66"])

            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHivTestResult["66"]
            })
        }


        if (data["hiv_test_status"]) {
            console.log("==============Result Found=============")

            console.log(uuids.odkHIVTestStatus[data["hiv_test_status"]])
            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHIVTestStatus[data["hiv_test_status"]]
            })
        } else {
            console.log("==============No result=============")

            console.log(uuids.odkHIVTestStatus["66"])

            obs.push({
                "concept": uuids.obs.partner_hiv_test_result,
                "value": uuids.odkHIVTestStatus["66"]
            })
        }


        // if (data["vl_test_done"]) {
        //   console.log("==============Result Found=============")

        //   console.log(uuids.odkVLTestDone[data["vl_test_done"]])
        //   obs.push({
        //     "concept": uuids.obs.vl_test_done,
        //       "value": uuids.odkVLTestDone[data["vl_test_done"]]
        //     })
        //   }  
        // else {
        //   console.log("==============No result=============")

        //   console.log(uuids.odkVLTestDone["66"])

        //   obs.push({
        //     "concept": uuids.obs.vl_test_done,
        //     "value": uuids.odkVLTestDone["66"]
        //   })
        // }

        // if (data["vl_test_date"]) {
        //   console.log("VL test Date Missing")
        //   obs.push({
        //     "concept": uuids.obs.vl_test_date,
        //       "value": data["vl_test_date"]
        //     })
        // }


        // if (data["vl_test_result"]) {
        //   console.log("==============Result Found=============")

        //   console.log(uuids.odkVLTestResult[data["vl_test_result"]])
        //   obs.push({
        //     "concept": uuids.obs.vl_test_result,
        //       "value": uuids.odkVLTestResult[data["vl_test_result"]]
        //     })
        //   }
        // else {
        //   console.log("==============No result=============")

        //   console.log(uuids.odkVLTestDone["66"])

        //   obs.push({
        //     "concept": uuids.obs.vl_test_result,
        //     "value": uuids.odkVLTestResult["66"]
        //   })
        // }


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
            return Promise.reject(`- Cannot create lab encounter without lab result data.\n`)
        }
    }
}

module.exports = { OpenMrsAPI }