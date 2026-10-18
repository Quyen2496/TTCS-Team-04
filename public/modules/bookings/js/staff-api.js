/* T4 Sprint 3: adapter for Phú's shared API. No writes or storage side effects. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.T4Staff = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DAY = 86400000;
  class ApiError extends Error {
    constructor(message, status = 0, uncertain = false) {
      super(message);
      this.status = status;
      this.uncertain = uncertain;
    }
  }
  const id = (value) =>
    typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
  const money = (value) => Number.isSafeInteger(value) && value >= 0;
  const day = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  const today = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  const add = (value, count) =>
    new Date(Date.parse(value) + count * DAY).toISOString().slice(0, 10);
  function datePart(value) {
    if (typeof value !== "string") return "";
    const result = value.slice(0, 10);
    return day(result) ? result : "";
  }
  function criteria(checkIn, checkOut, guestCount, first = today()) {
    const count = (Date.parse(checkOut) - Date.parse(checkIn)) / DAY;
    if (
      !day(checkIn) ||
      !day(checkOut) ||
      checkIn < first ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 30
    )
      throw new ApiError(
        "Chọn ngày nhận từ hôm nay, ngày trả sau ngày nhận và kỳ ở từ 1 đến 30 đêm.",
        400,
      );
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 100)
      throw new ApiError("Số khách phải là số nguyên từ 1 đến 100.", 400);
    return { checkIn, checkOut, guestCount };
  }
  function rooms(payload, guestCount) {
    if (payload?.success !== true || !Array.isArray(payload.data))
      throw new ApiError(
        "Chưa đọc được danh sách phòng từ máy chủ. Bạn thử tải lại nhé.",
      );
    return payload.data.map((row) => {
      if (
        !id(row.roomTypeId) ||
        typeof row.name !== "string" ||
        !row.name.trim() ||
        !Number.isInteger(row.availableRooms) ||
        row.availableRooms < 1 ||
        !Number.isInteger(row.capacity) ||
        row.capacity < guestCount
      )
        throw new ApiError("Máy chủ trả danh sách phòng chưa hợp lệ.");
      return { ...row, name: row.name.trim() };
    });
  }
  function quote(payload, input, roomTypeId, quantity = 1) {
    const q = payload?.data,
      count = (Date.parse(input.checkOut) - Date.parse(input.checkIn)) / DAY;
    if (
      payload?.success !== true ||
      !q ||
      q.roomTypeId !== roomTypeId ||
      typeof q.roomTypeName !== "string" ||
      !q.roomTypeName.trim() ||
      q.totalNights !== count ||
      q.quantity !== quantity ||
      !money(q.pricePerNight) ||
      q.pricePerNight < 1 ||
      !money(q.totalAmount) ||
      q.totalAmount !== q.pricePerNight * count * quantity
    )
      throw new ApiError(
        "Báo giá chưa khớp với ngày và loại phòng đã chọn. Bạn xem lại giá trước khi lưu.",
      );
    return { ...q, ...input };
  }
  const changeable = (booking) =>
    ["PENDING", "CONFIRMED", "PAID"].includes(booking?.status);
  function booking(payload, expected = {}) {
    const raw = payload?.data;
    const b = raw
      ? {
          ...raw,
          checkIn: raw.checkIn || raw.checkInDate,
          checkOut: raw.checkOut || raw.checkOutDate,
          depositAmount: raw.totalDeposit ?? raw.depositAmount,
        }
      : raw;
    if (
      payload?.success !== true ||
      !b ||
      !id(b._id) ||
      !id(b.roomTypeId) ||
      typeof b.bookingCode !== "string" ||
      !/^[A-Z0-9-]{8,32}$/.test(b.bookingCode) ||
      !datePart(b.checkIn) ||
      !datePart(b.checkOut) ||
      datePart(b.checkOut) <= datePart(b.checkIn) ||
      !Number.isInteger(b.guestCount) ||
      b.guestCount < 1 ||
      !money(b.totalAmount) ||
      (b.depositAmount !== undefined && !money(b.depositAmount)) ||
      ![
        "PENDING",
        "CONFIRMED",
        "PAID",
        "CHECKED_IN",
        "IN_HOUSE",
        "COMPLETED",
        "CLOSED",
        "CANCELLED",
        "EXPIRED",
      ].includes(b.status)
    )
      throw new ApiError(
        "Máy chủ trả thông tin booking chưa hợp lệ. Chưa xác nhận thao tác thành công.",
      );
    if (
      (expected.code && b.bookingCode !== expected.code) ||
      (expected.email &&
        b.email?.toLowerCase() !== expected.email.toLowerCase()) ||
      (expected.id && b._id !== expected.id) ||
      (expected.roomTypeId && b.roomTypeId !== expected.roomTypeId) ||
      (expected.checkIn && datePart(b.checkIn) !== expected.checkIn) ||
      (expected.checkOut && datePart(b.checkOut) !== expected.checkOut)
    )
      throw new ApiError(
        "Kết quả chưa khớp booking hoặc lịch vừa gửi. Bạn kiểm tra lại booking trước khi thao tác tiếp.",
      );
    return {
      ...b,
      checkIn: datePart(b.checkIn),
      checkOut: datePart(b.checkOut),
    };
  }
  function session(stores) {
    for (const store of stores) {
      try {
        const token = store.getItem("authToken"),
          user = JSON.parse(store.getItem("authUser") || "null");
        if (token && user && typeof user.role === "string")
          return { token, user };
      } catch {
        /* Storage is optional; never expose tokens in an error. */
      }
    }
    return null;
  }
  async function request(url, options = {}) {
    const mutating = options.method && options.method !== "GET";
    let response, payload;
    try {
      response = await (options.fetch || fetch)(url, {
        method: options.method || "GET",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + options.token,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: options.signal || AbortSignal.timeout(20000),
      });
    } catch {
      throw new ApiError(
        mutating
          ? "Chưa xác định yêu cầu đã được lưu hay chưa. Hãy kiểm tra booking trước khi gửi lại."
          : "Chưa kết nối được máy chủ. Bạn thử tải lại nhé.",
        0,
        !!mutating,
      );
    }
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(
        "Chưa đọc được phản hồi máy chủ. Hãy kiểm tra booking trước khi gửi lại.",
        response.status,
        !!mutating && (response.ok || response.status >= 500),
      );
    }
    if (!response.ok || payload.success === false) {
      const message = [
        payload.message,
        ...(Array.isArray(payload.errors)
          ? payload.errors.filter((x) => typeof x === "string")
          : []),
      ]
        .filter((x) => typeof x === "string")
        .join(" · ");
      throw new ApiError(
        response.status === 401 || response.status === 403
          ? "Phiên đăng nhập hoặc quyền truy cập không còn hợp lệ. Bạn đăng nhập lại bằng tài khoản nhân viên nhé."
          : message || "Yêu cầu thất bại (" + response.status + ").",
        response.status,
        !!mutating && response.status >= 500,
      );
    }
    return payload;
  }
  return {
    ApiError,
    id,
    money,
    day,
    today,
    add,
    datePart,
    criteria,
    rooms,
    quote,
    booking,
    changeable,
    session,
    request,
  };
});
