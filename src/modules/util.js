
import extend from 'extend';
import Parchment from 'parchment';
import Delta from 'quill-delta';

// import { AlignAttribute, AlignStyle } from '../formats/align';
// import { BackgroundStyle } from '../formats/background';
import { ColorStyle } from '../formats/color';
// import { DirectionAttribute, DirectionStyle } from '../formats/direction';
// import { FontStyle } from '../formats/font';
// import { SizeStyle } from '../formats/size';

const DOM_KEY = '__ql-matcher';


const CLIPBOARD_CONFIG = [
  [Node.TEXT_NODE, matchText],
  [Node.TEXT_NODE, matchNewline],
  ['br', matchBreak],
  ['img', matchImage],
  [Node.ELEMENT_NODE, matchNewline],
  [Node.ELEMENT_NODE, matchBlot],
  [Node.ELEMENT_NODE, matchSpacing],
  [Node.ELEMENT_NODE, matchAttributor],
  [Node.ELEMENT_NODE, matchStyles],
  // ['li', matchIndent],
  ['b', matchAlias.bind(matchAlias, 'bold')],
  // ['i', matchAlias.bind(matchAlias, 'italic')],
  ['style', matchIgnore]
];

const ATTRIBUTE_ATTRIBUTORS = [
  // AlignAttribute,
  // DirectionAttribute
].reduce(function (memo, attr) {
  memo[attr.keyName] = attr;
  return memo;
}, {});

const STYLE_ATTRIBUTORS = [
  // AlignStyle,
  // BackgroundStyle,
  ColorStyle,
  // DirectionStyle,
  // FontStyle,
  // SizeStyle
].reduce(function (memo, attr) {
  memo[attr.keyName] = attr;
  return memo;
}, {});
function applyFormat(delta, format, value) {
  if (typeof format === 'object') {
    return Object.keys(format).reduce(function (delta, key) {
      return applyFormat(delta, key, format[key]);
    }, delta);
  } else {
    return delta.reduce(function (delta, op) {
      if (op.attributes && op.attributes[format]) {
        return delta.push(op);
      } else {
        return delta.insert(op.insert, extend({}, { [format]: value }, op.attributes));
      }
    }, new Delta());
  }
}

function computeStyle(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return {};
  const DOM_KEY = '__ql-computed-style';
  return node[DOM_KEY] || (node[DOM_KEY] = window.getComputedStyle(node));
}

function deltaEndsWith(delta, text) {
  let endText = "";
  for (let i = delta.ops.length - 1; i >= 0 && endText.length < text.length; --i) {
    let op = delta.ops[i];
    if (typeof op.insert !== 'string') break;
    endText = op.insert + endText;
  }
  return endText.slice(-1 * text.length) === text;
}

function isLine(node) {
  if (node.childNodes.length === 0) return false;   // Exclude embed blocks
  let style = computeStyle(node);
  return ['block', 'list-item'].indexOf(style.display) > -1;
}

function traverse(node, elementMatchers, textMatchers) {  // Post-order
  if (node.nodeType === node.TEXT_NODE) {
    return textMatchers.reduce(function (delta, matcher) {
      return matcher(node, delta);
    }, new Delta());
  } else if (node.nodeType === node.ELEMENT_NODE) {
    return [].reduce.call(node.childNodes || [], (delta, childNode) => {
      let childrenDelta = traverse(childNode, elementMatchers, textMatchers);
      if (childNode.nodeType === node.ELEMENT_NODE) {
        childrenDelta = elementMatchers.reduce(function (childrenDelta, matcher) {
          return matcher(childNode, childrenDelta);
        }, childrenDelta);
        childrenDelta = (childNode[DOM_KEY] || []).reduce(function (childrenDelta, matcher) {
          return matcher(childNode, childrenDelta);
        }, childrenDelta);
      }
      return delta.concat(childrenDelta);
    }, new Delta());
  } else {
    return new Delta();
  }
}


function matchAlias(format, node, delta) {
  return applyFormat(delta, format, true);
}

