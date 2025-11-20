import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function App() {
  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1 style={{ color: 'green', fontSize: '48px' }}>✅ REACT IS WORKING!</h1>
      <p style={{ fontSize: '24px' }}>If you see this, the frontend is running correctly.</p>
      <p>Backend: <a href="http://localhost:8080">localhost:8080</a></p>
      <button 
        onClick={() => alert('Button clicked!')}
        style={{ padding: '20px 40px', fontSize: '20px', cursor: 'pointer' }}
      >
        Test Button
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
