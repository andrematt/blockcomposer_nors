import * as Init from "./init.js";
import * as DB from "./database_functs.js";
import * as Generators from "./generators.js";
import * as Listeners from "./listeners.js";
import * as Extensions from "./extensions.js";
import * as BlockSuggestor from "./block_suggestor.js";
import * as Dialog from "./custom_dialog.js";
import * as DomModifiers from "./dom_modifiers.js";
import * as errorMessages from "./textarea_manager.js";
import * as neuralNetwork from "./neural_network.js";
import * as RS_values from "./rs_values.js";
import { CPT } from "./CPT/index.js"

/**
 * TODO: 
 * quando cancelli un elemento, se sei in modalità "step-by-step" i bottoni 
 * vengono aggiornati, altrimenti no
 * CONTROLLA IL NOT NELLE RACCOMANDAZIONI FULL
 * removeToInputsFromEventTime dovrebbe essere eseguita anche quando viene 
 * presa una regola dal Db... in futuro
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
let triggerCompleteInfo = [];
let actionCompleteInfo = [];
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
let lastBlock; // Last block inserted in workspace
let CPTmodel;
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
let recommendationType = "Step by step recommendations";

/**
 * Modulo di inizializzazione, pattern IIFE. Carica trigger e azioni, 
 * ricostruisce la toolbox, sovrascrive il dialog box (per scelta 
 * event/condition). Contiene le dichiarazioni delle funzioni principali.
 */
