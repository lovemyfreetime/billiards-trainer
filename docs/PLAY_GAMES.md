# Billiards Trainer — Play: our games, our rules

Design edition 0.2 • October 17, 2026

## The direction

We are creating our own digital game room. Familiar pool and card-game ideas give people an easy way in; we choose the rules that make our versions enjoyable. Every game below is our proposed first playable version. We can change it after people play. Research is background inspiration, not a permission slip.

The goal is simple: **pick a game, understand your job, start shooting, enjoy what happens.** The app handles dealing, counting, turns, surprises and recovery. The players supply the shots and the banter.

Three tests for every rule:

1. Can someone explain it while the next player chalks their cue?
2. Does it create an enjoyable decision, consequence or surprise?
3. Can the app manage it without turning the player into a clerk?

The rules must be consistent enough for the software to work. They do not need to resemble a league rulebook. No difficulty, handicap or surprise changes secretly halfway through a game.

## How the room works

Choose **On-screen** to shoot on our simulated table, or **At a table** to let the app deal and keep score while people shoot physically. Both use the same game rules. At a real table someone reports the result; the app cannot see an unreported scratch or know a ball's new position.

All games show the shooter, who is next, the objective, a meaningful score and Undo. Cards and special boards sit beside or below the cloth. A real-table session can use the entire screen as a big scoreboard. A one-sentence turn call replaces instructions wherever practical.

Use casual names and guest seats. No account setup before a friendly game. Pressure clocks are optional. A visible pre-game advantage can help mixed skill groups; the app never calls someone the weak player.

### Our ordinary shot rules

Unless a game below says otherwise:

- A shot is legal when the cue ball contacts an allowed object ball and then a ball is pocketed or any ball reaches a cushion. Scratches, wrong first contact where applicable, push/double hits and balls off the table are fouls.
- A foul beats a reward: a ball made with a scratch does not earn a card, point, hit or bonus. Lose the turn; next player gets cue ball anywhere. Object balls pocketed on that foul are returned to the foot spot, with additional balls placed on the centerline toward the foot rail, or toward the head rail if that space is blocked.
- Start with cue ball behind the head string. The opening break needs a pot or four object balls reaching cushions. An illegal opening break gets one free rerack and retry. A second illegal break ends the turn with the next player getting cue ball anywhere on the existing layout. A scratch on either break is an ordinary foul instead of a free retry. Killer, Bowliards, Three-Ball, Golf, H-O-R-S-E, Equalizer and Speed specify their own start behavior.
- Multi-pots are one shot. Apply the entire shot, including any foul, before declaring a winner. Nobody needs to guess which ball fell first.
- Where a game uses a fixed number of rounds, everyone gets their scheduled turn before the round closes. A player cannot win merely because their seat was earlier.
- Shared-rack games rerack when empty if the game continues. Keep cards, points, territories and turn order unless that game's rules say reset them.
- A required rerack or returned ball pauses any shot clock. **Table Ready** restarts play.
- A tied fixed-round game can end as a friendly draw. **Play a Tiebreak** offers one equal extra turn or attempt per tied player, repeated if still tied. Elimination games and race-to-target games use their stated finish instead.

Single-stroke turns keep a group involved; run-until-miss turns reward a runout. Each game says which applies. The app says “One shot” or “Keep shooting” so nobody has to remember.

## Our twenty-game lineup

### 1. Kelly Pool — Your number. Your secret.

**People and equipment:** 2–8 players; full rack. The app replaces the bottle and numbered peas.

Deal each player one different secret ball number. Play lowest-numbered ball first; any legal pot lets you keep shooting. Pocket your own number legally to win immediately. If someone else pockets your number, the app privately gives you a new unclaimed number still on the table. You stay in the game. The replacement cannot score on the shot that caused it.

This creates the main tension: do you shoot the obvious ball or quietly maneuver toward your number? A scratched winning ball returns and does not win. If no free number remains for a replacement, rerack and redeal everyone; nobody is permanently sidelined. Show only a neutral private-update indicator, never an owner-colored target.

**App flow:** Deal → shoot → win OR update affected numbers → keep shooting/pass. **Turn call:** “Lowest first: four.”

### 2. Secret Bounty — Hunt without giving yourself away.

**People and equipment:** 2–6 players; full rack and private digital contracts.

