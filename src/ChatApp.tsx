import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faRobot,
  faUser,
  faCog,
  faTrash,
  faBars,
  faTimes,
  faStop,
  faDownload,
  faWrench,
  faCode,
  faComments,
  faMagic,
} from '@fortawesome/free-solid-svg-icons';

import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { cn } from './lib/utils';
import SettingsPanel from './components/SettingsPanel';
import ToolManager from './components/ToolManager';

import { 
  foundationModels, 

  type AvailabilityResult,
  type ConversationSession 
} from './services/foundation.models.service';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  scenario?: ChatScenario;
  metadata?: any;
}

interface Settings {
  temperature: number;
  maxTokens: number;
  enableStreaming: boolean;
  enableInstructions: boolean;
}

type ChatScenario = 
  | 'basic' 
  | 'conversation' 
  | 'structured' 
  | 'tools' 
  | 'summary';

interface ScenarioConfig {
  id: ChatScenario;
  name: string;
  description: string;
  icon: any;
  color: string;
}

const scenarios: ScenarioConfig[] = [
  {
    id: 'basic',
    name: 'Basic Chat',
    description: 'Simple text generation',
    icon: faComments,
    color: 'bg-blue-600'
  },
  {
    id: 'conversation',
    name: 'Conversation',
    description: 'Persistent conversation',
    icon: faRobot,
    color: 'bg-purple-600'
  },
  {
    id: 'structured',
    name: 'Structured Output',
    description: 'JSON Schema Output',
    icon: faCode,
    color: 'bg-orange-600'
  },
  {
    id: 'tools',
    name: 'Tool Calling',
    description: 'Function calls',
    icon: faWrench,
    color: 'bg-red-600'
  },
  {
    id: 'summary',
    name: 'Summary',
    description: 'Text summarization',
    icon: faMagic,
    color: 'bg-yellow-600'
  }
];

