import Embed from '../blots/embed'

function render(value, node) {
	value = JSON.parse(value)
	node.setAttribute('data-value', value)
	node.classList.add('ql-file-wrap')

	const icon = document.createElement('img')
	icon.classList.add('ql-file-icon')

	const name = document.createElement('span')
	name.classList.add('ql-file-name')
	name.innerHTML = value.name

	const desc = document.createElement('span')
	desc.classList.add('ql-file-desc')
	desc.innerHTML = value.desc

	const content = document.createElement('span')
	content.classList.add('ql-file-content')
	content.appendChild(name)
	content.appendChild(desc)

	const file = document.createElement('span')
	file.classList.add('ql-file')
	file.appendChild(icon)
	file.appendChild(content)

	node.appendChild(file)
}

class File extends Embed {
	static create(value) {
		let node = super.create(value);
		if (typeof value === 'string') {
			render(value, node);
			node.setAttribute('data-value', value);
		}
		return node;
	}

	static value(domNode) {
		return domNode.getAttribute('data-value');
	}
}
File.blotName = 'file';
File.tagName = 'SPAN';


export default File;
