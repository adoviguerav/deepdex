const { execFileSync } = require('child_process')
const path = require('path')

// macOS on Apple Silicon refuses to run an app whose signature no longer
// matches its bundle ("is damaged"). Without an Apple Developer account, an
// ad-hoc signature is what lets the downloaded app open.
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
}
