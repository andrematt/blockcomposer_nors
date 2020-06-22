goog.provide('Blockly.Blocks.myblocks');
goog.require('Blockly.Blocks');

Blockly.Blocks['dummy_block'] = {
	init: function () {

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
			"tooltip": "Extended state in a time frame",
			"helpUrl": ""
		});
		this.setMovable(false);
	}
};


Blockly.Blocks['action_placeholder'] = {
	init: function () {
		this.jsonInit({
			"type": "action_logic",
			"message0": "Parallel branch %1",
			"args0": [
				{
					"type": "input_dummy",
					"name": "dummy_name"
				},
			],
			"output": null,
			"colour": 150,
			"tooltip": "",

			//"nextStatement": "And",

		});
		this.setNextStatement(true, null);
		this.setMovable(false);
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




// Non più usati
/*
Blockly.Blocks['day'] = {
	init: function () {
		this.jsonInit({
			"type": "time_logic",
			"message0": " %1",
			"args0": [
				{
					"type": "field_date",
					"name": "FIELDNAME",
				}
			],
			"output": "Date",
			"style": "colour_blocks",
			//"colour": "#F3955F",
			"tooltip": "set a day value"
		})
	}
}

Blockly.Blocks['hour_min'] = {
	init: function() {
	  this.jsonInit({
	  "type":"time_logic",
	  "message0": 'Hour: %1',
	  "args0": [
		  {
		  "type": "field_dropdown",
		  "name": "hours",
		  "options": [
			  ["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"],
				  ["04", "04"], ["05", "05"], ["06", "06"], ["07", "07"], ["08", "08"], ["09", "09"], ["10", "10"],
				  ["11", "11"], ["12", "12"], ["13", "13"], ["14", "14"], ["15", "15"], ["16", "16"], ["17", "17"],
				  ["18", "18"], ["19", "19"], ["20", "20"], ["21", "21"], ["22", "22"], ["23", "23"]
	  ]
		  }
	  ],
	  "message1": 'Min: %1',
  "args1": [
		  {
	  "type": "field_dropdown",
	  "name": "hours",
	  "options": [
		["00", "00"], ["01", "01"], ["02", "02"], ["03", "03"], ["04", "04"],
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
	  ]
		  }],
		  "output": "String",
	  "inputsInline" : true,
	  "style": "colour_blocks",
	  //"colour": "#F3955F",
	  "tooltip": "set a time value"
	  });
	}
  };
*/
