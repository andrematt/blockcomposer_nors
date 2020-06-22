import {
  getWorkspace, checkInTriggerInfo, getTriggerList, getAllTriggerInWorkspace,
  getBlockType, enable_after, disable_after, setTriggerList, getActionList,
  setActionList, getRuleBlock, hasTriggerChild, getOperatorWithoutNextConn,
  checkIfTriggerOperator, getTriggerWithNoNextConnection, checkIfAction,
  getNextViableBlockForAction, hasActionChild, setLastTrigger, getLastTrigger,
  exportSuggestorRule, clearSuggestionWorkspace,setRevertPossibility, 
  extractChildRecursive, getRuleBlocksArr, cleanRuleBlocksArr, fireSuggestion
} from "./main.js";

import { setActionRevert, removeActionRevert } from "./dom_modifiers.js";
import { getBlockDesc } from "./blockDescriptions.js";
import { checkConnection } from "./connectionsChecks.js";
import { printError, cleanError } from "./compositionErrorMessages.js";

/**
 * Listeners for get the blocks into the main "rule" block when ... ? 
 * NON METTERLO IN UN LISTENER MA FALLO SPARARE DOPO AUTOCHECKRULE
 */
export function ruleBlockChangesListener(event) {
  "use strict";
  console.log(event.type);
  // controllare che la sequenza attuale sia diversa dall'ultima
  if (event.type === "move") {
    let ruleBlock = getRuleBlock();
    cleanRuleBlocksArr();
    extractChildRecursive(ruleBlock);
    let ruleBlocksArr = getRuleBlocksArr();
    console.log(ruleBlocksArr);
    clearSuggestionWorkspace();
    //TODO controllare che la sequenza attuale sia corretta e che sia diversa dall'ultima prima di 
    // fare la raccomandazione
  }
}



/**
 * Listener for the last inserted trigger in the workspace. NOT USED ANYMORE: 
 * recommandation is fired after rule checker
 */
export function lastTriggerListener(event){
  "use strict";
  if (event.type && event.type === 'create') {
    let workspace = getWorkspace();
    let block = workspace.blockDB_[event.blockId];
    if (block) {
      if(block.isTrigger || block.isTriggerArray){
        let lastTrigger = getLastTrigger();
        if(lastTrigger !== block.type) {
          setLastTrigger(block.type);
          clearSuggestionWorkspace();
          exportSuggestorRule();
        }
      }
    }
  }
}
 
/**
 * Listener to perform connection check on the blocks and eventually print an
 * error message
 */
export function autoCheckRule(event) {
  "use strict";
  if (event.type) {
    let workspace = getWorkspace();
    let block = workspace.blockDB_[event.blockId];
    if (block) {
      if (block.parentBlock_ && block.previousConnection && block.parentBlock_) {
        let connOk = checkConnection(block, block.parentBlock_);
        if (!connOk) {
          printError(block, block.parentBlock_);
          block.previousConnection.disconnect();
        }
        else {
          cleanError();
          fireSuggestion(block);
        }
      }
    }
  }
}


/**
 *  
 * @param {*} event 
 */
