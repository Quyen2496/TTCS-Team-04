"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const searchForm = $("search-form"), bookingForm = $("booking-form");
  const API = Object.freeze({ availability: "/api/bookings/availability", quote: "/api/bookings/quote", create: "/api/bookings/create" });
  const state = { filterTypeId: "", roomPage:1, criteria: null, rooms: [], selected: null, quote: null, searchSeq: 0, quoteSeq: 0,
    searchAbort: null, quoteAbort: null, busy: false, uncertain: false, pending: null, booking: null };
  const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
  const money = value => currency.format(value);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isMoney = n => Number.isSafeInteger(n) && n >= 0;
  const isId = id => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
  const isDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  function today() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
  function addDays(day, count) { const d = new Date(`${day}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + count); return d.toISOString().slice(0, 10); }
  function nights(a, b) { return (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000; }
  function dateLabel(day) { return day.split("-").reverse().join("/"); }
  function dataError() { return new Error("Chưa đọc được thông tin phòng. Vui lòng thử lại sau."); }
  function notice(id, message, kind = "info") { const el = $(id); el.className = `notice ${kind}`; el.textContent = message; el.hidden = !message; }
  function progress(step) { ["search", "quote", "booking"].forEach((name, index) => { const el = $(`progress-${name}`); el.classList.toggle("done", index < step - 1); if (index === step - 1) el.setAttribute("aria-current", "step"); else el.removeAttribute("aria-current"); }); }
  function focusSection(id) { const el = $(id); el.scrollIntoView({ behavior: "auto", block: "start" }); el.focus({ preventScroll: true }); }
  function clearValidation(form) { for (const el of form.elements) if (typeof el.setCustomValidity === "function") el.setCustomValidity(""); }
  class ApiError extends Error { constructor(message, status = 0, code = "", retryAfter = 0) { super(message); this.status = status; this.code = code; this.retryAfter = retryAfter; } }
  async function request(url, { method = "GET", body, signal } = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, { once: true });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    try {
      const response = await fetch(url, { method, credentials: "same-origin", headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        const message = response.status === 404 ? "Chức năng này hiện chưa sẵn sàng. Vui lòng thử lại sau." :
          response.status === 429 ? "Bạn đã gửi quá nhiều yêu cầu. Vui lòng chờ rồi thử lại." :
          response.status >= 500 ? "Homestay chưa xử lý được yêu cầu. Vui lòng thử lại." :
          typeof json?.message === "string" ? json.message : "Không xử lý được yêu cầu. Vui lòng kiểm tra thông tin.";
        const retryAfter = Number(response.headers.get("Retry-After"));
        throw new ApiError(message, response.status, json?.code || "", Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 0);
      }
      if (json?.success !== true || !Object.hasOwn(json, "data")) throw new ApiError("Chưa đọc được phản hồi của homestay. Vui lòng thử lại.", 0);
      return json.data;
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof ApiError) throw error;
      throw new ApiError(timedOut ? "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại." : "Không thể kết nối tới homestay. Vui lòng kiểm tra kết nối và thử lại.", 0);
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  }
  function readCriteria() {
    clearValidation(searchForm);
    const checkIn = $("checkIn").value, checkOut = $("checkOut").value, guestCount = Number($("guestCount").value);
    if (!isDay(checkIn) || checkIn < today()) $("checkIn").setCustomValidity("Chọn ngày nhận phòng từ hôm nay trở đi.");
    if (!isDay(checkOut) || !isDay(checkIn) || !Number.isInteger(nights(checkIn, checkOut)) || nights(checkIn, checkOut) < 1 || nights(checkIn, checkOut) > 30) $("checkOut").setCustomValidity("Ngày trả phải sau ngày nhận, với kỳ lưu trú từ 1 đến 30 đêm.");
    if (!Number.isSafeInteger(guestCount) || guestCount < 1) $("guestCount").setCustomValidity("Nhập số khách là số nguyên dương.");
    if (!searchForm.reportValidity()) return null;
    return { checkIn, checkOut, guestCount, ...(state.filterTypeId ? { roomTypeId: state.filterTypeId } : {}) };
  }
  function cancelQuote() { state.quoteSeq++; state.quoteAbort?.abort(); state.quote = null; state.selected = null; $("quote-section").hidden = true; $("booking-section").hidden = true; $("policyAccepted").checked = false; }
  function invalidateSearch() {
    if (state.busy || state.uncertain) return;
    clearValidation(searchForm); state.searchSeq++; state.searchAbort?.abort(); cancelQuote(); state.criteria = null; state.rooms = [];
    $("results-section").hidden = true; $("search-button").disabled = false; $("search-button").lastChild.textContent = "Tìm phòng trống";
    notice("search-message", ""); notice("booking-message", ""); progress(1);
  }
  function safePhoto(path) {
    if (typeof path !== "string" || path.length > 2048 || /[\\\u0000-\u001f]/.test(path)) return "assets/room-placeholder.svg";
    try { const url = new URL(path, location.origin); if (url.protocol !== "https:" && !(url.protocol === "http:" && url.origin === location.origin)) return "assets/room-placeholder.svg"; return url.href; } catch { return "assets/room-placeholder.svg"; }
  }
  function validateRooms(data, criteria) {
    if (!Array.isArray(data?.roomTypes)) throw dataError();
    const ids = new Set();
    for (const room of data.roomTypes) {
      if (!isId(room.roomTypeId) || ids.has(room.roomTypeId) || typeof room.name !== "string" || !room.name.trim() ||
          !Number.isSafeInteger(room.standardCapacity) || room.standardCapacity < 1 || !Number.isSafeInteger(room.maxCapacity) || room.maxCapacity < room.standardCapacity || room.maxCapacity < criteria.guestCount ||
          !Number.isSafeInteger(room.availableCount) || room.availableCount < 1 || !isMoney(room.fromPrice)) throw dataError();
      if (criteria.roomTypeId && room.roomTypeId !== criteria.roomTypeId) throw dataError();
      ids.add(room.roomTypeId);
    }
    return data.roomTypes;
  }
  function renderRooms() {
    const criteria = state.criteria;
    $("results-description").textContent = `${dateLabel(criteria.checkIn)} – ${dateLabel(criteria.checkOut)} · ${nights(criteria.checkIn, criteria.checkOut)} đêm · ${criteria.guestCount} khách`;
    $("results-count").textContent = `${state.rooms.length} loại phòng`;
    $("room-results").innerHTML = HS.pageSlice(state.rooms,state.roomPage,matchMedia("(max-width:600px)").matches?3:6).items.map(room => `<article class="room-card${state.selected?.roomTypeId === room.roomTypeId ? " selected" : ""}"><img class="room-image" src="${esc(safePhoto(room.photo?.thumbnailPath || room.photo?.path))}" alt="${esc(room.photo?.alt || `Hình ảnh ${room.name}`)}" loading="lazy"><div class="room-content"><div class="room-top"><span>LOẠI PHÒNG</span><span class="status">Còn ${room.availableCount} phòng</span></div><h3>${esc(room.name)}</h3><div class="amenity-tags">${(room.amenities||[]).slice(0,3).map(a=>`<span class="tag">${HS.iconHTML(a.icon)} ${esc(a.name)}</span>`).join("")}</div><p class="capacity">${room.standardCapacity} khách tiêu chuẩn · Tối đa ${room.maxCapacity} khách</p><div class="room-price"><span>Từ</span><strong>${esc(money(room.fromPrice))}</strong><span>/ đêm</span></div><p class="room-caption">Xem báo giá để biết giá từng đêm và phụ thu.</p><button type="button" class="btn ${state.selected?.roomTypeId === room.roomTypeId ? "primary" : "secondary"}" data-room-type="${room.roomTypeId}">${state.selected?.roomTypeId === room.roomTypeId ? "Đã chọn · Xem lại báo giá" : "Chọn phòng · Xem báo giá"}</button></div></article>`).join("");
    $("booking-pagination").innerHTML=HS.pager(HS.pageSlice(state.rooms,state.roomPage,matchMedia("(max-width:600px)").matches?3:6));
    $("room-results").querySelectorAll("img").forEach(img => img.addEventListener("error", () => { if (!img.dataset.fallback) { img.dataset.fallback = "1"; img.src = "assets/room-placeholder.svg"; img.alt = "Hình ảnh phòng đang cập nhật"; } }, { once: true }));
    $("room-results").querySelectorAll("[data-room-type]").forEach(button => button.addEventListener("click", () => selectRoom(button.dataset.roomType)));
  }
  async function search(event) {
    event?.preventDefault(); if (state.busy || state.uncertain) return;
    const criteria = readCriteria(); if (!criteria) return;
    const seq = ++state.searchSeq; state.searchAbort?.abort(); state.searchAbort = new AbortController(); cancelQuote();
    state.criteria = criteria; state.rooms = []; state.roomPage=1; $("results-section").hidden = true;
    $("search-button").disabled = true; $("search-button").lastChild.textContent = "Đang tìm phòng…";
    notice("search-message", "Đang tìm phòng cho kỳ lưu trú của bạn…", "loading"); progress(1);
    try {
      const data = await request(`${API.availability}?${new URLSearchParams(criteria)}`, { signal: state.searchAbort.signal });
      if (seq !== state.searchSeq) return;
      state.rooms = validateRooms(data, criteria);
      if (!state.rooms.length) { notice("search-message", "Không còn phòng phù hợp trong khoảng ngày này. Bạn có thể đổi ngày hoặc số khách.", "warning"); return; }
      notice("search-message", ""); renderRooms(); $("results-section").hidden = false;
    } catch (error) { if (seq === state.searchSeq) notice("search-message", error.message, "error"); }
    finally { if (seq === state.searchSeq) { $("search-button").disabled = false; $("search-button").lastChild.textContent = "Tìm phòng trống"; } }
  }
  function validateQuote(q, criteria, room) {
    const count = nights(criteria.checkIn, criteria.checkOut);
    if (q?.roomTypeId !== room.roomTypeId || q.checkIn !== criteria.checkIn || q.checkOut !== criteria.checkOut || q.guestCount !== criteria.guestCount || q.numberOfNights !== count || !Array.isArray(q.nightlyPrices) || q.nightlyPrices.length !== count ||
        ![q.roomTotal, q.extraGuestTotal, q.totalAmount].every(isMoney) || q.totalAmount !== q.roomTotal + q.extraGuestTotal || typeof q.roomTypeName !== "string" || !q.roomTypeName.trim()) throw dataError();
    let roomSum = 0, extraSum = 0;
    for (let i = 0; i < count; i++) { const row = q.nightlyPrices[i]; if (row.night !== addDays(criteria.checkIn, i) || ![row.basePrice, row.surchargeAmount, row.lineTotal, row.extraGuestUnitPrice].every(isMoney) || row.lineTotal !== row.basePrice + row.surchargeAmount || !Number.isSafeInteger(row.extraGuestCount) || row.extraGuestCount !== Math.max(0, criteria.guestCount - room.standardCapacity) || row.surchargeAmount !== row.extraGuestCount * row.extraGuestUnitPrice || !["WEEKDAY", "WEEKEND", "OVERRIDE"].includes(row.priceKind) || typeof row.label !== "string" || !row.label.trim()) throw dataError(); roomSum += row.basePrice; extraSum += row.surchargeAmount; }
    const s = q.settingsSnapshot;
    if (roomSum !== q.roomTotal || extraSum !== q.extraGuestTotal || !Number.isSafeInteger(s?.version) || s.version < 1 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.checkInTime || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.checkOutTime || "") || !isMoney(s.extraGuestPerNight) || !Array.isArray(s.cancellationRules) || s.cancellationRules.length < 1 || s.cancellationRules.length > 3) throw dataError();
    s.cancellationRules.forEach((r, i) => { if (!Number.isSafeInteger(r.hoursBefore) || r.hoursBefore < 0 || !Number.isFinite(r.refundPercent) || r.refundPercent < 0 || r.refundPercent > 100 || (i && s.cancellationRules[i - 1].hoursBefore <= r.hoursBefore)) throw dataError(); });
    return q;
  }
  async function selectRoom(id) {
    if (state.busy || state.uncertain || !state.criteria) return;
    const room = state.rooms.find(r => r.roomTypeId === id); if (!room) return;
    cancelQuote(); state.selected = room; renderRooms(); const seq = ++state.quoteSeq; state.quoteAbort = new AbortController();
    $("quote-section").hidden = false; $("quote-content").hidden = true; $("quote-description").textContent = room.name;
    notice("quote-message", "Đang lấy báo giá cho phòng bạn chọn…", "loading"); progress(2);
    try {
      const q = await request(API.quote, { method: "POST", body: { ...state.criteria, roomTypeId: id }, signal: state.quoteAbort.signal });
      if (seq !== state.quoteSeq) return;
      state.quote = validateQuote(q, state.criteria, room); $("continue-button").disabled = false; $("booking-button").disabled = false; renderQuote(); notice("quote-message", ""); $("quote-content").hidden = false; focusSection("quote-title");
    } catch (error) { if (seq === state.quoteSeq) { state.quote = null; notice("quote-message", error.message, "error"); } }
  }
  function renderQuote() {
    const q = state.quote, s = q.settingsSnapshot;
    $("quote-description").textContent = `${q.roomTypeName} · ${dateLabel(q.checkIn)} – ${dateLabel(q.checkOut)} · ${q.numberOfNights} đêm · ${q.guestCount} khách`;
    $("nightly-prices").innerHTML = q.nightlyPrices.map(row => `<tr><th scope="row">${dateLabel(row.night)}</th><td><span class="price-label">${esc(row.label)}</span></td><td class="money">${esc(money(row.basePrice))}</td><td class="money">${esc(money(row.surchargeAmount))}</td><td class="money">${esc(money(row.lineTotal))}</td></tr>`).join("");
    $("room-total").textContent = money(q.roomTotal); $("extra-total").textContent = money(q.extraGuestTotal); $("quote-total").textContent = money(q.totalAmount);
    const extraCount = q.nightlyPrices[0].extraGuestCount;
    $("policy-content").innerHTML = `<p>Nhận phòng từ <strong>${esc(s.checkInTime)}</strong> · Trả phòng trước <strong>${esc(s.checkOutTime)}</strong>.</p><p>Phụ thu: ${esc(money(s.extraGuestPerNight))}/người/đêm khi vượt sức chứa tiêu chuẩn.${extraCount ? ` Kỳ lưu trú này có ${extraCount} khách vượt chuẩn trong ${q.numberOfNights} đêm.` : ""}</p><ul>${s.cancellationRules.map(r => `<li>Huỷ trước ít nhất ${r.hoursBefore} giờ: hoàn ${r.refundPercent}% tiền cọc đã ghi nhận.</li>`).join("")}</ul>`;
    $("selection-summary").innerHTML = `<strong>${esc(q.roomTypeName)}</strong>${dateLabel(q.checkIn)} – ${dateLabel(q.checkOut)} · ${q.numberOfNights} đêm · ${q.guestCount} khách · Tổng tiền ${esc(money(q.totalAmount))}`;
  }
  function continueBooking() { if (!state.quote || state.busy || state.uncertain) return; $("booking-section").hidden = false; notice("booking-message", ""); progress(3); focusSection("booking-title"); }
  function randomKey() { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
  function setBookingLock(locked) {
    for (const el of searchForm.elements) el.disabled = locked;
    for (const el of bookingForm.elements) if (el.id !== "booking-button") el.disabled = locked;
    $("room-results").querySelectorAll("button").forEach(el => { el.disabled = locked; });
    $("continue-button").disabled = locked; $("clear-type-filter").disabled = locked;
    $("booking-button").disabled = state.busy;
    $("booking-button").textContent = state.busy ? "Đang gửi yêu cầu…" : state.uncertain ? "Thử lại cùng yêu cầu" : "Gửi yêu cầu đặt phòng";
  }
  function payload() {
    clearValidation(bookingForm);
    $("guestName").value = $("guestName").value.trim(); $("phone").value = $("phone").value.trim(); $("email").value = $("email").value.trim().toLowerCase();
    if (!$("guestName").value) $("guestName").setCustomValidity("Vui lòng nhập họ và tên.");
    if (!/^0[35789]\d{8}$/.test($("phone").value)) $("phone").setCustomValidity("Nhập số điện thoại Việt Nam gồm 10 chữ số, ví dụ 0912345678.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("email").value)) $("email").setCustomValidity("Vui lòng nhập email hợp lệ.");
    if (!bookingForm.reportValidity()) return null;
    const q = state.quote;
    return { roomTypeId: q.roomTypeId, checkIn: q.checkIn, checkOut: q.checkOut, guestCount: q.guestCount, guestName: $("guestName").value, phone: $("phone").value, email: $("email").value, notes: $("notes").value.trim(), policyAccepted: $("policyAccepted").checked,
      expectedTotalAmount: q.totalAmount, expectedSettingsVersion: q.settingsSnapshot.version };
  }
  function validateBooking(data, body) {
    if (!/^[A-Z0-9]{8}$/.test(data?.bookingCode || "") || typeof data.roomTypeName !== "string" || !data.roomTypeName.trim() || data.checkInDay !== body.checkIn || data.checkOutDay !== body.checkOut || data.numberOfNights !== nights(body.checkIn, body.checkOut) || !isMoney(data.totalAmount) || data.totalAmount !== body.expectedTotalAmount || data.status !== "PENDING" || !Number.isFinite(Date.parse(data.holdExpiresAt))) throw new ApiError("Chưa xác nhận được kết quả đặt phòng. Vui lòng thử lại cùng yêu cầu.", 0);
    return data;
  }
  async function book(event) {
    event.preventDefault(); if (state.busy || !state.quote) return;
    let body;
    if (state.uncertain) body = state.pending.body;
    else {
      body = payload(); if (!body) return;
      const fingerprint = JSON.stringify(body);
      if (!state.pending || state.pending.fingerprint !== fingerprint) state.pending = { fingerprint, body: { ...body, requestKey: randomKey() } };
      body = state.pending.body;
    }
    state.busy = true; setBookingLock(true); notice("booking-message", "Đang gửi yêu cầu. Vui lòng chờ…", "loading");
    try {
      const result = await request(API.create, { method: "POST", body });
      state.booking = validateBooking(result, body); state.uncertain = false; state.pending = null; showSuccess(body);
    } catch (error) {
      if (!error.status || error.status >= 500) { state.uncertain = true; notice("booking-message", "Chưa xác nhận được yêu cầu đã được lưu hay chưa. Hãy thử lại cùng yêu cầu để tránh đặt trùng.", "warning"); }
      else {
        state.uncertain = false;
        notice("booking-message", `${error.message}${error.retryAfter ? ` Bạn có thể thử lại sau khoảng ${Math.ceil(error.retryAfter / 60)} phút.` : ""}`, error.status === 429 ? "warning" : "error");
        if (error.status === 409) {
          state.quote = null; $("policyAccepted").checked = false; $("continue-button").disabled = true; $("booking-button").disabled = true;
          notice("quote-message", error.code === "PRICE_CHANGED" || error.code === "POLICY_CHANGED" ? "Giá hoặc chính sách đã thay đổi. Vui lòng tìm lại phòng và xem báo giá mới trước khi gửi." : "Phòng hoặc thông tin giữ chỗ đã thay đổi. Vui lòng tìm lại phòng; thông tin khách vẫn được giữ.", "warning");
        }
      }
    } finally { state.busy = false; setBookingLock(state.uncertain); if (!state.quote) { $("booking-button").disabled = true; $("continue-button").disabled = true; } }
  }
  function showSuccess(body) {
    const b = state.booking;
    $("success-code").textContent = b.bookingCode;
    const deadline = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(b.holdExpiresAt));
    const details = [["Loại phòng", b.roomTypeName], ["Ngày nhận – trả", `${dateLabel(b.checkInDay)} – ${dateLabel(b.checkOutDay)}`], ["Số đêm · Số khách", `${b.numberOfNights} đêm · ${body.guestCount} khách`], ["Tổng tiền", money(b.totalAmount)], ["Trạng thái", "Chờ xác nhận"], ["Hạn giữ chỗ (giờ Việt Nam)", deadline], ["Email tra cứu", body.email]];
    $("success-details").innerHTML = details.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("");
    $("success-section").hidden = false; $("results-section").hidden = true; $("quote-section").hidden = true; $("booking-section").hidden = true; $("search-form").closest("section").hidden = true; progress(3); focusSection("success-title");
  }
  function newBooking() {
    state.booking = null; state.pending = null; state.uncertain = false; bookingForm.reset(); clearValidation(bookingForm); setBookingLock(false); $("success-section").hidden = true;
    $("search-form").closest("section").hidden = false; $("copy-message").textContent = ""; invalidateSearch(); search();
  }
  $("booking-pagination").addEventListener("click",event=>{const b=event.target.closest("[data-page]");if(b&&!state.busy&&!state.uncertain){state.roomPage=Number(b.dataset.page);renderRooms();$("results-title").scrollIntoView({block:"start"});}});
  searchForm.addEventListener("submit", search);
  for (const input of [$("checkIn"), $("checkOut"), $("guestCount")]) input.addEventListener("input", invalidateSearch);
  $("checkIn").addEventListener("change", () => { if (isDay($("checkIn").value)) { $("checkOut").min = addDays($("checkIn").value, 1); $("checkOut").max = addDays($("checkIn").value, 30); } });
  bookingForm.addEventListener("submit", book); bookingForm.addEventListener("input", () => { if (!state.busy && !state.uncertain) { clearValidation(bookingForm); notice("booking-message", ""); } });
  $("continue-button").addEventListener("click", continueBooking);
  $("change-room-button").addEventListener("click", () => { if (!state.busy && !state.uncertain) { $("booking-section").hidden = true; $("results-section").scrollIntoView({ block: "start" }); progress(2); } });
  $("clear-type-filter").addEventListener("click", () => { if (state.busy || state.uncertain) return; state.filterTypeId = ""; $("selected-type-hint").hidden = true; $("clear-type-filter").hidden = true; invalidateSearch(); search(); });
  $("new-booking-button").addEventListener("click", newBooking);
  $("copy-code").addEventListener("click", async () => { try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(state.booking.bookingCode); $("copy-message").textContent = "Đã sao chép mã booking."; } catch { $("copy-message").textContent = "Chưa sao chép được. Bạn có thể chọn và sao chép mã ở trên."; } });
  const params = new URLSearchParams(location.search), firstDay = today();
  $("checkIn").min = firstDay; $("checkIn").value = isDay(params.get("checkIn")) && params.get("checkIn") >= firstDay ? params.get("checkIn") : firstDay;
  $("checkOut").min = addDays($("checkIn").value, 1); $("checkOut").max = addDays($("checkIn").value, 30);
  $("checkOut").value = isDay(params.get("checkOut")) && nights($("checkIn").value, params.get("checkOut")) >= 1 && nights($("checkIn").value, params.get("checkOut")) <= 30 ? params.get("checkOut") : addDays($("checkIn").value, 1);
  const count = Number(params.get("guestCount")); if (Number.isSafeInteger(count) && count >= 1) $("guestCount").value = count;
  if (params.has("roomTypeId")) {
    if (isId(params.get("roomTypeId"))) { state.filterTypeId = params.get("roomTypeId").toLowerCase(); $("selected-type-hint").textContent = "Đang tìm trong loại phòng bạn đã chọn."; $("selected-type-hint").hidden = false; $("clear-type-filter").hidden = false; }
    else notice("search-message", "Loại phòng trong liên kết không hợp lệ. Bạn có thể tìm trong tất cả loại phòng.", "warning");
  }
})();
