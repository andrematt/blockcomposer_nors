import * as Init from "./init.js";
import * as DB from "./database_functs.js";
import * as Generators from "./generators.js";
import * as Listeners from "./listeners.js";
import * as Extensions from "./extensions.js";
import * as BlockSuggestor from "./block_suggestor.js";
import * as Dialog from "./custom_dialog.js";
import * as DomModifiers from "./dom_modifiers.js";
import * as errorMessages from "./textarea_manager.js";
import * as ModalManager from "./modal_manager.js"
import { getDimIdTable } from "./dimension_ids.js";

/**
 * TODO: 
 * - Adesso i trigger hanno dentificativo dimId # xPath: guarda se fare una 
 * cosa del genere anche per azioni
 * - Export di regole in formato TAREME: riparti da createActionArr in 
 * from_rule_to_rule_obj: la parte trigger adesso dovrebbe essere coerente con 
 * TAREME, per la parte azione è da vedere:
 * sicuramente c'è da aggiungere xPath e possibleValues se presenti!!
 * - La lettura di un ctx generato sembra funzionare, il problema è che mancano 
 * i dimensionId: viene passato a blockly un blocco con undefined e crasha. 
 */

let currentUser;
let myTriggers;
let myActions;
let myWorkspace;
let mySuggestionWorkspace;
let myRule;
let triggerBlocks;
let actionBlocks;
let ruleSequence;
let ruleBlocksArr = [];
let triggerCompleteInfo = {};
let actionCompleteInfo = {};
let triggersXml = "";
let actionsXml = "";
let lastBlocklyEvent = "";
let existsChildNonTrigger = false;
let existsChildNonAction = false;
let existsChildTrigger = false;
let existsChildAction = false;
let inconsistentTriggerSequence = false;
let inconsistentTriggerMessage = "";
let inconsistentActionSequence = false;
let inconsistentActionMessage = "";
let triggerList = [];
let actionList = [];
let clickedEventConditionBlock;
let lastBlock; // Last block inserted in workspace
let ruleSuggestorStatus;
let triggerInWorkspace = []; // keep the triggers in workspace TODO: listener for remove at delete
// Array per le azioni composte da più parti ma da mostrare come una unità
const multipleActions = ["Alarms", "Reminders", "video", "showImage"];
// Array per i trigger multipli
const multipleTriggers = ["relativePosition"];
// Array per i blocchi accessori riguardanti trigger e azioni
const triggerSupportBlocks = ["and", "or", "group", "event", "condition", "not_dynamic"];
const triggerOperators = ["and", "or", "group"];
const actionOperators = ["parallel_dynamic", "sequential", "parallel"];
const triggerTimeBlocks = ["day", "hour_min"];
const actionSupportBlocks = ["parallel_dynamic", "action_placeholder", "sequential", "parallel"];
let revertPossibility = "remove";
let recommendationType = "None";
let booleanTriggers = ["rain", "snow", "motion", "gasSensor", "smokeSensor"];

/**
 * Modulo di inizializzazione, pattern IIFE. Carica trigger e azioni, 
 * ricostruisce la toolbox, sovrascrive il dialog box (per scelta 
 * event/condition). Contiene le dichiarazioni delle funzioni principali.
 */
