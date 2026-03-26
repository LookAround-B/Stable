import React, { useEffect, useState } from 'react';
import HorseIcon from './HorseIcon';
import EmployeeFaceIcon from './EmployeeFaceIcon';

const normalizeSparkData = (values = [], count = 6) => {
  const sliced = values.slice(-count);
  const padding = Math.max(0, count - sliced.length);
  return Array.from({ length: count }, (_, index) => {
    if (index < padding) return 0;
    return Number(sliced[index - padding]) || 0;
  });
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
}) {
  const animatedValue = useCounterAnimation(typeof value === 'number' ? value : 0, 1000);
  const displayValue = typeof value === 'number' ? animatedValue : value;
  const normalizedSpark = normalizeSparkData(sparkData);
  const maxSpark = Math.max(...normalizedSpark, 0);
  const WatermarkIcon = WATERMARK_ICON[watermark] || HorseIcon;

  return (
    <div className={`directory-kpi-card directory-kpi-card--${variant}`}>
      <div className={`directory-kpi-card-watermark directory-kpi-card-watermark--${watermark}`}>
        <WatermarkIcon />
      </div>

      <div className="directory-kpi-card-head">
        <span className="directory-kpi-card-title">{title}</span>
        <div className={`directory-kpi-card-icon directory-kpi-card-icon--${iconTone}`}>
          <Icon size={18} strokeWidth={2} />
        </div>
      </div>

      <div className="directory-kpi-card-body">
        <div className="directory-kpi-card-value">{displayValue}</div>
        <div className="directory-kpi-card-footer">
          <div className={`directory-kpi-card-sub directory-kpi-card-sub--${subtitleTone}`}>{subtitle}</div>
          {normalizedSpark.some((entry) => entry > 0) && (
            <div className="directory-kpi-card-spark" aria-hidden="true">
              {normalizedSpark.map((entry, index) => (
                <span key={index} style={{ height: `${maxSpark ? (entry / maxSpark) * 100 : 0}%` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
