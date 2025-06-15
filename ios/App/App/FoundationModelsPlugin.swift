import Capacitor
import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

@objc(FoundationModelsPlugin)
public class FoundationModelsPlugin: CAPPlugin, CAPBridgedPlugin {
    // MARK: - CAPBridgedPlugin conformance
    public let identifier = "FoundationModelsPlugin"
    public let jsName = "FoundationModels"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "generateText", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateSummary", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "echo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateDynamic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateWithInstructions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateStreaming", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "continueConversation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prewarmSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkAvailability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generateWithOptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSessionInfo", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "registerTool", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendToolResult", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - Basic text generation
    @objc func generateText(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"), !prompt.isEmpty else {
            call.reject("'prompt' must be a non-empty string.")
            return
        }

        let maxTokens = call.getInt("maxTokens") ?? 1000
        let temperature = call.getFloat("temperature") ?? 0.7

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available on this device/OS version")
                return
            }

            do {
                let text = try await provider.generateText(prompt: prompt, maxTokens: maxTokens, temperature: temperature)
                call.resolve(["text": text])
            } catch {
                call.reject("Generation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Guided generation with summary
    @objc func generateSummary(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt") else {
            call.reject("'prompt' required")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let json = try await provider.generateSummaryJSON(prompt: prompt)
                call.resolve(["json": json])
            } catch {
                call.reject("Summary generation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Tool calling example
    @objc func echo(_ call: CAPPluginCall) {
        guard let message = call.getString("message") else {
            call.reject("'message' missing")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let reply = try await provider.echo(message: message)
                call.resolve(["reply": reply])
            } catch {
                call.reject("Echo failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Dynamic schema generation
    @objc func generateDynamic(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"),
              let schemaString = call.getString("schema") else {
            call.reject("'prompt' and 'schema' required")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let json = try await provider.generateWithDynamicSchema(prompt: prompt, schemaString: schemaString)
                call.resolve(["json": json])
            } catch {
                call.reject("Dynamic generation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Generation with instructions
    @objc func generateWithInstructions(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"),
              let instructionsText = call.getString("instructions") else {
            call.reject("'prompt' and 'instructions' required")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let text = try await provider.generateWithInstructions(prompt: prompt, instructions: instructionsText)
                call.resolve(["text": text])
            } catch {
                call.reject("Instruction-based generation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Streaming generation
    @objc func generateStreaming(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt") else {
            call.reject("'prompt' required")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let streamId = try await provider.generateStreaming(prompt: prompt) { [weak self] chunk, callId in
                    self?.notifyListeners("streamingUpdate", data: [
                        "chunk": chunk,
                        "callId": callId
                    ])
                }
                call.resolve(["streamId": streamId])
            } catch {
                call.reject("Streaming generation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Session management for multi-turn conversations
    @objc func createSession(_ call: CAPPluginCall) {
        let instructions = call.getString("instructions")
        
        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let sessionId = try await provider.createSession(instructions: instructions)
                call.resolve(["sessionId": sessionId])
            } catch {
                call.reject("Session creation failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func continueConversation(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId"),
              let prompt = call.getString("prompt") else {
            call.reject("'sessionId' and 'prompt' required")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let response = try await provider.continueConversation(sessionId: sessionId, prompt: prompt)
                call.resolve(["text": response])
            } catch {
                call.reject("Conversation continuation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Prewarming for performance optimization
    @objc func prewarmSession(_ call: CAPPluginCall) {
        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                try await provider.prewarmSession()
                call.resolve(["success": true])
            } catch {
                call.reject("Prewarming failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Availability checking
    @objc func checkAvailability(_ call: CAPPluginCall) {
        guard #available(iOS 26, *) else {
            call.resolve([
                "available": false,
                "reason": "iOS 26 or later required"
            ])
            return
        }

        Task {
            let availability = await _LanguageModelSessionProvider.checkAvailability()
            call.resolve(availability)
        }
    }

    // MARK: - Generation with advanced options
    @objc func generateWithOptions(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt") else {
            call.reject("'prompt' required")
            return
        }

        let temperature = call.getFloat("temperature") ?? 0.7
        let maxTokens = call.getInt("maxTokens") ?? 1000
        let includeSchemaInPrompt = call.getBool("includeSchemaInPrompt") ?? true
        let safetyLevel = call.getString("safetyLevel") ?? "default"

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let response = try await provider.generateWithOptions(
                    prompt: prompt,
                    temperature: temperature,
                    maxTokens: maxTokens,
                    includeSchemaInPrompt: includeSchemaInPrompt,
                    safetyLevel: safetyLevel
                )
                call.resolve(["text": response])
            } catch {
                call.reject("Advanced generation failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Session information
    @objc func getSessionInfo(_ call: CAPPluginCall) {
        guard let sessionId = call.getString("sessionId") else {
            call.reject("'sessionId' required")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                let info = try await provider.getSessionInfo(sessionId: sessionId)
                call.resolve(info)
            } catch {
                call.reject("Could not fetch session info: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Tool registration from JS
    @objc func registerTool(_ call: CAPPluginCall) {
        guard let toolId = call.getString("toolId"),
              let name = call.getString("name"),
              let description = call.getString("description") else {
            call.reject("'toolId', 'name' und 'description' erforderlich")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available")
                return
            }

            do {
                try await provider.registerTool(toolId: toolId, name: name, description: description, plugin: self)
                call.resolve(["success": true])
            } catch {
                call.reject("Tool registration failed: \(error.localizedDescription)")
            }
        }
    }

    // Result callback from JS after tool execution
    @objc func sendToolResult(_ call: CAPPluginCall) {
        guard let callId = call.getString("callId"),
              let output = call.getString("output") else {
            call.reject("'callId' und 'output' erforderlich")
            return
        }

        guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
            call.reject("Foundation Models not available")
            return
        }

        provider.resolveToolCall(callId: callId, output: output)
        call.resolve(["success": true])
    }
}

// MARK: - Session provider implementation

#if canImport(FoundationModels)
import FoundationModels

// Guided Generation structs
@available(iOS 26, *)
@Generable
struct SummaryResult: Codable {
    var summary: String
}

@available(iOS 26, *)
@Generable
struct DetailedResponse: Codable {
    var title: String
    var content: String
    var confidence: Double
}

@available(iOS 26, *)
@Generable
struct StreamingText: Codable {
    var text: String
}

// Tool implementations
@available(iOS 26, *)
struct EchoTool: Tool {
    let name = "echoTool"
    let description = "Echo back the provided message with optional formatting"

    @Generable
    struct Arguments {
        var message: String
        var format: String?
    }

    func call(arguments: Arguments) async throws -> ToolOutput {
        let formatted = arguments.format == "uppercase" ? arguments.message.uppercased() : arguments.message
        return ToolOutput("Echo: \(formatted)")
    }
}

@available(iOS 26, *)
final class JSToolBridge: Tool {
    @Generable struct JSToolArgs: Codable {
        var payload: String
    }

    typealias Arguments = JSToolArgs

    let toolId: String
    let name: String
    let description: String
    weak var plugin: FoundationModelsPlugin?

    // Continuations Map (shared via provider)
    var continuations: () -> [String: CheckedContinuation<ToolOutput, Error>]
    var storeContinuation: (String, CheckedContinuation<ToolOutput, Error>) -> Void

    init(toolId: String, name: String, description: String, plugin: FoundationModelsPlugin?,
         getCont: @escaping () -> [String: CheckedContinuation<ToolOutput, Error>],
         storeCont: @escaping (String, CheckedContinuation<ToolOutput, Error>) -> Void) {
        self.toolId = toolId
        self.name = name
        self.description = description
        self.plugin = plugin
        self.continuations = getCont
        self.storeContinuation = storeCont
    }

    func call(arguments: JSToolArgs) async throws -> ToolOutput {
        guard let plugin = plugin else {
            throw NSError(domain: "FoundationModelsPlugin", code: -30, userInfo: [NSLocalizedDescriptionKey: "Plugin deallocated"])
        }

        let callId = UUID().uuidString

        return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<ToolOutput, Error>) in
            // Save continuation so that JS can resolve later
            storeContinuation(callId, cont)

            // Notify JS
            plugin.notifyListeners("toolCall", data: [
                "toolId": toolId,
                "callId": callId,
                "payload": arguments.payload
            ])
        }
    }
}

@available(iOS 26, *)
fileprivate final class _LanguageModelSessionProvider {
    static let shared: _LanguageModelSessionProvider? = _LanguageModelSessionProvider()
    
    private var sessions: [String: LanguageModelSession] = [:]
    private var streamingSessions: [String: Task<Void, Never>] = [:]
    private var registeredTools: [String: JSToolBridge] = [:]
    private var pendingToolContinuations: [String: CheckedContinuation<ToolOutput, Error>] = [:]
    private let sessionQueue = DispatchQueue(label: "foundation.models.sessions", attributes: .concurrent)

    // Helper to create a session that includes all currently registered JS tools
    private func makeSession() -> LanguageModelSession {
        if registeredTools.isEmpty {
            return LanguageModelSession()
        } else {
            return LanguageModelSession(tools: Array(registeredTools.values))
        }
    }

    private init() {}

    // MARK: - Basic text generation
    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        let session = makeSession()
        let response = try await session.respond(to: prompt)
        return response.content
    }

    // MARK: - Guided generation
    func generateSummaryJSON(prompt: String) async throws -> String {
        let session = makeSession()
        let response = try await session.respond(to: prompt, generating: SummaryResult.self)
        let data = try JSONEncoder().encode(response.content)
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    // MARK: - Tool calling
    func echo(message: String) async throws -> String {
        let dynamicTools: [any Tool] = Array(registeredTools.values)
        var allTools: [any Tool] = dynamicTools
        allTools.append(EchoTool())
        let toolSession = LanguageModelSession(tools: allTools)
        let prompt = "Use the echoTool to process this message: \"\(message)\""
        let response = try await toolSession.respond(to: prompt)
        return response.content
    }

    // MARK: - Dynamic schema generation
    func generateWithDynamicSchema(prompt: String, schemaString: String) async throws -> String {
        func primitiveSchema(for jsonType: String) throws -> DynamicGenerationSchema {
            switch jsonType {
            case "string": return DynamicGenerationSchema(type: String.self)
            case "number": return DynamicGenerationSchema(type: Double.self)
            case "integer": return DynamicGenerationSchema(type: Int.self)
            case "boolean": return DynamicGenerationSchema(type: Bool.self)
            default:
                throw NSError(domain: "FoundationModelsPlugin", code: -13, userInfo: [NSLocalizedDescriptionKey: "Unsupported JSON Schema primitive type: \(jsonType)"])
            }
        }

        guard let data = schemaString.data(using: .utf8),
              let top = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NSError(domain: "FoundationModelsPlugin", code: -14, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON schema"])
        }

        guard (top["type"] as? String) == "object",
              let props = top["properties"] as? [String: Any] else {
            throw NSError(domain: "FoundationModelsPlugin", code: -15, userInfo: [NSLocalizedDescriptionKey: "Only object schemas with properties are supported"])
        }

        var propertySchemas: [DynamicGenerationSchema.Property] = []

        for (propName, specAny) in props {
            guard let spec = specAny as? [String: Any], let typeString = spec["type"] as? String else {
                continue
            }

            let schema: DynamicGenerationSchema
            if typeString == "array", let items = spec["items"] as? [String: Any], let itemType = items["type"] as? String {
                schema = DynamicGenerationSchema(arrayOf: try primitiveSchema(for: itemType))
            } else {
                schema = try primitiveSchema(for: typeString)
            }

            let property = DynamicGenerationSchema.Property(name: propName, schema: schema)
            propertySchemas.append(property)
        }

        let root = DynamicGenerationSchema(name: "Root", properties: propertySchemas)
        let generationSchema = try GenerationSchema(root: root, dependencies: [])

        let session = makeSession()
        let response = try await session.respond(to: prompt, schema: generationSchema)

        return String(describing: response.content)
    }

    // MARK: - Instructions-based generation
    func generateWithInstructions(prompt: String, instructions: String) async throws -> String {
        let instructionsObj = Instructions(instructions)
        let session = makeSession()
        let response = try await session.respond(to: prompt)
        return response.content
    }

    // MARK: - Streaming generation
    func generateStreaming(prompt: String, onChunk: @escaping (String, String) -> Void) async throws -> String {
        let session = makeSession()
        let streamId = UUID().uuidString

        // Create a task that listens to the async snapshot sequence
        let task = Task {
            var lastText = ""
            do {
                let stream = session.streamResponse(
                    to: prompt,
                    generating: StreamingText.self
                )

                for try await partial in stream {
                    guard let current = partial.text else { continue }

                    // Calculate diff to send only new part
                    if current.hasPrefix(lastText) {
                        let startIndex = current.index(current.startIndex, offsetBy: lastText.count)
                        let chunk = String(current[startIndex...])
                        if !chunk.isEmpty {
                            onChunk(chunk, streamId)
                        }
                    } else {
                        // Fallback: send full text
                        onChunk(current, streamId)
                    }
                    lastText = current
                }

                onChunk("[STREAM_COMPLETE]", streamId)
            } catch {
                onChunk("[STREAM_ERROR]", streamId)
            }
        }

        await sessionQueue.async(flags: .barrier) {
            self.streamingSessions[streamId] = task
        }

        return streamId
    }

    // MARK: - Session management for multi-turn conversations
    func createSession(instructions: String?) async throws -> String {
        let sessionId = UUID().uuidString
        
        let session: LanguageModelSession
        if let instructions = instructions {
            let instructionsObj = Instructions(instructions)
            session = LanguageModelSession(instructions: instructionsObj)
        } else {
            session = makeSession()
        }
        
        await sessionQueue.async(flags: .barrier) {
            self.sessions[sessionId] = session
        }
        
        return sessionId
    }

    func continueConversation(sessionId: String, prompt: String) async throws -> String {
        guard let session = await sessionQueue.sync(execute: { sessions[sessionId] }) else {
            throw NSError(domain: "FoundationModelsPlugin", code: -16, userInfo: [NSLocalizedDescriptionKey: "Session not found"])
        }
        
        let response = try await session.respond(to: prompt)
        return response.content
    }

    // MARK: - Prewarming
    func prewarmSession() async throws {
        let session = makeSession()
        try await session.prewarm()
    }

    // MARK: - Advanced generation with options
    func generateWithOptions(
        prompt: String,
        temperature: Float,
        maxTokens: Int,
        includeSchemaInPrompt: Bool,
        safetyLevel: String
    ) async throws -> String {
        let session = makeSession()
        
        // Create generation options based on parameters
        var options = GenerationOptions()
        options.temperature = Double(temperature) // Convert Float to Double
        // Note: maxTokens is not available in GenerationOptions in current SDK
        // We'll use the available options for now
        
        let response = try await session.respond(to: prompt, options: options)
        return response.content
    }

    // MARK: - Availability checking
    static func checkAvailability() async -> [String: Any] {
        let systemModel = SystemLanguageModel.default
        
        switch systemModel.availability {
        case .available:
            return [
                "available": true,
                "status": "available",
                "reason": "Foundation Models ready"
            ]
        case .unavailable(.appleIntelligenceNotEnabled):
            return [
                "available": false,
                "status": "notEnabled",
                "reason": "Apple Intelligence not enabled. Please enable in Settings."
            ]
        case .unavailable(.deviceNotEligible):
            return [
                "available": false,
                "status": "notEligible",
                "reason": "Device not eligible for Apple Intelligence"
            ]
        case .unavailable(.modelNotReady):
            return [
                "available": false,
                "status": "notReady",
                "reason": "Model downloading. Please try again later."
            ]
        case .unavailable(_):
            return [
                "available": false,
                "status": "unavailable",
                "reason": "Foundation Models unavailable"
            ]
        }
    }

    // MARK: - Session information
    func getSessionInfo(sessionId: String) async throws -> [String: Any] {
        guard let session = await sessionQueue.sync(execute: { sessions[sessionId] }) else {
            throw NSError(domain: "FoundationModelsPlugin", code: -17, userInfo: [NSLocalizedDescriptionKey: "Session not found"])
        }

        let info: [String: Any] = [
            "sessionId": sessionId,
            "isResponding": session.isResponding
        ]

        return info
    }

    // MARK: - Dynamic Tool registration
    func registerTool(toolId: String, name: String, description: String, plugin: FoundationModelsPlugin) async throws {
        guard registeredTools[toolId] == nil else { return }
        let bridge = JSToolBridge(toolId: toolId, name: name, description: description, plugin: plugin, getCont: { [weak self] in
            self?.pendingToolContinuations ?? [:]
        }, storeCont: { [weak self] id, cont in
            self?.pendingToolContinuations[id] = cont
        })
        await sessionQueue.async(flags: .barrier) {
            self.registeredTools[toolId] = bridge
        }
    }

    func resolveToolCall(callId: String, output: String) {
        guard let cont = pendingToolContinuations[callId] else { return }
        cont.resume(returning: ToolOutput(output))
        pendingToolContinuations.removeValue(forKey: callId)
    }
}
#else
@available(iOS 26, *)
fileprivate final class _LanguageModelSessionProvider {
    static let shared: _LanguageModelSessionProvider? = nil
    
    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        throw NSError(domain: "FoundationModelsPlugin", code: -10, userInfo: [NSLocalizedDescriptionKey: "FoundationModels framework not present in this build."])
    }
    
    static func checkAvailability() async -> [String: Any] {
        return [
            "available": false,
            "status": "notSupported",
            "reason": "FoundationModels framework not available in this build"
        ]
    }
}
#endif 