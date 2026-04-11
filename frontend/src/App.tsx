import { useState } from 'react'
import { IntakeView } from './components/IntakeView'
import './App.css'

function App() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl h-[800px]">
        <IntakeView 
          jobId="test-job-1" 
          onComplete={(criteria) => console.log('Intake complete!', criteria)} 
        />
      </div>
    </main>
  )
}

export default App