function matchAttributor(node, delta) {
  let attributes = Parchment.Attributor.Attribute.keys(node);
  let classes = Parchment.Attributor.Class.keys(node);
  let styles = Parchment.Attributor.Style.keys(node);
  let formats = {};
  attributes.concat(classes).concat(styles).forEach((name) => {
    let attr = Parchment.query(name, Parchment.Scope.ATTRIBUTE);
    if (attr != null) {
      formats[attr.attrName] = attr.value(node);
      if (formats[attr.attrName]) return;
    }
    attr = ATTRIBUTE_ATTRIBUTORS[name];
    if (attr != null && attr.attrName === name) {
      formats[attr.attrName] = attr.value(node) || undefined;
    }
    attr = STYLE_ATTRIBUTORS[name]
    if (attr != null && attr.attrName === name) {
      attr = STYLE_ATTRIBUTORS[name];
      formats[attr.attrName] = attr.value(node) || undefined;
    }
  });
  if (Object.keys(formats).length > 0) {
    delta = applyFormat(delta, formats);
  }
  return delta;
}

function matchBlot(node, delta) {
  let match = Parchment.query(node);
  if (match == null) return delta;
  if (match.prototype instanceof Parchment.Embed) {
    let embed = {};
    let value = match.value(node);
    if (value != null) {
      embed[match.blotName] = value;
      delta = new Delta().insert(embed, match.formats(node));
    }
  } else if (typeof match.formats === 'function') {
    delta = applyFormat(delta, match.blotName, match.formats(node));
  }
  return delta;
}

function matchBreak(node, delta) {
  if (!deltaEndsWith(delta, '\n')) {
    delta.insert('\n');
  }
  return delta;
}
/* 多种图片处理 */
function matchImage(node, delta) {
  delta = new Delta()
  if (node.dataset.hash && node.src) {
    delta.insert({ image: node.src }, {
      "width": node.width,
      "height": node.height,
      'data-hash': node.dataset.hash,
      'data-width': node.dataset.width,
      'data-height': node.dataset.height
    })
  }
  if (node.dataset.lon && node.src) {
    delta.insert({ gps: node.src }, {
      'data-lon': node.dataset.lon,
      'data-lat': node.dataset.lat,
      'data-text': node.dataset.text
    })
  }
  if (node.dataset.at) {
    delta.insert({ at: node.src }, {
      'data-text': node.dataset.text,
      'data-value': node.dataset.value,
      'data-at': true
    })
  }
  if (node.dataset.emoji !== undefined) {
    delta.insert({ emoji: node.src }, {
      'data-emoji': node.dataset.emoji
    })
  }
  return delta
}
function matchIgnore() {
  return new Delta();
}

function matchIndent(node, delta) {
  let match = Parchment.query(node);
  if (match == null || match.blotName !== 'list-item' || !deltaEndsWith(delta, '\n')) {
    return delta;
  }
  let indent = -1, parent = node.parentNode;
  while (!parent.classList.contains('ql-clipboard')) {
    if ((Parchment.query(parent) || {}).blotName === 'list') {
      indent += 1;
    }
    parent = parent.parentNode;
  }
  if (indent <= 0) return delta;
  return delta.compose(new Delta().retain(delta.length() - 1).retain(1, { indent: indent }));
}

function matchNewline(node, delta) {
  if (!deltaEndsWith(delta, '\n')) {
    if (isLine(node) || (delta.length() > 0 && node.nextSibling && isLine(node.nextSibling))) {
      delta.insert('\n');
    }
  }
  return delta;
}

function matchSpacing(node, delta) {
  if (isLine(node) && node.nextElementSibling != null && !deltaEndsWith(delta, '\n\n')) {
    let nodeHeight = node.offsetHeight + parseFloat(computeStyle(node).marginTop) + parseFloat(computeStyle(node).marginBottom);
    if (node.nextElementSibling.offsetTop > node.offsetTop + nodeHeight * 1.5) {
      delta.insert('\n');
    }
  }
  return delta;
}

