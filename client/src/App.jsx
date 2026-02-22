import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [leads, setLeads] = useState([]);
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLeads = () => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error("Error fetching leads:", err));
  };

  useEffect(() => {
    fetchLeads();
    // Poll for updates every 60 seconds
    const interval = setInterval(fetchLeads, 60000);
    return () => clearInterval(interval);
  }, []);

  const generateAppeal = async (lead) => {
    // If an auto-draft already exists, just show it
    if (lead.drafted_appeal) {
      setSelectedAppeal(lead.drafted_appeal);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerId: lead.insurance_type,
          claimId: `MANUAL-${Math.floor(Math.random() * 10000)}`,
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

  const totalRecoverable = leads
    .filter(l => l.status !== 'Submitted')
    .reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);

  const totalSubmitted = leads
    .filter(l => l.status === 'Submitted')
    .reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);

  return (
    <div className="dashboard">
      <header>
        <div className="status-badge">Live Cloud Sync</div>
        <h1>⚡ CMS Compliance Bridge</h1>
        <div className="stats-bar">
          <div className="stat">
            <span className="label">Recoverable Revenue</span>
            <span className="value">${totalRecoverable.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="label">Successfully Defended</span>
            <span className="value success">${totalSubmitted.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main>
        <section className="leads-list">
          <div className="section-header">
            <h2>Active Denial Leads</h2>
            <button className="refresh-btn" onClick={fetchLeads}>↻ Refresh</button>
          </div>
          <div className="grid">
            {leads.map((lead, i) => (
              <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''} ${lead.status === 'Drafted' ? 'drafted' : ''} ${lead.status === 'Submitted' ? 'submitted' : ''}`}>
                <div className="card-header">
                  <h3>{lead.user}</h3>
                  <div className="header-badges">
                    {lead.estimated_value > 0 && <span className="value-tag">${parseFloat(lead.estimated_value).toLocaleString()}</span>}
                    {lead.status === 'Drafted' && <span className="badge success">Auto-Drafted</span>}
                    {lead.status === 'Submitted' && <span className="badge info">Submitted</span>}
                  </div>
                </div>
                <p><strong>Payer:</strong> {lead.insurance_type}</p>
                <p className="pain-point">{lead.pain_point}</p>
                
                <div className="card-actions">
                  <button 
                    className={lead.drafted_appeal ? 'btn-view' : 'btn-generate'}
                    onClick={() => generateAppeal(lead)} 
                    disabled={loading}
                  >
                    {lead.drafted_appeal ? (lead.status === 'Submitted' ? 'View Submitted' : 'View Auto-Draft') : 'Draft CMS Appeal'}
                  </button>
                  {lead.status === 'Drafted' && (
                    <button className="btn-submit" onClick={async () => {
                      if(!confirm("Submit this appeal to the payer portal?")) return;
                      const res = await fetch('/api/submit-appeal', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadId: lead.id, appealText: lead.drafted_appeal })
                      });
                      if(res.ok) {
                        alert("Appeal submitted successfully!");
                        fetchLeads();
                      }
                    }}>Submit to Payer</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedAppeal && (
          <section className="appeal-preview">
            <div className="modal-content">
              <h2>Appeal Draft (CMS-0057-F Template)</h2>
              <pre>{selectedAppeal}</pre>
              <div className="modal-actions">
                <button className="btn-download" onClick={async () => {
                  const res = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appealText: selectedAppeal, claimId: 'APPEAL' })
                  });
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `CMS_Appeal_${new Date().getTime()}.pdf`;
                  a.click();
                }}>Download PDF</button>
                <button onClick={() => {
                  navigator.clipboard.writeText(selectedAppeal);
                  alert("Copied to clipboard!");
                }}>Copy to Clipboard</button>
                <button className="btn-secondary" onClick={() => setSelectedAppeal(null)}>Close</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
