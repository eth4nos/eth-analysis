// const MongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect('mongodb://localhost/eth-analysis', { useNewUrlParser: true, useCreateIndex: true });

// const url = 'mongodb://localhost:27017';
// Database Name
// const dbName = 'eth-analysis';
// var client, db;

const BlockSchema = new mongoose.Schema({
    number:{ type: Number, unique: true },
    miner: String,
    from: [String],
    to: [String]
});
BlockSchema.index({ number: 1 });

const AccountSchema = new mongoose.Schema({
    address: { type: String, unique: true },
    activeBlocks: [Number]
});
AccountSchema.index({ address: 1 });

const ActiveAccountSchema = new mongoose.Schema({
    address: { type: String, unique: true },
    restoreBlocks: [Number]
});
ActiveAccountSchema.index({ address: 1});

const TransactionSchema = new mongoose.Schema({
    txhash: { type: String, unique: true },
    blockNum: Number,
    from: String,
    to: String,
    value: String,
    gas: Number,
    gasPrice: String,
    gasUsed: Number,
    nonce: Number,
    transactionIndex: Number
});
TransactionSchema.index({ blockNum: 1, transactionIndex: 1 });

var Blocks = mongoose.model('Blocks', BlockSchema);
var Accounts = mongoose.model('Accounts_7m', AccountSchema);
var ActiveAccounts = mongoose.model('ActiveAccounts', ActiveAccountSchema);
var Transactions = mongoose.model('Transactions_7m', TransactionSchema);

module.exports = { Blocks, Accounts, ActiveAccounts, Transactions };
