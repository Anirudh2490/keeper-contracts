/* global artifacts */
const OceanToken = artifacts.require('OCNToken.sol')
const OceanMarket = artifacts.require('Market.sol')
const { saveDefinition } = require('./helper')

const oceanMarket = async (deployer, network) => {
    const tokenAddress = OceanToken.address

    await deployer.deploy(
        OceanMarket,
        tokenAddress
    )

    saveDefinition(network, OceanMarket)
}

module.exports = oceanMarket
