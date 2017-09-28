
const decodingMap = {
  '&sbkt;': '[',
  '&ebkt;': ']',
  '&amp;': '&'
}
const encodedAttr = /&(?:sbkt|ebkt|amp);/g
export function decodeBracket(value) {
  return value.replace(encodedAttr, match => decodingMap[match])
}
export function encodeBracket(value) {
  return !value ? value : String(value).replace(/&/g, "&amp;").replace(/\]/g, "&ebkt;").replace(/\[/g, "&sbkt;")
}