const ChatApp: React.FC = () => {
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<ChatScenario>('basic');
  
  // Settings
  const [settings, setSettings] = useState<Settings>({
    temperature: 0.7,
    maxTokens: 1000,
    enableStreaming: true,
    enableInstructions: false
  });
  
  // Foundation Models state
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [conversationSession, setConversationSession] = useState<ConversationSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Tool calling state
  const [registeredTools, setRegisteredTools] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  
  // Structured output state
  const [jsonSchema, setJsonSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "answer": {"type": "string"}\n  }\n}');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize
  useEffect(() => {
    checkAvailability();
    prewarmIfAvailable();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const checkAvailability = async () => {
    try {
      const result = await foundationModels.checkAvailability();
      setAvailability(result);
      if (!result.available) {
        setError('Foundation Models are not available on this device');
      }
    } catch (err) {
      setError('Failed to check availability');
      console.error(err);
    }
  };

  const prewarmIfAvailable = async () => {
    try {
      if (availability?.available) {
        await foundationModels.prewarmSession();
      }
    } catch (err) {
      console.error('Prewarming failed:', err);
    }
  };

  const startConversation = async (): Promise<ConversationSession | null> => {
    try {
      const session = await foundationModels.createConversationSession(
        settings.enableInstructions ? instructions : undefined
      );
      setConversationSession(session);
      return session;
    } catch (err) {
      setError('Failed to start conversation');
      console.error(err);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      scenario: currentScenario
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      let response: string;
      let metadata: any = {};

      if (settings.enableStreaming) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
          scenario: currentScenario
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsStreaming(true);
        setStreamingContent('');

        // Retrieve full response (reusing non-streaming logic later)
        let fullResponse = '';
        let streamMetadata: any = {};

        const getFullResponse = async (): Promise<void> => {
          switch (currentScenario) {
            case 'basic': {
              if (settings.enableInstructions && instructions.trim()) {
                fullResponse = await foundationModels.generateWithInstructions(
                  userMessage.content,
                  instructions
                );
                streamMetadata = { instructions };
              } else {
                fullResponse = await foundationModels.generateText(userMessage.content, {
                  temperature: settings.temperature,
                  maxTokens: settings.maxTokens
                });
              }
              break;
            }
            case 'conversation': {
              let activeSession = conversationSession;
              if (!activeSession) {
                activeSession = await startConversation();
              }
              if (!activeSession) throw new Error('Failed to create conversation session');

              fullResponse = await foundationModels.continueConversation(
                activeSession.sessionId,
                userMessage.content
              );
              streamMetadata = { conversation: true };
              break;
            }
            case 'structured': {
              const schema = JSON.parse(jsonSchema);
              const result = await foundationModels.generateWithSchema(userMessage.content, schema);
              fullResponse = JSON.stringify(result, null, 2);
              streamMetadata = { schema, structured: true };
              break;
            }
            case 'tools': {
              if (registeredTools.length === 0) {
                throw new Error('No tools selected. Please select tools in the settings.');
              }
              // Pass user prompt directly; Foundation Models will decide when to invoke tools
              fullResponse = await foundationModels.generateText(userMessage.content, {
                temperature: settings.temperature,
                maxTokens: settings.maxTokens
              });
              streamMetadata = { tools: registeredTools };
              break;
            }
            case 'summary': {
              try {
                const sum = await foundationModels.generateSummary(userMessage.content);
                fullResponse = JSON.stringify(sum, null, 2);
              } catch (err) {
                // Fallback to instruction-based summary if built-in summary fails
                fullResponse = await foundationModels.generateWithInstructions(
                  `Please provide a concise summary of the following text:\n\n${userMessage.content}`,
                  ''
                );
              }
              streamMetadata = { summary: true };
              break;
            }
          }
        };

        await getFullResponse();

        // Simulate streaming by progressively revealing text
        let currentText = '';
        for (let i = 0; i < fullResponse.length; i++) {
          currentText += fullResponse[i];
          setStreamingContent(currentText);
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessage.id ? { ...msg, content: currentText } : msg
          ));
          await new Promise(res => setTimeout(res, 20));
        }

        setMessages(prev => prev.map(msg =>
          msg.id === assistantMessage.id ? { ...msg, content: fullResponse, isStreaming: false, metadata: streamMetadata } : msg
        ));
        setIsStreaming(false);
        setStreamingContent('');
        setIsLoading(false);
        return;
      }

      // Non-streaming responses
      switch (currentScenario) {
        case 'basic':
          if (settings.enableInstructions && instructions.trim()) {
            response = await foundationModels.generateWithInstructions(
              userMessage.content,
              instructions
            );
            metadata = { instructions };
          } else {
            response = await foundationModels.generateText(
              userMessage.content,
              {
                temperature: settings.temperature,
                maxTokens: settings.maxTokens
              }
            );
          }
          break;

        case 'conversation':
          let session = conversationSession;
          if (!session) {
            session = await startConversation();
          }
          if (session) {
            if (settings.enableInstructions && instructions.trim()) {
              // For conversation with instructions, we use generateWithInstructions
              response = await foundationModels.generateWithInstructions(
                userMessage.content,
                instructions
              );
              metadata = { conversation: true, instructions };
            } else {
              response = await foundationModels.continueConversation(
                session.sessionId,
                userMessage.content
              );
              metadata = { conversation: true };
            }
          } else {
            throw new Error('Failed to create conversation session');
          }
          break;

        case 'structured':
          try {
            const schema = JSON.parse(jsonSchema);
            if (settings.enableInstructions && instructions.trim()) {
              // For structured output with instructions, we use generateWithInstructions and mention the schema
              response = await foundationModels.generateWithInstructions(
                `${userMessage.content}\n\nPlease respond according to this JSON schema: ${jsonSchema}`,
                instructions
              );
              metadata = { schema, structured: true, instructions };
            } else {
              const result = await foundationModels.generateWithSchema(
                userMessage.content,
                schema
              );
              response = JSON.stringify(result, null, 2);
              metadata = { schema, structured: true };
            }
          } catch (parseError) {
            throw new Error('Invalid JSON schema');
          }
          break;

        case 'tools':
          if (registeredTools.length === 0) {
            throw new Error('No tools selected. Please select tools in the settings.');
          }
          if (settings.enableInstructions && instructions.trim()) {
            response = await foundationModels.generateWithInstructions(
              userMessage.content,
              instructions
            );
            metadata = { tools: registeredTools, instructions };
          } else {
            response = await foundationModels.generateText(
              userMessage.content,
              {
                temperature: settings.temperature,
                maxTokens: settings.maxTokens
              }
            );
            metadata = { tools: registeredTools };
          }
          break;

        case 'summary':
          if (settings.enableInstructions && instructions.trim()) {
            response = await foundationModels.generateWithInstructions(
              `Please summarize the following text: ${userMessage.content}`,
              instructions
            );
            metadata = { summary: true, instructions };
          } else {
            const summaryResult = await foundationModels.generateSummary(userMessage.content);
            response = JSON.stringify(summaryResult, null, 2);
            metadata = { summary: true };
          }
          break;

        default:
          response = await foundationModels.generateText(userMessage.content);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        scenario: currentScenario,
        metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const stopStreaming = () => {
    if (isStreaming) {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStreamingContent('');
    setError(null);
    if (conversationSession) {
      foundationModels.endConversationSession(conversationSession.sessionId);
      setConversationSession(null);
    }
  };

  const exportChat = () => {
    const chatData = {
      messages,
      settings,
      scenario: currentScenario,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${currentScenario}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentScenarioConfig = scenarios.find(s => s.id === currentScenario)!;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-black/20 backdrop-blur-xl border-r border-white/10"
            >
              <div className="p-6  pt-20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Chat Scenarios</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSidebar(false)}
                    className="text-white hover:bg-white/10"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </Button>
                </div>
                
                <div className="space-y-3 mb-6 ">
                  {scenarios.map((scenario) => (
                    <motion.button
                      key={scenario.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCurrentScenario(scenario.id);
                        setShowSidebar(false);
                        clearChat();
                      }}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all duration-200",
                        currentScenario === scenario.id
                          ? "bg-white/20 border border-white/30"
                          : "bg-white/5 hover:bg-white/10 border border-white/10"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", scenario.color)}>
                          <FontAwesomeIcon icon={scenario.icon} className="text-white text-sm" />
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">{scenario.name}</div>
                          <div className="text-white/60 text-xs">{scenario.description}</div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="space-y-2 border-t border-white/10 pt-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-white border-white/20 hover:bg-white/10"
                    onClick={clearChat}
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                    Clear Chat
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-white border-white/20 hover:bg-white/10"
                    onClick={exportChat}
                  >
                    <FontAwesomeIcon icon={faDownload} className="mr-2" />
                    Export Chat
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col ">
        {/* Header */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-black/20 backdrop-blur-xl border-b border-white/10 p-4  pt-20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(true)}
                className="text-white hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faBars} />
              </Button>
              <div className="flex items-center space-x-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", currentScenarioConfig.color)}>
                  <FontAwesomeIcon icon={currentScenarioConfig.icon} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{currentScenarioConfig.name}</h1>
                  <p className="text-sm text-white/60">{currentScenarioConfig.description}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {availability && (
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  availability.available 
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                )}>
                  {availability.available ? 'Available' : 'Unavailable'}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:bg-white/10"
              >
                <FontAwesomeIcon icon={faCog} />
              </Button>
            </div>
          </div>
        </motion.header>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-black/20 backdrop-blur-xl border-b border-white/10 overflow-hidden"
            >
              <SettingsPanel
                settings={settings}
                instructions={instructions}
                onSettingsChange={setSettings}
                onInstructionsChange={setInstructions}
                currentScenario={currentScenario}
                jsonSchema={jsonSchema}
                onJsonSchemaChange={setJsonSchema}
                toolManagerComponent={currentScenario === 'tools' ? (
                  <ToolManager
                    selectedTools={selectedTools}
                    onToolSelectionChange={setSelectedTools}
                    onToolsRegistered={setRegisteredTools}
                  />
                ) : undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-500/20 border border-red-500/30 text-red-400 p-4 m-4 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setError(null)}
                  className="text-red-400 hover:bg-red-500/20"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div className={cn(
                  "max-w-[80%] rounded-2xl p-4 backdrop-blur-sm",
                  message.role === 'user'
                    ? 'bg-purple-600/80 text-white ml-12'
                    : 'bg-white/10 text-white mr-12 border border-white/20'
                )}>
                  <div className="flex items-start space-x-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0",
                      message.role === 'user'
                        ? 'bg-purple-500'
                        : 'bg-white/20'
                    )}>
                      <FontAwesomeIcon 
                        icon={message.role === 'user' ? faUser : faRobot} 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm opacity-70">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        {message.scenario && (
                          <div className="text-xs opacity-50">
                            {scenarios.find(s => s.id === message.scenario)?.name}
                          </div>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {message.isStreaming ? streamingContent : message.content}
                        {message.isStreaming && (
                          <motion.span
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="inline-block w-2 h-4 bg-white/60 ml-1"
                          />
                        )}
                      </div>
                      {message.metadata && (
                        <div className="mt-2 text-xs opacity-60">
                          {message.metadata.structured && "📊 Structured Output"}
                          {message.metadata.summary && "📝 Summary"}
                          {message.metadata.tools && `🔧 Tools: ${message.metadata.tools.length}`}
                          {message.metadata.instructions && "📋 With Instructions"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-black/20 backdrop-blur-xl border-t border-white/10 p-4 pb-10"
        >
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <Textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type your message for ${currentScenarioConfig.name}...`}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
                rows={1}
              />
            </div>
            <div className="flex space-x-2">
              {isStreaming && (
                <Button
                  onClick={stopStreaming}
                  variant="outline"
                  size="icon"
                  className="text-red-400 border-red-400/30 hover:bg-red-500/20"
                >
                  <FontAwesomeIcon icon={faStop} />
                </Button>
              )}
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading || !availability?.available}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="icon"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FontAwesomeIcon icon={faRobot} />
                  </motion.div>
                ) : (
                  <FontAwesomeIcon icon={faPaperPlane} />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChatApp; 