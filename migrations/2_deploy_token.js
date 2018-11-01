/* global artifacts */
const OCNToken = artifacts.require('OCNToken.sol')
const { saveDefinition } = require('./helper')

const ocnToken = async (deployer, network) => {
    await deployer.deploy(OCNToken)
    saveDefinition(network, OCNToken)
}

module.exports = ocnToken
