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

  /** Guided generation – summary result as JSON string */
  generateSummary(options: { prompt: string }): Promise<{ json: string }>;

  /** Tool calling echo */
  echo(options: { message: string }): Promise<{ reply: string }>;

  /** Dynamic schema generation */
  generateDynamic(options: { prompt: string; schema: string }): Promise<{ json: string }>;
}

/**
 * The FoundationModels Capacitor plugin instance.
 */
const FoundationModels = registerPlugin<FoundationModelsPlugin>('FoundationModels');

export default FoundationModels; 