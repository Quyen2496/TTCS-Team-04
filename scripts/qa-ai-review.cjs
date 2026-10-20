'use strict';
// Additional semantic assertions, reusable on the unchanged baseline artifacts.
const norm=require('../src/ai-provider').normalize;
function review(c,r){
 const a=norm(r.answer||''),checks=[],check=(ok,why)=>checks.push({ok:!!ok,why}),id=c.id.replace('-ANON','');
 if(['A-D01','A-D19','B-D01'].includes(id))check(/tra cuu|bao cao|quyen hien tai/.test(a)&&/chua.*(?:truc tiep|tu.*thay doi)/.test(a),'Giải thích khả năng AI và giới hạn thực thi');
 if(['C-D01','P-D01'].includes(id))check(a.includes('nha nui qa')&&!a.includes('nha bien qa'),'Nêu đúng cơ sở được giao, không chỉ tên vai trò');
 const guides={'K-D20':/huy.*booking|booking.*huy/,'A-D13':/gia & chinh sach/,'A-D15':/lich su email/,'C-D12':/hoa don.*quyet toan|quyet toan.*hoa don/,'C-D13':/dieu chinh.*(?:dong moi|lich su)|dong moi.*so coc/,'L-D09':/han giu cho/,'L-D13':/hoa don/,'P-D06':/buong phong/,'P-D07':/kiem tra thuc te|kiem tra phong thuc te/,'P-D10':/nho.*(?:le tan|chu homestay)|nguoi.*quyen/};
 if(guides[id])check(guides[id].test(a)&&r.intent==='policy','Đúng hướng dẫn nghiệp vụ, không thay bằng tra dữ liệu');
 if(['B-D16','B-D17'].includes(id))check(/quyet toan|da dong/.test(a)&&/coc/.test(a)&&/doanh thu/.test(a),'Giải thích đúng định nghĩa tài chính');
 if(id==='B-D18')check(/khong co giao dich/.test(a)&&/loi.*du lieu|thieu quyen/.test(a),'Phân biệt kỳ rỗng với lỗi hoặc thiếu quyền');
 if(id==='K-D13')check(/booking cua toi|tra cuu booking/.test(a),'Chỉ đường thanh toán khi chưa chọn cơ sở');
 if(['K-D08','L-D07'].includes(id))check(r.rows?.every(row=>row[0]==='Nhà Núi QA'),'Phòng trống chỉ của cơ sở A');
 if(['A-D06','C-D02','B-D03'].includes(id))check(r.metrics?.find(m=>m[0]==='Doanh thu')?.[1]===(id==='A-D06'?'0 ₫':'1.600.000 ₫'),'Doanh thu đúng cơ sở và kỳ, không gộp B');
 if(id==='A-D05')check(r.metrics?.find(m=>m[0]==='Doanh thu')?.[1]==='3.900.000 ₫','Doanh thu toàn hệ thống khớp tổng quyết toán A+B');
 return checks;
}
module.exports={review};
if(require.main===module){const fs=require('node:fs');for(const name of process.argv.slice(2)){const file=require('node:path').resolve('docs/ai-qa',name+'.json'),doc=JSON.parse(fs.readFileSync(file));for(const c of doc.results){c.checks=c.checks.filter(c=>!c.semanticReview).concat(review(c,c.result).map(c=>({...c,semanticReview:true})));if(c.checks.some(c=>!c.ok))c.status='Lỗi';}doc.summary.counts=Object.fromEntries(['Đạt','Lỗi','Chưa hỗ trợ','Chưa chạy'].map(s=>[s,doc.results.filter(c=>c.status===s).length]));fs.writeFileSync(file,JSON.stringify(doc,null,2));console.log(name,doc.summary.counts);}}
