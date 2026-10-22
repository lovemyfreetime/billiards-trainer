# Practice Hub and Companion development

This is an isolated copy of the live app at `1456c56e728f1ce0e4c4a1cadbfc2f5803195a3c`, on `development/practice-companion`. It includes the full repository tree; production is not the development deployment target. Do not merge or build/publish Windows or Android packages yet.

## Open the development app

Install Node.js 22 or newer, download/clone this development branch, and run from its root:

```sh
node companion-dev/server.cjs
```

Open `http://127.0.0.1:8791/?companion=1`. No npm install is required for chat, table tools or dictation. OpenAI read-aloud has the optional setup below. The server binds only to this computer; it is not a LAN host or remotely hosted sign-in service. The normal Trainer, Guide, Zen, and Play files remain in this copy.

Select Practice Hub → Companion → AI connection → Continue with ChatGPT. Complete the official browser authorization, allow eligible plan usage, select an account-listed model, then send a message. Sign-in identity alone is not enough to authorize inference. This requires internet and an eligible account/service authorization; availability and plan limits are controlled by OpenAI. Jeff has tested sign-in and replies on the earlier development build. This change's live tool calls and generated OpenAI audio still need a connected-account test; automated checks use fixtures.

The local connector implements the documented public OAuth/PKCE flow independently. It verifies the signed identity, issuer, audience, nonce, expiry, state, and returning subject. It keeps credentials only in process memory and requires sign-in again after the server closes or the token expires. The stable host ID and issued registration ID are stored separately under the user's configuration directory. No tokens are written into repository files, browser storage, logs, or practice exports. Disconnect clears process credentials. Production-grade protected persistence, refresh, multi-account management, hosted eligibility, and wrapper integration remain future work.

Official protocol references:
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference

## Implemented development experience

- A blue Practice Hub launcher sits below SHOT and above TABLE / BALLS. Inside the Hub a back arrow returns to the full Trainer. Blue navigation and green actions match the Trainer. The Hub contains Companion, Library & paths, and My Practice.
- Visible text conversation, editable dictation, per-response read-aloud and optional automatic reading. Dictation keeps listening through pauses, restarts browser recognition when needed, and stops only on an explicit stop, leaving the Hub, a permission/network failure or hiding the page. Text is kept for review and never automatically sent. Dictation support varies and may use a browser-provided online service. Read-aloud uses the optional OpenAI audio connection, never the device synthesizer. No separate voice-only conversation.
- Explicit Table → Companion snapshot attachment and Companion → Table application. The native layout loader preserves current calibration and display preferences. A separate temporary return stack restores the preceding table and shot history. It lasts for the current page session.
- Original snapshot positions remain fixed as the live table changes. The source dropdown is removed. The composer and starter suggestions invite exploration, real-table reports and simulation comparisons. A table attachment alone remains a general shared setup; the model must use explicit player wording to interpret its origin. Historical source labels remain readable.
- Diagrams show numbered balls, proposed arrows, labels, and target regions. Applying a proposal loads ball positions and shows its separate annotations over the table. Sketches do not move balls; clear them explicitly. Geometric proposals are not solver-validated runout guarantees.
- Photo/file/camera attachments; JPEG/PNG/WebP are resized for conversation. Supported text files are TXT/MD; native table JSON files become validated layouts. Up to four attachments per message. Generic PDFs, generated decorative images, and web search are not implemented.
- Private device notes, saved layouts, conversation archives, unsent draft/attachment retention through IndexedDB, and JSON export. Storage failure is reported instead of announcing a successful save. Export restore/import is not implemented yet. Notes are sent to the model only when deliberately attached. The current conversation supplies up to twelve recent messages; older history remains on the device and is not automatically summarized.
- Existing lessons and optional learning paths are discoverable from Hub Library. Selection opens the existing Guide, layout, and narration. This is shared access, not a completed migration of all Guide teaching content into Hub-native lesson screens.
- Local sign-in, account-specific model discovery, completed Responses API streaming, structured text/layout proposals, cancellation, retry, and explicit disconnected state. No canned coaching impersonates AI. Each Send also shares a frozen snapshot of current Trainer positions, marker geometry, shot settings and calibration values; notes outside the submitted conversation stay private. The local provider sends that context and attachments with `store:false`; provider processing is still required for AI responses.

