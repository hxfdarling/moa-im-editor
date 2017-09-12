import Delta from 'quill-delta';
import Quill from '../core/quill';
import logger from '../core/logger';
import Module from '../core/module';
import { deltaEndsWith, DOM_KEY, traverse, matchSpacing, CLIPBOARD_CONFIG } from './util.js'

let debug = logger('quill:drop');

class Drop extends Module {
  constructor(quill, options) {
    super(quill, options);
    this.quill.root.addEventListener('drop', this.onDrop.bind(this));
    this.container = this.quill.addContainer('ql-drop');
    this.matchers = [];
    console.log(CLIPBOARD_CONFIG)
    CLIPBOARD_CONFIG.concat(this.options.matchers || []).forEach(([selector, matcher]) => {
      if (!options.matchVisual && matcher === matchSpacing) return;
      this.addMatcher(selector, matcher);
    });
  }

  addMatcher(selector, matcher) {
    this.matchers.push([selector, matcher]);
  }

  convert(html) {
    if (typeof html === 'string') {
      this.container.innerHTML = html.replace(/\>\r?\n +\</g, '><'); // Remove spaces between tags
    }
    let [elementMatchers, textMatchers] = this.prepareMatching();
    let delta = traverse(this.container, elementMatchers, textMatchers);
    // Remove trailing newline
    if (deltaEndsWith(delta, '\n') && delta.ops[delta.ops.length - 1].attributes == null) {
      delta = delta.compose(new Delta().retain(delta.length() - 1).delete(1));
    }
    debug.log('convert', this.container.innerHTML, delta);
    this.container.innerHTML = '';
    return delta;
  }

  onDrop(e) {

    if (e.defaultPrevented || !this.quill.isEnabled()) return;
    e.preventDefault()
    let range = this.quill.getSelection();
    let delta = new Delta().retain(range ? range.index : 0);
    let scrollTop = this.quill.scrollingContainer.scrollTop;
    this.quill.selection.update(Quill.sources.SILENT);
    let html
    try {
      html = e.dataTransfer.getData('text/html');
      if (!html) { //如果是html 优先作为html处理
        html = e.dataTransfer.getData('text');
      }
    } catch (e) {
      //
    }
    this.container.innerHTML = html
    setTimeout(() => {
      delta = delta.concat(this.convert()).delete(range ? range.length : 0);
      this.quill.updateContents(delta, Quill.sources.USER);
      // range.length contributes to delta.length()
      this.quill.setSelection(delta.length() - (range ? range.length : 0), Quill.sources.SILENT);
      this.quill.scrollingContainer.scrollTop = scrollTop;
      this.quill.focus();
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
Drop.DEFAULTS = {
  matchers: [],
  matchVisual: true
};

export { Drop as default };
