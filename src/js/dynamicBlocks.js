

Blockly.Blocks['rule'] = {
  init: function () {
    this.hat = "cap";
    this.gradient = new ColourGradient();
    this.gradient2 = new ColourGradient();
    this.appendStatementInput("TRIGGERS")
      .setCheck([null])
      .appendField("Trigger(s)");

    this.appendDummyInput("SEPARATOR");
    this.appendStatementInput("ACTIONS")
      .setCheck(null)
      .appendField("Action(s)");
  }, onchange: function () {
    /* Adding a vertical gradient to the example block */
    this.gradient.setVerticalGradient(
      this, {
        "start": "#069975",
        "stop": "#065699"
      }, ["TRIGGERS", "SEPARATOR"]
    );

    this.gradient2.setVerticalGradient(
      this, {
        "start": "#069975",
        "stop": "#065699"
      }, ["SEPARATOR", "ACTIONS"]
    );
  }
};



Blockly.Blocks['not_dynamic'] = {
  init: function () {
    var checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
      this.sourceBlock_.updateShape_(pxchecked);
    });
    this.setMovable(false);
    this.blockType = "not_dynamic";
    this.appendDummyInput()
      .appendField("Not");
    this.appendDummyInput()
      .appendField("(Optional) when: ")
      .appendField(checkbox, 'when_input');

    this.setPreviousStatement(true);
    //this.setColour('#3848AC');
    //Blockly.HSV_SATURATION = 0.67;// 0 (inclusive) to 1 (exclusive), defaulting to 0.45
    //Blockly.HSV_VALUE = 0.67; // 0 (inclusive) to 1 (exclusive), defaulting to 0.65
    this.setColour(210);
    this.setTooltip("");
    this.setHelpUrl("");

  },
  mutationToDom: function () {
    let container = document.createElement('mutation');
    let whenInput = (this.getFieldValue('when_input') == 'TRUE');
    container.setAttribute('when_input', whenInput);
    return container;
  },
  domToMutation: function (xmlElement) {
    let hasTimeInput = (xmlElement.getAttribute('when_input') == 'true');
    // Updateshape è una helper function: non deve essere chiamata direttamente ma 
    // tramite domToMutation, altrimenti non viene registrato che il numero di 
    // inputs è stato modificato
    this.updateShape_(hasTimeInput);
  },

  updateShape_: function (passedValue) {
    // Aggiunge o rimuove i value inputs
    if (passedValue) {
      //if(whenInput){
      this.appendDummyInput("when_input_day")
        .appendField(new Blockly.FieldCheckbox("false"), 'day_check')
        .appendField("Day: ")

        .appendField(new Blockly.FieldDate(), 'day_value');

      this.appendDummyInput("when_input_start_hour")
        .appendField(new Blockly.FieldCheckbox("false"), 'start_time_check')
        .appendField("Start time: ")
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

      this.appendDummyInput("when_input_end_hour")
        .appendField(new Blockly.FieldCheckbox("false"), 'end_time_check')
        .appendField("End time: ")
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
      //this.appendValueInput('when_input_day').appendField("Day: ");
      //this.appendValueInput('when_input_start_hour').appendField("Start time: ");
      //this.appendValueInput('when_input_end_hour').appendField("End time: ");
    }
    else {
      if (this.getInput('when_input_day') && this.getInput('when_input_start_hour') && this.getInput('when_input_end_hour')) {
        this.removeInput('when_input_day');
        this.removeInput('when_input_start_hour');
        this.removeInput('when_input_end_hour');
      }
    }
  }
};


