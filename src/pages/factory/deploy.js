import { Card, Button, Alert, Spin, Icon } from 'antd'
import { Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import React, { useContext, useState } from 'react'
import { WalletContext } from '../../bootstrap/wallet-context'
import { ethers } from 'ethers'
import _GTCR from '@kleros/tcr/build/contracts/GeneralizedTCR.json'
import styled from 'styled-components/macro'
import ipfsPublish from '../../utils/ipfs-publish'
import Archon from '@kleros/archon'
import { parseEther } from 'ethers/utils'
import { ZERO_ADDRESS, isVowel } from '../../utils/string'

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
  const {
    tcrTitle,
    tcrDescription,
    columns,
    itemName,
    tcrPrimaryDocument,
    tcrLogo,
    relColumns,
    relItemName,
    relTcrPrimaryDocument
  } = tcrState
  const metadata = {
    tcrTitle,
    tcrDescription,
    columns,
    itemName,
    logoURI: tcrLogo
  }

  const relTcrTitle = `${tcrTitle} enabled badges`
  const relMetadata = {
    tcrTitle: relTcrTitle,
    tcrDescription: `A TCR of TCRs related to ${tcrTitle}`,
    columns: relColumns,
    itemName: relItemName,
    isConnectedTCR: true
  }

  const metaEvidence = {
    category: 'Curated Lists',
    question: `Does the ${(itemName && itemName.toLowerCase()) ||
      'item'} comply with the required criteria?`,
    fileURI: tcrPrimaryDocument,
    evidenceDisplayInterfaceURI:
      process.env.REACT_APP_DEFAULT_EVIDENCE_DISPLAY_URI,
    evidenceDisplayInterfaceHash: Archon.utils.multihashFile(
      await (
        await fetch(
          `${process.env.REACT_APP_IPFS_GATEWAY}${process.env.REACT_APP_DEFAULT_EVIDENCE_DISPLAY_URI}`
        )
      ).text(),
      0x1B // eslint-disable-line
    ),
    metadata
  }

  const relMetaEvidence = {
    ...metaEvidence,
    question: `Does the ${relItemName} comply with the required criteria?`,
    fileURI: relTcrPrimaryDocument,
    metadata: relMetadata
  }

  const registrationMetaEvidence = {
    title: `Add ${
      itemName
        ? isVowel(itemName[0])
          ? `an ${itemName.toLowerCase()}`
          : `a ${itemName.toLowerCase()}`
        : 'an item'
    } to ${tcrTitle}`,
    description: `Someone requested to add ${
      itemName
        ? isVowel(itemName[0])
          ? `an ${itemName.toLowerCase()}`
          : `a ${itemName.toLowerCase()}`
        : 'an item'
    } to ${tcrTitle}`,
    rulingOptions: {
      titles: ['Yes, Add It', "No, Don't Add It"],
      descriptions: [
        `Select this if you think the ${(itemName && itemName.toLowerCase()) ||
          'item'} complies with the required criteria and should be added.`,
        `Select this if you think the ${(itemName && itemName.toLowerCase()) ||
          'item'} does not comply with the required criteria and should not be added.`
      ]
    },
    ...metaEvidence
  }
  const clearingMetaEvidence = {
    title: `Remove ${
      itemName
        ? isVowel(itemName[0])
          ? `an ${itemName.toLowerCase()}`
          : `a ${itemName.toLowerCase()}`
        : 'an item'
    } from ${tcrTitle}`,
    description: `Someone requested to remove ${
      itemName
        ? isVowel(itemName[0])
          ? `an ${itemName.toLowerCase()}`
          : `a ${itemName.toLowerCase()}`
        : 'an item'
    } from ${tcrTitle}`,
    rulingOptions: {
      titles: ['Yes, Remove It', "No, Don't Remove It"],
      descriptions: [
        `Select this if you think the ${(itemName && itemName.toLowerCase()) ||
          'item'} does not comply with the required criteria and should be removed.`,
        `Select this if you think the ${(itemName && itemName.toLowerCase()) ||
          'item'} complies with the required criteria and should not be removed.`
      ]
    },
    ...metaEvidence
  }

  const relRegistrationMetaEvidence = {
    title: `Add a ${relItemName} to ${relTcrTitle}`,
    description: `Someone requested to add a ${relItemName} to ${relTcrTitle}.`,
    rulingOptions: {
      titles: ['Yes, Add It', "No, Don't Add It"],
      descriptions: [
        `Select this if you think the ${relItemName} complies with the required criteria and should be added.`,
        `Select this if you think the ${relItemName} does not comply with the required criteria and should not be added.`
      ]
    },
    ...relMetaEvidence
  }
  const relClearingMetaEvidence = {
    title: `Remove a ${relItemName} from ${relTcrTitle}`,
    description: `Someone requested to remove a ${relItemName} from ${relTcrTitle}.`,
    rulingOptions: {
      titles: ['Yes, Remove It', "No, Don't Remove It"],
      descriptions: [
        `Select this if you think the ${relItemName} does not comply with the required criteria and should be removed.`,
        `Select this if you think the ${relItemName} complies with the required criteria and should not be removed.`
      ]
    },
    ...relMetaEvidence
  }

  const enc = new TextEncoder()
  const metaEvidenceFiles = [
    registrationMetaEvidence,
    clearingMetaEvidence
  ].map(metaEvidence => enc.encode(JSON.stringify(metaEvidence)))
  const relMetaEvidenceFiles = [
    relRegistrationMetaEvidence,
    relClearingMetaEvidence
  ].map(relMetaEvidence => enc.encode(JSON.stringify(relMetaEvidence)))

  /* eslint-disable prettier/prettier */
  const files = [...metaEvidenceFiles, ...relMetaEvidenceFiles].map(file => ({
    data: file,
    multihash: Archon.utils.multihashFile(file, 0x1B)
  }))
  /* eslint-enable prettier/prettier */

  const ipfsMetaEvidenceObjects = (
    await Promise.all(files.map(file => ipfsPublish(file.multihash, file.data)))
  ).map(
    ipfsMetaEvidenceObject =>
      `/ipfs/${ipfsMetaEvidenceObject[1].hash + ipfsMetaEvidenceObject[0].path}`
  )

  return {
    registrationMetaEvidencePath: ipfsMetaEvidenceObjects[0],
    clearingMetaEvidencePath: ipfsMetaEvidenceObjects[1],
    relRegistrationMetaEvidencePath: ipfsMetaEvidenceObjects[2],
    relClearingMetaEvidencePath: ipfsMetaEvidenceObjects[3]
  }
}

