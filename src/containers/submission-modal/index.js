import React, { useContext } from 'react'
import { Spin, Modal, Button } from 'antd'
import styled from 'styled-components/macro'
import PropTypes from 'prop-types'
import SubmissionForm from './form'
import { abi as _gtcr } from '../../assets/contracts/GTCRMock.json'
import { abi as _arbitrator } from '../../assets/contracts/Arbitrator.json'
import { WalletContext } from '../../bootstrap/wallet-context'
import { ethers } from 'ethers'
import { gtcrEncode } from '../../utils/encoder'
import { TCRViewContext } from '../../bootstrap/tcr-view-context'

const StyledSpin = styled(Spin)`
  left: 50%;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
`

const SubmissionModal = ({ metaEvidence, tcrAddress, ...rest }) => {
  const { pushWeb3Action } = useContext(WalletContext)
  const {
    arbitrator: arbitratorAddress,
    arbitratorExtraData,
    requesterBaseDeposit,
    sharedStakeMultiplier,
    MULTIPLIER_DIVISOR
  } = useContext(TCRViewContext)
  if (!metaEvidence)
    return (
      <Modal
        title="Submit Item"
        footer={[
          <Button key="back" onClick={rest.onCancel}>
            Cancel
          </Button>
        ]}
        {...rest}
      >
        <StyledSpin />
      </Modal>
    )

  const postSubmit = (values, columns) => {
    const encodedParams = gtcrEncode({ columns, values })

    pushWeb3Action(async (_, signer) => {
      const gtcr = new ethers.Contract(tcrAddress, _gtcr, signer)

      // Get the arbitration cost from the arbitrator.
      const arbitrator = new ethers.Contract(
        arbitratorAddress,
        _arbitrator,
        signer
      )

      // Calculate submission deposit.
      //
      // Submission Deposit = requester deposit + arbitration cost + fee stake
      // fee stake = requester deposit * shared stake multiplier / multiplier divisor
      const arbitrationCost = await arbitrator.arbitrationCost(
        arbitratorExtraData
      )
      const depositInWei = requesterBaseDeposit
        .add(arbitrationCost)
        .add(
          requesterBaseDeposit
            .mul(sharedStakeMultiplier)
            .div(MULTIPLIER_DIVISOR)
        )

      // Request signature and submit.
      const tx = await gtcr.requestStatusChange(encodedParams, {
        value: depositInWei
      })

      rest.onCancel() // Hide the submission modal.
      return {
        tx,
        actionMessage: `Submitting ${metaEvidence.itemName || 'item'}`
      }
    })
  }

  return (
    <Modal
      title={`Submit ${metaEvidence.itemName || 'Item'}`}
      footer={null}
      {...rest.onCancel}
      {...rest}
    >
      <SubmissionForm
        columns={metaEvidence.columns}
        postSubmit={postSubmit}
        onCancel={rest.onCancel}
      />
    </Modal>
  )
}

SubmissionModal.propTypes = {
  metaEvidence: PropTypes.shape({
    itemName: PropTypes.string,
    columns: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired
      })
    )
  }),
  tcrAddress: PropTypes.string.isRequired
}

SubmissionModal.defaultProps = {
  metaEvidence: null
}

export default SubmissionModal
