var cluster = require('cluster');
const { Accounts_7ms, ActiveAccounts_7m_1w }  = require('./mongoAPIs');
const ProgressBar = require('./progress');

const ACCOUNTS			= 'accounts_7m';
const ACTIVE_ACCOUNTS	= 'active_accounts_7m';
const TRANSACTIONS		= 'transactions_7m';
const INTERVAL			= 100
// const EPOCH				= 172800; // 1 month
const EPOCH 			= 40320 // 1 week
// const EPOCH 			= 1024;
const order = 2;

if (cluster.isMaster) {
	let start = 0;
	let end = aggAccounts[order].count;
	let workers = require('os').cpus().length - 1;
	(async () => { await setIndex(ACTIVE_ACCOUNTS, { address: 1 }, { unique: true }); })();
	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / INTERVAL); i++) {
		limits.push(INTERVAL);
	}
	// console.log(limits);
	let remainder = (end - start) % INTERVAL;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, INTERVAL);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + INTERVAL * i,
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
				start: start + INTERVAL * nonce,
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
		let accounts = await Accounts_7ms.find().skip(msg.start).limit(msg.amount).catch((e) => { console.error('Accounts', e.message); });
		for (let i = 0; i < accounts.length; i++) {
			let record = accounts[i];
			let activeBlocks = [...new Set(record.activeBlocks)].sort((a,b) => { return a - b; });
			let restoreBlock = [];
			
			for (let j = 0; j < activeBlocks.length - 1; j++) {
				if (activeBlocks[j] > 7300000) break;
				if (Math.floor(activeBlocks[j + 1] / EPOCH) - Math.floor(activeBlocks[j] / EPOCH) > 1) {
					console.log(`restore: ${record,address} at ${activeBlocks[j + 1] - 1}`);
					restoreBlock.push(activeBlocks[j + 1] - 1);
				}
			}
			
			ActiveAccounts_7m_1w.create({
				address: record.address,
				restoreBlock: restoreBlock
			});
			process.send({progid: msg.progid, nonce: msg.nonce});
		};
		process.exit(msg.progid);
	});
}