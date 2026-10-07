export type LoanInput = {
  amount: number;
  rate: number;
  years: number;
  extra: number;
  start: string;
};

export type Month = {
  index: number;
  principal: number;
  interest: number;
  balance: number;
};

export type Schedule = {
  payment: number;
  months: Month[];
  totalInterest: number;
  totalPaid: number;
};

export const monthlyPayment = (amount: number, rate: number, years: number) => {
  const n = years * 12;
  const r = rate / 100 / 12;
  if (r === 0) return amount / n;
  return (amount * r) / (1 - Math.pow(1 + r, -n));
};

export const buildSchedule = (input: LoanInput, extra: number): Schedule => {
  const payment = monthlyPayment(input.amount, input.rate, input.years);
  const r = input.rate / 100 / 12;
  const months: Month[] = [];
  let balance = input.amount;
  let totalInterest = 0;

  for (let index = 1; balance > 0.005 && index <= input.years * 12; index++) {
    const interest = balance * r;
    const principal = Math.min(balance, payment - interest + extra);
    balance -= principal;
    totalInterest += interest;
    months.push({ index, principal, interest, balance: Math.max(0, balance) });
  }

  return { payment, months, totalInterest, totalPaid: input.amount + totalInterest };
};

export const yearly = (months: Month[]) => {
  const years: { year: number; principal: number; interest: number; balance: number }[] = [];
  for (const m of months) {
    const year = Math.ceil(m.index / 12);
    const row = years[year - 1] ?? (years[year - 1] = { year, principal: 0, interest: 0, balance: 0 });
    row.principal += m.principal;
    row.interest += m.interest;
    row.balance = m.balance;
  }
  return years;
};

export const addMonths = (start: string, count: number) => {
  const [y, m] = start.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + count, 1));
  return date.toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });
};