export function addToCorrectBlock(event) {
  "use strict";
  let workspace = getWorkspace();
  if (event.type && event.type === 'create') {
    let block = workspace.blockDB_[event.blockId];
    if (block) {
      let ruleBlock = getRuleBlock();
      let isTrigger = checkInTriggerInfo(block);
      let isTriggerOperator = checkIfTriggerOperator(block);
      let isAction = checkIfAction(block);
      //let isActionOperator = checkIfActionOperator(block);
      // se è un trigger va fatto append al blocco rule (se non ha altri figli), oppure
      // al primo blocco operatore disponibile. Se non sono disponibili allora elimina
      // il blocco e avverti nella barra in alto.
      if (isTrigger) {
        if (hasTriggerChild(ruleBlock)) {
          const operatorWithoutNextConn = getOperatorWithoutNextConn();
          if (operatorWithoutNextConn) {
            let operatorConnection = operatorWithoutNextConn.nextConnection;
            let triggerConnection = block.previousConnection;
            operatorConnection.connect(triggerConnection);
          }
          else {
            block.dispose();
          }
        }
        else {
          let ruleBlockConnection = ruleBlock.getInput("TRIGGERS").connection;
          let triggerConnection = block.previousConnection;
          ruleBlockConnection.connect(triggerConnection);
        }
      }
      // se è un trigger operator prende il il blocco di tipo trigger con niente attaccato
      else if (isTriggerOperator) {
        let triggerWithNoNextConnection = getTriggerWithNoNextConnection(workspace);
        console.log(triggerWithNoNextConnection);
        if (!triggerWithNoNextConnection) {
          block.dispose();
        }
        else {
          let triggerConnection = triggerWithNoNextConnection.nextConnection;
          let operatorConnection = block.previousConnection;
          operatorConnection.connect(triggerConnection);
          // appende al trigger
        }
      }
      // se è un'azione fa append al blocco regola se non ha figli di tipo azione, a un blocco
      // action_placeholder se non ha figli, altrimenti a un blocco di tipo azione o a un blocco
      // parallel_dynamic
      // TODO RIPARTI DA QUAAAAAAAAAAAAAA
      else if (isAction) {
        if (hasActionChild(ruleBlock)) { // ci sono action placeholder non usati!!!!
          let nextViableBlockForAction = getNextViableBlockForAction(workspace);
          if(nextViableBlockForAction) {
            let otherConnection = nextViableBlockForAction.nextConnection;
            let actionConnection = block.previousConnection;
            otherConnection.connect(actionConnection);
          }
          else {
            block.dispose();
          }
          /*
          if (nextViableBlockForAction.type === "action_placeholder") {
            console.log("deve connettere!!");
            console.log(nextViableBlockForAction.type);
            let otherConnection = nextViableBlockForAction.nextConnection;
            console.log("OTher connection:");
            console.log(otherConnection);
            let actionConnection = block.previousConnection;
            actionConnection.connect(otherConnection);
          }
          else if(nextViableBlockForAction.type === "parallel_dynamic") {
            let otherConnection = nextViableBlockForAction.nextConnection;
            let actionConnection = block.previousConnection;
            otherConnection.connect(actionConnection);
          }
          else {
            let otherConnection = nextViableBlockForAction.nextConnection;
            let actionConnection = block.previousConnection;
            otherConnection.connect(actionConnection);
          }
          */
        }
        else {
          let ruleBlockConnection = ruleBlock.getInput("ACTIONS").connection;
          let actionConnection = block.previousConnection;
          ruleBlockConnection.connect(actionConnection);
        }
      }
      // se è l'operatore action_parallel append ad un blocco azione libero che non sia annidato
      // in un altro action_parallel
    }
  }

}


/**
 * Aggiunge ai blocchi trigger la casella di testo "is" o "becomes" a seconda
 * se vi sia collegato un trigger o una azione. Se non vi è collegato nulla
 * cancella la casella di testo
 * @param {*} event 
 */

export function triggerTypeListenerParent(event) {
  "use strict";
  let workspace = getWorkspace();
  if (event.type) {
    let block = workspace.blockDB_[event.blockId];
    if (block) {
      let isTrigger = checkInTriggerInfo(block);
      if (isTrigger) {
        if (!block.childrenBlocks) {
          block.getField("EVENT_CONDITION").setText("");
        }
      }
    }
  }
}

/**
 * 
 * @param {*} event 
 */
