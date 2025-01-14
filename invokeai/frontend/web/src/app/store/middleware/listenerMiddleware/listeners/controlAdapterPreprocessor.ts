import { isAnyOf } from '@reduxjs/toolkit';
import { logger } from 'app/logging/logger';
import type { AppStartListening } from 'app/store/middleware/listenerMiddleware';
import { parseify } from 'common/util/serialize';
import {
  caLayerImageChanged,
  caLayerIsProcessingImageChanged,
  caLayerModelChanged,
  caLayerProcessedImageChanged,
  caLayerProcessorConfigChanged,
  isControlAdapterLayer,
} from 'features/controlLayers/store/controlLayersSlice';
import { CA_PROCESSOR_DATA } from 'features/controlLayers/util/controlAdapters';
import { isImageOutput } from 'features/nodes/types/common';
import { addToast } from 'features/system/store/systemSlice';
import { t } from 'i18next';
import { isEqual } from 'lodash-es';
import { imagesApi } from 'services/api/endpoints/images';
import { queueApi } from 'services/api/endpoints/queue';
import type { BatchConfig, ImageDTO } from 'services/api/types';
import { socketInvocationComplete } from 'services/events/actions';

const matcher = isAnyOf(caLayerImageChanged, caLayerProcessorConfigChanged, caLayerModelChanged);

const DEBOUNCE_MS = 300;
const log = logger('session');

export const addControlAdapterPreprocessor = (startAppListening: AppStartListening) => {
  startAppListening({
    matcher,
    effect: async (action, { dispatch, getState, getOriginalState, cancelActiveListeners, delay, take }) => {
      const { layerId } = action.payload;
      const precheckLayerOriginal = getOriginalState()
        .controlLayers.present.layers.filter(isControlAdapterLayer)
        .find((l) => l.id === layerId);
      const precheckLayer = getState()
        .controlLayers.present.layers.filter(isControlAdapterLayer)
        .find((l) => l.id === layerId);

      // Conditions to bail
      const layerDoesNotExist = !precheckLayer;
      const layerHasNoImage = !precheckLayer?.controlAdapter.image;
      const layerHasNoProcessorConfig = !precheckLayer?.controlAdapter.processorConfig;
      const layerIsAlreadyProcessingImage = precheckLayer?.controlAdapter.isProcessingImage;
      const areImageAndProcessorUnchanged =
        isEqual(precheckLayer?.controlAdapter.image, precheckLayerOriginal?.controlAdapter.image) &&
        isEqual(precheckLayer?.controlAdapter.processorConfig, precheckLayerOriginal?.controlAdapter.processorConfig);

      if (
        layerDoesNotExist ||
        layerHasNoImage ||
        layerHasNoProcessorConfig ||
        areImageAndProcessorUnchanged ||
        layerIsAlreadyProcessingImage
      ) {
        return;
      }

      // Cancel any in-progress instances of this listener
      cancelActiveListeners();
      log.trace('Control Layer CA auto-process triggered');

      // Delay before starting actual work
      await delay(DEBOUNCE_MS);
      dispatch(caLayerIsProcessingImageChanged({ layerId, isProcessingImage: true }));

      // Double-check that we are still eligible for processing
      const state = getState();
      const layer = state.controlLayers.present.layers.filter(isControlAdapterLayer).find((l) => l.id === layerId);
      const image = layer?.controlAdapter.image;
      const config = layer?.controlAdapter.processorConfig;

      // If we have no image or there is no processor config, bail
      if (!layer || !image || !config) {
        return;
      }

      // @ts-expect-error: TS isn't able to narrow the typing of buildNode and `config` will error...
      const processorNode = CA_PROCESSOR_DATA[config.type].buildNode(image, config);
      const enqueueBatchArg: BatchConfig = {
        prepend: true,
        batch: {
          graph: {
            nodes: {
              [processorNode.id]: { ...processorNode, is_intermediate: true },
            },
            edges: [],
          },
          runs: 1,
        },
      };

      try {
        const req = dispatch(
          queueApi.endpoints.enqueueBatch.initiate(enqueueBatchArg, {
            fixedCacheKey: 'enqueueBatch',
          })
        );
        const enqueueResult = await req.unwrap();
        req.reset();
        log.debug({ enqueueResult: parseify(enqueueResult) }, t('queue.graphQueued'));

        const [invocationCompleteAction] = await take(
          (action): action is ReturnType<typeof socketInvocationComplete> =>
            socketInvocationComplete.match(action) &&
            action.payload.data.queue_batch_id === enqueueResult.batch.batch_id &&
            action.payload.data.source_node_id === processorNode.id
        );

        // We still have to check the output type
        if (isImageOutput(invocationCompleteAction.payload.data.result)) {
          const { image_name } = invocationCompleteAction.payload.data.result.image;

          // Wait for the ImageDTO to be received
          const [{ payload }] = await take(
            (action) =>
              imagesApi.endpoints.getImageDTO.matchFulfilled(action) && action.payload.image_name === image_name
          );

          const imageDTO = payload as ImageDTO;

          log.debug({ layerId, imageDTO }, 'ControlNet image processed');

          // Update the processed image in the store
          dispatch(
            caLayerProcessedImageChanged({
              layerId,
              imageDTO,
            })
          );
          dispatch(caLayerIsProcessingImageChanged({ layerId, isProcessingImage: false }));
        }
      } catch (error) {
        console.log(error);
        log.error({ enqueueBatchArg: parseify(enqueueBatchArg) }, t('queue.graphFailedToQueue'));
        dispatch(caLayerIsProcessingImageChanged({ layerId, isProcessingImage: false }));

        if (error instanceof Object) {
          if ('data' in error && 'status' in error) {
            if (error.status === 403) {
              dispatch(caLayerImageChanged({ layerId, imageDTO: null }));
              return;
            }
          }
        }

        dispatch(
          addToast({
            title: t('queue.graphFailedToQueue'),
            status: 'error',
          })
        );
      }
    },
  });
};
