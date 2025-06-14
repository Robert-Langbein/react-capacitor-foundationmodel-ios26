import Capacitor

class MyViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        self.bridge?.registerPluginInstance(FoundationModelsPlugin())
    }
} 