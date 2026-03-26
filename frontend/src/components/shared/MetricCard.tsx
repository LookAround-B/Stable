
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import HorseIcon from '@/components/shared/HorseIcon';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: 'primary' | 'success' | 'destructive' | 'warning';
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: 'default' | 'alert' | 'success';
}

export default function MetricCard({ title, value, subtitle, subtitleColor = 'primary', icon: Icon, trend, variant = 'default' }: MetricCardProps) {
  const accentClass = variant === 'alert'
    ? 'text-destructive'
    : variant === 'success'
    ? 'text-success'
    : 'text-foreground';

  const subtitleColorClass = {
    primary: 'text-primary',
    success: 'text-success',
    destructive: 'text-destructive',
    warning: 'text-warning',
  }[subtitleColor];

  const iconBgClass = variant === 'alert'
    ? 'bg-destructive/10 text-destructive'
    : variant === 'success'
    ? 'bg-success/10 text-success'
    : 'bg-primary/10 text-primary';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-highest rounded-xl p-4 edge-glow card-hover leather-grain relative overflow-hidden group min-h-[140px] flex flex-col justify-between"
    >
      {/* Horse watermark */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity rotate-[-10deg]">
        <HorseIcon className="w-28 h-28" />
      </div>
      <div className="flex items-start justify-between mb-2 relative z-10">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">{title}</span>
        <div className={`w-9 h-9 rounded-xl ${iconBgClass} flex items-center justify-center shrink-0`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="relative z-10 mt-auto">
        <div className={`text-3xl font-bold ${accentClass} tracking-tight animate-count`}>{value}</div>
        {subtitle && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full ${subtitleColor === 'destructive' ? 'bg-destructive' : subtitleColor === 'success' ? 'bg-success' : 'bg-primary'}`} />
            <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${subtitleColorClass}`}>{subtitle}</p>
          </div>
        )}
        {trend && (
          <p className={`text-[10px] mt-1.5 mono-data ${trend.value >= 0 ? 'text-success' : 'text-destructive'}`}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </motion.div>
  );
}

