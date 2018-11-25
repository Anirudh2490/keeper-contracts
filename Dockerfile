FROM node:10-alpine
LABEL maintainer="Ocean Protocol <devops@oceanprotocol.com>"

RUN apk add --no-cache --update\
      bash\
      g++\
      gcc\
      git\
      krb5-dev\
      krb5-libs\
      krb5\
      make\
      python

COPY . /keeper-contracts
WORKDIR /keeper-contracts

RUN npm install -g npm
RUN npm install -g ganache-cli@~6.1.8
RUN npm install

# Default ENV values
# scripts/keeper.sh
ENV BLOCK_TIME='2'
ENV LISTEN_ADDRESS='0.0.0.0'
ENV LISTEN_PORT='8545'

ENTRYPOINT ["/keeper-contracts/scripts/keeper.sh"]

# Expose listen port
EXPOSE 8545
