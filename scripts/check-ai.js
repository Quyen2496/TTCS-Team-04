'use strict';
require('dotenv').config({path:require('node:path').join(__dirname,'..','.env')});
const P=require('../src/ai-provider'),D=require('../src/domain');
(async()=>{
 const c=P.config();
 if(!c.ready){console.log('Chưa bật mô hình AI trong .env. Chạy npm run setup:ai nếu muốn kết nối Groq hoặc Ollama.');process.exitCode=1;return;}
 console.log('Kiểm tra '+c.provider+' / '+c.model+' bằng dữ liệu giả lập; không kết nối database.');
 const result=await P.classify('Gợi ý phòng cho 2 người lớn và 2 trẻ em, ngân sách tối đa 1 triệu mỗi đêm, từ ngày mai trong 2 đêm.');
 if(result.fallback)throw Error('Bước hiểu câu hỏi chưa đạt: '+result.reason+(result.status?' (HTTP '+result.status+')':''));
 if(result.plan.intent!=='recommendation'||result.plan.slots?.adults!==2||result.plan.slots?.children!==2||result.plan.slots?.budget!==1000000)throw Error('Mô hình kết nối được nhưng chưa trích đúng nhu cầu mẫu. Chạy lại hoặc kiểm tra model đang cấu hình.');
 console.log('Đạt: hiểu đúng số người lớn, trẻ em và ngân sách.');
 const facts={PERIOD:{label:'Khoảng ngày báo cáo',value:D.today()},TOTAL:{label:'Doanh thu VND',value:'222.333 ₫'},COUNT:{label:'Số booking đóng',value:'2'},NOTE:{label:'Lưu ý bắt buộc về tiền cọc',value:'Tiền cọc không được cộng thêm lần nữa.'}};
 const prose=await P.compose(facts,'report');
 if(prose.fallback)throw Error('Bước diễn đạt chưa đạt: '+prose.reason+'; hệ thống vẫn dùng câu trả lời nghiệp vụ khi bước này lỗi.');
 if(!prose.answer.includes('222.333 ₫')||!prose.answer.includes(facts.NOTE.value))throw Error('Không bảo toàn được dữ liệu giả lập.');
 console.log('Đạt: mô hình diễn đạt bằng các thông tin do máy chủ cung cấp.');
 console.log('Ví dụ giả lập: '+prose.answer);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
