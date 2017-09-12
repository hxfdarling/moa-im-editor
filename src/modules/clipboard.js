import Delta from 'quill-delta';
import Quill from '../core/quill';
import logger from '../core/logger';
import Module from '../core/module';
import {
  deltaEndsWith, DOM_KEY, traverse, matchSpacing,
  CLIPBOARD_CONFIG, matchAttributor, matchBlot,
  matchNewline, matchText
} from './util.js'


let debug = logger('quill:clipboard');

class Clipboard extends Module {
  constructor(quill, options) {
    super(quill, options);
    this.quill.root.addEventListener('paste', this.onPaste.bind(this));
    this.container = this.quill.addContainer('ql-clipboard');
    this.container.setAttribute('contenteditable', true);
    this.container.setAttribute('tabindex', -1);
    this.matchers = [];
    CLIPBOARD_CONFIG.concat(this.options.matchers).forEach(([selector, matcher]) => {
      if (!options.matchVisual && matcher === matchSpacing) return;
      this.addMatcher(selector, matcher);
    });
  }

  addMatcher(selector, matcher) {
    this.matchers.push([selector, matcher]);
  }

  convert(html) {
    /**
     * 通过setValue调用保留at数据，如果通过复制粘贴就直接转为文本展示
     */
    let noAt = true
    if (typeof html === 'string') {
      noAt = false
      this.container.innerHTML = html.replace(/\>\r?\n +\</g, '><'); // Remove spaces between tags
    }
    let [elementMatchers, textMatchers] = this.prepareMatching();
    let delta = traverse(this.container, elementMatchers, textMatchers);
    if (noAt) {
      delta.ops = delta.ops.map(item => {
        if (typeof item.insert !== 'string' && item.insert.at) {
          item.insert = "@" + item.attributes['data-text'] + " "
        }
        return item
      })
    }
    // Remove trailing newline
    if (deltaEndsWith(delta, '\n') && delta.ops[delta.ops.length - 1].attributes == null) {
      delta = delta.compose(new Delta().retain(delta.length() - 1).delete(1));
    }
    debug.log('convert', this.container.innerHTML, delta);
    this.container.innerHTML = '';
    return delta;
  }

  dangerouslyPasteHTML(index, html, source = Quill.sources.API) {
    if (typeof index === 'string') {
      return this.quill.setContents(this.convert(index), html);
    } else {
      let paste = this.convert(html);
      return this.quill.updateContents(new Delta().retain(index).concat(paste), source);
    }
  }

  onPaste(e) {
    if (e.defaultPrevented || !this.quill.isEnabled()) return;
    let range = this.quill.getSelection();
    let delta = new Delta().retain(range.index);
    let scrollTop = this.quill.scrollingContainer.scrollTop;
    this.quill.pasteing = true
    this.container.focus();
    this.quill.selection.update(Quill.sources.SILENT);
    setTimeout(() => {
      delta = delta.concat(this.convert()).delete(range.length);
      this.quill.updateContents(delta, Quill.sources.USER);
      // range.length contributes to delta.length()
      this.quill.setSelection(delta.length() - range.length, Quill.sources.SILENT);
      this.quill.scrollingContainer.scrollTop = scrollTop;
      this.quill.focus();
      this.quill.pasteing = false
    }, 1);
  }

  prepareMatching() {
    let elementMatchers = [], textMatchers = [];
    this.matchers.forEach((pair) => {
      let [selector, matcher] = pair;
      switch (selector) {
        case Node.TEXT_NODE:
          textMatchers.push(matcher);
          break;
        case Node.ELEMENT_NODE:
          elementMatchers.push(matcher);
          break;
        default:
          [].forEach.call(this.container.querySelectorAll(selector), (node) => {
            // TODO use weakmap
            node[DOM_KEY] = node[DOM_KEY] || [];
            node[DOM_KEY].push(matcher);
          });
          break;
      }
    });
    return [elementMatchers, textMatchers];
  }
}
Clipboard.DEFAULTS = {
  matchers: [],
  matchVisual: true
};



export {
  Clipboard as default, matchAttributor, matchBlot,
  matchNewline, matchSpacing, matchText
};
