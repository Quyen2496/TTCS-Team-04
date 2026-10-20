'use strict';
function amounts(b,defaultPercent=30){
 const percent=b.settingsSnapshot?.payment?.depositPercent||defaultPercent,requiredDeposit=Math.ceil(b.totalAmount*percent/100),depositAmount=b.depositAmount||0;
 const settled=['CLOSED','COMPLETED'].includes(b.status)&&Number.isSafeInteger(b.settlement?.total)&&b.settlement.total>=0;
 const settlementTotal=settled?b.settlement.total:null;
 // The checkout receipt is also stored in paymentLedger. Choose one source,
 // rather than counting the same payment twice; older snapshots may lack it.
 const receipts=Array.isArray(b.paymentLedger)&&b.paymentLedger.length?b.paymentLedger:[b.settlement?.paid].filter(Boolean);
 const seen=new Set();let finalPaymentAmount=0;
 for(const receipt of receipts){if(receipt._id&&seen.has(receipt._id))continue;if(receipt._id)seen.add(receipt._id);if(Number.isSafeInteger(receipt.amount)&&receipt.amount>=0)finalPaymentAmount+=receipt.amount;}
 const totalPaid=depositAmount+finalPaymentAmount,ended=['CANCELLED','EXPIRED'].includes(b.status);
 return {depositPercent:percent,requiredDeposit,depositAmount,settlementTotal,finalPaymentAmount,totalPaid,amountDue:ended||settled?0:Math.max(0,requiredDeposit-depositAmount),balanceDue:ended?0:Math.max(0,(settlementTotal??b.totalAmount)-totalPaid)};
}
function forBooking(s,b){const h=s.homestays?.find(h=>h._id===b.homestayId),settings=h&&h._id!==s.homestays[0]._id?h.settings:s.settings;return amounts(b,settings?.payment?.depositPercent||30);}
module.exports={amounts,forBooking};
