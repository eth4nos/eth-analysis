// const MongoClient = require('mongodb').MongoClient;
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect('mongodb://localhost/eth-analysis?maxPoolSize=100', { useNewUrlParser: true, useCreateIndex: true });

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
    activeBlocks: [Number],
    avgDistance: { type: Number, default: 0 },
    stdDistance: { type: Number, default: 0 }
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

const BlockAnalysisSchema = new mongoose.Schema({
    number: { type: Number, unique: true },
    totalAccounts: Number,
    activeAccounts_1d: Number,
    activeAccounts_1w: Number,
    activeAccounts_1m: Number,
});
BlockAnalysisSchema.index({ number: 1});

var Blocks = mongoose.model('Blocks', BlockSchema);
<<<<<<< HEAD
var Accounts = mongoose.model('Accounts', AccountSchema);
var Accounts_5ms = mongoose.model('Accounts_5ms', AccountSchema);
=======
var Accounts_7m = mongoose.model('Accounts_7m', AccountSchema);
var Accounts_7_6m = mongoose.model('Accounts_7_6m', AccountSchema);
>>>>>>> 3f5b70dbd410423f283036d3f7acd1c4ddac797d
var ActiveAccounts = mongoose.model('ActiveAccounts', ActiveAccountSchema);
var Transactions = mongoose.model('Transactions_7m', TransactionSchema);
var BlockAnalysis = mongoose.model('BlockAnalysis', BlockAnalysisSchema);

<<<<<<< HEAD
module.exports = { Blocks, Accounts, Accounts_5ms, ActiveAccounts, Transactions, BlockAnalysis };
=======
module.exports = { Blocks, Accounts_7m, Accounts_7_6m, ActiveAccounts, Transactions };
>>>>>>> 3f5b70dbd410423f283036d3f7acd1c4ddac797d