(function () {
  "use strict";
  console.log(Init);
  //console.log(window.Blockly.Blocks.procedures_callnoreturn.renameProcedure("test", "test2"));
  localStorageChecker();
  waitForTriggers();
  waitForActions();
  initializeSuggestorButtons();
  initializeSuggestorSelector();
  Dialog.overrideDialog();
  console.log("trigger info loaded!");
  console.log(getTriggerInfo());
  console.log("action info loaded!");
  console.log(getActionInfo()); 
  async function initializeSuggestorButtons() {
    let text = `
 Start the editing of the rule by selecting a trigger or an action from the toolbox.
    `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
    document.getElementById("suggestor-and").onclick = function () { addTextareaOperatorToBlock("and") };
    document.getElementById("suggestor-or").onclick = function () { addTextareaOperatorToBlock("or") };
    document.getElementById("suggestor-not").onclick = function () {addTextareaOperatorToBlock("not") };
    //document.getElementById("suggestor-action").onclick = function () { startRefineRule("rule") };
    //document.getElementById("suggestor-sequential").onclick = function () { startRefineRule("sequential") };
    //document.getElementById("suggestor-parallel").onclick = function () { startRefineRule("parallel") };
  }

  async function initializeSuggestorSelector() {
    document.getElementById("suggestor-step-by-step").onclick = function () { setRecommendationType("step") };
    document.getElementById("suggestor-full-rule").onclick = function () { setRecommendationType("full") };
    document.getElementById("suggestor-none").onclick = function () { setRecommendationType("none") };
  }


  /**
   * Funzione asincrona: aspetta il caricamento dei trigger, chiama funct per 
   * creare l'albero dei trigger e ridisegnare la toolbox 
   */
  async function waitForTriggers() {
    myTriggers = await Init.loadTriggersAsync();
    console.log(myTriggers);
    //const triggerWithCategoryData = addCategoryDataToAttributeTrigger(myTriggers);
    for (let element in myTriggers){
      addCategoryDataToAttributeTrigger(myTriggers[element])
    }
    console.log(myTriggers);
    loadTriggersToolboxRecursive(myTriggers);
    rebuildToolbox();
    //addTriggersToConnections();
  }

  /**
   * Funzione asincrona: aspetta il caricamento delle azioni, chiama funct per 
   * creare l'albero delle azioni e ridisegnare la toolbox 
   */
  async function waitForActions() {
    myActions = await Init.loadActionsAsync();
    loadActionsToolboxRecursive(myActions);
    rebuildToolbox();
    //addActionsToConnections();
  }

/**
 * If passedSchema is not an array, add dimensionId if needed, recursive call 
 * on nodes and attributes. 
 * Same if is an array. 
 * @param {*} passedSchema 
 * @param {*} dimensionId 
 */
  function addCategoryDataToAttributeTrigger(passedSchema, dimensionId = false){
    // for sugli attributi: se ha attributi aggiungi
    // for sui nodi: se ha nodi chiama ricorsivo
    if(!passedSchema.dimensionId){
      passedSchema.dimensionId = dimensionId;
    }
      if(passedSchema.nodes) {
        passedSchema.nodes.forEach( (ee) => {
          addCategoryDataToAttributeTrigger(ee, passedSchema.dimensionId);
        })
      }
      if(passedSchema.attributes){
        passedSchema.attributes.forEach( (ee) => {
          addCategoryDataToAttributeTrigger(ee, passedSchema.dimensionId);
        })
    }

    for (let i = 0; i<passedSchema.length; i++){
      if(!passedSchema[i].dimensionId){
        passedSchema[i].dimensionId = dimensionId;
      }
      if(passedSchema[i].nodes) {
      passedSchema[i].nodes.forEach( (ee) => {
        addCategoryDataToAttributeTrigger(ee, passedSchema[i].dimensionId);
      })
    }
    if(passedSchema[i].attributes){
      passedSchema[i].attributes.forEach( (ee) => {
        addCategoryDataToAttributeTrigger(ee, passedSchema[i].dimensionId);
      })
    }
  }
}

  /** 
   *  Aggiunge le informazioni della categoria (realName, displayedName, 
   *  dimensionId) agli attributi, per poterli recuperare senza dover guardare 
   *  all'elemento padre.
   */
  function addCategoryDataToAttributeTrigger2(passedSchema) {
    let schema = passedSchema;
    for (let element in schema) {
      for (let i = 0; i < schema[element].length; i++) {
        const realName = schema[element][i].realName;
        const displayedName = schema[element][i].displayedName;
        const dimensionId = schema[element][i].dimensionId;
        console.log(dimensionId);
        if (schema[element][i].attributes !== undefined) {
          for (let j = 0; j < schema[element][i].attributes.length; j++) {
            schema[element][i].attributes[j].categoryRealName = realName;
            schema[element][i].attributes[j].categoryDisplayedName = displayedName;
            schema[element][i].attributes[j].categoryDimensionId = dimensionId;
          }
        }
      }
    }
    return schema;
  }


  /**
   * Ottiene la categoria (top level) di cui fa parte un trigger o un'action
   * guardando all'ultimo elemento della toolbox su cui è avvenuta una azione.
   * Non viene usata perchè funziona solo quando un blocco viene creato dalla 
   * toolbox (no se viene caricato dal db) 
   * @param {*} toolbox 
   */
  function getParentCategory(toolbox) {
    if (!toolbox.lastCategory_) {
      return;
    }
    //blocco attualmente cliccato
    if (!toolbox.lastCategory_.actualEventTarget_.actualEventTarget_.blocks[0]) {
      return;
    }
    let parentXml = toolbox.lastCategory_.actualEventTarget_.actualEventTarget_.blocks[0].parentElement.outerHTML;
    const parser = new DOMParser();
    const srcDOM = parser.parseFromString(parentXml, "application/xml");
    let parentDomElement = (srcDOM.getElementsByTagName('category')[0].getAttribute('name'));
    return parentDomElement;
  }


  /**
   * Crea dinamicante il blocco per un'azione multipla
   * @param {*} block 
   * @param {*} name 
   * @param {*} parentName 
   * @param {*} leafData 
   */
  function createMultipleAction(block, name, parentName, leafData) {
    let xPath = (leafData.xPath ? leafData.xPath : "xPath missing!!");
    block.isActionArray = true;
    block.name = name;
    block.timing = leafData.timing;
    block.timingDesc = leafData.timing + " action";
    block.appendDummyInput("BLOCK_HEADER")
      .appendField(new Blockly.FieldLabel(name, "block-name"))
      .appendField(name, "displayed_name")
      .appendField(parentName, "parent_name")
      .appendField(leafData.realName, "real_name")
      .appendField(xPath, "xPath") //reminderText non ha xPath
      .appendField(leafData.type, "type")
      .appendField("action", "blockCategory");

    block.getField("displayed_name").setVisible(false);
    block.getField("parent_name").setVisible(false);
    block.getField("real_name").setVisible(false);
    block.getField("xPath").setVisible(false);
    block.getField("type").setVisible(false);
    block.getField("blockCategory").setVisible(false);
    block.setColour('#069975');
    block.setPreviousStatement(true, null);
    block.setNextStatement(true, null);
    block.setHelpUrl('');
    block.setTooltip(block.timingDesc);

    if (leafData.realName === "alarmText") {
      /* better remove this for the test
      if (block.timingDesc === "immediate action") {
        block.appendDummyInput("ACTION_TIMING_ICON")
          .appendField("immediate action")
          .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/immediate_resized.png", 25, 25, { alt: "immediate action", flipRtl: "FALSE" }));
      }
      else if (block.timingDesc === "extended action") {
        block.appendDummyInput("ACTION_TIMING_ICON")
          .appendField("extended action")
          .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/extended_resized.png", 25, 25, { alt: "extended action", flipRtl: "FALSE" }));
      }
      else if (block.timingDesc === "sustained action") {
        block.appendDummyInput("ACTION_TIMING_ICON")
          .appendField("sustained action")
          .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/sustained_resized.png", 25, 25, { alt: "sustained action", flipRtl: "FALSE" }));
      }
      */
      block.appendDummyInput("TEXT")
        .appendField("Text:")
        .appendField(new Blockly.FieldTextInput("alarm text"), "ALARM_TEXT");
      block.appendDummyInput("NOTIFICATION")
        .appendField("Notification mode:")
        .appendField(new Blockly.FieldDropdown([["sms", "SMS"], ["email", "EMAIL"], ["notification", "NOTIFICATION"], ["voice", "VOICE"]]), "NOTIFICATION_MODE");
      block.appendDummyInput("TIMES")
        .appendField("Send times:")
        .appendField(new Blockly.FieldDropdown([["1", "ONCE"], ["2", "TWO_TIMES"], ["3", "THREE_TIMES"]]), "REPETITIONS");
      block.appendDummyInput("SEND")
        .appendField("Send to:")
        .appendField(new Blockly.FieldTextInput("send to"), "SEND_TO");
    }

    else if (leafData.realName === "reminderText") {
      /*
      if (block.timingDesc === "immediate action") {
        block.appendDummyInput("ACTION_TIMING_ICON")
          .appendField("immediate action")
          .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/immediate_resized.png", 25, 25, { alt: "immediate action", flipRtl: "FALSE" }));
      }
      else if (block.timingDesc === "extended action") {
        block.appendDummyInput("ACTION_TIMING_ICON")
          .appendField("extended action")
          .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/extended_resized.png", 25, 25, { alt: "extended action", flipRtl: "FALSE" }));
      }
      else if (block.timingDesc === "sustained action") {
        block.appendDummyInput("ACTION_TIMING_ICON")
          .appendField("sustained action")
          .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/sustained_resized.png", 25, 25, { alt: "sustained action", flipRtl: "FALSE" }));
      }
      */
      block.appendDummyInput("TEXT")
        .appendField("Text:")
        .appendField(new Blockly.FieldTextInput("reminder text"), "REMINDER_TEXT");
      block.appendDummyInput("NOTIFICATION")
        .appendField("Notification mode:")
        .appendField(new Blockly.FieldDropdown([["sms", "SMS"], ["email", "EMAIL"], ["notification", "NOTIFICATION"], ["voice", "VOICE"]]), "NOTIFICATION_MODE");
      block.appendDummyInput("TIMES")
        .appendField("Send times:")
        .appendField(new Blockly.FieldDropdown([["1", "ONCE"], ["2", "TWO_TIMES"], ["3", "THREE_TIMES"]]), "REPETITIONS");
      block.appendDummyInput("SEND")
        .appendField("Send to:")
        .appendField(new Blockly.FieldTextInput("send to"), "SEND_TO");
    }
  }
  /**
   * Crea dinamicamente il blocco per un'azione normale
   * @param {*} block 
   * @param {*} name 
   * @param {*} parentName 
   * @param {*} leafData 
   */
  function createStandardAction(block, name, parentName, leafData) {
    console.log(leafData.type);
    let xPath = (leafData.xPath ? leafData.xPath : "xPath missing!!");
    block.name = name;
    block.timing = leafData.timing;
    block.timingDesc = leafData.timing + " action";
    block.appendDummyInput("BLOCK_HEADER")
      .appendField(new Blockly.FieldLabel(name, "block-name"))
      .appendField(name, "displayed_name")
      .appendField(parentName, "parent_name")
      .appendField(leafData.realName, "real_name")
      .appendField(xPath, "xPath") //reminderText non ha xPath
      .appendField(leafData.type, "type");

    block.getField("displayed_name").setVisible(false);
    block.getField("parent_name").setVisible(false);
    block.getField("real_name").setVisible(false);
    block.getField("xPath").setVisible(false);
    block.getField("type").setVisible(false);
    block.setColour('#069975');
    block.setInputsInline(false);
    block.setPreviousStatement(true, null);
    block.setNextStatement(true, null);
    block.setTooltip(block.timingDesc);
    block.setHelpUrl('');
    /*
    if (block.timingDesc === "immediate action") {
      block.appendDummyInput("ACTION_TIMING_ICON")
        .appendField("immediate action")
        .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/immediate_resized.png", 25, 25, { alt: "immediate action", flipRtl: "FALSE" }));
    }
    else if (block.timingDesc === "extended action") {
      block.appendDummyInput("ACTION_TIMING_ICON")
        .appendField("extended action")
        .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/extended_resized.png", 25, 25, { alt: "extended action", flipRtl: "FALSE" }));
    }
    else if (block.timingDesc === "sustained action") {
      block.appendDummyInput("ACTION_TIMING_ICON")
        .appendField("sustained action")
        .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/sustained_resized.png", 25, 25, { alt: "sustained action", flipRtl: "FALSE" }));
    }
    */
    if (leafData.possibleValues) {

      let valuesArray = [];
      // testo di default per il field
      let text = "Set: ";
      if (leafData.type === "invokeFunctions:changeApplianceState") {
        text = "set state: ";
      }
      for (let select in leafData.possibleValues) {
        valuesArray.push([leafData.possibleValues[select], select]);
      }
      //block.appendDummyInput("NAME")
      block.appendDummyInput("INPUT_SELECT")
        //.setCheck(null)
        .appendField(text)
        .appendField(new Blockly.FieldDropdown(valuesArray), "SELECT_FIELD_VALUE");

    }
    else if (leafData.type === "custom:greatLuminare") {
      block.appendDummyInput("START_LIGHT_SCENE")
        .appendField("activate great luminare");
    }
    else if (leafData.type === "invokeFunctions:lightScene") {
      block.appendDummyInput("START_LIGHT_SCENE")
        .appendField("start light scene ");
    }
    else if (leafData.type === "update:lightColor") {
      block.appendDummyInput("COLOR_VALUE_INPUT")
        .appendField("Color: ")
        //.appendField(new Blockly.FieldTextInput("default"), "COLOR_VALUE")
        .appendField(new Blockly.FieldColour("#ffcc00"), "COLOR_FIELD_VALUE");
      block.appendDummyInput("COLOR_DURATION_INPUT")
        .appendField("Duration (min): ")
        .appendField(new Blockly.FieldNumber(1, 1, 300), "SELECT_FIELD_VALUE");

    }
    else if (leafData.type === "INTEGER" || leafData.type === "DOUBLE") {
      block.appendDummyInput("OPERATOR")
        //.setCheck(null)

        .appendField(new Blockly.FieldDropdown([["uguale a", "EQUAL"], ["diverso da", "DIFFERENT"], ["meno di", "LESSTHEN"], ["più di", "MORETHEN"]]), "SELECT_FIELD_VALUE")
        //.appendField(new Blockly.FieldDropdown([["=", "EQUAL"], ["<", "LESSTHEN"], [">", "MORETHEN"]]), "NAME")
        //block.appendDummyInput("VALUE")
        //.setCheck("Number")
        .appendField(new Blockly.FieldNumber(0), "INPUT_FIELD_VALUE");

    }
    else if (leafData.type === "custom:string") {
      block.appendDummyInput("TEXT")
        .appendField("Text: ")
        .appendField(new Blockly.FieldTextInput("custom text"), "INPUT_FIELD_VALUE");

    }
    else if (leafData.type === "custom:int") {
      block.appendDummyInput("INT")
        .appendField("Value: ")
        .appendField(new Blockly.FieldNumber(1, 1, 300), "SELECT_FIELD_VALUE");

    }
  }

  /**
   * Crea l'XML di un'azione (nodo foglia), assegna a 
   * Blockly.JavaScript[leafData.realName] il js da chiamare quando viene aggiunto
   * il blocco. Funziona diversamente da createAction.. perchè la funct per aggiungere
   * la categoria agli attributi non va per le azioni (non ne vale di rifarla), quindi
   * leafData non ha il nome della categoria
   * @param {*} leafData 
   */
  function createActionDinamically(leafData, blockName, categoryName) {
    Blockly.Blocks[blockName] = {
      init: function () {
        console.log(leafData);
        this.isAction = true;
        this.blockType = "action";
        const elementName = leafData.displayedName;
        let parentName = "";
        if (categoryName) {
          parentName = categoryName;
        }
        const name = (parentName !== "" ? parentName + " - " + elementName : elementName);
        /*
        let name = "";
        let parentName = "dummy";
        if (this.workspace.toolbox_ && getParentCategory(this.workspace.toolbox_)) {
          parentName = getParentCategory(this.workspace.toolbox_);
        }
        if (parentName != "dummy" && parentName !== "") {
          name = parentName + " - " + leafData.displayedName;
        }
        else {
          name = leafData.displayedName;
        }
        */
        if (leafData.realName === "reminderText" ||
          leafData.realName === "alarmText" ||
          leafData.realName === "videoPath" ||
          leafData.realName === "imagePath") {
          createMultipleAction(this, name, parentName, leafData);
        } else {
          createStandardAction(this, name, parentName, leafData);
        }

      },
      mutationToDom: function () { //registra in blockly la modifica
        if (this.timing === "sustained") {
          let container = document.createElement('mutation');
          let revertPossibility = getRevertPossibility();
          container.setAttribute('revert', revertPossibility);
          return container;
        }
      },
      domToMutation: function () { //fa effettivamente cambiare forma
        if (this.timing === "sustained") {
          let revertPossibility = getRevertPossibility();
          // Updateshape è una helper function: non deve essere chiamata direttamente ma 
          // tramite domToMutation, altrimenti non viene registrato che il numero di 
          // inputs è stato modificato
          if (revertPossibility) {
            this.updateShape_(revertPossibility);
          }
        }
      },

      updateShape_: function (passedValue) {
        if (passedValue === "add") {
          this.appendDummyInput("ACTION_REVERT")
            .appendField("What to do when the condition ends?")
            .appendField(new Blockly.FieldDropdown([["Restore the previous device state", "revert"], ["Do not restore", "keep"]]), "revert");
        }
        else if (passedValue === "remove") {
          let input = this.getInput("ACTION_REVERT");
          //block.setTooltip('The status of this device will be reverted when the condition will not be valid anymore');
          if (input) {
            this.removeInput("ACTION_REVERT");
          }
        }
      }
    };

    //Extensions.createAndDispose(Blockly.Blocks[leafData]);

    Blockly.JavaScript[blockName] = function (block) {
      var code = "";
      return code;
    };
  }

  /**
   * Stesso di createStandardTrigger per trigger multipli come relativePosition
   * @param {*} block 
   * @param {*} name 
   * @param {*} parentName 
   * @param {*} leafData 
   */
  function createMultipleTrigger(block, passedLeafData, name, parentName, checkbox) {
    const leafData = passedLeafData;
    let xPath = (leafData.xPath ? leafData.xPath : "xPath missing!!");
    block.name = name;
    block.blockType = "trigger";
    block.isTriggerArray = true;
    block.appendValueInput("TRIGGER_TYPE");
    //.appendField("Trigger type:");
    let dimensionId = "" + leafData.dimensionId;
    //let dimensionId = "" + leafData.categoryDimensionId; // ??????????

    block.appendDummyInput("BLOCK_HEADER")
      .appendField(new Blockly.FieldLabel(name, "block-name"))
      .appendField(name, "displayed_name")
      .appendField(leafData.realName, "real_name")
      .appendField(parentName, "parent_name")
      .appendField(leafData.xPath, "xPath")
      .appendField(dimensionId, "dimensionId")
      .appendField(leafData.type, "type")
      .appendField("", "EVENT_CONDITION")
      .appendField("", "value")
      .appendField("", "actualDataValue");

    block.getField("displayed_name").setVisible(false);
    block.getField("real_name").setVisible(false);
    block.getField("parent_name").setVisible(false);
    block.getField("xPath").setVisible(false);
    block.getField("dimensionId").setVisible(false);
    block.getField("type").setVisible(false);
    block.getField("value").setVisible(false);
    block.getField("actualDataValue").setVisible(false);
    //"start" : "#069975",
    //"stop" : "#065699"
    //.appendField(new Blockly.FieldDropdown([["SELECT","select"], ["when event","EVENT"], ["if condition","CONDITION"]]), "TRIGGER_TYPE");
    block.setColour('#065699');

    block.setInputsInline(true);
    block.setPreviousStatement(true, null);
    block.setNextStatement(true, null);
    block.setHelpUrl('');

    if (leafData.description) {
      block.setTooltip(leafData.description);
    }
    else {
      block.setTooltip(leafData.displayedName);
    }


    if (leafData.realName === "typeOfProximity") {
      console.log("relative position!!");
      console.log(leafData);
      let valuesArray = [];
      for (let select in leafData.possibleValues) {
        valuesArray.push([leafData.possibleValues[select], select]);
      }
      block.appendDummyInput("TRIGGER_INPUT")
        //.setCheck(null)

        .appendField(new Blockly.FieldDropdown(valuesArray), "TRIGGER_OP")
        .appendField(new Blockly.FieldDropdown([["house", "HOUSE"], ["entrance", "ENTRANCE"], ["kitchen", "KITCHEN"], ["bedroom", "BEDROOM"], ["bathroom", "BATHROOM"], ["living room", "LIVINGROOM"], ["corridor", "CORRIDOR"]]), "TRIGGER_VALUE")
      /*
      block.appendDummyInput("CHOOSE_FROM_SELECT")
        //.setCheck(null)
        .appendField(new Blockly.FieldDropdown(valuesArray), "SELECT_FIELD_VALUE");
      */
      block.appendDummyInput()
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');

    }

  }

  /**
   * Aggiunge al blocco tutti gli elementi per definirlo
   * @param {*} block 
   * @param {*} name 
   * @param {*} parentName 
   * @param {*} leafData 
   */
  function createStandardTrigger(block, passedLeafData, name, parentName, checkbox) {
    const leafData = passedLeafData;
    //console.log(passedLeafData);
    
    let xPath = (leafData.xPath ? leafData.xPath : "xPath missing!!");
    //Object.freeze(leafData);
    //console.log(leafData);
    //console.log(name);
    //console.log(parentName);
    block.name = name;
    block.isTrigger = true;
    block.blockType = "trigger";
    block.appendValueInput("TRIGGER_TYPE");
    //.appendField("Trigger type:");



    //let dimensionId = "" + leafData.categoryDimensionId; ???????
    let dimensionId = "" + leafData.dimensionId; 
    //console.log(dimensionId);



    block.appendDummyInput("BLOCK_HEADER")
      .appendField(new Blockly.FieldLabel(name, "block-name"))
      .appendField(name, "displayed_name")
      .appendField(leafData.realName, "real_name")
      .appendField(parentName, "parent_name")
      .appendField(leafData.xPath, "xPath")
      .appendField(dimensionId, "dimensionId")
      .appendField(leafData.type, "type")
      .appendField("", "EVENT_CONDITION")
      .appendField("", "value")
      .appendField("", "actualDataValue");

    block.getField("displayed_name").setVisible(false);
    block.getField("real_name").setVisible(false);
    block.getField("parent_name").setVisible(false);
    block.getField("xPath").setVisible(false);
    block.getField("dimensionId").setVisible(false);
    block.getField("type").setVisible(false);
    block.getField("value").setVisible(false);
    block.getField("actualDataValue").setVisible(false);

    //.appendField(new Blockly.FieldDropdown([["SELECT","select"], ["when event","EVENT"], ["if condition","CONDITION"]]), "TRIGGER_TYPE");
    block.setColour('#065699');
    block.setInputsInline(true);
    block.setPreviousStatement(true, null);
    block.setNextStatement(true, null);
    block.setHelpUrl('');

    if (leafData.description) {
      block.setTooltip(leafData.description);
    }
    else {
      block.setTooltip(leafData.displayedName);
    }

    if (leafData.realName === "medicationName") {
      block.getField("displayed_name").setVisible(false);
      block.appendDummyInput()
        .appendField(new Blockly.FieldTextInput("Medicine name"), "MEDICINE_NAME")
        .appendField("taken", "MEDICINE_TAKEN");
    }

    if (leafData.realName === "speechRecognition") {
      block.getField("displayed_name").setVisible(false);
      block.appendDummyInput()
        .appendField(new Blockly.FieldTextInput("speech"), "SPEECH")
      //.appendField("taken", "MEDICINE_TAKEN");
    }

    if (findInBooleanTriggers(leafData.realName)) {
      block.appendDummyInput()
        .appendField("True")
    };

    if (leafData.possibleValues) {
      let valuesArray = [];
      for (let select in leafData.possibleValues) {
        valuesArray.push([leafData.possibleValues[select], select]);
      }
      block.appendDummyInput("TRIGGER_INPUT")
        //.setCheck(null)
        .appendField(new Blockly.FieldDropdown(valuesArray), "TRIGGER_VALUE");
      /*
      block.appendDummyInput("CHOOSE_FROM_SELECT")
        //.setCheck(null)
        .appendField(new Blockly.FieldDropdown(valuesArray), "SELECT_FIELD_VALUE");
      */
      // TODO mettere if block.type===noise aggiungi "db", etc per altre unità di misura
      block.appendDummyInput()
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');
    }

    else if (leafData.type === "INTEGER" || leafData.type === "DOUBLE") {
      block.appendDummyInput("TRIGGER_INPUT")
        //.setCheck(null)

        .appendField(new Blockly.FieldDropdown([["uguale a", "EQUAL"], ["diverso da", "DIFFERENT"], ["meno di", "LESSTHEN"], ["più di", "MORETHEN"]]), "SELECT_FIELD_VALUE")
        //.appendField(new Blockly.FieldDropdown([["=", "EQUAL"], ["<", "LESSTHEN"], [">", "MORETHEN"]]), "TRIGGER_OP")
        //block.appendDummyInput("VALUE")
        //.setCheck("Number")

        .appendField(new Blockly.FieldNumber(0), "TRIGGER_VALUE");

      block.appendDummyInput()
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');
    }

    else if (leafData.type === "BOOLEAN" || leafData.type === "DOUBLE") {
      block.appendDummyInput("TRIGGER_INPUT")
      //.setCheck(null)

      // .appendField("is ")
      //.appendField(new Blockly.FieldDropdown([["true", "TRUE"], ["false", "FALSE"]]), "TRIGGER_VALUE");

      block.appendDummyInput()
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');
    }

    else if (leafData.type === "TIME") {
      block.getField("displayed_name").setText("Time between: ");
      //console.log(leafData);
      block.appendDummyInput("TIME_OPERATOR")
        .appendField(new Blockly.FieldDropdown([["uguale a", "EQUAL"], ["diverso da", "DIFFERENT"], ["meno di", "LESSTHEN"], ["più di", "MORETHEN"]]), "SELECT_FIELD_VALUE")
        //.appendField(new Blockly.FieldDropdown([["equal", "EQUAL"], ["different from", "DIFFERENT"], ["less then", "LESSTHEN"], ["more then", "MORETHEN"], ]), "TRIGGER_OP") //Ok fare così perché non ci sono i possibleValues
      //block.appendDummyInput("START_TIME_LABEL")
       // .appendField("start: ")
      block.appendDummyInput("START_TIME_HOUR")
        .appendField(new Blockly.FieldDropdown([["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"],
        ["04", "04"], ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"], ["10", "10"],
        ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"], ["15", "15"], ["16", "16"], ["17", "17"],
        ["18", "18"], ["19", "19"], ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"]]), "START_HOURS");
      block.appendDummyInput("START_TIME_MIN")
        .appendField(new Blockly.FieldDropdown([["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"], ["04", "04"],
        ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"],
        ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"],
        ["15", "15"], ["16", "16"], ["17", "17"], ["18", "18"], ["19", "19"],
        ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"], ["24", "24"],
        ["25", "25"], ["26", "26"], ["27", "27"], ["28", "28"], ["29", "29"],
        ["30", "30"], ["31", "31"], ["32", "32"], ["33", "33"], ["34", "34"],
        ["35", "35"], ["36", "36"], ["37", "37"], ["38", "38"], ["39", "39"],
        ["40", "40"], ["41", "41"], ["42", "42"], ["43", "43"], ["44", "44"],
        ["45", "45"], ["46", "46"], ["47", "47"], ["48", "48"], ["49", "49"],
        ["50", "50"], ["51", "51"], ["52", "52"], ["53", "53"], ["54", "54"],
        ["55", "55"], ["56", "56"], ["57", "57"], ["58", "58"], ["59", "59"]
        ]), "START_MINS");

      block.appendDummyInput("NOT_INPUT")
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');
      /*
         block.appendDummyInput("START_TIME")
         .appendField("Start time")
         .appendField(new Blockly.FieldNumber(12, 0, 24), "START_HOUR")
         .appendField(":")
         .appendField(new Blockly.FieldNumber(30, 0, 60), "START_MIN");
       block.appendDummyInput("END_TIME")
         .appendField("End time")
         .appendField(new Blockly.FieldNumber(12, 0, 24), "END_HOUR")
         .appendField(":")
         .appendField(new Blockly.FieldNumber(30, 0, 60), "END_MIN");
  */
    }

    else if (leafData.type === "DATE") {
      block.appendDummyInput("DATE")
        .appendField(new Blockly.FieldDate());
      block.appendDummyInput()
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');
      //block.appendValueInput("DATE")
      // .setCheck(null)
      // .appendField("Date", "DATE");
    }
    else {
      block.appendDummyInput()
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');
    }
  }


  function translateDimensionId(dimId){
    let dimIdTable = getDimIdTable();
    let catName = dimIdTable[dimId]; 
    if(catName){
      return catName.displayedName;
    }
    return "";
  }

  /**
   * Crea l'XML di un trigger (nodo foglia), assegna a 
   * Blockly.JavaScript[leafData.realName] il js da chiamare quando viene aggiunto
   * il blocco.
   * @param {*} leafData 
   */
  function createTriggerDinamically(leafData, blockName) {
    const myLeafData = leafData;
    //Object.freeze(myLeafData);
    leafData.categoryDisplayedName = translateDimensionId(leafData.dimensionId);
    //console.log(leafData.categoryDisplayedName);
    Blockly.Blocks[blockName] = {
      init: function () {
        let checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
          this.sourceBlock_.updateShape_(pxchecked);
        });
        const elementName = leafData.displayedName;
        let parentName = "";
        if (leafData.categoryDisplayedName) {
          parentName = leafData.categoryDisplayedName;
        }
        const name = (parentName !== "" ? parentName + " - " + elementName : elementName);
        if (myLeafData.realName === "typeOfProximity") {
          createMultipleTrigger(this, myLeafData, name, parentName, checkbox);
        } else {
          createStandardTrigger(this, myLeafData, name, parentName, checkbox);
        }
      },

      mutationToDom: function () {
        var container = document.createElement('mutation');
        var whenInput = (this.getFieldValue('not_input') == 'TRUE');
        container.setAttribute('not_input', whenInput);
        // prendere anche se c'è già un input statemnt? 
        return container;
      },
      domToMutation: function (xmlElement) {
        let hasNotInput = (xmlElement.getAttribute('not_input') == 'true');
        console.log("CHANGING FORM!");
        console.log(xmlElement);
        console.log(xmlElement.getAttribute('not_input'));
        // Updateshape è una helper function: non deve essere chiamata direttamente ma 
        // tramite domToMutation, altrimenti non viene registrato che il numero di 
        // inputs è stato modificato
        this.updateShape_(hasNotInput);
      },

      updateShape_: function (passedValue) {
        // Aggiunge o rimuove i value inputs
        if (passedValue) {
          //se non ha giù un not input statement
          //if (this.getInput('not_input_statement')) {
          this.appendStatementInput('not_input_statement');
        }
        else {
          if (this.getInput('not_input_statement')) {
            this.removeInput('not_input_statement');
          }
        }
      }
    };

    Blockly.JavaScript[blockName] = function (block) {
      return "";
    };

  }


  /**
   *  Ridisegna la toolbox con l'albero xml di trigger e azioni caricato
   */
  function rebuildToolbox() {
    //<block type="after_dynamic"></block>
    let newTree =
      `
  <xml id="toolbox" style="display: none">
  <category colour="0" name="Rule block">
    <block type="rule"></block>
  </category>
  <sep gap = "8"></sep>
  <category id="trigger_list" colour="#065699" name="Trigger list">   
    ${triggersXml}
  </category>
    <sep gap = "8"></sep>
  <category name="Trigger operators" colour="210">
      <block type="and"></block>
      <block type="or"></block>
  </category>
  <sep gap = "8"></sep>
  <category name="Action list" colour="#069975">
    ${actionsXml}
  </category>
  <sep gap = "8"></sep>
</xml>
` ;
    workspace.updateToolbox(newTree);
    //console.log("UPDATING XML!");
    workspace.toolbox_.refreshSelection();
    document.getElementById('toolbox').innerHTML = newTree;
    //console.log(document.getElementById('toolbox'));
  }

  /**
   * Crea ricorsivamente l'albero delle azioni. Funziona come la funct per i 
   * trigger, ma non c'è la parte relativa alle categorie top level.
   * @param {*} data 
   * @param {*} xml 
   */
  function loadActionsToolboxRecursive(data, xml) {
    if (xml === undefined) {
      xml = ` `;
    }

    if (data.length > 0) {
      data.forEach(function (e) {
        if (e.nodes !== undefined && e.nodes.length > 0) { //middle level category
          actionsXml += `
            <category colour="#069975" name="${e.displayedName}">
          `;

          loadActionsToolboxRecursive(e.nodes, xml);
          actionsXml += `
            </category>
          `;
        }
        else if (e.attributes !== undefined && e.attributes.length > 0) { //terminal leaf      
          const categoryName = e.displayedName;
          const categoryRealName = e.realName;
          actionsXml += `
           <category colour="#069975" name="${e.displayedName}">
          `;
          for (let i = 0; i < e.attributes.length; i++) {
            let blockName = categoryRealName + "-" + e.attributes[i].realName;
            createActionDinamically(e.attributes[i], blockName, categoryName);
            //se non fa parte della lista, disegna normalmente tutti gli
            //attributi come nodi foglia
            if (multipleActions.indexOf(e.realName) === -1) {
              actionList.push(blockName);
              const myInfo = {
                fullName: blockName,
                xPath: e.attributes[i].xPath ? e.attributes[i].xPath : "none",
                type: e.attributes[i].type,
                possibleValues: e.attributes[i].possibleValues ? e.attributes[i].possibleValues : "none",
                categoryName: categoryName,
                realName: e.attributes[i].realName
              };
              actionCompleteInfo[blockName] = myInfo;
              actionsXml += ` 
              <block category="${categoryName}" type="${blockName}"></block>
            `;

            }
            //se fa parte della lista, disegna solo il primo attributo
            else {
              if (i === 0) {
                actionList.push(blockName);
                actionList.push(blockName);
                const myInfo = {
                  fullName: blockName,
                xPath: e.attributes[i].xPath ? e.attributes[i].xPath : "none",
                type: e.attributes[i].type,
                possibleValues: e.attributes[i].possibleValues ? e.attributes[i].possibleValues : "none",
                  categoryName: categoryName,
                  realName: e.attributes[i].realName
                };
              actionCompleteInfo[blockName] = myInfo;
                actionsXml += ` 
                <block category="${categoryName}" type="${blockName}"></block>
              `;
              }
              /*
              else {
                actionsXml += ` 
                <block type="${e.attributes[i].realName}" style.display = 'none'></block>
              `
              }
              */
            }
          }
          actionsXml += `
            </category>
          `;
        }
      });
    }
  }

  /**
   * replace unsafe chars
   * @param {*} unsafe 
   */
  function escapeXml(unsafe) {
    let result;
    try {
      result = unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
        }
      });
      return result;
    }
    catch (e) {
      console.log(e);
      console.log(unsafe);
    }
  }

  /**
   * 
   * @param {*} data 
   */
  function drawAttribute(data) {
    //console.log(data);
    const categoryName = escapeXml(data.englishDisplayedName);
    const categoryRealName = escapeXml(data.realName);
    triggersXml += `
          <category colour="#065699" name="${categoryName}">
        `;
    for (let i = 0; i < data.attributes.length; i++) {
      let blockName = data.attributes[i].dimensionId + "#" + escapeXml(data.attributes[i].xPath);
      //let blockName = categoryRealName + "-" + escapeXml(data.attributes[i].realName);
      createTriggerDinamically(data.attributes[i], blockName);
      //se non fa parte della lista, disegna normalmente tutti gli
      //attributi come nodi foglia
      if (multipleTriggers.indexOf(data.realName) === -1) {
        triggersXml += ` 
              <block category = "${categoryName}" type="${blockName}" type2="${escapeXml(data.attributes[i].realName)}"></block>
            `;
        triggerList.push(blockName);
        const myInfo = {
          fullName: blockName,
          xPath: data.attributes[i].xPath,
          dimensionId: data.attributes[i].dimensionId,
          type: data.attributes[i].type,
          possibleValues: data.attributes[i].type === "ENUM" ? data.attributes[i].possibleValues : "none",
          categoryName: categoryName,
          realName: escapeXml(data.attributes[i].realName)
        };
        triggerCompleteInfo[blockName] = myInfo;
        //triggerList.push(data.attributes[i].realName);
      }
      //se fa parte della lista, disegna solo il primo attributo
      else {
        if (i === 0) {
          triggersXml += ` 
                <block category = "${categoryName}" type="${blockName}" type2="${escapeXml(data.attributes[i].realName)}"></block>
              `;
          triggerList.push(blockName);
          const myInfo = {
            fullName: blockName,
            xPath: data.attributes[i].xPath,
            dimensionId: data.attributes[i].dimensionId,
            type: data.attributes[i].type,
            possibleValues: data.attributes[i].type === "ENUM" ? data.attributes[i].possibleValues : "none",
            categoryName: categoryName,
            realName: escapeXml(data.attributes[i].realName)
          };
        triggerCompleteInfo[blockName] = myInfo;
          //triggerCompleteInfo.push(myInfo);
          //triggerList.push(data.attributes[i].realName);
        }

      }
      //triggersXml += ` 
      //  <block type="${data.attributes[i].realName}"></block>
      //`;
    }

    triggersXml += `
          </category>
        `;
  }

  /**
   * 
   * @param {*} data 
   */
  function drawAttributeWhenNodesArePresent(data) {
    for (let i = 0; i < data.attributes.length; i++) {

    const categoryName = escapeXml(data.attributes[i].englishDisplayedName);
    const categoryRealName = escapeXml(data.attributes[i].realName);
    triggersXml += `
          <category colour="#065699" name="${categoryName}">
        `;
      let blockName = categoryRealName + "-" + escapeXml(data.attributes[i].realName);
      createTriggerDinamically(data.attributes[i], blockName);
      //se non fa parte della lista, disegna normalmente tutti gli
      //attributi come nodi foglia
      if (multipleTriggers.indexOf(data.realName) === -1) {
        triggersXml += ` 
              <block category = "${categoryName}" type="${blockName}" type2="${escapeXml(data.attributes[i].realName)}"></block>
            `;
        triggerList.push(blockName);
        const myInfo = {
          fullName: blockName,
            xPath: data.attributes[i].xPath,
            dimensionId: data.attributes[i].dimensionId,
            type: data.attributes[i].type,
            possibleValues: data.attributes[i].type === "ENUM" ? data.attributes[i].possibleValues : "none",
          categoryName: categoryName,
          realName: escapeXml(data.attributes[i].realName)
        };
        triggerCompleteInfo[blockName] = myInfo;
        //triggerList.push(data.attributes[i].realName);
      }
      //se fa parte della lista, disegna solo il primo attributo
      else {
        if (i === 0) {
          triggersXml += ` 
                <block category = "${categoryName}" type="${blockName}" type2="${escapeXml(data.attributes[i].realName)}"></block>
              `;
          triggerList.push(blockName);
          const myInfo = {
            fullName: blockName,
            xPath: data.attributes[i].xPath,
            dimensionId: data.attributes[i].dimensionId,
            type: data.attributes[i].type,
            possibleValues: data.attributes[i].type === "ENUM" ? data.attributes[i].possibleValues : "none",
            categoryName: categoryName,
            realName: escapeXml(data.attributes[i].realName)
          };
        triggerCompleteInfo[blockName] = myInfo;
          //triggerList.push(data.attributes[i].realName);
        }

      }
      //triggersXml += ` 
    triggersXml += `
          </category>
        `;
      //  <block type="${data.attributes[i].realName}"></block>
      //`;
    }

  }
  /**
   * Crea ricorsivamente l'albero dei trigger
   * @param {*} data 
   * @param {*} xml 
   */
  function loadTriggersToolboxRecursive(data, xml) {
    if (xml === undefined) {
      xml = ` `;

    }
    if (!Array.isArray(data)) {
      if (data.englishDisplayedName === undefined) {
        //top level category
        for (let cat in data) {
          triggersXml += `
            <category colour="#065699" name="${escapeXml(cat)}">
          `;
          loadTriggersToolboxRecursive(data[cat], xml);
          triggersXml += `
            </category>
          `;
        }
      }
      // a "mixed" category. 
      else if (data.nodes !== undefined && data.attributes !== undefined) {
        console.log("MIX");
        console.log(data);
         triggersXml += `
           <category colour="#065699" name="${escapeXml(data.englishDisplayedName)}">
         `;
 
         drawAttributeWhenNodesArePresent(data);
         loadTriggersToolboxRecursive(data.nodes, xml);
         triggersXml += `
           </category>
         `;
      }
      else if (data.nodes !== undefined) {
        //middle level category
        triggersXml += `
          <category colour="#065699" name="${escapeXml(data.englishDisplayedName)}">
        `;

        loadTriggersToolboxRecursive(data.nodes, xml);
        triggersXml += `
          </category>
        `;
      }
      else if (data.attributes !== undefined) {
        //terminal leaf     
        drawAttribute(data);
      }
    }
    else {
      data.forEach(function (e) { //chiama ricorsivamente su ogni elemento dell'array
        loadTriggersToolboxRecursive(e, xml);
      });
    }
  }


  goog.require('Blockly.FieldDate');
  let workspace = Blockly.inject('main-workspace-div',
    {
      //setup e iniezione della toolbox
      toolbox: document.getElementById('toolbox'),
      zoom: {
        controls: true,
        wheel: false,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      move: {
        scrollbars: true,
        drag: false,
        wheel: true
      },
      toolboxPosition: 'left',
      horizontalLayout: false,
      scrollbars: true,
      renderer: 'zelos'
    });

  let suggestionWorkspace = Blockly.inject('suggestion-workspace-div',
    {
      //setup e iniezione della toolbox
      zoom: {
        controls: true,
        wheel: false,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      },
      grid: {
        spacing: 20,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      move: {
        scrollbars: true,
        drag: false,
        wheel: true
      },
      horizontalLayout: false,
      scrollbars: true
    });

  // Initial block injection
  Blockly.Xml.domToWorkspace(document.getElementById('startBlocks'),
    workspace);

  // Listeners registration

  // Main workspace listeners 
  // Listeners that manage the text suggestions in the lower part of the screen 
  workspace.addChangeListener(Listeners.addedEventToWorkspace); // Used to check if the "event-event" condition is verified
  workspace.addChangeListener(Listeners.addedTriggerToWorkspace);
  workspace.addChangeListener(Listeners.addedActionToWorkspace);
  workspace.addChangeListener(Listeners.addedNegationToWorkspace);
  workspace.addChangeListener(Listeners.addedTriggerOpToWorkspace);
  workspace.addChangeListener(Listeners.addedActionOpToWorkspace);

  workspace.addChangeListener(Listeners.addedBlockToWorkspace);
  workspace.addChangeListener(Listeners.removedBlockFromWorkspace);

  // Listeners that manage the creation and the click on  blocks, to show/hide the available operators for that block
  // nly done for triggers. 
  workspace.addChangeListener(Listeners.toolboxListenerLeftClick);
  workspace.addChangeListener(Listeners.toolboxListenerCreated);

  // Other misc listeners
  workspace.addChangeListener(Listeners.notBlockUpdate); // Adds the "not" block
  workspace.addChangeListener(Listeners.removeUnusedNotBlocks); //remove the "not" block
  workspace.addChangeListener(Listeners.triggerTypeListenerChild);
  workspace.addChangeListener(Listeners.blockDisconnectListener);
  workspace.addChangeListener(Listeners.triggerListener);
  workspace.addChangeListener(Listeners.eventConditionBlocksLeftClick);
  workspace.addChangeListener(Listeners.parallelBranchesUpdateNumber);
  //workspace.addChangeListener(Listeners.waitToParallelListener);
  workspace.addChangeListener(Listeners.updateCodeListener);
  //  workspace.addChangeListener(Listeners.blockDocsListener);
  workspace.addChangeListener(Listeners.ruleTypeListener);
  workspace.addChangeListener(Listeners.autoCheckRule);
  //workspace.addChangeListener(Listeners.triggerTypeListenerParent); //listener for enable the auto placing of the 
  //selected block from toolbox. Works if clicked, crash if dragged

  //suggestion workspace listeners
  suggestionWorkspace.addChangeListener(Listeners.secondaryWorkspaceLeftClick);

  myWorkspace = workspace;
  mySuggestionWorkspace = suggestionWorkspace;
})();

