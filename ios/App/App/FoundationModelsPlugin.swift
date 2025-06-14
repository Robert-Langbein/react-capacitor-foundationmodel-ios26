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
        // Try to build a GenerationSchema from a subset of JSON Schema ourselves.
        // Currently supports: type="object" with `properties` where each property
        // can be a `string`, `number`, `integer`, `boolean`, or an `array` of one of
        // those primitive types.

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

        // Parse JSON
        guard let data = schemaString.data(using: .utf8),
              let top = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NSError(domain: "FoundationModelsPlugin", code: -14, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON schema"])
        }

        guard (top["type"] as? String) == "object",
              let props = top["properties"] as? [String: Any] else {
            throw NSError(domain: "FoundationModelsPlugin", code: -15, userInfo: [NSLocalizedDescriptionKey: "Only object schemas with properties are supported in this preview implementation."])
        }

        var propertySchemas: [DynamicGenerationSchema.Property] = []

        for (propName, specAny) in props {
            guard let spec = specAny as? [String: Any], let typeString = spec["type"] as? String else {
                continue // skip malformed property
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

        let response = try await session.respond(to: prompt, schema: generationSchema)

        /*
         The FoundationModels SDK used for this build does not yet expose public APIs to
         introspect a DynamicGenerationSchema at runtime, which would allow converting
         the returned `GeneratedContent` into a Foundation container type. In early
         previews of the framework there was a `kind` property but this was removed in
         newer seeds, which currently breaks compilation.

         As a temporary workaround we forward the textual representation of the
         `GeneratedContent` back to JavaScript. This keeps the feature functional while
         avoiding compile-time dependence on still-evolving APIs. Once the SDK exposes a
         stable way to export `GeneratedContent` (for example via `jsonString` or
         `Codable` conformance) the conversion logic can be revisited.
        */

        return String(describing: response.content)
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