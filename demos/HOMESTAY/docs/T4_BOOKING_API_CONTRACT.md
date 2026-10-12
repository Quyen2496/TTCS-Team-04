# T4 — hợp đồng Quý/Phú

Đối chiếu public/modules/bookings/js/booking.js. Backend ở bản develop
16aa91dc54061581aa9adba856ac950c9c9018b2 còn thiếu availability/quote.
Tài liệu mô tả hợp đồng cần triển khai, không xác nhận backend đã hoàn thành.

Thành công: {"success":true,"data":...}.
Lỗi: {"success":false,"code":"...","message":"..."}, HTTP phù hợp.
Ngày YYYY-MM-DD; checkOut loại trừ; kỳ ở 1–30 đêm; ngày hiện tại giờ Việt Nam.
roomTypeId: ObjectId hex 24 ký tự. Tiền VND: số nguyên an toàn không âm.

## GET /api/bookings/availability
Query: checkIn, checkOut, guestCount, roomTypeId tùy chọn.
Backend chuyển guestCount từ query string thành số và kiểm tra hợp lệ.
data.roomTypes là mảng; mỗi phần tử có:
roomTypeId, name, standardCapacity, maxCapacity, availableCount, fromPrice.
photo tùy chọn: path, thumbnailPath, alt.
standardCapacity >= 1; maxCapacity >= standardCapacity và đủ số khách;
availableCount >= 1; ID không trùng; phải có phòng dùng được toàn kỳ ở.
Không có phòng: HTTP 200, {"success":true,"data":{"roomTypes":[]}}.

## POST /api/bookings/quote
Body: roomTypeId, checkIn, checkOut, guestCount.
data: roomTypeId, roomTypeName, checkIn, checkOut, guestCount, numberOfNights,
nightlyPrices, roomTotal, extraGuestTotal, totalAmount, settingsSnapshot.
nightlyPrices có đúng một dòng/đêm, thứ tự ngày tăng dần; mỗi dòng có:
night, basePrice, extraGuestCount, extraGuestUnitPrice, surchargeAmount,
lineTotal, priceKind (WEEKDAY/WEEKEND/OVERRIDE), label tiếng Việt.
extraGuestCount = max(0, guestCount - standardCapacity).
surchargeAmount = extraGuestCount * extraGuestUnitPrice.
lineTotal = basePrice + surchargeAmount.
roomTotal = tổng basePrice; extraGuestTotal = tổng surchargeAmount;
totalAmount = roomTotal + extraGuestTotal. Server tự tính từ database.
settingsSnapshot: version nguyên >= 1; checkInTime/checkOutTime dạng HH:mm;
extraGuestPerNight; cancellationRules gồm 1–3 dòng {hoursBefore,refundPercent}.
hoursBefore nguyên >= 0, giảm nghiêm ngặt; refundPercent trong 0–100.

## POST /api/bookings/create
Body: roomTypeId, checkIn, checkOut, guestCount, guestName, phone, email,
notes, policyAccepted=true, expectedTotalAmount, expectedSettingsVersion,
requestKey (32 ký tự hex).
data: bookingCode (8 ký tự A–Z/0–9), roomTypeName, checkInDay, checkOutDay,
numberOfNights, totalAmount, status=PENDING, holdExpiresAt (ISO, tạo + 24 giờ).
Ngày, số đêm và tổng tiền phản hồi phải khớp yêu cầu/báo giá.
Frontend không gửi totalAmount. Không dùng phản hồi cũ {message,booking}.
Backend tự tính và so sánh expectedTotalAmount/expectedSettingsVersion;
kiểm tra khả dụng và giữ room_nights bằng giao dịch phù hợp, lưu snapshot.
Cùng requestKey/cùng body trả cùng booking, không giữ thêm phòng/tăng quota.
Kiểm tra replay trước khi áp dụng giá/chính sách mới; vẫn kiểm tra ràng buộc
và quyền phù hợp. Không tin giá do client gửi.

## Lỗi và kiểm thử
400 VALIDATION_ERROR: giữ form, hiện lỗi.
409 NO_AVAILABILITY/PRICE_CHANGED/POLICY_CHANGED: giữ thông tin khách,
bỏ báo giá cũ, tìm/báo giá lại và chấp nhận chính sách lại.
429 RATE_LIMITED: giữ form; Retry-After dùng số giây.
Lỗi mạng/timeout/500/phản hồi thành công sai định dạng: frontend khóa sửa
thông tin và cho thử lại cùng body/key; không tự retry POST.
Body/key chỉ giữ trong bộ nhớ tab, mất khi reload; không lưu PII localStorage.

Kiểm thử thật: tìm -> báo giá -> đặt -> đối chiếu bookings/room_nights;
giá/chính sách đổi; replay; hai người tranh phòng cuối; quota 5 booking thành
công/giờ/IP; replay không tăng quota; 40 phòng/30 đêm tìm dưới 2 giây theo backlog.
API giả lập chỉ chứng minh frontend. Cần backend/database thật để nghiệm thu.
