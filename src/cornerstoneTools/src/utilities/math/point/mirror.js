export default function mirror(mirrorPoint, staticPoint) {
    const [x1, y1] = mirrorPoint;
    const [x2, y2] = staticPoint;
    const newX = 2 * x2 - x1;
    const newY = 2 * y2 - y1;
    return [newX, newY];
}
