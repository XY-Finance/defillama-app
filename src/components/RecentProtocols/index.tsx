import { useMemo } from 'react'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import { FormSubmitBtn, Panel } from '~/components'
import { RecentlyListedProtocolsTable } from '~/components/Table'
import { ProtocolsChainsSearch } from '~/components/Search'
import { Dropdowns, TableFilters, TableHeader } from '~/components/Table/shared'
import { FiltersByChain, HideForkedProtocols, TVLRange } from '~/components/Filters'
import { useCalcStakePool2Tvl } from '~/hooks/data'
import { getPercentChange } from '~/utils'
import { FlexRow } from '~/layout/ProtocolAndPool'
import { ButtonLight } from '../ButtonStyled'
import { ArrowUpRight, X } from 'react-feather'
import styled from 'styled-components'
import { useDialogState, Dialog } from 'ariakit/dialog'
import { DialogForm } from '../Filters/common/Base'
import { useMutation } from 'react-query'
import { airdropsEligibilityCheck } from './airdrops'

function getSelectedChainFilters(chainQueryParam, allChains) {
	if (chainQueryParam) {
		if (typeof chainQueryParam === 'string') {
			return chainQueryParam === 'All' ? [...allChains] : chainQueryParam === 'None' ? [] : [chainQueryParam]
		} else {
			return [...chainQueryParam]
		}
	} else return [...allChains]
}

interface IRecentProtocolProps {
	title: string
	name: string
	header: string
	protocols: any
	chainList: string[]
	forkedList?: { [name: string]: boolean }
	claimableAirdrops?: Array<{ name: string; page: string; title?: string }>
}

