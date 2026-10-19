'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../public/js/identity-parser'),Info=require('../src/guest-info'),Privacy=require('../src/privacy');
test('Identity QR parses known seven-field format without following URLs or guessing unsupported formats',()=>{
 const q=P.qr('012345678901||NGUYỄN VĂN THỬ|29022000|Nam|Địa chỉ thử nghiệm|01012021');assert.equal(q.fields.guestName,'NGUYỄN VĂN THỬ');assert.equal(q.fields.birthDate,'2000-02-29');assert.equal(q.fields.issueDate,'2021-01-01');assert.equal(q.fields.gender,'MALE');assert.equal(q.fields.idNumber,'012345678901');
 for(const x of ['https://example.test','012345678901|old|Name|01012000|Nam|Addr|01012021','012345678901||Name|31022000|Nam|Addr|01012021','012345678901||Name|01012000|Nam|Addr','012345678901||<img src=x>|01012000|Nam|Addr|01012021'])assert.equal(P.qr(x),null);
});
test('Identity OCR handles Vietnamese and bilingual labels and leaves unread data empty',()=>{
 const r=P.ocr('CĂN CƯỚC CÔNG DÂN\nSố: 012345678901\nHọ và tên / Full name:\nNGUYỄN VĂN THỬ\nNgày, tháng, năm sinh / Date of birth: 29/02/2000\nGiới tính / Sex: Nam  Quốc tịch / Nationality: Việt Nam\nQuê quán / Place of origin: Địa chỉ thử\nNơi thường trú / Place of residence: Nhà thử, phố thử\nCó giá trị đến / Date of expiry: 29/02/2040\nNgày cấp / Date of issue: 01/01/2021');
 assert.equal(r.fields.guestName,'NGUYỄN VĂN THỬ');assert.equal(r.fields.birthDate,'2000-02-29');assert.equal(r.fields.gender,'MALE');assert.equal(r.fields.nationality,'Việt Nam');assert.equal(r.fields.guestAddress,'Nhà thử, phố thử');assert.equal(r.fields.issueDate,'2021-01-01');assert.equal(r.fields.expiryDate,'2040-02-29');
 assert.deepEqual(P.ocr('Ảnh mờ không có thông tin').fields,{});assert.equal(P.ocr('Số: 12345678O\nNgày sinh: 31/02/2000').fields.idNumber,undefined);
});
test('Identity parser validates leap days, dates, number length, and conflicting numbers',()=>{
 assert.equal(P.day('29022000'),'2000-02-29');assert.equal(P.day('29/02/2001'),'');assert.equal(P.day('2001-02-29'),'');assert.equal(P.valid('idNumber','012345678901'),true);assert.equal(P.valid('idNumber','123456789'),true);assert.equal(P.valid('idNumber','12345678'),false);assert.equal(P.valid('birthDate','2199-01-01'),false);
 assert.equal(P.ocr('012345678901\n012345678902').fields.idNumber,undefined);
});
test('Identity extra fields validate, remain optional and stay private to guest-authorized views',()=>{
 const person=Info.person({idNumber:'012345678901',hometown:'Quê thử',issueDate:'2021-01-01',expiryDate:'2040-01-01',issuedBy:'Cơ quan thử'});assert.equal(person.hometown,'Quê thử');assert.equal(person.issueDate,'2021-01-01');assert.equal(Info.person({}).issueDate,undefined);
 for(const body of [{issueDate:'2199-01-01'},{expiryDate:'2025-02-30'},{issueDate:'2025-01-01',expiryDate:'2024-01-01'},{hometown:'x'.repeat(501)}])assert.throws(()=>Info.person(body));
 const hidden=Privacy.sanitize(person,{personalAllowed:false});for(const k of ['idNumber','hometown','issueDate','expiryDate','issuedBy'])assert.equal(hidden[k],undefined);assert.equal(Privacy.sanitize(person).idNumber,'••••8901');
});
