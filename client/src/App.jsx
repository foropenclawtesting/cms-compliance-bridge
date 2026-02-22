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
  const [editingLead, setEditingLead] = useState(null);
  const [editedText, setEditedText] = useState('');

  const transmitAppeal = async (leadId, insurance) => {
    setLoading(true);
    // 1. Save the edited version first
    await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, appealText: editedText })
    });

    // 2. Transmit through Gateway
    const res = await fetch('/api/submit-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, insuranceName: insurance })
    });
    
    if (res.ok) {
        alert('Appeal Transmitted Successfully via Gateway.');
        setEditingLead(null);
        fetchData();
    }
    setLoading(false);
  };
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    try {
        const [l, a, v, d, h] = await Promise.all([
            fetch('/api/leads', { headers }).then(res => res.json()),
            fetch('/api/analytics', { headers }).then(res => res.json()),
            fetch('/api/velocity', { headers }).then(res => res.json()),
            fetch('/api/directory', { headers }).then(res => res.json()),
            fetch('/api/health').then(res => res.json())
        ]);
        setLeads(Array.isArray(l) ? l : []);
        setAnalytics(a || { payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
        setVelocity(v || []);
        setDirectory(d || []);
        setHealth(h);
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const testConnection = async (target) => {
    setLoading(true);
    const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ target })
    });
    const data = await res.json();
    alert(`${target} Connection: ${data.status}\n${data.message || data.error}`);
    setLoading(false);
  };

  const transmitOmnibus = async (trend) => {
    if (!confirm(`Transmit Systemic Omnibus Appeal to ${trend.payer} Legal? This handles ${trend.count} denials.`)) return;
    setLoading(true);
    try {
        const genRes = await fetch('/api/generate-omnibus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ payer: trend.payer, procedure: trend.procedure, json: true })
        });
        const genData = await genRes.json();

        const subRes = await fetch('/api/submit-omnibus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ payer: trend.payer, procedure: trend.procedure, appealText: genData.text })
        });

        if (subRes.ok) {
            alert(`SUCCESS: Omnibus escalation transmitted to ${trend.payer}.`);
            fetchData();
        }
    } catch (err) { alert(`Error: ${err.message}`); }
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
                <strong>Database Sync Required:</strong> Missing columns detected. See DEPLOYMENT.md for the SQL migration.
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
                <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>Payer Directory</button>
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
          <div className="stat"><span className="label">Forecasted Win</span><span className="value info">${Math.round(analytics.forecast.totalPendingValue * 0.65).toLocaleString()}</span></div>
          <div className="stat"><span className="label">Recovered Amount</span><span className="value success">${totalRecovered.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Win Rate</span><span className="value success">65%</span></div>
        </div>
      </header>

      <main>
        {activeTab === 'leads' && (
          <section className="leads-list">
            <div className="grid">
              {leads.map((lead, i) => (
                <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''} ${lead.status === 'Settled' ? 'settled' : ''} ${lead.status === 'Healing Required' ? 'healing' : ''}`}>
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
                  {lead.status === 'Healing Required' && <div className="healing-notice">🤖 Agentic Healing: Correcting fax routing for {lead.insurance_type}...</div>}
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
            <h2>Systemic Denial Patterns</h2>
            <div className="trends-grid">
              {analytics.trends.map((t, i) => (
                <div key={i} className="trend-card">
                  <span className="trend-badge">PATTERN</span>
                  <h4>{t.procedure}</h4>
                  <p>{t.payer} denied this {t.count}x.</p>
                  <strong>Stake: ${t.value.toLocaleString()}</strong>
                  <button className="btn-escalate" disabled={loading} onClick={() => transmitOmnibus(t)}>Transmit Omnibus Appeal</button>
                </div>
              ))}
            </div>
            <h2 style={{marginTop: '3rem'}}>Payer Performance Benchmarks</h2>
            <table className="analytics-table">
                <thead><tr><th>Payer</th><th>Win Rate</th><th>Avg. TAT</th><th>Regulatory Risk</th></tr></thead>
                <tbody>{analytics.payers.map((p, i) => (
                    <tr key={i}>
                        <td>
                            <strong>{p.name}</strong>
                            {p.riskScore > 50 && <span className="risk-tag">HIGH RISK</span>}
                        </td>
                        <td>{p.winRate}%</td>
                        <td>{p.avgTatDays}d</td>
                        <td>
                            <div className="risk-meter">
                                <div className="risk-fill" style={{ width: `${p.riskScore}%`, background: p.riskScore > 50 ? '#e53e3e' : '#38a169' }}></div>
                            </div>
                        </td>
                    </tr>
                ))}</tbody>
            </table>
          </section>
        )}

        {activeTab === 'rules' && (
          <section className="rules-section">
            <div className="section-header">
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
            <textarea 
                className="appeal-editor" 
                value={editedText} 
                onChange={(e) => setEditedText(e.target.value)}
                rows={20} 
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingLead(null)}>Cancel</button>
              <button className="btn-primary" disabled={loading} onClick={() => transmitAppeal(editingLead.id, editingLead.insurance_type)}>Approve & Transmit</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
