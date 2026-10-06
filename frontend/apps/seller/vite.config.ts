import { remoteConfig } from '../../federation.shared'
import pkg from './package.json'

export default remoteConfig('seller', 5002, pkg.version)