Five rounds, one shot each per round. Every legal pot earns one point; pocketing your own secret target earns two extra. After claiming a bounty, receive another target from balls still on the table. If someone else removes your target, get a replacement without the bonus. Different players may share a target; only the actual shooter scores. Replacements take effect for future shots. Rerack if empty. Highest score after five full rounds wins.

A private contract makes an ordinary ball meaningful without stopping the group to explain it. No manual “claim bounty” button—the app already knows. Ordinary multi-pots score normally but never start a chain of retroactive new bounties.

**App flow:** Deal → one shot → points and contract updates → next → round five result. **Turn call:** “Jeff, one shot.”

### 3. Cutthroat — Protect yours. Remove theirs.

**People and equipment:** three players; full rack.

Each player owns five balls: 1–5, 6–10 or 11–15. Pocket anyone's balls, including your own, to keep shooting. Keep at least one of yours alive while removing the others. Losing your last ball ends your turn; your turns are skipped while you have none. Last player with balls remaining wins.

For our comeback twist, a scratch returns one pocketed ball belonging to each opponent. Scratch pots stay down before those returns; no additional ordinary foul-pot returns apply. This can bring a player back. Other fouls follow the shared rule. If one legal shot clears everybody's last ball, return one per player and keep going. Resolve returns before checking the winner.

**App flow:** Shoot → remove balls → scratch returns if needed → update who is alive → winner or next. **Turn call:** “Cindy is back in.”

### 4. Poker Pool — Shoot for a better hand.

**People and equipment:** 2–6 players; full rack and a virtual 52-card deck.

Five rounds, one shot per player per round. Every turn adds one card to your private hand. Miss or foul: receive one random card. Legally pocket at least one ball: see two cards and choose which one to keep. Discard the other. Multi-pots still earn one choice. After five rounds everyone has five cards; reveal and compare poker hands. Best hand wins; identical hand values tie, with no suit tiebreak.

Shooting well gives you better choices, while luck keeps less experienced players in the game. Ball numbers do not pretend to be card ranks. If the deck empties, reshuffle only discarded cards. The app explains the winning hand and highlights its cards. A nine-high straight is simply shown as a straight; no poker knowledge required.

**App flow:** Shoot → one random card OR choose one of two → next → fifth round reveal. **Turn call:** “Ball made. Pick your card privately.”

### 5. Twenty-One / Blackjack — Take another shot, or stand?

**People and equipment:** 2–6 players; full rack and virtual cards.

Three hands. Each player begins a hand with two private cards: aces count 1 or 11, face cards 10. On your turn choose **Stand**, or shoot one stroke to **Hit**. A legal pot draws one card; miss locks your current total; foul busts the hand. After a successful hit, your next decision waits until your next turn, keeping everyone involved. A total of 21 stands automatically; above 21 busts. No splits, doubling, dealer or special natural-blackjack payout.

When everyone stands or busts, highest non-bust total earns one match point; tied leaders each earn one. All bust means no point. Most points after three hands wins. Use one deck; reshuffle discards between hands. Rerack the physical balls when needed without changing cards.

**App flow:** Deal two → Stand or Hit → shoot/draw/lock/bust → next active → settle hand. **Turn call:** “Hit or stand?”

### 6. Cribbage Pool — Find your partner.

**People and equipment:** two players; full rack, with 15 at its center.

Pairs adding to fifteen earn one point: 1+14, 2+13, through 7+8. Pocket a ball, then pocket its partner on your next shot. Finish a pair and keep shooting. Miss the required partner and the unmatched ball returns to the table; your turn ends. Completed pairs stay scored.

Multi-pots can create several owed partners: the next shot must make at least one of them. New unmatched pots add to the list. Both partners falling on one legal stroke score together. On a foul, no new pairs score and all unfinished held balls return along with foul pots. The 15 returns if made early; after all pairs it is one final point. First to five wins; 4–4 after clearing is a draw or another rack.

**App flow:** Open choice → ball made → show partner(s) → pair score or return → next. **Turn call:** “Find the eleven.”

### 7. Billiards Bingo — Make a line of good shots.

**People and equipment:** 2–6 players; cue ball, one object ball, optional obstacle balls. The app supplies digital 3×3 boards and reset diagrams.

Each board contains the same nine tasks shuffled differently: three corner pots of varied angles, two side pots, a bank, a kick-pot, a draw-position shot and a follow-position shot. Each task has a pictured setup and clear success zone. Choose a cell, set up its shot and take one attempt. Success marks it; failure leaves it open. One attempt per turn. First completed row, column or diagonal wins after the whole round finishes, allowing joint winners. After ten rounds, most marked cells wins if nobody has a line.

