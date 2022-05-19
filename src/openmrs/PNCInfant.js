const request = require('request');
const privateConfig = require('../config/private-config.json');
const uuids = require('../config/uuid-dictionary.json')
const facilities = require('../config/mflCodes.json')

class PNCInfant {

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
            }
        })

    })
}
  createInfantPNCEncounter(newPatient, infantPncData, locationUUID) {
    let obs = this.getObs(infantPncData)
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
}

module.exports = { PNCInfant }