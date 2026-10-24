// fields the agents never type into, whatever the fill sheet says. kept dependency-free: the chrome extension bundles it.
export const NEVER_FILL = /passport|national\s*id|\bnin\b|\bssn\b|social\s*security|tax\s*id|\bbvn\b|password|passcode|\bpin\b|security\s*(question|answer)|card\s*(number|holder)|\bcvv\b|\bcvc\b|expir|iban|account\s*number|routing|signature/i;