/**
 * Restituisce il primo elemento inserito nel blocco regola se è un trigger, 
 * altrimenti non resituisce nulla
 */
export function getFirstTrigger() {
  //query selector per prendere il primo blocco rule
  let rule_xml = Blockly.Xml.workspaceToDom(myWorkspace, false);
  let triggersContainer = rule_xml.getAttribute("TRIGGERS");
  let allStatements = rule_xml.querySelectorAll('statement');
  const triggerInfo = getTriggerInfo();
  if (allStatements[0] && typeof allStatements[0].children !== "undefined") {
    let type = allStatements[0].children[0].getAttribute("type");
    let singleEntry = triggerInfo[type];
    /* now triggerInfo is an obj
    let singleEntry = triggerInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
    */
    if (singleEntry) {
      return singleEntry.fullName;
    }
  }
}

/**
 * Get the list of block elements in the workspace, sort them
 * @param {*} blocks 
 * @param {*} triggerInfo 
 * @param {*} actionInfo 
 */
function getSortedBlocks(blocks, triggerInfo = getTriggerInfo(), actionInfo = getActionInfo()) {
  let pulledOutTriggers = [];
  let pulledOutActions = [];
  let pulledOutTriggersWithId = [];
  let pulledOutActionsWithId = [];
  let triggers = [];
  let actions = [];
  let triggersWithId = [];
  let actionsWithId = [];
  let ruleBlockIndex = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === "rule") {
      ruleBlockIndex = i;
      break;
    }
  }
  if (ruleBlockIndex === -1) {
    return blocks;
  }
  for (let i = 0; i < ruleBlockIndex; i++) {
    let type = blocks[i].type;
    let triggerEntry = triggerInfo[type];
    /* //now triggerInfo is an obj
    let triggerEntry = triggerInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
    */
    if (triggerEntry) {
      pulledOutTriggers.push(triggerEntry.fullName);
      pulledOutTriggersWithId.push({ name: triggerEntry.fullName, id: blocks[i].id });
      continue;
    }
    let actionEntry = actionInfo[type];
    /* // now actionInfo is an obj
    let actionEntry = actionInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
    */
    if (actionEntry) {
      pulledOutActions.push(actionEntry.fullName);
      pulledOutActionsWithId.push({ name: actionEntry.fullName, id: blocks[i].id });
    }
  }
  for (let i = ruleBlockIndex; i < blocks.length; i++) {
    let type = blocks[i].type;
    let triggerEntry = triggerInfo[type];
    /* // now triggerInfo is a obj
    let triggerEntry = triggerInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
      */
    if (triggerEntry) {
      triggers.push(triggerEntry.fullName);
      triggersWithId.push({ name: triggerEntry.fullName, id: blocks[i].id });
      continue;
    }
    let actionEntry = actionInfo[type];
    /* // now actionInfo is an obj
    let actionEntry = actionInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
    */
    if (actionEntry) {
      actions.push(actionEntry.fullName);
      actionsWithId.push({ name: actionEntry.fullName, id: blocks[i].id });
    }
  }
  let concatTriggers = triggers.concat(pulledOutTriggers);
  let concatActions = actions.concat(pulledOutActions);
  let concatElements = concatTriggers.concat(concatActions);
  let concatTriggersWithId = triggersWithId.concat(pulledOutTriggersWithId);
  let concatActionsWithId = actionsWithId.concat(pulledOutActionsWithId);
  let concatElementsWithId = concatTriggersWithId.concat(concatActionsWithId);
  let elements = {
    triggers: concatTriggers,
    actions: concatActions,
    triggersWithId: concatTriggersWithId,
    actionsWithId: concatActionsWithId,
    elements: concatElements,
    elementsWithId: concatElementsWithId
  }
  console.log(elements);
  return elements;
}

