import {guid} from "./utils.js";
import { printPassedError } from "./textarea_manager.js";
import GLOBALS from "./ctx_sources.js";

export function prepareRulesForNode(rule) {
  // TODO triggers deve avere il campo isNot, da inserire quando la regola viene salvata
  "use strict";
  let ruleToActivate = JSON.parse(rule[0].rule_obj_str);
  let id = ruleToActivate.id;
  console.log("sendRulesToAE");
  
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
  let priority = ruleToActivate.priority;
  // adesso se non viene specificata invia ""
  if (priority === undefined || priority === 0 || priority === "") {
      priority = 1;
  }
  
  if (ruleToActivate) {
      ruleSelectedOrDeleted = true;
      tmpRule = {
          name: ruleToActivate.ruleName, //"rule" + i,
          id: id, //Keep the same ID from the local database
          originalId: id, 
          naturalLanguage: "not used",
          actionMode: ruleToActivate.actionMode,
          priority: priority,
          actionOrRuleOrBlockReference: []
      };
      
          for (let j = 0; j < ruleToActivate.triggers.length; j++) {
              if (ruleToActivate.triggers[j].notValue && ruleToActivate.triggers[j].notValue.length > 0 && (ruleToActivate.triggers[j].notValue[2]!==null && ruleToActivate.triggers[j].notValue[3]!==null)) {
                  ruleToActivate.triggers[j].triggerType = "event"; //trasformo i trigger in event se una condizione ha il not e se ha settati i parametri dell'orario
              }
              else if (ruleToActivate.triggers[j].element.realName === "typeOfProximity") {
                  ruleToActivate.triggers[j].triggerType = "event"; //trasformo i trigger "typeOfProxymity" in event
              }
              else if (ruleToActivate.triggers[j].element.realName === "pointOfInterest"){
                  ruleToActivate.triggers[j].triggerType = "condition"; //trasformo i trigger "pointOfInterest" in condition
              }                
          }
          
          var eventsLen = 0;
          var conditionsLen = 0;
          for(let i=0; i<ruleToActivate.triggers.length; i++){
              if(ruleToActivate.triggers[i].triggerType === "event"){
                  eventsLen++;
              }
              else if(ruleToActivate.triggers[i].triggerType === "condition"){
                  conditionsLen++;
              }
          };
          
          let transformedEvents;
          let transformedConditions;
          
          if(eventsLen>0){
              transformedEvents = transformEventsNew(ruleToActivate.triggers, eventsLen, conditionsLen); 
              //tmpRule.event = transformEventsNew(ruleToActivate.triggers, eventsLen, conditionsLen); 
          }
          if(conditionsLen>0){
              transformedConditions = transformConditionsNew(ruleToActivate.triggers, eventsLen, conditionsLen);
              //tmpRule.condition = transformConditionsNew(ruleToActivate.triggers, eventsLen, conditionsLen);
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
          //transformEvents(ruleToActivate.triggers) !== null ? tmpRule.event = transformEvents(ruleToActivate.triggers) : null; //Prima lo esegue per vedere se è null e poi lo esegue per assegnarlo?
          //transformConditions(ruleToActivate.triggers) !== null ? tmpRule.condition = transformConditions(ruleToActivate.triggers) : null;
          tmpRule.actionOrRuleOrBlockReference.push(transformActions(ruleToActivate.actions));
          
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
  return(ruleModelObj);
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
      //more than 3 events with different operators TODO ALERT
      utilityView.displayAlertMessage(getAlertMessageLocale("too_complex_event"), "danger", true);
      return null;
  }
  
  
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
  "use strict";
  let toRet = type.replace("custom:", "");
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