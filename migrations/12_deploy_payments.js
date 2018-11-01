/* global artifacts */
const OCNToken = artifacts.require('OCNToken.sol')
const ServiceAgreement = artifacts.require('ServiceAgreement.sol')
const PaymentConditions = artifacts.require('Payments.sol')
const { saveDefinition } = require('./helper')

const serviceAgreement = async (deployer, network) => {
    await deployer.deploy(PaymentConditions, ServiceAgreement.address, OCNToken.address)

    saveDefinition(network, PaymentConditions)
}

module.exports = serviceAgreement
