import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

// MARK: - Type definitions
export interface FoundationModelsPlugin {
  // Basic text generation
  generateText(options: { 
    prompt: string; 
    maxTokens?: number; 
    temperature?: number; 
  }): Promise<{ text: string }>;

  // Guided generation
  generateSummary(options: { prompt: string }): Promise<{ json: string }>;

  // Tool calling
  echo(options: { message: string }): Promise<{ reply: string }>;

  // Dynamic schema generation
  generateDynamic(options: { 
    prompt: string; 
    schema: string; 
  }): Promise<{ json: string }>;

  // Instructions-based generation
  generateWithInstructions(options: { 
    prompt: string; 
    instructions: string; 
  }): Promise<{ text: string }>;

  // Streaming generation
  generateStreaming(options: { prompt: string }): Promise<{ streamId: string }>;

  // Session management
  createSession(options: { instructions?: string }): Promise<{ sessionId: string }>;
  continueConversation(options: { 
    sessionId: string; 
    prompt: string; 
  }): Promise<{ text: string }>;

  // Performance optimization
  prewarmSession(): Promise<{ success: boolean }>;

  // Availability checking
  checkAvailability(): Promise<AvailabilityResult>;

  // Advanced generation with options
  generateWithOptions(options: GenerationOptions): Promise<{ text: string }>;

  // Event listeners
  addListener(eventName: 'streamingUpdate', listenerFunc: (data: StreamingChunk) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

export interface AvailabilityResult {
  available: boolean;
  status: 'available' | 'notEnabled' | 'notEligible' | 'notReady' | 'unavailable' | 'notSupported';
  reason: string;
}

export interface GenerationOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  includeSchemaInPrompt?: boolean;
  safetyLevel?: 'default' | 'strict' | 'permissive';
}

export interface StreamingChunk {
  chunk: string;
  callId: string;
}

export interface ConversationSession {
  sessionId: string;
  isActive: boolean;
  messageCount: number;
}

// MARK: - Error types
export class FoundationModelsError extends Error {
  public code?: string;
  public originalError?: Error;

  constructor(
    message: string,
    code?: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'FoundationModelsError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class AvailabilityError extends FoundationModelsError {
  public status: AvailabilityResult['status'];

  constructor(
    status: AvailabilityResult['status'],
    message: string
  ) {
    super(message, 'AVAILABILITY_ERROR');
    this.name = 'AvailabilityError';
    this.status = status;
  }
}

// MARK: - Plugin registration
const FoundationModels = registerPlugin<FoundationModelsPlugin>('FoundationModels');

// MARK: - Service class
export class FoundationModelsService {
  private static instance: FoundationModelsService;
  private activeSessions: Map<string, ConversationSession> = new Map();
  private streamingListeners: Map<string, (chunk: StreamingChunk) => void> = new Map();

  private constructor() {
    // Listen for streaming updates
    FoundationModels.addListener('streamingUpdate', (data: StreamingChunk) => {
      const listener = this.streamingListeners.get(data.callId);
      if (listener) {
        listener(data);
      }
    });
  }

  public static getInstance(): FoundationModelsService {
    if (!FoundationModelsService.instance) {
      FoundationModelsService.instance = new FoundationModelsService();
    }
    return FoundationModelsService.instance;
  }

  // MARK: - Availability checking
  async checkAvailability(): Promise<AvailabilityResult> {
    try {
      return await FoundationModels.checkAvailability();
    } catch (error) {
      throw new FoundationModelsError(
        'Failed to check availability',
        'AVAILABILITY_CHECK_FAILED',
        error as Error
      );
    }
  }

  async ensureAvailable(): Promise<void> {
    const availability = await this.checkAvailability();
    if (!availability.available) {
      throw new AvailabilityError(availability.status, availability.reason);
    }
  }

