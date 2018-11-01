/* global artifacts */
const OceanToken = artifacts.require('OCNToken.sol')
const { saveDefinition } = require('./helper')

const oceanToken = async (deployer, network) => {
    await deployer.deploy(OceanToken)
    saveDefinition(network, OceanToken)
}

module.exports = oceanToken
