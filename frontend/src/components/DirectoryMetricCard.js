import React, { useEffect, useState } from 'react';
import HorseIcon from './HorseIcon';
import EmployeeFaceIcon from './EmployeeFaceIcon';

const normalizeSparkData = (values = []) => {
  const raw = values.map((value) => Number(value) || 0);
  const active = raw.filter((value) => value > 0);
  const source = (active.length ? active : raw).slice(-6);
  const count = Math.min(6, Math.max(3, source.length || 0));
  const padded = Array.from({ length: count }, (_, index) => {
    const offset = count - source.length;
    return index < offset ? 0 : source[index - offset] || 0;
  });

  const max = Math.max(...padded, 0);
  let heights = padded.map((value, index) => {
    if (!max) {
      return 34 + index * 11;
    }
    return Math.max(Math.round((value / max) * 100), 30 + index * 8);
  });

  heights = heights.reduce((acc, height, index) => {
    const previous = index ? acc[index - 1] : 0;
    const nextHeight = index === 0
      ? Math.max(height, 34)
      : Math.min(Math.max(height, previous + 8), previous + 14);
    acc.push(Math.min(nextHeight, 100));
    return acc;
  }, []);

  return heights;
};

const useCounterAnimation = (targetValue, duration = 900) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof targetValue !== 'number') {
      setDisplayValue(targetValue);
      return undefined;
    }

    if (targetValue === 0) {
      setDisplayValue(0);
      return undefined;
    }

    const startTime = Date.now();
    let frameId;

    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      setDisplayValue(Math.floor(targetValue * progress));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [targetValue, duration]);

  return displayValue;
};

const WATERMARK_ICON = {
  horse: HorseIcon,
  employee: EmployeeFaceIcon,
};

export default function DirectoryMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  sparkData = [],
  watermark = 'horse',
  iconTone = 'primary',
  subtitleTone = 'primary',
  variant = 'default',
  hideTitle = false,
}) {
  const animatedValue = useCounterAnimation(typeof value === 'number' ? value : 0, 1000);
  const displayValue = typeof value === 'number' ? animatedValue : value;
  const normalizedSpark = normalizeSparkData(sparkData);
  const WatermarkIcon = WATERMARK_ICON[watermark] || HorseIcon;
  const renderIcon = () => {
    if (Icon === HorseIcon || Icon === EmployeeFaceIcon) {
      return <Icon className="dashboard-lovable-card-icon-svg" />;
    }
    return <Icon size={18} strokeWidth={2} className="dashboard-lovable-card-icon-svg" />;
  };

  return (
    <div className={`dashboard-lovable-card dashboard-lovable-card--${variant} directory-kpi-card-shell ${hideTitle ? 'directory-kpi-card-shell--hide-title' : ''}`}>
      <div className={`dashboard-lovable-card-watermark directory-kpi-card-watermark--${watermark}`}>
        <WatermarkIcon />
      </div>

      <div className="dashboard-lovable-card-head">
        {!hideTitle && <span className="dashboard-lovable-card-title">{title}</span>}
        <div className={`dashboard-lovable-card-icon dashboard-lovable-card-icon--${iconTone}`}>
          {renderIcon()}
        </div>
      </div>

      <div className="dashboard-lovable-card-body">
        <div className="dashboard-lovable-card-value">{displayValue}</div>
        <div className="dashboard-lovable-card-footer">
          <div className={`dashboard-lovable-card-sub dashboard-lovable-card-sub--${subtitleTone}`}>{subtitle}</div>
          {normalizedSpark.some((entry) => entry > 0) && (
            <div className="dashboard-lovable-card-spark" aria-hidden="true">
              {normalizedSpark.map((entry, index) => (
                <span key={index} style={{ height: `${entry}%` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
