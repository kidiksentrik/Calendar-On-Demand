# HANDOFF.md - Calendar on Demand

## Current Goal
- **Seamless Desktop Integration**: A quick-access Google Calendar widget that lives in the Windows tray.
- **Authentication Stability**: Ensure persistent Google OAuth login without frequent re-authentication prompts.

## Context & Architecture
- **Tech Stack**: HTML/JS/CSS (Web-based widget) + VBScript/Windows Shell for tray integration.
- **Auth**: Google OAuth 2.0 (`auth.js`).
- **Logic**: `main.js` handles the tray icon and window management; `calendar.js` handles API calls.
- **Scripts**: `.vbs` files are used for running the app and setting up login startup on Windows.

## Recent Changes
- **Auth Persistence**: Fixed issues where the login window would reappear unnecessarily; improved token refreshing.
- **Landing Page**: Updated branding to reflect the solo developer status and v1.0.1 release.
- **Startup Logic**: Refined the `Start_at_Login.vbs` script.

## Next Steps (Pending Tasks)
1. **Event Management**: Implement "Add Event" functionality directly from the widget UI.
2. **Visual Polishing**: Add micro-animations for window opening/closing.
3. **Installer**: Create a simple `.msi` or `.exe` installer for easier distribution.

## Known Issues/Blockers
- **Google API Scopes**: Changes to Google's sensitive scopes might require a new app verification.
- **VBScript Deprecation**: Future Windows versions might deprecate VBS; consider migrating the tray logic to a small C# or Rust executable.
