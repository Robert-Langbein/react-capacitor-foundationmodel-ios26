import Capacitor
import UIKit

@objc(FoundationModelsPlugin)
public class FoundationModelsPlugin: CAPPlugin, CAPBridgedPlugin {
    

    public let identifier = "FoundationModelsPlugin"
    public let jsName = "FoundationModels"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateContent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateContentStream", returnType: CAPPluginReturnPromise)
    ]
    
    public override init() {
        super.init()
        NSLog("🎯 FoundationModelsPlugin.init() called - PLUGIN INITIALIZING")
        print("🎯 FoundationModelsPlugin.init() called - PLUGIN INITIALIZING")
    }
    
    override public func load() {
        super.load()
        NSLog("🚀 FoundationModelsPlugin.load() called - PLUGIN LOADED SUCCESSFULLY")
        NSLog("🔍 Plugin identifier: \(identifier)")
        NSLog("🔍 Plugin jsName: \(jsName)")
        NSLog("🔍 Plugin methods: \(pluginMethods.map { $0.name })")
        print("🚀 FoundationModelsPlugin.load() called - PLUGIN LOADED SUCCESSFULLY")
        print("🔍 Plugin identifier: \(identifier)")
        print("🔍 Plugin jsName: \(jsName)")
        print("🔍 Plugin methods: \(pluginMethods.map { $0.name })")
    }
    
    @objc func isAvailable(_ call: CAPPluginCall) {
        NSLog("🔍 isAvailable method called")
        print("🔍 isAvailable method called")
        
        // Get current iOS version
        let systemVersion = UIDevice.current.systemVersion
        NSLog("📱 Current iOS version: \(systemVersion)")
        print("📱 Current iOS version: \(systemVersion)")
        
        // For now, we'll make it available on iOS 15.0+ since iOS 26 doesn't exist yet
        // In the future, this should be updated to the actual iOS version that supports Foundation Models
        if #available(iOS 15.0, *) {
            NSLog("✅ iOS 15.0+ detected - Foundation Models available (mock implementation)")
            print("✅ iOS 15.0+ detected - Foundation Models available (mock implementation)")
            call.resolve(["available": true, "version": systemVersion])
        } else {
            NSLog("❌ iOS version too old - requires 15.0+")
            print("❌ iOS version too old - requires 15.0+")
            call.resolve(["available": false, "reason": "iOS 15.0 or later required", "version": systemVersion])
        }
    }
    
    @objc func generateContent(_ call: CAPPluginCall) {
        NSLog("🔄 generateContent method called")
        print("🔄 generateContent method called")
        
        guard #available(iOS 15.0, *) else {
            call.reject("Foundation Models requires iOS 15.0 or later")
            return
        }
        
        guard let prompt = call.getString("prompt") else {
            call.reject("Missing required parameter: prompt")
            return
        }
        
        // Mock response for now
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            call.resolve([
                "text": "Mock response for: \(prompt)",
                "finishReason": "completed"
            ])
        }
    }
    
    @objc func generateContentStream(_ call: CAPPluginCall) {
        NSLog("🌊 generateContentStream method called")
        print("🌊 generateContentStream method called")
        
        guard #available(iOS 15.0, *) else {
            call.reject("Foundation Models requires iOS 15.0 or later")
            return
        }
        
        guard let prompt = call.getString("prompt") else {
            call.reject("Missing required parameter: prompt")
            return
        }
        
        // Mock streaming response
        call.resolve(["success": true])
    }
}

// MARK: - Supporting Types
@available(iOS 15.0, *)
struct FoundationModelRequest {
    let prompt: String
    let systemPrompt: String
    let maxTokens: Int
    let temperature: Float
}

@available(iOS 15.0, *)
struct FoundationModelResponse {
    let text: String
    let finishReason: String
    let usage: TokenUsage
}

@available(iOS 15.0, *)
struct FoundationModelStreamChunk {
    let text: String
    let isComplete: Bool
}

@available(iOS 15.0, *)
struct TokenUsage {
    let promptTokens: Int
    let completionTokens: Int
    let totalTokens: Int
}

// MARK: - Foundation Model Wrapper
@available(iOS 15.0, *)
class FoundationModel {
    static let shared = FoundationModel()
    
    private init() {}
    
    func generateContent(request: FoundationModelRequest) async throws -> FoundationModelResponse {
        // This is a placeholder implementation
        // In the actual implementation, you would use Apple's Foundation Models API
        // Since the exact API is not yet publicly documented, this serves as a structure
        
        // Simulate API call delay
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        // Mock response
        return FoundationModelResponse(
            text: "Generated response for: \(request.prompt)",
            finishReason: "completed",
            usage: TokenUsage(
                promptTokens: request.prompt.count / 4, // Rough estimate
                completionTokens: 50,
                totalTokens: request.prompt.count / 4 + 50
            )
        )
    }
    
    func generateContentStream(request: FoundationModelRequest) async throws -> AsyncStream<FoundationModelStreamChunk> {
        return AsyncStream { continuation in
            Task {
                // Simulate streaming response
                let words = "This is a simulated streaming response from Apple's on-device AI model.".split(separator: " ")
                
                for (index, word) in words.enumerated() {
                    let chunk = FoundationModelStreamChunk(
                        text: String(word) + " ",
                        isComplete: index == words.count - 1
                    )
                    
                    continuation.yield(chunk)
                    
                    // Simulate delay between chunks
                    try? await Task.sleep(nanoseconds: 200_000_000) // 0.2 seconds
                }
                
                continuation.finish()
            }
        }
    }
} 