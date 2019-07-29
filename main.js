const Web3  = require('web3');
const {insertOne, upsertOne, findOne, findLastOne, findMany}  = require('./mongoAPIs');

const { Bar, Presets } = require('cli-progress');

// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
const bar1 = new Bar({}, Presets.shades_classic);

const BLOCKS = 'blocks';
const STATES = 'states';
const TRANSACTIONS = 'transactions';

// const Byzantium = 4370000;
// const Constantinople = 7280000;

(async function() {
	// let currentBlock = await findLastOne(BLOCKS, {number: -1});

	let current = 0;
	// if (currentBlock) current = currentBlock.number;
	
	// if (current == 0)
	//     insertGenesis()
	// let last = await getLatest();
	let last = 8000000;

	if (process.argv.length == 4) {
		current = process.argv[2] * 1;
		last = process.argv[3] * 1;
	}
	console.log(`Current: ${current}`);
	console.log(`Last: ${last}`);

	bar1.start(last, current);

	for (let i = current + 1; i <= last; i++) {
		await extractBlock(i).catch((e) => { console.error(e.message) });
		bar1.update(i);
	}
})();

function extractBlock(blockNum) {
	return new Promise(async (resolve, reject) => {
		// console.log(blockNum);

		let block = await web3.eth.getBlock(blockNum, true).catch((e) => { console.error(e.message) });

		// Insert blocks
		await insertBlock(block);

		// Insert transactions
		// for (let transaction of block.transactions) {
		// 	let receipt = await web3.eth.getTransactionReceipt(transaction.hash).catch((e) => { console.error(e.message) });
		// 	if (!transaction.to) {
		// 		// Contract Creation
		// 		transaction.to = receipt.contractAddress;
		// 	}
		// 	insertTransaction(transaction, receipt);
		// 	insertState(transaction);
		// }

		// Insert Miner
		// insertMiner(block);

		resolve();
	});
}

// function getLatest() {
// 	return new Promise((resolve, reject) => {
// 		web3.eth.getBlock('latest', (err, result) => {
// 			if (err) reject(error);
// 			else resolve(result.number);
// 		});
// 	});
// }

// function insertGenesis() {
// 	return new Promise(async (resolve, reject) => {
// 		let genesis = require('./config/genesis.json');
// 		let activeAccounts = Object.keys(genesis.alloc);
// 		// activeAccounts.push(genesis.miner);

// 		try {
//             await insertOne(BLOCKS, {
// 				number:	genesis.number,
// 				hash: genesis.hash,
// 				transactions: genesis.transactions,
// 				difficulty: genesis.difficulty,
// 				miner: genesis.miner,
// 				timestamp: genesis.timestamp,
// 				gasLimit: genesis.gasLimit,
// 				gasUsed: genesis.gasUsed,
// 				parentHash: genesis.parentHash,
// 				sha3Uncles: genesis.sha3Uncles,
// 				stateRoot: genesis.stateRoot,
// 				transactionsRoot: genesis.transactionsRoot,
// 				receiptsRoot: genesis.receiptsRoot,
// 				logsBloom: genesis.logsBloom,
// 				extraData: genesis.extraData,
// 				mixHash: genesis.mixHash,
// 				nonce: genesis.nonce,
// 				activeAccounts: activeAccounts
// 			});
		
// 			for (account in genesis.alloc) {
// 				try {
// 					await insertOne(STATES, {
// 						account: account,
// 						nonce: 0,
// 						activeBlocks: [0],
// 						type: 'EOA',
// 						miner: 'USER',
// 					});
// 				} catch (err) {
// 					console.error(err);
// 				}
// 			}
//         } catch (err) {
//             console.error(err);
//             reject();
//         } finally {
//             resolve();
//         }
// 	});
// }

