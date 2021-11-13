//import {fireOnlySequenceRecNoDom, getRuleSequence} from "./main.js";

let previousElementsToConsider_CPT = 2;
let weight_CPT = 0.5;
let weight_NN = 1;
let lastRec_CPT; 
let lastRec_NN;
let minimumConfidence_NN = 0.05;
let numberOfPredictions_CPT = 5;

/**
 * 
 */

 /*
export function whatIf_CPT(){
    let elementsInWorkspace = getRuleSequence();
    console.log(elementsInWorkspace);
    let onlyElements = elementsInWorkspace.elements;
    let elementsToConsider = document.getElementById('prev_elements').value;
    setPreviousElementsToConsider_CPT(elementsToConsider);
    let result = fireOnlySequenceRecNoDom(onlyElements);
    console.log(result);
    document.getElementById('prediction_rescored_CPT').innerHTML = elementsToConsider;
}
*/
export function getNumberOfPredictions_CPT(){
    return numberOfPredictions_CPT;
}

/**
 * getter
 */
export function getPreviousElementToConsider_CPT(){
    return previousElementsToConsider_CPT;
}

/**
 * getter 
 */
export function getWeight_CPT(){
    return weight_CPT;
}

/**
 * getter
 */
export function getWeight_NN(){
    return weight_NN;
}

/**
 * getter 
 */
export function getLastRec_CPT(){
    return lastRec_CPT;
}

/**
 * getter 
 */
export function getLastRec_NN(){
    return lastRec_NN;
}

/**
 * getter 
 */
export function getMinimumConfidence_NN(){
    return minimumConfidence_NN;
}

/**
 * setter
 */
export function setNumberOfPredictions_CPT(value){
    numberOfPredictions_CPT = value;
}

/**
 * setter 
 * @param {*} value 
 */
export function setPreviousElementsToConsider_CPT(value){
    previousElementsToConsider_CPT = value;
}

/**
 * setter
 * @param {*} value 
 */
export function setWeight_CPT(value){
    weight_CPT = value;
}

/**
 * setter
 * @param {*} value 
 */
export function setWeight_NN(value){
    weight_NN = value;
}

/**
 * setter
 * @param {*} value 
 */
export function setLastRec_CPT(value){
    lastRec_CPT = value;
}

/**
 * setter
 * @param {*} value 
 */
export function setLastRec_NN(value){
    lastRec_NN = value;
}

/**
 * setter
 * @param {*} value 
 */
export function setMinimumConfidence_NN(value){
    minimumConfidence_NN = value;
}
