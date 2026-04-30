const normalizePhoneNumber = (value, defaultCountryCode = '') => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  let normalized = rawValue.replace(/[^\d+]/g, '');
  if (!normalized) return null;

  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  if (normalized.startsWith('+')) {
    const digits = normalized.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : null;
  }

  const digitsOnly = normalized.replace(/\D/g, '');
  if (!digitsOnly) return null;

  if (defaultCountryCode && digitsOnly.startsWith('0')) {
    const localNumber = digitsOnly.replace(/^0+/, '');
    if (localNumber) {
      return `+${defaultCountryCode}${localNumber}`;
    }
  }

  return `+${digitsOnly}`;
};

module.exports = { normalizePhoneNumber };
