const EthQuery = require('eth-query')
const HttpProvider = require('ethjs-provider-http')
const async = require('async')
const ethUtil = require('ethereumjs-util')
const request = require('request')
const treeify = require('treeify')
const asTree = (obj) => treeify.asTree(obj, true)

const accounts = require('./accounts.json')

const assets = {
  'ETH': {
    digits: 18,
    coinmarketcapName: 'ethereum',
  },
  'SwarmCity': {
    address: '0xb9e7f8568e08d5659f5d29c4997173d84cdf2607',
    digits: 18,
    coinmarketcapName: 'swarm-city',
  },
  'Pluton': {
    address: '0xD8912C10681D8B21Fd3742244f44658dBA12264E',
    digits: 18,
    coinmarketcapName: 'pluton',
  },
  'DGD': {
    address: '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a',
    digits: 18,
    coinmarketcapName: 'digixdao',
  },
  'MKR': {
    address: '0xc66ea802717bfb9833400264dd12c2bceaa34a6d',
    digits: 18,
    coinmarketcapName: 'maker',
  },
  'Golem': {
    address: '0xa74476443119A942dE498590Fe1f2454d7D4aC0d',
    digits: 18,
    coinmarketcapName: 'golem-network-tokens',
  },
  'Augur REP': {
    address: '0x48c80F1f4D53D5951e5D5438B54Cba84f29F32a5',
    digits: 18,
    coinmarketcapName: 'augur',
  },
}

let provider = new HttpProvider('https://mainnet.infura.io/')
const query = new EthQuery(provider)
bindFns(query)

async.parallel({
  accountData: (cb) => async.mapValues(accounts, calculateAssets, cb),
  assetExchangeRates: (cb) => async.mapValues(assets, getAssetValue, cb),
}, showResults)

function showResults(err, { accountData, assetExchangeRates }) {
  if (err) throw err

  // mix account data + exchange rates
  const accountsWithAssetValues = {}
  eachKeyValue(accountData, (accountName, assetHoldings) => {
    const assetValues = {}
    accountsWithAssetValues[accountName] = assetValues
    eachKeyValue(assetHoldings, (assetName, assetBalance) => {
      // skip empty assets
      if (assetBalance === 0) return
      // calc usd value
      assetValues[assetName] = assetBalance * assetExchangeRates[assetName]
    })
  })

  console.log(`exchange rates:\n${asTree(assetExchangeRates)}`)
  console.log(`asset holdings (USD):\n${asTree(accountsWithAssetValues)}`)

  // calculate total
  let totalUsd = 0
  eachKeyValue(accountsWithAssetValues, (accountName, accountAssets) => {
    eachKeyValue(accountAssets, (assetName, assetValue) => {
      totalUsd += assetValue
    })
  })

  console.log('total usd:', numberWithCommas(totalUsd.toFixed(2)))
}

function getAssetValue(asset, assetName, cb) {
  request(`https://api.coinmarketcap.com/v1/ticker/${asset.coinmarketcapName}/`, function(err, res, body){
    if (err) return cb(err)
    const data = JSON.parse(body)[0]
    let assetUsdPrice
    if (data) {
      assetUsdPrice = Number(data.price_usd)
    } else {
      assetUsdPrice = 0
    }
    cb(null, assetUsdPrice)
  })
}

function calculateAssets(address, accountName, cb){
  const tasks = {}
  Object.keys(assets).forEach((assetName) => {
    const token = assets[assetName]
    if (assetName === 'ETH') {
      tasks[assetName] = getEtherBalance.bind(null, address)
    } else {
      tasks[assetName] = getTokenBalance.bind(null, token, address)
    }
  })
  async.parallel(tasks, cb)
}

function getEtherBalance(accountAddress, cb) {
  query.getBalance(accountAddress, (err, result) => {
    if (err) return cb(err)
    let ethBalance
    try {
      const weiBalance = parseInt(result, 16)
      ethBalance = weiBalance / 1e18
    } catch (err) {
      return cb(err)
    }
    cb(null, ethBalance)
  })
}


function getTokenBalance(asset, accountAddress, cb) {
  request(`https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${asset.address}&address=${accountAddress}&tag=latest`, (err, res, body) => {
    if (err) return cb(err)
    let realTokenBalance
    try {
      const rawTokenBalance = parseInt(JSON.parse(body).result)
      realTokenBalance = rawTokenBalance / Math.pow(10, asset.digits)
    } catch (err) {
      return cb(err)
    }
    cb(null, realTokenBalance)
  })
}

function bindFns(obj){
  for(let key in obj){
    const val = obj[key]
    if (typeof val === 'function') {
      obj[key] = val.bind(obj)
    }
  }
}

function eachKeyValue(obj, fn){
  for (let key in obj) {
    const val = obj[key]
    fn(key, val)
  }
}

function numberWithCommas(num) {
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}