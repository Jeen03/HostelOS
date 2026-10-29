import React, { useState, useEffect } from 'react';
import { Utensils, RefreshCw, Leaf, TrendingUp, Package } from 'lucide-react';

export default function MessPortal({ currentUser }) {
  const [overview, setOverview] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newStockVal, setNewStockVal] = useState('');

  useEffect(() => {
    loadMessData();
  }, []);

  const loadMessData = async () => {
    try {
      const [mRes, iRes] = await Promise.all([
        fetch('/api/mess/overview'),
        fetch('/api/mess/inventory')
      ]);
      setOverview(await mRes.json());
      setInventory(await iRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStock = async (itemId, val) => {
    try {
      await fetch(`/api/mess/update-stock?item_id=${itemId}&new_stock=${val}`, { method: 'POST' });
      setSelectedItem(null);
      loadMessData();
      alert('Stock updated successfully.');
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
            <h1 style={{ fontSize: '1.65rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Utensils color="var(--primary)" size={26} /> Mess Operations & Kitchen Stock
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              AI Meal Demand Forecast & Ingredient Stock Management
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '8px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Food Waste Rate</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px' }}>
                {overview?.metrics?.avg_waste_rate || 5.2}%
              </div>
            </div>
            <div style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '8px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Forecast Accuracy</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                ±{overview?.metrics?.mae || 11.2} meals
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meal Forecast Cards */}
      {overview?.upcoming_forecast && (
        <div className="glass-panel" style={{ padding: '22px', marginBottom: '22px' }}>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="var(--primary)" /> Today's Meal Preparation Forecast
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Based on {overview.upcoming_forecast.present_residents} students currently on campus
              ({overview.upcoming_forecast.on_leave_residents} on approved leave).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {Object.entries(overview.upcoming_forecast.forecasts).map(([mealName, details]) => (
              <div key={mealName} style={{ background: 'var(--pill-bg)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-main)', fontSize: '1.05rem' }}>{mealName}</strong>
                  <span className="badge badge-ai" style={{ fontSize: '0.72rem' }}>{details.buffer_margin} buffer</span>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expected Diners</span>
                    <strong style={{ color: 'var(--text-main)' }}>{details.estimated_diners}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Prepare For</span>
                    <strong style={{ color: 'var(--primary)' }}>{details.recommended_prep} plates</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="glass-panel" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="var(--primary)" /> Kitchen Stock & Reorder Status
          </h3>
          <button onClick={loadMessData} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                {['Item Name', 'Category', 'Current Stock', 'Days Left', 'Status', 'Action'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.item_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{item.category}</td>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{item.current_stock} {item.unit}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: item.days_until_stockout < 3 ? 'var(--accent-rose)' : item.days_until_stockout < 7 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                    {item.days_until_stockout} days
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge ${item.stock_health === 'REORDER_URGENT' ? 'badge-critical' : item.stock_health === 'REORDER_WARNING' ? 'badge-out' : 'badge-in'}`} style={{ fontSize: '0.7rem' }}>
                      {item.stock_health === 'REORDER_URGENT' ? '⚠ Order Now' : item.stock_health === 'REORDER_WARNING' ? '⏳ Running Low' : '✅ Good'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {selectedItem === item.item_id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={newStockVal}
                          onChange={(e) => setNewStockVal(e.target.value)}
                          style={{ width: '80px', padding: '4px 6px', fontSize: '0.8rem' }}
                        />
                        <button onClick={() => handleUpdateStock(item.item_id, newStockVal)} className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>
                          Save
                        </button>
                        <button onClick={() => setSelectedItem(null)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => { setSelectedItem(item.item_id); setNewStockVal(item.current_stock); }} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }}>
                        Update Stock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
