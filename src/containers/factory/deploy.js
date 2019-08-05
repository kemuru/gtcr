import { Card, Button, Alert, Spin, Icon } from 'antd'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import React, { useContext, useState } from 'react'
import { WalletContext } from '../../bootstrap/wallet-context'
import { ethers } from 'ethers'
import FastJsonRpcSigner from '../../utils/fast-signer'
import _GTCR from '../../assets/contracts/GTCRMock.json'
import styled from 'styled-components/macro'
import ipfsPublish from '../../utils/ipfs-publish'
import Archon from '@kleros/archon'

const StyledButton = styled(Button)`
  margin-right: 7px;
`

const StyledDiv = styled.div`
  word-break: break-all;
`

const StyledAlert = styled(Alert)`
  margin-bottom: 24px;
`

const getTcrMetaEvidence = async tcrState => {
  const { title, description, columns, itemName } = tcrState
  const tcrMetadata = { title, description, columns, itemName }

  const enc = new TextEncoder()
  const fileData = enc.encode(JSON.stringify(tcrMetadata))
  /* eslint-disable prettier/prettier */
  const fileMultihash = Archon.utils.multihashFile(
    tcrMetadata,
    0x1B
  )
  /* eslint-enable prettier/prettier */
  const ipfsMetaEvidenceObject = await ipfsPublish(
    fileMultihash,
    fileData,
    process.env.REACT_APP_IPFS_GATEWAY
  )
  const ipfsMetaEvidencePath = `/ipfs/${ipfsMetaEvidenceObject[1].hash +
    ipfsMetaEvidenceObject[0].path}`

  return ipfsMetaEvidencePath
}

const Deploy = ({ resetTcrState, setTxState, tcrState }) => {
  const { pushWeb3Action } = useContext(WalletContext)
  const [txSubmitted, setTxSubmitted] = useState()

  const onDeploy = () => {
    pushWeb3Action(async ({ library, account }) => {
      // TODO: Remove FastJsonRpcSigner when ethers v5 is out.
      // See https://github.com/ethers-io/ethers.js/issues/511
      const signer = new FastJsonRpcSigner(library.getSigner(account))
      const factory = ethers.ContractFactory.fromSolidity(_GTCR, signer)
      const registrationMetaEvidence = await getTcrMetaEvidence(tcrState)
      const clearingMetaEvidence = await getTcrMetaEvidence(tcrState)

      const tx = await factory.deploy(
        registrationMetaEvidence,
        clearingMetaEvidence
      )
      setTxState({ txHash: tx.deployTransaction.hash, status: 'pending' })
      setTxSubmitted(tx.deployTransaction.hash)
      return {
        tx,
        actionMessage: 'Deploying TCR',
        onTxMined: ({ contractAddress }) =>
          setTxState({
            txHash: tx.deployTransaction.hash,
            status: 'mined',
            contractAddress
          })
      }
    })
  }

  return (
    <Card title="Deploy the TCR">
      {!txSubmitted && (
        <StyledButton type="primary" onClick={onDeploy}>
          Deploy!
        </StyledButton>
      )}
      {txSubmitted ? (
        tcrState.transactions[txSubmitted].status === 'pending' ? (
          <StyledAlert
            type="info"
            message={
              <>
                <Spin
                  indicator={
                    <Icon type="loading" style={{ fontSize: 24 }} spin />
                  }
                />
                {`  Transaction pending...`}
              </>
            }
          />
        ) : (
          tcrState.transactions[txSubmitted].contractAddress && (
            <StyledAlert
              type="info"
              message={
                <StyledDiv>
                  TCR Deployed at{' '}
                  <Link
                    to={`/tcr/${tcrState.transactions[txSubmitted].contractAddress}`}
                  >
                    {tcrState.transactions[txSubmitted].contractAddress}
                  </Link>
                </StyledDiv>
              }
            />
          )
        )
      ) : null}
      <StyledButton onClick={resetTcrState}>Start over</StyledButton>
    </Card>
  )
}

Deploy.propTypes = {
  resetTcrState: PropTypes.func.isRequired,
  setTxState: PropTypes.func.isRequired,
  tcrState: PropTypes.shape({
    transactions: PropTypes.objectOf(
      PropTypes.shape({
        status: PropTypes.oneOf(['pending', 'mined', null]),
        contractAddress: PropTypes.string
      })
    ).isRequired
  }).isRequired
}

export default Deploy
