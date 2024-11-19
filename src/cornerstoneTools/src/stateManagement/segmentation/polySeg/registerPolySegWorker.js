import { getWebWorkerManager } from '@cornerstonejs/core';
let registered = false;
export function registerPolySegWorker() {
    if (registered) {
        return;
    }
    console.log("执行注册:", new URL('../../../workers/polySegConverters', import.meta.url));
    registered = true;
    const workerFn = () => {
        return new Worker(new URL('../../../workers/polySegConverters', import.meta.url), {
            name: 'polySeg',
            type: 'module',
        });
    };
    const workerManager = getWebWorkerManager();
    const options = {
        maxWorkerInstances: 1,
        autoTerminateOnIdle: {
            enabled: true,
            idleTimeThreshold: 2000,
        },
    };
    workerManager.registerWorker('polySeg', workerFn, options);
}