The authored runtime coaching brief reflects draft 0.2 principles: current purpose, mixed motivations, no hidden psychological diagnoses, learning preferences rather than fixed types, skill-specific progression, optional measurement, honest encouragement, and low interaction burden. The full 46-case conversation review set remains a design/evaluation artifact; it is not automatically installed as runtime examples. Model quality, physical feasibility, and coaching suitability need human review and real-player testing.

## Persistent app knowledge and supported tools

`companion-dev/app-knowledge.cjs` supplies every request with a shared versioned app manual, control contract, and searchable authored Guide/Play content. `companion-capabilities.js` is the single browser/server validation contract. This is persistent app configuration for all users, not fine-tuning or a change to the underlying model weights. Update the version and contract alongside app changes. It does not guarantee flawless model recall or coaching judgment.

Namespaced tools provide `app_help`, `read_state`, and `preview_shot`. The server retains only short-lived, account-bound continuations and preserves encrypted reasoning during a tool loop. The browser executes validated native physics previews against a frozen state copy, bounded to ten candidates; it never animates a shot or writes table/history/storage during preview. A preview is always Shot 1 from the table at Send, not a chain from earlier previews. It cannot validate an entire runout.

Replies can include reviewed settings, single-shot and Guide lesson proposals. Apply loads speed, aim, follow/draw, side spin, elevation and the native cue-tip badge. Normal mode fixes elevation at 3 degrees; adjustable elevation requires airborne mode. A shot proposal disables Shot 2 and says so before Apply. Current Shot 2 is visible as context but has no execution tool. The previous-table stack restores settings and history. Layout proposals preserve circular/square/triangle marker size, color, rotation, lock state and custom triangle vertices. Existing display toggles are allowlisted. Model output cannot execute arbitrary JavaScript, open private files, operate cameras, silently change calibration, manage Play scores or press Execute. The manual distinguishes supported tools from functions that require manual controls.

Medium reasoning is supplied for supported GPT-5/GPT-6 and o-series model names. Other models retain their default; the connection panel labels the setting. This is a default balance, not proof that medium is optimal for every coaching request.

## OpenAI read-aloud setup (optional)

Read-aloud uses OpenAI Realtime `gpt-realtime-2.1-mini`, Marin voice, through a server-only connection. This provides an OpenAI AI-generated voice, not access to the exact voice selected in the ChatGPT app. It reads the existing reply while text and images remain visible; it never starts microphone capture or a voice chat. No browser/device speech fallback is used.

Install the pinned audio dependency once from the project root:

```sh
npm ci --prefix companion-dev
```

Provide your OpenAI API key only in the local server environment. Never put a key in the chat, source code, browser, Git, or practice export. For PowerShell you can enter it without showing the key on screen:

```powershell
$voiceKey = Read-Host "OpenAI API key" -AsSecureString
$env:OPENAI_API_KEY = [System.Net.NetworkCredential]::new("", $voiceKey).Password
node companion-dev/server.cjs
```

API audio usage is billed separately from ChatGPT plan usage. Without setup, connection status explains what is missing and Read aloud shows that message. The key stays server-side; generated audio is transient. Stop cancels generation/playback. Long replies are read in short sequential parts. The Realtime model is instructed to read verbatim; generated speech and pronunciation still need listening review. No real audio was generated or quality-approved during automated tests.

Official audio references: https://developers.openai.com/api/docs/guides/text-to-speech and https://developers.openai.com/api/docs/guides/realtime-conversations . The legacy Speech models are deprecated, so this adapter uses the current Realtime workflow rather than adding a new dependency on the deprecated `/v1/audio/speech` models.

## Development checks

```sh
node --test tests/companion.test.cjs
node tests/companion.browser.cjs
python3 scripts/build-offline-assets.py --check
```

Browser checks use Playwright. Set `CHROMIUM_EXECUTABLE_PATH` if needed. `COMPANION_TEST_OUTPUT` chooses screenshot output. Test-only mocked responses exercise UI behavior; the product has no mock AI mode. Unit tests exercise invalid layouts, evidence labels, authentication checks, interrupted streams, origin protection, and private-file denial. Browser checks exercise desktop/mobile transfers, restoration, sketches, persistence, library handoff, and disconnected behavior.

The web asset manifest is rebuilt to keep the copied app consistent. This does not build, publish, or commit any Windows installer or APK. Static previews cannot run the local sign-in server; they retain honest disconnected messaging and allow local table/notes/lesson exploration.
