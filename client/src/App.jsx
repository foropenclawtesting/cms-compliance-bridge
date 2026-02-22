import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [leads, setLeads] = useState([]);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error("Error fetching leads:", err));
  }, []);

  const generateAppeal = async (lead) => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerId: lead.insurance_type,
          claimId: `REQ-${Math.floor(Math.random() * 10000)}`,
          reason: lead.pain_point,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json();
      setSelectedAppeal(data.appeal);
    } catch (err) {
      console.error("Appeal generation failed", err);
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <header>
        <h1>⚡ CMS Compliance Bridge</h1>
        <p>Real-time Denial Management & Regulatory Appeals</p>
      </header>

      <main>
        <section className="leads-list">
          <h2>Active Denial Leads</h2>
          <div className="grid">
            {leads.map((lead, i) => (
              <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''}`}>
                <h3>{lead.user}</h3>
                <p><strong>Payer:</strong> {lead.insurance_type}</p>
                <p className="pain-point">{lead.pain_point}</p>
                <button onClick={() => generateAppeal(lead)} disabled={loading}>
                  {loading ? 'Generating...' : 'Draft CMS Appeal'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {selectedAppeal && (
          <section className="appeal-preview">
            <h2>Appeal Draft (CMS-0057-F Template)</h2>
            <pre>{selectedAppeal}</pre>
            <button onClick={() => setSelectedAppeal(null)}>Close</button>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
