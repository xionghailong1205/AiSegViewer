export function extractContourData(polyDataCache) {
    const rawResults = new Map();
    for (const [segmentIndex, intersectionInfo] of polyDataCache) {
        const segmentIndexNumber = Number(segmentIndex);
        for (const [_, result] of intersectionInfo) {
            if (!result) {
                continue;
            }
            if (!rawResults.has(segmentIndexNumber)) {
                rawResults.set(segmentIndexNumber, []);
            }
            rawResults.get(segmentIndexNumber).push(result);
        }
    }
    return rawResults;
}
