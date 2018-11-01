/* global artifacts, assert, contract, describe, it */
/* eslint-disable no-console, max-len */

const OCNToken = artifacts.require('OCNToken.sol')
const Market = artifacts.require('Market.sol')
const Jwt = artifacts.require('Jwt.sol')

const ursa = require('ursa')
const ethers = require('ethers')
const BigNumber = require('bignumber.js')
const Web3 = require('web3')

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))

contract('Jwt', (accounts) => {
    describe('Test On-chain Authorization', () => {
        // support upto 50 assets and providers; each asset has one single provider at this time
        it('Should walk through Authorization Process', async () => {
            // const marketPlace = await Market.deployed();
            const token = await OCNToken.deployed()
            const market = await Market.deployed()
            const auth = await Jwt.deployed()
            const scale = 10 ** 18

            const str = 'resource'
            const resourceId = await market.generateId(str, { from: accounts[0] })
            const resourcePrice = 100 * scale
            // 1. provider register dataset
            await market.register(resourceId, new BigNumber(resourcePrice), { from: accounts[0] })
            console.log('publisher registers asset with id = ', resourceId)

            // consumer accounts[1] request initial funds to play
            console.log(accounts[1])
            await market.requestTokens(new BigNumber(1000 * scale), { from: accounts[1] })
            const bal = await token.balanceOf.call(accounts[1])
            console.log(`consumer has balance := ${bal.valueOf() / scale} now`)
            // consumer approve market to withdraw amount of token from his account
            await token.approve(market.address, new BigNumber(200 * scale), { from: accounts[1] })

            // 2. consumer initiate an access request
            const modulusBit = 512
            const key = ursa.generatePrivateKey(modulusBit, 65537)
            const privatePem = ursa.createPrivateKey(key.toPrivatePem())
            const publicPem = ursa.createPublicKey(key.toPublicPem())
            // convert public key into string so that to store on-chain
            const publicKey = publicPem.toPublicPem('utf8')
            console.log('public key is: = ', publicKey)

            const initiateAccessRequestTx = await auth.initiateAccessRequest(resourceId, accounts[0], publicKey, 9999999999, { from: accounts[1] })

            const accessId = initiateAccessRequestTx.logs.filter((log) => {
                return log.event === 'AccessConsentRequested'
            })[0].args._id

            console.log('consumer creates an access request with id : ', accessId)

            // 3. provider commit the request
            await auth.commitAccessRequest(accessId, true, 9999999999, 'discovery', 'read', 'slaLink', 'slaType', { from: accounts[0] })
            console.log('provider has committed the order')

            // 4. consumer make payment
            const bal1 = await token.balanceOf.call(market.address)
            console.log(`market has balance := ${bal1.valueOf() / scale} before payment`)
            await market.sendPayment(accessId, accounts[0], 100 * scale, 9999999999, { from: accounts[1] })
            const bal2 = await token.balanceOf.call(market.address)
            console.log(`market has balance := ${bal2.valueOf() / scale} after payment`)
            console.log('consumer has paid the order')

            // 5. provider delivery the encrypted JWT token
            const OnChainPubKey = await auth.getTempPubKey(accessId, { from: accounts[0] })
            // console.log('provider Retrieve the temp public key:', OnChainPubKey)
            assert.strictEqual(publicKey, OnChainPubKey, 'two public keys should match.')

            const getPubKeyPem = ursa.coerceKey(OnChainPubKey)
            const encJWT = getPubKeyPem.encrypt('eyJhbGciOiJIUzI1', 'utf8', 'hex')
            console.log('encJWT: ', `0x${encJWT}`)
            // check status

            await auth.deliverAccessToken(accessId, `0x${encJWT}`, { from: accounts[0] })
            console.log('provider has delivered the encrypted JWT to on-chain')

            // 4. consumer download the encrypted token and decrypt
            const onChainencToken = await auth.getEncryptedAccessToken(accessId, { from: accounts[1] })
            const decryptJWT = privatePem.decrypt(onChainencToken.slice(2), 'hex', 'utf8') // remove '0x' prefix
            console.log('consumer decrypts JWT token off-chain :', decryptJWT.toString())
            assert.strictEqual(decryptJWT.toString(), 'eyJhbGciOiJIUzI1', 'two public keys should match.')

            // 5. consumer sign the encypted JWT token using private key
            // const signature = web3.eth.sign(accounts[1], '0x' + Buffer.from(onChainencToken).toString('hex'))
            const prefix = '0x'
            const hexString = Buffer.from(onChainencToken).toString('hex')
            const signature = await web3.eth.sign(`${prefix}${hexString}`, accounts[1])
            console.log('consumer signature: ', signature)

            const sig = ethers.utils.splitSignature(signature)

            const fixedMsg = `\x19Ethereum Signed Message:\n${onChainencToken.length}${onChainencToken}`
            const fixedMsgSha = web3.utils.sha3(fixedMsg)
            console.log('signed message from consumer to be validated: ', fixedMsg)

            const res = await auth.verifySignature(accounts[1], fixedMsgSha, sig.v, sig.r, sig.s, { from: accounts[0] })
            console.log('validate the signature comes from consumer? isSigned: ', res)

            // 6. provider send the signed encypted JWT to ACL contract for verification (verify delivery of token)
            // it shall release the payment to provider automatically
            await auth.verifyAccessTokenDelivery(accessId, accounts[1], fixedMsgSha, sig.v, sig.r, sig.s, { from: accounts[0] })
            console.log('provider verify the delivery and request payment')

            // check balance
            const pbal = await token.balanceOf.call(accounts[0])
            console.log(`provider has balance := ${pbal.valueOf() / scale} now`)

            const mbal = await token.balanceOf.call(market.address)
            console.log(`market has balance := ${mbal.valueOf() / scale} now`)
        })
    })
})
