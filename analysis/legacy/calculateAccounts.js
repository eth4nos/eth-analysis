var cluster = require('cluster');
const { Accounts, AccountAnalysis } = require('./mongoAPIs');
const ProgressBar = require('./progress');

// const period = 8000000; // total period to analyze
// const epoch = 8000; // analysis epoch
const chunk = 10000; // chunk to fetch accounts from the DB

if (cluster.isMaster) {
	let start = 0;
	let end = 55720610; //55730764;
	let workers = 28; //require('os').cpus().length - 1;

	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / chunk); i++) {
		limits.push(chunk);
	}
	let remainder = (end - start) % chunk;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, chunk);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + chunk * i,
			amount: limits[i]
		});

		worker.on('message', function (msg) {
			progressBar.forward(msg.progid, msg.nonce, 1);
		});
	}
	let nonce = workers;

	// fork next process
	cluster.on('exit', function (worker, progid, signal) {
		// console.log(`${progid} finished`);
		if (nonce <= limits.length) {
			let worker = cluster.fork();
			progressBar.update(progid, limits[nonce]);
			worker.send({
				progid: progid,
				nonce: nonce,
				start: start + chunk * nonce,
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
		let accounts = await Accounts.find().skip(msg.start).limit(msg.amount).catch((e) => { console.error('Accounts', e.message); reject(); });

		for (let i = 0; i < accounts.length; i++) {
			let record = accounts[i];
			let activeBlocks = record.activeBlocks;
			// activeBlocks = [...new Set(activeBlocks)].sort(((a, b) => { return a - b; }));

			let statistics = getStatistics(getDiffArr(activeBlocks));
			await Accounts.updateOne(
				{ address: record.address },
				{ $set: statistics }
			).catch((e) => { console.error('Accounts', e.message); });

			let avg = statistics.avg;
			let inc = {'others': 1};
			if (avg <= 5760) inc = {'1day': 1}; // 1 day
			else if (avg <= 40320) inc = {'1week': 1}; // 1 week
			else if (avg <= 80640) inc = {'2weeks': 1}; // 2 weeks
			else if (avg <= 172800) inc = {'1month': 1}; // 1 month
			else if (avg <= 1036800) inc = {'6months': 1}; // 6 months
			else if (avg <= 2102400) inc = {'1year': 1}; // 1 year

			await AccountAnalysis.updateOne(
				{ _id: '5d771490a3701fad586e1b32' },
				{ $inc: inc }
			).catch((e) => { console.error('AccountAnalysis', e.message); });

			process.send({ progid: msg.progid, nonce: msg.nonce });
		}
		process.exit(msg.progid);
	});
}

function getDiffArr(arr) {
	let diffArr = new Array();
	for (let i = 0; i < arr.length - 1; i++) {
		diffArr.push(arr[i + 1] - arr[i]);
	}
	return diffArr;
}

function getAverage(arr) {
	var sum = arr.reduce((sum, value) => {
		return sum + value;
	}, 0);

	var avg = sum / arr.length;
	return avg;
}

function getStatistics(arr) {
	if (arr.length == 0) return { avg: 0, stdev: 0 };
	
	var avg = getAverage(arr);

	var squareDiffs = arr.map((value) => {
		var diff = value - avg;
		var sqrDiff = diff * diff;
		return sqrDiff;
	});

	var avgSquareDiff = getAverage(squareDiffs);

	var stdev = Math.sqrt(avgSquareDiff);

	return {
		avg: Math.round(avg * 100) / 100,
		stdev: Math.round(stdev * 100) / 100
	};
}