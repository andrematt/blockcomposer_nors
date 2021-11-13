import {
  getUserName, getWorkspace, getTriggerInfo, getHighlightedRule,
  createRuleBlocksObj, createRuleBlocksStr, getFirstTrigger,
  getActionInfo, getTriggerWithNoNextConnection, getRuleSequence,
  returnTriggerType
} from "./main.js";
import { printPassedError } from "./textarea_manager.js";
import { prepareRulesForNode } from "./from_rule_obj_to_activable_rule.js";
import { createTimestamp, create_UUID } from "./utils.js";
import { makeRuleObj } from "./from_block_to_rule_obj.js";

import GLOBALS from "./ctx_sources.js";

export function promiseCPT(blockSequence, elementsToConsider, predictionsToObtain) {
  return new Promise(async (resolve, reject) => {
    let data = await callCPT(blockSequence, elementsToConsider, predictionsToObtain);
    resolve(data) //data ? resolve (data) : reject (data)
  });
}

export async function callCPT(blockSequence, elementsToConsider, predictionsToObtain) {
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.CPT,
      dataType: 'json',
      data: { // '[]' is automatically added after a field that contains an array. Why???
        "blockSequence[]": blockSequence,
        "elementsToConsider": elementsToConsider,
        "predictionsToObtain": predictionsToObtain
      },
    });
    console.log("CALLING CPT ON NODE");
    return result;
  } catch (error) {
    console.error(error);
  }
}

export async function activateRule() {
  "use strict";
  let rule = await getHighlightedRule().then();
  if (rule) {
    console.log(rule);
    sendRulesToNode(rule);
  }
  return true;
}


export async function deactivateRule() {
  "use strict";
  let rule = await getHighlightedRule().then();
  if (rule) {
    console.log(rule);
    sendRuleDeactivationToNode(rule);
  }
  return true;
}

// TODO controlla id di regole


/**
 * 
 * @param {*} ruleModelObj 
 */
function sendRulesToNode(ruleModelObj) {
  "use strict";
  let rule_activable_obj = prepareRulesForNode(ruleModelObj);
  console.log(rule_activable_obj);
  getRuleActivationStatus(ruleModelObj.rule);
  $.ajax({
    type: "POST",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    //url: GLOBALS.nodeUrl + "/rest/addRuleV2/appName/" + GLOBALS.appName + "/userName/" + encodeURIComponent(targetUserName),
    url: GLOBALS.nodeUrl + "activateRule/",
    dataType: 'json',
    data: JSON.stringify(ruleModelObj),
    success: function (response) {
      console.log("rule activate!");
      getRuleActivationStatus(ruleModelObj.rule);
    },
    error: function (err) {
      console.log(err);
    }
  });
}


export async function sendRuleDeactivationToNode(rule) {
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
    success: function (response) {
      console.log("Deactivate rule");
      console.log(response);
      getRuleActivationStatus(rule);
    },
    error: function (err) {
      console.log(err);
    }
  });
}

export async function getRuleActivationStatus(rule) {
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
    success: function (response) {
      console.log("Rule status:");
      console.log(response);
    },
    error: function (err) {
      console.log(err);
    }
  });
}


/**
 * Delete a rule from the "rules", "sequences" and "element/attribute" DBs. 
 */
export async function deleteRule() {
  "use strict";
  const ruleToDelete = await getHighlightedRule().then();
  if (ruleToDelete) {
    console.log("deleting ", ruleToDelete);
    const id = ruleToDelete[0].id;
    console.log(id);
    let deleteResult = await deleteSequence(id)
    .then(deleteElementAttribute(id))
    .then(deleteRuleObj(id));
  }
}

async function deleteSequence(id) {
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'deleteSequence', arguments: [id] },
    });
    console.log("delete sequence");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}


/**
 * 
 * @param {*} id 
 */
async function deleteRuleObj(id) {
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'deleteRule', arguments: [id] },
    });
    console.log("delete rule Obj");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * 
 * @param {*} id 
 */
async function deleteElementAttribute(id){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'deleteElementAttribute', arguments: [id] },
    });
    console.log("delete element att");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}


/**
 * Save rule. Just the rule obj is saved: sequences and element/att table are no more used 
 */
export async function saveRuleInDB() {
  "use strict";
  let myWorkspace = getWorkspace();
  let blocksInRule = createRuleBlocksObj();
  let blocksInRuleStr = createRuleBlocksStr(blocksInRule);
  let ruleTriggersStr = blocksInRuleStr.triggers.join();
  let ruleActionsStr = blocksInRuleStr.actions.join();
  let ruleTriggersRealNameStr = blocksInRuleStr.triggersRealName.join();
  let ruleActionsRealNameStr = blocksInRuleStr.actionsRealName.join();
  const id = create_UUID();
  let rule_xml = Blockly.Xml.workspaceToDom(myWorkspace, false); //il secondo param è no_id: gli id dei blocchi non dovrebbero servire
  let pretty_dom_xml = Blockly.Xml.domToPrettyText(rule_xml);
  let blocksDb = myWorkspace.blockDB_;
  let rule_obj = makeRuleObj(blocksDb, false, id);
  let rule_obj_str = JSON.stringify(rule_obj);
  //let rule_sequence = getRuleSequence();
  //let rule_sequence_str = JSON.stringify(rule_sequence.elements);
  //let rule_elementAttributeTable = generateElementAttributeTable(id, rule_obj);
  //let rule_elementAttributeTable_str = JSON.stringify(rule_elementAttributeTable);
  let first_trigger = getFirstTrigger();
  let user_name = getUserName();//window.localStorage.getItem('user');
  let rule_name = document.getElementById('rule_name').value;
  let timestamp = createTimestamp();
  if (user_name && rule_obj && rule_name && pretty_dom_xml) {
    //let saveResult = await saveGraph(id, user_name, rule_graph_str, first_trigger, ruleTriggersRealNameStr, ruleActionsRealNameStr, timestamp_str).then();
    //saveGraphNew(rule_id, user_name, rule_name, timestamp_str, ruleGraphArr).then();
    //await saveSequence(id, rule_sequence_str).then();
    //await saveElementAttribute(rule_elementAttributeTable).then();
    saveRule(id, user_name, rule_name, rule_obj_str, pretty_dom_xml, first_trigger, timestamp, ruleTriggersStr, ruleActionsStr);
  }
  else {
    alert ("rule NOT saved: error in rule preparation")
  }

}