export function RecentProtocols({
	title,
	name,
	header,
	protocols,
	chainList,
	forkedList,
	claimableAirdrops
}: IRecentProtocolProps) {
	const { query } = useRouter()
	const { chain, hideForks, minTvl, maxTvl } = query

	const toHideForkedProtocols = hideForks && typeof hideForks === 'string' && hideForks === 'true' ? true : false

	const { selectedChains, data } = useMemo(() => {
		const selectedChains = getSelectedChainFilters(chain, chainList)

		const _chainsToSelect = selectedChains.map((t) => t.toLowerCase())

		const isValidTvlRange =
			(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

		const data = protocols
			.filter((protocol) => {
				let toFilter = true

				// filter out protocols that are forks
				if (toHideForkedProtocols && forkedList) {
					toFilter = !forkedList[protocol.name]
				}

				let includesChain = false
				protocol.chains.forEach((chain) => {
					// filter if a protocol has at least of one selected chain
					if (!includesChain) {
						includesChain = _chainsToSelect.includes(chain.toLowerCase())
					}
				})

				toFilter = toFilter && includesChain

				return toFilter
			})
			.map((p) => {
				let tvl = 0
				let tvlPrevDay = null
				let tvlPrevWeek = null
				let tvlPrevMonth = null
				let extraTvl = {}

				p.chains.forEach((chainName) => {
					// return if chainsToSelect doesnot include chainName
					if (!_chainsToSelect.includes(chainName.toLowerCase())) {
						return
					}

					for (const sectionName in p.chainTvls) {
						const _sanitisedChainName = sectionName.startsWith(`${chainName}-`)
							? sectionName.split('-')[1]?.toLowerCase()
							: sectionName.toLowerCase()

						// add only if chainsToSelect includes sanitisedChainName and chainName equalt sanitisedChainName
						if (_chainsToSelect.includes(_sanitisedChainName) && chainName.toLowerCase() === _sanitisedChainName) {
							const _values = p.chainTvls[sectionName]

							// only add tvl values where chainName is strictly equal to sectionName, else check if its extraTvl and add
							if (sectionName.startsWith(`${chainName}-`)) {
								const sectionToAdd = sectionName.split('-')[1]
								extraTvl[sectionToAdd] = (extraTvl[sectionToAdd] || 0) + _values
							} else {
								if (_values.tvl) {
									tvl = (tvl || 0) + _values.tvl
								}
								if (_values.tvlPrevDay) {
									tvlPrevDay = (tvlPrevDay || 0) + _values.tvlPrevDay
								}
								if (_values.tvlPrevWeek) {
									tvlPrevWeek = (tvlPrevWeek || 0) + _values.tvlPrevWeek
								}
								if (_values.tvlPrevMonth) {
									tvlPrevMonth = (tvlPrevMonth || 0) + _values.tvlPrevMonth
								}
							}
						}
					}
				})

				return {
					...p,
					tvl,
					tvlPrevDay,
					tvlPrevWeek,
					tvlPrevMonth,
					change_1d: getPercentChange(tvl, tvlPrevDay),
					change_7d: getPercentChange(tvl, tvlPrevWeek),
					change_1m: getPercentChange(tvl, tvlPrevMonth),
					listedAt: p.listedAt
				}
			})

		if (isValidTvlRange) {
			const filteredProtocols = data.filter(
				(protocol) => (minTvl ? protocol.tvl >= minTvl : true) && (maxTvl ? protocol.tvl <= maxTvl : true)
			)

			return { data: filteredProtocols, selectedChains }
		}

		return { data, selectedChains }
	}, [protocols, chain, chainList, forkedList, toHideForkedProtocols, minTvl, maxTvl])

	const protocolsData = useCalcStakePool2Tvl(data)

	const { pathname } = useRouter()

	const airdropCheckerDialog = useDialogState()

	const {
		data: eligibleAirdrops,
		mutate: checkEligibleAirdrops,
		isLoading: fetchingEligibleAirdrops,
		error: errorFetchingEligibleAirdrops,
		reset: resetEligibilityCheck
	} = useMutation(airdropsEligibilityCheck)

	return (
		<Layout title={title} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: name }} />

			{claimableAirdrops ? (
				<FlexRow style={{ flexWrap: 'wrap' }}>
					{claimableAirdrops.map((protocol) => (
						<Button
							as="a"
							href={protocol.page}
							target="_blank"
							rel="noreferrer noopener"
							key={`claim-${protocol.page}`}
							color="green"
						>
							<span>{protocol.name ?? protocol.title}</span>
							<ArrowUpRight size={14} />
						</Button>
					))}
					<ButtonLight
						onClick={() => {
							resetEligibilityCheck()
							airdropCheckerDialog.toggle()
						}}
					>
						Check airdrops for address
					</ButtonLight>
					<Dialog state={airdropCheckerDialog} className="dialog">
						<CloseButton
							onClick={() => {
								resetEligibilityCheck()
								airdropCheckerDialog.toggle()
							}}
						>
							<X size={20} />
						</CloseButton>
						{eligibleAirdrops ? (
							eligibleAirdrops.length === 0 ? (
								<Error>No airdrops detected for this address</Error>
							) : (
								<List>
									{eligibleAirdrops.map((airdrop) => (
										<li key={`${airdrop[0]}:${airdrop[1]}`}>
											<p>{airdrop[0]}</p>
											<p>{airdrop[1]}</p>
										</li>
									))}
								</List>
							)
						) : (
							<DialogForm
								onSubmit={(e) => {
									e.preventDefault()
									const form = e.target as HTMLFormElement
									checkEligibleAirdrops({ address: form.address.value })
								}}
								data-variant="secondary"
							>
								<label>
									<span>Provide EVM address to check airdrops for:</span>
									<input name="address" required disabled={fetchingEligibleAirdrops} />
								</label>
								<FormSubmitBtn name="submit-btn" disabled={fetchingEligibleAirdrops}>
									{fetchingEligibleAirdrops ? 'Checking...' : 'Check'}
								</FormSubmitBtn>
								{errorFetchingEligibleAirdrops ? (
									<Error>{(errorFetchingEligibleAirdrops as any)?.message ?? 'Failed to fetch'}</Error>
								) : null}
							</DialogForm>
						)}
					</Dialog>
				</FlexRow>
			) : null}

			<TableFilters>
				<TableHeader>{header}</TableHeader>

				<Dropdowns>
					<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
					<TVLRange />
				</Dropdowns>
				{forkedList && <HideForkedProtocols />}
			</TableFilters>

			{protocolsData.length > 0 ? (
				<RecentlyListedProtocolsTable data={protocolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Couldn't find any protocols for these filters
				</Panel>
			)}
		</Layout>
	)
}

export const Button = styled(ButtonLight)`
	display: flex;
	gap: 4px;
	align-items: center;
	padding: 8px 12px;
	font-size: 0.875rem;
	font-weight: 500;
	white-space: nowrap;
	font-family: var(--font-inter);
	color: green;
`

const CloseButton = styled.button`
	margin: 0 -8px -16px auto;
`

const List = styled.ul`
	display: flex;
	flex-direction: column;
	gap: 24px;
	list-style: none;
	padding: 0px;

	li {
		display: flex;
		justify-content: space-between;
		gap: 16px;
	}
`

const Error = styled.p`
	color: red;
	text-align: center;
`
