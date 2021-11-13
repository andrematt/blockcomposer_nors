import * as Main from "./main.js";
import * as DomModifiers from "./dom_modifiers.js";
import * as RS_values from "./rs_values.js";
import {dimensionIdTranslator, create_UUID, jaccard} from "./utils.js";
import {promiseCPT, getAllSequencesFromDB} from "./database_functs.js";
import * as errorMessages from "./textarea_manager.js";
import * as BlockToObj from "./from_block_to_rule_obj.js";

/**
 * Send a message to the textarea if the rules usually ends after the inserted 
 * rule element 
 * @param {*} list 
 */
function checkIfRuleEnd(list) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].label === "none") {
      errorMessages.oftenRuleEnds();
      break;
    }
  }
  return;
}


/**
 * Remove from suggestions rule objs already in the current sequence
 * @param {*} list 
 * @param {*} previousInsertedSequence 
 */
function filterRepeated(list, previousInsertedSequence) {
  let filtered = list.filter((e) => {
    return previousInsertedSequence.includes(e.label) ? false : true;
  });
  return filtered;
}


/**
 * Use linktype value to prevent strange behaviours
 * @param {*} list 
 * @param {*} check 
 */
function filterIncompatible(list, check, linkType) {
  if (!check) {
    return list;
  }
  if (linkType === "rule") {
    let filtered = list.filter((e) => {
      return checkInActionInfoOnlyName(e.label);
    });
    return filtered;
  }
  else if (linkType === "and" || linkType === "or") {
    let filtered = list.filter((e) => {
      return checkInTriggerInfoWithName(e.label);
    });
    return filtered;
  }
  else if (linkType === "sequential" || linkType === "parallel") {
    let filtered = list.filter((e) => {
      return e.label === "none" || checkInActionInfoOnlyName(e.label);
    });
    return filtered;
  }
  return list;
}

/**
 * Use a minimum confindence value to prevent strange behaviours
 * @param {*} list 
 * @param {*} minConf 
 */
function minimumConfidenceFilter(list, minConf) {
  let copy = list.filter((e) => {
    return e.value > minConf;
  });
  console.log(copy);
  return copy;
}

/**
 * nomen omen 
 * @param {*} resultObj 
 * @param {*} nOfRec 
 */
function obtainTopRec(resultObj, nOfRec) {
  console.log(resultObj);
  resultObj.sort((a, b) => {
    return b.value - a.value;
  });
  let sliced = resultObj.slice(0, nOfRec);
  return sliced;
}

/**
 * Mixes the CPT and NN predictors results using the passed weight scores
 * @param {*} CPTpredictions 
 * @param {*} NNpredictions 
 * @param {*} CPTweight 
 * @param {*} NNweight 
 */
function voteEnsembler(CPTpredictions, NNpredictions, CPTweight = 0.5, NNweight = 1) {
  let results = [];
  for (let el in NNpredictions) {
    let singleResult = {
      label: NNpredictions[el].label,
      value: NNpredictions[el].confidence * NNweight
    }
    let onlyLabels = CPTpredictions.map(entry => entry[0]);
    let index = onlyLabels.indexOf(NNpredictions[el].label);
    if (index !== -1) {
      singleResult.value += CPTpredictions[index][1] * CPTweight;
    }
    results.push(singleResult);
  }
  return results;
}

/**
 * 
 * @param {*} predictionsArr 
 */
function mapToOnlyNameArr(predictionsArr) {
  return predictionsArr.map(entry => entry[0]);
}

/**
 * 
 * @param {*} predictionsArr 
 */
function mapToOnlyNameObj(predictionsArr) {
  return predictionsArr.map(entry => entry.label);
}

/**
 * 
 * @param {*} listObj 
 */
function extractTriggersFromSuggestionList(listObj) {
  let myTriggers = [];
  let triggerInfo = getTriggerInfo();

  for (let obj in listObj) {
    if (!myTriggers.includes(listObj[obj].source) && checkInTriggerInfoWithName(listObj[obj].source)) {
      myTriggers.push(listObj[obj].source);
    }
    if (!myTriggers.includes(listObj[obj].dest) && checkInTriggerInfoWithName(listObj[obj].dest)) {
      myTriggers.push(listObj[obj].dest);
    }
  }
  console.log(myTriggers);
  return myTriggers;
}


/**
 * List of functions to manage the async call to CPT
 * @param {*} predictions 
 */
