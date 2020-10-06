import GLOBALS from "./ctx_sources.js";


export async function sendRuleDeactivationToNode(rule){
    "use strict";
    let id = {
        id: rule[0].id
    };
    getRuleActivationStatus(rule);
    $.ajax({
        type: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        //url: GLOBALS.nodeUrl + "/rest/addRuleV2/appName/" + GLOBALS.appName + "/userName/" + encodeURIComponent(targetUserName),
        url: GLOBALS.nodeUrl + "deactivateRule/",
        dataType: 'json',
        data: JSON.stringify(id),
        success: function (response)
        {
           console.log("Deactivate rule");
           console.log(response);
           getRuleActivationStatus(rule);
        },
        error: function (err) {
            console.log(err);
        }
    });
}

export async function getRuleActivationStatus(rule){
    "use strict";
    let id = {
        id: rule[0].id
    };
    $.ajax({
        type: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        //url: GLOBALS.nodeUrl + "/rest/addRuleV2/appName/" + GLOBALS.appName + "/userName/" + encodeURIComponent(targetUserName),
        url: GLOBALS.nodeUrl + "getRuleState/",
        dataType: 'json',
        data: JSON.stringify(id),
        success: function (response)
        {
           console.log("Rule status:");
           console.log(response);
        },
        error: function (err) {
            console.log(err);
        }
    });
}

/**
 * 
 */ 
export function createUpdateAction(xPath, value) {
    "use strict";
    let updateObj = {
        update: {
            entityReference: {
                xpath: xPath,
                externalModelId: "ctx"
            },
            value: {
                constant: {
                    value: value
                }
            }
        }
    };
    return updateObj;
}

export function getFirstNextOperator(triggerArray, type){
    "use strict";
    for (let i=0; i<triggerArray.length; i++){
        if(triggerArray[i].triggerType===type && triggerArray[i].nextOperator){
            return triggerArray[i].nextOperator;
        }
    }
}

export function haveSameOperator(triggers, type) {
    "use strict";
    let operator = ""
    for (var i = 1; i < triggers.length; i++) {
        if(operator === "" && triggers[i-1].nextOperator && triggers[i-1].triggerType === type){ //get first operator from triggers of my type
            operator = triggers[i-1].nextOperator;
        }
        else if(operator !== ""){
            if(triggers[i] && triggers[i].triggerType===type) { //se il trigger corrente è di tipo coerente
                if(triggers[i-1].nextOperator !== undefined && triggers[i-1].nextOperator.toUpperCase() !== operator.toUpperCase()){ //se il nextoperator del trigger corrente è diverso dal nextoperator iniziale
                        return false;
                }    
            }
        }
    }
    return true;
}