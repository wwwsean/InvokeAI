import type {
  ControlNetConfigV2,
  ImageWithDims,
  IPAdapterConfigV2,
  T2IAdapterConfigV2,
} from 'features/controlLayers/util/controlAdapters';
import type { AspectRatioState } from 'features/parameters/components/ImageSize/types';
import type {
  ParameterAutoNegative,
  ParameterHeight,
  ParameterNegativePrompt,
  ParameterNegativeStylePromptSDXL,
  ParameterPositivePrompt,
  ParameterPositiveStylePromptSDXL,
  ParameterWidth,
} from 'features/parameters/types/parameterSchemas';
import type { IRect } from 'konva/lib/types';
import type { RgbColor } from 'react-colorful';

export type DrawingTool = 'brush' | 'eraser';

export type Tool = DrawingTool | 'move' | 'rect';

export type VectorMaskLine = {
  id: string;
  type: 'vector_mask_line';
  tool: DrawingTool;
  strokeWidth: number;
  points: number[];
};

export type VectorMaskRect = {
  id: string;
  type: 'vector_mask_rect';
  x: number;
  y: number;
  width: number;
  height: number;
};

type LayerBase = {
  id: string;
  isEnabled: boolean;
};

type RenderableLayerBase = LayerBase & {
  x: number;
  y: number;
  bbox: IRect | null;
  bboxNeedsUpdate: boolean;
  isSelected: boolean;
};

export type ControlAdapterLayer = RenderableLayerBase & {
  type: 'control_adapter_layer'; // technically, also t2i adapter layer
  opacity: number;
  isFilterEnabled: boolean;
  controlAdapter: ControlNetConfigV2 | T2IAdapterConfigV2;
};

export type IPAdapterLayer = LayerBase & {
  type: 'ip_adapter_layer';
  ipAdapter: IPAdapterConfigV2;
};

export type RegionalGuidanceLayer = RenderableLayerBase & {
  type: 'regional_guidance_layer';
  maskObjects: (VectorMaskLine | VectorMaskRect)[];
  positivePrompt: ParameterPositivePrompt | null;
  negativePrompt: ParameterNegativePrompt | null; // Up to one text prompt per mask
  ipAdapters: IPAdapterConfigV2[]; // Any number of image prompts
  previewColor: RgbColor;
  autoNegative: ParameterAutoNegative;
  needsPixelBbox: boolean; // Needs the slower pixel-based bbox calculation - set to true when an there is an eraser object
  uploadedMaskImage: ImageWithDims | null;
};

export type InitialImageLayer = RenderableLayerBase & {
  type: 'initial_image_layer';
  opacity: number;
  image: ImageWithDims | null;
  denoisingStrength: number;
};

export type Layer = RegionalGuidanceLayer | ControlAdapterLayer | IPAdapterLayer | InitialImageLayer;

export type ControlLayersState = {
  _version: 2;
  selectedLayerId: string | null;
  layers: Layer[];
  brushSize: number;
  globalMaskLayerOpacity: number;
  positivePrompt: ParameterPositivePrompt;
  negativePrompt: ParameterNegativePrompt;
  positivePrompt2: ParameterPositiveStylePromptSDXL;
  negativePrompt2: ParameterNegativeStylePromptSDXL;
  shouldConcatPrompts: boolean;
  size: {
    width: ParameterWidth;
    height: ParameterHeight;
    aspectRatio: AspectRatioState;
  };
};
