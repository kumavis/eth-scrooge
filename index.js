const EthQuery = require('eth-query')
const Eth = require('ethjs-query')
const EthContract = require('ethjs-contract')
const tokenAbi = require('human-standard-token-abi')
const HttpProvider = require('ethjs-provider-http')
const async = require('async')
const ethUtil = require('ethereumjs-util')
const request = require('request')
const treeify = require('treeify')
const createInfuraProvider = require('eth-json-rpc-infura/src/createProvider')
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
  'OmiseGo': {
    address: '0xd26114cd6EE289AccF82350c8d8487fedB8A0C07',
    digits: 18,
    coinmarketcapName: 'omisego',
  },
  'Storj': {
    address: '0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac',
    digits: 8,
    coinmarketcapName: 'storj',
  },
  'RChain RHOC': {
    address: '0x168296bb09e24a88805cb9c33356536b980d3fc5',
    digits: 8,
    coinmarketcapName: 'rchain',
  },
}

// let provider = new HttpProvider('https://mainnet.infura.io')
const provider = createInfuraProvider()
const query = new EthQuery(provider)
bindFns(query)

const eth = new Eth(provider)
const contract = new EthContract(eth)
const TokenContract = contract(tokenAbi)

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

  console.log('total usd:', totalUsd.toFixed(2))
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


async function getTokenBalance(asset, accountAddress) {
  const contract = TokenContract.at(asset.address)

  const [ balanceResult, decimalsResult ] = await Promise.all([
    contract.balanceOf(accountAddress),
    asset.digits ? [asset.digits] : contract.decimals(),
  ])

  const balance = balanceResult[0]
  const decimals = decimalsResult[0]

  // const ten = new BN(10)
  // const realBalance = balance.div(ten.pow(decimals))
  const realTokenBalance = toNumber(balance) / Math.pow(10, toNumber(decimals))
  // console.log({ realTokenBalance, asset, decimals })
  return realTokenBalance

  function toNumber(bn){
    return parseInt(bn.toString(16), 16)
  }

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
  Object.entries(obj)
    .sort(sortByProp(0))
    .forEach(([key, val]) => fn(key, val))
}

function sortByProp (key) {
  return (a, b) => a[key] > b[key] ? 1 : -1
}

function numberWithCommas(num) {
  if (typeof num === 'number') num = num.toFixed(2)
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
