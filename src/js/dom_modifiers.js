import { getAllFromDB, getAllFromDBUser} from "./database_functs.js";
import { forceWorkspaceReload } from "./extensions.js";
import { checkConnection } from "./connections_checks.js";
import {
  actionStrToObj, getWorkspace, getSuggestionWorkspace, getHighlightedRule, 
  removeUnusedParallel, getRuleBlock, blockToDom, checkInActionInfoOnlyName,
  checkInTriggerInfoWithName, clearSuggestionWorkspace, getLastBlock, 
  getRecType
}
  from "./main.js";
import {getUserName} from "./login.js";

// contains all the functions to add/remove/modifiy the blocks in the 
// workspaces.


/**
 * 
 * @param {*} block 
 */
export function moveSingleBlockToMain(block){
  "use strict";
  let firstWorkspace = getWorkspace();
  let secondWorkspace = getSuggestionWorkspace();
  let suggestedBlock = firstWorkspace.newBlock(block.type);
  suggestedBlock.initSvg();
  suggestedBlock.render();
  connectToPreviousBlock(suggestedBlock);
  //block.dispose();
  //let xml_str = rule[0].rule_xml_str;
    //let xmlDoc = new DOMParser().parseFromString(xml_str, "text/xml");
    //console.log(xmlDoc);
    //Blockly.Xml.domToWorkspace(xmlDoc.firstChild, workspace);
  }

  /**
   * Automatically add a single block clicked on the secondary WS to the 
   * correct previous block.
   * @param {*} suggestedBlock 
   */
  //simile a addOperatorToBlock
  function connectToPreviousBlock(suggestedBlock){
    let lastBlock = getLastBlock();
    console.log(lastBlock);
    let nextBlock = lastBlock.getNextBlock();
    console.log(nextBlock);
    //attach a trigger/action to the trigger/action operator of the prev block
    if(nextBlock !== null){
      let check = checkConnection(suggestedBlock, nextBlock);
      console.log(check);
      if(check){
        let blockConnection = nextBlock.nextConnection;
        let otherConnection = suggestedBlock.previousConnection;
        blockConnection.connect(otherConnection);
      }
    }
    //if last block is trigger and actual is action, attach to the "rule" 
    //block "action" connection
    else if(lastBlock.blockType==="trigger" && suggestedBlock.blockType==="action"){
      let ruleBlock=getRuleBlock();
      let ruleBlockConnection = ruleBlock.getInput("ACTIONS").connection;
      let actionConnection = suggestedBlock.previousConnection;
      ruleBlockConnection.connect(actionConnection);
    }
    return;
  }

  /**
   * 
   * @param {*} triggerXml 
   * @param {*} actionXml 
   */
export function appendFullRuleToSuggestions(triggerXml, actionXml) {
  "use strict";
  let baseXml = `
  <block type="rule" inline="false" x="20" y="20">
    <statement name = "TRIGGERS">
     ${triggerXml}
      </statement>
      <statement name = "ACTIONS">
      ${actionXml}
      </statement>
    </block>
` ;
  //let treeCopy = JSON.parse(JSON.stringify(baseXml));
  //let xmlDom = Blockly.Xml.textToDom(baseXml);
  const workspace = getSuggestionWorkspace();
  let xmlDoc = new DOMParser().parseFromString(baseXml, "text/xml");
  Blockly.Xml.appendDomToWorkspace(xmlDoc, workspace);
}


/**
 * Scorre i blocchi azione, aggiunge l'icona revert se sono di tipo
 * sustained
 * @param {*} text 
 */
export function setActionRevert() {
  "use strict";
  let workspace = getWorkspace();
  for (var key in workspace.blockDB_) {
    let block = workspace.blockDB_[key];
    if (block.isAction && block.timing === "sustained") {
      let input = block.getInput("ACTION_REVERT");
      //block.setTooltip('The status of this device will be reverted when the condition will not be valid anymore');
      if (!input) {      
        block.mutationToDom();
        block.domToMutation();
      }
    }
  }
}

