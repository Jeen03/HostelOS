import React, { useState, useEffect } from 'react';
import { ShieldAlert, Flame, Cross, AlertTriangle, CheckCircle, RefreshCw, X, MapPin } from 'lucide-react';

export default function DigitalSafetyMapModal({ isOpen, onClose }) {
  const [assets, setAssets] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('Block A');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/safety/assets');
      const data = await res.json();
      setAssets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (assetId) => {
    try {
      await fetch(`/api/safety/inspect-asset?asset_id=${assetId}&status=OPERATIONAL`, { method: 'POST' });
      fetchAssets();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const filteredAssets = assets.filter(
    (a) => a.block === selectedBlock && a.floor === selectedFloor
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', padding: '10px', borderRadius: '10px', display: 'flex' }}>
              <ShieldAlert size={26} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)' }}>Hostel Safety Assets Map</h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Fire extinguishers, alarm panels, first-aid kits & emergency exits by block and floor.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '22px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Block</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['Block A', 'Block B', 'Block C'].map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBlock(b)}
                  className={`btn ${selectedBlock === b ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.84rem', padding: '7px 14px' }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px' }}>Floor</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3].map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFloor(f)}
                  className={`btn ${selectedFloor === f ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.84rem', padding: '7px 14px' }}
                >
                  Floor {f}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              Operational
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
              Inspection Due
            </span>
          </div>
        </div>

        {/* Asset Grid */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
            {selectedBlock} • Floor {selectedFloor} — Safety Equipment
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading safety data...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
              {filteredAssets.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1', background: 'var(--pill-bg)', borderRadius: '12px' }}>
                  No safety assets registered on this floor. They may be located on the ground floor.
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  const isDue = asset.status === 'DUE_FOR_INSPECTION';
                  const icon = asset.type.includes('Extinguisher')
                    ? <Flame size={18} />
                    : asset.type.includes('Alarm')
                    ? <AlertTriangle size={18} />
                    : <Cross size={18} />;

                  return (
                    <div
                      key={asset.asset_id}
                      style={{
                        background: isDue ? '#fef2f2' : '#ecfdf5',
                        border: `1px solid ${isDue ? '#fecaca' : '#a7f3d0'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: isDue ? '#991b1b' : '#065f46'
                        }}>
                          {icon} {asset.type}
                        </span>
                        <span className={`badge ${isDue ? 'badge-critical' : 'badge-in'}`} style={{ fontSize: '0.72rem' }}>
                          {isDue ? '⚠ Check Due' : '✅ OK'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: isDue ? '#7f1d1d' : '#064e3b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} /> {asset.location}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: isDue ? '#b91c1c' : '#047857' }}>
                        <span>Last: {asset.last_check}</span>
                        <span>Next: {asset.next_check_due}</span>
                      </div>

                      {isDue && (
                        <button
                          onClick={() => handleInspect(asset.asset_id)}
                          className="btn btn-primary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', marginTop: '4px' }}
                        >
                          <CheckCircle size={14} /> Mark as Inspected
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer with emergency contacts */}
        <div style={{
          background: 'var(--pill-bg)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Emergency Helplines — 24/7
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Security: <strong>+91 98000 00030</strong> &nbsp;|&nbsp; Health Centre: <strong>+91 98000 00099</strong>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
}
