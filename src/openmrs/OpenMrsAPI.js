const request = require('request');
const privateConfig = require('../config/private-config.json');
const uuids = require('../config/uuid-dictionary.json')
const facilities = require('../config/mflCodes.json')
const odkCentralStagingData = require('./getODKCentralData');
const {stag_odk_delivery_infant} = require('../../src/models')

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
                        console.log(`Encounter successfully created for patient uuid = ${ancEncounter.body.patient.uuid}`)
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

    postDeliveryData(deliveryData){
      //  console.log(ancData)
      console.log(deliveryData['ptracker_id'])
  
      let patient = this.getPatientUsingId(deliveryData['ptracker_id'])
       patient.then(res =>{
         let result =JSON.parse(res.body);
         let patientRecord = result.results
         let currentPatient = null
          this.getLocation(deliveryData['facility_name']).then(location=>{
            let locationUUID = location.body.results[0].uuid
            if (patientRecord.length > 0) {
                    console.log("**************Patient found********** ")
                    currentPatient = patientRecord[0]
                    this.createDeliveryEncounter(currentPatient, deliveryData, locationUUID).then(deliveryEncounter =>{
                  
                      console.log('***************************** Creating Delivery Encounter ***************')
                      console.log(currentPatient)
                      console.log(deliveryEncounter.body)
                      let encounter = deliveryEncounter.body
                      this.getInfantObs(deliveryData['ptracker_id'], deliveryData['visit_date'], encounter ).then(infantObs =>{
                      console.log('***************************** Infant Obs ***************')
                        for (i=1; i<=infantObs.length;i++){
                          let body = {
                                  obsDatetime: deliveryData['visit_date'],
                                  person: currentPatient.uuid,
                                  groupMembers: infantObs[i-1],
                                  encounter: encounter.uuid,
                                  concept: uuids.obs.infant_child_instance[i.toString()]
                              }
                              console.log(body)
                              let options = {
                                      method: 'POST',
                                      url: privateConfig.openmrsConfig.apiURL + `obs`,
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
    
                                  this.sendRequest(options)
                        }
                      })
      
                      }).catch(err=>{
                        console.log(err)
                    })
                    
                 } else {
                  console.log("**************Creating new Patient************* ")
                  this.createPatient(deliveryData, locationUUID).then(currentPatient=>{
                    this.createDeliveryEncounter(currentPatient, deliveryData, locationUUID).then(deliveryEncounter =>{
                  
                      console.log('***************************** Creating Delivery Encounter ***************')
                      console.log(currentPatient)
                      console.log(deliveryEncounter.body)
                      let encounter = deliveryEncounter.body
                      this.getInfantObs(deliveryData['ptracker_id'], deliveryData['visit_date'], encounter ).then(infantObs =>{
                      console.log('***************************** Infant Obs ***************')
                        for (i=1; i<=infantObs.length;i++){
                          let body = {
                                  obsDatetime: deliveryData['visit_date'],
                                  person: currentPatient.uuid,
                                  groupMembers: infantObs[i-1],
                                  encounter: encounter.uuid,
                                  concept: uuids.obs.infant_child_instance[i.toString()]
                              }
                              console.log(body)
                              let options = {
                                      method: 'POST',
                                      url: privateConfig.openmrsConfig.apiURL + `obs`,
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
    
                                  this.sendRequest(options)
                        }
                      })
      
                      }).catch(err=>{
                        console.log(err)
                    })
                   })
                    
                }
            
          })
       
       })
      }
  
      postMotherPNCData(pncData) {
        console.log(pncData['ptracker_id'])
        let patient = this.getPatientUsingId(pncData['ptracker_id'])

        patient.then(async(res) => {
            let result = JSON.parse(res.body);
            let patientRecord = result.results
            let currentPatient = null
            this.getLocation(pncData['facility_name']).then(async(location) => {
                let locationUUID = location.body.results[0].uuid
                if (patientRecord.length > 0) {
                    console.log("**************Patient found********** ")
                    currentPatient = patientRecord[0]
                    this.createMotherPNCEncounter(currentPatient, pncData, locationUUID).then(ancEncounter => {
                        console.log('***************************** Creating PNC Encounter ***************')
                        console.log(ancEncounter.body)
                    }).catch(err => {
                        console.log(err)
                    })

                } else {
                    console.log("**************Creating new Patient************* ")
                    await this.createPatient(pncData, locationUUID).then(async(response)=>{
                        await this.createMotherPNCEncounter(response, pncData, locationUUID).then(ancEncounter => {
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

    postInfantPNCData(pncData) {
      console.log(pncData['ptracker_id'])
      let patient = this.getPatientUsingId(pncData['ptracker_id'])

      patient.then(async(res) => {
          let result = JSON.parse(res.body);
          let patientRecord = result.results
          let currentPatient = null
          this.getLocation(pncData['facility_name']).then(async(location) => {
              let locationUUID = location.body.results[0].uuid
              if (patientRecord.length > 0) {
                  console.log("**************Patient found********** ")
                  currentPatient = patientRecord[0]
                  
                  this.createInfantPNCEncounter(currentPatient, pncData, locationUUID).then(ancEncounter => {
                      console.log('***************************** Creating PNC Encounter ***************')
                      console.log(ancEncounter.body)
                  }).catch(err => {
                      console.log(err)
                  })
                  if (pncData['parent_ptracker_id']) {
                    console.log("**********************linking mother to child**********************")
                   this.createRelationShip(currentPatient, pncData['parent_ptracker_id'])
                   .then(patientLink =>{
                    console.log("****************linked mother to child**********************")

                     console.log(patientLink)
                   }).catch(error =>{
                     console.error(`Error linking infant to parent: ${error}`)
                   })
                 }

              } else {
                  console.log("**************Creating new Patient************* ")
                  await this.createPatient(pncData, locationUUID).then(async(response)=>{
                      await this.createInfantPNCEncounter(response, pncData, locationUUID).then(ancEncounter => {
                          console.log('***************************** CREATING ANC ENCOUNTER ***************')
                          let encounter = ancEncounter.body
                          console.log(encounter)
  
                      }).catch(err => {
                          console.log(err)
                      })
                   })

                   if (pncData['parent_ptracker_id']) {
                     console.log("**********************linking mother to child**********************")
                    this.createRelationShip(currentPatient, pncData['parent_ptracker_id']).then(patientLink =>{
                     console.log("****************linked mother to child**********************")

                      console.log(patientLink)
                    }).catch(error =>{
                      console.error(`Error linking infant to parent: ${error}`)
                    })
                  }
              }

              
          })

      })
  }

  createRelationShip(currentPatient, parentPtrackerId){

    return new Promise((resolve, reject) => {
    console.log("start")
    this.getPatientUsingId(parentPtrackerId).then(parent =>{
      let results = JSON.parse(parent.body)["results"]
      let body = {
        relationshipType: uuids.relationshipType.parentToChild,
        personA: results[0].uuid,
        personB: currentPatient.uuid,
      }
      console.log(body)
    let options = {
        method: 'POST',
        url: privateConfig.openmrsConfig.apiURL + `relationship`,
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
    return resolve(this.sendRequest(options))
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

    createMotherPNCEncounter(newPatient, motherPncData, locationUUID) {
      let obs = this.getMotherPNCObs(motherPncData)
      console.log("*******************obs*********************")
      console.log(obs)

      let body = {
          encounterDatetime: motherPncData['visit_date'],
          patient: newPatient.uuid,
          encounterType: uuids.encounters.mother_pnc,
          location: locationUUID,
          encounterProviders: [{
              provider: uuids.encounters.odk_user_provider_uuid,
              encounterRole: uuids.encounters.encounter_role_uuid
          }],
          form: uuids.forms.mother_pnc_form,
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

  createInfantPNCEncounter(newPatient, infantPncData, locationUUID) {
    let obs = this.getInfantPNCObs(infantPncData)
    console.log("*******************obs*********************")
    console.log(obs)

    let body = {
        encounterDatetime: infantPncData['visit_date'],
        patient: newPatient.uuid,
        encounterType: uuids.encounters.infant_pnc,
        location: locationUUID,
        encounterProviders: [{
            provider: uuids.encounters.odk_user_provider_uuid,
            encounterRole: uuids.encounters.encounter_role_uuid
        }],
        form: uuids.forms.infant_pnc_form,
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


    createDeliveryEncounter(newPatient, data, locationUUID) {
      return new Promise((resolve, reject) => {
        console.log("*******************delivery obs*********************")
        let obs = this.getDeliveryObs(data)
        console.log(obs)
        let body = {
          encounterDatetime: data['visit_date'],
          patient: newPatient.uuid,
          encounterType: uuids.encounters.labor_and_delivery,
          location: locationUUID,
          encounterProviders: [{
              provider: uuids.encounters.odk_user_provider_uuid,
              encounterRole: uuids.encounters.encounter_role_uuid
          }],
          form: uuids.forms.labor_and_delivery_form,
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
      return resolve(this.sendRequest(options));
      });
      
        
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
       await this.createPerson(data['family'], data['given'], data['sex'], data['dob'], data['address'], data['location'], data['country'], postalCode, data["age"])
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

    createPerson(lastName, givenName, gender, dateOfBirth, address1, cityVillage, country, postalCode, age) {
        console.log("*********************** creating person ************")
        let body = {
            names: [{ givenName: givenName, familyName: lastName }],
            gender: gender,
            birthdate: dateOfBirth,
            age,
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


        if (data["anc_first_visit"]) {
          if (data["anc_first_visit"] == "1") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkYesNo["1"]
              })
          }
          if (data["anc_first_visit"] == "0") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkYesNo["2"]
          })
        }

        } else {
            obs.push({
                "concept": uuids.obs.anc_first_visit,
                "value": uuids.odkYesNo["66"]
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
        
        return obs
    }

    getMotherPNCObs(data) {
      let obs = []
     
        if (data["next_pnc_visit_facility"]) {
            obs.push({
                "concept": uuids.obs.next_facility_to_visit,
                "value": uuids.odkNextFacilityToVisit[data["next_pnc_visit_facility"]]
            })
        } else {
            obs.push({
                "concept": uuids.obs.next_facility_to_visit,
                "value": uuids.odkNextFacilityToVisit["66"]
            })
        }


        if (data["next_pnc_visit_facility_transfered"]) {
            obs.push({
                "concept": uuids.obs.next_facility_to_visit_transfered,
                "value": data["next_pnc_visit_facility_transfered"]
            })
        }


        if (data["hiv_test_status"]) {
          if (data["hiv_test_status"] == "1") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkHIVTestStatus["1"]
              })
          }
          if (data["hiv_test_status"] == "0") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkHIVTestStatus["2"]
          })
        }

        } else {
            obs.push({
                "concept": uuids.obs.anc_first_visit,
                "value": uuids.odkHIVTestStatus["66"]
            })
        }
        
        if (data["next_pnc_visit_date"]) {
            obs.push({
                "concept": uuids.obs.next_visit_date,
                "value": data["next_pnc_visit_date"]
            })
        }

        if (data["next_visit_date_missing"]) {
            obs.push({
                "concept": uuids.obs.next_visit_date_missing,
                "value": true
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

    getInfantPNCObs(data) {
      let obs = []
      if (data["arv_prophylaxis_status"]) {
        obs.push({
            "concept": uuids.obs.arv_prophylaxis_status,
            "value": uuids.arvProphylaxisStatus[data["arv_prophylaxis_status"].toString()]
        })
    } else {
        obs.push({
            "concept": uuids.obs.arv_prophylaxis_status,
            "value": uuids.arvProphylaxisStatus["66"]

        })
    }

    if (data["arv_prophylaxis_adherence"]) {
      obs.push({
          "concept": uuids.obs.arv_prophylaxis_adherence,
          "value": uuids.odkARVAdherence[data["arv_prophylaxis_adherence"].toString()]
      })
      }
    else {
          obs.push({
              "concept": uuids.obs.arv_prophylaxis_adherence,
              "value": uuids.odkARVAdherence["66"]

          })
      }
    
      if (data["ctx_prophylaxis_status"]) {
        obs.push({
            "concept": uuids.obs.ctx_prophylaxis_status,
            "value": uuids.ctxProphylaxisStatus[data["ctx_prophylaxis_status"].toString()]
        })
    } else {
        obs.push({
            "concept": uuids.obs.ctx_prophylaxis_status,
            "value": uuids.ctxProphylaxisStatus["66"]

        })
    }

    if (data["ctx_prophylaxis_adherence"]) {
      obs.push({
          "concept": uuids.obs.ctx_prophylaxis_adherence,
          "value": uuids.odkARVAdherence[data["ctx_prophylaxis_adherence"].toString()]
      })
  } else {
      obs.push({
          "concept": uuids.obs.ctx_prophylaxis_adherence,
          "value": uuids.odkARVAdherence["66"]

      })
  }


  if (data["infant_hiv_tested"]) {
    obs.push({
        "concept": uuids.obs.hiv_test_status,
        "value": uuids.odkInfantHIVTested[data["infant_hiv_tested"].toString()]
    })
  } else {
      obs.push({
          "concept": uuids.obs.hiv_test_status,
          "value": uuids.odkInfantHIVTested["66"]

      })
  } 

    if (data["infant_hiv_test_used"]) {
      obs.push({
          "concept": uuids.obs.infant_hiv_test_used,
          "value": uuids.odkHIVTestUsed[data["infant_hiv_test_used"].toString()]
      })
    } else {
      obs.push({
          "concept": uuids.obs.infant_hiv_tested,
          "value": uuids.odkHIVTestUsed["66"]

      })
    }


    if (data["infant_hiv_test_result"]) {
      obs.push({
          "concept": uuids.obs.infant_hiv_test_result,
          "value": uuids.odkRapidTestResult[data["infant_hiv_test_result"].toString()]
      })
    } else {
      obs.push({
          "concept": uuids.obs.infant_hiv_test_result,
          "value": uuids.odkRapidTestResult["66"]

      })
    }

    if (data["infant_hiv_test_result_pcr"]) {
      obs.push({
          "concept": uuids.obs.infant_hiv_test_result_pcr,
          "value": uuids.odkTestResult[data["infant_hiv_test_result_pcr"].toString()]
      })
    } else {
      obs.push({
          "concept": uuids.obs.infant_hiv_test_result_pcr,
          "value": uuids.odkTestResult["66"]

      })
    }

    if (data["infant_hiv_test_conf"]) {
      obs.push({
          "concept": uuids.obs.infant_hiv_test_conf,
          "value": uuids.odkYesNoMissing[data["infant_hiv_test_conf"].toString()]
      })
    } else {
      obs.push({
          "concept": uuids.obs.infant_hiv_test_conf,
          "value": uuids.odkYesNoMissing["66"]

      })
    }

    // if (data["infant_hiv_test_conf_result"]) {
    //   obs.push({
    //       "concept": uuids.obs.infant_hiv_test_conf_result,
    //       "value": uuids.odkTestResult[data["infant_hiv_test_conf_result"].toString()]
    //   })
    // } else {
    //   obs.push({
    //       "concept": uuids.obs.infant_hiv_test_conf_result,
    //       "value": uuids.odkTestResult["66"]

    //   })
    // }

    if (data["infant_art_linked"]) {
      obs.push({
          "concept": uuids.obs.infant_art_linked,
          "value": uuids.odkYesNoMissing[data["infant_art_linked"].toString()]
      })
    } else {
      obs.push({
          "concept": uuids.obs.infant_art_linked,
          "value": uuids.odkYesNoMissing["66"]

      })
    }


    if (data["infant_transfer_status"]) {
      obs.push({
          "concept": uuids.obs.infant_transfer_status,
          "value": uuids.odkInfantTransferStatus[data["infant_art_linked"].toString()]
      })
    } else {
      obs.push({
          "concept": uuids.obs.infant_transfer_status,
          "value": uuids.odkInfantTransferStatus["66"]

      })
    }
    
    if (data["art_number"]) {
      obs.push({
          "concept": uuids.obs.art_number,
          "value": data["art_number"]
      })
    } 
    else {
      if (data["art_number_missing"]) {
      obs.push({
        
        "concept": uuids.obs.art_number_missing,
        "value": data["art_number_missing"]

      })
    }
    }
 
    
      if (data["infant_next_visit_date"]) {
        obs.push({
            "concept": uuids.obs.next_visit_date,
            "value": data["infant_next_visit_date"]
          })
        }

        if (data["infant_next_visit_date_missing"]) {
          obs.push({
              "concept": uuids.obs.infant_next_visit_date_missing,
              "value": true
            })
          }

          if (data["infant_transferin"]) {
            obs.push({
                "concept": uuids.obs.infant_transferin,
                "value": "true"
              })
            }

            if (data["infant_transferin_other"]) {
              obs.push({
                  "concept": uuids.obs.infant_transferin_other,
                  "value": data["infant_transferin_other"]
                })
              }
            if (data["infant_transferin_date"]) {
              obs.push({
                  "concept": uuids.obs.infant_transferin_date,
                  "value": data["infant_transferin_other"]
                })
              }
              
            if (data["infant_transferin_date_missing"]) {
              obs.push({
                  "concept": uuids.obs.infant_transferin_date_missing,
                  "value": data["infant_transferin_date_missing"]
                })
              }

              if (data["infant_transfer_out"]) {
                obs.push({
                    "concept": uuids.obs.infant_transfer_out,
                    "value": "true"
                  })
                }
    
                if (data["infant_transfer_out_other"]) {
                  obs.push({
                      "concept": uuids.obs.infant_transfer_out_other,
                      "value": data["infant_transfer_out_other"]
                    })
                  }
                if (data["infant_transfer_out_date"]) {
                  obs.push({
                      "concept": uuids.obs.infant_transfer_out_date,
                      "value": data["infant_transfer_out_date"]
                    })
                  }
                  
        if (data["infant_transfer_out_date_missing"]) {
          obs.push({
              "concept": uuids.obs.infant_transfer_out_date_missing,
              "value": data["infant_transfer_out_date_missing"]
            })
          }

        if (data["hiv_exposure_status"]) {
            obs.push({
                "concept": uuids.obs.hiv_exposure_status,
                "value": uuids.odkHIVExposureStatus[data["hiv_exposure_status"]]
            })
        } else {
            obs.push({
                "concept": uuids.obs.hiv_exposure_status,
                "value": uuids.odkHIVExposureStatus["66"]
            })
        }

        if (data["hiv_exposure_status"]) {
          obs.push({
              "concept": uuids.obs.hiv_exposure_status,
              "value": uuids.odkHIVExposureStatus[data["hiv_exposure_status"]]
          })
      } else {
          obs.push({
              "concept": uuids.obs.hiv_exposure_status,
              "value": uuids.odkHIVExposureStatus["66"]
          })
      }


        if (data["next_pnc_visit_facility_transfered"]) {
            obs.push({
                "concept": uuids.obs.next_facility_to_visit_transfered,
                "value": data["next_pnc_visit_facility_transfered"]
            })
        }


        if (data["hiv_test_status"]) {
          if (data["hiv_test_status"] == "1") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkHIVTestStatus["1"]
              })
          }
          if (data["hiv_test_status"] == "0") {
              obs.push({
                  "concept": uuids.obs.anc_first_visit,
                  "value": uuids.odkHIVTestStatus["2"]
          })
        }

        } else {
            obs.push({
                "concept": uuids.obs.anc_first_visit,
                "value": uuids.odkHIVTestStatus["66"]
            })
        }
        
        if (data["next_pnc_visit_date"]) {
            obs.push({
                "concept": uuids.obs.next_visit_date,
                "value": data["next_pnc_visit_date"]
            })
        }

        if (data["next_visit_date_missing"]) {
            obs.push({
                "concept": uuids.obs.next_visit_date_missing,
                "value": true
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

    getDeliveryObs(data) {
      let obs = []
  
    if (data["ld_has_pinkbook"]) {
      if (data["ld_has_pinkbook"] == "1") {
          obs.push({
              "concept": uuids.obs.ld_has_pinkbook,
              "value": uuids.odkYesNoMissing["1"]
          })
      }
      if (data["ld_has_pinkbook"] == "0") {

          obs.push({
              "concept": uuids.obs.ld_has_pinkbook,
              "value": uuids.odkYesNoMissing["0"]
      })
    }

    } else {
        obs.push({
            "concept": uuids.obs.ld_has_pinkbook,
            "value": uuids.odkYesNoMissing["66"]
        })
    }

    if (data["ld_motherstatus"]) {
      obs.push({
        "concept": uuids.obs.ld_motherstatus,
        "value": uuids.odkMotherStatus[data["ld_motherstatus"].toString()]
    })
    } else {
        obs.push({
            "concept": uuids.obs.ld_motherstatus,
            "value": uuids.odkMotherStatus["66"]
        })
    }


    if (data["hiv_retest_status"]) {
      obs.push({
          "concept": uuids.obs.hiv_retest_status,
          "value": uuids.odkHIVReTestStatus[data["hiv_retest_status"].toString()]
        })
      }
    else{
      obs.push({
        "concept": uuids.obs.hiv_retest_status,
        "value": uuids.odkHIVReTestStatus["66"]
      })
    }

    if (data["next_facility_to_visit"]) {
      obs.push({
          "concept": uuids.obs.next_facility_to_visit,
          "value": uuids.odkNextFacilityToVisit[data["next_facility_to_visit"]]
        })
      }
    else{
      obs.push({
        "concept": uuids.obs.next_facility_to_visit,
        "value": uuids.odkNextFacilityToVisit["66"]
      })
    }
    

    if (data["ld_numberof_infants"]){
      
      obs.push({
        "concept": uuids.obs.ld_numberof_infants, // edd obs uuid
        "value": data["ld_numberof_infants"]
      })
    } 

    

    if (data["anc_first_hiv_test_status"]) {
      obs.push({
          "concept": uuids.obs.anc_first_hiv_test_status,
          "value": uuids.odkANCFirstHIVTestStatus[data["anc_first_hiv_test_status"].toString()]
      })
  } else {
      obs.push({
          "concept": uuids.obs.anc_first_hiv_test_status,
          "value": uuids.odkANCFirstHIVTestStatus["66"]
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

        
          if (data["partner_hivtest_done"]) {

          obs.push({
              "concept": uuids.obs.partner_hivtest_done,
              "value": uuids.odkHIVTestDone[data["partner_hivtest_done"]]
            })
          }
          else {
            obs.push({
              "concept": uuids.obs.partner_hivtest_done,
              "value": uuids.odkHIVTestDone["66"]
            })
          }
  
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

    getInfantObs(ptrackerID, obsDatetime, encounter) {
      console.log(ptrackerID)
      return new Promise((resolve, reject) => {
        odkCentralStagingData.getInfants(stag_odk_delivery_infant, ptrackerID)
      .then(infants =>{
        let observations = []

        for (i = 0; i< infants.length; i++) {
          let obs = []
          if (infants[i]['infant_status']){
            obs.push({
              "concept": uuids.obs.infant_status,
              "value": uuids.odkInfantStatus[infants[i]['infant_status']],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }
          else {
            obs.push({
              "concept": uuids.obs.infant_status,
              "value": uuids.odkInfantStatus["66"],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }

          if (infants[i]['infant_stillbirth']){
            obs.push({
              "concept": uuids.obs.infant_stillbirth,
              "value": uuids.odkInfantStillbirth[infants[i]['infant_stillbirth']],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }
          else {
            obs.push({
              "concept": uuids.obs.infant_stillbirth,
              "value": uuids.odkInfantStillbirth["66"],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }

          if (infants[i]['infant_sex']){
            obs.push({
              "concept": uuids.obs.infant_sex,
              "value": uuids.odkSex[infants[i]['infant_sex']],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }
          else {
            obs.push({
              "concept": uuids.obs.infant_sex,
              "value": uuids.odkSex["66"],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }

          if (infants[i]['infant_feeding']){
            obs.push({
              "concept": uuids.obs.infant_feeding,
              "value": uuids.odkInfantFeeding[infants[i]['infant_feeding']],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }
          else {
            obs.push({
              "concept": uuids.obs.infant_feeding,
              "value": uuids.odkInfantFeeding["66"],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }

          if (infants[i]['infant_arv_status']){
            obs.push({
              "concept": uuids.obs.infant_arv_status,
              "value": uuids.odkInfantArvStatus[infants[i]['infant_feeding']],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }
          else {
            obs.push({
              "concept": uuids.obs.infant_arv_status,
              "value": uuids.odkInfantArvStatus["66"],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
          })
          }

          if (infants[i]['infant_arv_reason_for_refusal']){
              obs.push({
                "concept": uuids.obs.infant_arv_reason_for_refusal,
                "value": infants[i]['infant_arv_reason_for_refusal'],
                "encounter": encounter.uuid,
                "person": encounter.patient.uuid,
                "obsDatetime": obsDatetime
            })
          }
          else {
            if (infants[i]['infant_arv_reason_for_refusal_missing']) {
              obs.push({
                "concept": uuids.obs.infant_arv_reason_for_refusal_missing,
                "value": infants[i]['infant_arv_reason_for_refusal_missing'],
                "encounter": encounter.uuid,
                "person": encounter.patient.uuid,
                "obsDatetime": obsDatetime
            })
            }
          }

          if (infants[i]['infant_ptracker_id']){
                obs.push({
                  "concept": uuids.obs.infant_ptracker_id,
                  "value": infants[i]['infant_ptracker_id'],
                  "encounter": encounter.uuid,
                  "person": encounter.patient.uuid,
                  "obsDatetime": obsDatetime
              })
            }

          if (infants[i]['infant_dob']){
            obs.push({
              "concept": uuids.obs.infant_dob,
              "value": infants[i]['infant_dob'],
              "encounter": encounter.uuid,
              "person": encounter.patient.uuid,
              "obsDatetime": obsDatetime
            })
          }
        observations.push(obs)
        }
        return resolve(observations)
    
      }).catch(error=>{
        console.log("*".repeat(60))
        console.log(error)
        console.log("*".repeat(60))
        return reject(error)

      })
      });
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