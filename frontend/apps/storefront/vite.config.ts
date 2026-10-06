import { remoteConfig } from '../../federation.shared'
import pkg from './package.json'

export default remoteConfig('storefront', 5001, pkg.version)
