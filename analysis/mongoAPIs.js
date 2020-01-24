var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

mongoose.connect('mongodb://localhost/eth-analysis?maxPoolSize=100', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true});

const AccountSchema = new mongoose.Schema({
    address: { type: String, unique: true },
    initialBalance: { type: String, default: "0" },
    activeBlocks: [Number],
    transferringValues: [Object],
    restoreBlocks_1w: [Number],
    restoreBlocks_1m: [Number]
});
AccountSchema.index({ address: 1 });

const TransactionSchema = new mongoose.Schema({
    hash: { type: String, unique: true },
    blockNum: Number,
    transactionIndex: Number,
    from: String,
    to: String,
    value: String,
    nonce: Number
});
TransactionSchema.index({ blockNum: 1, transactionIndex: 1 });

var Accounts = mongoose.model('Accounts', AccountSchema);
var Transactions = mongoose.model('Transactions', TransactionSchema);
var Accounts_ = mongoose.model('Accounts_', AccountSchema);
var Transactions_ = mongoose.model('Transactions_', TransactionSchema);

module.exports = {
    Accounts,
    Transactions,
    Accounts_,
    Transactions_
};