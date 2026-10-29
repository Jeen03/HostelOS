import React, { useState, useEffect } from 'react';
import {
  Users, BedDouble, DollarSign, AlertTriangle,
  Sparkles, CheckCircle, PlusCircle, Database
} from 'lucide-react';

export default function AdminDashboard({ currentUser }) {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [rooms, setRooms] = useState([]);
  const [finance, setFinance] = useState(null);
  const [riskReport, setRiskReport] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dbStatus, setDbStatus] = useState(null);

  // Allocation State
  const [candidateName, setCandidateName] = useState('Alex Resident');
  const [candidateReg, setCandidateReg] = useState('STU-2026-099');
  const [candidateDept, setCandidateDept] = useState('Computer Engineering');
  const [candidateYear, setCandidateYear] = useState(3);
  const [candidateQuiet, setCandidateQuiet] = useState(true);
  const [candidateMedical, setCandidateMedical] = useState(false);
  const [allocationResults, setAllocationResults] = useState(null);
  const [allocating, setAllocating] = useState(false);

  // New Txn Modal
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnCategory, setTxnCategory] = useState('Mess Provisions');
  const [txnDirection, setTxnDirection] = useState('EXPENSE');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnDesc, setTxnDesc] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [sRes, rRes, fRes, rkRes, aRes, dbRes] = await Promise.all([
        fetch('/api/admin/dashboard-stats'),
        fetch('/api/rooms'),
        fetch('/api/finance/overview'),
        fetch('/api/analytics/risk-report'),
        fetch('/api/audit/logs?limit=30'),
        fetch('/api/database/status')
      ]);
      setStats(await sRes.json());
      setRooms(await rRes.json());
      setFinance(await fRes.json());
      setRiskReport(await rkRes.json());
      setAuditLogs(await aRes.json());
      setDbStatus(await dbRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunAllocation = async () => {
    setAllocating(true);
    try {
      const res = await fetch('/api/rooms/allocate-explainable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidateName,
          register_no: candidateReg,
          department: candidateDept,
          year: Number(candidateYear),
          gender: 'Male',
          prefers_quiet_zone: candidateQuiet,
          medical_ground_floor_pref: candidateMedical
        })
      });
      const data = await res.json();
      setAllocationResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAllocating(false);
    }
  };

  const handleAssignRoom = async (roomId) => {
    try {
      const res = await fetch(`/api/rooms/assign?student_id=u_student1&room_id=${roomId}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      loadAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/finance/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: txnCategory,
          direction: txnDirection,
          amount: parseFloat(txnAmount),
          description: txnDesc
        })
      });
      setShowTxnModal(false);
      setTxnAmount('');
      setTxnDesc('');
      loadAdminData();
      alert('Transaction saved.');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '22px 24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', margin: 0 }}>
                Hostel Administration & Analytics
              </h1>
              {dbStatus && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '4px 11px',
                  borderRadius: '20px',
                  background: dbStatus.connected ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                  color: dbStatus.connected ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                  border: `1px solid ${dbStatus.connected ? 'rgba(5, 150, 105, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`
                }}>
                  <Database size={13} />
                  {dbStatus.connected ? `🔥 Cloud Firestore (${dbStatus.project_id || 'Connected'})` : '💾 SQLite Local Mode (Ready for Firestore key)'}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Facility Management, Explainable Allocation & Financial Ledger
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowTxnModal(true)} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
              <PlusCircle size={15} /> Add Transaction
            </button>
            <button onClick={() => setActiveTab('allocation')} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              <Sparkles size={15} /> Room Allocation
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '22px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <span>Total Residents</span>
              <Users size={16} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {stats.total_students}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              {stats.presence.in_campus} In • {stats.presence.out_campus} Out • {stats.presence.on_leave} Leave
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <span>Bed Occupancy</span>
              <BedDouble size={16} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {stats.rooms.occupancy_rate}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              {stats.total_students} / {stats.rooms.total_bed_capacity} Beds
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <span>Net Balance</span>
              <DollarSign size={16} color="var(--accent-emerald)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stats.finance.net_balance >= 0 ? '#34d399' : '#f87171', marginTop: '4px' }}>
              ₹{stats.finance.net_balance.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Total Income - Total Expenditure
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <span>Risk Index</span>
              <AlertTriangle size={16} color="var(--accent-amber)" />
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '4px' }}>
              {riskReport?.overall_risk_index || 0} / 100
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              {riskReport?.system_health_state || 'Operational'}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Quarters & Rooms' },
          { id: 'allocation', label: 'Explainable Room Allocation' },
          { id: 'finance', label: 'Account Manager' },
          { id: 'risk', label: 'Operational Risk' },
          { id: 'audit', label: 'Audit Trail' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ROOMS */}
      {activeTab === 'overview' && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text-main)' }}>Rooms & Wing Vacancies</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {rooms.map((r) => (
              <div key={r.room_id} style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Room {r.room_id}</span>
                  <span className={`badge ${r.vacant_beds === 0 ? 'badge-critical' : 'badge-in'}`} style={{ fontSize: '0.68rem' }}>
                    {r.vacant_beds} vacant / {r.capacity}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {r.block} • Floor {r.floor} • {r.room_type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: EXPLAINABLE ALLOCATION */}
      {activeTab === 'allocation' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '6px', color: 'var(--text-main)' }}>
              Explainable Room Allocation Engine
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Computes multi-factor match score: <code>Score = 0.25*Dept + 0.25*Year + 0.20*Floor + 0.15*Quiet + 0.15*Vacancy</code>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Resident Name</label>
                <input type="text" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Department</label>
                  <select value={candidateDept} onChange={(e) => setCandidateDept(e.target.value)}>
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Academic Year</label>
                  <select value={candidateYear} onChange={(e) => setCandidateYear(e.target.value)}>
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={candidateQuiet} onChange={(e) => setCandidateQuiet(e.target.checked)} style={{ width: 'auto' }} />
                  Prefers Quiet Study Zone
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={candidateMedical} onChange={(e) => setCandidateMedical(e.target.checked)} style={{ width: 'auto' }} />
                  Ground Floor Need (Medical / Physical)
                </label>
              </div>

              <button onClick={handleRunAllocation} disabled={allocating} className="btn btn-primary" style={{ marginTop: '6px' }}>
                {allocating ? 'Calculating...' : 'Compute Explainable Room Rankings'}
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '22px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text-main)' }}>Recommended Allocations</h3>
            {allocationResults ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '460px', overflowY: 'auto' }}>
                {allocationResults.recommendations.map((rec, i) => (
                  <div key={rec.room_id} style={{ background: i === 0 ? 'rgba(99, 102, 241, 0.1)' : 'var(--pill-bg)', border: `1px solid ${i === 0 ? 'var(--border-glow)' : 'var(--border-subtle)'}`, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-main)' }}>#{i + 1} Room {rec.room_id}</strong>
                      <span className="badge badge-ai" style={{ fontSize: '0.75rem', fontWeight: 700 }}>{rec.score} pts</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {rec.explanations.map((exp, idx) => (
                        <div key={idx}>• {exp}</div>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px', textAlign: 'right' }}>
                      <button onClick={() => handleAssignRoom(rec.room_id)} className="btn btn-primary" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        Assign Bed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px', fontSize: '0.82rem' }}>
                Click 'Compute Explainable Room Rankings' to generate scoring breakdown.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT MANAGER */}
      {activeTab === 'finance' && finance && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text-main)' }}>Hostel Financial Account Ledger</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px' }}>Txn ID</th>
                  <th style={{ padding: '8px' }}>Category</th>
                  <th style={{ padding: '8px' }}>Direction</th>
                  <th style={{ padding: '8px' }}>Amount</th>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {finance.transactions.map((t) => (
                  <tr key={t.txn_id} style={{ borderBottom: '1px solid var(--pill-bg)' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{t.txn_id}</td>
                    <td style={{ padding: '8px', color: 'var(--text-main)', fontWeight: 600 }}>{t.category}</td>
                    <td style={{ padding: '8px' }}>
                      <span className={`badge ${t.direction === 'INCOME' ? 'badge-in' : 'badge-critical'}`} style={{ fontSize: '0.65rem' }}>
                        {t.direction}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontWeight: 700, color: t.direction === 'INCOME' ? '#34d399' : '#f87171' }}>
                      ₹{t.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{t.date}</td>
                    <td style={{ padding: '8px', color: 'var(--text-dim)' }}>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RISK ANALYSIS */}
      {activeTab === 'risk' && riskReport && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text-main)' }}>Operational Risk Indicators</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {riskReport.risk_items.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: 'var(--text-main)' }}>{item.area}</strong>
                  <span className="badge badge-out">{item.severity}</span>
                </div>
                <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>{item.detail}</div>
                <div style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', marginTop: '4px' }}>Action: {item.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text-main)' }}>Access & Gate Audit Logs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px' }}>Log ID</th>
                  <th style={{ padding: '8px' }}>Actor</th>
                  <th style={{ padding: '8px' }}>Action</th>
                  <th style={{ padding: '8px' }}>Resource</th>
                  <th style={{ padding: '8px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.log_id} style={{ borderBottom: '1px solid var(--pill-bg)' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{log.log_id}</td>
                    <td style={{ padding: '8px', color: 'var(--text-main)' }}>{log.actor_id}</td>
                    <td style={{ padding: '8px', color: 'var(--accent-cyan)' }}>{log.action}</td>
                    <td style={{ padding: '8px' }}>{log.resource}</td>
                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showTxnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '22px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '14px' }}>Log Transaction</h3>
            <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <select value={txnDirection} onChange={(e) => setTxnDirection(e.target.value)}>
                <option value="EXPENSE">Expense (Outgoing)</option>
                <option value="INCOME">Income (Revenue)</option>
              </select>
              <input type="text" placeholder="Category" value={txnCategory} onChange={(e) => setTxnCategory(e.target.value)} required />
              <input type="number" placeholder="Amount (₹)" value={txnAmount} onChange={(e) => setTxnAmount(e.target.value)} required />
              <textarea rows={2} placeholder="Description" value={txnDesc} onChange={(e) => setTxnDesc(e.target.value)} required />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" onClick={() => setShowTxnModal(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
