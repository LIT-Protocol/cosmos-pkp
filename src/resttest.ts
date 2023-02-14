// steps
// 1. create transaction
// 2. sign transaction
// 3. broadcast transaction

const keplrMnemonicString = 'either control crazy lonely police foam swim replace salute snap quick harbor'
const keplrAddress = 'cosmos16a6zyjwyww6scfa44s9jekdwwjfjrpppajk9d0'

const pkpPublicKey = "0x04d7bd70bcd00939073ecccf4ddb7367293433425b80d9b16e07824c0856c8907ee0a6d118b8dd6d0b954a0848693d2f02fc48e4900b5114d07dc3fcc32936ee5b"
const pkpAddress = 'cosmos1ltk0lznn6gltsevh3v6z0ju8dxzuh5gatzh8f8'
const pkpAuthSig = {
  "sig": "0x9e750da7ca491309df16f2cc3d3c56d942a7bfaf4c9e1cfce780ca71a5ff49bd52a5de6cc6718ed45e66bd21e85445faaac7bfaf5e4b8b963c3204fabeb914711b",
  "derivedVia": "web3.eth.personal.sign",
  "signedMessage": "localhost:3000 wants you to sign in with your Ethereum account:\n0x570b99E2B9C5b61f18cA73e21891eB0aEdc51070\n\n\nURI: http://localhost:3000/\nVersion: 1\nChain ID: 80001\nNonce: w0Jb4Vc5RjFxq0lbU\nIssued At: 2023-02-07T23:21:38.020Z\nExpiration Time: 2023-02-14T23:21:38.006Z",
  "address": "0x570b99E2B9C5b61f18cA73e21891eB0aEdc51070"
}

const rpc = "rpc.sentry-01.theta-testnet.polypore.xyz:26657"

const unsignedTx = {
  "body": {
    "messages": [
      {
        "@type": "/cosmos.bank.v1beta1.MsgSend",
        "from_address": keplrAddress,
        "to_address": pkpAddress,
        "amount": [
          {
            "denom": "uatom",
            "amount": "100000"
          }
        ]
      }
    ],
    "memo": "",
    "timeout_height": "0",
    "extension_options": [],
    "non_critical_extension_options": []
  },
  "auth_info": {
    "signer_infos": [],
    "fee": {
      "amount": [
        {
          "denom": "uatom",
          "amount": "2000"
        }
      ],
      "gas_limit": "200000",
      "payer": "",
      "granter": ""
    }
  },
  "signatures": []
}