Using reset diagrams prevents “my bank task is impossible from here.” The tradeoff is setup time, so keep diagrams simple. A marked cell cannot score again.

**App flow:** Choose cell → set up → attempt → mark or leave → next → line check. **Turn call:** “One more for the diagonal.”

### 8. Killer — Make it. Stay alive.

**People and equipment:** 2–12 players; full rack.

Three lives each. One stroke per turn. Make any ball legally and keep your lives; miss or foul and lose one life. No double penalty for missing and scratching together. Last player alive wins. A dry break gets one free retry; a second dry break loses a life. A break scratch loses a life immediately. No cushion-count requirement on Killer breaks.

Our optional **Black Ball Bonus** gives one extra life for legally potting the eight, capped at the starting life count. It never cancels a scratch. Default is off for the simplest game. Rerack when empty; next scheduled player breaks. Agree starting lives 2–5 if the room wants balance.

**App flow:** One shot → retain/lose/gain life → eliminate if zero → next or winner. **Turn call:** “Last life, Jeff.”

### 9. Turf War — Every pocket is worth fighting for.

**People and equipment:** 2–4 players or teams; full rack.

Six pockets begin neutral. One shot per turn. A legal pot takes ownership of its pocket, even if someone owned it before. At the end of each full round, each owned pocket pays its owner one point. Play eight rounds; highest total wins. Multi-pots can capture several pockets. Foul pots claim nothing. Reracking does not erase territory.

Players can see a leader's territory and work together to take it away. The current owner is shown directly around each pocket; no map to interpret. Points arrive once per round, so delaying a turn cannot farm points. At a real table report ball and pocket; on-screen the app knows both.

**App flow:** Shoot → capture pocket(s) → next → end-round territory payout → repeat. **Turn call:** “Side pocket stolen.”

### 10. Battleship Billiards — Pot a ball. Fire a shot.

**People and equipment:** two players; full rack and private digital fleet boards.

Privately place a two-cell ship and a three-cell ship on a 3×3 grid, straight and not overlapping. One pool stroke per turn. A legal pot earns one attack on an untried enemy square. The app announces hit, miss or sunk. A pool miss/foul earns no attack. First to sink both ships wins. Multiple pots still earn one attack.

The fleet grid is a little game beside the pool table, not an invisible location somebody must physically hit with the cue ball. Reracking preserves fleets. Attacks earned on the last pool ball resolve before the rerack. Repeated squares are disabled.

**App flow:** Hide fleets → shoot → attack if earned → hit/sunk check → next or win. **Turn call:** “Hit. Ship still afloat.”

### 11. Golf Pool — Six pockets. Fewest strokes.

**People and equipment:** 1–6 players; cue ball and one object ball.

Play six holes, one assigned pocket each. Every hole starts cue ball on the head spot and object ball at center. Count every stroke until the target pot. A wrong-pocket pot adds one penalty and resets the object ball at center; a scratch adds two penalty strokes and resets cue ball to head spot. Other fouls add one. On a foul, an object ball that fell returns to center; no hole is completed. Apply only the largest applicable penalty on a stroke. Ten total strokes caps a hole at 10.

Each player finishes the hole, then the next plays that same setup. Lowest total wins. A rotating view must not change pocket identity. An eighteen-hole option repeats the six-pocket course three times. Later we can add named obstacle courses without changing this simple core.

**App flow:** Hole setup → strokes → holed/capped → next player → next hole → totals. **Turn call:** “Hole four, left side pocket.”

### 12. Undercover Saboteur — Someone wants the team to fail.

**People and equipment:** 4–8 players; full rack and private roles.

The app secretly chooses one saboteur. Everyone takes one shot per turn for four full rounds. The team needs 2×player-count legal scoring strokes by the end—half of all opportunities. Any legal stroke with at least one pot adds one progress, even a saboteur's pot. Misses and fouls add none. Saboteur wins if the team falls short; everyone else wins if the target is reached. Finish all scheduled turns before the reveal. Rerack when empty.

After round two, one private vote asks who the saboteur is. A strict majority correctly naming them adds one team progress; any other outcome changes nothing. Reveal neither the vote target nor correctness until the end. No elimination, repeated accusations or penalties for honest misses. The saboteur may bluff and shoot strategically but must report truthfully.

