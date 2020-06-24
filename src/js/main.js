import * as Init from "./init.js";
import * as DB from "./database_functs.js";
import * as Generators from "./generators.js";
import * as Listeners from "./listeners.js";
import * as Extensions from "./extensions.js";
import * as BlockSuggestor from "./blockSuggestor.js";
import * as Dialog from "./custom-dialog.js";
import * as DomModifiers from "./dom_modifiers.js";



let currentUser;
let myTriggers;
let myActions;
let myWorkspace;
let mySuggestionWorkspace;
let myRule;
let triggerBlocks;
let actionBlocks;
let ruleBlocksArr = [];
let triggerCompleteInfo = [];
let actionCompleteInfo = [];
let triggersXml = "";
let actionsXml = "";
let lastBlocklyEvent = "";
let toolboxTree;
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
let lastTrigger; // Last trigger inserted in workspace
let triggerInWorkspace = []; // keep the triggers in workspace TODO: listener for remove at delete
// Array per le azioni composte da più parti ma da mostrare come una unità
const multipleActions = ["Alarms", "Reminders", "video", "showImage"];
// Array per i trigger multipli
const multipleTriggers = ["relativePosition"];
// Array per i blocchi accessori riguardanti trigger e azioni
const triggerSupportBlocks = ["and", "or", "group", "event", "condition", "not_dynamic"];
const triggerOperators = ["and", "or", "group"];
const actionOperators = ["parallel_dynamic"];
const triggerTimeBlocks = ["day", "hour_min"];
const actionSupportBlocks = ["parallel_dynamic", "action_placeholder"];
let revertPossibility = "remove";

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
  Dialog.overrideDialog();




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
   * Crea dinamicante il blocco per un'azione normale
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
        if(this.timing === "sustained") {
        let container = document.createElement('mutation');
        let revertPossibility = getRevertPossibility();
        container.setAttribute('revert', revertPossibility);
        return container;
        }
      },
      domToMutation: function () { //fa effettivamente cambiare forma
        if(this.timing === "sustained") {
        let revertPossibility = getRevertPossibility();
        // Updateshape è una helper function: non deve essere chiamata direttamente ma 
        // tramite domToMutation, altrimenti non viene registrato che il numero di 
        // inputs è stato modificato
        if(revertPossibility) {
          this.updateShape_(revertPossibility);
        }
      }
      },
    
      updateShape_: function (passedValue) {
        if(passedValue === "add") {
          this.appendDummyInput("ACTION_REVERT")
         //.appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/revert.png", 25, 25, "revert"));
        .appendField("What to do when the condition ends?")
        .appendField(new Blockly.FieldDropdown([["Restore the previous device state","revert"], ["Do not restore","keep"]]), "revert");
        //.appendField(new Blockly.FieldDropdown([["Restore the previous device state","revert"], ["Do not restore","keep"]]));
        }
        else if(passedValue==="remove"){
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
        .appendField(new Blockly.FieldDropdown([["entrance", "ENTRANCE"], ["kitchen", "KITCHEN"], ["bedroom", "BEDROOM"], ["bathroom", "BATHROOM"], ["living room", "LIVINGROOM"], ["corridor", "CORRIDOR"]]), "TRIGGER_VALUE")
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
    Object.freeze(leafData);
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
      block.appendDummyInput()
        .appendField("start: ")
        .appendField(new Blockly.FieldDropdown([["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"],
        ["04", "04"], ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"], ["10", "10"],
        ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"], ["15", "15"], ["16", "16"], ["17", "17"],
        ["18", "18"], ["19", "19"], ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"]]), "Hours")
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
        ]), "Mins")
        .appendField("end: ")
        .appendField(new Blockly.FieldDropdown([["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"],
        ["04", "04"], ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"], ["10", "10"],
        ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"], ["15", "15"], ["16", "16"], ["17", "17"],
        ["18", "18"], ["19", "19"], ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"]]), "Hours")
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
        ]), "Mins");
      /*
      block.appendValueInput("START_TIME")
        .setCheck(null)
        .appendField("Start time", "START_TIME");
      block.appendValueInput("END_TIME")
        .setCheck(null)
        .appendField("End time", "END_TIME");
        */
    }

    else if (leafData.type === "DATE") {
      block.appendDummyInput()

        .appendField(new Blockly.FieldDate());
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
  <category colour="0" name="Rule blocks">
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
      <block type="group"></block>
  </category>
  <sep gap = "8"></sep>
  <category name="Action list" colour="#069975">
    ${actionsXml}
  </category>
  <sep gap = "8"></sep>
  <category name="Action operators" colour="150">
    <block type="parallel_dynamic"></block>
  </category>
  <sep gap = "8"></sep>
</xml>
` ;

    //console.log(newTree);
    let treeCopy = JSON.parse(JSON.stringify(newTree));
    toolboxTree = treeCopy;
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
            <category colour="#065699" name="${cat}">
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
          <category colour="#065699" name="${data.englishDisplayedName}">
        `;

        loadTriggersToolboxRecursive(data.nodes, xml);
        triggersXml += `
          </category>
        `;
      }
      else if (data.attributes !== undefined) {
        //terminal leaf     
        const categoryName = data.englishDisplayedName;
        const categoryRealName = data.realName;
        triggersXml += `
          <category colour="#065699" name="${categoryName}">
        `;
        for (let i = 0; i < data.attributes.length; i++) {
          let blockName = categoryRealName + "-" + data.attributes[i].realName;
          createTriggerDinamically(data.attributes[i], blockName);
          //se non fa parte della lista, disegna normalmente tutti gli
          //attributi come nodi foglia
          if (multipleTriggers.indexOf(data.realName) === -1) {
            triggersXml += ` 
              <block category = "${categoryName}" type="${blockName}" type2="${data.attributes[i].realName}"></block>
            `;
            triggerList.push(blockName);
            const myInfo = {
              fullName: blockName,
              categoryName: categoryName,
              realName: data.attributes[i].realName
            };
            triggerCompleteInfo.push(myInfo);
            //triggerList.push(data.attributes[i].realName);
          }
          //se fa parte della lista, disegna solo il primo attributo
          else {
            if (i === 0) {
              triggersXml += ` 
                <block category = "${categoryName}" type="${blockName}" type2="${data.attributes[i].realName}"></block>
              `;
              triggerList.push(blockName);
              const myInfo = {
                fullName: blockName,
                categoryName: categoryName,
                realName: data.attributes[i].realName
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
  var workspace = Blockly.inject('main-workspace-div',
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

  var suggestionWorkspace = Blockly.inject('suggestion-workspace-div',
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
  
  //workspace.addChangeListener(Listeners.addToCorrectBlock);
  //workspace.addChangeListener(Listeners.lastTriggerListener); //Non viene più usato perché la raccomandazione viene eseguita dopo il controllo sulla correttezza della regola
  workspace.addChangeListener(Listeners.notBlockUpdate);
  workspace.addChangeListener(Listeners.notBlockUpdate);
  workspace.addChangeListener(Listeners.triggerTypeListenerChild);
  workspace.addChangeListener(Listeners.blockDisconnectListener);
  workspace.addChangeListener(Listeners.triggerListener);
  workspace.addChangeListener(Listeners.parallelBranchesUpdateNumber);
  workspace.addChangeListener(Listeners.waitToParallelListener);
  workspace.addChangeListener(Listeners.updateCodeListener);
  workspace.addChangeListener(Listeners.blockDocsListener);
  workspace.addChangeListener(Listeners.ruleTypeListener);
  workspace.addChangeListener(Listeners.autoCheckRule);

  myWorkspace = workspace;
  mySuggestionWorkspace = suggestionWorkspace;
})();

/**
 * Fire a reccomandation after the autoChecker has check the correcteness of the rule
 */ 
export function fireSuggestion(block){
  "use strict";
  console.log("FIRE A RECOMMANDATION");
  console.log(ruleBlocksArr);
  let lastTrigger = getLastTrigger();
  if(lastTrigger !== block.type) {
    setLastTrigger(block.type);
    clearSuggestionWorkspace();
    exportSuggestorRule();
  }
}

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
 * Stampa sull'area dei messaggi il tipo di errore avvenuto
 * @param {*} errorType 
 */
function suggestorErrorMessages(errorType) {
  if (errorType === "noFirstTrigger") {
    let text = "Could not create suggestion for this block type. Suggestions will be created if the first element in the 'trigger' section of 'rule' block is a trigger.";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
  else if (errorType === "noRulesWithTrigger") {
    let text = "Not enough rules were found for this trigger.";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
  else if (errorType === "noSuggestion") {
    let text = "No suggestions were found for this trigger.";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
  else if (errorType === "noActionSuggestion") {
    let text = "No actions to suggest for these triggers";
    document.getElementById('textarea-2').innerHTML = "";
    document.getElementById('textarea-2').innerHTML = text;
  }
}

/**
 * Ottiene il primo trigger nel blocco regola, estrae dal DB le altre regole che 
 * iniziano per quel trigger, crea la lista di suggerimenti e la trasforma in blocchi
 */
/*
async function suggestorTrigger() {
  "use strict";
  const firstTrigger = getFirstTrigger();
  if (!firstTrigger) {
    suggestorErrorMessages("noFirstTrigger");
    return;
  }

  const rulesWithFirstTrigger = await DB.getGraphsFromDB(firstTrigger).then();
  if (!rulesWithFirstTrigger || rulesWithFirstTrigger.length === 0) {
    suggestorErrorMessages("noRulesWithTrigger");
    return;
  }
  console.log("rules with trigger: ")
  console.log(rulesWithFirstTrigger);
  const suggestionListObj = await BlockSuggestor.generateSuggestions(rulesWithFirstTrigger, firstTrigger).then();
  if (!suggestionListObj || suggestionListObj.resultPathList.length === 0) {
    suggestorErrorMessages("noSuggestion");
    return;
  }
  createBlocksFromSuggested(suggestionListObj.resultPathList);
}

let exportSuggestorTrigger = suggestorTrigger;
export { exportSuggestorTrigger };
*/

/**
 * Ottiene il primo trigger nel blocco regola, estrae dal DB le altre regole che 
 * iniziano per quel trigger, crea la lista di suggerimenti e la trasforma in blocchi
 */
async function suggestorRule() {
  "use strict";
  //let firstTrigger = getFirstTrigger();
  let firstTrigger = getLastTrigger();
  if (!firstTrigger) {
    suggestorErrorMessages("noFirstTrigger");
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
      suggestorErrorMessages("noRulesWithTrigger");
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
    suggestorErrorMessages("noSuggestion");
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
    suggestorErrorMessages("noFirstTrigger");
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
    suggestorErrorMessages("noRulesWithTrigger");
    return;
  }
  const suggestionListObj = await BlockSuggestor.generateSuggestions(rulesWithFirstTriggerCategory, triggerWithMyCategory).then();
  if (!suggestionListObj || suggestionListObj.resultPathList.length === 0) {
    suggestorErrorMessages("noSuggestion");
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
        suggestorErrorMessages("noActionSuggestion");
        return;
      }
    }
  }
}
const exportSuggestorAction = suggestorAction;
export { exportSuggestorAction };

/**
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
    document.getElementById('textarea').innerHTML = "No suggestions to drop into main area!";
  }
}
const exportSuggestorDrop = suggestorDrop;
export { exportSuggestorDrop };


/**
 * Non usata
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
export function getRuleBlocksArr(){
  "use strict";
  return ruleBlocksArr;
}

/**
 * 
 */
export function cleanRuleBlocksArr(){
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
  console.log(actionCompleteInfo);
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
  if (myData && myData.categoryName){
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
 * Non usata
 * Extension chiamata quando c'è almeno una condition, abilita il blocco 
 * "until... then"
 * @param {*} workspace 
 */
export function enable_after(workspace) {
  let toolBox = toolboxTree;
  const parser = new DOMParser();
  const srcDOM = parser.parseFromString(toolBox, "application/xml"); //da stringa a DOM document
  let blocks = srcDOM.getElementsByTagName("block");
  for (let item of blocks) {
    if (item.getAttribute("type") === "rule_revert") {
      item.setAttribute("disabled", false)
    }
  }
  let toXml = new XMLSerializer().serializeToString(srcDOM); //da DOM document a xml
  workspace.updateToolbox(toXml);
  workspace.toolbox_.refreshSelection();


}

/**
 * Non usata
 * Extension chiamata quando non ci sono più conditions
 * @param {*} workspace 
 */
export function disable_after(workspace) {
  let toolBox = toolboxTree;
  const parser = new DOMParser();
  const srcDOM = parser.parseFromString(toolBox, "application/xml"); //da stringa a DOM document
  let blocks = srcDOM.getElementsByTagName("block");
  for (let item of blocks) {
    if (item.getAttribute("type") === "rule_revert") {
      item.setAttribute("disabled", true)
    }
  }
  let toXml = new XMLSerializer().serializeToString(srcDOM); //da DOM document a xml
  //naive check if the format is xml
  if (toXml && toXml.charAt(1) === "x") {
    workspace.updateToolbox(toXml);
    workspace.toolbox_.refreshSelection();
  }
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
    .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/event.jpeg", 25, 25, "*"));
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
    .appendField(new Blockly.FieldImage("https://giove.isti.cnr.it/demo/pat/src/img/condition.jpeg", 25, 25, "*"));
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

function getTriggerOps(){
  return triggerOperators;
}

function getActionOps(){
  return actionOperators;
}


/**
 * Controlla se il trigger passato è presente nel db dei trigger
 * @param {*} trigger 
 */
 function checkInTriggerInfoWithName(trigger) {
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
function checkInTriggerOperators(triggerOp) {
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
function checkInActionOperators(actionOp) {
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
    actions_op:[],
    triggersRealName: [],
    actionsRealName: []
  };
  for (let i = 0; i < blocksInRule.length; i++) {
    if (checkInTriggerInfo(blocksInRule[i])) {
      resultObj.triggers.push(blocksInRule[i].name);
      resultObj.triggersRealName.push(blocksInRule[i].type);
    }
    else if (checkInTriggerOperators(blocksInRule[i])){
      resultObj.triggers_op.push(blocksInRule[i].type);
    }
    else if (checkInActionInfo(blocksInRule[i])) {
      resultObj.actions.push(blocksInRule[i].name);
      resultObj.actionsRealName.push(blocksInRule[i].type);
    }
    else if (checkInActionOperators(blocksInRule[i])){
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

/**
 * Controlla se è settato un user nel local storage, se lo è salva nell'user
 * corrente e mostra il nome
 */
function localStorageChecker() {
  let user = window.localStorage.getItem('user');
  if (user) {
    currentUser = user;
    document.getElementById('user-name').innerHTML = "Logged as: " + currentUser;
    document.getElementById('input-username').value = currentUser;
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
 * Restituisce l'user name attualmente salvato nel localstorage
 */
export function getUserName() {
  return currentUser;
}

/**
 * Helper function
 */
export function setLastTrigger(block){
  lastTrigger = block;
}

/**
 * Helper function
 */
export function getLastTrigger(){
  return lastTrigger;
}

/**
 * Helper function
 */
export function setLastBlocklyEvent(event){
  lastBlocklyEvent = event;
}

/**
 * Helper function
 */
export function getLastBlocklyEvent(){
  return lastBlocklyEvent;
}

/**
 * Helper function
 */
export function getRevertPossibility(){
  return revertPossibility;
}

/**
 * Helper function
 */
export function setRevertPossibility(val){
  revertPossibility = val;
}

/**
 * Helper function: clears the secondary workspace
 */ 
export function clearSuggestionWorkspace(){
  let secondWorkspace = getSuggestionWorkspace();
  let allSuggestedBlocks = secondWorkspace.getAllBlocks(false);
  allSuggestedBlocks.forEach( e => e.dispose());
}