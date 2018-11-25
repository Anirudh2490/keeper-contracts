/* global artifacts */
const OceanToken = artifacts.require('OceanToken.sol')
const ServiceAgreement = artifacts.require('ServiceAgreement.sol')
const OceanReward = artifacts.require('OceanReward.sol')
const { saveDefinition } = require('./helper')

const oceanReward = async (deployer, network) => {
    const tokenAddress = OceanToken.address
    const saAddress = ServiceAgreement.address

    await deployer.deploy(
        OceanReward,
        tokenAddress,
        saAddress
    )

    saveDefinition(network, OceanReward)
}

module.exports = oceanReward
