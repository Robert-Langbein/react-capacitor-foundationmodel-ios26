import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { 
  foundationModels, 
  FoundationModelsError, 
  AvailabilityError,
  type AvailabilityResult,
  type ConversationSession 
} from './services/foundation.models.service';

interface ErrorState {
  message: string;
  code?: string;
  type: 'error' | 'warning' | 'info';
}

interface StreamingState {
  isStreaming: boolean;
  content: string;
  streamId?: string;
}

const App: React.FC = () => {
  // State management
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [activeView, setActiveView] = useState<'features' | 'conversation' | 'settings'>('features');
  
  // Input states
  const [prompt, setPrompt] = useState('');
  const [instructions, setInstructions] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  
  // Results states
  const [results, setResults] = useState<{ [key: string]: any }>({});
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    content: ''
  });
  
  // Conversation states
  const [conversationSession, setConversationSession] = useState<ConversationSession | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  
  // Refs
  const streamingContentRef = useRef<HTMLDivElement>(null);

  // Initialize and check availability
  useEffect(() => {
    checkAvailability();
    prewarmIfAvailable();
  }, []);

  // Auto-scroll streaming content
  useEffect(() => {
    if (streamingContentRef.current) {
      streamingContentRef.current.scrollTop = streamingContentRef.current.scrollHeight;
    }
  }, [streamingState.content]);

  // Utility functions
  const setLoadingState = (key: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const setResult = (key: string, value: any) => {
    setResults(prev => ({ ...prev, [key]: value }));
  };

  const handleError = (error: unknown, context: string) => {
    console.error(`Error in ${context}:`, error);
    
    if (error instanceof AvailabilityError) {
      setError({
        message: `${error.message}`,
        code: error.status,
        type: 'warning'
      });
    } else if (error instanceof FoundationModelsError) {
      setError({
        message: `${context}: ${error.message}`,
        code: error.code,
        type: 'error'
      });
    } else {
      setError({
        message: `${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  const clearError = () => setError(null);

  // Core functions
  const checkAvailability = async () => {
    try {
      const result = await foundationModels.checkAvailability();
      setAvailability(result);
      
      if (!result.available) {
        setError({
          message: result.reason,
          code: result.status,
          type: result.status === 'notEnabled' ? 'warning' : 'info'
        });
      }
    } catch (error) {
      handleError(error, 'Availability Check');
    }
  };

  const prewarmIfAvailable = async () => {
    try {
      if (await foundationModels.isSupported()) {
        await foundationModels.prewarmSession();
        console.log('Session prewarmed successfully');
      }
    } catch (error) {
      console.warn('Prewarming failed:', error);
    }
  };

  // Generic feature handler
  const handleFeature = async (
    featureKey: string,
    featureName: string,
    handler: () => Promise<any>
  ) => {
    if (!prompt.trim() && featureKey !== 'prewarm') {
      setError({ message: 'Please enter a prompt', type: 'warning' });
      return;
    }

    setLoadingState(featureKey, true);
    clearError();
    
    try {
      const result = await handler();
      setResult(featureKey, result);
    } catch (error) {
      handleError(error, featureName);
    } finally {
      setLoadingState(featureKey, false);
    }
  };

  // Feature functions
  const handleGenerateText = () => handleFeature('text', 'Text Generation', () =>
    foundationModels.generateText(prompt, { maxTokens, temperature })
  );

  const handleGenerateSummary = () => handleFeature('summary', 'Summary Generation', () =>
    foundationModels.generateSummary(`Please summarize: ${prompt}`)
  );

  const handleEcho = () => handleFeature('echo', 'Echo Tool', () =>
    foundationModels.echo(prompt)
  );

  const handleGenerateWithSchema = () => handleFeature('schema', 'Schema Generation', () => {
    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        confidence: { type: "number" }
      }
    };
    return foundationModels.generateWithSchema(prompt, schema);
  });

  const handleGenerateWithInstructions = () => {
    if (!instructions.trim()) {
      setError({ message: 'Please enter instructions', type: 'warning' });
      return;
    }
    handleFeature('instructions', 'Instruction-based Generation', () =>
      foundationModels.generateWithInstructions(prompt, instructions)
    );
  };

  const handleGenerateStreaming = async () => {
    if (!prompt.trim()) {
      setError({ message: 'Please enter a prompt for streaming', type: 'warning' });
      return;
    }

    setStreamingState({ isStreaming: true, content: '', streamId: undefined });
    clearError();
    
    try {
      console.log('Starting streaming in React...');
      const streamId = await foundationModels.generateStreaming(prompt, (chunk) => {
        console.log('React received chunk:', chunk);
        
        // Handle completion signals
        if (chunk === '[STREAM_COMPLETE]') {
          console.log('Stream completed in React');
          setStreamingState(prev => ({ ...prev, isStreaming: false }));
          return;
        }
        
        if (chunk === '[STREAM_ERROR]') {
          console.log('Stream error in React');
          setStreamingState(prev => ({ ...prev, isStreaming: false }));
          setError({ message: 'Streaming encountered an error', type: 'error' });
          return;
        }
        
        // Add normal chunks to content
        setStreamingState(prev => ({
          ...prev,
          content: prev.content + chunk
        }));
      });
      
      console.log('React got streamId:', streamId);
      setStreamingState(prev => ({ ...prev, streamId }));
      
      // Auto-stop streaming after a reasonable timeout (30 seconds)
      setTimeout(() => {
        setStreamingState(prev => {
          if (prev.isStreaming) {
            console.log('Auto-stopping streaming due to timeout');
            return { ...prev, isStreaming: false };
          }
          return prev;
        });
      }, 30000);
      
    } catch (error) {
      console.error('Streaming error in React:', error);
      handleError(error, 'Streaming Generation');
      setStreamingState({ isStreaming: false, content: '' });
    }
  };

  const stopStreaming = () => {
    console.log('Manually stopping streaming');
    setStreamingState(prev => ({ 
      ...prev, 
      isStreaming: false 
    }));
    
    // Clean up any listeners if we have a streamId
    if (streamingState.streamId) {
      // The service will clean up listeners automatically on completion signals
      console.log('Stopped streaming for streamId:', streamingState.streamId);
    }
  };

  // Conversation functions
  const startConversation = async () => {
    setLoadingState('conversation', true);
    clearError();
    
    try {
      const session = await foundationModels.createConversationSession(
        instructions.trim() || undefined
      );
      setConversationSession(session);
      setConversationHistory([]);
      setActiveView('conversation');
    } catch (error) {
      handleError(error, 'Conversation Start');
    } finally {
      setLoadingState('conversation', false);
    }
  };

  const sendMessage = async () => {
    if (!prompt.trim() || !conversationSession) {
      setError({ message: 'Please enter a message and start a conversation', type: 'warning' });
      return;
    }

    const userMessage = {
      role: 'user' as const,
      content: prompt,
      timestamp: new Date()
    };

    setConversationHistory(prev => [...prev, userMessage]);
    setLoadingState('message', true);
    clearError();
    
    try {
      const response = await foundationModels.continueConversation(
        conversationSession.sessionId,
        prompt
      );
      
      const assistantMessage = {
        role: 'assistant' as const,
        content: response,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, assistantMessage]);
      setPrompt(''); // Clear input after sending
    } catch (error) {
      handleError(error, 'Message Send');
    } finally {
      setLoadingState('message', false);
    }
  };

  const endConversation = async () => {
    if (conversationSession) {
      await foundationModels.endConversationSession(conversationSession.sessionId);
      setConversationSession(null);
      setConversationHistory([]);
    }
  };

  // Status indicator component
  const StatusIndicator = () => {
    if (!availability) return null;

    const statusConfig = {
      available: { 
        color: 'bg-emerald-500', 
        icon: '✓', 
        text: 'Ready',
        gradient: 'from-emerald-400 to-emerald-600'
      },
      notEnabled: { 
        color: 'bg-amber-500', 
        icon: '⚠', 
        text: 'Enable AI',
        gradient: 'from-amber-400 to-amber-600'
      },
      notEligible: { 
        color: 'bg-red-500', 
        icon: '✗', 
        text: 'Not Eligible',
        gradient: 'from-red-400 to-red-600'
      },
      notReady: { 
        color: 'bg-blue-500', 
        icon: '⏳', 
        text: 'Downloading',
        gradient: 'from-blue-400 to-blue-600'
      },
      unavailable: { 
        color: 'bg-gray-500', 
        icon: '○', 
        text: 'Unavailable',
        gradient: 'from-gray-400 to-gray-600'
      },
      notSupported: { 
        color: 'bg-gray-500', 
        icon: '○', 
        text: 'Not Supported',
        gradient: 'from-gray-400 to-gray-600'
      }
    };

    const config = statusConfig[availability.status];

    return (
      <div className="glass-effect rounded-2xl p-4 mb-6 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${config.color} animate-pulse`}></div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{config.icon}</span>
              <span className="font-semibold text-white">{config.text}</span>
            </div>
            <p className="text-sm text-white/70 mt-1">{availability.reason}</p>
          </div>
        </div>
      </div>
    );
  };

  // Error display component
  const ErrorDisplay = () => {
    if (!error) return null;

    const errorConfig = {
      error: { bg: 'from-red-500/20 to-red-600/20', border: 'border-red-500/30', icon: '⚠️' },
      warning: { bg: 'from-amber-500/20 to-amber-600/20', border: 'border-amber-500/30', icon: '⚠️' },
      info: { bg: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/30', icon: 'ℹ️' }
    };

    const config = errorConfig[error.type];

    return (
      <div className={`glass-effect bg-gradient-to-r ${config.bg} border ${config.border} rounded-2xl p-4 mb-6 animate-slide-up`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{config.icon}</span>
          <div className="flex-1">
            <p className="text-white font-medium">{error.message}</p>
            {error.code && <p className="text-white/60 text-sm mt-1">Code: {error.code}</p>}
          </div>
          <button 
            onClick={clearError}
            className="text-white/60 hover:text-white transition-colors p-1"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  // Navigation component
  const Navigation = () => {
    const navItems = [
      { id: 'features', label: 'AI Features', icon: '🤖' },
      { id: 'conversation', label: 'Chat', icon: '💬' },
      { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    return (
      <div className="glass-effect rounded-2xl p-2 mb-6">
        <div className="flex gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                activeView === item.id
                  ? 'luxury-gradient text-white shadow-floating'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Input section component
  const InputSection = () => (
    <div className="glass-effect rounded-2xl p-6 mb-6 animate-slide-up">
      <h3 className="text-xl font-bold text-white mb-4 text-shadow-luxury">Input</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-white/80 text-sm font-medium mb-2">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            className="w-full h-24 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none backdrop-blur-sm"
          />
        </div>
        {activeView === 'features' && (
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">Instructions (Optional)</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Additional instructions..."
              className="w-full h-20 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none backdrop-blur-sm"
            />
          </div>
        )}
      </div>
    </div>
  );

  // Feature card component
  const FeatureCard = ({ 
    title, 
    icon, 
    description, 
    onClick, 
    loading: isLoading, 
    result, 
    disabled 
  }: {
    title: string;
    icon: string;
    description: string;
    onClick: () => void;
    loading: boolean;
    result?: any;
    disabled?: boolean;
  }) => (
    <div className="glass-effect rounded-2xl p-6 animate-slide-up hover:shadow-floating transition-all duration-300">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-lg font-bold text-white text-shadow-luxury">{title}</h3>
      </div>
      <p className="text-white/70 text-sm mb-4">{description}</p>
      <button
        onClick={onClick}
        disabled={isLoading || disabled}
        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
          disabled
            ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
            : isLoading
            ? 'luxury-gradient text-white animate-pulse'
            : 'luxury-gradient text-white hover:shadow-floating hover:scale-105 active:scale-95'
        }`}
      >
        {isLoading ? 'Processing...' : 'Generate'}
      </button>
      {result && (
        <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/10">
          <h4 className="text-white font-medium mb-2">Result:</h4>
          <div className="text-white/80 text-sm">
            {typeof result === 'string' ? (
              <p className="whitespace-pre-wrap">{result}</p>
            ) : (
              <pre className="overflow-x-auto text-xs">{JSON.stringify(result, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Features view
  const FeaturesView = () => {
    const features = [
      {
        title: 'Text Generation',
        icon: '✨',
        description: 'Generate creative and coherent text content',
        key: 'text',
        handler: handleGenerateText
      },
      {
        title: 'Smart Summary',
        icon: '📋',
        description: 'Create intelligent summaries of your content',
        key: 'summary',
        handler: handleGenerateSummary
      },
      {
        title: 'Echo Tool',
        icon: '🔄',
        description: 'Test the AI response system',
        key: 'echo',
        handler: handleEcho
      },
      {
        title: 'Structured Output',
        icon: '🏗️',
        description: 'Generate content with specific schema',
        key: 'schema',
        handler: handleGenerateWithSchema
      },
      {
        title: 'With Instructions',
        icon: '📝',
        description: 'Generate content following specific instructions',
        key: 'instructions',
        handler: handleGenerateWithInstructions
      },
      {
        title: 'Live Streaming',
        icon: '📡',
        description: 'Real-time content generation',
        key: 'streaming',
        handler: handleGenerateStreaming
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => (
          <FeatureCard
            key={feature.key}
            title={feature.title}
            icon={feature.icon}
            description={feature.description}
            onClick={feature.handler}
            loading={loading[feature.key] || false}
            result={results[feature.key]}
            disabled={!availability?.available}
          />
        ))}
        
        {/* Special streaming card */}
        {streamingState.content && (
          <div className="md:col-span-2 lg:col-span-3 glass-effect rounded-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white text-shadow-luxury">🌊 Live Stream</h3>
              {streamingState.isStreaming && (
                <button
                  onClick={stopStreaming}
                  className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
            <div 
              ref={streamingContentRef}
              className="max-h-64 overflow-y-auto p-4 bg-black/20 rounded-xl border border-white/10"
            >
              <div className="text-white/90 whitespace-pre-wrap font-mono text-sm">
                {streamingState.content}
                {streamingState.isStreaming && (
                  <span className="inline-block w-2 h-5 bg-primary-400 ml-1 animate-pulse"></span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Conversation view
  const ConversationView = () => (
    <div className="space-y-6">
      {!conversationSession ? (
        <div className="glass-effect rounded-2xl p-8 text-center animate-slide-up">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-2xl font-bold text-white mb-4 text-shadow-luxury">Start a Conversation</h3>
          <p className="text-white/70 mb-6">Begin a multi-turn conversation with Apple Intelligence</p>
          <button
            onClick={startConversation}
            disabled={loading.conversation || !availability?.available}
            className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
              loading.conversation
                ? 'luxury-gradient text-white animate-pulse'
                : 'luxury-gradient text-white hover:shadow-floating hover:scale-105 active:scale-95'
            }`}
          >
            {loading.conversation ? 'Starting...' : 'Start Conversation'}
          </button>
        </div>
      ) : (
        <>
          {/* Session info */}
          <div className="glass-effect rounded-2xl p-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white font-medium">Active Session</span>
                <span className="text-white/60 text-sm">
                  {conversationSession.messageCount} messages
                </span>
              </div>
              <button
                onClick={endConversation}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors text-sm"
              >
                End
              </button>
            </div>
          </div>

          {/* Message input */}
          <div className="glass-effect rounded-2xl p-4 animate-slide-up">
            <button
              onClick={sendMessage}
              disabled={loading.message || !prompt.trim()}
              className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                loading.message
                  ? 'luxury-gradient text-white animate-pulse'
                  : 'luxury-gradient text-white hover:shadow-floating hover:scale-105 active:scale-95'
              }`}
            >
              {loading.message ? 'Sending...' : 'Send Message'}
            </button>
          </div>

          {/* Conversation history */}
          {conversationHistory.length > 0 && (
            <div className="glass-effect rounded-2xl p-6 animate-slide-up">
              <h3 className="text-lg font-bold text-white mb-4 text-shadow-luxury">Conversation</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {conversationHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'luxury-gradient text-white'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">
                          {message.role === 'user' ? 'You' : 'AI'}
                        </span>
                        <span className="text-xs opacity-60">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Settings view
  const SettingsView = () => (
    <div className="space-y-6">
      <div className="glass-effect rounded-2xl p-6 animate-slide-up">
        <h3 className="text-xl font-bold text-white mb-6 text-shadow-luxury">AI Parameters</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              Temperature: {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
          </div>
          
          <div>
            <label className="block text-white/80 text-sm font-medium mb-3">
              Max Tokens: {maxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>Short</span>
              <span>Long</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-2xl p-6 animate-slide-up">
        <h3 className="text-xl font-bold text-white mb-4 text-shadow-luxury">System Status</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white/80">Active Sessions</span>
            <span className="text-white font-mono">
              {foundationModels.getActiveSessionIds().length}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/80">Cached Results</span>
            <span className="text-white font-mono">
              {Object.keys(results).length}
            </span>
          </div>
          <button
            onClick={checkAvailability}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors border border-white/20"
          >
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 font-body">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 luxury-gradient rounded-2xl flex items-center justify-center animate-float">
              <span className="text-2xl">🤖</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white text-shadow-luxury font-display">
              Foundation Models
            </h1>
          </div>
          <p className="text-white/70 text-lg">
            Apple Intelligence on your device
          </p>
        </header>

        {/* Status and Error Display */}
        <StatusIndicator />
        <ErrorDisplay />

        {/* Navigation */}
        <Navigation />

        {/* Input Section */}
        <InputSection />

        {/* Main Content */}
        <main>
          {activeView === 'features' && <FeaturesView />}
          {activeView === 'conversation' && <ConversationView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default App;
