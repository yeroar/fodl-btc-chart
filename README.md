# Setup Guide — FODL Bitcoin Chart

## Prerequisites

- **macOS 14 (Sonoma)** or newer (Xcode 16+ requires it)
- **Xcode 16.1+** from App Store
- Physical iPhone or iOS Simulator
- Node.js >= 20.19

## Step 1: Xcode

Install Xcode from App Store, then set CLI tools:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Verify:
```bash
xcode-select -p
# Should show: /Applications/Xcode.app/Contents/Developer
xcodebuild -version
# Should show: Xcode 16.x
```

If using simulator, download iOS runtime:
```bash
xcodebuild -downloadPlatform iOS
```

## Step 2: Node.js

```bash
sudo npm install -g n && sudo n 20
```

If Homebrew node overrides it:
```bash
export PATH="/usr/local/bin:$PATH"
node -v  # Should show v20.20+
```

## Step 3: Ruby & CocoaPods

macOS ships with Ruby 2.6 which is too old. Use rbenv:

```bash
brew install rbenv ruby-build
rbenv install 3.3.0
rbenv global 3.3.0
eval "$(rbenv init -)"
gem install cocoapods
```

Verify:
```bash
ruby -v   # 3.3.0
pod --version  # 1.16+
```

Add to `~/.zshrc` so it persists:
```bash
echo 'eval "$(rbenv init -)"' >> ~/.zshrc
```

## Step 4: Install & Build

```bash
cd fodl-btc-chart
npm install
npx expo run:ios --device        # physical device
# or
npx expo run:ios                  # simulator
```

First build takes ~15-30 min (Skia compilation).



## Step 5: Trust Developer Certificate (physical device only)

On first install to a physical iPhone with a free Apple account:

1. iPhone → **Settings → General → VPN & Device Management**
2. Tap your Apple Developer certificate
3. Tap **Trust**
4. Open the app

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `React Native requires Xcode >= 16.1` | Update Xcode from App Store (requires macOS 14+) |
| `xcode-select` points to CommandLineTools | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| `pod install` fails with Ruby error | Install Ruby 3.x via rbenv (see Step 3) |
| `Cannot find module 'babel-preset-expo'` | `rm -rf node_modules && npm install` |
| `No iOS devices available in Simulator` | `xcodebuild -downloadPlatform iOS` |
| `No code signing certificates` | Open `ios/*.xcworkspace` in Xcode, enable auto-signing with your Apple ID |
| `Untrusted Developer` on iPhone | Settings → General → VPN & Device Management → Trust |
| cmake hangs during `brew install` | Don't install CocoaPods via brew — use rbenv + gem instead |
| Node.js outdated | `sudo npm install -g n && sudo n 20` |
| Homebrew LLVM conflicts | Ensure Xcode clang is used: `export PATH` without `/opt/homebrew/opt/llvm` |
