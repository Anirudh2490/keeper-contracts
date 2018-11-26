/* global artifacts, contract, describe, it */
/* eslint-disable no-console, max-len */

const OceanToken = artifacts.require('OceanToken.sol')
const OceanMarket = artifacts.require('OceanMarket.sol')
// const ServiceAgreement = artifacts.require('ServiceAgreement.sol')
// const AccessConditions = artifacts.require('AccessConditions.sol')
const OceanReward = artifacts.require('OceanReward.sol')

const utils = require('./utils.js')

const web3 = utils.getWeb3()

contract('OceanReward', (accounts) => {
    describe('Test Block Reward', () => {
        it('Should reward based on validation', async () => {
            const token = await OceanToken.deployed()
            const reward = await OceanReward.deployed()
            const market = await OceanMarket.deployed(token.address)
            const scale = 10 ** 18

            // request initial fund
            await market.requestTokens(0, { from: accounts[0] })
            let bal0 = await token.balanceOf.call(accounts[0])
            await token.approve(reward.address, bal0, { from: accounts[0] })

            await market.requestTokens(0, { from: accounts[1] })
            let bal1 = await token.balanceOf.call(accounts[1])
            await token.approve(reward.address, bal1, { from: accounts[1] })

            await market.requestTokens(0, { from: accounts[2] })
            let bal2 = await token.balanceOf.call(accounts[2])
            await token.approve(reward.address, bal2, { from: accounts[2] })

            await market.requestTokens(0, { from: accounts[3] })
            let bal3 = await token.balanceOf.call(accounts[3])
            await token.approve(reward.address, bal3, { from: accounts[3] })

            await market.requestTokens(0, { from: accounts[5] })
            let bal5 = await token.balanceOf.call(accounts[5])
            await token.approve(reward.address, bal5, { from: accounts[5] })

            console.log(`----- first submission ------- `)
            // create first submission
            let submissionHash = utils.generateId(web3)
            let dataHash = utils.generateId(web3)
            let modelHash = utils.generateId(web3)
            // when amount == 0, default stake amount is 100 tokens
            await reward.submit(submissionHash, dataHash, modelHash, 0, { from: accounts[0] })
            console.log(`explorer submits:`)
            console.log(`\t dataset ${dataHash}`)
            console.log(`\t model ${modelHash}`)
            console.log(`\t submission hash = ${submissionHash}.`)
            console.log(`\t stake = 100 tokens.`)

            console.log(``)
            await reward.registVerifier(submissionHash, { from: accounts[1] })
            await reward.registVerifier(submissionHash, { from: accounts[2] })
            await reward.registVerifier(submissionHash, { from: accounts[3] })
            console.log(`user 1, 2, 3 regist as verifiers for this submission`)

            // when amount == 0, default stake amount is 100 tokens
            await reward.submitVote(submissionHash, false, 0, { from: accounts[1] })
            await reward.submitVote(submissionHash, true, 0, { from: accounts[2] })
            await reward.submitVote(submissionHash, true, 0, { from: accounts[3] })
            console.log(`user 1, 2, 3 submit votes (false, true, true) with 100 tokens as stakes`)

            await reward.resolve(submissionHash, { from: accounts[0] })
            console.log(`resolve the voting for this submission`)

            await reward.handleStakes(submissionHash, { from: accounts[0] })
            console.log(`process stakes for this submission`)

            // create second submission
            console.log(`----- second submission ------- `)
            submissionHash = utils.generateId(web3)
            dataHash = utils.generateId(web3)
            modelHash = utils.generateId(web3)
            await reward.submit(submissionHash, dataHash, modelHash, 0, { from: accounts[5] })
            console.log(`explorer submits:`)
            console.log(`\t dataset ${dataHash}`)
            console.log(`\t model ${modelHash}`)
            console.log(`\t submission hash = ${submissionHash}.`)
            console.log(`\t stake = 100 tokens.`)

            console.log(``)
            await reward.registVerifier(submissionHash, { from: accounts[1] })
            await reward.registVerifier(submissionHash, { from: accounts[2] })
            await reward.registVerifier(submissionHash, { from: accounts[3] })
            console.log(`user 1, 2, 3 regist as verifiers for this submission`)

            await reward.submitVote(submissionHash, true, 0, { from: accounts[1] })
            await reward.submitVote(submissionHash, true, 0, { from: accounts[2] })
            await reward.submitVote(submissionHash, false, 0, { from: accounts[3] })
            console.log(`user 1, 2, 3 submit votes (true, true, false) with 100 tokens as stakes`)

            await reward.resolve(submissionHash, { from: accounts[5] })
            console.log(`resolve the voting for this submission`)

            await reward.handleStakes(submissionHash, { from: accounts[5] })
            console.log(`process stakes for this submission`)

            console.log(``)
            console.log(`----- distribute reward tokens ------- `)
            // print candidate list
            let array = await reward.getCandidateList({ from: accounts[0] })
            console.log(`explorer with lottery ticket:=`)
            console.log(array)

            // mint tokens
            let i = 0
            for (i = 0; i < 30; i++) {
                await token.mintTokens({ from: accounts[0] })
            }

            let amount = await reward.getRewardAmount.call({ from: accounts[0] })
            let blocknumber = await web3.eth.getBlockNumber()
            console.log(`block ${blocknumber} reward pool has := ${amount.valueOf() / scale} Ocean tokens now.`)

            await reward.sendRewards({ from: accounts[0] })
            console.log(`successfully send rewards`)
            // print reward info
            let winner = await reward.getWinnerAmount({ from: accounts[0] })
            console.log(`winner of token reward is:= ${winner[0]} and amount := ${winner[1] / scale}`)
            const bal = await token.balanceOf.call(winner[0])
            console.log(`winner has token balance := ${bal / scale} now`)

            bal1 = await token.balanceOf.call(accounts[1])
            console.log(`voter 1 has ${bal1.valueOf() / scale} tokens.`)

            bal1 = await token.balanceOf.call(accounts[2])
            console.log(`voter 2 has ${bal1.valueOf() / scale} tokens.`)

            bal1 = await token.balanceOf.call(accounts[3])
            console.log(`voter 3 has ${bal1.valueOf() / scale} tokens.`)
        })
    })
    /*
        // test distribution of network rewards based on SA fulfillment
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

      // Only test mining tokens
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
