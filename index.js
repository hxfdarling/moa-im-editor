import 'core-js/shim'
import './src/assets/quill.snow.css'
import Quill from './src/quill.js'

let x = window.x = new Quill('#snow-container .editor', {
  modules: {
    'toolbar': [[{ 'align': [] }]]
  },
  atView: {
    hide() {
      console.log("hide")
    },
    show(position) {
      console.log(position)
    },
    filter(key) {
      console.log(key)
    },
    keydown(name) {
      this.onselect({ value: 1234, text: "全体成员" })
      console.log(name)
    }
  },
  getEmojiUrl(value) {
    return value
  },
  placeholder: '欢迎使用口袋助理富文本编辑器',
  enterHandler() {//自定义enter键
    let v = x.getValue()
    console.log(v)
    // if (v.trim()) {
    //   console.log(v)
    //   x.setValue("")
    // }
  }
})
