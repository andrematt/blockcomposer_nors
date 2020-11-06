import {
    getPreviousElementToConsider_CPT, getLastRec_CPT, whatIf_CPT
} from "./rs_values.js";



export const manageSequentialModal = function(){
   let CPT_rec = getLastRec_CPT();
   let previousElementsUsed = getPreviousElementToConsider_CPT();
   
   let message1 = ` 
   These recommendatons are based solely on the structure of the the other rules:
   <br> 
   .... explaination
   `;

   let message2 = `
   the obtained suggestions (with score) are:
   ${CPT_rec}
    `;
   
   let message3 = `
   Suggestions are obtained using these parameters: 
   <br>
   last sequence elements used for recommendation: ${previousElementsUsed}
    `;
   
   let message4 = `
   <h2>What if...</h2>
    I change the previous sequence elements used for obtain a recommendations? 
    <form>
        <label for"prev_elements"> N. of previous elements:</label>
        <select id="prev_elements">
         <option value="1">1</option> 
         <option value="2">2</option> 
         <option value="3">3</option> 
         <option value="4">4</option> 
         <option value="5">5</option> 
        </select>
    </form>
    `;

    let text = `
    <p> 
    ${message1}
    </p>

    <p>
    ${message2}
    </p>
    
    <p>
    ${message3}
    </p>

    <p>
    ${message4}
    </p>
    `;

    document.getElementById("whatIfCPT_button").onclick = whatIf_CPT;
    document.getElementById('modal-3-content').innerHTML = "";
    document.getElementById('modal-3-content').innerHTML = text;



}