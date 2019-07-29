const {insertOne, upsertOne, findOne, findLastOne, findMany, updateOne, setIndex}  = require('./mongoAPIs');

const { Bar, Presets } = require('cli-progress');

// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const bar1 = new Bar({}, Presets.shades_classic);

const last = 8000000;
const epoch  = 172800; // 1 month
// const epoch =  40320 // 1 week
// const epoch = 1000;

class Accounts {
    constructor() {
        this.totalAccountSize = 0;
        this.activeAccounts = []; // { account, lastBlockNum, puppet }
    }

    upsert(address, blockNum, from, newbie) {
        if (newbie) this.totalAccountSize++;
        let accObj = this.activeAccounts.find(acc => {
            return acc.address == address;
        });
        let puppet = false;
        if (!newbie && !accObj) {
            puppet = true;
        }
        if (accObj) {
            accObj.lastBlockNum = blockNum;
            if (from) {
                puppet = false;
            }
        } else {
            this.activeAccounts.push({
                address: address,
                lastBlockNum: blockNum,
                puppet: puppet
            });
        }
    }

    sweep(blockNum) {
        this.activeAccounts = this.activeAccounts.filter(account => {
            return blockNum - account.lastBlockNum < epoch;
        });
    }

    getPuppetAccountLength() {
        return this.activeAccounts.filter(acc => {
            return acc.puppet;
        }).length;
    }
}

var accounts = new Accounts();

(async function() {
    let currentBlock = 0;
    // activeAccounts {number, #totalAccounts, #activeAccounts, #puppetAccounts}
    // accounts {address, lastBlockNum, distance, count}

    // console.log(`currentBlock: ${currentBlock}, Accounts: ${accountData.totalAccountSize}`);
    //let latest = await getLatest();

    await setIndex('accounts', { address: 1 }, { unique: true });
    await setIndex('activeAccounts', { number: 1 }, { unique: true });

	bar1.start(last, currentBlock);
	for (let i = currentBlock + 1; i <= last; i++) {
        await updateAccounts(i);
        bar1.update(i);
	}
})();

async function updateAccounts(number) {
    let block = await findOne('blocks', {number: number});
   
    await updateAccount(block.miner, number, false);
    for (let to of block.to) {
        await updateAccount(to, number, false);
    }
    for (let from of block.from) {
        await updateAccount(from, number, true);
    }

    accounts.sweep(number);

    await insertOne('activeAccounts', {
        number: number,
        total: accounts.totalAccountSize,
        active: accounts.activeAccounts.length,
        puppet: accounts.getPuppetAccountLength()
    })
}

async function updateAccount(address, number, from) {
    let account = await findOne('accounts', { address: address });
    if (!account) {
        await insertOne('accounts', {
            address: address,
            lastBlockNum: number,
            distance: 0,
            count: 1
        })
    } else {
        let count = account.count;
        let distance = (account.distance * count + number - account.lastBlockNum) / (count + 1);
        await updateOne('accounts', { address: address }, {
            lastBlockNum: number,
            distance: distance,
            count: count + 1
        })
    }
    accounts.upsert(address, number, from, account ? true : false)
}