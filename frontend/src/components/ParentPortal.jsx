import React, { useState, useEffect } from 'react';
import { Heart, ShieldCheck, Phone, Calendar, CheckCircle, Clock } from 'lucide-react';

export default function ParentPortal({ currentUser }) {
  const [studentInfo, setStudentInfo] = useState(null);
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    loadParentData();
  }, []);

  const loadParentData = async () => {
    try {
      const targetStudentId = 'u_student1';
      const [uRes, lRes] = await Promise.all([
        fetch(`/api/users/${targetStudentId}`),
        fetch(`/api/leave/requests?student_id=${targetStudentId}`)
      ]);
      setStudentInfo(await uRes.json());
      setLeaves(await lRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const presenceStatus = studentInfo?.presence_status || 'IN';

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      {/* Header */}
      <div className="glass-panel" style={{ padding: '22px 24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'linear-gradient(135deg, #db2777, #ec4899)', padding: '10px', borderRadius: '10px', display: 'flex' }}>
            <Heart size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.55rem', color: 'var(--text-main)' }}>Parent & Guardian View</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
              Track your child's presence, approved outings, and campus safety status.
            </p>
          </div>
        </div>
      </div>

      {/* Live Status Card */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>
              Your Child's Current Status
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {studentInfo?.name || 'Resident Student A'}
              </span>
              <span className={`badge ${presenceStatus === 'IN' ? 'badge-in' : presenceStatus === 'OUT' ? 'badge-out' : 'badge-leave'}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {presenceStatus === 'IN' ? '✅ Safe Inside Campus' : presenceStatus === 'OUT' ? '🚶 Out on Approved Pass' : '📋 On Authorized Leave'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Room: <strong style={{ color: 'var(--primary)' }}>{studentInfo?.room_id || 'A-101'}</strong> &nbsp;•&nbsp; ID: <strong>{studentInfo?.register_no}</strong>
            </div>
          </div>

          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '16px 22px', textAlign: 'center' }}>
            <ShieldCheck size={28} color="#059669" style={{ margin: '0 auto 4px' }} />
            <div style={{ fontSize: '0.8rem', color: '#065f46', fontWeight: 700 }}>
              Identity Verified
            </div>
            <div style={{ fontSize: '0.72rem', color: '#047857' }}>
              Campus Security System Active
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Approved Outings */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--primary)" /> Approved Outings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {leaves.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', padding: '20px', textAlign: 'center' }}>
                No outing requests made recently.
              </div>
            ) : (
              leaves.map((l) => (
                <div key={l.leave_id} style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{l.type}</strong>
                    <span className={`badge ${l.approval_status === 'APPROVED' ? 'badge-in' : l.approval_status === 'PENDING' ? 'badge-out' : 'badge-critical'}`}>
                      {l.approval_status === 'APPROVED' ? '✅ Approved' : l.approval_status === 'PENDING' ? '⏳ Pending' : '❌ Declined'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>To: <strong>{l.destination}</strong></div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '2px' }}>
                    {l.from_time} → {l.to_time}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="glass-panel" style={{ padding: '22px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Phone size={18} color="var(--primary)" /> Hostel Helpline Numbers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { title: 'Chief Warden Office', sub: 'Pass approvals & student welfare', phone: '+91 98000 00020', color: 'var(--primary)' },
              { title: 'Campus Gate Security', sub: '24/7 gate & movement verification', phone: '+91 98000 00030', color: 'var(--accent-emerald)' },
              { title: 'Campus Health Centre', sub: 'Medical emergencies & first aid', phone: '+91 98000 00099', color: 'var(--accent-rose)' },
            ].map((h) => (
              <div key={h.phone} style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>{h.title}</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>{h.sub}</div>
                </div>
                <a
                  href={`tel:${h.phone.replace(/\s/g, '')}`}
                  style={{ color: h.color, fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none' }}
                >
                  {h.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
