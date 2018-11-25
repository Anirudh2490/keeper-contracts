/* global artifacts, contract, before, describe, it */
/* eslint-disable no-console, max-len */

const OceanToken = artifacts.require('OceanToken.sol')
const OceanMarket = artifacts.require('OceanMarket.sol')
const SLA = artifacts.require('ServiceAgreement.sol')
const PaymentCtrl = artifacts.require('PaymentConditions.sol')
const AccessCtrl = artifacts.require('AccessConditions.sol')
const testUtils = require('./utils')

const web3 = testUtils.getWeb3()

contract('ServiceAgreement', (accounts) => {
    describe('Test On-chain Authorization', () => {
        let token, market, sla, paymentConditions, accessConditions, resourceId, valuesHashList, serviceId, conditionKeys, templateId

        let funcFingerPrints, contracts
        const provider = accounts[0]
        const consumer = accounts[1]
        const fromProvider = { from: provider }
        const fromConsumer = { from: consumer }
        const resourcePrice = 3
        const resourceName = 'self-driving ai data'
        const serviceName = resourceName
        let timeouts = [0, 0, 0, 3]
        const fulfillmentIndices = [0] // Root Condition
        const fulfilmentOperator = 0 // AND
        const dependencies = [0, 1, 4, 1 | 2 ** 2 | 2 ** 3] // dependency bit | timeout bit
        const did = '0x319d158c3a5d81d15b0160cf8929916089218bdb4aa78c3ecd16633afd44b8ae'
        const serviceTemplateId = '0x419d158c3a5d81d15b0160cf8929916089218bdb4aa78c3ecd16633afd44b8ae'
        before(async () => {
            token = await OceanToken.new()
            // await token.setReceiver(consumer)
            market = await OceanMarket.new(token.address)
            sla = await SLA.new()
            paymentConditions = await PaymentCtrl.new(sla.address, token.address)
            accessConditions = await AccessCtrl.new(sla.address)
            // Do some preperations: give consumer funds, add an asset
            // consumer request initial funds to play
            console.log(consumer)
            await market.requestTokens(testUtils.toBigNumber(1000), fromConsumer)
            const bal = await token.balanceOf.call(consumer)
            console.log(`consumer has balance := ${bal.valueOf()} now`)
            resourceId = did
            console.log('publisher registers asset with id = ', resourceId)
            contracts = [paymentConditions.address, accessConditions.address, paymentConditions.address, paymentConditions.address]
            funcFingerPrints = [
                testUtils.getSelector(web3, paymentConditions, 'lockPayment'),
                testUtils.getSelector(web3, accessConditions, 'grantAccess'),
                testUtils.getSelector(web3, paymentConditions, 'releasePayment'),
                testUtils.getSelector(web3, paymentConditions, 'refundPayment')
            ]
            valuesHashList = [
                testUtils.valueHash(['bytes32', 'uint256'], [resourceId, resourcePrice]),
                testUtils.valueHash(['bytes32', 'bytes32'], [resourceId, resourceId]),
                testUtils.valueHash(['bytes32', 'uint256'], [resourceId, resourcePrice]),
                testUtils.valueHash(['bytes32', 'uint256'], [resourceId, resourcePrice])]
            console.log('conditions control contracts', contracts)
            console.log('functions: ', funcFingerPrints, valuesHashList)
            const setupTx = await sla.setupAgreementTemplate(
                serviceTemplateId, contracts, funcFingerPrints, dependencies,
                web3.utils.fromAscii(serviceName), fulfillmentIndices,
                fulfilmentOperator, fromProvider
            )
            // Grab `SetupAgreementTemplate` event to fetch the serviceTemplateId
            templateId = testUtils.getEventArgsFromTx(setupTx, 'SetupAgreementTemplate').serviceTemplateId

            // console.log('templateid: ', templateId)
            conditionKeys = testUtils.generateConditionsKeys(templateId, contracts, funcFingerPrints)
            console.log('conditions: ', conditionKeys)
        })

        it('Consume asset happy path', async () => {
            const serviceAgreementId = testUtils.generateId(web3)
            const slaMsgHash = testUtils.createSLAHash(
                web3, templateId, conditionKeys,
                valuesHashList, timeouts,
                serviceAgreementId
            )
            const signature = await web3.eth.sign(slaMsgHash, consumer)

            serviceId = await testUtils.signAgreement(
                sla, templateId, signature, consumer, valuesHashList, timeouts, serviceAgreementId, did, fromProvider
            )

            try {
                const fn = testUtils.getSelector(web3, accessConditions, 'checkPermissions')
                const invalidKey = testUtils.generateConditionsKeys(templateId, [accessConditions.address], [fn])[0]
                await sla.getConditionStatus(serviceId, invalidKey)
            } catch (error) {
                console.log('invalid condition status: ', error)
            }

            let locked = await sla.getConditionStatus(serviceId, conditionKeys[0])
            await token.approve(paymentConditions.address, testUtils.toBigNumber(200), fromConsumer)
            const payTx = await paymentConditions.lockPayment(serviceId, resourceId, resourcePrice, fromConsumer)
            console.log('lockpayment event: ', testUtils.getEventArgsFromTx(payTx, 'PaymentLocked').serviceId)

            locked = await sla.getConditionStatus(serviceId, conditionKeys[0])
            console.log('locked: ', locked.toNumber())
            const hasPermission = await accessConditions.checkPermissions(consumer, resourceId)
            console.log('consumer permission: ', hasPermission)
            // grant access
            const dep = await sla.hasUnfulfilledDependencies(serviceId, conditionKeys[1])
            console.log('has dependencies: ', dep)

            await sla.getConditionStatus(serviceId, conditionKeys[1])
            const gaccTx = await accessConditions.grantAccess(serviceId, resourceId, resourceId, fromProvider)
            console.log('accessgranted event: ', testUtils.getEventArgsFromTx(gaccTx, 'AccessGranted').serviceId)
            const hasPermission1 = await accessConditions.checkPermissions(consumer, resourceId)
            console.log('consumer permission: ', hasPermission1)
            await sla.getConditionStatus(serviceId, conditionKeys[1])

            // release payment
            await sla.getConditionStatus(serviceId, conditionKeys[2])
            const releaseTx = await paymentConditions.releasePayment(serviceId, resourceId, resourcePrice, fromProvider)
            console.log('releasepayment event: ', testUtils.getEventArgsFromTx(releaseTx, 'PaymentReleased').serviceId)
            await sla.getConditionStatus(serviceId, conditionKeys[2])

            try {
                await paymentConditions.refundPayment(serviceId, resourceId, resourcePrice, fromConsumer)
            } catch (err) {
                console.log('\t >> Good, refund is denied as expected.')
            }
        })

        it('Consume asset with Refund', async () => {
            const serviceAgreementId = testUtils.generateId(web3)
            const slaMsgHash = testUtils.createSLAHash(
                web3, templateId, conditionKeys,
                valuesHashList, timeouts,
                serviceAgreementId
            )
            const signature = await web3.eth.sign(slaMsgHash, consumer)

            serviceId = await testUtils.signAgreement(
                sla, templateId, signature, consumer, valuesHashList, timeouts, serviceAgreementId, did, fromProvider
            )
            try {
                await paymentConditions.refundPayment(serviceId, resourceId, resourcePrice, fromConsumer)
            } catch (err) {
                console.log('\t >> Good, refund is denied as expected since payment is not locked yet.')
            }

            await token.approve(paymentConditions.address, testUtils.toBigNumber(200), fromConsumer)
            const payTx = await paymentConditions.lockPayment(serviceId, resourceId, resourcePrice, fromConsumer)
            console.log('lockpayment event: ', testUtils.getEventArgsFromTx(payTx, 'PaymentLocked').serviceId)
            // Now refund should go through, after timeout
            await testUtils.sleep(4000)
            try {
                const refundTx = await paymentConditions.refundPayment(serviceId, resourceId, resourcePrice, fromConsumer)
                console.log('refundPayment event: ', testUtils.getEventArgsFromTx(refundTx, 'PaymentRefund').serviceId)
            } catch (err) {
                console.log('\t >> Error: refund is denied, this should not occur.', err.message)
            }
        })
    })
})