This one especially needs a real group playtest: the quota may need adjustment between games, and deliberate misses may be too obvious. Keep the first version short and light.

**App flow:** Deal roles → shoot and team progress → one private vote → finish rounds → reveal roles/vote/result. **Turn call:** “Team needs three more.”

### 13. H-O-R-S-E — Can you make my shot?

**People and equipment:** 2–6 players; whatever balls the chosen shot needs.

Leader sets a shot, declares its pocket and any required bank or cue-ball finish zone, and attempts it. If the leader fails, the next player becomes leader. If successful, everyone else gets one attempt from the same restored setup. A failed imitation earns the next letter. H-O-R-S-E eliminates you; last player wins. Complete the follower cycle before choosing a new leader, advancing one seat from the old leader. No last-letter redemption in the first version.

Save the layout before the leader shoots. The app shows the reset diagram and keeps the follower queue. A finish zone is optional; require a clearly drawn zone rather than an argument about “close enough.” A shorter P-I-G option makes a quick rematch.

**App flow:** Set/lock shot → leader attempt → follower attempts → letters → next leader. **Turn call:** “Match Cindy's shot.”

### 14. Ghost Runout — Beat the opponent who never misses.

**People and equipment:** solo; choose 3, 6, 9 or 10 balls.

Break, take cue ball anywhere, then clear in numerical contact order without missing or fouling. A successful clearance gives you the rack; first miss/foul gives it to the ghost. Race to five. Break pots count, and break scratches are forgiven. Jumped objects return. No cushion-count requirement on the break. A highest-numbered ball made before the others returns until it is the last ball. A legal complete clearance on the break wins the rack.

Optional **One Rescue** lets you recover from one post-break miss per match; no foul rescue. Make its unused token obvious and separate assisted scores. The point is meaningful solo consequence without complicated logging.

**App flow:** Break → ball-in-hand → runout → player/ghost rack → race check. **Turn call:** “Three balls between you and the rack.”

### 15. Equalizer — Different allowances. Same challenge.

**People and equipment:** two players; three-ball layouts supplied by the app.

Five shared layouts, each restored for both players. Clear all three in one visit to score a point. At setup each player chooses zero, one or two allowed misses and zero or one cue-ball reset per layout; show these openly. A foul always ends the attempt. One more miss than your allowance ends it. A reset can be used only before a stroke. Most completed layouts wins after all five; tied totals draw or use another shared layout.

Alternate who goes first. This is our game and our balancing mechanic. Avoid promising mathematical equality: the room chooses a matchup that feels competitive, and can adjust next game. Show actual balls made as well as layout points so a losing player can see progress.

**App flow:** Shared layout → first attempt → restored second attempt → points → next layout. **Turn call:** “One reset available.”

### 16. Bowliards — Bowling drama on a pool table.

**People and equipment:** solo or 2–4 players; ten object balls.

Ten frames. Each frame starts with a free break; spot every break pot and take cue ball anywhere. No break foul penalties or cushion-count requirement. You get two visits to pocket ten balls, any order. Legal pots count one each; miss/foul ends that visit. A scoring foul returns that stroke's pots. Second visit starts where cue ball lies, except a scratch gives cue ball anywhere. Ten in the first visit is a strike; clearing the remainder in the second is a spare. Otherwise score balls made.

Use bowling scoring: strike adds the next two visit totals; spare adds the next one. Tenth-frame strike earns two bonus visits; spare earns one. Rerack with a free break whenever a bonus visit starts with no objects left; otherwise keep the remaining layout. No extra bonuses beyond those earned by frame ten. Highest total wins. A five-frame quick option applies those same final-frame bonus rules to frame five.

**App flow:** Free break → visit one → strike or visit two → frame score → next frame/bonus → result. **Turn call:** “Four left for the spare.”

### 17. Ring Game — Everybody gets a seat in the action.

**People and equipment:** 3–6 players; nine balls.

Lowest ball first; keep shooting after legal pots. The five earns one point. The nine earns two when made last; an early nine returns and earns nothing yet. Miss/foul passes play to the next person. Play five racks; highest score wins. Rotate who starts each rack one seat, irrespective of who ended the last one. No money is needed—the app runs the point ledger.

The contrast with one-shot games is a chance to string together a real visit. A five-ball pot with a scratch returns and scores zero. If five and an early nine fall legally together, score the five and return the nine. Players can see the upcoming point balls without having to learn a settlement system.

