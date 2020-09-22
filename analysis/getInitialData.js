/*
 * Transactions, Active accounts, Initial state
 */
var cluster = require('cluster');
// var { Accounts_, Transactions_ } = require('./mongoAPIs');
// var Accounts = Accounts_;
// var Transactions = Transactions_;
var { Accounts, Transactions } = require('./mongoAPIs');
const Web3  = require('web3');
var fs = require('fs');

const ProgressBar = require('./progress');
// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');

const INITIAL_BLOCK = 7000001;
const BATCH = 100;

if (cluster.isMaster) {
	let start = INITIAL_BLOCK; // Not included
	// let end = 8000000;
	let end = 7300000;
	let workers = 50; // require('os').cpus().length - 1;

	let transaction_count = new Array(end - start + 1);

	// Parse arguments
	if (process.argv.length >= 4) {
		start = process.argv[2] * 1;
		end = process.argv[3] * 1;
		if (process.argv[4]) workers = process.argv[4];
	}

	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start + 1) / BATCH); i++) {
		limits.push(BATCH);
	}
	let remainder = (end - start + 1) % BATCH;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, BATCH);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + BATCH * i,
			amount: limits[i]
		});

		worker.on('message', function (msg) {
			for (key in msg.tx_count) {
				transaction_count[key] = msg.tx_count[key];
			}
			save_tx_data(transaction_count);
			// console.log(transaction_count);
			progressBar.forward(msg.progid, msg.nonce, 1);
		});
	}
	let nonce = workers;

	// fork next process
	cluster.on('exit', function(worker, progid, signal) {
		// console.log(`${progid} finished`);
		if (nonce <= limits.length) {
			let worker = cluster.fork();
			progressBar.update(progid, limits[nonce]);
			worker.send({
				progid: progid,
				nonce: nonce,
				start: start + BATCH * nonce,
				amount: limits[nonce]
			});
			worker.on('message', function (msg) {
				for (key in msg.tx_count) {
					transaction_count[key] = msg.tx_count[key];
				}
				save_tx_data(transaction_count);
				// console.log(transaction_count);
				progressBar.forward(msg.progid, msg.nonce, 1);
			});
			nonce++;
			progressBar.forwardIndicator();
		}
	});
} else {
	process.on('message', async (msg) => {
		// console.log(msg)
		for (let i = msg.start; i < msg.start + msg.amount; i++) {
			let tx_count = await getState(i);
			process.send({progid: msg.progid, nonce: msg.nonce, tx_count: tx_count});
		}
		process.exit(msg.progid);
	});
}

async function getState(blockNum) {
	return new Promise(async (resolve, reject) => {
		let block = await web3.eth.getBlock(blockNum, true).catch((e) => { console.error(e.message); reject(); });

		// count transactions
		let tx_count = new Object();
		tx_count[blockNum - INITIAL_BLOCK] = block.transactions.length;

		// Insert transactions
		let miningReward = 3000000000000000000;
		let values = {};
		// console.log(block)
		for (let i = 0; i < block.transactions.length; i++) {
			let transaction = block.transactions[i];
			if (await Transactions.findOne({hash: transaction.hash})) continue; // skip duplication
			let receipt = await web3.eth.getTransactionReceipt(transaction.hash).catch((e) => { console.error(e.message); reject(); });
			if (receipt && !transaction.to) {
				// Contract Creation
				transaction.to = receipt.contractAddress;
			}
			let fee = transaction.gasPrice * receipt.gasUsed * 1;
			miningReward += fee;

			let value = transaction.value * 1;
			if (values[transaction.from]) values[transaction.from] -= value;
			else {
				values[transaction.from] = -value - fee;
			}
			if (values[transaction.to]) values[transaction.to] += value;
			else {
				values[transaction.to] = value;
			}

			// await updateAccount(transaction.from, blockNum, -value);
			// await updateAccount(transaction.to, blockNum, value);
			await Transactions.create({
				hash: transaction.hash,
				blockNum: blockNum,
				transactionIndex: transaction.transactionIndex,
				from: transaction.from,
				to: transaction.to,
				value: transaction.value,
				nonce: transaction.nonce
			}).catch((e) => { console.error(e.message) });
		}

		// console.log(values);

		for (account in values) {
			// console.log(account);
			// console.log(values[account])
			await updateAccount(account, blockNum, values[account]);
		}
		await updateAccount(block.miner, blockNum, miningReward);
		resolve(tx_count);
	});
}

function updateAccount(address, blockNum, value) {
	return new Promise(async (resolve, reject) => {
		let account = await Accounts.findOne({ address: address });
		if (account) {
			await Accounts.updateOne(
				{ address: address },
				{ $addToSet: { activeBlocks: blockNum },
				  $push: {transferringValues: { blockNum: blockNum, value: value }}}
			);
			resolve();
		} else {
			let initialBalance = await web3.eth.getBalance(address, INITIAL_BLOCK).catch((e) => { console.error(e.message); reject(); });

			// @ Luke Park
			let code = await web3.eth.getCode(address).catch((e) => { console.error(e.message); reject(); });
			let type = 0;  // EOA
			if (code != "0x") { type = 1; }  // CA

			await Accounts.updateOne(
				{ address: address },
				{ type: type,
				  initialBalance: initialBalance,
				  activeBlocks: [blockNum],
				  $push: {transferringValues: { blockNum: blockNum, value: value }}
				}, { upsert: true, strict: true}
			);
			resolve();
		}
	});
}

function save_tx_data(tx_count) {
	fs.writeFileSync('./tx_count_1w.txt', JSON.stringify(tx_count), function(err) {
		if(err) throw err;
		// console.log('File write completed');
	});
}
