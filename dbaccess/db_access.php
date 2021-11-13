<?php
header('Access-Control-Allow-Origin: *');
header('Content-type: application/json');

/**
 * Get di una regola completa, ottenuta tramite ID
 * @param {*} id
 */
function getOne($id) {
   $db = new SQLite3('./rules.sq3');
   $sql = "SELECT * FROM rules WHERE id == '".$id[0]."' ";
   $complete_result=0;
   $result = $db->query($sql);
   $rules = [];
   while ($row = $result->fetchArray(SQLITE3_ASSOC)){
      $rules[] = [
      'id' => $row['id'],
      'user_name' => $row['user_name'],
      'rule_name' => $row['rule_name'],
      'rule_obj_str' => $row['rule_obj_str'],
      'rule_xml_str' => $row['rule_xml_str'],
      'timestamp' => $row['timestamp']
      ];
   }
   unset($db);
   return $rules;
}

/**
 * Get di tutti i result, invia solo id, nome utente, nome regola, trigger e azioni
 */
function getAll($arguments) {
   //$user = $arguments[0];
   $db = new SQLite3('./rules.sq3');
   //$sql = "SELECT * FROM rules WHERE user_name == '".$user."'";
   $sql = "SELECT * FROM rules";
   $complete_result=0;
   $result = $db->query($sql);
   $rules = [];
   while ($row = $result->fetchArray(SQLITE3_ASSOC)){
      $rules[] = [
      'id' => $row['id'],
      'user_name' => $row['user_name'],
      'rule_name' => $row['rule_name'],
      'triggers_str' => $row['triggers_str'],
      'rule_obj_str' => $row['rule_obj_str'],
      'actions_str' => $row['actions_str']
      ];
   }
   unset($db);
   return $rules;
}


/**
 * Get di tutti i result di un user, invia solo id, nome utente, nome regola, trigger e azioni
 */
function getAllFromUser($arguments) {
   $user = $arguments[0];
   $db = new SQLite3('./rules.sq3');
   $sql = "SELECT * FROM rules WHERE user_name == '".$user."'";
   $complete_result=0;
   $result = $db->query($sql);
   $rules = [];
   while ($row = $result->fetchArray(SQLITE3_ASSOC)){
      $rules[] = [
      'id' => $row['id'],
      'user_name' => $row['user_name'],
      'rule_name' => $row['rule_name'],
      //'rule_goal' => $row['rule_goal'],
      'triggers_str' => $row['triggers_str'],
      'actions_str' => $row['actions_str']
      ];
   }
   unset($db);
   return $rules;
}

/**
 * Get di tutti i result di un user, invia tutti i campi recuperati
 */
function getAllFromUserFullRule($arguments) {
   $user = $arguments[0];
   $db = new SQLite3('./rules.sq3');
   $sql = "SELECT * FROM rules WHERE user_name == '".$user."'";
   $complete_result=0;
   $result = $db->query($sql);
   $rules = [];
   while ($row = $result->fetchArray(SQLITE3_ASSOC)){
      $rules[] = [
      'id' => $row['id'],
      'user_name' => $row['user_name'],
      'rule_name' => $row['rule_name'],
      'rule_obj_str' => $row['rule_obj_str'],
      'rule_xml_str' => $row['rule_xml_str'],
      'first_trigger' => $row['first_trigger'],
      'timestamp' => $row['timestamp'],
      'triggers_str' => $row['triggers_str'],
      'actions_str' => $row['actions_str']
      ];
   }
   unset($db);
   return $rules;
}

/**
 * Get all rule sequences. Used to initialize CPT
 */
function getAllSequences($arguments){
   //$user = $arguments[0];
   $db = new SQLite3('./rules.sq3');
   $sql = "SELECT * FROM rules_sequence";
   $complete_result=0;
   $result = $db->query($sql);
   $rules = [];
   while ($row = $result->fetchArray(SQLITE3_ASSOC)){
      $rules[] = [
      'id' => $row['id'],
      'rule_sequence' => $row['rule_sequence'],
      ];
   }
   unset($db);
   return $rules;
}

/**
 * Get all the element/attributes entries. Used to initialize NN
 */