export function triggerTypeListenerChild(event) {
  "use strict";
  let workspace = getWorkspace();
  if (event.type) {
    let block = workspace.blockDB_[event.blockId];
    //let blockType = getBlockType(block);
    if (block) {
      if (block.parentBlock_) {

        if (block.type === "event") {
          let isTrigger = checkInTriggerInfo(block.parentBlock_);
          if (isTrigger) {
            block.parentBlock_.getField("EVENT_CONDITION").setText("becomes");
          }
        }

        else if (block.type === "condition") {
          if (block.parentBlock_) {
            console.log("PARENTBLOCK");
            console.log(block.parentBlock_);
            let isTrigger = checkInTriggerInfo(block.parentBlock_);
            if (isTrigger) {
              block.parentBlock_.getField("EVENT_CONDITION").setText("is");
            }
          }
        }
      }
      else {
        let triggers = getAllTriggerInWorkspace();
        if (triggers.length > 0) {
          triggers.forEach(function (e) {
            if (!e.childBlocks_[0]) {
              e.getField("EVENT_CONDITION").setText("");
            }
          });
        }
      }
    }
  }
}

/**
 * Listener che controlla se ci siano SOLO trigger di tipo "condition" nel 
 * workspace. Serve a chiamare le estenzioni che modificano il blocco rule 
 * aggiungendo eventuali descrizioni del comportamento della regola che  
 * avvengono quando sono presenti solo condizioni e azioni sost (revert)
 * @param {*} event 
 */
export function ruleTypeListener(event) {
  "use strict";
  let workspace = getWorkspace();
  if (event.type === "UI" || event.type === "move" || 
      event.type === "change" || event.type === "delete") {
    let blockCount = 0;
    let eventCount = 0;
    let actionCount = 0;
    for (var prop in workspace.blockDB_) {
      blockCount++;
    }
    let conditionCount = 0;

    if (blockCount > 1) {
      for (var key in workspace.blockDB_) {
        let block = workspace.blockDB_[key];
        if (block.type === "condition") {
          conditionCount++;
        }
        if (block.type === "event") {
          eventCount++;
        }
        if (block.isAction) {
          actionCount++;
        }
      }
    }
    // Non ci interessano gli altri casi: facciamo qualcosa solo se ci sono
    // azioni "reversibili" 
    if (conditionCount > 0 && eventCount === 0 && actionCount > 0) {
      setRevertPossibility("add");
      setActionRevert();
    }
    //else if (eventCount > 0 && actionCount > 0) {
    else {
      setRevertPossibility("remove");
      removeActionRevert();
    }
  }
}


/**
 * 
 * @param {*} event 
 */
export function dateTimeCreationListener(event) {
  "use strict";
  let workspace = getWorkspace();
  let rule_xml = Blockly.Xml.workspaceToDom(workspace, true);
  let rule_string = JSON.stringify(rule_xml);
  // voglio che appaia il prompt solo quando è un evento di creazione di singolo
  // blocco, non quando vengono copiati dal workspace dei suggeriementi
  if (event.type === "create" && event.ids.length === 1) {
    let block = workspace.blockDB_[event.blockId];
    //let blockType = getBlockType(block);
    if (block) {
      if (block.type === "dateTime-localTime") {
        console.log(block);
        let startInput = block.getInput("START_TIME");
        let endInput = block.getInput("END_TIME");
        let mainBlockStartConnection = startInput.connection;
        let mainBlockEndConnection = endInput.connection;
        let timeBlock1 = workspace.newBlock('hour_min');
        let timeBlock2 = workspace.newBlock('hour_min');
        let subBlock1Connection = timeBlock1.outputConnection;
        let subBlock2Connection = timeBlock2.outputConnection;
        //let mainBlockConnection = relatedBlock.getInput(myName).connection;
        timeBlock1.initSvg();
        timeBlock1.render();
        timeBlock2.initSvg();
        timeBlock2.render();
        mainBlockStartConnection.connect(subBlock1Connection);
        mainBlockEndConnection.connect(subBlock2Connection);
      }
      else if (block.type === "dateTime-localDate") {
        console.log(block);
        let dateBlock = workspace.newBlock('day');
        dateBlock.initSvg();
        dateBlock.render();
        block.getInput("DATE").connection.connect(dateBlock.outputConnection);
        block.getInput("DATE").connection.disconnect();
        block.getInput("DATE").connection.connect(dateBlock.outputConnection);
        /*
        let dateInput = block.getInput("DATE");
        let mainBlockDateConnection = dateInput.connection;
        let dateBlock = workspace.newBlock('day');
        let dateConnection = dateBlock.outputConnection;
        //let mainBlockConnection = relatedBlock.getInput(myName).connection;
        dateBlock.initSvg();
        dateBlock.render();
        dateConnection.connect(mainBlockDateConnection);
        //mainBlockDateConnection.connect(dateConnection);
        */
      }
    }
  }
}

