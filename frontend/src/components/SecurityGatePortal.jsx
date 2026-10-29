import React, { useState, useEffect } from 'react';
import {
  Scan, CheckCircle2, XCircle, ShieldCheck,
  RefreshCw, Smartphone, ArrowRight, UserCheck, AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SecurityGatePortal({ currentUser }) {
  const [tokenInput, setTokenInput] = useState('');
  const [direction, setDirection] = useState('AUTO');
  const [scanResult, setScanResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [movements, setMovements] = useState([]);
  const [activeTokens, setActiveTokens] = useState([]);

  useEffect(() => {
    loadGateData();
  }, []);

  const loadGateData = async () => {
    try {
      const [mRes, lRes] = await Promise.all([
        fetch('/api/gate/movement-records?limit=25'),
        fetch('/api/leave/requests')
      ]);
      setMovements(await mRes.json());
      const leaves = await lRes.json();
      const approvedWithTokens = leaves
        .filter(l => l.qr_token && l.qr_token.status === 'UNUSED')
        .map(l => ({ ...l.qr_token, student_name: l.student_name, register_no: l.register_no, type: l.type }));
      setActiveTokens(approvedWithTokens);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerify = async (tokenIdToVerify) => {
    const token = tokenIdToVerify || tokenInput.trim();
    if (!token) return;

    setVerifying(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/gate/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token_id: token,
          gate_name: 'Main Gate',
          security_officer_id: currentUser?.id || 'u_security',
          direction: direction
        })
      });
      const data = await res.json();
      setScanResult(data);

      if (data.valid) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }

      setTokenInput('');
      loadGateData();
    } catch (e) {
      console.error(e);
      setScanResult({
        valid: false,
        reason_code: 'SERVER_ERROR',
        message: 'Could not contact gate verification server.'
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '22px 24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck color="var(--primary)" size={26} /> Campus Gate Verification Post
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              Scan Student QR Code or Enter Token to Verify Movement Authorization
            </p>
          </div>

          <div style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Smartphone size={18} color="var(--accent-emerald)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Scanner Ready</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Verification Terminal */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-main)' }}>
            Scan Student Pass
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Point barcode scanner or type the pass token code below.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Gate Movement Direction
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['AUTO', 'EXIT', 'ENTRY'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`btn ${direction === d ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.82rem', padding: '8px' }}
                  >
                    {d === 'AUTO' ? 'Auto Detect' : d === 'EXIT' ? 'Exiting Campus' : 'Entering Campus'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Pass Token ID
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. TOK-XXXXXXXX or scan QR"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  style={{ flex: 1, fontSize: '0.95rem', fontWeight: 600 }}
                />
                <button
                  type="submit"
                  disabled={verifying}
                  className="btn btn-primary"
                  style={{ padding: '10px 18px', fontSize: '0.9rem' }}
                >
                  <Scan size={18} /> Verify
                </button>
              </div>
            </div>
          </form>

          {/* Quick Click Demo Tokens */}
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
              Quick Test: Active Approved Passes ({activeTokens.length})
            </div>
            {activeTokens.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No active unused tokens right now. Apply for a pass as Student and approve as Warden to generate one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeTokens.map((t) => (
                  <button
                    key={t.token_id}
                    type="button"
                    onClick={() => handleVerify(t.token_id)}
                    className="btn btn-secondary"
                    style={{
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      fontSize: '0.84rem',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-main)' }}>{t.student_name}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({t.type})</span>
                    </div>
                    <span className="badge badge-in" style={{ fontSize: '0.72rem' }}>
                      Click to Scan
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verification Result Banner */}
          {scanResult && (
            <div style={{
              marginTop: '20px',
              padding: '18px',
              borderRadius: '12px',
              border: `2px solid ${scanResult.valid ? '#10b981' : '#ef4444'}`,
              background: scanResult.valid ? '#ecfdf5' : '#fef2f2',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px'
            }}>
              {scanResult.valid ? (
                <CheckCircle2 size={32} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <XCircle size={32} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <div style={{
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  color: scanResult.valid ? '#065f46' : '#991b1b'
                }}>
                  {scanResult.valid ? '✅ ACCESS GRANTED — PASS VERIFIED' : '❌ ACCESS DENIED'}
                </div>
                <div style={{ fontSize: '0.9rem', color: scanResult.valid ? '#047857' : '#b91c1c', marginTop: '4px' }}>
                  {scanResult.message}
                </div>
                {scanResult.student && (
                  <div style={{ marginTop: '10px', fontSize: '0.84rem', color: '#065f46', background: 'rgba(255,255,255,0.7)', padding: '10px', borderRadius: '8px' }}>
                    <div>Student: <strong>{scanResult.student.name}</strong> ({scanResult.student.register_no})</div>
                    <div>Room: <strong>{scanResult.student.room_id}</strong> • Direction: <strong>{scanResult.direction}</strong></div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Recent Gate Activity Log */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>
              Recent Gate Movements
            </h3>
            <button onClick={loadGateData} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {movements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', textAlign: 'center', padding: '40px' }}>
                No recent gate scans recorded.
              </div>
            ) : (
              movements.map((m) => (
                <div key={m.record_id} style={{
                  background: 'var(--pill-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '0.84rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{m.student_name}</strong>
                    <span className={`badge ${m.direction === 'EXIT' ? 'badge-out' : 'badge-in'}`}>
                      {m.direction}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '3px' }}>
                    Gate: {m.gate_name} • Time: {m.timestamp}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
