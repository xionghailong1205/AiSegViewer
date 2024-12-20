import { eventTarget, triggerEvent } from '@cornerstonejs/core';
import Events from '../../enums/Events';
import { getAnnotation } from './annotationState';
export default class AnnotationGroup {
    constructor() {
        this.annotationUIDs = new Set();
        this._isVisible = true;
        this.visibleFilter = this.unboundVisibleFilter.bind(this);
    }
    unboundVisibleFilter(uid) {
        return !this._isVisible || !this.annotationUIDs.has(uid);
    }
    has(uid) {
        return this.annotationUIDs.has(uid);
    }
    setVisible(isVisible = true, baseEvent, filter) {
        if (this._isVisible === isVisible) {
            return;
        }
        this._isVisible = isVisible;
        this.annotationUIDs.forEach((uid) => {
            const annotation = getAnnotation(uid);
            if (!annotation) {
                this.annotationUIDs.delete(uid);
                return;
            }
            if (annotation.isVisible === isVisible) {
                return;
            }
            if (!isVisible && filter?.(uid) === false) {
                return;
            }
            annotation.isVisible = isVisible;
            const eventDetail = {
                ...baseEvent,
                annotation,
            };
            triggerEvent(eventTarget, Events.ANNOTATION_MODIFIED, eventDetail);
        });
    }
    get isVisible() {
        return this._isVisible;
    }
    findNearby(uid, direction) {
        const uids = [...this.annotationUIDs];
        if (uids.length === 0) {
            return null;
        }
        if (!uid) {
            return uids[direction === 1 ? 0 : uids.length - 1];
        }
        const index = uids.indexOf(uid);
        if (index === -1 ||
            index + direction < 0 ||
            index + direction >= uids.length) {
            return null;
        }
        return uids[index + direction];
    }
    add(...annotationUIDs) {
        annotationUIDs.forEach((annotationUID) => this.annotationUIDs.add(annotationUID));
    }
    remove(...annotationUIDs) {
        annotationUIDs.forEach((annotationUID) => this.annotationUIDs.delete(annotationUID));
    }
    clear() {
        this.annotationUIDs.clear();
    }
}
