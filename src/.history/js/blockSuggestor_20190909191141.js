import * as Main from "./main.js";
import { retreiveMatrixDB, saveMatrixDB, updateMatrixDB } from "./database_functs.js";


/**
 * salva l'edge tra source e dest incrementando l'indice in posizione [s][d] 
 * nella matrice passata come arg
 * @param {*} origin 
 * @param {*} source 
 * @param {*} matrix 
 */
function increaseLinkCount(source, dest, linkArr) {
  console.log("increasing matrix from", source, "to ", dest);
  for (let i = 0; i < linkArr.length; i++) {
    if (linkArr[i].source === source && linkArr[i].dest === dest) {
      linkArr[i].value++;
      return linkArr;
    }
  }
  let newEntry = {
    "source": source,
    "dest": dest,
    value: 1
  };
  linkArr.push(newEntry);
  return linkArr;
  /*
  let firstRow = matrix[0];
  let sourceIndex = firstRow.indexOf(source);
  let destIndex = firstRow.indexOf(dest);
  matrix[sourceIndex][destIndex]++;
  console.log("resulting matrix: ", matrix);
  return matrix;
  */
}

/**
 * salva l'edge tra source e dest incrementando l'indice in posizione [s][d] 
 * nella matrice passata come arg
 * @param {*} origin 
 * @param {*} source 
 * @param {*} matrix 
 */
function increaseMatrixCount(source, dest, matrix) {
  console.log("increasing matrix from", source, "to ", dest);
  let firstRow = matrix[0];
  let sourceIndex = firstRow.indexOf(source);
  let destIndex = firstRow.indexOf(dest);
  matrix[sourceIndex][destIndex]++;
  console.log("resulting matrix: ", matrix);
  return matrix;
}

/**
 * Unise la vecchia matrice con quella corrente, invia al db 
 * @param {*} oldMatrix 
 * @param {*} currentMatrix 
 */
function mergeMatrixes(oldMatrix, currentMatrix) {
  let newMatrix = [...oldMatrix];
  for (let i = 0; i < currentMatrix.length; i++) {
    let found = false;
    for (let j = 0; j < newMatrix.length; j++) {
      if (currentMatrix[i].source === newMatrix[j].source &&
        currentMatrix[i].dest === newMatrix[j].dest) {
        newMatrix[j].value++;
        found = true;
        break;
      }
    }
    if (!found) {
      newMatrix.push(currentMatrix[i]);
    }
  }
  console.log("MATRIXES MERGED!", newMatrix);
  return newMatrix;
}

/**
 * 
 * @param {*} matrix 
 */
export async function addCurrentMatrixToGlobalMatrix(matrix) {
  let result = await retreiveMatrixDB().then();
  // non è presente nel database: invio la matrix corrente
  if (!result || result.length === 0) {
    console.log("non presente in db");
    saveMatrixDB(matrix);

  }
  // se è presente aggiungo la matrix corrente a quella già nel db
  else {
    console.log("presente in db!")
    let oldMatrix = result[0].rules_matrix;
    let id = result[0].id;
    let oldMatrixArr = JSON.parse(oldMatrix);
    if (oldMatrixArr && matrix) {
      let merged = mergeMatrixes(oldMatrixArr, matrix);
      updateMatrixDB(id, merged);
    }
  }
  return;
}

/**
 * Funzione che trasforma una struttura DOM di elementi xml in una matrice di adiacenza.
 * I nodi della matrice sono gli elementi di tipo block, i vertici tra i nodi sono estratti
 * dai tag next (vertice tra blocco precedente e successivo), value (stesso), statement (collega
 * il blocco precedente a tutti i blocchi presenti all'interno dello statement)
 * @param {*} xml 
 */
function createTriggerMatrix(xml, workspace) {
  let allElements = xml.querySelectorAll("block");
  let allNames = [];

  for (let i = 0; i < allElements.length; i++) {
    allNames.push(allElements[i].getAttribute("type"));
  }

  let linkArray = [];

  for (let i = 0; i < allElements.length; i++) {
    //console.log(allElements[i]);
    console.log("HTML: ", allElements[i].outerHTML);
    let myType = allElements[i].getAttribute('type');
    let myId = allElements[i].getAttribute('id');
    console.log("myType:", myType);
    let block = workspace.getBlockById(myId);
    console.log(block);
    let myChildren = block.getChildren();
    if (myChildren && myChildren.length > 0) {
      for (let j = 0; j < myChildren.length; j++) {
        let childType = myChildren[j].type;
        linkArray = increaseLinkCount(myType, childType, linkArray);
        //taggedMatrix = increaseMatrixCount(myType, childType, taggedMatrix);
      }
    }
    console.log("LINK ARR!!", linkArray);
  }

  //console.log("final matrix: ", taggedMatrix);
  //return taggedMatrix;
  return linkArray;
}

