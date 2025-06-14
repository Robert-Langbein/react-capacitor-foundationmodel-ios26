import { useState } from 'react'
import './App.css'
import FoundationModels from './services/ai.services/foundation.models.service'

function App() {
  const [prompt, setPrompt] = useState('Hello, who are you?')
  const [response, setResponse] = useState<string | null>(null)
  const [summaryJson, setSummaryJson] = useState<string | null>(null)
  const [echoReply, setEchoReply] = useState<string | null>(null)
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

  const handleGenerateSummary = async () => {
    setIsLoading(true)
    setSummaryJson(null)
    try {
      const { json } = await FoundationModels.generateSummary({ prompt })
      setSummaryJson(json)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEcho = async () => {
    setIsLoading(true)
    setEchoReply(null)
    try {
      const { reply } = await FoundationModels.echo({ message: prompt })
      setEchoReply(reply)
    } catch (e) {
      console.error(e)
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
      <button onClick={handleGenerateSummary} disabled={isLoading} style={{ marginTop: 8 }}>
        {isLoading ? 'Generiere Zusammenfassung …' : 'Generate Summary'}
      </button>
      {summaryJson && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{summaryJson}</pre>
      )}
      <button onClick={handleEcho} disabled={isLoading} style={{ marginTop: 8 }}>
        {isLoading ? 'Echo …' : 'Echo'}
      </button>
      {echoReply && (
        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>{echoReply}</pre>
      )}
    </div>
  )
}

export default App
