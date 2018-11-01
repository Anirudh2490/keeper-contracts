/* global artifacts */
const OCNToken = artifacts.require('OCNToken.sol')
const Market = artifacts.require('Market.sol')
const { saveDefinition } = require('./helper')

const market = async (deployer, network) => {
    const tokenAddress = OCNToken.address

    await deployer.deploy(
        Market,
        tokenAddress
    )

    saveDefinition(network, OceanMarket)
}

module.exports = market
