import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState({ payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
  const [rules, setRules] = useState([]);
  const [editingAppeal, setEditingAppeal] = useState(null);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    try {
        const [l, a, r] = await Promise.all([
            fetch('/api/leads', { headers }).then(res => res.json()),
            fetch('/api/analytics', { headers }).then(res => res.json()),
            fetch('/api/rules', { headers }).then(res => res.json())
        ]);
        setLeads(l || []);
        setAnalytics(a || { payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
        setRules(r || []);
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const saveRule = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
        payer_name: formData.get('payer'),
        reason_code: formData.get('code'),
        strategy: formData.get('strategy')
    };

    setLoading(true);
    const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
    });
    if(res.ok) {
        alert("Payer Rule updated.");
        fetchData();
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
    const res = await fetch('/api/generate-appeal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ leadId: lead.id })
    });
    const data = await res.json();
    setEditingAppeal(data.appeal);
    setEditingLeadId(lead.id);
    setLoading(false);
  };

  const calculateTimeLeft = (dueDate) => {
    if (!dueDate) return null;
    const diff = +new Date(dueDate) - +new Date();
    if (diff <= 0) return "EXPIRED";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return d > 0 ? `${d}d ${h}h` : `${h}h remaining`;
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

  return (
    <div className="dashboard">
      <header>
        <div className="header-top">
            <div className="user-pill">{session.user.email}</div>
            <div className="nav-tabs">
                <button className={activeTab === 'leads' ? 'active' : ''} onClick={() => setActiveTab('leads')}>Denials</button>
                <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Analytics</button>
                <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>Rules Engine</button>
            </div>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
        <h1>⚡ CMS Compliance Bridge</h1>
        <div className="stats-bar">
          <div className="stat"><span className="label">Recoverable</span><span className="value">${analytics.forecast.totalPendingValue.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Forecasted</span><span className="value info">${analytics.forecast.weightedForecast.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Win Rate</span><span className="value success">{analytics.forecast.avgWinRate}%</span></div>
        </div>
      </header>

      <main>
        {activeTab === 'leads' && (
          <section className="leads-list">
            <div className="grid">
              {leads.map((lead, i) => (
                <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''} ${lead.status === 'Settled' ? 'settled' : ''}`}>
                  <div className="card-header">
                    <div className="title-group">
                      <h3>{lead.user}</h3>
                      {lead.due_at && <span className="deadline">⌛ {calculateTimeLeft(lead.due_at)}</span>}
                    </div>
                    <div className="header-badges">
                      <span className="value-tag">${parseFloat(lead.estimated_value).toLocaleString()}</span>
                      <span className={`badge ${lead.status === 'Settled' ? 'success' : 'info'}`}>{lead.status}</span>
                    </div>
                  </div>
                  <p className="pain-point">{lead.pain_point}</p>
                  <div className="card-actions">
                    <button className="btn-view" onClick={() => generateAppeal(lead)}>Review Package</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="analytics-section">
            <h2>Systemic Denial Trends</h2>
            <div className="trends-grid">
              {analytics.trends.map((t, i) => (
                <div key={i} className="trend-card">
                  <span className="trend-badge">TREND</span>
                  <h4>{t.procedure}</h4>
                  <p>{t.payer} denial pattern detected ({t.count}x)</p>
                  <strong>Impact: ${t.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <h2 style={{marginTop: '3rem'}}>Payer Performance</h2>
            <table className="analytics-table">
                <thead><tr><th>Payer</th><th>Win Rate</th><th>Avg. TAT</th><th>Recovered</th></tr></thead>
                <tbody>{analytics.payers.map((p, i) => (
                    <tr key={i}><td>{p.name}</td><td>{p.winRate}%</td><td>{p.avgTatDays}d</td><td className="success">${(p.wins * (p.totalValue/p.count)).toLocaleString()}</td></tr>
                ))}</tbody>
            </table>
          </section>
        )}

        {activeTab === 'rules' && (
          <section className="rules-section">
            <h2>Programmable Strategy Engine</h2>
            <div className="rules-container">
                <form className="add-rule-form" onSubmit={saveRule}>
                    <input name="payer" placeholder="Payer (e.g. Cigna or *)" required />
                    <input name="code" placeholder="Reason Code" required />
                    <select name="strategy">
                        <option value="CLINICAL_PEER_REVIEW">Clinical Peer Review</option>
                        <option value="REGULATORY_TIMING_STRIKE">Regulatory Timing Strike</option>
                        <option value="TREATMENT_FAILURE_LOG">Treatment Failure Log</option>
                        <option value="NPI_VERIFICATION_AUDIT">NPI Verification Audit</option>
                    </select>
                    <button type="submit" disabled={loading}>Add Rule</button>
                </form>
                <table className="rules-table">
                    <thead><tr><th>Payer</th><th>Code</th><th>Applied Strategy</th></tr></thead>
                    <tbody>{rules.map((r, i) => (
                        <tr key={i}><td>{r.payer_name}</td><td><code>{r.reason_code}</code></td><td>{r.strategy.replace(/_/g, ' ')}</td></tr>
                    ))}</tbody>
                </table>
            </div>
          </section>
        )}
      </main>

      {editingAppeal && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header"><h2>Refine Appeal</h2><span>Lead: {editingLeadId}</span></div>
            <textarea className="appeal-editor" value={editingAppeal} onChange={(e) => setEditingAppeal(e.target.value)} rows={20} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingAppeal(null)}>Close</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
