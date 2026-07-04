import React, { createContext, useState, useEffect, useCallback, useContext, ReactNode } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { withTimeout } from '@/utils/asyncTimeout';
import { deferUntilAfterFirstPaint, getDeferredSupabaseClient, type DeferredSupabaseClient } from '@/utils/deferredSupabase';
import { MILEAGE_RATE_GBP } from '@/constants/config';

export interface ManualIncomeEntry {
  id: string;
  therapist_id: string;
  amount: number;
  date: string;
  source_label: string | null;
  category: string | null;
  tax_rate: number;
  tax_set_aside: number;
  created_at: string;
  source: 'manual';
}

export interface InvoiceIncomeEntry {
  id: string;
  invoice_id: string;
  amount: number;
  date_paid: string;
  tax_rate: number;
  tax_set_aside: number;
  source: 'invoice';
}

export type IncomeEntry = ManualIncomeEntry | InvoiceIncomeEntry;

export interface Expense {
  id: string;
  therapist_id: string;
  amount: number;
  category: string;
  vendor: string | null;
  note: string | null;
  spent_on: string | null;
  mileage_miles: number | null;
  receipt_path: string | null;
  created_at: string;
}

export interface TaxSummary {
  totalSetAside: number;
  invoiceIncomeTotal: number;
  manualIncomeTotal: number;
  totalEarnings: number;
  totalExpenses: number;
  netProfit: number;
  yearlyProjection: number;
  estimatedTax: number;
}

