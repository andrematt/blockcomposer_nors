import {startRefineRule, getRecType} from "./main.js";

/**
 *  Change the type of recommendation
 */
export function changeRecTypeDiv(){
    let recType = getRecType();
    document.getElementById('rec-type-text-div').innerHTML = "";
    if(recType === "Full rule recommendations"){
        document.getElementById('rec-type-text-div').innerHTML = "Suggestion type: Full rule";
    }
    else if(recType === "Step by step recommendations"){
        document.getElementById('rec-type-text-div').innerHTML = "Suggestion type: Step-by-step";
    }
    else {
        document.getElementById('rec-type-text-div').innerHTML = "Suggestions disabled";
    }
}


/**
 * 
 */
export function afterTriggerMessage(){
    document.getElementById("suggestor-and").removeAttribute("disabled"); 
    document.getElementById("suggestor-or").removeAttribute("disabled"); 
    document.getElementById("suggestor-not").removeAttribute("disabled"); 
    document.getElementById("suggestor-action").removeAttribute("disabled"); 
    document.getElementById("suggestor-sequential").setAttribute("disabled", ""); 
    document.getElementById("suggestor-parallel").setAttribute("disabled", ""); 
     let text = `
     Click on "AND", OR", "NOT" or "ACTION" to add the operator (if needed) and obtain more precise suggestions
 `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}



/**
 * 
 */
export function afterTriggerOpMessage(){
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    document.getElementById("suggestor-action").setAttribute("disabled", ""); 
    document.getElementById("suggestor-sequential").setAttribute("disabled", ""); 
    document.getElementById("suggestor-parallel").setAttribute("disabled", ""); 
 
 let text =  `
 Continue the editing of the trigger part selecting another trigger from the toolbox or clicking on a suggested trigger.
    `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}

/**
 * 
 */
export function afterNotMessage(){
    document.getElementById("suggestor-and").removeAttribute("disabled"); 
    document.getElementById("suggestor-or").removeAttribute("disabled"); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    document.getElementById("suggestor-action").removeAttribute("disabled"); 
    document.getElementById("suggestor-sequential").setAttribute("disabled", ""); 
    document.getElementById("suggestor-parallel").setAttribute("disabled", ""); 
     let text = `
     Click on "AND", OR" or "ACTION" to add the operator (if needed) and obtain more precise suggestions
 `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}

/**
 * 
 */
export function oftenRuleEnds(){
 let text = `
 Often rules ends with this element. 
 `;
    document.getElementById('textarea-alerts').innerHTML = "";
    document.getElementById('textarea-alerts').innerHTML = text;
}

/**
 * 
 */
export function afterActionMessage(){
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    document.getElementById("suggestor-action").setAttribute("disabled", ""); 
    document.getElementById("suggestor-sequential").removeAttribute("disabled"); 
    document.getElementById("suggestor-parallel").removeAttribute("disabled"); 
     let text = `
     Click on "SEQUENTIAL" or "PARALLEL" to add the operator and obtain more precise suggestions
 `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}

/**
 * 
 */
export function afterActionOpMessage(){
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    document.getElementById("suggestor-action").setAttribute("disabled", ""); 
    document.getElementById("suggestor-sequential").setAttribute("disabled", ""); 
    document.getElementById("suggestor-parallel").setAttribute("disabled", "");
 let text =  `
 Continue the editing of the action part selecting another action from the toolbox or clicking on a suggested action.
    `;    
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}


/**
 * 
 */
export function startActionEditing(){
 let text =  `
 Start the editing of the action part selecting an action from the toolbox or clicking on a suggested action.
    `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    document.getElementById("suggestor-action").setAttribute("disabled", ""); 
    document.getElementById("suggestor-sequential").setAttribute("disabled", ""); 
    document.getElementById("suggestor-parallel").setAttribute("disabled", "");
}

/**
 * 
 */
export function startTriggerEditing(){
 let text =  `
 Start the editing of the trigger part selecting a trigger from the toolbox.
    `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    document.getElementById("suggestor-action").setAttribute("disabled", ""); 
    document.getElementById("suggestor-sequential").setAttribute("disabled", ""); 
    document.getElementById("suggestor-parallel").setAttribute("disabled", "");
}



/**
 * print the error type on the textarea
 * @param {*} errorType 
 */
export function suggestorErrorMessages(errorType) {
  "use strict";
    if (errorType === "noElements"){
    let text = "Can't generate suggestion: need at least 1 rule element inserted into the 'rule' block!"; 
    document.getElementById('textarea-alerts').innerHTML = "";
    document.getElementById('textarea-alerts').innerHTML = text;
  }
  if (errorType === "noFirstTrigger") {
    let text = "Could not create suggestion for this block type. Suggestions will be created if the first element in the 'trigger' section of 'rule' block is a trigger.";
    document.getElementById('textarea-alerts').innerHTML = "";
    document.getElementById('textarea-alerts').innerHTML = text;
  }
  else if (errorType === "noRulesWithTrigger") {
    let text = "Not enough rules were found for this trigger.";
    document.getElementById('textarea-alerts').innerHTML = "";
    document.getElementById('textarea-alerts').innerHTML = text;
  }
  else if (errorType === "noSuggestion") {
    let text = "No suggestions were found for this block.";
    document.getElementById('textarea-alerts').innerHTML = "";
    document.getElementById('textarea-alerts').innerHTML = text;
  }
  else if (errorType === "noActionSuggestion") {
    let text = "No actions to suggest for these triggers";
    document.getElementById('textarea-alerts').innerHTML = "";
    document.getElementById('textarea-alerts').innerHTML = text;
  }
}



export function printError(child, parent){
    "use strict";
    //console.log(child);
    let message = " Warning: incorrect blocks placing";
    if(child.isTrigger && parent.type==="rule"){
        message = " Warning: trigger blocks must be placed in the Trigger section of the rule block!";
    }
    else if(child.isAction && parent.type==="rule"){
        message = " Warning: action blocks must be placed in the Action section of the rule block!";
    }
    document.getElementById('textarea-alerts').innerHTML = `
        <i class="fas warning fa-exclamation-triangle"></i>${message}
    `
    ;
}

export function printPassedError(error){
    "use strict";
    let message = "";
    switch (error) {
        case "too_complex_rule":
            message = "rule too complex, not saved";
            break;
        case "wrong_protocol":
            message = `Current protocol is https, but Rule Manager URL is http.<br>\n\
                       This request has been blocked because the content must be served over HTTPS, please update the the Rule Manager URL in settings section.<br>\n\
                       Protocol HTTPS - Port: 8443`;
            break;
        case "no_node_adress":
            message ="Node server not Found or URL is not Valid";
            break;
            
        default:
            message = "default error message";
    }
    document.getElementById('textarea-alerts').innerHTML = `
    <p class="warning-message"><i class="fas fa-exclamation-triangle"></i>${message}</p> 
    `
    ;
}

export function cleanTextAreaChecks(){
    "use strict";
    document.getElementById('textarea-connections-check').innerHTML = "";
}


export function cleanTextAreaAlerts(){
    "use strict";
    document.getElementById('textarea-alerts').innerHTML = "";
}


export function cleanTextAreaExplainations(){
    "use strict";
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
}