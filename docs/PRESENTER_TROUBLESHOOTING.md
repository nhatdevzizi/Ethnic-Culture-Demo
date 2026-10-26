# Presenter troubleshooting and acceptance rehearsal

The game remains a fictional demo. A successful software check does not approve cultural facts or replace a real laptop/projector rehearsal.

## Start from the local build
1. In the project folder, run `npm install`, then `npm run build`.
2. Run `npm run preview` and open http://127.0.0.1:4281/?mode=presentation&lang=vi .
3. Keep the whole dist folder together. Use a local HTTP server; opening index.html with file:// is not supported.
4. Use Start for a fresh passport or Continue to retain earned stamps. Current attempts restart after reload; completed and skipped activity results remain saved when browser storage works.

The installed dependencies are needed for npm's preview command. A different static HTTP server may serve the complete dist folder without the development project. Fonts, images, sounds, and game content load locally. Credits links need internet only when opened.

## During the presentation
| Situation | Action and expected result |
|---|---|
| Pause or interruption | Use P/Esc or Pause. A hidden page or lost window focus also pauses. Resume explicitly when ready. Old sounds must not replay. |
| Too much motion | Open Pause or Presenter and enable Low motion. Walking still works; the visitor uses a still frame. Essential rhythm captions and beat changes remain visible. |
| Sound is off | Sound starts muted. Enable it after a user gesture in Pause/Presenter and adjust Volume. M also toggles mute. |
| Sound cannot play | The open caption reports unavailable sound. Continue using visual cues/captions or the untimed rhythm option. Reload after fixing the local files or audio device. |
| Fullscreen is denied | Use the browser's fullscreen control. The game keeps its progress and reports the fallback. |
| Keyboard control | Use Tab/Shift+Tab to reach buttons and settings, Enter/Space to activate, and WASD/arrows in the hub. E/Space advances guide dialogue. Native slider arrows remain available. |
| A challenge takes too long | Retry, restart, choose untimed rhythm, or skip with N in guided mode. A skip stays skipped and earns no stamp. |
| A long panel hides lower actions | Scroll within the panel or use Tab to reach the next control. Focused controls remain reachable. |

## Recovery messages
| Message or fault | Meaning and recovery |
|---|---|
| Critical local resource cannot load | The map or an essential image is unavailable. Confirm that the full build is hosted, then select Reload. |
| Optional font fails | The game continues with system fonts. Check Vietnamese glyphs on the presentation device and restore the bundled fonts before public use. |
| Browser storage is unavailable | The session remains playable in memory. Keep the page open: reload may lose progress. Check browser storage policy or quota before the next talk. |
| Malformed or outdated save | The game starts safely with fresh progress. This is not reported as a storage outage when storage itself still works. |
| Saved position is blocked by the new map | The visitor returns to the plaza; valid stamps and learned facts remain. |
| Unexpected runtime error | A localized recovery panel freezes play and sound. Reload, then Continue to retain previously saved stamps. The current attempt will restart. |
| Port 4281 is occupied | Stop the previous preview you own, or explicitly select another port. Do not terminate an unrelated application. |

If a development tool reports a local configuration access error, use an execution context with permission to read the project and its parent configuration directories. Do not change game validation to hide that environment problem.

The installation check on the current checkout completed successfully. Its local npm policy blocked two esbuild postinstall scripts, while the available binaries passed the actual build and unit checks. A clean installation on a different device still needs verification under that device's approved setup policy.

## Physical acceptance rehearsal
These items are still manual. Record the device, browser, display resolution, and observed result rather than checking them by assumption.

- [ ] Cold launch the local production build with the internet disconnected.
- [ ] Complete M01, M02, and M03, return to each entrance, and reach the three-card ending.
- [ ] Confirm names, captions, focus outlines, controls, and review text are readable at the intended audience distance.
- [ ] Enter and exit fullscreen on the actual browser/display.
- [ ] Switch tabs and applications during timed rhythm; confirm pause and explicit recovery without stale audio.
- [ ] Check speaker volume, mute, and an unavailable audio device. The visual/untimed route must remain playable.
- [ ] Use only the keyboard for a complete presentation, including scrolling longer panels.
- [ ] Run on the intended lower-powered laptop and note dropped input or pauses. Browser CPU throttling is only a proxy.
- [ ] Rehearse the suggested 5–7 minute speaking plan; record actual duration.
- [ ] Obtain qualified cultural review and media permission before replacing fictional records with public educational material.

Do not declare the educational MVP presentation-ready until the relevant software, content, and physical-device checks all pass. Phase 5 remains deferred.
