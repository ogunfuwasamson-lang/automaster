// how creators get paid in their own currency (app/creator/payouts, lib/creators). each currency lists the ways money
// can reach it and the details each way needs, as its local banks ask for them. pure, so the form and the server
// check the same rules. everything a creator enters is stored encrypted; `label` (the bank or network and the last
// four digits) is the only part shown back.

export type Method = "bank" | "mobile_money" | "swift";
export type Field = {
  key: string;
  label: string;
  hint?: string;
  placeholder?: string;
  pattern?: RegExp; // checked after `clean`
  clean?: (v: string) => string;
  options?: readonly string[]; // a fixed list (a select)
  suggest?: readonly string[]; // suggestions (a datalist)
  optional?: boolean;
  numeric?: boolean;
  last4?: boolean; // the number the label ends with
  title?: boolean; // the bank or network named in the label
};
export type Way = { method: Method; label: string; fields: Field[] };
export type Currency = { code: string; name: string; where: string; ways: Way[] };

const digits = (v: string) => v.replace(/[\s-]/g, "");
const upper = (v: string) => v.replace(/\s/g, "").toUpperCase();

const NG_BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank", "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)", "Jaiz Bank", "Keystone Bank", "Kuda", "Lotus Bank", "Moniepoint", "OPay", "Optimus Bank", "PalmPay", "Parallex Bank", "Polaris Bank", "Premium Trust Bank", "Providus Bank", "Signature Bank", "Stanbic IBTC", "Standard Chartered", "Sterling Bank", "SunTrust Bank", "Taj Bank", "Titan Trust Bank", "Union Bank", "United Bank for Africa (UBA)", "Unity Bank", "VFD Microfinance Bank", "Wema Bank (ALAT)", "Zenith Bank",
] as const;

const name = (hint = "Exactly as your bank shows it."): Field => ({ key: "account_name", label: "Name on the account", hint });
const bank = (suggest?: readonly string[]): Field => ({ key: "bank_name", label: "Bank", placeholder: "Start typing your bank", suggest, title: true });

// the international transfer: for any currency without a local route here, or a bank abroad
const SWIFT: Way = {
  method: "swift",
  label: "International bank transfer (SWIFT)",
  fields: [
    name(),
    { key: "holder_address", label: "Your address", hint: "Banks abroad ask for the account holder's address." },
    bank(),
    { key: "swift", label: "SWIFT / BIC code", placeholder: "ABCDGB2L", clean: upper, pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/ },
    { key: "account_number", label: "Account number or IBAN", clean: upper, pattern: /^[A-Z0-9]{6,34}$/, last4: true },
    { key: "bank_country", label: "Country of the bank" },
    { key: "bank_address", label: "Bank address", optional: true },
  ],
};

