import { createSynchronizer } from '../../store/SynchronizerManager';
import { Enums } from '@cornerstonejs/core';
import imageSliceSyncCallback from '../callbacks/imageSliceSyncCallback';
const { STACK_NEW_IMAGE, VOLUME_NEW_IMAGE } = Enums.Events;
export default function createImageSliceSynchronizer(synchronizerName) {
    const stackImageSynchronizer = createSynchronizer(synchronizerName, STACK_NEW_IMAGE, imageSliceSyncCallback, {
        auxiliaryEvents: [
            {
                name: 'VOLUME_NEW_IMAGE',
            },
        ],
    });
    return stackImageSynchronizer;
}