function receivedPredictions(predictions){
    console.log(predictions);
    Main.clearSuggestionWorkspace();
    errorMessages.cleanTextAreaAlerts();
    RS_values.setLastRec_CPT(predictions); //save the last prediciton
    let onlySequenceElements = mapToOnlyNameArr(predictions);
    //let xmlBlocks = DomModifiers.createBlocksFromSuggested(onlySequenceElements); //??
    DomModifiers.blocksToSuggestionWorkspace(onlySequenceElements);
    return;
}

/**
 * List of functions to manage the async call to CPT
 * @param {*} predictions 
 */
/*
function manageReceivedPredictionSingleElement(predictions){
    if (predictions[0] && predictions[0].length > 0) {
      console.log("SEQUENCE PREDICTIONS: ONLY LAST ELEMENT");
      return(predictions);
    }
    else {
      errorMessages.suggestorErrorMessages("noSuggestion");
    }
}
*/

/**
 * List of functions to manage the async call to CPT
 * @param {*} predictions 
 */
async function manageReceivedPredictionMultipleElements(predictions){
  if (predictions[0] && predictions[0].length > 0) {
    console.log("SEQUENCE PREDICTIONS: ALL ELEMENTS");
    return(predictions);
  }
  else {
      let lastBlock = Main.getLastBlock(); 
      let result = await promiseCPT([lastBlock.type], RS_values.getPreviousElementToConsider_CPT(), 5).then(
      manageReceivedPredictionSingleElement).then();
      return result;
  }
}

/**
 * List of functions to manage the async call to CPT
 * @param {*} results 
 */
function receivedPredictionsCheck(results){
  if(!results || 
    results[0] && results[0].length === 0){
      return;
    }
  receivedPredictions(results);
}

/**
 * Obtain the 5 top recommendations via CPT, add each of them to the already 
 * inserted sequence. Then, foreeach new sequence obtained, loops on each rule 
 * saved in the database, to check the one that best fits the new sequence.  
 * Then, this top5 rules is filter to remove duplicate rules and returned. 
 * @param {*} sequence 
 */
export async function fireRecommendationForFullRule(sequence, lastBlock) {
  let CPTpredictionsCheck = await promiseCPT(sequence, RS_values.getPreviousElementToConsider_CPT(), 5)
  .then(manageReceivedPredictionMultipleElements);
  if(!CPTpredictionsCheck || 
     CPTpredictionsCheck[0] && CPTpredictionsCheck[0].length === 0){
       return;
     }
  // create 5 sequence comprised by the element inserted by the user and the 
  // top cpt suggestions
  let sequenceWithCPTresults = [];
  for (let i = 0; i < CPTpredictionsCheck.length; i++) {
    let actualElement = [...sequence];
    actualElement.push(CPTpredictionsCheck[i][0]);
    sequenceWithCPTresults.push(actualElement);
  }
  console.log(sequenceWithCPTresults);
  //get all rules from DB 
  let allSequences = await getAllSequencesFromDB().then();
  console.log(allSequences);
  allSequences.map((e) => {
    e.rule_sequence = JSON.parse(e.rule_sequence);
  });
  console.log(allSequences);
  //get the most similar to the ones on the prev. step using Jaccard
  let topForeachCPTsuggestions = [];
  for (let i = 0; i < sequenceWithCPTresults.length; i++) {
    let myBestScore = -1;
    let best;
    let setA = new Set(sequenceWithCPTresults[i]);
    for (let j = 0; j < allSequences.length; j++) {
      let setB = new Set(allSequences[j].rule_sequence);
      let myScore = jaccard(setA, setB);
      if (myScore > myBestScore) {
        best = allSequences[j];
        myBestScore = myScore;
      }
    }
    if (best) {
      topForeachCPTsuggestions.push(best);
    }
  }
  console.log(topForeachCPTsuggestions);
  //filter repeated recs
  let uniqueIds = [];
  let uniqueRecs = [];
  for (let i = 0; i < topForeachCPTsuggestions.length; i++) {
    let myId = topForeachCPTsuggestions[i].id;
    if (!uniqueIds.includes(myId)) {
      uniqueIds.push(myId);
      uniqueRecs.push(topForeachCPTsuggestions[i]);
    }
  }
  console.log(uniqueRecs);
  return uniqueRecs;
}


/**
 * Generate a suggestion with CPT using the block sequence. If no result is 
 * found, use only the last sequence element. Called by the ruleSuggestorManager
 * in Main. TODO: move to python. 
 * @param {*} blockSequence 
 */