/**
 * Scorre i blocchi azioni, rimuove l'icona revert se sono di tipo
 * sustained
 */
export function removeActionRevert() {
  "use strict";
  let workspace = getWorkspace();
  for (var key in workspace.blockDB_) {
    let block = workspace.blockDB_[key];
    if (block.isAction && block.timing === "sustained") {
      let input = block.getInput("ACTION_REVERT");
      //block.setTooltip(block.timing);
      if (input) {
        block.mutationToDom();
        block.domToMutation();
      }
    }
  }
}

/**
 * Useful for debugging 
 * @param {*} rules 
 */
function printIdAndGoal(rules){

  let results = [];
  rules.forEach( (e) => {
    let result = {}
    result.id = e.id;
    result.name = e.rule_name;
    let e_json = JSON.parse(e.rule_obj_str);
    let rule_goal = e_json.goal;
    let rule_prioritiy = e_json.priority
    result.goal = rule_goal;
    result.priority = rule_prioritiy;
    results.push(result);
  })
    let results_string = JSON.stringify(results)
    let blob = new Blob([results_string], {type:"application/json;charset=utf-8"});
    console.log(results)
    var url = URL.createObjectURL(blob);
    var elem = document.createElement("a");
    elem.href = url;
    elem.download = "test.json";
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
}

/**
 * Appende la lista di regole salvate recuperate dal db nella finestra modale.
 * Quando un elemento nella lista viene cliccato, chiama ruleToWorkspace
 * @param {*} domElement 
 */
export async function appendRulesList(domElement, isSudo = false) {
  let user = getUserName();
  let rules;
  if(isSudo){
  rules = await getAllFromDB(user).then();
  }
  else {
  rules = await getAllFromDBUser(user).then();
  }
  console.log(rules);
  if (rules && rules.length > 0) {
    //printIdAndGoal(rules) //download all rules in JSON for debugging
    //rimuove i nodi precedenti
    let myNode = document.getElementById(domElement);
    while (myNode.firstChild) {

      myNode.removeChild(myNode.firstChild);
    }
    var fragment = document.createDocumentFragment();
    let table = document.createElement('table');
    table.className = "pure-table";
    //table.appendChild(document.createElement('td'));
    let firstRow = document.createElement('tr');
    let userName = document.createElement('th');
    userName.innerText = "User name";

    let ruleName = document.createElement('th');
    ruleName.innerText = "Rule name";

    //let ruleGoal = document.createElement('th');
    //ruleGoal.innerText = "Goal";

    let triggers = document.createElement('th');
    triggers.innerText = "Used triggers";

    let actions = document.createElement('th');
    actions.innerText = "Used actions";

    let active = document.createElement('th');
    active.innerText = "Is active";

    firstRow.appendChild(userName);
    firstRow.appendChild(ruleName);
    //firstRow.appendChild(ruleGoal);
    firstRow.appendChild(triggers);
    firstRow.appendChild(actions);
    firstRow.appendChild(active);
    table.append(firstRow);

    rules.forEach(function (e) {
      let el = document.createElement('tr');

      el.addEventListener("click", highlightRule, false);
      el.setAttribute("class", "rules_list");
      el.setAttribute("rule_id", e.id);
      el.setAttribute("rule_xml_str", e.rule_xml_str);
      el.setAttribute("rule_obj_str", e.rule_xml_str);

      let userName = document.createElement('td');
      userName.innerText = e.user_name;

      let ruleName = document.createElement('td');
      ruleName.innerText = e.rule_name;

     // let ruleGoal = document.createElement('td');
     // ruleGoal.innerText = e.rule_goal;
      
      let triggers = document.createElement('td');
      triggers.innerText = e.triggers_str;

      let actions = document.createElement('td');
      actions.innerText = e.actions_str;

      let active = document.createElement('td');
      active.innerText = "no";
      //active.innerText = e.isActive;
      
      el.appendChild(userName);
      el.appendChild(ruleName);
      //el.appendChild(ruleGoal);
      el.appendChild(triggers);
      el.appendChild(actions);
      el.appendChild(active);

      table.append(el);
    });
    fragment.appendChild(table);
    document.getElementById(domElement).appendChild(fragment);
  } else {
    //se non ci sono regole nel db cancella la tabella
    let myNode = document.getElementById(domElement);
    while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
    }
  }
}

