import { decodeBracket } from './util'
import { getAtCanvas } from '../modules/util'
// Regular Expressions for parsing tags and attributes
const singleAttrIdentifier = /([^\s"'<>/=]+)/
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

const ncname = '[a-zA-Z_][\\w\\-\\.]*'
const qnameCapture = '(' + ncname + ')'
const startTagOpen = new RegExp('^\\[' + qnameCapture)
const startTagClose = /^\s*(\/?)\]/
const endTag = new RegExp('^\\[\\/' + qnameCapture + '[^\\]]*\\]')
let IS_REGEX_CAPTURING_BROKEN = false;
'x'.replace(/x(.)?/g, function (m, g) {
  IS_REGEX_CAPTURING_BROKEN = g === ''
})


export function parseUBB(ubbStr, options) {
  let last
  let index = 0
  let stack = []
  while (ubbStr) {
    last = ubbStr
    let textEnd = ubbStr.indexOf('[')
    if (textEnd === 0) {
      // End tag:
      const endTagMatch = ubbStr.match(endTag)
      if (endTagMatch) {
        const curIndex = index
        advance(endTagMatch[0].length)
        parseEndTag(endTagMatch[1], curIndex, index)
        continue
      }
      // Start tag:
      const startTagMatch = parseStartTag()
      if (startTagMatch) {
        handleStartTag(startTagMatch)
        continue
      }
    }

    let text, rest, next
    if (textEnd >= 0) {
      rest = ubbStr.slice(textEnd)
      while (!endTag.test(rest) && !startTagOpen.test(rest)) {
        // < in plain text, be forgiving and treat it as text
        next = rest.indexOf('[', 1)
        if (next < 0) break
        textEnd += next
        rest = ubbStr.slice(textEnd)
      }
      text = ubbStr.substring(0, textEnd)
      advance(textEnd)
    }

    if (textEnd < 0) {
      text = ubbStr
      ubbStr = ''
    }

    if (options.chars && text) {
      options.chars(text)
    }

    if (ubbStr === last) {
      options.chars && options.chars(ubbStr)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${ubbStr}"`)
      }
      break
    }
  }

  function advance(n) {
    index += n
    ubbStr = ubbStr.substring(n)
  }

  function parseStartTag() {
    const start = ubbStr.match(startTagOpen)
    if (start) {
      const match = {
        tagName: start[1],
        attrs: [],
        start: index
      }
      advance(start[0].length)
      let end, attr
      while (!(end = ubbStr.match(startTagClose)) && (attr = ubbStr.match(attribute))) {
        advance(attr[0].length)
        match.attrs.push(attr)
      }
      if (end) {
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        return match
      }
    }
  }

  function handleStartTag(match) {
    const tagName = match.tagName
    const unarySlash = match.unarySlash


    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i]
      // hackish work around FF bug https://bugzilla.mozilla.org/show_bug.cgi?id=369778
      if (IS_REGEX_CAPTURING_BROKEN && args[0].indexOf('""') === -1) {
        if (args[3] === '') {
          delete args[3]
        }
        if (args[4] === '') {
          delete args[4]
        }
        if (args[5] === '') {
          delete args[5]
        }
      }
      const value = args[3] || args[4] || args[5] || ''
      attrs[i] = {
        name: args[1],
        value: decodeBracket(value)
      }
    }


    if (!unarySlash) {
      stack.push({
        tag: tagName,
        lowerCasedTag: tagName.toLowerCase(),
        attrs: attrs
      })
    }
    if (options.start) {
      options.start(tagName, attrs, unarySlash, match.start, match.end)
    }
  }

  function parseEndTag(tagName, start, end) {
    let pos, lowerCasedTagName
    if (start == null) start = index
    if (end == null) end = index

    if (tagName) {
      lowerCasedTagName = tagName.toLowerCase()
    }

    // Find the closest opened tag of the same type
    if (tagName) {
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      // If no tag name is provided, clean shop
      pos = 0
    }

    if (pos >= 0) {
      // Close all the open elements, up the stack
      for (let i = stack.length - 1; i >= pos; i--) {
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) && options.warn
        ) {
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`
          )
        }
        //end
        if (options.end) {
          options.end(stack[i].tag, start, end)
        }
      }
      // Remove the open elements from the stack
      stack.length = pos
    }
  }
}
export function ubbToHtml(ubb, getEmojiUrl = function () { return null }, mode = '', ) {
  let result = []
  let atPersonUnFound = 0
  let emojiUnFound = 0
  parseUBB(ubb, {
    start(tag, attrs, unary, start, end) {
      switch (tag) {
        case 'atPerson':
          {

            let text = attrs.find(item => item.name === 'name')
            let value = attrs.find(item => item.name === 'id')
            if (text) { //没有找到对应的值,容错
              if (~mode.indexOf('noAt')) {
                result.push("@" + text.value)
              } else {
                let src = getAtCanvas('@' + text.value)
                result.push(`<img src="${src}" data-at="true" data-value="${value.value}" data-text="${text.value}"/>`)
              }
            } else {
              atPersonUnFound++
              result.push(ubb.slice(start, end))
            }
          }
          break;
        case 'emoji':
          {
            let src
            let emoji = attrs.find(item => item.name === 'id')
            if (emoji && (src = getEmojiUrl(emoji.value))) {
              result.push(`<img src="${src}" data-emoji="${emoji.value}"/>`)
            } else {
              emojiUnFound++
              result.push(ubb.slice(start, end))
            }
          }
          break;
        default:
          result.push(ubb.slice(start, end))
      }
    },
    end(tag, start, end) {
      switch (tag) {
        case 'atPerson':
          if (atPersonUnFound) {
            atPersonUnFound--
            result.push(ubb.slice(start, end))
          }
          break;
        case 'emoji':
          if (emojiUnFound) {
            emojiUnFound--
            result.push(ubb.slice(start, end))
          }
          break;
        default:
          result.push(ubb.slice(start, end))
      }
    },
    chars(text) {
      result.push(decodeBracket(text))
    }
  })

  result = result.join('');
  result = result.replace(/^[\n\r]*/g, '')
  result = result.replace(/\n/g, '<br/>');
  return result;
}
