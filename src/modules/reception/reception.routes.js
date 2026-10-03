const express = require("express");

const router = express.Router();

const {
    getRooms,
    getRoomById,
    updateRoomStatus,
    setMaintenance
} = require("./reception.controller");


router.get("/rooms", getRooms);

router.get("/rooms/:id", getRoomById);

router.patch(
    "/rooms/:id/status",
    updateRoomStatus
);

router.post(
    "/rooms/:id/maintenance",
    setMaintenance
);


module.exports = router;