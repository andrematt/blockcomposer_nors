import * as Main from "./main.js";
import {
  getUserGraphs, retreiveMatrixDB, saveMatrixDB,
  updateMatrixDB
} from "./database_functs.js";


//TODO: nel check di popularity tieni presente che le aizoni che recuperi dal DB
// sono in formato stringa e possono includere più azioni! trasforma in OBJ

/**
 * salva l'edge tra source e dest incrementando l'indice in posizione [s][d] 
 * nella matrice passata come arg
 * @param {*} origin 
 * @param {*} source 
 * @param {*} matrix 
 */
function increaseLinkCount(source, dest, linkArr) {
  "use strict";
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
  "use strict";
  console.log("increasing matrix from", source, "to ", dest);
  let firstRow = matrix[0];
  let sourceIndex = firstRow.indexOf(source);
  let destIndex = firstRow.indexOf(dest);
  matrix[sourceIndex][destIndex]++;
  console.log("resulting matrix: ", matrix);
  return matrix;
}

/**
 * Unisce la vecchia matrice con quella corrente, invia al db 
 * @param {*} oldMatrix 
 * @param {*} currentMatrix 
 */
function mergeMatrixes(oldMatrix, currentMatrix) {
  "use strict";
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
  "use strict";
  let result = await retreiveMatrixDB().then();
  // non è presente nel database: invio la matrix corrente
  if (!result || result.length === 0) {
    console.log("non presente in db");
    saveMatrixDB(matrix);
  }
  // se è presente aggiungo la matrix corrente a quella già nel db
  else {
    console.log("presente in db!");
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
function filterCandidatesList(candidatesList) {
  "use strict";
  let filtered = candidatesList.filter(function (e) {
    return (e.source !== "group" && e.destination !== "group");
  });
  return filtered;
}


/**
 * Unisce i singoli graph delle regole prelevati dal db
 * @param {*} graphsArr 
 */
function createMergedGraph(graphsArr) {
  "use strict";
  let startArray = [];
  let flattedArray = [];
  for (let i = 0; i < graphsArr.length; i++) {
    startArray.push(JSON.parse(graphsArr[i].graph));
  }

  for (let i = 0; i < startArray[0].length; i++) {
    flattedArray.push(startArray[0][i]);
  }

  for (let i = 1; i < startArray.length; i++) {
    for (let j = 0; j < startArray[i].length; j++) {
      let found = false;
      for (let k = 0; k < flattedArray.length; k++) {
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
 * non usata
 * @param {*} passedGraphs 
 * @param {*} firstTrigger 
 */
export function generateSuggestionsCategory(passedGraphs, firstTrigger) {
  "use strict";
  const triggerInfo = Main.getTriggerInfo();
  const myCategory = Main.getTriggerCategory(firstTrigger, triggerInfo);
  console.log(myCategory);
  if (typeof passedGraphs === "undefined" || passedGraphs.length === 0) {
    return;
  }

  let objResult = {
    initialPathList: [],
    candidates: new Set(),
    resultPathList: []
  };

  let rulesMatrix = createMergedGraph(passedGraphs);
  rulesMatrix = checkNames(rulesMatrix);
  let threshold = 0;
  let max_dist = 4;
  let allRulesMatrixEntriesObj = sortCandidatesList(rulesMatrix);
  let rulesMatrixEntriesObj = filterCandidatesList(allRulesMatrixEntriesObj);
  objResult.initialPathList = rulesMatrixEntriesObj;

}

/**
 * controllo per rendere compatibile il formato dei nomi dei trigger con quello
 * dei blocchi
 * @param {*} rulesMatrix 
 */
function checkNames(rulesMatrix) {
  "use strict";
  let newRulesMatrix = [];
  for (let i = 0; i < rulesMatrix.length; i++) {
    if (rulesMatrix[i].source === null || rulesMatrix[i].dest === null) {
      console.log("find a null in", rulesMatrix[i]);
    }
    else {

      if (rulesMatrix[i].source === "AND") {
        rulesMatrix[i].source = "and";
      }
      else if (rulesMatrix[i].source === "OR") {
        rulesMatrix[i].source = "or";
      }
      else if (rulesMatrix[i].source === "not") {
        rulesMatrix[i].source = "not_dynamic";
      }
      else if (rulesMatrix[i].source === "time") {
        rulesMatrix[i].source = "hour_min";
      }
      else if (rulesMatrix[i].source === "date") {
        rulesMatrix[i].source = "day";
      }


      if (rulesMatrix[i].dest === null) {
        rulesMatrix.splice(i, 1);
      }
      else if (rulesMatrix[i].dest === "AND") {
        rulesMatrix[i].dest = "and";
      }
      else if (rulesMatrix[i].dest === "OR") {
        rulesMatrix[i].dest = "or";
      }
      else if (rulesMatrix[i].dest === "not") {
        rulesMatrix[i].dest = "not_dynamic";
      }
      else if (rulesMatrix[i].dest === "time") {
        rulesMatrix[i].dest = "hour_min";
      }
      else if (rulesMatrix[i].dest === "date") {
        rulesMatrix[i].dest = "day";
      }
      newRulesMatrix.push(rulesMatrix[i]);
    }
  }
  return newRulesMatrix;
}



/**
 * Cerca qual'è il punto di partenza più indicato, guardando al nodo con più
 * collegamenti tra quelli passati come possibili punti iniziali
 * @param {*} startingNodes 
 */
function getBestStartingPoint(candidates, startingNodes) {
  "use strict";
  if (startingNodes.length === 1) {
    return startingNodes[0];
  }
  let max;
  let maxValue = -1;
  for (let i = 0; i < startingNodes.length; i++) {
    for (let j = 0; j < candidates.length; j++) {
      if (startingNodes.includes(candidates[j].source) &&
        candidates[j].value > maxValue &&
        (candidates[j].dest === "event" || candidates[j].dest === "condition")) {
        max = candidates[j].source;
        maxValue = candidates[j].value;
      }
    }
  }
  return max;
}

/**
 * Cerca qual'è il punto di partenza più indicato, guardando al nodo con più
 * collegamenti tra quelli passati come possibili punti iniziali
 * @param {*} startingNodes 
 */
function getBestStartingPointOld(candidates, startingNodes) {
  "use strict";
  if (startingNodes.length === 1) {
    return startingNodes[0];
  }
  let max;
  let maxValue = -1;
  for (let i = 0; i < startingNodes.length; i++) {
    for (let j = 0; j < candidates[0].length; j++) {
      if (startingNodes.includes(candidates[0][j].source) &&
        candidates[0][j].value > maxValue &&
        (candidates[0][j].dest === "event" || candidates[0][j].dest === "condition")) {
        max = candidates[0][j].source;
        maxValue = candidates[0][j].value;
      }
    }
  }
  return max;
}


/**
 * Genera suggerimenti a partire dai vari graphs delle regole che iniziano per
 * il nodo radice: segue i link fino a distanza N da questi trova il path 
 * migliore 
 * @param {*} passedGraphs 
 */
export async function generateSuggestions(passedGraphs, firstTrigger) {
  "use strict";
  console.log(passedGraphs);
  if (typeof passedGraphs === "undefined" || passedGraphs.length === 0) {
    return;
  }

  let objResult = {
    initialPathList: [],
    candidates: new Set(),
    resultPathList: []
  };

  let rulesMatrix = createMergedGraph(passedGraphs);
  rulesMatrix = checkNames(rulesMatrix);
  //let rulesMatrixEntries = rulesMatrix[0].rules_matrix;
  const threshold = 0;
  const max_dist = 4;
  //let rulesMatrixEntriesUnsortedObj = JSON.parse(rulesMatrixEntries);
  let allRulesMatrixEntriesObj = sortCandidatesList(rulesMatrix);
  let rulesMatrixEntriesObj = filterCandidatesList(allRulesMatrixEntriesObj);
  //let rulesMatrixEntriesObj = rulesMatrixEntriesUnsortedObj;
  objResult.initialPathList = rulesMatrixEntriesObj;
  if (rulesMatrixEntriesObj) {
    //let startingNode = rulesMatrixEntriesObj[0].source;
    let startingNodes = [];

    const bestStartingPoint = getBestStartingPoint(objResult.initialPathList, firstTrigger);
    //typeof firstTrigger === "object" ? startingNodes = firstTrigger : startingNodes.push(firstTrigger);
    startingNodes.push(bestStartingPoint);
    console.log(startingNodes);
    let startingLinks = [];
    let candidates = [];
    //inizialmente si prendono tutti i link in partenza dal nodo source
    for (let i = 0; i < rulesMatrixEntriesObj.length; i++) {
      if (startingNodes.includes(rulesMatrixEntriesObj[i].source)) {
        //if (rulesMatrixEntriesObj[i].source === startingNode) {
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
          //link a distanza n-1 (l'array di candidates). Eccezione: Le regole 
          //di tipo relative position contengono nello stesso blocco 2 trigger:
          //typeOfProximity e pointOfinterest. Se il trigger è pointOfInterest
          //collegato a and o or, prendo il prossimo nodo, anche se esso
          //non rientrerebbe nella logica di selezionare i nodi seguendo source - dest
          for (let k = 0; k < candidates[i - 1].length; k++) {
            //if (candidates[i-1][k].dest === (rulesMatrixEntriesObj[j].source || rulesMatrixEntriesObj[j].dest)) {
            const nodeToCheck = rulesMatrixEntriesObj[j];
            if (candidates[i - 1][k].dest === nodeToCheck.source) {
              let found = false;
              candidates[i - 1].forEach(function (e) {
                if (e.source === nodeToCheck.source) {
                  found = false;
                }
              })
              if (!found) {
                allNodesAtDistance.push(nodeToCheck);
              }
            }
            /* non so se sia questo il problema
            else if(rulesMatrixEntriesObj[j-1] && 
                      rulesMatrixEntriesObj[j-1].source==='relativePosition-pointOfInterest' &&
                      (rulesMatrixEntriesObj[j-1].dest === "and" || rulesMatrixEntriesObj[j-1].dest ==="or")){
              allNodesAtDistance.push(rulesMatrixEntriesObj[j-1]);                           
            }
            */
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
      //Crea un nuovo set con gli elementi a distanza n da startingNode. Non conto
      // se in una regola quel trigger è ripetuto più volte perchè mi interessa
      // quante volte quel trigger è presente sul totale delle regole, non 
      // il conteggio effettivo delle presenze 
      let allNodesAtDistanceValues = [];
      for (let i = 0; i < allNodesAtDistance.length; i++) {
        let me = allNodesAtDistance[i];
        let found = false;
        allNodesAtDistanceValues.forEach(function (e) {
          if (e.source === me.source && e.dest === me.dest) {
            found = true;
          }
        });
        if (!found) {
          allNodesAtDistanceValues.push(me);
        }
      }

      //let allNodesAtDistanceSet = new Set();
      //for (let i = 0; i < allNodesAtDistance.length; i++) {
      //allNodesAtDistanceSet.add(allNodesAtDistance[i]);
      //}
      //let allNodesAtDistanceValues = Array.from(allNodesAtDistanceSet);
      //let allPreviousNodes = candidates.flat();
      //Elimina dagli elementi a distanza n quelli già presenti a distanze minori
      //let filtered = allNodesAtDistanceValues.filter(function (e) {
      //let check = allPreviousNodes.includes(e);
      //return !check;
      //});
      // candidates.push(filtered);
      candidates.push(allNodesAtDistanceValues);
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
    //const bestStartingPoint = getBestStartingPoint(objResult.candidates, startingNodes);
    if (objResult.candidates.length > 0) {
      let result = pathCreatorNested(objResult.candidates, bestStartingPoint); //TODO modificare pathcreatornested per pointOfinterest
      let flattenResult = result.flat();
      let concluded =   concludePath(flattenResult, objResult.initialPathList);
      console.log("CONCLUDED!!");
      console.log(concluded);
      objResult.resultPathList = concluded;
    }
  }
  console.log("OBJ RESULT!!", objResult);
  return objResult;
}

/**
 * 
 * @param {*} nonTerminal 
 * @param {*} terminal 
 */
function checkConflictBetweenTerms(nonTerminal, terminal) {
  "use strict";
  if (nonTerminal.source !== terminal.source) {
    return true;
  }
  return false;
}

/** 
 * Estrae il miglior path dagli array di candidati.
 * Se incontra un collegamento terminale (verso event o condition) lo 
 * aggiunge al path a meno che non ne sia già stato aggiunto uno di quel 
 * tipo. Se incontra un link non terminale (and, or, altro trigger, group) lo aggiunge se nel 
 * livello precedente è presente un link a questo nodo, e esso non è già stato 
 * usato precedentemente (evita loops).Se incontra un link in entrata verso 
 * "hour_min" o verso "day" la aggiunge direttamente al path senza aumentare i
 * conteggi. 
 * @param {*} candidates 
 */
function pathCreatorNested(candidates, startingNode) {
  //Adesso startingNode è un array
  "use strict";
  let bestPath = [];
  for (let i = 0; i < candidates.length; i++) {
    let actualDist = [];
    let terminalFound = false;
    let terminal;
    let nonTerminalFound = false;
    let nonTerminal;
    let negationDayOrDate = false;
    for (let j = 0; j < candidates[i].length; j++) {
      if (isEventCondition(candidates[i][j])) {
        if (!terminalFound) {
          if (atPreviousDistance(candidates[i][j], bestPath[i - 1]) && !negationDayOrDate) {
          // bisogna controllare che il trigger trovato combaci con il tipo di
          // trigger
          let conflictWithTerminal = false;
          if (nonTerminalFound) {
            conflictWithTerminal = checkConflictBetweenTerms(nonTerminal, candidates[i][j]);
          }
          if (!conflictWithTerminal) {
            terminalFound = true;
            terminal = candidates[i][j];
          }
        }
      }
      }
      else {
        // se è negazione o date, aggiungi senza segnalare notTerminalFound
        //if (candidates[i][j].source === "not_dynamic") {
        if (candidates[i][j].dest === "hour_min" ||
          candidates[i][j].dest === "day" ||
          candidates[i][j].source === "not_dynamic") {
          if (atPreviousDistance(candidates[i][j], bestPath[i - 1]) && !negationDayOrDate) {
            actualDist.push(candidates[i][j]);
            negationDayOrDate = true;
          }
        }
        else if (!nonTerminalFound) {
          if (atPreviousDistance(candidates[i][j], bestPath[i - 1])) {
            if (!foundSelfLoop(candidates[i][j], bestPath[i - 1]) && candidates[i][j].dest !== "relativePosition-pointOfInterest") {
              let conflictWithTerminal = false;
              // bisogna controllare che il trigger trovato combaci con il tipo di
              // trigger
              if (terminalFound) {
                conflictWithTerminal = checkConflictBetweenTerms(candidates[i][j], terminal);
              }
              if (!conflictWithTerminal) {
                nonTerminalFound = true;
                nonTerminal = candidates[i][j];
              }
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
  "use strict";
  if (candidatesArr.length == 2) {
    if (isEventCondition(candidatesArr[1])) {
      let swap = [...candidatesArr];
      candidatesArr[0] = swap[1];
      candidatesArr[1] = swap[0];
    }
  } else if (candidatesArr.length > 2) {
    for (let i = 0; i < candidatesArr.length; i++) {
      if (isEventCondition(candidatesArr[i])) {
        let swap = [...candidatesArr];
        candidatesArr[0] = swap[i];
        candidatesArr[i] = swap[0];
      }
    }
    for (let i = 0; i < candidatesArr.length; i++) {
      if (candidatesArr[i].dest === "or" || candidatesArr[i].dest === "and") {
        let swap = [...candidatesArr];
        candidatesArr[candidatesArr.length - 1] = swap[i];
        candidatesArr[i] = swap[swap.length - 1];
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
  "use strict";
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
 * TODO: rinomina in pointToEventCondition
 * @param {*} element 
 */
export function isEventCondition(element) {
  "use strict";
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
  "use strict";
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


/**
 * 
 * @param {*} myTriggers 
 * @param {*} allRules 
 */
export async function findActionSuggestion(myTriggers, allRules) {
  "use strict";
  const rulesWithMyTrigger = extractFromAllRules(myTriggers, allRules);
  // rimuovere quelle con solito user name?
  let rulesWithSimilarity = addTriggerSimilarity(myTriggers, rulesWithMyTrigger);
  /*
  console.log(rulesWithSimilarity);
  let sortedRules = rulesWithSimilarity.sort(function (a, b) {
    if (a.score > b.score) {
      return -1;
    }
    if (a.score < b.score) {
      return 1;
    }
    // a.score === b.score
    return 0;
  });
  const top10 = sortedRules.slice(0, 10);
  */
  const rulesWithPopularity = addActionsPopularity(rulesWithSimilarity);
  let userTable = await createUserTable(allRules).then();
  let userName = Main.getUserName();
  let ruleWithSimilarity = addActionsSimilarity(userTable, userName, rulesWithPopularity);
  let topSuggestion = getTop(ruleWithSimilarity);
  return topSuggestion;
  //return shuffleBestResults(topSuggestion);
  /*
  let topByCollaborative = filterByCollaborative(top10withPopularity, topSimilar);
  //let topByCollaborative = top10withPopularity;
  let top10byPopularity = topByCollaborative.sort(function (a, b) {
    if (a.actions_pop > b.actions_pop) {
      return -1;
    }
    if (a.actions_pop < b.actions_pop) {
      return 1;
    }
    // a.score === b.score
    return 0;
  });
  console.log("TOP 10 SORTED BY POP:");
  console.log(top10byPopularity);
  return shuffleBestResults(top10byPopularity);
  */
}

/**
 * 
 * @param {*} rules
 */
function getTop(rules) {
  "use strict";
  console.log(rules);
  let minPop;
  let minUserSim;
  let minTriggerSim;
  let maxPop;
  let maxUserSim;
  let maxTriggerSim;
  rules.forEach(function (e) {
    if (!minPop || e.actions_pop < minPop) {
      minPop = e.actions_pop;
    }
    if (!maxPop || e.actions_pop > maxPop) {
      maxPop = e.actions_pop;
    }
    if (!minUserSim || e.userSim < minUserSim) {
      minUserSim = e.userSim;
    }
    if (!maxUserSim || e.userSim > maxUserSim) {
      maxUserSim = e.userSim;
    }
    if (!minTriggerSim || e.score < minTriggerSim) {
      minTriggerSim = e.score;
    }
    if (!maxTriggerSim || e.score > maxTriggerSim) {
      maxTriggerSim = e.score;
    }
  });
  rules.forEach(function (e) {
    e.normalizedPop = ((e.actions_pop - minPop) / (maxPop - minPop));
    e.normalizedUserSim = ((e.userSim - minUserSim) / (maxUserSim - minUserSim));
    e.normalizedTriggerSim = ((e.score - minTriggerSim) / (maxTriggerSim - minTriggerSim));
    if (isNaN(e.normalizedPop)) {
      e.normalizedPop = 0.1;
    }
    if (isNaN(e.normalizedUserSim)) {
      e.normalizedUserSim = 0.1;
    }
    if (isNaN(e.normalizedTriggerSim)) {
      e.normalizedTriggerSim = 0.1;
    }
    if (e.normalizedPop === 0) {
      e.normalizedPop = 0.1;
    }
    if (e.normalizedUserSim === 0) {
      e.normalizedUserSim = 0.1;
    }
    if (e.normalizedTriggerSim === 0) {
      e.normalizedTriggerSim = 0.1;
    }

  });
  let maxScore;
  let maxIndex;
  rules.forEach(function (e, i) {
    let myScore = e.normalizedPop * e.normalizedUserSim * e.normalizedTriggerSim;
    if (!maxScore || myScore > maxScore) {
      maxScore = myScore;
      maxIndex = i;
    }
    console.log("MY SCORE:", myScore);
  });
  console.log("NORMALIZED SCORES");
  console.log(rules);
  console.log("MAXSCORE");
  console.log(rules[maxIndex]);
  return rules[maxIndex];
}

/**
 * 
 * @param {*} userTable 
 * @param {*} userName 
 * @param {*} rules
 */
function addActionsSimilarity(userTable, userName, rules) {
  "use strict";
  let rulesWithUserSim = [];
  //let similarities = pearsonSimChecker(userTable, userName);

  rules.forEach(function (rule) {
    for (let item in userTable) {
      if (userTable[item].userName === rule.user_name) {
        rule.userSim = userTable[item].r;
      }
    }
    rulesWithUserSim.push(rule);
  });
  //console.log("RULE USER SIM");
  //console.log(rulesWithUserSim);
  return rulesWithUserSim;
}


/**
 * Restituisce un risultato casuale tra quelli di popolarità massima
 * @param {*} top 
 */
function shuffleBestResults(top) {
  "use strict";
  let bests = [];
  bests.push(top[0]);
  for (let i = 1; i < top.length; i++) {
    if (top[i].actions_pop === bests[0].actions_pop) {
      bests.push(top[i]);
    }
  }
  return bests[getRandomInt(bests.length)];
}

/**
 * Ottiene un intero compreso tra 0 e il valore passato: eg max = 3, 
 * expected = 0, 1, 2
 * @param {*} max 
 */
function getRandomInt(max) {
  "use strict";
  return Math.floor(Math.random() * Math.floor(max));
}


/**
 * Crea una matrice di occorrenza tra utenti e azioni. Dare come minima occorrenza
 * 1? in questo modo non c'è bisogno in pearsonCorrelation di restituire 0 
 * se c'è NaN
 * @param {*} rules 
 */
async function createUserTable(rules) {
  "use strict";
  let userTable = [];
  let actionInfo = Main.getActionInfo();
  let usersInRule = [];
  rules.forEach(function (e) {
    if (!usersInRule.includes(e.user_name)) {
      usersInRule.push(e.user_name);
    }
  });
  //testing
  //usersInRule = ["trialpetal01@kwido.com", "trialpetal02@kwido.com", "trialpetal03@kwido.com","trialpetal04@kwido.com", "trialpetal05@kwido.com","trialpetal06@kwido.com","trialpetal07@kwido.com","trialpetal08@kwido.com"];
  for (let i = 0; i < usersInRule.length; i++) {
    let userObj = {
      userName: usersInRule[i],
      actions: {}
    }
    //let allMyRules = prendi tutte le regole dal db con questo user
    actionInfo.forEach(function (e) {
      userObj.actions[e.fullName] = 0;
    });
    //console.log(userObj);
    let myActions = await getUserGraphs(usersInRule[i]).then();
    //console.log(myActions);
    // Possono esserci più azioni per ogni elemento dell'array
    myActions.forEach(function (e) {
      let actionArr = e[0].split(",");
      actionArr.forEach(function (singleAction) {
        userObj.actions[singleAction]++;
      });

    });
    userTable.push(userObj);
  }
  console.log("USER TABLE");
  console.log(userTable);
  return userTable;
}

/**
 * calcola la similarità dell'utente passato come arg con gli altri utenti. 
 * @param {*} userTable
 */
async function pearsonSimChecker(userTable, user = "trialpetal01@kwido.com") {
  console.log(userTable);
  let bestCorrelation = -1;
  let bestUser = "";
  let me = "";
  let similarities = [];
  let arrX = [];
  let arrY = [];
  for (let i = 0; i < userTable.length; i++) {
    if (userTable[i].userName === user) {
      me = userTable[i];
    }
  }
  for (let key in me.actions) {
    arrX.push(me.actions[key]);
  }
  console.log("myValues", arrX);

  for (let i = 0; i < userTable.length; i++) {
    arrY = [];
    console.log(userTable[i]);
    if (userTable[i].userName !== user) {
      console.log("username not equal user");
      let otherUser = userTable[i];
      for (let key in otherUser.actions) {
        arrY.push(otherUser.actions[key]);
      }
      let R = pearsonCorrelation(arrX, arrY);
      userTable[i].r = R;
      console.log('arrX', arrX, 'arrY', arrY, 'R', R);
      if (R > bestCorrelation) {
        bestCorrelation = R;
        bestUser = userTable[i].userName;
      }
    }
    // se sono io, do peso 0
    else {
      userTable[i].r = 0;
    }

  }
  return userTable;
  //console.log("bestCorrelation is: ", bestCorrelation)
  //console.log("with: ", bestUser);
}

function pearsonCorrelation(x, y) {
  "use strict";
  let shortestArrayLength = 0;
  if (x.length == y.length) {
    shortestArrayLength = x.length;
  }
  else if (x.length > y.length) {
    shortestArrayLength = y.length;
    console.error('x has more items in it, the last ' + (x.length - shortestArrayLength) + ' item(s) will be ignored');
  }
  else {
    shortestArrayLength = x.length;
    console.error('y has more items in it, the last ' + (y.length - shortestArrayLength) + ' item(s) will be ignored');
  }


  let xy = [];
  let x2 = [];
  let y2 = [];

  for (let i = 0; i < shortestArrayLength; i++) {
    xy.push(x[i] * y[i]);
    x2.push(x[i] * x[i]);
    y2.push(y[i] * y[i]);
  }

  var sum_x = 0;
  var sum_y = 0;
  var sum_xy = 0;
  var sum_x2 = 0;
  var sum_y2 = 0;

  for (let i = 0; i < shortestArrayLength; i++) {
    sum_x += x[i];
    sum_y += y[i];
    sum_xy += xy[i];
    sum_x2 += x2[i];
    sum_y2 += y2[i];
  }

  var step1 = (shortestArrayLength * sum_xy) - (sum_x * sum_y);
  var step2 = (shortestArrayLength * sum_x2) - (sum_x * sum_x);
  var step3 = (shortestArrayLength * sum_y2) - (sum_y * sum_y);
  var step4 = Math.sqrt(step2 * step3);
  var answer = step1 / step4;

  if (isNaN(answer)) return 0;
  return answer;


  //alternativa.. funzionano uguale, ma questa è più criptica
  /*
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  const minLength = x.length = y.length = Math.min(x.length, y.length),
    reduce = (xi, idx) => {
      const yi = y[idx];
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
      sumY2 += yi * yi;
    }
  x.forEach(reduce);
  return (minLength * sumXY - sumX * sumY) / Math.sqrt((minLength * sumX2 - sumX * sumX) * (minLength * sumY2 - sumY * sumY));
    */
}

/**
 * Stabilisce la popolarità della parte "actions" di una regola guardando a 
 * quanto oguna di quelle azioni è usata nelle regole (solo tra le più simili
 * o tra tutte?)
 * @param {*} top10 
 */
function addActionsPopularity(top10) {
  "use strict";
  let rulesWithActionPop = [];
  console.log("sorting top actions");
  // per ogni regola
  top10.forEach(function (rule) {
    //conteggio di popolarità comune a tutte le azioni di una regola
    let actionsPop = 0;
    //per ogni azione
    console.log(rule);
    rule['actions_obj'].forEach(function (action) {
      top10.forEach(function (e) {
        if (e.actions_obj.includes(action)) {
          actionsPop++;
        }
      });
    });
    rule.actions_pop = actionsPop;
    rulesWithActionPop.push(rule);
    actionsPop = 0;
  });
  console.log("RULE ACTION POP");
  console.log(rulesWithActionPop);
  return rulesWithActionPop;
}

/**
 * Aggiunge ad ogni oggetto regola un campo similarty, calcolata tramite 
 * indice di jaccard
 * @param {*} myTriggers 
 * @param {*} allRules 
 */
function addTriggerSimilarity(myTriggers, rules) {
  "use strict";
  let rulesCopy = rules;
  const setA = new Set(myTriggers);
  for (let i = 0; i < rulesCopy.length; i++) {
    const setB = new Set(rulesCopy[i].triggers_obj);
    rulesCopy[i].score = weightedJaccard(setA, setB);
  }
  return rulesCopy;
}


/**
 * Jaccard con peso. Funziona come l'indice di jaccard standard (intersezione
 * su unione), ma da un peso di 0.25 (invece che 0) agli elementi che 
 * condividono la categoria di appartenenza, per non fare andare perduta 
 * questa informazione. 
 * @param {*} setA 
 * @param {*} setB 
 */
function weightedJaccard(setA, setB) {
  "use strict";
  let numerator = 0;
  let denominator = 0;
  const weight = 0.33;
  // intersezione
  for (let itemA of setA) {
    if (setB.has(itemA)) {
      numerator ++;
    }
    else {
      for (let itemB of setB) {
        const categoryA = Main.getTriggerCategory(itemA);
        const categoryB = Main.getTriggerCategory(itemB);
        if (categoryA && categoryB && categoryA === categoryB) {
          numerator += weight;
        }
      }
    }
  }
  // unione  
  const union = new Set();
  setA.forEach(e => {
    union.add(e);
  });
  setB.forEach(e => {
    union.add(e);
  });
  denominator = union.size;
  return numerator / denominator;
}

/**
 * Indice di Jaccard tra 2 set
 * @param {*} setA 
 * @param {*} setB 
 */
function jaccard(setA, setB) {
  "use strict";
  // intersezione (overlap) dei due insiemi
  const intersection = new Set(
    [...setA].filter(e => setB.has(e))
  );
  // unione dei due insiemi 
  const union = new Set();
  setA.forEach(e => {
    union.add(e);
  });
  setB.forEach(e => {
    union.add(e);
  });
  const numerator = intersection.size;
  const denominator = union.size;
  const score = numerator / denominator;
  return score;
}


/**
 * Estrae dalla lista di tutte le regole quelle che condividono almeno un
 * trigger con il workspace
 * @param {*} triggers 
 * @param {*} allRules 
 */
function extractFromAllRules(workspaceTriggers, allRules) {
  "use strict";
  /*
  let filtered = allRules.filter(function(e){
    let triggersStr = e.trigger_list;
    let triggers = triggersStr.split(",");
    for(let i = 0; i< workspaceTriggers.length; i++){
      if(triggers.includes(workspaceTriggers[i])){
        return e;
        //così resituisce copie multiple se ci sono più trigger?
      }
  }
  });
  return filtered;
  */
  let rulesCopy = [];
  console.log(allRules);
  allRules.forEach(function (e) {
    // per chiarezza sarebbe da mettere in una funct separata
    const ruleWithActionObj = Main.actionStrToObj(e);
    const ruleWithTriggerObj = Main.triggerStrToObj(ruleWithActionObj);
    let found = false;
    for (let i = 0; i < workspaceTriggers.length; i++) {
      if (ruleWithTriggerObj.triggers_obj.includes(workspaceTriggers[i])) {
        found = true;
      }
    }
    if (found) {
      rulesCopy.push(ruleWithTriggerObj);
    }
  });
  return rulesCopy;
}


