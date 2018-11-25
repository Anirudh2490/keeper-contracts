/* global artifacts, assert, contract, describe, it */
/* eslint-disable no-console, max-len */

const OceanToken = artifacts.require('OceanToken.sol')
const OceanMarket = artifacts.require('OceanMarket.sol')
const ServiceAgreement = artifacts.require('ServiceAgreement.sol')
const AccessConditions = artifacts.require('AccessConditions.sol')
const OceanReward = artifacts.require('OceanReward.sol')

const EthEcies = require('eth-ecies')
const EthCrypto = require('eth-crypto')
const EthjsUtil = require('ethereumjs-util')
const ethers = require('ethers')
const BigNumber = require('bignumber.js')
const utils = require('./utils.js')

const web3 = utils.getWeb3()

function wait(ms) {
    const start = new Date().getTime()
    let end = start
    while (end < start + ms) {
        end = new Date().getTime()
    }
}

contract('OceanToken', (accounts) => {
    describe('Test Block Reward', () => {
        it('Should fulfill access SA', async () => {
          let publisher = accounts[0]
          const datascientist = accounts[1]
          let funcFingerPrints, contracts, serviceAgreementId, slaMsgHash, signature, algorithmHash

          const token = await OceanToken.deployed()
          const reward = await OceanReward.deployed()
          const market = await OceanMarket.deployed(token.address)
          const serviceAgreement = await ServiceAgreement.deployed()
          const accessConditions = await AccessConditions.deployed(serviceAgreement.address)
          await market.requestTokens(utils.toBigNumber(1000), { from: datascientist })

          // for more info about the Compute use case dependencyBits: https://github.com/oceanprotocol/dev-ocean/pull/85
          const fulfillmentIndices = [0] // Root Conditions
          const fulfilmentOperator = 0 // OR
          const dependencies = [0]
          const timeouts = [0]
          let did = utils.generateId(web3)
          let serviceTemplateId = utils.generateId(web3)
          serviceAgreementId = utils.generateId(web3)
          let algorithm = 'THIS IS FAKE CODE foo=Hello World!'

          contracts = [accessConditions.address]
          funcFingerPrints = [
              utils.getSelector(web3, accessConditions, 'grantAccess'),
          ]
          valuesHashList = [
              utils.valueHash(['bytes32', 'bytes32'], [did, did]),
          ]
          // create new on-premise compute template
          let createAgreementTemplate = await serviceAgreement.setupAgreementTemplate(
              serviceTemplateId, contracts, funcFingerPrints, dependencies,
              web3.utils.fromAscii('access-data-commons'), fulfillmentIndices,
              fulfilmentOperator, { from: publisher }
          )
          templateId = utils.getEventArgsFromTx(createAgreementTemplate, 'SetupAgreementTemplate').serviceTemplateId
          // create new agreement instance


          conditionKeys = utils.generateConditionsKeys(templateId, contracts, funcFingerPrints)
          slaMsgHash = utils.createSLAHash(web3, templateId, conditionKeys, valuesHashList, timeouts, serviceAgreementId)
          signature = await web3.eth.sign(slaMsgHash, datascientist)

          // first SA fulfillment
          serviceId = await utils.signAgreement(
              serviceAgreement, templateId, signature,
              datascientist, valuesHashList, timeouts,
              serviceAgreementId, did, { from: publisher }
          )
          assert.strictEqual(serviceId, serviceAgreementId, 'Error: unable to retrieve service agreement Id')

          await accessConditions.grantAccess(serviceAgreementId, did, did, { from: publisher })
          const fulfillAccessConditionState = await serviceAgreement.getConditionStatus(serviceAgreementId, conditionKeys[0])

          await serviceAgreement.fulfillAgreement(serviceAgreementId, { from: publisher })
          console.log(`[1] ${publisher} fulfills service agreement ${serviceAgreementId}`)
          const agreementTerminated = await serviceAgreement.isAgreementTerminated(serviceAgreementId, { from: publisher })

          // second SA fulfillment
          publisher = accounts[2]

          did = utils.generateId(web3)
          serviceTemplateId = utils.generateId(web3)
          serviceAgreementId = utils.generateId(web3)

          contracts = [accessConditions.address]
          funcFingerPrints = [
              utils.getSelector(web3, accessConditions, 'grantAccess'),
          ]
          valuesHashList = [
              utils.valueHash(['bytes32', 'bytes32'], [did, did]),
          ]

          createAgreementTemplate = await serviceAgreement.setupAgreementTemplate(
              serviceTemplateId, contracts, funcFingerPrints, dependencies,
              web3.utils.fromAscii('access-data-commons'), fulfillmentIndices,
              fulfilmentOperator, { from: publisher }
          )
          templateId = utils.getEventArgsFromTx(createAgreementTemplate, 'SetupAgreementTemplate').serviceTemplateId
          // create new agreement instance
          conditionKeys = utils.generateConditionsKeys(templateId, contracts, funcFingerPrints)
          slaMsgHash = utils.createSLAHash(web3, templateId, conditionKeys, valuesHashList, timeouts, serviceAgreementId)
          signature = await web3.eth.sign(slaMsgHash, datascientist)
          serviceId = await utils.signAgreement(
              serviceAgreement, templateId, signature,
              datascientist, valuesHashList, timeouts,
              serviceAgreementId, did, { from: publisher }
          )
          assert.strictEqual(serviceId, serviceAgreementId, 'Error: unable to retrieve service agreement Id')

          await accessConditions.grantAccess(serviceAgreementId, did, did, { from: publisher })
          await serviceAgreement.getConditionStatus(serviceAgreementId, conditionKeys[0])

          await serviceAgreement.fulfillAgreement(serviceAgreementId, { from: publisher })
          console.log(`[2] ${publisher} fulfills service agreement ${serviceAgreementId}`)
          await serviceAgreement.isAgreementTerminated(serviceAgreementId, { from: publisher })


          // third  SA fulfillment
          publisher = accounts[3]

          did = utils.generateId(web3)
          serviceTemplateId = utils.generateId(web3)
          serviceAgreementId = utils.generateId(web3)

          contracts = [accessConditions.address]
          funcFingerPrints = [
              utils.getSelector(web3, accessConditions, 'grantAccess'),
          ]
          valuesHashList = [
              utils.valueHash(['bytes32', 'bytes32'], [did, did]),
          ]

          createAgreementTemplate = await serviceAgreement.setupAgreementTemplate(
              serviceTemplateId, contracts, funcFingerPrints, dependencies,
              web3.utils.fromAscii('access-data-commons'), fulfillmentIndices,
              fulfilmentOperator, { from: publisher }
          )
          templateId = utils.getEventArgsFromTx(createAgreementTemplate, 'SetupAgreementTemplate').serviceTemplateId
          // create new agreement instance
          conditionKeys = utils.generateConditionsKeys(templateId, contracts, funcFingerPrints)
          slaMsgHash = utils.createSLAHash(web3, templateId, conditionKeys, valuesHashList, timeouts, serviceAgreementId)
          signature = await web3.eth.sign(slaMsgHash, datascientist)
          serviceId = await utils.signAgreement(
              serviceAgreement, templateId, signature,
              datascientist, valuesHashList, timeouts,
              serviceAgreementId, did, { from: publisher }
          )
          assert.strictEqual(serviceId, serviceAgreementId, 'Error: unable to retrieve service agreement Id')

          await accessConditions.grantAccess(serviceAgreementId, did, did, { from: publisher })
          await serviceAgreement.getConditionStatus(serviceAgreementId, conditionKeys[0])

          await serviceAgreement.fulfillAgreement(serviceAgreementId, { from: publisher })
          console.log(`[3] ${publisher} fulfills service agreement ${serviceAgreementId}`)
          await serviceAgreement.isAgreementTerminated(serviceAgreementId, { from: publisher })

          console.log('')
          // print out array of providers who fulfill SA
          let array = await serviceAgreement.getCandidateList({ from: publisher })
            console.log(`providers with lottery ticket:=`)
            console.log(array)

          console.log(``)
          const scale = 10 ** 18
          // mint tokens
          for (i = 0; i < 30; i++) {
            let receipt = await token.mintTokens({ from: accounts[0] })
          }

          let amount = await reward.getRewardAmount.call({ from: accounts[0] })
          let blocknumber = await web3.eth.getBlockNumber()
          console.log(`block ${blocknumber} reward pool has := ${amount / scale } Ocean tokens now.`)

          // send reward tokens to randomly picked winner
          await reward.rewardWinner({ from: accounts[0] })
          // print reward info
          let winner = await reward.getWinner({ from: publisher });
          console.log(`winner of token reward is:= ${winner}`)
          const bal = await token.balanceOf.call(winner)
          console.log(`winner has token balance := ${bal.valueOf() / scale} now`)


        })
    })

/*
        it('Should mint tokens as scheduled', async () => {
          const token = await OceanToken.deployed()
          const market = await OceanMarket.deployed()
          const scale = 10 ** 18

          for (i = 0; i < 100; i++) {
            // mint tokens
            let minted = false
            let receipt = await token.mintTokens({ from: accounts[0] })
            if(receipt.logs.length == 2){
              minted = receipt.logs[1].args._status
            }
            // query reward token balance
            let reward = await token.getRewardAmount.call({ from: accounts[0] })
            let blocknumber = await web3.eth.getBlockNumber()
            if( i == 0 || minted == true) {
              console.log(`block ${blocknumber} reward := ${reward / scale } Ocean tokens now.`)
            }
          }
        })
    })

*/


})
