"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
let model = new index_1.default();
let data = [
    ['hello', 'how', 'are', 'you'],
    ['hello', 'how', 'are', 'your', 'studies', 'going', '?'],
    ['This', 'is', 'a', 'test'],
    ['How', 'does', 'this', 'work']
];
model.train(data);
let target = [
    ['how', 'are']
];
let predictions = model.predict(target, 2, 2);
console.log(predictions);
//# sourceMappingURL=example.js.map