import { ParametricNode, StaticNode } from './lib/node';
import { EscapeRegExp, NamedCapturingGroup } from './lib/regexp';

const Wildcard = Symbol('*');

class Meta {
    param?(this: Record<string, string>, ...args: [...args: RegExpMatchArray[], wildcard: string] | RegExpMatchArray[]): void;
    constructor(
        public data: any,
        public _index = 0,
        public _total = 0,
        public _names = new Map<string | number, string>(),
    ) { }
    copy() {
        return new Meta(
            this.data,
            this._index,
            this._total,
            new Map(this._names),
        );
    }
}

function* Parse_sub(sub: unknown, node: StaticNode, param: string | undefined, index: number, template: ArrayLike<string>, subs: unknown[], meta: Meta): Generator<Meta> {
    if (sub instanceof RegExp) {
        const res = NamedCapturingGroup(sub.source, meta._total);
        param = (param ?? '') + res.source;
        for (const [name, id] of res.names)
            meta._names.set(name, `arguments[${meta._index}][${id + meta._total}]`);
        meta._total += res.total;
        return yield* Parse(node, template[index], param, index, template, subs, meta);
    } else if (sub === Wildcard) {
        if (index < subs.length || template[index])
            throw new Error('Wildcard must be the last substitution in the route');
        if (param)
            throw new Error('Wildcard must be the last substitution in the route');
        meta._names.set('*', `arguments[${meta._index++}]`);
        return yield node.createWildcardChild().meta = meta;
    } else {
        return yield* Parse(node, `${encodeURIComponent(sub as any)}${template[index]}`, param, index, template, subs, meta);
    }
}
function* Parse(node: StaticNode, path: string, param: string | undefined, index: number, template: ArrayLike<string>, subs: unknown[], meta: Meta): Generator<Meta> {
    if (param) {
        let pos = path.indexOf('/');
        if (index >= subs.length)
            pos = Infinity;
        if (pos !== -1) {
            meta._total = 0;
            meta._index++;
            param += EscapeRegExp(path.slice(0, pos));
            // @ts-ignore
            return yield* Parse(node.createParametricChild(param), path.slice(pos), undefined, index, template, subs, meta);
        } else
            param += EscapeRegExp(path);
    } else if (path)
        node = node.createStaticChild(path);

    if (index >= subs.length)
        return yield node.meta = meta;
    const sub = subs[index++];
    if (Array.isArray(sub)) {
        const clone: Meta[] = [];
        for (const _ of sub)
            clone.push(clone[0] ? clone[0].copy() : clone[0] = meta);
        for (const e of sub)
            yield* Parse_sub(e, node, param, index, template, subs, clone.pop()!);
        return;
    } else
        return yield* Parse_sub(sub, node, param, index, template, subs, meta);
}

function* Find(node: StaticNode | ParametricNode, path: string, index: number, param?: any[]): Generator<Meta> {
    if (index >= path.length) {
        if (node.meta)
            yield node.meta;
        return;
    }
    const next = node.findStaticMatchingChild(path, index);
    if (next)
        yield* Find(next, path, index + next.prefix.length, param);
    if (node instanceof StaticNode) {
        let end = path.indexOf('/', index);
        end = end === -1 ? Infinity : end;
        for (const parametric of node.parametric.values()) {
            const sub = path.substring(index, end);
            const match = parametric.regex.exec(sub);
            if (match) {
                param?.push(match);
                yield* Find(parametric, path, end, param);
                param?.pop();
            }
        }
        if (node.wildcard) {
            param?.push(path.substring(index));
            yield node.wildcard.meta;
            param?.pop();
        }
    }
}

class Route<T extends any[]> {
    #root: StaticNode;
    constructor(public prefix = '') {
        this.#root = new StaticNode(prefix);
    }
    init(template: ArrayLike<string>, ...subs: (string | RegExp | typeof Wildcard | (string | RegExp | typeof Wildcard)[])[]) {
        const node = this.#root;
        return function (...data: T) {
            for (const meta of Parse(node, template[0], undefined, 0, template, subs, new Meta(data))) {
                if (meta._index)
                    meta.param = Function(`${[...meta._names].map(([key, value]) => `this[${JSON.stringify(key)}]=${value}`).join(',')}`) as any;
            }
        };
    }
    has(path: string) {
        if (!path.startsWith(this.#root.prefix))
            return false;
        for (const _ of Find(this.#root, path, this.#root.prefix.length))
            return true;
        return false;
    }
    find(path: string, param?: Record<string, string>) {
        if (!path.startsWith(this.#root.prefix))
            return;
        const paramMatch: [...args: RegExpMatchArray[], wildcard: string] | RegExpMatchArray[] = [];
        for (const { param: paramFunc, data } of Find(this.#root, path, this.#root.prefix.length, paramMatch)) {
            if (param)
                paramFunc?.apply(param, paramMatch);
            return data as T;
        }
        return;
    }
}

export { Route, Wildcard };