function matchStyles(node, delta) {
  let formats = {};
  let style = node.style || {};
  if (style.fontStyle && computeStyle(node).fontStyle === 'italic') {
    formats.italic = true;
  }
  if (style.fontWeight && (computeStyle(node).fontWeight.startsWith('bold') ||
    parseInt(computeStyle(node).fontWeight) >= 700)) {
    formats.bold = true;
  }
  if (Object.keys(formats).length > 0) {
    delta = applyFormat(delta, formats);
  }
  if (parseFloat(style.textIndent || 0) > 0) {  // Could be 0.5in
    delta = new Delta().insert('\t').concat(delta);
  }
  return delta;
}

function matchText(node, delta) {
  let text = node.data;
  // Word represents empty line with <o:p>&nbsp;</o:p>
  if (node.parentNode.tagName === 'O:P') {
    return delta.insert(text.trim());
  }
  if (text.trim().length === 0 && node.parentNode.classList.contains('ql-clipboard')) {
    return delta;
  }
  if (!computeStyle(node.parentNode).whiteSpace.startsWith('pre')) {
    // eslint-disable-next-line func-style
    let replacer = function (collapse, match) {
      match = match.replace(/[^\u00a0]/g, '');    // \u00a0 is nbsp;
      return match.length < 1 && collapse ? ' ' : match;
    };
    text = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
    text = text.replace(/\s\s+/g, replacer.bind(replacer, true));  // collapse whitespace
    if ((node.previousSibling == null && isLine(node.parentNode)) ||
      (node.previousSibling != null && isLine(node.previousSibling))) {
      text = text.replace(/^\s+/, replacer.bind(replacer, false));
    }
    if ((node.nextSibling == null && isLine(node.parentNode)) ||
      (node.nextSibling != null && isLine(node.nextSibling))) {
      text = text.replace(/\s+$/, replacer.bind(replacer, false));
    }
  }
  return delta.insert(text);
}

function getGpsCanvas(text) {
  let el = document.createElement('canvas')
  el.style = "visibility: hidden;top:0;left:0;position: absolute;z-index: -1000"
  el.height = 22;
  el.width = 4000;
  document.body.appendChild(el)
  var ctx = el.getContext('2d');
  ctx.font = "14px Arial";
  ctx.textAlign = 'left';
  el.width = ctx.measureText(text).width + 5;
  ctx.font = "14px Arial";

  ctx.fillStyle = "#007cf9";
  ctx.fillText(text, 0, 15);
  var src = el.toDataURL("image/png");
  document.body.removeChild(el)
  return src;
}
function getAtCanvas(text) {
  let el = document.createElement('canvas')
  el.style = "visibility: hidden;top:0;left:0;position: absolute;z-index: -1000"
  el.height = 22;
  el.width = 4000;
  document.body.appendChild(el)
  var ctx = el.getContext('2d');
  ctx.font = "14px Arial";
  ctx.textAlign = 'left';
  el.width = ctx.measureText(text).width + 5;
  ctx.font = "14px Arial";

  ctx.fillStyle = "#bf5213";
  ctx.fillText(text, 0, 15);
  var src = el.toDataURL("image/png");
  document.body.removeChild(el)
  return src;
}
function imageSize({ width, height }) {
  var _w = parseInt(width);
  var _h = parseInt(height);
  var aDivideb = _w / _h;

  if (_w > 640) {
    _w = 640;
    _h = _w * 1 / aDivideb;
  }

  width = _w.toFixed(0);
  height = _h.toFixed(0);
  return { width, height }
}
export {
  getAtCanvas, getGpsCanvas, imageSize,
  matchAttributor, deltaEndsWith, matchBlot, matchNewline,
  matchSpacing, matchText, traverse, DOM_KEY, CLIPBOARD_CONFIG
}
export const htmlEncode = function (value) {
  return !value ? value : String(value).replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
export const htmlDecode = function (value) {
  return !value ? value : String(value).replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}
