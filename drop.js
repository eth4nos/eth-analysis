const {drop}  = require('./mongoAPIs');

(async () => {
    try {
        // await drop('blocks');
        // await drop('states');
        // await drop('transactions');
        await drop('accounts');
        await drop('activeAccounts');
    } catch (err) {
        console.error(err);
    }
})();
