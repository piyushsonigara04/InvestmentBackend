const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  stockSymbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  buyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  buyDate: {
    type: Date,
    required: true
  }
});

const closedPositionSchema = new mongoose.Schema({
  stockSymbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  buyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  buyDate: {
    type: Date,
    required: true
  },
  sellPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellDate: {
    type: Date,
    required: true
  }
});

const holdingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  holdings: [stockSchema],
  closedPositions: [closedPositionSchema]
});

const Holdings = mongoose.model("Holdings", holdingsSchema);
const Stock = mongoose.model("Stock", stockSchema);

module.exports = { Holdings, Stock };