interface TaxPotContextType {
  manualIncome: ManualIncomeEntry[];
  invoiceIncome: InvoiceIncomeEntry[];
  allIncome: IncomeEntry[];
  expenses: Expense[];
  summary: TaxSummary;
  taxRate: number;
  loading: boolean;
  setTaxRate: (rate: number) => Promise<void>;
  addManualIncome: (entry: { amount: number; date: string; source_label?: string; category?: string; tax_rate: number }) => Promise<void>;
  deleteManualIncome: (id: string) => Promise<void>;
  addExpense: (e: Partial<Expense>) => Promise<{ error: string | null }>;
  deleteExpense: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const TaxPotContext = createContext<TaxPotContextType | undefined>(undefined);

const SYNC_TIMEOUT_MS = 8000;

/** Deductible value of an expense — mileage is computed at the HMRC simplified rate. */
export function deductibleAmount(e: Pick<Expense, 'amount' | 'category' | 'mileage_miles'>): number {
  if (e.category === 'mileage' && e.mileage_miles != null) {
    return Math.round(e.mileage_miles * MILEAGE_RATE_GBP * 100) / 100;
  }
  return e.amount;
}

function calcSummary(
  manual: ManualIncomeEntry[],
  invoice: InvoiceIncomeEntry[],
  expenses: Expense[],
  taxRate: number
): TaxSummary {
  const manualTotal = manual.reduce((s, i) => s + i.amount, 0);
  const invoiceTotal = invoice.reduce((s, i) => s + i.amount, 0);
  const totalEarnings = manualTotal + invoiceTotal;
  const totalExpenses = expenses.reduce((s, e) => s + deductibleAmount(e), 0);
  const netProfit = Math.max(0, totalEarnings - totalExpenses);

  const totalSetAside =
    manual.reduce((s, i) => s + i.tax_set_aside, 0) +
    invoice.reduce((s, i) => s + i.tax_set_aside, 0);

  // UK tax year runs Apr 6 – Apr 5. Project from months elapsed since Apr 6.
  const now = new Date();
  const taxYearStart = new Date(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1, 3, 6);
  const monthsElapsed = Math.max(1, (now.getTime() - taxYearStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  const yearlyProjection = (netProfit / monthsElapsed) * 12;
  const estimatedTax = yearlyProjection * (taxRate / 100);

  return {
    totalSetAside,
    invoiceIncomeTotal: invoiceTotal,
    manualIncomeTotal: manualTotal,
    totalEarnings,
    totalExpenses,
    netProfit,
    yearlyProjection,
    estimatedTax,
  };
}

export function TaxPotProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  const [manualIncome, setManualIncome] = useState<ManualIncomeEntry[]>([]);
  const [invoiceIncome, setInvoiceIncome] = useState<InvoiceIncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [taxRate, setTaxRateState] = useState(30);
  const [loading, setLoading] = useState(false);
  const [supabase, setSupabase] = useState<DeferredSupabaseClient | null>(null);

  useEffect(() => {
    if (!user) return;
    let canceled = false;
    const cancel = deferUntilAfterFirstPaint(() => {
      if (canceled) return;
      getDeferredSupabaseClient()
        .then((client) => { if (!canceled) setSupabase(client); })
        .catch((error) => console.warn('[TaxPotContext] Supabase unavailable:', error));
    });
    return () => { canceled = true; cancel(); };
  }, [user?.id]);

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const [{ data: manual }, { data: paidInvoices }, { data: exp }] = await Promise.all([
        withTimeout(
          supabase.from('manual_income').select('*').eq('therapist_id', user.id).order('date', { ascending: false }),
          SYNC_TIMEOUT_MS, '[TaxPotContext] Timed out loading manual income'
        ),
        withTimeout(
          supabase.from('invoices').select('id, total, paid_at').eq('therapist_id', user.id).eq('status', 'paid').not('paid_at', 'is', null),
          SYNC_TIMEOUT_MS, '[TaxPotContext] Timed out loading paid invoices'
        ),
        withTimeout(
          supabase.from('expenses').select('*').eq('therapist_id', user.id).order('spent_on', { ascending: false }),
          SYNC_TIMEOUT_MS, '[TaxPotContext] Timed out loading expenses'
        ),
      ]);

      if (manual) setManualIncome((manual as any[]).map(i => ({ ...i, source: 'manual' as const })));
      if (exp) setExpenses(exp as Expense[]);

      const invoiceEntries: InvoiceIncomeEntry[] = (paidInvoices ?? []).map((inv: any) => {
        const tr = inv.tax_rate ?? taxRate;
        const tax_set_aside = Math.round(inv.total * (tr / 100) * 100) / 100;
        return {
          id: `inv-${inv.id}`,
          invoice_id: inv.id,
          amount: inv.total,
          date_paid: inv.paid_at,
          tax_rate: tr,
          tax_set_aside,
          source: 'invoice' as const,
        };
      });
      setInvoiceIncome(invoiceEntries);
    } catch (error) {
      console.warn('[TaxPotContext] Sync failed:', error);
    } finally {
      if (user.tax_rate) setTaxRateState(user.tax_rate);
      setLoading(false);
    }
  }, [supabase, user?.id]);

  useEffect(() => {
    if (!supabase) return;
    if (!user) { setManualIncome([]); setInvoiceIncome([]); setExpenses([]); return; }
    if (user.tax_rate) setTaxRateState(user.tax_rate);
    refresh();
  }, [supabase, user?.id, refresh]);

  const setTaxRate = async (rate: number) => {
    setTaxRateState(rate);
    if (supabase && user) {
      await supabase.from('therapist_profiles').update({ tax_rate: rate }).eq('id', user.id);
    }
  };

  const addManualIncome = async (entry: { amount: number; date: string; source_label?: string; category?: string; tax_rate: number }) => {
    if (!supabase || !user) return;
    const tax_set_aside = Math.round(entry.amount * (entry.tax_rate / 100) * 100) / 100;
    const payload = {
      therapist_id: user.id,
      amount: entry.amount,
      date: entry.date,
      source_label: entry.source_label || null,
      category: entry.category || null,
      tax_rate: entry.tax_rate,
      tax_set_aside,
    };
    const { data, error } = await supabase.from('manual_income').insert(payload).select().single();
    if (!error && data) setManualIncome(prev => [{ ...(data as any), source: 'manual' as const }, ...prev]);
  };

  const deleteManualIncome = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('manual_income').delete().eq('id', id);
    if (!error) setManualIncome(prev => prev.filter(i => i.id !== id));
  };

  const addExpense = async (e: Partial<Expense>) => {
    if (!supabase || !user) return { error: 'Not authenticated' };
    const payload = {
      therapist_id: user.id,
      amount: e.amount ?? 0,
      category: e.category ?? 'other',
      vendor: e.vendor ?? null,
      note: e.note ?? null,
      spent_on: e.spent_on ?? new Date().toISOString().slice(0, 10),
      mileage_miles: e.mileage_miles ?? null,
      receipt_path: e.receipt_path ?? null,
    };
    const { data, error } = await supabase.from('expenses').insert(payload).select().single();
    if (error) return { error: error.message };
    setExpenses(prev => [data as Expense, ...prev]);
    return { error: null };
  };

  const deleteExpense = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const allIncome: IncomeEntry[] = [...invoiceIncome, ...manualIncome].sort((a, b) => {
    const da = 'date_paid' in a ? a.date_paid : a.date;
    const db = 'date_paid' in b ? b.date_paid : b.date;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  const summary = calcSummary(manualIncome, invoiceIncome, expenses, taxRate);

  return (
    <TaxPotContext.Provider value={{
      manualIncome, invoiceIncome, allIncome, expenses, summary, taxRate, loading,
      setTaxRate, addManualIncome, deleteManualIncome, addExpense, deleteExpense, refresh,
    }}>
      {children}
    </TaxPotContext.Provider>
  );
}

export function useTaxPot() {
  const ctx = useContext(TaxPotContext);
  if (!ctx) throw new Error('useTaxPot must be used within TaxPotProvider');
  return ctx;
}
