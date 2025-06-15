# Apple Foundation Models with Capacitor

A comprehensive reference implementation for integrating Apple's Foundation Models (Apple Intelligence) with Capacitor. This repository serves as the definitive guide for developers looking to leverage Apple's on-device AI capabilities in hybrid mobile applications with a modern, production-ready chat interface.

![Apple Intelligence](https://img.shields.io/badge/Apple%20Intelligence-Available-blue?logo=apple)
![Capacitor](https://img.shields.io/badge/Capacitor-7.3.0-blue?logo=capacitor)
![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?logo=typescript)
![ShadCN UI](https://img.shields.io/badge/ShadCN%20UI-Latest-black?logo=shadcnui)

## 🎯 Overview

Apple Foundation Models represent Apple's approach to on-device AI processing, providing developers with powerful language model capabilities while maintaining user privacy. This project demonstrates how to integrate these capabilities into Capacitor applications with a **modern, production-ready chat interface** featuring:

### 🚀 Core Features
- **Complete Native Integration**: Full iOS implementation with Swift
- **Modern Chat Interface**: Beautiful glassmorphism UI with real-time streaming
- **Tool Calling System**: Extensible function calling with bidirectional communication
- **Multiple Chat Scenarios**: Basic chat, conversations, structured output, summarization, and tool calling
- **Type-Safe TypeScript API**: Comprehensive service layer with proper error handling
- **Real-Time Streaming**: Character-by-character streaming with visual feedback
- **Session Management**: Persistent conversation sessions with history
- **ShadCN UI Components**: Modern, accessible UI components with Tailwind CSS

### 🎨 User Interface Features
- **Glassmorphism Design**: Modern translucent interface with gradient backgrounds
- **Responsive Layout**: Optimized for all iOS device sizes
- **Sidebar Navigation**: Easy switching between different AI scenarios
- **Settings Panel**: Real-time adjustment of AI parameters (temperature, tokens, streaming)
- **Message History**: Persistent chat history with export functionality
- **Auto-scroll**: Smooth scrolling to latest messages
- **Tool Management**: Visual tool registration and execution status
- **Error Handling**: Graceful error display with recovery suggestions

## ☕ Support This Project

If this project has been helpful to you, consider buying me a coffee! Your support helps maintain and improve this reference implementation.

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-orange?style=for-the-badge&logo=buy-me-a-coffee)](https://www.paypal.com/paypalme/RLangbein/5)

## 🚀 Quick Start

### Prerequisites

- **Xcode 26.0+** with latest iOS SDK
- **iOS 26.0+** target device or simulator
- **Apple Intelligence enabled** on target device
- **Node.js 18+** and npm
- **Capacitor CLI 7.3.0+**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Robert-Langbein/react-capacitor-foundationmodel-ios26.git
   cd react-capacitor-foundationmodel-ios26
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the web app**
   ```bash
   npm run build
   ```

4. **Sync with iOS**
   ```bash
   npm run sync
   ```

5. **Open in Xcode**
   ```bash
   npm run xcode
   ```

6. **Configure iOS project**
   - Set your development team
   - Configure bundle identifier
   - Ensure iOS deployment target is 26.0+
   - Build and run on device with Apple Intelligence enabled

## 📱 Device Requirements

### Essential Requirements
- **iOS 26.0+**: Foundation Models require iOS 26 or later
- **Apple Intelligence**: Must be enabled in Settings > Apple Intelligence & Siri
- **Compatible Device**: iPhone 15 Pro/Pro Max or newer (as of current requirements)
- **Language Settings**: Device language must support Apple Intelligence

### Availability States
The app automatically detects and handles different availability states:
- `available`: Ready to use Foundation Models
- `notEnabled`: Apple Intelligence disabled in settings
- `notEligible`: Device doesn't support Apple Intelligence
- `notReady`: System is still preparing models
- `unavailable`: Temporary unavailability
- `notSupported`: iOS version or device incompatible

## 🏗️ Architecture

### Project Structure

```
ai-capacitor/
├── src/
│   ├── services/
│   │   └── foundation.models.service.ts    # Main service layer
│   ├── components/
│   │   ├── ui/                            # ShadCN UI components
│   │   ├── ChatApp.tsx                    # Main chat interface
│   │   ├── SettingsPanel.tsx              # Settings management
│   │   └── ToolManager.tsx                # Tool system management
│   ├── hooks/
│   │   ├── useStreamingText.ts            # Streaming text hook
│   │   └── useRegisterTool.ts             # Tool registration hook
│   ├── lib/
│   │   └── utils.ts                       # Utility functions
│   └── styles.css                         # Global styles with glassmorphism
├── ios/
│   └── App/
│       └── App/
│           └── FoundationModelsPlugin.swift # Native iOS implementation
└── public/                                # Static assets
```

### Core Components

1. **FoundationModelsPlugin.swift**: Native iOS implementation with tool calling support
2. **foundation.models.service.ts**: TypeScript service layer with streaming and tool APIs
3. **ChatApp.tsx**: Modern chat interface with multiple scenarios
4. **ToolManager.tsx**: Tool registration and execution system
5. **ShadCN UI Components**: Reusable, accessible UI components

## 🎯 Chat Scenarios

The application includes five distinct chat scenarios, each demonstrating different Foundation Models capabilities:

### 1. 💬 Basic Chat
Simple text generation with streaming support
- Real-time character-by-character streaming
- Adjustable temperature and token limits
- System instructions support

### 2. 🔄 Conversation
Persistent conversation sessions with memory
- Session-based chat with conversation history
- Context preservation across messages
- Session management (create/continue/end)

### 3. 📋 Structured Output
JSON generation with schema validation
- Predefined JSON schemas for structured responses
- Schema validation and error handling
- Perfect for data extraction and formatting

### 4. 🔧 Tool Calling
Function calling with bidirectional communication
- **DateTime Tool**: Get current date/time in German format
- **Calculator Tool**: Perform safe mathematical calculations
- **Random Fact Tool**: Generate scientific facts
- Visual tool registration status
- Real-time tool execution feedback

### 5. 📝 Summary
Text summarization capabilities
- Intelligent text summarization
- Configurable summary length and style
- Optimized for various content types

## 🛠️ Tool System

### Built-in Tools

#### DateTime Tool
```typescript
// Provides current date and time in German format
{
  name: "get_datetime",
  description: "Get the current date and time",
  parameters: { type: "object", properties: {} }
}
```

#### Calculator Tool
```typescript
// Safe mathematical calculations
{
  name: "calculate",
  description: "Perform mathematical calculations",
  parameters: {
    type: "object",
    properties: {
      expression: { type: "string", description: "Mathematical expression" }
    }
  }
}
```

#### Random Fact Tool
```typescript
// Generate scientific facts
{
  name: "random_fact",
  description: "Get a random scientific fact",
  parameters: {
    type: "object",
    properties: {
      category: { type: "string", description: "Fact category" }
    }
  }
}
```

### Tool Registration
Tools are automatically registered when the Tool Calling scenario is selected:

```typescript
// Tools are registered via the useRegisterTool hook
const { registeredTools } = useRegisterTool();

// Visual feedback shows registration status
// Tools can be enabled/disabled via checkboxes
```

## 🔧 API Reference

### Basic Text Generation

```typescript
import { foundationModels } from './services/foundation.models.service';

// Simple text generation with streaming
const result = await foundationModels.generateText(
  "Write a haiku about programming",
  { maxTokens: 100, temperature: 0.7 }
);
```

### Real-Time Streaming

```typescript
// Character-by-character streaming
await foundationModels.streamResponse(
  "Tell me a story",
  (chunk) => {
    console.log('Received chunk:', chunk);
    // Update UI with streaming content
  },
  { temperature: 0.8, maxTokens: 500 }
);
```

### Structured Output with Schema

```typescript
// Generate JSON with specific structure
const schema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    tags: { type: "array", items: { type: "string" } }
  }
};

const result = await foundationModels.generateWithSchema(
  "Analyze this article: [content]",
  schema
);
```

### Conversation Sessions

```typescript
// Create conversation session
const session = await foundationModels.createConversationSession(
  "You are a helpful coding assistant"
);

// Continue conversation
const response = await foundationModels.continueConversation(
  session.sessionId,
  "How do I implement async/await in JavaScript?"
);

// End session when done
await foundationModels.endConversationSession(session.sessionId);
```

### Tool Calling

```typescript
// Register a tool
await foundationModels.registerTool({
  name: "weather",
  description: "Get weather information",
  parameters: {
    type: "object",
    properties: {
      location: { type: "string", description: "City name" }
    }
  }
});

// Generate with tool calling enabled
const response = await foundationModels.generateWithInstructions(
  "What's the weather in Paris?",
  "You can use tools to help answer questions."
);
```

### System Instructions

```typescript
// Generate with system instructions
const response = await foundationModels.generateWithInstructions(
  "Explain quantum computing",
  "You are a physics professor. Explain concepts clearly and use analogies."
);
```

## 🎨 UI Components

### ShadCN UI Integration
The project uses ShadCN UI components for a modern, accessible interface:

- **Button**: Various styles and sizes with proper accessibility
- **Card**: Content containers with glassmorphism effects
- **Input/Textarea**: Form inputs with validation states
- **Slider**: Range inputs for temperature and token controls
- **Switch**: Toggle controls for settings

### Styling System
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: Dynamic theming support
- **Glassmorphism**: Modern translucent design elements
- **Responsive Design**: Mobile-first approach
- **Dark Mode Ready**: Prepared for dark mode implementation

## ⚡ Performance Optimization

### Streaming Implementation
```typescript
// Unified streaming simulation for consistent UX
const simulateStreaming = (text: string, onChunk: (chunk: string) => void) => {
  let index = 0;
  const interval = setInterval(() => {
    if (index < text.length) {
      onChunk(text.slice(0, index + 1));
      index++;
    } else {
      clearInterval(interval);
    }
  }, 20); // 20ms delay for smooth streaming
};
```

### Resource Management
- Automatic session cleanup
- Memory-efficient streaming
- Background processing support
- Battery usage optimization
- Tool registration caching

### Best Practices
1. **Check availability before use**: Always verify Foundation Models are available
2. **Handle errors gracefully**: Provide fallback experiences
3. **Use appropriate parameters**: Optimize temperature and token limits
4. **Manage sessions**: Clean up conversation sessions when done
5. **Tool management**: Register tools only when needed
6. **Respect user privacy**: Foundation Models process on-device only

## 🔒 Privacy & Security

Apple Foundation Models prioritize user privacy through:

- **On-Device Processing**: All AI computation happens locally
- **No Data Transmission**: User content never leaves the device
- **Encrypted Storage**: Model data stored securely
- **User Control**: Users can disable Apple Intelligence anytime
- **Tool Sandboxing**: Tools execute in controlled environment

## 🐛 Troubleshooting

### Common Issues

**"Foundation Models not available"**
- Ensure iOS 26.0+ and compatible device
- Check Apple Intelligence is enabled in Settings
- Verify device language is supported
- Restart device if models are still loading

**Tool calling errors**
- Verify tools are properly registered before use
- Check tool parameter schemas match expected format
- Ensure tool execution doesn't timeout
- Monitor console for tool registration status

**Streaming issues**
- Check network connectivity for initial model loading
- Verify streaming is enabled in settings
- Monitor console for streaming errors
- Try disabling/re-enabling streaming

**Build errors in Xcode**
- Clean build folder (⌘+Shift+K)
- Check iOS deployment target is 26.0+
- Verify development team is set
- Update to latest Xcode version

**UI rendering issues**
- Clear browser cache and reload
- Check for CSS conflicts
- Verify Tailwind CSS is properly configured
- Test on different device sizes

## 📚 Examples

### Complete Chat Integration
```typescript
import { ChatApp } from './components/ChatApp';

// The main chat interface handles all scenarios
function App() {
  return <ChatApp />;
}
```

### Custom Tool Implementation
```typescript
// Example custom tool
const customTool = {
  name: "translate",
  description: "Translate text to different languages",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "Text to translate" },
      language: { type: "string", description: "Target language" }
    },
    required: ["text", "language"]
  }
};

// Register and handle tool
await foundationModels.registerTool(customTool);
```

### Advanced Streaming Usage
```typescript
// Custom streaming with progress tracking
const useAdvancedStreaming = () => {
  const [progress, setProgress] = useState(0);
  const [content, setContent] = useState('');

  const streamWithProgress = async (prompt: string) => {
    let totalLength = 0;
    
    await foundationModels.streamResponse(
      prompt,
      (chunk) => {
        setContent(chunk);
        setProgress((chunk.length / totalLength) * 100);
      }
    );
  };

  return { streamWithProgress, progress, content };
};
```

## 🛠️ Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build web application for production |
| `npm run sync` | Sync web app with native platforms |
| `npm run ios` | Build and run on iOS device/simulator |
| `npm run xcode` | Open iOS project in Xcode |
| `npm run lint` | Run ESLint for code quality |

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing TypeScript and Swift coding conventions
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure iOS compatibility across supported devices
- Test all chat scenarios and tool integrations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Resources

- [Apple Intelligence Documentation](https://developer.apple.com/apple-intelligence/)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [ShadCN UI Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [iOS 26 Foundation Models](https://developer.apple.com/wwdc24/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/ai-capacitor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ai-capacitor/discussions)
- **Apple Developer Forums**: [AI & ML Forum](https://developer.apple.com/forums/tags/ai-and-ml)

---

**Note**: Apple Foundation Models and Apple Intelligence are rapidly evolving technologies. This implementation is based on current APIs and may require updates as Apple releases new versions. Always refer to the latest Apple documentation for the most current information.

**Latest Updates**: This version includes a complete modern chat interface, tool calling system, multiple AI scenarios, ShadCN UI components, and comprehensive streaming support. The application is production-ready and demonstrates best practices for Foundation Models integration.