function getAllElementAtt($arguments){
   $db = new SQLite3('./rules.sq3');
   $sql = "SELECT * FROM rules_element_attribute";
   $complete_result=0;
   $result = $db->query($sql);
   $rules = [];
   while ($row = $result->fetchArray(SQLITE3_ASSOC)){
      $rules[] = [
      'id' => $row['id'],
      'referred_rule' => $row['referred_rule'],
      'element_name' => $row['element_name'],
      'next_element' => $row['next_element'],
      'element_type' => $row['element_type'],
      'trigger_type' => $row['trigger_type'],
      'action_type' => $row['action_type'],
      'negation' => $row['negation'],
      'link_type' => $row['link_type']
      ];
   }
   unset($db);
   return $rules;
}


/**
 * Riceve una lista di nomi di trigger, restituisce gli IDs delle regole che 
 * hanno come primo trigger i trigger passati
 */
function getIdsMultiple($trigger){
$db = new SQLite3('./rules.sq3');
$sql = "";
//return($trigger);
// please do not judge me
for ($i = 0; $i < count($trigger); $i++) {
   if($i < count($trigger)-1){
      $sql .= "SELECT * FROM rules WHERE first_trigger = '".$trigger[0][$i]."' UNION " ;
   }
   else {
      $sql .= "SELECT * FROM rules WHERE first_trigger = '".$trigger[0][$i]."' " ;
   }
}
$complete_result=0;
$result = $db->query($sql);
$rules = [];
while ($row = $result->fetchArray(SQLITE3_ASSOC)){
   $rules[] = [
   'id' => $row['id']
   ];
}
unset($db);
return $rules;
}



/**
 * Save a rule obj
 * @param {*} argsArr
 */
function save($argsArr){
$safeRuleName = SQLite3::escapeString($argsArr[2]);
$safeXml = SQLite3::escapeString($argsArr[4]);
$safeObj = SQLite3::escapeString($argsArr[3]);
//error_log($safeXml);
//error_log($safeObj);
   $db = new SQLite3('./rules.sq3');
   $sql =  "INSERT INTO rules ('id', 'user_name', 'rule_name', 'rule_obj_str', 'rule_xml_str', 'first_trigger', 'timestamp', 'triggers_str', 'actions_str') VALUES('".$argsArr[0]."', '".$argsArr[1]."', '".$safeRuleName."', '".$safeObj."', '".$safeXml."', '".$argsArr[5]."', '".$argsArr[6]."', '".$argsArr[7]."', '".$argsArr[8]."');";
   $result = $db->query($sql);
   unset($db);
}

/**
 * Save a rule sequence
 * @param {*} argsArr
 */
function saveSingleSequence($argsArr){
   $db = new SQLite3('./rules.sq3');
   $sql =  "INSERT INTO rules_sequence ('id','rule_sequence') VALUES('".$argsArr[0]."', '".$argsArr[1]."');";
   $result = $db->query($sql);
   unset($db);
   return "save sequence ok";
}

/**
 * Save a list of element/attribute entries 
 */
function saveElementAtt($argsArr){
   $db = new SQLite3('./rules.sq3');
   error_log(count($argsArr[0]));
   for ($i = 0; $i < count($argsArr[0]); $i++) {
      $id = $argsArr[0][$i]['id'];
      $referredRule = $argsArr[0][$i]['referredRule'];
      $elementName = $argsArr[0][$i]['elementName'];
      $nextElement = $argsArr[0][$i]['nextElement'];
      $elementType = $argsArr[0][$i]['elementType'];
      $triggerType = $argsArr[0][$i]['triggerType'];
      $actionType = $argsArr[0][$i]['actionType'];
      $negation = $argsArr[0][$i]['negation'];
      $linkType = $argsArr[0][$i]['nextOp'];
      $db = new SQLite3('./rules.sq3');
      $sql =  "INSERT INTO rules_element_attribute ('id', 'referred_rule', 'element_name', 'next_element', 'element_type', 'trigger_type', 'action_type', 'negation', 'link_type') VALUES('".$id."', '".$referredRule."','".$elementName."', '".$nextElement."', '".$elementType."', '".$triggerType."','".$actionType."', '".$negation."', '".$linkType."');";
      $result = $db->query($sql);
   }
   unset($db);
   return "save elementatt ok";
}

/**
 * Delete a rule obj
 */
