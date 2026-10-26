import { AppSettings, CategoryConfig, Transaction } from '../types';

export interface SheetInitResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  isNew: boolean;
}

export interface SheetDataResult {
  transactions: Transaction[];
  categories?: CategoryConfig[];
  settings?: Partial<AppSettings>;
  receiptsFolderId?: string;
}

const TX_HEADER = [
  'ID',
  'Date',
  'Account',
  'Type',
  'Category',
  'Field Label',
  'Party / Name',
  'Description',
  'Ref / Cheque',
  'Net Amount',
  'VAT Rate %',
  'VAT Amount',
  'Total Amount',
  'Receipt URL',
  'Created At',
];

const CAT_HEADER = ['Category Name', 'Field Label', 'Saved Choices'];
const SET_HEADER = ['Setting Key', 'Value', 'Description'];

export const findOrCreateCashbookSheet = async (
  accessToken: string,
  initialCategories: CategoryConfig[],
  initialSettings: AppSettings,
  folderId?: string
): Promise<SheetInitResult> => {
  // First search if user already has "Cashbook Ledger"
  const q = encodeURIComponent("name = 'Cashbook Ledger' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const sheet = searchData.files[0];
      return {
        spreadsheetId: sheet.id,
        spreadsheetUrl: sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`,
        isNew: false,
      };
    }
  }

  // Create brand new Google Spreadsheet
  const createPayload = {
    properties: {
      title: 'Cashbook Ledger',
    },
    sheets: [
      {
        properties: {
          title: 'Transactions',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 16,
          },
        },
      },
      {
        properties: {
          title: 'Categories',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 5,
          },
        },
      },
      {
        properties: {
          title: 'Settings',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 4,
          },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Seed Headers and Initial Values
  const batchData = [
    {
      range: 'Transactions!A1:O1',
      values: [TX_HEADER],
    },
    {
      range: 'Categories!A1:C1',
      values: [CAT_HEADER],
    },
    {
      range: `Categories!A2:C${1 + initialCategories.length}`,
      values: initialCategories.map(c => [c.name, c.label, c.options.join(', ')]),
    },
    {
      range: 'Settings!A1:C1',
      values: [SET_HEADER],
    },
    {
      range: 'Settings!A2:C7',
      values: [
        ['bankOpen', String(initialSettings.bankOpen), 'Bank Opening Balance'],
        ['pettyOpen', String(initialSettings.pettyOpen), 'Petty Cash Opening Balance'],
        ['defaultVat', String(initialSettings.defaultVat), 'Default VAT %'],
        ['lowBalanceThreshold', String(initialSettings.lowBalanceThreshold), 'Low balance alert threshold'],
        ['currency', initialSettings.currency, 'Currency Symbol/Code'],
        ['receiptsFolderId', folderId || '', 'Google Drive Receipts Folder ID'],
      ],
    },
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: batchData,
    }),
  });

  return {
    spreadsheetId,
    spreadsheetUrl,
    isNew: true,
  };
};

export const fetchSheetData = async (
  accessToken: string,
  spreadsheetId: string
): Promise<SheetDataResult> => {
  // Batch read all three ranges
  const ranges = ['Transactions!A1:O', 'Categories!A1:C', 'Settings!A1:C'];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges
    .map(r => `ranges=${encodeURIComponent(r)}`)
    .join('&')}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to read spreadsheet data: ${err}`);
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const txValues = valueRanges[0]?.values || [];
  const catValues = valueRanges[1]?.values || [];
  const setValues = valueRanges[2]?.values || [];

  // Parse Transactions
  const transactions: Transaction[] = [];
  if (txValues.length > 1) {
    for (let i = 1; i < txValues.length; i++) {
      const row = txValues[i];
      if (!row || !row[0]) continue;
      const id = String(row[0] || '');
      const date = String(row[1] || '');
      const account = (row[2] === 'Petty Cash' ? 'Petty Cash' : 'Bank') as Transaction['account'];
      const type = (row[3] === 'Out' ? 'Out' : 'In') as Transaction['type'];
      const category = String(row[4] || '');
      const field = String(row[5] || 'Paid to');
      const party = String(row[6] || '');
      const desc = String(row[7] || '');
      const ref = String(row[8] || '');
      const net = parseFloat(row[9]) || 0;
      const vatRate = parseFloat(row[10]) || 0;
      const vat = parseFloat(row[11]) || 0;
      const total = parseFloat(row[12]) || 0;
      const url = String(row[13] || '');
      const createdAt = String(row[14] || new Date().toISOString());

      transactions.push({
        id,
        date,
        account,
        type,
        category,
        field,
        party,
        desc,
        ref,
        net,
        vatRate,
        vat,
        total,
        url,
        createdAt,
      });
    }
  }

  // Parse Categories
  const categories: CategoryConfig[] = [];
  if (catValues.length > 1) {
    for (let i = 1; i < catValues.length; i++) {
      const row = catValues[i];
      if (!row || !row[0]) continue;
      const name = String(row[0]).trim();
      const label = String(row[1] || 'Paid to').trim();
      const rawOptions = String(row[2] || '');
      const options = rawOptions
        .split(',')
        .map(o => o.trim())
        .filter(Boolean);
      categories.push({ name, label, options });
    }
  }

  // Parse Settings
  const settings: Partial<AppSettings> = {};
  let receiptsFolderId: string | undefined;

  if (setValues.length > 1) {
    for (let i = 1; i < setValues.length; i++) {
      const row = setValues[i];
      if (!row || !row[0]) continue;
      const key = String(row[0]).trim();
      const val = String(row[1] || '').trim();

      if (key === 'bankOpen') settings.bankOpen = parseFloat(val) || 0;
      if (key === 'pettyOpen') settings.pettyOpen = parseFloat(val) || 0;
      if (key === 'defaultVat') settings.defaultVat = parseFloat(val) || 0;
      if (key === 'lowBalanceThreshold') settings.lowBalanceThreshold = parseFloat(val) || 0;
      if (key === 'currency') settings.currency = val || 'AED';
      if (key === 'receiptsFolderId') receiptsFolderId = val;
    }
  }

  return {
    transactions,
    categories: categories.length > 0 ? categories : undefined,
    settings: Object.keys(settings).length > 0 ? settings : undefined,
    receiptsFolderId,
  };
};

export const syncAllTransactionsToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  transactions: Transaction[]
): Promise<void> => {
  // Sort transactions by date descending or as needed
  const rows = transactions.map(t => [
    t.id,
    t.date,
    t.account,
    t.type,
    t.category,
    t.field,
    t.party,
    t.desc,
    t.ref,
    t.net,
    t.vatRate,
    t.vat,
    t.total,
    t.url || '',
    t.createdAt || new Date().toISOString(),
  ]);

  // First clear old data from row 2 downwards
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A2:O:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (rows.length === 0) return;

  // Now write fresh rows
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A2:O${1 + rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `Transactions!A2:O${1 + rows.length}`,
        values: rows,
      }),
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.text();
    throw new Error(`Failed to write transactions to Google Sheets: ${err}`);
  }
};

export const saveCategoriesToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  categories: CategoryConfig[]
): Promise<void> => {
  // Clear old categories
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Categories!A2:C:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const rows = categories.map(c => [c.name, c.label, c.options.join(', ')]);
  if (rows.length === 0) return;

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Categories!A2:C${1 + rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );
};

export const saveSettingsToSheet = async (
  accessToken: string,
  spreadsheetId: string,
  settings: AppSettings,
  folderId?: string
): Promise<void> => {
  const rows = [
    ['bankOpen', String(settings.bankOpen), 'Bank Opening Balance'],
    ['pettyOpen', String(settings.pettyOpen), 'Petty Cash Opening Balance'],
    ['defaultVat', String(settings.defaultVat), 'Default VAT %'],
    ['lowBalanceThreshold', String(settings.lowBalanceThreshold), 'Low balance alert threshold'],
    ['currency', settings.currency, 'Currency Symbol/Code'],
    ['receiptsFolderId', folderId || '', 'Google Drive Receipts Folder ID'],
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Settings!A2:C7?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );
};
