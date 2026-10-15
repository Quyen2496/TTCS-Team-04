(function () {
  "use strict";
  const session = window.T4Staff.session([sessionStorage, localStorage]);
  if (!session || !["admin", "staff"].includes(session.user.role)) return;
  const link = document.querySelector(".staff-link");
  if (link) {
    link.href = "/modules/bookings/staff.html";
    link.textContent = "Booking tại quầy";
  }
})();
