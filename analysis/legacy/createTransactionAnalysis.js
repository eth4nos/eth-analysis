const { TransactionCounts }  = require('./mongoAPIs');

const start = 7000001; //0;
const period = 8000000;
// const epoch = 50000;

(async () => {
    for (let number = start; number <= period; number++) {
        await TransactionCounts.create(
            { blockNum: number, count: 0 }
        );
    }
    process.exit();
})();