const RENDER_TO_DOM = Symbol('render to dom');

export class ElementWrapper {
    constructor(component) {
        this.root = document.createElement(component)
    }
    appendChild(component) {
        const range = document.createRange();
        range.setStart(this.root, this.root.childNodes.length);
        range.setEnd(this.root, this.root.childNodes.length);
        component[RENDER_TO_DOM](range);
    }
    setAttribute(name, value) {
        if (name.match(/^on([\s\S]+)/)) {
            this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
        } else if (name === 'className') {
            this.root.setAttribute('class', value)
        } else {
            this.root.setAttribute(name, value)
        }
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
}

export class TextWrapper {
    constructor(context) {
        this.root = document.createTextNode(context);
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
}


export class Component {
    constructor() {
        this._root = null;
        this.children = [];
        this.props = Object.create(null);
        this._range = null;
    }
    appendChild(child) {
        this.children.push(child);
    }
    setAttribute(name, value) {
        this.props[name] = value;
    }
    [RENDER_TO_DOM](range) {
        // console.log('range', range);
        this._range = range;
        this.render()[RENDER_TO_DOM](range)
    }
    rerender() {
        const oldRange = this._range;
        const range = document.createRange();
        range.setStart(oldRange.startContainer, oldRange.startOffset);
        range.setEnd(oldRange.endContainer, oldRange.startOffset);
        this[RENDER_TO_DOM](range)
        oldRange.setStart(oldRange.endContainer, range.endOffset);
        oldRange.deleteContents();
    }
    setState(newState) {
        if (this.state === null || typeof this.state !== 'object') {
            this.state = newState;
            this.rerender();
            return;
        }
        const merge = (oldState, newState) => {
            for(let p in newState) {
                if(oldState[p] === null || typeof oldState[p] !== 'object') {
                    oldState[p] = newState[p]
                } else {
                    merge(oldState[p], newState[p])
                }
            }
        }
        console.log('this.state', this.state);
        merge(this.state, newState);
        this.rerender();
    }
    // get root() {
    //     if(!this._root) {
    //         this._root = this.render().root;
    //     }
    //     return this._root
    // }
}



export function createElement(type, attrs, ...children) {
    let e;
    if (typeof type  === 'string') {
        e = new ElementWrapper(type);
    } else {
        e = new type;
    }
    for(let p in attrs) {
        e.setAttribute(p, attrs[p]);
    }
    let insertChildren = (children) => {
        for(let child of children) {
            if (typeof child === 'string') {
                child = new TextWrapper(child);
            }
            if (child === null) {
                continue;
            }
            if (Array.isArray(child)) {
                insertChildren(child)
            } else {
                e.appendChild(child);
            }
        }
    }
    insertChildren(children)
    return e
}

export function render(component, parentElement) {
    const range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range)
}