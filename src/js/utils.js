export const dimensionIdTranslator = (id) => {
    switch (id) {
        case 1: return 'entrance';
        default: return 'default';
    }
}


export const createTimestamp = () => {
    let ts = new Date();
    let gg = ts.getDate();
    let mm = ts.getMonth();
    let aaaa = ts.getFullYear();
    let hh = ts.getHours();
    let min = ts.getMinutes();
    let ss = ts.getSeconds();
    let millisec = ts.getMilliseconds();
    return gg + "-" + mm + "-" + aaaa + "-" + hh + "-" + min + "-" + ss + "-" + millisec;
}

/**
 * Jaccard con peso. Funziona come l'indice di jaccard standard (intersezione
 * su unione), ma da un peso di 0.25 (invece che 0) agli elementi che 
 * condividono la categoria di appartenenza, per non fare andare perduta 
 * questa informazione. 
 * @param {*} setA 
 * @param {*} setB 
 */
export function weightedJaccard(setA, setB) {
  "use strict";
  let numerator = 0;
  let denominator = 0;
  const weight = 0.33;
  // intersezione
  for (let itemA of setA) {
    if (setB.has(itemA)) {
      numerator ++;
    }
    else {
      for (let itemB of setB) {
        const categoryA = Main.getTriggerCategory(itemA);
        const categoryB = Main.getTriggerCategory(itemB);
        if (categoryA && categoryB && categoryA === categoryB) {
          numerator += weight;
        }
      }
    }
  }
  // unione  
  const union = new Set();
  setA.forEach(e => {
    union.add(e);
  });
  setB.forEach(e => {
    union.add(e);
  });
  denominator = union.size;
  return numerator / denominator;
}

/**
 * Indice di Jaccard tra 2 set
 * @param {*} setA 
 * @param {*} setB 
 */
export function jaccard(setA, setB) {
  "use strict";
  // intersezione (overlap) dei due insiemi
  const intersection = new Set(
    [...setA].filter(e => setB.has(e))
  );
  // unione dei due insiemi 
  const union = new Set();
  setA.forEach(e => {
    union.add(e);
  });
  setB.forEach(e => {
    union.add(e);
  });
  const numerator = intersection.size;
  const denominator = union.size;
  const score = numerator / denominator;
  return score;
}

/**
 * calcola la similarità dell'utente passato come arg con gli altri utenti. 
 * @param {*} userTable
 */
async function pearsonSimChecker(userTable, user = "trialpetal01@kwido.com") {
  console.log(userTable);
  let bestCorrelation = -1;
  let bestUser = "";
  let me = "";
  let similarities = [];
  let arrX = [];
  let arrY = [];
  for (let i = 0; i < userTable.length; i++) {
    if (userTable[i].userName === user) {
      me = userTable[i];
    }
  }
  for (let key in me.actions) {
    arrX.push(me.actions[key]);
  }
  console.log("myValues", arrX);

  for (let i = 0; i < userTable.length; i++) {
    arrY = [];
    console.log(userTable[i]);
    if (userTable[i].userName !== user) {
      console.log("username not equal user");
      let otherUser = userTable[i];
      for (let key in otherUser.actions) {
        arrY.push(otherUser.actions[key]);
      }
      let R = pearsonCorrelation(arrX, arrY);
      userTable[i].r = R;
      console.log('arrX', arrX, 'arrY', arrY, 'R', R);
      if (R > bestCorrelation) {
        bestCorrelation = R;
        bestUser = userTable[i].userName;
      }
    }
    // se sono io, do peso 0
    else {
      userTable[i].r = 0;
    }

  }
  return userTable;
  //console.log("bestCorrelation is: ", bestCorrelation)
  //console.log("with: ", bestUser);
}

function pearsonCorrelation(x, y) {
  "use strict";
  let shortestArrayLength = 0;
  if (x.length == y.length) {
    shortestArrayLength = x.length;
  }
  else if (x.length > y.length) {
    shortestArrayLength = y.length;
    console.error('x has more items in it, the last ' + (x.length - shortestArrayLength) + ' item(s) will be ignored');
  }
  else {
    shortestArrayLength = x.length;
    console.error('y has more items in it, the last ' + (y.length - shortestArrayLength) + ' item(s) will be ignored');
  }


  let xy = [];
  let x2 = [];
  let y2 = [];

  for (let i = 0; i < shortestArrayLength; i++) {
    xy.push(x[i] * y[i]);
    x2.push(x[i] * x[i]);
    y2.push(y[i] * y[i]);
  }

  var sum_x = 0;
  var sum_y = 0;
  var sum_xy = 0;
  var sum_x2 = 0;
  var sum_y2 = 0;

  for (let i = 0; i < shortestArrayLength; i++) {
    sum_x += x[i];
    sum_y += y[i];
    sum_xy += xy[i];
    sum_x2 += x2[i];
    sum_y2 += y2[i];
  }

  var step1 = (shortestArrayLength * sum_xy) - (sum_x * sum_y);
  var step2 = (shortestArrayLength * sum_x2) - (sum_x * sum_x);
  var step3 = (shortestArrayLength * sum_y2) - (sum_y * sum_y);
  var step4 = Math.sqrt(step2 * step3);
  var answer = step1 / step4;

  if (isNaN(answer)) return 0;
  return answer;


  //alternativa.. funzionano uguale, ma questa è più criptica
  /*
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0,
    sumY2 = 0;
  const minLength = x.length = y.length = Math.min(x.length, y.length),
    reduce = (xi, idx) => {
      const yi = y[idx];
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumX2 += xi * xi;
      sumY2 += yi * yi;
    }
  x.forEach(reduce);
  return (minLength * sumXY - sumX * sumY) / Math.sqrt((minLength * sumX2 - sumX * sumX) * (minLength * sumY2 - sumY * sumY));
    */
}


/**
 * Ottiene un intero compreso tra -1 e il valore passato: eg max = 3, 
 * expected = -1, 1, 2
 * @param {*} max 
 */
export function getRandomInt(max) {
  "use strict";
  return Math.floor(Math.random() * Math.floor(max));
}

/**
* funzione presa da https://www.w3resource.com/javascript-exercises/javascript-math-exercise-23.php
*/
export function create_UUID() {
	var dt = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (dt + Math.random() * 16) % 16 | 0;
		dt = Math.floor(dt / 16);
		return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
	return uuid;
}

/**
 * 
 */
export function guid() {
  "use strict";
  return s4() + s4();
}

/**
 * 
 */
function s4() {
  "use strict";
  return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
}