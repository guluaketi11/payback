import { useEffect, useMemo, useRef, useState } from 'react';
import { addMonths, type Month } from './loan';
import { compactMoney, money, type Currency } from './format';

const HEIGHT = 260;
const M = { top: 16, right: 20, bottom: 30, left: 64 };

type Props = {
  amount: number;
  standard: Month[];
  withExtra: Month[] | null;
  start: string;
  currency: Currency;
};

export default function BalanceChart({ amount, standard, withExtra, start, currency }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const total = standard.length;
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const x = (i: number) => M.left + (i / total) * plotW;
  const y = (v: number) => M.top + (1 - v / amount) * plotH;

  const path = (months: Month[]) =>
    [`M${x(0)},${y(amount)}`, ...months.map((m) => `L${x(m.index)},${y(m.balance)}`)].join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: amount * f, y: y(amount * f) }));

  const xTicks = useMemo(() => {
    const years = Math.ceil(total / 12);
    const step = years <= 10 ? 2 : years <= 20 ? 5 : 10;
    const ticks = [];
    for (let yr = 0; yr <= years; yr += step) ticks.push({ x: x(Math.min(yr * 12, total)), label: yr === 0 ? 'Start' : `Year ${yr}` });
    return ticks;
  }, [total, width]);

  const balanceAt = (months: Month[], index: number) =>
    index === 0 ? amount : (months[Math.min(index, months.length) - 1]?.balance ?? 0);

  const onMove = (event: React.PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * total));
  };

  const onKey = (event: React.KeyboardEvent) => {
    const current = active ?? 0;
    const step = event.shiftKey ? 12 : 1;
    if (event.key === 'ArrowRight') setActive(Math.min(total, current + step));
    else if (event.key === 'ArrowLeft') setActive(Math.max(0, current - step));
    else if (event.key === 'Escape') setActive(null);
    else return;
    event.preventDefault();
  };

  const payoffExtra = withExtra?.length ?? 0;

  return (
    <div className="chart" ref={ref} onPointerLeave={() => setActive(null)}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        tabIndex={0}
        aria-label={`Remaining balance over ${Math.ceil(total / 12)} years${withExtra ? `, paid off after ${payoffExtra} months with extra payments` : ''}. Use left and right arrow keys to inspect months.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {yTicks.map((t) => (
          <g key={t.v}>
            <line className="grid" x1={M.left} x2={width - M.right} y1={t.y} y2={t.y} />
            <text className="tick" x={M.left - 10} y={t.y} textAnchor="end" dominantBaseline="middle">
              {compactMoney(t.v, currency)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.label} className="tick" x={t.x} y={HEIGHT - 8} textAnchor="middle">
            {t.label}
          </text>
        ))}

        <path className="line standard" d={path(standard)} />
        {withExtra && <path className="line extra" d={path(withExtra)} />}

        {withExtra && active === null && (
          <circle className="dot extra" cx={x(payoffExtra)} cy={y(0)} r={5} />
        )}

        {active !== null && (
          <>
            <line className="crosshair" x1={x(active)} x2={x(active)} y1={M.top} y2={HEIGHT - M.bottom} />
            <circle className="dot standard" cx={x(active)} cy={y(balanceAt(standard, active))} r={5} />
            {withExtra && <circle className="dot extra" cx={x(active)} cy={y(balanceAt(withExtra, active))} r={5} />}
          </>
        )}

        <rect
          className="hit"
          x={M.left}
          y={M.top}
          width={plotW}
          height={plotH}
          onPointerMove={onMove}
          onPointerDown={onMove}
        />
      </svg>

      {active !== null && (
        <div
          className="tooltip"
          style={{ left: Math.min(Math.max(x(active), 110), width - 110), top: M.top }}
        >
          <span className="tooltip-date">{active === 0 ? 'Start' : addMonths(start, active - 1)}</span>
          <span className="tooltip-row">
            <i className="key standard" />
            Standard <b>{money(balanceAt(standard, active), currency)}</b>
          </span>
          {withExtra && (
            <span className="tooltip-row">
              <i className="key extra" />
              With extra <b>{money(balanceAt(withExtra, active), currency)}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