export async function fireOnlySequenceRec(blockSequence) {
  console.log("FIRING A SEQUENCE RECOMMENDATION");
  //await promiseCPT(blockSequence, RS_values.getPreviousElementToConsider_CPT(), 5)
  //.then(manageReceivedPredictionMultipleElements)
  //.then(receivedPredictionsCheck);
}

/**
 * Fire first a sequence recommendation, a NN based rec, then joins the two 
 * using a voting ensemble. 
 * @param {*} lastBlock 
 * @param {*} blockType 
 */
export async function fireFullDataRec(lastBlock, blockType, sequence, linkType) {
  let lastBlockObj;
  console.log("FIRING A FULL RECOMMENDATION")
  if (blockType === "trigger") {
    lastBlockObj = BlockToObj.createTriggerFromSingleBlock(lastBlock);
  }
  else if (blockType === "action") {
    lastBlockObj = BlockToObj.createActionFromSingleBlock(lastBlock);
  }
  else {
    console.log("WRONG RULE TYPE! rule suggestion not fired")
    return false;
  }
  let lastBlockElementAtt = generateElementAttFromRuleElement(lastBlockObj, blockType);
  //TODO: redo the RS in python, drop all this code
  //call CPT!
  // let CPTpredictions = await promiseCPT(sequence, RS_values.getPreviousElementToConsider_CPT(), 10)
  //.then(manageReceivedPredictionMultipleElements);
  //console.log("received predictions: ")
  //console.log(CPTpredictions);


  return;
  //AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  //RESTART FROM HERE WHEN THE NODE NN WILL WORKS
  //All this code have to be redone, because NN is in node now
  //call NN!
  //Featurs: el_name, el_type, act_type, trigg_type, link_type, negation
  //let test = await neuralNetworkTest().then();

  /*
  let NNpredictions;
  try {
    NNpredictions = await neuralNetwork.classify(lastBlockElementAtt.elementName, lastBlockElementAtt.elementType, lastBlockElementAtt.actionType,
      lastBlockElementAtt.triggerType, lastBlockElementAtt.nextOp, lastBlockElementAtt.negation).then();
  }
  catch {
    //if(NNpredictions === "error"){
    if (CPTpredictionsCheck.length > 0) {
      errorMessages.cleanTextAreaAlerts();
      Main.clearSuggestionWorkspace();
      RS_values.setLastRec_CPT(CPTpredictions); //save the last prediciton
      let onlySequenceElements = mapToOnlyNameArr(CPTpredictions[0]);
      //let xmlBlocks = DomModifiers.createBlocksFromSuggested(onlySequenceElements); //??
      DomModifiers.blocksToSuggestionWorkspace(onlySequenceElements);
      return;
    }
    else {
      errorMessages.suggestorErrorMessages("noSuggestion");
      return;
    }
  }
  RS_values.setLastRec_NN(NNpredictions);
  let ensembledResults = voteEnsembler(CPTpredictionsCheck, NNpredictions);
  // n of predictions, incompatibleCheck and minConfidence should be controlled via the user interface 
  let predictionToObtain = 5;
  let minimumConfidence = RS_values.getMinimumConfidence_NN();
  let filterIncompatibleCheck = true;
  let top5ensembledResults = obtainTopRec(ensembledResults, predictionToObtain);
  console.log("NN PREDICTIONS:");
  console.log(NNpredictions);
  console.log("RESUTLS AFTER ENSEMBLE!!");
  console.log(ensembledResults);
  Main.clearSuggestionWorkspace();
  let minimumConfidenceFiltered = minimumConfidenceFilter(top5ensembledResults, minimumConfidence);
  let filteredIncompatible = filterIncompatible(minimumConfidenceFiltered, filterIncompatibleCheck, linkType);
  let filteredRepeated = filterRepeated(filteredIncompatible, sequence);
  checkIfRuleEnd(filteredRepeated);
  //let xmlBlocks = DomModifiers.createBlocksFromSuggested(onlySequenceElements); //???
  let onlySequenceElements = mapToOnlyNameObj(filteredRepeated);
  DomModifiers.blocksToSuggestionWorkspace(onlySequenceElements);
  */
}

/**
 * 
 * @param {*} element 
 */
export function pointToEventCondition(element) {
  "use strict";
  if (element.dest === "event" || element.dest === "condition") {
    return true;
  }
  return false;
}

