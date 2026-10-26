export type AccountType = 'Bank' | 'Petty Cash';
export type FlowType = 'In' | 'Out';

export interface Transaction {
  id: string;
  date: string;
  account: AccountType;
  type: FlowType;
  category: string;
  field: string;
  party: string;
  desc: string;
  ref: string;
  total: number;
  vatRate: number;
  vat: number;
  net: number;
  url?: string;
  fileDriveId?: string;
  createdAt: string;
}

export interface CategoryConfig {
  name: string;
  label: string; // e.g. "Paid to", "Received from", "Vehicle number", "Supplier", "Driver", "Employee", "Customer"
  options: string[];
}

export interface AppSettings {
  bankOpen: number;
  pettyOpen: number;
  defaultVat: number;
  lowBalanceThreshold: number;
  currency: string;
}

export interface SyncState {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  folderId: string | null;
  folderUrl: string | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  syncError: string | null;
}

export interface UploadReceiptResult {
  fileId: string;
  webViewLink: string;
  name: string;
}
