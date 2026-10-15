(function () {
  "use strict";
  const C = window.T4Staff,
    $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const money = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  const deposit = (b) =>
    C.money(b.depositAmount) ? money(b.depositAmount) : "Chưa có thông tin";
  const date = (value) => C.datePart(value).split("-").reverse().join("/");
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    PAID: "Đã thanh toán",
    CHECKED_IN: "Đang ở",
    COMPLETED: "Đã trả phòng",
    CANCELLED: "Đã huỷ",
    EXPIRED: "Hết giữ chỗ",
  };
  const state = {
    busy: false,
    booking: null,
    changeQuote: null,
    changeInput: null,
    changeRooms: [],
    walkInput: null,
    walkQuote: null,
    walkRooms: [],
    walkUnknown: false,
    changeUnknown: false,
  };
  function notice(id, text, kind = "error") {
    const box = $(id);
    box.textContent = text;
    box.className = "notice " + kind;
    box.hidden = !text;
  }
  function auth() {
    const s = C.session([sessionStorage, localStorage]);
    return s && ["admin", "staff"].includes(s.user.role) ? s : null;
  }
  function gate(message) {
    $("auth-gate").hidden = false;
    $("staff-workspace").hidden = true;
    if (message) $("auth-message").textContent = message;
  }
  async function api(url, options = {}) {
    const s = auth();
    if (!s) {
      gate();
      throw new C.ApiError("Bạn cần đăng nhập nhân viên.", 401);
    }
    try {
      return await C.request(url, { ...options, token: s.token });
    } catch (error) {
      if ([401, 403].includes(error.status)) gate(error.message);
      throw error;
    }
  }
  function refresh() {
    $("change-save").disabled =
      state.busy ||
      state.changeUnknown ||
      !state.changeQuote ||
      !$("change-consent").checked;
    $("walk-create").disabled =
      state.busy || state.walkUnknown || !state.walkQuote;
    $("walk-fields").disabled = state.busy || state.walkUnknown;
    $("walk-search-fields").disabled = state.busy || state.walkUnknown;
    $("change-fields").disabled = state.busy || state.changeUnknown;
  }
  function busy(value) {
    state.busy = value;
    document
      .querySelectorAll(
        "#staff-workspace input,#staff-workspace select,#staff-workspace button",
      )
      .forEach((el) => (el.disabled = value));
    $("staff-workspace").setAttribute("aria-busy", String(value));
    refresh();
  }
  function operationError(id, error) {
    notice(id, error.message, error.uncertain ? "warning" : "error");
  }
  function list(pairs, css = "staff-receipt") {
    return (
      '<dl class="' +
      css +
      '">' +
      pairs
        .map(
          ([k, v]) =>
            "<div><dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd></div>",
        )
        .join("") +
      "</dl>"
    );
  }
  function roomName(booking) {
    return (
      state.changeRooms.find((r) => r.roomTypeId === booking.roomTypeId)
        ?.name ||
      booking.roomTypeName ||
      "Loại phòng hiện tại"
    );
  }
  function renderHistory(booking) {
    $("history-section").hidden = false;
    const entries = Array.isArray(booking.changeHistory)
      ? booking.changeHistory
      : [];
    if (!entries.length) {
      $("change-history").textContent =
        "Chưa có lịch sử thay đổi được trả về cho booking này.";
      return;
    }
    $("change-history").innerHTML =
      '<div class="staff-table-wrap"><table><thead><tr><th>Thời điểm</th><th>Người thay đổi</th><th>Nội dung</th><th>Lý do</th></tr></thead><tbody>' +
      entries
        .map(
          (h) =>
            "<tr><td>" +
            esc(
              h.at
                ? new Date(h.at).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })
                : "Chưa cập nhật",
            ) +
            "</td><td>" +
            esc(h.actorName || "Chưa cập nhật") +
            "</td><td>" +
            esc(h.description || "Chưa có chi tiết") +
            "</td><td>" +
            esc(h.reason || "Chưa cập nhật") +
            "</td></tr>",
        )
        .join("") +
      "</tbody></table></div>";
  }
  function renderCurrent() {
    const b = state.booking;
    $("current-booking").hidden = false;
    $("current-booking").innerHTML =
      "<strong>" +
      esc(b.bookingCode) +
      '</strong><span class="staff-status">' +
      esc(labels[b.status]) +
      "</span>" +
      list([
        ["Khách", b.guestName || "Chưa cập nhật"],
        ["Ngày nhận / trả", date(b.checkIn) + " – " + date(b.checkOut)],
        ["Số khách", b.guestCount],
        ["Loại phòng", roomName(b)],
        ["Tổng tiền booking", money(b.totalAmount)],
        ["Tiền cọc đã ghi", deposit(b)],
      ]);
    renderHistory(b);
  }
  function invalidateChange() {
    state.changeQuote = null;
    state.changeInput = null;
    $("change-preview").hidden = true;
    $("change-consent").checked = false;
    refresh();
  }
  function invalidateWalk() {
    state.walkQuote = null;
    $("walk-consent").checked = false;
    $("walk-details").hidden = true;
    refresh();
  }
  function changeInput() {
    if (!state.booking) throw new C.ApiError("Bạn tìm booking trước nhé.", 400);
    return C.criteria(
      $("change-in").value,
      $("change-out").value,
      state.booking.guestCount,
    );
  }
  function walkInput() {
    return C.criteria(
      $("walk-in").value,
      $("walk-out").value,
      Number($("walk-guests").value),
    );
  }
  function renderTypes(rows) {
    const old = $("change-type").value || state.booking.roomTypeId;
    const options = rows.slice();
    if (!options.some((r) => r.roomTypeId === state.booking.roomTypeId))
      options.unshift({
        roomTypeId: state.booking.roomTypeId,
        name: state.booking.roomTypeName || "Loại phòng hiện tại",
        availableRooms: null,
      });
    $("change-type").innerHTML = options
      .map(
        (r) =>
          '<option value="' +
          esc(r.roomTypeId) +
          '">' +
          esc(r.name) +
          (r.availableRooms === null
            ? " · booking hiện tại"
            : " · " + r.availableRooms + " phòng trống") +
          "</option>",
      )
      .join("");
    if (options.some((r) => r.roomTypeId === old)) $("change-type").value = old;
    $("change-type-hint").textContent =
      "Kết quả tra phòng có thể không tính phòng mà booking này đang giữ. Giá và lịch cần kiểm tra lại khi lưu.";
  }
  async function available(input) {
    return C.rooms(
      await api("/api/bookings/availability?" + new URLSearchParams(input)),
      input.guestCount,
    );
  }
  async function findBooking(event) {
    event.preventDefault();
    if (state.busy) return;
    const code = $("find-code").value.trim().toUpperCase(),
      email = $("find-email").value.trim().toLowerCase();
    if (!code || !email || !$("find-booking-form").reportValidity()) return;
    busy(true);
    state.booking = null;
    invalidateChange();
    $("current-booking").hidden = true;
    $("change-section").hidden = true;
    $("history-section").hidden = true;
    $("change-success").hidden = true;
    notice("find-message", "Đang tìm booking…", "loading");
    try {
      const b = C.booking(
        await api(
          "/api/bookings/lookup?" +
            new URLSearchParams({ bookingCode: code, email }),
        ),
        { code, email },
      );
      state.booking = b;
      state.changeUnknown = false;
      state.changeRooms = [];
      renderCurrent();
      if (!C.changeable(b)) {
        notice(
          "find-message",
          "Booking ở trạng thái " +
            labels[b.status] +
            ", không thể đổi lịch tại màn hình này.",
          "warning",
        );
        return;
      }
      if (b.checkIn < C.today()) {
        notice(
          "find-message",
          "Ngày nhận của booking đã qua. Bạn kiểm tra tình trạng lưu trú trước khi thay đổi.",
          "warning",
        );
        return;
      }
      $("change-in").value = b.checkIn;
      $("change-out").value = b.checkOut;
      $("change-in").min = C.today();
      renderTypes([]);
      $("change-section").hidden = false;
      notice(
        "find-message",
        "Đã tìm thấy booking. Bạn chọn lịch và xem giá thay đổi nhé.",
        "success",
      );
    } catch (error) {
      operationError("find-message", error);
    } finally {
      busy(false);
    }
  }
  async function loadChangeRooms() {
    if (state.busy || state.changeUnknown) return;
    let input;
    try {
      input = changeInput();
    } catch (e) {
      return operationError("change-message", e);
    }
    invalidateChange();
    busy(true);
    notice("change-message", "Đang kiểm tra loại phòng phù hợp…", "loading");
    try {
      state.changeRooms = await available(input);
      renderTypes(state.changeRooms);
      notice(
        "change-message",
        state.changeRooms.length
          ? "Đã tải các loại phòng còn trống theo kỳ mới."
          : "Chưa thấy loại phòng khác còn trống. Bạn có thể đổi ngày hoặc kiểm tra lại booking hiện tại.",
        state.changeRooms.length ? "success" : "warning",
      );
    } catch (e) {
      operationError("change-message", e);
    } finally {
      busy(false);
    }
  }
  async function previewChange(event) {
    event.preventDefault();
    if (state.busy || state.changeUnknown) return;
    let input;
    const type = $("change-type").value;
    try {
      input = changeInput();
      if (!C.id(type))
        throw new C.ApiError("Bạn chọn loại phòng trước nhé.", 400);
    } catch (e) {
      return operationError("change-message", e);
    }
    invalidateChange();
    busy(true);
    notice("change-message", "Đang lấy giá mới…", "loading");
    try {
      const b = state.booking,
        quantity =
          Number.isInteger(b.quantity) && b.quantity > 0 ? b.quantity : 1;
      const q = C.quote(
        await api("/api/bookings/quote", {
          method: "POST",
          body: {
            roomTypeId: type,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            quantity,
          },
        }),
        input,
        type,
        quantity,
      );
      state.changeQuote = q;
      state.changeInput = { ...input, roomTypeId: type };
      const rows = [
        ["Ngày nhận", date(b.checkIn), date(input.checkIn)],
        ["Ngày trả", date(b.checkOut), date(input.checkOut)],
        ["Loại phòng", roomName(b), q.roomTypeName],
        [
          "Số đêm",
          (Date.parse(b.checkOut) - Date.parse(b.checkIn)) / 86400000,
          q.totalNights,
        ],
        ["Tổng tiền", money(b.totalAmount), money(q.totalAmount)],
        ["Tiền cọc đã ghi", deposit(b), "Đối chiếu sau khi lưu"],
      ];
      $("change-comparison").innerHTML =
        '<div class="staff-table-wrap"><table><thead><tr><th>Thông tin</th><th>Hiện tại</th><th>Dự kiến sau đổi</th></tr></thead><tbody>' +
        rows
          .map(
            (row) =>
              "<tr>" +
              row.map((c) => "<td>" + esc(c) + "</td>").join("") +
              "</tr>",
          )
          .join("") +
        "</tbody></table></div>";
      const diff = q.totalAmount - b.totalAmount;
      $("change-difference").innerHTML =
        esc(
          diff > 0
            ? "Giá booking tăng"
            : diff < 0
              ? "Giá booking giảm"
              : "Tổng giá không thay đổi",
        ) +
        "<strong>" +
        esc(money(Math.abs(diff))) +
        "</strong><small>Giá có thể được tính lại khi lưu. Số tiền thu/hoàn xử lý tại màn hình tiền cọc.</small>";
      $("change-preview").hidden = false;
      notice(
        "change-message",
        "Đã có giá mới. Bạn kiểm tra thông tin rồi xác nhận nhé.",
        "success",
      );
    } catch (e) {
      operationError("change-message", e);
    } finally {
      busy(false);
    }
  }
  async function saveChange() {
    if (
      state.busy ||
      state.changeUnknown ||
      !state.changeQuote ||
      !$("change-consent").checked
    )
      return;
    const b = state.booking,
      input = state.changeInput;
    busy(true);
    notice("change-message", "Đang lưu thay đổi…", "loading");
    let accepted = false;
    try {
      const p = await api("/api/bookings/" + b._id + "/modify", {
        method: "PUT",
        body: {
          newRoomTypeId: input.roomTypeId,
          newCheckIn: input.checkIn,
          newCheckOut: input.checkOut,
        },
      });
      accepted = true;
      const updated = C.booking(p, {
        id: b._id,
        roomTypeId: input.roomTypeId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
      });
      updated.roomTypeName ||= state.changeQuote.roomTypeName;
      state.booking = updated;
      invalidateChange();
      renderCurrent();
      $("change-success").innerHTML =
        "<h3>Đã lưu thay đổi cho " +
        esc(updated.bookingCode) +
        "</h3>" +
        list([
          [
            "Ngày nhận / trả",
            date(updated.checkIn) + " – " + date(updated.checkOut),
          ],
          ["Tổng tiền mới", money(updated.totalAmount)],
          [
            "Chênh lệch so với booking cũ",
            money(updated.totalAmount - b.totalAmount),
          ],
          ["Tiền cọc hiện tại", deposit(updated)],
        ]) +
        '<p class="staff-caption">Các thông tin trên là kết quả sau khi máy chủ lưu. Tiền thu và tiền hoàn cần đối chiếu riêng.</p>';
      $("change-success").hidden = false;
      notice("change-message", "Thay đổi thành công.", "success");
      $("change-success").focus();
    } catch (e) {
      if (e.uncertain || accepted) {
        state.changeUnknown = true;
        invalidateChange();
        notice(
          "change-message",
          "Chưa xác định được kết quả lưu. Bạn tìm lại booking bằng mã và email ở bước 1 trước khi thay đổi tiếp.",
          "warning",
        );
      } else operationError("change-message", e);
    } finally {
      busy(false);
    }
  }
  async function searchWalk(event) {
    event.preventDefault();
    if (state.busy || state.walkUnknown) return;
    let input;
    try {
      input = walkInput();
    } catch (e) {
      return operationError("walk-search-message", e);
    }
    invalidateWalk();
    state.walkInput = input;
    state.walkRooms = [];
    $("walk-results").innerHTML = "";
    busy(true);
    notice(
      "walk-search-message",
      "Đang tìm phòng cho khách tại quầy…",
      "loading",
    );
    try {
      const rows = await available(input);
      state.walkRooms = rows;
      $("walk-results").innerHTML = rows
        .map(
          (r) =>
            '<article class="staff-room-card"><h3>' +
            esc(r.name) +
            "</h3><p>" +
            esc(r.capacity) +
            " khách tối đa · " +
            esc(r.availableRooms) +
            ' phòng trống</p><button class="btn secondary" type="button" data-walk-room="' +
            esc(r.roomTypeId) +
            '">Chọn và xem giá</button></article>',
        )
        .join("");
      notice(
        "walk-search-message",
        rows.length
          ? "Chọn một loại phòng để xem báo giá."
          : "Chưa có phòng phù hợp trong kỳ này. Bạn thử ngày hoặc số khách khác nhé.",
        rows.length ? "success" : "warning",
      );
    } catch (e) {
      operationError("walk-search-message", e);
    } finally {
      busy(false);
    }
  }
  async function quoteWalk(type) {
    if (state.busy || state.walkUnknown) return;
    const input = state.walkInput;
    if (!input || !state.walkRooms.some((r) => r.roomTypeId === type)) return;
    state.walkQuote = null;
    $("walk-details").hidden = false;
    busy(true);
    notice("walk-message", "Đang lấy báo giá…", "loading");
    try {
      const q = C.quote(
        await api("/api/bookings/quote", {
          method: "POST",
          body: {
            roomTypeId: type,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            quantity: 1,
          },
        }),
        input,
        type,
      );
      state.walkQuote = q;
      $("walk-quote").innerHTML =
        "<strong>" +
        esc(q.roomTypeName) +
        "</strong>" +
        list([
          ["Nhận / trả", date(input.checkIn) + " – " + date(input.checkOut)],
          [
            "Số đêm / số khách",
            q.totalNights + " đêm · " + input.guestCount + " khách",
          ],
          ["Giá mỗi đêm", money(q.pricePerNight)],
          ["Tổng báo giá", money(q.totalAmount)],
        ]) +
        '<p class="staff-caption">Tổng tiền sẽ được máy chủ tính lại khi tạo booking.</p>';
      $("walk-consent").checked = false;
      notice(
        "walk-message",
        "Đã có giá. Bạn điền thông tin khách rồi tạo booking nhé.",
        "success",
      );
      $("walk-name").focus();
    } catch (e) {
      operationError("walk-message", e);
    } finally {
      busy(false);
    }
  }
  async function createWalk(event) {
    event.preventDefault();
    if (
      state.busy ||
      state.walkUnknown ||
      !state.walkQuote ||
      !$("walk-form").reportValidity()
    )
      return;
    const q = state.walkQuote,
      input = state.walkInput,
      name = $("walk-name").value.trim(),
      phone = $("walk-phone").value.trim(),
      email = $("walk-email").value.trim().toLowerCase();
    if (name.length < 2)
      return notice("walk-message", "Bạn nhập họ tên khách ít nhất 2 ký tự.");
    const body = {
      guestName: name,
      phone,
      ...(email ? { email } : {}),
      roomTypeId: q.roomTypeId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestCount: input.guestCount,
      isPaidNow: $("walk-paid").checked,
    };
    busy(true);
    notice("walk-message", "Đang tạo booking tại quầy…", "loading");
    let accepted = false;
    try {
      const p = await api("/api/bookings/walk-in", { method: "POST", body });
      accepted = true;
      const b = C.booking(p, {
        roomTypeId: body.roomTypeId,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        ...(email ? { email } : {}),
      });
      if (!["PENDING", "CONFIRMED", "PAID"].includes(b.status))
        throw new C.ApiError(
          "Booking trả về trạng thái chưa khớp yêu cầu tạo tại quầy.",
        );
      $("walk-code").textContent = b.bookingCode;
      $("walk-receipt").innerHTML = list([
        ["Loại phòng", q.roomTypeName],
        ["Khách", name],
        ["Ngày nhận / trả", date(b.checkIn) + " – " + date(b.checkOut)],
        ["Số khách", b.guestCount],
        ["Tổng tiền đã lưu", money(b.totalAmount)],
        ["Trạng thái", labels[b.status]],
        ["Email do khách cung cấp", email || "Không cung cấp"],
      ]);
      if (email) {
        $("walk-email-status").textContent =
          p.emailStatus === "SENT"
            ? "Máy chủ xác nhận thư đã được gửi cho dịch vụ email."
            : p.emailStatus === "FAILED"
              ? "Booking đã tạo, nhưng gửi email chưa thành công."
              : "Chưa có xác nhận gửi email cho booking này.";
      } else
        $("walk-email-status").textContent =
          "Khách không cung cấp email. Bạn lưu hoặc ghi lại mã booking cho khách.";
      $("walk-checkin").href =
        "/?" + new URLSearchParams({ bookingCode: b.bookingCode });
      $("walk-success").hidden = false;
      $("walk-details").hidden = true;
      $("walk-results").innerHTML = "";
      $("walk-search-form").hidden = true;
      state.walkQuote = null;
      notice("walk-message", "");
      $("walk-success").focus();
    } catch (e) {
      if (e.uncertain || accepted) {
        state.walkUnknown = true;
        notice(
          "walk-message",
          "Chưa xác định booking đã được tạo hay chưa. Hãy đối chiếu danh sách booking trước khi gửi lại để tránh tạo trùng.",
          "warning",
        );
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn secondary staff-error-link";
        button.textContent = "Đã kiểm tra, chưa có booking";
        button.onclick = () => {
          if (
            state.busy ||
            !confirm(
              "Bạn đã kiểm tra và xác nhận yêu cầu trước chưa tạo booking?",
            )
          )
            return;
          state.walkUnknown = false;
          state.walkQuote = null;
          notice(
            "walk-message",
            "Bạn xem lại giá trước khi gửi một yêu cầu mới.",
            "warning",
          );
          refresh();
        };
        $("walk-message").append(button);
      } else operationError("walk-message", e);
    } finally {
      busy(false);
    }
  }
  function tab(name) {
    if (state.busy) return;
    for (const key of ["change", "walk"]) {
      const on = key === name;
      $("tab-" + key).setAttribute("aria-selected", String(on));
      $("tab-" + key).tabIndex = on ? 0 : -1;
      $("panel-" + key).hidden = !on;
    }
  }
  $("find-booking-form").onsubmit = findBooking;
  $("change-form").onsubmit = previewChange;
  $("change-rooms").onclick = loadChangeRooms;
  $("change-save").onclick = saveChange;
  $("change-consent").onchange = refresh;
  for (const name of ["change-in", "change-out", "change-type"])
    $(name).addEventListener("input", () => {
      if (!state.busy && !state.changeUnknown) invalidateChange();
    });
  $("walk-search-form").onsubmit = searchWalk;
  $("walk-form").onsubmit = createWalk;
  $("walk-results").onclick = (e) => {
    const b = e.target.closest("[data-walk-room]");
    if (b && !b.disabled) void quoteWalk(b.dataset.walkRoom);
  };
  $("walk-requote").onclick = () => {
    if (state.walkUnknown) {
      const type = state.walkRooms[0]?.roomTypeId;
      if (type) void quoteWalk(type);
    } else {
      const type = state.walkQuote?.roomTypeId || $("walk-quote").dataset.type;
      if (type) void quoteWalk(type);
    }
  };
  // Keep the chosen type available for another quote, even when the quote is invalidated.
  $("walk-results").addEventListener("click", (e) => {
    const b = e.target.closest("[data-walk-room]");
    if (b) $("walk-quote").dataset.type = b.dataset.walkRoom;
  });
  for (const name of ["walk-in", "walk-out", "walk-guests"])
    $(name).addEventListener("input", () => {
      if (state.busy || state.walkUnknown) return;
      state.walkInput = null;
      state.walkRooms = [];
      $("walk-results").innerHTML = "";
      invalidateWalk();
    });
  $("walk-new").onclick = () => {
    if (state.busy) return;
    state.walkUnknown = false;
    state.walkQuote = null;
    state.walkRooms = [];
    state.walkInput = null;
    $("walk-form").reset();
    $("walk-search-form").reset();
    $("walk-in").value = C.today();
    $("walk-out").value = C.add(C.today(), 1);
    $("walk-success").hidden = true;
    $("walk-search-form").hidden = false;
    $("walk-details").hidden = true;
    $("walk-results").innerHTML = "";
    notice("walk-search-message", "");
    refresh();
  };
  for (const name of ["change", "walk"]) {
    $("tab-" + name).onclick = () => tab(name);
    $("tab-" + name).onkeydown = (e) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const next = ["Home", "ArrowLeft"].includes(e.key) ? "change" : "walk";
        tab(next);
        $("tab-" + next).focus();
      }
    };
  }
  $("walk-in").min = C.today();
  $("walk-in").value = C.today();
  $("walk-out").value = C.add(C.today(), 1);
  const sidebar = $("staff-sidebar");
  function sidebarFocus() {
    const hidden = sidebar.getAttribute("aria-hidden") === "true";
    sidebar.inert = hidden;
    if (!hidden && sidebar.classList.contains("is-open"))
      sidebar.querySelector("a")?.focus();
  }
  sidebarFocus();
  new MutationObserver(sidebarFocus).observe(sidebar, {
    attributes: true,
    attributeFilter: ["aria-hidden"],
  });
  const s = auth();
  if (!s) {
    const current = C.session([sessionStorage, localStorage]);
    if (current)
      gate(
        "Tài khoản " +
          current.user.role +
          " chưa được sử dụng nghiệp vụ nhân viên. Bạn đăng nhập bằng admin hoặc staff nhé.",
      );
    else gate();
  } else {
    $("staff-identity").textContent =
      (s.user.username || "Nhân viên") +
      " · " +
      (s.user.role === "admin" ? "Quản trị viên" : "Nhân viên");
    $("staff-workspace").hidden = false;
    refresh();
  }
})();
