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

        // Perform the request asynchronously to avoid blocking the JS thread
        Task {
            // Ensure the device supports FoundationModels
            guard #available(iOS 26, *), let LanguageModelSessionClass = _LanguageModelSessionProvider.shared else {
                call.reject("On-device Foundation Models are only available on supported hardware running iOS 26 or later.")
                return
            }

            do {
                let text = try await LanguageModelSessionClass.generateText(prompt: prompt, maxTokens: maxTokens, temperature: temperature)
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
    static let shared: _LanguageModelSessionProvider = _LanguageModelSessionProvider()

    private let session: LanguageModelSession

    private init() {
        self.session = LanguageModelSession()
    }

    /// Generate text using Apple Foundation Models. Currently uses the default generation parameters
    /// supported by the public API. Advanced controls (maxTokens, temperature) will be added once the
    /// framework exposes them.
    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        // NOTE: As of the initial FoundationModels release, `respond(to:)` does not yet expose
        // configurable generation options. When the public API adds these knobs we can forward the
        // arguments. For now we approximate temperature via prompt engineering is not implemented.
        let response = try await session.respond(to: prompt)
        return response.content
    }
}

#else

@available(iOS 26, *)
fileprivate final class _LanguageModelSessionProvider {
    static let shared: _LanguageModelSessionProvider? = nil

    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        throw NSError(domain: "FoundationModelsPlugin", code: -10, userInfo: [NSLocalizedDescriptionKey: "FoundationModels framework not available in this build configuration."])
    }
}

#endif 