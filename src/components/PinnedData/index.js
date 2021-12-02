import { useRouter } from 'next/router'
import { Bookmark, ChevronRight, X } from 'react-feather'
import styled from 'styled-components'

import { Hover } from 'components'
import { ButtonFaded } from 'components/ButtonStyled'
import { AutoColumn } from 'components/Column'
import FormattedName from 'components/FormattedName'
import { RowBetween, RowFixed } from 'components/Row'
import TokenLogo from 'components/TokenLogo'

import { useSavedProtocols } from 'contexts/LocalStorage'
import { TYPE } from 'Theme'
import { tokenIconUrl } from 'utils'

const RightColumn = styled.div`
  position: fixed;
  right: 0;
  top: 0px;
  height: 100vh;
  width: ${({ open }) => (open ? '160px' : '23px')};
  padding: 1.25rem;
  border-left: ${({ theme, open }) => '1px solid' + theme.bg3};
  background-color: ${({ theme }) => theme.bg1};
  z-index: 9999;
  :hover {
    cursor: pointer;
  }

  @media screen and (max-width: ${({ theme }) => theme.bpLg}) {
    display: none;
  }
`

const SavedButton = styled(RowBetween)`
  padding-bottom: ${({ open }) => open && '20px'};
  border-bottom: ${({ theme, open }) => open && '1px solid' + theme.bg3};
  margin-bottom: ${({ open }) => open && '1.25rem'};

  :hover {
    cursor: pointer;
  }
`

const ScrollableDiv = styled(AutoColumn)`
  overflow: auto;
`

const StyledIcon = styled.div`
  color: ${({ theme }) => theme.text2};
`

function PinnedData() {
  const router = useRouter()
  const { savedProtocols, removeProtocol, pinnedOpen, setPinnedOpen } = useSavedProtocols()

  const allProtocols = Object.keys(savedProtocols).reduce((acc, protocol) => {
    acc.push(...(Object.entries(savedProtocols[protocol]) || []))
    return acc
  }, [])

  return !pinnedOpen ? (
    <RightColumn open={pinnedOpen} onClick={() => setPinnedOpen(true)}>
      <SavedButton open={pinnedOpen}>
        <StyledIcon>
          <Bookmark size={20} />
        </StyledIcon>
      </SavedButton>
    </RightColumn>
  ) : (
    <RightColumn gap="1rem" open={pinnedOpen}>
      <SavedButton onClick={() => setPinnedOpen(false)} open={pinnedOpen}>
        <RowFixed>
          <StyledIcon>
            <Bookmark size={16} />
          </StyledIcon>
          <TYPE.main ml={'4px'}>Saved</TYPE.main>
        </RowFixed>
        <StyledIcon>
          <ChevronRight />
        </StyledIcon>
      </SavedButton>
      <AutoColumn gap="40px" style={{ marginTop: '2rem' }}>
        <ScrollableDiv gap={'12px'}>
          <TYPE.main>Pinned Protocols</TYPE.main>
          {allProtocols.length > 0 ? (
            allProtocols.map(([protocol, readableProtocolName]) => {
              return (
                <RowBetween key={protocol}>
                  <ButtonFaded onClick={() => router.push('/protocol/' + protocol)}>
                    <RowFixed>
                      <TokenLogo logo={tokenIconUrl(protocol)} size={14} />
                      <TYPE.header ml={'6px'}>
                        <FormattedName text={readableProtocolName} maxCharacters={12} fontSize={'12px'} />
                      </TYPE.header>
                    </RowFixed>
                  </ButtonFaded>
                  <Hover onClick={() => removeProtocol(protocol)}>
                    <StyledIcon>
                      <X size={16} />
                    </StyledIcon>
                  </Hover>
                </RowBetween>
              )
            })
          ) : (
            <TYPE.light>Pinned protocols will appear here.</TYPE.light>
          )}
        </ScrollableDiv>
      </AutoColumn>
    </RightColumn>
  )
}

export default PinnedData
