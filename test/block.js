const level = require('level')
const Blockchain = require('ethereumjs-blockchain').default
const utils = require('ethereumjs-util')

const gethDbPath = '/home/jaeykim/data/geth/chaindata' // Add your own path here. It will get modified, see remarks.
const db = level(gethDbPath)

new Blockchain({ db: db }).iterator(
      'i',
      (block, reorg, cb) => {
              const blockNumber = utils.bufferToInt(block.header.number)
              const blockHash = block.hash().toString('hex')
              console.log(`BLOCK ${blockNumber}: ${blockHash}`)
              cb()
            },
      err => console.log(err || 'Done.'),
)
