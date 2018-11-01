/* global artifacts, assert, contract, describe, it */
/* eslint-disable no-console, max-len */

const ServiceAgreement = artifacts.require('ServiceAgreement.sol')
const Web3 = require('web3')
const abi = require('ethereumjs-abi')
const utils = require('./utils')

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))

var colorSet = {
    Reset: '\x1b[0m',
    Red: '\x1b[31m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Magenta: '\x1b[35m'
}

var funcNames = ['info', 'log', 'warn', 'error']
var colors = [colorSet.Green, colorSet.Blue, colorSet.Yellow, colorSet.Red]

for (var i = 0; i < funcNames.length; i++) {
    let funcName = funcNames[i]
    let color = colors[i]
    let oldFunc = console[funcName]
    console[funcName] = function() {
        var args = Array.prototype.slice.call(arguments)
        if (args.length) args = [color + args[0]].concat(args.slice(1), colorSet.Reset)
        oldFunc.apply(null, args)
    }
}

// console coloring source code here: https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis))
}

contract('SLA', (accounts) => {
    describe('Test Service Level Agreement', () => {
        it('should be able to run through the full lifecycle of fulfilling SLA', async () => {
            const sla = await ServiceAgreement.deployed()
            const consumer = accounts[0]
            const SLATemplateOwner = accounts[1]

            /*

                                                condition-1            Index: 0
                                                   / \
                                                  /   \
                                                 /     \
                                                /       \
                                               /         \
                                          F=0 /           \ F=1
                                Index: 3 condition-4    condition-2     Index: 1
                                              \            /
                                               \          /
                                           Timeout=1     /
                                                 \      /
                                                  \    /
                                               F=0 \  / F=1
                                                condition3              Index: 2

                1st bit --> dependency index
                2nd bit --> Flag (indicating the expected value of the dependency condition)
                3rd bit --> exit strategy (i.e timeout)

                       condition 1               condition 2      condition 3,      condition 4
                 [ [  [1,1, 0 ], [3, 0, 0]],      [[2, 1 , 0]],  [[0,0,0]],          [2, 0, 1] ]
                 Generating compressed version of nested arrays (one array)
                   condition 1                  condition 2             condition 3             condition 4
                 [ 001 000 011 000,             000 011 000 000,        000 000 000 000,        000 101 000 000]
                 [ 536           ,             192            ,        0              ,        320            ]
            */

            const contract1 = accounts[2]
            const contract2 = accounts[3]
            const contract3 = accounts[4]
            const contract4 = accounts[5]

            const fingerprint1 = '0x2e0a37a5'
            const fingerprint2 = '0xc8cd645f'
            const fingerprint3 = '0xc1964de7'
            const fingerprint4 = '0xc1964ded'

            const dependencies = [536, 192, 0, 320]

            const serviceTemplateId = '0x319d158c3a5d81d15b0160cf8929916089218bdb4aa78c3ecd16633afd44b8ae'
            const did = '0x319d158c3a5d81d15b0160cf8929916089218bdb4aa78c3ecd16633afd44b8ae'
            const contracts = [contract1, contract2, contract3, contract4]
            const fingerprints = [fingerprint1, fingerprint2, fingerprint3, fingerprint4]
            // setup service level agreement template
            console.log('\t >> Create service level agreement template')
            const result = await sla.setupAgreementTemplate(
                contracts,
                fingerprints,
                dependencies,
                serviceTemplateId,
                { from: SLATemplateOwner })
            // msg.sender, service, dependencies.length, contracts.length
            const testTemplateId = web3.utils.soliditySha3({ type: 'address', value: SLATemplateOwner }, { type: 'bytes32', value: serviceTemplateId }, { type: 'uint', value: 4 }, { type: 'uint', value: 4 }).toString('hex')

            const templateId = result.logs[4].args.serviceTemplateId
            assert.strictEqual(templateId, testTemplateId, 'Template Id should match indicating creating of agreement template')
            console.log('\x1b[36m%s\x1b[0m', '\t >> Template ID:', templateId, '... Done!')
            console.log('\t >> Execute service level agreement')
            // reconstruct the three condition keys off-chain
            const condKeys = utils.generateConditionsKeys(templateId, contracts, fingerprints)
            const valHashList = [
                utils.valueHash(['bool'], [true]),
                utils.valueHash(['bool'], [false]),
                utils.valueHash(['uint'], [120]),
                utils.valueHash(['string'], ['797FD5B9045B841FDFF72']) // asset Id: 797FD5B9045B841FDFF72
            ]

            const timeoutValues = [0, 0, 0, 3] // timeout 5 blocks @ condition 4
            /*
                To reconstruct the right signature, as SLA provider you should
                get a signed message by the consumer with the following parameters:
                1) SLA Template ID
                2) Array of Condition Keys
                3) Array of Controller Methods inputs hash (valueHash)
                4) Array of timeout for each condition in terms of blocks
                5) bytes32 service_definition_id (id of service in DID)
                6) bytes32 DID --> refer to the off-chain DID document
            */

            // generate template fingerprint including all the conditions and
            const serviceAgreementId = utils.generateId(web3)
            const hash = utils.createSLAHash(web3, templateId, condKeys, valHashList, timeoutValues, serviceAgreementId)
            const signature = await web3.eth.sign(hash, consumer)
            const val = await sla.executeAgreement(templateId, signature, consumer, [ valHashList[0], valHashList[1], valHashList[2], valHashList[3] ], timeoutValues, serviceAgreementId, did, { from: SLATemplateOwner })
            assert.strictEqual(val.logs[4].args.state, true, 'Execute Agreement should return true')
            console.log('\x1b[36m%s\x1b[0m', '\t >> Service Agreement ID: ', val.logs[4].args.serviceAgreementId, ' ... Done!')

            console.log('\x1b[36m%s\x1b[0m', '\t >> Set 3rd condition status to 1 by contract address: ', contract3, ' Fingerprint: ', fingerprint3)
            console.log('\t >> Reconstruct condition-3 authorized hash')
            const condition3 = '0x' + abi.soliditySHA3([ 'bytes32', 'bytes32' ], [ condKeys[2], valHashList[2] ]).toString('hex')
            console.log('\t >> Hash(ConditionKey, ValueHash): ', condition3)
            await sla.fulfillCondition(serviceAgreementId, fingerprint3, valHashList[2], { from: contract3 })
            const conditionIdStatus = await sla.getConditionStatus(serviceAgreementId, condKeys[2])
            assert.strictEqual(1, conditionIdStatus.toNumber(), 'Invalid condition state')
            console.log('\x1b[36m%s\x1b[0m', '\t >> Condition 3 status: ', conditionIdStatus.toNumber())

            console.log('\x1b[36m%s\x1b[0m', '\t >> Set 2nd condition status to 1 by contract address: ', contract2, ' Fingerprint: ', fingerprint2)
            console.log('\t >> Reconstruct condition-2 authorized hash')
            const condition2 = '0x' + abi.soliditySHA3([ 'bytes32', 'bytes32' ], [ condKeys[1], valHashList[1] ]).toString('hex')
            console.log('\t >> Hash(ConditionKey, ValueHash): ', condition2)
            await sla.fulfillCondition(serviceAgreementId, fingerprint2, valHashList[1], { from: contract2 })
            const conditionId2Status = await sla.getConditionStatus(serviceAgreementId, condKeys[1])
            assert.strictEqual(1, conditionId2Status.toNumber(), 'Invalid condition state')
            console.log('\x1b[36m%s\x1b[0m', '\t >> Condition 2 status: ', conditionId2Status.toNumber())

            console.warn('\t >> Try to change the state of condition 4')
            console.info('\t >> wait for 2 sec condition 3 timeout')
            await sleep(2000)
            if (await sla.conditionTimedOut(serviceAgreementId, condKeys[3])) {
                console.info('yes')
            } else {
                console.warn('\t >> Condition-3 is not timed out yet')
                try {
                    console.log('\x1b[36m%s\x1b[0m', '\t >> Set 4th condition status to 0 by contract address: ', contract4, ' Fingerprint: ', fingerprint4)
                    console.log('\t >> Reconstruct condition-4 authorized hash')
                    const condition4 = '0x' + abi.soliditySHA3([ 'bytes32', 'bytes32' ], [ condKeys[3], valHashList[3] ]).toString('hex')
                    console.log('\t >> Hash(ConditionKey, ValueHash): ', condition4)
                    await sla.fulfillCondition(serviceAgreementId, fingerprint4, valHashList[3], { from: contract4 })
                    const conditionId4Status = await sla.getConditionStatus(serviceAgreementId, condKeys[3])
                    assert.strictEqual(1, conditionId4Status.toNumber(), 'Invalid condition state')
                    console.log('\x1b[36m%s\x1b[0m', '\t >> Condition 4 status: ', conditionId4Status.toNumber())
                } catch (err) {
                    console.error('\t >> Error: Unauthorized access for condition 4 state, wait for timeout')
                }
            }

            console.info('\t >> wait for 3 sec, the actual condition 3 timeout')
            await sleep(3000)

            if (await sla.conditionTimedOut(serviceAgreementId, condKeys[3])) {
                const conditionId4Status = await sla.getConditionStatus(serviceAgreementId, condKeys[3])
                console.log('\x1b[36m%s\x1b[0m', '\t >> Condition 4 status: ', conditionId4Status.toNumber())

                if ((conditionId4Status.toNumber() === -1 || conditionId4Status.toNumber() === 0) && conditionId2Status.toNumber() === 1) {
                    console.info('\t >> Set condition-1 to true if condition2=1 and condition4=0')
                    console.log('\t >> Reconstruct condition-1 authorized hash')
                    const condition1 = '0x' + abi.soliditySHA3([ 'bytes32', 'bytes32' ], [ condKeys[0], valHashList[0] ]).toString('hex')
                    console.log('\t >> Hash(ConditionKey, ValueHash): ', condition1)
                    await sla.fulfillCondition(serviceAgreementId, fingerprint1, valHashList[0], { from: contract1 })
                    const conditionId1Status = await sla.getConditionStatus(serviceAgreementId, condKeys[0])
                    assert.strictEqual(1, conditionId1Status.toNumber(), 'Invalid condition state')
                    console.log('\x1b[36m%s\x1b[0m', '\t >> Condition 1 status: ', conditionId1Status.toNumber())
                } else {
                    console.error('\t >> Condition 1 do not match the state')
                }
            } else {
                console.warn('\t >> Condition-4 is not timed out yet')
            }
        })
    })
})
