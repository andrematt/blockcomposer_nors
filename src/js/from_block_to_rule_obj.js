import {
  getUserName, getWorkspace, getTriggerInfo, getHighlightedRule,
  createRuleBlocksObj, createRuleBlocksStr,
  getActionInfo, getTriggerWithNoNextConnection, getRuleSequence,
  returnTriggerType
} from "./main.js";
import { createTimestamp, create_UUID } from "./utils.js";

let lastDepth = 0; //TODO remove this
/**
 * TODO CONTROLLA
 * Just runs on the action sequence, and not on the actual action blocks. 
 * May fails if an action is repeated.  
 * @param {*} actualBlock 
 */
function getNextBlockAction(actualBlock){
  let elementsInWorkspace = getRuleSequence();
  let index = elementsInWorkspace.elements.indexOf(actualBlock.type); //TYPE???
  if(index === -1){
    console.log("error: index not found in block in rule");
    return false;
  }
  else {
    if(index +1 < elementsInWorkspace.elements.length){
      return elementsInWorkspace.elements[index+1]
    }
    else {
      return "none"
    }

  }
}

/**
 * Just runs on the trigger sequence, and not on the actual trigger blocks. 
 * May fails if a trigger is repeated.  
 * @param {*} actualBlock 
 */
function getNextBlockTrigger(actualBlock){
  let elementsInWorkspace = getRuleSequence();
  let index = elementsInWorkspace.elements.indexOf(actualBlock.type);
  if(index === -1){
    console.log("error: index not found in block in rule");
    return false;
  }
  else {
    if(index +1 < elementsInWorkspace.elements.length){
      return elementsInWorkspace.elements[index+1]
    }
    else {
      return "none"
    }

  }
}


/**
 * Get next operator considering the use of the simple "parallel" block 
 * @param {*} actualBlock 
 */
function getNextOperatorAction(actualBlock){
  let nextBlock = actualBlock.getNextBlock();
  if (nextBlock){
    return nextBlock.type === "parallel" ? "parallel" : "sequential";
  } 
  return "none";
}



/**
 * Get next operator considering the use of the block "parallel dynamic" 
 * @param {*} actualBlock 
 */
function getNextOperatorActionParallelDynamic(actualBlock){
  let nextBlock = actualBlock.getNextBlock();
  if (nextBlock){
    return nextBlock.type === "parallel_dynamic" ? 
      {type: "sequential", attribute: "start parallel"} :
      {type: "sequential", attribute: "none"};
  }
  let previousBlock = actualBlock.getPreviousBlock();
  if(previousBlock && previousBlock.type !== "rule"){
    let previousParent = previousBlock.parentBlock_; 
    let myId = actualBlock.id;
    let lastActionPlaceholderBlock;
    for(let i = 0; i< previousParent.childBlocks_.length; i++){
      if(previousParent.childBlocks_[i].blockType === "action_placeholder")
      lastActionPlaceholderBlock = previousParent.childBlocks_[i]; 
    }
    if(lastActionPlaceholderBlock) {
      let idToCheck =  lastActionPlaceholderBlock.childBlocks_[0].id;
      return myId === idToCheck ? 
        {type: "sequential", attribute: "end parallel"} :
        {type: "parallel", attribute: "none"}; 
      }
    else {
      return {type: "sequential", attribute: "none"};
    }
  }
  //rule end
  return {type: "none", operator: "none"};
}

/**
 * 
 * @param {*} actualBlock 
 */
