let inputText = "";
let result = 0;
const screen = document.getElementById('screen');

const radix = '\u23B7';
const superscript2 = '\u00b2';
const sqrt = '\u221a';
const minus = '\u2212';
const mult = '\u00d7';
const div = '\u00f7';
const pi = '\u03c0';

const toRadians = 1 / 180 * Math.PI;
const operators = ['+', minus, '*', '/', '^', '%', 'sin', 'cos', 'tan', 'log',
          'ln', sqrt, radix];
const syntaxErrorMsg = "Syntax Error";
const mathErrorMsg = "Math Error";


/* Status */
let degrees = true;
let fraction = false;
let history = [];
let historyIndex = 0;


/* Math functions */
function mod(arg1, arg2) {
  arg1 = Math.abs(arg1);
  var current = 0;
  while(current + arg2 < arg1)
  {
    current += arg2;
  }
  return arg1 - current;
}

function limitDecimals(n, digits) {
  const tens = Math.pow(10, digits);
  return Math.round(n * tens) / tens;
}

function findFraction(x, error=0.0000001) {
  var n = Math.floor(x);
  x -= n;
  if (x < error) {
    return [n, 1];
  }
  else if (1 - error < x) {
    return [n+1, 1];
  }

  // lower fraction is 0/1
  var lowerN = 0;
  var lowerD = 1;
  // upper fraction is 1/1
  var upperN = 1;
  var upperD = 1;

  while (true) {
    // middle fraction is (lowerN + lowerD) / (lowerD + upperD)
    var middleN = lowerN + upperN;
    var middleD = lowerD + upperD;

    if (middleD * (x + error) < middleN) {
      upperN = middleN;
      upperD = middleD;
    }
    else if (middleN < (x - error) * middleD) {
      lowerN = middleN;
      lowerD = middleD;
    }
    else {
      return [n * middleD + middleN, middleD];
    }
  }
}

function needsScientificNotation(n) {
  return n != 0 && (Math.abs(n > 100000) || Math.abs(n) < 0.00001);
}

function inScientificNotation(n) {
  var E = 0;
  if (n > 10) {
    while (n >= 10) {
      n /= 10;
      E++;
    }
  }
  else if (n < 1 && n > 0) {
    while (n < 1) {
      n *= 10;
      E--;
    }
  }
  return [n, E];
}


function plog(str) {
  /* Uncomment to log parsing steps. */
  //console.log(str);
}

function multiplyIfNoOperator(text, leftSide) {
  if (!text)
    return text;

  var endsInOp = false;
  for (let o of operators)
  {
    if ((!leftSide && text.endsWith(o)) ||
        (leftSide && text.startsWith(o))) {

      endsInOp = true;
      break;
    }
  }
  if (!endsInOp) {
    if (leftSide) {
      text = '*' + text;
    } else {
      text += '*';
    }
  }
  return text;
}

function operatorBothSides(text, op) {
  var index = text.indexOf(op);
  if (index != -1) {
    var pre = text.slice(0, index);
    var pos = text.slice(index + op.length);

    if ((!pre && op != minus) || !pos) {
      return syntaxErrorMsg;
    }

    switch (op) {
      case '+':
        plog('adding: "' + pre + '" + "' + pos + '"');
        return parse(pre) + parse(pos);
      case minus:
        plog('substracting: "' + pre + '" - "' + pos + '"');
        if (!pre)
          return -parse(pos);
        return parse(pre) - parse(pos);
      case '*':
        plog('multiplying: "' + pre + '" * "' + pos + '"');
        return parse(pre) * parse(pos);
      case '/':
        plog('dividing: "' + pre + '" / "' + pos + '"');
        var divisor = parse(pos);
        if (divisor == 0)
          return mathErrorMsg;
        return parse(pre) / divisor;
      case '^':
        plog('power: "' + pre + '" ^ "' + pos + '"');
        return Math.pow(parse(pre), parse(pos));
      case '%':
        plog('module: "' + pre + '" % "' + pos + '"');
        return mod(parse(pre), parse(pos));
      case 'E':
        return parse(pre) * Math.pow(10, parse(pos));
      case radix:
        plog('root: "' + pre + '" radix "' + pos + '"');
        return Math.pow(parse(pos), 1 / parse(pre));
      default:
        return null;
    }
  }
  return null;
}

