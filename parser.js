export function parse(text) {
  var index = text.indexOf('+');
  if (index != -1) {
    var pre = text.slice(0, index);
    var pos = text.slice(index);
    return parse(pre) + parse(pos);
  }

  return Number(text);
}
