import React, { useState, useEffect } from 'react';
import {
  QrCode, Calendar, Wrench, Dumbbell, CreditCard,
  CheckCircle, Clock, Sparkles, AlertCircle, ArrowRight,
  ShieldCheck, Wifi, Phone, Home
} from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

export default function StudentPortal({ currentUser, onTriggerSOS }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [dues, setDues] = useState([]);
  const [bookings, setBookings] = useState([]);

  // Leave Form
  const [leaveType, setLeaveType] = useState('Holiday Outing');
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState('');

  // Complaint & Pre-Check
  const [complaintCategory, setComplaintCategory] = useState('Electrical');
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [selfCheckList, setSelfCheckList] = useState([]);
  const [precheckCompleted, setPrecheckCompleted] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  // Amenity Booking
  const [selectedResource, setSelectedResource] = useState('Gymnasium');
  const [resourceSlots, setResourceSlots] = useState([]);

  useEffect(() => {
    if (currentUser?.id) {
      loadStudentData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'complaints') {
      loadSelfChecks(complaintCategory);
    } else if (activeTab === 'amenities') {
      loadAmenitySlots(selectedResource);
    }
  }, [activeTab, complaintCategory, selectedResource]);

  const loadStudentData = async () => {
    try {
      const [uRes, lRes, cRes, dRes, bRes] = await Promise.all([
        fetch(`/api/users/${currentUser.id}`),
        fetch(`/api/leave/requests?student_id=${currentUser.id}`),
        fetch(`/api/complaints?student_id=${currentUser.id}`),
        fetch(`/api/student/dues?student_id=${currentUser.id}`),
        fetch(`/api/bookings?student_id=${currentUser.id}`)
      ]);
      setProfile(await uRes.json());
      setLeaveRequests(await lRes.json());
      setComplaints(await cRes.json());
      setDues(await dRes.json());
      setBookings(await bRes.json());
    } catch (e) {
      console.error('Error fetching student data:', e);
    }
  };

  const loadSelfChecks = async (cat) => {
    try {
      const res = await fetch(`/api/complaints/self-check-questions?category=${cat}`);
      const data = await res.json();
      setSelfCheckList(data.checklist || []);
      setPrecheckCompleted(false);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAmenitySlots = async (resource) => {
    try {
      const res = await fetch(`/api/amenities/slots?resource=${resource}`);
      const data = await res.json();
      setResourceSlots(data.slots || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveSubmitting(true);
    setLeaveSuccessMsg('');
    try {
      const res = await fetch('/api/leave/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: currentUser.id,
          type: leaveType,
          from_time: fromTime || new Date().toISOString().slice(0, 16).replace('T', ' '),
          to_time: toTime || new Date(Date.now() + 4 * 3600000).toISOString().slice(0, 16).replace('T', ' '),
          destination,
          reason
        })
      });
      const data = await res.json();
      setLeaveSuccessMsg(`Your pass request (#${data.leave_id}) was sent to the Warden for approval.`);
      setReason('');
      setDestination('');
      loadStudentData();
    } catch (e) {
      console.error(e);
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleAIClassifyPreview = async (text) => {
    if (!text || text.length < 5) return;
    try {
      const res = await fetch(`/api/ai/classify-text?text=${encodeURIComponent(text)}`, { method: 'POST' });
      const data = await res.json();
      setAiPreview(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintSubmitting(true);
    try {
      await fetch('/api/complaints/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: currentUser.id,
          room_id: profile?.room_id || 'A-101',
          title: complaintTitle,
          description: complaintDesc,
          precheck_completed: precheckCompleted
        })
      });
      setComplaintTitle('');
      setComplaintDesc('');
      setAiPreview(null);
      loadStudentData();
      alert('Your complaint has been submitted. Maintenance team has been notified!');
    } catch (e) {
      console.error(e);
    } finally {
      setComplaintSubmitting(false);
    }
  };

  const handleBookSlot = async (slot) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/amenities/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: currentUser.id,
          resource: selectedResource,
          date: today,
          slot
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Slot booking failed');
        return;
      }
      loadAmenitySlots(selectedResource);
      loadStudentData();
      alert(`Booking confirmed for ${selectedResource} (${slot})!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayDue = async (paymentId) => {
    try {
      const res = await fetch('/api/student/pay-dues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, student_id: currentUser.id })
      });
      const data = await res.json();
      alert(data.message || 'Payment received successfully!');
      loadStudentData();
    } catch (e) {
      console.error(e);
    }
  };

  const activeApprovedLeave = leaveRequests.find(
    l => l.approval_status === 'APPROVED' && l.qr_token && l.qr_token.status === 'UNUSED'
  );

  const presenceStatus = profile?.presence_status || 'IN';

  const complaintCategories = [
    { id: 'Electrical', label: 'Electricity / Fan / Light', icon: '💡' },
    { id: 'Plumbing', label: 'Water / Tap / Washroom', icon: '🚰' },
    { id: 'Internet', label: 'Wi-Fi / Internet', icon: '📶' },
    { id: 'Furniture', label: 'Bed / Table / Cupboard', icon: '🪑' },
    { id: 'Cleaning', label: 'Room & Corridor Cleaning', icon: '🧹' },
    { id: 'Mess', label: 'Mess & Food', icon: '🍽️' },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 20px' }} className="animate-fade-in">
      {/* Student Welcome Banner */}
      <div className="glass-panel" style={{ padding: '22px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.65rem', color: 'var(--text-main)', margin: 0 }}>
                Hello, {profile?.name || 'Resident Student'} 👋
              </h1>
              <span className={`badge ${
                presenceStatus === 'IN' ? 'badge-in' : presenceStatus === 'OUT' ? 'badge-out' : 'badge-leave'
              }`} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                {presenceStatus === 'IN' ? '● INSIDE HOSTEL' : presenceStatus === 'OUT' ? '● OUT ON PASS' : '● ON LEAVE'}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
              Student ID: <strong style={{ color: 'var(--text-main)' }}>{profile?.register_no}</strong> • Room: <strong style={{ color: 'var(--primary)' }}>{profile?.room_id || 'A-101'}</strong> ({profile?.department})
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={() => setActiveTab('leave')} className="btn btn-primary">
              <QrCode size={16} /> Apply for Gate Pass
            </button>
            <button onClick={() => setActiveTab('complaints')} className="btn btn-secondary">
              <Wrench size={16} /> Report a Problem
            </button>
          </div>
        </div>
      </div>

      {/* Simplified, Clean Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '10px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Overview & Pass', icon: <Home size={16} /> },
          { id: 'leave', label: 'Gate Passes & Outings', icon: <Calendar size={16} /> },
          { id: 'complaints', label: 'Complaints & Repairs', icon: <Wrench size={16} /> },
          { id: 'amenities', label: 'Gym & Sports Booking', icon: <Dumbbell size={16} /> },
          { id: 'finance', label: 'Fees & Invoices', icon: <CreditCard size={16} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.84rem', padding: '8px 16px', borderRadius: '10px' }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & ACTIVE PASS */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Active Gate Pass Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <QrCode color="var(--primary)" size={20} /> Gate Pass Status
            </h3>

            {activeApprovedLeave ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '14px',
                background: 'var(--pill-bg)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
                  <QRCodeDisplay
                    value={activeApprovedLeave.qr_token.token_id}
                    size={170}
                    label={activeApprovedLeave.qr_token.token_id}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {activeApprovedLeave.type}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Destination: {activeApprovedLeave.destination}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>
                    Valid: {activeApprovedLeave.from_time} to {activeApprovedLeave.to_time}
                  </div>
                </div>

                <div className="badge badge-in" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                  <CheckCircle size={15} /> Pass Approved — Ready to show at Gate
                </div>
              </div>
            ) : (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                background: 'var(--pill-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)'
              }}>
                <CheckCircle size={36} color="var(--accent-emerald)" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ color: 'var(--text-main)', fontSize: '1rem', marginBottom: '4px' }}>
                  No Gate Pass Needed
                </h4>
                <p style={{ fontSize: '0.84rem', maxWidth: '320px', margin: '0 auto', color: 'var(--text-muted)' }}>
                  You are free to move inside campus. If you need to go outside or return after curfew, apply for an outing pass.
                </p>
                <button onClick={() => setActiveTab('leave')} className="btn btn-primary" style={{ marginTop: '16px', fontSize: '0.82rem' }}>
                  <Calendar size={15} /> Apply for New Outing Pass
                </button>
              </div>
            )}
          </div>

          {/* Room & Accommodation Info */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', color: 'var(--text-main)' }}>
              My Room & Amenities
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'var(--pill-bg)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Quarters</div>
                <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--primary)', marginTop: '2px' }}>
                  Room {profile?.room_id || 'A-101'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Block A • Floor 1 • Double Sharing
                </div>
              </div>

              <div style={{ background: 'var(--pill-bg)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Campus Wi-Fi</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Wifi size={16} color="var(--accent-cyan)" /> High-Speed Hostel Wi-Fi
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', marginTop: '2px' }}>
                  ● Connected & Online
                </div>
              </div>

              <div style={{ background: 'var(--pill-bg)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Emergency Contact</div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <Phone size={16} color="var(--primary)" /> {profile?.parent_phone || '+91 98000 00011'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Parent / Guardian linked for safety alerts
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GATE PASS & OUTINGS */}
      {activeTab === 'leave' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Request Form */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-main)' }}>
              Apply for Outing / Gate Pass
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Once the Warden approves, your digital QR pass will be issued immediately.
            </p>

            {leaveSuccessMsg && (
              <div className="badge badge-in" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', justifyContent: 'flex-start' }}>
                <CheckCircle size={16} /> {leaveSuccessMsg}
              </div>
            )}

            <form onSubmit={handleLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Where are you going? (Type of Pass)
                </label>
                <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                  <option value="Holiday Outing">Holiday Outing (Going Home for Weekend / Vacation)</option>
                  <option value="Late Return">Late Return (Library / Lab Project)</option>
                  <option value="Medical Visit">Medical Visit (Doctor / Hospital)</option>
                  <option value="Personal Visit">Day Outing / Shopping in Town</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Leaving At
                  </label>
                  <input type="datetime-local" value={fromTime} onChange={(e) => setFromTime(e.target.value.replace('T', ' '))} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Expected Return
                  </label>
                  <input type="datetime-local" value={toTime} onChange={(e) => setToTime(e.target.value.replace('T', ' '))} required />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Destination Address / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home, City Center, Main Hospital"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Reason for Outing
                </label>
                <textarea
                  rows={2}
                  placeholder="Briefly explain the reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={leaveSubmitting} className="btn btn-primary" style={{ marginTop: '6px', padding: '12px' }}>
                {leaveSubmitting ? 'Submitting to Warden...' : 'Submit Pass Request'}
              </button>
            </form>
          </div>

          {/* Pass History */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', color: 'var(--text-main)' }}>
              My Past Outing Passes
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
              {leaveRequests.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', textAlign: 'center', padding: '40px' }}>
                  No outing passes requested yet.
                </div>
              ) : (
                leaveRequests.map((req) => (
                  <div key={req.leave_id} style={{
                    background: 'var(--pill-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '14px',
                    fontSize: '0.84rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{req.type}</strong>
                      <span className={`badge ${req.approval_status === 'APPROVED' ? 'badge-in' : req.approval_status === 'PENDING' ? 'badge-out' : 'badge-critical'}`}>
                        {req.approval_status === 'APPROVED' ? '✅ Approved' : req.approval_status === 'PENDING' ? '⏳ Waiting' : '❌ Declined'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                      To: <strong>{req.destination}</strong>
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '2px' }}>
                      {req.from_time} → {req.to_time}
                    </div>
                    {req.qr_token && (
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                        QR Token: {req.qr_token.token_id} ({req.qr_token.status})
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPLAINTS & REPAIRS */}
      {activeTab === 'complaints' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-main)' }}>
              Report a Room Problem or Complaint
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Select a category and tell us what needs fixing. Our maintenance team will be dispatched.
            </p>

            <form onSubmit={handleComplaintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                  What needs repair?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {complaintCategories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setComplaintCategory(c.id)}
                      className={`btn ${complaintCategory === c.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.8rem', padding: '8px 10px', justifyContent: 'flex-start', textAlign: 'left' }}
                    >
                      <span>{c.icon}</span>
                      <span>{c.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selfCheckList.length > 0 && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                    Quick Self-Check (Try this first):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem', color: '#78350f' }}>
                    {selfCheckList.map((chk, i) => (
                      <div key={chk.id}>
                        <strong>{i + 1}. {chk.question}</strong>
                        <div style={{ color: '#92400e', fontSize: '0.74rem' }}>Tip: {chk.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Problem Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Washroom tap is leaking, Fan making noise"
                  value={complaintTitle}
                  onChange={(e) => {
                    setComplaintTitle(e.target.value);
                    handleAIClassifyPreview(e.target.value + ' ' + complaintDesc);
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Detailed Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Please describe where and when this happens..."
                  value={complaintDesc}
                  onChange={(e) => {
                    setComplaintDesc(e.target.value);
                    handleAIClassifyPreview(complaintTitle + ' ' + e.target.value);
                  }}
                  required
                />
              </div>

              {aiPreview && (
                <div className="badge badge-ai" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', justifyContent: 'space-between' }}>
                  <span>Priority: <strong>{aiPreview.priority}</strong></span>
                  <span>Estimated Fix Time: <strong>{aiPreview.sla_hours}h</strong></span>
                </div>
              )}

              <button type="submit" disabled={complaintSubmitting} className="btn btn-primary" style={{ padding: '12px' }}>
                {complaintSubmitting ? 'Submitting...' : 'Submit Complaint Ticket'}
              </button>
            </form>
          </div>

          {/* Past Complaints */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '14px', color: 'var(--text-main)' }}>
              My Complaint History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '480px', overflowY: 'auto' }}>
              {complaints.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.84rem', textAlign: 'center', padding: '40px' }}>
                  No complaints filed. Everything is working fine!
                </div>
              ) : (
                complaints.map((c) => (
                  <div key={c.complaint_id} style={{
                    background: 'var(--pill-bg)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '14px',
                    fontSize: '0.84rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>{c.title}</strong>
                      <span className={`badge ${c.status === 'RESOLVED' ? 'badge-in' : 'badge-out'}`}>
                        {c.status === 'RESOLVED' ? 'Fixed ✅' : 'In Progress ⏳'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>{c.description}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '6px' }}>
                      Category: {c.category} • Priority: {c.priority}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AMENITIES */}
      {activeTab === 'amenities' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-main)' }}>
            Book Gym & Sports Facilities
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Choose a facility and reserve your 1-hour slot for today.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {['Gymnasium', 'Fitness Corner', 'Entertainment Corner', 'Study Hub Wi-Fi'].map((res) => (
              <button
                key={res}
                onClick={() => setSelectedResource(res)}
                className={`btn ${selectedResource === res ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.84rem', padding: '8px 16px', borderRadius: '10px' }}
              >
                {res}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
            {resourceSlots.map((s) => (
              <div key={s.slot} style={{
                background: 'var(--pill-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  <span>{s.slot}</span>
                  <span className={`badge ${s.available ? 'badge-in' : 'badge-critical'}`} style={{ fontSize: '0.72rem' }}>
                    {s.remaining} left
                  </span>
                </div>
                <button
                  disabled={!s.available}
                  onClick={() => handleBookSlot(s.slot)}
                  className={`btn ${s.available ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '8px' }}
                >
                  {s.available ? 'Reserve Slot' : 'Fully Booked'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FEES */}
      {activeTab === 'finance' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-main)' }}>
            Hostel Fees & Invoices
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Check pending semester fees, mess bills, and pay directly online.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {dues.map((item) => (
              <div key={item.payment_id} style={{
                background: 'var(--pill-bg)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem' }}>{item.type}</span>
                    <span className={`badge ${item.status === 'PAID' ? 'badge-in' : 'badge-critical'}`}>
                      {item.status === 'PAID' ? 'Paid in Full' : 'Pending Payment'}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '8px' }}>
                    ₹{item.amount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Due by: {item.due_date}
                  </div>
                </div>

                {item.status !== 'PAID' && (
                  <button onClick={() => handlePayDue(item.payment_id)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                    <CreditCard size={15} /> Pay Online Now
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