function operatorRight(text, op) {
  var index = text.indexOf(op);
  if (index != -1) {
    var pre = text.slice(0, index);
    plog(text);
    var pos = text.slice(index + op.length);
    plog(pos);

    var arg = parse(pos);
    var angle = arg;
    if (degrees)
      angle *= toRadians;

    var res;
    switch (op) {
      case 'sin':
        res = Math.sin(angle);
        break;
      case 'cos':
        res = Math.cos(angle);
        break;
      case 'tan':
        res = Math.tan(angle);
        break;
      case 'log':
        res = Math.log(arg) / Math.LN10;
        break;
      case 'ln':
        res = Math.log(arg);
        break;
      case sqrt:
        res = Math.sqrt(arg);
        break;
      default:
        res = null;
        break;
    }

    if (pre) {
      pre = multiplyIfNoOperator(pre, false);
      return parse(pre + res.toString());
    }
    return res;
  }
  return null;
}

function parse(text) {
  plog('parsing: "' + text + '"');
  var res;

  /* Pi */
  text = text.replace(pi, '(' + Math.PI.toString() + ')');

  /* Parenthesis*/
  var beginIndex = text.indexOf('(');
  if (beginIndex != -1)
  {
    var pre = text.slice(0, beginIndex);
    var ss = text.slice(beginIndex + 1);

    var levels = 0;

    for (i=0; i < ss.length; ++i)
    {
      if (ss.charAt(i) == '(') {
        levels++;
      }
      else if (ss.charAt(i) == ')') {
        levels--;
      }

      if (levels == -1)
      {
        var inside = ss.slice(0, i);
        var pos = ss.slice(i + 1);
        plog('inside: ' + inside + ', pre: ' + pre + ', pos: ' + pos);
        var solved = parse(inside);
        plog('parenthesis result: ' + solved);

        // Functions here?

        if (pre)
        {
          var endsInOp = false;
          for (let o of operators)
          {
            if (pre.endsWith(o))
            {
              endsInOp = true;
              break;
            }
          }
          if (!endsInOp)
            pre += '*';
        }
        if (pos)
        {
          var endsInOp = false;
          for (let o of operators)
          {
            if (pos.startsWith(o))
            {
              endsInOp = false;
              break;
            }
          }
          if (!endsInOp)
            pos = '*' + pos;
        }

        return parse(pre + solved.toString() + pos);
      }
    }
  }

  res = operatorBothSides(text, '+');
  if (res != null)
    return res;

  res = operatorBothSides(text, minus);
  if (res != null)
    return res;

  res = operatorBothSides(text, '*');
  if (res != null)
    return res;

  res = operatorBothSides(text, '/');
  if (res != null)
    return res;

  res = operatorBothSides(text, '^');
  if (res != null)
    return res;

  res = operatorBothSides(text, '%');
  if (res != null)
    return res;

  res = operatorBothSides(text, 'E');
  if (res != null)
    return res;

  res = operatorBothSides(text, radix);
  if (res != null)
    return res;

  res = operatorRight(text, 'sin');
  if (res != null)
    return res;

  res = operatorRight(text, 'cos');
  if (res != null)
    return res;

  res = operatorRight(text, 'tan');
  if (res != null)
    return res;

  res = operatorRight(text, 'log');
  if (res != null)
    return res;

  res = operatorRight(text, 'ln');
  if (res != null)
    return res;

  res = operatorRight(text, sqrt);
  if (res != null)
    return res;

  return Number(text);
}

function updateScreen() {
  var scrInput = "";
  var j = 0;
  var line = 0;
  for (i=0; i < Math.min(36, inputText.length); i++)
  {
    var c = inputText.charAt(i);
    if (c != '.')
      j++;

    if (j == 13 || j == 25) {
      scrInput += '<br />';
      line++;
    }

    scrInput += c;
  }
  while (line < 2) {
    scrInput += '<br />';
    line++;
  }

  /* Display modes */
  if (isNaN(result)) {
    console.log('NaN: ' + result);
    resultText = result;
  }
  else if (fraction) {
    var fr = findFraction(result);
    resultText = fr[0].toString() + ',' + fr[1].toString();
  }
  else if (needsScientificNotation(result)) {
    sciNot = inScientificNotation(result);
    var e = sciNot[1].toString();
    resultText = sciNot[0].toString().slice(0,11 - e.length) + 'E' + sciNot[1].toString();
  }
  else {
    var r = limitDecimals(result, 12);
    resultText = r.toString();
  }

  var resultNofDots = resultText.length - resultText.replace(/\./g, '').length;
  resultText = resultText.slice(0, 12 + resultNofDots);
  var emptySlots = 13 - resultText.length + resultNofDots;

  var fill = "";
  if (emptySlots > 0)
    fill = "!".repeat(emptySlots-1);

  screen.innerHTML = scrInput + "<br />" + fill + resultText;

  const rad = document.getElementById('screen-rad');
  const deg = document.getElementById('screen-deg');

  if (degrees) {
    rad.classList.remove('active');
    deg.classList.add('active');
  }
  else {
    rad.classList.add('active');
    deg.classList.remove('active');
  }
}

