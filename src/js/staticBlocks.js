goog.provide('Blockly.Blocks.myblocks');
goog.require('Blockly.Blocks');


Blockly.Blocks['event-condition'] = {
	init: function () {
		this.jsonInit({
			"type": "block_type", 
			"message0": "%1 When",
			"args0": [
			  {
				"type": "field_dropdown",
				"name": "triggerType",
				"options": [
				  [
					"event",
					"EVENT"
				  ],
				  [
					"condition",
					"CONDITION"
				  ]
				]
			  }
			],
			"output": "Number", 
			"colour": "#065699",
			"tooltip": "event / condition selection block",
			"helpUrl": ""
		});
		this.setMovable(false);
	}
};

Blockly.Blocks['event'] = {
	init: function () {
		this.jsonInit({
			"type": "block_type",
			"message0": "When (event) %1",
			"args0": [
				{
					"type": "field_image",
					"src": "https://giove.isti.cnr.it/demo/pat/src/img/event.jpeg",
					"width": 25,
					"height": 25,
					"alt": "*",
					"flipRtl": false
				}
			],
			"output": "Number", 
			"colour": "#065699",
			"tooltip": "Punctual happening in a time frame",
			"helpUrl": ""
		});
		this.setMovable(false);
	}
};

Blockly.Blocks['condition'] = {
	init: function () {
		this.jsonInit({
			"type": "block_type",
			"message0": "If (condition) %1",
			"args0": [
				{
					"type": "field_image",
					"src": "https://giove.isti.cnr.it/demo/pat/src/img/condition.jpeg",
					"width": 25,
					"height": 25,
					"alt": "*",
					"flipRtl": false
				}
			],
			"output": "Number",
			//"previousStatement" : null,	 
			"colour": "#065699",
			"tooltip": "Protracted state in a time frame",
			"helpUrl": ""
		});
		this.setMovable(false);
	}
};

Blockly.Blocks['sequential'] = {
	init: function () {
		this.jsonInit({
			"type": "sequential",
			"message0": "Sequential",
			"colour": 150,
			//"colour": "#F3955F",
			"tooltip": "SEQUENTIAL operator between actions",
			"previousStatement": null,
			"nextStatement": null
		});
		this.blockType = "sequential";
	}
}

Blockly.Blocks['parallel'] = {
	init: function () {
		this.jsonInit({
			"type": "parallel",
			"message0": "Parallel",
			"colour": 150,
			//"colour": "#F3955F",
			"tooltip": "PARALLEL operator between actions",
			"previousStatement": null,
			"nextStatement": null
		});
		this.blockType = "parallel";
	}
}

Blockly.Blocks['action_placeholder'] = {
	init: function () {
		this.jsonInit({
            "blockType" : "action_placeholder",
			"message0": "Parallel branch %1",
			"args0": [
				{
					"type": "input_dummy",
					"name": "dummy_name"
				},
			],
			"output": null,
			"colour": 150,
			"tooltip": "Place an action under this block",

			//"nextStatement": "And",

		});
		this.setNextStatement(true, null);
		this.setMovable(false);
        this.blockType = "action_placeholder";
	}
}

Blockly.Blocks['and'] = {
	init: function () {
		this.jsonInit({
			"type": "and",
			"message0": "And",
			"style": "logic_blocks",
			//"colour": "#F3955F",
			"tooltip": "AND operator between triggers",
			"previousStatement": null,
			"nextStatement": null
		});
		this.blockType = "and";
	}
}

Blockly.Blocks['or'] = {
	init: function () {
		this.jsonInit({
			"type": "or",
			"message0": "Or",
			"style": "logic_blocks",
			//"colour": "#F3955F",
			"tooltip": "OR operator between triggers",
			"previousStatement": null,
			"nextStatement": null
		});
		this.blockType = "or";
	}
}

Blockly.Blocks['group'] = {
	init: function () {
		this.jsonInit({
			"type": "trigger_logic",
			"message0": "Group: %1",
			"style": "logic_blocks",
			//"colour": "#F3955F",
			"args0": [
				{
					"type": "input_statement",
					"name": "TRIGGER_GROUP",
				}
			],
			"setCheck": ["and"],
			"previousStatement": null,
			"nextStatement": null,
			//"style": "logic_blocks"
		});
		this.blockType = "group";
	}
};



