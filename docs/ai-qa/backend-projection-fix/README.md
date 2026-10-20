# Sửa lỗi MongoDB nested projection — 19/10/2026

**Cập nhật hiệu năng 20/10:** [Bản đo và sửa tiếp trên máy thật](../../performance/live-20261020/README.md) giữ bản sửa projection dưới đây, bổ sung profile đọc theo màn hình và kiểm chứng lại Atlas thật.

## Nguyên nhân đã xác nhận

Lỗi là MongoDB `31275 / Cannot use $elemMatch projection on a nested field.`, không phải cluster dừng hoặc mất kết nối. Đã tái hiện trực tiếp trên Atlas cấu hình hiện tại bằng truy vấn chỉ đọc, không chạy `Store.init()`, migration hoặc seed. Xem [stack ban đầu](before.json).

Bốn vị trí cũ trong `src/store.js` dùng toán tử **projection** `$elemMatch` trên `data.users` và `data.aiConversations`, thuộc `readIdentity()` và `mutateConversation()`. Hai mảng nằm dưới document `data`, nên MongoDB không chấp nhận projection này. `$elemMatch` trong điều kiện tìm kiếm có ý nghĩa khác; không thay các điều kiện tìm kiếm hợp lệ. Rà soát mã ứng dụng không thấy vị trí `$elemMatch` khác ngoài bốn projection này.

Đường đi: frontend admin gọi `GET /api/auth/me` đầu tiên → `requireRole()` xác minh JWT → `Store.readIdentity(token.sub)` → `collection.findOne()` với projection không hợp lệ → MongoDB 31275 → HTTP 500. Các route có cùng middleware, gồm `GET /api/admin/state`, `GET /api/ai/sessions`, `POST /api/ai/chat`, cũng bị chặn trước khi chạy handler. Sau khi sửa nhận diện, projection tương tự trong đọc/ghi hội thoại cũng phải được sửa để tránh lỗi tiếp theo.

[Request và stack trước sửa](request-stack-before.json) đối chiếu `X-Request-Id` với stack có `LegacyProjectionStore.readIdentity` và `server.js` tại middleware. **Đây là HTTP listener chẩn đoán cô lập dùng secret/JWT tổng hợp, kết nối Atlas thật; không phải kiểm thử đăng nhập tài khoản thật hay Network của web cổng 3001.** Request trước sửa trả 500, code 31275, thông báo “Lỗi máy chủ. Vui lòng thử lại.”; chi tiết từng thời gian có trong artifact. Log console người dùng cung cấp trên tiến trình web cũng có cùng lỗi. Log cũ trong Temp không được coi là log của PID do người dùng vừa khởi động.

## Projection trước và sau

Trước:

```js
collection.findOne({_id:'state'}, {projection:{
  'data.users': {$elemMatch:{_id:userId}},
  'data.aiConversations': {$elemMatch:{_id:sessionId,userId}}
}})
```

Sau (rút gọn; xem `identityProjection()` trong `src/store.js`):

```js
collection.aggregate([
  {$match:{_id:'state'}},
  {$project:{
    'data.users': {$slice:[{$filter:{
      input:{$ifNull:['$data.users',[]]}, as:'user',
      cond:{$eq:['$$user._id',{$literal:userId}]}
    }},1]},
    // Hội thoại: $filter theo userId và sessionId rồi $slice tối đa 1.
    // Danh sách: lọc userId rồi $map chỉ _id/userId/title/updatedAt.
  }}
]).next()
```

Giữ dạng mảng và thứ tự, tối đa một tài khoản/một hội thoại chi tiết; không tìm thấy hoặc mảng thiếu/null trả `[]`. `$literal` bảo vệ ID bắt đầu bằng `$` khỏi bị hiểu thành field path. Thiếu document state báo `STATE_NOT_FOUND`, không giả thành dữ liệu thành công rỗng.

Không đưa toàn bộ tài khoản hoặc nội dung hội thoại vào truy vấn nhận diện. Các trường homestay, settings, phiên bản nâng cấp và thông tin ownership booking cần cho lịch sử vẫn được giữ. Tổng quan vẫn đọc dữ liệu nghiệp vụ theo luồng hiện có, không dùng các mảng rỗng của identity làm dữ liệu màn hình. Không thêm fallback đọc toàn bộ state cho xác thực.

Ghi hội thoại vẫn dùng transaction, revision, arrayFilters theo ID/chủ sở hữu; chỉ thay đúng hội thoại. Giới hạn tổng 3.000 hội thoại được tính server-side cùng truy vấn kích thước, vì metadata nay chỉ gồm hội thoại của người đăng nhập. Giữ kiểm tra active, sessionVersion, quyền và phạm vi homestay.

Thêm log lỗi API có request ID, route, method, status và stack frame nội bộ; không ghi header, body, query, URI kết nối hoặc dòng đầu stack có thể chứa bí mật. Response vẫn là thông báo an toàn, không có stack trace. Không sửa `.env`.

## Kiểm chứng

