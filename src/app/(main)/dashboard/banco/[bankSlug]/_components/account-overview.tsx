"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { Loader2 } from "lucide-react";

import { getBankData } from "../actions";

import {
  AccountOverviewContent,
  type BankData,
  type BankTransaction,
  type MovementFilters,
} from "./account-overview-content";

type BankOverviewState = {
  data: BankData | null;
  loading: boolean;
  error: string | null;
};

function getTransactionDateValue(transaction: BankTransaction) {
  const rawDate = transaction.rawDate ?? transaction.fullDate ?? transaction.date ?? transaction.subtitle;
  return rawDate ? new Date(rawDate).getTime() : Number.NaN;
}

function getTransactionType(transaction: BankTransaction) {
  return transaction.type === "debit" ? "gasto" : "ingreso";
}

function getSearchableTransactionText(transaction: BankTransaction) {
  const amount = Number(transaction.amount ?? 0);
  const amountText = String(transaction.amountText ?? amount.toFixed(2));
  const txMethod = String(transaction.method ?? "")
    .trim()
    .toLowerCase();

  return [
    String(transaction.title ?? "").toLowerCase(),
    String(transaction.subtitle ?? "").toLowerCase(),
    String(transaction.fullDate ?? "").toLowerCase(),
    String(transaction.rawDate ?? "").toLowerCase(),
    amountText,
    amountText.replace(".00", ""),
    txMethod,
    getTransactionType(transaction),
  ].join(" ");
}

function transactionMatchesMethodAndType(transaction: BankTransaction, filters: MovementFilters) {
  const txMethod = String(transaction.method ?? "")
    .trim()
    .toLowerCase();
  return (
    (filters.method === "all" || txMethod === filters.method) &&
    (filters.type === "all" || getTransactionType(transaction) === filters.type)
  );
}

function transactionMatchesAmount(transaction: BankTransaction, minAmount: number | null, maxAmount: number | null) {
  const amount = Number(transaction.amount ?? 0);
  return (minAmount === null || amount >= minAmount) && (maxAmount === null || amount <= maxAmount);
}

function transactionMatchesDate(transaction: BankTransaction, fromDate: number | null, toDate: number | null) {
  const txDateValue = getTransactionDateValue(transaction);
  const hasValidDate = Number.isFinite(txDateValue);

  if (fromDate !== null && (!hasValidDate || txDateValue < fromDate)) return false;
  if (toDate !== null && (!hasValidDate || txDateValue > toDate)) return false;
  return true;
}

function matchesTransactionFilters(
  transaction: BankTransaction,
  filters: MovementFilters,
  minAmount: number | null,
  maxAmount: number | null,
  fromDate: number | null,
  toDate: number | null,
  searchQuery: string,
) {
  return (
    transactionMatchesMethodAndType(transaction, filters) &&
    transactionMatchesAmount(transaction, minAmount, maxAmount) &&
    transactionMatchesDate(transaction, fromDate, toDate) &&
    (!searchQuery || getSearchableTransactionText(transaction).includes(searchQuery))
  );
}

function getAvailableMethods(transactions: BankTransaction[]) {
  const methods = new Set<string>();

  transactions.forEach((tx) => {
    const method = String(tx.method ?? "")
      .trim()
      .toLowerCase();
    if (method) methods.add(method);
  });

  return Array.from(methods);
}

function getFilteredTransactions(allTransactions: BankTransaction[], movementFilters: MovementFilters) {
  const minAmount = movementFilters.minAmount === "" ? null : Number(movementFilters.minAmount);
  const maxAmount = movementFilters.maxAmount === "" ? null : Number(movementFilters.maxAmount);
  const fromDate = movementFilters.fromDate ? new Date(`${movementFilters.fromDate}T00:00:00`).getTime() : null;
  const toDate = movementFilters.toDate ? new Date(`${movementFilters.toDate}T23:59:59`).getTime() : null;
  const searchQuery = movementFilters.search.trim().toLowerCase();

  const filtered = allTransactions.filter((tx) =>
    matchesTransactionFilters(tx, movementFilters, minAmount, maxAmount, fromDate, toDate, searchQuery),
  );

  return sortTransactions(filtered, movementFilters.sortBy);
}

