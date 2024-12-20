function floodFill(getter, seed, options = {}) {
    const onFlood = options.onFlood;
    const onBoundary = options.onBoundary;
    const equals = options.equals;
    const diagonals = options.diagonals || false;
    const startNode = get(seed);
    const permutations = prunedPermutations();
    const stack = [];
    const flooded = [];
    const visits = new Set();
    const bounds = new Map();
    stack.push({ currentArgs: seed });
    while (stack.length > 0) {
        flood(stack.pop());
    }
    return {
        flooded,
        boundaries: boundaries(),
    };
    function flood(job) {
        const getArgs = job.currentArgs;
        const prevArgs = job.previousArgs;
        if (visited(getArgs)) {
            return;
        }
        markAsVisited(getArgs);
        if (member(getArgs)) {
            markAsFlooded(getArgs);
            pushAdjacent(getArgs);
        }
        else {
            markAsBoundary(prevArgs);
        }
    }
    function visited(key) {
        const [x, y, z = 0] = key;
        const iKey = x + 32768 + 65536 * (y + 32768 + 65536 * (z + 32768));
        return visits.has(iKey);
    }
    function markAsVisited(key) {
        const [x, y, z = 0] = key;
        const iKey = x + 32768 + 65536 * (y + 32768 + 65536 * (z + 32768));
        visits.add(iKey);
    }
    function member(getArgs) {
        const node = get(getArgs);
        return equals ? equals(node, startNode) : node === startNode;
    }
    function markAsFlooded(getArgs) {
        flooded.push(getArgs);
        if (onFlood) {
            onFlood(...getArgs);
        }
    }
    function markAsBoundary(prevArgs) {
        const [x, y, z = 0] = prevArgs;
        const iKey = x + 32768 + 65536 * (y + 32768 + 65536 * (z + 32768));
        bounds.set(iKey, prevArgs);
        if (onBoundary) {
            onBoundary(...prevArgs);
        }
    }
    function pushAdjacent(getArgs) {
        for (let i = 0; i < permutations.length; i += 1) {
            const perm = permutations[i];
            const nextArgs = getArgs.slice(0);
            for (let j = 0; j < getArgs.length; j += 1) {
                nextArgs[j] += perm[j];
            }
            stack.push({
                currentArgs: nextArgs,
                previousArgs: getArgs,
            });
        }
    }
    function get(getArgs) {
        return getter(...getArgs);
    }
    function prunedPermutations() {
        const permutations = permute(seed.length);
        return permutations.filter(function (perm) {
            const count = countNonZeroes(perm);
            return count !== 0 && (count === 1 || diagonals);
        });
    }
    function permute(length) {
        const perms = [];
        const permutation = function (string) {
            return string.split('').map(function (c) {
                return parseInt(c, 10) - 1;
            });
        };
        for (let i = 0; i < Math.pow(3, length); i += 1) {
            const string = lpad(i.toString(3), '0', length);
            perms.push(permutation(string));
        }
        return perms;
    }
    function boundaries() {
        const array = Array.from(bounds.values());
        array.reverse();
        return array;
    }
}
function defaultEquals(a, b) {
    return a === b;
}
function countNonZeroes(array) {
    let count = 0;
    for (let i = 0; i < array.length; i += 1) {
        if (array[i] !== 0) {
            count += 1;
        }
    }
    return count;
}
function lpad(string, character, length) {
    const array = new Array(length + 1);
    const pad = array.join(character);
    return (pad + string).slice(-length);
}
export default floodFill;
