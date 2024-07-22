const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  tests: [
    {
      testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test'
      },
      answers: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          userAnswer: {
            type: String,
            default: null
          }
        }
      ],
      timeStarted: String,
      timeSubmited: String,
      marks: String,
      totalMarks: String
    }
  ],
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' } 
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