function deleteRule($argsArr){
   $db = new SQLite3('./rules.sq3');
   $sql = "DELETE FROM rules WHERE id == '".$argsArr[0]."' ";
   $result = $db->query($sql);
   unset($db);
}

/**
 * Delete a rule sequence
 */
function deleteSequence($argsArr){
   $db = new SQLite3('./rules.sq3');
   //$fakeId = "dbId_5d628c9461d89";
   //$sql = "DELETE FROM rules WHERE id == '".$fakeId."' ";
   $sql = "DELETE FROM rules_sequence WHERE id == '".$argsArr[0]."' ";
   $result = $db->query($sql);
   unset($db);
}

/**
 * Delete all the entries from the element/att table that matches with the 
 * passed ID 
 */
function deleteElementAttribute($argsArr){
   error_log("DELETING ELEMENT ATT!!");
   error_log($argsArr[0]);
   $db = new SQLite3('./rules.sq3');
   $sql = "DELETE FROM rules_element_attribute WHERE referred_rule == '".$argsArr[0]."' ";
   $result = $db->query($sql);
   unset($db);
}

$aResult = array();
   
if( !isset($_POST['functionname']) ) { $aResult['error'] = 'No function name!'; }
if( !isset($_POST['arguments']) ) { $aResult['error'] = 'No function arguments!'; }
if( !isset($aResult['error']) ) {

   switch($_POST['functionname']) {
      case 'save':
         if( !is_array($_POST['arguments']) ) {
            $aResult['error'] = 'Arguments is not an array or wrong arguments number!';
         }
         else {
            save($_POST['arguments']);
         }
      break;

      case 'saveSingleSequence':
            if( !is_array($_POST['arguments']) ) {
                  $aResult['error'] = 'Arguments is not an array or wrong arguments number!';
            }
            else {
                 $result = saveSingleSequence($_POST['arguments']);
                 $aResult['result'] = $result;
            }
      break;
      
      case 'saveElementAtt':
            if( !is_array($_POST['arguments']) ) {
                  $aResult['error'] = 'Arguments is not an array or wrong arguments number!';
            }
            else {
                 $result = saveElementAtt($_POST['arguments']);
                 $aResult['result'] = $result;
            }
      break;

      case 'deleteRule':
            if( !is_array($_POST['arguments']) || (count($_POST['arguments']) !== 1) ) {
                  $aResult['error'] = 'Arguments is not an array or wrong arguments number!';
            }
            else {
                 deleteRule($_POST['arguments']);
            }
      break;

      case 'deleteSequence':
         if( !is_array($_POST['arguments']) || (count($_POST['arguments']) !== 1) ) {
               $aResult['error'] = 'Arguments is not an array or wrong arguments number!';
         }
         else {
              deleteSequence($_POST['arguments']);
         }
      break;
         
      case 'deleteElementAttribute':
         if( !is_array($_POST['arguments']) || (count($_POST['arguments']) !== 1) ) {
               $aResult['error'] = 'Arguments is not an array or wrong arguments number!';
         }
         else {
              deleteElementAttribute($_POST['arguments']);
         }
      break;

      case 'getIdsMultiple':
         $result=getIdsMultiple($_POST['arguments']);
         $aResult['result'] = $result;
      break;  
      
      case 'getAll':
               $result=getAll($_POST['arguments']);
               $aResult['result'] = $result;
      break;   

      case 'getAllFromUser':
               $result=getAllFromUser($_POST['arguments']);
               $aResult['result'] = $result;
      break;   

      case 'getAllFromUserFullRule':
               $result=getAllFromUserFullRule($_POST['arguments']);
               $aResult['result'] = $result;
      break;   

      case 'getAllSequences':
         $result=getAllSequences($_POST['arguments']);
         $aResult['result'] = $result;
      break;
      
      case 'getAllElementAtt':
         $result=getAllElementAtt($_POST['arguments']);
         $aResult['result'] = $result;
      break;

      case 'getOne':
               $result=getOne($_POST['arguments']);
               $aResult['result'] = $result;
      break;   

      default:
               $aResult['error'] = 'Not found function '.$_POST.'!';
      break;
   }

}
 

echo json_encode($aResult);
return json_encode($aResult);



?>
