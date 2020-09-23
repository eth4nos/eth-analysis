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

const INITIAL_BLOCK = 7000000;
const BATCH = 100;
const EPOCH_1W = 40320;
const EPOCH_1M = 172800;

class Restore {
	constructor() {
		this.data = new Object();
	}

	upsert(key, value) {
		if (this.data[key]) {
			// console.log("upsert", this.data[key]);
			this.data[key].push(value);
		}
		else this.data[key] = [value];
	}
	
	upcat(key, arr) {
		// console.log(this)
		if (this.data[key]) {
			// console.log("upcat", this.data[key]);
			this.data[key] = this.data[key].concat(arr);
		}
		else this.data[key] = arr;
	}
}


if (cluster.isMaster) {
	let start = 0;
	// let end = 14263781;
	let end = 4588065;
	// let end = 100;
	let workers = 60; // require('os').cpus().length - 1;

	var account_data = {
		active: [0, 0, 0, 0, 0, 0, 0],
		new: [0, 0, 0, 0, 0, 0, 0],
		pawn: [0, 0, 0, 0, 0, 0, 0],
		restored_EOA: [0, 0, 0, 0, 0, 0, 0],
		restored_CA: [0, 0, 0, 0, 0, 0, 0]
	}

	var restore_data = new Restore();

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
				aggregate_account_data(account_data, msg.batch_account_data);
				save_restore_data(restore_data, msg.batch_restore_data);
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
					aggregate_account_data(account_data, msg.batch_account_data);
					save_restore_data(restore_data, msg.batch_restore_data);
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
		result = await updateRestoreBlocks(msg.start, msg.amount, msg.progid, msg.nonce);
		let batch_account_data = result.batch_account_data;
		let batch_restore_data = result.batch_restore_data;
		process.send({progid: msg.progid, nonce: msg.nonce, batch_account_data: batch_account_data, batch_restore_data: batch_restore_data, finish: true});
		process.exit(msg.progid); 
	});
}

