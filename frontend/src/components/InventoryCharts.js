import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// B/W SaaS palette — from near-black to light gray
const PALETTE = [
  '#111111', '#2a2a2a', '#404040', '#565656', '#6c6c6c',
  '#828282', '#989898', '#afafaf', '#c5c5c5', '#dbdbdb',
  '#1f1f1f', '#353535',
];

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="inv-chart-tooltip">
      <p className="inv-chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || '#111', margin: '2px 0', fontSize: '0.8rem' }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="inv-chart-tooltip">
      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem' }}>{d.name}</p>
      <p style={{ margin: '2px 0', fontSize: '0.8rem' }}>
        {d.value} &nbsp;<span style={{ opacity: 0.6 }}>({d.payload.pct}%)</span>
      </p>
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub }) => (
  <div className="inv-stat-card">
    <div className="inv-stat-value">{value}</div>
    <div className="inv-stat-label">{label}</div>
    {sub && <div className="inv-stat-sub">{sub}</div>}
  </div>
);

// ── MEDICINE ─────────────────────────────────────────────────────────────────
const MedicineCharts = ({ records, labels }) => {
  const { barData, pieData, stats } = useMemo(() => {
    if (!records.length) return { barData: [], pieData: [], stats: {} };

    const totalOpening = records.reduce((s, r) => s + (r.openingStock || 0), 0);
    const totalPurchased = records.reduce((s, r) => s + (r.unitsPurchased || 0), 0);
    const totalUnits = totalOpening + totalPurchased;

    const bar = records.map((r) => ({
      name: labels[r.medicineType] || r.medicineType,
      'Opening Stock': r.openingStock || 0,
      'Purchased': r.unitsPurchased || 0,
    }));

    const pie = records.map((r) => {
      const total = (r.openingStock || 0) + (r.unitsPurchased || 0);
      const pct = totalUnits > 0 ? ((total / totalUnits) * 100).toFixed(1) : '0';
      return { name: labels[r.medicineType] || r.medicineType, value: total, pct };
    }).filter((d) => d.value > 0);

    return {
      barData: bar,
      pieData: pie,
      stats: { records: records.length, totalOpening, totalPurchased },
    };
  }, [records, labels]);

  if (!records.length) return null;

  return (
    <div className="inv-charts-wrapper">
      {/* Stats row */}
      <div className="inv-stats-row">
        <StatCard label="Medicine Types" value={stats.records} />
        <StatCard label="Total Opening Stock" value={stats.totalOpening} />
        <StatCard label="Total Purchased" value={stats.totalPurchased} />
        <StatCard label="Combined Units" value={stats.totalOpening + stats.totalPurchased} />
      </div>

      {/* Charts row */}
      <div className="inv-charts-row">
        {/* Bar chart */}
        <div className="inv-chart-card">
          <h4 className="inv-chart-title">Stock by Medicine Type</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="Opening Stock" stackId="a" fill="#111111" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Purchased" stackId="a" fill="#888888" radius={[3, 3, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="inv-chart-card">
          <h4 className="inv-chart-title">Category Distribution</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                formatter={(value) => value.length > 14 ? value.slice(0, 13) + '…' : value}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ── FEED ──────────────────────────────────────────────────────────────────────
const FeedCharts = ({ records, labels }) => {
  const { barData, pieData, stats } = useMemo(() => {
    if (!records.length) return { barData: [], pieData: [], stats: {} };

    const totalAvailableAll = records.reduce((s, r) => s + (r.openingStock || 0) + (r.unitsBrought || 0), 0);
    const lowStockItems = records.filter((r) => {
      const total = (r.openingStock || 0) + (r.unitsBrought || 0);
      return total > 0 && (r.unitsLeft || 0) < total * 0.2;
    });
    const emptyItems = records.filter((r) => (r.unitsLeft || 0) <= 0);

    const bar = records.map((r) => ({
      name: labels[r.feedType] || r.feedType,
      'Units Left': Math.max(0, r.unitsLeft || 0),
      'Used': r.totalUsed || 0,
    }));

    const pie = records.map((r) => {
      const total = (r.openingStock || 0) + (r.unitsBrought || 0);
      const pct = totalAvailableAll > 0 ? ((total / totalAvailableAll) * 100).toFixed(1) : '0';
      return { name: labels[r.feedType] || r.feedType, value: total, pct };
    }).filter((d) => d.value > 0);

    return {
      barData: bar,
      pieData: pie,
      stats: {
        types: records.length,
        low: lowStockItems.length,
        empty: emptyItems.length,
        total: totalAvailableAll,
      },
    };
  }, [records, labels]);

  if (!records.length) return null;

  return (
    <div className="inv-charts-wrapper">
      <div className="inv-stats-row">
        <StatCard label="Feed Types" value={stats.types} />
        <StatCard label="Total Available" value={stats.total} />
        <StatCard label="Low Stock" value={stats.low} sub="< 20% remaining" />
        <StatCard label="Empty" value={stats.empty} sub="Needs restocking" />
      </div>

      <div className="inv-charts-row">
        <div className="inv-chart-card">
          <h4 className="inv-chart-title">Stock vs Usage by Feed Type</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="Units Left" stackId="a" fill="#111111" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Used" stackId="a" fill="#aaaaaa" radius={[3, 3, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="inv-chart-card">
          <h4 className="inv-chart-title">Feed Type Distribution</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                formatter={(value) => value.length > 14 ? value.slice(0, 13) + '…' : value}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ── GROCERIES ─────────────────────────────────────────────────────────────────
const GroceriesCharts = ({ records }) => {
  const { barData, barLabel, pieData, stats } = useMemo(() => {
    if (!records.length) return { barData: [], barLabel: 'Quantity', pieData: [], stats: {} };

    const totalValue = records.reduce((s, r) => s + (r.totalPrice || 0), 0);
    const totalQty = records.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const hasPrice = records.some((r) => (r.totalPrice || 0) > 0);

    // Bar chart: top 8 by value — fallback to qty if no prices set
    const sortKey = hasPrice ? 'totalPrice' : 'quantity';
    const label = hasPrice ? 'Value (₹)' : 'Quantity';
    const sorted = [...records]
      .sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0))
      .slice(0, 8);

    const bar = sorted.map((r) => ({
      name: r.name.length > 14 ? r.name.slice(0, 13) + '…' : r.name,
      [label]: parseFloat((Number(r[sortKey]) || 0).toFixed(2)),
    }));

    // Pie: top 5 + others (by value if available, else qty)
    const pieTotalBase = hasPrice ? totalValue : totalQty;
    const sortedForPie = [...records]
      .sort((a, b) => (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0));
    const top5 = sortedForPie.slice(0, 5).filter((r) => (Number(r[sortKey]) || 0) > 0);
    const othersValue = sortedForPie.slice(5).reduce((s, r) => s + (Number(r[sortKey]) || 0), 0);

    const pie = [
      ...top5.map((r) => ({
        name: r.name.length > 16 ? r.name.slice(0, 15) + '…' : r.name,
        value: parseFloat((Number(r[sortKey]) || 0).toFixed(2)),
        pct: pieTotalBase > 0 ? (((Number(r[sortKey]) || 0) / pieTotalBase) * 100).toFixed(1) : '0',
      })),
      ...(othersValue > 0
        ? [{ name: 'Others', value: parseFloat(othersValue.toFixed(2)), pct: pieTotalBase > 0 ? ((othersValue / pieTotalBase) * 100).toFixed(1) : '0' }]
        : []),
    ];

    return { barData: bar, barLabel: label, pieData: pie, stats: { count: records.length, totalValue, totalQty } };
  }, [records]);

  if (!records.length) return null;

  return (
    <div className="inv-charts-wrapper">
      <div className="inv-stats-row">
        <StatCard label="Total Items" value={stats.count} />
        <StatCard label="Total Value" value={`₹${(stats.totalValue || 0).toFixed(2)}`} />
        <StatCard label="Total Quantity" value={(stats.totalQty || 0).toFixed(1)} />
      </div>

      <div className="inv-charts-row">
        <div className="inv-chart-card">
          <h4 className="inv-chart-title">{barLabel === 'Value (\u20b9)' ? 'Top Items by Spend (\u20b9)' : 'Top Items by Quantity'}</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} width={45} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey={barLabel} fill="#111111" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="inv-chart-card">
          <h4 className="inv-chart-title">Spending Distribution</h4>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────────────────
const InventoryCharts = ({ type, records, labels }) => {
  if (!records || records.length === 0) return null;

  if (type === 'medicine') return <MedicineCharts records={records} labels={labels || {}} />;
  if (type === 'feed') return <FeedCharts records={records} labels={labels || {}} />;
  if (type === 'groceries') return <GroceriesCharts records={records} />;
  return null;
};

export default InventoryCharts;
