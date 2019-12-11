const Web3  = require('web3');
const { Bar, Presets } = require('cli-progress');
const {insertOne, upsert, findOne, setIndex}  = require('./mongoAPIs');

// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
const bar1 = new Bar({}, Presets.shades_classic);

const ACCOUNTS      = 'active_accounts_1m';
const TRANSACTIONS  = 'transactions_1m';

const start = 7000000;
const end   = 8000000;
const epoch  = 172800; // 1 month
// const epoch =  40320 // 1 week
// const epoch = 1024;

class Accounts {
    constructor() {

        this.cachedAccounts = new Set();
    }

    upsert(address, blockNum) {
        return new Promise(async (resolve, reject) => {
            await upsertOne(ACCOUNTS, { address: address }, {
                address: address,
                lastBlockNum: blockNum,
                active: true
            });
            resolve();
        });
    }

    sweep(blockNum) {
        return new Promise(async (resolve, reject) => {
            await updateMany('accounts', { $and: [{ active: true }, { lastBlockNum: { $lt: (blockNum - epoch) }}] }, { $set: { active: false }});
            resolve();
        });
    }
}

var activeAccounts = new Set();
var cachedAccounts = new Set();

(async function() {
    await setIndex(ACCOUNTS, { address: 1 }, { unique: true });

	bar1.start(end, start);
	for (let i = start + 1; i <= end; i++) {
        await updateAccounts(i);
        bar1.update(i);
	}
})();

async function updateAccounts(blockNum) {
    let block = await web3.eth.getBlock(blockNum, true).catch((e) => { console.error(e.message); reject(); });

    // Insert transactions
    for (let transaction of block.transactions) {
        // console.log(transaction);
        let receipt = await web3.eth.getTransactionReceipt(transaction.hash).catch((e) => { console.error(e.message); reject(); });
        if (!transaction.to) {
            // Contract Creation
            transaction.to = receipt.contractAddress;
        }

        await insertOne(TRANSACTIONS, {
            txhash: transaction.hash,
            blockNum: blockNum,
            from: transaction.from,
            to: transaction.to,
            value: transaction.value,
            gas: transaction.gas,
            gasPrice: transaction.gasPrice,
            gasUsed: receipt.gasUsed,
            nonce: transaction.nonce,
            transactionIndex: transaction.transactionIndex
        }).catch((e) => { console.error(e.message) });

        let address = transaction.from;
        let from = await findOne(ACCOUNTS, { address: address });
        if (!from) {
            await insertOne(ACCOUNTS, {
                address: address,
                restoreBlock: [],
                genesis: true
            });
            activeAccounts.add(address);
        } else if (!activeAccounts.has(address) && !cachedAccounts.has(address)) {
            await upsert(ACCOUNTS,
                { address: address },
                { $addToSet: { restoreBlock: blockNum - 1 }}
            );
            activeAccounts.add(address);
        }

        address = transaction.to;
        let to = await findOne(ACCOUNTS, { address: address });
        if (!to) {
            await insertOne(ACCOUNTS, {
                address: address,
                restoreBlock: [],
                genesis: false
            });
            activeAccounts.add(address);
        } else if (!activeAccounts.has(address) && !cachedAccounts.has(address)) {
            await upsert(ACCOUNTS,
                { address: address },
                { $addToSet: { restoreBlock: blockNum - 1 }}
            );
            activeAccounts.add(address);
        }

        address = block.miner;
        let miner = await findOne(ACCOUNTS, { address: address })
        if (!miner) {
            await insertOne(ACCOUNTS, {
                address: address,
                restoreBlock: [],
                genesis: false
            });
            activeAccounts.add(address);
        } else if (!activeAccounts.has(address) && !cachedAccounts.has(address)) {
            await upsert(ACCOUNTS,
                { address: address },
                { $addToSet: { restoreBlock: blockNum - 1 }}
            );
            activeAccounts.add(address);
        }
    }

    // Sweep
    if (blockNum % epoch == 0) {
        cachedAccounts = activeAccounts;
        activeAccounts = new Set();
    }
}
