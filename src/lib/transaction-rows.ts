import type { Customer, Dataset, Transaction, TransactionStatus } from "@/types/domain";
import type { IsoDate } from "./dates";

/** A transaction joined with the names a table row or detail panel shows. */
export interface TransactionRow {
  id: string;
  date: IsoDate;
  customerId: string;
  customerName: string;
  customerEmail: string;
  productId: string;
  productName: string;
  quantity: number;
  amountMinor: number;
  paymentMethodLabel: string;
  status: TransactionStatus;
}

export interface TransactionLookups {
  customers: ReadonlyMap<string, Customer>;
  productNames: ReadonlyMap<string, string>;
}

export function transactionLookups(dataset: Dataset): TransactionLookups {
  return {
    customers: new Map(dataset.customers.map((customer) => [customer.id, customer])),
    productNames: new Map(dataset.products.map((product) => [product.id, product.name])),
  };
}

export function toTransactionRow(transaction: Transaction, lookups: TransactionLookups): TransactionRow {
  const customer = lookups.customers.get(transaction.customerId);
  return {
    id: transaction.id,
    date: transaction.date,
    customerId: transaction.customerId,
    customerName: customer?.name ?? transaction.customerId,
    customerEmail: customer?.email ?? "",
    productId: transaction.productId,
    productName: lookups.productNames.get(transaction.productId) ?? transaction.productId,
    quantity: transaction.quantity,
    amountMinor: transaction.amountMinor,
    paymentMethodLabel: transaction.paymentMethodLabel,
    status: transaction.status,
  };
}
