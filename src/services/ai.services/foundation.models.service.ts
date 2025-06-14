import { registerPlugin } from '@capacitor/core';

export interface GenerateTextOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateTextResult {
  text: string;
}

export interface FoundationModelsPlugin {
  /**
   * Generate text using Apple's on-device Foundation Models.
   * @param options generation parameters
   */
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
}

/**
 * The FoundationModels Capacitor plugin instance.
 */
const FoundationModels = registerPlugin<FoundationModelsPlugin>('FoundationModels');

export default FoundationModels; 