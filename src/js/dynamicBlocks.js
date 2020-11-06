
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
      .appendField("Negation is applied to this block");
    this.appendDummyInput()
    //  .appendField("(Optional) when: ")
    //  .appendField(checkbox, 'when_input');

    this.setPreviousStatement(true);
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

function ColourGradient() {

  var svg = null;		/* SVG root Element */
  var svgNS = null;	/* SVG namespace */
  var defs = null;	/* SVG defs Element*/
  var id = null;		/* Block Id */
  
/**
   * Constructor inits SVG DOM.
   */
  var __construct = function() {
      svg = document.getElementsByTagName("svg")[0];
      defs = svg.getElementsByTagName("defs")[0];   
      svgNS = svg.namespaceURI;
  }()

  /**
   * Setting a horizontal colour gradient from the colour of this block
 * to the colour of the parent block.
 * 
 * @param {Blockly.Block} block Current block that has the starting colour for the gradient.
   * @param {String} startColor Color as hex value for starting the gradient.
 * @param {String} endColor Color as hex value for ending the gradient.
 */
  this.setHorizontalGradient = function(block, startColor, endColor) {
      var parentBlock = block.getParent();
  id = "gradient_" + parentBlock.id + "_" + block.id;
  
      var colors = {
          start : (startColor) ? startColor : parentBlock.getColour(),
          end : (endColor) ? endColor: block.getColour()
      }; 

      var parentBlockSvg = parentBlock.getSvgRoot().getElementsByClassName("blocklyPath")[0];
      var gradientNode = document.getElementById(id);
      var stops = [
          { "offset" : "20%", "stop-color" : colors.start },
          { "offset" : "80%", "stop-color" : colors.end }
      ];

      if (!gradientNode) {    /* Creating new linearGradient Node in SVG */
          gradientNode = createGradient(stops, false); 
      } else {                /* Updating linearGradient Node */
          updateGradient(gradientNode, stops);
      }
      
      parentBlockSvg.setAttribute("fill", "url('#" + id + "')");
  };

  /**
   * Setting a vertical colour gradient of this block.
 * 
 * @param {Object} block Current block that has the starting colour for the gradient.
 * @param {Object} colors JSON with start and stop color for the gradient.
 * @param {Array} inputs Array with the names of the inputs that should be calculated for the height.
   */
  this.setVerticalGradient = function(block, colors, inputs) {
      if (!block && !colors && !inputs)
          return false;

      id = "gradient_" + block.id;

      /* Disabling because the ColourGradient updates the colour */
      block.updateColour = function() {};

      var blockSvg = block.getSvgRoot().getElementsByClassName("blocklyPath")[0];
      var gradientNode = document.getElementById(id);
      var height = 0;
      var heightHundredth = 100 / block.getHeightWidth().height;
      
      inputs.forEach(function (entry) {
          var input = block.getInput(entry);
          if (input)
              if (input.renderHeight)
                  height += input.renderHeight;
      });

      height = heightHundredth * height;

      var stops = [
          { "offset" : (height - 5) + "%", "stop-color" : colors.start },
          { "offset" : (height + 5) + "%", "stop-color" : colors.stop }
      ];

      if (!gradientNode) {    /* Creating new linearGradient Node in SVG */
          gradientNode = createGradient(stops, true); 
      } else {                /* Updating linearGradient Node */
          updateGradient(gradientNode, stops);
      }
      
      blockSvg.setAttribute("fill", "url('#" + id + "')");
  };
  
  /**
   * Updating existing gradient.
   * 
   * @param {Element} grad <linearGradient> SVG Element
   * @param {Json} stops stop attributes
   */
  var updateGradient = function(grad, stops) {
      var stopNodes = grad.getElementsByTagName("stop");
             
      for (var cnt = 0; cnt < stopNodes.length; cnt++) {
          var attrs = stops[cnt];
          var stop = stopNodes[cnt];

          for (var attr in attrs) {
              stop.setAttribute(attr, attrs[attr]);
          }
      }
  }.bind(this);
  
  /**
   * Creating linearGradient and appending it to <defs> in svg.
   * 
   * @param {Object} stops Json attributes  
   * @param {bool} isVertical true vertical false horizontal
 * @return {Element} defs Returning defs element with the created linear gradients.
   */
  var createGradient = function(stops, isVertical) {
      var grad  = document.createElementNS(svgNS, "linearGradient");
      grad.setAttribute("id", id);
      
      if (isVertical) {
          grad.setAttribute("x1", "0");
          grad.setAttribute("x2", "0");
          grad.setAttribute("y1", "1");
          grad.setAttribute("y2", "0");
      }

      for (var i = 0; i < stops.length; i++) {
          var attrs = stops[i];
          var stop = document.createElementNS(svgNS, "stop");
          
          for (var attr in attrs) {
              if (attrs.hasOwnProperty(attr)) 
                  stop.setAttribute(attr, attrs[attr]);
          }

          grad.appendChild(stop);
      }

      return defs.appendChild(grad);
  }.bind(this);
}
