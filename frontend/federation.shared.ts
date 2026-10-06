import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

export const SHELL_ORIGIN = 'http://localhost:5000'

// One definition so shell and remotes cannot drift on singletons (ADR-02).
export const shared = {
  react: { singleton: true, requiredVersion: '^19.1.0' },
  'react-dom': { singleton: true, requiredVersion: '^19.1.0' },
  'react-router': { singleton: true, requiredVersion: '^7.8.0' },
}

/**
 * Remotes build immutable, versioned artifacts: dist/<release>/ served at /<release>/. The shell's
 * runtime manifest picks the release, so releasing = build a new folder + point the manifest at it,
 * and rollback = point it back. Old folders are kept (architecture.md: keep versioned artifacts).
 * RELEASE_VERSION overrides the package version for a demo release, e.g. RELEASE_VERSION=0.2.0.
 */
export const remoteConfig = (name: string, port: number, version: string) =>
  defineConfig(({ isPreview }) => {
    const release = ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.RELEASE_VERSION) || version
    return {
      // Preview serves every release folder side by side from dist/.
      // ponytail: fixed local origin; a deployment sets the versioned asset URL here.
      base: isPreview ? '/' : `http://localhost:${port}/${release}/`,
      define: { 'import.meta.env.VITE_RELEASE': JSON.stringify(release) },
      plugins: [
        react(),
        federation({
          name,
          filename: 'remoteEntry.js',
          exposes: { './routes': './src/routes.tsx' },
          // Inject the remote's own CSS when its routes load; remotes don't rely on shell styles beyond tokens/base.
          bundleAllCSS: true,
          shared,
          dts: false,
        }),
      ],
      build: { target: 'esnext', outDir: isPreview ? 'dist' : `dist/${release}` },
      preview: { port, strictPort: true, cors: { origin: SHELL_ORIGIN } },
    }
  })