async function updateRestoreBlocks(start, amount, progid, nonce) {
	return new Promise(async (resolve, reject) => {
		let accounts = await Accounts.find().skip(start).limit(amount).catch((e) => { console.error('Accounts', e.message); reject(); });
		let batch_account_data = {
			active: [0, 0, 0, 0, 0, 0, 0],
			new: [0, 0, 0, 0, 0, 0, 0],
			pawn: [0, 0, 0, 0, 0, 0, 0],
			restored_EOA: [0, 0, 0, 0, 0, 0, 0],
			restored_CA: [0, 0, 0, 0, 0, 0, 0]
		}
		let batch_restore_data = new Restore();
		for (let i = 0; i < accounts.length; i++) {
			let account = accounts[i];
			let address = account.address;
			let isCA = account.type;
			let transferringValues = account.transferringValues;
			let activeBlocks = [...new Set(account.activeBlocks)].sort((a,b) => { return a - b; });

			// get balance change of an account
			let values = new Object();
			// let currentBalance = web3.utils.fromWei(account.initialBalance, 'ether') * 1;
			let currentBalance = account.initialBalance * 1;
			for (let j = 0; j < activeBlocks.length; j++) {
				for (let k = 0; k < transferringValues.length; k++) {
					if (transferringValues[k]["blockNum"] == activeBlocks[j]) {
						values[activeBlocks[j]] = transferringValues[k]["value"];
						break;
					}
				}
			}

			// 1 week
			let restoreBlocks_1w = [];
			let a_data = [0, 0, 0, 0, 0, 0, 0];
			a_data[checkpoint(activeBlocks[0], EPOCH_1W)] = "new";
			let r_data = new Restore();
			for (let j = 1; j < activeBlocks.length; j++) {
				if (checkpoint(activeBlocks[j], EPOCH_1W) - checkpoint(activeBlocks[j - 1], EPOCH_1W) > 1) {
					// sweeped
					if (currentBalance + values[activeBlocks[j]] < 0) {
						restoreBlocks_1w.push(activeBlocks[j] - 1);
						r_data.upsert(activeBlocks[j] - 1, address);
						currentBalance = await web3.eth.getBalance(address, activeBlocks[j]) * 1;
						// restore_CA || restored_EOA
						if (isCA == 1) {
							a_data[checkpoint(activeBlocks[j], EPOCH_1W)] = "restored_CA";
						} else {
							a_data[checkpoint(activeBlocks[j], EPOCH_1W)] = "restored_EOA";
						}
					} else {
						currentBalance = 0;
						a_data[checkpoint(activeBlocks[j], EPOCH_1W)] = "pawn";
					}
				} else if (a_data[checkpoint(activeBlocks[j], EPOCH_1W)] == 0) {
					a_data[checkpoint(activeBlocks[j], EPOCH_1W)] = "active";
				}

				currentBalance += values[activeBlocks[j]];		
			}

			// 1 month
			// let restoreBlocks_1m = [];
			// let a_data = [0, 0, 0, 0, 0, 0, 0];
			// a_data[checkpoint(activeBlocks[0], EPOCH_1M)] = "new";
			// let r_data = new Restore();
			// for (let j = 1; j < activeBlocks.length; j++) {
			// 	if (checkpoint(activeBlocks[j], EPOCH_1M) - checkpoint(activeBlocks[j - 1], EPOCH_1M) > 1) {
			// 		// sweeped
			// 		if (currentBalance + values[activeBlocks[j]] < 0) {
			// 			restoreBlocks_1m.push(activeBlocks[j] - 1);
			// 			r_data.upsert(activeBlocks[j] - 1, address);
			// 			currentBalance = await web3.eth.getBalance(address, activeBlocks[j]) * 1;
			// 			a_data[checkpoint(activeBlocks[j], EPOCH_1M)] = "restored";
			// 		} else {
			// 			currentBalance = 0;
			// 			a_data[checkpoint(activeBlocks[j], EPOCH_1M)] = "pawn";
			// 		}
			// 	} else if (a_data[checkpoint(activeBlocks[j], EPOCH_1M)] == 0) {
			// 		a_data[checkpoint(activeBlocks[j], EPOCH_1M)] = "active";
			// 	}

			// 	currentBalance += values[activeBlocks[j]];		
			// }
			await Accounts.updateOne(
				{ address: address },
				{ activeBlocks: activeBlocks,
				  restoreBlocks_1w: restoreBlocks_1w,
				//   restoreBlocks_1m: restoreBlocks_1m
				}
			);
			for (let j = 0; j < a_data.length; j++) {
				if (a_data[j] == 0) continue;
				batch_account_data[a_data[j]][j] += 1;
			}
			for (key in r_data.data) {
				// console.log(key, r_data.data[key]);
				batch_restore_data.upcat(key, r_data.data[key]);
			}
			process.send({progid: progid, nonce: nonce, finish: false});
		};
		resolve({batch_account_data: batch_account_data, batch_restore_data: batch_restore_data});
	});
}

function checkpoint(blockNum, epoch) {
	return Math.floor((blockNum - INITIAL_BLOCK) / epoch);
}

function aggregate_account_data(account_data, batch_account_data) {
	// console.log(JSON.stringify(batch_account_data));
	for (key in account_data) {
		for (let i = 0; i < account_data[key].length; i++) {
			account_data[key][i] += batch_account_data[key][i];
		}
	}
	// console.log(account_data);
	fs.writeFileSync('./results_1w.txt', JSON.stringify(account_data), function(err) {
		if(err) throw err;
		// console.log('File write completed');
	});
}

function save_restore_data(restore_data, batch_restore_data) {
	for (key in batch_restore_data.data) {
		restore_data.upcat(key, batch_restore_data.data[key]);
	}
	fs.writeFileSync('./restore_1w.txt', JSON.stringify(restore_data.data), function(err) {
		if(err) throw err;
		// console.log('File write completed');
	});
}
