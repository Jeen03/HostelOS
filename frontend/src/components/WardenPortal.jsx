import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Clock, Users, ShieldAlert,
  Search, MessageSquare, AlertTriangle, ArrowRight, User
} from 'lucide-react';

export default function WardenPortal({ currentUser }) {
  const [activeTab, setActiveTab] = useState('leave-queue');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [sosIncidents, setSosIncidents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [presenceFilter, setPresenceFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWardenData();
  }, []);

  const loadWardenData = async () => {
    try {
      const [lRes, uRes, sRes, cRes] = await Promise.all([
        fetch('/api/leave/requests'),
        fetch('/api/auth/users'),
        fetch('/api/sos/incidents'),
        fetch('/api/complaints')
      ]);
      setLeaveRequests(await lRes.json());
      const allUsers = await uRes.json();
      setStudents(allUsers.filter((u) => u.role === 'student'));
      setSosIncidents(await sRes.json());
      setComplaints(await cRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecision = async (leaveId, decision) => {
    try {
      await fetch('/api/leave/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_id: leaveId,
          warden_id: currentUser?.id || 'u_warden',
          decision,
          comment: decision === 'APPROVED' ? 'Approved by Warden' : 'Declined by Warden'
        })
      });
      loadWardenData();
      alert(`Pass request ${decision === 'APPROVED' ? 'Approved & QR generated' : 'Declined'} successfully.`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSOSStatus = async (incidentId, newStatus) => {
    try {
      await fetch('/api/sos/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident_id: incidentId,
          status: newStatus,
          officer_id: currentUser?.id || 'u_warden',
          notes: `Status updated to ${newStatus} by Warden.`
        })
      });
      loadWardenData();
    } catch (e) {
      console.error(e);
    }
  };

  const pendingLeaves = leaveRequests.filter((l) => l.approval_status === 'PENDING');
  const activeSOS = sosIncidents.filter((s) => s.status !== 'Resolved');

  const filteredStudents = students.filter((s) => {
    const matchesFilter = presenceFilter === 'ALL' || s.presence_status === presenceFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.register_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.room_id && s.room_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '22px 24px', marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', color: 'var(--text-main)' }}>
              Warden Operations Desk
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              Approve Student Outing Passes & Monitor Hostel Attendance
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '8px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Passes</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '2px' }}>
                {pendingLeaves.length}
              </div>
            </div>

            <div style={{ background: activeSOS.length > 0 ? '#fef2f2' : 'var(--pill-bg)', border: `1px solid ${activeSOS.length > 0 ? '#fecaca' : 'var(--border-subtle)'}`, borderRadius: '10px', padding: '8px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active SOS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: activeSOS.length > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', marginTop: '2px' }}>
                {activeSOS.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        {[
          { id: 'leave-queue', label: `Pass Requests (${pendingLeaves.length})`, icon: <Clock size={16} /> },
          { id: 'presence-monitor', label: `Student Attendance (${students.length})`, icon: <Users size={16} /> },
          { id: 'sos-manager', label: `Emergency Alerts (${activeSOS.length})`, icon: <ShieldAlert size={16} /> },
          { id: 'complaints-view', label: `Room Complaints (${complaints.length})`, icon: <MessageSquare size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px', borderRadius: '10px' }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PASS QUEUE */}
      {activeTab === 'leave-queue' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-main)' }}>
            Student Outing & Leave Requests
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Review pending requests. Approving will automatically issue a verified QR pass to the student.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {leaveRequests.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                No leave requests submitted yet.
              </div>
            ) : (
              leaveRequests.map((req) => (
                <div key={req.leave_id} style={{
                  background: 'var(--pill-bg)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>{req.student_name}</strong>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>({req.register_no})</span>
                      <span className={`badge ${req.approval_status === 'APPROVED' ? 'badge-in' : req.approval_status === 'PENDING' ? 'badge-out' : 'badge-critical'}`}>
                        {req.approval_status === 'APPROVED' ? 'Approved' : req.approval_status === 'PENDING' ? 'Pending Review' : 'Rejected'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                      {req.type} → {req.destination}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Timing: <strong>{req.from_time}</strong> to <strong>{req.to_time}</strong> • Room: <strong>{req.room_id}</strong>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '6px', background: 'var(--bg-surface)', padding: '6px 10px', borderRadius: '6px', display: 'inline-block' }}>
                      Reason: {req.reason}
                    </div>
                  </div>

                  {req.approval_status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleDecision(req.leave_id, 'APPROVED')} className="btn btn-success" style={{ fontSize: '0.85rem' }}>
                        <CheckCircle size={16} /> Approve & Issue QR Pass
                      </button>
                      <button onClick={() => handleDecision(req.leave_id, 'REJECTED')} className="btn btn-danger" style={{ fontSize: '0.85rem' }}>
                        <XCircle size={16} /> Decline
                      </button>
                    </div>
                  ) : (
                    <div className="badge badge-ai" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                      Decision Recorded
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RESIDENT PRESENCE */}
      {activeTab === 'presence-monitor' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Hostel Resident Roll Call</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Real-time location based on gate scans and approved leaves</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search student or room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '180px', padding: '6px 10px', fontSize: '0.82rem' }}
              />
              {['ALL', 'IN', 'OUT', 'ON LEAVE'].map((f) => (
                <button
                  key={f}
                  onClick={() => setPresenceFilter(f)}
                  className={`btn ${presenceFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.78rem', padding: '6px 10px' }}
                >
                  {f === 'ALL' ? 'All Students' : f === 'IN' ? 'Inside' : f === 'OUT' ? 'Out' : 'On Leave'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {filteredStudents.map((s) => (
              <div key={s.id} style={{
                background: 'var(--pill-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ID: {s.register_no} • Room: <strong style={{ color: 'var(--primary)' }}>{s.room_id || 'A-101'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {s.department || 'Engineering'}
                  </div>
                </div>
                <span className={`badge ${s.presence_status === 'IN' ? 'badge-in' : s.presence_status === 'OUT' ? 'badge-out' : 'badge-leave'}`}>
                  {s.presence_status === 'IN' ? 'Inside' : s.presence_status === 'OUT' ? 'Out on Pass' : 'On Leave'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SOS MANAGER */}
      {activeTab === 'sos-manager' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-main)' }}>
            Emergency SOS Incidents
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Distress broadcasts triggered by residents across hostel blocks.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sosIncidents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
                No emergency incidents reported. All clear!
              </div>
            ) : (
              sosIncidents.map((sos) => (
                <div key={sos.incident_id} style={{
                  background: sos.status !== 'Resolved' ? '#fef2f2' : 'var(--pill-bg)',
                  border: `1px solid ${sos.status !== 'Resolved' ? '#fecaca' : 'var(--border-subtle)'}`,
                  borderRadius: '12px',
                  padding: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${sos.status !== 'Resolved' ? 'badge-critical' : 'badge-in'}`}>
                        {sos.status}
                      </span>
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>Location: {sos.location}</strong>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {sos.description}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Reported by Student #{sos.student_id} • Time: {sos.created_at}
                    </div>
                  </div>

                  {sos.status !== 'Resolved' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleSOSStatus(sos.incident_id, 'Responded')} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                        Mark Responded
                      </button>
                      <button onClick={() => handleSOSStatus(sos.incident_id, 'Resolved')} className="btn btn-success" style={{ fontSize: '0.8rem' }}>
                        <CheckCircle size={15} /> Resolve Emergency
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COMPLAINTS VIEW */}
      {activeTab === 'complaints-view' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', color: 'var(--text-main)' }}>
            All Student Maintenance Complaints
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {complaints.map((c) => (
              <div key={c.complaint_id} style={{
                background: 'var(--pill-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="badge badge-ai" style={{ fontSize: '0.72rem' }}>{c.category}</span>
                    <span className={`badge ${c.status === 'RESOLVED' ? 'badge-in' : 'badge-out'}`} style={{ fontSize: '0.72rem' }}>
                      {c.status}
                    </span>
                  </div>
                  <strong style={{ color: 'var(--text-main)', fontSize: '0.94rem', display: 'block', marginTop: '6px' }}>{c.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{c.description}</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Room: <strong>{c.room_id}</strong> • Priority: {c.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