/**
 * get the rule sequence
 */
export function getRuleSequence() {
  return ruleSequence;
}


/**
 * Gets all "trigger" and "action" elements in the workspace. Try to sort them 
 * moving out the trigger and action placed before the rule element, and 
 * placing them at the end of the trigger/action sequence.
 */
export function setRuleSequence() {
  let ws = getWorkspace();
  //ottiene tutti i blocchi dal workspace, ordinati secondo la posizione
  let blocks = ws.getAllBlocks(true);
  const triggerInfo = getTriggerInfo();
  const actionInfo = getActionInfo();
  let sortedBlocks = getSortedBlocks(blocks, triggerInfo, actionInfo);
  //return sortedBlocks;
  ruleSequence = sortedBlocks;
}

/**
 * 
 */
export function resetRuleSequence() {
  let sequence = {
    triggers: [],
    actions: [],
    elements: [],
    elementsWithId: []
  }
  ruleSequence = sequence;
}

/**
 * 
 */
export function resetLastBlock() {
  lastBlock = undefined;
}

/**
 * Updates the block and the XML of a trigger, when the negation is added via 
 * textbox 
 * @param {*} block 
 */
export function addNegationToBlock(block){
  console.log("ADD NEGATION TO BLOCK")
  let xml = blockToDom(block); //when updating a block "from the outside" (not using listeners..), you need to update
  xml.setAttribute('not_input', true); //also the xml of the block
  block.domToMutation(xml);
  let inputField = block.getField("not_input");
  inputField.setValue(true);
  block.render();
}

