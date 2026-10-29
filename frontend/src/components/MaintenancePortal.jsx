import React, { useState, useEffect } from 'react';
import { Wrench, Check, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export default function MaintenancePortal({ currentUser, onOpenSafetyMap }) {
  const [complaints, setComplaints] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const res = await fetch('/api/complaints');
      setComplaints(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      await fetch('/api/complaints/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: complaintId,
          status: newStatus,
          assigned_to: currentUser?.name || 'Facility Tech',
          resolution_notes: `Marked as ${newStatus} by Maintenance Team.`
        })
      });
      loadComplaints();
    } catch (e) {
      console.error(e);
    }
  };

  const categories = ['ALL', 'Electrical', 'Plumbing', 'Internet', 'Furniture', 'Cleaning'];
  const filteredComplaints = complaints.filter(
    (c) => selectedCategory === 'ALL' || c.category === selectedCategory
  );

  const pendingCount = complaints.filter(c => c.status !== 'RESOLVED').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '22px 24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Wrench color="var(--primary)" size={26} /> Facility Maintenance Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              View and resolve student-reported room and facility issues
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '8px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Open Tickets</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pendingCount > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)', marginTop: '2px' }}>
                {pendingCount}
              </div>
            </div>
            <button onClick={onOpenSafetyMap} className="btn btn-secondary" style={{ fontSize: '0.84rem' }}>
              <Shield size={16} color="var(--accent-cyan)" /> Safety Assets Map
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '10px' }}
          >
            {cat === 'ALL' ? 'All Tickets' : cat}
          </button>
        ))}
      </div>

      {/* Ticket Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredComplaints.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <CheckCircle size={40} color="var(--accent-emerald)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>All Clear!</p>
            <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>No complaints in this category.</p>
          </div>
        ) : (
          filteredComplaints.map((item) => {
            const isResolved = item.status === 'RESOLVED';
            return (
              <div key={item.complaint_id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isResolved ? 'var(--border-subtle)' : item.priority === 'Critical' ? '#fecaca' : 'var(--border-subtle)'}`,
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-ai" style={{ fontSize: '0.72rem' }}>{item.category}</span>
                    <span className={`badge ${item.priority === 'Critical' ? 'badge-critical' : 'badge-out'}`} style={{ fontSize: '0.72rem' }}>
                      {item.priority === 'Critical' ? '🔴 Critical' : '🟡 Normal'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginTop: '4px', fontWeight: 700 }}>{item.title}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>{item.description}</p>
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '6px', fontWeight: 600 }}>
                    Room: {item.room_id}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span className={`badge ${isResolved ? 'badge-in' : 'badge-out'}`} style={{ fontSize: '0.74rem' }}>
                    {isResolved ? '✅ Resolved' : '⏳ Open Ticket'}
                  </span>

                  {!isResolved && (
                    <button onClick={() => handleUpdateStatus(item.complaint_id, 'RESOLVED')} className="btn btn-success" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      <Check size={14} /> Mark as Fixed
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
