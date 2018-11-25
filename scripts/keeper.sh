#!/bin/bash

[ "${LOCAL_CONTRACTS}" = "true" ] && rm -f /keeper-contracts/artifacts/ready

npm run clean

if [ "${NETWORK_NAME}" = "kovan" ]
then
    parity --chain=kovan \
        --jsonrpc-apis web3,eth,net,parity,traces,rpc,personal \
        --jsonrpc-cors "${LISTEN_ADDRESS}":"${LISTEN_PORT}" \
        --unlock=0x023bdc21d00dd7c51aefb34ce00ac3281f307975 \
        --password="~/ssh/parity_pass"

elif [ "${NETWORK_NAME}" = "ocean_poa_net_local" ]
then
    echo "private poa network should already be running."
    if [ "${DEPLOY_CONTRACTS}" != "false" ]
    then

        npm run migrate:poa_local
    fi
else
    if [ "${REUSE_DATABASE}" = "true" -a "${DATABASE_PATH}" != "" ]
    then
        echo "running ganache with a database path: ${DATABASE_PATH}"
        ganache-cli -d -b ${BLOCK_TIME} --hostname "${LISTEN_ADDRESS}" --port "${LISTEN_PORT}" --db "${DATABASE_PATH}" &
    else
        ganache-cli -d -b ${BLOCK_TIME} --hostname "${LISTEN_ADDRESS}" --port "${LISTEN_PORT}" &
    fi
    sleep 2
    if [ "${DEPLOY_CONTRACTS}" != "false" ]
    then
        echo "deploy contracts is ${DEPLOY_CONTRACTS}"
        npm run migrate
    fi
fi

# Flag to indicate contracts are ready
[ "${LOCAL_CONTRACTS}" = "true" ] && touch /keeper-contracts/artifacts/ready

tail -f /dev/null
