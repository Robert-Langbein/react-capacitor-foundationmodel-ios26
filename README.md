# Apple Foundation Models with Capacitor

A comprehensive reference implementation for integrating Apple's Foundation Models (Apple Intelligence) with Capacitor. This repository serves as the definitive guide for developers looking to leverage Apple's on-device AI capabilities in hybrid mobile applications.

![Apple Intelligence](https://img.shields.io/badge/Apple%20Intelligence-Available-blue?logo=apple)
![Capacitor](https://img.shields.io/badge/Capacitor-7.3.0-blue?logo=capacitor)
![React](https://img.shields.io/badge/React-19.1.0-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?logo=typescript)

## 🎯 Overview

Apple Foundation Models represent Apple's approach to on-device AI processing, providing developers with powerful language model capabilities while maintaining user privacy. This project demonstrates how to integrate these capabilities into Capacitor applications, offering:

- **Complete Native Integration**: Full iOS implementation with Swift
- **Type-Safe TypeScript API**: Comprehensive service layer with proper error handling
- **Real-Time Streaming**: Support for streaming text generation
- **Conversation Management**: Session-based conversation handling
- **Availability Detection**: Smart availability checking and fallback strategies
- **Performance optimization**: Prewarming and efficient resource management

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
│   │   ├── foundation-models/              # AI-specific components
│   │   └── ui/                            # Reusable UI components
│   ├── types/                             # TypeScript definitions
│   ├── hooks/                             # Custom React hooks
│   └── utils/                             # Utility functions
├── ios/
│   └── App/
│       └── App/
│           └── FoundationModelsPlugin.swift # Native iOS implementation
└── public/                                # Static assets
```

### Core Components

1. **FoundationModelsPlugin.swift**: Native iOS implementation handling all Foundation Models interactions
2. **foundation.models.service.ts**: TypeScript service layer providing type-safe API
3. **App.tsx**: Comprehensive demo application showcasing all features
4. **Error Handling**: Robust error management with specific error types

## 🔧 API Reference

### Basic Text Generation

```typescript
import { foundationModels } from './services/foundation.models.service';

// Simple text generation
const result = await foundationModels.generateText(
  "Write a haiku about programming",
  { maxTokens: 100, temperature: 0.7 }
);
```

### Streaming Generation

```typescript
// Real-time streaming
await foundationModels.generateStreaming(
  "Tell me a story",
  (chunk) => {
    console.log('Received chunk:', chunk);
    // Update UI with streaming content
  }
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

### Availability Checking

```typescript
// Check if Foundation Models are available
const availability = await foundationModels.checkAvailability();

if (availability.available) {
  // Proceed with AI features
} else {
  console.log(`Not available: ${availability.reason}`);
  // Handle gracefully
}
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
| `npm run assets` | Generate app icons and splash screens |

## 🎨 UI Features

### Interactive Demo Application
The included demo app provides a comprehensive interface for testing all Foundation Models capabilities:

- **Feature Testing**: Individual cards for each API function
- **Real-time Streaming**: Visual streaming text generation
- **Conversation Mode**: Chat-like interface for sessions
- **Settings Panel**: Adjust temperature, max tokens, and other parameters
- **Error Handling**: Clear error messages and recovery suggestions
- **Availability Status**: Real-time system status monitoring

### Design System
- **Glass morphism UI**: Modern, translucent design elements
- **Responsive Layout**: Optimized for various iOS device sizes
- **Accessibility**: Full VoiceOver and accessibility support
- **Dark Mode**: Native iOS dark mode integration
- **Haptic Feedback**: Contextual haptic responses

## ⚡ Performance Optimization

### Prewarming
```typescript
// Prewarm the model for faster first generation
await foundationModels.prewarmSession();
```

### Resource Management
- Automatic session cleanup
- Memory-efficient streaming
- Background processing support
- Battery usage optimization

### Best Practices
1. **Check availability before use**: Always verify Foundation Models are available
2. **Handle errors gracefully**: Provide fallback experiences
3. **Use appropriate parameters**: Optimize temperature and token limits
4. **Manage sessions**: Clean up conversation sessions when done
5. **Respect user privacy**: Foundation Models process on-device only

## 🔒 Privacy & Security

Apple Foundation Models prioritize user privacy through:

- **On-Device Processing**: All AI computation happens locally
- **No Data Transmission**: User content never leaves the device
- **Encrypted Storage**: Model data stored securely
- **User Control**: Users can disable Apple Intelligence anytime

## 🐛 Troubleshooting

### Common Issues

**"Foundation Models not available"**
- Ensure iOS 26.0+ and compatible device
- Check Apple Intelligence is enabled in Settings
- Verify device language is supported
- Restart device if models are still loading

**Build errors in Xcode**
- Clean build folder (⌘+Shift+K)
- Check iOS deployment target is 26.0+
- Verify development team is set
- Update to latest Xcode version

**TypeScript errors**
- Run `npm install` to ensure dependencies are current
- Check TypeScript version compatibility
- Verify all required types are imported

**Performance issues**
- Use prewarming for faster initial responses
- Optimize prompt length and complexity
- Monitor memory usage in long conversations
- End unused conversation sessions

## 📚 Examples

### Basic Integration
```typescript
// Check availability and generate text
const availability = await foundationModels.checkAvailability();
if (availability.available) {
  const text = await foundationModels.generateText("Hello, AI!");
  console.log(text);
}
```

### Advanced Usage
```typescript
// Complete workflow with error handling
class AIService {
  private session: ConversationSession | null = null;

  async initializeAI(): Promise<boolean> {
    try {
      const availability = await foundationModels.checkAvailability();
      if (!availability.available) {
        throw new Error(availability.reason);
      }
      
      await foundationModels.prewarmSession();
      this.session = await foundationModels.createConversationSession(
        "You are a helpful assistant"
      );
      
      return true;
    } catch (error) {
      console.error('AI initialization failed:', error);
      return false;
    }
  }

  async chat(message: string): Promise<string> {
    if (!this.session) {
      throw new Error('AI not initialized');
    }

    return await foundationModels.continueConversation(
      this.session.sessionId,
      message
    );
  }

  async cleanup(): void {
    if (this.session) {
      await foundationModels.endConversationSession(this.session.sessionId);
      this.session = null;
    }
  }
}
```

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Resources

- [Apple Intelligence Documentation](https://developer.apple.com/apple-intelligence/)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS 26 Foundation Models](https://developer.apple.com/wwdc24/)
- [Swift AI Frameworks](https://developer.apple.com/documentation/foundation)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/ai-capacitor/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/ai-capacitor/discussions)
- **Apple Developer Forums**: [AI & ML Forum](https://developer.apple.com/forums/tags/ai-and-ml)

---

**Note**: Apple Foundation Models and Apple Intelligence are rapidly evolving technologies. This implementation is based on current APIs and may require updates as Apple releases new versions. Always refer to the latest Apple documentation for the most current information.