/**
 * 
 * @param {*} candidateList 
 */
function checkOnlyTerminalLeafs(candidateList) {
  let onlyEventCond = true;
  for (let i = 0; i < candidateList.length; i++) {
    // aggiungere date e time
    if (candidateList[i].dest !== "condition" || candidateList[i] !== "event") {
      onlyEventCond = false;
      break;
    }
  }
  return onlyEventCond;
}

/**
 * 
 * @param {*} suggestionList 
 */
export function concludePath(suggestionList, initialPathList) {
  let last = suggestionList[suggestionList.length - 1];
  // isTrigger
  let triggerSupportBlocks = Main.getTriggerSupportBlocks();
  console.log(triggerSupportBlocks);
  console.log(last);
  if (!triggerSupportBlocks.includes(last.dest)) {
    for (let i = 0; i < initialPathList.length; i++) {
      if (initialPathList[i].source === last.dest && (
        initialPathList[i].dest === "event" ||
        initialPathList[i].dest === "condition")) {
        // Posso direttamente aggiungere il primo match perchè sono ordinati per value
        suggestionList.push(initialPathList[i]);
        return suggestionList;
      }
    }
  }
  return suggestionList;
}

/**
 * Restituisce il path con peso maggiore. Non più usato: viene direttamente creato
 * un solo path
 * @param {*} suggestionList 
 */
export function returnBestSuggestion(suggestionList) {
  console.log("not sorted list: ", suggestionList);
  let maxIndex = 0;
  let maxValue = 0;
  //const highest = suggestionList.reduce(function (a, b)  b.value - a.value)[0];
  suggestionList.forEach(function (e, i) {
    let localSum = 0;
    for (let j = 0; j < e.length; j++) {
      localSum += e[j].value;
    }
    if (localSum > maxValue) {
      maxValue = localSum;
      maxIndex = i;
    }
  });
  console.log("max index:", maxIndex);
  return suggestionList[maxIndex];
}

/**
 * Ordina la lista dei candidati in base al peso dei link ("value")
 * @param {*} candidatesList 
 */
function sortCandidatesList(candidatesList) {
  console.log("sorting!", candidatesList);
  candidatesList.sort(function (a, b) {
    if (a.value > b.value) {
      return -1;
    }
    if (a.value < b.value) {
      return 1;
    }
    return 0;
  });
  console.log("sorted!", candidatesList);
  return candidatesList;
}

/**
 * Rimuove dalla lista dei candidati i collegamenti che puntano verso group,
 * poichè non verranno usati per costruire best path (come gestire nesting?)
 * @param {*} candidatesList 
 */
function filterCandidatesList(candidatesList){
  let filtered = candidatesList.filter(function(e){
    return (e.source !== "group" && e.destination !== "group");
  });
  return filtered;
}

export async function generateSuggestionList(startingNodes){
  console.log(startingNodes);

}

/**
 * Unisce i singoli graph delle regole prelevati dal db
 * @param {*} graphsArr 
 */
function createMergedGraph(graphsArr){
  let startArray = [];
  let flattedArray = [];
  for(let i = 0; i< graphsArr.length; i++){
    startArray.push(JSON.parse(graphsArr[i].graph));
  }

  for(let i = 0; i< startArray[0].length; i++){
    flattedArray.push(startArray[0][i]);
  }

  for(let i = 1; i < startArray.length; i++){
    for(let j = 0; j<startArray[i].length; j++){
      let found = false;
      for(let k = 0; k<flattedArray.length; k++){
        if (startArray[i][j].source === flattedArray[k].source &&
          startArray[i][j].dest === flattedArray[k].dest) {
          flattedArray[k].value++;
          found = true;
          break;
      }
    }
    if (!found) {
      flattedArray.push(startArray[i][j]);
    }
  }

}
console.log(flattedArray);
return flattedArray;
}



/**
 * Genera suggerimenti a partire dai vari graphs delle regole che iniziano per
 * il nodo radice: segue i link fino a distanza N da questi trova il path 
 * migliore 
 * @param {*} passedGraphs 
 */
