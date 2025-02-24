import React from 'react'
import styled from 'styled-components/macro'
import { getAddressPage } from 'utils/network-utils'

const StyledIcon = styled.svg`
  height: 1.2rem;
  width: auto;
  vertical-align: text-bottom;
  margin-left: 0.3rem;

  .main-stop {
    stop-color: #863fe5d9;
  }
  .alt-stop {
    stop-color: #4d00b4d9;
  }
  path {
    fill: url(#gradient);
  }
`

const StyledLink = styled.a`
  margin-left: 1rem;
  display: flex;
  align-items: center;
`

const ContractExplorerUrl: React.FC<{
  networkId: number
  contractAddress: string
}> = ({ networkId, contractAddress }) => {
  const url = `${getAddressPage({
    networkId,
    address: contractAddress
  })}#code`
  return (
    <StyledLink
      href={url}
      style={{ textDecoration: 'underline', color: '#4d00b473' }}
      target="_blank"
      rel="noopener noreferrer"
    >
      <StyledIcon
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 293.775 293.667"
      >
        <linearGradient id="gradient">
          <stop className="main-stop" offset="0%" />
          <stop className="alt-stop" offset="100%" />
        </linearGradient>
        <g
          id="etherscan-logo-light-circle"
          transform="translate(-219.378 -213.333)"
        >
          <path
            id="Path_1"
            data-name="Path 1"
            d="M280.433,353.152A12.45,12.45,0,0,1,292.941,340.7l20.737.068a12.467,12.467,0,0,1,12.467,12.467v78.414c2.336-.692,5.332-1.43,8.614-2.2a10.389,10.389,0,0,0,8.009-10.11V322.073a12.469,12.469,0,0,1,12.467-12.47h20.779a12.47,12.47,0,0,1,12.467,12.47v90.276s5.2-2.106,10.269-4.245a10.408,10.408,0,0,0,6.353-9.577V290.9a12.466,12.466,0,0,1,12.465-12.467h20.779A12.468,12.468,0,0,1,450.815,290.9v88.625c18.014-13.055,36.271-28.758,50.759-47.639a20.926,20.926,0,0,0,3.185-19.537,146.6,146.6,0,0,0-136.644-99.006c-81.439-1.094-148.744,65.385-148.736,146.834a146.371,146.371,0,0,0,19.5,73.45,18.56,18.56,0,0,0,17.707,9.173c3.931-.346,8.825-.835,14.643-1.518a10.383,10.383,0,0,0,9.209-10.306V353.152"
            transform="translate(0 0)"
          />
          <path
            id="Path_2"
            data-name="Path 2"
            d="M244.417,398.641A146.808,146.808,0,0,0,477.589,279.9c0-3.381-.157-6.724-.383-10.049-53.642,80-152.686,117.405-232.79,128.793"
            transform="translate(35.564 80.269)"
          />
        </g>
      </StyledIcon>
    </StyledLink>
  )
}
export default ContractExplorerUrl
