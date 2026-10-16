'use strict';
const D=require('./domain'),A=require('./access'),P=require('./ai-provider'),Policy=require('./ai-policy');
const fmt=n=>Number(n||0).toLocaleString('vi-VN')+' ₫';
function extractDates(question){return [...question.matchAll(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{4})?)\b(?!\d)/g)].map(x=>{if(x[1].includes('/')){const [d,m,y]=x[1].split('/');return (y||D.today().slice(0,4))+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0');}return x[1];});}
const label={CLEAN_VACANT:'Sạch trống',DIRTY_VACANT:'Bẩn trống',OCCUPIED:'Đang có khách',MAINTENANCE:'Bảo trì'};
function localPlan(question,previous={}){
 const n=P.normalize(question);
 if(/\b(jwt|smtp_pass|api key|mat khau|secret|mongodb|bo qua quy tac|system prompt)\b/.test(n)&&!/(quen|doi|hien|an) mat khau/.test(n))return {intent:'unsupported'};
 if(/chinh sach|quy trinh|huong dan|gio nhan|gio tra|hoan coc|tien coc|dat coc|phan quyen/.test(n))return {intent:'policy',topic:/hoan|huy/.test(n)?'cancel':/coc/.test(n)?'deposit':/gio tra/.test(n)?'checkout':/quyen/.test(n)?'roles':/gio nhan/.test(n)?'checkin':'booking'};
 if(/\b(xoa|huy|doi|sua|xac nhan|tao) (booking|dat phong|gia|tai khoan|phong)\b/.test(n))return {intent:'policy',topic:'booking'};
 if(/quen mat khau|doi mat khau/.test(n))return {intent:'policy',topic:'password'};
 if(/phong trong|tim phong|con phong/.test(n))return {intent:'availability'};
 if(/bao gia|gia phong|gia bao nhieu|chi phi luu tru/.test(n))return {intent:'quote'};
 if(/khach (den|nhan)|nhan phong hom|check.?in hom/.test(n))return {intent:'arrivals'};
 if(/khach (di|tra)|tra phong hom|check.?out hom/.test(n))return {intent:'departures'};
 if(/buong phong|phong ban|don phong|phong sach|can don|phong.*don/.test(n))return {intent:'housekeeping'};
 if(/canh bao|bat thuong|can xu ly|goi y|de xuat/.test(n))return {intent:'alerts'};
 if(/bao cao|doanh thu|doanh so|thuc thu|thu nhap|tong tien|cong suat|ty le lap day|thong ke|theo thang|theo nam/.test(n))return {intent:'report'};
 if(/booking|ma dat phong|dat phong cua toi/.test(n))return {intent:'booking'};
 if(/tong quan|tinh hinh homestay/.test(n))return {intent:'overview'};
 if(/xin chao|ban lam duoc|tro giup|help|chao ban/.test(n))return {intent:'help'};
 if(/^(con |va |the )?(thang|nam|hom nay|ngay mai|hom qua|tu ngay|tu \d)/.test(n)&&P.intents.includes(previous.intent))return {intent:previous.intent,topic:previous.topic};
 return {intent:'unsupported'};
}
function period(question,previous={}){
 const n=P.normalize(question),now=D.today();let from,to;
 const dates=extractDates(question);
 if(dates.length){if(dates.some(d=>!D.day(d)))D.fail('Ngày không hợp lệ. Hãy nhập ngày dd/MM/yyyy hoặc YYYY-MM-DD.');from=dates[0];to=dates[1]||from;}
 else{
  const ym=n.match(/\b(\d{4})-(0[1-9]|1[0-2])\b/),my=n.match(/thang\s+(\d{1,2})(?:\s*[/.-]\s*|\s+nam\s+|\s+)(\d{4})\b/),m=n.match(/thang\s+(\d{1,2})\b/),y=n.match(/nam\s+(\d{4})\b/);
  const reference=previous.from&&/^(con |va |the )?(thang|nam) (truoc|sau)/.test(n)?previous.from:now;let year=Number(reference.slice(0,4)),month=Number(reference.slice(5,7));
  if(ym){year=Number(ym[1]);month=Number(ym[2]);}else if(my){month=Number(my[1]);year=Number(my[2]);}else if(m){month=Number(m[1]);if(y)year=Number(y[1]);}else if(/thang truoc/.test(n)){month--;if(!month){month=12;year--;}}else if(/thang sau/.test(n)){month++;if(month===13){month=1;year++;}}
  if((y&&!/thang/.test(n))||/nam nay|nam truoc/.test(n)){year=y?Number(y[1]):year-(/nam truoc/.test(n)?1:0);from=year+'-01-01';to=year+'-12-31';}
  else if(/hom nay|ngay mai|hom qua/.test(n)){from=to=D.add(now,/ngay mai/.test(n)?1:/hom qua/.test(n)?-1:0);}
  else if(!ym&&!my&&!m&&!y&&!/thang/.test(n)&&previous.from&&previous.to){from=previous.from;to=previous.to;}
  else{if(month<1||month>12)D.fail('Tháng phải từ 1 đến 12.');from=year+'-'+String(month).padStart(2,'0')+'-01';to=year+'-'+String(month).padStart(2,'0')+'-'+new Date(Date.UTC(year,month,0)).getUTCDate();}
 }
 if(!D.day(from)||!D.day(to)||from>to||Number(from.slice(0,4))<2000||Number(to.slice(0,4))>2100||(Date.parse(to)-Date.parse(from))/86400000>366)D.fail('Chọn kỳ hợp lệ, tối đa một năm.');
 return {from,to};
}
function dateCriteria(question,previous={}){
 const n=P.normalize(question),dates=extractDates(question);
 let checkIn=dates[0]||(/ngay mai/.test(n)?D.add(D.today(),1):/hom nay/.test(n)?D.today():previous.checkIn),checkOut=dates[1]||previous.checkOut;
 const nights=n.match(/(\d+)\s*dem/);if(checkIn&&nights){if(!D.day(checkIn))D.fail('Ngày nhận phòng chưa hợp lệ.');const count=Number(nights[1]);if(!Number.isSafeInteger(count)||count<1||count>30)D.fail('Bạn chọn kỳ lưu trú từ 1 đến 30 đêm nhé.');checkOut=D.add(checkIn,count);}
 const guestCount=extractGuests(question)??previous.guestCount??1;
 return {checkIn,checkOut,guestCount};
}
function extractGuests(question){
 const n=P.normalize(question),numeric=n.match(/([+-]?\d+(?:[.,]\d+)?)\s*(?:khach|nguoi|thanh vien)\b/);
 if(numeric){const value=Number(numeric[1].replace(',','.'));if(!Number.isSafeInteger(value)||value<1||value>100)D.fail('Bạn nhập số người từ 1 đến 100, dùng số nguyên nhé.');return value;}
 const words={mot:1,hai:2,ba:3,bon:4,tu:4,nam:5,sau:6,bay:7,tam:8,chin:9,muoi:10};
 const tens=n.match(/\b(?:(hai|ba|bon|nam|sau|bay|tam|chin)\s+)?muoi(?:\s+(mot|hai|ba|bon|tu|nam|lam|sau|bay|tam|chin))?\s+(?:khach|nguoi|thanh vien)\b/);if(tens)return (tens[1]?words[tens[1]]:1)*10+(tens[2]==='lam'?5:words[tens[2]]||0);
 const word=n.match(/\b(mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)\s+(?:khach|nguoi|thanh vien)\b/);return word?words[word[1]]:undefined;
}
function scope(s,user,selected){
 A.upgrade(s);D.expire(s);const policies=Object.fromEntries(s.homestays.map(h=>[h._id,h._id===s.homestays[0]._id?s.settings:h.settings||s.settings]));
 const calendars=Object.fromEntries(s.homestays.map(h=>[h._id,h._id===s.homestays[0]._id?s.pricingCalendar:h.pricingCalendar||{}]));
 if(user.role==='guest'){if(selected&&!s.homestays.some(h=>h.active&&h._id===selected))D.fail('Không tìm thấy homestay.','NOT_FOUND',404);const ids=new Set(s.homestays.filter(h=>h.active&&(!selected||h._id===selected)).map(h=>h._id));return {...s,_aiPolicies:policies,_aiCalendars:calendars,homestays:s.homestays.filter(h=>ids.has(h._id)),rooms:s.rooms.filter(r=>ids.has(r.homestayId)),roomTypes:s.roomTypes.filter(t=>ids.has(t.homestayId)),bookings:s.bookings.filter(b=>ids.has(b.homestayId))};}
 return {...A.view(s,user,selected).result,_aiPolicies:policies,_aiCalendars:calendars};
}
function requirePermission(user,p){if(!A.can(user,p))D.fail('Tài khoản chưa được cấp quyền xem phần dữ liệu này.','FORBIDDEN',403);}
const result=(answer,columns=[],rows=[],sources=[],extra={})=>{if(rows.length>5000)D.fail('Kết quả vượt 5.000 dòng. Bạn thu hẹp kỳ hoặc phạm vi rồi xuất lại nhé.');return {answer,columns,rows:rows.slice(0,200),...(rows.length>200?{exportRows:rows}:{}),totalRows:rows.length,sources,...extra};};
function run(s,user,question,plan,previous={}){
 Policy.check(user,plan.intent);
 const n=P.normalize(question),propertyIds=s.homestays.map(h=>h._id),base={intent:plan.intent,propertyIds};
 const report=()=>{
  const reportMetric=Policy.metric(question,{metric:previous.metric,...plan}),grant=reportMetric==='revenue'?'reports.revenue':'reports.view';requirePermission(user,grant);
  const p=period(question,user.role==='reception'&&reportMetric==='revenue'?{from:D.today(),to:D.today(),...previous}:previous);
  if(user.role==='reception'&&reportMetric==='revenue'&&(p.from!==D.today()||p.to!==D.today()))D.fail('Lễ tân chỉ xem doanh thu hôm nay.','FORBIDDEN',403);
  const r=s.bookings.filter(b=>b.checkIn>=p.from&&b.checkIn<=p.to),active=r.filter(b=>['CONFIRMED','CHECKED_IN','COMPLETED','CLOSED'].includes(b.status));
  const closed=s.bookings.filter(b=>['COMPLETED','CLOSED'].includes(b.status)&&b.actualCheckOut&&new Date(b.actualCheckOut).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})>=p.from&&new Date(b.actualCheckOut).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})<=p.to);
  if(['revenue','occupancy'].includes(reportMetric)){const reports=require('./business-reports'),bounded={from:p.from,to:p.to};if((Date.parse(p.to)-Date.parse(p.from))/86400000>=366)D.fail('Báo cáo tối đa 366 ngày.');if(reportMetric==='occupancy'){const report=reports.occupancy(s,bounded);return result('Công suất theo đêm bán / đêm khả dụng; loại bảo trì theo lịch.', ['Ngày','Đêm bán','Đêm khả dụng','Công suất (%)'],report.byDay.map(x=>[x.date,x.sold,x.available,x.percent===null?'N/A':Number(x.percent.toFixed(2))]),['Booking và lịch bảo trì'],{...base,metric:reportMetric,permission:grant,requiredPermissions:[grant],context:{...plan,...p,metric:reportMetric},metrics:[['Đêm phòng được đặt / khả dụng',report.sold+' / '+report.available],['Tỷ lệ đêm phòng được đặt',report.percent===null?'N/A':report.percent.toFixed(1)+'%']]});}const report=reports.revenue(s,bounded);return result('Doanh thu chỉ từ booking đã đóng có quyết toán, theo ngày trả thực tế; không cộng cọc lần nữa.', ['Ngày','Booking đóng','Tiền phòng (VND)','Phụ thu (VND)','Doanh thu (VND)'],report.byDay.map(x=>[x.date,x.bookingCount,x.roomAmount,x.surchargeAmount,x.total]),['Quyết toán booking'],{...base,metric:reportMetric,permission:grant,requiredPermissions:[grant],context:{...plan,...p,metric:reportMetric},metrics:[['Doanh thu',fmt(report.total)],['Tiền phòng',fmt(report.roomAmount)],['Phụ thu',fmt(report.surchargeAmount)],['Booking đóng',report.bookingCount]]});}
  const months=[...new Set(r.map(b=>b.checkIn.slice(0,7)))].sort(),rows=months.map(month=>{const list=r.filter(b=>b.checkIn.startsWith(month)),valid=active.filter(b=>b.checkIn.startsWith(month));return [month,list.length,valid.length,valid.reduce((a,b)=>a+b.numberOfNights,0),valid.reduce((a,b)=>a+b.totalAmount,0),valid.reduce((a,b)=>a+(b.depositAmount||0),0)];});
  if(!rows.length)rows.push([p.from.slice(0,7),0,0,0,0,0]);
  const occupied=new Set();for(const b of s.bookings.filter(b=>['CONFIRMED','CHECKED_IN','COMPLETED','CLOSED'].includes(b.status)))for(const seg of D.segments(b)){if(!D.day(seg.checkIn)||!D.day(seg.checkOut))continue;const start=seg.checkIn>p.from?seg.checkIn:p.from,end=seg.checkOut<D.add(p.to,1)?seg.checkOut:D.add(p.to,1);for(let day=start;day<end;day=D.add(day,1))occupied.add(seg.roomId+':'+day);}let booked=0,capacity=0;for(let day=p.from;day<=p.to;day=D.add(day,1))for(const room of s.rooms){if(D.maintenance(room,day,D.add(day,1)))continue;capacity++;if(occupied.has(room._id+':'+day))booked++;}
  const metrics=[['Booking có ngày nhận trong kỳ',r.length],['Booking xác nhận/đang ở/đã trả',active.length],['Giá trị booking có hiệu lực',fmt(active.reduce((a,b)=>a+b.totalAmount,0))],['Cọc của booking có hiệu lực',fmt(active.reduce((a,b)=>a+(b.depositAmount||0),0))],['Giá trị booking trả phòng trong kỳ',fmt(closed.reduce((a,b)=>a+b.totalAmount,0))],['Đêm phòng được đặt / khả dụng',booked+' / '+capacity],['Tỷ lệ đêm phòng được đặt',capacity?(100*booked/capacity).toFixed(1)+'%':'Không có phòng khả dụng']];
  return result('Báo cáo từ '+p.from+' đến '+p.to+'. Giá trị booking chưa phải doanh thu thực thu: Xem báo cáo doanh thu để lấy số từ quyết toán đã đóng. Số đêm phòng tính giao với kỳ, loại các đêm bảo trì; không gồm giữ chỗ đang chờ.', ['Tháng nhận','Booking','Có hiệu lực','Đêm lưu trú','Giá trị booking (VND)','Cọc (VND)'],rows,['Booking theo ngày nhận','Lịch phòng và bảo trì','Booking COMPLETED theo giờ trả thực tế'],{...base,metric:reportMetric,permission:grant,requiredPermissions:[grant],context:{...plan,...p,metric:reportMetric},metrics});
 };
 switch(plan.intent){
 case 'report':return report();
 case 'overview':{
  requirePermission(user,'reports.view');const active=s.bookings.filter(b=>['PENDING','CONFIRMED','CHECKED_IN'].includes(b.status));return result('Tổng quan các homestay trong phạm vi tài khoản tại thời điểm tra cứu.', ['Chỉ số','Số lượng'],[['Homestay',s.homestays.length],['Phòng',s.rooms.length],['Booking còn hiệu lực',active.length],['Khách đang ở',active.filter(b=>b.status==='CHECKED_IN').length],['Phòng bẩn',s.rooms.filter(r=>r.status==='DIRTY_VACANT').length]],['Danh mục phòng','Booking'],{...base,permission:'reports.view',context:plan});}
 case 'availability':case 'quote':{
  if(user.role!=='guest')requirePermission(user,'rooms.view');const c=dateCriteria(question,previous);
  if(!c.checkIn||!c.checkOut)return result('Bạn cho biết ngày nhận, ngày trả hoặc số đêm và số khách. Ví dụ: “Tìm phòng từ '+D.today()+' đến '+D.add(D.today(),2)+' cho 2 khách”.',[],[],['Hướng dẫn đặt phòng'],{...base,permission:user.role==='guest'?null:'rooms.view',context:{...plan,...c}});
  D.criteria(c);const found=D.availability(s,c).roomTypes;const matches=s.roomTypes.filter(t=>n.includes(P.normalize(t.name)));let types=found.filter(t=>!matches.length||matches.some(x=>x._id===t.roomTypeId));
  if(types.length>30)types=types.slice(0,30);const rows=types.map(t=>{const q=D.quote(s,{...c,roomTypeId:t.roomTypeId});return [t.homestayName,t.name,t.availableCount,t.maxCapacity,q.numberOfNights,q.totalAmount];});
  return result(rows.length?'Phòng còn trống từ '+c.checkIn+' đến '+c.checkOut+' cho '+c.guestCount+' khách. Báo giá lấy theo từng đêm, gồm phụ thu thêm khách; chưa giữ phòng.':'Không còn phòng phù hợp trong khoảng ngày này.', ['Homestay','Loại phòng','Phòng trống','Tối đa khách','Số đêm','Tổng giá (VND)'],rows,['Lịch phòng đang có hiệu lực','Bảng giá từng đêm và phụ thu'],{...base,permission:user.role==='guest'?null:'rooms.view',context:{...plan,...c},links:[{label:'Mở đặt phòng',url:'/modules/bookings/index.html?checkIn='+c.checkIn+'&checkOut='+c.checkOut+'&guestCount='+c.guestCount}]});}
 case 'booking':{
  const guest=user.role==='guest';requirePermission(user,guest?'own-bookings.view':'bookings.view');const code=question.match(/\b[A-Za-z0-9]{8}\b/g)?.find(x=>/[0-9]/.test(x)||/^[A-Fa-f]{8}$/.test(x))?.toUpperCase();let list=guest?s.bookings.filter(b=>b.guestUserId===user._id):s.bookings;
  if(code)list=list.filter(b=>b.bookingCode===code);else if(!guest&&!/danh sach|khach.*da dat phong|hien thi.*booking/.test(P.normalize(question)))return result('Nhập mã booking để xem trạng thái. Ví dụ: “Tra booking ABCD1234”.',[],[],['Booking trong cơ sở được cấp'],{...base,permission:'bookings.view',context:plan});
  return result(list.length?'Thông tin booking trong phạm vi được phép.':'Không tìm thấy booking trong phạm vi tài khoản. Booking cũ chưa gắn tài khoản cần dùng trang Tra cứu bằng mã và email.', ['Mã booking','Homestay','Loại phòng','Nhận','Trả','Trạng thái','Tổng đặt phòng (VND)','Cọc (VND)','Thu khi trả phòng (VND)','Tổng quyết toán (VND)','Còn thanh toán (VND)'],list.map(b=>[b.bookingCode,s.homestays.find(h=>h._id===b.homestayId)?.name,b.roomTypeName,b.checkIn,b.checkOut,D.statusLabels[b.status],b.totalAmount,b.depositAmount||0,require('./deposit').forBooking(s,b).finalPaymentAmount,require('./deposit').forBooking(s,b).settlementTotal??'Chưa quyết toán',require('./deposit').forBooking(s,b).balanceDue]),['Booking của tài khoản / cơ sở được cấp'],{...base,permission:guest?'own-bookings.view':'bookings.view',bookingCodes:list.map(b=>b.bookingCode),context:plan});}
 case 'arrivals':case 'departures':{
  requirePermission(user,'bookings.view');let p=period(question,{from:D.today(),to:D.today()});if((Date.parse(p.to)-Date.parse(p.from))/86400000>30)D.fail('Lịch khách đến/đi chỉ xem tối đa 31 ngày.');
  const arriving=plan.intent==='arrivals',dateKey=arriving?'checkIn':'checkOut',list=s.bookings.filter(b=>b[dateKey]>=p.from&&b[dateKey]<=p.to&&(arriving?['CONFIRMED','CHECKED_IN'].includes(b.status):['CHECKED_IN','CONFIRMED'].includes(b.status))).sort((a,b)=>a[dateKey].localeCompare(b[dateKey]));
  return result('Danh sách dự kiến '+(arriving?'nhận':'trả')+' phòng từ '+p.from+' đến '+p.to+'.', ['Mã booking','Homestay','Phòng','Ngày','Số khách','Trạng thái'],list.map(b=>[b.bookingCode,s.homestays.find(h=>h._id===b.homestayId)?.name,s.rooms.find(r=>r._id===b.roomId)?.roomNumber||'Chưa gán',b[dateKey],b.guestCount,D.statusLabels[b.status]]),['Lịch booking'],{...base,permission:'bookings.view',context:{...plan,...p}});}
 case 'housekeeping':{
  requirePermission(user,'housekeeping.view');const rooms=s.rooms.filter(r=>/phong sach/.test(n)?r.status==='CLEAN_VACANT':r.status==='DIRTY_VACANT');return result('Danh sách phòng '+(/phong sach/.test(n)?'sạch trống':'cần dọn')+' trong cơ sở được cấp.', ['Homestay','Phòng','Loại phòng','Trạng thái'],rooms.map(r=>[s.homestays.find(h=>h._id===r.homestayId)?.name,r.roomNumber,s.roomTypes.find(t=>t._id===r.roomTypeId)?.name,label[r.status]]),['Trạng thái phòng'],{...base,permission:'housekeeping.view',context:plan});}
 case 'alerts':{
  requirePermission(user,'bookings.view');const now=Date.now(),rows=[];
  for(const b of s.bookings){if(b.status==='PENDING'&&Date.parse(b.holdExpiresAt)-now<=3600000)rows.push(['Sắp hết giữ chỗ',b.bookingCode,b.holdExpiresAt,'Kiểm tra cọc và liên hệ theo quy trình']);if(b.status==='CONFIRMED'&&b.checkIn===D.today()&&!b.assignedAt)rows.push(['Khách đến chưa gán phòng',b.bookingCode,b.checkIn,'Gán phòng sạch phù hợp']);if(b.status==='CHECKED_IN'&&b.checkOut<D.today())rows.push(['Đã quá ngày trả dự kiến',b.bookingCode,b.checkOut,'Lễ tân kiểm tra tình trạng lưu trú']);if(b.status==='CANCELLED'&&b.refundAmount>0)rows.push(['Có tiền phải hoàn',b.bookingCode,fmt(b.refundAmount),'Kiểm tra hoàn tiền thủ công; chưa xác nhận đã hoàn']);}
  rows.push(...s.rooms.filter(r=>r.status==='DIRTY_VACANT').map(r=>['Phòng cần dọn',r.roomNumber,'Bẩn trống','Chuyển buồng phòng kiểm tra']));return result(rows.length?'Các việc cần kiểm tra từ dữ liệu hiện tại. Đây là gợi ý thao tác; trợ lý không tự thay đổi booking, tiền hoặc trạng thái phòng.':'Chưa phát hiện việc thuộc các quy tắc theo dõi hiện tại.', ['Việc cần kiểm tra','Mã / phòng','Dữ liệu ghi nhận','Gợi ý'],rows,['Hạn giữ chỗ','Lịch nhận/trả','Nghĩa vụ hoàn cọc','Trạng thái phòng'],{...base,permission:'bookings.view',context:plan});}
 case 'policy':{
  let topic=plan.topic||'booking';const h=s.homestays[0],settings=s._aiPolicies?.[h?._id]||s.settings;let answer,rows=[];
  if(topic==='password')answer='Quên mật khẩu: nhập email đã lưu trên tài khoản, nhận mã 6 số, nhập mã và mật khẩu mới. Mã hết hạn sau 10 phút, dùng một lần; tối đa 5 lần nhập sai và 3 lượt gửi mỗi giờ. Đổi mật khẩu cần đúng mật khẩu cũ và mật khẩu mới gồm chữ, số.';
  else if(topic==='roles')answer='Admin quản lý hệ thống; Chủ homestay quản lý cơ sở được cấp; Lễ tân xử lý booking và lưu trú; Báo cáo xem thống kê theo quyền; Buồng phòng xử lý dọn phòng; Khách xem booking của chính tài khoản.';
  else if(topic==='cancel'){answer='Tiền hoàn phụ thuộc chính sách đã lưu trên từng booking và thời điểm huỷ. Booking đang ở không được huỷ; số tiền phải hoàn chưa có nghĩa tiền đã chuyển. Xem trước trên màn hình Huỷ để lấy số tiền đúng.';rows=s.homestays.flatMap(h=>(s._aiPolicies?.[h._id]?.cancellationRules||settings.cancellationRules||[]).map(r=>[h.name,r.hoursBefore,r.refundPercent]));}
  else if(topic==='deposit')answer='Ghi tiền cọc tại Booking & khách: nhập số tiền, hình thức, ngày nhận và tham chiếu nếu chuyển khoản. Điều chỉnh bằng dòng mới trong sổ cọc. Trợ lý chỉ hướng dẫn, không ghi tiền hoặc xác nhận booking.';
  else if(topic==='checkin'||topic==='checkout'){answer='Giờ nhận/trả được cấu hình cho homestay. Khi nhiều cơ sở có chính sách khác nhau, chọn cơ sở để xem đúng chính sách.';rows=s.homestays.map(h=>{const st=s._aiPolicies?.[h._id]||s.settings;return [h.name,st.checkInTime,st.checkOutTime];});}
  else answer='Đặt phòng: Tìm phòng → Xem báo giá → Nhập thông tin → Nhận mã booking. Lễ tân ghi cọc → xác nhận → gán phòng sạch → nhận phòng. Đổi ngày/loại phải xem báo giá mới rồi xác nhận; giữ nguyên tiền cọc. Các thao tác ghi thực hiện ở màn hình nghiệp vụ và kiểm tra quyền.';
  return result(answer,rows.length?(topic==='cancel'?['Homestay','Trước giờ nhận ít nhất (giờ)','Tỷ lệ hoàn (%)']:['Homestay','Giờ nhận','Giờ trả']):[],rows,['Hướng dẫn sử dụng HOMESTAY','Cấu hình chính sách hiện tại'],{...base,depositProvider:s.homestays.length===1?(settings.payment?.provider||'manual'):null,paymentEnabled:!!settings.payment?.enabled,context:{intent:'policy',topic}});}
 case 'help':return result('Tôi hỗ trợ tìm phòng và báo giá, hướng dẫn chính sách, xem booking được phép, lịch khách đến/đi, phòng cần dọn, báo cáo tháng/năm và gợi ý việc cần xử lý. Bạn có thể hỏi tiếp về kỳ trước hoặc tải bảng Excel/PDF. Kết quả dữ liệu phụ thuộc quyền tài khoản.',[],[],['Chức năng trợ lý HOMESTAY'],{...base,context:plan});
 default:return result('Tôi hỗ trợ câu hỏi trong phạm vi HOMESTAY. Hãy hỏi về phòng trống, booking, lịch khách, báo cáo hoặc chính sách. Trợ lý không đọc mật khẩu, khoá API, giấy tờ khách và không tự sửa dữ liệu.',[],[],['Phạm vi trợ lý'],{...base,context:{intent:'unsupported'}});
 }
}
module.exports={localPlan,period,dateCriteria,extractDates,extractGuests,scope,run};