/**
 * 
 * @param {*} block 
 * @param {*} operator 
 */
export function addOperatorToBlock(block, operator){
  let workspace = getWorkspace();
  let blockToAppend = workspace.newBlock(operator);
  blockToAppend.initSvg();
  blockToAppend.render();
  let blockConnection = block.nextConnection;
  let otherConnection = blockToAppend.previousConnection;
  blockConnection.connect(otherConnection);
}

/**
 * Funcitions linked to the textarea buttons. Adds the clicked button to the last
 * inserted / clicked block.  
 * @param {*} type 
 */
export function addTextareaOperatorToBlock(linkType){
    let lastBlock = getLastBlock();

    if (linkType === "and") {
        console.log("AND")
        addOperatorToBlock(lastBlock, linkType)
      }
      else if (linkType === "or") {
        addOperatorToBlock(lastBlock, linkType)
      }
      else if (linkType === "not") {
        addNegationToBlock(lastBlock);
      }
}     

/**
 * 
 * @param {*} linkType 
 */
/*
export function startRefineRule(linkType) {
  let lastBlock = getLastBlock();
  console.log(lastBlock);
  if (linkType === "and") {
    console.log("AND")
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations(); //which textarea?
    //ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "or") {
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations();
    //ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "not") {
    DomModifiers.addNegationToBlock(lastBlock);
    //errorMessages.afterNotMessage();
    //ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "rule") {
    errorMessages.startActionEditing();
    //ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "sequential") {
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations();
    //ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "parallel") {
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations();
    //ruleSuggestorManager(lastBlock, true, linkType);
  }
}
*/

/**
 * 
 */
export function getRuleSuggestorStatus() {
  return ruleSuggestorStatus;
}

/**
 * Extract elements in workspace, decide if fire a standard (only CPT) or a 
 * refined (CPT + Neural network) suggestion on the last rule element (trigger 
 * or action) inserted.  
 */
/*
export async function ruleSuggestorManager(lastBlock = getLastBlock(), refined = false, linkType) {
  console.log("RULE SUGGESTOR MANAGER");
  console.log(lastBlock.type);
  console.log(refined);
  let elementsInWorkspace = getRuleSequence();
  if (elementsInWorkspace.elements.length === 0) {
    errorMessages.suggestorErrorMessages("noElements");
    return;
  }
  if (recommendationType === "Step by step recommendations") {
    if (checkRecommendationConditions(lastBlock)) {
      if (refined && checkInTriggerInfoWithName(lastBlock.type)) {
        await BlockSuggestor.fireFullDataRec(lastBlock, "trigger", elementsInWorkspace.elements, linkType).then();
        textareaMessagesManager(lastBlock, linkType, "full");
        ruleSuggestorStatus = "full";
      }
      else if (refined && checkInActionInfoOnlyName(lastBlock.type)) {
        await BlockSuggestor.fireFullDataRec(lastBlock, "action", elementsInWorkspace.elements, linkType).then();
        textareaMessagesManager(lastBlock, linkType, "full");
        ruleSuggestorStatus = "full";
      }
      //fireOnlySequenceRec does not returns anything, but instead call the 
      //functs to modify the dom. A better pattern would be return the results
      //here, and then call the dom modifiers
      else if (checkInTriggerInfoWithName(lastBlock.type)) {
        BlockSuggestor.fireOnlySequenceRec(elementsInWorkspace.elements, "trigger", lastBlock);
        textareaMessagesManager(lastBlock, linkType, "onlySeq");
        ruleSuggestorStatus = "seq";
      }
      else if (checkInActionInfoOnlyName(lastBlock.type)) {
        BlockSuggestor.fireOnlySequenceRec(elementsInWorkspace.elements, "action", lastBlock);
        textareaMessagesManager(lastBlock, linkType, "onlySeq");
        ruleSuggestorStatus = "seq";
      }
      else {
        errorMessages.suggestorErrorMessages("noElements");
      }
    }
  }
  else if (recommendationType === "Full rule recommendations") {
    let topRecs = await BlockSuggestor.fireRecommendationForFullRule(elementsInWorkspace.elements, lastBlock).then();
    console.log("TOP Recs!!");
    console.log(topRecs);
    if (refined) {
      if (lastBlock.blockType === "trigger") {
        if (linkType === "not") {
          errorMessages.afterNotMessage();
        }
        else {
          errorMessages.afterTriggerOpMessage();
        }
      }
      else {
        errorMessages.afterActionOpMessage();
      }
    }
    else {
      if (lastBlock.blockType === "trigger") {
        errorMessages.afterTriggerMessage();
      }
      else {
        errorMessages.afterActionMessage();
      }
    }
    if (topRecs) {
      let rules = [];
      for (let i = 0; i < topRecs.length; i++) {
        let rule = await DB.getOneFromDB(topRecs[i].id).then();
        rules.push(rule);
      }
      console.log(rules);
      if (rules.length > 0) { //this check is already done when the CPT results are obtained
        DomModifiers.rulesToSuggestionWorkspace(rules);
        removeUnusedInputsFromSecondaryWorkspace();
      }
    }
    else if (recommendationType === "None") {
      // message.. todo
    }
    else {
      errorMessages.suggestorErrorMessages("noSuggestion")
    }
  }
}
*/

/**
 *  
 * @param {*} lastBlock 
 * @param {*} blockType 
 * @param {*} linkType 
 */
function textareaMessagesManager(lastBlock, linkType, recType) {
  /*
  if (recType === "onlySeq") {
    if (lastBlock.blockType === "trigger") {
      errorMessages.afterTriggerMessage();
    }
    else {
      errorMessages.afterActionMessage();
    }
  }
  else if (recType === "full") {
    if (linkType === "and" || linkType === "or") {
      errorMessages.afterTriggerOpMessage();
    }
    else if (linkType === "not") {
      errorMessages.afterNotMessage();
    }
    else if (linkType === "sequential" || linkType === "parallel") {
      errorMessages.afterActionOpMessage();
    }
    else if (linkType === "rule") {
      errorMessages.startActionEditing();
    }
  }
  */
}


/**
 * UNUSED
 * Estrae i blocchi dal workspace dei suggerimenti e li inserisce in quello
 * principale
 */
function suggestorDrop() {
  "use strict";
  let firstWorkspace = getWorkspace();
  let secondWorkspace = getSuggestionWorkspace();
  let allSuggestedBlocks = secondWorkspace.getAllBlocks();
  console.log("SUGGESTION LEN: ", allSuggestedBlocks.length);
  if (allSuggestedBlocks.length > 0) {
    let suggestedRuleXml = Blockly.Xml.workspaceToDom(secondWorkspace, false);
    Blockly.Xml.domToWorkspace(suggestedRuleXml, firstWorkspace);
    allSuggestedBlocks.forEach((e) => e.dispose());
    //let xml_str = rule[0].rule_xml_str;
    //let xmlDoc = new DOMParser().parseFromString(xml_str, "text/xml");
    //console.log(xmlDoc);
    //Blockly.Xml.domToWorkspace(xmlDoc.firstChild, workspace);
  }
  else {
    document.getElementById('textarea-alerts').innerHTML = "No suggestions to drop into main area!";
  }
}
const exportSuggestorDrop = suggestorDrop;
export { exportSuggestorDrop };


/**
 * UNUSED
 * Controlla la posizione di un blocco all'interno del flusso di blocchi nel
 * workspace, la restituisce come indice. 
 * @param {*} id 
 */
export function checkPositionInWorkspace(id) {
  "use strict";
  let position = 0;
  let ruleBlock = myWorkspace.getBlocksByType("rule", true);
  let children = ruleBlock[0].getChildren();
  children.forEach(function (e, i) {
    if (e.isTrigger) {
      if (e.id === id) {
        return position;
      }
      position++;
    }
  });
  return position;
}


/**
 * helper function, restituisce il workspace attuale
 */
export function getWorkspace() {
  return myWorkspace;
}

/**
 * Helper function
 */
export function getSuggestionWorkspace() {
  "use strict";
  return mySuggestionWorkspace;
}

/**
 * 
 */
export function exportWorkspace() {
  "use strict";
  let workspace = getWorkspace();
  let workspaceDom = Blockly.Xml.workspaceToDom(workspace, true);
  let pretty = Blockly.Xml.domToPrettyText(workspaceDom);
  let blob = new Blob([pretty], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "myRule.xml");
}

/**
 * 
 */
export async function exportAllRules() {
  "use strict";
  let user = getUserName();
  let allRulesForAnUser = await DB.getAllFromDBUserFullData(user).then();
  /* 
   let pretty = "";
   allRulesForAnUser.forEach((e) => {
     pretty += e.rule_obj_str;
     pretty += "\n\n\n\n";
   });
   let blob = new Blob([pretty], { type: "json;charset=utf-8" });
   saveAs(blob "myRules.json");
   */
  let allRulesObjs = [];
  allRulesForAnUser.forEach((e) => {
    let rule = JSON.parse(e.rule_obj_str);
    allRulesObjs.push(rule);
  });
  let dataStr = JSON.stringify(allRulesObjs);
  let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  saveAs(dataUri, "myRules.json");
}
/**
 * 
 */
export function newRule() {
  let workspace = getWorkspace();
  workspace.clear();
  let secondaryWorkspace = getSuggestionWorkspace();
  secondaryWorkspace.clear();
  DomModifiers.addRuleBlockToWorkspace(workspace);
  resetRuleSequence();
  resetLastBlock();
  errorMessages.startTriggerEditing();
}

/**
 * 
 */
export function extractChildRecursive(block) {
  "use strict";
  if (block.isTrigger || block.isTriggerArray || block.isAction) {
    ruleBlocksArr.push(block.type);
  }
  if (block.childBlocks_ && block.childBlocks_.length > 0) {
    for (let i = 0; i < block.childBlocks_.length; i++) {
      extractChildRecursive(block.childBlocks_[i]);
    }
  }
}

/**
 * Helper function
 */
export function getRuleBlocksArr() {
  "use strict";
  return ruleBlocksArr;
}

/**
 * 
 */
export function cleanRuleBlocksArr() {
  "use strict";
  ruleBlocksArr = [];
}

/**
 * Helper function
 */
export function getTriggerInfo() {
  "use strict";
  return triggerCompleteInfo;
}

/**
 * Helper function
 */
export function getActionInfo() {
  "use strict";
  return actionCompleteInfo;
}

/**
 * TODO: CONTROLLA SE FUNZIONA ANCORA
 * E' USATA PER JACCARD, QUINDI SI POTREBBE ANCHE ELIMINARE
 * Ottiene la categoria di un trigger
 * @param {*} triggerName 
 * @param {*} triggerInfo
 */
export function getTriggerCategory(triggerName) {
  "use strict";
  // per non contare più volte i trigger composti da relativePosition e pointOfInterest
  if (triggerName === "relativePosition-pointOfInterest") {
    return;
  }
  const triggerInfo = getTriggerInfo();
  const myData = triggerInfo.find(function (e) {
    return e.fullName === triggerName;
  });
  let myCategory;
  if (myData && myData.categoryName) {
    myCategory = myData.categoryName;
  }
  return myCategory;
}

/**
 * TODO: CONTROLLA SE FUNZIONA ANCORA ADESSO CHE triggerInfo è un obj!!
 * NON VIENE MAI USATA, SI POTREBBE ELIMINARE
 * Ottiene gli altri trigger con la stessa categoria
 * @param {*} myCategory 
 * @param {*} triggerInfo 
 */
export function getTriggerWithMyCategory(myCategory) {
  "use strict";
  const triggerInfo = getTriggerInfo();
  const triggersWithMyCategory = triggerInfo.filter(function (e) {
    return e.categoryName === myCategory;
  });
  //console.log(triggersWithMyCategory);
  let result = triggersWithMyCategory.map(function (e) {
    return e.fullName;
  });
  //console.log(result);
  return result;
}

/**
 * Ottiene dal dom l'elemento con classe "highlighted", restituisce la regola 
 * corrispondente dal DB
 */
export async function getHighlightedRule() {
  let highlightedRule = document.getElementsByClassName("highlight");
  let id;
  if (highlightedRule && highlightedRule.typeof !== "array") {
    let element = highlightedRule.item(0);
    id = element.getAttribute("rule_id");
  }
  if (id) {
    let rule = await DB.getOneFromDB(id).then();
    if (rule && rule.length === 1) {
      return (rule);
    }
  }
}

