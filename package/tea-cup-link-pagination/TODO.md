# Tea Cup Link Pagination - Testing TODOs

## E2E & Integration Test Scenarios

- [ ] **Direct chat message navigation (direct link like in CF)**:
  - Navigating directly to a URL with a target message ID (`/room/:roomId/chat/:chatId`).
  - Verifying the targeted message is highlighted and correctly scrolled into viewport.

- [ ] **Scroll to latest**:
  - Test scrolling to newest messages when sending a new chat, clicking "Scroll to bottom" button, or returning to a room without target key.
  - Verify container scrolls smoothly to `container.scrollHeight` (`isReversed = true`).

- [ ] **Offline mode**:
  - Test UI behavior when switching network toggle to offline.
  - Verify cached chats render from local state/cache and retry mechanisms trigger properly when coming back online.

- [ ] **API response returns fewer results than cache (deleted chats)**:
  - Scenario where cache has 20 chats, but API returns 18 chats (due to deleted chats).
  - Verify cursor / scroll position remains anchored and stable without visual jump.

- [ ] **API response returns more results than cache (new chats inserted above/below)**:
  - Scenario where cache has fewer chats than the API response.
  - Verify scroll position remains stable and doesn't abruptly jump away from the active reading position.

- [ ] **TODO: Add more test scenarios**
