#!/usr/bin/env bash
# Ensures CocoaPods (user gem) is on PATH for Capacitor iOS commands.
# Usage: source mobile/scripts/ios-env.sh
#    or:  ./mobile/scripts/ios-env.sh   (prints export lines)

GEM_BIN="${HOME}/.gem/ruby/2.6.0/bin"
if [[ -d "$GEM_BIN" ]]; then
  case ":$PATH:" in
    *":$GEM_BIN:"*) ;;
    *) export PATH="$GEM_BIN:$PATH" ;;
  esac
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods (pod) not found. Install with:" >&2
  echo "  gem install cocoapods -v 1.11.3 --user-install --no-document" >&2
  echo "  (plus Ruby 2.6-compatible pins if needed — see docs/mobile-app.md)" >&2
  return 1 2>/dev/null || exit 1
fi

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  echo "export PATH=\"$GEM_BIN:\$PATH\""
  echo "# pod $(pod --version 2>/dev/null)"
fi
