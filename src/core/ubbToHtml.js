import { getGpsCanvas, imageSize, htmlEncode } from '../modules/util'
const singleAttrIdentifier = /([^\s"'<>/=]*)/
const singleAttrAssign = /(?:=)/
const singleAttrValues = [
  // attr value double quotes
  /"([^"]*)"+/.source,
  // attr value, single quotes
  /'([^']*)'+/.source,
  // attr value, no quotes
  /([^\s"'=[\]`]+)/.source
]
const attribute = new RegExp(
  '^\\s*' + singleAttrIdentifier.source +
  '(?:\\s*(' + singleAttrAssign.source + ')' +
  '\\s*(?:' + singleAttrValues.join('|') + '))?'
)
const startTagClose = /^\s*(\/?)\]/


function getAttrs(ubbStr) {
  var attr
  var attrs = []
  while (!(ubbStr.match(startTagClose)) && (attr = ubbStr.match(attribute))) {
    ubbStr = ubbStr.substring(attr[0].length)
    const value = attr[3] || attr[4] || attr[5] || ''
    attrs.push({
      name: attr[1],
      value: value
    })
  }
  return attrs
}
function formatGps(node) {
  let gps = node.querySelectorAll('a[data-lon]')
  for (let i = 0; i < gps.length; i++) {
    let el = gps[i]
    let text = el.innerHTML
    if (text) {
      let url = getGpsCanvas(text)
      let img = document.createElement('img')
      img.src = url
      img.dataset.lon = el.dataset.lon
      img.dataset.lat = el.dataset.lat
      img.dataset.text = text
      el.parentElement.replaceChild(img, el)
    } else {
      el.parentElement.removeChild(el)
    }
  }
}

export default function (text, urlMap = {}) {
  text = htmlEncode(text)
  let tags = ['b', 'url', 'color', 'img', 'gps']
  let loop = false

  // 先做一些对text的其他替换，比如\n换成换行；
  text = text.replace(/\r\n|\r|\n/g, "<br/>");

  var changeTag = function (tag) { // 将字符串的‘[’，‘]’ 转换为‘<’，‘>’;
    tag = tag.toString();
    var result = tag.replace('[', '<');
    result = result.replace(']', '>');
    return result;
  }
  var count = 1;
  var changeOneTag = function (mytext, tag, count) {
    var tmpText = mytext,
      startTag = '[' + tag;
    var tmp = startTag + ']';
    tmp = tmp.split('');
    tmp.splice(1, 0, '/');
    var endTag = tmp.join(''),
      endTagFormed = changeTag(endTag);
    var tagRegExp;	// 开始标签的正则验证【结束标签不验证，都默认看做[/tagName]这样的形式】
    switch (tag) {
      case 'url':
        tagRegExp = /\[url=/;
        break;
      case 'color':
        tagRegExp = /\[color=/;
        break;
      case 'gps':
        tagRegExp = /\[gps lon=[.\d]* lat=[.\d]*\]/;
        break;
      case 'img':
        tagRegExp = /\[img hash=/;
        break;
      default:
        tagRegExp = RegExp('\[' + tag + '\]');
    }
    var readyStr = {};
    // 找到匹配正确的 开始-结束 标签位置
    var startTagValid = false,
      startTagStr,
      startPos = mytext.indexOf(startTag, 0),
      startPos_ = mytext.indexOf(']', startPos);
    if (mytext.indexOf(startTag, startPos_) >= 0) {
      loop = true;  // 如果有一个以上开始标签被发现，等这一趟标签替换完，重新来一遍
    };
    if (startPos_ < startPos) {
      return; // 只找到<tagName 而没有 ]在后面的话;
    }
    startTagStr = mytext.substring(startPos, startPos_ + 1);
    if (tagRegExp.test(startTagStr)) {
      startTagValid = true;
    };
    var endPos = mytext.indexOf(endTag, startPos);
    var endPos_ = endPos + endTag.length;
    var tmpArr = {
      startPos: startPos,
      startTagStr: startTagStr,
      endPos: endPos_
    }
    if (startPos >= 0 && endPos >= 0 && endPos > startPos_ && startTagValid) {
      readyStr = tmpArr;
    }
    // 开始替换
    var strSlice = [];
    tmp = tmpText.substring(readyStr.startPos, readyStr.endPos);
    startTagStr = readyStr.startTagStr;
    var attrs
    var getValue
    if (startTagStr) {
      switch (tag) {
        case 'url':
          var href = startTagStr.match(/url=[^\]]*/)[0].slice(4);
          var url = `<a┢◆href="${href}">`;
          tmp = tmp.replace(startTagStr, url);
          tmp = tmp.replace(endTag, '</a>');
          break;
        case 'color':
          var color = startTagStr.match(/color=[^\]]*/)[0].slice(6);
          tmp = tmp.replace(startTagStr, `<span┢◆style="color:${color}">`);
          tmp = tmp.replace(endTag, '</span>');
          break;
        case 'gps':
          attrs = getAttrs(startTagStr.substring(4))
          getValue = name => attrs.find(item => item.name == name).value
          tmp = tmp.replace(startTagStr, `<a┢◆data-lon="${getValue("lon")}"data-lat="${getValue("lat")}">`);
          tmp = tmp.replace(endTag, '</a>');
          break;
        case 'img':
          attrs = getAttrs(startTagStr.substring(4))
          getValue = name => attrs.find(item => item.name == name).value
          var width = getValue("width")
          var height = getValue('height')
          var size = imageSize({ width, height })
          tmp = tmp.replace(startTagStr, `<img┢◆width="${size.width}px"height="${size.height}px"src="${urlMap[getValue("hash")]}"data-hash="${getValue("hash")}"data-width="${width}"data-height="${height}">`);
          tmp = tmp.replace(endTag, '');
          break;
        default:
          tmp = tmp.replace(startTagStr, changeTag(startTagStr));
          tmp = tmp.replace(endTag, endTagFormed);
      }
      strSlice.push(tmpText.substring(0, readyStr.startPos));
      strSlice.push(tmp);
      strSlice.push(tmpText.substring(readyStr.endPos));
      if (strSlice.length !== 0) {
        mytext = strSlice.join('');
        if (loop) {
          count++;
          mytext = changeOneTag(mytext, tag, count);
        };
      }
    }
    return mytext;
  }
  for (var i = tags.length - 1; i >= 0; i--) {
    text = changeOneTag(text, tags[i], count);
  };
  text = text.replace(/ /g, '&nbsp;').replace(/┢◆/g, ' ')
  let div = document.createElement('div')
  div.innerHTML = text
  formatGps(div)
  return div.innerHTML
}
