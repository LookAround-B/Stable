import React from 'react';

const OperationalMetricCard = ({
  label,
  value,
  icon: Icon,
  colorClass = 'text-primary',
  bgClass = 'bg-primary/10',
  sub = '',
  hideSub = false,
  subColor = 'text-muted-foreground',
  valueClass = 'text-3xl font-bold text-foreground mt-1 mono-data relative z-10',
}) => {
  return (
    <div className="bg-surface-container-highest rounded-xl p-5 edge-glow relative overflow-hidden group">
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
        <Icon className="w-24 h-24" />
      </div>
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="text-[10px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-lg ${bgClass} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colorClass}`} />
        </div>
      </div>
      <p className={valueClass}>{value}</p>
      {sub && !hideSub ? <p className={`text-xs mt-1 relative z-10 ${subColor}`}>{sub}</p> : null}
    </div>
  );
};

export default OperationalMetricCard;
