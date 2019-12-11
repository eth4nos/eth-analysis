/*
 * Transactions, Active accounts, Initial state
 */
var cluster = require('cluster');
var { Accounts } = require('./mongoAPIs');
const Web3  = require('web3');

const ProgressBar = require('./progress');
// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');

const INITIAL_BLOCK = 7000000;
const BATCH = 1000;
const EPOCH_1W = 40320;
const EPOCH_1M = 172800;

if (cluster.isMaster) {
	let start = 0;
	let end = 14263781;
	let workers = 60; // require('os').cpus().length - 1;

	// Parse arguments
	if (process.argv.length >= 4) {
		start = process.argv[2] * 1;
		end = process.argv[3] * 1;
		if (process.argv[4]) workers = process.argv[4];
	}

	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / BATCH); i++) {
		limits.push(BATCH);
	}
	let remainder = (end - start) % BATCH;
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
			await updateRestoreBlocks(msg.start, msg.amount);
			process.send({progid: msg.progid, nonce: msg.nonce});
		}
		process.exit(msg.progid);
	});
}

async function updateRestoreBlocks(start, amount) {
	return new Promise(async (resolve, reject) => {
		let accounts = await Accounts.find().skip(start).limit(amount).catch((e) => { console.error('Accounts', e.message); reject(); });
		for (let i = 0; i < accounts.length; i++) {
			let account = accounts[i];
			let address = account.address;
			let activeBlocks = [...new Set(account.activeBlocks)].sort((a,b) => { return a - b; });
			let sortedBlocks = activeBlocks.slice();
			// activeBlocks[0] = 7M
			if (activeBlocks[0] != INITIAL_BLOCK) {
				activeBlocks.unshift(account.initialBalance);
			}

			let values = new Array(activeBlocks.length);
			let currentBalance = account.initialBalance;
			values[0] = currentBalance;
			for (let j = 1; j < activeBlocks.length; j++) {
				let nextBalance = web3.utils.fromWei(await web3.eth.getBalance(address, activeBlocks[j]), 'ether');
				values[j] = nextBalance - currentBalance;
				currentBalance = nextBalance;
			}

			// 1 week
			let restoreBlocks_1w = [];
			currentBalance = account.initialBalance;
			for (let j = 1; j < activeBlocks.length; j++) {
				// if (activeBlocks[j] > 300000) break;
				// restore inactivated account
				if (Math.floor((activeBlocks[j] - INITIAL_BLOCK) / EPOCH_1W) - Math.floor((activeBlocks[j - 1] - INITIAL_BLOCK) / EPOCH_1W) > 1) {
					currentBalance = 0;
				}
				currentBalance += values[j];
				if (currentBalance < 0) {
					currentBalance = web3.utils.fromWei(await web3.eth.getBalance(address, activeBlocks[j]), 'ether');
					restoreBlocks_1w.push(activeBlocks[j] - 1);
				}
			}
			// 1 month
			let restoreBlocks_1m = [];
			currentBalance = account.initialBalance;
			for (let j = 1; j < activeBlocks.length; j++) {
				// restore inactivated account
				if (Math.floor((activeBlocks[j] - INITIAL_BLOCK) / EPOCH_1M) - Math.floor((activeBlocks[j - 1] - INITIAL_BLOCK) / EPOCH_1M) > 1) {
					currentBalance = 0;
				}
				currentBalance += values[j];
				if (currentBalance < 0) {
					currentBalance = web3.utils.fromWei(await web3.eth.getBalance(address, activeBlocks[j]), 'ether');
					restoreBlocks_1m.push(activeBlocks[j] - 1);
				}
			}
			// if (restoreBlocks_1m.length > 0 || restoreBlocks_1w.length > 0) {
			// 	console.log(`${start + i} ${address}`);
			// }
			await Accounts.updateOne(
				{ address: address },
				{ activeBlocks: sortedBlocks,
				  restoreBlocks_1w: restoreBlocks_1w,
				  restoreBlocks_1m: restoreBlocks_1m
				}
			);
		};
		resolve();
	});
}