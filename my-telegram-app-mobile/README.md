# My Telegram App Mobile

## Reanimated / Worklets Notes
- Reanimated 4 uses the Worklets Babel plugin. Keep `"react-native-worklets/plugin"` **last** in `babel.config.js`.
- After any Babel or plugin changes, clear Metro cache: `npx expo start -c`.

## Debugging Notes
- Do **not** enable Remote JS Debugging (Chrome/JSC). It is incompatible with Reanimated worklets and will trigger warnings or broken animations.
- Use Hermes Inspector (Expo DevTools) for debugging, or keep debugging off when validating Reanimated behavior.
