/* global assert, artifacts, contract, before, describe, it */

const AccessConditions = artifacts.require('SecretStore.sol')
const OceanToken = artifacts.require('OCNToken.sol')
const PaymentConditions = artifacts.require('Payments.sol')
const ServiceAgreement = artifacts.require('ServiceAgreement.sol')

const utils = require('./utils.js')

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))

contract('PaymentConditions', (accounts) => {
    describe('Tests payment conditions used in SLAs', () => {
        const consumer = accounts[0]

        let token

        let agreement
        let accessConditions
        let paymentConditions

        let templateId
        let signature
        let contracts
        let fingerprints
        let dependencies
        let hashes
        let DID
        let serviceDefinitionId

        const timeouts = [0, 0, 0]

        const walletAllowance = 1000

        const asset = web3.utils.fromAscii('my-asset')
        const price = 10

        var walletBalance = 0

        before(async () => {
            token = await OceanToken.new()

            await token.setReceiver(consumer)
            await token.approve(consumer, await token.totalSupply.call())

            agreement = await ServiceAgreement.new()

            paymentConditions = await PaymentConditions.new(
                agreement.address, token.address
            )
            await token.approve(paymentConditions.address, walletAllowance)

            // Setup an agreement template where lockPayment depends on grantAccess,
            // releasePayment depends on lockPayment.
            accessConditions = await AccessConditions.new(agreement.address)
            contracts = [
                accessConditions.address,
                paymentConditions.address,
                paymentConditions.address
            ]
            fingerprints = [
                utils.getSelector(web3, accessConditions, 'grantAccess'),
                utils.getSelector(web3, paymentConditions, 'lockPayment'),
                utils.getSelector(web3, paymentConditions, 'releasePayment')
            ]
            dependencies = [0, 1, 2]

            const result = await agreement.setupAgreementTemplate(
                contracts,
                fingerprints,
                dependencies,
                web3.utils.fromAscii('test-payment-conditions')
            )
            templateId = result.logs[3].args.serviceTemplateId

            const lockPaymentHash = utils.valueHash(['bytes32', 'uint256'], [asset, price])
            const releasePaymentHash = utils.valueHash(['bytes32', 'uint256'], [asset, price])
            const grantAccessHash = utils.valueHash(['bytes32', 'bytes32'], [asset, asset])

            DID = '0x315f158c3a5d81d15b0160cf8929916089218bdb4aa78c3ecd16633afd44b8ae'
            serviceDefinitionId = '0x515f158c3a5d81d15b0160cf8929916089218bdb4aa78c3ecd16633afd44b894'

            hashes = [grantAccessHash, lockPaymentHash, releasePaymentHash]

            const hash = utils.createSLAHash(
                web3, templateId,
                utils.generateConditionsKeys(templateId, contracts, fingerprints),
                hashes,
                timeouts,
                serviceDefinitionId,
                DID
            )

            signature = await web3.eth.sign(hash, consumer)
        })

        async function signAgreement() {
            const result = await agreement.executeAgreement(
                templateId,
                signature,
                consumer,
                hashes,
                timeouts,
                serviceDefinitionId,
                DID
            )

            return result.logs[3].args.serviceId
        }

        it('Rejects to lock payments if conditions are not met', async () => {
            const serviceId = await signAgreement()

            await paymentConditions.lockPayment(serviceId, asset, price)
            assert.strictEqual(
                0,
                web3.utils.toDecimal(await token.balanceOf.call(paymentConditions.address))
            )
        })

        it('Locks payment if conditions are met', async () => {
            const serviceId = await signAgreement()

            await accessConditions.grantAccess(
                serviceId,
                asset,
                asset
            )

            await paymentConditions.lockPayment(serviceId, asset, price)
            walletBalance += price
            assert.strictEqual(
                walletBalance,
                web3.utils.toDecimal(await token.balanceOf.call(paymentConditions.address))
            )
        })

        it('Does not lock twice', async () => {
            const serviceId = await signAgreement()

            await accessConditions.grantAccess(
                serviceId,
                asset,
                asset
            )

            await paymentConditions.lockPayment(serviceId, asset, price)
            walletBalance += price
            assert.strictEqual(
                walletBalance,
                web3.utils.toDecimal(await token.balanceOf.call(paymentConditions.address))
            )

            // Try to lock again, the balance must not change.
            await paymentConditions.lockPayment(serviceId, asset, price)
            assert.strictEqual(
                walletBalance,
                web3.utils.toDecimal(await token.balanceOf.call(paymentConditions.address))
            )
        })

        it('Rejects to release payment if conditions are not met', async () => {
            const serviceId = await signAgreement()

            await paymentConditions.releasePayment(serviceId, asset, price)
            assert.strictEqual(
                0,
                web3.utils.toDecimal(await token.balanceOf.call(agreement.address))
            )
        })

        it('Releases payment if conditions are met', async () => {
            const serviceId = await signAgreement()

            await accessConditions.grantAccess(
                serviceId,
                asset,
                asset
            )
            await paymentConditions.lockPayment(serviceId, asset, price)
            walletBalance += price

            await paymentConditions.releasePayment(serviceId, asset, price)
            walletBalance -= price
            assert.strictEqual(
                walletBalance,
                web3.utils.toDecimal(await token.balanceOf.call(paymentConditions.address))
            )
        })

        it('Does not release twice', async () => {
            const serviceId = await signAgreement()

            await accessConditions.grantAccess(
                serviceId,
                asset,
                asset
            )
            await paymentConditions.lockPayment(serviceId, asset, price)
            walletBalance += price

            await paymentConditions.releasePayment(serviceId, asset, price)
            walletBalance -= price
            assert.strictEqual(
                walletBalance,
                web3.utils.toDecimal(await token.balanceOf.call(paymentConditions.address))
            )

            // Try to release again, the balance must not change.
            await paymentConditions.releasePayment(serviceId, asset, price)
            assert.strictEqual(
                walletBalance,
                web3.utils.toDecimal(await token.balanceOf.call(paymentConditions.address))
            )
        })
    })
})