export async function generateSuggestions(passedGraphs, firstTrigger) {
  console.log(passedGraphs);
  if(typeof passedGraphs === "undefined" || passedGraphs.length === 0){
    return;
  }
  
  let objResult = {
    initialPathList: [],
    candidates: new Set(),
    resultPathList: []
  };
  
  let rulesMatrix = createMergedGraph(passedGraphs);
  //let rulesMatrixEntries = rulesMatrix[0].rules_matrix;
  let threshold = 0;
  let max_dist = 4;
  //let rulesMatrixEntriesUnsortedObj = JSON.parse(rulesMatrixEntries);
  let allRulesMatrixEntriesObj = sortCandidatesList(rulesMatrix);
  let rulesMatrixEntriesObj = filterCandidatesList(allRulesMatrixEntriesObj);
  //let rulesMatrixEntriesObj = rulesMatrixEntriesUnsortedObj;
  objResult.initialPathList = rulesMatrixEntriesObj;
  if (rulesMatrixEntriesObj) {
    //let startingNode = rulesMatrixEntriesObj[0].source;
    let startingNode = firstTrigger;
    let startingLinks = [];
    let candidates = [];
    //inizialmente si prendono tutti i link in partenza dal nodo source
    for (let i = 0; i < rulesMatrixEntriesObj.length; i++) {
      if (rulesMatrixEntriesObj[i].source === startingNode) {
        startingLinks.push(rulesMatrixEntriesObj[i]);
      }
    }
    candidates.push(startingLinks);
    //itera finchè non abbiamo raggiunto la massima distanza dal nodo iniziale
    for (let i = 1; i < max_dist; i++) {
      let allNodesAtDistance = [];
      //controlla su tutti i link del grafo
      for (let j = 0; j < rulesMatrixEntriesObj.length; j++) {
        if (rulesMatrixEntriesObj[j].value > threshold) {
          //Si prendono i link a distanza n, in uscita dai nodi puntati dai
          //link a distanza n-1 (l'array di candidates)
          for (let k = 0; k < candidates[i - 1].length; k++) {
            //if (candidates[i-1][k].dest === (rulesMatrixEntriesObj[j].source || rulesMatrixEntriesObj[j].dest)) {
            if (candidates[i - 1][k].dest === rulesMatrixEntriesObj[j].source) {
              let nodeToAdd = rulesMatrixEntriesObj[j];
              allNodesAtDistance.push(nodeToAdd);
            }
            /*
          if (candidates[i-1][k].dest === (rulesMatrixEntriesObj[j].source || rulesMatrixEntriesObj[j].dest)) {
            let nodeToAdd = rulesMatrixEntriesObj[j];
            //nodeToAdd.distance = allNodesAtDistance.length-1;
            allNodesAtDistance.push(nodeToAdd);   
           }
           */
          }
        }

      }
      //Crea un nuovo set con gli elementi a distanza n da startingNode
      let allNodesAtDistanceSet = new Set();
      for (let i = 0; i < allNodesAtDistance.length; i++) {
        allNodesAtDistanceSet.add(allNodesAtDistance[i]);
      }
      let allNodesAtDistanceValues = Array.from(allNodesAtDistanceSet);
      let allPreviousNodes = candidates.flat();
      //Elimina dagli elementi a distanza n quelli già presenti a distanze minori
      let filtered = allNodesAtDistanceValues.filter(function (e) {
        let check = allPreviousNodes.includes(e);
        return !check;
      });
      candidates.push(filtered);
    }
    console.log("candidates:", candidates);

    //Metodo vecchio che si basava sui tutti i pezzi nel workspace per generare i suggerimenti.
    //funziona , ma non è ottimale
    /*
    for (let i = 0; i < actualTriggers.length; i++) {
     for (let j = 0; j < rulesMatrixEntriesObj.length; j++) {
       if(rulesMatrixEntriesObj[j].value > threshold){

       }
       if (actualTriggers[i].source === (rulesMatrixEntriesObj[j].source || rulesMatrixEntriesObj[j].dest) && rulesMatrixEntriesObj[j].value > threshold) {
         objResult.candidates.add(rulesMatrixEntriesObj[j]);
         }
        if (actualTriggers[i].dest === (rulesMatrixEntriesObj[j].source || rulesMatrixEntriesObj[j].dest) && rulesMatrixEntriesObj[j].value > threshold) {
        objResult.candidates.add(rulesMatrixEntriesObj[j]);
       }
     }
   }
   */
   // let flattenCandidates = candidates.flat();
    objResult.candidates = candidates;
    if (objResult.candidates.length > 0) {
      let result = pathCreatorNested(objResult.candidates, startingNode);
      let flattenResult = result.flat();
      objResult.resultPathList = flattenResult;
    }
  }
  console.log("OBJ RESULT!!", objResult);
  return objResult;
}

