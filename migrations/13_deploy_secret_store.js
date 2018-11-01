/* global artifacts */
const ServiceAgreement = artifacts.require('ServiceAgreement.sol')
const SecretStore = artifacts.require('SecretStore.sol')
const { saveDefinition } = require('./helper')

const serviceAgreement = async (deployer, network) => {
    await deployer.deploy(SecretStore, ServiceAgreement.address)

    saveDefinition(network, SecretStore)
}

module.exports = serviceAgreement
