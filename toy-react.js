const RENDER_TO_DOM = Symbol('render to dom');

function replaceContent(range, node) {
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();

    range.setStartBefore(node);
    range.setEndAfter(node);
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
    // get vchildren() {
    //     return this.children.map((child) = child.vdom)
    // }
    get vdom() {
        return this.render().vdom;
    }
    [RENDER_TO_DOM](range) {
        // console.log('range', range);
        this._range = range;
        this._vdom = this.vdom
        this._vdom[RENDER_TO_DOM](range)
    }
    update() {
        const isSameNode = (oldNode, newNode) => {
            if (oldNode.type !== newNode.type) {
                return false
            }
            for (const name in oldNode.props) {
                if (oldNode.props[name] !== newNode.props[name]) {
                    return false
                }
            }
            if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length) return false;
            if (newNode.type === '#text') {
                if (newNode.content !== oldNode.content) return false
            }
            return true;
        }
        const update = (oldNode, newNode) => {
            // 对比type,type不同重新重构，props打patch，type props一致认为该节点一致，继续对比所有子节点
            // 如果#text，打补丁替换content
            if (!isSameNode(oldNode, newNode)) {
                newNode[RENDER_TO_DOM](oldNode._range)
                return;
            }
            newNode._range = oldNode._range;
            const newVchildren = newNode.vchildren;
            const oldVchildren = oldNode.vchildren;

            if(!newVchildren || !newVchildren.length) return;

            let tailRange = oldVchildren[oldVchildren.length - 1]._range;


            for (let i = 0; i < newVchildren.length; i++) {
                const newChild = newVchildren[i];
                const oldChild = oldVchildren[i];
                if (i < oldVchildren.length) {
                    update(oldChild, newChild)
                } else {
                    const range = document.createRange();
                    range.setStart(tailRange.endContainer, tailRange.endOffset);
                    range.setEnd(tailRange.endContainer, tailRange.endOffset);
                    newChild[RENDER_TO_DOM](range);
                    tailRange = range;
                }
            }

        }
        const vdom = this.vdom
        update(this._vdom, vdom);
        // 保存新的vdom下一次对比时用
        this._vdom = vdom;
    }
    /*
    rerender() {
        const oldRange = this._range;
        const range = document.createRange();
        range.setStart(oldRange.startContainer, oldRange.startOffset);
        range.setEnd(oldRange.endContainer, oldRange.startOffset);
        this[RENDER_TO_DOM](range)
        oldRange.setStart(oldRange.endContainer, range.endOffset);
        oldRange.deleteContents();
    }
    */
    setState(newState) {
        if (this.state === null || typeof this.state !== 'object') {
            this.state = newState;
            this.update();
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
        this.update();
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
    }
    get vdom() {
        this.vchildren = this.children.map((child) => child.vdom);
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
        this._range = range;
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

        if (!this.children) {
            this.vchildren = this.children.map((child) => child.vdom)
        }
        
        for(const child of this.vchildren) {
            const childrange = document.createRange();
            childrange.setStart(root, root.childNodes.length);
            childrange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childrange);
        }
        replaceContent(range, root);
    }
}

export class TextWrapper extends Component {
    constructor(content) {
        super(content);
        this.type = '#text',
        this.content = content
    }
    [RENDER_TO_DOM](range) {
        this._range = range;
        const root = document.createTextNode(this.content);
        replaceContent(range, root);
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