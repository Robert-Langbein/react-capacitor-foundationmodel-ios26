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
        CAPPluginMethod(name: "generateDynamic", returnType: CAPPluginReturnPromise)
    ]

    // MARK: - Public API exposed to JavaScript
    @objc func generateText(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"), !prompt.isEmpty else {
            call.reject("'prompt' must be a non-empty string.")
            return
        }

        // Optional parameters
        let maxTokens = call.getInt("maxTokens") ?? 256
        let temperature = call.getFloat("temperature") ?? 0.7

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("On-device Foundation Models require iOS 26 or later on supported hardware.")
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

    // MARK: Guided Generation example – returns JSON with {"summary": String}
    @objc func generateSummary(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"), !prompt.isEmpty else {
            call.reject("'prompt' must be provided")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models not available on this device.")
                return
            }

            do {
                let json = try await provider.generateSummaryJSON(prompt: prompt)
                call.resolve(["json": json])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    // MARK: Tool calling example – EchoTool
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
                call.reject(error.localizedDescription)
            }
        }
    }

    // MARK: Dynamic generation with JSON schema
    @objc func generateDynamic(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"),
              let schemaString = call.getString("schema") else {
            call.reject("'prompt' und 'schema' erforderlich")
            return
        }

        Task {
            guard #available(iOS 26, *), let provider = _LanguageModelSessionProvider.shared else {
                call.reject("Foundation Models nicht verfügbar")
                return
            }

            do {
                let json = try await provider.generateWithDynamicSchema(prompt: prompt, schemaString: schemaString)
                call.resolve(["json": json])
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }
}

// MARK: - Session provider

#if canImport(FoundationModels)
import FoundationModels

// Guided Generation struct
@available(iOS 26, *)
@Generable
struct SummaryResult: Codable {
    var summary: String
}

// Simple tool example
@available(iOS 26, *)
struct EchoTool: Tool {
    let name = "echoTool"
    let description = "Echo back the provided message"

    @Generable
    struct Arguments {
        var message: String
    }

    func call(arguments: Arguments) async throws -> ToolOutput {
        return ToolOutput("You said: \(arguments.message)")
    }
}

@available(iOS 26, *)
fileprivate final class _LanguageModelSessionProvider {
    static let shared: _LanguageModelSessionProvider? = _LanguageModelSessionProvider()
    private let session = LanguageModelSession()

    private init() {}

    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        let response = try await session.respond(to: prompt)
        return response.content
    }

    func generateSummaryJSON(prompt: String) async throws -> String {
        let response = try await session.respond(to: prompt, generating: SummaryResult.self)
        let data = try JSONEncoder().encode(response.content)
        return String(data: data, encoding: .utf8) ?? "{}"
    }

    // Example tool calling: we ask the model to decide whether to call echoTool
    func echo(message: String) async throws -> String {
        // Create a session with the EchoTool available
        let toolSession = LanguageModelSession(tools: [EchoTool()])
        let prompt = "Use the echoTool to repeat the following message: \"\(message)\""
        let response = try await toolSession.respond(to: prompt)
        return response.content
    }

    func generateWithDynamicSchema(prompt: String, schemaString: String) async throws -> String {
        /*
         Dynamic generation with arbitrary JSON Schema is only supported starting with
         later Xcode beta seeds. The current SDK we are building against does *not*
         expose a public `GenerationSchema(jsonSchema:)` initializer (or any other
         runtime JSON Schema bridge). Instead of failing at compile-time, we gracefully
         reject the call at runtime so that older toolchains can still build the
         application. Once the required initializer ships, this guard can be removed
         and the previously attempted implementation restored.
        */

        throw NSError(
            domain: "FoundationModelsPlugin",
            code: -12,
            userInfo: [NSLocalizedDescriptionKey: "Dynamic schemas via JSON string are not supported on this OS / Xcode version."]
        )
    }
}
#else
@available(iOS 26, *)
fileprivate final class _LanguageModelSessionProvider {
    static let shared: _LanguageModelSessionProvider? = nil
    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        throw NSError(domain: "FoundationModelsPlugin", code: -10, userInfo: [NSLocalizedDescriptionKey: "FoundationModels framework not present in this build."])
    }
}
#endif 