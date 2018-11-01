/* global artifacts */
const OceanMarket = artifacts.require('Market.sol')
const OceanAuth = artifacts.require('Jwt.sol')
const { saveDefinition } = require('./helper')

const oceanAuth = async (deployer, network) => {
    await deployer.deploy(
        OceanAuth,
        OceanMarket.address
    )

    saveDefinition(network, OceanAuth)
}

module.exports = oceanAuth
