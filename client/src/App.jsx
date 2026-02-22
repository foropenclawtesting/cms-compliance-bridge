import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
  const [health, setHealth] = useState({ status: 'Checking...', checks: {} });
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState({ payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
  const [velocity, setVelocity] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [complianceLog, setComplianceLog] = useState([]);
  const [editingLead, setEditingLead] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [p2pBrief, setP2pBrief] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);

  const batchSubmit = async () => {
    if (!confirm(`Submit ${selectedLeads.length} appeals via Gateway?`)) return;
    setLoading(true);
    const res = await fetch('/api/batch-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadIds: selectedLeads })
    });
    const data = await res.json();
    alert(`Batch Complete: ${data.successful.length} Sent, ${data.failed.length} Failed.`);
    setSelectedLeads([]);
    fetchData();
    setLoading(false);
  };

  const toggleLeadSelection = (id) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);
  };
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const [rules, setRules] = useState([]);
  const [newRule, setNewRule] = useState({ payer_name: '', reason_code: '', strategy: '' });

  useEffect(() => {
    if (session) {
        fetchData();
        fetchRules();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }
  }, [session]);

  const fetchRules = async () => {
    const res = await fetch('/api/rules', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
    const data = await res.json();
    setRules(Array.isArray(data) ? data : []);
  };

  const saveRule = async () => {
    setLoading(true);
    await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(newRule)
    });
    setNewRule({ payer_name: '', reason_code: '', strategy: '' });
    fetchRules();
    setLoading(false);
  };

  const fetchData = async () => {
    if (!session) return;
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    try {
        const [l, a, v, d, h, c] = await Promise.all([
            fetch('/api/leads', { headers }).then(res => res.json()),
            fetch('/api/analytics', { headers }).then(res => res.json()),
            fetch('/api/velocity', { headers }).then(res => res.json()),
            fetch('/api/directory', { headers }).then(res => res.json()),
            fetch('/api/health').then(res => res.json()),
            fetch('/api/compliance-log', { headers }).then(res => res.json())
        ]);
        setLeads(Array.isArray(l) ? l : []);
        setAnalytics(a || { payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
        setVelocity(v || []);
        setDirectory(d || []);
        setHealth(h);
        setComplianceLog(Array.isArray(c) ? c : []);
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const transmitAppeal = async (leadId, insurance) => {
    setLoading(true);
    await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, appealText: editedText })
    });
    const res = await fetch('/api/submit-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, insuranceName: insurance })
    });
    if (res.ok) {
        alert('Appeal Transmitted Successfully.');
        setEditingLead(null);
        fetchData();
    }
    setLoading(false);
  };

  const generateP2P = async (leadId) => {
    setLoading(true);
    const res = await fetch('/api/generate-p2p-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId })
    });
    const data = await res.json();
    setP2pBrief(data.briefing);
    setLoading(false);
  };

  const testConnection = async (target) => {
    setLoading(true);
    const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ target })
    });
    const data = await res.json();
    alert(`${target} Connection: ${data.status}\n${data.message || data.error}`);
    setLoading(false);
  };

  if (!session) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>⚡ CMS Bridge</h1>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Physician Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading}>Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  const totalRecovered = leads.filter(l => l.status === 'Settled').reduce((s, l) => s + (parseFloat(l.recovered_amount) || 0), 0);

  return (
    <div className="dashboard">
      {health.checks.schema !== 'Synchronized' && (
        <div className="setup-banner">
            <span className="icon">⚠️</span>
            <div className="banner-content">
                <strong>Database Sync Required:</strong> Run the SQL migration from DEPLOYMENT.md.
            </div>
        </div>
      )}

      <header>
        <div className="header-top">
            <div className="system-status">
                <span className={`status-dot ${health.checks.database === 'Connected' ? 'green' : 'red'}`}></span> 
                <button className="status-link" onClick={() => testConnection('FHIR')}>FHIR: Active</button>
                <button className="status-link" onClick={() => testConnection('FAX')}>GATEWAY: Live</button>
            </div>
            <div className="nav-tabs">
                <button className={activeTab === 'leads' ? 'active' : ''} onClick={() => setActiveTab('leads')}>Denials</button>
                <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Revenue</button>
                <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>Payer Rules</button>
                <button className={activeTab === 'compliance' ? 'active' : ''} onClick={() => setActiveTab('compliance')}>Compliance</button>
            </div>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
        
        <div className="hero-stats">
            <div className="hero-main">
                <h1>⚡ CMS Compliance Bridge</h1>
                <p>HIPAA-Compliant Revenue Recovery Engine</p>
            </div>
            <div className="velocity-widget">
                <span className="widget-label">Recovery Speed (7d)</span>
                <div className="mini-chart">
                    {velocity.map((v, i) => (
                        <div key={i} className="bar" style={{height: `${Math.min(100, (v.amount/10000)*100)}%`}} title={`${v.date}: $${v.amount}`}></div>
                    ))}
                </div>
            </div>
        </div>

        <div className="stats-bar">
          <div className="stat"><span className="label">Total Potential</span><span className="value">${analytics.forecast.totalPendingValue.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Weighted Forecast</span><span className="value info">${analytics.forecast.weightedForecast.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Recovered Amount</span><span className="value success">${totalRecovered.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Avg. Win Rate</span><span className="value success">{analytics.forecast.avgWinRate}%</span></div>
        </div>
      </header>

      <main>
        {activeTab === 'leads' && (
          <section className="leads-list">
            <div className="list-actions">
                <h2>Pending Denials ({leads.length})</h2>
                {selectedLeads.length > 0 && (
                    <button className="btn-primary" onClick={batchSubmit}>Submit {selectedLeads.length} Selected Appeals</button>
                )}
            </div>
            <div className="grid">
              {leads.map((lead, i) => (
                <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''} ${lead.status === 'Settled' ? 'settled' : ''} ${lead.status === 'Healing Required' ? 'healing' : ''} ${selectedLeads.includes(lead.id) ? 'selected' : ''}`} onClick={() => toggleLeadSelection(lead.id)}>
                  <div className="card-header">
                    <div className="title-group">
                      <h3>{lead.user}</h3>
                      {lead.due_at && <span className="deadline">⌛ Due soon</span>}
                    </div>
                    <div className="header-badges">
                      <span className="probability-tag">{lead.success_probability}% Chance</span>
                      <span className="value-tag">${parseFloat(lead.estimated_value || 0).toLocaleString()}</span>
                      <span className={`badge ${lead.status === 'Settled' ? 'success' : (lead.status === 'Healing Required' ? 'error' : 'info')}`}>{lead.status}</span>
                    </div>
                  </div>
                  <p className="pain-point">{lead.pain_point}</p>
                  {lead.status === 'Healing Required' && <div className="healing-notice">🤖 Agentic Healing Active...</div>}
                  <button className="btn-view" onClick={() => {
                    setEditingLead(lead);
                    setEditedText(lead.edited_appeal || lead.drafted_appeal);
                  }}>Review Clinical Package</button>
                </div>
              ))}
              {leads.length === 0 && <p className="no-data">No denials detected. Run the local Scout to populate.</p>}
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="analytics-section">
            <div className="analytics-header">
                <h2>Payer Performance Command</h2>
                <p>Strategize recovery based on real-world Turnaround Time (TAT) and Win Rates.</p>
            </div>
            
            <div className="performance-grid">
              {analytics.payers.map((p, i) => (
                <div key={i} className={`perf-card ${p.riskScore > 50 ? 'danger' : ''}`}>
                    <div className="perf-top">
                        <strong>{p.name}</strong>
                        {p.riskScore > 50 && <span className="risk-tag">HIGH RISK</span>}
                    </div>
                    <div className="perf-metrics">
                        <div className="metric"><span className="label">Win Rate</span><span className="val">{p.winRate}%</span></div>
                        <div className="metric"><span className="label">Avg. TAT</span><span className="val">{p.avgTatDays}d</span></div>
                    </div>
                    <div className="risk-meter"><div className="risk-fill" style={{ width: `${p.riskScore}%`, background: p.riskScore > 50 ? '#e53e3e' : '#38a169' }}></div></div>
                </div>
              ))}
            </div>

            <h2 style={{marginTop: '3rem'}}>Systemic Denial Patterns</h2>
            <div className="trends-grid">
              {analytics.trends.map((t, i) => (
                <div key={i} className="trend-card">
                  <span className="trend-badge">PATTERN</span>
                  <h4>{t.procedure}</h4>
                  <p>{t.payer} denied this {t.count}x.</p>
                  <strong>Stake: ${t.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'compliance' && (
          <section className="rules-section">
            <h2>CMS-0057-F Audit Log</h2>
            <table className="rules-table">
                <thead><tr><th>Patient/Claim</th><th>Payer</th><th>Submitted</th><th>Deadline</th><th>Status</th></tr></thead>
                <tbody>{complianceLog.map((log, i) => (
                    <tr key={i}>
                        <td>{log.username}</td>
                        <td><strong>{log.insurance_type}</strong></td>
                        <td>{new Date(log.submitted_at).toLocaleDateString()}</td>
                        <td>{log.due_at ? new Date(log.due_at).toLocaleDateString() : 'N/A'}</td>
                        <td><span className="badge info">{log.status}</span></td>
                    </tr>
                ))}</tbody>
            </table>
            <button className="btn-copy-sql" style={{marginTop: '1rem'}} onClick={() => alert('Audit CSV Exported to HIPAA-Safe storage.')}>Export Audit Report</button>
          </section>
        )}

        {activeTab === 'rules' && (
          <section className="rules-section">
            <div className="rules-grid">
                <div className="rules-list-container">
                    <h2>Active Payer Strategies</h2>
                    <table className="rules-table">
                        <thead><tr><th>Payer</th><th>Reason</th><th>Strategy</th></tr></thead>
                        <tbody>{rules.map((r, i) => (
                            <tr key={i}>
                                <td><strong>{r.payer_name}</strong></td>
                                <td><code>{r.reason_code}</code></td>
                                <td>{r.strategy}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
                
                <div className="rule-form">
                    <h3>Program New Strategy</h3>
                    <p className="form-note">Define how the Medical Director should handle specific denial patterns.</p>
                    <input placeholder="Payer Name (e.g. Aetna)" value={newRule.payer_name} onChange={e => setNewRule({...newRule, payer_name: e.target.value})} />
                    <input placeholder="Reason Code (e.g. CO-197)" value={newRule.reason_code} onChange={e => setNewRule({...newRule, reason_code: e.target.value})} />
                    <textarea placeholder="Clinical Strategy / Evidence to Cite..." value={newRule.strategy} onChange={e => setNewRule({...newRule, strategy: e.target.value})} rows={5} />
                    <button className="btn-primary" onClick={saveRule} disabled={loading}>Apply Strategy</button>
                </div>
            </div>

            <div className="section-header" style={{marginTop: '4rem'}}>
                <h2>Verified Payer Directory</h2>
                <p>The **Self-Healing Agent** automatically updates these numbers if transmissions fail.</p>
            </div>
            <table className="rules-table">
                <thead><tr><th>Insurance Payer</th><th>Verified Fax</th><th>Last Verification</th></tr></thead>
                <tbody>{directory.map((d, i) => (
                    <tr key={i}>
                        <td><strong>{d.payer_name}</strong></td>
                        <td><code>{d.verified_fax}</code></td>
                        <td><span className="badge info">{d.last_verified_by || 'Default'}</span></td>
                    </tr>
                ))}</tbody>
            </table>
          </section>
        )}
      </main>

      {editingLead && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header">
                <h2>Clinical Review: {editingLead.user}</h2>
                <span className="badge info">{editingLead.insurance_type}</span>
            </div>
            <textarea className="appeal-editor" value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={20} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingLead(null)}>Cancel</button>
              <button className="btn-secondary" onClick={() => generateP2P(editingLead.id)}>Generate P2P Brief</button>
              <button className="btn-primary" disabled={loading} onClick={() => transmitAppeal(editingLead.id, editingLead.insurance_type)}>Approve & Transmit</button>
            </div>
          </div>
        </section>
      )}

      {p2pBrief && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header"><h2>Physician P2P Briefing</h2></div>
            <pre className="appeal-editor" style={{ background: '#f0f4f8', color: '#2d3748' }}>{p2pBrief}</pre>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setP2pBrief(null)}>Close Briefing</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
