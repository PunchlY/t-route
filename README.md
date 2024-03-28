# template-route

这是一个路由, 使用模板字符串和`Radix Tree`.

# Usage

```js
import { Route, Wildcard } from 'template-route';

const router = new Route()

router.init`/`('hello world');

router.init`/${/(?<name>.*?)/}${['.jpg', '.png']}`('img');

router.init`/hello/${Wildcard}`('wildcard');

console.log(router.find('/')) // log: hello world

const param = {};
console.log(router.find('/img.png', param)) // log: img
console.log(param) // log: { name: 'img' }

const param_1 = {};
console.log(router.find('/hello/world/', param_1)) // log: img
console.log(param_1) // log: { '*': 'world/' }

```
