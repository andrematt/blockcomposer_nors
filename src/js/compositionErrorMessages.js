export function printError(child, parent){
    "use strict";
    //console.log(child);
    let message = " Warning: Default error message";
    if(child.isTrigger && parent.type==="rule"){
        message = " Warning: trigger blocks must be placed in the Trigger section of the rule block!";
    }
    else if(child.isAction && parent.type==="rule"){
        message = " Warning: action blocks must be placed in the Action section of the rule block!";
    }
    document.getElementById('textarea-2').innerHTML = `
        <p style="warning-message"><i class="fas fa-exclamation-triangle"></i>${message}</p> 
    `
    ;
    //ocument.getElementById('textarea-2').innerHTML = message;
}

export function printPassedError(error){
    "use strict";
    let message = "";
    switch (error) {
        case "too_complex_rule":
            message = "rule too complex, not saved";
            break;
        case "wrong_protocol":
            message = `Current protocol is https, but Rule Manager URL is http.<br>\n\
                       This request has been blocked because the content must be served over HTTPS, please update the the Rule Manager URL in settings section.<br>\n\
                       Protocol HTTPS - Port: 8443`;
            break;
        case "no_node_adress":
            message ="Node server not Found or URL is not Valid";
            break;
            
        default:
            message = "default error message";
    }
    document.getElementById('textarea-2').innerHTML = `
    <p style="warning-message"><i class="fas fa-exclamation-triangle"></i>${message}</p> 
    `
    ;
}

export function cleanError(){
    "use strict";
    document.getElementById('textarea-2').innerHTML = "";
}