export const CURRENCIES: Currency[] = [
  {
    code: "NGN",
    name: "Nigerian naira",
    where: "Nigeria",
    ways: [{ method: "bank", label: "Bank account", fields: [bank(NG_BANKS), { key: "account_number", label: "Account number", hint: "10 digits (NUBAN).", placeholder: "0123456789", clean: digits, pattern: /^\d{10}$/, numeric: true, last4: true }, name()] }],
  },
  {
    code: "GHS",
    name: "Ghanaian cedi",
    where: "Ghana",
    ways: [
      { method: "mobile_money", label: "Mobile money", fields: [{ key: "network", label: "Network", options: ["MTN MoMo", "Telecel Cash", "AirtelTigo Money"], title: true }, { key: "phone", label: "Mobile money number", placeholder: "024 000 0000", clean: digits, pattern: /^(\+?233|0)\d{9}$/, numeric: true, last4: true }, name("As registered on the wallet.")] },
      { method: "bank", label: "Bank account", fields: [bank(), { key: "account_number", label: "Account number", clean: digits, pattern: /^\d{8,16}$/, numeric: true, last4: true }, { key: "branch", label: "Branch", optional: true }, name()] },
    ],
  },
  {
    code: "KES",
    name: "Kenyan shilling",
    where: "Kenya",
    ways: [
      { method: "mobile_money", label: "M-Pesa", fields: [{ key: "phone", label: "M-Pesa number", placeholder: "0712 345 678", clean: digits, pattern: /^(\+?254|0)(7|1)\d{8}$/, numeric: true, last4: true }, name("As registered on M-Pesa.")] },
      { method: "bank", label: "Bank account", fields: [bank(), { key: "account_number", label: "Account number", clean: digits, pattern: /^\d{6,16}$/, numeric: true, last4: true }, { key: "branch", label: "Branch", optional: true }, name()] },
    ],
  },
  {
    code: "ZAR",
    name: "South African rand",
    where: "South Africa",
    ways: [
      {
        method: "bank",
        label: "Bank account",
        fields: [bank(["Absa", "Capitec", "Discovery Bank", "First National Bank (FNB)", "Investec", "Nedbank", "Standard Bank", "TymeBank"]), { key: "account_number", label: "Account number", clean: digits, pattern: /^\d{7,11}$/, numeric: true, last4: true }, { key: "branch_code", label: "Branch code", hint: "6 digits. Most banks use one universal code.", clean: digits, pattern: /^\d{6}$/, numeric: true }, { key: "account_type", label: "Account type", options: ["Cheque / current", "Savings"] }, name()],
      },
    ],
  },
  {
    code: "USD",
    name: "US dollar",
    where: "a bank in the United States",
    ways: [
      { method: "bank", label: "US bank account (ACH)", fields: [name(), bank(), { key: "routing_number", label: "Routing number", hint: "9 digits (ABA).", clean: digits, pattern: /^\d{9}$/, numeric: true }, { key: "account_number", label: "Account number", clean: digits, pattern: /^\d{4,17}$/, numeric: true, last4: true }, { key: "account_type", label: "Account type", options: ["Checking", "Savings"] }] },
      SWIFT,
    ],
  },
  {
    code: "GBP",
    name: "British pound",
    where: "a bank in the United Kingdom",
    ways: [{ method: "bank", label: "UK bank account", fields: [name(), bank(), { key: "sort_code", label: "Sort code", placeholder: "12-34-56", clean: digits, pattern: /^\d{6}$/, numeric: true }, { key: "account_number", label: "Account number", hint: "8 digits.", clean: digits, pattern: /^\d{8}$/, numeric: true, last4: true }] }],
  },
  {
    code: "EUR",
    name: "Euro",
    where: "a bank in the euro area",
    ways: [{ method: "bank", label: "Bank account (SEPA)", fields: [name(), bank(), { key: "iban", label: "IBAN", placeholder: "DE89 3704 0044 0532 0130 00", clean: upper, pattern: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/, last4: true }, { key: "bic", label: "BIC / SWIFT", optional: true, clean: upper, pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/ }] }],
  },
  {
    code: "CAD",
    name: "Canadian dollar",
    where: "a bank in Canada",
    ways: [{ method: "bank", label: "Canadian bank account", fields: [name(), bank(), { key: "institution", label: "Institution number", hint: "3 digits.", clean: digits, pattern: /^\d{3}$/, numeric: true }, { key: "transit", label: "Transit number", hint: "5 digits.", clean: digits, pattern: /^\d{5}$/, numeric: true }, { key: "account_number", label: "Account number", clean: digits, pattern: /^\d{7,12}$/, numeric: true, last4: true }] }],
  },
  {
    code: "INR",
    name: "Indian rupee",
    where: "India",
    ways: [{ method: "bank", label: "Bank account", fields: [name(), bank(), { key: "ifsc", label: "IFSC code", placeholder: "SBIN0001234", clean: upper, pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/ }, { key: "account_number", label: "Account number", clean: digits, pattern: /^\d{9,18}$/, numeric: true, last4: true }] }],
  },
  {
    code: "OTHER",
    name: "Another currency",
    where: "anywhere else, by international transfer",
    ways: [{ ...SWIFT, fields: [{ key: "currency", label: "Currency", hint: "The 3-letter code, like XOF or UGX.", placeholder: "XOF", clean: upper, pattern: /^[A-Z]{3}$/ }, ...SWIFT.fields] }],
  },
];

export const currencyOf = (code: string) => CURRENCIES.find((c) => c.code === code) ?? null;

export type Checked = { currency: string; method: Method; account_name: string; label: string; details: Record<string, string> } | { error: string };

// check what a creator entered against their currency's rules: the details to store (cleaned), the name on the
// account, and the label shown back ("GTBank, ending 4821")
export function checkDetails(code: string, method: string, input: Record<string, unknown>): Checked {
  const cur = currencyOf(code);
  if (!cur) return { error: "Pick the currency you want to be paid in." };
  const way = cur.ways.find((w) => w.method === method);
  if (!way) return { error: "Pick how you want to be paid." };
  const details: Record<string, string> = {};
  for (const f of way.fields) {
    const raw = typeof input[f.key] === "string" ? (input[f.key] as string).trim().slice(0, 200) : "";
    const v = f.clean ? f.clean(raw) : raw;
    if (!v) {
      if (f.optional) continue;
      return { error: `Add your ${f.label.toLowerCase()}.` };
    }
    if (f.options && !f.options.includes(v)) return { error: `Pick your ${f.label.toLowerCase()} from the list.` };
    if (f.pattern && !f.pattern.test(v)) return { error: `Check your ${f.label.toLowerCase()}: it doesn't look right.${f.hint ? ` ${f.hint}` : ""}` };
    details[f.key] = v;
  }
  const currency = code === "OTHER" ? details.currency : code;
  const titleField = way.fields.find((f) => f.title);
  const lastField = way.fields.find((f) => f.last4);
  const title = (titleField && details[titleField.key]) || way.label;
  const last = lastField ? details[lastField.key]?.slice(-4) : "";
  return { currency, method: way.method, account_name: details.account_name ?? "", label: `${title}${last ? `, ending ${last}` : ""}`, details };
}

// the details as the operator needs them to make the transfer: each field's label and value, in form order
export function describe(code: string, method: string, details: Record<string, string>): [string, string][] {
  const cur = currencyOf(code) ?? currencyOf("OTHER")!;
  const way = cur.ways.find((w) => w.method === method) ?? currencyOf("OTHER")!.ways[0];
  const known = way.fields.filter((f) => details[f.key]).map((f) => [f.label, details[f.key]] as [string, string]);
  const extra = Object.entries(details).filter(([k]) => !way.fields.some((f) => f.key === k));
  return [...known, ...extra];
}
