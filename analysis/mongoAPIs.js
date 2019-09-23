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
    avg: { type: Number, default: 0 },
    stdev: { type: Number, default: 0 }
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
    // newAccounts: Number,
    totalAccounts: { type: Number, default: 0 },
    // activeAccounts: { type: Number, default: 0 }
    // activeAccounts_1d: Number,
    activeAccounts_1w: { type: Number, default: 0 },
    activeAccounts_2w: { type: Number, default: 0 },
    activeAccounts_1m: { type: Number, default: 0 },
    activeAccounts_6m: { type: Number, default: 0 },
    activeAccounts_1y: { type: Number, default: 0 }

});
BlockAnalysisSchema.index({ number: 1 });

const AccountAnalysisSchema = new mongoose.Schema({
    '1day': { type: Number, default: 0 },
    '1week': { type: Number, default: 0 },
    '2weeks': { type: Number, default: 0 },
    '1month': { type: Number, default: 0 },
    '6months': { type: Number, default: 0 },
    '1year': { type: Number, default: 0 },
    'others': { type: Number, default: 0 }
});
AccountAnalysisSchema.index({ number: 1 });

var Blocks = mongoose.model('Blocks', BlockSchema);
var Accounts = mongoose.model('Accounts', AccountSchema);
var Accounts_0 = mongoose.model('Accounts_0', AccountSchema);
var Accounts_3ms = mongoose.model('Accounts_3ms', AccountSchema);
var Accounts_5ms = mongoose.model('Accounts_5ms', AccountSchema);
var Accounts_7ms = mongoose.model('Accounts_7ms', AccountSchema);
var ActiveAccounts = mongoose.model('ActiveAccounts', ActiveAccountSchema);
var ActiveAccounts_7m_1w = mongoose.model('ActiveAccounts_7m_1w', ActiveAccountSchema);
var Transactions = mongoose.model('Transactions_7m', TransactionSchema);
var BlockAnalysis = mongoose.model('BlockAnalysis', BlockAnalysisSchema);
var BlockAnalysis_7m = mongoose.model('BlockAnalysis_7m', BlockAnalysisSchema);
// var BlockAnalysis_1w = mongoose.model('BlockAnalysis_1w', BlockAnalysisSchema);
// var BlockAnalysis_1m = mongoose.model('BlockAnalysis_1m', BlockAnalysisSchema);
var AccountAnalysis = mongoose.model('AccountAnalysis', AccountAnalysisSchema);

module.exports = { Blocks, Accounts, Accounts_0, Accounts_3ms, Accounts_5ms, Accounts_7ms, ActiveAccounts, ActiveAccounts_7m_1w, Transactions, BlockAnalysis, BlockAnalysis_7m, AccountAnalysis };