/**
 * helper function, restituisce il tipo del blocco passato
 * @param {*} block 
 */
export function getBlockType(block) {
  let parser = new DOMParser();
  let xmlDoc = parser.parseFromString(block, "text/xml");
  //console.log(xmlDoc);
  let blockType = xmlDoc.getElementsByTagName("block")[0].getAttribute("type");
  return blockType;
}

/**
 * Helper function, restituisce la lista dei trigger
 */
export function getTriggerList() {
  return triggerList;
}

/**
 * Helper function, restituisce la lista delle azioni
 */
export function getActionList() {
  return actionList;
}

/**
 * Helper function, sovrascrive la lista dei trigger con quella passata
 * @param {*} newTriggerList 
 */
export function setTriggerList(newTriggerList) {
  triggerList = newTriggerList;
}

/**
 * Helper function, sovrascrive la lista delle azioni con quella passata
 * @param {*} newActionList 
 */
export function setActionList(newActionList) {
  actionList = newActionList;
}



/**
 * Extension chiamata in custom-dialog.js quando durante la creazione di un
 * trigger viene selezionato il tipo "event". Crea il blocco event e lo collega
 * al trigger.
 * @param {*} blockId 
 */
export function eventSelected(blockId) {
  let block = myWorkspace.blockDB_[blockId];
  let connection = block.inputList.filter(e => {
    return e.name === "TRIGGER_TYPE";
  })
  var newBlock = myWorkspace.newBlock('event');
  newBlock.initSvg();
  newBlock.render();
  block.getInput("TRIGGER_TYPE").connection.connect(newBlock.outputConnection);
}

/**
 * Extension chiamata in custom-dialog.js quando durante la creazione di un 
 * trigger viene selezionato il tipo "condition". Crea il blocco condition e lo
 * collega al trigger.
 * @param {*} blockId 
 */
export function conditionSelected(blockId) {
  let block = myWorkspace.blockDB_[blockId];
  let connection = block.inputList.filter(e => {
    return e.name === "TRIGGER_TYPE";
  })

  var newBlock = myWorkspace.newBlock('condition');
  newBlock.initSvg();
  newBlock.render();
  block.getInput("TRIGGER_TYPE").connection.connect(newBlock.outputConnection);
}


/**
 * Extension chiamata in custom-dialog.js quando durante la creazione di un
 * trigger viene selezionato il tipo "event". Crea il blocco event e lo collega
 * al trigger.
 * @param {*} blockId 
 */
export function eventChanged(blockId) {
  let block = myWorkspace.blockDB_[blockId];
  let connection = block.inputList.filter(e => {
    return e.name === "TRIGGER_TYPE";
  })
  var newBlock = myWorkspace.newBlock('event');
  newBlock.initSvg();
  newBlock.render();
  block.getInput("TRIGGER_TYPE").connection.connect(newBlock.outputConnection);
}

/**
 * Extension chiamata in custom-dialog.js quando durante la creazione di un 
 * trigger viene selezionato il tipo "condition". Crea il blocco condition e lo
 * collega al trigger.
 * @param {*} blockId 
 */
export function conditionChanged(blockId) {
  let block = myWorkspace.blockDB_[blockId];
  let connection = block.inputList.filter(e => {
    return e.name === "TRIGGER_TYPE";
  })

  var newBlock = myWorkspace.newBlock('condition');
  newBlock.initSvg();
  newBlock.render();
  block.getInput("TRIGGER_TYPE").connection.connect(newBlock.outputConnection);
}

/**
 * Extension chiamata in custom-dialog.js quando durante la creazione di un
 * trigger viene selezionato il tipo "event". Aggiunge un dummy input chiamato
 * "EVENT" al trigger, forza un nuovo caricamento del workspace (altrimenti
 * l'aggiunta di un field non verrebbe catturata dal listener).
 * @param {*} blockId 
 */
export function eventSelectedAppendField(blockId) {
  let block = myWorkspace.blockDB_[blockId];
  block.triggerType = "event";
  block.getInput("TRIGGER_TYPE").appendField("when event")
    .appendField(new Blockly.FieldImage("../src/img/event.jpeg", 25, 25, "*"));
  block.appendDummyInput("EVENT")
    .setVisible(false);
  //block.getInput("BLOCK_HEADER").appendField("EVENT").setVisible(false);
  Extensions.forceWorkspaceReload();
}

/**
 * Extension chiamata in custom-dialog.js quando durante la creazione di un 
 * trigger viene selezionato il tipo "condition". Aggiunge un dummy input
 * chiamato "CONDITION" al trigger.
 * @param {*} blockId 
 */
export function conditionSelectedAppendField(blockId) {
  let block = myWorkspace.blockDB_[blockId];
  block.triggerType = "condition";
  block.getInput("TRIGGER_TYPE").appendField("if condition")
    .appendField(new Blockly.FieldImage("../src/img/condition.jpeg", 25, 25, "*"));
  block.appendDummyInput("CONDITION")
    .setVisible(false);
  //block.getInput("BLOCK_HEADER").appendField("CONDITION").setVisible(false);
  Extensions.forceWorkspaceReload();
}

/**
 * helper function
 */
export function getTriggerSupportBlocks() {
  return triggerSupportBlocks;
}

export function onSignIn(googleUser) {
  "use strict";
  var profile = googleUser.getBasicProfile();
  console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
  console.log('Name: ' + profile.getName());
  console.log('Image URL: ' + profile.getImageUrl());
  console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
}

/**
 * Controlli sulla correttezza della regola alla pressione del bottone
 * "check rule". Sono incrementali: prima controlla se il numero di blocchi 
 * regola è giusto, se ok controlla trigger, se ok controlla azioni. Usato
 * dal tasto checkRule e inoltre eseguito quando si prova a salvare una regola 
 */
export function checkRuleStructure() {
  let checkStatus = "OK";
  let onlyOneRuleStatus = checkOnlyOneRule();
  checkStatus = onlyOneRuleStatus;
  if (checkStatus === "OK") {
    let triggerSequenceStatus = checkTriggerSequence();
    checkStatus = triggerSequenceStatus;
  }
  if (checkStatus === "OK") {
    let actionSequenceStatus = checkActionSequence();
    checkStatus = actionSequenceStatus;
  }
  return checkStatus;
}

/**
 * TODO
 * Check if the combination of events/condition/actions is not unfeasible, 
 * i.e. not composed by a sequence of events in "AND" without any condition
 */
export function checkRuleMeaning() {
  return "";
  let onlyOneRuleStatus = checkOnlyOneRule();
  let result = "not checked";
  if (onlyOneRuleStatus === "OK") {
    result = checkEventsWithoutCondition();
  }
  return result;
}


/**
 * Controlla che sia presente solo un blocco rule
 */
function checkOnlyOneRule() {
  let workspace = getWorkspace();
  let ruleBlockCounter = 0;
  removeNonRenderedBlocks();
  for (let block in workspace.blockDB_) {
    if (workspace.blockDB_[block].type === "rule") {
      ruleBlockCounter++;
    }
  }
  if (ruleBlockCounter === 1) {
    return "OK";
  }
  else if (ruleBlockCounter === 0) {
    return "There must be one 'rule' block in workspace to carry out checking and saving!";
  }
  else {
    return "More than one 'rule' block: keep in the workspace just one block to carry out checking and saving";
  }
}

/**
 * TODO
 * @param {*} workspace 
 */
export function getNextViableBlockForAction(workspace = getWorkspace()) {
  for (let block in workspace.blockDB_) {
    if (workspace.blockDB_[block].type === "action_placeholder") {
      console.log(workspace.blockDB_[block]);
      if (!workspace.blockDB_[block].nextConnection.targetConnection) {
        return workspace.blockDB_[block];
      }
    }
  }
  for (let block in workspace.blockDB_) {
    if (checkIfAction(workspace.blockDB_[block])) {
      if (!workspace.blockDB_[block].nextConnection.targetConnection) {
        return workspace.blockDB_[block];
      }
    }
  }
  for (let block in workspace.blockDB_) {
    if (workspace.blockDB_[block].type === "parallel_dynamic") {
      if (!workspace.blockDB_[block].nextConnection.targetConnection) {
        return workspace.blockDB_[block];
      }
    }
  }
}


/**
 * Restituisce true o false se il blocco è di tipo azione 
 * @param {*} workspace 
 */
export function checkIfAction(block) {
  if (block.isAction || block.isActionArray) {
    return true;
  }
  return false;
}


/**
 * Restituisce true o false se il blocco passato è un trigger operator
 * @param {*} block 
 */
export function checkIfTriggerOperator(block) {
  if (block.type === "and" || block.type === "or") {
    return true;
  }
  return false;
}

/**
 * Restituisce il primo trigger che non ha blocchi successivi
 * @param {*} workspace 
 */
export function getTriggerWithNoNextConnection(workspace = getWorkspace()) {
  for (let block in workspace.blockDB_) {
    if (workspace.blockDB_[block].isTrigger || workspace.blockDB_[block].isTriggerArray) {
      if (!workspace.blockDB_[block].nextConnection.targetConnection) {
        return workspace.blockDB_[block];
      }
    }
  }
}


/**
 * Restituisce il primo blocco "operator" trovato che non abbia niente connesso
 */
export function getOperatorWithoutNextConn(workspace = getWorkspace()) {
  for (let block in workspace.blockDB_) {
    if (checkIfTriggerOperator(workspace.blockDB_[block])) {
      console.log("OPERATOR:");
      console.log(workspace.blockDB_[block]);
      if (!workspace.blockDB_[block].nextConnection.targetConnection) {
        console.log("RETURN OPERATOR")
        return workspace.blockDB_[block];
      }
    }
  }
}

/**
 * Cerca se il blocco regola ha figli di tipo azione o parallel_dynamic, restituisce
 * true o false
 * @param {*} ruleBlock 
 */
export function hasActionChild(ruleBlock = getRuleBlock()) { //ES6 default params
  let result;
  ruleBlock.inputList.forEach(element => { //i trigger non hanno un tipo unico: guardo se nella inputList hanno Trigger_type
    if (element.name === "ACTIONS") {
      !element.connection.targetConnection ? result = false : result = true;
    }
  });
  return result;
}

/**
 * Cerca se l'input "TRIGGERS" del blocco regola ha collegamenti, restituisce true
 * o false.
 * @param {*} ruleBlock
 */
export function hasTriggerChild(ruleBlock = getRuleBlock()) { //ES6 default params
  let result;
  ruleBlock.inputList.forEach(element => {
    if (element.name === "TRIGGERS") {
      !element.connection.targetConnection ? result = false : result = true;
    }
  });
  return result;
}

/**
 * Restituisce il primo blocco "rule" nel workspace
 * @param {*} workspace 
 * @example 
 */
export function getRuleBlock(workspace = getWorkspace()) { //ES6 default params
  for (let block in workspace.blockDB_) {
    if (workspace.blockDB_[block].type === "rule") {
      return workspace.blockDB_[block];
    }
  }
}

/**
 * TODO
 * Check that the trigger sequence does not contains events in "and" without 
 * any condition
 */
function checkEventsWithoutCondition() {
  return;
  let workspace = getWorkspace();
  let ruleBlock = getRuleBlock(workspace);
  let triggers = getAllTriggerInWorkspace();
}

/**
 * Controlla che la sequenza di trigger sia corretta
 */
function checkTriggerSequence() {
  let workspace = getWorkspace();
  let ruleBlock = getRuleBlock(workspace);
  if (ruleBlock) {
    console.log(ruleBlock);
    console.log("childblocks: ");
    console.log(ruleBlock.childBlocks_);
    let triggerInput = ruleBlock.getInput("TRIGGERS");
    //se esiste l'input
    if (triggerInput) {
      let mainBlockConnection = triggerInput.connection;
      //se non c'è niente collegato restituisco
      if (!mainBlockConnection.targetConnection) {
        return "No blocks connected to trigger input";
      }
      else {
        const targetBlock = mainBlockConnection.targetConnection.sourceBlock_;
        existsChildTrigger = false;
        checkAtLeastOneTrigger(targetBlock);
        if (!existsChildTrigger) {
          return "No trigger block connected to trigger input";
        }
        else {
          existsChildNonTrigger = false;
          checkTriggerChildren(targetBlock);
          console.log(existsChildNonTrigger);
          if (existsChildNonTrigger) {
            return "Trigger sequence contains a non trigger element";
          }
          inconsistentTriggerSequence = false;
          inconsistentTriggerMessage = "";
          checkTriggerSequenceConsistancy(targetBlock);
          if (inconsistentTriggerSequence) {
            return inconsistentTriggerMessage;
            //return "Trigger sequence is not valid";
          }
          return "OK";
        }
      }
    }
  }
}

/**
 * Controlla solo che ai blocchi sequential e parallel sia collegato un blocco
 * azione. Serve a evitare parallel nested: da rivedere se ci vuole cercare
 * altri problemi. 
 * @param {*} block 
 */