/**
 * 
 * @param {*} elementAttTable 
 */
async function saveElementAttribute(elementAttTable) {
  "use strict";
  console.log(elementAttTable);
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'saveElementAtt', arguments: [elementAttTable] },
    });
    console.log("Saving element/att list");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Funzione asincrona per salvare la sequenza della regola 
 * @param {*} id 
 * @param {*} user_name 
 * @param {*} rule_graph_str 
 * @param {*} first_trigger 
 * @param {*} timestamp_str 
 */
async function saveSequence(id, rule_sequence_str) {
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'saveSingleSequence', arguments: [id, rule_sequence_str] },
    });
    console.log("Saving sequence");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Funzione asincrona per salvare i blocchi della regola 
 * @param {*} id 
 * @param {*} user_name 
 * @param {*} rule_name 
 * @param {*} rule_obj_str 
 * @param {*} pretty_dom_xml 
 * @param {*} first_trigger 
 * @param {*} timestamp_str 
 * @param {*} ruleTriggersStr 
 * @param {*} ruleActionsStr 
 */
async function saveRule(id, user_name, rule_name, rule_obj_str, pretty_dom_xml, first_trigger, timestamp_str, ruleTriggersStr, ruleActionsStr) {
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'save', arguments: [id, user_name, rule_name, rule_obj_str, pretty_dom_xml, first_trigger, timestamp_str, ruleTriggersStr, ruleActionsStr] },
    });
  } catch (error) {
    alert("Error in connecting to db, rule not saved");
  }
  console.log("save blocks ok");
  return result.result;
}

/**
 * Get di tutte le regole di un utente usando async/await. Non viene ottenuto
 * il corpo della regola ma le info aggiuntive (trigger presenti, ...)
 */
export async function getAllFromDBUser(userName) {
  "use strict";
  let result;
  if (userName) {
    try {
      result = await $.ajax({
        type: "POST",
        url: GLOBALS.db_access_url,
        dataType: 'json',
        data: { functionname: 'getAllFromUser', arguments: [userName] },
      });
      return result.result;
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Get di tutte le regole di un utente usando async/await.
 * Vengono presi tutti i campi della regola. 
 */
export async function getAllFromDBUserFullData(userName) {
  "use strict";
  let result;
  if (userName) {
    try {
      result = await $.ajax({
        type: "POST",
        url: GLOBALS.db_access_url,
        dataType: 'json',
        data: { functionname: 'getAllFromUserFullRule', arguments: [userName] },
      });
      return result.result;
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * Get di tutte le regole dal db usando async/await
 */
export async function getAllFromDB() {
  "use strict";
  console.log("getAllFromDB")
  let result;
  let user = "allUsers";
  if (user) {
    try {
      result = await $.ajax({
        type: "POST",
        url: GLOBALS.db_access_url,
        dataType: 'json',
        data: { functionname: 'getAll', arguments: [user] },
      });
      return result.result;
    } catch (error) {
      console.error(error);
    }
  }
}


/**
 * Get di tutte le regole dal db usando una chiamata ajax jquery classica
 */
export function getAllFromDBAjax() {
  "use strict";
  console.log("get all!");
  jQuery.ajax({
    type: "POST",
    url: GLOBALS.db_access_url,
    dataType: 'json',
    data: { functionname: 'getAll', arguments: ["test"] },
    success: function (obj, requestStatus) {
      console.log(requestStatus);
      if (!('error' in obj)) {
        let result = obj.result;
        return (result);
      }
      else {
        console.log(obj.error);
      }
    }
  });
}

/**
 * Get di tutte le sequenze dal db usando async/await
 */
export async function getAllSequencesFromDB() {
  "use strict";
  let result;
  let user = "allUsers";
  if (user) {
    try {
      result = await $.ajax({
        type: "POST",
        url: GLOBALS.db_access_url,
        dataType: 'json',
        data: { functionname: 'getAllSequences', arguments: [user] },
      });
      return result.result;
    } catch (error) {
      console.error(error);
    }
  }
}


/**
 * Get di tutte le righe della element/attribute table dal db usando async/await
 */
export async function getAllElementAttFromDB() {
  "use strict";
  let result;
  let user = "allUsers";
  if (user) {
    try {
      result = await $.ajax({
        type: "POST",
        url: GLOBALS.db_access_url,
        dataType: 'json',
        data: { functionname: 'getAllElementAtt', arguments: [user] },
      });
      return result.result;
    } catch (error) {
      console.error(error);
    }
  }
}

/**
 * 
 * @param {*} id 
 */
export async function getOneFromDB(id) {
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'getOne', arguments: [id] },
    });
    return result.result;
  } catch (error) {
    console.error(error);
  }
}
