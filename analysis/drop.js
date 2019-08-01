const {drop, dropIndexes}  = require('./mongoAPIs');

(async () => {
    try {
        // await drop('blocks');
        // await drop('states');
        // await drop('transactions');
        await drop('accounts');
        await drop('activeAccounts');
        // await dropIndexes('accounts');
        // await dropIndexes('activeAccounts');
    } catch (err) {
        console.error(err);
    }
})();
