# Billiards Play — Local table hosting

The first hosting release runs on Windows. Player screens run in Android, iPhone, iPad, Chromebook, Windows, and other modern browsers. Android hosting is not included in this release.

## Windows app

1. Install the current Billiards Trainer Windows installer.
2. Open **Billiards Play - Local Host** from the Start menu. This shortcut works without an internet connection. You can also choose **Local table → Start hosting on this computer** from Play in the updated Windows app.
3. Choose a game and enter the player names.
4. Open **Local table** to display the QR code. Choose the host's Wi-Fi address if more than one is listed.
5. Connect each player phone to the same Wi-Fi, scan the QR, and enter a name. No account, password, player download, or cloud service is needed.
6. On the host, select the matching game seat and choose **Approve player**. Only an approved seat receives that seat's private information.
7. Players tap **Show my private view** for cards or secret assignments, and **Enable turn alerts** for spoken prompts. Keep player screens open and awake. Vibration is optional where the browser supports it.

The host records pool shots and controls Undo. Player phones can make their own Poker Pool card choices, Blackjack Stand decisions, Battleship fleet choices, and Saboteur votes when that player's action is available. Requests go through the host game engine; players cannot change the score or claim another seat.

## Portable Windows host

Extract `Billiards-Play-Local-Host-Windows.zip`, then run `Start-Local-Play.cmd`. It contains Node.js and all player assets. Keep that window running for the session. No separate Node.js installation is required.

## From source

Install Node.js 24, run `npm ci --prefix local-host`, then `node local-host/start.cjs`. The console prints a private host URL. Open that URL on the host computer, choose a game, and use **Local table** to invite guests.

## Connection and privacy

- This is an offline LAN feature. The host computer and all players must be on a network that allows device-to-device traffic. Some venue guest networks block this. A private router or suitable hotspot is an alternative.
- The service listens on TCP port 8788. Windows may request network access; allow it on the trusted private network you are using. No firewall settings are changed automatically.
- The host URL is an administrator link and must stay on the host computer. Player QR codes contain a separate invitation and never the host key.
- Host APIs accept only loopback connections with the host key. Player access uses separate random tokens and explicit host seat approval. Public scores are whitelisted; other hands, targets, roles, fleets, the deck, random seed, and votes are not included in a player's response.
- Player transport is HTTP over the local network. This is intended for trusted private Wi-Fi; it is not transport encryption against someone intercepting that network. Do not expose or forward port 8788 to the internet.
- Private views hide on blur or when the page becomes hidden. Notifications for locked phones and closed apps are not part of this release. Audio needs the player's opt-in tap.
- If a player disconnects temporarily, reopening their same browser tab reconnects using its tab token. The host can remove a player and approve a replacement device. A new game requires seat approval again.
- Keep the host Play screen running. Closing the Windows host app ends hosting; player sessions and invitations then expire. The host's existing Play save and Undo history remain in that host browser profile, but players must rejoin after a server restart.

## Tests

`node --test local-host/test.cjs` checks approval, privacy, forbidden actions, duplicate and stale decisions, revocation, invitation reset, QR generation, and secret projections across game types.

`node local-host/browser.cjs` (with Playwright available) checks separate host/player browsers, joining and seat approval, private card choice, spoken turn events, reload, Undo preservation, and phone layouts. The Windows packaging workflow runs both before creating the installer.
