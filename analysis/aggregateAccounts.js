var cluster = require('cluster');
const {Accounts, Accounts_7ms}  = require('./mongoAPIs');
const ProgressBar = require('./progress');

/**
 * 1 ~ 3M
 * ObjectId: 5d53d285019cd1d76756e705
 * count: 840230
 */
aggAccounts = [
	{
		// 3M ~ 5M
		db_name: 'accounts_3m',
		objectId: '5d5a296e156c0e1acc0d9ec1',
		count: 22197266
	},
	{
		// 5M ~ 7M
		db_name: 'accounts_5m',
		objectId: '5d53d28e0da4fa0c01c4ec38',
		count: 27180157
	},
	{
		// 7M ~ 8M
		db_name: 'accounts_7m',
		objectId: '5d5a495f0d0057455ff99507',
		count: 14264133
	}
]

var epoch = 10000;
const aggOrder = 0;

if (cluster.isMaster) {
	let start = 11260000;
	// let end = aggAccounts[aggOrder].count;
	let end = 11268005;
	let workers = 1; //require('os').cpus().length - 1;

	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / epoch); i++) {
		limits.push(epoch);
	}
	let remainder = (end - start) % epoch;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, epoch);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + epoch * i,
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
				start: start + epoch * nonce,
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
		// findRange(aggAccounts[aggOrder].db_name, {_id: 1}, msg.start, msg.amount);
		let accounts = await Accounts_7ms.find().skip(msg.start).limit(msg.amount);
		
		for (let i = 0; i < accounts.length; i++) {
		// accounts.forEach(async record => {
			let record = accounts[i];
			let activeBlocks = record.activeBlocks;
			let account = await Accounts.findOne({ address: record.address });
			if (account)
				activeBlocks = activeBlocks.concat(account.activeBlocks);
			activeBlocks = [...new Set(activeBlocks.sort(((a,b) => { return a-b; })))];
			
			if (account)
				await Accounts.updateOne(
					{ address: record.address },
					{ $set: {activeBlocks: activeBlocks }}
				);
			else
				await Accounts.create({
					address: record.address,
					activeBlocks: activeBlocks
					// { upsert: true, strict: false }
				});
			process.send({ progid: msg.progid, nonce: msg.nonce });
		}
		process.exit(msg.progid);
	});
}