"use strict";
export class PredictionTree {
    constructor(itemValue = null) {
        this.children = [];
        this.parent = null;
        this.item = itemValue;
    }
    addChild(child) {
        let newChild = new PredictionTree(child);
        newChild.parent = this;
        this.children.push(newChild);
    }
    getChild(target) {
        return this.children.find(child => child.item === target);
    }
    getChildren() {
        return this.children;
    }
    hasChild(target) {
        return !!this.getChild(target);
    }
    removeChild(childValue) {
        this.children = this.children
            .filter(child => child.item !== childValue);
    }
}
//# sourceMappingURL=prediction-tree.js.map