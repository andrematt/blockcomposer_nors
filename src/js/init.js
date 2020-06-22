import GLOBALS from "./ctx_sources.js";

/**
 * Recupera i trigger da remoto, trasforma in json, restituisce
 */
export async function loadTriggersAsync(){
  let promise = new Promise((resolve, reject) => {
    fetch(GLOBALS.triggers)
    .then(response => response.json())
    .then(data => {resolve(data) }) // qua restituiamo, meglio fare elaborazione in modulo apposito
    //.then(data => {resolve(loadTriggersToolbox(data)) }) //Il ris di una promise non si restituisce con return ma con resolve!
    .catch(error => {reject(error)});
  });
return promise; //ok restituire direttamente promise
//let result = await promise; // wait till the promise resolves (*)
//return result; // "done!"
}

/**
 * Recupera le azioni da remoto, trasforma in json, restituisce
 */
export async function loadActionsAsync(){
  console.log("load actions!");
  let promise = new Promise((resolve, reject) => {
    fetch(GLOBALS.actions)
    .then(response => response.json())
    .then(data => { resolve(data) }) // qua restituiamo, meglio fare elaborazione in modulo apposito
    //.then(data => {resolve(loadTriggersToolbox(data)) }) //Il ris di una promise non si restituisce con return ma con resolve!
    .catch(error => {reject(error)});
  });
return promise; //ok restituire direttamente promise
}