import { Design } from '@valenced/discord/design'
import { getModuleWithImportedPath } from '@valenced/discord/utils/modules/finders'
import { after } from '@valenced/patcher'
import { Children, cloneElement, isValidElement } from 'react'
import { clearData, validLogin } from './data'
import { closeRepos, openRepos } from './ReposSheet'
import type { ReactNode } from 'react'

interface ConnectionProps {
	account?: { type?: string; name?: string }
	children?: ReactNode
}

function replaceGithub(tree: ReactNode): ReactNode {
	return Children.map(tree, node => {
		if (!isValidElement<ConnectionProps>(node)) return node
		const account = node.props.account
		if (account?.type === 'github' && validLogin(account.name)) {
			const login = account.name
			return (
				<Design.TableRow
					key={node.key}
					label="GitHub Repositories"
					subLabel={login}
					onPress={() => openRepos(login)}
				/>
			)
		}
		return node.props.children === undefined
			? node
			: cloneElement(node, {}, replaceGithub(node.props.children))
	})
}

export default plugin({
	start({ cleanup, plugin }) {
		if (plugin.startedLate) plugin.requireReload()
		cleanup(() => {
			closeRepos()
			clearData()
		})
		cleanup(
			getModuleWithImportedPath<{
				UserProfileAccountConnectionsCard: (...args: unknown[]) => ReactNode
			}>('modules/user_profile/native/UserProfileConnections.tsx', module => {
				if (typeof module.UserProfileAccountConnectionsCard !== 'function') {
					plugin.reportError(
						'GitHub Repos: unsupported profile connections component.',
					)
					return
				}
				cleanup(
					after(module, 'UserProfileAccountConnectionsCard', replaceGithub),
				)
			}),
		)
		// Discord still uses this owner for legacy profile layouts.
		cleanup(
			getModuleWithImportedPath<{
				useConnectedAccountItems: (...args: unknown[]) => ReactNode
			}>(
				'modules/user_profile/native/LegacyUserProfileConnections.tsx',
				module => {
					if (typeof module.useConnectedAccountItems === 'function')
						cleanup(after(module, 'useConnectedAccountItems', replaceGithub))
				},
			),
		)
	},
})
