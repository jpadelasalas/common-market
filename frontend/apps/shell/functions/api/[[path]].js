// Pages Function: /api/* is served by the Laravel API (see edge/proxy.js).
import { proxyToApi } from '../../edge/proxy.js'

export const onRequest = proxyToApi