/**
 * Listener per aggiornare il numero di blocchi di tipo "action_placeholder", 
 * collegati al numero di rami nel blocco "parallel branches". 
 * @param {*} event 
 */
export function parallelBranchesUpdateNumber(event) {
  "use strict";
  if (event.type === "change") {
    let workspace = getWorkspace();
    let relatedBlock = workspace.getBlockById(event.blockId);
    if (relatedBlock && relatedBlock.type && relatedBlock.type === "parallel_dynamic") {
      //guardo in tutti i possibili branches
      for (let i = 0; i < 4; i++) {
        let myName = "branch_" + i;
        let branchInput = relatedBlock.getInput(myName);
        //se esiste l'input
        if (branchInput) {
          let mainBlockConnection = branchInput.connection;
          //se non c'è niente collegato aggiungo il blocco "action_placeholder"
          if (!mainBlockConnection.targetConnection) {
            var placeholderBlock = workspace.newBlock('action_placeholder');
            let subBlockConnection = placeholderBlock.outputConnection;
            let mainBlockConnection = relatedBlock.getInput(myName).connection;
            placeholderBlock.initSvg();
            placeholderBlock.render();
            mainBlockConnection.connect(subBlockConnection);
          }
        }
        // rimuove tutti i blocchi "action_placeholder" senza padre
        else {
          let db = workspace.blockDB_;
          for (let item in db) {
            if (db[item].type === "action_placeholder" && db[item].parentBlock_ === null) {
              db[item].dispose();
            }
          }
        }
      }
    }
  }
}

/**
 * Listener per appendere il blocco "not" ad un trigger quando ne viene, 
 * selezionata la checkbox relativa.
 * @param {*} event 
 */
export function notBlockUpdate(event) {
  "use strict";
  if (event.type === "change") {
    let workspace = getWorkspace();
    let relatedBlock = workspace.getBlockById(event.blockId);
    if (relatedBlock && (relatedBlock.isTrigger || relatedBlock.isTriggerArray)) {
      let branchInput = relatedBlock.getInput('not_input_statement');
      //se esiste l'input
      if (branchInput) {
        let mainBlockConnection = branchInput.connection;
        if (!mainBlockConnection.targetConnection) {
          let notBlock = workspace.newBlock('not_dynamic');
          let notBlockConnection = notBlock.previousConnection;
          let mainBlockConnection = relatedBlock.getInput('not_input_statement').connection;
          mainBlockConnection.connect(notBlockConnection);
          notBlock.initSvg();
          notBlock.render();
        }
      }
      // rimuove tutti i blochi "not_dynamic" senza padre
      else {
        let db = workspace.blockDB_;
        for (let item in db) {
          if (db[item].type === "not_dynamic" && db[item].parentBlock_ === null) {
            db[item].dispose();
          }
        }
      }
    }
  }
}



/**
 * Listener per aggiornare la code_textarea, per debug
 * @param {*} event 
 */
export function updateCodeListener(event) {
  "use strict";
  let workspace = getWorkspace();
  var code = Blockly.JavaScript.workspaceToCode(workspace);
  //document.getElementById('code_textarea').value =code;
}

