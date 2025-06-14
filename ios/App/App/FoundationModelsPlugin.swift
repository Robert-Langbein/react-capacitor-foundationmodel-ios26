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

// MARK: - Private helper

@available(iOS 26, *)
fileprivate final class _LanguageModelSessionProvider {
    static let shared: _LanguageModelSessionProvider? = {
        // Some older simulators or devices might compile but not have the runtime framework.
        guard NSClassFromString("LanguageModelSession") != nil else {
            return nil
        }
        return _LanguageModelSessionProvider()
    }()

    private var session: AnyObject?

    private init() {
        // Lazy init to avoid unnecessary overhead when the plugin isn't used.
    }

    // Uses reflection to avoid hard dependency failures on older SDKs during compilation.
    func generateText(prompt: String, maxTokens: Int, temperature: Float) async throws -> String {
        if session == nil {
            session = _createSession()
        }

        guard let session = session else {
            throw NSError(domain: "FoundationModelsPlugin", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unable to instantiate LanguageModelSession"])
        }

        // Expected selector: generateText(for:prompt:maxTokens:temperature:)
        let selector = NSSelectorFromString("generateTextFor:prompt:maxTokens:temperature:")
        guard session.responds(to: selector) else {
            throw NSError(domain: "FoundationModelsPlugin", code: -2, userInfo: [NSLocalizedDescriptionKey: "Unsupported FoundationModels API."])
        }

        typealias GenerateFunc = @convention(c) (AnyObject, Selector, String, Int, Float) async throws -> String
        let methodIMP = session.method(for: selector)
        let function = unsafeBitCast(methodIMP, to: GenerateFunc.self)
        return try await function(session, selector, prompt, maxTokens, temperature)
    }

    private func _createSession() -> AnyObject? {
        guard let SessionClass = NSClassFromString("LanguageModelSession") as? NSObject.Type else {
            return nil
        }
        return SessionClass.init()
    }
} 