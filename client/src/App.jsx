import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [leads, setLeads] = useState([]);
  const [editingAppeal, setEditingAppeal] = useState(null);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [analytics, setAnalytics] = useState({ payers: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });

  const fetchLeads = () => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => setLeads(data))
      .catch(err => console.error("Error fetching leads:", err));
    
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => setAnalytics(data))
      .catch(err => console.error("Error fetching analytics:", err));
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 60000);
    return () => clearInterval(interval);
  }, []);

  const saveEdit = async () => {
    setLoading(true);
    const res = await fetch('/api/save-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: editingLeadId, appealText: editingAppeal })
    });
    if(res.ok) {
      alert("Draft saved successfully.");
      setEditingAppeal(null);
      setEditingLeadId(null);
      fetchLeads();
    }
    setLoading(false);
  };

  const generateAppeal = async (lead) => {
    if (lead.drafted_appeal || lead.edited_appeal) {
      setEditingAppeal(lead.edited_appeal || lead.drafted_appeal);
      setEditingLeadId(lead.id);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerId: lead.insurance_type,
          claimId: `MANUAL-${lead.id}`,
          reason: lead.pain_point,
          timestamp: new Date().toISOString()
        })
      });
      const data = await res.json();
      setEditingAppeal(data.appeal);
      setEditingLeadId(lead.id);
    } catch (err) {
      console.error("Appeal generation failed", err);
    }
    setLoading(false);
  };

  const pendingDrafts = leads.filter(l => l.status.includes('Drafted'));
  const l2Escalations = leads.filter(l => l.status.includes('Level 2')).length;
  
  const totalRecoverable = leads
    .filter(l => l.status !== 'Settled')
    .reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);

  const totalSettled = leads
    .filter(l => l.status === 'Settled')
    .reduce((sum, l) => sum + (parseFloat(l.recovered_amount) || 0), 0);

  const bulkTransmit = async () => {
    if(!confirm(`Transmit all ${pendingDrafts.length} prepared appeals to their respective payers?`)) return;
    setLoading(true);
    for (const lead of pendingDrafts) {
      await fetch('/api/submit-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, insuranceName: lead.insurance_type })
      });
    }
    setLoading(false);
    fetchLeads();
    alert("Bulk transmission complete.");
  };

  const calculateTimeLeft = (dueDate) => {
    if (!dueDate) return null;
    const difference = +new Date(dueDate) - +new Date();
    if (difference <= 0) return "EXPIRED";
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((difference / 1000 / 60) % 60);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`;
  };

  const exportAudit = () => window.open('/api/export-audit', '_blank');

  return (
    <div className="dashboard">
      <header>
        <div className="header-top">
          <div className="status-badge">Live Cloud Sync</div>
          <button className="btn-audit" onClick={exportAudit}>📥 Export Audit Report</button>
        </div>
        <h1>⚡ CMS Compliance Bridge</h1>
        <div className="stats-bar">
          <div className="stat">
            <span className="label">Potential Recovery</span>
            <span className="value">${totalRecoverable.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="label">Drafts Pending</span>
            <span className="value pending">{pendingDrafts.length}</span>
          </div>
          <div className="stat">
            <span className="label">Recovered Revenue</span>
            <span className="value success">${totalSettled.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="label">L2 Escalations</span>
            <span className="value pending">{l2Escalations}</span>
          </div>
          <div className="stat">
            <span className="label">Forecasted Recovery</span>
            <span className="value info">${analytics.forecast.weightedForecast.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="label">System Win Rate</span>
            <span className="value success">{analytics.forecast.avgWinRate}%</span>
          </div>
        </div>
      </header>

      <main>
        {pendingDrafts.length > 0 && (
          <div className="bulk-actions">
            <button className="btn-bulk" onClick={bulkTransmit} disabled={loading}>
              {loading ? 'Transmitting Batch...' : `⚡ Transmit ${pendingDrafts.length} Pending Appeals`}
            </button>
          </div>
        )}

        <section className="analytics-section">
          <h2>Payer Performance Analytics</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Payer Name</th>
                <th>Denials Found</th>
                <th>Potential Revenue</th>
                <th>Win Rate</th>
                <th>Recovered</th>
              </tr>
            </thead>
            <tbody>
              {analytics.payers.map((stat, i) => (
                <tr key={i}>
                  <td><strong>{stat.name}</strong></td>
                  <td>{stat.count}</td>
                  <td>${stat.totalValue.toLocaleString()}</td>
                  <td><span className="win-rate-pill">{stat.winRate}%</span></td>
                  <td className="success"><strong>${parseFloat(stat.wins * (stat.totalValue / (stat.count || 1))).toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="leads-list">
          <div className="section-header">
            <h2>Active Denial Leads</h2>
            <button className="refresh-btn" onClick={fetchLeads}>↻ Refresh</button>
          </div>
          <div className="grid">
            {leads.map((lead, i) => (
              <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''} ${lead.status.includes('Drafted') ? 'drafted' : ''} ${lead.status === 'Submitted' ? 'submitted' : ''} ${lead.status === 'Settled' ? 'settled' : ''}`}>
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
                    {lead.status.includes('Drafted') && <span className="badge success">Ready for Review</span>}
                    {lead.status === 'Submitted' && <span className={`badge info ${lead.submission_status === 'Failed' ? 'error' : ''}`}>
                      {lead.submission_status === 'Delivered' ? '✅ Fax Delivered' : (lead.submission_status === 'Failed' ? '❌ Fax Failed' : '📡 Transmitting...')}
                    </span>}
                    {lead.status === 'Settled' && <span className="badge success">Settled</span>}
                  </div>
                </div>
                <p><strong>Payer:</strong> {lead.insurance_type}</p>
                <p className="pain-point">{lead.pain_point}</p>
                
                <div className="card-actions">
                  <button 
                    className={(lead.drafted_appeal || lead.edited_appeal) ? 'btn-view' : 'btn-generate'}
                    onClick={() => generateAppeal(lead)} 
                    disabled={loading}
                  >
                    { (lead.drafted_appeal || lead.edited_appeal) ? (lead.status === 'Submitted' ? 'View Submission' : 'Review Appeal Package') : 'Draft CMS Appeal'}
                  </button>
                  {lead.status.includes('Drafted') && (
                    <button className="btn-submit" onClick={async () => {
                      if(!confirm(`Transmit this appeal to the regulatory department for ${lead.insurance_type}?`)) return;
                      setLoading(true);
                      const res = await fetch('/api/submit-appeal', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ leadId: lead.id, insuranceName: lead.insurance_type })
                      });
                      if(res.ok) { alert("Appeal transmitted successfully!"); fetchLeads(); }
                      setLoading(false);
                    }} disabled={loading}>Transmit Appeal</button>
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
                <span className="lead-ref">Lead ID: {editingLeadId}</span>
              </div>
              
              <textarea 
                className="appeal-editor"
                value={editingAppeal}
                onChange={(e) => setEditingAppeal(e.target.value)}
                rows={20}
              />

              <div className="modal-actions">
                <button className="btn-save" onClick={saveEdit} disabled={loading}>Save Draft</button>
                <button className="btn-download" onClick={async () => {
                  const lead = leads.find(l => l.id === editingLeadId);
                  const res = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        appealText: editingAppeal, 
                        claimId: editingLeadId,
                        clinicalResearch: lead?.clinical_evidence
                    })
                  });
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Clinical_Package_${editingLeadId}.pdf`;
                  a.click();
                }}>Download Clinical Package</button>
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
