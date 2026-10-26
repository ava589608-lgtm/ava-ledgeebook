import { AppSettings, CategoryConfig, Transaction } from '../types';

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    name: 'Fuel & Diesel',
    label: 'Vehicle number',
    options: ['Bus #101', 'Bus #102', 'Bus #105', 'Van #201', 'Van #204', 'Staff Car #301'],
  },
  {
    name: 'Vehicle Maintenance & Repairs',
    label: 'Vehicle number',
    options: ['Bus #101', 'Bus #102', 'Bus #105', 'Van #201', 'Van #204'],
  },
  {
    name: 'Spare Parts & Tyres',
    label: 'Supplier',
    options: ['Al-Futtaim Auto Parts', 'Continental Tyre Center', 'Emirates Auto Spares', 'Bosch Service Hub'],
  },
  {
    name: 'Salaries & Driver Advances',
    label: 'Driver / Employee',
    options: ['Mohammed Tariq', 'Rashid Khan', 'Suresh Kumar', 'Ahmed Mansoor', 'Sunil Perera'],
  },
  {
    name: 'Office & Admin Expenses',
    label: 'Paid to',
    options: ['Etisalat Internet', 'DEWA Utilities', 'Stationery Mart', 'Building Management'],
  },
  {
    name: 'Passenger Fares & Contract Collections',
    label: 'Customer / Route',
    options: ['School Route A', 'Hotel Shuttle Contract', 'Charter Booking #992', 'Daily Commute Line 4'],
  },
  {
    name: 'Bank & Transaction Fees',
    label: 'Paid to',
    options: ['ENBD Service Fee', 'Card Machine Fee', 'Cheque Clearing Fee'],
  },
  {
    name: 'Miscellaneous / Other',
    label: 'Paid to',
    options: ['Refreshments & Tea', 'Parking Tolls & Salik', 'Municipality Fee'],
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  bankOpen: 25000.0,
  pettyOpen: 2500.0,
  defaultVat: 5.0,
  lowBalanceThreshold: 2000.0,
  currency: 'AED',
};

const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_seed_1',
    date: '2026-10-24',
    account: 'Bank',
    type: 'In',
    category: 'Passenger Fares & Contract Collections',
    field: 'Customer / Route',
    party: 'Hotel Shuttle Contract',
    desc: 'Monthly shuttle invoice payment - October',
    ref: 'INV-4091',
    net: 14285.71,
    vatRate: 5,
    vat: 714.29,
    total: 15000.0,
    createdAt: '2026-10-24T09:30:00.000Z',
  },
  {
    id: 'tx_seed_2',
    date: '2026-10-24',
    account: 'Petty Cash',
    type: 'Out',
    category: 'Fuel & Diesel',
    field: 'Vehicle number',
    party: 'Bus #101',
    desc: 'Full tank diesel for morning school trip',
    ref: 'RCP-8812',
    net: 380.95,
    vatRate: 5,
    vat: 19.05,
    total: 400.0,
    createdAt: '2026-10-24T11:15:00.000Z',
  },
  {
    id: 'tx_seed_3',
    date: '2026-10-25',
    account: 'Bank',
    type: 'Out',
    category: 'Spare Parts & Tyres',
    field: 'Supplier',
    party: 'Al-Futtaim Auto Parts',
    desc: 'New front brake pads and air filters (2 sets)',
    ref: 'CHQ-00452',
    net: 1714.29,
    vatRate: 5,
    vat: 85.71,
    total: 1800.0,
    createdAt: '2026-10-25T14:20:00.000Z',
  },
  {
    id: 'tx_seed_4',
    date: '2026-10-25',
    account: 'Petty Cash',
    type: 'Out',
    category: 'Office & Admin Expenses',
    field: 'Paid to',
    party: 'Stationery Mart',
    desc: 'Logbooks, receipts books and printer paper',
    ref: 'CASH-99',
    net: 114.29,
    vatRate: 5,
    vat: 5.71,
    total: 120.0,
    createdAt: '2026-10-25T16:00:00.000Z',
  },
];

const STORAGE_KEYS = {
  TRANSACTIONS: 'cashbook_transactions_v2',
  CATEGORIES: 'cashbook_categories_v2',
  SETTINGS: 'cashbook_settings_v2',
  SHEET_ID: 'cashbook_spreadsheet_id_v2',
  SHEET_URL: 'cashbook_spreadsheet_url_v2',
  FOLDER_ID: 'cashbook_drive_folder_id_v2',
  FOLDER_URL: 'cashbook_drive_folder_url_v2',
};

export const loadLocalTransactions = (): Transaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      saveLocalTransactions(SAMPLE_TRANSACTIONS);
      return SAMPLE_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local transactions:', e);
    return SAMPLE_TRANSACTIONS;
  }
};

export const saveLocalTransactions = (txs: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.error('Error saving local transactions:', e);
  }
};

export const loadLocalCategories = (): CategoryConfig[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      saveLocalCategories(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local categories:', e);
    return DEFAULT_CATEGORIES;
  }
};

export const saveLocalCategories = (cats: CategoryConfig[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(cats));
  } catch (e) {
    console.error('Error saving local categories:', e);
  }
};

export const loadLocalSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveLocalSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error loading local settings:', e);
    return DEFAULT_SETTINGS;
  }
};

export const saveLocalSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving local settings:', e);
  }
};

export const getCachedSyncInfo = () => {
  return {
    spreadsheetId: localStorage.getItem(STORAGE_KEYS.SHEET_ID),
    spreadsheetUrl: localStorage.getItem(STORAGE_KEYS.SHEET_URL),
    folderId: localStorage.getItem(STORAGE_KEYS.FOLDER_ID),
    folderUrl: localStorage.getItem(STORAGE_KEYS.FOLDER_URL),
  };
};

export const setCachedSyncInfo = (info: {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  folderId?: string;
  folderUrl?: string;
}) => {
  if (info.spreadsheetId) localStorage.setItem(STORAGE_KEYS.SHEET_ID, info.spreadsheetId);
  if (info.spreadsheetUrl) localStorage.setItem(STORAGE_KEYS.SHEET_URL, info.spreadsheetUrl);
  if (info.folderId) localStorage.setItem(STORAGE_KEYS.FOLDER_ID, info.folderId);
  if (info.folderUrl) localStorage.setItem(STORAGE_KEYS.FOLDER_URL, info.folderUrl);
};
