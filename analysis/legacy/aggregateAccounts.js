var cluster = require('cluster');
const { Accounts, Accounts_0, Accounts_3ms, Accounts_5ms, Accounts_7ms }  = require('./mongoAPIs');
const ProgressBar = require('./progress');

var epoch = 1000;

if (cluster.isMaster) {
	let start = 0;
	let end = 14264037; // 0~3M: 807699, 3M~5M: 22224177, 5M~7M: 27151711, 7M~8M: 14264037
	let workers = 28; //require('os').cpus().length - 1;

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
					{ $set: { activeBlocks: activeBlocks }}
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