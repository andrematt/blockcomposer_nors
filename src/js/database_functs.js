import { getUserName, getWorkspace, getTriggerInfo, getHighlightedRule, 
         createRuleBlocksObj, createRuleBlocksStr, getTriggerWithMyCategory,
         getActionInfo 
        } from "./main.js";
import {generateMatrixFromRule} from "./blockSuggestor.js";
import {getLoggedUser} from "./login.js";
import {printPassedError} from "./compositionErrorMessages.js";
import {createUpdateAction, getFirstNextOperator, haveSameOperator, 
        sendRuleDeactivationToNode, getRuleActivationStatus} from "./sendToNodeFunctions.js";
 
import GLOBALS from "./ctx_sources.js";
let lastDepth = 0;

export async function activateRule(){
  "use strict";
  let rule = await getHighlightedRule().then();
  if (rule) {
    console.log(rule);
    sendRulesToNode(rule);
  }
  return true;
}


export async function deactivateRule(){
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
 * @param {*} matrix 
 */
export async function updateMatrixDB(id, matrix){
  "use strict";
  console.log("UPDATEmatrixDB", id, matrix);
  let timestamp = Date.now();
  let timestamp_str = "" + timestamp;
  let matrix_str = matrix.toString();
  //console.log(matrix_str);  
  let matrix_json = JSON.stringify(matrix);
  console.log(matrix_json);
  jQuery.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'updateMatrix', arguments: [id, matrix_json, timestamp_str] },
      success: function (obj, textstatus) {
        if (!('error' in obj)) {
          //let result = obj.result;
          console.log("update ok");
          //myWorkspace.clear();
          //TODO modal save ok
        }
        else {
          console.log(obj.error);
        }
      }
    }); 
  return;
}


/**
 * 
 * @param {*} matrix 
 */
export async function saveMatrixDB(matrix){
  "use strict";
  let timestamp = Date.now();
  let timestamp_str = "" + timestamp;
  let matrix_str = matrix.toString();
  //console.log(matrix_str);  
  let matrix_json = JSON.stringify(matrix);
  console.log(matrix_json);
  jQuery.ajax({
      type: "POST", 
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'saveMatrix', arguments: [matrix_json, timestamp_str] },

      success: function (obj, textstatus) {
        if (!('error' in obj)) {
          //let result = obj.result;
          console.log("save ok");
        }
        else {
          console.log(obj.error);
        }
      }
    }); 
  return;
}


/**
 * 
 */
export async function retreiveMatrixDB(){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'getMatrix', arguments: ["test"] },
    });
    console.log(result);
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * 
 */
export async function deleteRule(){
  "use strict";
  const ruleToDelete = await getHighlightedRule().then();
  if(ruleToDelete){
    console.log("deleting ", ruleToDelete);
    const id = ruleToDelete[0].id;
    console.log(id);
   let deleteResult = await deleteGraph(id).then();
   deleteBlocks(id);
  }
}

async function deleteGraph(id){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'deleteGraph', arguments: [id] },
    });
    console.log("delete graph");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}


/**
 * 
 * @param {*} id 
 */
async function deleteBlocks(id){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'delete', arguments: [id] },
    });
    console.log("delete blocks");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Salva la regola nel database regolare e in quello dei grafi
 */
export async function saveRuleInDB() {
  "use strict";
  let myWorkspace = getWorkspace();
  let blocksInRule = createRuleBlocksObj();
  let blocksInRuleStr = createRuleBlocksStr(blocksInRule);
  let ruleTriggersStr = blocksInRuleStr.triggers.join();
  let ruleActionsStr = blocksInRuleStr.actions.join();
  let ruleTriggersOpStr = blocksInRuleStr.triggers_ops? blocksInRuleStr.triggers_ops.join() : "";
  let ruleActionsOpStr = blocksInRuleStr.actions_ops? blocksInRuleStr.actions_ops.join() : "";
  let ruleTriggersRealNameStr = blocksInRuleStr.triggersRealName.join();
  let ruleActionsRealNameStr = blocksInRuleStr.actionsRealName.join();
  const id  = create_UUID();
  console.log(ruleTriggersStr);
  console.log(ruleActionsStr);
  //il secondo param è no_id: gli id dei blocchi non dovrebbero servire
  let rule_xml = Blockly.Xml.workspaceToDom(myWorkspace, false);
  let pretty_dom_xml = Blockly.Xml.domToPrettyText(rule_xml);
  console.log(pretty_dom_xml);
  //non viene salvato il graph, manda array 
  let blocksDb = myWorkspace.blockDB_;
  let rule_obj = makeRuleObj(blocksDb, false, id);
  let rule_obj_str = JSON.stringify(rule_obj);
  //let rule_xml_str = new XMLSerializer().serializeToString(rule_xml);
  let rule_graph = generateMatrixFromRule(myWorkspace);
  console.log(rule_graph);
  let rule_graph_str = JSON.stringify(rule_graph);
  console.log(rule_graph_str);
  if(typeof rule_graph === "undefined"){
    console.log("non ci sono trigger, non salvo");
    return;
  }
  let first_trigger = rule_graph[0].source;
  console.log(first_trigger);
  //let user_name = getLoggedUser();  //document.getElementById('user_name').value;
  //let user_name = document.getElementById('user_name').value;
  let user_name =  getUserName();//window.localStorage.getItem('user');
  let rule_name = document.getElementById('rule_name').value;
  let timestamp = Date.now();
  let timestamp_str = "" + timestamp;
  console.log(timestamp);
  console.log(rule_name);
  // console.log(user_name);
  if (user_name && rule_graph_str && rule_obj_str) {
let saveResult = await saveGraph(id, user_name, rule_graph_str, first_trigger, ruleTriggersRealNameStr, ruleActionsRealNameStr, timestamp_str).then();
saveBlocks(id, user_name, rule_name, rule_obj_str, pretty_dom_xml, first_trigger, timestamp_str, ruleTriggersStr, ruleActionsStr);
}
 
}


/**
 * Funzione asincrona per salvare il grafo della regola nel workspace
 * @param {*} id 
 * @param {*} user_name 
 * @param {*} rule_graph_str 
 * @param {*} first_trigger 
 * @param {*} timestamp_str 
 */
async function saveGraph(id, user_name, rule_graph_str, first_trigger, trigger_str, ruleTriggersOpStr, action_str, ruleActionsOpStr, timestamp_str){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'saveSingleGraph', arguments: [id, user_name, rule_graph_str, first_trigger, trigger_str, ruleTriggersOpStr, action_str, ruleActionsOpStr, timestamp_str] },
    });
    console.log("save graph");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Funzione asincrona per salvare la regola nel workspace
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
async function saveBlocks(id, user_name, rule_name, rule_obj_str, pretty_dom_xml, first_trigger, timestamp_str, ruleTriggersStr, ruleActionsStr){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'save', arguments: [id, user_name, rule_name, rule_obj_str, pretty_dom_xml, first_trigger, timestamp_str, ruleTriggersStr, ruleActionsStr] },
    });
    console.log("save blocks ok");
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Restituisce tutti i graph delle regole che iniziano con uno dei trigger 
 * passati come argument
 * @param {*} triggerName 
 */
export async function getGraphsFromDBCategory(triggerWithMyCategory){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'getGraphsMultiple', arguments: [triggerWithMyCategory] },
    });
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Restituisce tutti i graph delle regole che iniziano con uno dei trigger 
 * passati come argument
 * @param {*} triggerName 
 */
export async function getUserGraphs(user){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'getUserGraphs', arguments: [user] },
    });
    return result.result;
  } catch (error) {
    console.error(error);
  }
}


/**
 * 
 * @param {*} triggerName 
 */
export async function getGraphsFromDB(triggerName){
  "use strict";
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'getGraphs', arguments: [triggerName] },
    });
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * Get di tutte le regole dal db usando async/await
 */
