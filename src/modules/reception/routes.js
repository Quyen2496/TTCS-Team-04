const express=require("express"); const c=require("./controller"); const router=express.Router();
router.post("/checkins",c.createCheckIn); router.get("/checkins",c.listCheckIns); router.get("/checkins/:id",c.getCheckIn); router.patch("/checkins/:id/:action",c.action); module.exports=router;
