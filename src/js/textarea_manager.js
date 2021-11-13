import {getRecType, checkInTriggerInfo, checkInActionInfo} from "./main.js";

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
function childNotContainsAndOr(block){
    let notAndOr = true; 
    block.childBlocks_.forEach( (e) => {
        if (e.type === "and" || e.type === "or") { 
            notAndOr = false;
        }
    })
    return notAndOr;
}

/**
 *
 */
function childNotContainsNot(block){
    let notNegation = true; 
    block.childBlocks_.forEach( (e) => {
        if (e.type === "not_dynamic") { 
            notNegation = false;
        }
    })
    return notNegation;
}

/**
 * This is not perfect, because when a block is deleted the focus pass on the 
 * parent block, but at least it work. I can't understand how to get the parent 
 * block of one in deleting, because when the "delete" block is captured, the 
 * block has already been removed from the worspace, hence I can't retreive its
 * parent. 
 */
export function showCorrectTextareaOperatorRemove(){
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
}

/**
 * Show the operators when a  
 * @param {*} block 
 */
export function showCorrectTextareaOperatorCreate(block){
if (checkInTriggerInfo(block)){
    if (childNotContainsAndOr(block)){
    document.getElementById("suggestor-and").removeAttribute("disabled"); 
    document.getElementById("suggestor-or").removeAttribute("disabled"); 
    }
    else {
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    }
    if (childNotContainsNot(block)){
    document.getElementById("suggestor-not").removeAttribute("disabled"); 
    }
    else {
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    }
 }
 else if (checkInActionInfo(block)){ //for the moment, just deselect all buttons. To be modified when action ops will be used
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
 }
 else if(block.type === "not_dynamic"){ //call again showcorrect... on the parent element
        if(block.parentBlock_){
            showCorrectTextareaOperatorCreate(block.parentBlock_);
        }

    }
    else if (block.type === "and" || block.type === "or"){ //call again showcorrect... on the parent element
        if(block.parentBlock_){
            showCorrectTextareaOperatorCreate(block.parentBlock_);
        }

    }
   
}

/**
 * 
 * @param {*} block 
 */
export function showCorrectTextareaOperatorMove(block){
if (checkInTriggerInfo(block)){
    console.log(block)
    if (childNotContainsAndOr(block)){
    document.getElementById("suggestor-and").removeAttribute("disabled"); 
    document.getElementById("suggestor-or").removeAttribute("disabled"); 
    }
    else {
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    }
    if (childNotContainsNot(block)){
    document.getElementById("suggestor-not").removeAttribute("disabled"); 
    }
    else {
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    }
 }
 else if (checkInActionInfo(block)){ //for the moment, just deselect all buttons. To be modified when action ops will be used
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
 }
 else if(block.type === "not_dynamic"){ //If a not/and/or is clicked/moved, don't show any possible next element
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    }
    else if (block.type === "and" || block.type === "or"){ ///If a not/and/or is clicked/moved, don't show any possible next element
    document.getElementById("suggestor-and").setAttribute("disabled", ""); 
    document.getElementById("suggestor-or").setAttribute("disabled", ""); 
    document.getElementById("suggestor-not").setAttribute("disabled", ""); 
    }
}




/**
 * 
 */
export function afterTriggerMessage(){
     let text = `
     Insert the trigger into the apposite space on the "Rule" block.
 `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}

//fare listener per quando viene connesso un trigger al blocco trigger, poi per tutti gli altri casi (operatori, azioni..)
export function afterTriggerConnectingToRuleMessage(){
     let text = `
    Modify the trigger proprieties, then add a trigger operator (and, or) if other triggers are needed, or chose an Action from the toolbox.
     `

    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}

/**
 * 
 */
export function afterTriggerOpMessage(){
 let text =  `
 Continue the editing of the trigger part selecting another trigger from the toolbox.
    `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}

/**
 * 
 */
export function afterNotMessage(){
     let text = `
        La negazione sarà applicata a questo trigger. E' possibile specificare un intervallo temporale.  
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
    let text = `
    Place the action into the apposite space in the "rule" block. 
 `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}

/**
 * 
 */
export function afterActionOpMessage(){
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
}

/**
 * 
 */
export function startTriggerEditing(){

 let text =  `
 Start the editing of the rule by selecting a trigger or an action from the toolbox.
    `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
}



/**
 * print the error type on the textarea
 * @param {*} errorType 
 */
export function suggestorErrorMessages(errorType) {
  "use strict";
  /*
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
  */
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