export async function getAllFromDB() {
  let result;
  //let user = getLoggedUser();
  let user = "allUsers";
  if(user){
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
 * Get di tutte le regole dal db usando async/await
 */
export async function getAllGraphsFromDB() {
  "use strict";
  let result;
  //let user = getLoggedUser();
  let user = "allUsers";
  if(user){
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'getAllGraphs', arguments: [user] },
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
 * 
 * @param {*} id 
 */
export async function getOneFromDB(id) {
  "use strict";
  //console.log("get one from db!!");
  let result;
  try {
    result = await $.ajax({
      type: "POST",
      url: GLOBALS.db_access_url,
      dataType: 'json',
      data: { functionname: 'getOne', arguments: [id] },
    });
    //console.log(result.result);
    return result.result;
  } catch (error) {
    console.error(error);
  }
}

/**
 * 
 * @param {*} actualBlock 
 */
function getNextOperator(actualBlock){
  let nextBlock = actualBlock.getNextBlock();
  if (nextBlock && (nextBlock.type === "and" || nextBlock.type === "or")) {
    return nextBlock.type;
  }
  return "and";
}

/**
 * 
 * @param {*} actualBlock 
 */
function getActualOperator(actualBlock){
  if (actualBlock.getFieldValue("TRIGGER_OP")) {
    return actualBlock.getFieldValue("TRIGGER_OP");
  }
  else {
    return "EQUAL";
  }
}


/**
 * 
 * @param {*} actualBlock 
 */
function getTriggerValue(actualBlock){
  //trigger "normale" con value
  if (actualBlock.getField("TRIGGER_VALUE")) {
    return (actualBlock.getFieldValue("TRIGGER_VALUE"));
  }
  // trigger di tipo time, può avere start e/o end
  else if (actualBlock.getField("START_TIME")) {
    let result = {};
    let connection_start = actualBlock.getInput("START_TIME").connection;
    let connectedBlock_start = connection_start.targetBlock();
    if (connectedBlock_start && connectedBlock_start.type === "hour_min") {
      let startTimeHour = connectedBlock_start.inputList[0].fieldRow[1].value_;
      let startTimeMin = connectedBlock_start.inputList[1].fieldRow[1].value_;
      result.startTime = startTimeHour + ":" + startTimeMin;
    }
    let connection_end = actualBlock.getInput("END_TIME").connection;
    let connectedBlock_end = connection_end.targetBlock();
    if (connectedBlock_end && connectedBlock_end.type === "hour_min") {
      let endTimeHour = connectedBlock_end.inputList[0].fieldRow[1].value_;
      let endTimeMin = connectedBlock_end.inputList[1].fieldRow[1].value_;
      result.endTime = endTimeHour + ":" + endTimeMin;
    }
    return result;
  }
  //trigger di tipo date
  else if (actualBlock.getInput("DATE")) {
    let blockConnectedToDay = actualBlock.getInput("DATE").connection.targetBlock();
    if (blockConnectedToDay && blockConnectedToDay.type === "day") {
      return blockConnectedToDay.inputList[0].fieldRow[0].date_;
    }
  }
}

/**
 * 
 * @param {*} actualBlock 
 */
function getTriggerNotValue(actualBlock){
  "use strict";
  if (actualBlock.getInput("not_input_statement")) {
    let connection = actualBlock.getInput("not_input_statement").connection;
    if (connection) {
      let connectedBlock = connection.targetBlock();
      if (connectedBlock && connectedBlock.type === "not_dynamic") {
        // se non è settato il "when" non fare tutto questo
        //    console.log(connectedBlock.inputList);
        let values = [];
        let day="";
        let startTime="";
        let endTime="";  
        //let checkDayConnection = connectedBlock.getInput("when_input_day").connection;
        //if(checkDayConnection){
          let dayField = connectedBlock.getInput("when_input_day");
          let startTimeField = connectedBlock.getInput("when_input_start_hour");
          let endTimeField = connectedBlock.getInput("when_input_end_hour");
          let checkDay = false;
          let checkStartTime = false;
          let checkEndTime = false;
          dayField.fieldRow.forEach(function(e){
            console.log(e.name);
            console.log(e.state);
            if(e.name==="day_check" && e.state_ === true){
              checkDay = true;
            }
            if(checkDay){
              if(e.name==="day_value"){
                day = e.text_;
              }
            }
          });

          let startTimeHour;
          let startTimeMin;
          startTimeField.fieldRow.forEach(function(e){
            if(e.name==="start_time_check" && e.state_ === true){
              checkStartTime = true;
            }
            if(checkStartTime){
              if(e.name==="Hours"){
                startTimeHour = e.value_;
              }
              else if (e.name==="Mins"){
                startTimeMin = e.value_;
              }         
              }
          });
          startTime = startTimeHour + ":" + startTimeMin;

          let endTimeHour;
          let endTimeMin;
          endTimeField.fieldRow.forEach(function(e){
            if(e.name==="end_time_check" && e.state_ === true){
              checkEndTime = true;
            }
            if(checkEndTime){
              if(e.name==="Hours"){
                endTimeHour = e.value_;
              }
              else if (e.name==="Mins"){
                endTimeMin = e.value_;
              }         

            }
          });
          endTime = endTimeHour + ":" + endTimeMin;
        values.push(day, startTime, endTime);
        return values;
      }
    }
  }
}

/**
 * 
 * @param {*} actualBlock 
 */
function getTriggerElement(actualBlock){
  let element = {};
  element.displayedName = actualBlock.getFieldValue("displayed_name");
  element.possibleValues = actualBlock.getFieldValue("TRIGGER_VALUE");
  element.realName = actualBlock.getFieldValue("real_name");
  element.triggerType = "both";
  element.type = "ENUM"; //TODO controllare
  element.unit = "";
  element.xPath = actualBlock.getFieldValue("xPath");
  element.dimensionId = actualBlock.getFieldValue("dimensionId");
  return element;
}

/**
 * Trasforma il blocco trigger nel formato già usato nel TARE per salvare le 
 * regole
 * @param {*} _rule 
 */
function createTriggerArr(_rule) {
  "use strict";
  let triggerList = [];
  for (let block in _rule.blocks) {
    if (_rule.blocks[block].isTrigger) {
      let trigger = {};
      //  console.log(_rule.blocks[block]);
      trigger.triggerType = _rule.blocks[block].childBlocks_[0].type; // TODO controlla che vada sempre bene
      trigger.blockId = _rule.blocks[block].id;
      trigger.dimension = _rule.blocks[block].dimension;
      trigger.dimensionId = _rule.blocks[block].dimensionId;
      trigger.nextOperator = getNextOperator(_rule.blocks[block]);      
      trigger.operator = getActualOperator(_rule.blocks[block]);
      trigger.parent = _rule.blocks[block].getFieldValue("parent_name");
      trigger.value = getTriggerValue(_rule.blocks[block]);
      //gruppi: da creare quando è definito l'array di trigger
      trigger.startGroup = "";
      trigger.closeGroup = "";
      trigger.notValue = getTriggerNotValue(_rule.blocks[block]);  
      trigger.isNot = trigger.notValue ? true : false;
      trigger.element = getTriggerElement(_rule.blocks[block]); 
      triggerList.push(trigger);
    }
  }
  // console.log("triggerList:");
  // console.log(triggerList);
  return triggerList;
}

/**
 * TODO: una volta che è finito l'array di actions, fare funct che aggiunge ad
 * ogni entry se si tratta di azione seq o par, nel secondo caso aggiungi 
 * parallelGroup e branch
 * @param {*} _rule 
 */
function createActionArr(_rule) {
  "use strict";
  let actionList = [];
  for (let block in _rule.blocks) {
    // console.log(_rule.blocks[block].isAction);
    if (_rule.blocks[block].isAction) {
      console.log("ACTION");
      console.log(_rule.blocks[block]);
      let parentAction;
      let action = {};
      action.action = {};
      action.action.realName = _rule.blocks[block].getFieldValue("real_name");
      action.type = _rule.blocks[block].getFieldValue("type");
      action.action.type = _rule.blocks[block].getFieldValue("type");
      action.parent = _rule.blocks[block].getFieldValue("parent_name");
      // di default prende come operator e value i valori della select e
      // dell'input, eventualmente dopo vengono aggiornati.
      action.operator = _rule.blocks[block].getFieldValue("SELECT_FIELD_VALUE");

      if (!_rule.blocks[block].isActionArray) {
        action.value = _rule.blocks[block].getFieldValue("INPUT_FIELD_VALUE");

        // azioni relative alle luci
        if (action.type === 'invokeFunctions:changeApplianceState') {
          if (action.operator === "0") {
            action.value = "ON";
          }
          else {
            action.value = "OFF";
          }
        } else if (action.type === 'invokeFunctions:lightScene') {
          action.value = action.realName;
        } else if (action.type === 'update:lightColor') {
          action.value =_rule.blocks[block].getFieldValue("COLOR_FIELD_VALUE");
          action.duration =_rule.blocks[block].getFieldValue("SELECT_FIELD_VALUE");
        }

        /*
          else if (_rule.blocks[block].type === 'update' || _rule.blocks[block].type === 'create' || _rule.blocks[block].type === 'delete') {
            action.values = new Array(); 
            for (var i = 0; i < _rule.blocks[block].action.params.length; i++) {
              var val = '';
              if (GLOBALS.tmpAction.action.params[i].type === 'string') {
                val = $("#action_text_" + GLOBALS.tmpAction.action.params[i].realName).val()
              } else if (GLOBALS.tmpAction.action.params[i].type === 'choice') {
                if (GLOBALS.tmpAction.action.params[i].possibleValues.length > 5) {
                  //select
                  val = $("#action_select_" + GLOBALS.tmpAction.action.params[i].realName).val();
                } else {
                  //radio button
                  val = $("#" + GLOBALS.tmpAction.action.params[i].realName + "Group > button.btn-success").attr("value");
                }
              }
              GLOBALS.tmpAction.values.push({ realName: GLOBALS.tmpAction.action.params[i].realName, value: val });
            }
            console.log(GLOBALS.tmpAction.type);
            //Switch per prendere i valori a seconda del tipo di azione    
          } else if (GLOBALS.tmpAction.type === 'invokeFunctions:changeApplianceState') {
            if (GLOBALS.tmpAction.operator === "turnOn") {
              GLOBALS.tmpAction.value = "ON";
            }
            else {
              GLOBALS.tmpAction.value = "OFF";
            }
          } else if (GLOBALS.tmpAction.type === 'invokeFunctions:lightScene') {
            GLOBALS.tmpAction.value = GLOBALS.tmpAction.action.realName;
          } else if (GLOBALS.tmpAction.type === 'update:lightColor') {
            GLOBALS.tmpAction.value = $("#color").val();
            GLOBALS.tmpAction.duration = $("#actionDuration").val();
          } else if (GLOBALS.tmpAction.type === 'custom:font_color' || GLOBALS.tmpAction.type === 'custom:background_color') {
            GLOBALS.tmpAction.value = $("#color").val();
          } else if (GLOBALS.tmpAction.type === 'custom:distributionDuplicate' ||
            GLOBALS.tmpAction.type === 'custom:distributionPartial') {
            GLOBALS.tmpAction.value = $("#distributionTarget").val();
          } else if (GLOBALS.tmpAction.type === 'function') {
            GLOBALS.tmpAction.realName = GLOBALS.tmpAction.action.realName;
          } else {
            GLOBALS.tmpAction.value = $("#inputActionValue").val();
          }
  
          GLOBALS.tmpAction.parent = parent;
  
          */
      }
      //azioni di tipo composto, hanno il campo values
      else {
        action.values = [];
        if (_rule.blocks[block].type === "alarmText" || _rule.blocks[block].type === "Alarms-alarmText") {
          _rule.blocks[block].inputList.forEach(function (element) {
            console.log(element);
            if (element.name === "TEXT") {
              let value = {
                description: "Alarm Text",
                displayedName: "Text",
                realName: "alarmText",
                type: "custom:string",
                value: _rule.blocks[block].getFieldValue("ALARM_TEXT")
              };
              action.values.push(value);
            }

            else if (element.name === "NOTIFICATION") {
              let value = {
                description: "Notification mode",
                displayedName: "Notification mode",
                realName: "notificationMode",
                type: "custom:notificationMode",
                value: _rule.blocks[block].getFieldValue("NOTIFICATION_MODE")
              };
              action.values.push(value);
            }

            else if (element.name === "TIMES") {
              let value = {
                description: "How many times alert should be sent",
                displayedName: "Repetition",
                realName: "repetition",
                type: "custom:repetitionType",
                value: _rule.blocks[block].getFieldValue("REPETITIONS")
              };
              action.values.push(value);
            }

            else if (element.name === "SEND") {
              let value = {
                description: "Alarm recipient",
                displayedName: "Recipient",
                realName: "alarmRecipient",
                type: "custom:string",
                value: _rule.blocks[block].getFieldValue("SEND_TO")
              };
              action.values.push(value);
            }


          });
        }

        else if (_rule.blocks[block].type === "reminderText" || _rule.blocks[block].type === "Reminders-reminderText") {
          _rule.blocks[block].inputList.forEach(function (element) {
            console.log(element);
            if (element.name === "TEXT") {
              let value = {
                description: "Reminder Text",
                displayedName: "Text",
                realName: "reminderText",
                type: "custom:string",
                value: _rule.blocks[block].getFieldValue("REMINDER_TEXT")
              };
              action.values.push(value);
            }

            else if (element.name === "NOTIFICATION") {
              let value = {
                description: "Notification mode",
                displayedName: "Notification mode",
                realName: "notificationMode",
                type: "custom:notificationMode",
                value: _rule.blocks[block].getFieldValue("NOTIFICATION_MODE")
              };
              action.values.push(value);
            }

            else if (element.name === "TIMES") {
              let value = {
                description: "How many times alert should be sent",
                displayedName: "Repetition",
                realName: "repetition",
                type: "custom:repetitionType",
                value: _rule.blocks[block].getFieldValue("REPETITIONS")
              };
              action.values.push(value);
            }

            else if (element.name === "SEND") {
              let value = {
                description: "Reminder recipient",
                displayedName: "Recipient",
                realName: "reminderRecipient",
                type: "custom:string",
                value: _rule.blocks[block].getFieldValue("SEND_TO")
              };
              action.values.push(value);
            }


          });

        }
      }

      actionList.push(action);
    }
  }
  return actionList;
}

/**
 * Crea un oggetto regola temporanea per il salvataggio
 * @param {*} rule_ 
 */
function prepareTmpRule(_rule) {
  //console.log(ruleObj);
  "use strict";
  let _tmpRule = {
    id: _rule.id,
    author: _rule.author,
    ruleName: _rule.name,
    priority: _rule.priority,
    triggers: [],
    actions: [],
    actionMode: _rule.actionMode
    //naturalLanguage:ruleObj.naturalLanguage
    //naturalLanguage:GLOBALS.currentNl //viene salvata l'ultima modifica fatta al testo, non quello eventualmente già presente (es prendo una regola in inglese, non modifico nulla e salvo: il testo rimarrebbe in inglese)
  };
  return (_tmpRule);
}

/**
 * Crea un oggetto trigger temporaneo per il salvataggio
 * @param {*} _rule 
 * @param {*} j 
 */
function prepareTmpTrigger(_rule, j) {
  "use strict";
  let _tmpTrigger = {};
  _tmpTrigger.triggerType = _rule.triggers[j].triggerType;
  _tmpTrigger.depth = _rule.triggers[j].depth;
  _tmpTrigger.dimension = _rule.triggers[j].dimension;
  _tmpTrigger.dimensionId = _rule.triggers[j].dimensionId;
  _tmpTrigger.nextOperator = _rule.triggers[j].nextOperator;
  _tmpTrigger.operator = _rule.triggers[j].operator;
  _tmpTrigger.parent = _rule.triggers[j].parent;
  _tmpTrigger.type = _rule.triggers[j].type;
  _tmpTrigger.value = _rule.triggers[j].value;
  _tmpTrigger.actualDataValue = _rule.triggers[j].actualDataValue;
  _tmpTrigger.startGroup = _rule.triggers[j].startGroup;
  _tmpTrigger.closeGroup = _rule.triggers[j].closeGroup;
  _tmpTrigger.notValue = (_rule.triggers[j].notValue !== undefined) ? _rule.triggers[j].notValue : [];
  _tmpTrigger.isNot = _tmpTrigger.notValue.length > 0 ? true : false;
  _tmpTrigger.element = _rule.triggers[j].element;
  return _tmpTrigger;
}

/**
* Estrae dal workspace il gruppo di appartenenza di un trigger 
* @param {*} allTriggers
*/
function setTriggerGroup(allTriggers) {
  "use strict";
  let myWorkspace = getWorkspace();
  let actualGroupStart = 0;
  let actualGroupEnd = 0;
  for (let i = 0; i < allTriggers.length; i++) {
    let actualBlock = myWorkspace.getBlockById(allTriggers[i].blockId);
    let mySurroundBlock = actualBlock.getSurroundParent();
    //se esiste il prossimo blocco prendine il contenitore
    if (allTriggers[i + 1]) {
      let nextBlock = myWorkspace.getBlockById(allTriggers[i + 1].blockId);
      let nextBlockSurroundBlock = nextBlock.getSurroundParent();
      //se siamo contenuti nel solito blocco
      if (nextBlockSurroundBlock && mySurroundBlock.id === nextBlockSurroundBlock.id) {
        //sposta la fine del gruppo al blocco successivo
        actualGroupEnd = i + 1;
      }
      //se non siamo nello stesso contenitore
      else {
        //trovata la fine del gruppo cui fa parte il blocco in posizione i
        actualGroupEnd = i;
        //cerchiamo l'inizio del gruppo cui fa parte il blocco in i
        for (let k = actualGroupEnd; k > 0; k--) {
          let previousBlock = myWorkspace.getBlockById(allTriggers[k - 1].blockId);
          let previousBlockSurroundBlock = previousBlock.getSurroundParent();
          //se non fanno parte dello stesso gruppo hai trovato l'inizio
          if (actualBlock.getSurroundParent().id !== previousBlockSurroundBlock.id) {
            //setta l'inizio del gruppo e interrompi
            actualGroupStart = k;
            break;
          }
        }
        //assegna inizio e fine gruppo dei blocchi da i a startGroup
        for (let z = i; z >= actualGroupStart; z--) {
          allTriggers[z].startGroup = actualGroupStart;
          allTriggers[z].closeGroup = actualGroupEnd;
        }
        //sposta inizio del gruppo dopo la fine del gruppo attuale
        actualGroupStart = actualGroupEnd + 1;
      }
    }
    else {
      //ultimo blocco: chiudo direttamente l'ultimo gruppo
      actualGroupEnd = allTriggers.length - 1;
      for (let z = i; z >= actualGroupStart; z--) {
        allTriggers[z].startGroup = actualGroupStart;
        allTriggers[z].closeGroup = actualGroupEnd;
      }
    }
  }
  return allTriggers;
}


/**
 * Calcola la profondità di ogni trigger
 * @param {*} block 
 * @param {*} j 
 * @param {*} allTriggers 
 * @param {*} groupBlock 
 * @param {*} depth 
 */
function setTriggerDepth(block, j, allTriggers, groupBlock, depth) {
  "use strict";
  if (!depth) {
    depth = 0;
  }
  if (!groupBlock) {
    let myWorkspace = getWorkspace();
    let myBlock = myWorkspace.getBlockById(block.blockId);
    //console.log(myBlock);
    //console.log(myBlock.getSurroundParent());
    let surroundBlock = myBlock.getSurroundParent();
    if (surroundBlock && surroundBlock.type === "group") {
      setTriggerDepth(block, j, allTriggers, surroundBlock, depth + 1);
    }
  }
  else {
    //guarda se groupBLock ha un surrondParent
    let surroundBlock = groupBlock.getSurroundParent();
    //se si richiama ricorsivo
    if (surroundBlock && surroundBlock.type === "group") {
      setTriggerDepth(block, j, allTriggers, surroundBlock, depth + 1);
    }
    //altrimenti salva la depth
    else {
      lastDepth = depth;
    }
  }
}

/**
 * Controlla le azioni, estrae il modo di esecuzione (sequenziale, parallelo,
 * misto)
 * @param {*} _rule 
 */
function getActionMode(_rule) {
  "use strict";
  console.log(_rule);
  let ruleType = "sequential";
  for (let block in _rule.blocks) {
    // se c'è un blocco di tipo parallel:
    if (_rule.blocks[block].type === "parallel_dynamic") {
      let nextBlock = _rule.blocks[block].getNextBlock();
      let previousBlock = _rule.blocks[block].getPreviousBlock();
      // se ha come prevStatement un blocco rule e come nextStatement nulla
      // allora l'azione è di tipo parallel: non c'è bisogno di guardare 
      // altri blocchi 
      if (!nextBlock && previousBlock && previousBlock.type === "rule") {
        ruleType = "parallel";
        console.log("rule type: ", ruleType);
        return ruleType;
      }
      // se ha come nextBlock o previousBlock un blocco azione o un altro 
      // blocco parallel o un blocco rule allora l'azione è di tipo misto:
      // non c'è bisogno di guardare altri blocchi
      else if (nextBlock && previousBlock &&
        (nextBlock.isAction || nextBlock.type === "parallel_dynamic") &&
        (previousBlock.isAction || previousBlock.type === "parallel_dynamic" || previousBlock.type === "rule")
      ) {
        ruleType = "mixed";
        console.log("rule type: ", ruleType);
        return ruleType;
      }
    }
  }
  console.log("rule type: ", ruleType);
  return ruleType;
}

/**\
 * Crea l'oggetto da salvare nel db
 * @param {*} blockDb 
 * @param {*} isUpdate 
 */
function makeRuleObj(blockDb, isUpdate, id) {
  "use strict";
  let myWorkspace = getWorkspace();
  let _rule = {};
  //ottiene tutti i blocchi dal workspace, ordinati secondo la posizione
  _rule.blocks = myWorkspace.getAllBlocks(true);
  _rule.id = id;
  _rule.name = document.getElementById('rule_name').value;
  _rule.author = getLoggedUser(); 
  _rule.priority = document.getElementById('priority').value;
  _rule.triggers = createTriggerArr(_rule);
  _rule.actions = createActionArr(_rule);
  _rule.actionMode = getActionMode(_rule);
  if (_rule.priority === undefined) {
    _rule.priority = 1;
  }
  if (_rule.actionMode === undefined || _rule.actionMode === '') {
    _rule.actionMode = "sequential";
  }

  var _tmpRule = prepareTmpRule(_rule);

  let triggersWithGroup = setTriggerGroup(_rule.triggers);
  //console.log(triggersWithGroup);
  _rule.triggers = triggersWithGroup;

  for (var j = 0; j < _rule.triggers.length; j++) {
    setTriggerDepth(_rule.triggers[j], j, _rule.triggers);
    // console.log("depth: ", lastDepth);
    _rule.triggers[j].depth = lastDepth;
    lastDepth = 0;
    var _tmpTrigger = prepareTmpTrigger(_rule, j);
    _tmpRule.triggers.push(_tmpTrigger);
  }

  for (var k = 0; k < _rule.actions.length; k++) {
    // console.log(_rule.actions);
    var _tmpAction = {
      action: {
        realName: _rule.actions[k].action.realName,
        type: _rule.actions[k].type
      },
      operator: _rule.actions[k].operator,
      parent: _rule.actions[k].parent,
      type: _rule.actions[k].type,
      value: _rule.actions[k].value,
      values: _rule.actions[k].values
    };
    if (_tmpAction.action.type === 'update:lightColor') {
      _tmpAction.duration = _rule.actions[k].duration;
    }
    if (_rule.actions[k].action.type === "custom:greatLuminare") {
      _tmpAction.values = [];
      for (var prop in _rule.actions[k].values) {
        /* 
        var composedAction = {
                realName: prop,
                value: _rule.actions[j].values[prop]
            };
            _tmpAction.values.push(composedAction);
        */
        if (_rule.actions[k].values[prop].realName && _rule.actions[k].values[prop].value) {
          var composedAction = {
            realName: _rule.actions[k].values[prop].realName,
            value: _rule.actions[k].values[prop].value
          };
          _tmpAction.values.push(composedAction);
        }
      }
    }
    if (_rule.actions[k].type !== 'composed' && _rule.actions[k].root) {
      _tmpAction.root = _rule.actions[k].root.realName;
    } else if (_rule.actions[k].values !== undefined) {
      if (_rule.actions[k].action.realName === 'showImage' ||
        _rule.actions[k].action.realName === 'showImageTakenByPepper' ||
        _rule.actions[k].action.realName === 'videoPath' ||
        _rule.actions[k].action.realName === 'video' ||
        _rule.actions[k].action.realName === 'showVideoTakenByPepper' ||
        _rule.actions[k].action.realName === 'loadWebPage' ||
        _rule.actions[k].action.realName === 'loadPepperControlWebPage' ||
        _rule.actions[k].action.realName === 'showText' ||
        _rule.actions[k].action.realName === 'textToSpeech' ||
        _rule.actions[k].action.realName === 'audio' ||
        _rule.actions[k].action.realName === 'audioPath' ||
        _rule.actions[k].action.realName === 'recordVideo') {
        _tmpAction.root = _rule.actions[k].root.realName;
      } else {
        _tmpAction.root = _rule.actions[k].action.realName;
      }
      _tmpAction.values = [];
      for (var z = 0; z < _rule.actions[k].values.length; z++) {
        let composedAction = {
          description: _rule.actions[k].values[z].description,
          displayedName: _rule.actions[k].values[z].displayedName,
          realName: _rule.actions[k].values[z].realName,
          type: _rule.actions[k].values[z].type,
          value: _rule.actions[k].values[z].value
        };
        _tmpAction.values.push(composedAction);
      }
    }
    _tmpRule.actions.push(_tmpAction);
  }
  console.log("RULE PREPARED!!");
  console.log(_tmpRule);
  return (_tmpRule);
}

export function sendRulesToNode(rule) {
  // TODO triggers deve avere il campo isNot, da inserire quando la regola viene salvata
  "use strict";
  let ruleFromSaveAndApply = JSON.parse(rule[0].rule_obj_str);
  let id = ruleFromSaveAndApply.id;
  console.log("sendRulesToAE");
  //protocols & address check
  if (GLOBALS.nodeUrl === '') {
      printPassedError("no_node_adress");
      return;
  }

  if (window.location.protocol === "https:" && GLOBALS.nodeUrl.startsWith("http:")) {
      printPassedError("wrong_protocol");
      return;
  }
  
  /*
  //check for rules already active
  $("#privateRulesContainer .ruleList input[type=checkbox]").each(function () {
      var idx = $(this).attr("value");
      if ($(this).is(":checked")) {
          GLOBALS.rules[idx].apply = true;
      } else {
          GLOBALS.rules[idx].apply = false;
      }
  });
  */

  //variables initialization
  let nodeUrl = GLOBALS.nodeUrl;
  let lastChar = nodeUrl[nodeUrl.length -1];
  if(lastChar!== '/'){
    nodeUrl+='/';
  }
  let ruleModelObj = {
      "extModelRef": [
          {
              "modelId": "ctx",
              "uri": nodeUrl
          }
      ],
      rule: []
  };
  let ruleSelectedOrDeleted = false;
  let tmpRule; 
  let priority = ruleFromSaveAndApply.priority;
  // adesso se non viene specificata invia ""
  if (priority === undefined || priority === 0 || priority === "") {
      priority = 1;
  }
  
  //activate rule from "save and apply" button"
  if (ruleFromSaveAndApply) {
      //var natLanguage = naturalNL.getNl(true, true);
      ruleSelectedOrDeleted = true;
      tmpRule = {
          name: ruleFromSaveAndApply.ruleName, //"rule" + i,
          id: id, //Keep the same ID from the local database
          originalId: id, 
          naturalLanguage: GLOBALS.currentNl,
          actionMode: ruleFromSaveAndApply.actionMode,
          priority: priority,
          actionOrRuleOrBlockReference: []
      };
      
          for (let j = 0; j < ruleFromSaveAndApply.triggers.length; j++) {
              if (ruleFromSaveAndApply.triggers[j].notValue && ruleFromSaveAndApply.triggers[j].notValue.length > 0 && (ruleFromSaveAndApply.triggers[j].notValue[2]!==null && ruleFromSaveAndApply.triggers[j].notValue[3]!==null)) {
                  ruleFromSaveAndApply.triggers[j].triggerType = "event"; //trasformo i trigger in event se una condizione ha il not e se ha settati i parametri dell'orario
              }
              else if (ruleFromSaveAndApply.triggers[j].element.realName === "typeOfProximity") {
                  ruleFromSaveAndApply.triggers[j].triggerType = "event" //trasformo i trigger "typeOfProxymity" in event
              }
              else if (ruleFromSaveAndApply.triggers[j].element.realName === "pointOfInterest"){
                  ruleFromSaveAndApply.triggers[j].triggerType = "condition"; //trasformo i trigger "pointOfInterest" in condition
              }                
          }
          
          var eventsLen = 0;
          var conditionsLen = 0;
          for(let i=0; i<ruleFromSaveAndApply.triggers.length; i++){
              if(ruleFromSaveAndApply.triggers[i].triggerType === "event"){
                  eventsLen++;
              }
              else if(ruleFromSaveAndApply.triggers[i].triggerType === "condition"){
                  conditionsLen++;
              }
          };
          
          let transformedEvents;
          let transformedConditions;
          
          if(eventsLen>0){
              transformedEvents = transformEventsNew(ruleFromSaveAndApply.triggers, eventsLen, conditionsLen); 
              //tmpRule.event = transformEventsNew(ruleFromSaveAndApply.triggers, eventsLen, conditionsLen); 
          }
          if(conditionsLen>0){
              transformedConditions = transformConditionsNew(ruleFromSaveAndApply.triggers, eventsLen, conditionsLen);
              //tmpRule.condition = transformConditionsNew(ruleFromSaveAndApply.triggers, eventsLen, conditionsLen);
          }
          
          //No transformed events or conditions to send to Rule Manager
          if((transformedEvents===null || typeof transformedEvents === "undefined") && (typeof transformedConditions === "undefined" || transformedConditions===null)){
              //utilityView.displayAlertMessage(getAlertMessageLocale("too_complex_rule"), "danger", true);
              printPassedError("too_complex_rule");
              return;
          }
          
          if(typeof transformedEvents !== "undefined" && transformedEvents!== null){
              tmpRule.event = transformedEvents;
          }
          
          if(typeof transformedConditions !== "undefined" && transformedConditions!== null){
              tmpRule.condition = transformedConditions;
          }
          //transformEvents(ruleFromSaveAndApply.triggers) !== null ? tmpRule.event = transformEvents(ruleFromSaveAndApply.triggers) : null; //Prima lo esegue per vedere se è null e poi lo esegue per assegnarlo?
          //transformConditions(ruleFromSaveAndApply.triggers) !== null ? tmpRule.condition = transformConditions(ruleFromSaveAndApply.triggers) : null;
          tmpRule.actionOrRuleOrBlockReference.push(transformActions(ruleFromSaveAndApply.actions));
          
      ruleModelObj.rule.push(tmpRule);
  } 
//return & cleaning;
  var targetUserName = GLOBALS.username;
  ruleModelObj.id = id;
  console.log("SEND RULE TO MANAGER/AE: ");
  console.log(ruleModelObj);
  GLOBALS.isSaveAndApply = false;
  if ($("#modalUserNameValue").val() != undefined && $("#modalUserNameValue").val() !== '') {
      targetUserName = $("#modalUserNameValue").val();
  }
  
  
  newFunction(ruleModelObj);
  
}
window.sendRulesToNode = sendRulesToNode;

function newFunction(ruleModelObj) {
  "use strict";
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

function getAppliedRules(){
  "use strict";
  return false;
}

/**
 * 
 */
function createInvokeFunction(functionName, arrayParams) {
  "use strict";
  let invokeObj = {
      invokeFunction: {
          name: functionName,
          input: []
      }
  };
  for (var i = 0; i < arrayParams.length; i++) {
      invokeObj.invokeFunction.input.push(createInputParam(arrayParams[i].realName, arrayParams[i].value, getComposedActionType(arrayParams[i].type)));
  }
  return invokeObj;
}

function createInputParam(paramName, value, type) {
  "use strict";
  let inputParam = {
      name: paramName,
      value: {
          constant: {
              value: value,
              type: type
          }
      }
  };
  return inputParam;
}

function getComposedActionType(type) {
  switch (type) {
      case "custom:string":
          return "STRING";
      case "custom:boolean":
      case "xs:boolean":
          return "BOOLEAN";
      case "custom:int":
      case "custom:repetitionType":
          return "INTEGER";
      default:
          return "STRING";
  }
}


function transformActions(action) {
  "use strict";
  if (action === undefined || action.length === 0) {
      return;
  }
  let actionArray = [];
  for (var i = 0; i < action.length; i++) {
      if (action[i].type === undefined || action[i].type === "custom:string") {
          action[i].type = "composed";
      }
      switch (action[i].type) {
          case "update" :
              var attrToUpdate = '';
              var elemId = '';
              var _val = '';
              for (var j = 0; j < action[i].values.length; j++) {
                  if (action[i].values[j].realName === 'id') {
                      elemId = action[i].values[j].value;
                  } else if (action[i].values[j].realName === 'cssProperty') {
                      attrToUpdate = action[i].values[j].value;
                  } else {
                      if (attrToUpdate === '') {
                          attrToUpdate = action[i].values[j].realName;
                          if (attrToUpdate === 'display') {
                              switch (action[i].values[j].value) {
                                  case 'hide':
                                      _val = 'none';
                                      break;
                                  case 'show':
                                      _val = 'block';
                                      break;
                              }
                          }
                      } else {
                          _val = action[i].values[j].value;
                      }
                  }
              }
              actionArray.push(createUpdateAction("ui:" + elemId + "/@" + attrToUpdate, _val));
              break;
          case "delete":
              var elemId = '';
              for (var j = 0; j < action[i].values; j++) {
                  if (action[i].values[j].realName === 'id') {
                      elemId = action[i].values[j].value;
                      break;
                  }
              }
              actionArray.push(createDeleteAction(elemId));
              break;
          case "create":
              if (action[i].values !== undefined &&
                      action[i].values.length > 0) {
                  var elemId = '';
                  var parentId = '';
                  var elemType = '';
                  var elemValue = '';
                  for (var j = 0; j < action[i].values; j++) {
                      if (action[i].values[j].realName === 'id') {
                          elemId = action[i].values[j].value;
                      } else if (action[i].values[j].realName === 'parentId') {
                          parentId = action[i].values[j].value;
                      } else if (action[i].values[j].realName === 'elementType') {
                          elemType = action[i].values[j].value;
                      } else if (action[i].values[j].realName === 'elementValue') {
                          elemValue = action[i].values[j].value;
                      }
                  }
                  actionArray.push(createCreateAction(elemId, parentId, elemType, elemValue));
              } else {
                  actionArray.push(createCreateAction(action[i].action.realName, action[i].parent, action[i].value, "body"));
              }
              break;
          case "loadURL":
              actionArray.push(createLoadURLAction(action[i].value));
              break;
          case "function" :
              let functionName = action[i].action.realName;
              var value = action[i].value;
              actionArray.push(createInvokeFunction(functionName, []));
              break;
          case "custom:font_color":
              //update font color for all element
              var xPath = "//*/@font_color";
              var colorValue = action[i].value;
              actionArray.push(createUpdateAction(xPath, colorValue));
              break;
          case "custom:font_size":
              //update font size for all element
//                var xPath = "//*/@font_size";
//                var fontSizeValue = action[i].value;
//                actionArray.push(createUpdateAction(xPath, fontSizeValue));
              actionArray.push(createInvokeFunction("increaseFontSize", []));
              break;
          case "custom:decrease_font_size":
              actionArray.push(createInvokeFunction("decreaseFontSize", []));
              break;
          case "custom:background_color":
              var xPath = "//*/@background_color";
              var colorValue = action[i].value;
              actionArray.push(createUpdateAction(xPath, colorValue));
              break;
          case "custom:distributionPartial":
              break;
          case "custom:distributionDuplicate":
              var xPath = "//*/@distribution:" + action[i].value + ":enabled";
              actionArray.push(createUpdateAction(xPath, "block"));
              break;
          case "function":
              //invoke function
              actionArray.push(createInvokeFunction(action[i].action.realName, []));
              break;
          case "composed":
              //alarm o reminder -> controllare il nome     
              if (action[i].action.realName === 'Alarms' || action[i].action.realName === 'alarmText' || action[i].action.realName === 'Reminders' || action[i].action.realName === 'reminderText') {
                  actionArray.push(createInvokeFunction(action[i].action.realName, action[i].values));
              } else {
                  var actionObj;
                  if (action[i].action.realName === action[i].root.realName)
                      actionObj = action[i].root;
                  else
                      actionObj = getActionsByName(action[i].action.realName, action[i].root);
                  if (actionObj !== undefined) {
                      if (actionObj.type === 'create')
                          actionArray.push(createCreateAction(action[i].action.realName, action[i].parent, action[i].value, "body"));
                      else if (actionObj.type === 'loadURL')
                          actionArray.push(createLoadURLAction(action[i].values[0].value));
                  }
              }

              break;
          case "custom:applianceState":
              var xPath = "applianceState/" + action[i].parent + "/" + action[i].action.realName + "/@state";
              var stateValue = "on";
              if (action[i].operator === "turnOff")
                  stateValue = "off";
              actionArray.push(createUpdateAction(xPath, stateValue));
              break;
          case "custom:applianceStateBlinds":
              var xPath = "/" + action[i].parent + "/blind/@state";
              var stateValue = action[i].operator;
              actionArray.push(createUpdateAction(xPath, stateValue));
              break;
          case "update:recipe":
          case "invokeFunctions:changeProductionLineState":
          case "update:changeProductionLineState":                
               var xPath = action[i].action.xPath;
               var value = action[i].value;
               actionArray.push(createUpdateAction(xPath, value));
              break;
          case "update:lightColor":
              //update light state (on-off)                                
              var xPath = "";
              if (action[i].action.xPath !== undefined) {
                  xPath = action[i].action.xPath + "/@state";
              } else {
                  xPath = "applianceState/" + action[i].parent + "/lightColor/@state";
              }
              var stateValue = "off";
              if (action[i].operator === "turnOn") {
                  if (action[i].action.realName === 'blinkColoredLight')
                      stateValue = "blink";
                  else
                      stateValue = "on";
                  actionArray.push(createUpdateAction(xPath, stateValue));
                  //update light color
                  if (action[i].action.realName !== 'blinkColoredLight') {
                      if (action[i].action.xPath !== undefined) {
                          xPath = action[i].action.xPath + "/@color";
                      } else {
                          xPath = "applianceState/" + action[i].parent + "/lightColor/@color";
                      }
                      var colorValue = action[i].value;
                      actionArray.push(createUpdateAction(xPath, colorValue));
                  }
              } else {
                  actionArray.push(createUpdateAction(xPath, stateValue));
//                    if (action[i].action.xPath !== undefined) {
//                        xPath = action[i].action.xPath + "/@color";
//                    } else {
//                        xPath = "applianceState/" + action[i].parent + "/lightColor/@color";
//                    }
//                    var colorValue = action[i].value;
//                    actionArray.push(createUpdateAction(xPath, colorValue));
              }
              if (action[i].duration !== undefined && parseFloat(action[i].duration) > 0) {
                  xPath = action[i].action.xPath + "/@duration";
                  actionArray.push(createUpdateAction(xPath, action[i].duration));
              }
              break;
          case "invokeFunctions:changeApplianceState":
          let functionNameChangeAppState = "changeApplianceState";
          let inputChangeAppState = createChangeApplianceStateObj(action[i]);
          let transformedObjChangeAppState = {
              "invokeFunction":{
                  "name":functionNameChangeAppState,
                  "input":inputChangeAppState 
                  }
              };
              actionArray.push(transformedObjChangeAppState);
          break;
          
          case "invokeFunctions:lightScene":                
              let functionNameLightScene = "lightScene";
              let inputLightScene = createLightSceneObj(action[i]);
              let transformedObjLightScene = {
                  "invokeFunction":{
                      "name":functionNameLightScene,
                      "input":inputLightScene
                  }
              };
              actionArray.push(transformedObjLightScene);
              //actionArray.push(createInvokeFunction(functionName, input));               
              break;
          case "custom:greatLuminare":     
                  var val = action[i].operator;
                  if (val === "turnOff"){
                      val = "OFF";
                  }
                  else if(val === "turnOn"){
                      val = "ON";
                  }
                  let transformedObjGreatLuminare = createGreatLuminareObj(val, action[i]);
                  actionArray.push(transformedObjGreatLuminare);                
          break;    
      }
  }

  var action = {
      actionList: {
          action: actionArray
      }
  };
  return action;
}

function createGreatLuminareObj(passedValue, passedAction){ 
  //let path = passedAction.action.xPath +"@" + passedAction.action.realName + " externalModelId:''";
  let path = passedAction.action.xPath +"/@state";
  let actToObj = {
       "update":{
          "entityReference":{
              "xpath": path,
              "externalModelId": ""
          },
          "value":{
              "constant":{"value":passedValue}
          }
      }
  };
  return actToObj;
}

function createLightSceneObj(passedAction) {
  let parent = passedAction.parent;
  let actToObj = [{
          "name": "sceneName",
          "value": {
              "constant": {
                  "value": passedAction.action.realName,
                  "type": "STRING"
              }
          }
      },
      {
          "name": "room",
          "value": {
              "constant": {
                  "value": parent,
                  "type": "STRING"
              }
          }
      }
  ];
  return actToObj;
}

function createChangeApplianceStateObj(passedAction) {
  let parent = passedAction.parent;
  let  stateValue = "ON";
  if (passedAction.operator === "turnOff"){
      stateValue = "OFF";
  }
  let actToObj = [{
          "name": "state",
          "value": {
              "constant": {
                  //"value": passedAction.value,
                  "value": stateValue,
                  "type": "STRING"
              }
          }
      },
      {
          "name": "room",
          "value": {
              "constant": {
                  "value": parent,
                  "type": "STRING"
              }
          }
      }
  ];
  return actToObj;
}

function guid() {
  "use strict";
  return s4() + s4();
}

function s4() {
  "use strict";
  return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
}

function getRealOperator(op) {
  var operator = "";
  switch (op) {
      case "notEqual" :
          operator = "NEQ";
          break;
      case "is not" :
      case "equal" :
          operator = "EQ";
          break;
      case "more" :
      case "after" :
          operator = "GT";
          break;
      case "less" :
      case "before" :
          operator = "LT";
          break;
      default:
          operator = op.toUpperCase();
  }
  return operator;
}

function getRealType(type) {
  var toRet = type.replace("custom:", "");
  toRet = toRet.replace("tns:", "");
  switch (toRet) {
      case "int":
      case "integer":
      case "boolean":
          return toRet.toUpperCase();
      default:
          return "STRING";
  }
}


function transformOnlyOneEvent(trigger, id, operator){
    "use strict";
      var evtId = id; //serve per le condizioni nested
      if (!evtId || evtId===null) { 
          let timeStamp = guid(); ///////
          evtId = evtId = trigger.element.realName + "_" + timeStamp;
      }
      var op = operator;
      if(!op || op===null){
          op = trigger.operator;
      }
      //var timestamp = guid(); //Date.now();
      var evtName = trigger.element.realName + "_" + "simpleEvent"/*+"_"+idx*/;
      //var evtId = trigger.element.realName + "_" + timestamp/*+"_"+idx*/;
      var xPath = "";
      if (trigger.element.xPath !== undefined &&
              trigger.element.xPath !== null)
          xPath = trigger.element.xPath;
      else
          xPath = trigger.element.originaltype;
      if (xPath === undefined) {
          xPath = "@" + evtId;
      }
      if (trigger.actualDataValue !== undefined) {
          var xPathSplit = xPath.split("@");
          xPath = xPathSplit[0] + trigger.actualDataValue + "/@" + xPathSplit[1];
      }
      if(trigger.element.type.toUpperCase() === "PROXIMITYTYPE" ||
          trigger.element.type.toUpperCase() === "ENUM" ){
          trigger.element.type = "STRING";
      }
      //Only 1 trigger with "not": make a complexUnaryCompEvent
      if (trigger.isNot && trigger.hasOwnProperty('notValue') && trigger.notValue.length > 0 && (trigger.notValue[2]!==null && trigger.notValue[3]!==null)) { //to be a complexNary must be present start and end time
          var eventObj = {
              "complexUnaryCompEvent": {
                  "event": {
                      "simpleEvent": {
                          "entityReference": {
                              "xpath": xPath,
                              "dimensionId": trigger.element.dimensionId
                          },
                          "constant": {
                              "value": trigger.value,
                              "type": trigger.element.type.toUpperCase()
                          },
                          "operator": getRealOperator(op),
                          "eventName": evtName
                      },
                  },
                  "timeInterval": {
                      "startingTime": trigger.notValue[2],
                      "endingTime": trigger.notValue[3],
                      "specificDate": trigger.notValue[0]

                  },
                  "operator": "NOT",
                  "eventId": evtId
              }
          }
          return eventObj;
      } else { //only 1 trigger without "not" start and end time: make a simpleEvent
          var simpleEvent = {
              "simpleEvent": {
                  "entityReference": {
                      "xpath": xPath,
                      "dimensionId": trigger.element.dimensionId
                  },
                  "constant": {
                      "value": trigger.value,
                      "type": trigger.element.type.toUpperCase()
                  },
                  "operator": getRealOperator(trigger.operator),
                  "eventName": evtName
              },
              "eventId": evtId
          };
          return simpleEvent;
      }
  }
  
function transformOnlyOneCondition(trigger, id, operator){
  var evtId = id; //serve per le condizioni nested
  if (!evtId || evtId===null) { 
      let timeStamp = guid();
      evtId = trigger.element.realName + "_" + timeStamp;
  }
  var op = operator;
  if(!op || op===null){
      op = trigger.operator;
  }
  let conditionName = trigger.element.realName + " " + "Condition"; 
  var xPath = "";
  if (trigger.element.xPath !== undefined &&
          trigger.element.xPath !== null)
      xPath = trigger.element.xPath;
  else
      xPath = trigger.element.originaltype;
  if (xPath === undefined) {
      xPath = "@" + evtId;
  }
  if (trigger.actualDataValue !== undefined) {
      var xPathSplit = xPath.split("@");
      xPath = xPathSplit[0] + trigger.actualDataValue + "/@" + xPathSplit[1];
  }
  var value = trigger.value;
  var type = trigger.element.type;
  if (trigger.element.type === "custom:lightLevelType") {
      if (value === 'no light') {
          op = "EQ";
          value = "no_light";
      } else if (value === 'high') {
          op = "EQ";
          value = "high";
      }
  }
  if (type.toUpperCase() === "PROXIMITYTYPE" ||
          type.toUpperCase() === "ENUM") {
      type = "STRING";
  }
  let conditionObj = {
      operator: getRealOperator(op),
      eventId: evtId,
      eventName: conditionName,
      entityReference: {
          xpath: xPath,
          dimensionId: trigger.element.dimensionId
      },
      constant: {
          value: value,
          type: type.toUpperCase()
      }
  };
  return conditionObj;
}
  
function transformConditionsNew(triggers, eventsLen, conditionsLen){
  //just 1 condition: return it    
  if (conditionsLen === 1) {
      for (let i = 0; i < triggers.length; i++) {
          if (triggers[i].triggerType === "condition") {
              return(transformOnlyOneCondition(triggers[i]));
          }
      }
  }
  // 2 conditions: make a complexCodition
  else if (conditionsLen === 2) {
      var operator = getFirstNextOperator(triggers, "condition").toUpperCase();
      var complex_condition = {
          condition: [],
          operator: operator
      };
      for (var i = 0; i < triggers.length; i++) {
          if (triggers[i].triggerType === 'condition') {
              let tmpConditionObj = transformOnlyOneCondition(triggers[i]);
              complex_condition.condition.push(tmpConditionObj);
          }
      }
      return complex_condition;
      //3 conditions
  } else if (conditionsLen > 2) {
      
      var sameOp = haveSameOperator(triggers, "condition");
      //Has same operator: place them on the same level. Can be a sequence on any length.
      if (sameOp) {
          var operator = getFirstNextOperator(triggers, "condition").toUpperCase();
          var complex_condition = {
              condition: [],
              operator: operator
          };
          for (var i = 0; i < triggers.length; i++) {
              if (triggers[i].triggerType === 'condition') {
                  complex_condition.condition.push(transformOnlyOneCondition(triggers[i]));
              }
          }
          return complex_condition;
      //different operators: first aggregate conditions in "and", then aggregate to "or"
      } else { //only a sequence of length 3 is managed
          if (conditionsLen === 3) {
      let andConditions;
      let el1;
      let el2;
          for(let i = 0; i<triggers.length; i++){
              //first condition
              if(triggers[i].triggerType==="condition" && (triggers[i].nextOperator && triggers[i].nextOperator==="and")){
                   el1 = triggers.splice(i, 1); 
                   break;
              }
          }
          for(let i=0; i<triggers.length; i++){
              //second condition
              if(triggers[i].triggerType==="condition" && (!triggers[i].nextOperator || triggers[i].nextOperator==="or")){
                  el2 = triggers.splice(i, 1); 
                  andConditions = el1.concat(el2);
                  break;
              }
          }
          /*
           //there must be only one "and" related to conditions. 2 possibilities: 
          //"and" conditions are placed one beside the other, or they are interspersed with an event
          //it's ok if they are not "inline", because events and conditions are treatened separately.
          for(let i = 0; i<triggers.length; i++){ //remove from triggers the condition linked with "and"
              if(triggers[i].triggerType==="condition" && triggers[i+1] && triggers[i+1].triggerType==="condition" && triggers[i].nextOperator && triggers[i].nextOperator==="and"){
                  andConditions = triggers.splice(i, 2);
              }
          }
          */
          let internalAndConditions =  {
              "operator" : "AND",
              "condition": []
          }
          
          for (var i = 0; i < andConditions.length; i++) {
                  internalAndConditions.condition.push(transformOnlyOneCondition(andConditions[i]));
              }
          
          let externalOrCondition;
          
          for (var i = 0; i < triggers.length; i++) { //loop and if needed because in "triggers" an event should be still present
              if (triggers[i].triggerType === 'condition') {
                  externalOrCondition=transformOnlyOneCondition(triggers[i], null, "OR");
              }
          }
          
          externalOrCondition.condition = [];
          externalOrCondition.condition.push(internalAndConditions);
          return externalOrCondition;
          }
          }
      }
      //more than 3 conditions with different operators
      utilityView.displayAlertMessage(getAlertMessageLocale("too_complex_condition"), "danger", true);
      return null;
  }



function transformEventsNew(triggers, eventsLen, conditionsLen){
  //just 1 event: return it
  if (eventsLen === 1) {
      for(let i=0; i<triggers.length; i++){
          if(triggers[i].triggerType==="event"){
              return(transformOnlyOneEvent(triggers[i]));
          }
      }
  }
  
  // 2 events: make a complexNaryEvent, whose operator is the one between the events
  else if(eventsLen === 2){
  
      var operator = getFirstNextOperator(triggers, "event").toUpperCase();
      if(operator==="AND"){
          operator = "SEQUENCE";
      }
      var complex_event = {
          complexNaryCompEvent: {
              operator: operator,
              event:[]
          }
      };
      var eventArr = [];
      
      
      for(let i=0; i<triggers.length; i++){
          if(triggers[i].triggerType==="event"){
              eventArr.push(transformOnlyOneEvent(triggers[i]));
          }
      }
      
      complex_event.complexNaryCompEvent.event = eventArr;
      return complex_event;
  }
  
  //3 or more events
  //else if(eventsLen > 2 && (conditionsLen === 0 || conditionsLen === 1)){
    else if(eventsLen > 2){
     var sameOp = haveSameOperator(triggers, "event");
     //Has same operator: place them on the same level. Can be a sequence of any length
     if(sameOp){
     var operator = getFirstNextOperator(triggers, "event").toUpperCase();
     if(operator==="AND"){
          operator = "SEQUENCE";
     }
          
     var complex_event = {
          complexNaryCompEvent: {
              operator: operator,
              event:[]
          }
      };
      var eventArr = [];
      
      
      for(let i=0; i<triggers.length; i++){
          if(triggers[i].triggerType==="event"){
              eventArr.push(transformOnlyOneEvent(triggers[i]));
          }
      }
      
      complex_event.complexNaryCompEvent.event = eventArr;
      return complex_event;
  }
  else { //different operators: only sequences of length 3 are managed
      if(eventsLen === 3) {
      let andEvents;
      let el1;
      let el2;
          for(let i = 0; i<triggers.length; i++){
              //first event
              if(triggers[i].triggerType==="event" && (triggers[i].nextOperator && triggers[i].nextOperator==="and")){
                   el1 = triggers.splice(i, 1); 
                   break;
              }
          }
          for(let i=0; i<triggers.length; i++){
              //second event
              if(triggers[i].triggerType==="event" && (!triggers[i].nextOperator || triggers[i].nextOperator==="or")){
                  el2 = triggers.splice(i, 1); 
                  andEvents = el1.concat(el2);
                  break;
              }
          }
         
         /*
          for(let i = 0; i<triggers.length; i++){ //remove from triggers the events linked with "and"
              if(triggers[i].triggerType==="event" && triggers[i+1] && triggers[i+1].triggerType==="event" && triggers[i].nextOperator && triggers[i].nextOperator==="and"){
                  let el1 = triggers.splice(i, 2); // consecutive and events
                  andEvents = el1;
              }
              else if(triggers[i].triggerType==="event" && triggers[i+2] && triggers[i+2].triggerType==="event" && triggers[i].nextOperator && triggers[i].nextOperator==="and"){
                  let el1 = triggers.splice(i, 1); // and events interspersed with a condition
                  let el2 = triggers.splice(i+1, 1); //just i+1 because splice remove elements
                  andEvents = el1.concat(el2);
              }
          }
          */
          var internalAnd = {
              complexNaryCompEvent: {
                  operator: "SEQUENCE",
                  event:[]
              }
          };
          var eventArr = [];
     
          for(let i=0; i<andEvents.length; i++){
              eventArr.push(transformOnlyOneEvent(andEvents[i]));
          }
      
          internalAnd.complexNaryCompEvent.event = eventArr;
          
          let orEvent;
          
          for (var i = 0; i < triggers.length; i++) { //loop and if needed because in "triggers" a condition should be still present
              if (triggers[i].triggerType === 'event') {
                  orEvent=transformOnlyOneEvent(triggers[i]);
              }
          }
          let externalEvent = {  
              "complexNaryCompEvent": {
                  "operator": "OR",
                  "event": []
              }
          }
          
          externalEvent.complexNaryCompEvent.event.push(orEvent);
          externalEvent.complexNaryCompEvent.event.push(internalAnd);
         
          return externalEvent;
      }
  }
      //more than 3 events with different operators
      utilityView.displayAlertMessage(getAlertMessageLocale("too_complex_event"), "danger", true);
      return null;
  }
  
  
}



/**
* funzione presa da https://www.w3resource.com/javascript-exercises/javascript-math-exercise-23.php
*/
export function create_UUID() {
	var dt = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (dt + Math.random() * 16) % 16 | 0;
		dt = Math.floor(dt / 16);
		return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
	return uuid;
}