// @ts-check

/**
 * Restituisce il testo di suggerimento relativo al blocco passato
 * @param {*} block
 */
export function getBlockDesc(block) {
  switch (block.type) {
    case "group":
      return "Groups triggers in a sub-expression, whose operators have precedence over external triggers.";
      break;
    case "and":
      return "Triggers joined by this operator must be valid in the same time window.";
      break;
    case "or":
      return "It is enough that one of the triggers joined by this operator is valid (in the same time window).";
      break;  
    case "not_dynamic":
      return "Applies a negation on the trigger, with the possibility to specify a time window.";
      break;    
    case "rule":
      return "Insert triggers and actions in the corresponding spaces in the 'rule' block.";
      break;
    case "event":
      return "Trigger labeled as events will be checked as punctual happenings in a time frame.";
      break;
    case "condition":
      return "Trigger labeled as conditions will be checked as extended happenings in a time frame.";
      break;
    case "parallel_dynamic":
      return "The actions inserted in the parallel branches will be started at the same time, independently of the other branches.";
      break;
    case "action_placeholder":
      return "This block indicates the start of a sequence of parallel actions.";
      break;
    case "day":
      return "This block represents the date of a day.";
     break;
     case "hour_min":
     return "This block represents a time, usable as start or end time.";
    break;
    default:
      return "Insert this block in the corresponding 'trigger(s)' or 'action(s)' space in the 'rule' block.";
  }
}
