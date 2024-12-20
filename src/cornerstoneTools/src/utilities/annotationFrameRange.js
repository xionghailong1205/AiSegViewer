import { triggerEvent, eventTarget } from '@cornerstonejs/core';
import Events from '../enums/Events';
export default class AnnotationFrameRange {
    static { this.frameRangeExtractor = /(\/frames\/|[&?]frameNumber=)([^/&?]*)/i; }
    static imageIdToFrames(imageId) {
        const match = imageId.match(this.frameRangeExtractor);
        if (!match || !match[2]) {
            return null;
        }
        const range = match[2].split('-').map((it) => Number(it));
        if (range.length === 1) {
            return range[0];
        }
        return range;
    }
    static framesToString(range) {
        if (Array.isArray(range)) {
            return `${range[0]}-${range[1]}`;
        }
        return String(range);
    }
    static framesToImageId(imageId, range) {
        const match = imageId.match(this.frameRangeExtractor);
        if (!match || !match[2]) {
            return null;
        }
        const newRangeString = this.framesToString(range);
        return imageId.replace(this.frameRangeExtractor, `${match[1]}${newRangeString}`);
    }
    static setFrameRange(annotation, range, eventBase) {
        const { referencedImageId } = annotation.metadata;
        annotation.metadata.referencedImageId = this.framesToImageId(referencedImageId, range);
        const eventDetail = {
            ...eventBase,
            annotation,
        };
        triggerEvent(eventTarget, Events.ANNOTATION_MODIFIED, eventDetail);
    }
    static getFrameRange(annotation) {
        return this.imageIdToFrames(annotation.metadata.referencedImageId);
    }
}
