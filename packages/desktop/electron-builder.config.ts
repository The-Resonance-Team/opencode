import { execFile } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

import type { Configuration } from "electron-builder"

// ponytail: APP_IDS intentionally duplicated across
// electron-builder.config.ts, src/main/index.ts, src/main/migrate.ts,
// src/main/background-cli.ts — build config runs in plain node (no electron
// import) while runtime runs in Electron main; extracting to a shared
// package would couple build tooling to runtime for three string literals.
// Keep duplication until a real shared constant is justified.

const execFileAsync = promisify(execFile)
const packageDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(packageDir, "../..")
const signScript = path.join(rootDir, "script", "sign-windows.ps1")

const metainfoFpm = (appId: string) =>
  `${path.join(packageDir, "resources", `${appId}.metainfo.xml`)}=/usr/share/metainfo/${appId}.metainfo.xml`

async function signWindows(configuration: { path: string }) {
  if (process.platform !== "win32") return
  if (process.env.GITHUB_ACTIONS !== "true") return

  await execFileAsync(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", signScript, configuration.path],
    { cwd: rootDir },
  )
}

const channel = (() => {
  const raw = process.env.OPENCODE_CHANNEL
  if (raw === "dev" || raw === "beta" || raw === "prod") return raw
  return "dev"
})()

const APP_IDS = {
  dev: "ai.opencode-resonance.desktop.dev",
  beta: "ai.opencode-resonance.desktop.beta",
  prod: "ai.opencode-resonance.desktop",
} as const

const getBase = (appId: string): Configuration => ({
  artifactName: "opencode-resonance-desktop-${os}-${arch}.${ext}",
  directories: {
    output: "dist",
    buildResources: "resources",
  },
  // Linux launchers are .desktop files, so this is the desktop file name,
  // not just the app id. For prod, app id "ai.opencode-resonance.desktop" becomes
  // "ai.opencode-resonance.desktop.desktop".
  // https://developer.gnome.org/documentation/guidelines/maintainer/integrating.html
  // https://www.electron.build/docs/linux/
  extraMetadata: {
    desktopName: `${appId}.desktop`,
  },
  files: ["out/**/*", "resources/**/*", "!resources/opencode-cli*"],
  extraResources: [
    ...(channel === "dev"
      ? [
          {
            from: "resources/",
            to: "",
            filter: ["opencode-cli*"],
          },
        ]
      : []),
    {
      from: "native/",
      to: "native/",
      filter: ["index.js", "index.d.ts", "build/Release/mac_window.node", "swift-build/**"],
    },
  ],
  mac: {
    category: "public.app-category.developer-tools",
    icon: `resources/icons/icon.icns`,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "resources/entitlements.plist",
    entitlementsInherit: "resources/entitlements.plist",
    notarize: true,
    target: ["dmg", "zip"],
  },
  dmg: {
    sign: true,
  },
  protocols: {
    name: "OpenCode Resonance",
    schemes: ["opencode-resonance"],
  },
  win: {
    icon: `resources/icons/icon.ico`,
    signtoolOptions: {
      sign: signWindows,
    },
    target: ["nsis"],
    verifyUpdateCodeSignature: false,
    // ponytail: no explicit guid — electron-builder derives guid from appId
    // (ai.opencode-resonance.desktop.*), so origin and fork get distinct
    // Windows uninstall registry keys and per-user install dirs.
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    installerIcon: `resources/icons/icon.ico`,
    installerHeaderIcon: `resources/icons/icon.ico`,
  },
  linux: {
    icon: `resources/icons`,
    category: "Development",
    executableName: appId,
    desktop: {
      entry: {
        // Match the installed .desktop file and hicolor icon basename so
        // Linux shells can associate the running Electron window with its launcher.
        StartupWMClass: appId,
      },
    },
    target: ["AppImage", "deb", "rpm"],
  },
})

function getConfig() {
  const appId = APP_IDS[channel]
  const base = getBase(appId)

  switch (channel) {
    case "dev": {
      return {
        ...base,
        appId,
        productName: "OpenCode Resonance Dev",
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "opencode-resonance-dev", fpm: [metainfoFpm(appId)] },
      }
    }
    case "beta": {
      return {
        ...base,
        appId,
        productName: "OpenCode Resonance Beta",
        protocols: { name: "OpenCode Resonance Beta", schemes: ["opencode-resonance"] },
        // ponytail: publish to same fork repo but on "beta" channel so prod
        // "latest" and beta "beta" assets (latest.yml/beta.yml) don't overwrite.
        // Creates a separate GH release channel; if you prefer a separate repo
        // use repo: "opencode-beta" with channel: "latest" (mirrors origin).
        publish: { provider: "github", owner: "The-Resonance-Team", repo: "opencode", channel: "beta" },
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "opencode-resonance-beta", fpm: [metainfoFpm(appId)] },
      }
    }
    case "prod": {
      return {
        ...base,
        appId,
        productName: "OpenCode Resonance",
        protocols: { name: "OpenCode Resonance", schemes: ["opencode-resonance"] },
        publish: { provider: "github", owner: "The-Resonance-Team", repo: "opencode", channel: "latest" },
        deb: { fpm: [metainfoFpm(appId)] },
        rpm: { packageName: "opencode-resonance", fpm: [metainfoFpm(appId)] },
      }
    }
  }
}

export default getConfig()
