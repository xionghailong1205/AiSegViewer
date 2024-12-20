export default function pointInSphere(sphere, pointLPS) {
    const { center, radius } = sphere;
    const radius2 = sphere.radius2 || radius * radius;
    return ((pointLPS[0] - center[0]) * (pointLPS[0] - center[0]) +
        (pointLPS[1] - center[1]) * (pointLPS[1] - center[1]) +
        (pointLPS[2] - center[2]) * (pointLPS[2] - center[2]) <=
        radius2);
}