- `npm.cmd test`: **444 ca, 441 đạt, 0 lỗi, 3 bỏ qua**. Trong đó kiểm thử mock mới bắt projection nested `$elemMatch` không hợp lệ; kiểm tra 401/403/404, phạm vi homestay, dữ liệu Tổng quan đầy đủ và không đọc full state ở `/api/auth/me`; kiểm tra giới hạn hội thoại và log không lộ bí mật.
- `HOMESTAY_ATLAS_READONLY_QA=1 node --test test/ai-store-atlas-readonly.test.js`: **9/9 đạt trên Atlas thật**. Query cũ thực sự trả 31275; pipeline mới đọc được tài khoản hiện có và metadata/hội thoại đúng chủ sở hữu; transaction đọc rồi abort. Ca thiếu/rỗng/khác chủ/ID trùng/ID bắt đầu `$` dùng `$replaceWith` trong pipeline chạy trên MongoDB thật, **không insert fixture vào database**. Đây là kiểm chứng truy vấn, không thay thế tài khoản thật trên trình duyệt.
- Kiểm thử thay/xoá hội thoại và giữ nguyên dữ liệu khác dùng fixture mô phỏng. Riêng tạo và gửi một hội thoại kiểm thử đã chạy bằng UI với admin thật: log Node build `82246f2ee0ba42a9`, request ID `6639175a55f84b9eafe045c0`, trả 200; `atlas_conversation_write` 558,24 ms, tổng backend 1.318,93 ms.
- Đã khởi động lại riêng Node PID 20232 → 27304 sau khi xác minh cổng, executable và cwd; [runtime trước](process-before.json), [ghi nhận restart](restart.json). Cloudflare PID 5544 được giữ nguyên.
- [Chrome thật → localhost → Atlas sau restart](live-readiness.json): `/api/health` 200, build `82246f2ee0ba42a9`, chế độ mongo; `/api/ready` ping Atlas trả 200. Trong context ẩn danh riêng, `/api/admin/state` và `/api/ai/sessions` trả 401 đúng thiết kế. Đây không phải bằng chứng Tổng quan đã tải thành công bằng tài khoản admin. Log stderr của PID mới chưa có lỗi projection trong lượt này.

Phiên admin do người dùng tự đăng nhập đã được dùng trên Chrome thật: `/api/auth/me`, `/api/admin/homestays`, `/api/admin/permissions`, `/api/admin/state` đều trả 200; Tổng quan và bảng Phòng đã render. Lượt xác nhận Tổng quan sau cùng ghi nhận lần lượt 387 ms, 13.611 ms, 325 ms và 26.765 ms trong Resource Timing. Độ trễ đọc nghiệp vụ còn đáng kể; không coi HTTP 200 là bằng chứng web đã nhanh.

Bộ thu Network của lượt đầu bị gián đoạn trước khi ghi artifact cuối. Lượt xác nhận **chỉ đọc** đã hoàn tất và lưu [bằng chứng trình duyệt sau sửa](browser-after.json), dùng lại hội thoại kiểm thử đã có; không gửi thêm câu hỏi hoặc tạo hội thoại mới. Không thu được Network của phiên admin thật trước sửa; HTTP 500 trước sửa trong artifact chẩn đoán là listener cô lập như đã phân biệt ở trên.

Kết quả admin thật của lượt xác nhận cuối:

| Request | HTTP | Thời gian / kết quả |
| --- | --- | --- |
| `GET /api/auth/me` | 200 | 324,7 ms |
| `GET /api/admin/homestays` | 200 | 13.526 ms |
| `GET /api/admin/permissions` | 200 | 327,1 ms |
| `GET /api/admin/state` | 200 | 26.996,1 ms; Tổng quan render, không có lỗi trang |
| `POST /api/ai/chat` | 200 | 1.318,93 ms **backend**, đối chiếu request ID với log của Node build mới |
| `GET /api/ai/status` sau reload | 200 | 13.561,8 ms |
| `GET /api/ai/sessions` sau reload | 200 | 651,5 ms |
| `GET /api/ai/sessions/:id` sau reload | 200 | 704,8 ms; đủ 2 tin nhắn, khớp câu trả lời đã lưu và hiển thị trên UI |
| `GET /api/ai/sessions/:id` với ID hội thoại có sẵn của tài khoản khác | 404 | `NOT_FOUND`, không có `messages` |
| `GET /api/admin/state` không có Authorization | 401 | Giữ chặn truy cập chưa đăng nhập |

Thời gian GET trong bảng lấy từ Resource Timing của Chrome, gồm tải response hoàn tất. Thời gian chat là span backend được ghi tại thời điểm gửi câu hỏi ở lượt UI trước; không đánh đồng với tổng thời gian trên trình duyệt. Màn hình Phòng đã qua assertion bảng render ở lượt UI đầu. Lượt xác nhận sau gián đoạn giữ nguyên Node PID 27304/build `82246f2ee0ba42a9`; Cloudflare PID 5544 vẫn hoạt động.

Các ca 401 do tài khoản bị vô hiệu/đổi sessionVersion và 403 do vượt quyền/phạm vi homestay dùng fixture HTTP mô phỏng, không sửa tài khoản thật để kiểm thử. Ca đọc chéo hội thoại 404 ở bảng trên dùng ID có sẵn trên Atlas và phiên admin thật, không phải ID tự bịa hoặc tài khoản giả.

Không sửa booking hoặc dữ liệu nghiệp vụ thật, không push/merge. Browser runner chỉ tạo và gửi một hội thoại kiểm thử theo yêu cầu; không thao tác booking.

Các lệnh tái chạy:

```powershell
npm.cmd test
$env:HOMESTAY_ATLAS_READONLY_QA='1'
node --test test/ai-store-atlas-readonly.test.js
node scripts/qa-backend-projection-before.cjs  # tái hiện truy vấn CŨ, listener cô lập, chỉ đọc
node scripts/qa-backend-projection-browser.cjs # cần cửa sổ Chrome kiểm thử + người dùng tự đăng nhập
node scripts/qa-backend-projection-confirm.cjs # chỉ đọc lại hội thoại QA đã có, xác nhận reload/phân quyền
```

Browser runner dùng playwright-core trong Temp, không thay dependency dự án; không xuất token hoặc response nghiệp vụ vào artifact.
