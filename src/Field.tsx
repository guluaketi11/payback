import { useEffect, useId, useState } from 'react';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  sliderStep?: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  onChange: (value: number) => void;
};

const fmt = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

export default function Field({ label, value, min, max, step, sliderStep, prefix, suffix, hint, onChange }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(fmt(value));
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(fmt(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(/[^\d.]/g, ''));
    if (raw.trim() === '' || Number.isNaN(parsed)) {
      setError(`Enter a number between ${fmt(min)} and ${fmt(max)}`);
      return;
    }
    if (parsed < min || parsed > max) {
      setError(`Use a value between ${fmt(min)} and ${fmt(max)}`);
      return;
    }
    setError('');
    onChange(parsed);
  };

  const fill = ((value - min) / (max - min)) * 100;

  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        {prefix && <span className="affix">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          value={draft}
          aria-invalid={!!error}
          aria-describedby={`${id}-msg`}
          onChange={(event) => {
            setDraft(event.target.value);
            commit(event.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setError('');
            setDraft(fmt(value));
          }}
        />
        {suffix && <span className="affix">{suffix}</span>}
      </div>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={sliderStep ?? step}
        value={Math.min(max, Math.max(min, value))}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
        aria-label={`${label} slider`}
        onChange={(event) => {
          setError('');
          onChange(Number(event.target.value));
        }}
      />
      <p className="msg" id={`${id}-msg`}>
        {error || hint || ' '}
      </p>
    </div>
  );
}
