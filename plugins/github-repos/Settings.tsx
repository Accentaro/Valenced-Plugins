import Page from '@valenced/components/Page'
import { Design } from '@valenced/discord/design'
import { lookupGeneratedIconComponent } from '@valenced/utils/discord'
import { useMemo, useState } from 'react'
import { validToken } from './data'
import type { PluginSettingsComponent } from '@valenced/plugins/types'
import type { ComponentProps } from 'react'

export interface Settings {
	token?: string
}

export default function SettingsComponent({
	api: { jsonStorage },
}: ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>) {
	const saved = jsonStorage.use()?.token ?? ''
	const [draft, setDraft] = useState<string>()
	const [revealed, setRevealed] = useState(false)
	const icons = useMemo(
		() => ({
			show: lookupGeneratedIconComponent('EyeIcon'),
			hide: lookupGeneratedIconComponent('EyeSlashIcon'),
		}),
		[],
	)
	const value = draft ?? saved
	const invalid = value !== '' && !validToken(value)
	const update = (text: string) => {
		const next = text.trim()
		setDraft(next)
		// Only complete tokens are stored, so partial input never reaches GitHub.
		if (next === '') void jsonStorage.set({}, true)
		else if (validToken(next)) void jsonStorage.set({ token: next })
	}
	// Not in the typed props. Same reveal toggle as Discord's login password field;
	// autofill is off so password managers never offer to save the token.
	const untyped = {
		autoComplete: 'off',
		trailingPressableProps: {
			accessibilityLabel: revealed ? 'Hide token' : 'Show token',
			onPress: () => setRevealed(shown => !shown),
			hitSlop: { top: 8, bottom: 8 },
		},
	}

	return (
		<Page>
			<Design.TextInput
				{...untyped}
				label="GitHub token"
				description="Optional. Raises GitHub's limit from 60 to 5,000 requests an hour. Create a fine-grained token at github.com/settings/personal-access-tokens with public repository access and no permissions."
				placeholder="github_pat_..."
				size="md"
				secureTextEntry={!revealed}
				trailingIcon={revealed ? icons.hide : icons.show}
				value={value}
				status={invalid ? 'error' : 'default'}
				errorMessage={invalid ? 'This is not a GitHub token.' : undefined}
				onChange={update}
			/>
		</Page>
	)
}
