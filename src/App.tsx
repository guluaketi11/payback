import { useEffect, useMemo, useState } from 'react';
import BalanceChart from './BalanceChart';
import Field from './Field';
import { addMonths, buildSchedule, yearly, type LoanInput } from './loan';
import { currencies, money, type Currency } from './format';

const thisMonth = () => new Date().toISOString().slice(0, 7);

const fromUrl = (): LoanInput & { currency: Currency } => {
  const p = new URLSearchParams(location.search);
  const num = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(p.get(key));
    return p.has(key) && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  };
  const currency = p.get('c') as Currency;
  return {
    amount: num('a', 150000, 1000, 5000000),
    rate: num('r', 11, 0, 30),
    years: num('y', 20, 1, 40),
    extra: num('x', 300, 0, 100000),
    start: /^\d{4}-\d{2}$/.test(p.get('s') ?? '') ? p.get('s')! : thisMonth(),
    currency: currency in currencies ? currency : 'GEL',
  };
};

export default function App() {
  const [state, setState] = useState(fromUrl);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  const { amount, rate, years, extra, start, currency } = state;

  const set = (changes: Partial<typeof state>) => setState((s) => ({ ...s, ...changes }));

  useEffect(() => {
    const p = new URLSearchParams({ a: `${amount}`, r: `${rate}`, y: `${years}`, x: `${extra}`, s: start, c: currency });
    history.replaceState(null, '', `?${p}`);
  }, [amount, rate, years, extra, start, currency]);

  const standard = useMemo(() => buildSchedule(state, 0), [amount, rate, years]);
  const boosted = useMemo(() => (extra > 0 ? buildSchedule(state, extra) : null), [amount, rate, years, extra]);
  const active = boosted ?? standard;
  const rows = useMemo(() => yearly(active.months), [active]);

  const monthsSaved = boosted ? standard.months.length - boosted.months.length : 0;
  const interestSaved = boosted ? standard.totalInterest - boosted.totalInterest : 0;
  const interestShare = active.totalInterest / active.totalPaid;
  const visibleRows = showAll ? rows : rows.slice(0, 5);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('payback-theme', next);
    } catch {
      setTheme(next);
    }
    setTheme(next);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const duration = (months: number) => {
    const y = Math.floor(months / 12);
    const m = months % 12;
    return [y && `${y} ${y === 1 ? 'year' : 'years'}`, m && `${m} ${m === 1 ? 'month' : 'months'}`].filter(Boolean).join(' ');
  };

  return (
    <div className="page">
      <header className="topbar">
        <span className="logo">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="9" />
            <path d="M8 22 L14 15 L18 18.5 L24 10" />
          </svg>
          Payback
        </span>
        <div className="top-actions">
          <label className="currency">
            <span className="sr-only">Currency</span>
            <select value={currency} onChange={(event) => set({ currency: event.target.value as Currency })}>
              {Object.entries(currencies).map(([code, c]) => (
                <option key={code} value={code}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {theme === 'dark' ? (
                <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              ) : (
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <main className="main">
        <div className="intro">
          <h1>How much will your loan really cost?</h1>
          <p>Change the numbers and see your monthly payment, total interest and how much an extra payment each month saves you.</p>
        </div>

        <div className="grid">
          <section className="card inputs" aria-label="Loan details">
            <Field
              label="Loan amount"
              value={amount}
              min={1000}
              max={5000000}
              step={1000}
              sliderStep={5000}
              prefix={currencies[currency].label.split(' ')[1]}
              onChange={(v) => set({ amount: v })}
            />
            <Field
              label="Interest rate"
              value={rate}
              min={0}
              max={30}
              step={0.05}
              sliderStep={0.25}
              suffix="% / year"
              onChange={(v) => set({ rate: v })}
            />
            <Field
              label="Loan term"
              value={years}
              min={1}
              max={40}
              step={1}
              suffix="years"
              onChange={(v) => set({ years: Math.round(v) })}
            />
            <Field
              label="Extra payment"
              value={extra}
              min={0}
              max={Math.max(5000, Math.round(amount / 10))}
              step={10}
              sliderStep={50}
              prefix={currencies[currency].label.split(' ')[1]}
              suffix="/ month"
              hint="Paid on top of your regular payment, straight off the principal."
              onChange={(v) => set({ extra: v })}
            />
            <div className="field">
              <label htmlFor="start">First payment</label>
              <div className="input-wrap">
                <input id="start" type="month" value={start} onChange={(event) => event.target.value && set({ start: event.target.value })} />
              </div>
            </div>
          </section>

          <section className="results" aria-live="polite">
            <div className="card summary">
              <div className="hero">
                <span className="label">Monthly payment</span>
                <strong className="hero-value">{money(active.payment + extra, currency)}</strong>
                {extra > 0 && (
                  <span className="sub">
                    {money(active.payment, currency)} regular + {money(extra, currency)} extra
                  </span>
                )}
              </div>
              <dl className="stats">
                <div>
                  <dt>Total interest</dt>
                  <dd>{money(active.totalInterest, currency)}</dd>
                </div>
                <div>
                  <dt>Total paid</dt>
                  <dd>{money(active.totalPaid, currency)}</dd>
                </div>
                <div>
                  <dt>Paid off</dt>
                  <dd>{addMonths(start, active.months.length - 1)}</dd>
                </div>
              </dl>

              <div className="split" aria-label={`Principal ${Math.round((1 - interestShare) * 100)} percent, interest ${Math.round(interestShare * 100)} percent of everything you pay`}>
                <div className="split-bar">
                  <span className="seg principal" style={{ flexGrow: 1 - interestShare }} />
                  <span className="seg interest" style={{ flexGrow: interestShare }} />
                </div>
                <div className="split-legend">
                  <span>
                    <i className="key principal" />
                    Principal <b>{Math.round((1 - interestShare) * 100)}%</b>
                  </span>
                  <span>
                    <i className="key interest" />
                    Interest <b>{Math.round(interestShare * 100)}%</b>
                  </span>
                </div>
              </div>

              {boosted && monthsSaved > 0 && (
                <p className="savings">
                  Paying {money(extra, currency)} extra each month clears the loan <b>{duration(monthsSaved)} sooner</b> and
                  saves you <b>{money(interestSaved, currency)}</b> in interest.
                </p>
              )}
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Remaining balance</h2>
                {boosted && (
                  <div className="legend">
                    <span>
                      <i className="key standard" />
                      Regular payments
                    </span>
                    <span>
                      <i className="key extra" />
                      With extra payment
                    </span>
                  </div>
                )}
              </div>
              <BalanceChart
                amount={amount}
                standard={standard.months}
                withExtra={boosted?.months ?? null}
                start={start}
                currency={currency}
              />
            </div>

            <div className="card">
              <div className="card-head">
                <h2>Yearly breakdown</h2>
                <span className="muted">{extra > 0 ? 'With extra payment' : 'Regular payments'}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Principal</th>
                      <th>Interest</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.year}>
                        <td>{row.year}</td>
                        <td>{money(row.principal, currency)}</td>
                        <td>{money(row.interest, currency)}</td>
                        <td>{money(row.balance, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <button type="button" className="text-btn" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? 'Show first 5 years' : `Show all ${rows.length} years`}
                </button>
              )}
            </div>

            <div className="share">
              <button type="button" className="btn" onClick={copyLink}>
                {copied ? 'Link copied' : 'Copy link to this calculation'}
              </button>
              <p className="muted">Estimates only. Your bank's figures may differ slightly because of fees and rounding.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
