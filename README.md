### eth-scrooge

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
├─ Golem: 1.12786
├─ Augur REP: 73.4113
├─ OmiseGo: 20.4293
├─ ETH: 999.785
├─ DGD: 189.55
├─ Pluton: 28.5945
├─ RChain RHOC: 2.07734
├─ SwarmCity: 4.56053
└─ Storj: 2.47611

asset holdings (USD):
├─ Ethpool_2
│  ├─ OmiseGo: 395.7775826260477
│  └─ ETH: 241405.77816506397
└─ Nanopool
   ├─ OmiseGo: 9771.581257906182
   └─ ETH: 11091722.666526875

total usd: 11343295.80
total usd: 11,343,295.80
```