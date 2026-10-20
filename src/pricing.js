'use strict';

// All keys are local business dates (YYYY-MM-DD), never browser timestamps.
const kinds = Object.freeze({WEEKDAY: 'Ngày thường', SATURDAY: 'Thứ Bảy', SUNDAY: 'Chủ nhật', EVENT: 'Lễ / sự kiện'});
const fields = Object.freeze({WEEKDAY: 'weekdayPrice', SATURDAY: 'saturdayPrice', SUNDAY: 'sundayPrice', EVENT: 'eventPrice'});
const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isFinite(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
const addDate = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
const money = n => Number.isSafeInteger(n) && n > 0;
function reject(message, status = 400) { const error = new Error(message); error.status = status; error.code = 'VALIDATION_ERROR'; throw error; }

function rates(type) {
  const weekdayPrice = type.weekdayPrice;
  const weekend = type.weekendPrice > weekdayPrice ? type.weekendPrice : Math.ceil(weekdayPrice * 1.2 / 1000) * 1000;
  const saturdayPrice = type.saturdayPrice ?? weekend;
  const sundayPrice = type.sundayPrice ?? weekend;
  const eventPrice = type.eventPrice ?? Math.ceil(Math.max(saturdayPrice, sundayPrice) * 1.25 / 1000) * 1000;
  return {weekdayPrice, saturdayPrice, sundayPrice, eventPrice, weekendPrice: saturdayPrice};
}

function upgradePricing(state) {
  if (state.pricingVersion >= 1) return false;
  for (const type of state.roomTypes) Object.assign(type, rates(type));
  state.pricingCalendar ||= {};
  // An editable business event, not a claim that this is a statutory holiday.
  state.pricingCalendar['2026-10-20'] ||= {kind: 'EVENT', name: 'Ngày Phụ nữ Việt Nam', prices: {}};
  state.pricingVersion = 1;
  state.settings.version++;
  return true;
}

function naturalKind(date) {
  const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
  return weekday === 6 ? 'SATURDAY' : weekday === 0 ? 'SUNDAY' : 'WEEKDAY';
}

function resolveNight(state, type, date) {
  const override = state.pricingCalendar?.[date];
  const dayKind = override?.kind || naturalKind(date);
  const explicit = override?.prices?.[type._id];
  const basePrice = explicit ?? rates(type)[fields[dayKind]];
  const eventName = dayKind === 'EVENT' ? override.name : '';
  const label = dayKind === 'EVENT' ? 'Sự kiện · ' + eventName : kinds[dayKind];
  return {night: date, dayKind, eventName, basePrice,
    priceKind: explicit !== undefined ? 'OVERRIDE' : dayKind === 'EVENT' ? 'EVENT' : dayKind === 'WEEKDAY' ? 'WEEKDAY' : 'WEEKEND',
    label: explicit !== undefined ? label + ' · Giá riêng' : label,
    overrideApplied: Boolean(override), customPrice: explicit !== undefined};
}

function validateRates(body, existing) {
  const defaults = rates({...existing, weekdayPrice: Number(body.weekdayPrice ?? existing?.weekdayPrice), weekendPrice: Number(body.weekendPrice ?? existing?.weekendPrice)});
  const result = {};
  for (const field of Object.values(fields)) {
    const raw = body[field] ?? existing?.[field] ?? defaults[field];
    if ((typeof raw !== 'number' && typeof raw !== 'string') || String(raw).trim() === '' || !money(Number(raw))) reject('Giá phải là số nguyên VND lớn hơn 0.');
    result[field] = Number(raw);
  }
  if (['saturdayPrice', 'sundayPrice', 'eventPrice'].some(field => result[field] <= result.weekdayPrice)) reject('Giá thứ Bảy, Chủ nhật và lễ / sự kiện phải cao hơn giá ngày thường.');
  return {...result, weekendPrice: result.saturdayPrice};
}

function assertCalendarPrices(state, typeId, weekdayPrice) {
  for (const [date, rule] of Object.entries(state.pricingCalendar || {})) {
    const price = rule.prices?.[typeId];
    if (rule.kind !== 'WEEKDAY' && price !== undefined && price <= weekdayPrice) reject(`Giá riêng ngày ${date} phải cao hơn giá ngày thường mới. Hãy chỉnh giá riêng trong lịch trước.`);
  }
}

function updateRates(state, typeId, body) {
  const type = state.roomTypes.find(t => t._id === typeId);
  if (!type) reject('Không tìm thấy loại phòng.', 404);
  const next = validateRates(body, type);
  assertCalendarPrices(state, typeId, next.weekdayPrice);
  Object.assign(type, next);
  state.settings.version++;
  return type;
}

function updateCalendar(state, body) {
  const {startDate, endDate = startDate, kind} = body;
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate || Number(startDate.slice(0, 4)) < 2000 || Number(endDate.slice(0, 4)) > 2100) reject('Chọn khoảng ngày hợp lệ từ năm 2000 đến 2100.');
  const count = (Date.parse(endDate) - Date.parse(startDate)) / 86400000 + 1;
  if (count > 366) reject('Mỗi lần chỉ cập nhật tối đa 366 ngày.');
  if (kind !== 'AUTO' && !Object.hasOwn(kinds, kind)) reject('Loại ngày không hợp lệ.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (kind === 'EVENT' && (!name || name.length > 100)) reject('Nhập tên lễ / sự kiện từ 1 đến 100 ký tự.');
  const prices = {};
  if (kind !== 'AUTO') {
    if (body.prices !== undefined && (!body.prices || typeof body.prices !== 'object' || Array.isArray(body.prices))) reject('Bảng giá riêng không hợp lệ.');
    for (const [typeId, price] of Object.entries(body.prices || {})) {
      const type = state.roomTypes.find(t => t._id === typeId);
      if (!type || !money(price)) reject('Loại phòng hoặc giá riêng không hợp lệ.');
      if (kind !== 'WEEKDAY' && price <= type.weekdayPrice) reject(`Giá riêng của ${type.name} phải cao hơn giá ngày thường.`);
      prices[typeId] = price;
    }
  }
  const calendar = {...state.pricingCalendar};
  for (let i = 0; i < count; i++) {
    const date = addDate(startDate, i);
    if (kind === 'AUTO') delete calendar[date];
    else calendar[date] = {kind, name: kind === 'EVENT' ? name : '', prices: {...prices}};
  }
  if (Object.keys(calendar).length > 4000) reject('Lịch giá chỉ hỗ trợ tối đa 4.000 ngày có cấu hình riêng.');
  state.pricingCalendar = calendar;
  state.settings.version++;
  return {startDate, endDate, count, version: state.settings.version};
}

function calendarMonth(state, month, typeId) {
  if (typeof month !== 'string' || !/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(month)) reject('Tháng phải có định dạng YYYY-MM.');
  const type = state.roomTypes.find(t => t._id === typeId);
  if (!type) reject('Không tìm thấy loại phòng.', 404);
  const first = month + '-01';
  const length = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  return {month, roomTypeId: type._id, roomTypeName: type.name, rates: rates(type), version: state.settings.version,
    days: Array.from({length}, (_, i) => resolveNight(state, type, addDate(first, i)))};
}

module.exports = {kinds, fields, rates, upgradePricing, naturalKind, resolveNight, validateRates, assertCalendarPrices, updateRates, updateCalendar, calendarMonth};
