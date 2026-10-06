import { remoteConfig } from '../../federation.shared'
import pkg from './package.json'

export default remoteConfig('admin', 5003, pkg.version)
