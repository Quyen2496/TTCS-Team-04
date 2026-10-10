const DAY_MS = 24 * 60 * 60 * 1000;

const normalizeDate = value => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Ngày nhận hoặc trả phòng không đúng định dạng.');
  }

  return new Date(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  ));
};

const getStayRange = (checkIn, checkOut) => {
  const start = normalizeDate(checkIn);
  const end = normalizeDate(checkOut);

  if (start >= end) {
    const error = new Error('Ngày trả phòng phải sau ngày nhận phòng.');
    error.statusCode = 400;
    throw error;
  }

  return { start, end };
};

const getNights = (start, end) => {
  const nights = [];
  for (let timestamp = start.getTime(); timestamp < end.getTime(); timestamp += DAY_MS) {
    nights.push(new Date(timestamp));
  }
  return nights;
};

module.exports = { DAY_MS, normalizeDate, getStayRange, getNights };