  // MARK: - Basic text generation
  async generateText(
    prompt: string, 
    options: { maxTokens?: number; temperature?: number } = {}
  ): Promise<string> {
    await this.ensureAvailable();

    try {
      const result = await FoundationModels.generateText({
        prompt,
        maxTokens: options.maxTokens ?? 1000,
        temperature: options.temperature ?? 0.7
      });
      return result.text;
    } catch (error) {
      throw new FoundationModelsError(
        'Text generation failed',
        'GENERATION_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Guided generation
  async generateSummary(prompt: string): Promise<any> {
    await this.ensureAvailable();

    try {
      const result = await FoundationModels.generateSummary({ prompt });
      return JSON.parse(result.json);
    } catch (error) {
      throw new FoundationModelsError(
        'Summary generation failed',
        'SUMMARY_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Tool calling
  async echo(message: string): Promise<string> {
    await this.ensureAvailable();

    try {
      const result = await FoundationModels.echo({ message });
      return result.reply;
    } catch (error) {
      throw new FoundationModelsError(
        'Echo failed',
        'ECHO_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Dynamic schema generation
  async generateWithSchema(prompt: string, schema: object): Promise<any> {
    await this.ensureAvailable();

    try {
      const schemaString = JSON.stringify(schema);
      const result = await FoundationModels.generateDynamic({ prompt, schema: schemaString });
      return JSON.parse(result.json);
    } catch (error) {
      throw new FoundationModelsError(
        'Schema-based generation failed',
        'SCHEMA_GENERATION_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Instructions-based generation
  async generateWithInstructions(prompt: string, instructions: string): Promise<string> {
    await this.ensureAvailable();

    try {
      const result = await FoundationModels.generateWithInstructions({ prompt, instructions });
      return result.text;
    } catch (error) {
      throw new FoundationModelsError(
        'Instruction-based generation failed',
        'INSTRUCTION_GENERATION_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Streaming generation
  async generateStreaming(
    prompt: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    await this.ensureAvailable();

    try {
      const result = await FoundationModels.generateStreaming({ prompt });
      const streamId = result.streamId;

      // Set up listener for this stream
      this.streamingListeners.set(streamId, (data: StreamingChunk) => {
        onChunk(data.chunk);
      });

      return streamId;
    } catch (error) {
      throw new FoundationModelsError(
        'Streaming generation failed',
        'STREAMING_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Session management for conversations
  async createConversationSession(instructions?: string): Promise<ConversationSession> {
    await this.ensureAvailable();

    try {
      const result = await FoundationModels.createSession({ instructions });
      const session: ConversationSession = {
        sessionId: result.sessionId,
        isActive: true,
        messageCount: 0
      };
      
      this.activeSessions.set(result.sessionId, session);
      return session;
    } catch (error) {
      throw new FoundationModelsError(
        'Session creation failed',
        'SESSION_CREATION_FAILED',
        error as Error
      );
    }
  }

  async continueConversation(sessionId: string, prompt: string): Promise<string> {
    await this.ensureAvailable();

    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      throw new FoundationModelsError(
        'Session not found or inactive',
        'SESSION_NOT_FOUND'
      );
    }

    try {
      const result = await FoundationModels.continueConversation({ sessionId, prompt });
      
      // Update session
      session.messageCount++;
      this.activeSessions.set(sessionId, session);
      
      return result.text;
    } catch (error) {
      throw new FoundationModelsError(
        'Conversation continuation failed',
        'CONVERSATION_FAILED',
        error as Error
      );
    }
  }

  async endConversationSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
    }
  }

  getActiveSessionIds(): string[] {
    return Array.from(this.activeSessions.keys()).filter(id => 
      this.activeSessions.get(id)?.isActive
    );
  }

  // MARK: - Performance optimization
  async prewarmSession(): Promise<void> {
    try {
      await FoundationModels.prewarmSession();
    } catch (error) {
      throw new FoundationModelsError(
        'Prewarming failed',
        'PREWARM_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Advanced generation with options
  async generateWithOptions(options: GenerationOptions): Promise<string> {
    await this.ensureAvailable();

    try {
      const result = await FoundationModels.generateWithOptions(options);
      return result.text;
    } catch (error) {
      throw new FoundationModelsError(
        'Advanced generation failed',
        'ADVANCED_GENERATION_FAILED',
        error as Error
      );
    }
  }

  // MARK: - Utility methods
  async isSupported(): Promise<boolean> {
    try {
      const availability = await this.checkAvailability();
      return availability.available;
    } catch {
      return false;
    }
  }

  async getDeviceCapabilities(): Promise<{
    supportsFoundationModels: boolean;
    appleIntelligenceEnabled: boolean;
    modelReady: boolean;
    deviceEligible: boolean;
  }> {
    try {
      const availability = await this.checkAvailability();
      
      return {
        supportsFoundationModels: availability.available,
        appleIntelligenceEnabled: availability.status !== 'notEnabled',
        modelReady: availability.status !== 'notReady',
        deviceEligible: availability.status !== 'notEligible'
      };
    } catch {
      return {
        supportsFoundationModels: false,
        appleIntelligenceEnabled: false,
        modelReady: false,
        deviceEligible: false
      };
    }
  }

  // MARK: - Cleanup
  cleanup(): void {
    // End all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      this.endConversationSession(sessionId);
    }
    
    // Clear streaming listeners
    this.streamingListeners.clear();
  }
}

// MARK: - Convenience functions
export const foundationModels = FoundationModelsService.getInstance();

// Export individual functions for easier usage
export const generateText = (prompt: string, options?: { maxTokens?: number; temperature?: number }) => 
  foundationModels.generateText(prompt, options);

export const generateSummary = (prompt: string) => 
  foundationModels.generateSummary(prompt);

export const echo = (message: string) => 
  foundationModels.echo(message);

export const generateWithSchema = (prompt: string, schema: object) => 
  foundationModels.generateWithSchema(prompt, schema);

export const generateWithInstructions = (prompt: string, instructions: string) => 
  foundationModels.generateWithInstructions(prompt, instructions);

export const generateStreaming = (prompt: string, onChunk: (chunk: string) => void) => 
  foundationModels.generateStreaming(prompt, onChunk);

export const createConversationSession = (instructions?: string) => 
  foundationModels.createConversationSession(instructions);

export const continueConversation = (sessionId: string, prompt: string) => 
  foundationModels.continueConversation(sessionId, prompt);

export const checkAvailability = () => 
  foundationModels.checkAvailability();

export const isSupported = () => 
  foundationModels.isSupported();

export const prewarmSession = () => 
  foundationModels.prewarmSession();

export default foundationModels; 