/**
 * 
 * @param {*} trigger 
 */
function getNegation(trigger){
  if (!trigger.isNot){
    return ("none");
  }
  else {
    if(trigger.notValue.length === 0){
      return ("negation without time");
    }
    else {
      return ("negation with time");
    }
  }
}

/**
 * 
 * @param {*} trigger 
 */
function getTriggerFullName(trigger){
  console.log(trigger);
  let translatedDimId = dimensionIdTranslator(trigger.element.dimensionId);
  return(translatedDimId);
}

/**
 * Used to translate a singole rule obj in element/att format. 
 * Used by neural network model in prediction phase (same as train but without 
 * the "nextElement" attribute field).
 * @param {*} ruleElement 
 * @param {*} elementType 
 */
export const generateElementAttFromRuleElement = (ruleElement, elementType) => {
  if(elementType === "trigger"){
    let trigger = 
    {//elementName: getTriggerFullName(ruleObj.triggers[i]), 
      elementName: ruleElement.type, 
      elementType : "trigger",
      triggerType : ruleElement.triggerType,
      actionType: "none",
      nextOp: ruleElement.nextOperator, 
      negation: getNegation(ruleElement)
    };
    return trigger;
  }
  else if (elementType === "action"){
    let action = {
      elementName: ruleElement.action.realName, 
      elementType : "action", 
      triggerType: "none",
      actionType: ruleElement.timing,
      nextOp: ruleElement.operator,
      negation: "none" 
    }
    return action;
  }
  return false;
};

/**
 * Built and returns the element/attribute table of a rule.
 * Used to store data in the format used by the neural network model for train.  
 * @param {*} workspace 
 */ 
export const generateElementAttributeTable = (id, ruleObj) => {
console.log(ruleObj);
let triggerList = Main.getTriggerInfo();
console.log(triggerList);
let ruleElementAttributeTable = [];
let triggers = [];
let actions = [];

for(let i = 0; i < ruleObj.triggers.length; i++){
triggers.push(
  {//elementName: getTriggerFullName(ruleObj.triggers[i]), 
   id : create_UUID(),
   referredRule: id, 
   elementName: ruleObj.triggers[i].type, 
   elementType : "trigger",
   triggerType : ruleObj.triggers[i].triggerType,
   actionType: "none",
   nextOp: ruleObj.triggers[i].nextOperator,
   nextElement: ruleObj.triggers[i].nextElement,
   negation: getNegation(ruleObj.triggers[i])
  });
}
ruleElementAttributeTable.push(...triggers);

for(let i = 0; i < ruleObj.actions.length; i++){
  actions.push(
  {
   id : create_UUID(),
   referredRule: id, 
   elementName: ruleObj.actions[i].action.realName, 
   type : "action", 
   elementType : "action",
   triggerType : "none",
   actionType: ruleObj.actions[i].timing,
   nextOp: ruleObj.actions[i].operator,
   nextElement: ruleObj.actions[i].nextElement,
   negation: "none" 
  });
}
ruleElementAttributeTable.push(...actions); 
console.log(ruleElementAttributeTable);
return ruleElementAttributeTable;
}


/**
 * Test set for NN prediction model
 */
async function neuralNetworkTest() {
  let test1 = ["bathroom-lightLevel", "trigger", "none", "event", "rule", "none"];
  let test2 = ["bathroom-lightLevel", "trigger", "none", "event", "rule", "negation with time"];
  let test3 = ["greatLuminaire-temperature", "trigger", "none", "event", "and", "none"];
  let test4 = ["Bathroom-Relax", "action", "extended", "none", "sequential", "none"];
  let test5 = ["Bedroom-Relax", "action", "extended", "none", "sequential", "none"];
  let prediction1 = await neuralNetwork.classify(test1[0], test1[1], test1[2], test1[3], test1[4], test1[5]).then();
  console.log(prediction1);
  let prediction2 = await neuralNetwork.classify(test2[0], test2[1], test2[2], test2[3], test2[4], test2[5]).then();
  console.log(prediction2);
  let prediction3 = await neuralNetwork.classify(test3[0], test3[1], test1[2], test3[3], test3[4], test3[5]).then();
  console.log(prediction3);
  let prediction4 = await neuralNetwork.classify(test4[0], test4[1], test4[2], test4[3], test4[4], test4[5]).then();
  console.log(prediction4);
}