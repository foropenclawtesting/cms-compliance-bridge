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
  const [rules, setRules] = useState([]);
  const [editingAppeal, setEditingAppeal] = useState(null);
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
    checkHealth();
  }, [session]);

  const checkHealth = async () => {
    try {
        const res = await fetch('/api/health');
        setHealth(await res.json());
    } catch (e) { console.error("Health check failed"); }
  };

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
        setLeads(Array.isArray(l) ? l : []);
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
      {health.checks.schema !== 'Synchronized' && (
        <div className="setup-banner">
            <span className="icon">⚠️</span>
            <div className="banner-content">
                <strong>Database Setup Required:</strong> Your Supabase schema is missing required columns (estimated_value, due_at, etc.). 
                <button className="btn-copy-sql" onClick={() => alert("Please copy the SQL from your terminal and run it in the Supabase SQL Editor.")}>View Migration SQL</button>
            </div>
        </div>
      )}

      <header>
        <div className="header-top">
            <div className="system-status">
                <span className={`status-dot ${health.checks.database === 'Connected' ? 'green' : 'red'}`}></span> DB: {health.checks.database}
                <span className="status-dot green"></span> FHIR: Active
            </div>
            <div className="nav-tabs">
                <button className={activeTab === 'leads' ? 'active' : ''} onClick={() => setActiveTab('leads')}>Denials</button>
                <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Revenue</button>
                <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>Payer Logic</button>
            </div>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
        
        <div className="hero-stats">
            <div className="hero-main">
                <h1>⚡ CMS Compliance Bridge</h1>
                <p>HIPAA-Compliant Revenue Recovery Engine</p>
            </div>
            <div className="velocity-widget">
                <span className="widget-label">Recovery Speed</span>
                <div className="mini-chart">
                    {velocity.map((v, i) => (
                        <div key={i} className="bar" style={{height: `${Math.min(100, (v.amount/10000)*100)}%`}}></div>
                    ))}
                </div>
            </div>
        </div>

        <div className="stats-bar">
          <div className="stat"><span className="label">Total Potential</span><span className="value">${analytics.forecast.totalPendingValue.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Forecasted Win</span><span className="value info">${analytics.forecast.weightedForecast.toLocaleString()}</span></div>
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
                      <span className="badge info">{lead.status}</span>
                    </div>
                    <div className="header-badges">
                      <span className="value-tag">${parseFloat(lead.estimated_value || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="pain-point">{lead.pain_point}</p>
                  <button className="btn-view" onClick={() => setEditingAppeal(lead.drafted_appeal)}>Review Clinical Package</button>
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
                </div>
              ))}
            </div>
            <h2 style={{marginTop: '3rem'}}>Payer Benchmarks</h2>
            <table className="analytics-table">
                <thead><tr><th>Payer</th><th>Win Rate</th><th>Avg. TAT</th></tr></thead>
                <tbody>{analytics.payers.map((p, i) => (
                    <tr key={i}><td><strong>{p.name}</strong></td><td>{p.winRate}%</td><td>{p.avgTatDays}d</td></tr>
                ))}</tbody>
            </table>
          </section>
        )}

        {activeTab === 'rules' && (
          <section className="rules-section">
            <h2>Payer Logic Configuration</h2>
            <table className="rules-table">
                <thead><tr><th>Payer</th><th>Reason</th><th>Strategy</th></tr></thead>
                <tbody>{rules.map((r, i) => (
                    <tr key={i}><td>{r.payer_name}</td><td><code>{r.reason_code}</code></td><td>{r.strategy.replace(/_/g, ' ')}</td></tr>
                ))}</tbody>
            </table>
          </section>
        )}
      </main>

      {editingAppeal && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header"><h2>Appeal Package Review</h2></div>
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
