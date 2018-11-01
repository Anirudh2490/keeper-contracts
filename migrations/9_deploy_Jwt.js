/* global artifacts */
const Market = artifacts.require('Market.sol')
const Jwt = artifacts.require('Jwt.sol')
const { saveDefinition } = require('./helper')

const jwt = async (deployer, network) => {
    await deployer.deploy(
        Jwt,
        Market.address
    )

    saveDefinition(network, OceanAuth)
}

module.exports = jwt
