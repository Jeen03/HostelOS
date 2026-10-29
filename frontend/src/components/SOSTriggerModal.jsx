import React, { useState } from 'react';
import { AlertOctagon, PhoneCall, X, Send, MapPin, Info } from 'lucide-react';

export default function SOSTriggerModal({ isOpen, onClose, currentUser, onSOSCreated }) {
  const [location, setLocation] = useState('Block A - 1st Floor Corridor');
  const [description, setDescription] = useState('Urgent medical assistance required.');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: currentUser?.id || 'u_student1',
          location,
          description
        })
      });
      const data = await res.json();
      alert(`🚨 EMERGENCY BROADCAST SENT!\n\nIncident ID: ${data.incident_id}\n\nWarden, Gate Security, and Medical Unit have been notified immediately.`);
      if (onSOSCreated) onSOSCreated();
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to send emergency signal. Please call the security helpline directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        width: '100%',
        maxWidth: '480px',
        borderRadius: '18px',
        padding: '28px',
        border: '2px solid #dc2626',
        boxShadow: '0 0 60px rgba(220, 38, 38, 0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="pulse-sos" style={{ background: '#dc2626', borderRadius: '50%', padding: '8px', display: 'flex' }}>
              <AlertOctagon size={24} color="#fff" />
            </span>
            <div>
              <h2 style={{ fontSize: '1.3rem', color: '#991b1b', margin: 0 }}>Emergency SOS</h2>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c' }}>Broadcasts to Warden, Security & Medical Team</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex' }}>
            <X size={18} color="#991b1b" />
          </button>
        </div>

        {/* Warning Box */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', fontSize: '0.83rem', color: '#991b1b' }}>
          <strong>⚠ Use for real emergencies only:</strong> Medical distress, fire, safety threats, or physical assault. A team will be dispatched immediately.
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.82rem', color: '#374151', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
              📍 Your Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Block A Room 101, Mess Hall, Sports Ground"
              required
              style={{ background: '#fff', borderColor: '#fca5a5', color: '#0f172a' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.82rem', color: '#374151', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
              📝 What is happening?
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your emergency clearly..."
              required
              style={{ background: '#fff', borderColor: '#fca5a5', color: '#0f172a' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#9ca3af' : '#dc2626',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 800,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              letterSpacing: '0.02em'
            }}
          >
            <Send size={18} /> {submitting ? 'TRANSMITTING EMERGENCY...' : '🚨 SEND EMERGENCY ALERT NOW'}
          </button>
        </form>

        {/* Direct Helplines */}
        <div style={{ marginTop: '16px', borderTop: '1px solid #fecaca', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <div>
            <div style={{ color: '#9ca3af' }}>Security Desk</div>
            <a href="tel:+919800000030" style={{ color: '#dc2626', fontWeight: 700, textDecoration: 'none' }}>+91 98000 00030</a>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#9ca3af' }}>Health Centre</div>
            <a href="tel:+919800000099" style={{ color: '#dc2626', fontWeight: 700, textDecoration: 'none' }}>+91 98000 00099</a>
          </div>
        </div>
      </div>
    </div>
  );
}
