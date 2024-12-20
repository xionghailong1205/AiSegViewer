export class BucketQueue {
    constructor({ numBits, getPriority, areEqual, }) {
        this._bucketCount = 1 << numBits;
        this._mask = this._bucketCount - 1;
        this._size = 0;
        this._currentBucketIndex = 0;
        this._buckets = this._buildArray(this._bucketCount);
        this._getPriority =
            typeof getPriority !== 'undefined'
                ? getPriority
                : (item) => item;
        this._areEqual =
            typeof areEqual === 'function'
                ? areEqual
                : (itemA, itemB) => itemA === itemB;
    }
    push(item) {
        const bucketIndex = this._getBucketIndex(item);
        const oldHead = this._buckets[bucketIndex];
        const newHead = {
            value: item,
            next: oldHead,
        };
        this._buckets[bucketIndex] = newHead;
        this._size++;
    }
    pop() {
        if (this._size === 0) {
            throw new Error('Cannot pop because the queue is empty.');
        }
        while (this._buckets[this._currentBucketIndex] === null) {
            this._currentBucketIndex =
                (this._currentBucketIndex + 1) % this._bucketCount;
        }
        const ret = this._buckets[this._currentBucketIndex];
        this._buckets[this._currentBucketIndex] = ret.next;
        this._size--;
        return ret.value;
    }
    remove(item) {
        if (!item) {
            return false;
        }
        const bucketIndex = this._getBucketIndex(item);
        const firstBucketNode = this._buckets[bucketIndex];
        let node = firstBucketNode;
        let prevNode;
        while (node !== null) {
            if (this._areEqual(item, node.value)) {
                break;
            }
            prevNode = node;
            node = node.next;
        }
        if (node === null) {
            return false;
        }
        if (node === firstBucketNode) {
            this._buckets[bucketIndex] = node.next;
        }
        else {
            prevNode.next = node.next;
        }
        this._size--;
        return true;
    }
    isEmpty() {
        return this._size === 0;
    }
    _getBucketIndex(item) {
        return this._getPriority(item) & this._mask;
    }
    _buildArray(size) {
        const buckets = new Array(size);
        buckets.fill(null);
        return buckets;
    }
}
