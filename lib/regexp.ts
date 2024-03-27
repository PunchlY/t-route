
const characterClasses = /\[.*?(?<=(?<!\\)(?:\\{2})*)\]/g;
function ExcludeCharacterClasses(searchValue: RegExp) {
    return function* (str: string) {
        const matchCharacterClasses = str.matchAll(characterClasses);
        let value: RegExpMatchArray | undefined;
        NEXT: for (const res of RegExp.prototype[Symbol.matchAll].call(searchValue, str)) {
            while (value ??= matchCharacterClasses.next().value) {
                if (res.index! < value.index!)
                    break;
                else if (res.index! > value.index! + value[0].length)
                    value = undefined;
                else
                    continue NEXT;
            }
            yield res;
        }
    };
}

const escapes = /[.*+?^${}()|[\]\\]/g;
function EscapeRegExp(string: string) {
    return string.replace(escapes, '\\$&');
}

const backreferences = ExcludeCharacterClasses(/(?<=(?<!\\)(?:\\{2})*)\\([1-9]\d*)/g);
const groupAndAssertion = ExcludeCharacterClasses(/(?<=(?<!\\)(?:\\{2})*\()(?:\?(?:<([^\s\d!#%&*+<=>@^][^\s!#%&*+<=>@^]*)>|:|<?[=!]))?/g);
const groupRight = ExcludeCharacterClasses(/(?<=(?<!\\)(?:\\{2})*\))/g);
const backreferencesAndNamedBackreferences = ExcludeCharacterClasses(/(?<=(?<!\\)(?:\\{2})*)\\(?:([1-9]\d*)|k<([^\s\d!#%&*+<=>@^][^\s!#%&*+<=>@^]*)>)/g);

function NamedCapturingGroup(source: string, groupIdOffset = 0) {
    const use = new Map<number, number>();
    for (const res of backreferences(source))
        use.set(Number(res[1]), res.index!);

    const leftStack: ({
        name?: string;
        id: number;
        offset: number;
        index: number;
    } | undefined)[] = [];
    const leftGenerator = groupAndAssertion(source);
    const rightGenerator = groupRight(source);
    let groupId = 1;
    let res = '';
    const names = new Map<string, number>();
    const non: number[] = [];
    let pos = 0, offset = 0;
    let right: RegExpMatchArray | void;
    while (true) {
        const left = leftGenerator.next().value;
        while (right ??= rightGenerator.next().value) {
            if ((left?.index ?? Infinity) < right.index!)
                break;
            const data = leftStack.pop();
            if (data) {
                const { id, offset, name, index } = data;
                let isUse = false;
                if (name)
                    isUse = true;
                else if (use.has(id)) {
                    if (use.get(id)! < right.index!)
                        use.delete(id);
                    else
                        isUse = true;
                }
                if (isUse)
                    use.set(id, right.index! + offset);
                else
                    non.push(index);
            }
            right = undefined;
        }
        if (!left)
            break;
        const [token, name] = left;
        if (!token || name) {
            const index = left.index! + offset;
            res += source.substring(pos, pos = left.index!);
            if (name) {
                names.set(name, groupId);
                pos += token.length;
                offset -= token.length;
            }
            leftStack.push({
                name,
                id: groupId++,
                offset,
                index,
            });
        } else {
            leftStack.push(undefined);
        }
    }
    source = res + source.substring(pos);

    res = '', pos = 0;
    const use_map = Object.fromEntries([...use.keys()].sort((a, b) => a - b).map((id, k) => [id, k + 1 + groupIdOffset] as const));
    non.sort((a, b) => b - a);
    for (const { 0: sub, 1: num, 2: name, index } of (names.size ? backreferencesAndNamedBackreferences : backreferences)(source)) {
        while (non.length && index! >= non[non.length - 1]) {
            res += source.substring(pos, pos = non.pop()!);
            res += '?:';
        }
        const id = name ? names.get(name)! : Number(num);
        res += source.substring(pos, pos = index!);
        if (id >= groupId)
            res += '\\';
        else if (use.has(id) && use.get(id)! <= index!)
            res += `\\${use_map[id]}`;
        pos += sub.length;
    }
    source = res + source.substring(pos);

    return { source, names, total: use.size };
}

export { EscapeRegExp, NamedCapturingGroup };