function getNextOperatorTrigger(actualBlock){
  let nextBlock = actualBlock.getNextBlock();
  if (nextBlock && (nextBlock.type === "and" || nextBlock.type === "or")) {
    return nextBlock.type;
  }
  return "rule";
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
  else if (actualBlock.getInput("START_TIME_HOUR")) {
    let result = {};
    let startTimeHourInput = actualBlock.getInput("START_TIME_HOUR");
    let startTimeMinInput = actualBlock.getInput("START_TIME_MIN");
    let startTime = startTimeHourInput.fieldRow[0].text_ + ":" + startTimeMinInput.fieldRow[0].text_;
    result.startTime = startTime;
    if(actualBlock.getInput("END_TIME_HOUR")){ //time as conditon have also an "end" time
      let endTimeHourInput = actualBlock.getInput("END_TIME_HOUR");
      let endTimeMinInput = actualBlock.getInput("END_TIME_MIN");
      let endTime = endTimeHourInput.fieldRow[0].text_ + ":" + endTimeMinInput.fieldRow[0].text_;
      result.endTime = endTime;
    }
    return result; 
   /* 
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
    */
  }
  //trigger di tipo date
  else if (actualBlock.getInput("DATE")) {
    let inputDate = actualBlock.getInput("DATE");
    console.log(inputDate);
    return inputDate.fieldRow[0].text_;
    //let blockConnectedToDay = actualBlock.getInput("DATE").connection.targetBlock();
    //if (blockConnectedToDay && blockConnectedToDay.type === "day") {
      //return blockConnectedToDay.inputList[0].fieldRow[0].date_;
   // }
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
          if(dayField) {
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
          }
          let startTimeHour;
          let startTimeMin;
          if(startTimeField) {
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
          }
          let endTimeHour;
          let endTimeMin;
          if(endTimeField) {
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
        }
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
  let triggerInfo = getTriggerInfo(); //TODO fare anche per azioni!!!
  let me = triggerInfo[actualBlock.type];
  console.log(me);
  element.displayedName = actualBlock.getFieldValue("displayed_name");
  element.possibleValues = me.possibleValues;
  element.realName = actualBlock.getFieldValue("real_name");
  element.triggerType = "both";
  element.type = me.type; //TODO controllare
  element.unit = "";
  element.xPath = me.xPath;
  element.dimensionId = me.dimensionId;
  return element;
}

/**
 * TODO: controlla che il trigger sia effettivamente all'interno del blocco regola
 */
function isUnderRuleBlockTrigger(block){
  return true;
}

/**
 * TODO: controlla che l'azione sia effettivamente all'interno del blocco regola
 */
function isUnderRuleBlockAction(block){
  return true;
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
    if (_rule.blocks[block].isTrigger || _rule.blocks[block].isTriggerArray) {
      if(!isUnderRuleBlockTrigger(_rule.blocks[block])){
        continue;
      }
      let trigger = {};
      //  console.log(_rule.blocks[block]);
      trigger.triggerType = returnTriggerType(_rule.blocks[block]); 
      trigger.type = _rule.blocks[block].type; 
      trigger.blockId = _rule.blocks[block].id;
      trigger.dimension = _rule.blocks[block].dimension;
      trigger.dimensionId = _rule.blocks[block].dimensionId;
      trigger.nextOperator = getNextOperatorTrigger(_rule.blocks[block]);      
      trigger.operator = getActualOperator(_rule.blocks[block]);
      trigger.parent = _rule.blocks[block].getFieldValue("parent_name");
      trigger.value = getTriggerValue(_rule.blocks[block]);
      trigger.nextElement = getNextBlockTrigger(_rule.blocks[block]);
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
//aaaaaaaaaaaaaa
function createActionArr(_rule) {
  "use strict";
  let actionList = [];
  for (let block in _rule.blocks) {
    // console.log(_rule.blocks[block].isAction);
    if (_rule.blocks[block].isAction) {
      if(!isUnderRuleBlockAction(_rule.blocks[block])){
        continue;
      }
      let actionInfo = getActionInfo();
      let me = actionInfo[_rule.blocks[block].type];
      console.log(me);
      console.log("ACTION");
      console.log(_rule.blocks[block]);
      let parentAction;
      let action = {};
      action.action = {};
      //action.action.realName = _rule.blocks[block].getFieldValue("real_name");
      action.action.realName = _rule.blocks[block].type;
      action.type = _rule.blocks[block].getFieldValue("type");
      action.action.type = _rule.blocks[block].getFieldValue("type");
      action.parent = _rule.blocks[block].getFieldValue("parent_name");
      action.timing = _rule.blocks[block].timing;
      action.nextElement = getNextBlockAction(_rule.blocks[block]);
      // di default prende come operator e value i valori della select e
      // dell'input, eventualmente dopo vengono aggiornati.
      //action.operator = _rule.blocks[block].getFieldValue("SELECT_FIELD_VALUE");
      
      action.operator = getNextOperatorAction(_rule.blocks[block]);
      if (!_rule.blocks[block].isActionArray) {
        action.value = _rule.blocks[block].getFieldValue("INPUT_FIELD_VALUE");
      
        // azioni relative ai servizi amazon
        if (action.type === 'invokeFunctions:startRoutine') {
      let select_value = _rule.blocks[block].getFieldValue("SELECT_FIELD_VALUE");
          if (select_value === "0") {
            action.value = "NEWS";
          }
          if (select_value === "1") {
            action.value = "WEATHER";
          }
          if (select_value === "2") {
            action.value = "MUSIC";
          }
          if (select_value === "3") {
            action.value = "PETAL_ASSISTANT";
          }
        }
        

        // azioni relative alle luci
        if (action.type === 'invokeFunctions:changeApplianceState') {
          let select_value = _rule.blocks[block].getFieldValue("SELECT_FIELD_VALUE");
          if (select_value === "0") {
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
                value: JSON.stringify(_rule.blocks[block].getFieldValue("ALARM_TEXT"))
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
                value: JSON.stringify(_rule.blocks[block].getFieldValue("REMINDER_TEXT"))
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
    goal: _rule.goal,
    timestamp: _rule.timeStamp,
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
  _tmpTrigger.nextElement = _rule.triggers[j].nextElement;
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
 * misto) TODO: rifare per essere usato con i singoli blocchi seq/par (o direttamente
 * senza operatori)
 * @param {*} _rule 
 */
function getActionMode(_rule) {
  "use strict";
  console.log(_rule);
  let ruleType = "sequential";
  for (let block in _rule.blocks) {
    // se c'è un blocco di tipo parallel:
    if (_rule.blocks[block].type === "paralleldynamic") {
      let nextBlock = _rule.blocks[block].getNextBlock();
      let previousBlock = _rule.blocks[block].getPreviousBlock();
      // se ha come prevStatement un blocco rule e come nextStatement nulla
      // allora l'azione è di tipo parallel: non c'è bisogno di guardare 
      // altri blocchi 
      if (!nextBlock && previousBlock && previousBlock.type === "rule") {
        ruleType = "parallel";
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
        return ruleType;
      }
    }
  }
  return ruleType;
}

/**
 * Make a rule obj from a single trigger block.
 * Used by Neural Network suggestor in prediction phase.
 * @param {*} block 
 * @param {*} blockType 
 */
export function createTriggerFromSingleBlock(block){
      let trigger = {};
      //  console.log(_rule.blocks[block]);
      trigger.triggerType = returnTriggerType(block); 
      trigger.type = block.type;
      trigger.blockId = block.id;
      trigger.dimension = block.dimension;
      trigger.dimensionId = block.dimensionId;
      trigger.nextOperator = getNextOperatorTrigger(block);      
      trigger.operator = getActualOperator(block);
      trigger.parent = block.getFieldValue("parent_name");
      trigger.value = getTriggerValue(block);
      //gruppi: da creare quando è definito l'array di trigger
      trigger.startGroup = "";
      trigger.closeGroup = "";
      trigger.notValue = getTriggerNotValue(block);  
      trigger.isNot = trigger.notValue ? true : false;
      trigger.element = getTriggerElement(block); 
    return trigger;
}

/**
 * Make a rule obj from a single action block.
 * Used by Neural Network suggestor in prediction phase.
 * @param {*} block 
 */
export function createActionFromSingleBlock(block){
  "use strict";
  let action = {};
  let parentAction;
  action.action = {};
  //action.action.realName = block.getFieldValue("real_name");
  action.action.realName = block.type;
  action.type = block.getFieldValue("type");
  action.action.type = block.getFieldValue("type");
  action.parent = block.getFieldValue("parent_name");
  action.timing = block.timing;
      // di default prende come operator e value i valori della select e
      // dell'input, eventualmente dopo vengono aggiornati.
      //action.operator = _rule.blocks[block].getFieldValue("SELECT_FIELD_VALUE");
  action.operator = getNextOperatorAction(block);
  if (!block.isActionArray) {
    action.value = block.getFieldValue("INPUT_FIELD_VALUE");

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
          action.value =block.getFieldValue("COLOR_FIELD_VALUE");
          action.duration =block.getFieldValue("SELECT_FIELD_VALUE");
        }

      }
      //azioni di tipo composto, hanno il campo values
      else {
        action.values = [];
        if (block.type === "alarmText" || block.type === "Alarms-alarmText") {
          block.inputList.forEach(function (element) {
            console.log(element);
            if (element.name === "TEXT") {
              let value = {
                description: "Alarm Text",
                displayedName: "Text",
                realName: "alarmText",
                type: "custom:string",
                value: block.getFieldValue("ALARM_TEXT")
              };
              action.values.push(value);
            }

            else if (element.name === "NOTIFICATION") {
              let value = {
                description: "Notification mode",
                displayedName: "Notification mode",
                realName: "notificationMode",
                type: "custom:notificationMode",
                value: block.getFieldValue("NOTIFICATION_MODE")
              };
              action.values.push(value);
            }

            else if (element.name === "TIMES") {
              let value = {
                description: "How many times alert should be sent",
                displayedName: "Repetition",
                realName: "repetition",
                type: "custom:repetitionType",
                value: block.getFieldValue("REPETITIONS")
              };
              action.values.push(value);
            }

            else if (element.name === "SEND") {
              let value = {
                description: "Alarm recipient",
                displayedName: "Recipient",
                realName: "alarmRecipient",
                type: "custom:string",
                value: block.getFieldValue("SEND_TO")
              };
              action.values.push(value);
            }
          });
        }
        else if (block.type === "reminderText" || block.type === "Reminders-reminderText") {
          block.inputList.forEach(function (element) {
            console.log(element);
            if (element.name === "TEXT") {
              let value = {
                description: "Reminder Text",
                displayedName: "Text",
                realName: "reminderText",
                type: "custom:string",
                value: block.getFieldValue("REMINDER_TEXT")
              };
              action.values.push(value);
            }

            else if (element.name === "NOTIFICATION") {
              let value = {
                description: "Notification mode",
                displayedName: "Notification mode",
                realName: "notificationMode",
                type: "custom:notificationMode",
                value: block.getFieldValue("NOTIFICATION_MODE")
              };
              action.values.push(value);
            }

            else if (element.name === "TIMES") {
              let value = {
                description: "How many times alert should be sent",
                displayedName: "Repetition",
                realName: "repetition",
                type: "custom:repetitionType",
                value: block.getFieldValue("REPETITIONS")
              };
              action.values.push(value);
            }

            else if (element.name === "SEND") {
              let value = {
                description: "Reminder recipient",
                displayedName: "Recipient",
                realName: "reminderRecipient",
                type: "custom:string",
                value: block.getFieldValue("SEND_TO")
              };
              action.values.push(value);
            }
          });
        }
      }
    return action;
    }

/**\
 * Crea l'oggetto da salvare nel db
 * @param {*} blockDb 
 * @param {*} isUpdate 
 */
export function makeRuleObj(blockDb, isUpdate, id) {
  "use strict";
  let myWorkspace = getWorkspace();
  let _rule = {};
  //ottiene tutti i blocchi dal workspace, ordinati secondo la posizione
  _rule.blocks = myWorkspace.getAllBlocks(true);
  _rule.id = id;
  _rule.name = document.getElementById('rule_name').value;
  _rule.author = getUserName(); 
  _rule.priority = document.getElementById('priority').value;
  _rule.goal = document.getElementById('goal').value;
  _rule.timeStamp = createTimestamp();
  _rule.triggers = createTriggerArr(_rule);
  _rule.actions = createActionArr(_rule);
  _rule.actionMode = getActionMode(_rule);
  if(typeof _rule.priority == 'number' && (_rule.priority > 10 || _rule.priority < 0)) {
    _rule.priority = 1;
  }
  if (_rule.priority === undefined || _rule.priority === "") {
    _rule.priority = 1;
  }
  if (_rule.actionMode === undefined || _rule.actionMode === '') {
    _rule.actionMode = "sequential";
  }

  var _tmpRule = prepareTmpRule(_rule);

  let triggersWithGroup = setTriggerGroup(_rule.triggers);
  _rule.triggers = triggersWithGroup;

  for (var j = 0; j < _rule.triggers.length; j++) {
    setTriggerDepth(_rule.triggers[j], j, _rule.triggers);
    _rule.triggers[j].depth = lastDepth;
    lastDepth = 0;
    var _tmpTrigger = prepareTmpTrigger(_rule, j);
    _tmpRule.triggers.push(_tmpTrigger);
  }

  for (var k = 0; k < _rule.actions.length; k++) {
    var _tmpAction = {
      action: {
        realName: _rule.actions[k].action.realName,
        type: _rule.actions[k].type
      },
      operator: _rule.actions[k].operator,
      timing: _rule.actions[k].timing,
      parent: _rule.actions[k].parent,
      nextElement: _rule.actions[k].nextElement,
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