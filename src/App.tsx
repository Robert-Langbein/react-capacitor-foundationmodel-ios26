import React, { useState, useEffect, useRef } from 'react';
import './App.css';
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
  const [activeTab, setActiveTab] = useState<'basic' | 'conversation' | 'debug'>('basic');
  
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
      setActiveTab('conversation');
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

  // Render functions
  const renderAvailabilityStatus = () => {
    if (!availability) return null;

    const statusColors = {
      available: '#4CAF50',
      notEnabled: '#FF9800',
      notEligible: '#F44336',
      notReady: '#2196F3',
      unavailable: '#9E9E9E',
      notSupported: '#9E9E9E'
    };

    return (
      <div className="availability-status" style={{ 
        backgroundColor: statusColors[availability.status],
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <h3>Status: {availability.status}</h3>
        <p>{availability.reason}</p>
        {availability.status === 'notEnabled' && (
          <p><strong>→</strong> Enable Apple Intelligence in Settings</p>
        )}
        {availability.status === 'notReady' && (
          <p><strong>→</strong> Wait for model download</p>
        )}
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;

    const errorColors = {
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    };

    return (
      <div className="error-message" style={{
        backgroundColor: errorColors[error.type],
        color: 'white',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <div>
          <strong>{error.type.toUpperCase()}:</strong> {error.message}
          {error.code && <span> ({error.code})</span>}
        </div>
        <button onClick={clearError} style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          ✕
        </button>
      </div>
    );
  };

  const renderTabNavigation = () => (
    <div style={{
      display: 'flex',
      marginBottom: '15px',
      background: 'white',
      borderRadius: '8px',
      padding: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {[
        { key: 'basic', label: '🧪 Features' },
        { key: 'conversation', label: '💬 Chat' },
        { key: 'debug', label: '🔧 Debug' }
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as any)}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '6px',
            background: activeTab === tab.key ? '#3498db' : 'transparent',
            color: activeTab === tab.key ? 'white' : '#666',
            fontWeight: activeTab === tab.key ? '600' : '400',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderBasicFeatures = () => (
    <>
      {/* Global Controls */}
      <section>
        <h2>Settings</h2>
        <div className="control-group">
          <label>
            Temperature: {temperature.toFixed(1)}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
          </label>
          <label>
            Max Tokens: {maxTokens}
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            />
          </label>
        </div>
      </section>

      {/* Input Section */}
      <section>
        <h2>Input</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          rows={3}
        />
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instructions (optional)..."
          rows={2}
          style={{ marginTop: '10px' }}
        />
      </section>

      {/* Features */}
      <section>
        <h2>AI Features</h2>
        <div className="feature-grid">
          
          {/* Text Generation */}
          <div className="feature-card">
            <h3>📝 Text Generation</h3>
            <button 
              onClick={handleGenerateText}
              disabled={loading.text || !availability?.available}
            >
              {loading.text ? 'Generating...' : 'Generate Text'}
            </button>
            {results.text && (
              <div className="result">
                <h4>Result:</h4>
                <p>{results.text}</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="feature-card">
            <h3>📋 Summary</h3>
            <button 
              onClick={handleGenerateSummary}
              disabled={loading.summary || !availability?.available}
            >
              {loading.summary ? 'Summarizing...' : 'Summarize'}
            </button>
            {results.summary && (
              <div className="result">
                <h4>Summary:</h4>
                <pre>{JSON.stringify(results.summary, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Echo Tool */}
          <div className="feature-card">
            <h3>🔄 Echo Tool</h3>
            <button 
              onClick={handleEcho}
              disabled={loading.echo || !availability?.available}
            >
              {loading.echo ? 'Echoing...' : 'Echo'}
            </button>
            {results.echo && (
              <div className="result">
                <h4>Echo:</h4>
                <p>{results.echo}</p>
              </div>
            )}
          </div>

          {/* Schema Generation */}
          <div className="feature-card">
            <h3>🏗️ Structured Output</h3>
            <button 
              onClick={handleGenerateWithSchema}
              disabled={loading.schema || !availability?.available}
            >
              {loading.schema ? 'Generating...' : 'Generate Schema'}
            </button>
            {results.schema && (
              <div className="result">
                <h4>Structured:</h4>
                <pre>{JSON.stringify(results.schema, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="feature-card">
            <h3>📋 With Instructions</h3>
            <button 
              onClick={handleGenerateWithInstructions}
              disabled={loading.instructions || !availability?.available}
            >
              {loading.instructions ? 'Generating...' : 'Use Instructions'}
            </button>
            {results.instructions && (
              <div className="result">
                <h4>Result:</h4>
                <p>{results.instructions}</p>
              </div>
            )}
          </div>

          {/* Streaming */}
          <div className="feature-card">
            <h3>📡 Streaming</h3>
            <div className="streaming-controls">
              <button 
                onClick={handleGenerateStreaming}
                disabled={streamingState.isStreaming || !availability?.available}
              >
                {streamingState.isStreaming ? 'Streaming...' : 'Start Stream'}
              </button>
              {streamingState.isStreaming && (
                <button onClick={stopStreaming}>Stop</button>
              )}
            </div>
            {streamingState.content && (
              <div className="result streaming-result" ref={streamingContentRef}>
                <h4>Stream:</h4>
                <div className="streaming-content">
                  {streamingState.content}
                  {streamingState.isStreaming && <span className="cursor">|</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );

  const renderConversation = () => (
    <section>
      <h2>💬 Conversation</h2>
      
      {!conversationSession ? (
        <div>
          <p>Start a multi-turn conversation with the AI.</p>
          <button 
            onClick={startConversation}
            disabled={loading.conversation || !availability?.available}
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          >
            {loading.conversation ? 'Starting...' : 'Start Conversation'}
          </button>
        </div>
      ) : (
        <div className="active-conversation">
          <div className="conversation-info">
            <span>Session: {conversationSession.sessionId.slice(0, 8)}...</span>
            <span>Messages: {conversationSession.messageCount}</span>
            <button onClick={endConversation}>End</button>
          </div>
          
          <div className="message-controls">
            <button 
              onClick={sendMessage}
              disabled={loading.message || !prompt.trim()}
            >
              {loading.message ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </div>
      )}

      {conversationHistory.length > 0 && (
        <div className="conversation-history">
          <h4>History:</h4>
          <div className="messages">
            {conversationHistory.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role}`}
              >
                <div className="message-header">
                  <strong>{message.role === 'user' ? 'You' : 'AI'}</strong>
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
                <div className="message-content">{message.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );

  const renderDebug = () => (
    <section className="debug-section">
      <h2>🔧 Debug Info</h2>
      <div className="debug-info">
        <h4>Availability:</h4>
        <pre>{JSON.stringify(availability, null, 2)}</pre>
        
        <h4>Active Sessions:</h4>
        <p>{foundationModels.getActiveSessionIds().join(', ') || 'None'}</p>
        
        <h4>Results Cache:</h4>
        <pre>{JSON.stringify(Object.keys(results), null, 2)}</pre>
        
        <button onClick={checkAvailability}>Refresh Status</button>
      </div>
    </section>
  );

  return (
    <div className="App">
      <header className="App-header">
        <h1>🤖 Foundation Models</h1>
        <p>Apple AI on your device</p>
      </header>

      <main className="App-main">
        {renderAvailabilityStatus()}
        {renderError()}
        {renderTabNavigation()}

        {activeTab === 'basic' && renderBasicFeatures()}
        {activeTab === 'conversation' && renderConversation()}
        {activeTab === 'debug' && renderDebug()}
      </main>
    </div>
  );
};

export default App;