/**
 * Chiamata quando un elemento nella lista viene cliccato. Trasforma la regola
 * salvata in formato TARE in blocchi e la aggiunge al workspace.  
 */
export async function getFullRule() {
  "use strict";
  let rule = await getHighlightedRule().then();
  if (rule) {
    ruleToWorkspace(rule);
    removeUnusedParallel();
  }
}

/**
 * Evidenziazione della regola cliccata dalla lista
 */
function highlightRule() {
  "use strict";
  let id = this.getAttribute("rule_id");
  let elements = document.getElementsByClassName("rules_list");
  for (let e in elements) {
    let toInt = parseInt(e);
    if (!isNaN(toInt)) {
      if (elements[e].getAttribute("rule_id") === id) {
        elements[e].className = "rules_list highlight";
      }
      else {
        elements[e].className = "rules_list";
      }
    }
  }
}

/**
 * Chiamata quando un elemento nella lista viene cliccato. Trasforma la regola
 * salvata in formato TARE in blocchi e la aggiunge al workspace.  
 */
export function xmlFileToWorkspace(rule) {
  "use strict";
  //console.log(rule);
  if (rule) {
    let workspace = getWorkspace();
    let xmlDoc = new DOMParser().parseFromString(rule, "text/xml");
    //console.log(xmlDoc);
    Blockly.Xml.domToWorkspace(xmlDoc.firstChild, workspace);
  }
}

/**
 * Chiamata quando un elemento nella lista viene cliccato. Trasforma la regola
 * salvata in formato TARE in blocchi e la aggiunge al workspace.  
 */
export function ruleToWorkspace(rule) {
  "use strict";
  //console.log(rule);
  if (rule[0].id) {
    let workspace = getWorkspace();
    let xml_str = rule[0].rule_xml_str;
    console.log(xml_str);
    let xmlDoc = new DOMParser().parseFromString(xml_str, "text/xml");
    //console.log(xmlDoc);
    Blockly.Xml.domToWorkspace(xmlDoc.firstChild, workspace);
  }
}

/**
 * Chiamata quando viene cliccato il suggeritore di regole, appende una regola
 * al workspace dei suggerimenti
 */
export function actionsToSuggestionWorkspace(rule) {
  "use strict";
  if (rule.id) {
    const workspace = getSuggestionWorkspace();
    const ruleWithActions = actionStrToObj(rule);
    for (let i = 0; i < ruleWithActions.actions_obj.length; i++) {
      //console.log("action to workspace:");
      //console.log(ruleWithActions.actions_obj[i]);
      let actionBlock = workspace.newBlock(ruleWithActions.actions_obj[i]);
      actionBlock.initSvg();
      actionBlock.render();
    }
  }
}

/**
 * Crea la sequenza di blocchi realativi alla regola da suggerire
 * @param {*} rule 
 */
export function createActionBlocksFromSuggested(rule) {
  "use strict";
  if (rule.id) {
    var doc = document.implementation.createDocument("", "", null);
    const ruleWithActions = actionStrToObj(rule);
    for (let i = 0; i < ruleWithActions.actions_obj.length; i++) {
      if (i === 0) {
        const myType = ruleWithActions.actions_obj[i];
        let actionNewBlock = doc.createElement("block");
        actionNewBlock.setAttribute("type", myType);
        actionNewBlock.setAttribute("class", myType);
        doc.appendChild(actionNewBlock);
      }
      else {
        let myParent = doc.getElementsByClassName(ruleWithActions.actions_obj[i - 1]);
        const myType = ruleWithActions.actions_obj[i];
        let actionNewBlock = doc.createElement("block");
        actionNewBlock.setAttribute("type", myType);
        actionNewBlock.setAttribute("class", myType);
        let next = doc.createElement("next");
        next.appendChild(actionNewBlock);
        myParent[0].appendChild(next);
      }
    }
    var xmlText = new XMLSerializer().serializeToString(doc);
    return xmlText;
  }
}

