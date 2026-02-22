import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [leads, setLeads] = useState([]);
  const [editingAppeal, setEditingAppeal] = useState(null);
  const [editingLeadId, setEditingLeadId] = useState(null);

  const fetchLeads = () => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error("Error fetching leads:", err));
  };

  const saveEdit = async () => {
    const res = await fetch('/api/save-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: editingLeadId, appealText: editingAppeal })
    });
    if(res.ok) {
      alert("Draft saved successfully.");
      fetchLeads();
    }
  };

  const generateAppeal = async (lead) => {
    // If an auto-draft or edit already exists, open it in the editor
    if (lead.drafted_appeal || lead.edited_appeal) {
      setEditingAppeal(lead.edited_appeal || lead.drafted_appeal);
      setEditingLeadId(lead.id);
      return;
    }
    // ... rest of generate logic

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

  const calculateTimeLeft = (dueDate) => {
    if (!dueDate) return null;
    const difference = +new Date(dueDate) - +new Date();
    if (difference <= 0) return "EXPIRED";
    
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((difference / 1000 / 60) % 60);

    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
  };

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
                  <div className="title-group">
                    <h3>{lead.user}</h3>
                    {lead.due_at && (
                      <span className={`deadline ${calculateTimeLeft(lead.due_at).includes('h') && !calculateTimeLeft(lead.due_at).includes('d') ? 'urgent' : ''}`}>
                        ⌛ {calculateTimeLeft(lead.due_at)}
                      </span>
                    )}
                  </div>
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
                    <div className="submission-control">
                      <button className="btn-submit" onClick={async () => {
                        if(!confirm(`Transmit this appeal to the regulatory department for ${lead.insurance_type}?`)) return;
                        
                        const res = await fetch('/api/submit-appeal', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            leadId: lead.id, 
                            appealText: lead.drafted_appeal,
                            insuranceName: lead.insurance_type
                          })
                        });
                        const data = await res.json();
                        if(res.ok) {
                          alert(`Appeal transmitted successfully to ${data.recipient} (${data.fax})`);
                          fetchLeads();
                        }
                      }}>Transmit Appeal</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {editingAppeal && (
          <section className="appeal-preview">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Review & Refine Appeal</h2>
                <span className="lead-ref">Claim ID: {editingLeadId}</span>
              </div>
              
              <textarea 
                className="appeal-editor"
                value={editingAppeal}
                onChange={(e) => setEditingAppeal(e.target.value)}
                rows={20}
              />

              <div className="modal-actions">
                <button className="btn-save" onClick={saveEdit}>Save Changes</button>
                <button className="btn-download" onClick={async () => {
                  const res = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ appealText: editingAppeal, claimId: editingLeadId })
                  });
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Appeal_Refined_${editingLeadId}.pdf`;
                  a.click();
                }}>Download PDF</button>
                <button className="btn-secondary" onClick={() => {
                  setEditingAppeal(null);
                  setEditingLeadId(null);
                }}>Close</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