function getFilteredIncomeTotal(filteredTransactions: BankTransaction[]) {
  return filteredTransactions.filter((tx) => tx.type !== "debit").reduce((acc, tx) => acc + Number(tx.amount ?? 0), 0);
}

function getFilteredExpenseTotal(filteredTransactions: BankTransaction[]) {
  return filteredTransactions.filter((tx) => tx.type === "debit").reduce((acc, tx) => acc + Number(tx.amount ?? 0), 0);
}

function sortTransactions(transactions: BankTransaction[], sortBy: string) {
  return transactions.sort((a, b) => {
    const aDate = getTransactionDateValue(a);
    const bDate = getTransactionDateValue(b);
    const aAmount = Number(a.amount ?? 0);
    const bAmount = Number(b.amount ?? 0);

    if (sortBy === "date-asc") return aDate - bDate;
    if (sortBy === "amount-desc") return bAmount - aAmount;
    if (sortBy === "amount-asc") return aAmount - bAmount;
    return bDate - aDate;
  });
}

function LoadingState() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return <div className="text-destructive border-destructive/20 rounded border p-6 text-center">{error}</div>;
}

function renderAccountOverviewContent(
  state: BankOverviewState,
  bankName: string,
  balance: number,
  data: BankData | null,
  latestTransactions: BankTransaction[],
  filteredTransactions: BankTransaction[],
  allTransactions: BankTransaction[],
  filteredIncomeTotal: number,
  filteredExpenseTotal: number,
  movementFilters: MovementFilters,
  setMovementFilters: Dispatch<SetStateAction<MovementFilters>>,
  availableMethods: string[],
  resetFilters: () => void,
) {
  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState error={state.error} />;

  return (
    <AccountOverviewContent
      bankName={bankName}
      balance={balance}
      data={data}
      latestTransactions={latestTransactions}
      filteredTransactions={filteredTransactions}
      allTransactions={allTransactions}
      filteredIncomeTotal={filteredIncomeTotal}
      filteredExpenseTotal={filteredExpenseTotal}
      movementFilters={movementFilters}
      setMovementFilters={setMovementFilters}
      availableMethods={availableMethods}
      resetFilters={resetFilters}
    />
  );
}

export function AccountOverview({ bankSlug }: { bankSlug: string }) {
  const [state, setState] = useState<BankOverviewState>({ data: null, loading: true, error: null });
  const [movementFilters, setMovementFilters] = useState<MovementFilters>({
    search: "",
    method: "all",
    type: "all",
    minAmount: "",
    maxAmount: "",
    fromDate: "",
    toDate: "",
    sortBy: "date-desc",
  });

  useEffect(() => {
    async function loadData() {
      setState((prev) => ({ ...prev, loading: true }));
      const res = await getBankData(bankSlug);
      if (res.success) {
        setState({ data: res.data as BankData, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: res.error ?? "Error al cargar datos" });
      }
    }

    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [bankSlug]);

  const data = state.data;
  const bankName = data?.bank?.nombre ?? "Banco";
  const balance = Number(data?.totalBalance ?? 0);
  const recentTransactions = data?.recentTransactions ?? [];
  const allTransactions = useMemo(() => data?.allTransactions ?? [], [data?.allTransactions]);
  const latestTransactions = recentTransactions.slice(0, 4);

  const availableMethods = useMemo(() => getAvailableMethods(allTransactions), [allTransactions]);

  const filteredTransactions = useMemo(
    () => getFilteredTransactions(allTransactions, movementFilters),
    [allTransactions, movementFilters],
  );

  const filteredIncomeTotal = useMemo(() => getFilteredIncomeTotal(filteredTransactions), [filteredTransactions]);

  const filteredExpenseTotal = useMemo(() => getFilteredExpenseTotal(filteredTransactions), [filteredTransactions]);

  const resetFilters = () => {
    setMovementFilters({
      search: "",
      method: "all",
      type: "all",
      minAmount: "",
      maxAmount: "",
      fromDate: "",
      toDate: "",
      sortBy: "date-desc",
    });
  };

  return renderAccountOverviewContent(
    state,
    bankName,
    balance,
    data,
    latestTransactions,
    filteredTransactions,
    allTransactions,
    filteredIncomeTotal,
    filteredExpenseTotal,
    movementFilters,
    setMovementFilters,
    availableMethods,
    resetFilters,
  );
}