Blockly.Blocks['parallel_dynamic'] = {
  lastValue: 2,
  previousValue: 2,
  init: function () {
    console.log("init parallel called");
    this.setInputsInline(true);
    this.blockType = "parallel_dynamic";
    let myField = new Blockly.FieldNumber(this.lastValue, 1, 4, "BRANCHES", function (value) {
      if (this.sourceBlock_) {
        //aggiorna il numero di branches attuale
        this.sourceBlock_.previousValue = this.sourceBlock_.lastValue;
        this.sourceBlock_.lastValue = value;
        console.log("value:", value, "previousValue:", this.sourceBlock_.previousValue)
        //aggiorna la forma del blocco
        this.sourceBlock_.updateShape_(value, this.sourceBlock_.previousValue);
      }
    });


    this.appendDummyInput()
      .appendField("Parallel branches");
    this.appendDummyInput()
      .appendField(myField, 'BRANCHES');
    this.appendStatementInput("HIDE_ME")
      .setCheck(null);

    for (let i = 0; i < this.lastValue; i++) {
      let stdIndex = i + 1;
      let myName = "branch_" + i;
      let myLabel = "Branch " + stdIndex + ": ";
      this.appendValueInput(myName);
      var placeholderBlock = this.workspace.newBlock('action_placeholder');
      //placeholderBlock.appendDummyInput(myName);
      let subBlockConnection = placeholderBlock.outputConnection;
      let mainBlockConnection = this.getInput(myName).connection;
      mainBlockConnection.connect(subBlockConnection);
      // placeholderBlock.setMovable(false);

    }

    this.updateShape_(this.lastValue, this.previousValue);
    this.setColour(150);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    //this.setOutput(true, null);
    this.setTooltip("");
    this.setHelpUrl("");
  },

  mutationToDom: function () {

  },

  domToMutation: function (xmlElement) {

  },


  updateShape_: function (branches_number, old_branches_number) {
    console.log(branches_number, old_branches_number);
    if (branches_number !== old_branches_number) {

      if (branches_number > old_branches_number) {


        for (let i = old_branches_number; i < branches_number; i++) {
          let myName = "branch_" + i;
          console.log(myName);

          this.appendValueInput(myName);
          console.log(this);
        }

      }

      else {

        for (let i = branches_number; i < old_branches_number; i++) {
          let myName = "branch_" + i;
          console.log(myName)
          console.log(this.getInput(myName));
          if (this && this.getInput(myName)) {
            this.removeInput(myName);
          }
        }

      }

    }
  },

};

///////////////////// Non usati
//esempi di mutationtodom etc
//https://stackoverflow.com/questions/46277625/initialize-a-blockly-mutator-within-javascript

Blockly.Blocks['parallel_dynamic_statements'] = {
  init: function () {
    let initialValue = 2;
    let myField = new Blockly.FieldNumber(initialValue, 1, 10, "BRANCHES", function (value) {
      if (this.sourceBlock_) {
        this.sourceBlock_.updateShape_(value);
      }
    });
    var checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
      this.sourceBlock_.updateShape_(pxchecked);
    });

    this.appendDummyInput()
      .appendField("Parallel branches");
    this.appendValueInput("EXTERNAL_EXCEPTION");
    this.appendStatementInput("HIDE_ME")
      .setCheck(null);
    this.appendDummyInput()
      .appendField(myField, 'when');

    //.appendField(myField, 'when');

    this.setColour(230);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    //this.setOutput(true, null);
    this.setTooltip("");
    this.setHelpUrl("");
  },
  updateShape_: function (branches_number) {
    if (branches_number) {

      for (let i = 0; i < 10; i++) {
        let myName = "branch_" + i;
        if (this.getInput(myName)) {
          this.removeInput(myName);
          //this.removeInput("HIDE_ME");
        }
      }
      for (let i = 0; i < branches_number; i++) {
        // this.appendStatementInput("HIDE_ME")
        //.setCheck(null);
        let stdIndex = i + 1;
        let myName = "branch_" + i;
        let myLabel = "Branch " + stdIndex + ": ";
        this.appendStatementInput(myName).appendField(myLabel);
      }
    }
  },
};