function checkActionSequenceConsistancy(block) {
  if (block.type === "parallel" || block.type === "sequential") {
    if (block.childBlocks_.length === 0) {
      inconsistentActionSequence = true;
      return;
    }
    else {
      let nextBlock = block.childBlocks_[0];
      const nextTargetConnection = nextBlock.nextConnection.targetConnection;
      if (nextTargetConnection) {
        const nextBlock = nextTargetConnection.sourceBlock_;
        checkActionSequenceConsistancy(nextBlock);
      }
    }
  }
  else {
    const nextTargetConnection = block.nextConnection.targetConnection;
    if (nextTargetConnection) {
      const nextBlock = nextTargetConnection.sourceBlock_;
      checkActionSequenceConsistancy(nextBlock);
    }
  }
}

/**
 * Controlla solo che ai blocchi parallel_dynamic sia collegato un blocco
 * azione. Serve a evitare parallel nested: da rivedere se ci vuole cercare
 * altri problemi. USARE SE SI USA IL BLOCCO PARALLEL_DYNAMIC: ALTRIMENTI 
 * NON SERVE
 * @param {*} block 
 */
function checkActionSequenceConsistancyParallel_dynamic(block) {
  if (block.type === "parallel_dynamic") {
    block.childBlocks_.forEach(function (e) {
      if (e.type === "action_placeholder") {
        const nextTargetConnection = e.nextConnection.targetConnection;
        if (nextTargetConnection) {
          const nextBlock = nextTargetConnection.sourceBlock_;
          if (checkInActionInfo(nextBlock)) {
            checkActionSequenceConsistancy(nextBlock);
          }
          else {
            inconsistentActionSequence = true;
          }
        }
      }
    });
  }
  else {
    const nextTargetConnection = block.nextConnection.targetConnection;
    if (nextTargetConnection) {
      const nextBlock = nextTargetConnection.sourceBlock_;
      checkActionSequenceConsistancy(nextBlock);
    }
  }
}

/**
 * 
 * @param {*} block 
 */
function isEventCondition(block) {
  if (!block) {
    return false;
  }
  if (block.type === "event" || block.type === "condition") {
    return true;
  }
  return false;
}

/**
 * returns true if the block has an event or condition type child block
 * @param {*} block 
 */
function hasEventConditionChild(block) {
  if (!block) {
    return false;
  }
  for (let i = 0; i < block.childBlocks_.length; i++) {
    console.log(block.childBlocks_[i])
    if (block.childBlocks_[i].type === "event" || block.childBlocks_[i].type === "condition") {
      return true;
    }
  };
  return false;
}

/**
 * 
 * @param {*} block 
 */
function checkTriggerSequenceConsistancy(block) {
  // se il blocco è trigger, controlla che il collegamento verso il prossimo 
  // blocco sia accettabile, poi richiama ricorsivamente su di esso
  if (checkInTriggerInfo(block)) {
    let isTrigger = checkInTriggerInfo(block);
    if (isTrigger) {
      if (!hasEventConditionChild(block)) {
        inconsistentTriggerMessage = "Trigger must have a type (event or condition) defined";
        inconsistentTriggerSequence = true;
      }
      const nextTargetConnection = block.nextConnection.targetConnection;
      if (nextTargetConnection) {
        const nextBlock = nextTargetConnection.sourceBlock_;
        // se si vuole rendere accettabile anche il collegamento verso un blocco
        // trigger, aggiungere checkInTriggerInfo(nextBlock)
        if (
          nextBlock.type === "and" ||
          nextBlock.type === "or" ||
          nextBlock.type === "group") {
          checkTriggerSequenceConsistancy(nextBlock);
        }

        else {
          inconsistentTriggerMessage = "Trigger must be connected via a trigger operator (and, or, group)";
          inconsistentTriggerSequence = true;
        }
      }
    }
  }
  // Se è un blocco and o or guarda che il prossimo blocco sia un trigger o 
  // un group
  else if (block.type === "and" || block.type === "or") {
    const nextTargetConnection = block.nextConnection.targetConnection;
    if (nextTargetConnection) {
      const nextBlock = nextTargetConnection.sourceBlock_;
      if (checkInTriggerInfo(nextBlock) || nextBlock.type === "group") {
        checkTriggerSequenceConsistancy(nextBlock);
      }
      else {
        inconsistentTriggerMessage = "Trigger operators (and, or) must connect together two triggers or a group operator";
        inconsistentTriggerSequence = true;
      }
    }
    else {
      inconsistentTriggerMessage = "Trigger operators (and, or) must connect together two triggers or a group operator";
      inconsistentTriggerSequence = true;
    }
  }
  // se è un blocco group guarda che il prossimo blocco sia un trigger o un 
  // blocco di connessione, e se il blocco al suo interno sia di tipo trigger. 
  // richiama ricorsivamente anche sul blocco interno. 
  else if (block.type === "group") {
    const nextTargetConnection = block.nextConnection.targetConnection;
    if (nextTargetConnection) {
      const nextBlock = nextTargetConnection.sourceBlock_;
      if (checkInTriggerInfo(nextBlock) ||
        nextBlock.type === "or" ||
        nextBlock.type === "and") {
        checkTriggerSequenceConsistancy(nextBlock);
      }
      else {
        inconsistentTriggerMessage = "Group operator must be connected to a triggerlogic operator ('and', 'or')";
        inconsistentTriggerSequence = true;
      }
    }
    //controllo sull'interno di group
    const groupInput = block.inputList.find(function (e) {
      return e;
    });
    if (groupInput.connection.targetConnection) {
      const connectedBlock = groupInput.connection.targetConnection.targetConnection.targetConnection.sourceBlock_;
      if (checkInTriggerInfo(connectedBlock)) {
        checkTriggerSequenceConsistancy(connectedBlock);
      }
      else {
        inconsistentTriggerMessage = "First block inside 'Group' operator must be a trigger";
        inconsistentTriggerSequence = true;
      }
    }
    else {
      inconsistentTriggerMessage = "First block inside 'Group' operator must be a trigger";
      inconsistentTriggerSequence = true;
    }
  }
  // se il blocco ha un connessione not attiva, controlla che vi sia 
  // effettivamente collegato un blocco not
  const notInput = block.inputList.find(function (e) {
    return e.name === "not_input_statement";
  });
  if (notInput) {
    const otherBlockConnection = notInput.connection.targetConnection;
    if (otherBlockConnection) {
      const connectedBlock = otherBlockConnection.targetConnection.targetConnection.sourceBlock_;
      if (connectedBlock.type !== "not_dynamic") {
        inconsistentTriggerMessage = "Only 'not' blocks can be connected to the 'not' input";
        inconsistentTriggerSequence = true;
      }
    }
    else {
      inconsistentTriggerMessage = "A 'not' block have to be connected to the 'not' input";
      inconsistentTriggerSequence = true;
      //check "Not" attivata, ma senza nessuna connessione
    }
  }
  return "OK";
}


/**
 * Controlla che la sequenza di azioni sia corretta
 */
function checkActionSequence() {
  let workspace = getWorkspace();
  let ruleBlock = getRuleBlock(workspace);
  if (ruleBlock) {
    let actionInput = ruleBlock.getInput("ACTIONS");
    //se esiste l'input
    if (actionInput) {
      let mainBlockConnection = actionInput.connection;
      //se non c'è niente collegato restituisco
      if (!mainBlockConnection.targetConnection) {
        return "No blocks connected to actions input ";
      }
      else {
        const targetBlock = mainBlockConnection.targetConnection.sourceBlock_;
        existsChildAction = false;
        // se non è presente nessuna azione restituisco
        checkAtLeastOneAction(targetBlock);
        if (!existsChildAction) {
          return "No action blocks connected to actions input ";
        }
        else {
          existsChildNonAction = false;
          // se nella sequenza di azioni sono presenti blocchi non azione o 
          // non supporto azione restituisco
          checkActionChildren(targetBlock);
          if (existsChildNonAction) {
            return "Action list contains non action blocks";
          }
          inconsistentActionSequence = false;
          checkActionSequenceConsistancy(targetBlock);
          if (inconsistentActionSequence) {
            return "Action sequence is not valid, an action operator must connect togheter two actions.";
          }
          return "OK";
        }
      }
    }
  }
}


/*
 * Controlla se il trigger passato è presente nel db dei trigger
 * @param {*} trigger 
 */
export function checkInTriggerInfo(trigger) {
  const triggerInfo = getTriggerInfo();
  if (triggerInfo[trigger.type]) {
    return true;
  };
  return false;
}

function getTriggerOps() {
  return triggerOperators;
}

function getActionOps() {
  return actionOperators;
}


/**
 * Controlla se il trigger passato è presente nel db dei trigger
 * @param {*} trigger 
 */
export function checkInTriggerInfoWithName(trigger) {
  const triggerInfo = getTriggerInfo();
  if (triggerInfo[trigger]) {
    return true;
  };
  return false;
  /*
  let found = false;
  triggerInfo.forEach(function (e) {
    if (e.fullName === trigger) {
      found = true;
    }
  });
  return found;
  */
}

/**
 * Controlla se il trigger operator passato è presente nel db degli op
 * @param {*} trigger 
 */
export function checkInTriggerOperators(triggerOp) {
  const triggerOps = getTriggerOps();
  let found = false;
  triggerOps.forEach(function (e) {
    if (e === triggerOp.type) {
      found = true;
    }
  });
  return found;
}

/**
 * Controlla se il trigger operator passato è presente nel db degli op
 * @param {*} trigger 
 */
export function checkInActionOperators(actionOp) {
  const actionOps = getActionOps();
  let found = false;
  actionOps.forEach(function (e) {
    if (e === actionOp.type) {
      found = true;
    }
  });
  return found;
}

/**
 * Controlla se l'azione passata è presente nel db delle azioni
 * @param {*} action
 */
export function checkInActionInfo(action) {
 const actionInfo = getActionInfo();
  if (actionInfo[action.type]) {
    return true;
  };
  return false;
  /*
  const actionInfo = getActionInfo();
  let found = false;
  actionInfo.forEach(function (e) {
    if (e.fullName === action.type) {
      found = true;
    }
  });
  return found;
*/
}

/**
 * check if the passed action name can be found in actions db 
 * @param {*} action
 */
export function checkInActionInfoOnlyName(action) {
 const actionInfo = getActionInfo();
  if (actionInfo[action.type]) {
    return true;
  };
  return false;
  /*
  const actionInfo = getActionInfo();
  let found = false;
  actionInfo.forEach(function (e) {
    if (e.fullName === action) {
      found = true;
    }
  });
  return found;
  */
}

/**
 * Cerca ricorsivamente nei blocchi figlio se c'è un blocco che non fa parte 
 * ne dei trigger ne dei blocchi di supporto ai trigger
 * @param {*} trigger 
 */
function checkTriggerChildren(trigger) {
  if (checkInTriggerInfo(trigger) || triggerSupportBlocks.includes(trigger.type)) {
    const myChildren = trigger.childBlocks_;
    for (let i = 0; i < myChildren.length; i++) {
      checkTriggerChildren(myChildren[i]);
    }
  }
  // se trova un non trigger restituisce
  else {
    existsChildNonTrigger = true;
  }
}

/**
 * Controlla ricorsivamente che ci sia almeno un blocco trigger collegato 
 * all'input actions o a uno dei suoi blocchi figlio
 * @param {*} mainBlockConnection 
 */
function checkAtLeastOneTrigger(trigger) {
  if (checkInTriggerInfo(trigger)) {
    existsChildTrigger = true;
  }
  else {
    let myChildren = trigger.childBlocks_;
    for (let i = 0; i < myChildren.length; i++) {
      checkAtLeastOneTrigger(myChildren[i]);
    }
  }
}

/**
 * Controlla che la sequenza di azioni sia corretta
 * @param {*} action 
 */
function checkActionChildren(action) {
  if (checkInActionInfo(action) || actionSupportBlocks.includes(action.type)) {
    let myChildren = action.childBlocks_;
    for (let i = 0; i < myChildren.length; i++) {
      checkActionChildren(myChildren[i]);
    }
  }
  // se trova un non action restituisce
  else {
    existsChildNonAction = true;
  }
}

/**
 * Controlla ricorsivamente che ci sia almeno un blocco azione collegato 
 * all'input actions o a uno dei suoi blocchi figlio
 * @param {*} mainBlockConnection 
 */
function checkAtLeastOneAction(action) {
  if (checkInActionInfo(action)) {
    existsChildAction = true;
  }
  else {
    let myChildren = action.childBlocks_;
    for (let i = 0; i < myChildren.length; i++) {
      checkAtLeastOneAction(myChildren[i]);
    }
  }
}

/**
 * Scorre il workspace per eliminare evenutali blocchi non renderizzati
 * (non servono a nulla)
 */
function removeNonRenderedBlocks() {
  let workspace = getWorkspace();
  for (var key in workspace.blockDB_) {
    if (workspace.blockDB_[key].rendered === false) {
      delete workspace.blockDB_[key];
    }
  }
}


/**
 * Cerca i blocchi "parallel_branch" non collegati ad altri blocchi e li rimuove
 * @param {*} event 
 */
export function removeUnusedParallel() {
  let workspace = getWorkspace();
  for (var key in workspace.blockDB_) {
    if (workspace.blockDB_[key].type === "action_placeholder") {
      if (workspace.blockDB_[key] && workspace.blockDB_[key].parentBlock_ === null) {
        let blockToRemove = workspace.blockDB_[key];
        blockToRemove.dispose();
      }
    }
  }
}

