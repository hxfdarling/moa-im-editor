import Delta from 'quill-delta';
import Quill from '../core/quill';
import logger from '../core/logger';
import Module from '../core/module';
import { getAtCanvas } from './util'
import Emitter from '../core/emitter';
import { Range } from '../core/selection';
let debug = logger('quill:drop');

const ENTER_KEY = 13
const UP_KEY = 38
const DOWN_KEY = 40
const ESC_KEY = 27
let isMoveCursorKey = e => (e.keyCode == 35 || e.keyCode == 36 || e.keyCode == 37 || e.keyCode == 39)
let isEscKey = e => e.keyCode === ESC_KEY
let isEnterKey = e => e.keyCode === ENTER_KEY && !e.ctrlKey && !e.shiftKey
let isUpOrDown = e => e.keyCode === UP_KEY || e.keyCode === DOWN_KEY
class At extends Module {
  constructor(quill, options) {
    super(quill, options);
    this.listening = false
    this.startRange = new Range(0, 0)
    this.position = null
    this.view = null
    if (this.quill.options.atView) {
      this.bindView(this.quill.options.atView)
    }
    this.quill.on('input', this.onInput.bind(this));
    this.quill.on('keydown', this.onkeydown.bind(this))
  }
  bindView(view) {
    this.view = view
    this.view.onselect = result => {
      this.insert(result)
      this.cancel()
    }
  }
  insert(data) {
    if (!data) {
      return
    }
    let curRange = this.quill.getSelection(true);
    let index = this.startRange.index - 1
    let range = new Range(index, curRange.index - index)
    this.quill.setSelection(range, Quill.sources.SILENT);
    this.quill.insertAt(data)
  }
  onkeydown(e) {
    if (!this.view) {
      return
    }
    if (e.ctrlKey || e.shiftKey) {
      return
    }
    if (isEscKey(e) && isMoveCursorKey(e)) {
      this.cancel()
    }
    if (this.listening && (isUpOrDown(e) || isEnterKey(e))) {
      switch (e.keyCode) {
        case ENTER_KEY:
          if (this.view.keydown('enter') === true) {
            e.preventDefault()
          }
          break;
        case UP_KEY:
          this.view.keydown('up');
          e.preventDefault()
          break;
        case DOWN_KEY:
          this.view.keydown('down');
          e.preventDefault()
          break;
      }
    }
  }
  onInput() {
    if (!this.view) {
      return
    }
    let quill = this.quill
    let range = quill.getSelection()
    let text = quill.getText(0, range.index)
    let key = /@([^@ \f\n\r\t\v]*$)/.exec(text);
    let startAt = /@$/.test(text)
    if (startAt) {
      this.startRange = range
      this.listening = true
      this.position = quill.getBounds(range)
      this.show()
    }
    if (this.listening) {
      if (key) {
        key = key[1]
        this.filter(key)
      } else {
        this.cancel()
      }
    }
  }
  cancel() {
    this.position = null
    this.startRange = null
    this.listening = false
    this.hide()
  }
  filter(key) {
    this.view.filter(key)
  }
  show() {
    let rootRect = this.quill.root.getBoundingClientRect()
    let position = {
      top: rootRect.top + this.position.top,
      left: rootRect.left + this.position.left
    }
    this.view.show(position)
  }
  hide() {
    this.view.hide()
  }
}

export { At as default };
