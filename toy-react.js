const RENDER_TO_DOM = Symbol('render to dom');

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
    get vchildren() {
        return this.children.map((child) = child.vdom)
    }
    get vdom() {
        return this.render().vdom;
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
export class ElementWrapper extends Component {
    constructor(type) {
        super(type);
        this.type = type;
        this.root = document.createElement(type)
    }
    get vdom() {
        return this;
        /*
        {
            type: this.type,
            props: this.props,
            children: this.children.map((child) => child.vdom)
        }
        */
    }
    /*
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
    */
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        const root = document.createElement(this.type);

        for(const name in this.props) {
            const value = this.props[name]
            if (name.match(/^on([\s\S]+)/)) {
                root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
            } else if (name === 'className') {
                root.setAttribute('class', value)
            } else {
                root.setAttribute(name, value)
            }
        }
        
        for(const child of this.children) {
            const childrange = document.createRange();
            childrange.setStart(root, root.childNodes.length);
            childrange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childrange);
        }
        console.log('root', root);
        range.insertNode(root);
    }
}

export class TextWrapper extends Component {
    constructor(content) {
        super(content);
        this.type = '#text',
        this.content = content,
        this.root = document.createTextNode(content);
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.root);
    }
    get vdom() {
        return this;
        /*{
            type: '#text',
            content: this.content
        }
        */
    }
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