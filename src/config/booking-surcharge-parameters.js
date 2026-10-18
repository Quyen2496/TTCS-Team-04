const readNonNegativeAmount = (name, fallback) => {
  const configured = process.env[name];
  if (configured === undefined || configured === '') return fallback;

  const amount = Number(configured);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return amount;
};

module.exports = {
  EXTRA_GUEST_UNIT_PRICE: readNonNegativeAmount('EXTRA_GUEST_UNIT_PRICE', 100000),
  EXTRA_BED_UNIT_PRICE: readNonNegativeAmount('EXTRA_BED_UNIT_PRICE', 150000),
  DEFAULT_ROOM_CAPACITY: Number.parseInt(process.env.DEFAULT_ROOM_CAPACITY || '4', 10)
};