/**
 * Helper function per prendere tutti i blocchi nel workspace
 */
export function getAllTriggerInWorkspace() {
  let triggers = [];
  let workspace = getWorkspace();
  for (var key in workspace.blockDB_) {
    if (checkInTriggerInfo(workspace.blockDB_[key])) {
      triggers.push(workspace.blockDB_[key]);
    }
  }
  return triggers;
}

/**
 * Helper function
 */
function getBlocksInRule() {
  let workspace = getWorkspace();
  let blocksInRule = workspace.getAllBlocks();
  return blocksInRule;
}

/**
 * Helper function
 */
export function createRuleBlocksObj() {
  "use strict";
  const blocksInRule = getBlocksInRule();
  let resultObj = {
    triggers: [],
    triggers_op: [],
    actions: [],
    actions_op: [],
    triggersRealName: [],
    actionsRealName: []
  };
  for (let i = 0; i < blocksInRule.length; i++) {
    if (checkInTriggerInfo(blocksInRule[i])) {
      resultObj.triggers.push(blocksInRule[i].name);
      resultObj.triggersRealName.push(blocksInRule[i].type);
    }
    else if (checkInTriggerOperators(blocksInRule[i])) {
      resultObj.triggers_op.push(blocksInRule[i].type);
    }
    else if (checkInActionInfo(blocksInRule[i])) {
      resultObj.actions.push(blocksInRule[i].name);
      resultObj.actionsRealName.push(blocksInRule[i].type);
    }
    else if (checkInActionOperators(blocksInRule[i])) {
      resultObj.actions_op.push(blocksInRule[i].type);
    }
  }
  return resultObj;
}

/**
 * TODO
 * @param {*} ruleElementsObj 
 */
export function createRuleBlocksStr(ruleElementsObj) {
  console.log(ruleElementsObj);
  return ruleElementsObj;
}

/**
 * Converte gli elementi nel campo triggersStr in un array, lo appende all'
 * oggetto regola passato
 * @param {*} rule 
 */
export function triggerStrToObj(rule) {
  let triggersStr = rule.trigger_list;
  let triggers = triggersStr.split(",");
  rule.triggers_obj = triggers;
  return rule;
}

/**
 * Converte gli elementi nel campo actionsStr in un array, lo appende all'
 * oggetto regola passato
 * @param {*} rule 
 */
export function actionStrToObj(rule) {
  let actionsStr = rule.action_list;
  let actions = actionsStr.split(",");
  rule.actions_obj = actions;
  return rule;
}

/** //TODO: currentUser non viene più usato, si lavora solo con lo storage
 *  tutte queste funzioni sono duplicate di login e da rimuovere
 * Controlla se è settato un user nel local storage, se lo è salva nell'user
 * corrente e mostra il nome
 */
function localStorageChecker() {
  let user = window.localStorage.getItem('user');
  if (user) {
    currentUser = user;
    document.getElementById('user-name').innerHTML = "Logged as: " + currentUser;
  }
}

/**
 * Salve l'user name nel local storage
 * @param {*} userName 
 */
export function saveUserToLocal(userName) {
  window.localStorage.setItem('user', userName);
  localStorageChecker();
}

/**
 * 
 */
export function removeUserFromLocal() {
  localStorage.removeItem("user");
}

/**
 * Restituisce l'user name attualmente salvato nel localstorage
 */
export function getUserName() {
  return currentUser;
}

/**
 * Helper function
 */
export function setLastBlock(block) {
  lastBlock = block;
}

/**
 * Helper function
 */
export function getLastBlock() {
  return lastBlock;
}

/**
 * Helper function
 */
export function setLastBlocklyEvent(event) {
  lastBlocklyEvent = event;
}

/**
 * Helper function
 */
export function getLastBlocklyEvent() {
  return lastBlocklyEvent;
}

/**
 * Helper function
 */
export function getRevertPossibility() {
  return revertPossibility;
}

/**
 * Helper function
 */
export function setRevertPossibility(val) {
  revertPossibility = val;
}

/**
 * Helper function: clears the secondary workspace
 */
export function clearSuggestionWorkspace() {
  let secondWorkspace = getSuggestionWorkspace();
  let allSuggestedBlocks = secondWorkspace.getAllBlocks(false);
  allSuggestedBlocks.forEach(e => e.dispose());
}

export function blockToDom(xml) {
  return (Blockly.Xml.blockToDom(xml));
}

/**
 * 
 * @param {*} allElementAtt 
 */
function convertElementAttInArr(allElementAtt) {
  let arrayed = [];
  allElementAtt.forEach(el => {
    let row = [];
    row.push(el.element_name);
    row.push(el.element_type);
    row.push(el.action_type);
    row.push(el.trigger_type);
    row.push(el.link_type);
    row.push(el.negation);
    row.push(el.next_element);
    arrayed.push(row);
  })
  return arrayed;
};

/**
 * setter 
 */
export function changeRecommendationType() {
  if (recommendationType === "Step by step recommendations") {
    recommendationType = "Full rule recommendations";
  }
  else {
    recommendationType = "Step by step recommendations";
  }
  console.log(recommendationType);
}

/**
 * setter 
 */
export function setRecommendationType(type) {
  if (type === "step") {

    recommendationType = "Step by step recommendations";
  }
  else if (type === "full") {
    recommendationType = "Full rule recommendations";
  }
  else {
    recommendationType = "None";
  }
  suggestorTypeChanged();
  console.log(recommendationType);
}


/**
 * 
 * change the recType var
 */
function suggestorTypeChanged() {
  errorMessages.changeRecTypeDiv();
}


/**
* getter
*/
export function getRecType() {
  return recommendationType;
}

/** Not used because fucks up everything. Fuck blockly
 * Add the second "time" field from a dateTime block when the "between" op. 
 * is selected
 * @param {*} parent 
 */
export function addToInputsFromEventTime(block) {

/*
  let inputNot = block.getInput("NOT_INPUT");
  if (inputNot) {
    inputNot.dispose();
  }
  */
      block.appendDummyInput("BETWEEN_TIMES")
        .appendField(" and ");

      //block.appendDummyInput("END_TIME_LABEL")
       // .appendField("end: ");
      block.appendDummyInput("END_TIME_HOUR")
        .appendField(new Blockly.FieldDropdown([["select", "none"], ["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"],
        ["04", "04"], ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"], ["10", "10"],
        ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"], ["15", "15"], ["16", "16"], ["17", "17"],
        ["18", "18"], ["19", "19"], ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"]]), "END_HOURS");
      block.appendDummyInput("END_TIME_MIN")
        .appendField(new Blockly.FieldDropdown([["select", "none"],["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"], ["04", "04"],
        ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"],
        ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"],
        ["15", "15"], ["16", "16"], ["17", "17"], ["18", "18"], ["19", "19"],
        ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"], ["24", "24"],
        ["25", "25"], ["26", "26"], ["27", "27"], ["28", "28"], ["29", "29"],
        ["30", "30"], ["31", "31"], ["32", "32"], ["33", "33"], ["34", "34"],
        ["35", "35"], ["36", "36"], ["37", "37"], ["38", "38"], ["39", "39"],
        ["40", "40"], ["41", "41"], ["42", "42"], ["43", "43"], ["44", "44"],
        ["45", "45"], ["46", "46"], ["47", "47"], ["48", "48"], ["49", "49"],
        ["50", "50"], ["51", "51"], ["52", "52"], ["53", "53"], ["54", "54"],
        ["55", "55"], ["56", "56"], ["57", "57"], ["58", "58"], ["59", "59"]
        ]), "END_MINS");

   /*     
        let checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
          this.sourceBlock_.updateShape_(pxchecked);
        });
      block.appendDummyInput()
        .appendField(" NOT: ")
        .appendField(checkbox, 'not_input');
*/
  block.appendDummyInput("dummy");
  block.removeInput("dummy"); //force block reload

}
/**
 * Remove the second "time" field from a dateTime block when the "between" op. 
 * is not selected
 * @param {*} parent 
 */
export function removeToInputsFromEventTime(parent) {
  let inputHour = parent.getInput("END_TIME_HOUR");
  if (inputHour) {
    inputHour.dispose();
  }
  let inputMin = parent.getInput("END_TIME_MIN");
  if (inputMin) {
    inputMin.dispose();
  }
  let inputLabelEnd = parent.getInput("END_TIME_LABEL");
  if (inputLabelEnd) {
    inputLabelEnd.dispose();
  }
  let inputLabelStart = parent.getInput("START_TIME_LABEL");
  if (inputLabelStart) {
    inputLabelStart.dispose();
  }
  let andText = parent.getInput("BETWEEN_TIMES");
  if (andText) {
    andText.dispose();
  }

  parent.appendDummyInput("dummy");
  parent.removeInput("dummy"); //force block reload
}


/**
 * 
 */
export function removeUnusedInputsFromSecondaryWorkspace() {
  "use strict";
  let workspace = getSuggestionWorkspace();
  let blocks = workspace.getAllBlocks();
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === "event") {
      let parent = blocks[i].getParent();
      if (parent && parent.name === "Time") {
        removeToInputsFromEventTime(parent);
      }
    }
  }
  //DomModifiers.alignBlocks();
}

/**
 * 
 */
export function eventChange() {
  let blockId = getClickedEventConditionBlock();
  let workspace = getWorkspace();
  let block = workspace.blockDB_[blockId];
  let parent = block.getParent();
  block.dispose();
  let newBlock = myWorkspace.newBlock('event');
  newBlock.initSvg();
  newBlock.render();
  parent.getInput("TRIGGER_TYPE").connection.connect(newBlock.outputConnection);
  ModalManager.modalEventConditionChangeClose();
}

/**
 * 
 */
export function conditionChange() {
  let blockId = getClickedEventConditionBlock();
  let workspace = getWorkspace();
  let block = workspace.blockDB_[blockId];
  let parent = block.getParent();
  block.dispose();
  let newBlock = myWorkspace.newBlock('condition');
  newBlock.initSvg();
  newBlock.render();
  parent.getInput("TRIGGER_TYPE").connection.connect(newBlock.outputConnection);
  ModalManager.modalEventConditionChangeClose();
}

/**
 * 
 */
export function getClickedEventConditionBlock() {
  return clickedEventConditionBlock;
}


/**
 * 
 * @param {*} blockId 
 */
export function setClickedEventConditionBlock(blockId) {
  clickedEventConditionBlock = blockId;
}

/**
 * Show the "event and event" modal if two events are connected in "AND". Check 
 * only the last inserted block with the previous one. 
 * @param {*} block 
 */
export function checkEventEventOnlyPrev(block) {
  let workspace = getWorkspace();
  let ruleSequence = getRuleSequence();
  let triggersWithId = ruleSequence.triggersWithId;
  if (triggersWithId.length > 1) {
    let previousLast = triggersWithId[triggersWithId.length - 2];
    let previousLastBlock = workspace.getBlockById(previousLast.id);
    if (checkIfEventInChild(previousLastBlock)) {
      let nextOp = previousLastBlock.getNextBlock();
      if (nextOp && nextOp.type === "and") {
        MicroModal.show("modal-event-event");
      }
    }
  }
}


/**
 * Show the "event and event" modal if two events are connected in "AND". Check 
 * all the rule sequence. Give warning even if blocks are not connected.
 * @param {*} block 
 */
export function checkEventEvent(eventBlock) {
  let workspace = getWorkspace();
  let ruleSequence = getRuleSequence();
  let triggersWithId = ruleSequence.triggersWithId;
  if (triggersWithId.length > 1) {
    for (let i = 0; i < triggersWithId.length; i++) {
      let actualBlockId = triggersWithId[i].id;
      let actualBlock = workspace.getBlockById(actualBlockId);
      if (checkIfEventInChilds(actualBlock)) {
        let nextOp = actualBlock.getNextBlock();
        if (nextOp && nextOp.type === "and") {
          if (actualBlock.id !== eventBlock.parentBlock_.id) {
            MicroModal.show("modal-event-event");
            break;
          }
          //let nextBlock = nextOp.getNextBlock();
          //if (nextBlock && checkIfEventInChilds(nextBlock)) {
          // MicroModal.show("modal-event-event");
          //break;
          //}
        }
      }
    }
  }
}

/**
 * 
 * @param {*} block 
 */
function checkIfEventInChilds(block) {
  for (let i = 0; i < block.childBlocks_.length; i++) {
    console.log(block.childBlocks_[i])
    if (block.childBlocks_[i].type === "event") {
      return true;
    }
  };
  return false;
}


/**
 * Check the position of the trigger type child block (it can be moved, due 
 * to the possibility of changing the trigger type) 
 * @param {*} block 
 */
export function returnTriggerType(block) {
  for (let i = 0; i < block.childBlocks_.length; i++) {
    console.log(block.childBlocks_[i])
    if (block.childBlocks_[i].type === "event" || block.childBlocks_[i].type === "condition") {
      return block.childBlocks_[i].type;
    }
  };
  return false;
}

/**
 * Helper function
 * @param {*} name 
 */
function findInBooleanTriggers(triggerRealName) {
  return booleanTriggers.includes(triggerRealName) ? true : false;
}