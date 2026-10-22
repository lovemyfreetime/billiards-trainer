# Practice Hub and Companion development

This is an isolated copy of the live app at `1456c56e728f1ce0e4c4a1cadbfc2f5803195a3c`, on `development/practice-companion`. It includes the full repository tree; production is not the development deployment target. Do not merge or build/publish Windows or Android packages yet.

## Open the development app

Install Node.js 22 or newer, download/clone this development branch, and run from its root:

```sh
node companion-dev/server.cjs
```

Open `http://127.0.0.1:8791/?companion=1`. No npm install is required. The server binds only to this computer; it is not a LAN host or remotely hosted sign-in service. The normal Trainer, Guide, Zen, and Play files remain in this copy.

Select Practice Hub → Companion → AI connection → Continue with ChatGPT. Complete the official browser authorization, allow eligible plan usage, select an account-listed model, then send a message. Sign-in identity alone is not enough to authorize inference. This requires internet and an eligible account/service authorization; availability and plan limits are controlled by OpenAI. Account sign-in and real inference have not been verified with Jeff's account.

The local connector implements the documented public OAuth/PKCE flow independently. It verifies the signed identity, issuer, audience, nonce, expiry, state, and returning subject. It keeps credentials only in process memory and requires sign-in again after the server closes or the token expires. The stable host ID and issued registration ID are stored separately under the user's configuration directory. No tokens are written into repository files, browser storage, logs, or practice exports. Disconnect clears process credentials. Production-grade protected persistence, refresh, multi-account management, hosted eligibility, and wrapper integration remain future work.

Official protocol references:
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference

## Implemented development experience

- Trainer / Practice Hub workspace tabs. The Hub contains Companion, Library & paths, and My Practice.
- Visible text conversation, editable dictation, per-response read-aloud and optional automatic reading. Speech uses browser/device capabilities; it does not include the Chase service. Dictation support varies and may use a browser-provided online service. No separate voice-only conversation.
- Explicit Table → Companion snapshot attachment and Companion → Table application. The native layout loader preserves current calibration and display preferences. A separate temporary return stack restores the preceding table and shot history. It lasts for the current page session.
- Original snapshot positions remain fixed as the live table changes. Provenance distinguishes exploration, player-reported physical outcome, simulation result, and Companion proposal.
- Diagrams show numbered balls, proposed arrows, labels, and target regions. Applying a proposal loads ball positions and shows its separate annotations over the table. Sketches do not move balls; clear them explicitly. Geometric proposals are not solver-validated runout guarantees.
- Photo/file/camera attachments; JPEG/PNG/WebP are resized for conversation. Supported text files are TXT/MD; native table JSON files become validated layouts. Up to four attachments per message. Generic PDFs, generated decorative images, and web search are not implemented.
- Private device notes, saved layouts, conversation archives, unsent draft/attachment retention through IndexedDB, and JSON export. Storage failure is reported instead of announcing a successful save. Export restore/import is not implemented yet. Notes are sent to the model only when deliberately attached. The current conversation supplies up to twelve recent messages; older history remains on the device and is not automatically summarized.
- Existing lessons and optional learning paths are discoverable from Hub Library. Selection opens the existing Guide, layout, and narration. This is shared access, not a completed migration of all Guide teaching content into Hub-native lesson screens.
- Local sign-in, account-specific model discovery, completed Responses API streaming, structured text/layout proposals, cancellation, retry, and explicit disconnected state. No canned coaching impersonates AI. The local provider sends only the submitted conversation context and attachments with `store:false`; provider processing is still required for AI responses.

The authored runtime coaching brief reflects draft 0.2 principles: current purpose, mixed motivations, no hidden psychological diagnoses, learning preferences rather than fixed types, skill-specific progression, optional measurement, honest encouragement, and low interaction burden. The full 46-case conversation review set remains a design/evaluation artifact; it is not automatically installed as runtime examples. Model quality, physical feasibility, and coaching suitability need human review and real-player testing.

## Development checks

```sh
node --test tests/companion.test.cjs
node tests/companion.browser.cjs
python3 scripts/build-offline-assets.py --check
```

Browser checks use Playwright. Set `CHROMIUM_EXECUTABLE_PATH` if needed. `COMPANION_TEST_OUTPUT` chooses screenshot output. Test-only mocked responses exercise UI behavior; the product has no mock AI mode. Unit tests exercise invalid layouts, evidence labels, authentication checks, interrupted streams, origin protection, and private-file denial. Browser checks exercise desktop/mobile transfers, restoration, sketches, persistence, library handoff, and disconnected behavior.

The web asset manifest is rebuilt to keep the copied app consistent. This does not build, publish, or commit any Windows installer or APK. Static previews cannot run the local sign-in server; they retain honest disconnected messaging and allow local table/notes/lesson exploration.
