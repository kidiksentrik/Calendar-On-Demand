# Custom Rules for Calendar-On-Demand

- **Release & Versioning Rule**: Do not increment the version or trigger a new release (`release.ps1`) for minor or incremental changes. Only bump the version and deploy updates when the user explicitly requests a release.
- **Pre-Release Verification & Linting Rule**:
  - Always run `npm test` (`npm run lint`) and ensure 0 errors and 0 warnings before proposing or publishing any release.
  - Never bypass undefined variable checks (`no-undef`).
  - Mandatory pre-release verification of core user scenarios:
    1. Creating a timed event and auto-saving via outside click
    2. Creating an all-day event and auto-saving
    3. Editing and deleting an event
    4. Opening and toggling settings modal
- **Landing Page Mirror Rule**: `docs/index.html` and `landing/index.html` must always remain byte-for-byte identical.
