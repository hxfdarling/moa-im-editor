import logger from '../core/logger';
import Module from '../core/module';

let debug = logger('quill:drop');

class Input extends Module {
  constructor(quill, options) {
    super(quill, options);
    let root = this.quill.root
    let emitter = this.quill.emitter
    root.addEventListener('blur', this._blur = e => {
      if (this.quill.pasteing) {
        return
      }
      emitter.emit('blur', e)
      root.classList.remove('focus')
    })
    root.addEventListener('focus', this._focus = e => {
      emitter.emit('focus', e)
      root.classList.add('focus')
    })
    root.addEventListener('paste', this._paste = e => {
      emitter.emit('paste', e)
    })
    root.addEventListener('input', this._input = () => {
      emitter.emit('input')
    });
  }
  destroy() {
    super.destroy()
    this.quill.root.removeEventListener('blur', this._blur)
    this.quill.root.removeEventListener('focus', this._focus)
    this.quill.root.removeEventListener('paste', this._paste)
    this.quill.root.removeEventListener('input', this._input)
  }
}

export { Input as default };