**App flow:** Run → score five/nine → pass or keep shooting → finish rack → rotate starter. **Turn call:** “Five ball is worth a point.”

### 18. Three-Ball — How low can you go?

**People and equipment:** 1–8 players; three object balls in a small triangle.

Three rounds; each person gets a fresh rack. Clear all three in as few strokes as possible. Break counts as stroke one; no minimum cushion requirement. Every miss still counts one stroke. A foul adds one extra penalty stroke, returns that stroke's pots, and gives cue ball anywhere after a scratch. Never apply more than one extra penalty per stroke. Six total strokes caps the attempt at 6. Lowest sum across three rounds wins.

A legal three-ball break is a score of one. The app keeps the number huge and accepts multiple balls in one stroke. A cap keeps somebody from being trapped in a long unsuccessful visit while everyone waits. Ties can share the result or play one fresh rack each.

**App flow:** Rack → count strokes and penalties → clear/cap → next player → total. **Turn call:** “Three. One ball left.”

### 19. Speed Pool — Race the clock.

**People and equipment:** solo or several players taking turns; full rack.

Clear all fifteen balls, any order. Break starts the clock; last legal pot stops it. No special eight-ball rule, called shots or cushion-count requirement on the break. Cue ball must stop before you shoot again; object balls may still move. Every foul adds ten seconds, once per stroke, and foul pots return. A scratched final pot therefore does not finish the attempt. Best adjusted time from two attempts wins.

At a physical table, a friend can run Start, Penalty and Finish, or use a clearly labeled self-timed attempt. No per-pot tapping from the shooter. On-screen, time and inventory are automatic. Display raw time and added penalties separately. Stop Attempt records unfinished, not a time to beat.

**App flow:** Ready → break starts clock → clear/penalties → legal finish → next attempt/result. **Turn call:** brief start bell, finish bell; silence during the run by default.

### 20. High-Low — Attack the table from opposite ends.

**People and equipment:** two players; full rack.

One player must contact the lowest remaining numbered ball first; the other must contact the highest. Every legally pocketed ball earns one point, and you keep shooting. Combinations count. First to eight points wins the rack. Swap High/Low and breaker each rack; best of three wins the match. Fouls score zero and return their pots. The eight is just another ball.

This gives the same table two different strategic routes. Highlight the active player's required first-contact ball so nobody has to scan fifteen numbers. No mysterious card mapping or extra administrative step is needed.

**App flow:** Assign High/Low → shoot → score and update required ball → pass/continue → eight points → swap roles. **Turn call:** “High ball first: thirteen.”

## The page: one room, twenty personalities

### Persistent layout

Landscape: top session bar; player strip underneath; table or special game board left; large action dock right; Undo and Train / Play / Zen at bottom. Keep the cloth unobstructed. Portrait stacks player status, objective, board and sticky actions without squeezing a desktop sidebar onto a phone.

The header shows only game, round/rack, Audio, Pause and Rules. Reset belongs in the session menu, away from Made and Undo. The scoreboard emphasizes **who is shooting, what they need and what is at stake**. At a real table offer Scoreboard Only; avoid displaying a ball map that falsely looks live.

### Exact central modules and primary controls

| Game | Score strip | Main module beside table | Outcome/decision controls |
|---|---|---|---|
| Kelly | Shooter, next, rack | Lowest contact + private number access | Ball chips, Miss, Foul |
| Secret Bounty | Points, round | Hidden contract + public pot history | Ball chips, Miss, Foul |
| Cutthroat | Owned-ball chips, alive/out | Remaining groups, return queue | Ball chips, Miss, Foul |
| Poker | Hand size, round | Private card choice, public backs | Made, Miss, Foul; private Keep Left/Right |
| Blackjack | Match points, active/stood/bust | Private total, public status | Hit, Stand; then Made/Miss/Foul |
| Cribbage | Pair score | Seven pairs, owed partner chips | Ball chips, Miss, Foul |
| Bingo | Marked cells, round | Board and selected task diagram | Choose Cell, Ready, Success, Miss/Foul |
| Killer | Large lives, next player | Last-life/break retry status | Made, Miss, Foul |
| Turf War | Points, round | Six pocket ownership badges | Ball + Pocket, Miss, Foul |
| Battleship | Ships remaining | Enemy attack grid; private fleet | Made, Miss, Foul; then Attack Cell |
| Golf | Hole totals | Target pocket + huge stroke count | Stroke, Holed, Wrong Pocket, Foul |
| Saboteur | Team progress, round | Common goal + private role/vote | Made, Miss, Foul; private Vote |
| H-O-R-S-E | Letters, leader/followers | Locked challenge diagram | Lock Shot, Ready, Success, Miss/Foul |
| Ghost | Player vs ghost | Lowest contact, optional rescue | Ball chips, Miss, Foul; Use Rescue if earned |
| Equalizer | Layout points, allowances | Shared challenge diagram | Ball chips, Miss, Foul, Reset Cue Ball |
| Bowliards | Frame strip and bonus arrows | Remaining count, current visit | Made/Count, Miss, Foul |
| Ring | Points, order, rack | Lowest contact and value balls | Ball chips, Miss, Foul |
| Three-Ball | Round scores | Huge stroke total, remaining count | Record Stroke + Pots, Foul |
| Speed | Raw, penalties, best | Huge clock | Start, Penalty, Finish |
| High-Low | Points, role, racks won | Required first-contact ball | Ball chips, Miss, Foul |