async function insertBlock(block) {
	return new Promise(async (resolve, reject) => {
		let transactions = block.transactions;
		// let txids = [];
		// get activeAccounts

		fromSet = new Set();
		toSet = new Set();
		for (let transaction of transactions) {
			if (!transaction.to) {
				// Contract Creation
				let receipt = await web3.eth.getTransactionReceipt(transaction.hash);
				transaction.to = receipt.contractAddress;
			}
			// txids.push(transaction.hash);
			// let from = transaction.from;
			// let to = transaction.to;
			// if (from && !activeAccounts.includes(from)) activeAccounts.push(from);
			// if (to && !activeAccounts.includes(to)) activeAccounts.push(to);
			fromSet.add(transaction.from);
			toSet.add(transaction.to);
		}

		await insertOne(BLOCKS, {
			number:	block.number,
			// hash: block.hash,
			// transactions: txids,
			// difficulty: block.difficulty,
			miner: block.miner,
			// timestamp: block.timestamp,
			// gasLimit: block.gasLimit,
			// gasUsed: block.gasUsed,
			// parentHash: block.parentHash,
			// sha3Uncles: block.sha3Uncles,
			// stateRoot: block.stateRoot,
			// transactionsRoot: block.transactionsRoot,
			// receiptsRoot: block.receiptsRoot,
			// logsBloom: block.logsBloom,
			// extraData: block.extraData,
			// mixHash: block.mixHash,
			// nonce: block.nonce,
			// activeAccounts: activeAccounts
			from: Array.from(fromSet),
			to: Array.from(toSet)
		}).catch((e) => {
			console.error(e.message)
			reject();
		});

		resolve();
	});
}

async function insertTransaction(transaction, receipt) {
	await insertOne(TRANSACTIONS, {
		txhash: transaction.hash,
		blockNum: transaction.blockNumber,
		from: transaction.from,
		to: transaction.to,
		value: transaction.value,
		gas: transaction.gas,
		gasPrice: transaction.gasPrice,
		gasUsed: receipt.gasUsed,
		nonce: transaction.nonce
	}).catch((e) => { console.error(e.message) });
}

async function insertState(transaction) {
	//console.log(transaction);
	let addresses = {
		from: transaction.from,
		to: transaction.to
	};
	let accounts = {
		from: await findOne(STATES, {account: addresses['from']}).catch((e) => { console.error(e.message) }),
		to:	await findOne(STATES, {account: addresses['to']}).catch((e) => { console.error(e.message) })
	};
	//console.log(addresses);
	for (let key in accounts) {
		if (!accounts[key]) {
			accounts[key] = {
				account: addresses[key],
				nonce: '0',
				activeBlocks: [],
				type: await getType(transaction[key]).catch((e) => { console.error(e.message) }),
				miner: 'USER',
			}
		}
		if (!accounts[key].activeBlocks.includes(transaction.blockNumber)) {
			accounts[key].activeBlocks.push(transaction.blockNumber);
		}
	};

	asyncForEach(accounts, async state => {
		await insertOne(STATES, {
			account: state.account,
			nonce: state.nonce,
			activeBlocks: state.activeBlocks,
			type: state.type,
			miner: state.miner,
		}).catch((e) => { console.error(e.message) });
	});
}

async function insertMiner(block) {
	// console.log(block.number);
	var miner = await findOne(STATES, {account: block.miner}).catch((e) => { console.error(e.message) });
	if (!miner) {
		miner = {
			account: block.miner,
			nonce: '0',
			activeBlocks: [],
			type: await getType(block.miner).catch((e) => { console.error(e.message) }),
			miner: 'MINER',
		}
	}

	if (!miner.activeBlocks.includes(block.number)) {
		miner.activeBlocks.push(block.number);
	}

	await insertOne(STATES, {
		account: miner.account,
		nonce: miner.nonce,
		activeBlocks: miner.activeBlocks,
		type: miner.type,
		miner: miner.miner,
	}).catch((e) => { console.error(e.message) });
}

function getType(address) {
	return new Promise (async (resolve, reject) => {
        if (!address) resolve(undefined);
        //console.log(address);
		try {
			let result = await web3.eth.getCode(address);
			if (result) {
				if (result == '0x') resolve('EOA');
				else resolve('CA');
			}
			//console.log("destroyed contract");
			resolve('UNKNOWN');
		} catch (err) {
			console.log('error: ', address);
			//fs.appendFileSync('missings.txt', '\n' + address);
			//reject(error);
			resolve('UNKNOWN');
		}
	});
}

async function asyncForEach(map, callback) {
	for (key in map) {
		try {
			await callback(map[key]);
		} catch (err) {
			console.error(err);
		}
	}
}