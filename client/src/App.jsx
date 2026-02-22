import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './App.css'

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [session, setSession] = useState(null);
  const [leads, setLeads] = useState([]);
  const [editingAppeal, setEditingAppeal] = useState(null);
  const [editingLeadId, setEditingLeadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({ payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // 1. Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchLeads();
  }, [session]);

  const fetchLeads = async () => {
    if (!session) return;
    const headers = { 'Authorization': `Bearer ${session.access_token}` };
    
    try {
        const [leadsRes, analyticsRes] = await Promise.all([
            fetch('/api/leads', { headers }),
            fetch('/api/analytics', { headers })
        ]);
        
        const leadsData = await leadsRes.json();
        const analyticsData = await analyticsRes.json();
        
        setLeads(leadsData || []);
        setAnalytics(analyticsData || { payers: [], trends: [], forecast: { weightedForecast: 0, avgWinRate: 0 } });
    } catch (err) {
        console.error("Fetch failed", err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  const saveEdit = async () => {
    setLoading(true);
    try {
        const res = await fetch('/api/save-draft', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ leadId: editingLeadId, appealText: editingAppeal })
        });
        if(res.ok) {
            alert("Draft saved successfully.");
            setEditingAppeal(null);
            setEditingLeadId(null);
            fetchLeads();
        }
    } catch (e) { console.error(e); }
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
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          payerId: lead.insurance_type,
          claimId: `AUTO-${lead.id}`,
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

  // --- RENDER LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>⚡ CMS Bridge</h1>
          <p>Secure Healthcare Compliance Gateway</p>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Physician Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Sign In to Dashboard'}</button>
          </form>
          <p className="hint">Access restricted to authorized clinical staff.</p>
        </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD ---
  const pendingDrafts = leads.filter(l => l.status && l.status.includes('Drafted'));
  const totalRecoverable = leads.filter(l => l.status !== 'Settled').reduce((sum, l) => sum + (parseFloat(l.estimated_value) || 0), 0);
  const totalSettled = leads.filter(l => l.status === 'Settled').reduce((sum, l) => sum + (parseFloat(l.recovered_amount) || 0), 0);

  return (
    <div className="dashboard">
      <header>
        <div className="header-top">
          <div className="user-info">
            <span className="status-badge">Live Cloud Sync</span>
            <span className="user-email">{session.user.email}</span>
          </div>
          <div className="header-actions">
            <button className="btn-audit" onClick={exportAudit}>📥 Audit Export</button>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
        <h1>⚡ CMS Compliance Bridge</h1>
        <div className="stats-bar">
          <div className="stat">
            <span className="label">Potential Recovery</span>
            <span className="value">${totalRecoverable.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="label">Forecasted Win</span>
            <span className="value info">${analytics.forecast.weightedForecast.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="label">Recovered Revenue</span>
            <span className="value success">${totalSettled.toLocaleString()}</span>
          </div>
          <div className="stat">
            <span className="label">System Win Rate</span>
            <span className="value success">{analytics.forecast.avgWinRate}%</span>
          </div>
        </div>
      </header>

      <main>
        <section className="analytics-section">
          <h2>Systemic Denial Patterns</h2>
          <div className="trends-grid">
            {analytics.trends.length > 0 ? analytics.trends.map((trend, i) => (
              <div key={i} className="trend-card">
                <span className="trend-badge">⚠️ SYSTEMIC TREND</span>
                <h4>{trend.procedure}</h4>
                <p>{trend.payer} has denied this {trend.count} times.</p>
                <p className="trend-value">Impact: ${trend.value.toLocaleString()}</p>
                <button className="btn-escalate" onClick={async () => {
                  setLoading(true);
                  const res = await fetch('/api/generate-omnibus', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ payer: trend.payer, procedure: trend.procedure })
                  });
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `OMNIBUS_NOTICE_${trend.payer.replace(/\s/g, '_')}.pdf`;
                    a.click();
                  }
                  setLoading(false);
                }}>Generate Omnibus Appeal</button>
              </div>
            )) : <p className="no-data">No systemic patterns detected yet.</p>}
          </div>

          <h2 style={{marginTop: '3rem'}}>Payer Performance Analytics</h2>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Payer Name</th>
                <th>Denials</th>
                <th>Potential Revenue</th>
                <th>Win Rate</th>
                <th>Avg. TAT</th>
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
                  <td>{stat.avgTatDays} days</td>
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
              <div key={i} className={`card ${lead.priority === 'High Priority' ? 'priority' : ''} ${lead.status && lead.status.includes('Drafted') ? 'drafted' : ''} ${lead.status === 'Submitted' ? 'submitted' : ''} ${lead.status === 'Settled' ? 'settled' : ''}`}>
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
                    {lead.status && lead.status.includes('Drafted') && <span className="badge success">Ready for Review</span>}
                    {lead.status === 'Submitted' && <span className={`badge info ${lead.submission_status === 'Failed' ? 'error' : ''}`}>
                      {lead.submission_status === 'Delivered' ? '✅ Fax Delivered' : (lead.submission_status === 'Failed' ? '❌ Fax Failed' : '📡 Transmitting...')}
                    </span>}
                    {lead.status === 'Settled' && <span className="badge success">Settled</span>}
                  </div>
                </div>
                <p><strong>Payer:</strong> {lead.insurance_type}</p>
                <p className="pain-point">{lead.pain_point}</p>
                
                <div className="card-actions">
                  <button className={(lead.drafted_appeal || lead.edited_appeal) ? 'btn-view' : 'btn-generate'} onClick={() => generateAppeal(lead)} disabled={loading}>
                    { (lead.drafted_appeal || lead.edited_appeal) ? (lead.status === 'Submitted' ? 'View Submission' : 'Review Package') : 'Draft CMS Appeal'}
                  </button>
                  {lead.status && lead.status.includes('Drafted') && (
                    <button className="btn-submit" onClick={async () => {
                      if(!confirm(`Transmit this appeal?`)) return;
                      setLoading(true);
                      const res = await fetch('/api/submit-appeal', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({ leadId: lead.id, insuranceName: lead.insurance_type })
                      });
                      if(res.ok) fetchLeads();
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
              <textarea className="appeal-editor" value={editingAppeal} onChange={(e) => setEditingAppeal(e.target.value)} rows={20} />
              <div className="modal-actions">
                <button className="btn-save" onClick={saveEdit} disabled={loading}>Save Draft</button>
                <button className="btn-download" onClick={async () => {
                  const lead = leads.find(l => l.id === editingLeadId);
                  const res = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ type: 'BRIEF', claimId: editingLeadId, priority: lead?.priority, synthesis: lead?.clinical_synthesis })
                  });
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Physician_Brief_${editingLeadId}.pdf`;
                  a.click();
                }}>Download P2P Brief</button>
                <button className="btn-download" onClick={async () => {
                  const lead = leads.find(l => l.id === editingLeadId);
                  const res = await fetch('/api/generate-pdf', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({ appealText: editingAppeal, claimId: editingLeadId, clinicalResearch: lead?.clinical_evidence })
                  });
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Appeal_Package_${editingLeadId}.pdf`;
                  a.click();
                }}>Download Package</button>
                <button className="btn-secondary" onClick={() => { setEditingAppeal(null); setEditingLeadId(null); }}>Close</button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