/**
 * Create the blocks associated to the obtained suggestions
 * @param {*} rule 
 */
/*
export function createBlocksFromSuggested(suggestions) {
  "use strict";
   let doc = document.implementation.createDocument("", "", null);
   for (let i = 0; i < suggestions.length; i++) {
    if (i === 0) {
        let newBlock = doc.createElement("block");
        newBlock.setAttribute("type", suggestions[i]);
        newBlock.setAttribute("class", suggestions[i]);
        doc.appendChild(newBlock);
      }
    }
    var xmlText = new XMLSerializer().serializeToString(doc);
    return xmlText;
}
*/

/**
 * 
 * @param {*} blocks 
 */
export function blocksToSuggestionWorkspace(blocks) {
  "use strict";
  console.log(blocks);
  clearSuggestionWorkspace();
    const workspace = getSuggestionWorkspace();
    for (let i = 0; i < blocks.length; i++) {
      if(checkInActionInfoOnlyName(blocks[i]) || checkInTriggerInfoWithName(blocks[i])){
        let block = workspace.newBlock(blocks[i]);
        //block.moveBy(0, i * 20);
        block.initSvg();
        block.render();
        console.log(block);
        block.setMovable(false);
      }
  }
  alignBlocks();
}

/**
 * Adds a new Rule block to the passed workspace
 * @param {*} workspace 
 */
export function addRuleBlockToWorkspace(workspace){
  let block = workspace.newBlock("rule");
  block.initSvg();
  block.render();
}

/**
 * 
 * @param {*} blocks 
 */
export function rulesToSuggestionWorkspace(rules) {
  "use strict";
  console.log(rules);
  clearSuggestionWorkspace();
    const workspace = getSuggestionWorkspace();
    for (let i = 0; i < rules.length; i++) {
       let xml_str = rules[i][0].rule_xml_str;
       let xmlDoc = new DOMParser().parseFromString(xml_str, "text/xml");
       //console.log(xmlDoc);
        Blockly.Xml.domToWorkspace(xmlDoc.firstChild, workspace);
      }
  alignBlocks();
}

/**
 * 
 */
export function alignBlocks(){
  let recType = getRecType();
  if(recType==="Full rule recommendations"){
    let allBlocks = getSuggestionWorkspace().getAllBlocks();
    console.log(allBlocks);
    let allRuleBlocks = allBlocks.filter( (e) => {
      return e.type ==="rule";
    });
    if(allRuleBlocks.length > 0){
    let cumulativeBlocksHeight = 0;
    let buffer = 20;
    let firstBlockX = allRuleBlocks[0].getRelativeToSurfaceXY().x;
    let firstBlockY = allRuleBlocks[0].getRelativeToSurfaceXY().y;
    for (let i = 0; i< allRuleBlocks.length; i++){
      let myX = allRuleBlocks[i].getRelativeToSurfaceXY().x;
      let myY = allRuleBlocks[i].getRelativeToSurfaceXY().y;
      console.log(myX);
      let diffX = firstBlockX - myX;
      let moveX = 0;
      if(firstBlockX > myX) {
        moveX = diffX;
      }
      else if(firstBlockX < myX){
        moveX = diffX;
      }
      let diffY = firstBlockY - myY;
      let moveY = cumulativeBlocksHeight;
      if(firstBlockY > myY) {
        moveY += diffY;
      }
      else if(firstBlockX < myX){
        moveY += -diffY;
      }
    allRuleBlocks[i].moveBy(moveX, moveY);
    cumulativeBlocksHeight += allRuleBlocks[i].getHeightWidth().height + (buffer * i+1);
    }   
  }
  }
  else {
  var blocks = getSuggestionWorkspace().getTopBlocks()
  var y = 0
  for (var i = 0; i < blocks.length; i++){
    blocks[i].moveBy(0, y)
    y += blocks[i].getHeightWidth().height
    y += 10 //buffer
  }
}
}