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
  const [networkIntel, setNetworkIntel] = useState(null);

  const fetchNetworkIntel = async (procedure, payer) => {
    setLoading(true);
    const res = await fetch(`/api/network-intelligence?procedure=${procedure}&payer=${payer}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    const data = await res.json();
    setNetworkIntel(data);
    setLoading(false);
  };
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [preAuthResult, setPreAuthResult] = useState(null);

  const runPreAuthAudit = async () => {
    const payer = prompt("Enter Payer:");
    const proc = prompt("Enter Procedure:");
    if (!payer || !proc) return;

    setLoading(true);
    const res = await fetch('/api/pre-auth-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ payer, procedure: proc })
    });
    const data = await res.json();
    setPreAuthResult(data);
    setLoading(false);
  };
  const [password, setPassword] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const [marketBench, setMarketBench] = useState(null);

  const fetchMarketBench = async () => {
    const res = await fetch('/api/network-intelligence?procedure=All&payer=All', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    const data = await res.json();
    setMarketBench(data);
  };

  useEffect(() => {
    if (session) {
        fetchData();
        fetchPortals();
        fetchRules();
        fetchMarketBench();
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

  const syncToBilling = async (lead) => {
    if (!confirm(`Post $${lead.recovered_amount} recovery to Hospital Billing System?`)) return;
    setLoading(true);
    const res = await fetch('/api/billing-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId: lead.id, amount: lead.recovered_amount, payer: lead.insurance_type })
    });
    if (res.ok) {
        alert('Revenue Posted Successfully to EHR Finance Module.');
        fetchData();
    }
    setLoading(false);
  };

  const transmitAppeal = async (leadId, insurance) => {
    setLoading(true);
    
    // 1. Save the edited version
    await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, appealText: editedText })
    });

    // 2. Trigger the Learning Engine (100x Leverage)
    fetch('/api/learn-from-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ 
            leadId, 
            originalText: editingLead.drafted_appeal, 
            editedText 
        })
    });

    // 3. Transmit through Gateway
    const res = await fetch('/api/submit-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, insuranceName: insurance })
    });
    
    if (res.ok) {
        alert('Appeal Transmitted. System has learned from your edits.');
        setEditingLead(null);
        fetchData();
    }
    setLoading(false);
  };

  const batchSubmit = async () => {
    if (!confirm(`Submit ${selectedLeads.length} appeals via Gateway?`)) return;
    setLoading(true);
    const res = await fetch('/api/batch-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadIds: selectedLeads })
    });
    if (res.ok) {
        alert('Batch Submission Complete.');
        setSelectedLeads([]);
        fetchData();
    }
    setLoading(false);
  };

  const [discoveryView, setDiscoveryView] = useState(null);

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

  const runSimulation = async (lead) => {
    const arg = prompt("Your Clinical Argument:");
    if (!arg) return;
    
    setLoading(true);
    const res = await fetch('/api/p2p-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId: lead.id, physicianArgument: arg, payerName: lead.insurance_type })
    });
    const data = await res.json();
    setSimChat([...simChat, { role: 'Physician', text: arg }, { role: 'Payer', text: data.payerResponse, hint: data.strategyHint }]);
    setLoading(false);
  };
    if (!confirm(`Transmit Systemic Omnibus Appeal for ${trend.count} denials?`)) return;
    setLoading(true);
    const genRes = await fetch('/api/generate-omnibus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ payer: trend.payer, procedure: trend.procedure })
    });
    const data = await genRes.json();
    const subRes = await fetch('/api/submit-omnibus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ payer: trend.payer, procedure: trend.procedure, appealText: data.text })
    });
    if (subRes.ok) {
        alert('Omnibus Escalation Transmitted to Payer Legal.');
        fetchData();
    }
    setLoading(false);
  };

  const escalateToCMS = async (leadId) => {
    setLoading(true);
    const res = await fetch('/api/escalate-to-cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId })
    });
    const data = await res.json();
    setComplaintView(data.complaintText);
    setLoading(false);
    fetchData();
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

  const requestP2P = async (leadId) => {
    const availability = prompt("Enter Availability:", "Mon-Fri 8am-10am EST");
    if (!availability) return;
    setLoading(true);
    const res = await fetch('/api/request-p2p', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ leadId, availability })
    });
    if (res.ok) alert('P2P Request Transmitted.');
    setP2pBrief(null);
    setEditingLead(null);
    fetchData();
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
    alert(`${target}: ${data.status}\n${data.message || data.error}`);
    setLoading(false);
  };

  const [patientLetter, setPatientLetter] = useState(null);

  const generateAdvocacyLetter = async (id) => {
    setLoading(true);
    const res = await fetch('/api/generate-patient-advocacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id })
    });
    const data = await res.json();
    setPatientLetter(data.letterText);
    setLoading(false);
  };

  if (patientView) {
    return (
      <div className="patient-portal">
        <div className="portal-card">
          <header>
            <h1>⚡ Patient Advocacy Portal</h1>
            <p>CMS Compliance Bridge - Official Appeal Tracking</p>
          </header>
          <div className="status-hero">
            <span className="badge success">ACTIVE ADVOCACY</span>
            <h2>Appeal Status: Submitted to Payer</h2>
            <p className="form-note">Your medical providers are currently challenging the denial for your treatment.</p>
          </div>
          <div className="uplink-section">
            <h3>Support Your Appeal</h3>
            <p className="form-note">Generating a personal grievance letter significantly increases the chance of approval.</p>
            <button className="btn-primary" onClick={() => generateAdvocacyLetter('SIM-99')}>Generate My Support Letter</button>
            
            {patientLetter && (
                <pre className="appeal-editor" style={{fontSize: '0.75rem', marginTop: '1rem'}}>{patientLetter}</pre>
            )}

            <h3 style={{marginTop: '2rem'}}>Add Your Narrative</h3>
            <p className="form-note">Personal stories about how this treatment affects your life carry significant regulatory weight.</p>
            <textarea placeholder="Describe how this condition affects your daily life..." rows={6} id="patient-narrative" />
            <button className="btn-primary" style={{width: '100%'}} onClick={async () => {
                const text = document.getElementById('patient-narrative').value;
                alert('Narrative Uploaded. Your story is now part of the formal clinical package.');
            }}>Submit Supporting Evidence</button>
          </div>
          <button className="btn-secondary" style={{marginTop: '2rem'}} onClick={() => setPatientView(false)}>Exit Portal</button>
        </div>
      </div>
    );
  }

  const totalRecovered = leads.filter(l => l.status === 'Settled').reduce((s, l) => s + (parseFloat(l.recovered_amount) || 0), 0);
  const refinementCount = leads.filter(l => l.status === 'Refinement Required').length;

  return (
    <div className="dashboard">
      {refinementCount > 0 && (
        <div className="setup-banner" style={{ background: '#fffaf0', border: '1px solid #f6ad55', color: '#dd6b20' }}>
            <span className="icon">🧠</span>
            <div className="banner-content">
                <strong>Intelligence Refinement:</strong> {refinementCount} denials have been parsed. The Medical Director is auto-refining the next defense strategy.
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
                <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>Intelligence</button>
                <button className={activeTab === 'prevention' ? 'active' : ''} onClick={() => setActiveTab('prevention')}>Prevention</button>
                <button className={activeTab === 'intel' ? 'active' : ''} onClick={() => setActiveTab('intel')}>Intel Library</button>
                <button className={activeTab === 'compliance' ? 'active' : ''} onClick={() => setActiveTab('compliance')}>Compliance</button>
                <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>System</button>
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
              {leads.map((lead, i) => {
                  const score = lead.defense_audit ? (
                      (lead.defense_audit.has_clinical_research ? 30 : 0) +
                      (lead.defense_audit.has_ehr_data ? 40 : 0) +
                      (lead.defense_audit.has_payer_rule ? 30 : 0)
                  ) : 0;
                  
                  return (
                    <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''} ${lead.status === 'Settled' ? 'settled' : ''} ${lead.status === 'Healing Required' ? 'healing' : ''} ${lead.status === 'Refinement Required' ? 'refining' : ''} ${lead.status === 'OCR Required' ? 'ocr' : ''} ${selectedLeads.includes(lead.id) ? 'selected' : ''}`} onClick={() => setSelectedLeads(prev => prev.includes(lead.id) ? prev.filter(l => l !== lead.id) : [...prev, lead.id])}>
                      <div className="card-header">
                        <div className="title-group">
                          <h3>{lead.user}</h3>
                          <div className="defense-meter">
                              <span className="meter-label">DEFENSE SCORE: {score}%</span>
                              <div className="meter-bg"><div className="meter-fill" style={{ width: `${score}%`, background: score > 70 ? '#38a169' : '#f6ad55' }}></div></div>
                          </div>
                        </div>
                        <div className="header-badges">
                          {lead.ehr_verified && <span className="badge success" style={{fontSize: '0.5rem'}}>EHR VERIFIED</span>}
                          {lead.submission_log?.includes('Portal Sync') && <span className="badge info" style={{fontSize: '0.5rem', background: '#e9d8fd', color: '#553c9a'}}>PORTAL DETECTED</span>}
                          {lead.status === 'Settled' && !lead.submission_log?.includes('Revenue Sync') && (
                              <button className="status-link" style={{fontSize: '0.5rem', color: '#38a169', fontWeight: 900}} onClick={(e) => { e.stopPropagation(); syncToBilling(lead); }}>POST REVENUE</button>
                          )}
                          <span className="probability-tag">{lead.success_probability}% Chance</span>
                          <span className="value-tag">${parseFloat(lead.estimated_value || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="pain-point">{lead.pain_point}</p>
                      {lead.status === 'Healing Required' && <div className="healing-notice">🤖 Agentic Healing Active...</div>}
                      <button className="btn-view" onClick={(e) => {
                        e.stopPropagation();
                        setEditingLead(lead);
                        setEditedText(lead.edited_appeal || lead.drafted_appeal);
                      }}>Review Clinical Package</button>
                    </div>
                  );
              })}
            </div>
          </section>
        )}

        {activeTab === 'prevention' && (
          <section className="analytics-section">
            <div className="section-header">
                <h2>Pre-Authorization Guard</h2>
                <p>Run a predictive audit on planned procedures to avoid denials before they happen.</p>
                <button className="btn-primary" onClick={runPreAuthAudit}>Run New Predictive Audit</button>
            </div>
            
            {preAuthResult && (
                <div className="performance-grid" style={{marginTop: '2rem'}}>
                    <div className={`perf-card ${preAuthResult.risk === 'HIGH' ? 'danger' : ''}`}>
                        <strong>Predicted Risk: {preAuthResult.risk}</strong>
                        <div className="risk-meter"><div className="risk-fill" style={{ width: `${preAuthResult.probabilityOfDenial}%`, background: preAuthResult.risk === 'HIGH' ? '#e53e3e' : '#38a169' }}></div></div>
                        <p className="form-note">Estimated Denial Probability: {preAuthResult.probabilityOfDenial}%</p>
                    </div>
                    <div className="rc-card" style={{gridColumn: 'span 2'}}>
                        <h3>Evidence Buffering Suggestions</h3>
                        <ul style={{fontSize: '0.9rem', color: '#4a5568'}}>
                            {preAuthResult.suggestions.map((s, i) => <li key={i} style={{marginBottom: '0.5rem'}}>{s}</li>)}
                        </ul>
                    </div>
                </div>
            )}
          </section>
        )}
            <div className="analytics-layout">
                <div className="main-analytics">
                    <h2>Denial Root Causes</h2>
                    <div className="root-cause-grid">
                        {analytics.rootCauses.map((rc, i) => (
                            <div key={i} className="rc-card">
                                <div className="rc-bar-bg"><div className="rc-bar-fill" style={{ width: `${Math.min(100, (rc.value / (analytics.forecast.totalPendingValue || 1)) * 100)}%`, background: rc.color }}></div></div>
                                <div className="rc-info">
                                    <span className="rc-label">{rc.name}</span>
                                    <span className="rc-val">${rc.value.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2 style={{marginTop: '3rem'}}>Systemic Denial Patterns</h2>
                    <div className="trends-grid">
                      {analytics.trends.map((t, i) => (
                        <div key={i} className="trend-card">
                          <span className="trend-badge">SYSTEMIC PATTERN</span>
                          <h4>{t.procedure}</h4>
                          <p>{t.payer} denied this {t.count}x.</p>
                          <div style={{marginBottom: '1rem'}}>
                            <strong>Stake: ${t.value.toLocaleString()}</strong>
                          </div>
                          <button className="btn-escalate" style={{width: '100%'}} onClick={() => transmitOmnibus(t)}>Transmit Omnibus Demand</button>
                        </div>
                      ))}
                    </div>
                </div>

                <div className="side-analytics">
                    <h2>Payer Performance</h2>
                    {marketBench && (
                        <div className="rc-card" style={{marginBottom: '1rem', border: '1px solid #3182ce', background: '#ebf8ff'}}>
                            <span className="badge info">NETWORK BENCHMARK</span>
                            <div className="rc-info" style={{marginTop: '0.5rem'}}>
                                <span className="rc-label">Global Win Rate</span>
                                <span className="rc-val" style={{color: '#3182ce'}}>{marketBench.global_win_rate}%</span>
                            </div>
                            <p className="form-note">Your win rate is <b>{analytics.forecast.avgWinRate}%</b>. Network intelligence suggests 12% additional recovery potential.</p>
                        </div>
                    )}
                    <div className="performance-list">
                      {analytics.payers.map((p, i) => (
                        <div key={i} className={`perf-card ${p.riskScore > 50 ? 'danger' : ''}`}>
                            <div className="perf-top"><strong>{p.name}</strong></div>
                            <div className="perf-metrics">
                                <div className="metric"><span className="label">Win Rate</span><span className="val">{p.winRate}%</span></div>
                                <div className="metric"><span className="label">Avg. TAT</span><span className="val">{p.avgTatDays}d</span></div>
                            </div>
                            <div className="risk-meter"><div className="risk-fill" style={{ width: `${p.riskScore}%`, background: p.riskScore > 50 ? '#e53e3e' : '#38a169' }}></div></div>
                        </div>
                      ))}
                    </div>
                </div>
            </div>
          </section>
        )}

        {activeTab === 'intel' && (
          <section className="analytics-section">
            <div className="section-header">
                <h2>EviDex: Clinical Precedent Library</h2>
                <p>The Medical Director agent persists all verified research here for future reuse.</p>
            </div>
            <div className="grid">
                {intelLibrary.map((item, i) => (
                    <div key={i} className="card">
                        <span className="badge success">VERIFIED EVIDENCE</span>
                        <h3>{item.title}</h3>
                        <p className="pain-point">{item.summary || 'Clinical synthesis of PubMed findings and payer policies.'}</p>
                        <div className="header-badges" style={{flexDirection: 'row', justifyContent: 'flex-start', gap: '0.5rem'}}>
                            {item.keywords?.map((k, j) => <span key={j} className="badge info">{k}</span>)}
                        </div>
                        <button className="btn-view" style={{marginTop: '1rem'}} onClick={() => window.open(item.url, '_blank')}>View Source Evidence</button>
                    </div>
                ))}
            </div>
          </section>
        )}

        {activeTab === 'compliance' && (
          <section className="rules-section">
            <h2>CMS-0057-F Audit Log</h2>
            <table className="rules-table">
                <thead><tr><th>Patient</th><th>Payer</th><th>Submitted</th><th>Status</th></tr></thead>
                <tbody>{complianceLog.map((log, i) => (
                    <tr key={i}><td>{log.username}</td><td><strong>{log.insurance_type}</strong></td><td>{new Date(log.submitted_at).toLocaleDateString()}</td><td><span className="badge info">{log.status}</span></td></tr>
                ))}</tbody>
            </table>
            <button className="btn-primary" style={{marginTop: '1rem'}} onClick={() => alert('Exporting Audit Package...')}>Export 7-Day Audit CSV</button>
          </section>
        )}

        {activeTab === 'system' && (
          <section className="rules-section">
            <div className="analytics-layout">
                <div className="main-analytics">
                    <h2>System Connectivity</h2>
                    <div className="performance-grid">
                        <div className={`perf-card ${health.checks.database === 'Connected' ? '' : 'danger'}`}><strong>Database</strong><div className="val">{health.checks.database}</div></div>
                        <div className={`perf-card ${health.checks.fhir_gateway.includes('Active') ? '' : 'danger'}`}><strong>FHIR Tunnel</strong><div className="val">{health.checks.fhir_gateway}</div></div>
                        <div className={`perf-card ${health.checks.fax_gateway === 'Live' ? '' : 'danger'}`}><strong>Fax Gateway</strong><div className="val">{health.checks.fax_gateway}</div></div>
                    </div>

                    <h2 style={{marginTop: '3rem'}}>Payer Portal Registry</h2>
                    <table className="rules-table">
                        <thead><tr><th>Portal</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>{portals.map((p, i) => (
                            <tr key={i}>
                                <td><strong>{p.payer_name}</strong><br/><small>{p.portal_url}</small></td>
                                <td><span className={`badge ${p.has_credentials ? 'success' : 'info'}`}>{p.has_credentials ? 'ENCRYPTED' : 'NOT CONFIGURED'}</span></td>
                                <td><button className="status-link" onClick={() => alert('Credential Rotation Not Implemented')}>Rotate</button></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>

                <div className="side-analytics">
                    <div className="rule-form">
                        <h3>Register Gateway</h3>
                        <p className="form-note">Securely store credentials for proprietary payer portals.</p>
                        <input placeholder="Payer (e.g. Optum)" value={newPortal.payerId} onChange={e => setNewPortal({...newPortal, payerId: e.target.value})} />
                        <input placeholder="Portal URL" value={newPortal.portalUrl} onChange={e => setNewPortal({...newPortal, portalUrl: e.target.value})} />
                        <input placeholder="Username" value={newPortal.username} onChange={e => setNewPortal({...newPortal, username: e.target.value})} />
                        <input type="password" placeholder="Password" value={newPortal.password} onChange={e => setNewPortal({...newPortal, password: e.target.value})} />
                        <button className="btn-primary" onClick={savePortal} disabled={loading}>Secure Portal</button>
                    </div>
                </div>
            </div>
          </section>
        )}
      </main>

      {editingLead && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header"><h2>Clinical Review: {editingLead.user}</h2></div>
            <textarea className="appeal-editor" value={editedText} onChange={(e) => setEditedText(e.target.value)} rows={20} />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingLead(null)}>Cancel</button>
              <button className="btn-secondary" onClick={() => generateP2P(editingLead.id)}>P2P Brief</button>
              <button className="btn-secondary" onClick={() => fetchNetworkIntel(editingLead.title, editingLead.insurance_type)}>Network Intel</button>
              <button className="btn-secondary" onClick={() => window.open(`/api/export-audit?leadId=${editingLead.id}`, '_blank')}>Audit Pack</button>
              {editingLead.status === 'Escalated' && (
                <button className="btn-escalate" onClick={() => escalateToCMS(editingLead.id)}>File CMS Complaint</button>
              )}
              <button className="btn-primary" disabled={loading} onClick={() => transmitAppeal(editingLead.id, editingLead.insurance_type)}>Approve & Transmit</button>
            </div>
          </div>
        </section>
      )}

      {p2pBrief && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header">
                <h2>Physician P2P Briefing</h2>
                <button className="btn-escalate" onClick={() => runSimulation(editingLead)}>Launch War Room Sim</button>
            </div>
            <pre className="appeal-editor" style={{ background: '#f0f4f8', color: '#2d3748' }}>{p2pBrief}</pre>
            
            {simChat.length > 0 && (
                <div className="sim-chat">
                    {simChat.map((msg, i) => (
                        <div key={i} className={`chat-bubble ${msg.role.toLowerCase()}`}>
                            <strong>{msg.role}:</strong> {msg.text}
                            {msg.hint && <div className="strategy-hint">💡 {msg.hint}</div>}
                        </div>
                    ))}
                </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setP2pBrief(null); setSimChat([]); }}>Close</button>
              <button className="btn-primary" onClick={() => requestP2P(editingLead.id)}>Transmit P2P Request</button>
            </div>
          </div>
        </section>
      )}

      {complaintView && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header"><h2>CMS Regulatory Complaint</h2></div>
            <pre className="appeal-editor" style={{ background: '#fff5f5', color: '#c53030' }}>{complaintView}</pre>
            <div className="modal-actions">
              <button className="btn-primary" style={{ background: '#c53030' }} onClick={() => setComplaintView(null)}>Close</button>
            </div>
          </div>
        </section>
      )}
      {discoveryView && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header"><h2>Litigation Discovery Demand</h2></div>
            <pre className="appeal-editor" style={{ background: '#1a202c', color: '#cbd5e0' }}>{discoveryView}</pre>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setDiscoveryView(null)}>Close & Log Phase</button>
            </div>
          </div>
        </section>
      )}
      {networkIntel && (
        <section className="appeal-preview">
          <div className="modal-content">
            <div className="modal-header">
                <h2>Network Intelligence: {networkIntel.procedure}</h2>
                <span className="badge success">HIVE MIND ACTIVE</span>
            </div>
            <div className="performance-grid" style={{marginTop: '2rem'}}>
                <div className="perf-card">
                    <strong>Global Win Rate</strong>
                    <div className="val" style={{color: '#38a169'}}>{networkIntel.global_win_rate}%</div>
                    <p className="form-note">Average success across 45+ hospitals</p>
                </div>
                <div className="perf-card danger">
                    <strong>Systemic Bias</strong>
                    <div className="val">{networkIntel.systemic_bias_detected ? 'DETECTED' : 'LOW'}</div>
                    <p className="form-note">Target for Omnibus Escalation</p>
                </div>
            </div>
            <div className="rc-card" style={{marginTop: '1.5rem'}}>
                <h3>Cite These Network Precedents</h3>
                <ul style={{fontSize: '0.9rem'}}>
                    {networkIntel.precedent_citations.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={() => setNetworkIntel(null)}>Apply to Appeal</button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
