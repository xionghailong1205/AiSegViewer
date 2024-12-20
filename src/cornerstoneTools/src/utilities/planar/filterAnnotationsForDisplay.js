import { StackViewport, VolumeViewport, utilities as csUtils, } from '@cornerstonejs/core';
import filterAnnotationsWithinSlice from './filterAnnotationsWithinSlice';
export default function filterAnnotationsForDisplay(viewport, annotations, filterOptions = {}) {
    if (viewport instanceof VolumeViewport) {
        const camera = viewport.getCamera();
        const { spacingInNormalDirection } = csUtils.getTargetVolumeAndSpacingInNormalDir(viewport, camera);
        return filterAnnotationsWithinSlice(annotations, camera, spacingInNormalDirection);
    }
    if (viewport instanceof StackViewport) {
        const imageId = viewport.getCurrentImageId();
        const colonIndex = imageId.indexOf(':');
        filterOptions.imageURI = imageId.substring(colonIndex + 1);
    }
    return annotations.filter((annotation) => {
        if (!annotation.isVisible) {
            return false;
        }
        if (annotation.data.isCanvasAnnotation) {
            return true;
        }
        return viewport.isReferenceViewable(annotation.metadata, filterOptions);
    });
}
