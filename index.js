import 'core-js/shim'
import './src/assets/quill.snow.css'
import Quill from './src/quill.js'

let uploadurl = 'https://up.qbox.me'
let token = 'BDlsCI9C9xGl-aBysVoFl7-eu9c2j5JLredsogNl:nafwg7baO0UXzyjpQa8VdTjtvTM=:eyJzY29wZSI6Im1vYWltZyIsImNhbGxiYWNrVXJsIjoiaHR0cDovLzEzOS4xMjkuMjI1LjE1ODo4MDgxL3VwbG9hZC91cC5waHAiLCJjYWxsYmFja0JvZHkiOiJoYXNoPSQoZXRhZykmYnVja2V0PSQoYnVja2V0KSZ0eXBlPSQobWltZVR5cGUpJnNpemU9JChmc2l6ZSkmaW1hZ2VfaW5mbz0kKGltYWdlSW5mbykmIiwiZGVhZGxpbmUiOjE1MDIzNTAzNjV9'
function ajax(params, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("post", uploadurl, true);
  var fd = new FormData();
  for (let key in params) {
    if (params.hasOwnProperty(key)) {
      fd.append(key, params[key]);
    }
  }

  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      var responseText;
      if (xhr.status == 200) {
        responseText = xhr.responseText;
      } else {
        responseText = '无法连接到服务器';
      }
      callback(responseText);
    }
  };
  xhr.send(fd);
}
function ajaxUpload(file) {
  return new Promise((resolve, reject) => {
    ajax({
      token,
      file
    }, res => {
      try {
        let json = JSON.parse(res);
        if (json.success === 0) {
          resolve(json)
        }
      } catch (e) {
        //
      }
      reject(new Error("图片上传失败"))
    });
  })
}
function getUrl(file) {
  return new Promise((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = e => reject(e)
    reader.readAsDataURL(file);
  })
}
window.x = new Quill(document.querySelector('#app'), {
  placeholder: '欢迎使用口袋助理富文本编辑器',
  gpsHandler() {
    window.x.insertGps({ text: '香港特別行政區北區石寨下路', lon: 114.181391, lat: 22.537804 })
  },
  imageHandler() {
    let fileInput = document.createElement('input');
    fileInput.setAttribute('type', 'file');
    fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
    fileInput.classList.add('ql-image');
    fileInput.addEventListener('change', () => {
      if (fileInput.files != null && fileInput.files[0] != null) {
        Promise.all([getUrl(fileInput.files[0]), ajaxUpload(fileInput.files[0])]).then(data => {
          window.x.insertImage({
            url: data[0],
            hash: data[1].hash,
            width: data[1].image.width,
            height: data[1].image.height
          })
        })
      }
    });
    document.body.appendChild(fileInput);

    fileInput.click();
    fileInput.parentElement.removeChild(fileInput)

  }
})
