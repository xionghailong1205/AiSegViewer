function findNextLink(line, lines, contourPoints) {
    let index = -1;
    lines.forEach((cell, i) => {
        if (index >= 0) {
            return;
        }
        if (cell.a == line.b) {
            index = i;
        }
    });
    if (index >= 0) {
        const nextLine = lines[index];
        lines.splice(index, 1);
        contourPoints.push(nextLine.b);
        if (contourPoints[0] == nextLine.b) {
            return {
                remainingLines: lines,
                contourPoints,
                type: 'CLOSED_PLANAR',
            };
        }
        return findNextLink(nextLine, lines, contourPoints);
    }
    return {
        remainingLines: lines,
        contourPoints,
        type: 'OPEN_PLANAR',
    };
}
export function findContours(lines) {
    if (lines.length == 0) {
        return [];
    }
    const contourPoints = [];
    const firstCell = lines.shift();
    contourPoints.push(firstCell.a);
    contourPoints.push(firstCell.b);
    const result = findNextLink(firstCell, lines, contourPoints);
    if (result.remainingLines.length == 0) {
        return [
            {
                type: result.type,
                contourPoints: result.contourPoints,
            },
        ];
    }
    else {
        const extraContours = findContours(result.remainingLines);
        extraContours.push({
            type: result.type,
            contourPoints: result.contourPoints,
        });
        return extraContours;
    }
}
export function findContoursFromReducedSet(lines) {
    return findContours(lines);
}
export default {
    findContours,
    findContoursFromReducedSet,
};
