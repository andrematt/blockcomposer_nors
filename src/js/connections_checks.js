import {
    getWorkspace, checkInTriggerInfo, getTriggerList, getAllTriggerInWorkspace,
    getBlockType, setTriggerList, getActionList,
    setActionList, getRuleBlock, hasTriggerChild, getOperatorWithoutNextConn,
    checkIfTriggerOperator, getTriggerWithNoNextConnection, checkIfAction,
    getNextViableBlockForAction, hasActionChild 
  } from "./main.js";


  const availableConnections = {
    ACTIONS : ["action", "parallel_dynamic", "action_placeholder"], 
    TRIGGERS : ["trigger", "group"],
  };

  const availableNextStatements = {
    trigger : ["and", "or", "group", "not_dynamic"],
    action: ["parallel_dynamic", "sequential", "parallel"],
    and : ["trigger"],
    or : ["trigger"],
    group : ["trigger"],
    parallel_dynamic : ["action"],
    sequential: ["action"],
    parallel: ["action"],
    action_placeholder : ["action"]
  }

/** 
 * Returns the input to whom the previous connection of the passed block
 * is linkd to in the previous block. 
 * @return {Blockly.Input} The input that the connection belongs to or null if
 *     no parent exists.
 * @package
 * 
 */
 function getParentInput(block, parent) {
  "use strict";
  let parentInput = null;
  let inputs = parent.inputList;
  let parentConnection = null;
  let parentConnectionsArr = parent.getConnections_(true); 
  for (let i = 0; i < parentConnectionsArr.length; i++){
    if(parentConnectionsArr[i].x_ === block.previousConnection.x_ && parentConnectionsArr[i].y_ === block.previousConnection.y_){
      parentConnection = parentConnectionsArr[i];
      break;
    }
  }

  for (var idx = 0; idx < inputs.length; idx++) {  
    if (inputs[idx].connection === parentConnection) {
      parentInput = inputs[idx];
      break;
    }
  }
  return parentInput;
}
  

/**
   * Returns true if the connection to parent element is legal
   * @param {*} child 
   * @param {*} parentBlock 
   */
  export function checkConnection(child, parentBlock) {     
      // if is a "rule" type block, check the inputs. Else, check the next 
      // statement
      if(parentBlock.type === "rule") {
        let parentInput = getParentInput(child, parentBlock);
        if(parentInput && availableConnections[parentInput.name] && availableConnections[parentInput.name].includes(child.blockType)){
            return true;
        }
        else {
          return false;
        }
      }
      else {
        if(availableNextStatements[parentBlock.blockType] && availableNextStatements[parentBlock.blockType].includes(child.blockType)){
          //TODO: make a check to prevent nested sequential inside parallel block 
          return true;
        }
        else {
          return false;
        }      
      }
  }