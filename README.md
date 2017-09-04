### eth-scrooge

[![Greenkeeper badge](https://badges.greenkeeper.io/kumavis/eth-scrooge.svg)](https://greenkeeper.io/)

cli tool for counting eth and token balances.

supported tokens are currently limited -- needs mapping to coinmarketcap name
feel free to PR in new tokens

### setup

add addresses of interest to the json file
```
cp accounts.json.example accounts.json
```

### start

```
npm start
```

### example output

example addresses shown here are mining pools

```
exchange rates:
├─ Golem: 0.287563
├─ DGD: 62.2028
├─ Augur REP: 20.9461
├─ MKR: 242.771
├─ SwarmCity: 1.6633
├─ Pluton: 10.4951
└─ ETH: 289.244

asset holdings (USD):
├─ hot 0x52bc
│  └─ ETH: 2271530.4062923593
└─ cold 0x4bb9
   └─ ETH: 69090.65305601721

total usd: 2,340,621.06
```