var cluster = require('cluster');
const { Transactions, TransactionCounts }  = require('./mongoAPIs');
const ProgressBar = require('./progress');

const ACCOUNTS			= 'accounts_7m';
const ACTIVE_ACCOUNTS	= 'active_accounts_7m';
const TRANSACTIONS		= 'transactions_7m';
const INTERVAL			= 100000
// const EPOCH				= 172800; // 1 month
const EPOCH 			= 40320 // 1 week
// const EPOCH 			= 1024;
const order = 2;

if (cluster.isMaster) {
	let start = 0;
	let end = 108960851;
	let workers = require('os').cpus().length - 1;
	// (async () => { await setIndex(ACTIVE_ACCOUNTS, { address: 1 }, { unique: true }); })();
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
		let transactions = await Transactions.find().skip(msg.start).limit(msg.amount).catch((e) => { console.error('Transactions', e.message); });
		let blocks = [];
		for (let i = 0; i < transactions.length; i++) {
			let tx = transactions[i];
			if (blocks.indexOf(tx.blockNum) != -1) {
				await TransactionCounts.updateMany(
					{ blockNum: { "$in": blocks }},
					{ $inc: { count: 1 }}
				).catch((e) => { console.error(`Transactions: ${tx}\n${e.message}`); });
				blocks = [tx.blockNum];
			} else {
				blocks.push(tx.blockNum);
			}
			process.send({progid: msg.progid, nonce: msg.nonce});
		};
		if (blocks.length > 0) {
			await TransactionCounts.updateMany(
				{ blockNum: { "$in": blocks }},
				{ $inc: { count: 1 }}
			).catch((e) => { console.error(`Transactions: ${tx}\n${e.message}`); });
		}
		process.exit(msg.progid);
	});
}