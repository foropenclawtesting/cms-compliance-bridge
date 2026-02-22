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
  const [velocity, setVelocity] = useState([]);
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
        const [l, a, r, v] = await Promise.all([
            fetch('/api/leads', { headers }).then(res => res.json()),
            fetch('/api/analytics', { headers }).then(res => res.json()),
            fetch('/api/rules', { headers }).then(res => res.json()),
            fetch('/api/velocity', { headers }).then(res => res.json())
        ]);
        setLeads(l || []);
        setAnalytics(a || { payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
        setRules(r || []);
        setVelocity(v || []);
    } catch (err) { console.error(err); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
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
            <div className="system-status">
                <span className="status-dot green"></span> FHIR: Epic Sandbox (Active)
                <span className="status-dot green"></span> GATEWAY: Phaxio (Online)
            </div>
            <div className="nav-tabs">
                <button className={activeTab === 'leads' ? 'active' : ''} onClick={() => setActiveTab('leads')}>Active Denials</button>
                <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Revenue Strategy</button>
                <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>Payer Rules</button>
            </div>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
        
        <div className="hero-stats">
            <div className="hero-main">
                <h1>⚡ CMS Compliance Bridge</h1>
                <p>HIPAA-Compliant Revenue Recovery Operations</p>
            </div>
            <div className="velocity-widget">
                <span className="widget-label">Recovery Velocity (7d)</span>
                <div className="mini-chart">
                    {velocity.map((v, i) => (
                        <div key={i} className="bar" style={{height: `${Math.min(100, (v.amount/10000)*100)}%`}} title={`${v.date}: $${v.amount}`}></div>
                    ))}
                </div>
            </div>
        </div>

        <div className="stats-bar">
          <div className="stat"><span className="label">Potential Recovery</span><span className="value">${analytics.forecast.totalPendingValue.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Forecasted Win</span><span className="value info">${analytics.forecast.weightedForecast.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Recovered Amount</span><span className="value success">${(leads.filter(l => l.status === 'Settled').reduce((s, l) => s + (parseFloat(l.recovered_amount) || 0), 0)).toLocaleString()}</span></div>
          <div className="stat"><span className="label">Win Rate</span><span className="value success">{analytics.forecast.avgWinRate}%</span></div>
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
                      {lead.due_at && <span className="deadline">⌛ {calculateTimeLeft(lead.due_at)}</span>}
                    </div>
                    <div className="header-badges">
                      <span className="value-tag">${parseFloat(lead.estimated_value).toLocaleString()}</span>
                      <span className={`badge ${lead.status === 'Settled' ? 'success' : (lead.status === 'Healing Required' ? 'error' : 'info')}`}>{lead.status}</span>
                    </div>
                  </div>
                  <p className="pain-point">{lead.pain_point}</p>
                  {lead.status === 'Healing Required' && <div className="healing-notice">🤖 Agentic Self-Healing Active: Correcting fax routing...</div>}
                  <div className="card-actions">
                    <button className="btn-view" onClick={() => { setEditingAppeal(lead.edited_appeal || lead.drafted_appeal); setEditingLeadId(lead.id); }}>Review Package</button>
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
                  <span className="trend-badge">⚠️ SYSTEMIC PATTERN</span>
                  <h4>{t.procedure}</h4>
                  <p>{t.payer} denial cluster detected ({t.count}x)</p>
                  <strong>Total Stake: ${t.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <h2 style={{marginTop: '3rem'}}>Payer Performance Benchmarks</h2>
            <table className="analytics-table">
                <thead><tr><th>Payer</th><th>Win Rate</th><th>Avg. TAT</th><th>Recovery Action</th></tr></thead>
                <tbody>{analytics.payers.map((p, i) => (
                    <tr key={i}><td><strong>{p.name}</strong></td><td>{p.winRate}%</td><td>{p.avgTatDays}d</td><td className="success"><strong>{p.bestStrategy.replace(/_/g, ' ')}</strong></td></tr>
                ))}</tbody>
            </table>
          </section>
        )}

        {activeTab === 'rules' && (
          <section className="rules-section">
            <h2>Payer Logic Configuration</h2>
            <div className="rules-container">
                <table className="rules-table">
                    <thead><tr><th>Payer</th><th>Reason Code</th><th>Clinical Strategy</th></tr></thead>
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
            <div className="modal-header"><h2>Refine Appeal Package</h2><span>ID: {editingLeadId}</span></div>
            <textarea className="appeal-editor" value={editingAppeal} readOnly rows={20} />
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
