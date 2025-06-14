import { useState } from 'react'
import './App.css'
import FoundationModels from './services/ai.services/foundation.models.service'

function App() {
  const [prompt, setPrompt] = useState('Hello, who are you?')
  const [response, setResponse] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    setResponse(null)
    try {
      const { text } = await FoundationModels.generateText({ prompt })
      setResponse(text)
    } catch (err) {
      console.error(err)
      setResponse('Fehler: ' + (err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="test-container">
      <h1>On-Device AI Test</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        style={{ width: '100%', padding: 8 }}
      />
      <button onClick={handleGenerate} disabled={isLoading} style={{ marginTop: 8 }}>
        {isLoading ? 'Generiere …' : 'Generate'}
      </button>
      {response && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{response}</pre>
      )}
    </div>
  )
}

export default App