const Deploy = ({ resetTcrState, setTxState, tcrState }) => {
  const { pushWeb3Action } = useContext(WalletContext)
  const [txSubmitted, setTxSubmitted] = useState()

  const onDeploy = () => {
    pushWeb3Action(async (_, signer) => {
      const factory = ethers.ContractFactory.fromSolidity(_GTCR, signer)
      const {
        registrationMetaEvidencePath,
        clearingMetaEvidencePath,
        relRegistrationMetaEvidencePath,
        relClearingMetaEvidencePath
      } = await getTcrMetaEvidence(tcrState)

      const relTCRtx = await factory.deploy(
        tcrState.relArbitratorAddress,
        '0x00', // Arbitrator extra data.
        ZERO_ADDRESS,
        relRegistrationMetaEvidencePath,
        relClearingMetaEvidencePath,
        tcrState.relGovernorAddress,
        parseEther(tcrState.relSubmissionBaseDeposit.toString()),
        parseEther(tcrState.relRemovalBaseDeposit.toString()),
        parseEther(tcrState.relSubmissionChallengeBaseDeposit.toString()),
        parseEther(tcrState.relRemovalChallengeBaseDeposit.toString()),
        Number(tcrState.relChallengePeriodDuration) * 60 * 60,
        '10000', // Shared stake multiplier in basis points.
        '10000', // Winner stake multiplier in basis points.
        '20000', // Loser stake multiplier in basis points.
        { gasLimit: 6000000 }
      )
      setTxState({ txHash: relTCRtx.deployTransaction.hash, status: 'pending' })
      setTxSubmitted(relTCRtx.deployTransaction.hash)
      return {
        tx: relTCRtx,
        actionMessage: 'Deploying Related TCR',
        onTxMined: async ({ contractAddress }) => {
          setTxState({
            txHash: relTCRtx.deployTransaction.hash,
            status: 'mined',
            contractAddress
          })

          pushWeb3Action(async () => {
            const tx = await factory.deploy(
              tcrState.arbitratorAddress,
              '0x00', // Arbitrator extra data.
              contractAddress,
              registrationMetaEvidencePath,
              clearingMetaEvidencePath,
              tcrState.governorAddress,
              parseEther(tcrState.submissionBaseDeposit.toString()),
              parseEther(tcrState.removalBaseDeposit.toString()),
              parseEther(tcrState.submissionChallengeBaseDeposit.toString()),
              parseEther(tcrState.removalChallengeBaseDeposit.toString()),
              Number(tcrState.challengePeriodDuration) * 60 * 60,
              '10000', // Shared stake multiplier in basis points.
              '10000', // Winner stake multiplier in basis points.
              '20000', // Loser stake multiplier in basis points.
              { gasLimit: 6000000 }
            )
            setTxState({ txHash: tx.deployTransaction.hash, status: 'pending' })
            setTxSubmitted(tx.deployTransaction.hash)
            return {
              tx,
              actionMessage: 'Deploying TCR',
              onTxMined: async ({ contractAddress }) => {
                setTxState({
                  txHash: tx.deployTransaction.hash,
                  status: 'mined',
                  contractAddress
                })
              }
            }
          })
        }
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
                />{' '}
                Transaction pending...
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
    ).isRequired,
    arbitratorAddress: PropTypes.string.isRequired,
    governorAddress: PropTypes.string.isRequired,
    submissionChallengeBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    removalChallengeBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    submissionBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    removalBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    challengePeriodDuration: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    relArbitratorAddress: PropTypes.string.isRequired,
    relGovernorAddress: PropTypes.string.isRequired,
    relSubmissionChallengeBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    relRemovalChallengeBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    relSubmissionBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    relRemovalBaseDeposit: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired,
    relChallengePeriodDuration: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string
    ]).isRequired
  }).isRequired
}

export default Deploy
