/*
 * Transactions, Active accounts, Initial state
 */
var cluster = require('cluster');
var { Accounts } = require('./mongoAPIs');
const Web3  = require('web3');
var fs = require('fs');

const ProgressBar = require('./progress');
// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');

const INITIAL_BLOCK = 700000;
const BATCH = 100;
const EPOCH_1W = 40320;

if (cluster.isMaster) {
	let start = 0;
	let end = 3;
	// let end = 4588065;
	/// let end = 14263781;
	/// let end = 100;
	// let workers = 60; // require('os').cpus().length - 1;
	let workers = 1;

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
			if (msg.finish) {
				save_correctness_data(msg.account_data)
			} else {
				progressBar.forward(msg.progid, msg.nonce, 1);
			}
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
				if (msg.finish) {
					save_correctness_data(msg.false_accounts);
				} else {
					progressBar.forward(msg.progid, msg.nonce, 1);
				}
			});
			nonce++;
			progressBar.forwardIndicator();
		}
	});
} else {
	process.on('message', async (msg) => {
		false_accounts = await updateRestoreBlocks(msg.start, msg.amount, msg.progid, msg.nonce);
		process.send({progid: msg.progid, nonce: msg.nonce, false_accounts: false_accounts, finish: true});
		process.exit(msg.progid);
	});
}

async function updateRestoreBlocks(start, amount, progid, nonce) {
	return new Promise(async (resolve, reject) => {
		let accounts = await Accounts.find().skip(start).limit(amount).catch((e) => { console.error('Accounts', e.message); reject(); });

		let false_accounts = [];
		for (let i = 0; i < accounts.length; i++) {
			let account = accounts[i];
			let address = account.address;
			let transferringValues = account.transferringValues;
			let activeBlocks = [...new Set(account.activeBlocks)].sort((a,b) => { return a - b; });

			// get balance change of an account
			let values = new Object();
			// let currentBalance = web3.utils.fromWei(account.initialBalance, 'ether') * 1;
			
			let currentBalance = account.initialBalance * 1;
			console.log(currentBalance);
			for (let j = 0; j < activeBlocks.length; j++) {
				for (let k = 0; k < transferringValues.length; k++) {
					if (transferringValues[k]["blockNum"] == activeBlocks[j]) {
						values[activeBlocks[j]] = transferringValues[k]["value"];
						break;
					}
				}
			}
			console.log(activeBlocks);
			console.log(values);

			// 1 week
			for (let j = 0; j < activeBlocks.length; j++) {
				let value = values[activeBlocks[j]];
				if (activeBlocks[j] == INITIAL_BLOCK + 1) continue;
				if (j > 1 && checkpoint(activeBlocks[j], EPOCH_1W) - checkpoint(activeBlocks[j - 1], EPOCH_1W) > 1) {
					// sweeped
					if (currentBalance + value < 0) {
						// restored
						console.log("restored")
						currentBalance = await web3.eth.getBalance(address, activeBlocks[j-1]) * 1;
					} else {
						// pawn
						console.log("pawn")
						currentBalance = 0;
					}
				}
				currentBalance += value;
			}

			let lastBalance = await web3.eth.getBalance(address, activeBlocks[activeBlocks.length - 1]).catch((e) => { console.error(e.message); reject(); });
			console.log(address)
			console.log(`lastBalance: ${lastBalance}`);
			console.log(`caclulatedBalance: ${currentBalance}`);
			console.log(lastBalance == currentBalance);

			// if (lastBalance != currentBalance) {
			// 	false_accounts.push(address);
			// 	console.log(address)
			// 	console.log(`lastBalance: ${lastBalance}`);
			// 	console.log(`caclulatedBalance: ${currentBalance}`);
			// }

			process.send({progid: progid, nonce: nonce, finish: false});
		};
		resolve(false_accounts);
	});
}

function checkpoint(blockNum, epoch) {
	return Math.floor((blockNum - INITIAL_BLOCK) / epoch);
}

function save_correctness_data(correctness_data) {
	fs.writeFileSync('./correctness.json', JSON.stringify(correctness_data), function(err) {
		if(err) throw err;
		// console.log('File write completed');
	});
}