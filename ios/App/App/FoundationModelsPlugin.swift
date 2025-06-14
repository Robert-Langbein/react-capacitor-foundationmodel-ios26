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
        CAPPluginMethod(name: "generateText", returnType: CAPPluginReturnPromise)
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
}

// MARK: - Session provider

#if canImport(FoundationModels)
import FoundationModels

@available(iOS 26, *)
fileprivate final class _LanguageModelSessionProvider {
    static let shared: _LanguageModelSessionProvider? = _LanguageModelSessionProvider()
    private let session = LanguageModelSession()

    private init() {}

    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        let response = try await session.respond(to: prompt)
        return response.content
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