
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-ivory text-charcoal">
          <header className="bg-maroon text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-2xl font-bold tracking-tight">Enverga Arena</h1>
              <nav className="flex gap-4">
                <a href="/" className="hover:text-gold transition">Home</a>
                <a href="/schedule" className="hover:text-gold transition">Schedule</a>
                <a href="/results" className="hover:text-gold transition">Results</a>
                <a href="/standings" className="hover:text-gold transition">Standings</a>
              </nav>
            </div>
          </header>
          
          <main className="container mx-auto p-4 py-8">
            <Routes>
              <Route path="/" element={
                <div className="text-center py-20">
                  <h2 className="text-4xl font-extrabold mb-4 text-maroon">MSEUF Intramurals Portal</h2>
                  <p className="text-lg text-charcoal max-w-2xl mx-auto">
                    Official source for schedules, results, and medal tally. Powered by Rooney AI.
                  </p>
                </div>
              } />
              <Route path="/schedule" element={<div>Schedule Page (Coming Soon)</div>} />
              <Route path="/results" element={<div>Results Page (Coming Soon)</div>} />
              <Route path="/standings" element={<div>Standings Page (Coming Soon)</div>} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