Blockly.Blocks['lists_create_with'] = {
  /**
   * Block for creating a list with any number of elements of any type.
   * @this Blockly.Block
   */
  init: function () {
    this.setHelpUrl(Blockly.Msg['LISTS_CREATE_WITH_HELPURL']);
    this.setStyle('list_blocks');
    this.itemCount_ = 2;
    //this.updateShape_();
    this.setOutput(true, 'Array');
    this.setMutator(new Blockly.Mutator(['lists_create_with_item']));
    this.setTooltip(Blockly.Msg['LISTS_CREATE_WITH_TOOLTIP']);
  },
  /**
   * Create XML to represent list inputs.
   * @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    //var container = document.createElement('mutation');
    //container.setAttribute('items', this.itemCount_);
    //return container;
  },
  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement) {
    //this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    //this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace) {
    var containerBlock = workspace.newBlock('lists_create_with_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock('lists_create_with_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput('ADD' + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (var i = 0; i < this.itemCount_; i++) {
      Blockly.Mutator.reconnect(connections[i], this, 'ADD' + i);
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (itemBlock) {
      var input = this.getInput('ADD' + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else if (!this.itemCount_ && !this.getInput('EMPTY')) {
      this.appendDummyInput('EMPTY')
        .appendField(Blockly.Msg['LISTS_CREATE_EMPTY_TITLE']);
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {
      if (!this.getInput('ADD' + i)) {
        var input = this.appendValueInput('ADD' + i);
        if (i == 0) {
          input.appendField(Blockly.Msg['LISTS_CREATE_WITH_INPUT_WITH']);
        }
      }
    }
    // Remove deleted inputs.
    while (this.getInput('ADD' + i)) {
      this.removeInput('ADD' + i);
      i++;
    }
  }
};

Blockly.Blocks['trigger_dynamic'] = {
  init: function () {
    var checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
      this.sourceBlock_.updateShape_(pxchecked);
    });
    this.appendDummyInput()
      .appendField("Not");
    this.appendDummyInput()
      .appendField("(Optional) when: ")
      .appendField(checkbox, 'when');
    this.setOutput(true, null);
    this.setColour(230);
    this.setTooltip("");
    this.setHelpUrl("");
  },
  mutationToDom: function () {
    var container = document.createElement('mutation');
    var whenInput = (this.getFieldValue('when') == 'TRUE');
    container.setAttribute('when_input', whenInput);
    return container;
  },
  domToMutation: function (xmlElement) {
    let hasTimeInput = (xmlElement.getAttribute('when_input') == 'true');
    this.updateShape_(hasTimeInput);  // Helper function for adding/removing 2nd input.
  },

  updateShape_: function (whenInput) {
    // Add or remove a Value Input.
    var inputExists = this.getInput('when_input');
    if (whenInput) {
      if (!inputExists) {
        //this.appendField("Day");
        this.appendValueInput('when_input').appendField("Day: ");
        this.appendValueInput('when_input').appendField("Start time: ");
        this.appendValueInput('when_input').appendField("End time: ");

        //.setCheck('Number');
      }
    } else if (inputExists) {
      this.removeInput('when_input');
      this.removeInput('when_input');
      this.removeInput('when_input');
      //this.removeDummyInput("time");
    }

  }
};

Blockly.Blocks['rule_dynamic'] = {
  init: function () {
    let checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
      this.sourceBlock_.updateShape_(pxchecked);
    });
    this.appendDummyInput()
      .appendField("when: ");
    this.appendStatementInput('events')
    this.appendDummyInput()
      .appendField("if (optional): ")
      .appendField(checkbox, 'if');
    let hideable_condition = this.appendStatementInput('conditions');
    hideable_condition.setVisible(false);
    this.appendDummyInput()
      .appendField("then:");
    this.appendStatementInput('actions');


    //this.setOutput(true, null);
    //this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("");
    this.setHelpUrl("");
  },
  mutationToDom: function () {
    var container = document.createElement('mutation');
    var ifInput = (this.getFieldValue('if') == 'TRUE');
    container.setAttribute('if_input', ifInput);
    return container;
  },
  domToMutation: function (xmlElement) {
    let hasIfInput = (xmlElement.getAttribute('if_input') == 'true');
    this.updateShape_(hasIfInput);  // Helper function for adding/removing 2nd input.
  },
  updateShape_: function (ifInput) {
    // Add or remove a Value Input.
    //var inputExists = this.getInput('if_input');
    if (ifInput) {
      //if (!inputExists) {
      this.inputList.forEach(function (element) {
        if (element.name === "conditions") {
          element.setVisible(true);

        }
      })
      this.appendDummyInput("dummy"); //force block reload
      this.removeInput("dummy");
      //}
    } else {

      let myContainerBlock = this;
      this.inputList.forEach(function (element) {
        if (element.name === "conditions") {

          let children = element.getConnection;
          let children2 = element.getConnectedBlock;
          //element.dispose();
          element.setVisible(false);
          element.appendDummyInput("dummy");
        }
      })
      //hideable_condition.setVisible(false);
      //this.removeInput('if_input');
      this.appendDummyInput("dummy"); //force block reload
      this.removeInput("dummy");
    }

  }
};


Blockly.Blocks['after_dynamic'] = {
  init: function () {
    //let initialValue = 2;
    var checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
      this.sourceBlock_.updateShape_(pxchecked);
    });
    this.appendDummyInput()
      .appendField("Wait after:")
    //.appendField(myField, 'when');
    this.appendValueInput('then_do').appendField("Then do: ");
    this.setColour(230);
    this.setNextStatement(true, null);
    this.setPreviousStatement(true, null);
    this.setTooltip("");
    this.setHelpUrl("");
  },
  mutationToDom: function () {
    var container = document.createElement('mutation');
    var whenInput = (this.getFieldValue('when') == 'TRUE');
    container.setAttribute('when_input', whenInput);
    return container;
  },
  domToMutation: function (xmlElement) {
    let hasTimeInput = (xmlElement.getAttribute('when_input') == 'true');
    this.updateShape_(hasTimeInput);  // Helper function for adding/removing 2nd input.
  },

  updateShape_: function (checked) {
    //todo: questo deve modificare il codice che si genera
  },
};


Blockly.Blocks['action_dynamic'] = {
  init: function () {
    var checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
      this.sourceBlock_.updateShape_(pxchecked);
    });
    this.appendDummyInput()
      .appendField("Wait after:")
    //.appendField(myField, 'when');
    this.appendValueInput('then_do').appendField("Then do: ");
    this.setColour(230);
    this.setNextStatement(true, null);
    this.setPreviousStatement(true, null);
    this.setTooltip("");
    this.setHelpUrl("");
  },
  mutationToDom: function () {
    var container = document.createElement('mutation');
    var whenInput = (this.getFieldValue('when') == 'TRUE');
    container.setAttribute('when_input', whenInput);
    return container;
  },
  domToMutation: function (xmlElement) {
    let hasTimeInput = (xmlElement.getAttribute('when_input') == 'true');
    this.updateShape_(hasTimeInput);  // Helper function for adding/removing 2nd input.
  },

  updateShape_: function (checked) {

  },
};

Blockly.Blocks['not_dynamic_old'] = {

  init: function () {
    var checkbox = new Blockly.FieldCheckbox("false", function (pxchecked) {
      this.sourceBlock_.updateShape_(pxchecked);
    });
    this.appendDummyInput()
      .appendField("Not");
    this.appendDummyInput()
      .appendField("(Optional) when: ")
      .appendField(checkbox, 'when_input');

    this.setPreviousStatement(true);
    this.setColour(230);
    this.setTooltip("");
    this.setHelpUrl("");
  },
  mutationToDom: function () {
    var container = document.createElement('mutation');
    var whenInput = (this.getFieldValue('when_input') == 'TRUE');
    container.setAttribute('when_input', whenInput);
    return container;
  },
  domToMutation: function (xmlElement) {
    let hasTimeInput = (xmlElement.getAttribute('when_input') == 'true');
    // Updateshape è una helper function: non deve essere chiamata direttamente ma 
    // tramite domToMutation, altrimenti non viene registrato che il numero di 
    // inputs è stato modificato
    this.updateShape_(hasTimeInput);
  },

  updateShape_: function (passedValue) {
    // Aggiunge o rimuove i value inputs
    if (passedValue) {
      //if(whenInput){
      this.appendValueInput('when_input_day').appendField("Day: ");
      this.appendValueInput('when_input_start_hour').appendField("Start time: ");
      this.appendValueInput('when_input_end_hour').appendField("End time: ");
    }
    else {
      if (this.getInput('when_input_day') && this.getInput('when_input_start_hour') && this.getInput('when_input_end_hour')) {
        this.removeInput('when_input_day');
        this.removeInput('when_input_start_hour');
        this.removeInput('when_input_end_hour');
      }
    }
  }
};
