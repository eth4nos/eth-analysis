// const { TransactionCounts } = require('./mongoAPIs');
const fs = require('fs');
const len = 1000;

fs.readFile('restoreTx1.json', (err, data) => {
	if (err) throw err;
	let arr = new Array(len).fill(0);
    let allTxs = JSON.parse(data);
	for (let j = 0; j < 1000; j++) {
		let txCounts = allTxs.slice(j * len, (j+1) * len);
		let count = 0;
		for (let i = 0; i < txCounts.length; i++) {
			// console.log(txCounts[i].blockNum);
			// count += txCounts[i].count;
			count += txCounts[i];
		}
		if (j % 100 == 0) console.log(j)
		arr[j] = count;
	}
	let result = JSON.stringify(arr);
	fs.writeFileSync('restoreTx.json', result);
});