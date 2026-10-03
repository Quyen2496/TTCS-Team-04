const service = require("./service");
const { validateCheckInPayload } = require("./validation");
async function createCheckIn(req,res,next){try{const errors=validateCheckInPayload(req.body);if(errors.length)return res.status(400).json({success:false,message:"Dữ liệu check-in không hợp lệ",errors});const data=await service.createCheckIn(req.body);res.status(201).json({success:true,message:data.status==="checkedIn"?"Đã nhận phòng thành công":"Đã lưu đặt phòng",data});}catch(e){next(e)}}
async function listCheckIns(req,res,next){try{const data=await service.listCheckIns(req.query);res.json({success:true,count:data.length,data});}catch(e){next(e)}}
async function getCheckIn(req,res,next){try{const data=await service.getCheckInById(req.params.id);if(!data)return res.status(404).json({success:false,message:"Không tìm thấy lượt lưu trú"});res.json({success:true,data});}catch(e){next(e)}}
async function action(req,res,next){try{const data=await service.updateStatus(req.params.id,req.params.action);res.json({success:true,message:"Cập nhật trạng thái thành công",data});}catch(e){next(e)}}
module.exports={createCheckIn,listCheckIns,getCheckIn,action};
