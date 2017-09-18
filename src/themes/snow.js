import extend from 'extend';
import Emitter from '../core/emitter';
import BaseTheme, { BaseTooltip } from './base';
import LinkBlot from '../formats/link';
import { Range } from '../core/selection';
import icons from '../ui/icons';
import Tooltip from '../ui/tooltip';
import Keyboard from '../modules/keyboard';
import Delta from 'quill-delta';


const TOOLBAR_CONFIG = [
  [{ 'align': [] }]
];

class SnowTheme extends BaseTheme {
  constructor(quill, options) {
    if (options.modules.toolbar != null && options.modules.toolbar.container == null) {
      options.modules.toolbar.container = TOOLBAR_CONFIG;
    }
    super(quill, options);
    this.quill.container.classList.add('ql-snow');
  }

  extendToolbar(toolbar) {
    toolbar.container.addEventListener('mousedown', e => {
      e.preventDefault()
    })
    toolbar.container.classList.add('ql-snow');
    this.buildButtons([].slice.call(toolbar.container.querySelectorAll('button')), icons);
    this.buildPickers([].slice.call(toolbar.container.querySelectorAll('select')), icons);
    this.tooltip = new SnowTooltip(this.quill, this.options.bounds);
    this.tooltipAddLink = new AddLink(this.quill, this.options.bounds)
    if (toolbar.container.querySelector('.ql-link')) {
      this.quill.keyboard.addBinding({ key: 'K', shortKey: true }, function (range, context) {
        toolbar.handlers['link'].call(toolbar, !context.format.link);
      });
    }
  }
}
SnowTheme.DEFAULTS = extend(true, {}, BaseTheme.DEFAULTS, {
  modules: {
    toolbar: {
      handlers: {
        gps(value) {
          let gpsHandler = this.quill.options.gpsHandler
          gpsHandler && gpsHandler(value)
        },
        image(value) {
          let imageHandler = this.quill.options.imageHandler
          imageHandler && imageHandler(value)
        },
        link: function (value) {
          if (value) {
            let range = this.quill.getSelection();
            if (range == null || range.length == 0) {
              let linkHandler = this.quill.options.linkHandler
              if (linkHandler) {
                linkHandler()
              } else {
                let tooltip = this.quill.theme.tooltipAddLink;
                tooltip.edit();
              }
            } else {
              let preview = this.quill.getText(range);
              if (/^\S+@\S+\.\S+$/.test(preview) && preview.indexOf('mailto:') !== 0) {
                preview = 'mailto:' + preview;
              }
              let tooltip = this.quill.theme.tooltip;
              tooltip.edit('link', preview);
            }
          } else {
            this.quill.format('link', false);
          }
        }
      }
    }
  }
});


class SnowTooltip extends BaseTooltip {
  constructor(quill, bounds) {
    super(quill, bounds);
    this.preview = this.root.querySelector('a.ql-preview');
  }

  listen() {
    super.listen();
    this.root.querySelector('a.ql-action').addEventListener('click', (event) => {
      if (this.root.classList.contains('ql-editing')) {
        this.save();
      } else {
        this.edit('link', this.preview.textContent);
      }
      event.preventDefault();
    });
    this.root.querySelector('a.ql-remove').addEventListener('click', (event) => {
      if (this.linkRange != null) {
        let range = this.linkRange;
        this.restoreFocus();
        this.quill.formatText(range, 'link', false, Emitter.sources.USER);
        delete this.linkRange;
      }
      event.preventDefault();
      this.hide();
    });
    this.quill.on(Emitter.events.SELECTION_CHANGE, (range, oldRange, source) => {
      if (range == null) return;
      if (range.length === 0 && source === Emitter.sources.USER) {
        let [link, offset] = this.quill.scroll.descendant(LinkBlot, range.index);
        if (link != null) {
          this.linkRange = new Range(range.index - offset, link.length());
          let preview = LinkBlot.formats(link.domNode);
          this.preview.textContent = preview;
          this.preview.setAttribute('href', preview);
          this.show();
          this.position(this.quill.getBounds(this.linkRange));
          return;
        }
      } else {
        delete this.linkRange;
      }
      this.hide();
    });
  }

  show() {
    super.show();
    this.root.removeAttribute('data-mode');
  }
}
SnowTooltip.TEMPLATE = [
  '<a class="ql-preview" target="_blank" href="about:blank"></a>',
  '<input type="text" data-formula="e=mc^2" data-link="https://web.kd77.cn" data-video="Embed URL">',
  '<a class="ql-action"></a>',
  '<a class="ql-remove"></a>'
].join('');

class AddLink extends Tooltip {
  constructor(quill, boundsContainer) {
    super(quill, boundsContainer);
    this.textbox = this.root.querySelector('.add-link-text');
    this.linkbox = this.root.querySelector('.add-link-link')
    this.listen();
  }

  listen() {
    let handler = (event) => {
      if (Keyboard.match(event, 'enter')) {
        this.save();
        event.preventDefault();
      } else if (Keyboard.match(event, 'escape')) {
        this.cancel();
        event.preventDefault();
      }
    }
    this.textbox.addEventListener('keydown', handler);
    this.linkbox.addEventListener('keydown', handler)
    this.quill.on(Emitter.events.SELECTION_CHANGE, (range, oldRange, source) => {
      if (range == null) return;

      this.cancel()
    })
    this.root.querySelector('a.ql-action').addEventListener('click', (event) => {
      this.save();
      event.preventDefault();
    })
  }

  cancel() {
    this.textbox.value = '';
    this.linkbox.value = 'http://'
    this.hide();
  }

  edit() {
    this.root.classList.remove('ql-hidden');
    this.root.classList.add('ql-editing-2');

    this.position(this.quill.getBounds(this.quill.selection.savedRange));
  }

  save() {
    let text = this.textbox.value
    let link = this.linkbox.value
    this.quill.insertLink(text, link)
    this.cancel()
  }
}
AddLink.TEMPLATE = `<label>文本: <input type="text" placeholder="输入文本" class="add-link-text"/></label><br/>
<label>链接: <input type="text" class="add-link-link" placeholder="输入链接"/></label>
<a class="ql-action"></a>`


export default SnowTheme;
