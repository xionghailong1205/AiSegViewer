import getViewportsForAnnotation from './getViewportsForAnnotation';
export default function getViewportForAnnotation(annotation) {
    const viewports = getViewportsForAnnotation(annotation);
    return viewports.length ? viewports[0] : undefined;
}