/** 
 * Estrae il miglior path dagli array di candidati.
 * Se incontra un collegamento è terminale (verso event o condition) lo 
 * aggiunge al path a meno che non ne sia già stato aggiunto uno di quel 
 * tipo. Se incontra un link non terminale (and, or, altro trigger, group) lo aggiunge se nel 
 * livello precedente è presente un link a questo nodo, e esso non è già stato 
 * usato precedentemente (evita loops).Se incontra un link in entrata verso 
 * "hour_min" o verso "day" la aggiunge direttamente al path senza aumentare i
 * conteggi.
 * @param {*} candidates 
 */
function pathCreatorNested(candidates, startingNode) {
  let bestPath = [];
  for (let i = 0; i < candidates.length; i++) {
    let actualDist = [];
    let terminalFound = false;
    let terminal;
    let nonTerminalFound = false;
    let nonTerminal;
    for (let j = 0; j < candidates[i].length; j++) {
      if (isEventCondition(candidates[i][j])) {
        if (!terminalFound) {
          terminalFound = true;
          terminal = candidates[i][j];
        }
      }
      else {
        // se è negazione o date, aggiungi senza segnalare notTerminalFound
        //if (candidates[i][j].source === "not_dynamic") {
        if (candidates[i][j].dest === "hour_min" ||
            candidates[i][j].dest === "day"      ||
            candidates[i][j].source === "not_dynamic") {
          if (atPreviousDistance(candidates[i][j], bestPath[i - 1])) {
          actualDist.push(candidates[i][j]);
          }
        }
        else if (!nonTerminalFound) {
          if (atPreviousDistance(candidates[i][j], bestPath[i - 1])) {
            if (!foundSelfLoop(candidates[i][j], bestPath[i - 1])) {
              nonTerminalFound = true;
              nonTerminal = candidates[i][j];
            }
          }
        }
      }
    }
    if (nonTerminalFound) {
      actualDist.push(nonTerminal);
    }
    if (terminalFound) {
      actualDist.push(terminal);
    }
    if (actualDist.length > 0) {
      let ordered = swapTerminalNonTerminal(actualDist);
      bestPath.push(ordered);
    }
    if (!nonTerminalFound) {
      return bestPath;
    }
  }
  return bestPath;
}

/**
 * Scambia di posto gli elementi, in modo che venga prima il collegamento 
 * con "event/condition", e dopo quello al blocco successivo.
 * @param {*} candidatesArr 
 */

function swapTerminalNonTerminal(candidatesArr) {
  if (candidatesArr.length == 2) {
    if (isEventCondition(candidatesArr[1])) {
      let swap = [...candidatesArr];
      candidatesArr[0] = swap[1];
      candidatesArr[1] = swap[0];
    }
  } else if(candidatesArr.length > 2){
    for(let i = 0; i < candidatesArr.length; i++){
      if (isEventCondition(candidatesArr[i])) {
        let swap = [...candidatesArr];
        candidatesArr[0] = swap[i];
        candidatesArr[i] = swap[0];
      }
    }
    for(let i = 0; i < candidatesArr.length; i++){
       if(candidatesArr[i].dest==="or" || candidatesArr[i].dest==="and"){
        let swap = [...candidatesArr];
        candidatesArr[candidatesArr.length-1] = swap[i];
        candidatesArr[i] = swap[swap.length-1];
      }
    }
  }
  return candidatesArr;
}


/**
 * Metodo per controllare che il collegamento trovato esista: guarda se tra gli
 * elementi a a distanza i-1 esiste come destinazione il candidato attuale 
 * @param {*} candidate 
 * @param {*} candidatesArr 
 */
