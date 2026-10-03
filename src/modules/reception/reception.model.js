const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        roomNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        floor: {
            type: Number,
            required: true
        },

        roomType: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "empty_clean",
                "empty_dirty",
                "occupied",
                "maintenance"
            ],
            default: "empty_dirty"
        },

        note: {
            type: String,
            default: ""
        },

        maintenance: {
            reason: {
                type: String,
                default: ""
            },

            startDate: {
                type: Date,
                default: null
            },

            endDate: {
                type: Date,
                default: null
            }
        },

        statusHistory: [
            {
                oldStatus: String,
                newStatus: String,
                changedBy: String,
                changedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Room", roomSchema);