# eth-analysis
The purpose of the repository is to analyze Ethereum to determine the proper epoch of the Eth4nos project.

## Environments
* Node.js v10.16.0
* Go-ethereum v1.9
* mongoDB v4.0.11

## Prerequisites
* install node packages
```
$ npm install
```

* run mongoDB daemon
```
$ mongod --dbpath {disk}
```

* run go-ethereum client with fast sync mode
```
$ geth --datadir {datadir} --syncmode=fast --cache=30000 --rpcapi eth,personal,admin,miner,web3,debug --rpc
```

## How to use?
* Fetch and parse Ethereum data to mongoDB
```
$ node main.js
```

* Analyze the data in the mongoDB
```
$ node countActiveAccounts.js
```
