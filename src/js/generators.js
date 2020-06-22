import { getWorkspace, getTriggerList, setTriggerList, getActionList, setActionList} from "./main.js";
let lastLinkedBlockId;

Blockly.JavaScript['action_placeholder'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['after_all'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['after_dynamic'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['parallel_dynamic'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['parallel_dynamic_or'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['action'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['action_parallel'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['rule_revert'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['event'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['condition'] = function(block) {
  return 'TODO json';
};
Blockly.JavaScript['rule_type'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['rule_when_then'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['rule_if_then'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['rule_when_if_then'] = function(block) {
  return 'TODO json';
};

Blockly.JavaScript['rule'] = function(block) {

   Blockly.JavaScript.statementToCode(block, 'TRIGGERS');
   Blockly.JavaScript.statementToCode(block, 'ACTIONS');
    return ("la textarea potrebbe essere usata per generare NL?");
  };

  Blockly.JavaScript['hour_min'] = function(block){
    return ' hour min ';
  }

  Blockly.JavaScript['day'] = function(block){
    return "day";
  }

  Blockly.JavaScript['event_static'] = function(block) {
    return ' event static ';
  };

  Blockly.JavaScript['condition_static'] = function(block) {
    return ' condition static ';
  };

  Blockly.JavaScript['action_static'] = function(block) {
    return ' action static ';
  };

  Blockly.JavaScript['group'] = function(block) {
    let myWorkspace = getWorkspace();
    let triggerList = getTriggerList();
    let actionList = getActionList();
    //console.log("group");
    //console.log(myWorkspace);
    //console.log("all blocks: ")
    //console.log(myWorkspace.getAllBlocks());
    return 'TODO json';
  };

  Blockly.JavaScript['and'] = function(block) {
    return ' and ';
  };

  Blockly.JavaScript['or'] = function(block) {
    return ' or ';
  };

  Blockly.JavaScript['not_dynamic'] = function(block) {
    return 'TODO json';
  };

  Blockly.JavaScript['to_group'] = function(block) {
    //generateAnotherBlock(block); //probably not the best way...
    //lastLinkedBlockId = block.id;
    return 'TODO json';
  };
  