import {startRefineRule} from "./main.js";

/**
 * 
 */
export function clearSuggestorTextarea(){
    document.getElementById('textarea-suggestor').innerHTML = "";
}

/**
 * 
 */
export function afterTriggerMessage(){
 let text =  `
 Click on <e class="link-textarea" id="textarea-and">And</e>, <e class="link-textarea" id="textarea-or">Or</e>, <e class="link-textarea" id="textarea-not">Not</e> or <e class="link-textarea" id="textarea-rule">Action</e> tfor a more refined suggestion about the next block.
    `;
    document.getElementById('textarea-suggestor').innerHTML = "";
    document.getElementById('textarea-suggestor').innerHTML = text;
    document.getElementById("textarea-and").onclick = function () { startRefineRule("and") };
    document.getElementById("textarea-or").onclick = function () { startRefineRule("or") };
    document.getElementById("textarea-not").onclick = function () { startRefineRule("not") };
    document.getElementById("textarea-rule").onclick = function () { startRefineRule("rule") };
}



/**
 * 
 */
export function afterTriggerOpMessage(){
 let text =  `
 Continue the editing of the trigger part selecting another trigger from the toolbox or clicking on a suggested trigger.
    `;
    document.getElementById('textarea-suggestor').innerHTML = "";
    document.getElementById('textarea-suggestor').innerHTML = text;
}

/**
 * 
 */
export function afterNotMessage(){
  console.log("afternotmessage");
 let text =  `
 Click on <e class="link-textarea" id="textarea-and">And</e>, <e class="link-textarea" id="textarea-or">Or</e>, or <e class="link-textarea" id="textarea-rule">Action</e> for a more refined suggestion about the next block. 
    `;
    document.getElementById('textarea-suggestor').innerHTML = "";
    document.getElementById('textarea-suggestor').innerHTML = text;
    document.getElementById("textarea-and").onclick = function () { startRefineRule("and") };
    document.getElementById("textarea-or").onclick = function () { startRefineRule("or") };
    document.getElementById("textarea-rule").onclick = function () { startRefineRule("rule") };
}

/**
 * 
 */
export function oftenRuleEnds(){
 let text = `
 Often rules ends with this element. 
 `;
    document.getElementById('textarea-suggestor').innerHTML = "";
    document.getElementById('textarea-suggestor').innerHTML = text;
}

/**
 * 
 */
export function afterActionMessage(){
 let text = `
 Click on <e class="link-textarea" id="textarea-sequential">Sequential</e>, <e class="link-textarea" id="textarea-parallel">Parallel</e> for a more refined suggestion about the next block.
 `;
    document.getElementById('textarea-suggestor').innerHTML = "";
    document.getElementById('textarea-suggestor').innerHTML = text;
    document.getElementById("textarea-sequential").onclick = function () { startRefineRule("sequential") };
    document.getElementById("textarea-parallel").onclick = function () { startRefineRule("parallel") };
    //document.getElementById("textarea-end").onclick = function () { startRefineRule("end") };
}

/**
 * 
 */
export function afterActionOpMessage(){
 let text =  `
 Continue the editing of the action part selecting another action from the toolbox or clicking on a suggested action.
    `;
    document.getElementById('textarea-suggestor').innerHTML = "";
    document.getElementById('textarea-suggestor').innerHTML = text;
}


/**
 * 
 */
export function startActionEditing(){
 let text =  `
 Start the editing of the action part selecting an action from the toolbox or clicking on a suggested action.
    `;
    document.getElementById('textarea-suggestor').innerHTML = "";
    document.getElementById('textarea-suggestor').innerHTML = text;
}


/**
 * print the error type on the textarea
 * @param {*} errorType 
 */
export function suggestorErrorMessages(errorType) {
  "use strict";
    if (errorType === "noElements"){
    let text = "Can't generate suggestion: need at least 1 rule element inserted into the 'rule' block!"; 
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
  if (errorType === "noFirstTrigger") {
    let text = "Could not create suggestion for this block type. Suggestions will be created if the first element in the 'trigger' section of 'rule' block is a trigger.";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
  else if (errorType === "noRulesWithTrigger") {
    let text = "Not enough rules were found for this trigger.";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
  else if (errorType === "noSuggestion") {
    let text = "No suggestions were found for this trigger.";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
  else if (errorType === "noActionSuggestion") {
    let text = "No actions to suggest for these triggers";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
}



export function printError(child, parent){
    "use strict";
    //console.log(child);
    let message = " Warning: Default error message";
    if(child.isTrigger && parent.type==="rule"){
        message = " Warning: trigger blocks must be placed in the Trigger section of the rule block!";
    }
    else if(child.isAction && parent.type==="rule"){
        message = " Warning: action blocks must be placed in the Action section of the rule block!";
    }
    document.getElementById('textarea-2').innerHTML = `
        <p style="warning-message"><i class="fas fa-exclamation-triangle"></i>${message}</p> 
    `
    ;
    //ocument.getElementById('textarea-2').innerHTML = message;
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
    document.getElementById('textarea-2').innerHTML = `
    <p style="warning-message"><i class="fas fa-exclamation-triangle"></i>${message}</p> 
    `
    ;
}

export function cleanError(){
    "use strict";
    document.getElementById('textarea-2').innerHTML = "";
}



