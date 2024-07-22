// model/testSchema.js
const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    startsAtTime:{
        type: String,
        required: false,
    },
    startsAtDate:{
        type: String,
        required: false,
    },
    subjects: {
        type: [String],
        required: true,
    },
    status: {
        type: String,
        default: 'inactive',
    },
    questions: [
        {
            image: {
                type: String,
                required: false,
            },
            priority: {
                type: Number,
                required: true,
            },
            questionType: {
                type: String,
                required: true,
            },
            correctAnswer: {
                type: String,
                required: true,
            },
            marks: {
                type: Number,
                required: true,
            },
            negativeMarks: {
                type: Number,
                required: true,
            },
        },
    ],
    givenBy: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            userName: {
                type: String,
                required: true,
            },
            userEmail: {
                type: String,
                required: true,
            },
            timeStarted: String,
            timeSubmited: String,
            marks: String,
            totalMarks: String
        }
    ]
}, {
    timestamps: true,
});

const Test = mongoose.model('Test', testSchema);

module.exports = Test;