function writeOnScreen(text) {
  if (text == 'DEL') {
    inputText = inputText.slice(0, -1);
  }
  else if (text == 'AC') {
    inputText = "";
  }
  else if (text == '.') {
    // Don't put multiple consecutive dots because they'll be invincible
    if (inputText.charAt(inputText.length-1) != '.') {
      inputText += text;
    }
  }
  else {
    inputText += text;
  }

  updateScreen();
}

function readFromHistory() {
  var entry = history[history.length - 1 - historyIndex];
  inputText = entry;
}

function execute() {
  result = parse(inputText);
  console.log(result);

  // Log input to history
  if (history[history.length-1] != inputText) {
    history.push(inputText);
    // Limit to 10 newest entries
    while (history.length > 10)
      history.shift();
  }
  historyIndex = 0;
  //console.log(history);

  fraction = false;

  updateScreen();
}

function createFuncButton(label, func) {
  const btn = document.createElement('button');
  btn.innerHTML = label;

  btn.onclick = func;

  const td = document.createElement('td');
  td.appendChild(btn);

  return td;
}

function createButton(label, text) {
  return createFuncButton(label, () => {
    writeOnScreen(text);
  });
}

function createSimpleButton(text) {
  return createButton(text, text);
}

function makeLowerTable() {
  const lowerTable = document.getElementById('lower-button-table');

  var tr = document.createElement('tr');
  tr.appendChild(createSimpleButton('7'));
  tr.appendChild(createSimpleButton('8'));
  tr.appendChild(createSimpleButton('9'));
  tr.appendChild(createSimpleButton('DEL'));
  tr.appendChild(createSimpleButton('AC'));
  lowerTable.appendChild(tr);

  tr = document.createElement('tr');
  tr.appendChild(createSimpleButton('4'));
  tr.appendChild(createSimpleButton('5'));
  tr.appendChild(createSimpleButton('6'));
  tr.appendChild(createButton(mult, '*'));
  tr.appendChild(createButton(div, '/'));
  lowerTable.appendChild(tr);

  tr = document.createElement('tr');
  tr.appendChild(createSimpleButton('1'));
  tr.appendChild(createSimpleButton('2'));
  tr.appendChild(createSimpleButton('3'));
  tr.appendChild(createSimpleButton('+'));
  tr.appendChild(createSimpleButton(minus));
  lowerTable.appendChild(tr);

  tr = document.createElement('tr');
  tr.appendChild(createSimpleButton('.'));
  tr.appendChild(createSimpleButton('0'));
  tr.appendChild(createButton('EXP', 'E'));
  tr.appendChild(createButton('(-)', '-'));
  const exeBtn = createFuncButton('=', () => execute());
  exeBtn.childNodes[0].id = "execute-btn";
  tr.appendChild(exeBtn);
  lowerTable.appendChild(tr);
}

function makeUpperTable() {
  const upperTable = document.getElementById('upper-button-table');

  document.getElementById('rad-button').onclick = () => {
    degrees = !degrees;
    updateScreen();
  }

  var tr = upperTable.rows[upperTable.rows.length - 1];
  tr.appendChild(createButton(superscript2, '^2'));
  tr.appendChild(createButton('<sup>x</sup>', '^'));
  tr.appendChild(createSimpleButton(sqrt));
  tr.appendChild(createButton('<sup>x</sup>'+radix, radix));
  //upperTable.appendChild(tr);

  var tr = document.createElement('tr');
  tr.appendChild(createSimpleButton('%'));
  tr.appendChild(createButton('log', 'log'));
  tr.appendChild(createButton('ln', 'ln'));
  tr.appendChild(createButton('sin', 'sin'));
  tr.appendChild(createButton('cos', 'cos'));
  tr.appendChild(createButton('tan', 'tan'));
  upperTable.appendChild(tr);

  var tr = document.createElement('tr');
  tr.appendChild(createFuncButton('d/c', () => {
    fraction = !fraction;
    updateScreen();
  }));
  tr.appendChild(createSimpleButton(pi));
  tr.appendChild(createSimpleButton('('));
  tr.appendChild(createSimpleButton(')'));
  tr.appendChild(createSimpleButton(','));
  tr.appendChild(createSimpleButton('->'));
  upperTable.appendChild(tr);

  var up = document.getElementById('btn-up');
  up.onclick = () => {
    if (history.length <= 1)
      return;
    if (historyIndex == 0 && history[history.length - 1] != inputText) {
      history.push(inputText);
    }
    historyIndex++;
    readFromHistory();
    updateScreen();
  }

  var down = document.getElementById('btn-down');
  down.onclick = () => {
    if (history.length <= 1)
      return;
    if (historyIndex <= 0)
      return;
    historyIndex--;
    readFromHistory();
    updateScreen();
  }
}

updateScreen();

makeLowerTable();
makeUpperTable();
