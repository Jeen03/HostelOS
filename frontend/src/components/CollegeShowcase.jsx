import React, { useState, useEffect } from 'react';
import {
  Building2, Shield, Utensils, Wifi, Dumbbell,
  CheckCircle2, Phone, Award, LogIn
} from 'lucide-react';

export default function CollegeShowcase({ onGoToLogin }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/public/showcase')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => console.error(e));
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px' }} className="animate-fade-in">
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-light), #eff6ff)',
        border: '1px solid var(--border-glow)',
        borderRadius: '18px',
        padding: '40px 32px',
        textAlign: 'center',
        marginBottom: '28px'
      }}>
        <div style={{ display: 'inline-flex', background: 'var(--primary)', padding: '12px', borderRadius: '14px', marginBottom: '16px' }}>
          <Building2 size={32} color="#fff" />
        </div>
        <h1 style={{ fontSize: '2.1rem', color: 'var(--text-main)', marginBottom: '8px' }}>
          Campus Residential Complex
        </h1>
        <h2 style={{ fontSize: '1.15rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '12px' }}>
          Smart Hostel Management System
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '620px', margin: '0 auto', fontSize: '0.92rem', lineHeight: 1.6 }}>
          A modern, secure student residence with high-speed Wi-Fi, AI meal planning, automated gate verification, and 24/7 emergency response.
        </p>

        <button onClick={onGoToLogin} className="btn btn-primary" style={{ marginTop: '22px', padding: '12px 28px', fontSize: '1rem' }}>
          <LogIn size={18} /> Sign In to Your Portal
        </button>

        {/* Live Stats */}
        {data && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px',
            marginTop: '28px'
          }}>
            {[
              { label: 'Total Bed Capacity', value: `${data.statistics.total_capacity} Beds`, color: 'var(--primary)' },
              { label: 'Available Rooms', value: `${data.statistics.vacant_rooms} Vacancies`, color: 'var(--accent-emerald)' },
              { label: 'Campus Wi-Fi', value: 'Wi-Fi 6 Active', color: 'var(--accent-cyan)' },
              { label: 'Gate Access', value: 'QR Verified', color: 'var(--accent-amber)' },
            ].map((stat) => (
              <div key={stat.label} className="glass-panel" style={{ padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: stat.color, marginTop: '4px' }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hostel Facilities Grid */}
      <h3 style={{ fontSize: '1.35rem', marginBottom: '16px', color: 'var(--text-main)', textAlign: 'center' }}>
        What's Available for Residents
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {data?.amenities?.map((a, i) => (
          <div key={i} className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" /> {a.title}
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              {a.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Contact Footer */}
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', borderRadius: '14px' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '12px', fontWeight: 700 }}>
          Hostel Enquiries & Support
        </h4>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          {[
            { label: 'Warden Office', phone: '+91 98000 00020' },
            { label: 'Gate Security', phone: '+91 98000 00030' },
            { label: 'Health Centre', phone: '+91 98000 00099' },
          ].map((c) => (
            <div key={c.phone}>
              {c.label}: <a href={`tel:${c.phone.replace(/\s/g, '')}`} style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>{c.phone}</a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
