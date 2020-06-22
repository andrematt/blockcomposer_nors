import { getAllFromDB, getOneFromDB } from "./database_functs.js";
import { forceWorkspaceReload } from "./extensions.js";
import {
  actionStrToObj, getWorkspace, getSuggestionWorkspace, getHighlightedRule, 
  removeUnusedParallel, getRuleBlock
}
  from "./main.js";


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
 * Appende la lista di regole salvate recuperate dal db nella finestra modale.
 * Quando un elemento nella lista viene cliccato, chiama ruleToWorkspace
 * @param {*} domElement 
 */
export async function appendRulesList(domElement) {
  "use strict";
  let rules = await getAllFromDB().then();
  console.log(rules);
  if (rules && rules.length > 0) {
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

    let triggers = document.createElement('th');
    triggers.innerText = "Used triggers";

    let actions = document.createElement('th');
    actions.innerText = "Used actions";

    let active = document.createElement('th');
    active.innerText = "Is active";

    firstRow.appendChild(userName);
    firstRow.appendChild(ruleName);
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

      let triggers = document.createElement('td');
      triggers.innerText = e.triggers_str;

      let actions = document.createElement('td');
      actions.innerText = e.actions_str;

      let active = document.createElement('td');
      active.innerText = e.isActive;
      //const triggers = document.createElement('td').innerText = e.triggers_str;
      //const actions = document.createElement('td').innerText = e.actions_str;
      el.appendChild(userName);
      el.appendChild(ruleName);
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
export function ruleToWorkspace(rule) {
  "use strict";
  //console.log(rule);
  if (rule[0].id) {
    let workspace = getWorkspace();
    let xml_str = rule[0].rule_xml_str;
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