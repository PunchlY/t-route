
interface Node {
    meta: any;
}

interface ParentNode extends Node {
}
class ParentNode {
    static: Record<string, StaticNode> = {};

    findStaticMatchingChild(path: string, pathIndex: number) {
        const staticChild: StaticNode | undefined = this.static[path.charAt(pathIndex)];
        if (!staticChild)
            return;
        if (!staticChild.matchPrefix)
            return staticChild;
        if (!staticChild.matchPrefix(path, pathIndex))
            return;
        return staticChild;
    }

    createStaticChild(path: string): StaticNode {
        if (path.length === 0) {
            if (this instanceof StaticNode)
                return this;
            throw new Error(this.constructor.name);
        }

        let staticChild = this.static[path.charAt(0)];
        if (staticChild) {
            let i = 1;
            for (; i < staticChild.prefix.length; i++) {
                if (path.charCodeAt(i) !== staticChild.prefix.charCodeAt(i)) {
                    staticChild = staticChild.split(this, i);
                    break;
                }
            }
            return staticChild.createStaticChild(path.slice(i));
        }

        const label = path.charAt(0);
        return this.static[label] = new StaticNode(path);
    }
}

interface WildcardNode extends Node {
}
class WildcardNode {
}

class ParametricNode extends ParentNode {
    constructor(
        public regex: RegExp,
    ) {
        super();
    }
}

class StaticNode extends ParentNode {
    declare matchPrefix?: (path: string, pathIndex: number) => boolean;
    parametric = new Map<string, ParametricNode>;
    wildcard?: WildcardNode;
    constructor(
        public prefix: string,
    ) {
        super();
        this.compilePrefixMatch();
    }

    createParametricChild(source: string) {
        const regex = new RegExp(`^${source}$`);
        let parametricChild = this.parametric.get(source);
        if (parametricChild)
            return parametricChild;

        parametricChild = new ParametricNode(regex);
        this.parametric.set(source, parametricChild);

        return parametricChild;
    }

    createWildcardChild() {
        return this.wildcard ??= new WildcardNode();
    }

    split(parentNode: ParentNode, length: number) {
        const parentPrefix = this.prefix.slice(0, length);
        const childPrefix = this.prefix.slice(length);

        this.prefix = childPrefix;
        this.compilePrefixMatch();

        const staticNode = new StaticNode(parentPrefix);
        staticNode.static[childPrefix.charAt(0)] = this;
        parentNode.static[parentPrefix.charAt(0)] = staticNode;

        return staticNode;
    }

    private compilePrefixMatch() {
        if (this.prefix.length === 1) {
            this.matchPrefix = undefined;
            return;
        }

        const lines = [];
        for (let i = 1; i < this.prefix.length; i++)
            lines.push(`path.charCodeAt(i+${i})===${this.prefix.charCodeAt(i)}`);
        // @ts-ignore
        this.matchPrefix = new Function('path', 'i', `return ${lines.join('&&')}`);
    }
}

export type { Node };
export { ParentNode };
export { StaticNode, ParametricNode, WildcardNode };