(function () {
  "use strict";
  console.log(Init);
  //console.log(window.Blockly.Blocks.procedures_callnoreturn.renameProcedure("test", "test2"));
  initializeCPT();
  initializeNN();
  localStorageChecker();
  waitForTriggers();
  waitForActions();
  initializeSuggestorButtons();
  initializeSuggestorSelector();
  Dialog.overrideDialog();

  async function initializeSuggestorButtons() {
    let text = `
 Start the editing of the trigger part selecting a trigger from the toolbox.
    `;
    document.getElementById('textarea-suggestion-expl').innerHTML = "";
    document.getElementById('textarea-suggestion-expl').innerHTML = text;
    document.getElementById("suggestor-and").onclick = function () { startRefineRule("and") };
    document.getElementById("suggestor-or").onclick = function () { startRefineRule("or") };
    document.getElementById("suggestor-not").onclick = function () { startRefineRule("not") };
    document.getElementById("suggestor-action").onclick = function () { startRefineRule("rule") };
    document.getElementById("suggestor-sequential").onclick = function () { startRefineRule("sequential") };
    document.getElementById("suggestor-parallel").onclick = function () { startRefineRule("parallel") };
  }

  async function initializeSuggestorSelector() {
    document.getElementById("suggestor-step-by-step").onclick = function () { setRecommendationType("step") };
    document.getElementById("suggestor-full-rule").onclick = function () { setRecommendationType("full") };
    document.getElementById("suggestor-none").onclick = function () { setRecommendationType("none") };
  }

  /**
   * select all graphs from DB, convert them back in JS format, train the CPT 
   * model with them.
   */
  async function initializeCPT() {
    "use strict"
    let allSequences = await DB.getAllSequencesFromDB().then();
    console.log(allSequences);
    CPTmodel = new CPT();
    let myData = allSequences.map(element => JSON.parse(element.rule_sequence));
    CPTmodel.train(
      myData // Training Data
    );
  }

  /**
   * select all the element/attribute row in the elAtt table, train the NN model
   */
  async function initializeNN() {
    "use strict"
    let allElementAtt = await DB.getAllElementAttFromDB().then();
    console.log(allElementAtt);
    let arrayedAllElementAtt = convertElementAttInArr(allElementAtt);
    console.log(arrayedAllElementAtt);
    neuralNetwork.train(arrayedAllElementAtt);
  }


  /**
   * Funzione asincrona: aspetta il caricamento dei trigger, chiama funct per 
   * creare l'albero dei trigger e ridisegnare la toolbox 
   */
  async function waitForTriggers() {
    myTriggers = await Init.loadTriggersAsync();
    const triggerWithCategoryData = addCategoryDataToAttributeTrigger(myTriggers);
    loadTriggersToolboxRecursive(triggerWithCategoryData);
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
   *  Aggiunge le informazioni della categoria (realName, displayedName, 
   *  dimensionId) agli attributi, per poterli recuperare senza dover guardare 
   *  all'elemento padre.
   */
  function addCategoryDataToAttributeTrigger(passedSchema) {
    let schema = passedSchema;
    for (let element in schema) {
      for (let i = 0; i < schema[element].length; i++) {
        const realName = schema[element][i].realName;
        const displayedName = schema[element][i].displayedName;
        const dimensionId = schema[element][i].dimensionId;
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
      block.appendDummyInput("TEXT")
        .appendField("Text:")
        .appendField(new Blockly.FieldTextInput("alarm text"), "ALARM_TEXT");
      block.appendDummyInput("NOTIFICATION")
        .appendField("Notification mode:")
        .appendField(new Blockly.FieldDropdown([["sms", "SMS"], ["email", "EMAIL"], ["notification", "NOTIFICATION"]]), "NOTIFICATION MODE");
      block.appendDummyInput("TIMES")
        .appendField("Send times:")
        .appendField(new Blockly.FieldDropdown([["1", "ONCE"], ["2", "TWO_TIMES"], ["3", "THREE_TIMES"]]), "REPETITIONS");
      block.appendDummyInput("SEND")
        .appendField("Send to:")
        .appendField(new Blockly.FieldTextInput("send to"), "SEND_TO");
    }

    else if (leafData.realName === "reminderText") {
      block.appendDummyInput("TEXT")
        .appendField("Text:")
        .appendField(new Blockly.FieldTextInput("reminder text"), "REMINDER_TEXT");
      block.appendDummyInput("NOTIFICATION")
        .appendField("Notification mode:")
        .appendField(new Blockly.FieldDropdown([["sms", "SMS"], ["email", "EMAIL"], ["notification", "NOTIFICATION"]]), "NOTIFICATION MODE");
      block.appendDummyInput("TIMES")
        .appendField("Send times:")
        .appendField(new Blockly.FieldDropdown([["1", "ONCE"], ["2", "TWO_TIMES"], ["3", "THREE_TIMES"]]), "REPETITIONS");
      block.appendDummyInput("SEND")
        .appendField("Send to:")
        .appendField(new Blockly.FieldTextInput("send to"), "SEND_TO");
    }
    else if (leafData.realName === "videoPath") {
      block.appendDummyInput("VIDEO_PATH_INPUT")
        .appendField("Video path: ")
        .appendField(new Blockly.FieldTextInput("path"), "INPUT_FIELD_VALUE");
      block.appendDummyInput("VIDEO_DURATION_INPUT")
        .appendField("Duration (min): ")
        .appendField(new Blockly.FieldNumber(1, 1, 300), "SELECT_FIELD_VALUE");

    }
    else if (leafData.realName === "imagePath") {
      block.appendDummyInput("IMAGE_PATH_INPUT")
        .appendField("Image path: ")
        .appendField(new Blockly.FieldTextInput("path"), "INPUT_FIELD_VALUE");
      block.appendDummyInput("IMAGE_DURATION_INPUT")
        .appendField("Duration (min): ")
        .appendField(new Blockly.FieldNumber(1, 1, 300), "SELECT_FIELD_VALUE");
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

        .appendField(new Blockly.FieldDropdown([["=", "EQUAL"], ["<", "LESSTHEN"], [">", "MORETHEN"]]), "SELECT_FIELD_VALUE")
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
    Object.freeze(leafData);
    block.name = name;
    block.blockType = "trigger";
    block.isTriggerArray = true;
    block.appendValueInput("TRIGGER_TYPE");
    //.appendField("Trigger type:");
    let dimensionId = "" + leafData.categoryDimensionId;

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
    //Object.freeze(leafData);
    //console.log(leafData);
    //console.log(name);
    //console.log(parentName);
    block.name = name;
    block.isTrigger = true;
    block.blockType = "trigger";
    block.appendValueInput("TRIGGER_TYPE");
    //.appendField("Trigger type:");
    let dimensionId = "" + leafData.categoryDimensionId;

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

    if (leafData.realName === "rain") {
      block.appendDummyInput()
        .appendField("True")
    }

    if (leafData.realName === "snow") {
      block.appendDummyInput()
        .appendField("True")
    }


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

        .appendField(new Blockly.FieldDropdown([["=", "EQUAL"], ["<", "LESSTHEN"], [">", "MORETHEN"]]), "TRIGGER_OP")
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
      block.appendDummyInput("START_TIME_LABEL")
        .appendField("start: ")
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

      block.appendDummyInput("END_TIME_LABEL")
        .appendField("end: ");
      block.appendDummyInput("END_TIME_HOUR")
        .appendField(new Blockly.FieldDropdown([["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"],
        ["04", "04"], ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"], ["10", "10"],
        ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"], ["15", "15"], ["16", "16"], ["17", "17"],
        ["18", "18"], ["19", "19"], ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"]]), "END_HOURS");
      block.appendDummyInput("END_TIME_MIN")
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
        ]), "END_MINS");

      block.appendDummyInput()
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
      block.appendDummyInput()
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

  /**
   * Crea l'XML di un trigger (nodo foglia), assegna a 
   * Blockly.JavaScript[leafData.realName] il js da chiamare quando viene aggiunto
   * il blocco.
   * @param {*} leafData 
   */
  function createTriggerDinamically(leafData, blockName) {
    const myLeafData = leafData;
    //Object.freeze(myLeafData);
    Blockly.Blocks[blockName] = {
      init: function () {
        var checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
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
  <category name="Action operators" colour="150">
    <block type="sequential"></block>
    <block type="parallel"></block>
  </category>
  <sep gap = "8"></sep>
</xml>
` ;

    //let treeCopy = JSON.parse(JSON.stringify(newTree));
    //toolboxTree = treeCopy;
    //something is broken in newTree
    console.log(newTree);
    workspace.updateToolbox(newTree);

    //aggiorna anche l'xml!!
    workspace.toolbox_.refreshSelection();
    console.log("UPDATING XML!");
    document.getElementById('toolbox').innerHTML = newTree;
    console.log(document.getElementById('toolbox'));

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
                categoryName: categoryName,
                realName: e.attributes[i].realName
              };
              actionCompleteInfo.push(myInfo);
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
                  categoryName: categoryName,
                  realName: e.attributes[i].realName
                };
                actionCompleteInfo.push(myInfo);
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
  catch (e){
    console.log(e);
    console.log(unsafe);
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
        const categoryName = escapeXml(data.englishDisplayedName);
        const categoryRealName = escapeXml(data.realName);
        triggersXml += `
          <category colour="#065699" name="${categoryName}">
        `;
        for (let i = 0; i < data.attributes.length; i++) {
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
              categoryName: categoryName,
              realName: escapeXml(data.attributes[i].realName)
            };
            triggerCompleteInfo.push(myInfo);
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
                categoryName: categoryName,
                realName: escapeXml(data.attributes[i].realName)
              };
              triggerCompleteInfo.push(myInfo);
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
      //xml += passedXml;  

    }
    else {
      data.forEach(function (e) { //chiama ricorsivamente su ogni elemento dell'array
        loadTriggersToolboxRecursive(e, xml);
      });
    }
    //return xml;
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

  // iniezione dei blocchi iniziali
  //console.log(document.getElementById('startBlocks'));
  Blockly.Xml.domToWorkspace(document.getElementById('startBlocks'),
    workspace);


  // Registrazione delle estenzioni: non più usate         
  //Blockly.Extensions.register('add_time_on_not', Extensions.add_time_on_not);
  //Blockly.Extensions.register('create_refersTo_field', Extensions.create_refersTo_field);
  //Blockly.Extensions.register('fill_refersTo_field', Extensions.fill_refersTo_field);

  // Registrazione dei listeners
  //workspace.addChangeListener(Listeners.triggerTypeListenerParent);

  // Main workspace listeners 

  // listeners to place blocks selected from toolbox on the correct position 
  // in the workspace. Works if the blocks are clicked, but if they are dragged 
  // crashes. Don't know how to fix this.
  workspace.addChangeListener(Listeners.addedTriggerToWorkspace);
  workspace.addChangeListener(Listeners.addedActionToWorkspace);
  workspace.addChangeListener(Listeners.addedTriggerOpToWorkspace);
  workspace.addChangeListener(Listeners.addedActionOpToWorkspace);
  workspace.addChangeListener(Listeners.eventListenerForTimeTrigger);
  workspace.addChangeListener(Listeners.addedBlockToWorkspace);
  workspace.addChangeListener(Listeners.removedBlockFromWorkspace);
  workspace.addChangeListener(Listeners.lastTriggerActionListener);
  workspace.addChangeListener(Listeners.notBlockUpdate);
  workspace.addChangeListener(Listeners.triggerTypeListenerChild);
  workspace.addChangeListener(Listeners.blockDisconnectListener);
  workspace.addChangeListener(Listeners.triggerListener);
  workspace.addChangeListener(Listeners.parallelBranchesUpdateNumber);
  workspace.addChangeListener(Listeners.waitToParallelListener);
  workspace.addChangeListener(Listeners.updateCodeListener);
  //  workspace.addChangeListener(Listeners.blockDocsListener);
  workspace.addChangeListener(Listeners.ruleTypeListener);
  workspace.addChangeListener(Listeners.removeUnusedNotBlocks);
  workspace.addChangeListener(Listeners.autoCheckRule);

  //suggestion workspace listeners
  suggestionWorkspace.addChangeListener(Listeners.secondaryWorkspaceLeftClick);

  myWorkspace = workspace;
  mySuggestionWorkspace = suggestionWorkspace;
})();


/**
 * Costruisce la regola in formato blocco a partire dalla lista di suggerimenti
 * @param {*} bestSuggestion 
 */
function createTriggerBlocksFromSuggested(bestSuggestion) {
  "use strict";
  console.log("suggestion list:");
  console.log(bestSuggestion);
  let workspace = getSuggestionWorkspace();

  // crea elemento dom xml e struttura della regola
  var doc = document.implementation.createDocument("", "", null);
  let ruleTest = doc.createElement("block");
  ruleTest.setAttribute("class", "rule");

  for (let i = 0; i < bestSuggestion.length; i++) {
    let prev = function () {
      if (i === 0) {
        return undefined;
      }
      return bestSuggestion[i - 1];
    }();
    //console.log("prev: ", prev);
    if (prev) {
      if (bestSuggestion[i].source !== prev.source) {
        //se il blocco precedente è di tipo group devi creare sia il blocco
        //associato al campo "source" che quello al campo "dest"
        if (prev.source === "group") {
          // TODO
        } else if (bestSuggestion[i].dest === "hour_min") {
          let parentBlock = doc.getElementsByClassName(prev.dest);
          console.log(parentBlock[0]);
          let field = doc.createElement("field");
          field.setAttribute("name", "when_input");
          field.innerHTML = "TRUE";
          let mutation = doc.createElement("mutation");
          mutation.setAttribute("when_input", "true");
          parentBlock[0].appendChild(mutation);
          parentBlock[0].appendChild(field);
          /*
          TODO: come fargli selezionare la check?
          let fieldStart = doc.createElement("field");
          fieldStart.setAttribute("name", "when_input_start_hour");
          fieldStart.innerHTML = "TRUE";

          let mutationStart = doc.createElement("mutation");
          mutationStart.setAttribute("when_input_start_hour", "true");

          let fieldEnd = doc.createElement("field");
          fieldEnd.setAttribute("name", "when_input_end_hour");
          fieldEnd.innerHTML = "TRUE";

          let mutationEnd = doc.createElement("mutation");
          mutationEnd.setAttribute("when_input_end_hour", "true");

          parentBlock[0].appendChild(mutationStart);
          parentBlock[0].appendChild(fieldStart);
          parentBlock[0].appendChild(mutationEnd);
          parentBlock[0].appendChild(fieldEnd);
          */

        }
        else if (bestSuggestion[i].dest === "day") {
          let parentBlock = doc.getElementsByClassName(prev.dest);
          let field = doc.createElement("field");
          field.setAttribute("name", "when_input");
          field.innerHTML = "TRUE";
          let mutation = doc.createElement("mutation");
          mutation.setAttribute("when_input", "true");
          parentBlock[0].appendChild(mutation);
          parentBlock[0].appendChild(field);
        }
        else {
          let parentBlock = doc.getElementsByClassName(prev.dest);
          let triggerNewBlock = doc.createElement("block");
          triggerNewBlock.setAttribute("type", bestSuggestion[i].dest);
          triggerNewBlock.setAttribute("class", bestSuggestion[i].dest);
          if (BlockSuggestor.isEventCondition(bestSuggestion[i])) {
            let valueInput = doc.createElement("value");
            valueInput.setAttribute("name", "TRIGGER_TYPE");
            let triggerTypeBlock = doc.createElement("block");
            triggerTypeBlock.setAttribute("type", bestSuggestion[i].dest);
            valueInput.appendChild(triggerTypeBlock);
            parentBlock[0].appendChild(valueInput);
          }

          // Eliminati i blocchi day e time, questi if non servono più
          /*
          else if (bestSuggestion[i].dest === "hour_min") {

            let startTime = doc.createElement("block");
            startTime.setAttribute("type", "hour_min");
            let endTime = doc.createElement("block");
            endTime.setAttribute("type", "hour_min");
            // Eliminati i blocchi day e time, questi if non servono più
            if (bestSuggestion[i].source === "not_dynamic") {
              let field = doc.createElement("field");
              field.setAttribute("name", "when_input");
              field.innerHTML = "TRUE";
              let mutation = doc.createElement("mutation");
              mutation.setAttribute("when_input", "true");
              parentBlock[0].appendChild(mutation);
              parentBlock[0].appendChild(field);

              let startTimeInput = doc.createElement("value");
              startTimeInput.setAttribute("name", "when_input_start_hour");

              startTimeInput.appendChild(startTime);
              parentBlock[0].appendChild(startTimeInput);

              let endTimeInput = doc.createElement("value");
              endTimeInput.setAttribute("name", "when_input_end_hour");

              endTimeInput.appendChild(endTime);
              parentBlock[0].appendChild(endTimeInput);
            }
            // Eliminati i blocchi day e time, questi if non servono più
            else if (bestSuggestion[i].source === "dateTime-localTime") {
              //TODO
            }


          }
          // Eliminati i blocchi day e time, questi if non servono più
          else if (bestSuggestion[i].dest === "day") {
            
            let day = doc.createElement("block");
            day.setAttribute("type", "day");

            if (bestSuggestion[i].source === "not_dynamic") {
              let field = doc.createElement("field");
              field.setAttribute("name", "when_input");
              field.innerHTML = "TRUE";
              let mutation = doc.createElement("mutation");
              mutation.setAttribute("when_input", "true");
              parentBlock[0].appendChild(mutation);
              parentBlock[0].appendChild(field);
              //TODO: test


              let dayInput = doc.createElement("value");
              dayInput.setAttribute("name", "when_input_day");

              dayInput.appendChild(dayInput);
              parentBlock[0].appendChild(dayInput);
            }
            // Eliminati i blocchi day e time, questi if non servono più
            else if (bestSuggestion[i].source === "dateTime-localTime") {
              //TODO
            }
          }
          */
          else {
            let next = doc.createElement("next");
            next.appendChild(triggerNewBlock);
            parentBlock[0].appendChild(next);
          }
        }
      }
      else {
        if (BlockSuggestor.isEventCondition(bestSuggestion[i])) {
          let valueInput = doc.createElement("value");
          valueInput.setAttribute("name", "TRIGGER_TYPE");
          let triggerTypeBlock = doc.createElement("block");
          triggerTypeBlock.setAttribute("type", bestSuggestion[i].dest);
          valueInput.appendChild(triggerTypeBlock);
        }
        else if (bestSuggestion[i].dest === "not_dynamic") {
          let parentBlock = doc.getElementsByClassName(prev.source);
          let statementInput = doc.createElement("statement");
          let mutation = doc.createElement("mutation");
          let field = doc.createElement("field");
          field.setAttribute("name", "not_input");
          field.innerHTML = "TRUE";
          mutation.setAttribute("not_input", "true");
          statementInput.setAttribute("name", "not_input_statement");
          let triggerTypeBlock = doc.createElement("block");
          triggerTypeBlock.setAttribute("type", bestSuggestion[i].dest);
          triggerTypeBlock.setAttribute("class", bestSuggestion[i].dest);
          statementInput.appendChild(triggerTypeBlock);
          parentBlock[0].appendChild(mutation);
          parentBlock[0].appendChild(field);
          parentBlock[0].appendChild(statementInput);
          //console.log(doc);
        }
        /*
        else if (bestSuggestion[i].dest === "hour_min") {

          let startTime = doc.createElement("block");
          startTime.setAttribute("type", "hour_min");
          let endTime = doc.createElement("block");
          endTime.setAttribute("type", "hour_min");


          let parentBlock = doc.getElementsByClassName(prev.source);
          let startTimeInput = doc.createElement("value");
          startTimeInput.setAttribute("name", "START_TIME");

          startTimeInput.appendChild(startTime);
          parentBlock[0].appendChild(startTimeInput);

          let endTimeInput = doc.createElement("value");
          endTimeInput.setAttribute("name", "END_TIME");

          endTimeInput.appendChild(endTime);
          parentBlock[0].appendChild(endTimeInput);

        }
        else if (bestSuggestion[i].dest === "day") {
          let parentBlock = doc.getElementsByClassName(prev.source);
          //TODO
        }
        */
        else {
          console.log("continuazione di un path");
          console.log("doc:", doc);
          console.log("prev.source:", prev.source);
          //se non sono di tipo relative pos
          let parentBlock = doc.getElementsByClassName(prev.source);
          console.log(parentBlock);
          let next = doc.createElement("next");
          let newTriggerBlock = doc.createElement("block");
          newTriggerBlock.setAttribute("type", bestSuggestion[i].dest);
          newTriggerBlock.setAttribute("class", bestSuggestion[i].dest);
          next.appendChild(newTriggerBlock);
          // posso usare la classe come identificativo perchè per ogni path c'è 
          // solo un blocco per tipo (i path vengono creati rimuovendo i blocchi)
          parentBlock[0].appendChild(next);
        }
      }
    }
    //primo elemento
    else {
      let block = doc.createElement("block");
      block.setAttribute("class", bestSuggestion[i].source);
      block.setAttribute("type", bestSuggestion[i].source);
      //aggiungi elementi per event/condition
      if (BlockSuggestor.isEventCondition(bestSuggestion[i])) {
        let valueInput = doc.createElement("value");
        valueInput.setAttribute("name", "TRIGGER_TYPE");
        let triggerTypeBlock = doc.createElement("block");
        triggerTypeBlock.setAttribute("type", bestSuggestion[i].dest);
        valueInput.appendChild(triggerTypeBlock);
        block.appendChild(valueInput);
      }
      // append al blocco rule
      doc.appendChild(block);
    }
  }
  console.log(doc);
  var xmlText = new XMLSerializer().serializeToString(doc);
  return (xmlText);
  //Blockly.Xml.appendDomToWorkspace(doc, workspace);
}

/**
 * Restituisce il primo elemento inserito nel blocco regola se è un trigger, 
 * altrimenti non resituisce nulla
 */
function getFirstTrigger() {
  //query selector per prendere il primo blocco rule
  let rule_xml = Blockly.Xml.workspaceToDom(myWorkspace, false);
  let triggersContainer = rule_xml.getAttribute("TRIGGERS");
  let allStatements = rule_xml.querySelectorAll('statement');
  const triggerInfo = getTriggerInfo();
  if (allStatements[0] && typeof allStatements[0].children !== "undefined") {
    let type = allStatements[0].children[0].getAttribute("type");
    let singleEntry = triggerInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
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
    let triggerEntry = triggerInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
    if (triggerEntry) {
      pulledOutTriggers.push(triggerEntry.fullName);
      pulledOutTriggersWithId.push({ name: triggerEntry.fullName, id: blocks[i].id });
      continue;
    }
    let actionEntry = actionInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
    if (actionEntry) {
      pulledOutActions.push(actionEntry.fullName);
      pulledOutActionsWithId.push({ name: actionEntry.fullName, id: blocks[i].id });
    }
  }
  for (let i = ruleBlockIndex; i < blocks.length; i++) {
    let type = blocks[i].type;
    let triggerEntry = triggerInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
    if (triggerEntry) {
      triggers.push(triggerEntry.fullName);
      triggersWithId.push({ name: triggerEntry.fullName, id: blocks[i].id });
      continue;
    }
    let actionEntry = actionInfo.find((o, i) => {
      if (o.fullName === type) {
        return o;
      }
    });
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
 * 
 * @param {*} linkType 
 */
export function startRefineRule(linkType) {
  let lastBlock = getLastBlock();
  console.log(lastBlock);
  if (linkType === "and") {
    console.log("AND")
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations(); //which textarea?
    ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "or") {
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations();
    ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "not") {
    DomModifiers.addNegationToBlock(lastBlock);
    //errorMessages.afterNotMessage();
    ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "rule") {
    errorMessages.startActionEditing();
    ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "sequential") {
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations();
    ruleSuggestorManager(lastBlock, true, linkType);
  }
  else if (linkType === "parallel") {
    DomModifiers.addOperatorToBlock(lastBlock, linkType)
    //errorMessages.cleanTextAreaExplainations();
    ruleSuggestorManager(lastBlock, true, linkType);
  }
}

/**
 * We will fire recommendation each time. Eventually, add checks here.  
 * @param {*} block 
 */
function checkRecommendationConditions(block) {
  return true;
}

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
        await fireFullDataRec(lastBlock, "trigger", elementsInWorkspace.elements, linkType).then();
        textareaMessagesManager(lastBlock, linkType, "full");
        ruleSuggestorStatus = "full";
      }
      else if (refined && checkInActionInfoOnlyName(lastBlock.type)) {
        await fireFullDataRec(lastBlock, "action", elementsInWorkspace.elements, linkType).then();
        textareaMessagesManager(lastBlock, linkType, "full");
        ruleSuggestorStatus = "full";
      }
      else if (checkInTriggerInfoWithName(lastBlock.type)) {
        fireOnlySequenceRec(elementsInWorkspace.elements, "trigger", lastBlock);
        textareaMessagesManager(lastBlock, linkType, "onlySeq");
        ruleSuggestorStatus = "seq";
      }
      else if (checkInActionInfoOnlyName(lastBlock.type)) {
        fireOnlySequenceRec(elementsInWorkspace.elements, "action", lastBlock);
        textareaMessagesManager(lastBlock, linkType, "onlySeq");
        ruleSuggestorStatus = "seq";
      }
      else {
        errorMessages.suggestorErrorMessages("noElements");
      }
    }
  }
  else if (recommendationType === "Full rule recommendations") {
    let topRecs = await fireRecommendationForFullRule(elementsInWorkspace.elements, lastBlock).then();
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

/**
 * Obtain the 5 top recommendations via CPT, add each of them to the already 
 * inserted sequence. Then, foreeach new sequence obtained, loops on each rule 
 * saved in the database, to check the one that best fits the new sequence.  
 * Then, this top5 rules is filter to remove duplicate rules and returned. 
 * @param {*} sequence 
 */
async function fireRecommendationForFullRule(sequence, lastBlock) {
  let CPTpredictions = obtainSequenceRec(sequence, RS_values.getPreviousElementToConsider_CPT(), 5);
  console.log(CPTpredictions);
  let CPTpredictionsCheck = [];
  //Obtain a list of sequences with added the rule element obtained with CPT
  if (CPTpredictions[0] && CPTpredictions[0].length > 0) { //horrible error handling
    CPTpredictionsCheck = CPTpredictions[0];
    errorMessages.cleanTextAreaAlerts();
  }
  if (CPTpredictionsCheck.length === 0) { //if no results, only fire CPT for the last inserted element
    let CPTpredictions = obtainSequenceRec([lastBlock.type], RS_values.getPreviousElementToConsider_CPT(), 5);
    if (CPTpredictions[0] && CPTpredictions[0].length > 0) { //horrible error handling
      CPTpredictionsCheck = CPTpredictions[0];
      errorMessages.cleanTextAreaAlerts();
    }
    else {
      errorMessages.suggestorErrorMessages("noSuggestions");
      return;
    }
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
  let allSequences = await DB.getAllSequencesFromDB().then();
  console.log(allSequences);
  allSequences.map((e) => {
    e.rule_sequence = JSON.parse(e.rule_sequence);
  });
  console.log(allSequences);
  //aggiungi ad ogni rule (allSequence) lo score ottenuto
  //fai sort per score e restituisci prime 5 lo score ottenuto
  // Alternative method, does not work
  /*
    for (let i = 0; i<allSequences.length; i++){
      let score = 0;
      let setA = new Set(allSequences[i].rule_sequence);
      for(let j = 0; j < sequenceWithCPTresults.length; j++){
        let setB = new Set(sequenceWithCPTresults[j]);
        let myScore = jaccard(setA, setB);
        score += myScore;
      }
      allSequences[i].score = score;
    }
    console.log(allSequences);
    let sorted = allSequences.sort( (a, b) => {
      return b.score - a.score; 
    })
    console.log(sorted);
    let top5 = sorted.slice(0,5);
    return top5;
    */
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
 *  
 * @param {*} lastBlock 
 * @param {*} blockType 
 * @param {*} linkType 
 */
function textareaMessagesManager(lastBlock, linkType, recType) {
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
}


/**
 * Fire first a sequence recommendation, a NN based rec, then joins the two 
 * using a voting ensemble. 
 * @param {*} lastBlock 
 * @param {*} blockType 
 */
async function fireFullDataRec(lastBlock, blockType, sequence, linkType) {
  let lastBlockObj;
  console.log("//////////////////////////////////////")
  console.log("FIRING A FULL RECOMMENDATION")
  if (blockType === "trigger") {
    lastBlockObj = DB.createTriggerFromSingleBlock(lastBlock);
  }
  else if (blockType === "action") {
    lastBlockObj = DB.createActionFromSingleBlock(lastBlock);
  }
  else {
    console.log("WRONG RULE TYPE! rule suggestion not fired")
    return false;
  }
  let lastBlockElementAtt = BlockSuggestor.generateElementAttFromRuleElement(lastBlockObj, blockType);
  //call CPT!
  let CPTpredictions = obtainSequenceRec(sequence, RS_values.getPreviousElementToConsider_CPT(), 10);
  let CPTpredictionsCheck = [];
  if (CPTpredictions[0] && CPTpredictions[0].length > 0) { //horrible error handling
    CPTpredictionsCheck = CPTpredictions[0];
  }
  //call NN!
  //Featurs: el_name, el_type, act_type, trigg_type, link_type, negation
  //let test = await neuralNetworkTest().then();
  let NNpredictions;
  try {
    NNpredictions = await neuralNetwork.classify(lastBlockElementAtt.elementName, lastBlockElementAtt.elementType, lastBlockElementAtt.actionType,
      lastBlockElementAtt.triggerType, lastBlockElementAtt.nextOp, lastBlockElementAtt.negation).then();
  }
  catch {
    //if(NNpredictions === "error"){
    if (CPTpredictionsCheck.length > 0) {
      errorMessages.cleanTextAreaAlerts();
      clearSuggestionWorkspace();
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
  clearSuggestionWorkspace();
  let minimumConfidenceFiltered = minimumConfidenceFilter(top5ensembledResults, minimumConfidence);
  let filteredIncompatible = filterIncompatible(minimumConfidenceFiltered, filterIncompatibleCheck, linkType);
  let filteredRepeated = filterRepeated(filteredIncompatible, sequence);
  checkIfRuleEnd(filteredRepeated);
  //let xmlBlocks = DomModifiers.createBlocksFromSuggested(onlySequenceElements); //???
  let onlySequenceElements = mapToOnlyNameObj(filteredRepeated);
  DomModifiers.blocksToSuggestionWorkspace(onlySequenceElements);
}

/**
 * Send a message to the textarea if the rules usually ends after the inserted 
 * rule element 
 * @param {*} list 
 */
function checkIfRuleEnd(list) {
  for (let i = 0; i < list.length; i++) {
    if (list[0].label === "none") {
      errorMessages.oftenRuleEnds();
      break;
    }
  }
  return;
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
  else if (linkType === "or" || linkType === "and") {
    let filtered = list.filter((e) => {
      return checkInActionInfoOnlyName(e.label);
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
 * Generate a suggestion with CPT using the block sequence. If no result is 
 * found, use only the last sequence element. 
 * @param {*} blockSequence 
 */
export function fireOnlySequenceRec(blockSequence, blockType, lastBlock) {
  console.log("//////////////////////////////////////")
  console.log("FIRING A SEQUENCE RECOMMENDATION")
  let predictions = obtainSequenceRec(blockSequence, RS_values.getPreviousElementToConsider_CPT(), 5);
  if (predictions[0] && predictions[0].length > 0) {
    console.log("SEQUENCE PREDICTIONS:");
    console.log(predictions);
    clearSuggestionWorkspace();
    errorMessages.cleanTextAreaAlerts();
    RS_values.setLastRec_CPT(predictions); //save the last prediciton
    let onlySequenceElements = mapToOnlyNameArr(predictions[0]);
    //let xmlBlocks = DomModifiers.createBlocksFromSuggested(onlySequenceElements); //??
    DomModifiers.blocksToSuggestionWorkspace(onlySequenceElements);
    return;
  }
  else {
    let predictions = obtainSequenceRec([lastBlock.type], RS_values.getPreviousElementToConsider_CPT(), 5);
    if (predictions[0] && predictions[0].length > 0) {
      console.log("SEQUENCE PREDICTIONS: ONLY LAST ELEMENT");
      console.log(predictions);
      clearSuggestionWorkspace();
      errorMessages.cleanTextAreaAlerts();
      RS_values.setLastRec_CPT(predictions); //save the last prediciton
      let onlySequenceElements = mapToOnlyNameArr(predictions[0]);
      //let xmlBlocks = DomModifiers.createBlocksFromSuggested(onlySequenceElements); //??
      DomModifiers.blocksToSuggestionWorkspace(onlySequenceElements);
      return;
    }
  }
  errorMessages.suggestorErrorMessages("noSuggestion");
}


/**
 * Generate a suggestion with CPT, do not modify the DOM but returns the result
 * @param {*} blockSequence 
 */
export function fireOnlySequenceRecNoDom(blockSequence, blockType) {
  console.log("//////////////////////////////////////")
  console.log("FIRING A SEQUENCE RECOMMENDATION")
  let elementsToConsider = RS_values.getPreviousElementToConsider_CPT();
  console.log(elementsToConsider);
  let predictions = obtainSequenceRec(blockSequence, elementsToConsider, 5);
  if (predictions[0] && predictions[0].length > 0) {
    console.log("SEQUENCE PREDICTIONS:");
    console.log(predictions);
    let onlySequenceElements = mapToOnlyNameArr(predictions[0]);
    return {
      predictions: predictions,
      onlySequenceElements: onlySequenceElements
    };
  }
}

function obtainSequenceRec(blockSequence, lastNElementsToUse, predictionsNumber) {
  let target = [
    blockSequence
  ];
  console.log("WILL USE THE LAST ", lastNElementsToUse, " ELEMENTS FOR PREDICTION");
  let predictions = CPTmodel.predict(
    target, // Test input
    lastNElementsToUse, // The number of last elements that will be used
    // to find similar sequences, (default: target.length)
    predictionsNumber  // The number of predictions required.
  );
  return predictions
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
 * Ottiene il primo trigger nel blocco regola, estrae dal DB le altre regole che 
 * iniziano per quel trigger, crea la lista di suggerimenti e la trasforma in blocchi
 */
async function suggestorRule() {
  "use strict";
  //let firstTrigger = getFirstTrigger();
  let firstTrigger = getLastTrigger();
  if (!firstTrigger) {
    errorMessages.suggestorErrorMessages("noFirstTrigger");
    return;
  }
  // Non prendere solo regole con first trigger, ma che contengano questo trigger
  let rulesWithFirstTrigger = await DB.getGraphsFromDB(firstTrigger).then();
  if (!rulesWithFirstTrigger || rulesWithFirstTrigger.length === 0) {
    const myCategory = getTriggerCategory(firstTrigger);
    const triggerWithMyCategory = getTriggerWithMyCategory(myCategory);
    // qua ho una lista di nomi di trigger
    rulesWithFirstTrigger = await DB.getGraphsFromDBCategory(triggerWithMyCategory).then();
    firstTrigger = triggerWithMyCategory;
    // qua dovrei avere una lista di regole che cominciano con uno dei trigger estratti precedentemente
    console.log("rules with trigger category: ");
    console.log(rulesWithFirstTrigger);

    if (!rulesWithFirstTrigger || rulesWithFirstTrigger.length === 0) {
      errorMessages.suggestorErrorMessages("noRulesWithTrigger");
      return;
    }

    //suggestorErrorMessages("noRulesWithTrigger");
    //ruleWithFirstTriggerCategory
    //return;
  }
  console.log("rules with trigger: ");
  console.log(rulesWithFirstTrigger);
  const suggestionListObj = await BlockSuggestor.generateSuggestions(rulesWithFirstTrigger, firstTrigger).then();
  if (!suggestionListObj || suggestionListObj.resultPathList.length === 0) {
    errorMessages.suggestorErrorMessages("noSuggestion");
    return;
  }

  const allRules = await DB.getAllGraphsFromDB().then();
  //da suggestionListObj.resultPathList estrai i trigger suggeriti
  let myTriggers = extractTriggersFromSuggestionList(suggestionListObj.resultPathList);
  //prova entrance lightlevel
  //let actionlist = ...
  const bestSuggestion = await BlockSuggestor.findActionSuggestion(myTriggers, allRules).then();
  console.log(bestSuggestion);
  let actionsXml = DomModifiers.createActionBlocksFromSuggested(bestSuggestion);
  /*
  if (bestSuggestion) {
        DomModifiers.createActionBlocksFromSuggested(bestSuggestion);
      }
      else {
        suggestorErrorMessages("noActionSuggestion");
        return;
      }
      */
  let triggersXml = createTriggerBlocksFromSuggested(suggestionListObj.resultPathList);
  DomModifiers.appendFullRuleToSuggestions(triggersXml, actionsXml);

}

let exportSuggestorRule = suggestorRule;
export { exportSuggestorRule };

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
 * Ottiene il primo trigger nel blocco regola, estrae dal DB le altre regole che 
 * iniziano per quel trigger, crea la lista di suggerimenti e la trasforma in blocchi
 */
async function suggestorCategory() {
  const firstTrigger = getFirstTrigger();
  if (!firstTrigger) {
    errorMessages.suggestorErrorMessages("noFirstTrigger");
    return;
  }

  const myCategory = getTriggerCategory(firstTrigger);
  const triggerWithMyCategory = getTriggerWithMyCategory(myCategory);
  // qua ho una lista di nomi di trigger
  const rulesWithFirstTriggerCategory = await DB.getGraphsFromDBCategory(triggerWithMyCategory).then();
  // qua dovrei avere una lista di regole che cominciano con uno dei trigger estratti precedentemente
  console.log("rules with trigger category: ");
  console.log(rulesWithFirstTriggerCategory);
  if (!rulesWithFirstTriggerCategory || rulesWithFirstTriggerCategory.length === 0) {
    errorMessages.suggestorErrorMessages("noRulesWithTrigger");
    return;
  }
  const suggestionListObj = await BlockSuggestor.generateSuggestions(rulesWithFirstTriggerCategory, triggerWithMyCategory).then();
  if (!suggestionListObj || suggestionListObj.resultPathList.length === 0) {
    errorMessages.suggestorErrorMessages("noSuggestion");
    return;
  }
  createBlocksFromSuggested(suggestionListObj.resultPathList);

}

const exportSuggestorCategory = suggestorCategory;
export { exportSuggestorCategory };

/**
 * 
 */
async function suggestorAction() {
  "use strict";
  //  const allMyTriggers = getTriggerList();
  //  console.assert(allMyTriggers, "No triggers!");
  let blocksInRule = createRuleBlocksObj();
  if (blocksInRule && blocksInRule.triggers && blocksInRule.triggers.length > 0) {
    const allRules = await DB.getAllGraphsFromDB().then();
    //AllRules prende la regola sbagliata! mi sa che fa la query sul db normale, non sui graph
    console.log("ALL RULES:");
    console.log(allRules);
    const myTriggers = blocksInRule.triggersRealName;
    console.log(blocksInRule);
    console.log("MY TRIGGERS:");
    console.log(myTriggers);
    if (allRules && allRules.length > 0) {
      // si parte dalle regole che condividono almeno un trigger: inutile fare
      // il controllo di similarità su tutte
      console.log(getActionList());

      const bestSuggestion = await BlockSuggestor.findActionSuggestion(myTriggers, allRules).then();
      if (bestSuggestion) {
        DomModifiers.actionsToSuggestionWorkspace(bestSuggestion);
      }
      else {
        errorMessages.suggestorErrorMessages("noActionSuggestion");
        return;
      }
    }
  }
}
const exportSuggestorAction = suggestorAction;
export { exportSuggestorAction };

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
  let pretty = "";
  allRulesForAnUser.forEach( (e) => {
    pretty += e.rule_obj_str;
    pretty += "\n\n\n\n";
  });
  let blob = new Blob([pretty], { type: "text/plain;charset=utf-8" });
  saveAs(blob, "myRules.txt");
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
export function checkRule() {
  let onlyOneRuleStatus;
  let triggerSequenceStatus;
  let actionSequenceStatus;
  let textError;
  onlyOneRuleStatus = checkOnlyOneRule();
  if (onlyOneRuleStatus === "OK") {
    triggerSequenceStatus = checkTriggerSequence();
    if (triggerSequenceStatus === "OK") {
      actionSequenceStatus = checkActionSequence();
      if (actionSequenceStatus === "OK") {
        return "OK";
      }
      else {
        textError = actionSequenceStatus;
      }
    }
    else {
      textError = triggerSequenceStatus;
    }
  }
  else {
    textError = onlyOneRuleStatus;
  }
  return textError;
}

/**
 * 
 */
export function ruleNonStandardState() {

  DomModifiers.appendActionRevert("rule non standard state");
  console.log("RULE NON STANDARD STATE");
}

/**
 * 
 */
export function ruleStandardState() {
  DomModifiers.appendRuleTypeText("rule standard state");
  console.log("RULE STANDARD STATE");
}



/**
 * 
 */
export function ruleNoState() {
  DomModifiers.appendRuleTypeText("rule no state");
  console.log("RULE NO STATE");
}

/**
 * Avverte che lo stato dell'azione sarà riportato a quello precedente quando
 * ci sono azioni di tipo sostenuto e states
 */
export function setActionRevert() {
  return "";
}

export function removeAtionRevert() {
  return "";
}

/**
 * Avverte della possibilità di ripetizione quando ci sono con azione di tipo 
 * immediato o continuativo e states
 */
function checkActionRepetition() {
  return "";
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
    //    let isTrigger = checkInTriggerInfo(workspace.blockDB_[block]);
    //    if (isTrigger);
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
  /*
   let myChildren = ruleBlock.getChildren();
   for (let i = 0; i < myChildren.length; i++) {
     console.log(myChildren[i]);
     if (checkIfAction(myChildren[i]) || myChildren[i].type==="parallel_dynamic") {
       console.log("RETURN TRUE!!!");
       return true;
     }
   }
   return false;
   */
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
  /*
  for (let i = 0; i < myChildren.length; i++) {
    console.log(myChildren[i]);
    if (myChildren[i].isTrigger || myChildren[i].isTriggerArray) {
      return true;
    }
  }
  return false;
  */
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
 * Controlla solo che ai blocchi parallel_dynamic sia collegato un blocco
 * azione. Serve a evitare parallel nested: da rivedere se ci vuole cercare
 * altri problemi. 
 * @param {*} block 
 */
function checkActionSequenceConsistancy(block) {
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
 * 
 * @param {*} block 
 */
function checkTriggerSequenceConsistancy(block) {
  // se il blocco è trigger, controlla che il collegamento verso il prossimo 
  // blocco sia accettabile, poi richiama ricorsivamente su di esso
  if (checkInTriggerInfo(block)) {
    let isTrigger = checkInTriggerInfo(block);
    if (isTrigger) {
      if (!isEventCondition(block.childBlocks_[0])) {
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
        //else if (BlockSuggestor.isEventCondition(nextBlock)) {
        //console.log("event or condition block: do nothing");
        //}
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
            return "Action sequence is not valid";
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
  let found = false;
  triggerInfo.forEach(function (e) {
    if (e.fullName === trigger.type) {
      found = true;
    }
  });
  return found;
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
  let found = false;
  triggerInfo.forEach(function (e) {
    if (e.fullName === trigger) {
      found = true;
    }
  });
  return found;
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
function checkInActionInfo(action) {
  const actionInfo = getActionInfo();
  let found = false;
  actionInfo.forEach(function (e) {
    if (e.fullName === action.type) {
      found = true;
    }
  });
  return found;
}

/**
 * check if the passed action name can be found in actions db 
 * @param {*} action
 */
export function checkInActionInfoOnlyName(action) {
  const actionInfo = getActionInfo();
  let found = false;
  actionInfo.forEach(function (e) {
    if (e.fullName === action) {
      found = true;
    }
  });
  return found;
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
//    document.getElementById('user-name').innerHTML = "Logged as: " + currentUser;
//    document.getElementById('input-username').value = currentUser;
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
export function removeUserFromLocal(){
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
 * Start the various behaviours that occurs when the recommendation type 
 * is changed: change the recType var, change the texts, call a new rec. 
 */
function suggestorTypeChanged() {
  errorMessages.changeRecTypeDiv();
  let lastBlock = getLastBlock();
  if (lastBlock) {
    let nextBlock = lastBlock.getNextBlock();
    //attach a trigger/action to the trigger/action operator of the prev block
    if (nextBlock === null) {
      ruleSuggestorManager();
    }
    else {
      ruleSuggestorManager(lastBlock, true, nextBlock.blockType);
    }
  }
}



/**
* getter
*/
export function getRecType() {
  return recommendationType;
}

/**
 * 
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
