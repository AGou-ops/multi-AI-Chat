Status: done

# 实现导航、安全与权限基础策略

## Parent

`.scratch/multi-ai-chat-client/PRD.md`

## What to build

Control how platform pages navigate, open new windows, and request permissions. A user should be able to complete normal platform login flows inside the app, while unrelated cross-domain links open in the system browser and sensitive permissions require explicit confirmation.

## Acceptance criteria

- [x] Same-domain navigation stays inside the platform view.
- [x] Built-in platform login or authorization whitelist domains stay inside the app.
- [x] Custom platforms can use their configured whitelist domains for in-app login flows.
- [x] Cross-domain non-whitelisted links open in the system browser.
- [x] New window requests are intercepted and routed through the same navigation policy.
- [x] Permission requests such as microphone, camera, notifications, clipboard, and downloads are centrally handled.
- [x] Unknown or risky permissions are not silently granted.
- [x] Automated tests cover same-domain, whitelist-domain, cross-domain, and invalid URL decisions.

## Implementation notes

- `npm test` passes navigation and permission policy tests plus existing renderer/config tests.
- `npm run build` passes TypeScript and Electron/Vite builds.
- `npm run dev` was verified to start the Electron app cleanly on port 5173.
- `src/main/navigation-policy.ts` decides same-domain, auth-whitelist, cross-domain, invalid URL, and unsupported protocol outcomes.
- `src/main/permission-policy.ts` asks for known sensitive permissions and denies unknown permissions by default.
- Main process `WebContentsView` navigation, new windows, permission requests, and downloads now route through centralized handlers.

## Blocked by

- `.scratch/multi-ai-chat-client/issues/03-platform-sessions-local-config.md`
- `.scratch/multi-ai-chat-client/issues/04-custom-platform-management.md`