function atPreviousDistance(candidate, candidatesArr) {
  //alla prima iterazione di pathCreatorNested non abbiamo gli elementi 
  //inseriti prima
  if (!candidatesArr) {
    return true;
  }
  else {
    for (let i = 0; i < candidatesArr.length; i++) {
      if (candidate.source === candidatesArr[i].dest) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Metodo per evitare loopback: controlla l'elemento che vogliamo inserire 
 * nel path non punti ad un elemento presente nell'array dei paths a distanza
 * i-1
 * @param {*} candidate 
 * @param {*} candidateArr 
 */
function foundSelfLoop(candidate, candidatesArr) {
  if (!candidatesArr) {
    return false;
  }
  else {
    for (let i = 0; i < candidatesArr.length; i++) {
      if (candidate.dest === candidatesArr[i].source) {
        return true;
      }
    }
    return false;
  }
}


/**
 * Non più usato
 * @param {*} candidates 
 * @param {*} element 
 */
function pathCreator(candidates, element, paths, path) {
  if (!element) {
    element = candidates[0];
  }
  if (!paths) {
    paths = [];
  }
  if (!path) {
    path = [];
  }
  let onlyEventCond = checkOnlyTerminalLeafs(candidates);
  // condizione di terminazione
  if (onlyEventCond) {
    //chiude l'eventuale path in corso
    if (path.length > 0) {
      //path.push(candidates[candidates.length-1]);
      paths.push(path);
    }
    return paths;
  }
  else {
    //ottieni l'elemento puntato da "dest" di element e aggiugi element al path
    let pointAt = getDest(element, candidates);
    path.push(element);
    //Se l'elemento puntato non appare nei source ma non si tratta di un nodo
    //terminale siamo alla fine di un path: rimuovi element dai candidates e 
    //riparti dal primo nodo non terminale
    if (!pointAt && !isEventCondition(element)) {
      let position = candidates.indexOf(element);
      candidates.splice(position, 1);
      paths.push(path);
      path = [];
      let newElement = getNoLeaf(candidates);
      pathCreator(candidates, newElement, paths, path);
    }
    //Se l'elemento puntato non appare nei source ed è un nodo terminale, 
    //vai avanti con il prossimo nodo non terminale senza rimuoverlo dai 
    // candidates
    else if (!pointAt && isEventCondition(element)) {
      let newElement = getNextNoLeaf(candidates, path);
      let position = candidates.indexOf(element);
      candidates.splice(position, 1);
      pathCreator(candidates, newElement, paths, path);
    }
    // Se esiste pointAt significa che siamo all'interno di un path: aggiungi
    // l'elemento al path e rimuovilo dai candidates
    else {
      let position = candidates.indexOf(element);
      candidates.splice(position, 1);
      pathCreator(candidates, pointAt, paths, path);
      //richiama ricorsivo con pointAt
    }
  }
  return paths;
}

/**
 * Restituisce il prossimo elemento del path, cioè il prossimo nodo non
 * terminale che non è già presente tra le sources del path
 * @param {*} element 
 * @param {*} candidates 
 */
function getNextNoLeaf(candidates, path) {
  for (let i = 0; i < candidates.length; i++) {
    if (!isEventCondition(candidates[i]) && absentNonTerminalNode(candidates[i], path)) {
      return candidates[i];
    }
  }
}

/**
 * controlla se non ci sia già nel path un nodo non terminale con la stessa 
 * source
 * @param {*} element 
 * @param {*} path 
 */
function absentNonTerminalNode(element, path) {
  let absent = true;
  for (let i = 0; i < path.length; i++) {
    if (path[i].source === element.source) {
      if (!isEventCondition(path[i])) {
        return false;
      }
    }
  }
  return absent;
}

/**
 * 
 * @param {*} element 
 * @param {*} candidates 
 */
function getDest(element, candidates) {
  let results = [];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].source === element.dest) {
      results.push(candidates[i]);
    }
  }
  if (results) {
    return results[0];
  }
}

/**
 * 
 * @param {*} candidates 
 */
function getNoLeaf(candidates) {
  let results = [];
  for (let i = 0; i < candidates.length; i++) {
    if (!isEventCondition(candidates[i])) {
      results.push(candidates[i]);
    }
  }
  if (results) {
    return results[0];
  }
}

/**
 * TODO prima si chiamava isTerminalLeaf, guarda se ci sono altre istanze
 * @param {*} element 
 */
export function isEventCondition(element) {
  if (element.dest === "event" || element.dest === "condition") {
    return true;
  }
  return false;
}

/**
 * Costruisce e restituisce la matrice di pesi per la singola regola
 * @param {*} workspace 
 */
export function generateMatrixFromRule(workspace) {
  let rule_xml = Blockly.Xml.workspaceToDom(workspace, false);
  let triggersContainer = rule_xml.getAttribute("TRIGGERS");
  var test = rule_xml.querySelector('statement');
  let allStatements = rule_xml.querySelectorAll('statement');
  let triggerMatrix;
  for (let statement in allStatements) {
    if (typeof allStatements[statement] === 'object') {
      let statementType = allStatements[statement].getAttribute('name');
      if (statementType === "TRIGGERS") {
        triggerMatrix = createTriggerMatrix(allStatements[statement], workspace);
      }
      else if (statementType === "ACTIONS") {
        // TcreateActionMatrix(allStatements[statement], workspace); //TODO
      }
    }
  }
  return triggerMatrix;
}

