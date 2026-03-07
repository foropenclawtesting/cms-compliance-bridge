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
  const [intelLibrary, setIntelLibrary] = useState([]);
  const [complianceLog, setComplianceLog] = useState([]);
  const [payerRules, setPayerRules] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [portals, setPortals] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [editingIdentity, setEditingIdentity] = useState(null);
  const [marketBench, setMarketBench] = useState({ globalWinRate: 84.2, topPayer: 'Aetna', bottomPayer: 'Cigna' });
  const [preAuthData, setPreAuthData] = useState({ payer: '', procedure: '', evidence: '' });
  const [preAuthResult, setPreAuthResult] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [editingPortal, setEditingPortal] = useState(null);
  const [warRoomChat, setWarRoomChat] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [editedText, setEditedText] = useState('');
  const [negotiation, setNegotiation] = useState(null);
  const [discoveryView, setDiscoveryView] = useState(null);
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
        const [l, a, h, c, map, r, p, i] = await Promise.all([
            fetch('/api/leads', { headers }).then(res => res.json()),
            fetch('/api/analytics', { headers }).then(res => res.json()),
            fetch('/api/health').then(res => res.json()),
            fetch('/api/compliance-log', { headers }).then(res => res.json()),
            fetch('/api/victory-heatmap', { headers }).then(res => res.json()),
            fetch('/api/rules', { headers }).then(res => res.json()),
            fetch('/api/portal-registry', { headers }).then(res => res.json()),
            fetch('/api/identity', { headers }).then(res => res.json())
        ]);
        setLeads(Array.isArray(l) ? l : []);
        setAnalytics(a || { payers: [], trends: [], rootCauses: [], forecast: { weightedForecast: 0, avgWinRate: 0, totalPendingValue: 0 } });
        setHealth(h);
        setComplianceLog(Array.isArray(c) ? c : []);
        setHeatmap(Array.isArray(map) ? map : []);
        setPayerRules(Array.isArray(r) ? r : []);
        setPortals(Array.isArray(p) ? p : []);
        setIdentities(Array.isArray(i) ? i : []);

        const { data: intel } = await supabase.from('clinical_intel').select('*');
        setIntelLibrary(intel || []);
    } catch (err) { console.error('Sync Error:', err); }
  };

  const saveIdentity = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(editingIdentity)
    });
    setEditingIdentity(null);
    fetchData();
    setLoading(false);
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

  const sendWarRoomMessage = async (e) => {
    e.preventDefault();
    const newMessages = [...warRoomChat.messages, { role: 'Physician', text: chatInput }];
    setWarRoomChat({ ...warRoomChat, messages: newMessages });
    setChatInput('');
    setLoading(true);
    
    const res = await fetch('/api/p2p-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId: editingLead.id, messages: newMessages })
    });
    const data = await res.json();
    setWarRoomChat({ ...warRoomChat, messages: [...newMessages, { role: 'Payer', text: data.text, tip: data.counter_move }] });
    setLoading(false);
  };

  const runPreAuthAudit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/pre-auth-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(preAuthData)
    });
    const data = await res.json();
    setPreAuthResult(data);
    setLoading(false);
  };

  const triggerAdvocacy = async (leadId) => {
    setLoading(true);
    const res = await fetch('/api/generate-patient-advocacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId })
    });
    const data = await res.json();
    alert("Advocacy Package Generated: " + data.summary);
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
  const violationCount = leads.filter(l => l.status === 'Discovery Phase' || l.status === 'CMS Escalated' || l.status === 'Escalated').length;

  const postToEHR = async (leadId, amount) => {
    setLoading(true);
    const res = await fetch('/api/writeback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, amount })
    });
    if (res.ok) {
        alert("Revenue Posted to Billing System.");
        fetchData();
    }
    setLoading(false);
  };

  return (
    <div className="dashboard">
      <header>
        {violationCount > 0 && (
            <div className="setup-banner">
                <strong>🚨 Enforcement Active:</strong> {violationCount} claims are currently in discovery or escalation phase.
            </div>
        )}
        <div className="header-top">
            <div className="system-status">
                <span className={`status-dot ${health.checks.database === 'Connected' ? 'green' : 'red'}`}></span> 
                <span>DB: {health.checks.database}</span>
                <span>FHIR: Active</span>
            </div>
            <div className="nav-tabs">
                {['leads', 'analytics', 'prevention', 'intel', 'strategy', 'portals', 'identity', 'compliance', 'system'].map(tab => (
                    <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
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
                    <h3>{lead.user || lead.username}</h3>
                    <span className="value-tag">${parseFloat(lead.estimated_value || 0).toLocaleString()}</span>
                  </div>
                  <p className="pain-point">{lead.pain_point}</p>
                  <div className="card-footer">
                    <span className="badge info">{lead.status}</span>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                        {lead.status === 'Settled' && !lead.submission_log?.includes('Revenue posted') && (
                            <button className="btn-view" style={{background: '#38a169', color: 'white'}} onClick={(e) => { e.stopPropagation(); postToEHR(lead.id, lead.recovered_amount); }}>Post Revenue</button>
                        )}
                        <button className="btn-view" onClick={() => {
                            setEditingLead(lead);
                            setEditedText(lead.edited_appeal || lead.drafted_appeal || '');
                        }}>Review Case</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'analytics' && (
          <section className="analytics-section">
            <div className="analytics-layout">
                <div className="main-analytics">
                    <h2>Global Victory Heatmap</h2>
                    <div className="performance-grid">
                        {heatmap.map((h, i) => (
                            <div key={i} className={`perf-card ${h.vulnerability === 'HIGH' ? 'success-border' : ''}`}>
                                <strong>{h.payer}</strong>
                                <div className="val">{h.win_rate}% Win</div>
                                <p className="form-note">{h.procedure}</p>
                            </div>
                        ))}
                    </div>

                    <h2 style={{marginTop: '3rem'}}>Regulatory Scorecard (CMS-0057-F Compliance)</h2>
                    <div className="grid">
                        {analytics.payers.map((p, i) => (
                            <div key={i} className="stat" style={{textAlign: 'left'}}>
                                <span className="label">{p.name}</span>
                                <div className="val" style={{color: p.compliance_score > 90 ? '#38a169' : '#e53e3e'}}>{p.avg_response_hours}h Resp</div>
                                <div className="meter-bg" style={{marginTop: '0.5rem'}}><div className="meter-fill" style={{width: `${p.compliance_score}%`, background: p.compliance_score > 90 ? '#38a169' : '#e53e3e'}}></div></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="side-analytics">
                    <h2>Network Benchmarks</h2>
                    <div className="rc-card" style={{borderLeft: '4px solid #3182ce', marginBottom: '1.5rem'}}>
                        <span className="label">Network Avg Win Rate</span>
                        <div className="val" style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#3182ce'}}>{marketBench.globalWinRate}%</div>
                        <p className="form-note">Your hospital is <b>+{ (analytics.forecast.avgWinRate - marketBench.globalWinRate).toFixed(1) }%</b> above market average.</p>
                    </div>
                    <div className="rc-card" style={{marginBottom: '1.5rem', background: '#ebf8ff'}}>
                        <span className="label" style={{color: '#2b6cb0'}}>HIVE MIND ALERT</span>
                        <p className="form-note" style={{marginTop: '0.5rem'}}>New winning strategy detected for <b>{marketBench.bottomPayer}</b>. Updated in Strategy tab.</p>
                    </div>
                    <h2>Systemic Patterns</h2>
                    {analytics.trends.map((t, i) => (
                        <div key={i} className="rc-card" style={{marginBottom: '1rem'}}>
                            <strong>{t.procedure}</strong>
                            <p>{t.payer}: {t.count} denials</p>
                        </div>
                    ))}
                </div>
            </div>
          </section>
        )}

        {activeTab === 'prevention' && (
            <section className="prevention-section">
                <div className="analytics-layout">
                    <div className="main-analytics">
                        <h2>Pre-Authorization Guard</h2>
                        <p className="form-note">Audit your clinical evidence against the Hive Mind <b>before</b> submission.</p>
                        
                        <form onSubmit={runPreAuthAudit} style={{marginTop: '1.5rem'}}>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                                <input className="appeal-editor" style={{height: '45px', margin: 0}} placeholder="Payer (e.g. UHC)" value={preAuthData.payer} onChange={e => setPreAuthData({...preAuthData, payer: e.target.value})} required />
                                <input className="appeal-editor" style={{height: '45px', margin: 0}} placeholder="Procedure (e.g. Immunotherapy)" value={preAuthData.procedure} onChange={e => setPreAuthData({...preAuthData, procedure: e.target.value})} required />
                            </div>
                            <textarea className="appeal-editor" placeholder="Paste clinical narrative / patient history here..." value={preAuthData.evidence} onChange={e => setPreAuthData({...preAuthData, evidence: e.target.value})} rows={8} required />
                            <button className="btn-primary" type="submit" disabled={loading}>Run Clinical Audit</button>
                        </form>
                    </div>
                    <div className="side-analytics">
                        <h2>Audit Result</h2>
                        {preAuthResult ? (
                            <div className={`rc-card ${preAuthResult.status === 'READY' ? 'success-border' : 'priority'}`}>
                                <div className="val" style={{color: preAuthResult.status === 'READY' ? '#38a169' : '#e53e3e'}}>{preAuthResult.score}% Integrity Score</div>
                                {preAuthResult.gaps.length > 0 && (
                                    <div style={{marginTop: '1rem'}}>
                                        <strong style={{fontSize: '0.7rem', textTransform: 'uppercase'}}>Identified Gaps:</strong>
                                        <ul style={{fontSize: '0.85rem', paddingLeft: '1rem', marginTop: '0.5rem'}}>
                                            {preAuthResult.gaps.map((g, i) => <li key={i}>{g}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : <p className="form-note">Submit evidence to identify clinical gaps.</p>}
                    </div>
                </div>
            </section>
        )}

        {activeTab === 'intel' && (
            <section className="intel-section">
                <h2>EviDex Clinical Library</h2>
                <div className="grid">
                    {intelLibrary.map((item, i) => (
                        <div key={i} className="card">
                            <h3>{item.title}</h3>
                            <p>{item.summary}</p>
                            <a href={item.url} target="_blank" className="status-link">Source Citation</a>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {activeTab === 'strategy' && (
            <section className="strategy-section">
                <div className="section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h2>Payer Clinical Strategy</h2>
                    <button className="btn-primary" onClick={() => setEditingRule({ payer_name: '', reason_code: 'All', strategy: '' })}>Add Rule</button>
                </div>
                <div className="grid">
                    {payerRules.map((rule, i) => (
                        <div key={i} className="card">
                            <h3>{rule.payer_name}</h3>
                            <span className="badge info">{rule.reason_code}</span>
                            <p className="pain-point" style={{marginTop: '1rem'}}>{rule.strategy}</p>
                            <button className="status-link" onClick={() => setEditingRule(rule)}>Edit Preference</button>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {activeTab === 'portals' && (
            <section className="portals-section">
                <div className="section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h2>Payer Portal Registry</h2>
                    <button className="btn-primary" onClick={() => setEditingPortal({ payer_name: '', portal_url: '', username: '', password: '' })}>Add Portal</button>
                </div>
                <div className="grid">
                    {portals.map((portal, i) => (
                        <div key={i} className="card">
                            <h3>{portal.payer_name}</h3>
                            <span className="badge success">PORTAL MONITORING: ACTIVE</span>
                            <button className="status-link" onClick={() => setEditingPortal(portal)}>Edit Credentials</button>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {activeTab === 'identity' && (
            <section className="identity-section">
                <div className="section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                    <h2>Clinical Identity Manager</h2>
                    <button className="btn-primary" onClick={() => setEditingIdentity({ physician_name: '', npi: '', title: '', signature_data: '' })}>Register Physician</button>
                </div>
                <div className="grid">
                    {identities.map((id, i) => (
                        <div key={i} className="card">
                            <h3>{id.physician_name}</h3>
                            <span className="badge info">NPI: {id.npi}</span>
                            <p className="pain-point" style={{marginTop: '1rem'}}>{id.title}</p>
                            <button className="status-link" onClick={() => setEditingIdentity(id)}>Update Credentials</button>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {activeTab === 'compliance' && (
            <section className="compliance-section">
                <h2>Regulatory Audit Log</h2>
                <div className="rc-card" style={{background: '#1a202c', color: '#cbd5e0', padding: '1rem'}}>
                    {complianceLog.map((log, i) => (
                        <div key={i} style={{marginBottom: '0.5rem', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem'}}>
                            <span style={{color: '#4fd1c5'}}>[{new Date(log.created_at).toLocaleTimeString()}]</span> {log.action || log.event_name}
                        </div>
                    ))}
                </div>
            </section>
        )}

        {activeTab === 'system' && (
            <section className="system-section">
                <h2>System Connectivity</h2>
                <div className="grid">
                    {Object.entries(health.checks).map(([key, val]) => (
                        <div key={key} className="stat">
                            <span className="label">{key.replace('_', ' ')}</span>
                            <span className={`value ${val === 'Connected' || val === 'Live' ? 'success' : 'info'}`}>{val}</span>
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
                <h2>Case Review: {editingLead.username}</h2>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <button className="btn-escalate" onClick={() => setWarRoomChat({ messages: [{ role: 'Payer', text: `Dr. Smith, this is ${editingLead.insurance_type}. We reviewed your request for ${editingLead.title}. Why shouldn't we require Step Therapy first?` }] })}>P2P War Room</button>
                    <button className="btn-escalate" style={{background: '#805ad5'}} onClick={() => runNegotiationSim(editingLead)}>Negotiation Sim</button>
                </div>
            </div>
            <textarea className="appeal-editor" value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={15} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingLead(null)}>Close</button>
              <button className="btn-secondary" onClick={() => triggerAdvocacy(editingLead.id)}>Patient Advocacy</button>
              <button className="btn-secondary" onClick={() => launchDiscovery(editingLead.id)}>Discovery Demand</button>
              <button className="btn-primary" onClick={() => transmitAppeal(editingLead.id, editingLead.insurance_type)}>Approve & Transmit</button>
            </div>
          </div>
        </section>
      )}

      {warRoomChat && (
        <section className="appeal-preview">
          <div className="modal-content" style={{ borderTop: '8px solid #c53030' }}>
            <div className="modal-header">
                <h2>P2P War Room: Clinical Combat Simulation</h2>
                <span className="badge priority">SIMULATION ACTIVE</span>
            </div>
            <div className="rc-card" style={{ height: '350px', overflowY: 'auto', background: '#f7fafc', padding: '1rem', marginTop: '1.5rem' }}>
                {warRoomChat.messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: '1rem', textAlign: m.role === 'Physician' ? 'right' : 'left' }}>
                        <strong style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: m.role === 'Physician' ? '#3182ce' : '#c53030' }}>{m.role}</strong>
                        <p style={{ background: m.role === 'Physician' ? '#ebf8ff' : '#fff5f5', padding: '0.75rem', borderRadius: '8px', display: 'inline-block', maxWidth: '80%', marginTop: '0.25rem' }}>{m.text}</p>
                        {m.tip && (
                            <div style={{ background: '#feebc8', color: '#7b341e', fontSize: '0.8rem', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem', textAlign: 'left' }}>
                                💡 <b>COUNTER-MOVE:</b> {m.tip}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <form onSubmit={sendWarRoomMessage} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input className="appeal-editor" style={{ height: '45px', margin: 0 }} placeholder="Practice your clinical defense..." value={chatInput} onChange={e => setChatInput(e.target.value)} required />
                <button className="btn-primary" type="submit" disabled={loading}>Speak</button>
            </form>
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button className="btn-secondary" onClick={() => setWarRoomChat(null)}>Exit War Room</button>
            </div>
          </div>
        </section>
      )}

      {negotiation && (
        <section className="appeal-preview">
          <div className="modal-content" style={{ borderTop: '8px solid #805ad5' }}>
            <h2>Strategic Masterstroke</h2>
            <div className="rc-card" style={{ background: '#faf5ff', border: '1px solid #d6bcfa' }}>
                <p><strong>Citation:</strong> {negotiation.masterstroke.winning_citation}</p>
                <p>{negotiation.masterstroke.rationale}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: '#805ad5' }} onClick={() => {
                  setEditedText(`${negotiation.masterstroke.winning_citation}\n\n${editedText}`);
                  setNegotiation(null);
              }}>Apply Citation</button>
              <button className="btn-secondary" onClick={() => setNegotiation(null)}>Dismiss</button>
            </div>
          </div>
        </section>
      )}

      {discoveryView && (
        <section className="appeal-preview">
          <div className="modal-content">
            <h2>Discovery Demand</h2>
            <pre className="appeal-editor" style={{ background: '#1a202c', color: '#cbd5e0' }}>{discoveryView}</pre>
            <button className="btn-primary" onClick={() => setDiscoveryView(null)}>Close</button>
          </div>
        </section>
      )}

      {editingRule && (
        <section className="appeal-preview">
          <div className="modal-content">
            <h2>{editingRule.id ? 'Edit' : 'Create'} Clinical Preference</h2>
            <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                await fetch('/api/rules', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify(editingRule)
                });
                setEditingRule(null);
                fetchData();
                setLoading(false);
            }}>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label className="label">Payer Name</label>
                        <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingRule.payer_name} onChange={e => setEditingRule({...editingRule, payer_name: e.target.value})} required />
                    </div>
                    <div style={{flex: 1}}>
                        <label className="label">Reason Code</label>
                        <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingRule.reason_code} onChange={e => setEditingRule({...editingRule, reason_code: e.target.value})} required />
                    </div>
                </div>
                <label className="label">Mandatory Defense Strategy / Citations</label>
                <textarea className="appeal-editor" value={editingRule.strategy} onChange={e => setEditingRule({...editingRule, strategy: e.target.value})} rows={5} required />
                <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setEditingRule(null)}>Cancel</button>
                    <button type="submit" className="btn-primary">Save Strategy</button>
                </div>
            </form>
          </div>
        </section>
      )}

      {editingPortal && (
        <section className="appeal-preview">
          <div className="modal-content">
            <h2>{editingPortal.id ? 'Edit' : 'Register'} Payer Portal</h2>
            <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                await fetch('/api/portal-registry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify(editingPortal)
                });
                setEditingPortal(null);
                fetchData();
                setLoading(false);
            }}>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label className="label">Payer / Portal Name</label>
                        <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingPortal.payer_name} onChange={e => setEditingPortal({...editingPortal, payer_name: e.target.value})} placeholder="e.g. UHC Availity" required />
                    </div>
                    <div style={{flex: 1}}>
                        <label className="label">Portal URL</label>
                        <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingPortal.portal_url} onChange={e => setEditingPortal({...editingPortal, portal_url: e.target.value})} placeholder="https://..." required />
                    </div>
                </div>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label className="label">Username</label>
                        <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingPortal.username} onChange={e => setEditingPortal({...editingPortal, username: e.target.value})} required />
                    </div>
                    <div style={{flex: 1}}>
                        <label className="label">Password</label>
                        <input className="appeal-editor" type="password" style={{margin: '0.5rem 0', height: '40px'}} value={editingPortal.password} onChange={e => setEditingPortal({...editingPortal, password: e.target.value})} required />
                    </div>
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setEditingPortal(null)}>Cancel</button>
                    <button type="submit" className="btn-primary">Register Portal</button>
                </div>
            </form>
          </div>
        </section>
      )}

      {editingIdentity && (
        <section className="appeal-preview">
          <div className="modal-content">
            <h2>{editingIdentity.id ? 'Edit' : 'Register'} Clinical Identity</h2>
            <form onSubmit={saveIdentity}>
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                    <div style={{flex: 1}}>
                        <label className="label">Physician Name</label>
                        <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingIdentity.physician_name} onChange={e => setEditingIdentity({...editingIdentity, physician_name: e.target.value})} required />
                    </div>
                    <div style={{flex: 1}}>
                        <label className="label">NPI Number</label>
                        <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingIdentity.npi} onChange={e => setEditingIdentity({...editingIdentity, npi: e.target.value})} required />
                    </div>
                </div>
                <label className="label">Official Title</label>
                <input className="appeal-editor" style={{margin: '0.5rem 0', height: '40px'}} value={editingIdentity.title} onChange={e => setEditingIdentity({...editingIdentity, title: e.target.value})} placeholder="e.g. Chief of Oncology" required />
                <label className="label">E-Signature Data (Base64)</label>
                <textarea className="appeal-editor" value={editingIdentity.signature_data} onChange={e => setEditingIdentity({...editingIdentity, signature_data: e.target.value})} rows={3} placeholder="Paste base64 signature image..." />
                <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setEditingIdentity(null)}>Cancel</button>
                    <button type="submit" className="btn-primary">Save Identity</button>
                </div>
            </form>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
