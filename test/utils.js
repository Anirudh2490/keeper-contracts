/* eslint-env mocha */
/* eslint-disable no-console */
/* global assert */

const Eth = require('ethjs')
const HttpProvider = require('ethjs-provider-http')
const abi = require('ethereumjs-abi')

const ethQuery = new Eth(new HttpProvider('http://localhost:7545'))

const BN = small => new Eth.BN(small.toString(10), 10)

const utils = {
    getVoteSaltHash: (vote, salt) => (
        `0x${abi.soliditySHA3(['uint', 'uint'], [vote, salt]).toString('hex')}`
    ),

    getListingHash: domain => (
        `0x${abi.soliditySHA3(['string'], [domain]).toString('hex')}`
    ),

    generateId: (web3) => {
        return web3.utils.sha3(Math.random().toString())
    },

    as: (actor, fn, ...args) => {
        function detectSendObject(potentialSendObj) {
            function hasOwnProperty(obj, prop) {
                const proto = obj.constructor.prototype
                return (prop in obj) &&
          (!(prop in proto) || proto[prop] !== obj[prop])
            }
            if (typeof potentialSendObj !== 'object') { return undefined }
            if (
                hasOwnProperty(potentialSendObj, 'from') ||
        hasOwnProperty(potentialSendObj, 'to') ||
        hasOwnProperty(potentialSendObj, 'gas') ||
        hasOwnProperty(potentialSendObj, 'gasPrice') ||
        hasOwnProperty(potentialSendObj, 'value')
            ) {
                throw new Error('It is unsafe to use "as" with custom send objects')
            }
            return undefined
        }
        detectSendObject(args[args.length - 1])
        const sendObject = { from: actor }
        return fn(...args, sendObject)
    },

    isEVMException: err => (
        err.toString().includes('revert')
    ),

    // returns block timestamp
    getBlockTimestamp: () => ethQuery.blockNumber()
        .then(num => ethQuery.getBlockByNumber(num, true))
        .then(block => block.timestamp.toString(10)),

    divideAndGetWei: (numerator, denominator) => {
        const weiNumerator = Eth.toWei(BN(numerator), 'gwei')
        return weiNumerator.div(BN(denominator))
    },

    multiplyFromWei: (x, weiBN) => {
        if (!Eth.BN.isBN(weiBN)) {
            return false
        }
        const weiProduct = BN(x).mul(weiBN)
        return BN(Eth.fromWei(weiProduct, 'gwei'))
    },

    multiplyByPercentage: (x, y, z = 100) => {
        const weiQuotient = utils.divideAndGetWei(y, z)
        return utils.multiplyFromWei(x, weiQuotient)
    },

    assertEmitted: (result, n, name, payload) => {
        var gotEvents = 0
        for (var i = 0; i < result.logs.length; i++) {
            const ev = result.logs[i]
            if (ev.event === name) {
                gotEvents++
            }
        }
        assert.strictEqual(n, gotEvents)
    },

    toBigNumber: (num) => {
        // return new BigNumber(num)
        return num
    },

    generateConditionsKeys: (slaTemplateId, contracts, fingerprints) => {
        const conditions = []
        for (let i = 0; i < contracts.length; i++) {
            conditions.push('0x' + abi.soliditySHA3(
                ['bytes32', 'address', 'bytes4'],
                [slaTemplateId, contracts[i], fingerprints[i]]
            ).toString('hex'))
        }
        return conditions
    },

    createSLAHash: (web3, slaTemplateId, conditionsKeys, hashes, timeouts, serviceAgreementId) => {
        return web3.utils.soliditySha3(
            { type: 'bytes32', value: slaTemplateId },
            { type: 'bytes32[]', value: conditionsKeys },
            { type: 'bytes32[]', value: hashes },
            { type: 'uint256[]', value: timeouts },
            { type: 'bytes32', value: serviceAgreementId }
        ).toString('hex')
    },

    getEventArgsFromTx: (txReceipt, eventName) => {
        return txReceipt.logs.filter((log) => {
            return log.event === eventName
        })[0].args
    },

    getSelector: (web3, contract, name) => {
        for (var i = 0; i < contract.abi.length; i++) {
            const meta = contract.abi[i]
            if (meta.name === name) {
                let argsStr = ''
                for (let input of meta.inputs) {
                    argsStr += input.type + ','
                }
                return web3.utils.sha3(`${name}(${argsStr.slice(0, -1)})`).slice(0, 10)
            }
        }

        throw new Error('function with the given name not found in the given contact')
    },

    valueHash: (types, values) => {
        return '0x' + abi.soliditySHA3(types, values).toString('hex')
    },

    signAgreement: async (agreement, templateId, signature, consumer, hashes, timeouts, serviceAgreementId, did, args = {}) => {
        const result = await agreement.executeAgreement(
            templateId,
            signature,
            consumer,
            hashes,
            timeouts,
            serviceAgreementId,
            did,
            args
        )

        return result.logs.filter((log) => {
            return log.event === 'ExecuteAgreement'
        })[0].args.serviceAgreementId
    },
    sleep: (millis) => {
        return new Promise(resolve => setTimeout(resolve, millis))
    }
}

module.exports = utils
