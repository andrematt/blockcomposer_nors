import { eventSelected, conditionSelected } from "./main.js";

// This funct is only used for the event/condition selection, because we want a 
// window that can't be dismissed. May be done using micromodals, but this 
// works just fine. 

/**
 * Override blockly default prompt
 *
 * Copyright 2016 Google Inc.
 * https://developers.google.com/blockly/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * An example implementation of how one might replace Blockly's browser
 * dialogs. This is just an example, and applications are not encouraged to use
 * it verbatim.
 *
 * @namespace
 */

export function overrideDialog() {
  let CustomDialog = {};

  Blockly.prompt = function (message, blockId) {
    CustomDialog.show(message, blockId);
  }

  CustomDialog.hide = function () {
    if (CustomDialog.backdropDiv_) {
      CustomDialog.backdropDiv_.style.display = 'none';
      CustomDialog.dialogDiv_.style.display = 'none';
    }
  }

  CustomDialog.show = function (message, blockId) {

    let myOnEvent = function () {
      eventSelected(blockId);
    }

    let myOnCondition = function () {
      conditionSelected(blockId);
    }

    var backdropDiv = CustomDialog.backdropDiv_;
    var dialogDiv = CustomDialog.dialogDiv_;
    if (!dialogDiv) {
      // Generate HTML
      backdropDiv = document.createElement('div');
      backdropDiv.id = 'customDialogBackdrop';
      backdropDiv.style.cssText =
        'position: absolute;' +
        'top: 0; left: 0; right: 0; bottom: 0;' +
        'background-color: rgba(0, 0, 0, .7);' +
        'z-index: 100;';
      document.body.appendChild(backdropDiv);

      dialogDiv = document.createElement('div');
      dialogDiv.id = 'customDialog';
      dialogDiv.style.cssText =
        'background-color: #fff;' +
        'width: 600px;' +
        'margin: 20px auto 0;' +
        'padding: 10px;';
      backdropDiv.appendChild(dialogDiv);

      dialogDiv.onclick = function (event) {
        event.stopPropagation();
      };

      CustomDialog.backdropDiv_ = backdropDiv;
      CustomDialog.dialogDiv_ = dialogDiv;
    }
    backdropDiv.style.display = 'block';
    dialogDiv.style.display = 'block';

    dialogDiv.innerHTML =
      `
      <header class="customDialogTitle"></header>
      <p class="customDialogMessage"></p>

      <div class="grid-container-event-condition">
      <div class="event-icon">  <p> <img src = "https://giove.isti.cnr.it/demo/pat/src/img/event.jpeg"> </p> </div>
      <div class="event-desc">   <p>     Punctual happening in a time frame  </p>  </div>
      <div class="event-examples"> <p>
          - when user enters a room, <br>
          - when it starts to rain, <br>
          - when kitchen temperature exceedes 30 degrees, <br>
          - at 8 o'clock 
          </p>
      </div>
      <div class="event-button">
      <p>
        <button class="pure-button" id="customDialogEvent">Event</button>
      </p>
      </div>
      <div class="condition-icon">  <p>  <img src = "https://giove.isti.cnr.it/demo/pat/src/img/condition.jpeg"> </p> </div>
      <div class="condition-desc"> <p> Protracted state in a time frame  </p>  </div>
      <div class="condition-examples">  
      <p>
          - while user is inside a room, <br>
          - as long as it\'s raining, <br>
          - while kitchen temperature is over 30 degrees, <br>
          - between 20:00 and 23:30
          </p>
      </div>
      <div class="condition-button"> 
      <p> 
      <button class="pure-button" id="customDialogCondition">Condition</button>
      </p></div>
    </div>
`;
    dialogDiv.getElementsByClassName('customDialogTitle')[0]
      .appendChild(document.createTextNode(message));


    var onEvent = function (event) {
      CustomDialog.hide();
      myOnEvent && myOnEvent();
      event && event.stopPropagation();
    };
    var onCondition = function (event) {
      CustomDialog.hide();
      myOnCondition && myOnCondition();
      event && event.stopPropagation();
    };

    var dialogInput = document.getElementById('customDialogInput');
    CustomDialog.inputField = dialogInput;
    if (dialogInput) {
      dialogInput.focus();

    }

    document.getElementById('customDialogEvent')
      .addEventListener('click', onEvent);


    document.getElementById('customDialogCondition')
      .addEventListener('click', onCondition);


    //backdropDiv.onclick = onCancel;
  };


}
