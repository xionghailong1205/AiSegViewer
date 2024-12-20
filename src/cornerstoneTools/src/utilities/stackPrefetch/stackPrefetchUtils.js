import { getEnabledElement, StackViewport, Enums } from '@cornerstonejs/core';
import { getToolState } from './state';
export const requestType = Enums.RequestType.Prefetch;
export const priority = 0;
export function range(lowEnd, highEnd) {
    lowEnd = Math.round(lowEnd) || 0;
    highEnd = Math.round(highEnd) || 0;
    const arr = [];
    let c = highEnd - lowEnd + 1;
    if (c <= 0) {
        return arr;
    }
    while (c--) {
        arr[c] = highEnd--;
    }
    return arr;
}
export function nearestIndex(arr, x) {
    let low = 0;
    let high = arr.length - 1;
    arr.forEach((v, idx) => {
        if (v < x) {
            low = Math.max(idx, low);
        }
        else if (v > x) {
            high = Math.min(idx, high);
        }
    });
    return { low, high };
}
export function getStackData(element) {
    const enabledElement = getEnabledElement(element);
    if (!enabledElement) {
        return null;
    }
    const { viewport } = enabledElement;
    if (!(viewport instanceof StackViewport)) {
        return null;
    }
    return {
        currentImageIdIndex: viewport.getCurrentImageIdIndex(),
        imageIds: viewport.getImageIds(),
    };
}
export function getPromiseRemovedHandler(element) {
    return function (e) {
        const eventData = e.detail;
        let stackData;
        try {
            stackData = getStackData(element);
        }
        catch (error) {
            return;
        }
        if (!stackData || !stackData.imageIds || stackData.imageIds.length === 0) {
            return;
        }
        const stack = stackData;
        const imageIdIndex = stack.imageIds.indexOf(eventData.imageId);
        if (imageIdIndex < 0) {
            return;
        }
        const stackPrefetchData = getToolState(element);
        if (!stackPrefetchData ||
            !stackPrefetchData.indicesToRequest ||
            !stackPrefetchData.indicesToRequest.length) {
            return;
        }
        stackPrefetchData.indicesToRequest.push(imageIdIndex);
    };
}
export const clearFromImageIds = (stack) => {
    const imageIdSet = new Set(stack.imageIds);
    return (requestDetails) => requestDetails.type !== requestType ||
        !imageIdSet.has(requestDetails.additionalDetails.imageId);
};
