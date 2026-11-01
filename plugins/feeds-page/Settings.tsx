import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { iconButton } from './discord'
import { openFeed } from './FeedPage'
import { channelLabel, defaults, stores } from './feed'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'
import type { Settings } from './feed'

export default function SettingsComponent({
	api: { jsonStorage },
}: ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>) {
	const { channels } = { ...defaults, ...jsonStorage.use() }
	const TrashIcon = lookupGeneratedIconComponent('TrashIcon')
	const IconButton = iconButton()
	return (
		<Page>
			<Design.TableRowGroup>
				<Design.TableRow label="Open Feed" onPress={openFeed} arrow />
			</Design.TableRowGroup>
			<Design.TableRowGroup
				title="Channels"
				description="Long-press a channel and choose Add to Feed to add more."
			>
				{channels.map(id => {
					const channel = stores.channels.getChannel(id)
					const label = channel ? channelLabel(channel) : undefined
					return (
						<Design.TableRow
							key={id}
							label={label?.name ?? 'Unavailable channel'}
							subLabel={label?.place ?? id}
							trailing={
								TrashIcon && (
									<IconButton
										size="sm"
										variant="tertiary"
										icon={<TrashIcon size="sm" />}
										accessibilityLabel={`Remove ${label?.name ?? id}`}
										onPress={() =>
											jsonStorage.set({
												channels: channels.filter(channel => channel !== id),
											})
										}
									/>
								)
							}
						/>
					)
				})}
			</Design.TableRowGroup>
		</Page>
	)
}
