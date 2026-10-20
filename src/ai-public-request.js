'use strict';
// Describe the requested public fields before selecting data or a response.
// This registry keeps current questions separate from remembered room searches.
const normalize=q=>require('./ai-provider').normalize(q);
function resolve(question){
 const q=normalize(question);
 if(/doanh thu|cong suat|bao cao|noi bo|danh sach khach|email khach|so dien thoai khach|(?:ghi|sua|doi|cap nhat).*(?:coc|gia|quyen)|bo qua/.test(q))return null;
 if(/\bbooking\s+(?=[a-z0-9]{0,7}\d)[a-z0-9]{8}\b/.test(q))return null;
 if(/\b(?:hong|hu hong|vo|chay|ro dien|su co|khong hoat dong|khong chay|khong mat)\b/.test(q)&&/phong|dieu hoa|may lanh|thiet bi|tivi|tv|voi nuoc|khoa cua/.test(q))return {intent:'policy',topic:'general',publicInfo:{kind:'stay_support',topics:['incident']},explicitLookup:true};
 const topics=[];
 if((/hoan (?:tien|coc)|chinh sach huy|dieu kien huy/.test(q))&&(/chinh sach|dieu kien|ty le|muc hoan/.test(q)||!/\bai\b|bao lau|khi nao|lien he|nhan o dau|gui cho ai/.test(q)))topics.push('cancellation');
 if(/bua sang|an sang/.test(q)&&!/tim phong|goi y|ngan sach|can phong/.test(q))topics.push('breakfast');
 if(/netflix|youtube|smart ?tv|tv thong minh|tai khoan.*(?:tra phi|premium)/.test(q)&&!/tim phong|goi y|ngan sach/.test(q))topics.push('digital_services');
 if(/apple ?pay|google ?pay|phuong thuc thanh toan|thanh toan bang|chuyen khoan qr|qr code/.test(q)&&!/ghi.*coc|da (?:nhan|chuyen|thanh toan)|booking cua toi/.test(q))topics.push('payment_methods');
 if(topics.length)return {intent:'policy',topic:topics.includes('cancellation')?'cancel':'general',publicInfo:{kind:'services',topics},explicitLookup:true};
 // Complete date ranges must not become a generic need-for-dates prompt.
 if(/con phong|phong trong/.test(q)&&require('./ai-data').extractDates(question).length>=2)return {intent:'availability',explicitLookup:true};
 return null;
}
module.exports={resolve};
