const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const STATUSES = ['Received', 'Preparing', 'Ready', 'Completed'];

function normalizeCash(cashGiven, total) {
  if (cashGiven === '' || cashGiven == null) return null;
  const cash = Number(cashGiven);
  if (Number.isNaN(cash)) return null;
  if (cash < total) {
    throw new Error('The cash amount must be at least the total');
  }
  return cash;
}

function clampQty(rawQty) {
  return Math.max(1, Math.min(20, Number(rawQty) || 1));
}

function sanitizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function generateOrderCode() {
  return Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
}

module.exports = {
  ALPHA,
  STATUSES,
  normalizeCash,
  clampQty,
  sanitizeCode,
  generateOrderCode
};