Show only controls legal in the current phase. During a private card choice, the public display says “Choosing card” and cannot advance the shooter by accident. During required physical placement, the main action becomes Table Ready. Large, labeled controls take precedence over ornamental animation.

**On-screen:** Execute Shot drives physics; its result automatically feeds the game. Do not require a second Made tap. **At a table:** an observer or shooter reports only what scoring needs. Poker needs success/failure, Turf needs the pocket, Kelly needs ball identity. Do not demand ball numbers from every game merely to keep a decorative diagram accurate. Track remaining inventory automatically where possible, otherwise use an occasional Rack Empty report. If an eight-ball bonus is enabled, Made includes a quick Eight chip.

## State and recovery: predictable underneath, easy on top

Each game follows Setup → Deal/Arrange if needed → Ready → Shot → Resolve → next Shot, Decision, Placement or Result. The module definitions above specify the special branches. The app owns cards, targets, lives and turns; people never calculate them themselves.

Keep one atomic record per stroke. Ball made plus scratch is one report. **Miss** is not **Foul**. The visible latest-event sentence makes errors obvious: “Jeff scratched: no card; Cindy next.” Root Undo instantly restores the entire previous action. It also cancels pending turn audio and returns the same card on a repeated identical action; it does not provide a fresh lucky deal.

Public screens contain no hidden targets or cards. A shared tablet uses pass-and-peek; phones can eventually get private seat views. Undo cannot make someone forget a revealed card, so a reversed reveal gets a small “Card seen” badge and the room decides whether to continue casually or redeal. Do not turn a friendly game into an elaborate security ceremony.

Shared Train / Zen / Play layouts carry table geometry and balls. Game scores and cards remain with their session. Practicing a shot in Train must not silently replace a live Play rack. Save exact scenario coordinates for challenge links; a physical break cannot be recreated from a random seed alone.

## Keep the pressure enjoyable

Start with Gentle audio: turn name, brief obligation, rare milestone. No chatter during address. Offer clocks, last-life announcements and harder targets as deliberate choices. Keep touch controls available even when voice is enabled.

Handicaps are visible allowances selected before the game: extra lives, a rescue, a larger finish zone or a different completion target. Never change a person's odds behind their back. Praise a reported or observed action—“Great escape”—without pretending the app knows how calm somebody felt.

Afterward show a small shareable result: winner, game, funny or impressive moments actually recorded, best run/score, and a Rematch button. Offer **Try This Layout** when the game has a reproducible scenario. Do not invent clutch percentages from incomplete reporting.

## Build around different kinds of fun

Start with a representative four-game set:

- **Killer:** immediate pressure, simple group interaction.
- **Poker Pool:** luck, private choices, reveal and surprise.
- **Cutthroat:** tactics, alliances and comebacks.
- **Ghost Runout:** solo consequence and a direct bridge from training.

This selection proves the basic shell, private dealer, one-shot turns, runout turns and revival. Then add the other games using the same machinery. This is a proposal for build order, not a limit on the twenty-game lineup.

Playtest the social experience as well as the code: do people know what to do, do waiting players stay involved, do card choices interrupt the rhythm, and does anyone immediately want another game? If a rule causes more explaining than enjoyment, simplify it. If a game needs an unexpected twist to stay interesting, invent one and test it.

The current document defines our first versions. These have not yet been implemented or tested with a group. Their starting round counts, bonuses and quotas are tuning choices we can change after play.
