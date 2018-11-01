[![banner](https://raw.githubusercontent.com/oceanprotocol/art/master/github/repo-banner%402x.png)](https://oceanprotocol.com)

# keeper-contracts

> 💧 Integration of TCRs, CPM and Ocean Tokens in Solidity
> [oceanprotocol.com](https://oceanprotocol.com)

| Dockerhub | TravisCI | Ascribe | Greenkeeper |
|-----------|----------|---------|-------------|
|[![Docker Build Status](https://img.shields.io/docker/build/oceanprotocol/keeper-contracts.svg)](https://hub.docker.com/r/oceanprotocol/keeper-contracts/)|[![Build Status](https://api.travis-ci.com/oceanprotocol/keeper-contracts.svg?branch=master)](https://travis-ci.com/oceanprotocol/keeper-contracts)|[![js ascribe](https://img.shields.io/badge/js-ascribe-39BA91.svg)](https://github.com/ascribe/javascript)|[![Greenkeeper badge](https://badges.greenkeeper.io/oceanprotocol/keeper-contracts.svg)](https://greenkeeper.io/)|

---

**🐲🦑 THERE BE DRAGONS AND SQUIDS. This is in alpha state and you can expect running into problems. If you run into them, please open up [a new issue](https://github.com/oceanprotocol/keeper-contracts/issues). 🦑🐲**

---

Ocean Keeper implementation where we put the following modules together:

* **TCRs**: users create challenges and resolve them through voting to maintain registries;
* **Ocean Tokens**: the intrinsic tokens circulated inside Ocean network, which is used in the voting of TCRs;
* **Marketplace**: the core marketplace where people can transact with each other with Ocean tokens.

## Table of Contents

  - [Get Started](#get-started)
     - [Docker](#docker)
     - [Local development](#local-development)
     - [Testnet deployment](#testnet-deployment)
  - [Libraries](#libraries)
  - [Testing](#testing)
     - [Code Linting](#code-linting)
  - [Documentation](#documentation)
     - [Use Case 1: Register data asset](#use-case-1-register-data-asset)
     - [Use Case 2: Authorize access with OceanAuth contract](#use-case-2-authorize-access-with-oceanauth-contract)
  - [New version](#version)
  - [Contributing](#contributing)
  - [Prior Art](#prior-art)
  - [License](#license)

---

## Get Started

For local developmenty you can either use Docker, or setup the development environment on your machine.

### Docker

The most simple way to get started is with Docker:

```bash
git clone git@github.com:oceanprotocol/keeper-contracts.git
cd keeper-contracts/

docker build -t oceanprotocol/keeper-contracts:0.1 .
docker run -d -p 8545:8545 oceanprotocol/keeper-contracts:0.1
```

or simply pull it from docker hub:

```bash
docker pull oceanprotocol/keeper-contracts
docker run -d -p 8545:8545 oceanprotocol/keeper-contracts 
```

Which will expose the Ethereum RPC client with all contracts loaded under localhost:8545, which you can add to your `truffle.js`:

```js
module.exports = {
    networks: {
        development: {
            host: 'localhost',
            port: 8545,
            network_id: '*',
            gas: 6000000
        },
    }
}
```

### Local development

As a pre-requisite, you need:

- Node.js >=6, <=v9 (because of ursa, see https://github.com/JoshKaufman/ursa/issues/175)
- npm

Clone the project and install all dependencies:

```bash
git clone git@github.com:oceanprotocol/keeper-contracts.git
cd keeper-contracts/

# install dependencies
npm i

# install RPC client globally
npm install -g ganache-cli
```

Compile the solidity contracts:

```bash
npm run compile
```

In a new terminal, launch an Ethereum RPC client, e.g. [ganache-cli](https://github.com/trufflesuite/ganache-cli):

```bash
ganache-cli
```

Switch back to your other terminal and deploy the contracts:

```bash
npm run migrate

# for redeployment run this instead
npm run migrate -- --reset
```

### Testnet deployment

Follow the steps for local deployment. Make sure that the address [0x2c0d5f47374b130ee398f4c34dbe8168824a8616](https://kovan.etherscan.io/address/0x2c0d5f47374b130ee398f4c34dbe8168824a8616) is having enough (~1) Ether.

If you managed to deploy the contracts locally do:

```bash
export INFURA_TOKEN=<your infura token>
export KOVAN_NMEMORIC=<your kovan nmemoric>
npm run migrate:kovan
```

The transaction should show up on: `https://kovan.etherscan.io/address/0x2c0d5f47374b130ee398f4c34dbe8168824a8616`

The contract addresses deployed on Kovan testnet:

| Contract      | Address                                      |
|---------------|----------------------------------------------|
| OceanAuth     | `0xfA65f2662224Dd340a2dea0972E70BA450E94e3C` |
| OceanDispute  | `0x6071e51DB7a3CCc81e0ae1D05908c6F958a59f5B` |
| OceanExchange | `0x018F8A880A11f8c7Ec4112D9CA20D9256e7d64CD` |
| OceanMarket   | `0xb8277FC2A46C11235775BEC194BD8C12ed92343C` |
| OceanRegistry | `0xD9Ca6e9aD36E70A0a2A995a7BDD02017459dD45b` |
| OceanToken    | `0x656f2Ab5D4C4bC2D5821fd959B083fd50273C2f1` |


## Libraries

To facilitate the integration of the Ocean Keeper Smart Contracts, Python and Javascript libraries are ready to be integrated. Those libraries include the Smart Contract ABI's.
Using these libraries helps to avoid compiling the Smart Contracts and copying the ABI's manually to your project. In that way the integration is cleaner and easier.
The libraries provided currently are:

* JavaScript npm package - As part of the [@oceanprotocol npm organization](https://www.npmjs.com/settings/oceanprotocol/packages), the [npm keeper-contracts package](https://www.npmjs.com/package/@oceanprotocol/keeper-contracts) provides the ABI's to be imported from your JavaScript code.
* Python Pypi package - The [Pypi keeper-contracts package](https://pypi.org/project/keeper-contracts/) provides the same ABI's to be used from Python.
* Java Maven package - It's possible to generate the maven stubs to interact with the smart contracts. It's necessary to have locally web3j and run the `scripts/maven.sh` script

## Testing

Run tests with `npm test`, e.g.:

```bash
npm test -- test/Auth.Test.js
```

### Code Linting

Linting is setup for JavaScript with [ESLint](https://eslint.org) & Solidity with [Solium](https://github.com/duaraghav8/Solium).

Code style is enforced through the CI test process, builds will fail if there're any linting errors.

## Documentation

* [**Main Documentation: TCR, Market and Ocean Tokens**](doc/)
* [Architecture (pdf)](doc/files/Smart-Contract-UML-class-diagram.pdf)
* [Packaging of libraries](docs/packaging.md)

### Use Case 1: Register data asset

```Javascript
const Market = artifacts.require('OceanMarket.sol')
...
// get instance of OceanMarket contract
const market = await Market.deployed()
...
// generate resource id
const name = 'resource name'
const resourceId = await market.generateId(name, { from: accounts[0] })
const resourcePrice = 100

// register data asset on-chain
await market.register(resourceId, resourcePrice, { from: accounts[0] })
```

### Use Case 2: Authorize access with OceanAuth contract

Here is an example of authorization process with OceanAuth contract.

`accounts[0]` is provider and `accounts[1]` is consumer.

Note that different cryptographic algorithms can be chosen to encrypt and decrypt access token using key pairs (i.e., public key and private key). This example uses [URSA](https://www.npmjs.com/package/ursa) to demonstrate the process for illustration purpose.

```Javascript
const Token = artifacts.require('OceanToken.sol')
const Market = artifacts.require('OceanMarket.sol')
const Auth = artifacts.require('OceanAuth.sol')
...
const ursa = require('ursa')
const ethers = require('ethers')
const Web3 = require('web3')
...
// get instances of deployed contracts
const token = await Token.deployed()
const market = await Market.deployed()
const auth = await Auth.deployed()
...
// consumer request some testing tokens to buy data asset
await market.requestTokens(200, { from: accounts[1] })
// consumers approve withdraw limit of their funds
await token.approve(market.address, 200, { from: accounts[1] })
...
// consumer generates temporary key pairs in local
const modulusBit = 512
const key = ursa.generatePrivateKey(modulusBit, 65537)
const privatePem = ursa.createPrivateKey(key.toPrivatePem())
const publicPem = ursa.createPublicKey(key.toPublicPem())
const publicKey = publicPem.toPublicPem('utf8')
...
// consumer initiate a new access request and pass public key
await auth.initiateAccessRequest(resourceId, accounts[0], publicKey, expireTime, { from: accounts[1] })
// provider commit the access request
await auth.commitAccessRequest(accessId, true, expireTime, '', '', '', '', { from: accounts[0] })
...
// consumer sends the payment to OceanMarket contract
await market.sendPayment(accessId, accounts[0], price, expireTime, { from: accounts[1] })
...
// provider encrypt "JSON Web Token" (JWT) using consumer's temp public key
const encJWT = getPubKeyPem.encrypt('JWT', 'utf8', 'hex')
// provider delivers the encrypted JWT on-chain
await auth.deliverAccessToken(accessId, `0x${encJWT}`, { from: accounts[0] })
...
// consumer generate signature of encrypte JWT and send to provider
const prefix = '0x'
const hexString = Buffer.from(onChainencToken).toString('hex')
const signature = web3.eth.sign(accounts[1], `${prefix}${hexString}`)
...
// provider verify the signature from consumer to prove delivery of access token
const sig = ethers.utils.splitSignature(signature)
const fixedMsg = `\x19Ethereum Signed Message:\n${onChainencToken.length}${onChainencToken}`
const fixedMsgSha = web3.sha3(fixedMsg)
await auth.verifyAccessTokenDelivery(accessId, accounts[1], fixedMsgSha, sig.v, sig.r, sig.s, { from: accounts[0] })
```

## New Version

The `bumpversion.sh` script helps to bump the project version. You can execute the script using as first argument {major|minor|patch} to bump accordingly the version. Also you can provide the option `--tag` to automatically create the version tag.

## Contributing

We use GitHub as a means for maintaining and tracking issues and source code development.

If you would like to contribute, please fork this repository, do work in a feature branch, and finally open a pull request for maintainers to review your changes.

Ocean Protocol uses [C4 Standard process](https://github.com/unprotocols/rfc/blob/master/1/README.md) to manage changes in the source code.  Find here more details about [Ocean C4 OEP](https://github.com/oceanprotocol/OEPs/tree/master/1).

## Prior Art

This project builds on top of the work done in open source projects:

- [ConsenSys/PLCRVoting](https://github.com/ConsenSys/PLCRVoting)
- [skmgoldin/tcr](https://github.com/skmgoldin/tcr)
- [OpenZeppelin/openzeppelin-solidity](https://github.com/OpenZeppelin/openzeppelin-solidity)


## License

```
Copyright 2018 Ocean Protocol Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