/**
 * Non serve più
 * Listener per catturare quando un blocco "wait after" viene connesso all'
 * uscita nextStatement di un blocco "parallel_dynamic". Chiama il metodo
 * mangageDyamicCheckbox. Da finire se evenutalmente verrà usato.
 * @param {*} event 
 */
export function waitToParallelListener(event) {
  "use strict";
  let workspace = getWorkspace();
  let movedBlock = workspace.getBlockById(event.blockId);
  if (movedBlock && movedBlock.type === "after_dynamic") {
    if (movedBlock.previousConnection && movedBlock.previousConnection.targetConnection && movedBlock.previousConnection.targetConnection.sourceBlock_.type === "parallel_dynamic") {
      let connectedToId = movedBlock.previousConnection.targetConnection.sourceBlock_.id;
      let connectedToBlock = workspace.getBlockById(connectedToId);
      let branches = connectedToBlock.inputList.length - 1;
      manageDynamicCheckbox(movedBlock, branches);
    }
  }
}

/**
 * Non serve più
 * Metodo per fare si che il numero di checkbox nel blocco "wait after" sia
 * uguale a quello dei parallel branches nel blocco "parallel_dynamic" cui è
 * connesso. Da finire se evenutalmente si vuole usare. 
 * @param {*} block 
 * @param {*} branches_number 
 */
function manageDynamicCheckbox(block, branches_number) {
  "use strict";
  for (let i = 0; i < branches_number; i++) {
    var checkbox = new Blockly.FieldCheckbox("false");
    let stdIndex = i + 1;
    let myName = "branch_" + i;
    let myLabel = "Branch " + stdIndex + ": ";
    block.appendDummyInput().appendField(checkbox);
  }
}


/**
 * Listener per catturare eventi ui o move. Mostra la documentazione relativa
 * al blocco che è stato selezionato/spostato
 * @param {*} event 
 */
export function blockDocsListener(event) {
  "use strict";
  let workspace = getWorkspace();
  if (event.type === "ui" || event.type === "move") {
    let blockId = event.blockId;
    for (var key in workspace.blockDB_) {
      if (workspace.blockDB_[key].id === blockId) {
        let myBlock = workspace.blockDB_[key]; //get block docs
        let text = getBlockDesc(myBlock);
        document.getElementById('textarea').innerHTML = "";
        document.getElementById('textarea').innerHTML = text;   // append block docs 
      }
    }
  }
}




/**
 * Listener per quando viene creato un trigger. Se cattura l'evento create, 
 * chiama il metodo prompt
 * @param {*} event 
 */
export function triggerListener(event) {
  "use strict";
  let workspace = getWorkspace();
  let rule_xml = Blockly.Xml.workspaceToDom(workspace, true);
  let rule_string = JSON.stringify(rule_xml);
  // voglio che appaia il prompt solo quando è un evento di creazione di singolo
  // blocco, non quando vengono copiati dal workspace dei suggeriementi
  if (event.type === "create" && event.ids.length === 1) {
    let block = workspace.blockDB_[event.blockId];
    //let blockType = getBlockType(block);
    if (block) {
      block.inputList.forEach(element => { //i trigger non hanno un tipo unico: guardo se nella inputList hanno Trigger_type
        if (element.name === "TRIGGER_TYPE") {
          Blockly.prompt("Select trigger type: ", event.blockId);
        }
      });
    }
  }
}

/**
 * Non serve più
 * Listener per vedere quando un blocco viene disconnesso dai propri
 * collegamenti: in questo caso viene rimosso dalla triggerList / actionList. 
 * @param {*} event 
 */
export function blockDisconnectListener(event) {
  "use strict";
  if (event.type === "move") {
    let triggerList = getTriggerList();
    let alreadyInArr = triggerList.findIndex(e => e.id === event.blockId);
    triggerList.splice(alreadyInArr, 1);
    return (triggerList);
  }
}