import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('leads');
  const [health, setHealth] = useState({ status: 'Checking...', checks: { database: '...', fhir_gateway: '...', fax_gateway: '...', schema: '...' } });
  const [leads, setLeads] = useState([]);
  const [analytics, setAnalytics] = useState({ payers: [], trends: [], rootCauses: [], forecast: { weightedForecast: 0, avgWinRate: 0, totalPendingValue: 0 } });
  const [velocity, setVelocity] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [intelLibrary, setIntelLibrary] = useState([]);
  const [complianceLog, setComplianceLog] = useState([]);
  const [editingLead, setEditingLead] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [p2pBrief, setP2pBrief] = useState(null);
  const [complaintView, setComplaintView] = useState(null);
  const [discoveryView, setDiscoveryView] = useState(null);
  const [negotiation, setNegotiation] = useState(null);
  const [networkIntel, setNetworkIntel] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simChat, setSimChat] = useState([]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const [heatmap, setHeatmap] = useState([]);

  const fetchHeatmap = async () => {
    const res = await fetch('/api/victory-heatmap', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
    const data = await res.json();
    setHeatmap(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    if (session) {
        fetchData();
        fetchHeatmap();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }
  }, [session]);

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
        setAnalytics(a || { payers: [], trends: [], rootCauses: [], forecast: { weightedForecast: 0, avgWinRate: 0, totalPendingValue: 0 } });
        setVelocity(v || []);
        setDirectory(d || []);
        setHealth(h);
        setComplianceLog(Array.isArray(c) ? c : []);

        const { data: intel } = await supabase.from('clinical_intel').select('*');
        setIntelLibrary(intel || []);
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
        alert('Appeal Transmitted.');
        setEditingLead(null);
        fetchData();
    }
    setLoading(false);
  };

  const runNegotiationSim = async (lead) => {
    setLoading(true);
    const res = await fetch('/api/negotiation-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId: lead.id, payer: lead.insurance_type, procedure: lead.title })
    });
    const data = await res.json();
    setNegotiation(data);
    setLoading(false);
  };

  const launchDiscovery = async (leadId) => {
    setLoading(true);
    const res = await fetch('/api/generate-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId })
    });
    const data = await res.json();
    setDiscoveryView(data.discoveryText);
    setLoading(false);
    fetchData();
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
  const violationCount = leads.filter(l => l.status === 'Discovery Phase' || l.status === 'CMS Escalated').length;

  return (
    <div className="dashboard">
      {violationCount > 0 && (
        <div className="setup-banner" style={{ background: '#fff5f5', border: '1px solid #feb2b2', color: '#c53030', marginBottom: '2rem' }}>
            <span className="icon">🚨</span>
            <div className="banner-content">
                <strong>Enforcement Protocol Active:</strong> {violationCount} claims are currently in discovery or escalation phase. Monitor the Compliance tab for stonewalling detection.
            </div>
        </div>
      )}
        <div className="header-top">
            <div className="system-status">
                <span className={`status-dot ${health.checks.database === 'Connected' ? 'green' : 'red'}`}></span> 
                <button className="status-link">FHIR: Active</button>
                <button className="status-link">GATEWAY: Live</button>
            </div>
            <div className="nav-tabs">
                <button className={activeTab === 'leads' ? 'active' : ''} onClick={() => setActiveTab('leads')}>Denials</button>
                <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Intelligence</button>
                <button className={activeTab === 'intel' ? 'active' : ''} onClick={() => setActiveTab('intel')}>Intel Library</button>
                <button className={activeTab === 'compliance' ? 'active' : ''} onClick={() => setActiveTab('compliance')}>Compliance</button>
                <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>System</button>
            </div>
            <button className="btn-logout" onClick={() => supabase.auth.signOut()}>Logout</button>
        </div>
        
        <div className="stats-bar">
          <div className="stat"><span className="label">Potential</span><span className="value">${analytics.forecast.totalPendingValue.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Forecast</span><span className="value info">${analytics.forecast.weightedForecast.toLocaleString()}</span></div>
          <div className="stat"><span className="label">Recovered</span><span className="value success">${totalRecovered.toLocaleString()}</span></div>
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
                    <h3>{lead.user}</h3>
                    <span className="value-tag">${parseFloat(lead.estimated_value || 0).toLocaleString()}</span>
                  </div>
                  <p className="pain-point">{lead.pain_point}</p>
                  <button className="btn-view" onClick={() => {
                    setEditingLead(lead);
                    setEditedText(lead.edited_appeal || lead.drafted_appeal);
                  }}>Review Clinical Package</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="analytics-section">
            <div className="analytics-layout">
                <div className="main-analytics">
                    <h2>Network Victory Heatmap</h2>
                    <p className="form-note">Real-time approval trends across 45+ hospitals. Target <b>High Vulnerability</b> payers first.</p>
                    <div className="performance-grid" style={{marginTop: '1.5rem'}}>
                        {heatmap.map((h, i) => (
                            <div key={i} className={`perf-card ${h.vulnerability === 'HIGH' ? 'success-border' : ''}`}>
                                <div className="perf-top">
                                    <strong>{h.payer}</strong>
                                    <span className={`badge ${h.vulnerability === 'HIGH' ? 'success' : 'info'}`}>{h.vulnerability}</span>
                                </div>
                                <div className="val" style={{color: h.vulnerability === 'HIGH' ? '#38a169' : '#2d3748'}}>{h.win_rate}% Win</div>
                                <p className="form-note">{h.procedure}</p>
                            </div>
                        ))}
                    </div>

                    <h2 style={{marginTop: '3rem'}}>Systemic Pattern Detection</h2>
            <div className="trends-grid">
              {analytics.trends.map((t, i) => (
                <div key={i} className="trend-card">
                  <h4>{t.procedure}</h4>
                  <p>{t.payer} denied this {t.count}x.</p>
                  <strong>Stake: ${t.value.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {editingLead && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header">
                <h2>Clinical Review: {editingLead.user}</h2>
                <button className="btn-escalate" onClick={() => runNegotiationSim(editingLead)}>Strategic Simulation</button>
            </div>
            <textarea className="appeal-editor" value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={20} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingLead(null)}>Cancel</button>
              <button className="btn-secondary" onClick={() => launchDiscovery(editingLead.id)}>Litigation Discovery</button>
              <button className="btn-primary" onClick={() => transmitAppeal(editingLead.id, editingLead.insurance_type)}>Approve & Transmit</button>
            </div>
          </div>
        </section>
      )}

      {negotiation && (
        <section className="appeal-preview">
          <div className="modal-content" style={{ borderTop: '8px solid #805ad5' }}>
            <h2>Strategic Masterstroke</h2>
            <div className="rc-card" style={{ background: '#faf5ff', border: '1px solid #d6bcfa' }}>
                <p><strong>Winning Move:</strong> {negotiation.masterstroke.winning_citation}</p>
                <p>{negotiation.masterstroke.rationale}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: '#805ad5' }} onClick={() => {
                  setEditedText(`${negotiation.masterstroke.winning_citation}\n\n${editedText}`);
                  setNegotiation(null);
              }}>Apply to Appeal</button>
              <button className="btn-secondary" onClick={() => setNegotiation(null)}>Close</button>
            </div>
          </div>
        </section>
      )}

      {discoveryView && (
        <section className="appeal-preview">
          <div className="modal-content">
            <h2>Litigation Discovery Demand</h2>
            <pre className="appeal-editor" style={{ background: '#1a202c', color: '#cbd5e0' }}>{discoveryView}</pre>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setDiscoveryView(null)}>Close & Log</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
