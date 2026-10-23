(() => {
  // core/src/ballid.ts
  var HUE_BINS = 12;
  var SIG_LEN = HUE_BINS + 3;
  function signatureCounts(rgba, size) {
    const c = new Array(SIG_LEN).fill(0);
    const cx = (size - 1) / 2;
    const r = size / 2;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x - cx, y - cx) > r) continue;
        const i = (y * size + x) * 4;
        const R2 = rgba[i] / 255;
        const G = rgba[i + 1] / 255;
        const B = rgba[i + 2] / 255;
        const max = Math.max(R2, G, B);
        const min = Math.min(R2, G, B);
        const v = max;
        const s = max === 0 ? 0 : (max - min) / max;
        if (v < 0.25) c[HUE_BINS]++;
        else if (s < 0.25) c[v > 0.7 ? HUE_BINS + 2 : HUE_BINS + 1]++;
        else {
          const d = max - min;
          let h = max === R2 ? (G - B) / d % 6 : max === G ? (B - R2) / d + 2 : (R2 - G) / d + 4;
          h = (h * 60 + 360) % 360;
          c[Math.min(HUE_BINS - 1, Math.floor(h / 360 * HUE_BINS))]++;
        }
      }
    }
    return c;
  }
  function normalize(counts) {
    const t = counts.reduce((a, b) => a + b, 0);
    return t === 0 ? counts.slice() : counts.map((x) => x / t);
  }
  function distance(a, b) {
    const sm = (v) => v.map((x, i) => i < HUE_BINS ? x * 0.6 + 0.2 * v[(i + 1) % HUE_BINS] + 0.2 * v[(i + HUE_BINS - 1) % HUE_BINS] : x);
    const A = sm(a);
    const B = sm(b);
    return A.reduce((s, x, i) => s + Math.abs(x - B[i]), 0) / 2;
  }
  function classifyBall(sig, arsenal) {
    const ranking = arsenal.filter((b) => b.exemplars.length > 0).map((b) => ({ id: b.id, distance: Math.min(...b.exemplars.map((e) => distance(sig, e))) })).sort((x, y) => x.distance - y.distance);
    if (!ranking.length) return { ballId: null, confidence: 0, auto: false, ranking };
    const d1 = ranking[0].distance;
    const d2 = ranking[1]?.distance ?? 1;
    const confidence = Math.max(0, Math.min(1, (d2 - d1) / 0.25)) * Math.max(0, Math.min(1, 1 - d1 / 0.45));
    const exemplarCount = arsenal.find((b) => b.id === ranking[0].id).exemplars.length;
    const auto = confidence >= 0.6 && exemplarCount >= 2;
    return { ballId: ranking[0].id, confidence, auto, ranking };
  }

  // core/src/patchnotes.ts
  var PATCH_NOTES = [
    {
      id: "2026-10-22-coach",
      date: "2026-10-22",
      title: "Your coach: the biggest update yet",
      items: [
        "A Coach tab (it was Insights): your one thing to work on right now, with everything that leads to it. My numbers keeps your averages, errors, plan, shot map and skills chart.",
        "Miss Finder: ranks what goes with where your ball meets the pins (speed, your aim, where the ball lands, drift, timing, how far into the session) and how much of your misses each explains, with the fix to test.",
        "Target and plan vs execution: tap Target on the Live screen and say where you stand and which board you aim at. Every shot is graded against it, so the app can tell a missed shot (aim) from a good shot on the wrong line.",
        `Move Advisor: after each shot, the move to make in boards ("Move 2 and 1 left: stand on 27, aim at 11"), only when the misses are one-sided and you're hitting your mark. One tap makes it your new target.`,
        "Ball Advisor: judges each of your balls from your own shots and suggests a cleaner or stronger one, from your bag first, then current USBC-approved balls from the catalog. It only blames a ball when where it hits and the shape of its reaction agree.",
        "Body and approach: a pose model on your phone reads your clips for steps, timing, drift, where the ball lands next to your slide foot and whether you held your finish. Turn on reading every new shot in Coach, or tap Read my approach on a shot.",
        "Side by side: two shots lined up at release, slow motion and frame steps, both paths from above, drawing tools with angles, and a packet to send to your coach.",
        "Voice caddie: turn on Voice on the Live screen and hear the speed, the arrows board, the pocket and your next move after every shot.",
        "Drills that score themselves: Arrow Sniper, Speed Lock, Pocket Hunter, Speed Ladder and Corner Pins, with personal bests.",
        "Lane-pair memory: type your centre and lane, and next time you're on that pair it shows where you stood, what you aimed at and how it went.",
        "Entry angle and carry, and how you hold up through a session.",
        "Bowler DNA card and highlight reels to share.",
        "16 new words in Learn: mark, laydown, slide, drift, timing, posting, tempo, adjustment and the new coaching features."
      ]
    },
    {
      id: "2026-10-22-lane-trace",
      date: "2026-10-22",
      title: "Drawing your lane is easy now",
      items: [
        "Trace your lane opens on a frozen picture, so nothing lags while you work.",
        "Four big numbered dots you can grab anywhere near them, and drag inside the lane to move the whole thing.",
        "A live grid shows how the lane lines up with the arrows and pins, and a magnifier shows exactly where your finger is.",
        "New Arrows step: drag the centre and two outside yellow dots onto the real arrow tips. New Pins step: drag the head pin, 7 pin and 10 pin dots onto the real pins. The grid refits to what you marked, so the arrows and pin deck line up exactly.",
        "Legal and credits: a Legal card in the Me tab links the privacy policy, the terms of use, and the credits and data sources, with a plain statement that LaneIQ is not affiliated with the USBC, the PBA or any ball maker. Ball photos from the makers' websites are no longer shown (a plain ball in the ball's colour is used instead).",
        'Reset Insights: a Reset insights button at the bottom of the Insights tab starts the averages, common errors, improvement plan, shot map and skills chart again from zero, for when somebody else has bowled on your app. Your shots and their videos stay in the Shots tab and your scorecards stay in Score; "Count my earlier shots again" puts them back into Insights.',
        'A Learn tab: the bowling words LaneIQ uses and what each means in the app, from the lane (boards, arrows, dots, pocket) to your shot (breakpoint, entry angle, axis rotation), the hit (high hit, light hit, Brooklyn), the ball (coverstock, RG, differential), layouts and oil. Lane sizes and markings follow the USBC Equipment Specifications. Search a word, or tap "what is this?" on a shot.',
        `Fixed: a ball that missed to the right could be called high. The app now judges the pocket only when the ball was seen all the way to the pins; before, it used a board worked out past where the camera lost the ball, and a few boards of guess flipped the call. A shot that was not seen reaching the pins says so instead of calling a hit. The call also says which side of the pocket it missed on, in boards ("Light hit, 2.0 boards right of the pocket"), and your saved shots are re-read with the new rule and your hand setting. A right-hander's miss to the right is light; a left-hander's miss to the right is high.`,
        'Standard words for where a shot hit: Pocket hit, High hit, Light hit, Brooklyn (a ball that crossed the head pin) and Very light hit, replacing "Way high" and "Way light".',
        `Start and Stop, for league: a Start / Stop button on the live screen. Stopped, the lane stays locked but no ball is followed, recorded or saved, so other bowlers' shots are not kept; tap Start on your turn. "One shot at a time" is league mode: it starts stopped and stops by itself after each of your shots (your shot and its clip are kept), so you only tap Start when it is your turn. The tour covers it.`,
        "Smoother paths before the arrows: the ball is biggest in the picture near the foul line and where its centre lands wobbles the most, so the first stretch is now smoothed over a longer window (easing to the normal one by about 22 ft), and sideways jumps no ball could make are dropped. The shot map and replays draw every path this way, including shots saved before, so old shots look cleaner too.",
        "No dead end for spin: a clip that cannot be read for spin (a ball turns 36 to 72 degrees a frame at 30 or 60 fps) now says it needs a slow-motion pass and has one tap to read it from a slow-motion clip, instead of a plain refusal. Where a browser offers more than 60 frames a second (some Android phones show 120 or 240), the app now asks for it and records every frame while feeding the tracker about 60 a second. No spin numbers are invented for a clip that cannot give them.",
        "A sharpen filter for the ball tracker: an unsharp mask on the picture the ball is looked for in, so the edge of a ball, a pin or a foot stands out more cleanly. It is applied to the tracker's copy only (the lane lock and the shake stabilizer keep the plain picture), and tried on a real clip it finds the same shot with the same path.",
        "Replays: shot recordings now save in one-second chunks, a clip still waiting for the rack to reset is saved when you switch apps or the page closes, a stored clip handed back without its type is given one, the spin measurement now waits until the replay has played (two video decoders at once stall a phone), and a clip that will not play says why on screen and in the diagnostics, along with the recording steps (started, stopped, size, saved).",
        "Balls were being followed in pieces: a phone's log showed each shot confirmed twice, partway down the lane, with only 6 to 11 points, then finished with too little to measure. At 60 fps a chain was dropped after four missed frames (0.07 s), and a ball is not seen in every frame. A chain may now go unseen for about a quarter of a second at any frame rate, and the whole-recording search bridges gaps of up to a third of a second.",
        "A roll the camera saw only part of is now kept instead of thrown away: speed over the stretch seen, where the ball started, where it was last seen and which way it was heading, and the board at the arrows if it crossed them. It is marked partial, and nothing is filled in beyond what was seen.",
        "Updates install themselves: when a newer LaneIQ is published while the camera is running, the app now counts down and reloads between shots (never while a ball is being followed, a clip is recording, or you are in the lane editor). Your saved lane lock comes straight back. Before, a running camera never updated, so a fix could sit unused for a whole session.",
        "FIXED: balls were never tracked on iPhone. A phone's own log showed every moving chain rejected at millions of miles an hour: the camera's frame clock stood still, so the app saw no time pass between points. The tracker now uses the time each frame was presented (or the page's own clock), which always moves forward.",
        "Copy diagnostics now also carries a ball-tracking log: every few seconds how many moving blobs were seen and why they were dropped, when a ball was found, why a chain was thrown out (speed, steadiness, distance), and how each shot ended. Paste it and a miss can be explained from your own phone's numbers.",
        "A second way to find the ball: every quarter of a second the app looks back over the last few seconds of frames for a ball-like chain rolling steadily down the lane, so a ball is found even when the live tracker's own rules did not confirm it while it rolled. The shot is finished when that chain stops. On a real clip it finds the ball about where it is released and follows it to the pins.",
        "60 frames a second, harder: the camera is now asked for 60 at every picture size a phone offers (exactly 60 first), and if it still opens below 60 the open camera is asked again for 60. The FPS badge shows the rate actually arriving at the app, and the diagnostics line says what the phone offered and why it may be lower (phones slow their camera in dim light).",
        "Spin for every shot: each recorded shot's rev rate, axis rotation and axis tilt are now read automatically from its own clip and shown in the shot review and the Spin lab. A clip too coarse to read a spin from (30 fps with a small ball, for example) says so plainly and shows no numbers instead of guessing; slow-motion video gives the best reads.",
        "The lane lock runs the full length of the lane, foul line to the head pin. After any lock that was found or picked (not one you traced by hand), the far end is checked against where the pins stand over the next few seconds and moved onto them when the readings agree. A lock saved by an older version, which could stop short of the pins, is dropped so the lane is found afresh.",
        'A guided tour of the app: it starts by itself the first time you use LaneIQ, and "Take the tour" on the start screen replays it. It walks through the camera, the lane lock, fixing a lock, the shot measurements, pinfall, and each tab.',
        "Each shot is now recorded from the bowler's approach until the rack is full again (or the next ball comes), instead of only the roll. Once it is over, the whole recording is searched at once for the ball's path, so nothing is predicted: the chain of blobs that is most ball-like and travels furthest down the lane is the shot.",
        'Nothing is guessed past what the camera saw. The Entry board tile became "At the pins": the board where the ball was last seen and how far down the lane that was (the board at 59.5 ft only when the ball was seen right up to the pins). Each shot also keeps its release point, last-seen point, exit heading, whether it reached the pin deck, and all the raw data (live path, whole-recording path, every ball-like blob frame by frame, the arrows read).',
        "The live trail is drawn only after a ball is confirmed, so it no longer jumps between a bowler's arms and legs; the sweep and the bowler walking back are no longer counted as another ball.",
        "The app now READS the arrows off your lane instead of drawing them from a guess. The USBC rule only says the arrows sit 12 to 16 ft past the foul line, so houses differ; the app looks for the small marks on the seven usual boards, keeps the ones that form the regular V, and looks again where the V says a hidden one should be. Yellow rings mark what it found, on the live view and in the lane editor. Tried on a real clip: all seven found, every frame, sitting on the real marks.",
        "The lane locks by vote: every scan of the picture votes for the lane it shows, and the biggest lane that is seen steadily is taken. On a real clip with several lanes in view it now picks the right one by itself, with no tap. After an automatic lock the far end is checked against where the pins stand and corrected when the looks agree.",
        "The path drawn for a shot now rides on the point where the ball touches the lane (the bottom of the ball), not the middle of the ball.",
        "The Arrows step is gone from the lane editor; it is Lane, then Pins.",
        "Ball tracking no longer throws out a real ball: a big, blurry ball with people moving behind it used to fail the smoothness test and was dropped. A chain that clearly rolls a long way down the lane at a believable speed is now accepted. Tested on a new real clip (a handheld Short from beside the approach): the ball is confirmed about where it is released and followed to the pins.",
        "The tracked path is smoothed before it is measured and drawn, so the top-down view shows the roll instead of a zigzag.",
        "The 3D view can be closed again: the Lane view / Raw / 3D switch was hidden underneath it.",
        "A Fix my lane button now stays on screen after the lane locks, so a wrong lock is one tap from being traced and corrected (before, the trace button disappeared once it locked).",
        "Tapping Re-lock now means it: the lock you threw away is not handed back, and a second Re-lock in a row opens Trace your lane, starting from the last outline.",
        "The drawn arrows now sit on the right boards (they were half a board off).",
        "Snap to edges tightens your outline onto the real lane edges; Reset starts over."
      ]
    },
    {
      id: "2026-10-22-real-clip",
      date: "2026-10-22",
      title: "Learned from a real bowling-alley clip",
      items: [
        "Ball tracking rebuilt: it now follows several possible balls at once and keeps the one that moves like a delivery (smooth, steady, forward), so a bowler's legs, arms and shoes are no longer mistaken for the ball. On a real clip filmed from beside the approach it followed a blue ball from release to the pins and read speed, arrows, breakpoint, entry board and launch angle.",
        "Lane lock now works on an upright phone filmed from the side: it found the right lane on its own, and no longer returns two lanes stuck together or a thin sliver.",
        "An upright phone now shows an upright picture instead of cropping it to a wide strip, and analyses at a size that keeps the phone fast.",
        "If the camera loses the ball just before the pins, the entry board is carried on from the last stretch it saw. Dust and pin motion picked up after the ball arrives are dropped, so speed at the pins reads true.",
        "When several lanes are in view and you tap yours, the app remembers where it is and picks the same lane next time instead of asking again."
      ]
    },
    {
      id: "2026-10-22-diag",
      date: "2026-10-22",
      title: "See why the ball isn't tracked",
      items: [
        "The status line under the camera now says how much of the picture the lane lock covers, how many things are moving, how many look like a ball, and why others were dropped (wrong size, wrong shape, off the lane). If no metrics appear, it says where the tracking is failing."
      ]
    },
    {
      id: "2026-10-22-spin-lab",
      date: "2026-10-22",
      title: "A much more advanced Spin lab",
      items: [
        "The Spin lab now reads the whole release, not one instant: rev rate, axis rotation and axis tilt through time, with charts, so you can see how your ball's motion changes down the lane.",
        "Mark the grip holes in the first frame and it follows the spin axis ON the ball. Where it starts is your PAP (saved to your profile with one tap); how far it wanders is the flare, drawn on a diagram of the ball.",
        "It follows the ball through the clip on its own, keeps frames in step even if the player repeats or skips one, and labels anything unreliable instead of saving it."
      ]
    },
    {
      id: "2026-10-22-pap-photos",
      date: "2026-10-22",
      title: "PAP from flare-ring photos",
      items: [
        "New 'Estimate PAP from photos': take 3 photos of your ball showing its flare (oil track) rings and the grip, tap points along a ring in each, and the app averages them into an over-and-up PAP. Find it on the Me tab and the Pro shop tab.",
        "It shows each photo's result and how far they disagree, so you can see how far to trust it, and saves the average as your PAP for the Layout Lab and Pro shop.",
        "It's an estimate from pictures; a pro shop's PAP measurement is more exact."
      ]
    },
    {
      id: "2026-10-22-steady",
      date: "2026-10-22",
      title: "Handheld tolerance",
      items: [
        "The camera now follows the lane as the phone shakes or drifts, frame by frame, and slides the picture back before looking for the ball. The lane lock, the ball path and the pin read stay where they belong, so a phone you're holding or leaning on still measures properly.",
        "In simulated shaky footage (up to 10 pixels of shake) speed and entry read correctly every time with it on; without it, the ball was lost.",
        "It corrects sideways and up-down movement only. A twist or a zoom of the phone is not corrected, and if the picture moves too far or the lane leaves the frame the app asks you to hold steadier or tap Re-lock."
      ]
    },
    {
      id: "2026-10-22-glow",
      date: "2026-10-22",
      title: "Glow off switch",
      items: [
        "New Glow setting (Me tab, and in Skins and rewards): turn it off for crisp lines and no halos on the ball tracer, lane and pins, so you can read each shot exactly.",
        "Fixed the pins in the skin previews, which were drawn the wrong way round.",
        "Skins are off for everyone until you turn them on: the app keeps its standard look. Equip a skin, or use the Skins switch, to see them. Switch back any time."
      ]
    },
    {
      id: "2026-10-22-invites",
      date: "2026-10-22",
      title: "Friend invites that stick",
      items: [
        "A friend's invite link is now remembered for two weeks, so it isn't lost when the tab closes or you add the app to your home screen.",
        "On first setup there's an 'Invited by a friend?' box: enter their tag or paste their link and they're added when you finish.",
        "When the app is added to the home screen from an invite link, the icon is set to open on that invite (on phones that allow it).",
        "The invite screen now shows your friend tag with Copy tag and Copy link, and the message you send tells your friend what to do and includes your tag as a fallback.",
        "Accepting a request is one tap: it adds them and opens the share sheet so they can add you back.",
        "Requests you tap 'Not now' on wait on Me \u2192 Friends instead of vanishing. People opening an invite in a browser are told how to keep their data."
      ]
    },
    {
      id: "2026-10-22-rewards",
      date: "2026-10-22",
      title: "Rewards and skins",
      items: [
        "Unlock looks for your ball tracer, the pins and the lane. Open Skins and rewards from the Score or Me tab.",
        "Play track: every pin you knock down counts toward lifetime pinfall, which unlocks the everyday skins.",
        "Improve track: improvement points come from new high games, strike streaks, clean games, a rising average, converted splits and skills reaching their targets. They unlock the rare skins. Throwing more shots doesn't earn points.",
        "Levels, a next-unlock bar, and a message when something unlocks."
      ]
    },
    {
      id: "2026-10-21-no-lane-number",
      date: "2026-10-21",
      title: "No more lane number",
      items: ["The lane number is gone. Tap Start camera and the app finds the lane by itself."]
    },
    {
      id: "2026-10-21-fps",
      date: "2026-10-21",
      title: "Faster camera and a live status line",
      items: [
        "The camera now asks the phone for exactly 60 fps (1080p, then 720p) before settling for 30, and keeps whichever stream is fastest.",
        "A status line under the camera shows the camera's frame rate, how many frames a second are analysed, whether a ball is being seen and whether the lane lock is on, so a silent screen can be explained."
      ]
    },
    {
      id: "2026-10-21-optional-lane",
      date: "2026-10-21",
      title: "Lane number is optional",
      items: [
        "Start the camera without a lane number. Add one only if you want the app to remember each lane's lock and label your shots.",
        "A tighter start screen that fits on a phone."
      ]
    },
    {
      id: "2026-10-21-skills",
      date: "2026-10-21",
      title: "Your skills chart",
      items: [
        "New skills radar at the top of Insights: nine skills on one chart, so you can see your strengths and what to work on at a glance.",
        "Scoring skills (strikes, single-pin spares, closed frames, first-ball pins) are measured against published 200 and 220-average benchmarks. Camera skills (pocket hits, entry angle, target, start and speed control) use LaneIQ's coaching targets, and each one says which it is.",
        "Tap any skill for your number, the target, the change since you started, and a drill. 'Work on these first' ranks what to fix."
      ]
    },
    {
      id: "2026-10-21-score",
      date: "2026-10-21",
      title: "Scorecard and spare coach",
      items: [
        "New Score tab: a scorecard that keeps itself. Tap the pins left standing after each roll.",
        "Spare coach after every first ball: names the leave and tells you how far to move your feet (3-6-9 spare system), with every direction reversed for left-handers.",
        "Your statistics: average, strike %, spare conversion, single-pin and multi-pin spares, and every leave you've shot.",
        "Scores itself from the camera: the pins it reads go straight on the card, games start and end on their own, and the spare coach shows on the Live tab right after each shot.",
        "What costs you pins: how many pins a game your missed spares take, the leaves to practice, and strike rate by where the ball hit the pocket."
      ]
    },
    {
      id: "2026-10-21-weights",
      date: "2026-10-21",
      title: "Specs for every ball weight",
      items: [
        "RG, differential and intermediate differential for each ball weight (12 to 16 lb) on 808 balls.",
        "Pick your ball's weight in the Layout Lab and the numbers change to match your box."
      ]
    },
    {
      id: "2026-10-21-proshop",
      date: "2026-10-21",
      title: "A bigger Pro shop",
      items: [
        "Layout advisor in Dual Angle, Pin Buffer and 2LS from your rev rate, speed and axis tilt.",
        "Layout checker: rule checks, hole clearance, conversion between systems and an estimate of the drilled ball.",
        "Reaction doctor, surface guide, fit and weight help, static-weight check and a theory library with sources."
      ]
    },
    {
      id: "2026-10-20-camera",
      date: "2026-10-20",
      title: "Lane lock, ball tracking and pin read",
      items: [
        "Much better lane finding, with an easy way to trace your lane yourself if it needs help.",
        "Tell it your lane number so it ignores the bowlers next to you.",
        "Pinch to zoom, expand the camera view, and a pin read after every shot.",
        "Speed, entry angle and breakpoint for each shot, with analytics on the result."
      ]
    },
    {
      id: "2026-10-19-arsenal",
      date: "2026-10-19",
      title: "Arsenal, patterns and friends",
      items: [
        "A catalog of over a thousand balls with photos and a library of 735 oil patterns.",
        "Arsenal optimizer: finds the gaps in your bag for the pattern you're bowling.",
        "Layout Lab, drilled-ball scan, and friend sessions you can compare."
      ]
    }
  ];
  var LATEST_NOTE_ID = PATCH_NOTES[0].id;

  // core/src/terms.ts
  var ZONE_LABEL = {
    pocket: "Pocket hit",
    high: "High hit",
    light: "Light hit",
    "very-high": "Brooklyn",
    "very-light": "Very light hit"
  };
  function missSide(miss, hand3) {
    const high = miss > 0;
    return hand3 === "R" === high ? "left" : "right";
  }
  function zoneText(zone, miss, hand3) {
    if (!zone || miss === null) return "";
    if (zone === "pocket") return ZONE_LABEL.pocket;
    return `${ZONE_LABEL[zone]}, ${Math.abs(miss).toFixed(1)} boards ${missSide(miss, hand3)} of the pocket`;
  }
  var GLOSSARY = [
    // ---- the lane ----
    { term: "Approach", cat: "The lane", def: "The floor behind the foul line where you walk and slide. By the USBC rules it must be at least 15 feet long, level, and at least as wide as the lane." },
    { term: "Foul line", cat: "The lane", def: "The line between the approach and the lane, 3/8 to 1 inch wide. Touching or crossing it as you deliver is a foul, and the ball scores nothing." },
    { term: "Boards", cat: "The lane", def: "The 39 strips that run down the lane, each about an inch wide. Bowlers count them from the right gutter (board 1) to the left gutter (board 39), as you look down the lane. The centre is board 20.", app: "Every board number in LaneIQ counts from the right gutter." },
    { term: "Gutters", cat: "The lane", aka: ["channels"], def: "The channels on each side of the lane. A ball that goes in one scores only what it knocked down before." },
    { term: "Arrows", cat: "The lane", aka: ["targets", "darts"], def: "The small markings down the lane that you aim at. The USBC rules allow up to seven, 12 to 16 feet past the foul line, equally spaced, each at most 1 1/4 inch wide and 6 inches long. Most houses put them on boards 5, 10, 15, 20, 25, 30 and 35 in a V shape, but the exact distance differs from house to house.", app: 'LaneIQ looks for the arrows on your lane instead of drawing them from a model. "Arrows board" is the board your ball crossed at about 15 feet.' },
    { term: "Dots", cat: "The lane", aka: ["approach guides", "range dots"], def: "Round markings you use to line up your feet and your target. On the approach the rules allow up to seven at 2 to 6 inches, 3 to 4 feet, 6 to 7 feet, 9 to 10 feet, 11 to 12 feet and 14 to 15 feet from the foul line; on the lane up to ten guides sit 6 to 8 feet past it." },
    { term: "Range finders", cat: "The lane", def: "Markings 33 to 44 feet down the lane (up to four, none wider than a board or longer than 36 inches) used to aim further down the lane than the arrows." },
    { term: "Head pin", cat: "The lane", aka: ["1-pin"], def: "The front pin of the triangle. It is 60 feet, give or take half an inch, from the foul line to the centre of its spot. The pins are numbered 1 to 10 from the front, left to right, row by row; the pins stand 12 inches apart." },
    { term: "Pin deck", cat: "The lane", def: "The area where the ten pins stand, beyond the end of the lane. Past it is the pit.", app: "LaneIQ puts the far end of the lane lock on the head pin line, 60 feet from the foul line." },
    { term: "Pocket", cat: "The lane", def: "The best place to hit the pins: between the 1-pin and the pin beside it on your strong side. That is the 1-3 pocket for a right-hander and the 1-2 pocket for a left-hander.", app: "The pocket is board 17.5 for a right-hander and board 22.5 for a left-hander (counted from the right). Set your hand in your profile so this is right for you." },
    // ---- your shot ----
    { term: "Launch speed", cat: "Your shot", aka: ["ball speed"], def: "How fast the ball is travelling soon after you release it, in miles per hour.", app: "Measured over the first stretch the camera sees, roughly 3 to 20 feet." },
    { term: "Launch angle", cat: "Your shot", def: "The direction the ball is heading in the first part of its path, measured in degrees from straight down the lane.", app: "+ means drifting right, \u2212 left." },
    { term: "Starting board", cat: "Your shot", aka: ["start position"], def: "The board the ball is on soon after release, close to your foul-line position." },
    { term: "Line", cat: "Your shot", aka: ["ball path", "shot path"], def: "The path the ball takes down the lane, usually described by the board it crosses at the arrows, its breakpoint and where it reaches the pins." },
    { term: "Breakpoint", cat: "Your shot", def: "The point where the ball finishes going outward and starts turning back toward the pocket: the board it is on, and how many feet down the lane that is.", app: "LaneIQ finds it as the point farthest from the centre of the lane between 15 and 55 feet." },
    { term: "Hook", cat: "Your shot", def: 'The sideways move of the ball as it turns toward the pocket. People also use "hook" for how much a ball reacts.', app: "In LaneIQ, Hook is the number of boards between the breakpoint and the entry point." },
    { term: "Mark", cat: "Your shot", aka: ["target", "spot"], def: "The board you aim at, usually an arrow. Hitting your mark means the ball rolled over it. Coaches separate a missed mark (the shot) from a hit mark that still misses the pocket (the line).", app: "Set your mark with Target on the Live screen. A shot within a board of it at the arrows counts as on the mark." },
    { term: "Laydown point", cat: "Your shot", aka: ["laydown"], def: "Where the ball first touches the lane after you let it go, usually a few boards to the bowling-hand side of your slide foot. A laydown that wanders moves the whole shot." },
    { term: "Slide", cat: "Your shot", def: "The last step of the approach, where the foot opposite your bowling hand glides to a stop at the line as the ball is released." },
    { term: "Drift", cat: "Your shot", def: "How far you walk sideways during the approach: the board your slide foot finishes on minus the board it started on. A little drift is common; what matters is that it is the same every time.", app: "Read from your clip: your slide foot is placed on the approach through the lane lock." },
    { term: "Timing", cat: "Your shot", def: "How your swing lines up with your feet. A common teaching point: the ball should be near the top of the backswing as the slide begins. Earlier than that is early timing (the ball is ahead of the feet); later is late timing.", app: "Read from your clip: when your bowling wrist is highest in the swing, against when your slide begins. Within 0.1 s is on time." },
    { term: "Posting the shot", cat: "Your shot", aka: ["holding the finish", "post"], def: "Staying balanced at the foul line after the release, holding your finish until the ball is well down the lane. It shows the shot was in balance.", app: "Read from your clip: held for a second or more counts as posted." },
    { term: "Tempo", cat: "Your shot", def: "The pace of the approach. Repeating the same tempo helps you repeat the same speed.", app: "Seconds from your first step to the release, read from your clip." },
    { term: "Adjustment", cat: "Your shot", aka: ["move", "2-and-1"], def: "Changing where you stand and aim when the ball keeps missing the pocket the same way. The usual rule: move your feet and your target the same way, toward the side the ball missed, feet about twice as far as the target (2 boards and 1, say). Small misses get small moves; judge a couple of shots before moving again.", app: "The Move Advisor works the move out after each shot, only when the misses are one-sided and you're hitting your mark." },
    { term: "Entry board", cat: "Your shot", def: "The board the ball is on when it reaches the pins, at about 59.5 feet.", app: 'LaneIQ only gives an entry board when the ball was seen right up to the pins. If the camera lost the ball earlier, the "At the pins" tile shows the board where it was last seen and how far down the lane that was, and nothing is guessed past it.' },
    { term: "Entry angle", cat: "Your shot", aka: ["angle of entry", "impact angle"], def: "The angle at which the ball arrives at the pocket. A steeper entry angle gives the ball more room to carry the pins through the pocket.", app: "Measured over the last stretch of the path the camera saw." },
    { term: "Speed loss", cat: "Your shot", def: "How much slower the ball is at the pins than at release, as a percentage. A ball that slows a lot has used up energy by hooking and rolling early." },
    { term: "Rev rate", cat: "Your shot", aka: ["revs", "RPM"], def: "How many times the ball turns each minute.", app: "LaneIQ's setup question groups it as low (under 300), medium (300 to 400), high (400 to 500) and very high (over 500). It is read from a slow-motion video of the release in the Spin lab: at 30 or 60 frames a second a hook ball turns too far between frames to be read." },
    { term: "Axis rotation", cat: "Your shot", def: "How far the ball's spin axis is turned sideways, seen from above. It, with axis tilt, says which way the spin axis points.", app: "In LaneIQ, 0\xB0 is a straight forward roll. Coaches use different zero points, so compare numbers only within the app." },
    { term: "Axis tilt", cat: "Your shot", def: "How far the spin axis is tilted up from horizontal, seen from behind the ball. With axis rotation it says which way the spin axis points.", app: "Measured in degrees above horizontal." },
    { term: "PAP", cat: "Your shot", aka: ["positive axis point"], def: "The point on the ball where your spin axis comes out at release. A ball is drilled relative to your PAP.", app: "Estimated in the Arsenal tab from three photos of the flare rings, or from a slow-motion video in the Spin lab." },
    { term: "Track", cat: "Your shot", def: "The band of oil rings the ball leaves on its surface as it rolls. Its position on the ball and how wide it is show how the ball is being thrown." },
    { term: "Flare", cat: "Your shot", def: "How far the track moves across the ball's surface as it travels. More flare gives the ball fresh dry surface to grip with, so more hook." },
    // ---- the hit ----
    { term: "Strike", cat: "The hit", def: "All ten pins knocked down by the first ball of a frame." },
    { term: "Spare", cat: "The hit", def: "All the remaining pins knocked down by the second ball of a frame." },
    { term: "Open frame", cat: "The hit", def: "A frame with neither a strike nor a spare." },
    { term: "Leave", cat: "The hit", def: "The pins still standing after your first ball, such as the 10-pin or the 4-7-10." },
    { term: "Split", cat: "The hit", def: "A leave where the head pin is down and the standing pins have a gap between them, for example the 7-10 or the 5-10. Splits are hard to convert." },
    { term: "Pocket hit", cat: "The hit", def: "The ball enters in the pocket. A good pocket hit with a good entry angle is what makes strikes.", app: "Within one board of the pocket." },
    { term: "High hit", cat: "The hit", def: "The ball enters too far toward the middle of the head pin, so it hits the head pin too full. For a right-hander that is left of the 1-3 pocket; for a left-hander it is right of the 1-2 pocket.", app: "1 to 2.5 boards from the pocket toward the head pin. LaneIQ says which side, in boards, so you can check it against what you saw." },
    { term: "Light hit", cat: "The hit", aka: ["thin hit"], def: "The ball enters too far to the gutter side of the pocket, so it hits the head pin too thinly. For a right-hander that is right of the 1-3 pocket; for a left-hander it is left of the 1-2 pocket.", app: "1 to 2.5 boards from the pocket toward the gutter." },
    { term: "Brooklyn", cat: "The hit", def: 'A ball that crosses over to the far side of the head pin: for a right-hander it hits left of the 1-pin, for a left-hander right of it. It can still strike (a "Brooklyn strike"), but it is usually a miss.', app: "More than 2.5 boards high, which is past the centre of the head pin." },
    { term: "Very light hit", cat: "The hit", def: "A ball that misses the head pin side of the pocket by a wide margin, hitting the pins well to the gutter side.", app: "More than 2.5 boards to the gutter side of the pocket." },
    { term: "Tap", cat: "The hit", def: "A good pocket hit that leaves a pin standing that looked as though it should have fallen." },
    // ---- scoring ----
    { term: "Frame", cat: "Scoring", def: "One turn at the pins: up to two balls (three in the tenth). A game is ten frames." },
    { term: "Turkey", cat: "Scoring", def: "Three strikes in a row." },
    { term: "Average", cat: "Scoring", def: "Your total pinfall divided by your games bowled." },
    { term: "Spare conversion", cat: "Scoring", def: "The share of your spare chances that you make. Single-pin spares are the ones to get nearly every time." },
    // ---- the ball ----
    { term: "Coverstock", cat: "The ball", def: "The outer shell of the ball, which meets the lane. Plastic (polyester) is the least grippy and is used for spares; urethane is in between; reactive resin is the strongest, in solid, pearl and hybrid forms. Solid reactive covers usually grip earlier; pearls usually skid longer and then turn sharper." },
    { term: "Core", cat: "The ball", def: "The weight block inside the ball. Its shape decides how the ball stores and releases energy. Symmetric cores are the same all round; asymmetric cores have a mass bias." },
    { term: "RG", cat: "The ball", aka: ["radius of gyration"], def: "How far the ball's weight sits from its centre. A lower RG gets the ball revving up earlier; a higher RG holds energy for later." },
    { term: "Differential", cat: "The ball", aka: ["diff"], def: "The difference between the ball's highest and lowest RG. A higher differential means more flare potential." },
    { term: "Mass bias", cat: "The ball", aka: ["MB"], def: "On an asymmetric core, the mark that shows where the core's extra weight sits. With the CG mark it lets a driller place the core relative to your PAP." },
    { term: "Pin", cat: "The ball", def: "A coloured dot on the ball that marks the top of the core. Layouts are described by where the pin sits relative to your PAP." },
    { term: "Surface", cat: "The ball", aka: ["grit", "polish"], def: "How rough or shiny the ball's cover is. A lower grit number (such as 500) is rougher and grips earlier; higher grits and polish skid longer and save energy for the back end of the lane." },
    // ---- layout and drilling ----
    { term: "Layout", cat: "Layout and drilling", def: "Where the grip holes are drilled relative to the ball's core, pin and your PAP. The same ball reacts differently with different layouts." },
    { term: "Span", cat: "Layout and drilling", def: "The distance between your thumb and finger holes, which sets how the ball fits your hand." },
    { term: "Pin to PAP", cat: "Layout and drilling", def: "The distance from the pin to your PAP. Closer gives an earlier, smoother, less flaring move; farther keeps more flare potential for a later, stronger move." },
    { term: "Drilling angle", cat: "Layout and drilling", def: "In the Dual Angle system, an angle from 10 to 90 degrees that sets how soon the ball rolls." },
    { term: "VAL angle", cat: "Layout and drilling", def: "In the Dual Angle system, an angle from 20 to 70 degrees that sets how fast the ball changes from skid to hook. The drilling angle plus the VAL angle is the angle sum: 30 is the fastest transition and 160 the slowest." },
    { term: "Pin buffer", cat: "Layout and drilling", def: "In the Pin Buffer system, the distance from the pin to the VAL. About 1 to 2 inches gives a faster transition, 4 to 5 slower." },
    // ---- oil and the lane ----
    { term: "Oil pattern", cat: "Oil and the lane", def: "The way oil is laid on the lane: how far it goes down the lane (length), how much there is (volume), and how it is shaped across the boards." },
    { term: "Pattern length", cat: "Oil and the lane", def: "How many feet down the lane the oil goes. Roughly: under 36 feet is short, 36 to 41 medium, 42 and over long. Longer patterns ask for a stronger ball and more hook." },
    { term: "House shot", cat: "Oil and the lane", def: "The usual league pattern: more oil in the middle and much less outside, so a ball thrown a little off line still gets pushed back toward the pocket." },
    { term: "Sport pattern", cat: "Oil and the lane", def: "A flatter pattern with less difference between the middle and the outside, so misses are punished more." },
    { term: "Reading the lane", cat: "Oil and the lane", def: 'Seeing how the ball reacts and choosing your ball, line or speed to match. A ball that hooks earlier than before is "reading" the lane sooner.' },
    { term: "Breakdown", cat: "Oil and the lane", def: "Oil wearing thin where balls travel, so the ball starts reading the lane earlier there." },
    { term: "Carrydown", cat: "Oil and the lane", def: "Oil being pushed down the lane by balls, so the ball skids farther than it did earlier." },
    { term: "Transition", cat: "Oil and the lane", def: "The lane changing as the oil breaks down and carries down during play, so your line has to move.", app: "LaneIQ watches your breakpoint distance over several shots with the same ball before it calls a transition." },
    { term: "Backend", cat: "Oil and the lane", def: "The last part of the lane, beyond the oil, where the ball makes its move toward the pins. A strong backend is a sharp, late move." },
    { term: "Skid, hook, roll", cat: "Oil and the lane", def: "The three phases of a ball's path: it skids on the oil, turns (hooks) as it meets friction, then rolls forward as it reaches the pins." },
    // ---- styles ----
    { term: "Stroker", cat: "Styles", def: "A bowler with a smooth, accurate delivery, usually with lower rev rates and a steady hand position." },
    { term: "Cranker", cat: "Styles", def: "A bowler who puts a lot of revs and side rotation on the ball for a big hook." },
    { term: "Tweener", cat: "Styles", def: "A bowler between a stroker and a cranker." },
    { term: "Two-handed", cat: "Styles", def: "A delivery with no thumb in the ball, the second hand supporting it through the swing, usually with high revs." },
    // ---- LaneIQ ----
    { term: "Lane lock", cat: "LaneIQ", def: "The outline of your lane that the app has found in the picture, from the foul line to the head pin. Every distance and board is worked out from it.", app: "If the lines are not on your lane, tap Fix my lane." },
    { term: "Fix my lane", cat: "LaneIQ", def: "Freezes the picture so you can drag four numbered dots onto the lane, use Snap to edges, then place the head pin, 7 and 10 pins." },
    { term: "At the pins", cat: "LaneIQ", def: "The board where the camera last saw the ball, and how many feet down the lane that was. It is what the camera saw, not a prediction." },
    { term: "Partial", cat: "LaneIQ", def: "A shot the camera saw only part of. The part it saw is recorded; what it did not see is left empty." },
    { term: "One shot at a time", cat: "LaneIQ", def: "League mode. The app starts stopped and stops by itself after each of your shots, so you tap Start only on your own turn." },
    { term: "Miss Finder", cat: "LaneIQ", def: "Ranks what goes with where your ball meets the pins: speed, your aim, where the ball lands, your drift and timing, how far into the session you are. The percentage is how much of the spread in your misses goes with that one thing. It shows what goes together, not proof of cause, so its fix is a test." },
    { term: "Plan vs execution", cat: "LaneIQ", def: "Every shot is graded against the target you set. Missing the mark is execution; hitting it and still missing the pocket the same way is the line. The fix is different for each." },
    { term: "Move Advisor", cat: "LaneIQ", def: "The adjustment to make, in boards, worked out after each shot from your last few with the same ball. It stays quiet when the misses go both ways or you're missing your mark, because a move would only chase them." },
    { term: "Ball Advisor", cat: "LaneIQ", def: "Judges each of your balls from your own shots with it. It calls a ball too strong or too weak only when where it hits AND the shape of its reaction (breakpoint and entry angle) agree, then suggests what to try from your bag or what to buy: current, USBC-approved balls on the app's motion index." },
    { term: "Voice caddie", cat: "LaneIQ", def: "Says the speed, the arrows board, the breakpoint, the pocket and your next move out loud after each shot, using your phone's own speech. Turn it on with Voice on the Live screen." },
    { term: "Bowler DNA", cat: "LaneIQ", def: "A shareable card with your speed, rev rate, axis, PAP, entry angle, pocket and strike rate, each marked measured or entered." }
  ];

  // core/src/lanereads.ts
  var MIN_SHOTS = 4;
  var mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var sd = (v) => {
    const m = mean(v);
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1));
  };
  function trend(v) {
    const n = v.length;
    const xs = v.map((_, i) => i);
    const mx = mean(xs);
    const my = mean(v);
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (xs[i] - mx) ** 2;
      sxy += (xs[i] - mx) * (v[i] - my);
    }
    const slope = sxy / sxx;
    const resid = v.reduce((a, y, i) => a + (y - (my + slope * (xs[i] - mx))) ** 2, 0);
    const se = Math.sqrt(resid / Math.max(1, n - 2) / sxx);
    return { slope, t: se === 0 ? slope === 0 ? 0 : Infinity : slope / se };
  }
  var bpShape = (ft) => ft < 35 ? "early (reading the lane sooner)" : ft <= 45 ? "medium" : "late (skidding long)";
  function readLane(all) {
    const last = all[all.length - 1];
    const sameBall = last?.ballId ? all.filter((s) => s.ballId === last.ballId) : all;
    const shots = sameBall.slice(-12);
    const n = shots.length;
    if (n < MIN_SHOTS) {
      return {
        status: "insufficient",
        confidence: "low",
        headline: `Not enough shots yet (${n}/${MIN_SHOTS})`,
        points: ["I won't call lane transition from fewer than four tracked shots with the same ball."],
        next: "Keep bowling the same ball and line; I'll start reading the lane after a few more shots.",
        shotsUsed: n
      };
    }
    const bpFt = shots.map((s) => s.a.breakpointFt).filter((x) => x !== null);
    const bpBd = shots.map((s) => s.a.breakpointBoard).filter((x) => x !== null);
    const arrows = shots.map((s) => s.a.boardAtArrows).filter((x) => x !== null);
    const speeds2 = shots.map((s) => s.a.speedMph);
    const entry = shots.map((s) => s.a.impactAngleDeg).filter((x) => x !== null);
    const points = [];
    const arrowsSd = arrows.length >= 3 ? sd(arrows) : null;
    const speedSd = sd(speeds2);
    const sloppy = arrowsSd !== null && arrowsSd > 2 || speedSd > 0.8;
    if (arrowsSd !== null) points.push(`Observed: arrows board varies \xB1${arrowsSd.toFixed(1)} boards and speed \xB1${speedSd.toFixed(1)} mph across these shots.`);
    if (sloppy) points.push("That's enough execution variation to blur any lane signal, so treat the lane read below as tentative.");
    if (bpFt.length >= 3) {
      const mft = mean(bpFt);
      const mbd = bpBd.length ? mean(bpBd) : null;
      points.push(`Observed: breakpoint averages ${mft.toFixed(0)} ft${mbd !== null ? ` near board ${mbd.toFixed(0)}` : ""}. That is an ${bpShape(mft)} shape.`);
    }
    if (entry.length >= 3) {
      const e = Math.abs(mean(entry));
      points.push(`Observed: entry angle averages ${e.toFixed(1)}\xB0. ${e < 3 ? "Shallow: the ball is arriving with little angle, so pocket carry will be touchy." : e > 6.5 ? "Steep: plenty of angle; watch for over-hooking on slight misses." : "In a workable range."}`);
    }
    let headline = "Lane looks stable so far";
    let next = "Keep the same ball and line; nothing here justifies a change.";
    let confidence = n >= 8 ? "good" : "moderate";
    if (bpFt.length >= MIN_SHOTS) {
      const tr = trend(bpFt);
      const total = tr.slope * (bpFt.length - 1);
      if (Math.abs(tr.t) >= 2 && Math.abs(total) >= 2) {
        if (total < 0) {
          headline = "Ball is reading the lane earlier: the track is drying out";
          points.push(`Inferred: breakpoint moved about ${Math.abs(total).toFixed(0)} ft closer to you over ${bpFt.length} shots (trend strength t=${tr.t.toFixed(1)}).`);
          next = "Test one change: move your feet 1\u20132 boards toward the oiled side (or a touch less rotation/speed up), keep the target, and judge the next two shots before changing anything else.";
        } else {
          headline = "Ball is skidding farther: oil is carrying down";
          points.push(`Inferred: breakpoint moved about ${total.toFixed(0)} ft farther down-lane over ${bpFt.length} shots (trend strength t=${tr.t.toFixed(1)}).`);
          next = "Test one change: a smoother or more surface-sensitive ball, or move 1\u20132 boards toward the outside, and judge the next two shots.";
        }
        if (sloppy) confidence = "low";
      } else {
        points.push("Inferred: no meaningful drift in breakpoint distance, so the lane isn't visibly changing under this ball yet.");
      }
    } else {
      confidence = "low";
      points.push("The breakpoint wasn't tracked on enough shots to judge transition.");
    }
    if (arrows.length >= MIN_SHOTS) {
      const ta = trend(arrows);
      const drift = ta.slope * (arrows.length - 1);
      if (Math.abs(ta.t) >= 2 && Math.abs(drift) >= 1.5) points.push(`Observed: your ball is crossing the arrows ${Math.abs(drift).toFixed(1)} boards ${drift > 0 ? "farther left (toward board 39)" : "farther right (toward board 1)"} than at the start, so you may be drifting, not the lane.`);
    }
    return { status: "ok", confidence, headline, points, next, shotsUsed: n };
  }

  // core/src/recommend.ts
  var COVER_BONUS = { solid: 0.5, hybrid: 0.2, pearl: -0.3, urethane: -0.8, plastic: -1 };
  function motionIndex(b) {
    const rg = b.rg?.value;
    const diff = b.differential?.value;
    if (rg === void 0 || diff === void 0) return null;
    const cover = b.coverstockType ? COVER_BONUS[b.coverstockType.value] ?? 0 : 0;
    return (2.55 - rg) * 6 + (diff - 0.04) * 20 + cover;
  }
  function recommendBall(read2, currentBallId, arsenal) {
    const scored = arsenal.map((b) => ({ b, m: b.catalog ? motionIndex(b.catalog) : null })).filter((x) => x.m !== null);
    if (read2.status !== "ok") return { status: "none", text: "No equipment change suggested yet: I need a lane read first.", basis: [] };
    if (scored.length < 2) {
      return { status: "none", text: "I need at least two arsenal balls matched to the catalog to compare options.", basis: [`${scored.length} of your balls have catalog specs.`] };
    }
    const drying = /earlier/.test(read2.headline);
    const carrydown = /skidding farther/.test(read2.headline);
    if (!drying && !carrydown) return { status: "none", text: "The lane looks stable, so stay with your current ball.", basis: [] };
    const cur2 = scored.find((x) => x.b.id === currentBallId);
    if (!cur2) return { status: "none", text: "Tell me which ball you're throwing so I can compare against it.", basis: [] };
    const want = drying ? scored.filter((x) => x.m < cur2.m) : scored.filter((x) => x.m > cur2.m);
    if (!want.length) {
      return { status: "none", text: `Nothing in your arsenal is ${drying ? "cleaner" : "stronger"} than ${cur2.b.name} by published specs. Consider a surface or line change instead.`, basis: [] };
    }
    const pick = want.sort((x, y) => drying ? y.m - x.m : x.m - y.m)[0];
    const c = pick.b.catalog;
    const basis = [
      `${cur2.b.name}: motion index ${cur2.m.toFixed(2)}; ${pick.b.name}: ${pick.m.toFixed(2)} (from RG ${c.rg?.value}, differential ${c.differential?.value}${c.coverstockType ? `, ${c.coverstockType.value} cover` : ""}).`,
      "Spec-based estimate, not a measurement of how this ball behaves for you. Confirm with two shots."
    ];
    return {
      status: "ok",
      ballId: pick.b.id,
      text: `${drying ? "Try the cleaner" : "Try the stronger"} ${pick.b.name}: ${drying ? "your current ball is reading the lane early" : "oil is carrying down and your current ball is skidding long"}. Change only the ball and keep your line, then judge two shots.`,
      basis
    };
  }

  // core/src/identify.ts
  var norm = (s) => s.toLowerCase().replace(/!q\b/g, "iq").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  var tokens = (s) => norm(s).split(" ").filter(Boolean);
  function lev(a, b) {
    const m = a.length;
    const n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  var unconfuse = (t) => t.replace(/0/g, "o").replace(/1/g, "i").replace(/5/g, "s").replace(/8/g, "b").replace(/\|/g, "i");
  function tokenSim(q, t) {
    if (q === t) return 1;
    const qq = unconfuse(q);
    const tt = unconfuse(t);
    if (qq === tt) return 0.95;
    if (q.length >= 3 && (t.startsWith(q) || q.startsWith(t))) return 0.8;
    const sim = 1 - lev(qq, tt) / Math.max(qq.length, tt.length);
    return sim >= 0.7 && Math.max(qq.length, tt.length) >= 4 ? sim * 0.9 : 0;
  }
  function fuzzyScore(query, target) {
    const q = tokens(query);
    const t = tokens(target);
    if (!q.length || !t.length) return 0;
    const best = (a, b) => a.map((x) => Math.max(...b.map((y) => tokenSim(x, y))));
    const qs = best(q, t);
    const ts = best(t, q);
    const w = (words, s) => words.reduce((acc, x, i) => acc + x.length * s[i], 0) / words.reduce((acc, x) => acc + x.length, 0);
    return 0.7 * w(q, qs) + 0.3 * w(t, ts);
  }
  function searchCatalog(catalog, query, limit = 8) {
    if (!norm(query)) return [];
    return catalog.map((ball) => ({ ball, score: fuzzyScore(query, `${ball.manufacturer} ${ball.name}`) })).filter((x) => x.score >= 0.45).sort((a, b) => b.score - a.score).slice(0, limit);
  }
  var COLOR_WORDS = {
    black: { kind: "dark" },
    coal: { kind: "dark" },
    onyx: { kind: "dark" },
    charcoal: { kind: "dark" },
    midnight: { kind: "dark" },
    jet: { kind: "dark" },
    smoke: { kind: "grey" },
    ash: { kind: "grey" },
    grey: { kind: "grey" },
    gray: { kind: "grey" },
    silver: { kind: "grey" },
    slate: { kind: "grey" },
    steel: { kind: "grey" },
    graphite: { kind: "grey" },
    pewter: { kind: "grey" },
    white: { kind: "white" },
    ivory: { kind: "white" },
    cream: { kind: "white" },
    bone: { kind: "white" },
    red: { h: 0 },
    crimson: { h: 350 },
    scarlet: { h: 5 },
    ruby: { h: 350 },
    burgundy: { h: 345 },
    maroon: { h: 350 },
    cherry: { h: 352 },
    fire: { h: 10 },
    flame: { h: 12 },
    orange: { h: 28 },
    copper: { h: 22 },
    bronze: { h: 28 },
    tangerine: { h: 30 },
    rust: { h: 18 },
    brown: { h: 25 },
    gold: { h: 45 },
    yellow: { h: 55 },
    amber: { h: 40 },
    lemon: { h: 58 },
    lime: { h: 90 },
    green: { h: 125 },
    emerald: { h: 145 },
    olive: { h: 80 },
    forest: { h: 135 },
    jade: { h: 150 },
    mint: { h: 150 },
    teal: { h: 178 },
    aqua: { h: 185 },
    cyan: { h: 188 },
    turquoise: { h: 175 },
    sky: { h: 200 },
    blue: { h: 220 },
    cobalt: { h: 222 },
    navy: { h: 232 },
    royal: { h: 228 },
    sapphire: { h: 225 },
    ocean: { h: 205 },
    denim: { h: 215 },
    indigo: { h: 255 },
    purple: { h: 280 },
    violet: { h: 275 },
    lavender: { h: 268 },
    plum: { h: 295 },
    grape: { h: 285 },
    orchid: { h: 300 },
    magenta: { h: 305 },
    pink: { h: 330 },
    rose: { h: 340 },
    fuchsia: { h: 315 },
    neon: {}
  };
  function expectedSignature(colorway) {
    const words = tokens(colorway).filter((w) => COLOR_WORDS[w] && w !== "neon");
    if (!words.length) return null;
    const sig = new Array(SIG_LEN).fill(0);
    for (const w of words) {
      const c = COLOR_WORDS[w];
      if ("h" in c) sig[Math.min(HUE_BINS - 1, Math.floor(c.h % 360 / 360 * HUE_BINS))] += 1;
      else sig[HUE_BINS + (c.kind === "dark" ? 0 : c.kind === "grey" ? 1 : 2)] += 1;
    }
    const t = sig.reduce((a, b) => a + b, 0);
    return sig.map((x) => x / t);
  }
  function colorScore(observed, colorway) {
    const exp = colorway ? expectedSignature(colorway) : null;
    if (!exp) return null;
    const present = (v) => v.map((x) => x > 0.04 ? 1 : 0);
    const o = present(observed);
    const e = present(exp);
    const smooth = (v) => v.map((x, i) => i < HUE_BINS ? Math.max(x, 0.6 * v[(i + 1) % HUE_BINS], 0.6 * v[(i + HUE_BINS - 1) % HUE_BINS]) : x);
    const os = smooth(o);
    const es = smooth(e);
    let inter = 0;
    let uni = 0;
    for (let i = 0; i < SIG_LEN; i++) {
      inter += Math.min(os[i], es[i]);
      uni += Math.max(os[i], es[i]);
    }
    const jaccard = uni ? inter / uni : 0;
    const prox = 1 - Math.min(1, distance(observed, exp) / 0.7);
    return Math.max(0, Math.min(1, 0.6 * jaccard + 0.4 * prox));
  }
  function identifyFromCatalog(input, limit = 6) {
    const hasText = !!input.text && tokens(input.text).some((t) => t.length >= 2);
    const out = [];
    for (const ball of input.catalog) {
      const text = hasText ? fuzzyScore(input.text, `${ball.manufacturer} ${ball.name}`) : null;
      const color = input.sig ? colorScore(input.sig, ball.colorway?.value) : null;
      if (text === null && color === null) continue;
      if (text !== null && text < 0.45 && (color === null || color < 0.7)) continue;
      const score = text !== null && color !== null ? 0.7 * text + 0.3 * color : text !== null ? 0.9 * text : 0.5 * (color ?? 0);
      const evidence = [];
      if (text !== null) evidence.push(`name match ${Math.round(text * 100)}%`);
      if (color !== null) evidence.push(`colors match ${Math.round(color * 100)}%${ball.colorway ? ` (${ball.colorway.value})` : ""}`);
      const confidence = text !== null && text >= 0.8 && (color === null || color >= 0.5) ? "strong" : text !== null && text >= 0.7 ? "likely" : "possible";
      out.push({ ball, score, text, color, confidence, evidence });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
  }
  function identifyInArsenal(sig, arsenal) {
    const g = classifyBall(sig, arsenal);
    return g.ballId ? { ballId: g.ballId, confidence: g.confidence, auto: g.auto } : null;
  }

  // core/src/balls.ts
  function specForWeight(b, lb) {
    const row = b.weightSpecs?.value.find((w) => w.lb === lb);
    if (row) return { ...row, exact: true };
    return { rg: b.rg?.value, differential: b.differential?.value, intermediateDifferential: b.intermediateDifferential?.value, lb: b.specWeightLb?.value, exact: false };
  }
  var ballKey = (manufacturer, name) => `${manufacturer.trim()}|${name.trim()}`.toLowerCase();
  var SPEC_FIELDS = ["releaseYear", "line", "coverstock", "coverstockType", "core", "coreSymmetry", "rg", "differential", "intermediateDifferential", "factoryFinish", "specWeightLb", "weightSpecs", "colorway", "status", "availableOn", "imageUrl", "competition"];
  var todayIso = (now) => now.toISOString().slice(0, 10);
  var releaseYearOf = (b) => b.availableOn ? Number(b.availableOn.value.slice(0, 4)) : b.releaseYear?.value;
  function recommendable(b, now = /* @__PURE__ */ new Date()) {
    if (b.status?.value !== "current") return false;
    if (b.competition?.value !== "approved") return false;
    if (b.availableOn && b.availableOn.value > todayIso(now)) return false;
    const y = releaseYearOf(b);
    return y !== void 0 && y >= now.getFullYear() - 1;
  }
  function isUpcoming(b, now = /* @__PURE__ */ new Date()) {
    if (b.status?.value === "upcoming") return !b.availableOn || b.availableOn.value >= todayIso(now);
    return b.status?.value === "current" && !!b.availableOn && b.availableOn.value > todayIso(now);
  }
  var NUMERIC = /* @__PURE__ */ new Set(["releaseYear", "rg", "differential", "intermediateDifferential", "specWeightLb"]);
  function rowToBall(row, source) {
    const ball = { key: ballKey(row.manufacturer, row.name), manufacturer: row.manufacturer.trim(), name: row.name.trim() };
    for (const f of SPEC_FIELDS) {
      const raw = row[f];
      if (raw === void 0 || raw === "") continue;
      const value = NUMERIC.has(f) ? Number(raw) : String(raw).trim();
      if (typeof value === "number" && Number.isNaN(value)) continue;
      ball[f] = { value, source };
    }
    return ball;
  }

  // core/src/quiz.ts
  var STYLES = [
    { id: "one-hand-thumb", label: "One hand, thumb in the ball", blurb: "The classic grip: thumb plus two fingers." },
    { id: "one-hand-no-thumb", label: "One hand, no thumb", blurb: "Thumbless: fingers only, thumb out of the ball." },
    { id: "two-handed", label: "Two-handed", blurb: "A second hand supports the ball through the swing." }
  ];
  var LEVELS = [
    { id: "new", label: "New to bowling" },
    { id: "casual", label: "Casual, a few times a year" },
    { id: "league", label: "League bowler" },
    { id: "competitive", label: "Competitive or tournament bowler" },
    { id: "pro", label: "Professional or collegiate" }
  ];
  var FOCUS_OPTIONS = [
    { id: "pocket-accuracy", label: "I miss the pocket and leave corner pins" },
    { id: "speed-consistency", label: "My ball speed changes shot to shot" },
    { id: "target-consistency", label: "I can't hit my target consistently" },
    { id: "start-consistency", label: "My starting position drifts" },
    { id: "shallow-entry", label: "My ball doesn't hook enough" },
    { id: "speed-loss", label: "My ball hooks too early and runs out of energy" }
  ];
  var REV_TIER = { low: 280, medium: 350, high: 450, "very-high": 540 };
  var REV_STYLE_DEFAULT = { "one-hand-thumb": 330, "one-hand-no-thumb": 420, "two-handed": 480 };
  function estimateRev(a) {
    if (a.revRpm !== void 0 && Number.isFinite(a.revRpm) && a.revRpm >= 100 && a.revRpm <= 800) return { rpm: a.revRpm, source: "entered" };
    if (a.revTier !== "unsure") return { rpm: REV_TIER[a.revTier], source: "tier" };
    return { rpm: REV_STYLE_DEFAULT[a.style], source: "style-default" };
  }
  var revSourceText = (s) => s === "entered" ? "the number you entered" : s === "tier" ? "estimated from the rev band you picked" : "assumed typical for your style";
  var styleLabel = (s) => STYLES.find((x) => x.id === s).label;
  function styleNotes(s) {
    if (s === "two-handed")
      return [
        "Two-handed bowlers usually throw more revolutions, so the lineup builder assumes a higher rev rate unless you enter yours.",
        "The camera measures what the ball does, not your hands, so release and support-hand checks will come from replaying your video."
      ];
    if (s === "one-hand-no-thumb")
      return [
        "Thumbless releases tend to produce more revolutions than a thumb release, so the lineup builder assumes a medium-high rev rate unless you enter yours.",
        "Because there's no thumb exit, early timing and ball speed are the first things to keep repeatable."
      ];
    return ["The lineup builder assumes a typical rev rate for a thumb release unless you enter yours."];
  }
  function styleTip(s, issueId) {
    const tips = {
      "two-handed": {
        "speed-consistency": "For a two-handed delivery, check that your support hand lets go at the same point in the swing every time; that is a common source of speed swings.",
        "pocket-accuracy": "Two-handed bowlers often miss by changing their feet or shoulder alignment: film your slide and compare the shot with your best ones."
      },
      "one-hand-no-thumb": {
        "speed-consistency": "Without a thumb, ball speed depends heavily on swing timing: use the same pushaway every shot."
      }
    };
    return tips[s]?.[issueId] ?? "";
  }
  function summarize(a) {
    const rev = estimateRev(a);
    return [
      `${styleLabel(a.style)}, ${a.hand === "R" ? "right" : "left"}-handed`,
      `${LEVELS.find((l) => l.id === a.level).label}${a.avgBand ? `, averaging ${a.avgBand.replace("under-", "under ").replace("-", " to ")}` : ""}`,
      `Rev rate: about ${rev.rpm} RPM (${revSourceText(rev.source)})`,
      `Mostly bowls ${a.patterns === "unsure" ? "an unknown mix of patterns" : a.patterns === "both" ? "house and sport patterns" : a.patterns === "house" ? "house shots" : "sport patterns"}`,
      a.focus.length ? `Wants help with: ${a.focus.map((id) => FOCUS_OPTIONS.find((f) => f.id === id)?.label).filter(Boolean).join("; ")}` : "No specific problems flagged yet, so the app will find them from your shots"
    ];
  }
  function defaultAnswers(name = "") {
    return { name, style: "one-hand-thumb", hand: "R", level: "league", avgBand: "", revTier: "unsure", speedTier: "unsure", patterns: "unsure", goal: "strikes", focus: [], takenAt: (/* @__PURE__ */ new Date()).toISOString() };
  }

  // core/src/share.ts
  var toB64 = (bytes) => {
    let s = "";
    bytes.forEach((b) => s += String.fromCharCode(b));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  var b64urlEncode = (text) => toB64(new TextEncoder().encode(text));
  var b64urlDecode = (s) => new TextDecoder().decode(fromB64(s));
  var CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  function newFriendCode(rand = Math.random) {
    return Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(rand() * CODE_CHARS.length)]).join("");
  }
  var isFriendCode = (s) => /^[2-9A-HJKMNP-Z]{8}$/.test(s);
  var cleanUsername = (s) => s.trim().replace(/^@/, "").toLowerCase();
  var isUsername = (s) => /^[a-z0-9_]{3,20}$/.test(s);
  var friendTag = (username, code) => `${username}#${code}`;
  function parseFriendTag(s) {
    const m = /^@?([A-Za-z0-9_]{3,20})\s*#\s*([A-Za-z0-9]{8})$/.exec(s.trim());
    if (!m) return null;
    const code = m[2].toUpperCase();
    return isFriendCode(code) ? { username: m[1].toLowerCase(), code } : null;
  }
  function encodeInvite(name, code, username) {
    return `${b64urlEncode(name.slice(0, 40))}.${code}${username && isUsername(username) ? "." + username : ""}`;
  }
  function decodeInvite(s) {
    const [n, code, u] = s.split(".");
    if (!n || !code || !isFriendCode(code)) return null;
    try {
      const name = b64urlDecode(n).trim();
      if (!name) return null;
      return u && isUsername(u) ? { name, code, username: u } : { name, code };
    } catch {
      return null;
    }
  }
  function downsamplePath(path2, n = 18) {
    if (path2.length === 0) return [];
    const out = [];
    for (let i = 0; i < n; i++) {
      const s = path2[Math.min(path2.length - 1, Math.round(i / (n - 1) * (path2.length - 1)))];
      out.push(Math.round(s.x * 10), Math.round(s.y * 10));
    }
    return out;
  }
  var pathFromShared = (p) => Array.from({ length: Math.floor(p.length / 2) }, (_, i) => ({ t: i, x: p[2 * i] / 10, y: p[2 * i + 1] / 10 }));
  var num = (v) => typeof v === "number" && Number.isFinite(v);
  var numOrNull = (v) => v === null || num(v);
  function decodeSession(text) {
    let s;
    try {
      s = JSON.parse(b64urlDecode(text));
    } catch {
      return null;
    }
    const o = s;
    if (!o || o.v !== 1 || typeof o.lane !== "string" || typeof o.date !== "string" || o.hand !== "R" && o.hand !== "L") return null;
    if (!o.from || typeof o.from.name !== "string" || !isFriendCode(String(o.from.code))) return null;
    if (!Array.isArray(o.shots) || o.shots.length === 0 || o.shots.length > 200) return null;
    for (const sh of o.shots) {
      if (!num(sh?.sp) || sh.sp < 3 || sh.sp > 40 || !numOrNull(sh.ar) || !numOrNull(sh.bb) || !numOrNull(sh.bf) || !numOrNull(sh.en) || !numOrNull(sh.an)) return null;
      if (!Array.isArray(sh.p) || sh.p.length > 80 || !sh.p.every((x) => num(x) && Math.abs(x) < 2e4)) return null;
    }
    return {
      v: 1,
      from: { name: o.from.name.slice(0, 40), code: o.from.code },
      lane: o.lane.slice(0, 60),
      pattern: typeof o.pattern === "string" ? o.pattern.slice(0, 60) : void 0,
      date: o.date.slice(0, 40),
      hand: o.hand,
      shots: o.shots.map((sh) => ({ sp: sh.sp, ar: sh.ar, bb: sh.bb, bf: sh.bf, en: sh.en, an: sh.an, ball: typeof sh.ball === "string" ? sh.ball.slice(0, 60) : void 0, pins: num(sh.pins) ? sh.pins : void 0, p: sh.p }))
    };
  }
  var sameLane = (a, b) => {
    const n = (x) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    return n(a) !== "" && n(a) === n(b);
  };
  var avg = (v) => {
    const x = v.filter((n) => typeof n === "number");
    return x.length ? x.reduce((a, b) => a + b, 0) / x.length : null;
  };
  function compareSessions(mine, theirs) {
    const row = (label2, unit4, pick) => ({ label: label2, unit: unit4, mine: avg(mine.shots.map(pick)), theirs: avg(theirs.shots.map(pick)) });
    const rows2 = [
      row("Speed", "mph", (s) => s.sp),
      row("Arrows board", "", (s) => s.ar),
      row("Breakpoint board", "", (s) => s.bb),
      row("Breakpoint distance", "ft", (s) => s.bf),
      row("Entry board", "", (s) => s.en),
      row("Entry angle", "\xB0", (s) => s.an === null ? null : Math.abs(s.an))
    ];
    const same = sameLane(mine.lane, theirs.lane);
    const notes = [];
    notes.push(same ? `Both sessions were on "${mine.lane}", so differences reflect the bowlers and equipment, not just the lane.` : `These were on different lanes ("${mine.lane}" and "${theirs.lane}"), so treat the comparison loosely.`);
    const bp = rows2[3];
    if (bp.mine !== null && bp.theirs !== null && Math.abs(bp.mine - bp.theirs) >= 3) notes.push(`${theirs.from.name}'s ball breaks ${bp.theirs > bp.mine ? "farther down-lane" : "earlier"} than yours by about ${Math.abs(bp.mine - bp.theirs).toFixed(0)} ft.`);
    const en = rows2[4];
    if (en.mine !== null && en.theirs !== null && Math.abs(en.mine - en.theirs) >= 1.5) notes.push(`They enter the pocket about ${Math.abs(en.mine - en.theirs).toFixed(1)} boards ${en.theirs > en.mine ? "farther left" : "farther right"} of where you do.`);
    if (mine.hand !== theirs.hand) notes.push("One of you is left-handed and one is right-handed, so board numbers mirror: compare shapes rather than raw boards.");
    return { rows: rows2, notes, sameLane: same };
  }

  // core/src/stats.ts
  var MIN_SAMPLE = 20;
  function rate(made, attempts) {
    if (attempts === 0) {
      return { made, attempts, rate: null, interval: null, sufficient: false };
    }
    const p = made / attempts;
    const z = 1.96;
    const denom = 1 + z * z / attempts;
    const centre = p + z * z / (2 * attempts);
    const margin = z * Math.sqrt(p * (1 - p) / attempts + z * z / (4 * attempts * attempts));
    return {
      made,
      attempts,
      rate: p,
      interval: [(centre - margin) / denom, (centre + margin) / denom],
      sufficient: attempts >= MIN_SAMPLE
    };
  }

  // core/src/coach.ts
  var isStrike = (s) => s.result?.pinsDown === 10;
  var withResult = (shots) => shots.filter((s) => s.result !== void 0);
  var mean2 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var sd2 = (v) => {
    if (v.length < 2) return 0;
    const m = mean2(v);
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
  };
  var FEATURES = [
    { key: "launchSpeed", label: "Launch speed", unit: "mph" },
    { key: "entrySpeed", label: "Entry speed", unit: "mph" },
    { key: "speedLossPct", label: "Speed loss", unit: "%" },
    { key: "startBoard", label: "Starting board", unit: "" },
    { key: "arrowsBoard", label: "Arrows board", unit: "" },
    { key: "breakpointBoard", label: "Breakpoint board", unit: "" },
    { key: "breakpointFt", label: "Breakpoint distance", unit: "ft" },
    { key: "hookBoards", label: "Hook (breakpoint to entry)", unit: "boards" },
    { key: "entryBoard", label: "Entry board", unit: "" },
    { key: "entryAngle", label: "Entry angle", unit: "\xB0" },
    { key: "launchAngle", label: "Launch angle", unit: "\xB0" },
    { key: "pocketMiss", label: "Pocket miss (+ high, - light)", unit: "boards" }
  ];
  function featureValues(shots, key2) {
    return shots.map((s) => s.m[key2]).filter((v) => typeof v === "number" && Number.isFinite(v));
  }
  function computeProfile(shots) {
    const stats = {};
    for (const f of FEATURES) {
      const v = featureValues(shots, f.key);
      if (v.length) stats[f.key] = { mean: mean2(v), sd: sd2(v), n: v.length };
    }
    const zones = {};
    for (const s of shots) if (s.m.zone) zones[s.m.zone] = (zones[s.m.zone] ?? 0) + 1;
    const r = withResult(shots);
    return { shots: shots.length, withResults: r.length, strike: rate(r.filter(isStrike).length, r.length), stats, zones };
  }
  function correlation(shots, a, b) {
    const rows2 = shots.map((s) => [s.m[a], s.m[b]]).filter((r) => typeof r[0] === "number" && typeof r[1] === "number");
    if (rows2.length < 5) return 0;
    const ma = mean2(rows2.map((r) => r[0]));
    const mb = mean2(rows2.map((r) => r[1]));
    let sab = 0, saa = 0, sbb = 0;
    for (const [x, y] of rows2) {
      sab += (x - ma) * (y - mb);
      saa += (x - ma) ** 2;
      sbb += (y - mb) ** 2;
    }
    return saa === 0 || sbb === 0 ? 0 : sab / Math.sqrt(saa * sbb);
  }
  var MIN_OUTCOMES = 20;
  var MIN_PER_BIN = 6;
  function bins(shots, key2, n = 3) {
    const rows2 = withResult(shots).map((s) => ({ v: s.m[key2], strike: isStrike(s) })).filter((r) => typeof r.v === "number" && Number.isFinite(r.v)).sort((a, b) => a.v - b.v);
    const out = [];
    const size = Math.floor(rows2.length / n);
    if (size < MIN_PER_BIN) return out;
    for (let i = 0; i < n; i++) {
      const chunk = rows2.slice(i * size, i === n - 1 ? rows2.length : (i + 1) * size);
      out.push({ lo: chunk[0].v, hi: chunk[chunk.length - 1].v, rate: rate(chunk.filter((r) => r.strike).length, chunk.length) });
    }
    return out;
  }
  var pctText = (r) => `${Math.round((r.rate ?? 0) * 100)}% (${r.made}/${r.attempts})`;
  var fmt = (n, d = 1) => n.toFixed(d);
  function findIssues(shots, focus = []) {
    const issues = [];
    const r = withResult(shots);
    const missShots = r.filter((s) => s.m.pocketMiss !== null);
    if (missShots.length >= MIN_OUTCOMES) {
      const inP = missShots.filter((s) => Math.abs(s.m.pocketMiss) <= 1);
      const out = missShots.filter((s) => Math.abs(s.m.pocketMiss) > 1);
      const a = rate(inP.filter(isStrike).length, inP.length);
      const b = rate(out.filter(isStrike).length, out.length);
      const meanMiss = mean2(missShots.map((s) => s.m.pocketMiss));
      if (a.rate !== null && b.rate !== null && inP.length >= MIN_PER_BIN && out.length >= MIN_PER_BIN && a.rate - b.rate >= 0.15) {
        const highShare = out.filter((s) => s.m.pocketMiss > 0).length / out.length;
        const side = highShare > 0.65 ? "high (too full on the head pin)" : highShare < 0.35 ? "light (too thin on the head pin)" : "both sides";
        issues.push({
          id: "pocket-accuracy",
          title: `Missing the pocket ${side}`,
          detail: `Strikes: ${pctText(a)} when you hit within a board of the pocket versus ${pctText(b)} when you miss by more.`,
          impactPts: Math.round((a.rate - b.rate) * 100),
          confidence: a.interval && b.interval && a.interval[0] > b.interval[1] ? "solid" : "tentative",
          evidence: [Math.abs(meanMiss) < 0.5 ? "On average you are centered on the pocket, so the misses spread both ways: this is repeatability, not aim." : `Average entry sits ${fmt(Math.abs(meanMiss))} boards ${meanMiss > 0 ? "high" : "light"} of the pocket.`, `${Math.round(out.length / missShots.length * 100)}% of shots missed the pocket by more than 1 board.`]
        });
      }
    }
    const featureIssues = [];
    if (r.length >= MIN_OUTCOMES) {
      const covered = /* @__PURE__ */ new Set(["pocketMiss", "entryBoard", "hookBoards", "entrySpeed"]);
      for (const f of FEATURES) {
        if (covered.has(f.key)) continue;
        const b = bins(shots, f.key);
        if (b.length < 3) continue;
        const sorted2 = [...b].sort((x, y) => (y.rate.rate ?? 0) - (x.rate.rate ?? 0));
        const diff = (sorted2[0].rate.rate ?? 0) - (sorted2[2].rate.rate ?? 0);
        if (diff >= 0.25) featureIssues.push({ f, best: sorted2[0], worst: sorted2[2] });
      }
      featureIssues.sort((x, y) => y.best.rate.rate - y.worst.rate.rate - (x.best.rate.rate - x.worst.rate.rate));
      const kept = [];
      for (const c of featureIssues) if (kept.every((k2) => Math.abs(correlation(shots, c.f.key, k2.f.key)) < 0.85)) kept.push(c);
      for (const { f, best, worst } of kept.slice(0, 3)) {
        const diff = Math.round((best.rate.rate - worst.rate.rate) * 100);
        const u = f.unit === "" || f.unit === "\xB0" || f.unit === "%" ? f.unit : " " + f.unit;
        issues.push({
          id: `range-${f.key}`,
          title: `${f.label} outside your best range`,
          detail: `You strike ${pctText(best.rate)} when ${f.label.toLowerCase()} is ${fmt(best.lo)} to ${fmt(best.hi)}${u}, but only ${pctText(worst.rate)} at ${fmt(worst.lo)} to ${fmt(worst.hi)}${u}.`,
          impactPts: diff,
          confidence: best.rate.interval && worst.rate.interval && best.rate.interval[0] > worst.rate.interval[1] ? "solid" : "tentative",
          evidence: [`Based on ${best.rate.attempts + worst.rate.attempts} shots in the best and worst thirds.`]
        });
      }
    }
    const p = computeProfile(shots);
    const spd = p.stats.launchSpeed;
    if (spd && spd.n >= 8 && spd.sd > 0.8) issues.push({ id: "speed-consistency", title: "Ball speed isn't repeatable", detail: `Launch speed varies \xB1${fmt(spd.sd)} mph around ${fmt(spd.mean)} mph. Under about 0.6 is a good target.`, impactPts: null, confidence: spd.n >= 15 ? "solid" : "tentative", evidence: [`${spd.n} tracked shots.`] });
    const ar = p.stats.arrowsBoard;
    if (ar && ar.n >= 8 && ar.sd > 1.5) issues.push({ id: "target-consistency", title: "Your target at the arrows wanders", detail: `Arrows board varies \xB1${fmt(ar.sd)} boards around ${fmt(ar.mean)}. Aim for under 1.`, impactPts: null, confidence: ar.n >= 15 ? "solid" : "tentative", evidence: [`${ar.n} tracked shots.`] });
    const st2 = p.stats.startBoard;
    if (st2 && st2.n >= 8 && st2.sd > 1.5) issues.push({ id: "start-consistency", title: "Your starting position drifts", detail: `Starting board varies \xB1${fmt(st2.sd)} boards around ${fmt(st2.mean)}. Aim for under 1.`, impactPts: null, confidence: st2.n >= 15 ? "solid" : "tentative", evidence: [`${st2.n} tracked shots.`] });
    const ea = p.stats.entryAngle;
    if (ea && ea.n >= 8 && ea.mean < 3) issues.push({ id: "shallow-entry", title: "Entry angle is shallow", detail: `Your entry angle averages ${fmt(ea.mean)}\xB0. Below about 3\xB0 the ball has little room to carry the pocket.`, impactPts: null, confidence: "tentative", evidence: [`${ea.n} tracked shots.`] });
    const loss = p.stats.speedLossPct;
    if (loss && loss.n >= 8 && loss.mean > 30) issues.push({ id: "speed-loss", title: "Ball is losing a lot of speed", detail: `It loses ${fmt(loss.mean)}% of its speed before the pins, which can mean the ball is hooking early or the hand is too far under it.`, impactPts: null, confidence: "tentative", evidence: [`${loss.n} tracked shots.`] });
    for (const i of issues) i.flagged = focus.includes(i.id);
    const rank = (i) => (i.impactPts ?? 0) + (i.flagged ? 8 : 0);
    return issues.sort((a, b) => rank(b) - rank(a));
  }
  var DRILLS = {
    "pocket-accuracy": "Pick the arrow you want and throw 10 shots at it, same feet, same ball. Track how many hit the pocket; do not change anything between shots.",
    "speed-consistency": "Throw 10 shots focusing only on a smooth, same-length slide and pushaway. Stop when speed varies by more than 0.6 mph and reset your tempo.",
    "target-consistency": "Lay a towel or marker on your target arrow. Throw 10 shots looking only at it, same feet, and check the arrows board after each.",
    "start-consistency": "Mark your starting board with tape. Check your feet against it before every shot for a full session.",
    "shallow-entry": "Test one change: slightly less speed or a touch more rotation, and keep the line. Check whether entry angle rises past 4\xB0.",
    "speed-loss": "Try a lower-friction ball or move your feet slightly toward the oiled side, and watch whether speed loss drops."
  };
  var TARGETS = {
    "speed-consistency": { metric: "launchSpeed", stat: "sd", target: 0.6, direction: "down", unit: "mph \xB1" },
    "target-consistency": { metric: "arrowsBoard", stat: "sd", target: 1, direction: "down", unit: "boards \xB1" },
    "start-consistency": { metric: "startBoard", stat: "sd", target: 1, direction: "down", unit: "boards \xB1" },
    "shallow-entry": { metric: "entryAngle", stat: "mean", target: 4, direction: "up", unit: "\xB0" },
    "speed-loss": { metric: "speedLossPct", stat: "mean", target: 25, direction: "down", unit: "%" }
  };
  function buildPlan(shots, issues, now = /* @__PURE__ */ new Date(), style) {
    const drillFor = (id) => [DRILLS[id], style ? styleTip(style, id) : ""].filter(Boolean).join(" ");
    const p = computeProfile(shots);
    const items = [];
    for (const i of issues.slice(0, 3)) {
      if (i.id === "pocket-accuracy") {
        const miss = shots.filter((s2) => s2.m.pocketMiss !== null);
        const inPocket = miss.filter((s2) => Math.abs(s2.m.pocketMiss) <= 1).length;
        const base = miss.length ? Math.round(inPocket / miss.length * 100) : 0;
        items.push({ id: i.id, title: i.title, metric: "pocketMiss", baseline: base, target: Math.min(90, base + 15), direction: "up", unit: "% in pocket", drill: drillFor(i.id) });
        continue;
      }
      const t = TARGETS[i.id];
      const s = t && p.stats[t.metric];
      if (!t || !s) continue;
      items.push({ id: i.id, title: i.title, metric: t.metric, baseline: Number((t.stat === "sd" ? s.sd : s.mean).toFixed(2)), target: t.target, direction: t.direction, unit: t.unit, drill: drillFor(i.id) });
    }
    return { createdAt: now.toISOString(), basedOnShots: shots.length, items };
  }
  function planProgress(plan, recent) {
    return plan.items.map((item) => {
      let current4 = null;
      if (item.metric === "pocketMiss") {
        const miss = recent.filter((s) => s.m.pocketMiss !== null);
        current4 = miss.length >= 5 ? Math.round(miss.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / miss.length * 100) : null;
      } else {
        const v = featureValues(recent, item.metric);
        const useSd = item.unit.includes("\xB1");
        current4 = v.length >= 5 ? Number((useSd ? sd2(v) : mean2(v)).toFixed(2)) : null;
      }
      if (current4 === null) return { item, current: current4, progress: null, met: false };
      const span = item.target - item.baseline;
      const progress2 = span === 0 ? 1 : Math.max(0, Math.min(1, (current4 - item.baseline) / span));
      const met = item.direction === "down" ? current4 <= item.target : current4 >= item.target;
      return { item, current: current4, progress: progress2, met };
    });
  }

  // core/src/vision.ts
  var LANE_BOARDS = 39;
  var LANE_LENGTH_FT = 60;
  var ARROWS_FT = 15;
  function solveHomography(src, dst) {
    const A = [];
    for (let i = 0; i < 4; i++) {
      const { x, y } = src[i];
      const { x: u, y: v } = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (let c = 0; c < 8; c++) {
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) throw new Error("degenerate calibration points");
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k2 = c; k2 < 9; k2++) A[r][k2] -= f * A[c][k2];
      }
    }
    return [...A.map((row, i) => row[8] / row[i]), 1];
  }
  function applyHomography(h, p) {
    const w = h[6] * p.x + h[7] * p.y + h[8];
    return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
  }
  var boardFromRight = (xBoards) => LANE_BOARDS + 0.5 - xBoards;
  var boardToX = (board) => LANE_BOARDS + 0.5 - board;
  function linearFit(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < n; i++) {
      sxx += (xs[i] - mx) ** 2;
      sxy += (xs[i] - mx) * (ys[i] - my);
    }
    const slope = sxy / sxx;
    const intercept = my - slope * mx;
    const rmse = Math.sqrt(xs.reduce((a, x, i) => a + (ys[i] - (slope * x + intercept)) ** 2, 0) / n);
    return { slope, intercept, rmse };
  }
  function interp(path2, yFt) {
    for (let i = 1; i < path2.length; i++) {
      const a = path2[i - 1];
      const b = path2[i];
      if (a.y <= yFt && b.y >= yFt && b.y > a.y) return a.x + (yFt - a.y) / (b.y - a.y) * (b.x - a.x);
    }
    return null;
  }
  var ENTRY_FT = 59.5;
  var BOARD_IN = 41.5 / LANE_BOARDS;
  function headingDeg(path2, y0, y1) {
    const w = path2.filter((s) => s.y >= y0 && s.y <= y1);
    if (w.length < 4 || w[w.length - 1].y - w[0].y < 4) return null;
    const f = linearFit(w.map((s) => s.y), w.map((s) => s.x));
    return { deg: Math.atan(f.slope * BOARD_IN / 12) * 180 / Math.PI, slopeBoardsPerFt: f.slope };
  }
  function forwardPath(path2) {
    const sorted2 = [...path2].sort((a, b) => a.t - b.t);
    const out = [];
    let far = -Infinity;
    for (const s of sorted2) {
      if (s.y < far - 0.6) continue;
      out.push(s);
      far = Math.max(far, s.y);
    }
    return out;
  }
  function analyzeShot(rawPath) {
    const path2 = forwardPath(rawPath);
    const p = path2.filter((s) => s.y >= 3 && s.y <= 58).sort((a, b) => a.t - b.t);
    if (p.length < 8 || p[p.length - 1].y - p[0].y < 20) return null;
    const fit = linearFit(p.map((s) => s.t), p.map((s) => s.y));
    if (fit.slope <= 0) return null;
    const fps = fit.slope;
    const speed = fps * (3600 / 5280);
    const speedUnc = fit.rmse / (p[p.length - 1].t - p[0].t) * (3600 / 5280) * 2;
    const mid2 = p.filter((s) => s.y >= ARROWS_FT && s.y <= 55);
    let bpBoard = null;
    let bpFt = null;
    if (mid2.length >= 4) {
      const c = LANE_BOARDS / 2;
      const ext = mid2.reduce((best, s) => Math.abs(s.x - c) > Math.abs(best.x - c) ? s : best);
      bpBoard = boardFromRight(ext.x);
      bpFt = ext.y;
    }
    const arrows = interp(p, ARROWS_FT);
    const lastY = p[p.length - 1].y;
    const tailFrom = Math.min(50, lastY - 8);
    const tail = lastY >= ENTRY_FT - 10 ? p.filter((s) => s.y >= tailFrom) : [];
    let entry = null;
    if (tail.length >= 4 && tail[tail.length - 1].y - tail[0].y >= 2.5) {
      const f = linearFit(tail.map((s) => s.y), tail.map((s) => s.x));
      entry = f.slope * ENTRY_FT + f.intercept;
    }
    const first = path2[0];
    const last = path2[path2.length - 1];
    const exitH = headingDeg(path2, last.y - 10, last.y + 0.01);
    const launch = headingDeg(p, 3, 20);
    const impact = lastY >= ENTRY_FT - 10 ? headingDeg(p, tailFrom, 58) : null;
    const coverage = Math.min(1, (p[p.length - 1].y - p[0].y) / 45);
    const confidence = Math.max(0, Math.min(1, coverage * (1 - Math.min(1, fit.rmse / 5))));
    return {
      speedMph: speed,
      speedUncertainty: speedUnc,
      boardAtArrows: arrows === null ? null : boardFromRight(arrows),
      breakpointBoard: bpBoard,
      breakpointFt: bpFt,
      entryBoard: entry === null ? null : boardFromRight(entry),
      launchAngleDeg: launch?.deg ?? null,
      impactAngleDeg: impact?.deg ?? null,
      samples: p.length,
      confidence,
      release: { board: boardFromRight(first.x), ft: first.y },
      lastSeen: { board: boardFromRight(last.x), ft: last.y, t: last.t },
      exitHeadingDeg: exitH?.deg ?? null,
      entryMeasured: last.y >= ENTRY_FT - 2,
      reachedDeck: last.y >= 60
    };
  }
  function gatePath(p) {
    if (p.length < 3) return p;
    const out = [p[0]];
    let rejected2 = 0;
    for (let i = 1; i < p.length; i++) {
      const a = out[out.length - 1];
      const b = p[i];
      const dy = Math.max(0, b.y - a.y);
      if (Math.abs(b.x - a.x) <= 1.2 + 1.5 * dy || ++rejected2 > 14) {
        out.push(b);
        rejected2 = 0;
      }
    }
    return out;
  }
  var halfAt = (y, base) => Math.max(base, Math.round(base + 5 * (1 - Math.min(1, Math.max(0, y - 6) / 16))));
  function smoothPath(raw, base = 3) {
    if (raw.length < 5) return raw;
    const p = gatePath(raw);
    if (p.length < 5) return p;
    const med3 = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
    const xm = p.map((s, i) => {
      const m = Math.max(3, halfAt(s.y, base) - 2);
      return med3(p.slice(Math.max(0, i - m), Math.min(p.length, i + m + 1)).map((q) => q.x));
    });
    const ym = p.map((_, i) => med3(p.slice(Math.max(0, i - 3), Math.min(p.length, i + 4)).map((s) => s.y)));
    const out = p.map((s, i) => {
      const half = halfAt(s.y, base);
      const lo = Math.max(0, i - half), hi = Math.min(p.length - 1, i + half);
      let n = 0, st2 = 0, sx = 0, sy = 0, stt = 0, stx = 0, sty = 0;
      for (let j = lo; j <= hi; j++) {
        const t = p[j].t - s.t;
        n++;
        st2 += t;
        sx += xm[j];
        sy += ym[j];
        stt += t * t;
        stx += t * xm[j];
        sty += t * ym[j];
      }
      const den = n * stt - st2 * st2;
      if (Math.abs(den) < 1e-9) return { t: s.t, x: sx / n, y: sy / n };
      return { t: s.t, x: (sx * stt - st2 * stx) / den, y: (sy * stt - st2 * sty) / den };
    });
    for (let i = 1; i < out.length; i++) if (out[i].y < out[i - 1].y) out[i] = { ...out[i], y: out[i - 1].y };
    return out;
  }
  function partialShot(rawPath) {
    const path2 = forwardPath(rawPath);
    if (path2.length < 6) return null;
    const first = path2[0];
    const last = path2[path2.length - 1];
    const span = last.y - first.y;
    if (span < 5 || last.t - first.t < 0.15) return null;
    const fit = linearFit(path2.map((s) => s.t), path2.map((s) => s.y));
    if (!(fit.slope > 0)) return null;
    const speed = fit.slope * (3600 / 5280);
    if (speed < 5 || speed > 40) return null;
    const arrows = interp(path2, ARROWS_FT);
    const exitH = headingDeg(path2, last.y - 10, last.y + 0.01);
    const launch = headingDeg(path2, Math.max(first.y, 3), Math.max(first.y, 3) + 17);
    return {
      speedMph: speed,
      speedUncertainty: fit.rmse / (last.t - first.t) * (3600 / 5280) * 2,
      boardAtArrows: arrows === null ? null : boardFromRight(arrows),
      breakpointBoard: null,
      breakpointFt: null,
      entryBoard: null,
      launchAngleDeg: launch?.deg ?? null,
      impactAngleDeg: null,
      samples: path2.length,
      confidence: Math.max(0, Math.min(1, span / 45 * (1 - Math.min(1, fit.rmse / 5)))) * 0.6,
      release: { board: boardFromRight(first.x), ft: first.y },
      lastSeen: { board: boardFromRight(last.x), ft: last.y, t: last.t },
      exitHeadingDeg: exitH?.deg ?? null,
      entryMeasured: false,
      reachedDeck: last.y >= 60,
      partial: true
    };
  }

  // core/src/metrics.ts
  var POCKET_BOARD = { R: 17.5, L: 22.5 };
  var MPH = 3600 / 5280;
  function speedBetween(path2, y0, y1) {
    const w = path2.filter((s) => s.y >= y0 && s.y <= y1);
    if (w.length < 4) return null;
    const dt = w[w.length - 1].t - w[0].t;
    const dy = w[w.length - 1].y - w[0].y;
    return dt > 0.05 && dy > 3 ? dy / dt * MPH : null;
  }
  function classifyZone(miss) {
    const a = Math.abs(miss);
    if (a <= 1) return "pocket";
    if (a <= 2.5) return miss > 0 ? "high" : "light";
    return miss > 0 ? "very-high" : "very-light";
  }
  function deriveMetrics(a, path2, hand3) {
    const early = path2.filter((s) => s.y >= 2 && s.y <= 8);
    const startBoard = early.length ? boardFromRight(early.reduce((t, s) => t + s.x, 0) / early.length) : null;
    const launchSpeed = speedBetween(path2, 3, 20);
    const entrySpeed = speedBetween(path2, 40, 58);
    const speedLossPct = launchSpeed && entrySpeed ? (launchSpeed - entrySpeed) / launchSpeed * 100 : null;
    const hookBoards = a.breakpointBoard !== null && a.entryBoard !== null ? Math.abs(a.entryBoard - a.breakpointBoard) : null;
    const hookLengthFt = a.breakpointFt !== null ? Math.max(0, 59.5 - a.breakpointFt) : null;
    const pocket = POCKET_BOARD[hand3];
    const seenToPins = path2.length > 0 && path2[path2.length - 1].y >= ENTRY_FT - 2;
    const pocketMiss = a.entryBoard === null || !seenToPins ? null : hand3 === "R" ? a.entryBoard - pocket : pocket - a.entryBoard;
    return {
      hand: hand3,
      startBoard,
      arrowsBoard: a.boardAtArrows,
      breakpointBoard: a.breakpointBoard,
      breakpointFt: a.breakpointFt,
      entryBoard: a.entryBoard,
      launchAngle: a.launchAngleDeg,
      entryAngle: a.impactAngleDeg === null ? null : Math.abs(a.impactAngleDeg),
      launchSpeed,
      entrySpeed,
      speedLossPct,
      hookBoards,
      hookLengthFt,
      pocketMiss,
      zone: pocketMiss === null ? null : classifyZone(pocketMiss)
    };
  }

  // camera/db.ts
  var PROFILES_KEY = "laneiq.profiles";
  var CURRENT_KEY = "laneiq.currentProfile";
  function listProfiles() {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? "[]");
    } catch {
      return [];
    }
  }
  function saveProfiles(p) {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(p));
    } catch {
    }
  }
  function currentProfileId() {
    try {
      return localStorage.getItem(CURRENT_KEY);
    } catch {
      return null;
    }
  }
  function setCurrentProfile(id) {
    try {
      localStorage.setItem(CURRENT_KEY, id);
    } catch {
    }
  }
  var newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  var opened = /* @__PURE__ */ new Map();
  function open(profileId) {
    let p = opened.get(profileId);
    if (!p) {
      p = new Promise((resolve, reject) => {
        const req = indexedDB.open(`laneiq-p-${profileId}`, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore("shots", { keyPath: "id" });
          db.createObjectStore("clips");
          db.createObjectStore("meta");
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      opened.set(profileId, p);
    }
    return p;
  }
  var wrap = (req) => new Promise((res, rej) => (req.onsuccess = () => res(req.result), req.onerror = () => rej(req.error)));
  async function dbAll(profileId, store) {
    return wrap((await open(profileId)).transaction(store).objectStore(store).getAll());
  }
  async function dbGet(profileId, store, key2) {
    return wrap((await open(profileId)).transaction(store).objectStore(store).get(key2));
  }
  async function dbPut(profileId, store, value, key2) {
    const s = (await open(profileId)).transaction(store, "readwrite").objectStore(store);
    await wrap(key2 === void 0 ? s.put(value) : s.put(value, key2));
  }
  async function dbDelete(profileId, store, key2) {
    await wrap((await open(profileId)).transaction(store, "readwrite").objectStore(store).delete(key2));
  }
  async function deleteProfileData(profileId) {
    const db = await open(profileId).catch(() => null);
    db?.close();
    opened.delete(profileId);
    await new Promise((res) => {
      const r = indexedDB.deleteDatabase(`laneiq-p-${profileId}`);
      r.onsuccess = r.onerror = r.onblocked = () => res();
    });
  }

  // camera/state.ts
  var S = {
    profile: null,
    shots: [],
    arsenal: [],
    catalog: [],
    patterns: [],
    plan: null,
    /** Insights count only what happened after this moment (null: everything). Resetting Insights moves it to now; shots and videos are never removed. */
    insightsSince: null,
    friends: [],
    /** sessions friends have shared with this profile, kept so they can be compared later */
    shared: [],
    /** where each session was bowled, as typed by the bowler (used to tell if two sessions share a lane) */
    laneLabels: {},
    sessionId: newId(),
    /** demo mode never writes to storage */
    demo: false,
    /** the line the bowler is playing: where they stand and aim (set with Target on the Live screen); every new shot carries a copy */
    target: null,
    /** where they're bowling tonight (for lane-pair memory) */
    where: { center: "", lane: "" },
    /** the practice drill under way, and every finished one */
    drill: null,
    drills: []
  };
  var listeners = /* @__PURE__ */ new Set();
  var onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));
  var changed = () => listeners.forEach((fn) => fn());
  async function loadProfile(id) {
    const p = listProfiles().find((x) => x.id === id) ?? null;
    S.profile = p;
    if (!p) return;
    setCurrentProfile(id);
    S.shots = (await dbAll(id, "shots")).sort((a, b) => a.at.localeCompare(b.at));
    recomputeMetrics();
    S.arsenal = await dbGet(id, "meta", "arsenal") ?? [];
    S.plan = await dbGet(id, "meta", "plan") ?? null;
    S.friends = await dbGet(id, "meta", "friends") ?? [];
    S.shared = await dbGet(id, "meta", "shared") ?? [];
    S.laneLabels = await dbGet(id, "meta", "laneLabels") ?? {};
    S.insightsSince = await dbGet(id, "meta", "insightsSince").catch(() => null) ?? null;
    S.target = await dbGet(id, "meta", "target").catch(() => null) ?? null;
    S.where = await dbGet(id, "meta", "where").catch(() => null) ?? { center: "", lane: "" };
    S.drill = await dbGet(id, "meta", "drill").catch(() => null) ?? null;
    S.drills = await dbGet(id, "meta", "drills").catch(() => null) ?? [];
    if (p && !p.friendCode) {
      S.profile = { ...p, friendCode: newFriendCode() };
      saveProfiles(listProfiles().map((x) => x.id === id ? S.profile : x));
    }
    S.sessionId = newId();
    changed();
  }
  async function bootProfile() {
    const id = currentProfileId();
    const list = listProfiles();
    const pick = list.find((p) => p.id === id) ?? list[0];
    if (!pick) return false;
    await loadProfile(pick.id);
    return true;
  }
  function createProfile(a) {
    const p = { id: newId(), name: a.name.trim() || "Bowler", username: a.username || void 0, hand: a.hand, revRpm: a.revRpm, quiz: a, created: (/* @__PURE__ */ new Date()).toISOString() };
    saveProfiles([...listProfiles(), p]);
    return p;
  }
  function recomputeMetrics() {
    const hand3 = S.profile?.hand ?? "R";
    for (const s of S.shots) {
      try {
        if (s.a && s.path?.length) s.m = deriveMetrics(s.a, s.path, hand3);
      } catch {
      }
    }
  }
  function updateProfile(patch) {
    if (!S.profile) return;
    S.profile = { ...S.profile, ...patch };
    if (patch.hand) recomputeMetrics();
    saveProfiles(listProfiles().map((p) => p.id === S.profile.id ? S.profile : p));
    changed();
  }
  var shotListeners = [];
  function onShot(fn) {
    shotListeners.push(fn);
  }
  async function addShot(s) {
    S.shots.push(s);
    for (const fn of shotListeners) {
      try {
        fn(s);
      } catch {
      }
    }
    if (!S.demo && S.profile) await dbPut(S.profile.id, "shots", s).catch(() => {
    });
    changed();
  }
  async function updateShot(s) {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "shots", s).catch(() => {
    });
    changed();
  }
  async function removeShot(id) {
    S.shots = S.shots.filter((s) => s.id !== id);
    if (!S.demo && S.profile) {
      await dbDelete(S.profile.id, "shots", id).catch(() => {
      });
      await dbDelete(S.profile.id, "clips", id).catch(() => {
      });
    }
    changed();
  }
  async function saveClip(id, blob) {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "clips", blob, id);
  }
  async function loadClip(id) {
    return S.profile ? dbGet(S.profile.id, "clips", id) : void 0;
  }
  async function saveArsenal() {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "meta", S.arsenal, "arsenal").catch(() => {
    });
    changed();
  }
  async function saveSocial() {
    if (!S.demo && S.profile) {
      await dbPut(S.profile.id, "meta", S.friends, "friends").catch(() => {
      });
      await dbPut(S.profile.id, "meta", S.shared, "shared").catch(() => {
      });
      await dbPut(S.profile.id, "meta", S.laneLabels, "laneLabels").catch(() => {
      });
    }
    changed();
  }
  var insightShots = () => S.insightsSince ? S.shots.filter((s) => s.at > S.insightsSince) : S.shots;
  var insightGames = (games2) => S.insightsSince ? games2.filter((g) => Date.parse(g.at) > Date.parse(S.insightsSince)) : games2;
  async function resetInsights() {
    S.insightsSince = (/* @__PURE__ */ new Date()).toISOString();
    S.plan = null;
    if (!S.demo && S.profile) {
      await dbPut(S.profile.id, "meta", S.insightsSince, "insightsSince").catch(() => {
      });
      await dbPut(S.profile.id, "meta", null, "plan").catch(() => {
      });
    }
    changed();
  }
  async function restoreInsights() {
    S.insightsSince = null;
    if (!S.demo && S.profile) await dbPut(S.profile.id, "meta", null, "insightsSince").catch(() => {
    });
    changed();
  }
  async function saveCoach() {
    if (!S.demo && S.profile) {
      await dbPut(S.profile.id, "meta", S.target, "target").catch(() => {
      });
      await dbPut(S.profile.id, "meta", S.where, "where").catch(() => {
      });
      await dbPut(S.profile.id, "meta", S.drill, "drill").catch(() => {
      });
      await dbPut(S.profile.id, "meta", S.drills, "drills").catch(() => {
      });
    }
    changed();
  }
  async function savePlan() {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "meta", S.plan, "plan").catch(() => {
    });
    changed();
  }
  async function loadReference() {
    const get = async (u) => {
      try {
        const r = await fetch(u);
        return r.ok ? await r.json() : [];
      } catch {
        return [];
      }
    };
    [S.catalog, S.patterns] = await Promise.all([get("balls.json"), get("patterns.json")]);
    changed();
  }
  var userSrc = () => ({ kind: "user", url: "entered by bowler", retrievedOn: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
  function ownedBalls() {
    return S.arsenal.map((b) => {
      const specs = b.catalogKey ? S.catalog.find((c) => c.key === b.catalogKey) : b.rg !== void 0 && b.diff !== void 0 ? rowToBall({ manufacturer: "(mine)", name: b.name, rg: b.rg, differential: b.diff, coverstockType: b.cover }, userSrc()) : void 0;
      const mine = S.shots.filter((s) => s.ballId === b.id);
      let observed;
      if (mine.length >= 8) {
        const avg2 = (v) => {
          const x = v.filter((n) => n !== null);
          return x.length ? x.reduce((a, c) => a + c, 0) / x.length : void 0;
        };
        const res = mine.filter((s) => s.result);
        const miss = mine.filter((s) => s.m.pocketMiss !== null);
        observed = {
          shots: mine.length,
          entryAngle: avg2(mine.map((s) => s.m.entryAngle)),
          breakpointFt: avg2(mine.map((s) => s.m.breakpointFt)),
          pocketPct: miss.length ? miss.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / miss.length * 100 : void 0,
          strikePct: res.length >= 8 ? res.filter(isStrike).length / res.length * 100 : void 0
        };
      }
      return { id: b.id, name: b.name, specs, observed };
    });
  }
  function bowlerProfile() {
    const p = computeProfile(S.shots);
    const speed = p.stats.launchSpeed;
    const angle = p.stats.entryAngle;
    const q = S.profile?.quiz;
    const sp = S.profile?.spin;
    const rev = sp?.rpm ? { rpm: sp.rpm, source: sp.source === "video" ? "measured" : "entered" } : q ? estimateRev({ style: q.style, revTier: q.revTier, revRpm: S.profile?.revRpm ?? q.revRpm }) : S.profile?.revRpm ? { rpm: S.profile.revRpm, source: "entered" } : void 0;
    return {
      hand: S.profile?.hand ?? "R",
      style: q?.style,
      launchSpeed: speed && speed.n >= 5 ? speed.mean : void 0,
      entryAngle: angle && angle.n >= 5 ? angle.mean : void 0,
      revRpm: rev?.rpm,
      revSource: rev?.source,
      axisRotation: sp?.axisRotation,
      axisTilt: sp?.axisTilt
    };
  }

  // camera/live.ts
  var $ = (id) => document.getElementById(id);
  var esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var setText = (id, v) => $(id).textContent = v;
  var f1 = (n, d = 1) => n === null || n === void 0 ? "n/a" : n.toFixed(d);
  function setStep(n) {
    document.querySelectorAll(".dot").forEach((d, i) => d.classList.toggle("on", i < n));
  }
  function setReady(ready) {
    const el = $("ready");
    el.textContent = ready ? "READY" : "NOT READY";
    el.classList.toggle("go", ready);
  }
  var guesses = /* @__PURE__ */ new Map();
  var sessionShots = () => S.shots.filter((s) => s.sessionId === S.sessionId);
  var enrollHandler = null;
  var onEnroll = (fn) => enrollHandler = fn;
  var scanHandler = null;
  var onScan = (fn) => scanHandler = fn;
  function attachSuggest(input) {
    const box = document.createElement("div");
    box.className = "suggest";
    input.insertAdjacentElement("afterend", box);
    input.addEventListener("input", () => {
      const hits = input.value.trim().length >= 2 ? searchCatalog(S.catalog, input.value, 6) : [];
      box.innerHTML = hits.map((h) => `<button class="chip" data-v="${esc(h.ball.manufacturer + " " + h.ball.name)}">${esc(h.ball.manufacturer)} ${esc(h.ball.name)}</button>`).join("");
      box.querySelectorAll("button").forEach(
        (b) => b.onclick = () => {
          input.value = b.dataset.v;
          box.innerHTML = "";
        }
      );
    });
  }
  var ZONE_TEXT = { ...ZONE_LABEL, pocket: "In the pocket" };
  function setCards(s) {
    const a = s.a;
    const m = s.m;
    setText("c-speed", a.speedMph.toFixed(1));
    setText("c-speed-u", `\xB1 ${a.speedUncertainty.toFixed(1)} mph`);
    setText("c-arrows", f1(a.boardAtArrows));
    setText("c-bp", f1(a.breakpointBoard));
    setText("c-bp-u", a.breakpointFt === null ? "" : `at ${a.breakpointFt.toFixed(0)} ft`);
    setText("c-entry", a.entryMeasured ? f1(a.entryBoard) : a.lastSeen ? f1(a.lastSeen.board) : "n/a");
    setText("c-entry-u", a.entryMeasured ? "board at 59.5 ft (seen)" : a.lastSeen ? `board where it was last seen, ${a.lastSeen.ft.toFixed(0)} ft down` : "");
    setText("c-launch", a.launchAngleDeg === null ? "n/a" : `${a.launchAngleDeg.toFixed(1)}\xB0`);
    setText("c-impact", a.impactAngleDeg === null ? "n/a" : `${a.impactAngleDeg.toFixed(1)}\xB0`);
    setText("c-loss", m.speedLossPct === null ? "n/a" : `${m.speedLossPct.toFixed(0)}%`);
    setText("c-hook", f1(m.hookBoards));
    setText("c-miss", m.pocketMiss === null ? "n/a" : `${m.pocketMiss > 0 ? "+" : ""}${m.pocketMiss.toFixed(1)}`);
    setText("c-miss-u", m.zone ? ZONE_TEXT[m.zone] : "+ high, \u2212 light");
    $("c-conf").style.width = `${Math.round(a.confidence * 100)}%`;
    setText("c-conf-t", a.partial ? `partial: the camera saw ${a.lastSeen && a.release ? Math.round(a.lastSeen.ft - a.release.ft) : "part of"} ft of the roll \xB7 ${a.samples} pts` : `${Math.round(a.confidence * 100)}% confidence \xB7 ${a.samples} pts`);
    document.querySelectorAll("#tab-live .card").forEach((el) => {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    });
  }
  function addHistory(s, n) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = `#${n} \xB7 ${s.a.speedMph.toFixed(1)} mph \xB7 entry ${f1(s.a.entryBoard)}`;
    $("history").prepend(chip);
  }
  var resultExtra = null;
  function setResultExtra(fn) {
    resultExtra = fn;
  }
  function renderResult(s) {
    const el = $("result-card");
    if (!s) return void (el.innerHTML = `<div class="u">Waiting for your first shot</div>`);
    const cur2 = s.result?.pinsDown;
    el.innerHTML = `<div class="u">${s.result?.auto ? `Read from the camera: ${cur2 === 10 ? "a strike" : `${cur2} down${s.result.leave?.length ? `, leaving the ${s.result.leave.join("-")}` : ""}`}. Tap a number if that is wrong.` : "How many pins did this shot knock down? This is how the app learns what costs you strikes."}</div><div class="chips">` + [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => `<button class="chip ${cur2 === n ? "sel" : n === 10 ? "x" : ""}" data-n="${n}">${n === 10 ? "Strike" : n}</button>`).join("") + `</div>` + (resultExtra?.() ?? "");
    el.querySelectorAll("button[data-n]").forEach((b) => {
      b.onclick = async () => {
        s.result = { pinsDown: Number(b.dataset.n) };
        await updateShot(s);
        renderResult(s);
      };
    });
  }
  function renderBall(s) {
    const el = $("ball-row");
    el.innerHTML = "";
    const name = (id) => S.arsenal.find((b) => b.id === id)?.name;
    const guess = s ? guesses.get(s.id) : void 0;
    const msg = document.createElement("div");
    msg.className = "u";
    if (!s) msg.textContent = S.arsenal.length ? "Balls ready: " + S.arsenal.map((b) => b.name).join(", ") : "No balls yet. Add one below and show it to the camera so it recognizes it from your very first shot.";
    else if (s.ballId) msg.textContent = `Recognized: ${name(s.ballId)}${guess ? ` (${Math.round(guess.confidence * 100)}% match)` : ""}. Tap to correct.`;
    else if (guess?.ballId) msg.textContent = `Best guess: ${name(guess.ballId)} (${Math.round(guess.confidence * 100)}%). Not sure enough, so please confirm.`;
    else msg.textContent = S.arsenal.length ? "Which ball was that?" : "Add your first ball below.";
    el.append(msg);
    const mine = s?.ballId ? S.arsenal.find((b) => b.id === s.ballId) : void 0;
    const cat = mine?.catalogKey ? S.catalog.find((c) => c.key === mine.catalogKey) : void 0;
    if (mine && (cat || mine.rg !== void 0)) {
      const info = document.createElement("div");
      info.className = "note";
      info.textContent = cat ? [`${cat.manufacturer} ${cat.name}`, cat.rg && `RG ${cat.rg.value}`, cat.differential && `diff ${cat.differential.value}`, cat.coverstock?.value, cat.core?.value, cat.colorway?.value].filter(Boolean).join(" \xB7 ") : `RG ${mine.rg} \xB7 diff ${mine.diff ?? "?"} (your specs)`;
      el.append(info);
    }
    const row = document.createElement("div");
    row.className = "chips";
    for (const b of S.arsenal) {
      const chip = document.createElement("button");
      chip.className = "chip" + (s?.ballId === b.id ? " sel" : guess?.ballId === b.id ? " guess" : "");
      chip.textContent = b.name;
      chip.onclick = async () => {
        if (!s) return;
        s.ballId = b.id;
        if (s.sig) b.exemplars = [...b.exemplars, s.sig].slice(-12);
        await Promise.all([saveArsenal(), updateShot(s)]);
        renderBall(s);
        renderLane();
      };
      row.append(chip);
    }
    el.append(row);
    const form = document.createElement("div");
    form.className = "chips";
    const input = document.createElement("input");
    input.className = "ballinput";
    input.placeholder = S.catalog.length ? `Search ${S.catalog.length} catalog balls or type a name` : "Ball name";
    const add2 = document.createElement("button");
    add2.className = "chip add";
    add2.textContent = "+ Show me this ball";
    add2.onclick = () => {
      const n = input.value.trim();
      if (!n) return void input.focus();
      const hit = S.catalog.find((c) => `${c.manufacturer} ${c.name}`.toLowerCase() === n.toLowerCase());
      enrollHandler?.(n, hit?.key);
    };
    const addNo = document.createElement("button");
    addNo.className = "chip add";
    addNo.textContent = "+ Add without showing";
    addNo.onclick = async () => {
      const n = input.value.trim();
      if (!n) return void input.focus();
      const hit = S.catalog.find((c) => `${c.manufacturer} ${c.name}`.toLowerCase() === n.toLowerCase());
      const b = { id: Math.random().toString(36).slice(2, 9), name: n, exemplars: s?.sig ? [s.sig] : [], catalogKey: hit?.key };
      S.arsenal.push(b);
      if (s) s.ballId = b.id;
      await Promise.all([saveArsenal(), s ? updateShot(s) : Promise.resolve()]);
      renderBall(s);
      renderLane();
    };
    const scan = document.createElement("button");
    scan.className = "chip add";
    scan.textContent = "+ Scan a ball (photo)";
    scan.onclick = () => scanHandler?.();
    form.append(input, add2, addNo, scan);
    el.append(form);
    attachSuggest(input);
    const hint = document.createElement("div");
    hint.className = "note";
    hint.textContent = "\u201CShow me this ball\u201D learns it before you bowl: hold it up to the camera, rotate it slowly for a few seconds, and it can name it from shot 1.";
    el.append(hint);
  }
  function renderLane() {
    const tracked = sessionShots().map((x) => ({ a: x.a, ballId: x.ballId }));
    const r = readLane(tracked);
    const el = $("lane-read");
    el.innerHTML = `<div class="lr-head">${esc(r.headline)}</div><span class="badge ${r.confidence}">${r.confidence} confidence \xB7 ${r.shotsUsed} shots</span><ul>${r.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><div class="lr-next">Next test: ${esc(r.next)}</div>`;
    const last = sessionShots().at(-1);
    const rec2 = recommendBall(r, last?.ballId, ownedBalls().map((b) => ({ id: b.id, name: b.name, catalog: b.specs })));
    const rc = document.createElement("div");
    rc.className = "lr-next rec";
    rc.innerHTML = `Equipment: ${esc(rec2.text)}${rec2.basis.map((l) => `<div class="u">${esc(l)}</div>`).join("")}`;
    el.append(rc);
  }
  var afterShot = [];
  var onAfterShot = (fn) => afterShot.push(fn);
  var beforeSave = [];
  var onBeforeSave = (fn) => beforeSave.push(fn);
  async function registerShot(s) {
    const arsenal = S.arsenal;
    const guess = s.sig ? classifyBall(s.sig, arsenal) : classifyBall([], []);
    guesses.set(s.id, guess);
    if (guess.auto) s.ballId = guess.ballId;
    for (const fn of beforeSave) {
      try {
        fn(s);
      } catch {
      }
    }
    await addShot(s);
    setCards(s);
    addHistory(s, sessionShots().length);
    renderResult(s);
    renderBall(s);
    renderLane();
    for (const fn of afterShot) {
      try {
        fn(s);
      } catch {
      }
    }
  }

  // camera/patchnotes.ts
  var KEY = "laneiq.notesSeen";
  var seen = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };
  var markSeen = () => {
    try {
      localStorage.setItem(KEY, LATEST_NOTE_ID);
    } catch {
    }
  };
  function initPatchNotes() {
    const box = document.getElementById("whatsnew");
    if (!box) return;
    const fresh2 = seen() !== LATEST_NOTE_ID;
    box.innerHTML = `<button class="chip" id="notes-open">${fresh2 ? "NEW \xB7 " : ""}What's new</button>`;
    document.getElementById("notes-open").onclick = () => {
      const sheet6 = document.getElementById("notes");
      sheet6.classList.add("on");
      sheet6.innerHTML = `<div class="row"><h2>Patch notes</h2><button class="btn ghost" id="notes-close">Close</button></div>${PATCH_NOTES.map((n) => `<div class="card"><div class="k">${esc(n.title)} <span class="note">${esc(n.date)}</span></div><ul>${n.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}`;
      document.getElementById("notes-close").onclick = () => (sheet6.classList.remove("on"), sheet6.innerHTML = "");
      markSeen();
      document.getElementById("notes-open").textContent = "What's new";
    };
  }

  // core/src/arrows.ts
  var LANE = [{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }];
  var at = (g, w, h, x, y) => {
    if (x < 1 || y < 1 || x >= w - 2 || y >= h - 2) return null;
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const i = y0 * w + x0;
    return g[i] * (1 - fx) * (1 - fy) + g[i + 1] * fx * (1 - fy) + g[i + w] * (1 - fx) * fy + g[i + w + 1] * fx * fy;
  };
  function readArrows(gray, w, h, corners2) {
    let H3;
    try {
      H3 = solveHomography(LANE, corners2);
    } catch {
      return [];
    }
    const P = (x, ft) => applyHomography(H3, { x, y: ft });
    const found = [];
    const search = (b, ftLo, ftHi, minC, sign2 = 0) => {
      const cx0 = LANE_BOARDS + 0.5 - b;
      let best = null;
      for (let dx = -0.7; dx <= 0.7; dx += 0.35)
        for (let ft = ftLo; ft <= ftHi; ft += 0.1) {
          const x = cx0 + dx;
          const ins = [];
          const out = [];
          let bad = false;
          for (const t of [-0.2, 0, 0.2]) {
            const a = P(x, ft + t), l = P(x - 1.7, ft + t), r = P(x + 1.7, ft + t);
            const va = at(gray, w, h, a.x, a.y), vl = at(gray, w, h, l.x, l.y), vr = at(gray, w, h, r.x, r.y);
            if (va === null || vl === null || vr === null) {
              bad = true;
              break;
            }
            ins.push(va);
            out.push(vl, vr);
          }
          if (bad) continue;
          const c = out.reduce((s, v) => s + v, 0) / out.length - ins.reduce((s, v) => s + v, 0) / ins.length;
          if (sign2 && Math.sign(c) !== sign2) continue;
          if (!best || Math.abs(c) > Math.abs(best.c)) best = { ft, x, c };
        }
      return best && Math.abs(best.c) >= minC ? { board: b, lane: { x: best.x, y: best.ft }, img: P(best.x, best.ft), contrast: best.c } : null;
    };
    for (let b = 5; b <= 35; b += 5) {
      const a = search(b, 10, 18, 14);
      if (a) found.push(a);
    }
    if (found.length < 4) return [];
    const dark = found.filter((a) => a.contrast > 0).length;
    const sign = dark >= found.length - dark ? 1 : -1;
    let ok = found.filter((a) => Math.sign(a.contrast) === sign);
    const fit = (pts) => {
      const bs = pts.map((a) => Math.abs(a.board - 20));
      const ys = pts.map((a) => a.lane.y);
      const n = pts.length, mb = bs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
      const sxx = bs.reduce((s, v) => s + (v - mb) ** 2, 0) || 1;
      const k2 = bs.reduce((s, v, i) => s + (v - mb) * (ys[i] - my), 0) / sxx;
      return { k: k2, a: my - k2 * mb, res: ys.map((y, i) => Math.abs(y - (my + k2 * (bs[i] - mb)))) };
    };
    for (let round = 0; round < 3 && ok.length >= 4; round++) {
      const f = fit(ok);
      const worst = Math.max(...f.res);
      if (worst <= 0.6) break;
      ok = ok.filter((_, i) => f.res[i] < worst);
    }
    if (ok.length < 4) return [];
    const f2 = fit(ok);
    for (let b = 5; b <= 35; b += 5) {
      if (ok.some((a2) => a2.board === b)) continue;
      const predicted = f2.a + f2.k * Math.abs(b - 20);
      const a = search(b, predicted - 0.7, predicted + 0.7, 7, sign);
      if (a) ok.push(a);
    }
    return ok.sort((p, q) => p.board - q.board);
  }

  // camera/lanetrace.ts
  var LANE2 = [{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }];
  var NAMES = ["1  foul line, left", "2  foul line, right", "3  pins end, right", "4  pins end, left"];
  var IN_PER_BOARD = 41.5 / LANE_BOARDS;
  var PIN_SIDE = 18 / IN_PER_BOARD;
  var MID = LANE_BOARDS / 2;
  var makeAnchors = () => [
    { id: "p7", group: "pins", name: "7 pin base", short: "7", lane: { x: MID - PIN_SIDE, y: LANE_LENGTH_FT + 31.2 / 12 }, img: null },
    { id: "p1", group: "pins", name: "head pin base", short: "1", lane: { x: MID, y: LANE_LENGTH_FT }, img: null },
    { id: "p10", group: "pins", name: "10 pin base", short: "10", lane: { x: MID + PIN_SIDE, y: LANE_LENGTH_FT + 31.2 / 12 }, img: null }
  ];
  function fitHomography(src, dst, sw, sh, wt) {
    const n = src.length;
    const N2 = Array.from({ length: 8 }, () => new Array(9).fill(0));
    for (let i = 0; i < n; i++) {
      const x = src[i].x / LANE_BOARDS, y = src[i].y / LANE_LENGTH_FT;
      const u = dst[i].x / sw, v = dst[i].y / sh;
      const q = wt?.[i] ?? 1;
      const rows2 = [
        [[x, y, 1, 0, 0, 0, -u * x, -u * y], u],
        [[0, 0, 0, x, y, 1, -v * x, -v * y], v]
      ];
      for (const [r, b] of rows2) for (let a = 0; a < 8; a++) {
        for (let c2 = 0; c2 < 8; c2++) N2[a][c2] += q * r[a] * r[c2];
        N2[a][8] += q * r[a] * b;
      }
    }
    for (let c2 = 0; c2 < 8; c2++) {
      let p = c2;
      for (let r = c2 + 1; r < 8; r++) if (Math.abs(N2[r][c2]) > Math.abs(N2[p][c2])) p = r;
      if (Math.abs(N2[p][c2]) < 1e-14) return null;
      [N2[c2], N2[p]] = [N2[p], N2[c2]];
      for (let r = 0; r < 8; r++) {
        if (r === c2) continue;
        const f = N2[r][c2] / N2[c2][c2];
        for (let k2 = c2; k2 < 9; k2++) N2[r][k2] -= f * N2[c2][k2];
      }
    }
    const h = N2.map((row, i) => row[8] / row[i]);
    return [h[0] * sw / LANE_BOARDS, h[1] * sw / LANE_LENGTH_FT, h[2] * sw, h[3] * sh / LANE_BOARDS, h[4] * sh / LANE_LENGTH_FT, h[5] * sh, h[6] / LANE_BOARDS, h[7] / LANE_LENGTH_FT, 1];
  }
  var inside = (p, c) => {
    let r = false;
    for (let i = 0, j = c.length - 1; i < c.length; j = i++) if (c[i].y > p.y !== c[j].y > p.y && p.x < (c[j].x - c[i].x) * (p.y - c[i].y) / (c[j].y - c[i].y) + c[i].x) r = !r;
    return r;
  };
  function openLaneTrace(o) {
    document.getElementById("tracelane")?.remove();
    const root = document.createElement("div");
    root.id = "tracelane";
    root.style.cssText = "position:fixed;inset:0;z-index:120;background:#000;display:flex;flex-direction:column;touch-action:none;user-select:none;-webkit-user-select:none;padding-top:env(safe-area-inset-top)";
    root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;color:#fff;font:700 16px system-ui"><span>Trace your lane</span><button id="tl-cancel" class="btn ghost" style="padding:8px 14px">Cancel</button></div>
    <div style="padding:0 12px 6px;color:#9fb0cc;font:13px system-ui;line-height:1.35" id="tl-hint">Drag the four numbered dots so the green lane sits on your lane. <b style="color:#fff">1 and 2</b> go on the foul line at the lane's edges (inside the gutters), <b style="color:#fff">3 and 4</b> where the lane reaches the pins. Drag inside the lane to move all of it. The yellow rings are the arrows the app found on your lane by itself.</div>
    <div id="tl-wrap" style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative"><canvas id="tl-cv" style="touch-action:none;max-width:100%;max-height:100%"></canvas></div>
    <div style="display:flex;gap:6px;padding:6px 12px 0"><button class="btn ghost tl-mode" data-mode="lane" style="flex:1;padding:9px 6px">1 Lane</button><button class="btn ghost tl-mode" data-mode="pins" style="flex:1;padding:9px 6px">2 Pins</button></div>
    <div style="display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom));flex-wrap:wrap"><button id="tl-snap" class="btn ghost" style="flex:1">Snap to edges</button><button id="tl-reset" class="btn ghost" style="flex:1">Reset</button><button id="tl-ok" class="btn" style="flex:2">Confirm lane</button></div>`;
    document.body.append(root);
    const cv = root.querySelector("#tl-cv");
    const hint = root.querySelector("#tl-hint");
    const g = cv.getContext("2d");
    const W2 = o.frame.width, Hh = o.frame.height;
    const k0 = Math.min(1, 1280 / Math.max(W2, Hh));
    cv.width = Math.round(W2 * k0);
    cv.height = Math.round(Hh * k0);
    const fit = () => {
      const wrap2 = root.querySelector("#tl-wrap");
      const maxW = wrap2.clientWidth, maxH = wrap2.clientHeight;
      const sc = Math.min(maxW / cv.width, maxH / cv.height);
      cv.style.width = `${cv.width * sc}px`;
      cv.style.height = `${cv.height * sc}px`;
    };
    fit();
    const onResize = () => (fit(), draw3());
    window.addEventListener("resize", onResize);
    let c = o.start.map((p) => ({ x: p.x * k0, y: p.y * k0 }));
    const initial = c.map((p) => ({ ...p }));
    let mode2 = "lane";
    let anchors = makeAnchors();
    const HINTS = {
      lane: "Drag the four numbered dots so the green lane sits on your lane. 1 and 2 go on the foul line at the lane's edges (inside the gutters), 3 and 4 where the lane reaches the pins. Drag inside the lane to move all of it.",
      pins: "Drag each white dot onto the base of the real pin it names: the head pin, then the 7 and the 10. The grid refits to them, so the pin deck lines up exactly."
    };
    let drag2 = null;
    let touched = false;
    let pointer = null;
    const cssPerPx = () => cv.getBoundingClientRect().width / cv.width;
    const pt2 = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * cv.width, y: (e.clientY - r.top) / r.height * cv.height };
    };
    const anchorPos = (a) => {
      if (a.img) return a.img;
      try {
        return applyHomography(solveHomography(LANE2, c), a.lane);
      } catch {
        return null;
      }
    };
    const refit = () => {
      const placed = anchors.filter((a) => a.img);
      if (!placed.length) return;
      const src = [...LANE2, ...placed.map((a) => a.lane)];
      const dst = [...c, ...placed.map((a) => a.img)];
      const wt = [1, 1, 1, 1, ...placed.map((a) => a.group === "arrows" ? 0.35 : 1)];
      const h = fitHomography(src, dst, cv.width, cv.height, wt);
      if (!h) return;
      const nc = LANE2.map((p) => applyHomography(h, p));
      if (nc.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) c = nc;
    };
    const setMode2 = (m) => {
      mode2 = m;
      hint.textContent = HINTS[m];
      root.querySelectorAll(".tl-mode").forEach((b) => {
        const on2 = b.dataset.mode === m;
        b.style.background = on2 ? "linear-gradient(90deg,#46e6ff,#ff4fd8)" : "";
        b.style.color = on2 ? "#06101c" : "";
      });
      redraw2();
    };
    let readNow = [];
    const grayCv = document.createElement("canvas");
    grayCv.width = cv.width;
    grayCv.height = cv.height;
    grayCv.getContext("2d").drawImage(o.frame, 0, 0, cv.width, cv.height);
    const grayPx = grayCv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data;
    const grayBuf = new Uint8ClampedArray(cv.width * cv.height);
    for (let i = 0; i < grayBuf.length; i++) grayBuf[i] = 0.299 * grayPx[i * 4] + 0.587 * grayPx[i * 4 + 1] + 0.114 * grayPx[i * 4 + 2];
    const reread = () => {
      readNow = readArrows(grayBuf, cv.width, cv.height, c).map((a) => a.img);
    };
    let raf3 = 0;
    const draw3 = () => {
      raf3 = 0;
      const px = 1 / cssPerPx();
      g.clearRect(0, 0, cv.width, cv.height);
      g.drawImage(o.frame, 0, 0, cv.width, cv.height);
      let Hinv2 = null;
      try {
        Hinv2 = solveHomography(LANE2, c);
      } catch {
      }
      const P = (b, ft) => applyHomography(Hinv2, { x: b, y: ft });
      g.beginPath();
      c.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
      g.closePath();
      g.fillStyle = "rgba(90,255,176,.10)";
      g.fill();
      if (Hinv2) {
        g.lineWidth = 1.2 * px;
        for (let b = 0; b <= LANE_BOARDS; b += 1) {
          const major = b % 5 === 0;
          g.strokeStyle = major ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.18)";
          const a = P(b, 0), z = P(b, LANE_LENGTH_FT);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(z.x, z.y);
          g.stroke();
        }
        g.setLineDash([8 * px, 6 * px]);
        g.strokeStyle = "rgba(255,255,255,.5)";
        for (const ft of [15, 30, 45]) {
          const a = P(0, ft), z = P(LANE_BOARDS, ft);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(z.x, z.y);
          g.stroke();
        }
        g.setLineDash([]);
        g.fillStyle = "rgba(255,255,255,.9)";
        const PINS2 = [[0, 0], [-6, 10.4], [6, 10.4], [-12, 20.8], [0, 20.8], [12, 20.8], [-18, 31.2], [-6, 31.2], [6, 31.2], [18, 31.2]];
        for (const [lat, beh] of PINS2) {
          const q = P(LANE_BOARDS / 2 + lat / (41.5 / LANE_BOARDS), LANE_LENGTH_FT + beh / 12);
          g.beginPath();
          g.arc(q.x, q.y, 3 * px, 0, 7);
          g.fill();
        }
        const f0 = P(0, 0), f12 = P(LANE_BOARDS, 0);
        g.strokeStyle = "rgba(255,90,110,1)";
        g.lineWidth = 3 * px;
        g.beginPath();
        g.moveTo(f0.x, f0.y);
        g.lineTo(f12.x, f12.y);
        g.stroke();
      }
      g.strokeStyle = "rgba(90,255,176,.95)";
      g.lineWidth = 3 * px;
      g.beginPath();
      c.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
      g.closePath();
      g.stroke();
      c.forEach((p, i) => {
        if (mode2 !== "lane") {
          g.fillStyle = "rgba(90,255,176,.9)";
          g.beginPath();
          g.arc(p.x, p.y, 5 * px, 0, 7);
          g.fill();
          return;
        }
        const r = (drag2 && drag2.kind === "handle" && drag2.i === i ? 26 : 22) * px;
        g.fillStyle = touched ? "rgba(90,255,176,1)" : "rgba(255,255,255,.96)";
        g.strokeStyle = "rgba(0,0,0,.85)";
        g.lineWidth = 3 * px;
        g.beginPath();
        g.arc(p.x, p.y, r, 0, 7);
        g.fill();
        g.stroke();
        g.fillStyle = "#06101c";
        g.font = `800 ${18 * px}px system-ui`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(String(i + 1), p.x, p.y + 1 * px);
      });
      for (const a of anchors) {
        const active = a.group === mode2;
        if (!active && !a.img) continue;
        const p = anchorPos(a);
        if (!p) continue;
        const col = a.group === "arrows" ? "255,210,90" : "120,225,255";
        const r = (active ? drag2 && drag2.kind === "anchor" && drag2.id === a.id ? 18 : 14 : 5) * px;
        g.fillStyle = `rgba(${col},${active ? a.img ? 1 : 0.55 : 0.9})`;
        g.strokeStyle = "rgba(0,0,0,.85)";
        g.lineWidth = 2.5 * px;
        g.beginPath();
        g.arc(p.x, p.y, r, 0, 7);
        g.fill();
        g.stroke();
        if (active) {
          g.fillStyle = "#06101c";
          g.font = `800 ${12 * px}px system-ui`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(a.short, p.x, p.y + 1 * px);
        }
      }
      for (const a of readNow) {
        g.strokeStyle = "rgba(255,210,90,.95)";
        g.lineWidth = 2 * px;
        g.beginPath();
        g.arc(a.x, a.y, 7 * px, 0, 7);
        g.stroke();
      }
      const dragA = drag2 && drag2.kind === "anchor" ? anchors.find((a) => a.id === drag2.id) : void 0;
      if (drag2 && (drag2.kind === "handle" || dragA) && pointer) {
        const p = drag2.kind === "handle" ? c[drag2.i] : anchorPos(dragA);
        const R2 = 62 * px, Z = 3;
        let cx = p.x, cy = p.y - 120 * px;
        if (cy - R2 < 0) cy = p.y + 120 * px;
        cx = Math.max(R2, Math.min(cv.width - R2, cx));
        g.save();
        g.beginPath();
        g.arc(cx, cy, R2, 0, 7);
        g.clip();
        g.fillStyle = "#000";
        g.fillRect(cx - R2, cy - R2, 2 * R2, 2 * R2);
        const sw = 2 * R2 / Z;
        g.drawImage(o.frame, p.x / k0 - sw / (2 * k0), p.y / k0 - sw / (2 * k0), sw / k0, sw / k0, cx - R2, cy - R2, 2 * R2, 2 * R2);
        g.restore();
        g.strokeStyle = "rgba(90,255,176,.95)";
        g.lineWidth = 2 * px;
        g.beginPath();
        g.arc(cx, cy, R2, 0, 7);
        g.stroke();
        g.strokeStyle = "rgba(255,255,255,.9)";
        g.lineWidth = 1.5 * px;
        g.beginPath();
        g.moveTo(cx - 14 * px, cy);
        g.lineTo(cx + 14 * px, cy);
        g.moveTo(cx, cy - 14 * px);
        g.lineTo(cx, cy + 14 * px);
        g.stroke();
        g.fillStyle = "#fff";
        g.font = `700 ${12 * px}px system-ui`;
        g.textBaseline = "alphabetic";
        g.fillText(drag2.kind === "handle" ? NAMES[drag2.i] : dragA.name, cx, cy - R2 - 6 * px);
      }
    };
    const redraw2 = () => {
      if (!raf3) raf3 = requestAnimationFrame(draw3);
    };
    reread();
    setMode2("lane");
    cv.addEventListener("pointerdown", (e) => {
      const p = pt2(e);
      pointer = p;
      const reach = 64 / cssPerPx();
      if (mode2 !== "lane") {
        const group = anchors.filter((a) => a.group === mode2);
        let best = null, bd2 = Infinity;
        for (const a of group) {
          const q = anchorPos(a);
          if (!q) continue;
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < bd2) bd2 = d, best = a;
        }
        if (best) {
          if (bd2 > reach) best.img = p;
          else best.img = best.img ?? anchorPos(best);
          drag2 = { kind: "anchor", id: best.id };
          touched = true;
          cv.setPointerCapture?.(e.pointerId);
          redraw2();
        }
        return;
      }
      anchors.forEach((a) => a.img = null);
      let bi = -1, bd = reach;
      c.forEach((q, i) => {
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bd) bd = d, bi = i;
      });
      if (bi >= 0) drag2 = { kind: "handle", i: bi };
      else if (inside(p, c)) drag2 = { kind: "all", last: p };
      else {
        let ni = 0, nd = Infinity;
        c.forEach((q, i) => {
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < nd) nd = d, ni = i;
        });
        c[ni] = p;
        drag2 = { kind: "handle", i: ni };
      }
      touched = true;
      cv.setPointerCapture?.(e.pointerId);
      redraw2();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag2) return;
      const p = pt2(e);
      pointer = p;
      if (drag2.kind === "anchor") {
        const a = anchors.find((q) => q.id === drag2.id);
        a.img = { x: Math.max(0, Math.min(cv.width, p.x)), y: Math.max(0, Math.min(cv.height, p.y)) };
      } else if (drag2.kind === "handle") c[drag2.i] = { x: Math.max(0, Math.min(cv.width, p.x)), y: Math.max(0, Math.min(cv.height, p.y)) };
      else {
        const dx = p.x - drag2.last.x, dy = p.y - drag2.last.y;
        c = c.map((q) => ({ x: q.x + dx, y: q.y + dy }));
        drag2.last = p;
      }
      redraw2();
    });
    const up = () => {
      if (drag2 && drag2.kind === "anchor") refit();
      if (drag2) reread();
      drag2 = null;
      pointer = null;
      redraw2();
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    const close7 = () => {
      cancelAnimationFrame(raf3);
      window.removeEventListener("resize", onResize);
      root.remove();
    };
    root.querySelector("#tl-cancel").onclick = () => (close7(), o.onCancel());
    root.querySelectorAll(".tl-mode").forEach((b) => b.onclick = () => setMode2(b.dataset.mode));
    root.querySelector("#tl-reset").onclick = () => (c = initial.map((p) => ({ ...p })), anchors = makeAnchors(), touched = false, setMode2("lane"));
    root.querySelector("#tl-snap").onclick = () => {
      const r = o.snap(c.map((p) => ({ x: p.x / k0, y: p.y / k0 })));
      if (!r) return void (hint.textContent = "I couldn't find clear lane edges there. Drag the corners onto the lane yourself, then Confirm.");
      c = r.map((p) => ({ x: p.x * k0, y: p.y * k0 }));
      anchors = makeAnchors();
      reread();
      touched = true;
      hint.textContent = "Snapped to the lane edges. If the grid lines up with the arrows and pins, Confirm; otherwise drag a dot to fix it.";
      redraw2();
    };
    root.querySelector("#tl-ok").onclick = () => {
      const area2 = Math.abs(c.reduce((a, p, i) => a + (p.x * c[(i + 1) % 4].y - c[(i + 1) % 4].x * p.y), 0)) / 2;
      if (area2 < cv.width * cv.height * 0.01) return void (hint.textContent = "The lane outline is too small. Drag the dots out onto the lane.");
      const out = c.map((p) => ({ x: p.x / k0, y: p.y / k0 }));
      close7();
      o.onConfirm(out);
    };
  }

  // core/src/lanevote.ts
  var area = (c) => Math.abs(c.reduce((a, p, i) => a + (p.x * c[(i + 1) % 4].y - c[(i + 1) % 4].x * p.y), 0)) / 2;
  var median = (a) => {
    const s = [...a].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  var LaneVoter = class {
    votes = [];
    scans = [];
    keepMs;
    minVotes;
    margin;
    constructor(keepMs = 14e3, minVotes = 4, margin = 1.8) {
      this.keepMs = keepMs;
      this.minVotes = minVotes;
      this.margin = margin;
    }
    reset() {
      this.votes = [];
      this.scans = [];
    }
    /** one scan of the picture: every solid candidate it found */
    add(cands, now) {
      this.scans.push(now);
      for (const d of cands) this.votes.push({ corners: d.corners.map((p) => ({ ...p })), t: now });
      const t0 = now - this.keepMs;
      this.votes = this.votes.filter((v) => v.t >= t0);
      this.scans = this.scans.filter((t) => t >= t0);
    }
    /** same lane: the foul line sits on about the same row, and the right edge on about the same line */
    same(a, b, w, h) {
      const dx = 0.05 * w, dy = 0.04 * h;
      return Math.abs(a[1].x - b[1].x) <= dx && Math.abs(a[2].x - b[2].x) <= dx && Math.abs((a[0].y + a[1].y) / 2 - (b[0].y + b[1].y) / 2) <= dy && Math.abs((a[2].y + a[3].y) / 2 - (b[2].y + b[3].y) / 2) <= dy * 2;
    }
    groups(w, h) {
      const gs = [];
      for (const v of this.votes) {
        const g = gs.find((g2) => this.same(g2[0].corners, v.corners, w, h));
        if (g) g.push(v);
        else gs.push([v]);
      }
      return gs.map((g) => {
        const corners2 = [0, 1, 2, 3].map((i) => ({ x: median(g.map((v) => v.corners[i].x)), y: median(g.map((v) => v.corners[i].y)) }));
        const ar = area(corners2);
        const fy = g.map((v) => (v.corners[2].y + v.corners[3].y) / 2);
        const fm = median(fy);
        return { votes: g.length, corners: corners2, share: g.length / Math.max(1, this.scans.length), area: ar, score: g.length * ar, farSpread: median(fy.map((y) => Math.abs(y - fm))) };
      }).sort((a, b) => b.score - a.score);
    }
    /** lock: the lane to take (or null yet); choices: more than one lane keeps turning up and the bowler should say which */
    result(w, h) {
      const gs = this.groups(w, h);
      if (!gs.length) return { lock: null, choices: [], top: 0 };
      const [a, b] = gs;
      if (a.votes >= this.minVotes && this.scans.length >= 4 && this.scans[this.scans.length - 1] - this.scans[0] >= 3e3 && a.share >= 0.6 && a.farSpread <= 0.02 * h && (!b || a.score >= this.margin * b.score)) return { lock: a.corners, choices: [], top: a.votes };
      if (a.votes >= this.minVotes && (!b || a.score >= this.margin * b.score)) return { lock: null, choices: [], top: a.votes };
      const real = gs.filter((g) => g.votes >= this.minVotes);
      return { lock: null, choices: real.length > 1 ? real.slice(0, 3).map((g) => g.corners) : [], top: a.votes };
    }
  };

  // core/src/patterns.ts
  function lengthClass(lengthFt) {
    return lengthFt <= 37 ? "short" : lengthFt <= 41 ? "medium" : "long";
  }
  var SPORT_RATIO_LIMIT = 3;
  var isSportRatio = (ratio) => ratio <= SPORT_RATIO_LIMIT;
  function customPattern(lengthFt, volumeMl, ratio, name = "Custom pattern") {
    return { key: name.toLowerCase(), name, series: "custom", lengthFt, volumeMl, ratio, source: { kind: "user", url: "entered by bowler", retrievedOn: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) } };
  }

  // core/src/arsenal.ts
  function patternDemand(p, b) {
    const reasons = [];
    let t = 0;
    const L2 = (p.lengthFt - 39) * 0.2;
    t += L2;
    reasons.push(`${p.lengthFt} ft is a ${lengthClass(p.lengthFt)} pattern, which ${L2 > 0.05 ? "asks for a ball that reads sooner" : L2 < -0.05 ? "asks for a cleaner, later-reading ball" : "sits in the middle"}.`);
    if (p.volumeMl !== void 0) {
      const v = (p.volumeMl - 24) * 0.04;
      t += v;
      reasons.push(`${p.volumeMl} mL of oil is ${v > 0.05 ? "on the heavy side, so more traction helps" : v < -0.05 ? "on the light side, so a smoother ball holds its energy" : "about average"}.`);
    }
    if (p.ratio !== void 0 && p.ratio >= 6) {
      t += 0.15;
      reasons.push(`A ${p.ratio}:1 ratio is a forgiving house-style shape, so a stronger ball can still be controlled.`);
    } else if (p.ratio !== void 0 && p.ratio <= 2) {
      reasons.push(`A ${p.ratio}:1 ratio is flat and punishing, so choose control over raw hook.`);
    }
    if (b.launchSpeed !== void 0) {
      const s = (b.launchSpeed - 17) * 0.1;
      t += s;
      reasons.push(`Your measured speed of ${b.launchSpeed.toFixed(1)} mph ${s > 0.05 ? "is quick, so you need a ball that grabs sooner" : s < -0.05 ? "is moderate, so you hook easily and want a cleaner ball" : "is typical"}.`);
    }
    if (b.entryAngle !== void 0) {
      const a = b.entryAngle < 3 ? 0.25 : b.entryAngle > 6.5 ? -0.25 : 0;
      t += a;
      if (a) reasons.push(`Your entry angle averages ${b.entryAngle.toFixed(1)}\xB0, so ${a > 0 ? "more hook would help" : "you can afford less hook"}.`);
    }
    if (b.revRpm !== void 0) {
      const r = -((b.revRpm - 400) / 800) * 0.7;
      t += r;
      reasons.push(`${b.revRpm} RPM${b.revSource === "entered" ? "" : b.revSource === "measured" ? " (measured from your release video)" : b.revSource === "tier" ? " (estimated from the band you picked)" : " (assumed typical for your style)"} ${r < -0.03 ? "is high, so a cleaner ball keeps it from overreacting" : r > 0.03 ? "is low, so a stronger ball gives you the hook" : "is typical"}.`);
    }
    if (b.axisRotation !== void 0) {
      const a = -((b.axisRotation - 45) / 45) * 0.25;
      t += a;
      if (Math.abs(a) > 0.04) reasons.push(`Axis rotation of ${Math.round(b.axisRotation)}\xB0 means ${a < 0 ? "a lot of side roll, which tends to make a ball flare and read the lane sooner, so a cleaner ball keeps it from overreacting" : "mostly forward roll, which tends to read the lane later, so a stronger ball helps it get going"}.`);
    }
    if (b.axisTilt !== void 0) {
      const a = -((b.axisTilt - 12) / 12) * 0.1;
      t += a;
      if (Math.abs(a) > 0.04) reasons.push(`Axis tilt of ${Math.round(b.axisTilt)}\xB0 is ${a < 0 ? "high, adding to the side roll" : "low, so the ball stays closer to a forward roll"}.`);
    }
    return { target: t, reasons };
  }
  var BAND = 0.3;
  var isSpareBall = (b) => b.coverstockType?.value === "plastic" || /\bspare\b/i.test(b.name);
  function closest(balls, want, exclude) {
    const pool = balls.filter((x) => !exclude.has(x.b.id));
    return pool.sort((a, c) => Math.abs(a.m - want) - Math.abs(c.m - want))[0];
  }
  function observedLine(b) {
    const o = b.observed;
    if (!o || o.shots < 8) return "";
    const bits = [];
    if (o.entryAngle !== void 0) bits.push(`${o.entryAngle.toFixed(1)}\xB0 entry`);
    if (o.breakpointFt !== void 0) bits.push(`breakpoint at ${o.breakpointFt.toFixed(0)} ft`);
    if (o.pocketPct !== void 0) bits.push(`${Math.round(o.pocketPct)}% pocket`);
    if (o.strikePct !== void 0) bits.push(`${Math.round(o.strikePct)}% strikes`);
    return bits.length ? ` Measured over ${o.shots} of your shots: ${bits.join(", ")}.` : "";
  }
  function buildLineup(pattern, bowler, arsenal) {
    const { target, reasons } = patternDemand(pattern, bowler);
    const scored = arsenal.map((b) => ({ b, m: b.specs ? motionIndex(b.specs) : null })).filter((x) => x.m !== null);
    const caveats = [
      "Spec-based estimates from published RG, differential and cover type, not a measurement of how each ball reacts for you.",
      bowler.revRpm === void 0 ? "Rev rate isn't measured or entered, so the recommendation can't account for it." : bowler.revSource === "entered" || bowler.revSource === "measured" ? `Rev rate is the number you ${bowler.revSource === "measured" ? "measured" : "entered"}.` : "Rev rate is an estimate from your quiz answers, not a measurement. Enter your real number under Me for better picks."
    ];
    const gaps = [];
    const unmatched = arsenal.length - scored.length;
    if (unmatched > 0) caveats.push(`${unmatched} of your balls have no RG/differential on file, so they were left out. Add their specs to include them.`);
    if (scored.length === 0) return { target, reasons, slots: [], gaps: ["Add at least one ball with RG and differential to build a lineup."], caveats };
    const used = /* @__PURE__ */ new Set();
    const slots = [];
    const mk = (role, want) => {
      const pick = closest(scored, want, used);
      if (!pick) {
        slots.push({ role, ball: null, index: null, fit: "gap", why: "You don't own enough balls to fill this role." });
        return;
      }
      const off = Math.abs(pick.m - want);
      const fit = off <= BAND ? "good" : off <= BAND * 2 ? "stretch" : "gap";
      if (fit === "gap") {
        slots.push({ role, ball: null, closest: pick.b, index: pick.m, fit, why: `Nothing you own suits this role. The closest is ${pick.b.name} (motion index ${pick.m.toFixed(2)}), which is ${pick.m > want ? "stronger" : "cleaner"} than the ${want.toFixed(2)} this role wants.` });
        gaps.push(`For "${role}" you'd want a ball with a motion index near ${want.toFixed(2)} (${want > pick.m ? "stronger" : "cleaner"} than ${pick.b.name}).`);
        return;
      }
      used.add(pick.b.id);
      slots.push({
        role,
        ball: pick.b,
        index: pick.m,
        fit,
        why: `${pick.b.name} (motion index ${pick.m.toFixed(2)}) vs the ${want.toFixed(2)} this role wants: ${fit === "good" ? "a close match" : fit === "stretch" ? "workable but not ideal" : "a poor match"}.${observedLine(pick.b)}`
      });
    };
    mk("start", target);
    mk("when it hooks early", target - 0.35);
    mk("when it skids or carries down", target + 0.35);
    return { target, reasons, slots, gaps, caveats };
  }
  var canSuggest = (c, f) => f?.includeOlder || recommendable(c, f?.now);
  function gapFillers(catalog, ownedKeys, want, limit = 3, filter) {
    return catalog.filter((c) => !ownedKeys.has(c.key) && !isSpareBall(c) && canSuggest(c, filter)).map((ball) => ({ ball, index: motionIndex(ball) })).filter((x) => x.index !== null && Math.abs(x.index - want) <= BAND).sort((a, b) => Math.abs(a.index - want) - Math.abs(b.index - want)).slice(0, limit);
  }
  function rankCatalog(catalog, ownedKeys, want, limit = 8, perBrand = 2, filter) {
    const scored = catalog.filter((c) => !ownedKeys.has(c.key) && !isSpareBall(c) && canSuggest(c, filter)).map((ball) => ({ ball, index: motionIndex(ball) })).filter((x) => x.index !== null).map((x) => ({ ...x, off: Math.abs(x.index - want) })).sort((a, b) => a.off - b.off);
    const count = /* @__PURE__ */ new Map();
    const out = [];
    for (const c of scored) {
      const n = count.get(c.ball.manufacturer) ?? 0;
      if (n >= perBrand) continue;
      count.set(c.ball.manufacturer, n + 1);
      out.push(c);
      if (out.length >= limit) break;
    }
    return out;
  }
  function upcomingForBowler(catalog, ownedKeys, targets, limit = 5, now = /* @__PURE__ */ new Date()) {
    const fresh2 = catalog.filter((c) => !ownedKeys.has(c.key) && !isSpareBall(c) && isUpcoming(c, now) && (!c.competition || c.competition.value === "approved"));
    const withSpecs = [];
    const noSpecs = [];
    for (const ball of fresh2) {
      const index = motionIndex(ball);
      if (index === null) {
        noSpecs.push({ ball, index: null, off: null, why: "Specs aren't published yet. Worth a look once they are." });
        continue;
      }
      const best = targets.map((t) => ({ t, off: Math.abs(index - t.target) })).sort((a, b) => a.off - b.off)[0];
      if (best && best.off <= 0.35) withSpecs.push({ ball, index, off: best.off, why: `Its published specs (motion index ${index.toFixed(2)}) land near what you need for ${best.t.label}.` });
    }
    withSpecs.sort((a, b) => (a.off ?? 9) - (b.off ?? 9));
    const date = (p) => p.ball.availableOn?.value ?? "9999";
    noSpecs.sort((a, b) => date(a).localeCompare(date(b)));
    return [...withSpecs, ...noSpecs].slice(0, limit);
  }

  // camera/health.ts
  var KEY2 = "laneiq.locklog";
  var MAX = 120;
  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY2) ?? "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  function write(v) {
    try {
      localStorage.setItem(KEY2, JSON.stringify(v.slice(-MAX)));
    } catch {
    }
  }
  function logLock(e) {
    write([...read(), { at: Date.now(), ...e }]);
  }
  function markRedone() {
    const v = read();
    const last = v[v.length - 1];
    if (last && Date.now() - last.at < 12e4 && !last.redone) {
      last.redone = true;
      write(v);
    }
  }
  function healthSummary() {
    const v = read().filter((e) => !/saved setup/.test(e.how));
    const auto = v.filter((e) => /automatic|picked/.test(e.how));
    const secs = auto.map((e) => e.secs).filter((x) => x !== null).sort((a, b) => a - b);
    const redone = v.filter((e) => e.redone).length;
    const taps = v.filter((e) => /one tap/.test(e.how)).length;
    const manual = v.filter((e) => e.how === "manual").length;
    const lines = [];
    if (!v.length) lines.push("No lane locks yet. Start the camera on the Live tab and this fills in.");
    else {
      lines.push(`${auto.length} of ${v.length} locks were automatic${taps ? `, ${taps} needed a tap` : ""}${manual ? `, ${manual} were placed by hand` : ""}.`);
      if (secs.length) lines.push(`Typical time to lock: ${secs[Math.floor(secs.length / 2)].toFixed(0)} s.`);
      if (redone) lines.push(`${redone} lock${redone === 1 ? " was" : "s were"} redone within two minutes, which usually means it was off.`);
      if (manual + taps > auto.length) lines.push("Automatic lock is struggling here. Try the setup tips (the ? on the Live tab), and use Save frame so the detector can be improved from real pictures.");
    }
    return { locks: v.length, automatic: auto.length, redone, medianSecs: secs.length ? secs[Math.floor(secs.length / 2)] : null, taps, manual, lines };
  }
  var TKEY = "laneiq.tracklog";
  var TMAX = 90;
  function logTrack(kind2, data = {}) {
    try {
      const v = JSON.parse(localStorage.getItem(TKEY) ?? "[]");
      const a = Array.isArray(v) ? v : [];
      a.push({ at: Date.now(), kind: kind2, ...data });
      localStorage.setItem(TKEY, JSON.stringify(a.slice(-TMAX)));
    } catch {
    }
  }
  function readTrack() {
    try {
      const v = JSON.parse(localStorage.getItem(TKEY) ?? "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  function diagnosticsText() {
    return JSON.stringify({ app: "LaneIQ", at: (/* @__PURE__ */ new Date()).toISOString(), version: runningVersion(), summary: healthSummary(), tracking: readTrack(), locks: read().slice(-40) }, null, 1);
  }
  function runningVersion() {
    const s = Array.from(document.scripts).map((x) => x.src).find((x) => /camera\.js\?v=/.test(x));
    return s ? s.split("?v=")[1] ?? null : null;
  }
  function watchForUpdates(show, idle = () => false) {
    const mine = runningVersion();
    if (!mine) return;
    let shown = false;
    const check = async () => {
      if (shown || !navigator.onLine) return;
      try {
        const r = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const v = await r.json();
        if (v.version && v.version !== mine) {
          let tried = "";
          try {
            tried = sessionStorage.getItem("laneiq.autoUpdated") ?? "";
          } catch {
          }
          if (idle() && tried !== v.version) {
            try {
              sessionStorage.setItem("laneiq.autoUpdated", v.version);
            } catch {
            }
            location.reload();
            return;
          }
          shown = true;
          show("A newer version of LaneIQ is ready.", () => location.reload());
        }
      } catch {
      }
    };
    setTimeout(check, 4e3);
    setInterval(check, 10 * 6e4);
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
  }

  // core/src/optimizer.ts
  var typical = (name, lengthFt, volumeMl, ratio) => ({
    key: name.toLowerCase(),
    name,
    series: "typical condition",
    lengthFt,
    volumeMl,
    ratio,
    source: { kind: "user", url: "typical condition used by the optimizer", retrievedOn: "2026-10-19" }
  });
  var SCENARIOS = [
    { id: "heavy", blurb: "fresh, heavy oil", pattern: typical("Heavy oil, fresh house shot", 42, 28, 8) },
    { id: "house", blurb: "an ordinary league night", pattern: typical("Typical house shot", 40, 24, 6) },
    { id: "burned", blurb: "lanes that have dried up", pattern: typical("Dry, burned-up lanes", 38, 19, 4) },
    { id: "short", blurb: "short sport pattern", pattern: typical("Short sport pattern", 35, 22, 1.8) },
    { id: "long", blurb: "long sport pattern", pattern: typical("Long sport pattern", 46, 27, 2) }
  ];
  var COVERED = 0.3;
  var STRETCH = 0.6;
  function optimizeArsenal(input) {
    const { bowler, owned, catalog, ownedKeys, tonight } = input;
    const withIndex = owned.filter((b) => b.specs && !isSpareBall(b.specs)).map((b) => ({ ball: b, index: motionIndex(b.specs) })).filter((x) => x.index !== null);
    const notes = [
      "Spec-based: published RG, differential and cover type, adjusted for your speed, entry angle, rev rate and axis where known. It says which ball should read the lane the way you need; it can't promise how a ball will react on your hand."
    ];
    if (bowler.revSource !== "entered" && bowler.revSource !== "measured") notes.push("Rev rate is an estimate, not a measurement. Enter your real number on the Me tab to sharpen every pick.");
    const missing = owned.length - owned.filter((b) => b.specs).length;
    if (missing > 0) notes.push(`${missing} of your balls have no specs on file and were left out. Add their RG and differential to include them.`);
    const scenarioList = [...SCENARIOS.map((s) => ({ id: s.id, blurb: s.blurb, pattern: s.pattern })), ...tonight ? [{ id: "tonight", blurb: "the pattern chosen on this screen", pattern: tonight }] : []];
    const profile = patternDemand(SCENARIOS[1].pattern, bowler).reasons.filter((r) => !/^(\d+(\.\d+)?) ft is a/.test(r) && !/mL of oil/.test(r));
    const scenarios = scenarioList.map((s) => {
      const target = patternDemand(s.pattern, bowler).target;
      const best = withIndex.map((x) => ({ ball: x.ball, index: x.index, off: Math.abs(x.index - target) })).sort((a, b) => a.off - b.off)[0] ?? null;
      return { id: s.id, name: s.pattern.name, blurb: s.blurb, target, best, status: !best ? "gap" : best.off <= COVERED ? "covered" : best.off <= STRETCH ? "stretch" : "gap" };
    });
    const overlaps = [];
    for (let i = 0; i < withIndex.length; i++)
      for (let j = i + 1; j < withIndex.length; j++) {
        const a = withIndex[i], b = withIndex[j];
        if (Math.abs(a.index - b.index) < 0.1 && a.ball.specs.coverstockType?.value === b.ball.specs.coverstockType?.value)
          overlaps.push(`${a.ball.name} and ${b.ball.name} are nearly the same ball on paper (motion index ${a.index.toFixed(2)} and ${b.index.toFixed(2)}, both ${a.ball.specs.coverstockType?.value ?? "similar cover"}). A third ball that is different would add more than a repeat.`);
      }
    const hasSpare = owned.some((b) => b.specs && isSpareBall(b.specs));
    const spares = catalog.filter((c) => isSpareBall(c) && !ownedKeys.has(c.key) && c.rg && c.status?.value === "current").slice(0, 3);
    const bad = scenarios.filter((s) => s.status !== "covered").sort((a, b) => (b.best?.off ?? 9) - (a.best?.off ?? 9));
    const buys = [];
    for (const s of bad) {
      const near = buys.find((b) => Math.abs(b.target - s.target) < 0.25);
      if (near) {
        near.fixes.push(s.name);
        continue;
      }
      if (buys.length >= 3) break;
      const picks = rankCatalog(catalog, ownedKeys, s.target, 3, 1);
      if (!picks.length) continue;
      buys.push({ fixes: [s.name], target: s.target, direction: !s.best || s.target > s.best.index ? "stronger" : "cleaner", picks });
    }
    for (const x of withIndex) {
      const o = x.ball.observed;
      if (!o || o.shots < 8 || o.entryAngle === void 0) continue;
      if (o.entryAngle < 3) notes.push(`${x.ball.name}: measured entry angle is only ${o.entryAngle.toFixed(1)}\xB0 over ${o.shots} shots, so it may not be giving you enough angle for the pocket.`);
      else if (o.entryAngle > 7.5) notes.push(`${x.ball.name}: measured entry angle is ${o.entryAngle.toFixed(1)}\xB0 over ${o.shots} shots, which is a lot. It may be more ball than you need on those lanes.`);
    }
    const types = new Set(withIndex.map((x) => x.ball.specs.coverstockType?.value).filter(Boolean));
    if (withIndex.length >= 3 && types.size === 1) notes.push(`All your strike balls share one cover type (${[...types][0]}). Mixing a solid, a pearl and a hybrid gives you different shapes of motion, not just different strengths.`);
    let score = null;
    if (withIndex.length) {
      score = 100;
      for (const s of scenarios) score -= s.status === "gap" ? 14 : s.status === "stretch" ? 5 : 0;
      score -= Math.min(3, overlaps.length) * 4;
      if (!hasSpare) score -= 8;
      if (withIndex.length < 3) score -= 10;
      score = Math.max(0, Math.round(score));
    }
    if (withIndex.length < 3 && withIndex.length > 0) notes.push(`You have ${withIndex.length} strike ball${withIndex.length === 1 ? "" : "s"} with specs. Most league bowlers cover a season with three to five different ones.`);
    return { score, scenarios, overlaps, spare: { has: hasSpare, picks: spares }, buys, profile, notes };
  }

  // core/src/layoutgeo.ts
  var CIRC = 27;
  var R = CIRC / (2 * Math.PI);
  var QUARTER = CIRC / 4;
  var dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  var sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var scale = (a, k2) => [a[0] * k2, a[1] * k2, a[2] * k2];
  var norm2 = (a) => Math.hypot(a[0], a[1], a[2]);
  var unit = (a) => {
    const n = norm2(a) || 1;
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  var clamp = (x, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
  var rad = (d) => d * Math.PI / 180;
  var deg = (r) => r * 180 / Math.PI;
  var surfDist = (a, b) => R * Math.acos(clamp(dot(unit(a), unit(b))));
  function tangentToward(p, q) {
    const t = sub(q, scale(p, dot(q, p)));
    return unit(norm2(t) < 1e-9 ? orthogonal(p) : t);
  }
  function orthogonal(p) {
    return unit(Math.abs(p[0]) < 0.9 ? cross(p, [1, 0, 0]) : cross(p, [0, 1, 0]));
  }
  function walk(p, dir, dist2) {
    const a = dist2 / R;
    return unit(add(scale(p, Math.cos(a)), scale(dir, Math.sin(a))));
  }
  function rotate(v, axis, ang2) {
    const c = Math.cos(ang2), s = Math.sin(ang2);
    return add(add(scale(v, c), scale(cross(axis, v), s)), scale(axis, dot(axis, v) * (1 - c)));
  }
  var DEFAULT_GRIP = { span: 4.25, thumbDia: 1.05, fingerDia: 0.9, bridge: 0.25 };
  var N = [0, 0, 1];
  var UP = [0, 1, 0];
  function gripFrame(grip, hand3) {
    const hs = hand3 === "R" ? 1 : -1;
    const thumbR = grip.thumbDia / 2, fingerR = grip.fingerDia / 2;
    const c2c = grip.noThumb ? 0 : grip.span + thumbR + fingerR;
    const half = c2c / 2;
    const fingers = walk(N, UP, half);
    const thumb = grip.noThumb ? null : walk(N, scale(UP, -1), half);
    const side = [hs, 0, 0];
    const lateral = (grip.bridge + grip.fingerDia) / 2;
    const sideAt = (p, sgn) => walk(p, unit(sub(side, scale(p, dot(side, p)))), sgn * lateral);
    return { hs, fingers, thumb, middle: sideAt(fingers, -1), ring: sideAt(fingers, 1) };
  }
  function papPoint(pap, hs) {
    const q = walk(N, UP, pap.up);
    const side = [hs, 0, 0];
    const p = walk(q, unit(sub(side, scale(q, dot(side, q)))), pap.over);
    const toQ = Math.abs(pap.over) < 1e-6 ? unit(sub([-hs, 0, 0], scale(p, dot([-hs, 0, 0], p)))) : tangentToward(p, q);
    let v = unit(cross(p, toQ));
    if (v[1] < 0) v = scale(v, -1);
    return { pap: p, q, valUp: v };
  }
  var ang = (inch3) => inch3 / R;
  function solveLayout(input, pap, hand3, grip = DEFAULT_GRIP, flip = false) {
    const problems = [];
    const { hs, fingers, thumb, middle, ring } = gripFrame(grip, hand3);
    const { pap: P, q, valUp } = papPoint(pap, hs);
    const toMid = Math.abs(pap.over) < 1e-6 ? unit(sub([-hs, 0, 0], scale(P, dot([-hs, 0, 0], P)))) : tangentToward(P, q);
    let a = 0;
    let drilling = 0;
    let pinDir = valUp;
    if (input.system === "dual") {
      a = input.pinToPap;
      drilling = input.drilling;
      const phi = rad(clamp(input.valAngle, -180, 180));
      pinDir = unit(add(scale(valUp, Math.cos(phi)), scale(toMid, Math.sin(phi))));
    } else {
      a = input.pinToPap;
      const b = input.psaToPap;
      const cosd = Math.cos(ang(b)) / Math.sin(ang(a));
      if (Math.abs(cosd) > 1 + 1e-9) problems.push(a + b < QUARTER ? `Pin to PAP plus PSA to PAP must be at least ${QUARTER} inches (they are ${(a + b).toFixed(2)}).` : `PSA to PAP can differ from pin to PAP by at most ${QUARTER} inches.`);
      drilling = deg(Math.acos(clamp(cosd)));
      if (input.system === "pinbuffer") {
        const s = Math.sin(ang(input.pinBuffer)) / Math.sin(ang(a));
        if (Math.abs(s) > 1 + 1e-9) problems.push(`The pin buffer (${input.pinBuffer}") can't be larger than the pin to PAP distance (${a}"). A negative pin buffer puts the pin on the far side of the VAL.`);
        const phi = Math.asin(clamp(s));
        pinDir = unit(add(scale(valUp, Math.cos(phi)), scale(toMid, Math.sin(phi))));
      } else {
        const dPG = surfDist(P, N);
        const g = input.pinToGrip;
        const cosg = (Math.cos(ang(g)) - Math.cos(ang(dPG)) * Math.cos(ang(a))) / (Math.sin(ang(dPG)) * Math.sin(ang(a)) || 1e-9);
        if (Math.abs(cosg) > 1 + 1e-9) problems.push("No pin position gives that pin-to-grip distance with this PAP and pin-to-PAP. Change one of them.");
        const gamma = Math.acos(clamp(cosg));
        const toG = tangentToward(P, N);
        const d1 = rotate(toG, P, gamma), d2 = rotate(toG, P, -gamma);
        pinDir = dot(d1, valUp) >= dot(d2, valUp) ? d1 : d2;
      }
    }
    if (a <= 0) problems.push("Pin to PAP must be more than zero.");
    const pin = walk(P, pinDir, a);
    const toPap = tangentToward(pin, P);
    const mag = Math.abs(drilling);
    const c1 = rotate(toPap, pin, rad(mag));
    const c2 = rotate(toPap, pin, -rad(mag));
    const outward = (d) => hs * walk(pin, d, QUARTER)[0];
    let psaDir = outward(c1) >= outward(c2) ? c1 : c2;
    const swapped = drilling < 0 !== flip;
    if (swapped) psaDir = psaDir === c1 ? c2 : c1;
    const drillSigned = swapped ? -mag : mag;
    const psa = walk(pin, psaDir, QUARTER);
    const inter = unit(cross(pin, psa));
    const toPin = tangentToward(P, pin);
    const phiDeg = deg(Math.atan2(dot(toPin, toMid), dot(toPin, valUp)));
    const phiUsed = input.system === "dual" ? input.valAngle : phiDeg;
    const bufferIn = R * Math.asin(clamp(Math.sin(ang(a)) * Math.sin(rad(phiUsed))));
    const bToPap = surfDist(psa, P);
    const toGrip = surfDist(pin, N);
    const eq = {
      dual: { drilling: drillSigned, pinToPap: a, valAngle: phiUsed },
      pinbuffer: { pinToPap: a, psaToPap: bToPap, pinBuffer: bufferIn },
      ls2: { pinToPap: a, psaToPap: bToPap, pinToGrip: toGrip }
    };
    const pinUp = R * Math.asin(clamp(dot(pin, UP)));
    const pinOver = R * Math.asin(clamp(dot(pin, [hs, 0, 0]) / Math.max(1e-9, Math.cos(Math.asin(clamp(dot(pin, UP)))))));
    const fingerY = grip.noThumb ? 0 : (grip.span + grip.thumbDia / 2 + grip.fingerDia / 2) / 2;
    const pinPlacement = { up: pinUp, over: pinOver, label: classifyPin(pinUp, pinOver, fingerY, grip) };
    const points = { grip: N, pap: P, pin, psa, inter, valUp, q, thumb, middle, ring, fingers };
    return { ok: problems.length === 0, problems, points, eq, angleSum: Math.abs(drillSigned) + Math.abs(eq.dual.valAngle), pinPlacement, papToGrip: surfDist(P, N) };
  }
  function classifyPin(up, over, fingerY, grip) {
    const rel = up - fingerY;
    const where = rel > 1.25 ? "pin up: above the finger holes" : rel > 0.25 ? "pin just above the fingers" : rel > -0.9 ? "pin near the finger holes" : up > 0 ? "pin below the fingers, above the grip center" : up > -1 ? "pin near the grip center (the bridge to the thumb)" : grip.noThumb ? "pin down: below the grip" : "pin down: toward the thumb";
    return `${where} (${up >= 0 ? "+" : ""}${up.toFixed(1)}" along the grip, ${Math.abs(over).toFixed(1)}" ${over >= 0 ? "toward the PAP side" : "to the far side"})`;
  }
  function fractionInches(v) {
    const sixteenths = Math.round(v * 16);
    const whole = Math.trunc(sixteenths / 16);
    const rem = Math.abs(sixteenths % 16);
    if (rem === 0) return `${whole}"`;
    let n = rem, d = 16;
    while (n % 2 === 0) {
      n /= 2;
      d /= 2;
    }
    return `${whole === 0 && sixteenths < 0 ? "-" : ""}${whole !== 0 ? whole + " " : ""}${n}/${d}"`;
  }
  function transitionRead(sum, drilling, val2) {
    const out = [];
    out.push(sum < 70 ? "Quick transition: it turns skid into hook and roll early, so it reads the lane sooner." : sum < 110 ? "Medium transition: a balanced move from skid to hook to roll." : "Slow transition: it holds its energy longer and the move to roll comes late.");
    if (drilling - val2 > 20) out.push("A larger drilling angle than VAL angle points to a later, sharper breakpoint (more backend).");
    else if (val2 - drilling > 20) out.push("A smaller drilling angle than VAL angle points to a sooner, heavier roll (more midlane).");
    return out;
  }
  function measureLayout(pin, baseline, pap, hand3, grip = DEFAULT_GRIP) {
    const { hs } = gripFrame(grip, hand3);
    const { pap: P, q, valUp } = papPoint(pap, hs);
    const toMid = Math.abs(pap.over) < 1e-6 ? unit(sub([-hs, 0, 0], scale(P, dot([-hs, 0, 0], P)))) : tangentToward(P, q);
    const a = surfDist(pin, P);
    const toPin = tangentToward(P, pin);
    const valAngle = deg(Math.atan2(dot(toPin, toMid), dot(toPin, valUp)));
    const pinBuffer = R * Math.asin(clamp(Math.sin(ang(a)) * Math.sin(rad(valAngle))));
    const pinUp = R * Math.asin(clamp(dot(pin, UP)));
    const pinOver = R * Math.asin(clamp(dot(pin, [hs, 0, 0]) / Math.max(1e-9, Math.cos(Math.asin(clamp(dot(pin, UP)))))));
    const fingerY = grip.noThumb ? 0 : (grip.span + grip.thumbDia / 2 + grip.fingerDia / 2) / 2;
    let drilling = null;
    let psaToPap = null;
    let psa = null;
    if (baseline) {
      const toBase = tangentToward(pin, baseline);
      const toPap = tangentToward(pin, P);
      const angle = deg(Math.acos(clamp(dot(toBase, toPap))));
      psa = walk(pin, toBase, QUARTER);
      const mirrored = unit(sub(scale(toPap, 2 * dot(toBase, toPap)), toBase));
      const outward = (d) => hs * walk(pin, d, QUARTER)[0];
      drilling = outward(toBase) >= outward(mirrored) ? angle : -angle;
      psaToPap = surfDist(psa, P);
    }
    return { pinToPap: a, valAngle, pinBuffer, pinToGrip: surfDist(pin, N), papToGrip: surfDist(P, N), pinPlacement: { up: pinUp, over: pinOver, label: classifyPin(pinUp, pinOver, fingerY, grip) }, drilling, psaToPap, points: { pap: P, pin, psa, q, valUp } };
  }
  function measureMark(pin, mark, pap, hand3, grip = DEFAULT_GRIP) {
    const { hs } = gripFrame(grip, hand3);
    const { pap: P } = papPoint(pap, hs);
    const toPap = tangentToward(pin, P);
    const toMark = tangentToward(pin, mark);
    const angle = deg(Math.acos(clamp(dot(toPap, toMark))));
    const mirrored = unit(sub(scale(toPap, 2 * dot(toMark, toPap)), toMark));
    const outward = (d) => hs * walk(pin, d, QUARTER)[0];
    const upIn = R * Math.asin(clamp(dot(mark, UP)));
    const overIn = R * Math.asin(clamp(dot(mark, [hs, 0, 0]) / Math.max(1e-9, Math.cos(Math.asin(clamp(dot(mark, UP)))))));
    return { fromPin: surfDist(pin, mark), toPap: surfDist(mark, P), angleAtPin: outward(toMark) >= outward(mirrored) ? angle : -angle, up: upIn, over: overIn };
  }

  // core/src/flare.ts
  function deriv(w, i) {
    return [(i[1] - i[2]) * w[1] * w[2] / i[0], (i[2] - i[0]) * w[2] * w[0] / i[1], (i[0] - i[1]) * w[0] * w[1] / i[2]];
  }
  function simulateFlare(inp) {
    const { points, core } = inp;
    const rg1 = core.rg, rg2 = core.rg + Math.max(0, core.intDiff), rg3 = core.rg + Math.max(core.totalDiff, core.intDiff);
    const I = [rg1 * rg1, rg2 * rg2, rg3 * rg3];
    const notes = [];
    const speedFtS = inp.speedMph * 1.46667;
    const laneFt = inp.laneFt ?? 60;
    const T = laneFt / Math.max(1, speedFtS);
    const revPerSec = Math.max(1, inp.revRpm) / 60;
    const revs = revPerSec * T;
    const omega0 = 2 * Math.PI * revPerSec;
    const pap = unit(points.pap);
    let w = [dot(pap, points.pin) * omega0, dot(pap, points.inter) * omega0, dot(pap, points.psa) * omega0];
    const stepsPerRev = 90;
    const n = Math.max(10, Math.ceil(revs * stepsPerRev));
    const dt = T / n;
    const toBall = (v) => unit(add(add(scale(points.pin, v[0]), scale(points.inter, v[1])), scale(points.psa, v[2])));
    const path2 = [toBall(w)];
    const start = path2[0];
    const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    const marks = [0.25, 0.5, 0.75, 1].map((f) => Math.round(f * n));
    const checkpoints = [];
    let maxFromStart = 0;
    const samples = [start];
    for (let k2 = 1; k2 <= n; k2++) {
      const k1 = deriv(w, I);
      const k22 = deriv([w[0] + dt / 2 * k1[0], w[1] + dt / 2 * k1[1], w[2] + dt / 2 * k1[2]], I);
      const k3 = deriv([w[0] + dt / 2 * k22[0], w[1] + dt / 2 * k22[1], w[2] + dt / 2 * k22[2]], I);
      const k4 = deriv([w[0] + dt * k3[0], w[1] + dt * k3[1], w[2] + dt * k3[2]], I);
      w = [w[0] + dt / 6 * (k1[0] + 2 * k22[0] + 2 * k3[0] + k4[0]), w[1] + dt / 6 * (k1[1] + 2 * k22[1] + 2 * k3[1] + k4[1]), w[2] + dt / 6 * (k1[2] + 2 * k22[2] + 2 * k3[2] + k4[2])];
      const p = toBall(w);
      if (k2 % 3 === 0 || k2 === n) path2.push(p);
      samples.push(p);
      maxFromStart = Math.max(maxFromStart, angle(start, p));
      if (marks.includes(k2)) {
        let span2 = 0;
        for (let a = 0; a < samples.length; a += Math.max(1, Math.floor(samples.length / 60))) for (let b = a; b < samples.length; b += Math.max(1, Math.floor(samples.length / 60))) span2 = Math.max(span2, angle(samples[a], samples[b]));
        checkpoints.push({ ft: k2 / n * laneFt, revs: k2 / n * revs, axis: p, movedDeg: angle(start, p) * 180 / Math.PI, flareIn: R * span2 });
      }
    }
    const coarse = Math.max(1, Math.floor(samples.length / 160));
    let span = 0;
    for (let a = 0; a < samples.length; a += coarse) for (let b = a + coarse; b < samples.length; b += coarse) span = Math.max(span, angle(samples[a], samples[b]));
    const lowIdx = I[2] - I[0];
    const cycleRevs = lowIdx / I[0] < 4e-3 ? null : Math.round(I[0] / (I[2] - I[0]) / Math.max(0.2, Math.abs(dot(pap, points.psa))) * 10) / 10;
    if (core.totalDiff < 4e-3) notes.push("This core has almost no differential, so there is almost no wobble to make a track flare.");
    if (Math.abs(dot(pap, points.pin)) > 0.97 || Math.abs(dot(pap, points.psa)) > 0.97 || Math.abs(dot(pap, points.inter)) > 0.97) notes.push("The PAP sits almost on one of the ball's own axes, which is the most stable place to spin: very little flare.");
    notes.push("Friction and oil aren't included, so a real shot flares differently. Compare layouts with this, don't read it as a measurement.");
    const flare30In = checkpoints[1]?.flareIn ?? 0;
    const potential30In = inp.skipPotential ? flare30In : flarePotential(core, inp.revRpm, inp.speedMph);
    const usePct = potential30In > 0 ? Math.min(1, flare30In / potential30In) : 0;
    return { path: path2, checkpoints, revs, flareIn: R * span, spanDeg: span * 180 / Math.PI, cycleRevs, flare30In, potential30In, usePct, notes };
  }
  function trackRing(axis, samples = 72) {
    const a = unit(axis);
    const ref = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = unit([a[1] * ref[2] - a[2] * ref[1], a[2] * ref[0] - a[0] * ref[2], a[0] * ref[1] - a[1] * ref[0]]);
    const v = [a[1] * u[2] - a[2] * u[1], a[2] * u[0] - a[0] * u[2], a[0] * u[1] - a[1] * u[0]];
    return Array.from({ length: samples + 1 }, (_, i) => {
      const t = 2 * Math.PI * i / samples;
      return add(scale(u, Math.cos(t)), scale(v, Math.sin(t)));
    });
  }
  var potentialCache = /* @__PURE__ */ new Map();
  function flarePotential(core, revRpm, speedMph) {
    const key2 = [core.rg, core.totalDiff, core.intDiff, Math.round(revRpm / 10), Math.round(speedMph * 2)].join("|");
    const hit = potentialCache.get(key2);
    if (hit !== void 0) return hit;
    const axes = { pin: [1, 0, 0], inter: [0, 1, 0], psa: [0, 0, 1] };
    let best = 0;
    const N2 = 90;
    for (let i = 0; i < N2; i++) {
      const z = (i + 0.5) / N2, r = Math.sqrt(1 - z * z), a = i * Math.PI * (3 - Math.sqrt(5));
      const dir = [r * Math.cos(a), r * Math.sin(a), z];
      const f = simulateFlare({ points: { ...axes, pap: dir }, core, revRpm, speedMph, laneFt: 30, skipPotential: true });
      best = Math.max(best, f.checkpoints[f.checkpoints.length - 1]?.flareIn ?? 0);
    }
    potentialCache.set(key2, best);
    return best;
  }

  // core/src/proshop.ts
  function parseInches(text) {
    const t = text.trim().toLowerCase().replace(/["”]|in(ches)?\.?$/g, "").replace(/(\d)-(?=\d)/, "$1 ").trim();
    if (!t) return null;
    const m = /^(-?)(?:(\d+(?:\.\d+)?)\s+)?(?:(\d+)\s*\/\s*(\d+)|(\d+(?:\.\d+)?))$/.exec(t) ?? /^(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(t);
    if (!m) return null;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3] !== void 0 && m[4] !== void 0) {
      const d = Number(m[4]);
      if (!d) return null;
      return sign * ((m[2] ? Number(m[2]) : 0) + Number(m[3]) / d);
    }
    return m[5] !== void 0 ? sign * Number(m[5]) : null;
  }
  function parsePap(text) {
    const t = text.toLowerCase();
    const over = /([\d\s./-]+?)\s*(?:in(?:ches)?\s*)?over/.exec(t);
    const up = /([\d\s./-]+?)\s*(?:in(?:ches)?\s*)?(up|down)/.exec(t.replace(/.*over[,\s]*/, ""));
    if (!over) return null;
    const o = parseInches(over[1]);
    const u = up ? parseInches(up[1]) : 0;
    if (o === null || u === null) return null;
    return { over: o, up: up && up[2] === "down" ? -u : u };
  }
  function bowlerDominance(revRpm, speedMph) {
    if (!revRpm || !speedMph) return "balanced";
    const r = revRpm / speedMph;
    return r >= 26 ? "rev" : r <= 20 ? "speed" : "balanced";
  }
  function suggestDualAngle(b, pattern, ballTotalDiff) {
    const why = [];
    const dom = bowlerDominance(b.revRpm, b.launchSpeed);
    let sum = dom === "speed" ? 75 : dom === "rev" ? 130 : 100;
    why.push(dom === "speed" ? "You're speed-dominant, so a smaller angle sum turns your speed into rotation sooner." : dom === "rev" ? "You're rev-dominant, so a larger angle sum keeps the ball from reading too early." : "Your speed and revs are balanced, so a medium angle sum fits.");
    if (b.axisTilt !== void 0) {
      const d = b.axisTilt >= 16 ? -10 : b.axisTilt <= 8 ? 10 : 0;
      sum += d;
      if (d) why.push(b.axisTilt >= 16 ? "Your axis tilt is high, which points to a smaller sum." : "Your axis tilt is low, which points to a larger sum.");
    }
    let useFlare = 0.5;
    if (pattern) {
      if (pattern.lengthFt >= 42) {
        sum -= 15;
        useFlare += 0.15;
        why.push(`${pattern.lengthFt} ft is a long pattern: a smaller sum and more flare to get the ball reading.`);
      } else if (pattern.lengthFt <= 37) {
        sum += 15;
        useFlare -= 0.15;
        why.push(`${pattern.lengthFt} ft is short: a larger sum and less flare keep it from hooking early.`);
      }
      if (pattern.volumeMl !== void 0) {
        const vd = pattern.volumeMl >= 26 ? 1 : pattern.volumeMl <= 22 ? -1 : 0;
        sum -= 8 * vd;
        useFlare += 0.1 * vd;
        if (vd) why.push(vd > 0 ? "A lot of oil: friction is what you need, so more flare and a smaller sum." : "Not much oil: less flare and a larger sum.");
      }
    }
    if (dom === "rev") useFlare -= 0.1;
    if (dom === "speed") useFlare += 0.1;
    sum = Math.max(30, Math.min(160, Math.round(sum / 5) * 5));
    const valAngle = Math.max(20, Math.min(70, Math.round(sum * 0.45 / 5) * 5));
    const drilling = Math.max(10, Math.min(90, sum - valAngle));
    useFlare = Math.max(0.1, Math.min(0.95, useFlare));
    const pinToPap = Math.round((2.5 + useFlare * 3.25) * 8) / 8;
    if (ballTotalDiff !== void 0 && ballTotalDiff >= 0.055) why.push("This ball has a high differential already, so there is room to use less of its flare potential if it reads too early.");
    return { drilling, pinToPap, valAngle, sumRange: [Math.max(30, sum - 15), Math.min(160, sum + 15)], why };
  }
  function buildPlaybook(p) {
    const dom = bowlerDominance(p.revRpm, p.speedMph);
    const sections = [];
    const styleName = p.style === "two-handed" ? "two-handed" : p.style === "one-hand-no-thumb" ? "one-handed, no thumb" : "one-handed with a thumb";
    const know = [];
    know.push(`Tell them you're ${styleName} and bowl ${p.hand === "R" ? "right" : "left"}-handed. It changes how the grip is cut${p.style === "two-handed" ? " (no thumb hole, and the fingers and the grip are set for a two-handed release)" : p.style === "one-hand-no-thumb" ? " (no thumb hole: the bridge sets the span instead)" : ""}.`);
    know.push(p.revRpm ? `Your rev rate: ${p.revRpm} RPM${p.revSource === "measured" || p.revSource === "entered" ? "" : " (an estimate from your quiz answers, not a measurement)"}.${p.revSource === "measured" || p.revSource === "entered" ? "" : " Ask for it to be measured, or enter your real number in the app."}` : "Your rev rate isn't known. Ask them to measure it: it drives almost every choice.");
    know.push(p.speedMph ? `Your ball speed: about ${p.speedMph.toFixed(1)} mph, measured by the camera.` : "Your ball speed isn't known yet. Use the camera for a few shots first.");
    know.push(p.axisRotation !== void 0 && p.axisTilt !== void 0 ? `Your axis: ${Math.round(p.axisRotation)}\xB0 rotation and ${Math.round(p.axisTilt)}\xB0 tilt.` : "Axis rotation and tilt aren't known. A good shop can measure them (or at least find your PAP) before drilling a ball for you.");
    know.push(p.pap ? `Your PAP: ${p.pap}.` : "Your PAP isn't on file. Ask for a PAP measurement (the positive axis point), which is where your ball's spin axis sits. Layouts are built around it.");
    sections.push({ title: "Know these before you walk in", items: know });
    const ask = [];
    ask.push('"What layout are you drilling, and why that one for me?" You should get three numbers (such as drilling angle, pin to PAP, and angle to the VAL), and a reason in terms of your speed, revs, tilt and the lanes you bowl.');
    ask.push(`"How much of this ball's flare potential will this layout use?" The pin-to-PAP distance controls it. A good driller can answer.`);
    ask.push(dom === "rev" ? `"I'm rev-dominant. Will this layout keep the ball from reading the lane too early?" Rev-dominant bowlers usually want a larger sum of drilling angle and angle to the VAL.` : dom === "speed" ? `"I'm speed-dominant. Will this layout get the ball rolling soon enough?" Speed-dominant bowlers usually want a smaller angle sum so the ball turns speed into rotation sooner.` : '"My speed and revs are balanced. Is a medium layout the right starting point?"');
    if (p.pattern) ask.push(`"I bowl on ${p.pattern.name} (${p.pattern.lengthFt} ft${p.pattern.volumeMl ? `, ${p.pattern.volumeMl} mL` : ""}). Does this ball and layout fit those lanes?" Patterns that are longer or have more oil call for earlier-reading layouts.`);
    ask.push('"What surface is it coming with, and what would you change for dry or oily lanes?" The surface (a polish or a sanded finish) matters as much as the layout.');
    if (p.coverageScore !== null && p.coverageScore < 80) ask.push(`"My arsenal doesn't cover everything. What's the biggest gap?" (The app scored your arsenal ${p.coverageScore} out of 100. See the Arsenal optimizer for what it found.)`);
    if (!p.hasSpare) ask.push('"Can you drill me a plastic spare ball?" Your strike balls will hook too much on spares.');
    if ((p.issues ?? []).some((i) => /speed/i.test(i))) ask.push(`"My speed is inconsistent. Does that change what you'd recommend?" Ball choice is only as good as the speed you can repeat.`);
    ask.push('"Can you show me the layout on the ball before you drill?" A good driller will mark it and explain it. You can use the Layout Lab to see it first.');
    sections.push({ title: "Questions to ask the pro shop", items: ask });
    const fit = [
      "Your hand is measured, not guessed: span, the fit of each hole, and pitch. A bad fit makes every ball worse.",
      p.style === "two-handed" ? "For two-handed bowling, the fingers and the grip are matched to your release. The hand you keep under the ball matters." : p.style === "one-hand-no-thumb" ? "With no thumb hole the grip is set from the bridge and finger holes, so the shop should watch how you hold and release the ball." : "The thumb should come out clean and the fingers should hold without squeezing. If you grip hard, tell them.",
      "Your PAP is found by watching you roll the ball, by a tool, or from your tracks. Do it before drilling your first custom ball.",
      p.hasFit ? "You've saved your hand measurements in the app, so you can show them to any shop." : "Write your span and hole sizes down after the fitting (the app can store them in the Layout Lab)."
    ];
    sections.push({ title: "What a good fitting includes", items: fit });
    const look = [];
    if (p.revRpm !== void 0) look.push(p.revRpm >= 450 ? "High revs: you create a lot of hook on your own. Look for a cleaner ball (lower differential, higher RG) or a layout with less flare, so you can keep it under control." : p.revRpm <= 300 ? "Lower revs: look for balls that help you read the lane, with a lower RG, a higher differential, or a stronger layout." : "Medium revs: you can use most balls, and layout is how you tune them.");
    if (p.speedMph !== void 0) look.push(p.speedMph >= 18 ? "Faster than most: you need balls that grab sooner. Higher-friction covers help a lot." : p.speedMph <= 14.5 ? "Slower than most: you'll hook easily. A cleaner ball keeps it from going too early." : "Typical speed: nothing unusual to correct for.");
    look.push(p.strikeBalls === 0 ? "You don't have a strike ball yet. Start with one that suits the lanes you bowl most." : p.strikeBalls < 3 ? "You have a small arsenal. Add balls that cover conditions you don't yet (a stronger one for heavy oil, a cleaner one for dry lanes)." : "You have a working arsenal. Add balls to fill gaps, not to repeat what you have.");
    look.push("Ask the shop for balls released recently and still sold. Older and retired balls can be fine used, but check the price against a new one.");
    sections.push({ title: "What to look for in your next ball", items: look });
    const warn = [
      "A big flare does not mean a better ball. It means more friction, which helps on heavy oil and hurts on dry lanes.",
      "A ball that reads strong on paper can still feel weak or strong depending on your layout and surface.",
      "Don't let anyone drill a ball without asking about your PAP, your speed and your revs.",
      "If a ball doesn't match what you were told after a few games, tell the shop. Surface changes are quick and cheap."
    ];
    sections.push({ title: "Things to watch for", items: warn });
    return sections;
  }

  // core/src/ballscan.ts
  function fitCircle(pts) {
    if (pts.length < 3) return null;
    let sx = 0, sy = 0;
    for (const p of pts) sx += p.x, sy += p.y;
    const mx = sx / pts.length, my = sy / pts.length;
    let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
    for (const p of pts) {
      const u = p.x - mx, v = p.y - my;
      suu += u * u;
      svv += v * v;
      suv += u * v;
      suuu += u * u * u;
      svvv += v * v * v;
      suvv += u * v * v;
      svuu += v * u * u;
    }
    const det = suu * svv - suv * suv;
    if (Math.abs(det) < 1e-9) return null;
    const uc = (0.5 * (suuu + suvv) * svv - 0.5 * (svvv + svuu) * suv) / det;
    const vc = (0.5 * (svvv + svuu) * suu - 0.5 * (suuu + suvv) * suv) / det;
    const r = Math.sqrt(uc * uc + vc * vc + (suu + svv) / pts.length);
    return { x: uc + mx, y: vc + my, r };
  }
  function rng(seed) {
    let s = seed || 1;
    return () => (s = s * 16807 % 2147483647) / 2147483647;
  }
  function shrink(gray, w, h, maxW) {
    const k2 = Math.max(1, Math.floor(w / maxW));
    const nw = Math.floor(w / k2), nh = Math.floor(h / k2);
    const out = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++)
      for (let x = 0; x < nw; x++) {
        let s = 0;
        for (let j = 0; j < k2; j++) for (let i = 0; i < k2; i++) s += gray[(y * k2 + j) * w + x * k2 + i];
        out[y * nw + x] = s / (k2 * k2);
      }
    return { g: out, w: nw, h: nh, k: k2 };
  }
  function detectBall(gray, w, h, hint = {}) {
    const { g, w: sw, h: sh, k: k2 } = shrink(gray, w, h, 360);
    const gx = new Float32Array(sw * sh), gy = new Float32Array(sw * sh), mag = new Float32Array(sw * sh);
    for (let y = 1; y < sh - 1; y++)
      for (let x = 1; x < sw - 1; x++) {
        const i = y * sw + x;
        gx[i] = g[i + 1] - g[i - 1];
        gy[i] = g[i + sw] - g[i - sw];
        mag[i] = Math.hypot(gx[i], gy[i]);
      }
    const sorted2 = Float32Array.from(mag).sort();
    const thr = Math.max(12, sorted2[Math.floor(sorted2.length * 0.94)]);
    const edges = [];
    for (let i = 0; i < mag.length; i++) if (mag[i] >= thr) edges.push(i);
    if (edges.length < 60) return null;
    const rand = rng(12345);
    const minR = hint.minR !== void 0 ? hint.minR / k2 : Math.min(sw, sh) * 0.15;
    const maxR = hint.maxR !== void 0 ? hint.maxR / k2 : Math.min(sw, sh) * 0.52;
    const inside2 = (hint.contain ?? []).map((p) => ({ x: p.x / k2, y: p.y / k2 }));
    const tol = Math.max(1.8, Math.min(sw, sh) * 0.012);
    let best = null;
    const pt2 = (i) => ({ x: i % sw, y: Math.floor(i / sw) });
    for (let it = 0; it < (inside2.length ? 4e3 : 900); it++) {
      const a = pt2(edges[Math.floor(rand() * edges.length)]), b = pt2(edges[Math.floor(rand() * edges.length)]), c = pt2(edges[Math.floor(rand() * edges.length)]);
      const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
      if (Math.abs(d) < 1e-6) continue;
      const ux = ((a.x * a.x + a.y * a.y) * (b.y - c.y) + (b.x * b.x + b.y * b.y) * (c.y - a.y) + (c.x * c.x + c.y * c.y) * (a.y - b.y)) / d;
      const uy = ((a.x * a.x + a.y * a.y) * (c.x - b.x) + (b.x * b.x + b.y * b.y) * (a.x - c.x) + (c.x * c.x + c.y * c.y) * (b.x - a.x)) / d;
      const r = Math.hypot(a.x - ux, a.y - uy);
      if (r < minR || r > maxR) continue;
      if (inside2.some((q) => Math.hypot(q.x - ux, q.y - uy) > r * 0.85)) continue;
      if (inside2.length && Math.hypot(inside2.reduce((a2, q) => a2 + q.x, 0) / inside2.length - ux, inside2.reduce((a2, q) => a2 + q.y, 0) / inside2.length - uy) > r * 0.5) continue;
      let n = 0;
      const bins2 = new Uint8Array(24);
      for (let q = 0; q < edges.length; q += 2) {
        const p = pt2(edges[q]);
        const dist2 = Math.hypot(p.x - ux, p.y - uy);
        if (Math.abs(dist2 - r) > tol) continue;
        const rx = (p.x - ux) / (dist2 || 1), ry = (p.y - uy) / (dist2 || 1);
        const m = mag[edges[q]] || 1;
        if (Math.abs((gx[edges[q]] * rx + gy[edges[q]] * ry) / m) > 0.8) {
          n++;
          bins2[Math.min(23, Math.floor((Math.atan2(ry, rx) + Math.PI) / (2 * Math.PI) * 24))] = 1;
        }
      }
      const coverage = bins2.reduce((a2, b2) => a2 + b2, 0) / 24;
      const score = n * (0.4 + coverage);
      if (!best || score > best.n) best = { c: { x: ux, y: uy, r }, n: score };
    }
    if (!best || best.n < Math.max(25, 0.6 * 2 * Math.PI * best.c.r / 4)) return null;
    const inl = [];
    for (const e of edges) {
      const p = pt2(e);
      if (Math.abs(Math.hypot(p.x - best.c.x, p.y - best.c.y) - best.c.r) <= tol) inl.push(p);
    }
    const f = fitCircle(inl) ?? best.c;
    return { x: (f.x + 0.5) * k2, y: (f.y + 0.5) * k2, r: f.r * k2 };
  }
  function detectHoles(gray, w, h, ball) {
    const { g, w: sw, h: sh, k: k2 } = shrink(gray, w, h, 420);
    const c = { x: ball.x / k2, y: ball.y / k2, r: ball.r / k2 };
    const rad2 = Math.max(3, Math.round(c.r / 5));
    const integral = new Float64Array((sw + 1) * (sh + 1));
    for (let y = 0; y < sh; y++) {
      let row = 0;
      for (let x = 0; x < sw; x++) {
        row += g[y * sw + x];
        integral[(y + 1) * (sw + 1) + x + 1] = integral[y * (sw + 1) + x + 1] + row;
      }
    }
    const box = (x, y) => {
      const x0 = Math.max(0, x - rad2), x1 = Math.min(sw, x + rad2 + 1), y0 = Math.max(0, y - rad2), y1 = Math.min(sh, y + rad2 + 1);
      return (integral[y1 * (sw + 1) + x1] - integral[y0 * (sw + 1) + x1] - integral[y1 * (sw + 1) + x0] + integral[y0 * (sw + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    };
    const dark = new Float32Array(sw * sh);
    const vals = [];
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        if (Math.hypot(x - c.x, y - c.y) > c.r * 0.9) continue;
        const d = box(x, y) - g[y * sw + x];
        dark[y * sw + x] = d;
        vals.push(d);
      }
    if (vals.length < 50) return [];
    vals.sort((a, b) => a - b);
    const t = Math.max(14, vals[Math.floor(vals.length * 0.97)] * 0.55);
    const seen2 = new Uint8Array(sw * sh);
    const blobs = [];
    for (let s = 0; s < sw * sh; s++) {
      if (seen2[s] || dark[s] < t) continue;
      const stack = [s];
      seen2[s] = 1;
      let n = 0, sx = 0, sy = 0, x0 = sw, x1 = 0, y0 = sh, y1 = 0, dsum = 0;
      while (stack.length) {
        const i = stack.pop();
        const x = i % sw, y = Math.floor(i / sw);
        n++;
        sx += x;
        sy += y;
        dsum += dark[i];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (const j of [i - 1, i + 1, i - sw, i + sw]) if (j >= 0 && j < sw * sh && !seen2[j] && dark[j] >= t) seen2[j] = 1, stack.push(j);
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const rEq = Math.sqrt(n / Math.PI);
      const fill = n / (bw * bh);
      const aspect = bw / bh;
      if (rEq < c.r * 0.045 || rEq > c.r * 0.22) continue;
      if (fill < 0.55 || aspect < 0.45 || aspect > 2.2) continue;
      blobs.push({ x: (sx / n + 0.5) * k2, y: (sy / n + 0.5) * k2, r: rEq * k2, contrast: dsum / n });
    }
    return blobs.sort((a, b) => b.contrast * b.r - a.contrast * a.r).slice(0, 8);
  }
  var traceCache = null;
  function traceBall(gray, w, h, c0, r0, spread = 0.2, rgb, scoreOut) {
    const cacheHit = traceCache && traceCache.gray === gray && traceCache.rgb === rgb && traceCache.w === w && traceCache.h === h ? traceCache : null;
    const { g, w: sw, h: sh, k: k2 } = cacheHit ? cacheHit.shrunk : shrink(gray, w, h, 300);
    const cx = c0.x / k2, cy = c0.y / k2, R0 = r0 / k2;
    let fgScore = cacheHit ? cacheHit.fgScore : null;
    if (rgb && !cacheHit) {
      const px = (x, y) => {
        const i = (Math.min(h - 1, Math.round(y * k2)) * w + Math.min(w - 1, Math.round(x * k2))) * 3;
        return [rgb[i], rgb[i + 1], rgb[i + 2]];
      };
      const sample2 = (pred) => {
        const out = [];
        for (let y = 0; y < sh; y += 2) for (let x = 0; x < sw; x += 2) if (pred(Math.hypot(x - cx, y - cy))) out.push(px(x, y));
        return out;
      };
      const kmeans = (pts2, kc) => {
        if (pts2.length < kc) return pts2;
        let cs = Array.from({ length: kc }, (_, i) => pts2[Math.floor((i + 0.5) * (pts2.length / kc))]);
        for (let it = 0; it < 6; it++) {
          const sum = cs.map(() => [0, 0, 0, 0]);
          for (const p of pts2) {
            let bi = 0, bd = 1e9;
            cs.forEach((c, i) => {
              const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2;
              if (d < bd) bd = d, bi = i;
            });
            sum[bi][0] += p[0];
            sum[bi][1] += p[1];
            sum[bi][2] += p[2];
            sum[bi][3]++;
          }
          cs = cs.map((c, i) => sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : c);
        }
        return cs;
      };
      const fg = kmeans(sample2((d) => d < R0 * 0.45), 4);
      const bg = kmeans(sample2((d) => d > R0 * 1.55), 5);
      if (fg.length && bg.length) {
        fgScore = new Float32Array(sw * sh);
        const near = (cs, p) => Math.sqrt(Math.min(...cs.map((c) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2)));
        for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
          const p = px(x, y);
          fgScore[y * sw + x] = near(bg, p) - near(fg, p);
        }
      }
      traceCache = { gray, rgb, w, h, shrunk: { g, w: sw, h: sh, k: k2 }, fgScore };
    }
    const sm = new Float32Array(sw * sh);
    for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) sm[y * sw + x] = (4 * g[y * sw + x] + g[y * sw + x - 1] + g[y * sw + x + 1] + g[(y - 1) * sw + x] + g[(y + 1) * sw + x]) / 8;
    const at3 = (x, y) => {
      const xi = Math.max(1, Math.min(sw - 2, Math.round(x))), yi = Math.max(1, Math.min(sh - 2, Math.round(y)));
      return sm[yi * sw + xi];
    };
    const fgAt = (x, y) => fgScore ? fgScore[Math.max(0, Math.min(sh - 1, Math.round(y))) * sw + Math.max(0, Math.min(sw - 1, Math.round(x)))] : 0;
    const NA = 120;
    const rMin = Math.max(6, Math.floor(R0 * (1 - spread))), rMax = Math.ceil(R0 * (1 + spread));
    const NR = rMax - rMin + 1;
    const edge = [];
    for (let a = 0; a < NA; a++) {
      const th = a / NA * 2 * Math.PI, ux = Math.cos(th), uy = Math.sin(th);
      const row = new Float32Array(NR);
      for (let ri = 0; ri < NR; ri++) {
        const r = rMin + ri;
        const x = cx + ux * r, y = cy + uy * r;
        if (x < 2 || y < 2 || x > sw - 3 || y > sh - 3) {
          row[ri] = 0;
          continue;
        }
        const inner = (at3(x - ux * 2, y - uy * 2) + at3(x - ux * 3, y - uy * 3)) / 2, outer2 = (at3(x + ux * 2, y + uy * 2) + at3(x + ux * 3, y + uy * 3)) / 2;
        row[ri] = Math.abs(outer2 - inner);
        if (fgScore) {
          const fin = (fgAt(x - ux * 3, y - uy * 3) + fgAt(x - ux * 5, y - uy * 5)) / 2, fout = (fgAt(x + ux * 3, y + uy * 3) + fgAt(x + ux * 5, y + uy * 5)) / 2;
          row[ri] = 0.35 * row[ri] + 0.65 * Math.max(0, fin - fout);
        }
      }
      edge.push(row);
    }
    const lambda = 1.2;
    const best = (startRi) => {
      let prev = new Float32Array(NR).fill(-1e9);
      prev[startRi] = edge[0][startRi];
      const back = [];
      for (let a = 1; a <= NA; a++) {
        const cur2 = new Float32Array(NR).fill(-1e9);
        const bp = new Int16Array(NR);
        const row = edge[a % NA];
        for (let ri2 = 0; ri2 < NR; ri2++) {
          let bv = -1e9, bi = ri2;
          for (let d = -3; d <= 3; d++) {
            const j = ri2 + d;
            if (j < 0 || j >= NR) continue;
            const v = prev[j] - lambda * Math.abs(d) * 2;
            if (v > bv) bv = v, bi = j;
          }
          cur2[ri2] = bv + row[ri2];
          bp[ri2] = bi;
        }
        back.push(bp);
        prev = cur2;
      }
      let ri = startRi;
      const path2 = new Array(NA);
      let score = prev[startRi];
      for (let a = NA; a >= 1; a--) {
        path2[a % NA] = ri;
        ri = back[a - 1][ri];
      }
      return { path: path2, score };
    };
    const starts = [...edge[0].keys()].sort((p, q) => edge[0][q] - edge[0][p]).filter((v, i, arr) => arr.slice(0, i).every((u) => Math.abs(u - v) > 6)).slice(0, 4);
    let top = null;
    for (const s of starts) {
      const b = best(s);
      if (!top || b.score > top.score) top = b;
    }
    if (!top) return null;
    if (scoreOut) scoreOut.score = top.score / NA;
    const pts = top.path.map((ri, a) => ({ x: cx + Math.cos(a / NA * 2 * Math.PI) * (rMin + ri), y: cy + Math.sin(a / NA * 2 * Math.PI) * (rMin + ri) }));
    let fit = fitCircle(pts);
    for (let round = 0; round < 4 && fit; round++) {
      const f = fit;
      const keep = pts.filter((p) => Math.abs(Math.hypot(p.x - f.x, p.y - f.y) - f.r) < f.r * 0.04);
      if (keep.length < 25) break;
      fit = fitCircle(keep) ?? fit;
    }
    if (!fit || fit.r < R0 * (1 - spread * 1.3) || fit.r > R0 * (1 + spread * 1.3)) return null;
    return { x: (fit.x + 0.5) * k2, y: (fit.y + 0.5) * k2, r: fit.r * k2 };
  }
  function findBalls(gray, w, h, holesMid, rGuess, rgb, count = 3) {
    const found = [];
    for (const sizeK of [0.88, 1, 1.12])
      for (let iy = -2; iy <= 2; iy++)
        for (let ix = -2; ix <= 2; ix++) {
          const out = { score: 0 };
          const c = traceBall(gray, w, h, { x: holesMid.x + ix * rGuess * 0.14, y: holesMid.y + iy * rGuess * 0.14 }, rGuess * sizeK, 0.12, rgb, out);
          if (c) found.push({ c, score: out.score });
        }
    found.sort((a, b) => b.score - a.score);
    const picks = [];
    for (const f of found) {
      if (picks.every((p) => Math.hypot(p.x - f.c.x, p.y - f.c.y) > f.c.r * 0.22 || Math.abs(p.r - f.c.r) > f.c.r * 0.18)) {
        const again = traceBall(gray, w, h, f.c, f.c.r, 0.08, rgb);
        picks.push(again ?? f.c);
      }
      if (picks.length >= count) break;
    }
    return picks;
  }
  function detectDots(rgb, w, h, ball, avoid = [], avoidR = 0) {
    const k2 = Math.max(1, Math.floor(w / 640));
    const sw = Math.floor(w / k2), sh = Math.floor(h / k2);
    const c = { x: ball.x / k2, y: ball.y / k2, r: ball.r / k2 };
    const ch = [new Float32Array(sw * sh), new Float32Array(sw * sh), new Float32Array(sw * sh)];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) for (let j = 0; j < 3; j++) ch[j][y * sw + x] = rgb[(y * k2 * w + x * k2) * 3 + j];
    const rad2 = Math.max(4, Math.round(c.r / 9));
    const integ = ch.map((a) => {
      const I = new Float64Array((sw + 1) * (sh + 1));
      for (let y = 0; y < sh; y++) {
        let row = 0;
        for (let x = 0; x < sw; x++) {
          row += a[y * sw + x];
          I[(y + 1) * (sw + 1) + x + 1] = I[y * (sw + 1) + x + 1] + row;
        }
      }
      return I;
    });
    const mean9 = (j, x, y) => {
      const x0 = Math.max(0, x - rad2), x1 = Math.min(sw, x + rad2 + 1), y0 = Math.max(0, y - rad2), y1 = Math.min(sh, y + rad2 + 1);
      const I = integ[j];
      return (I[y1 * (sw + 1) + x1] - I[y0 * (sw + 1) + x1] - I[y1 * (sw + 1) + x0] + I[y0 * (sw + 1) + x0]) / ((x1 - x0) * (y1 - y0));
    };
    const clear = (avoidR || ball.r * 0.2) * 1 / k2;
    const nearAvoid = (x, y) => avoid.some((q) => Math.hypot(q.x / k2 - x, q.y / k2 - y) < clear);
    const dist2 = new Float32Array(sw * sh);
    const sat = new Float32Array(sw * sh);
    const vals = [];
    for (let y = 0; y < sh; y++)
      for (let x = 0; x < sw; x++) {
        if (Math.hypot(x - c.x, y - c.y) > c.r * 0.9 || nearAvoid(x, y)) continue;
        const i = y * sw + x;
        const d = Math.hypot(ch[0][i] - mean9(0, x, y), ch[1][i] - mean9(1, x, y), ch[2][i] - mean9(2, x, y));
        dist2[i] = d;
        const mx = Math.max(ch[0][i], ch[1][i], ch[2][i]), mn = Math.min(ch[0][i], ch[1][i], ch[2][i]);
        sat[i] = mx ? (mx - mn) / mx : 0;
        vals.push(d);
      }
    if (vals.length < 50) return [];
    vals.sort((a, b) => a - b);
    const t = Math.min(70, Math.max(40, vals[Math.floor(vals.length * 0.995)] * 0.5));
    const seen2 = new Uint8Array(sw * sh);
    const out = [];
    for (let s = 0; s < sw * sh; s++) {
      if (seen2[s] || dist2[s] < t) continue;
      const stack = [s];
      seen2[s] = 1;
      let n = 0, sx = 0, sy = 0, x0 = sw, x1 = 0, y0 = sh, y1 = 0, dsum = 0, ssum = 0;
      while (stack.length) {
        const i = stack.pop();
        const x = i % sw, y = Math.floor(i / sw);
        n++;
        sx += x;
        sy += y;
        dsum += dist2[i];
        ssum += sat[i];
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (const j of [i - 1, i + 1, i - sw, i + sw]) if (j >= 0 && j < sw * sh && !seen2[j] && dist2[j] >= t) seen2[j] = 1, stack.push(j);
      }
      const coreContrast = dsum / n;
      {
        const mc = [0, 1, 2].map((j) => ch[j][Math.round(sy / n) * sw + Math.round(sx / n)]);
        const cap = Math.PI * (c.r * 0.13) ** 2;
        const grown = new Uint8Array(sw * sh);
        const q = [];
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
          const i = yy * sw + xx;
          if (seen2[i] && dist2[i] >= t) grown[i] = 1, q.push(i);
        }
        let gn = 0, gx = 0, gy = 0, gx0 = sw, gx1 = 0, gy0 = sh, gy1 = 0, gs = 0;
        while (q.length && gn < cap * 1.2) {
          const i = q.pop();
          const x = i % sw, y = Math.floor(i / sw);
          gn++;
          gx += x;
          gy += y;
          gs += sat[i] || 0;
          if (x < gx0) gx0 = x;
          if (x > gx1) gx1 = x;
          if (y < gy0) gy0 = y;
          if (y > gy1) gy1 = y;
          for (const j of [i - 1, i + 1, i - sw, i + sw]) {
            if (j < 0 || j >= sw * sh || grown[j]) continue;
            if (Math.hypot(ch[0][j] - mc[0], ch[1][j] - mc[1], ch[2][j] - mc[2]) < 60) grown[j] = 1, q.push(j);
          }
        }
        if (gn > n && gn < cap * 1.2) {
          for (let yy = gy0; yy <= gy1; yy++) for (let xx = gx0; xx <= gx1; xx++) if (grown[yy * sw + xx]) seen2[yy * sw + xx] = 1;
          n = gn;
          sx = gx;
          sy = gy;
          x0 = gx0;
          x1 = gx1;
          y0 = gy0;
          y1 = gy1;
          ssum = Math.max(ssum, gs);
        }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      const rEq = Math.sqrt(n / Math.PI);
      if (rEq < c.r * 0.02 || rEq > c.r * 0.11) continue;
      if (n / (bw * bh) < 0.55 || bw / bh < 0.5 || bw / bh > 2) continue;
      if (ssum / n < 0.25) continue;
      out.push({ x: (sx / n + 0.5) * k2, y: (sy / n + 0.5) * k2, r: rEq * k2, contrast: coreContrast });
    }
    return out.sort((a, b) => b.contrast * Math.sqrt(b.r) - a.contrast * Math.sqrt(a.r)).slice(0, 6);
  }
  function pickGrip(blobs, ball, noThumb) {
    let best = null;
    for (let i = 0; i < blobs.length; i++)
      for (let j = i + 1; j < blobs.length; j++) {
        const a = blobs[i], b = blobs[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y) / ball.r;
        if (d < 0.12 || d > 0.5) continue;
        const same = 1 - Math.abs(a.r - b.r) / Math.max(a.r, b.r);
        if (same < 0.6) continue;
        const mid2 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (noThumb) {
          const s = same + (a.contrast + b.contrast) / 400;
          if (!best || s > best.score) best = { thumb: null, fingers: [a, b], score: s };
          continue;
        }
        for (const t of blobs) {
          if (t === a || t === b) continue;
          const dt = Math.hypot(t.x - mid2.x, t.y - mid2.y) / ball.r;
          if (dt < 0.7 || dt > 1.35) continue;
          const ax = mid2.x - ball.x, ay = mid2.y - ball.y, tx = t.x - ball.x, ty = t.y - ball.y;
          const opposite = -(ax * tx + ay * ty) / (Math.hypot(ax, ay) * Math.hypot(tx, ty) || 1);
          const s = same + (a.contrast + b.contrast + t.contrast) / 600 + 0.3 * opposite - Math.abs(dt - 1.05);
          if (!best || s > best.score) best = { thumb: t, fingers: [a, b], score: s };
        }
      }
    return best ? { thumb: best.thumb, fingers: best.fingers } : null;
  }
  function toSphere(p, c) {
    const x = (p.x - c.x) / c.r, y = (c.y - p.y) / c.r;
    const rr = x * x + y * y;
    if (rr >= 0.9999) {
      const n = Math.sqrt(rr);
      return [x / n, y / n, 0];
    }
    return [x, y, Math.sqrt(1 - rr)];
  }
  function scanFrame(inp) {
    const S3 = (p) => toSphere(p, inp.circle);
    const fa = S3(inp.fingerA), fb = S3(inp.fingerB);
    const F = unit([fa[0] + fb[0], fa[1] + fb[1], fa[2] + fb[2]]);
    const T = inp.thumb ? S3(inp.thumb) : null;
    const G = T ? unit([F[0] + T[0], F[1] + T[1], F[2] + T[2]]) : F;
    const up = T ? tangentToward(G, F) : tangentToward(G, [0, 1, 0]);
    return { ex: cross(up, G), up, g: G };
  }
  function layoutFromScan(inp) {
    const warnings = [];
    const S3 = (p) => toSphere(p, inp.circle);
    const T = inp.thumb ? S3(inp.thumb) : null;
    const F = unit([S3(inp.fingerA)[0] + S3(inp.fingerB)[0], S3(inp.fingerA)[1] + S3(inp.fingerB)[1], S3(inp.fingerA)[2] + S3(inp.fingerB)[2]]);
    const { ex: e_x, up, g: G } = scanFrame(inp);
    const map = (v) => [dot(v, e_x), dot(v, up), dot(v, G)];
    const pinCam = S3(inp.pin);
    const refPt = inp.asymmetric ? inp.mb ?? inp.cg ?? inp.baseline ?? null : inp.cg ?? inp.baseline ?? null;
    const reference = !refPt ? null : inp.asymmetric && inp.mb && refPt === inp.mb ? "mb" : "cg";
    const baseCam = refPt ? S3(refPt) : null;
    const measured = measureLayout(map(pinCam), baseCam ? map(baseCam) : null, inp.pap, inp.hand, inp.grip ?? DEFAULT_GRIP);
    if (inp.asymmetric && !inp.mb && refPt) warnings.push("This ball has a mass bias, but it isn't placed, so I measured from the CG instead. Place the mass bias dot for the right drilling angle.");
    const pinToCg = inp.cg ? surfDist(map(pinCam), map(S3(inp.cg))) : null;
    const pinToMb = inp.asymmetric && inp.mb ? surfDist(map(pinCam), map(S3(inp.mb))) : null;
    const near = (p) => Math.hypot(p.x - inp.circle.x, p.y - inp.circle.y) / inp.circle.r > 0.82;
    if (near(inp.pin) || refPt && near(refPt)) warnings.push("The pin or the CG / mass bias is near the edge of the ball in the picture, where distances are squeezed. Turn the ball so it is closer to the middle and scan again.");
    if (near(inp.fingerA) || near(inp.fingerB) || inp.thumb && near(inp.thumb)) warnings.push("A grip hole is near the edge of the ball in the picture. Turn the ball so the grip faces the camera.");
    if (measured.drilling !== null && Math.abs(measured.drilling) > 95) warnings.push(`The drilling angle reads ${Math.round(Math.abs(measured.drilling))}\xB0, which is past the usual 10-90\xB0. The CG or mass bias dot may be on the other side of the pin, or the pin may be in the wrong spot. Check where you tapped.`);
    if (Math.abs(measured.valAngle) > 90) warnings.push("The pin is below the PAP, which is unusual. Check the PAP (over and up) and where the pin is.");
    if (measured.pinToPap < 0.5 || measured.pinToPap > 7) warnings.push("The pin to PAP distance looks off. Check the PAP numbers and where you placed the pin.");
    const sphereDist = (a, b) => surfDist(a, b);
    let spanIn = null;
    if (T) {
      const px = (r) => r === void 0 ? null : r / inp.circle.r * R;
      const thumbR = px(inp.holeRadii?.thumb) ?? 0.5, fingerR = px(inp.holeRadii?.finger) ?? 0.45;
      spanIn = Math.max(0, sphereDist(T, F) - thumbR - fingerR);
    }
    void scale;
    void sub;
    const grp = inp.grip ?? DEFAULT_GRIP;
    const cg = inp.cg ? measureMark(map(pinCam), map(S3(inp.cg)), inp.pap, inp.hand, grp) : null;
    const mb = inp.asymmetric && inp.mb ? measureMark(map(pinCam), map(S3(inp.mb)), inp.pap, inp.hand, grp) : null;
    return { measured, spanIn, reference, pinToCg, pinToMb, cg, mb, warnings };
  }

  // camera/ballscan.ts
  var KINDS = [
    { id: "thumb", label: "One hand, with a thumb", blurb: "a thumb hole and two finger holes" },
    { id: "nothumb", label: "One hand, no thumb", blurb: "two finger holes, no thumb hole" },
    { id: "two", label: "Two-handed", blurb: "two finger holes, no thumb hole" }
  ];
  var LABEL = { thumb: "Thumb hole", fingerA: "Finger hole 1", fingerB: "Finger hole 2", pin: "Pin", cg: "CG", mb: "Mass bias" };
  var COLOR = { thumb: "#ffffff", fingerA: "#ff4fd8", fingerB: "#ff4fd8", pin: "#46e6ff", cg: "#ffd25a", mb: "#ff8a3d" };
  var st = null;
  var kindPicked = null;
  var drag = null;
  var sheet = () => $("layoutscan");
  var close = () => (sheet().classList.remove("on"), sheet().innerHTML = "", st = null);
  var MAX_W = 960;
  function openBallScan() {
    const el = sheet();
    el.classList.add("on");
    const bp = bowlerProfile();
    const mine = bp.style === "two-handed" ? "two" : bp.style === "one-hand-no-thumb" ? "nothumb" : "thumb";
    kindPicked = null;
    el.innerHTML = `
    <div class="row"><h2>Scan my ball</h2><button class="btn ghost" id="bs-close">Close</button></div>
    <div class="note">First, what kind of grip is drilled in this ball? It tells me which holes to look for.</div>
    <div class="card">${KINDS.map((k2) => `<button class="opt" data-kind="${k2.id}"><b>${k2.label}</b><span>${k2.blurb}${k2.id === mine ? " \xB7 matches your profile" : ""}</span></button>`).join("")}</div>`;
    $("bs-close").onclick = close;
    el.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => (kindPicked = b.dataset.kind, openPhoto()));
  }
  function openPhoto() {
    const el = sheet();
    const bp = bowlerProfile();
    const kind2 = kindPicked ?? "thumb";
    el.innerHTML = `
    <div class="row"><h2>Scan my ball</h2><button class="btn ghost" id="bs-close">Close</button></div>
    <div class="note">${esc(KINDS.find((k2) => k2.id === kind2).label)}. Take a photo and I'll scan it on my own: the ball, the grip holes and the pin. Then you can drag anything I got wrong.</div>
    <div class="card"><div class="k">For the best reading</div><ul>
      <li>Set the ball on a stand or a towel, grip facing the camera, <b>fingers up</b>. A plain background (no hand holding it) makes the outline much easier.</li>
      <li>Turn it so the <b>grip holes and the pin are both in view</b> and not right at the edge of the ball.</li>
      <li>Stand a few feet back and zoom in a little, rather than holding the phone close: it keeps distances true.</li>
      <li>Good light, no glare, the whole ball in the picture. A black ball needs light from the side.</li>
      <li>Know your <b>PAP</b>. Without it there's no layout to read.</li></ul></div>
    <div class="card"><div class="k">What the marks look like</div><ul>
      <li><b>Pin:</b> a small solid dot of a vivid color (often green, red or orange) near the logo. It marks the top of the weight block. I look for it by color.</li>
      <li><b>CG:</b> a symmetric ball is often unmarked, or has a small dot or ring. Many makers fine-tune the CG and mark it.</li>
      <li><b>Mass bias (MB):</b> only on asymmetric balls, a small dot, often a different color from the pin's. The line from the pin through it points toward the PSA.</li>
      <li>Marks vary from maker to maker. I can't promise I'll tell the pin from the CG or the MB, so check what I picked, and drag it if it's wrong.</li></ul></div>
    <div class="card"><label class="btn" style="display:inline-block;cursor:pointer">Take or choose a photo<input id="bs-file" type="file" accept="image/*" capture="environment" style="display:none"></label>
      <div class="note" id="bs-msg">Nothing is uploaded: the picture stays on this phone.</div></div>`;
    $("bs-close").onclick = close;
    $("bs-file").onchange = async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      $("bs-msg").textContent = "Scanning the picture\u2026";
      try {
        const img = await loadImage(f);
        await new Promise((r) => setTimeout(r, 30));
        begin(img, bp.hand, kind2);
      } catch {
        $("bs-msg").textContent = "That file didn't open as a picture.";
      }
    };
  }
  function loadImage(f) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(f);
      const im = new Image();
      im.onload = () => {
        const k2 = Math.min(1, MAX_W / im.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(im.naturalWidth * k2);
        c.height = Math.round(im.naturalHeight * k2);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c);
      };
      im.onerror = () => rej(new Error("bad image"));
      im.src = url;
    });
  }
  function pixels(c) {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const g = new Uint8ClampedArray(c.width * c.height);
    const rgb = new Uint8ClampedArray(c.width * c.height * 3);
    for (let i = 0; i < g.length; i++) {
      rgb[i * 3] = d[i * 4];
      rgb[i * 3 + 1] = d[i * 4 + 1];
      rgb[i * 3 + 2] = d[i * 4 + 2];
      g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    }
    return { g, rgb };
  }
  function begin(img, hand3, kind2) {
    const pap = S.profile?.spin?.pap ? parsePap(S.profile.spin.pap) : null;
    st = {
      img,
      circle: { x: img.width / 2, y: img.height / 2, r: Math.min(img.width, img.height) * 0.4 },
      outlines: [],
      outlineIx: 0,
      thumb: null,
      fingerA: null,
      fingerB: null,
      pin: null,
      cg: null,
      mb: null,
      asym: false,
      marks: [],
      guessed: { pin: false, cg: false, mb: false, holes: false },
      mode: "pin",
      kind: kind2,
      noThumb: kind2 !== "thumb",
      hand: hand3,
      holeR: 0,
      showHoles: true,
      papText: { over: pap ? fractionInches(pap.over).replace(/"/g, "") : "", up: pap ? fractionInches(pap.up).replace(/"/g, "") : "" },
      found: ""
    };
    analyze();
    draw();
  }
  function analyze() {
    if (!st) return;
    const s = st;
    const { g, rgb } = pixels(s.img);
    const W2 = s.img.width, H3 = s.img.height;
    const notes = [];
    const rough = { x: W2 / 2, y: H3 / 2, r: Math.min(W2, H3) * 0.48 };
    const blobs = detectHoles(g, W2, H3, rough);
    const grip = pickGrip(blobs, rough, s.noThumb);
    s.thumb = s.fingerA = s.fingerB = null;
    s.guessed.holes = false;
    if (grip) {
      s.thumb = grip.thumb ? { x: grip.thumb.x, y: grip.thumb.y } : null;
      s.fingerA = { x: grip.fingers[0].x, y: grip.fingers[0].y };
      s.fingerB = { x: grip.fingers[1].x, y: grip.fingers[1].y };
      if (s.fingerA.x > s.fingerB.x) [s.fingerA, s.fingerB] = [s.fingerB, s.fingerA];
      s.holeR = (grip.fingers[0].r + grip.fingers[1].r) / 2;
      s.guessed.holes = true;
    }
    s.outlines = [];
    if (grip) {
      const pts = [s.fingerA, s.fingerB, ...s.thumb ? [s.thumb] : []];
      const mid2 = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      const rGuess = Math.max(Math.min(W2, H3) * 0.2, Math.min(Math.min(W2, H3) * 0.5, s.holeR * 9.2));
      s.outlines = findBalls(g, W2, H3, mid2, rGuess, rgb, 3);
    }
    if (!s.outlines.length) {
      const edge = detectBall(g, W2, H3);
      if (edge) s.outlines = [edge];
    }
    s.outlineIx = 0;
    if (s.outlines.length) s.circle = s.outlines[0];
    notes.push(s.outlines.length ? `I found the ball's outline${s.outlines.length > 1 ? ` (and ${s.outlines.length - 1} other possible one${s.outlines.length > 2 ? "s" : ""}: try them if it's wrong)` : ""}.` : "I couldn't find the ball's outline on my own: drag the circle to fit the ball.");
    notes.push(grip ? `I found the grip holes (${s.noThumb ? "two finger holes" : "thumb and two finger holes"}).` : "I couldn't pick out the grip holes on my own: tap them.");
    if (grip && s.outlines.length) {
      const again = pickGrip(detectHoles(g, W2, H3, s.circle), s.circle, s.noThumb);
      if (again) {
        s.thumb = again.thumb ? { x: again.thumb.x, y: again.thumb.y } : null;
        s.fingerA = { x: again.fingers[0].x, y: again.fingers[0].y };
        s.fingerB = { x: again.fingers[1].x, y: again.fingers[1].y };
        if (s.fingerA.x > s.fingerB.x) [s.fingerA, s.fingerB] = [s.fingerB, s.fingerA];
        s.holeR = (again.fingers[0].r + again.fingers[1].r) / 2;
      }
    }
    const holes = [s.thumb, s.fingerA, s.fingerB].filter((p) => !!p);
    const dots = detectDots(rgb, W2, H3, s.circle, holes, s.holeR ? s.holeR * 2.2 : 0);
    s.marks = dots.map((d) => ({ x: d.x, y: d.y }));
    notes.push(s.marks.length ? `I found ${s.marks.length} small colored dot${s.marks.length === 1 ? "" : "s"}. I took the most vivid as the pin${s.marks.length > 1 ? s.asym ? ", the next as the mass bias" : ", the next as the CG" : ""}. Check ${s.marks.length === 1 ? "it" : "them"}.` : "I didn't see a pin dot: tap where the pin is.");
    assignDots();
    s.found = notes.join(" ");
  }
  function assignDots() {
    if (!st) return;
    const s = st;
    s.pin = s.cg = s.mb = null;
    s.guessed.pin = s.guessed.cg = s.guessed.mb = false;
    if (s.marks[0]) s.pin = s.marks[0], s.guessed.pin = true;
    if (s.marks[1]) {
      if (s.asym) s.mb = s.marks[1], s.guessed.mb = true;
      else s.cg = s.marks[1], s.guessed.cg = true;
    }
    if (s.asym && s.marks[2]) s.cg = s.marks[2], s.guessed.cg = true;
    if (s.marks[1] && s.fingerA && s.fingerB && (s.noThumb || s.thumb)) {
      const over = parseInches(s.papText.over), up = parseInches(s.papText.up);
      if (over !== null) {
        const drill = (pin, cg) => {
          try {
            const grp = { ...DEFAULT_GRIP, ...S.profile?.fit ?? {}, noThumb: s.noThumb };
            return layoutFromScan({ circle: s.circle, thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB, pin, baseline: cg, pap: { over, up: up ?? 0 }, hand: s.hand, grip: grp }).measured.drilling;
          } catch {
            return null;
          }
        };
        const ok = (d) => d !== null && Math.abs(d) >= 5 && Math.abs(d) <= 95;
        if (!ok(drill(s.marks[0], s.marks[1])) && ok(drill(s.marks[1], s.marks[0]))) {
          s.pin = s.marks[1];
          if (s.asym) s.mb = s.marks[0];
          else s.cg = s.marks[0];
        }
      }
    }
  }
  var itemsOf = (s) => [{ id: "thumb", p: s.noThumb ? null : s.thumb }, { id: "fingerA", p: s.fingerA }, { id: "fingerB", p: s.fingerB }, { id: "pin", p: s.pin }, { id: "cg", p: s.cg }, { id: "mb", p: s.asym ? s.mb : null }];
  function draw() {
    if (!st) return;
    const s = st;
    const el = sheet();
    el.innerHTML = `
    <div class="row"><h2>Scan my ball</h2><button class="btn ghost" id="bs-close">Close</button></div>
    <div class="note">${esc(s.found)}</div>
    <div class="card"><div class="stagebox" style="position:relative"><canvas id="bs-canvas" style="width:100%;height:auto;touch-action:none;cursor:grab"></canvas><canvas id="bs-loupe" width="150" height="150" style="position:absolute;right:8px;top:8px;width:96px;height:96px;border-radius:50%;border:2px solid #46e6ff;display:none;background:#000;pointer-events:none"></canvas></div>
      <div class="note"><b>Drag any marker to move it.</b> Drag the circle's middle cross to move the outline and its edge handle to resize it. To place a marker that is missing, pick it below and tap the ball.</div>
      <div class="chips">${KINDS.map((k2) => `<button class="chip ${s.kind === k2.id ? "sel" : ""}" data-kind="${k2.id}">${k2.label}</button>`).join("")}</div>
      <div class="chips"><button class="chip ${s.showHoles ? "sel" : ""}" id="bs-holes">Hole markers: ${s.showHoles ? "on" : "off"}</button><button class="chip ${s.asym ? "sel" : ""}" id="bs-asym">Mass bias: ${s.asym ? "on (asymmetric ball)" : "off (symmetric ball)"}</button></div>
      <div class="note">Only an asymmetric ball has a mass bias dot. A symmetric ball has just the pin and, often, a CG mark. Turn this on if your ball has a mass bias.</div>
      <div class="chips">${Object.keys(LABEL).filter((i) => !(s.noThumb && i === "thumb") && !(i === "mb" && !s.asym)).map((i) => `<button class="chip ${s.mode === i ? "sel" : ""}" data-mode="${i}">${i === "pin" ? "Place the pin" : i === "cg" ? "Place the CG dot" : i === "mb" ? "Place the mass bias dot" : "Place " + LABEL[i].toLowerCase()}</button>`).join("")}</div>
      <div class="chips">${s.outlines.length > 1 ? `<button class="chip" id="bs-next">Try another outline (${s.outlineIx + 1} of ${s.outlines.length})</button>` : ""}${s.marks.length > 1 ? `<button class="chip" id="bs-swap">Swap pin and ${s.asym ? "mass bias" : "CG"}</button>` : ""}${s.asym && s.marks.length > 2 ? `<button class="chip" id="bs-swap2">Swap CG and mass bias</button>` : ""}<button class="chip" id="bs-auto">Scan again</button></div></div>
    <div class="card"><div class="k">Your PAP and hand</div>
      <div class="two"><div class="field"><label>PAP over (in)</label><input id="bs-over" value="${esc(s.papText.over)}" placeholder="4 1/4"></div><div class="field"><label>PAP up (in, negative for down)</label><input id="bs-up" value="${esc(s.papText.up)}" placeholder="1/2"></div></div>
      <div class="field"><label>Hand</label><select id="bs-hand"><option value="R" ${s.hand === "R" ? "selected" : ""}>Right</option><option value="L" ${s.hand === "L" ? "selected" : ""}>Left</option></select></div>
      <div class="note">Over is across the grip's midline (to the right for a right-hander), up is toward the fingers, both measured from the center of the grip. This is the layout's whole reference, so make sure it's your real PAP.</div></div>
    <div id="bs-out"></div>
    <div class="card"><div class="u">If a scan gets it wrong, you can save it so detection can be improved: it saves the photo and your corrected points to this phone's downloads. Send them to me and I'll tune the scanner on them.</div><div class="chips"><button class="chip" id="bs-save">Save this scan for improving detection</button></div></div>`;
    $("bs-close").onclick = close;
    el.querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => (s.mode = b.dataset.mode, el.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("sel", x === b))));
    el.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => {
      s.kind = b.dataset.kind;
      s.noThumb = s.kind !== "thumb";
      analyze();
      draw();
    });
    $("bs-auto").onclick = () => (analyze(), draw());
    $("bs-next")?.addEventListener("click", () => {
      s.outlineIx = (s.outlineIx + 1) % s.outlines.length;
      s.circle = s.outlines[s.outlineIx];
      draw();
    });
    $("bs-holes").onclick = () => {
      s.showHoles = !s.showHoles;
      $("bs-holes").textContent = `Hole markers: ${s.showHoles ? "on" : "off"}`;
      $("bs-holes").classList.toggle("sel", s.showHoles);
      draw();
    };
    $("bs-asym").onclick = () => {
      s.asym = !s.asym;
      if (!s.asym) s.mb = null;
      if (s.mode === "mb" && !s.asym) s.mode = "cg";
      assignDots();
      draw();
    };
    $("bs-swap")?.addEventListener("click", () => {
      if (s.asym) [s.pin, s.mb] = [s.mb, s.pin];
      else [s.pin, s.cg] = [s.cg, s.pin];
      s.guessed.pin = s.guessed.cg = s.guessed.mb = false;
      redraw();
    });
    $("bs-swap2")?.addEventListener("click", () => {
      [s.cg, s.mb] = [s.mb, s.cg];
      s.guessed.cg = s.guessed.mb = false;
      redraw();
    });
    $("bs-save").onclick = saveExample;
    for (const id of ["bs-over", "bs-up", "bs-hand"]) $(id).addEventListener("change", () => redraw());
    wireCanvas();
    redraw();
  }
  function wireCanvas() {
    const s = st;
    const canvas = $("bs-canvas");
    canvas.width = s.img.width;
    canvas.height = s.img.height;
    const loupe = $("bs-loupe");
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * canvas.width, y: (e.clientY - r.top) / r.height * canvas.height };
    };
    const reach = () => 26 * (canvas.width / 900);
    const pick = (p) => {
      let best = null;
      for (const it of itemsOf(s)) if (it.p) {
        const d = Math.hypot(it.p.x - p.x, it.p.y - p.y);
        if (d < reach() && (!best || d < best.d)) best = { what: it.id, d };
      }
      const dc = Math.hypot(s.circle.x - p.x, s.circle.y - p.y);
      if (dc < reach() * 1.2 && (!best || dc < best.d)) best = { what: "center", d: dc };
      const de = Math.hypot(s.circle.x + s.circle.r - p.x, s.circle.y - p.y);
      if (de < reach() * 1.2 && (!best || de < best.d)) best = { what: "edge", d: de };
      return best?.what ?? null;
    };
    const set = (what, p) => {
      if (what === "center") s.circle = { ...s.circle, x: p.x, y: p.y };
      else if (what === "edge") s.circle = { ...s.circle, r: Math.max(20, Math.hypot(p.x - s.circle.x, p.y - s.circle.y)) };
      else {
        const snap = what === "pin" || what === "cg" ? s.marks.find((m) => Math.hypot(m.x - p.x, m.y - p.y) < 14 * (canvas.width / 900)) : void 0;
        const q = snap ? { x: snap.x, y: snap.y } : p;
        if (what === "thumb") s.thumb = q;
        else if (what === "fingerA") s.fingerA = q;
        else if (what === "fingerB") s.fingerB = q;
        else if (what === "pin") s.pin = q, s.guessed.pin = false;
        else if (what === "mb") s.mb = q, s.guessed.mb = false;
        else s.cg = q, s.guessed.cg = false;
      }
    };
    canvas.onpointerdown = (e) => {
      const p = pos(e);
      const what = pick(p);
      if (what) {
        drag = { what, moved: false };
        canvas.setPointerCapture(e.pointerId);
        canvas.style.cursor = "grabbing";
      } else {
        set(s.mode, p);
        redraw();
      }
    };
    canvas.onpointermove = (e) => {
      if (!drag) return;
      drag.moved = true;
      const p = pos(e);
      set(drag.what, p);
      redraw();
      const lc = loupe.getContext("2d");
      loupe.style.display = "block";
      const half = 38 * (canvas.width / 900);
      lc.drawImage(canvas, p.x - half, p.y - half, half * 2, half * 2, 0, 0, loupe.width, loupe.height);
      lc.strokeStyle = "#ff4fd8";
      lc.lineWidth = 1.5;
      lc.beginPath();
      lc.moveTo(loupe.width / 2, 0);
      lc.lineTo(loupe.width / 2, loupe.height);
      lc.moveTo(0, loupe.height / 2);
      lc.lineTo(loupe.width, loupe.height / 2);
      lc.stroke();
    };
    const end = () => {
      drag = null;
      canvas.style.cursor = "grab";
      loupe.style.display = "none";
    };
    canvas.onpointerup = end;
    canvas.onpointercancel = end;
  }
  function redraw() {
    if (!st) return;
    const s = st;
    s.papText = { over: $("bs-over").value, up: $("bs-up").value };
    s.hand = $("bs-hand").value;
    const canvas = $("bs-canvas");
    const ctx2 = canvas.getContext("2d");
    ctx2.drawImage(s.img, 0, 0);
    const k2 = canvas.width / 900;
    ctx2.lineWidth = 3 * k2;
    ctx2.strokeStyle = "#46e6ff";
    ctx2.beginPath();
    ctx2.arc(s.circle.x, s.circle.y, s.circle.r, 0, 7);
    ctx2.stroke();
    ctx2.lineWidth = 2 * k2;
    ctx2.beginPath();
    ctx2.moveTo(s.circle.x - 9 * k2, s.circle.y);
    ctx2.lineTo(s.circle.x + 9 * k2, s.circle.y);
    ctx2.moveTo(s.circle.x, s.circle.y - 9 * k2);
    ctx2.lineTo(s.circle.x, s.circle.y + 9 * k2);
    ctx2.stroke();
    ctx2.fillStyle = "#46e6ff";
    ctx2.beginPath();
    ctx2.arc(s.circle.x + s.circle.r, s.circle.y, 8 * k2, 0, 7);
    ctx2.fill();
    s.marks.forEach((m2) => {
      ctx2.strokeStyle = "rgba(255,210,90,.9)";
      ctx2.lineWidth = 2 * k2;
      ctx2.setLineDash([4 * k2, 3 * k2]);
      ctx2.beginPath();
      ctx2.arc(m2.x, m2.y, 16 * k2, 0, 7);
      ctx2.stroke();
      ctx2.setLineDash([]);
    });
    const mark = (p, color, label2) => {
      if (!p) return;
      ctx2.strokeStyle = color;
      ctx2.fillStyle = color;
      ctx2.lineWidth = 3 * k2;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, 10 * k2, 0, 7);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, 2.5 * k2, 0, 7);
      ctx2.fill();
      ctx2.font = `700 ${18 * k2}px system-ui`;
      ctx2.lineWidth = 4 * k2;
      ctx2.strokeStyle = "rgba(0,0,0,.8)";
      ctx2.strokeText(label2, p.x + 14 * k2, p.y - 10 * k2);
      ctx2.fillText(label2, p.x + 14 * k2, p.y - 10 * k2);
    };
    if (s.showHoles) {
      mark(s.noThumb ? null : s.thumb, COLOR.thumb, "thumb");
      mark(s.fingerA, COLOR.fingerA, "finger 1");
      mark(s.fingerB, COLOR.fingerB, "finger 2");
    }
    mark(s.pin, COLOR.pin, s.guessed.pin ? "PIN (my guess)" : "PIN");
    mark(s.cg, COLOR.cg, s.guessed.cg ? "CG (my guess)" : "CG");
    mark(s.asym ? s.mb : null, COLOR.mb, s.guessed.mb ? "MB (my guess)" : "MB");
    const over = parseInches(s.papText.over), up = parseInches(s.papText.up);
    const out = $("bs-out");
    const need = [];
    if (!s.fingerA || !s.fingerB) need.push("both finger holes");
    if (!s.noThumb && !s.thumb) need.push("the thumb hole");
    if (!s.pin) need.push("the pin");
    if (over === null) need.push("your PAP (over)");
    if (up === null && s.papText.up.trim() !== "") need.push("your PAP (up)");
    if (need.length) {
      out.innerHTML = `<div class="card"><div class="u">Still needed: ${esc(need.join(", "))}. Pick it above and tap the ball.</div></div>`;
      return;
    }
    const grip = { ...DEFAULT_GRIP, ...S.profile?.fit ?? {}, noThumb: s.noThumb };
    const pap = { over, up: up ?? 0 };
    const res = layoutFromScan({ circle: s.circle, thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB, pin: s.pin, cg: s.cg, mb: s.asym ? s.mb : null, asymmetric: s.asym, pap, hand: s.hand, grip, holeRadii: s.holeR ? { finger: s.holeR, thumb: s.holeR } : void 0 });
    const m = res.measured;
    const neg = (v, f) => (v < 0 ? "\u2212" : "") + f(Math.abs(v));
    const deg2 = (v) => `${Math.round(v * 10) / 10}\xB0`;
    out.innerHTML = `
    <div class="card"><div class="k">Your layout, read from the photo</div>
      <table>
        <tr><td>Pin to PAP</td><td class="n"><b>${fractionInches(m.pinToPap)}</b></td></tr>
        <tr><td>Angle to the VAL</td><td class="n"><b>${neg(m.valAngle, deg2)}</b></td></tr>
        <tr><td>Pin buffer</td><td class="n"><b>${neg(m.pinBuffer, fractionInches)}</b></td></tr>
        <tr><td>Pin to center of grip</td><td class="n"><b>${fractionInches(m.pinToGrip)}</b></td></tr>
        <tr><td>Drilling angle</td><td class="n"><b>${m.drilling === null ? s.asym ? "place the mass bias dot" : "place the CG dot" : neg(m.drilling, deg2)}</b></td></tr>
        <tr><td>PSA to PAP</td><td class="n"><b>${m.psaToPap === null ? s.asym ? "place the mass bias dot" : "place the CG dot" : fractionInches(m.psaToPap)}</b></td></tr>
        ${res.cg ? `<tr><td colspan="2"><b>CG</b> (every ball has one)</td></tr><tr><td>Pin to CG</td><td class="n">${fractionInches(res.cg.fromPin)}</td></tr><tr><td>CG to PAP</td><td class="n">${fractionInches(res.cg.toPap)}</td></tr><tr><td>CG angle from the pin</td><td class="n">${neg(res.cg.angleAtPin, deg2)}</td></tr>` : `<tr><td colspan="2"><b>CG</b>: place the CG dot</td></tr>`}
        ${s.asym ? res.mb ? `<tr><td colspan="2"><b>Mass bias</b> (a separate mark)</td></tr><tr><td>Pin to mass bias</td><td class="n">${fractionInches(res.mb.fromPin)}</td></tr><tr><td>Mass bias to PAP</td><td class="n">${fractionInches(res.mb.toPap)}</td></tr><tr><td>Mass bias angle from the pin</td><td class="n">${neg(res.mb.angleAtPin, deg2)}</td></tr>` : `<tr><td colspan="2"><b>Mass bias</b>: place the mass bias dot</td></tr>` : ""}
        <tr><td>Where the pin sits</td><td class="n">${esc(m.pinPlacement.label)}</td></tr>
        ${res.spanIn !== null ? `<tr><td>Span (rough, from the holes)</td><td class="n">${fractionInches(res.spanIn)}</td></tr>` : ""}</table>
      ${m.drilling !== null && m.psaToPap !== null ? `<div class="u" style="margin-top:8px"><b>Dual Angle:</b> ${neg(m.drilling, (x) => Math.round(x) + "\xB0")} \xD7 ${fractionInches(m.pinToPap)} \xD7 ${neg(m.valAngle, (x) => Math.round(x) + "\xB0")} &nbsp; <b>Pin Buffer:</b> ${fractionInches(m.pinToPap)} \xD7 ${fractionInches(m.psaToPap)} \xD7 ${neg(m.pinBuffer, fractionInches)} &nbsp; <b>2LS:</b> ${fractionInches(m.pinToPap)} \xD7 ${fractionInches(m.psaToPap)} \xD7 ${fractionInches(m.pinToGrip)}</div>` : `<div class="u" style="margin-top:8px">The drilling angle and PSA to PAP need a line from the pin through ${s.asym ? "the mass bias" : "the CG"}. Place that dot if your ball has one.</div>`}
      ${res.warnings.map((w) => `<div class="note" style="color:var(--gold)">${esc(w)}</div>`).join("")}
      <div class="note">A careful photo reads distances to about an eighth to a quarter inch and angles to a few degrees, if the outline fits the ball and the points are on the right spots. Check against the ball's drill sheet before relying on it. Negative angles and distances mean the other side of the line.</div>
      <div class="chips">${m.drilling !== null ? `<button class="btn" id="bs-open">Open in the Layout Lab</button>` : ""}</div></div>`;
    const open2 = document.getElementById("bs-open");
    if (open2)
      open2.onclick = () => {
        close();
        const frame2 = scanFrame({ circle: s.circle, thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB });
        const keepImg = document.createElement("canvas");
        keepImg.width = s.img.width;
        keepImg.height = s.img.height;
        keepImg.getContext("2d").drawImage(s.img, 0, 0);
        openLayoutLab({ marks: { symmetric: !s.asym, pinToCg: res.pinToCg ?? void 0, mb: res.pinToMb !== null ? { dist: res.pinToMb, angle: 0 } : void 0 }, photo: { img: keepImg, circle: s.circle, ...frame2 }, layout: { dualAngle: { drilling: m.drilling, pinToPap: m.pinToPap, valAngle: m.valAngle }, pap, hand: s.hand } });
      };
  }
  function saveExample() {
    if (!st) return;
    const s = st;
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dl = (blob, name) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
    };
    const body = { app: "LaneIQ ball scan", at: (/* @__PURE__ */ new Date()).toISOString(), kind: s.kind, hand: s.hand, size: { w: s.img.width, h: s.img.height }, circle: s.circle, otherOutlines: s.outlines, holes: { thumb: s.noThumb ? null : s.thumb, fingerA: s.fingerA, fingerB: s.fingerB }, pin: s.pin, cg: s.cg, massBias: s.asym ? s.mb : null, asymmetric: s.asym, dotsFound: s.marks, guessedByApp: s.guessed, pap: s.papText };
    dl(new Blob([JSON.stringify(body, null, 1)], { type: "application/json" }), `laneiq-scan-${stamp}.json`);
    setTimeout(() => s.img.toBlob((b) => b && dl(b, `laneiq-scan-${stamp}.jpg`), "image/jpeg", 0.92), 500);
    $("bs-save").textContent = "Saved to your downloads";
  }

  // camera/layoutlab.ts
  var IDENT = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  var view = IDENT;
  var lab = null;
  var solved = null;
  var flare = null;
  var sheet2 = () => $("lab");
  var close2 = () => (sheet2().classList.remove("on"), sheet2().innerHTML = "");
  var fmt2 = (v, d = 2) => (Math.round(v * 10 ** d) / 10 ** d).toString();
  var mul = (a, b) => a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
  var apply = (m, v) => [m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2], m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2], m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]];
  var rotX = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  var rotY = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  function facing(p) {
    const f = unit(p);
    const ref = Math.abs(f[1]) > 0.97 ? [0, 0, 1] : [0, 1, 0];
    const right = unit(cross(ref, f));
    const up = cross(f, right);
    return [right, up, f];
  }
  function fromCatalog(b, weightLb) {
    const sym = b.coreSymmetry?.value !== "asymmetric";
    const lb = weightLb ?? b.specWeightLb?.value;
    const sp = lb ? specForWeight(b, lb) : { rg: b.rg?.value, differential: b.differential?.value, intermediateDifferential: b.intermediateDifferential?.value, exact: false };
    return { name: b.name, manufacturer: b.manufacturer, rg: sp.rg ?? 2.52, totalDiff: sp.differential ?? 0.04, intDiff: sym ? 0 : sp.intermediateDifferential ?? 0, symmetric: sym, colorway: b.colorway?.value, catalogKey: b.key, weights: b.weightSpecs?.value, weightLb: sp.exact ? lb : b.specWeightLb?.value };
  }
  function startingLab(ball, layout) {
    const bp = bowlerProfile();
    const p = S.profile;
    const pap = (p?.spin?.pap ? parsePap(p.spin.pap) : null) ?? { over: 4.25, up: 0.5 };
    const noThumb = bp.style === "two-handed" || bp.style === "one-hand-no-thumb";
    const grip = { ...DEFAULT_GRIP, ...p?.fit ?? {}, noThumb };
    const sug = suggestDualAngle(bp, null, ball.totalDiff);
    return {
      ball,
      system: "dual",
      dual: { drilling: sug.drilling, pinToPap: sug.pinToPap, valAngle: sug.valAngle },
      pb: { pinToPap: 4.5, psaToPap: 4, pinBuffer: 2 },
      ls2: { pinToPap: 4.5, psaToPap: 4, pinToGrip: 3.375 },
      pap,
      grip,
      hand: bp.hand,
      rev: bp.revRpm ?? 380,
      speed: bp.launchSpeed ?? 16,
      flip: false,
      show: { val: true, buffer: true, track: true, flare: true, labels: true, photo: true },
      photo: null,
      notes: "",
      compare: null,
      ...layout
    };
  }
  var layoutOf = (l) => l.system === "dual" ? { system: "dual", ...l.dual } : l.system === "pinbuffer" ? { system: "pinbuffer", ...l.pb } : { system: "2ls", ...l.ls2 };
  function recompute() {
    if (!lab) return;
    solved = solveLayout(layoutOf(lab), lab.pap, lab.hand, lab.grip, lab.flip);
    flare = solved.ok ? simulateFlare({ points: solved.points, core: { rg: lab.ball.rg, totalDiff: lab.ball.totalDiff, intDiff: lab.ball.intDiff }, revRpm: lab.rev, speedMph: lab.speed }) : null;
  }
  var BASE_COLORS = [[/black|onyx|coal|jet/, 230, 8], [/purple|violet|plum/, 275, 45], [/blue|navy|cobalt|sapphire|ocean/, 215, 55], [/teal|aqua|cyan|turquoise/, 180, 50], [/green|emerald|lime|jade/, 140, 45], [/red|crimson|ruby|cherry|maroon/, 355, 55], [/orange|copper|bronze/, 25, 60], [/gold|yellow|amber/, 45, 60], [/pink|magenta|orchid/, 320, 50], [/silver|grey|gray|steel|graphite|smoke|white|ivory/, 220, 8]];
  function ballColor(l) {
    const c = (l.colorway ?? "").toLowerCase();
    for (const [re, h, s] of BASE_COLORS) if (re.test(c)) return { h, s };
    return { h: 215, s: 35 };
  }
  function circlePts(p, dir, n = 120) {
    return Array.from({ length: n + 1 }, (_, i) => rotate(p, unit(cross(p, dir)), 2 * Math.PI * i / n));
  }
  function arcPts(from, to, n = 40) {
    const a = Math.acos(Math.max(-1, Math.min(1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2])));
    const axis = unit(cross(from, to));
    return Array.from({ length: n + 1 }, (_, i) => rotate(from, axis, a * i / n));
  }
  function drawBall(canvas, l, s, f, m, opts = {}) {
    const ctx2 = canvas.getContext("2d");
    const W2 = canvas.width, H3 = canvas.height;
    const cx = W2 / 2, cy = H3 / 2, r = Math.min(W2, H3) * 0.44;
    ctx2.clearRect(0, 0, W2, H3);
    const proj = (v) => {
      const p = apply(m, v);
      return { x: cx + p[0] * r, y: cy - p[1] * r, z: p[2] };
    };
    const col = ballColor(l.ball);
    const g = ctx2.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, `hsl(${col.h},${col.s}%,${col.s < 15 ? 38 : 46}%)`);
    g.addColorStop(1, `hsl(${col.h},${col.s}%,${col.s < 15 ? 8 : 14}%)`);
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(cx, cy, r, 0, 7);
    ctx2.fill();
    if (l.photo && l.show.photo) drawPhotoSphere(ctx2, cx, cy, r, l.photo, m);
    ctx2.strokeStyle = "rgba(255,255,255,.22)";
    ctx2.lineWidth = 1.5;
    ctx2.stroke();
    const strokePath = (pts2, color, width, dash = [], alpha = 1) => {
      ctx2.save();
      ctx2.strokeStyle = color;
      ctx2.lineWidth = width;
      ctx2.setLineDash(dash);
      ctx2.globalAlpha = alpha;
      ctx2.lineCap = "round";
      ctx2.beginPath();
      let pen = false;
      for (const v of pts2) {
        const p = proj(v);
        if (p.z <= 0.02) {
          pen = false;
          continue;
        }
        if (pen) ctx2.lineTo(p.x, p.y);
        else ctx2.moveTo(p.x, p.y);
        pen = true;
      }
      ctx2.stroke();
      ctx2.restore();
    };
    const dot5 = (v, color, label2, size = 6, dy = -10) => {
      const p = proj(v);
      if (p.z <= 0.02) return;
      ctx2.save();
      ctx2.fillStyle = color;
      ctx2.strokeStyle = "#05070d";
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, size, 0, 7);
      ctx2.fill();
      ctx2.stroke();
      if ((opts.labels ?? l.show.labels) && label2) {
        ctx2.font = `700 ${Math.round(r * 0.075)}px system-ui`;
        ctx2.lineWidth = 3;
        ctx2.strokeStyle = "rgba(5,7,13,.85)";
        ctx2.strokeText(label2, p.x + size + 3, p.y + dy + 12);
        ctx2.fillStyle = color;
        ctx2.fillText(label2, p.x + size + 3, p.y + dy + 12);
      }
      ctx2.restore();
    };
    const pts = s.points;
    const hole = (center, dia) => {
      const north = unit(cross(cross(center, [0, 1, 0]), center));
      const poly2 = Array.from({ length: 28 }, (_, i) => walk(center, rotate(Math.abs(center[1]) > 0.98 ? [1, 0, 0] : north, center, 2 * Math.PI * i / 28), dia / 2));
      const ps = poly2.map(proj);
      if (ps.every((p) => p.z <= 0.02)) return;
      ctx2.save();
      ctx2.beginPath();
      ps.forEach((p, i) => i ? ctx2.lineTo(p.x, p.y) : ctx2.moveTo(p.x, p.y));
      ctx2.closePath();
      ctx2.fillStyle = "#05070d";
      ctx2.fill();
      ctx2.strokeStyle = "rgba(255,255,255,.35)";
      ctx2.lineWidth = 1.5;
      ctx2.stroke();
      ctx2.restore();
    };
    if (l.show.track) {
      strokePath(trackRing(pts.pap), "rgba(90,255,176,.9)", 2.2, [6, 4]);
      if (f && l.show.flare) {
        f.checkpoints.forEach((c, i) => strokePath(trackRing(c.axis), `hsl(${190 + i * 40},90%,65%)`, 1.6, [], 0.35 + 0.15 * i));
        strokePath(f.path, "#ffd25a", 3);
      }
    }
    if (l.show.val) {
      strokePath(circlePts(pts.pap, pts.valUp), "rgba(255,255,255,.55)", 1.6, [10, 6]);
      if (l.show.buffer && s.eq.pinbuffer.pinBuffer > 0.05) {
        const ring = Array.from({ length: 73 }, (_, i) => walk(pts.pin, rotate(unit(cross(cross(pts.pin, [0, 1, 0]), pts.pin)), pts.pin, 2 * Math.PI * i / 72), s.eq.pinbuffer.pinBuffer));
        strokePath(ring, "rgba(255,210,90,.8)", 1.4, [3, 3]);
      }
    }
    strokePath(circlePts(pts.grip, [0, 1, 0]), "rgba(255,255,255,.28)", 1.2, [3, 5]);
    strokePath(arcPts(pts.pap, pts.pin), "#46e6ff", 2.4);
    strokePath(arcPts(pts.pin, pts.psa), "#ff4fd8", 2.4);
    strokePath(arcPts(pts.psa, pts.pap), "rgba(255,79,216,.45)", 1.4, [4, 4]);
    if (!(l.photo && l.show.photo)) {
      if (pts.thumb) hole(pts.thumb, l.grip.thumbDia);
      hole(pts.middle, l.grip.fingerDia);
      hole(pts.ring, l.grip.fingerDia);
    }
    dot5(pts.grip, "#ffffff", "grip center", 4, -4);
    dot5(pts.pap, "#5affb0", "PAP", 7);
    dot5(pts.pin, "#46e6ff", "PIN (low RG)", 7);
    dot5(pts.psa, "#ff4fd8", l.ball.symmetric ? "PSA (CG line)" : "PSA (high RG)", 7);
    dot5(pts.inter, "rgba(255,255,255,.7)", "intermediate", 4, -4);
    if (l.ball.pinToCg !== void 0 && l.ball.pinToCg > 0) {
      const cg = walk(pts.pin, unit(cross(cross(pts.pin, pts.psa), pts.pin)), Math.min(QUARTER, l.ball.pinToCg));
      dot5(cg, "#ffd25a", "CG", 6);
    }
    if (l.ball.mb && !l.ball.symmetric) {
      const base = unit(cross(cross(pts.pin, pts.psa), pts.pin));
      const d = rotate(base, pts.pin, l.ball.mb.angle * Math.PI / 180);
      dot5(walk(pts.pin, d, Math.min(QUARTER, l.ball.mb.dist)), "#ff8a3d", "MB", 6);
    }
    ctx2.fillStyle = "rgba(255,255,255,.35)";
    ctx2.font = `${Math.round(r * 0.06)}px system-ui`;
    ctx2.fillText("drag to turn the ball", 10, H3 - 10);
  }
  function drawPhotoSphere(ctx2, cx, cy, r, ph, m) {
    if (!ph.pixels) ph.pixels = ph.img.getContext("2d").getImageData(0, 0, ph.img.width, ph.img.height);
    const src = ph.pixels;
    const size = Math.max(2, Math.round(r * 2));
    const out = ctx2.createImageData(size, size);
    for (let py = 0; py < size; py++)
      for (let px = 0; px < size; px++) {
        const nx = (px + 0.5 - size / 2) / (size / 2), ny = (size / 2 - py - 0.5) / (size / 2);
        const rr = nx * nx + ny * ny;
        if (rr >= 1) continue;
        const nz = Math.sqrt(1 - rr);
        const bx = m[0][0] * nx + m[1][0] * ny + m[2][0] * nz, by = m[0][1] * nx + m[1][1] * ny + m[2][1] * nz, bz = m[0][2] * nx + m[1][2] * ny + m[2][2] * nz;
        const cxv = ph.ex[0] * bx + ph.up[0] * by + ph.g[0] * bz, cyv = ph.ex[1] * bx + ph.up[1] * by + ph.g[1] * bz, czv = ph.ex[2] * bx + ph.up[2] * by + ph.g[2] * bz;
        const o = (py * size + px) * 4;
        if (czv > 0.03) {
          const sx = Math.min(src.width - 1, Math.max(0, Math.round(ph.circle.x + cxv * ph.circle.r))), sy = Math.min(src.height - 1, Math.max(0, Math.round(ph.circle.y - cyv * ph.circle.r)));
          const s = (sy * src.width + sx) * 4;
          out.data[o] = src.data[s];
          out.data[o + 1] = src.data[s + 1];
          out.data[o + 2] = src.data[s + 2];
          out.data[o + 3] = 255;
        } else {
          out.data[o] = 16;
          out.data[o + 1] = 20;
          out.data[o + 2] = 30;
          out.data[o + 3] = 255;
        }
      }
    ctx2.putImageData(out, Math.round(cx - size / 2), Math.round(cy - size / 2));
  }
  var numInput = (id, v, label2, hint = "") => `<div class="field"><label>${label2}</label><input id="${id}" value="${esc(fractionInches(v).replace(/"/g, ""))}" inputmode="decimal" autocomplete="off">${hint ? `<div class="note">${hint}</div>` : ""}</div>`;
  var degInput = (id, v, label2) => `<div class="field"><label>${label2}</label><input id="${id}" value="${Math.round(v)}" inputmode="decimal" autocomplete="off"></div>`;
  function openLayoutLab(opts = {}) {
    const { dualAngle, ...rest } = opts.layout ?? {};
    const found = opts.catalogKey ? S.catalog.find((c) => c.key === opts.catalogKey) : void 0;
    const first = found ? fromCatalog(found) : (() => {
      const mine = S.arsenal.map((b) => b.catalogKey ? S.catalog.find((c) => c.key === b.catalogKey) : void 0).find((c) => c && c.rg && c.differential);
      return mine ? fromCatalog(mine, S.arsenal.find((a) => a.catalogKey === mine.key)?.weightLb) : { name: "Sample ball", rg: 2.52, totalDiff: 0.045, intDiff: 0, symmetric: true };
    })();
    lab = startingLab(first, { ...rest, ...dualAngle ? { dual: dualAngle, system: "dual" } : {} });
    if (opts.photo) lab.photo = opts.photo;
    if (opts.marks) {
      lab.ball = { ...lab.ball, symmetric: opts.marks.symmetric, pinToCg: opts.marks.pinToCg, mb: opts.marks.symmetric ? void 0 : opts.marks.mb };
      if (opts.marks.symmetric) lab.ball.intDiff = 0;
    }
    view = facing([0, 0, 1]);
    if (opts.sheetId) return loadSheet(opts.sheetId);
    draw2();
  }
  function draw2() {
    if (!lab) return;
    const el = sheet2();
    el.classList.add("on");
    const l = lab;
    const mine = S.arsenal.map((b) => ({ b, c: b.catalogKey ? S.catalog.find((c) => c.key === b.catalogKey) : void 0 })).filter((x) => !!x.c && !!x.c.rg && !!x.c.differential);
    const sheets = S.profile?.sheets ?? [];
    el.innerHTML = `
    <div class="row"><h2>Layout Lab</h2><button class="btn ghost" id="lb-close">Close</button></div>
    <div class="note">See where a layout puts the pin, the PSA and the grip on the ball, and how the spin axis would wander across it. For planning and for showing a customer. The drilling sheet from the ball's maker and your driller's checks come first.</div>

    <div class="card">
      <div class="k">Ball</div>
      <div class="chips"><button class="btn ghost" id="lb-scan">Scan my drilled ball to read its layout</button></div>
      ${mine.length ? `<div class="field"><label>From my arsenal</label><select id="lb-mine"><option value="">choose\u2026</option>${mine.map((x) => `<option value="${esc(x.c.key)}">${esc(x.b.name)}</option>`).join("")}</select></div>` : ""}
      <div class="field"><label>Or search the catalog</label><input id="lb-search" placeholder="Type a ball name" autocomplete="off"><div class="suggest" id="lb-hits"></div></div>
      <div class="u"><b>${esc(l.ball.manufacturer ? l.ball.manufacturer + " " : "")}${esc(l.ball.name)}</b>${l.ball.weightLb ? ` (${l.ball.weightLb} lb)` : ""}: RG ${fmt2(l.ball.rg, 3)}, differential ${fmt2(l.ball.totalDiff, 3)}${l.ball.symmetric ? ", symmetric core" : `, asymmetric core (intermediate ${fmt2(l.ball.intDiff, 3)})`}</div>
      ${l.ball.weights && l.ball.weights.length > 1 ? `<div class="k" style="margin-top:6px">Ball weight (its RG and differential change with weight)</div><div class="chips">${l.ball.weights.map((w) => `<button class="chip ${w.lb === l.ball.weightLb ? "sel" : ""}" data-wt="${w.lb}">${w.lb} lb</button>`).join("")}</div>` : l.ball.weightLb ? `<div class="note">Specs are for the ${l.ball.weightLb} lb ball; other weights aren't published for this one.</div>` : ""}
      <div class="chips"><button class="chip ${l.ball.symmetric ? "" : "sel"}" id="lb-asym">Mass bias: ${l.ball.symmetric ? "off (symmetric ball)" : "on (asymmetric ball)"}</button></div>
      <div class="two"><div class="field"><label>Pin to CG (in)</label><input id="lb-cg" value="${l.ball.pinToCg ?? ""}" placeholder="from the layout sheet" inputmode="decimal"></div>${l.ball.symmetric ? "" : `<div class="field"><label>Mass bias: in from pin, \xB0 from pin-to-PSA</label><div class="two"><input id="lb-mbd" value="${l.ball.mb?.dist ?? ""}" placeholder="in" inputmode="decimal"><input id="lb-mba" value="${l.ball.mb?.angle ?? ""}" placeholder="\xB0" inputmode="decimal"></div></div>`}</div>
      ${l.ball.symmetric ? "" : `<div class="field"><label>Intermediate differential</label><input id="lb-int" value="${fmt2(l.ball.intDiff, 3)}" inputmode="decimal"></div>`}
      <div class="note">CG and mass bias positions are on the manufacturer's layout sheet for the ball. They aren't in the catalog, so enter them to see them on the ball.</div>
    </div>

    <div class="card">
      <div class="k">The ball, with your layout</div>
      <div class="stagebox"><canvas id="lb-canvas" width="720" height="720" style="width:100%;height:auto;aspect-ratio:1;touch-action:none;cursor:grab"></canvas></div>
      <div class="chips"><button class="chip" data-view="grip">Grip view</button><button class="chip" data-view="pap">PAP view</button><button class="chip" data-view="pin">Pin view</button><button class="chip" data-view="psa">PSA view</button><button class="chip" data-view="back">Back</button></div>
      <div class="chips">${["val", "buffer", "track", "flare", "labels", ...l.photo ? ["photo"] : []].map((k2) => `<button class="chip ${l.show[k2] ? "sel" : ""}" data-show="${k2}">${{ val: "VAL", buffer: "Pin buffer", track: "Track", flare: "Flare", labels: "Labels", photo: "My photo" }[k2]}</button>`).join("")}</div>
      <div class="note"><span style="color:#46e6ff">Cyan: pin to PAP</span> \xB7 <span style="color:#ff4fd8">Magenta: pin to PSA</span> \xB7 <span style="color:#5affb0">Green: PAP and the first track</span> \xB7 <span style="color:#ffd25a">Gold: where the spin axis wanders</span></div>
    </div>

    <div class="card">
      <div class="k">Layout system</div>
      <div class="chips">${["dual", "pinbuffer", "2ls"].map((k2) => `<button class="chip ${l.system === k2 ? "sel" : ""}" data-sys="${k2}">${{ dual: "Dual Angle", pinbuffer: "Pin Buffer (VLS)", "2ls": "2LS" }[k2]}</button>`).join("")}</div>
      <div id="lb-fields">${fields(l)}</div>
      <div class="chips"><button class="chip ${l.flip ? "sel" : ""}" id="lb-flip">Flip PSA to the other side</button><button class="chip" id="lb-suggest">Suggest a layout for me</button></div>
      <div class="note" id="lb-problems"></div>
    </div>

    <div class="card">
      <div class="k">Hand and grip</div>
      <div class="two"><div class="field"><label>Hand</label><select id="lb-hand"><option value="R" ${l.hand === "R" ? "selected" : ""}>Right</option><option value="L" ${l.hand === "L" ? "selected" : ""}>Left</option></select></div><div class="field"><label>Rev rate (RPM)</label><input id="lb-rev" value="${Math.round(l.rev)}" inputmode="numeric"></div></div>
      <div class="two"><div class="field"><label>Ball speed (mph)</label><input id="lb-speed" value="${fmt2(l.speed, 1)}" inputmode="decimal"></div><div class="field"><label>PAP over / up (in, negative: other side / down)</label><div class="two"><input id="lb-pover" value="${esc(fractionInches(l.pap.over).replace(/"/g, ""))}"><input id="lb-pup" value="${esc(fractionInches(l.pap.up).replace(/"/g, ""))}"></div></div></div>
      <div class="two"><div class="field"><label>Span (in)</label><input id="lb-span" value="${esc(fractionInches(l.grip.span).replace(/"/g, ""))}" ${l.grip.noThumb ? "disabled" : ""}></div><div class="field"><label>Bridge (in)</label><input id="lb-bridge" value="${esc(fractionInches(l.grip.bridge).replace(/"/g, ""))}"></div></div>
      <div class="two"><div class="field"><label>Thumb hole (in)</label><input id="lb-thumb" value="${esc(fractionInches(l.grip.thumbDia).replace(/"/g, ""))}" ${l.grip.noThumb ? "disabled" : ""}></div><div class="field"><label>Finger holes (in)</label><input id="lb-finger" value="${esc(fractionInches(l.grip.fingerDia).replace(/"/g, ""))}"></div></div>
      <div class="note">You can type fractions: 4 1/4, 3-3/8, 0.5. The PAP is over (across the grip) and up (toward the fingers), measured from the center of the grip. ${l.grip.noThumb ? "Your profile says no thumb hole, so only finger holes are drawn." : ""}</div>
      <div class="chips"><button class="chip" id="lb-savefit">Save my hand and PAP to my profile</button></div>
    </div>

    <div id="lb-out"></div>

    <div class="card"><div class="k">Pro shop tools</div>
      <div class="field"><label>Notes for the drill sheet</label><textarea id="lb-notes" rows="2" style="width:100%">${esc(l.notes)}</textarea></div>
      <div class="chips"><button class="btn" id="lb-sheet">Drill sheet (print or save PDF)</button><button class="btn ghost" id="lb-save">Save this layout</button><button class="btn ghost" id="lb-a">Hold this as A to compare</button></div>
      ${sheets.length ? `<div class="k" style="margin-top:10px">Saved layouts for ${esc(S.profile?.name ?? "this profile")}</div>${sheets.map((x) => `<div class="row" style="padding:6px 0;border-top:1px solid var(--line)"><div><b>${esc(x.ball.name)}</b> <span class="note">${esc(x.layoutText)} \xB7 ${esc(new Date(x.at).toLocaleDateString())}</span></div><div><button class="chip" data-load="${x.id}">Open</button><button class="chip danger" data-del="${x.id}">Delete</button></div></div>`).join("")}` : ""}
    </div>`;
    wire();
    recompute();
    update();
  }
  function fields(l) {
    if (l.system === "dual") return `<div class="two">${degInput("lb-drill", l.dual.drilling, "Drilling angle (negative: PSA on the other side)")}${degInput("lb-val", l.dual.valAngle, "Angle to the VAL (negative: pin past the VAL)")}</div>${numInput("lb-pin", l.dual.pinToPap, "Pin to PAP (in)", "Controls how much of the ball's flare potential the layout uses.")}`;
    if (l.system === "pinbuffer") return `${numInput("lb-pin", l.pb.pinToPap, "Pin to PAP (in)")}${numInput("lb-psa", l.pb.psaToPap, "PSA to PAP (in)", "Pin to PAP plus PSA to PAP must be at least 6 3/4.")}${numInput("lb-buf", l.pb.pinBuffer, "Pin buffer (in)", "The distance from the pin to the VAL. It can't be more than pin to PAP. Negative puts the pin on the far side of the VAL.")}`;
    return `${numInput("lb-pin", l.ls2.pinToPap, "Pin to PAP (in)")}${numInput("lb-psa", l.ls2.psaToPap, "PSA to PAP (in)")}${numInput("lb-grip", l.ls2.pinToGrip, "Pin to center of grip (in)", "Measured from the center of the grip (the bridge for a no-thumb bowler).")}`;
  }
  var inch = (id) => parseInches($(id).value);
  var val = (id) => {
    const v = Number($(id).value);
    return Number.isFinite(v) && $(id).value.trim() !== "" ? v : null;
  };
  function readFields() {
    if (!lab) return;
    const l = lab;
    const set = (o, k2, v) => {
      if (v !== null) o[k2] = v;
    };
    if (l.system === "dual") {
      set(l.dual, "drilling", val("lb-drill"));
      set(l.dual, "valAngle", val("lb-val"));
      set(l.dual, "pinToPap", inch("lb-pin"));
    } else if (l.system === "pinbuffer") {
      set(l.pb, "pinToPap", inch("lb-pin"));
      set(l.pb, "psaToPap", inch("lb-psa"));
      set(l.pb, "pinBuffer", inch("lb-buf"));
    } else {
      set(l.ls2, "pinToPap", inch("lb-pin"));
      set(l.ls2, "psaToPap", inch("lb-psa"));
      set(l.ls2, "pinToGrip", inch("lb-grip"));
    }
  }
  function readHand() {
    if (!lab) return;
    const l = lab;
    l.hand = $("lb-hand").value;
    const rev = val("lb-rev"), sp = val("lb-speed");
    if (rev && rev >= 100 && rev <= 700) l.rev = rev;
    if (sp && sp >= 8 && sp <= 25) l.speed = sp;
    const over = inch("lb-pover"), up = inch("lb-pup");
    if (over !== null) l.pap.over = over;
    if (up !== null) l.pap.up = up;
    const span = inch("lb-span"), br = inch("lb-bridge"), th = inch("lb-thumb"), fi = inch("lb-finger");
    if (span !== null && span > 0) l.grip.span = span;
    if (br !== null && br >= 0) l.grip.bridge = br;
    if (th !== null && th > 0) l.grip.thumbDia = th;
    if (fi !== null && fi > 0) l.grip.fingerDia = fi;
    l.notes = $("lb-notes").value;
    const cg = val("lb-cg");
    l.ball.pinToCg = cg !== null && cg > 0 ? cg : void 0;
    const mbd = document.getElementById("lb-mbd") ? val("lb-mbd") : null, mba = document.getElementById("lb-mba") ? val("lb-mba") : null;
    l.ball.mb = !l.ball.symmetric && mbd !== null && mba !== null && mbd > 0 ? { dist: mbd, angle: mba } : void 0;
    const inter = document.getElementById("lb-int");
    if (inter && Number.isFinite(Number(inter.value))) l.ball.intDiff = Math.max(0, Number(inter.value));
  }
  function wire() {
    const l = lab;
    $("lb-close").onclick = () => (lab = null, close2());
    $("lb-scan").onclick = () => (lab = null, close2(), openBallScan());
    const refresh = () => {
      readFields();
      readHand();
      recompute();
      update();
    };
    sheet2().querySelectorAll("input, select, textarea").forEach((e) => {
      if (e.id === "lb-search" || e.id === "lb-mine") return;
      e.addEventListener("change", refresh);
    });
    $("lb-mine")?.addEventListener("change", (e) => {
      const key2 = e.target.value;
      const c = S.catalog.find((x) => x.key === key2);
      if (c) swapBall(fromCatalog(c, S.arsenal.find((a) => a.catalogKey === key2)?.weightLb));
    });
    const search = $("lb-search");
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const hits = q.length < 2 ? [] : S.catalog.filter((c) => c.rg && c.differential && `${c.manufacturer} ${c.name}`.toLowerCase().includes(q)).slice(0, 6);
      $("lb-hits").innerHTML = hits.map((c) => `<button class="chip" data-k="${esc(c.key)}">${esc(c.manufacturer)} ${esc(c.name)}</button>`).join("");
      $("lb-hits").querySelectorAll("[data-k]").forEach((b) => b.onclick = () => swapBall(fromCatalog(S.catalog.find((c) => c.key === b.dataset.k))));
    });
    sheet2().querySelectorAll("[data-sys]").forEach((b) => b.onclick = () => switchSystem(b.dataset.sys));
    sheet2().querySelectorAll("[data-show]").forEach((b) => b.onclick = () => (l.show[b.dataset.show] = !l.show[b.dataset.show], b.classList.toggle("sel"), update(true)));
    sheet2().querySelectorAll("[data-view]").forEach((b) => b.onclick = () => faceView(b.dataset.view));
    sheet2().querySelectorAll("[data-wt]").forEach((b) => b.onclick = () => {
      readFields();
      readHand();
      const row = l.ball.weights?.find((w) => w.lb === Number(b.dataset.wt));
      if (!row) return;
      l.ball.weightLb = row.lb;
      l.ball.rg = row.rg;
      l.ball.totalDiff = row.differential;
      if (!l.ball.symmetric) l.ball.intDiff = row.intermediateDifferential ?? l.ball.intDiff;
      draw2();
    });
    $("lb-asym")?.addEventListener("click", () => {
      readFields();
      readHand();
      l.ball.symmetric = !l.ball.symmetric;
      if (l.ball.symmetric) l.ball.intDiff = 0, l.ball.mb = void 0;
      draw2();
    });
    $("lb-flip").onclick = () => (l.flip = !l.flip, $("lb-flip").classList.toggle("sel"), recompute(), update());
    $("lb-suggest").onclick = () => {
      const bp = bowlerProfile();
      const sug = suggestDualAngle({ ...bp, revRpm: l.rev, launchSpeed: l.speed }, null, l.ball.totalDiff);
      l.system = "dual";
      l.dual = { drilling: sug.drilling, pinToPap: sug.pinToPap, valAngle: sug.valAngle };
      draw2();
      $("lb-problems").innerHTML = `<b>Suggested starting layout:</b> ${esc(sug.why.join(" "))}`;
    };
    $("lb-savefit").onclick = () => {
      readHand();
      updateProfile({ fit: { span: l.grip.span, thumbDia: l.grip.thumbDia, fingerDia: l.grip.fingerDia, bridge: l.grip.bridge }, spin: { ...S.profile?.spin ?? { source: "entered", at: (/* @__PURE__ */ new Date()).toISOString() }, pap: `${fractionInches(l.pap.over).replace(/"/g, "")} over, ${fractionInches(Math.abs(l.pap.up)).replace(/"/g, "")} ${l.pap.up < 0 ? "down" : "up"}`, source: "entered", at: (/* @__PURE__ */ new Date()).toISOString() } });
      $("lb-savefit").textContent = "Saved to your profile";
    };
    $("lb-sheet").onclick = () => (readHand(), openDrillSheet());
    $("lb-save").onclick = () => {
      readFields();
      readHand();
      const sh = { id: newId(), at: (/* @__PURE__ */ new Date()).toISOString(), ball: { name: l.ball.name, manufacturer: l.ball.manufacturer, rg: l.ball.rg, totalDiff: l.ball.totalDiff, intDiff: l.ball.intDiff, symmetric: l.ball.symmetric }, layoutText: layoutLine(solved), system: l.system, dual: l.dual, pb: l.pb, ls2: l.ls2, pap: l.pap, grip: { span: l.grip.span, thumbDia: l.grip.thumbDia, fingerDia: l.grip.fingerDia, bridge: l.grip.bridge }, hand: l.hand, rev: l.rev, speed: l.speed, notes: l.notes };
      updateProfile({ sheets: [sh, ...S.profile?.sheets ?? []].slice(0, 40) });
      draw2();
    };
    $("lb-a").onclick = () => {
      if (!solved || !flare) return;
      l.compare = { label: `${l.ball.name}: ${layoutLine(solved)}`, solved, flare };
      $("lb-a").textContent = "Held as A";
      update();
    };
    sheet2().querySelectorAll("[data-load]").forEach((b) => b.onclick = () => loadSheet(b.dataset.load));
    sheet2().querySelectorAll("[data-del]").forEach((b) => b.onclick = () => (updateProfile({ sheets: (S.profile?.sheets ?? []).filter((x) => x.id !== b.dataset.del) }), draw2()));
    const canvas = $("lb-canvas");
    let last = null;
    canvas.addEventListener("pointerdown", (e) => (last = { x: e.clientX, y: e.clientY }, canvas.setPointerCapture(e.pointerId)));
    canvas.addEventListener("pointermove", (e) => {
      if (!last) return;
      view = mul(mul(rotX((e.clientY - last.y) / 160), rotY((e.clientX - last.x) / 160)), view);
      last = { x: e.clientX, y: e.clientY };
      update(true);
    });
    const end = () => last = null;
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }
  function swapBall(b) {
    if (!lab) return;
    const keep = lab;
    lab = { ...startingLab(b), photo: keep.photo, system: keep.system, pap: keep.pap, grip: keep.grip, hand: keep.hand, rev: keep.rev, speed: keep.speed, dual: keep.dual, pb: keep.pb, ls2: keep.ls2, compare: keep.compare };
    draw2();
  }
  function switchSystem(sys) {
    if (!lab || !solved) return;
    readFields();
    const e = solved.eq;
    lab.pb = { pinToPap: e.pinbuffer.pinToPap, psaToPap: e.pinbuffer.psaToPap, pinBuffer: e.pinbuffer.pinBuffer };
    lab.ls2 = { pinToPap: e.ls2.pinToPap, psaToPap: e.ls2.psaToPap, pinToGrip: e.ls2.pinToGrip };
    lab.dual = { drilling: e.dual.drilling, pinToPap: e.dual.pinToPap, valAngle: e.dual.valAngle };
    lab.system = sys;
    draw2();
  }
  function faceView(which) {
    if (!solved) return;
    const p = solved.points;
    view = which === "grip" ? facing([0, 0, 1]) : which === "pap" ? facing(p.pap) : which === "pin" ? facing(p.pin) : which === "psa" ? facing(p.psa) : facing([0, 0, -1]);
    update(true);
  }
  function loadSheet(id) {
    const x = S.profile?.sheets?.find((s) => s.id === id);
    if (!x || !lab) return;
    lab = { ...lab, ball: { ...x.ball }, system: x.system, dual: x.dual, pb: x.pb, ls2: x.ls2, pap: { ...x.pap }, grip: { ...lab.grip, ...x.grip }, hand: x.hand, rev: x.rev, speed: x.speed, notes: x.notes };
    draw2();
  }
  var layoutLine = (s) => `${Math.round(s.eq.dual.drilling)}\xB0 \xD7 ${fractionInches(s.eq.dual.pinToPap)} \xD7 ${Math.round(s.eq.dual.valAngle)}\xB0`;
  function update(canvasOnly = false) {
    if (!lab || !solved) return;
    const l = lab;
    const canvas = document.getElementById("lb-canvas");
    if (canvas) drawBall(canvas, l, solved, flare, view);
    const problems = document.getElementById("lb-problems");
    if (problems && !canvasOnly) problems.textContent = solved.ok ? "" : solved.problems.join(" ");
    if (canvasOnly) return;
    const out = document.getElementById("lb-out");
    if (!out) return;
    const s = solved, e = s.eq, f = flare;
    const bp = bowlerProfile();
    const sug = suggestDualAngle({ ...bp, revRpm: l.rev, launchSpeed: l.speed }, null, l.ball.totalDiff);
    const sum = s.angleSum;
    const inRange = sum >= sug.sumRange[0] && sum <= sug.sumRange[1];
    const dom = bowlerDominance(l.rev, l.speed);
    const bar = (v, max) => `<div style="height:8px;border-radius:4px;background:rgba(255,255,255,.1)"><div style="height:8px;border-radius:4px;width:${Math.min(100, v / Math.max(0.01, max) * 100)}%;background:linear-gradient(90deg,#46e6ff,#ff4fd8)"></div></div>`;
    out.innerHTML = s.ok ? `<div class="card"><div class="k">The same layout in every system</div><table>
        <tr><td>Dual Angle</td><td class="n"><b>${Math.round(e.dual.drilling)}\xB0 \xD7 ${fractionInches(e.dual.pinToPap)} \xD7 ${Math.round(e.dual.valAngle)}\xB0</b></td></tr>
        <tr><td>Pin Buffer (VLS)</td><td class="n"><b>${fractionInches(e.pinbuffer.pinToPap)} \xD7 ${fractionInches(e.pinbuffer.psaToPap)} \xD7 ${fractionInches(e.pinbuffer.pinBuffer)}</b></td></tr>
        <tr><td>2LS</td><td class="n"><b>${fractionInches(e.ls2.pinToPap)} \xD7 ${fractionInches(e.ls2.psaToPap)} \xD7 ${fractionInches(e.ls2.pinToGrip)}</b></td></tr>
        <tr><td>Where the pin sits</td><td class="n">${esc(s.pinPlacement.label)}</td></tr>
        <tr><td>PAP to grip center</td><td class="n">${fractionInches(s.papToGrip)}</td></tr></table>
        <div class="note">All distances are along the surface of a 27 inch ball. Dual Angle is drilling angle \xD7 pin to PAP \xD7 angle to the VAL; Pin Buffer is pin to PAP \xD7 PSA to PAP \xD7 pin buffer; 2LS is pin to PAP \xD7 PSA to PAP \xD7 pin to center of grip.</div></div>
      <div class="card"><div class="k">What this ball might do (${Math.round(l.rev)} RPM, ${fmt2(l.speed, 1)} mph)</div>
        ${f ? `<div class="u"><b>Track flare after 30 ft: about ${fmt2(f.flare30In, 1)} in</b> \u2014 ${Math.round(f.usePct * 100)}% of this ball's ${fmt2(f.potential30In, 1)} in potential.</div>
          ${f.checkpoints.map((c) => `<div class="row" style="padding:4px 0"><span class="note" style="width:70px">${Math.round(c.ft)} ft</span><div style="flex:1;margin:0 8px">${bar(c.flareIn, Math.max(f.potential30In * 1.6, 0.5))}</div><span class="n">${fmt2(c.flareIn, 1)} in</span></div>`).join("")}
          <div class="u">${f.cycleRevs === null ? "This ball barely wobbles, so there's no track flare to speak of." : `The spin axis takes about ${Math.round(f.cycleRevs)} revolutions to finish one wobble (${fmt2(f.cycleRevs / (l.rev / 60), 1)} s at your rev rate): ${f.cycleRevs < 35 ? "it settles quickly, so the ball rolls earlier" : f.cycleRevs > 70 ? "it settles slowly, so the ball holds its skid longer" : "a medium settle"}.`}</div>
          <ul>${f.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</div>
      <div class="card"><div class="k">How it fits you</div>
        <div class="u">You're ${dom === "rev" ? "rev-dominant" : dom === "speed" ? "speed-dominant" : "balanced between speed and revs"}. For you the angle sum (drilling angle plus angle to the VAL) is best around ${sug.sumRange[0]}-${sug.sumRange[1]}\xB0. This layout's is <b>${Math.round(sum)}\xB0</b>: ${inRange ? "in that range." : sum < sug.sumRange[0] ? "smaller, so the ball will turn speed into rotation sooner than your numbers suggest." : "larger, so the ball will hold its energy longer than your numbers suggest."}</div>
        <ul>${transitionRead(sum, e.dual.drilling, e.dual.valAngle).map((t) => `<li>${esc(t)}</li>`).join("")}${sug.why.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        <div class="u">Rule-of-thumb start for you: <b>${sug.drilling}\xB0 \xD7 ${fractionInches(sug.pinToPap)} \xD7 ${sug.valAngle}\xB0</b>. Rules come from the Dual Angle paper by MoRich; your driller adjusts them for your PAP, your hand and your lanes.</div></div>
      ${l.compare ? `<div class="card"><div class="k">Compared with A</div><table><tr><th></th><th class="n">A</th><th class="n">Now</th></tr>
        <tr><td>Layout</td><td class="n">${esc(layoutLine(l.compare.solved))}</td><td class="n">${esc(layoutLine(s))}</td></tr>
        <tr><td>Angle sum</td><td class="n">${Math.round(l.compare.solved.angleSum)}\xB0</td><td class="n">${Math.round(sum)}\xB0</td></tr>
        <tr><td>Flare at 30 ft</td><td class="n">${fmt2(l.compare.flare.flare30In, 1)} in</td><td class="n">${f ? fmt2(f.flare30In, 1) : "-"} in</td></tr>
        <tr><td>Settle (revs)</td><td class="n">${l.compare.flare.cycleRevs === null ? "-" : Math.round(l.compare.flare.cycleRevs)}</td><td class="n">${f?.cycleRevs == null ? "-" : Math.round(f.cycleRevs)}</td></tr></table><div class="note">A: ${esc(l.compare.label)}</div></div>` : ""}` : `<div class="card"><div class="u">That layout can't be drawn: ${esc(s.problems.join(" "))}</div></div>`;
    void R;
  }
  function openDrillSheet() {
    if (!lab || !solved || !solved.ok) return;
    const l = lab, s = solved, e = s.eq;
    const el = $("report");
    el.classList.add("on");
    const shots = [];
    for (const [name, m] of [["Grip view", facing([0, 0, 1])], ["PAP view", facing(s.points.pap)], ["Pin view", facing(s.points.pin)]]) {
      const c = document.createElement("canvas");
      c.width = 420;
      c.height = 420;
      drawBall(c, l, s, flare, m, { labels: true });
      shots.push(`<div style="text-align:center"><img src="${c.toDataURL("image/png")}" style="width:100%;max-width:230px;background:#0b1220;border-radius:12px"><div class="note">${name}</div></div>`);
    }
    const p = S.profile;
    el.innerHTML = `
    <div class="row noprint"><button class="btn" onclick="window.print()">Print or save PDF</button><button class="btn ghost" id="ds-close">Close</button></div>
    <h2>Drill sheet</h2>
    <div class="note">${esc((/* @__PURE__ */ new Date()).toLocaleDateString([], { dateStyle: "long" }))} \xB7 ${esc(p?.name ?? "")}${p?.username ? ` (@${esc(p.username)})` : ""} \xB7 ${l.hand === "R" ? "right" : "left"}-handed${l.grip.noThumb ? ", no thumb hole" : ""}</div>
    <div class="card"><div class="k">Ball</div><b>${esc(l.ball.manufacturer ? l.ball.manufacturer + " " : "")}${esc(l.ball.name)}</b><div class="u">RG ${fmt2(l.ball.rg, 3)} \xB7 differential ${fmt2(l.ball.totalDiff, 3)} \xB7 ${l.ball.symmetric ? "symmetric core" : `asymmetric core, intermediate ${fmt2(l.ball.intDiff, 3)}`}${l.ball.pinToCg ? ` \xB7 pin to CG ${fractionInches(l.ball.pinToCg)}` : ""}${l.ball.mb ? ` \xB7 mass bias ${fractionInches(l.ball.mb.dist)} from the pin at ${Math.round(l.ball.mb.angle)}\xB0 from the pin-to-PSA line` : ""}</div></div>
    <div class="card"><div class="k">Layout, in every system</div><table>
      <tr><td>Dual Angle</td><td class="n"><b>${Math.round(e.dual.drilling)}\xB0 \xD7 ${fractionInches(e.dual.pinToPap)} \xD7 ${Math.round(e.dual.valAngle)}\xB0</b></td></tr>
      <tr><td>Pin Buffer</td><td class="n"><b>${fractionInches(e.pinbuffer.pinToPap)} \xD7 ${fractionInches(e.pinbuffer.psaToPap)} \xD7 ${fractionInches(e.pinbuffer.pinBuffer)}</b></td></tr>
      <tr><td>2LS</td><td class="n"><b>${fractionInches(e.ls2.pinToPap)} \xD7 ${fractionInches(e.ls2.psaToPap)} \xD7 ${fractionInches(e.ls2.pinToGrip)}</b></td></tr>
      <tr><td>Pin placement</td><td class="n">${esc(s.pinPlacement.label)}</td></tr></table></div>
    <div class="card"><div class="k">Bowler and grip</div><table>
      <tr><td>PAP (over, up)</td><td class="n">${fractionInches(l.pap.over)} over, ${fractionInches(Math.abs(l.pap.up))} ${l.pap.up < 0 ? "down" : "up"}</td></tr>
      <tr><td>Rev rate \xB7 speed</td><td class="n">${Math.round(l.rev)} RPM \xB7 ${fmt2(l.speed, 1)} mph</td></tr>
      ${l.grip.noThumb ? "" : `<tr><td>Span</td><td class="n">${fractionInches(l.grip.span)}</td></tr><tr><td>Thumb hole</td><td class="n">${fractionInches(l.grip.thumbDia)}</td></tr>`}
      <tr><td>Finger holes</td><td class="n">${fractionInches(l.grip.fingerDia)}</td></tr><tr><td>Bridge</td><td class="n">${fractionInches(l.grip.bridge)}</td></tr></table></div>
    <div class="card"><div class="k">The ball</div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:space-around">${shots.join("")}</div></div>
    ${flare ? `<div class="card"><div class="k">Flare preview</div><div class="u">About ${fmt2(flare.flare30In, 1)} in of track flare after 30 ft (${Math.round(flare.usePct * 100)}% of this ball's ${fmt2(flare.potential30In, 1)} in potential). Angle sum ${Math.round(s.angleSum)}\xB0. Model estimate without the lane: compare layouts, don't read it as a measurement.</div></div>` : ""}
    ${l.notes ? `<div class="card"><div class="k">Notes</div><div class="u">${esc(l.notes)}</div></div>` : ""}
    <div class="note">Distances are along the surface of a 27 inch ball. Check the ball maker's own drilling sheet and your own measurements before drilling.</div>`;
    $("ds-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }

  // camera/ballimg.ts
  var COLORS = [[/black|onyx|coal|jet/, 230, 8], [/purple|violet|plum/, 275, 45], [/blue|navy|cobalt|sapphire|ocean/, 215, 55], [/teal|aqua|cyan|turquoise/, 180, 50], [/green|emerald|lime|jade/, 140, 45], [/red|crimson|ruby|cherry|maroon/, 355, 55], [/orange|copper|bronze/, 25, 60], [/gold|yellow|amber/, 45, 60], [/pink|magenta|orchid/, 320, 50], [/silver|grey|gray|steel|graphite|smoke|white|ivory/, 220, 8]];
  var SHOW_MAKER_PHOTOS = false;
  function ballThumb(b, size = 72) {
    const c = (b.colorway?.value ?? "").toLowerCase();
    const [h, s] = COLORS.find(([re]) => re.test(c))?.slice(1) ?? [215, 30];
    const ball = `<div style="position:absolute;inset:14%;border-radius:50%;background:radial-gradient(circle at 35% 30%,hsl(${h},${s}%,55%),hsl(${h},${s}%,14%))"></div>`;
    const img = SHOW_MAKER_PHOTOS && b.imageUrl ? `<img src="${esc(b.imageUrl.value)}" alt="${esc(b.manufacturer + " " + b.name)}" loading="lazy" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff" onerror="this.remove()">` : "";
    return `<div style="position:relative;flex:none;width:${size}px;height:${size}px;border-radius:14px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid var(--line)">${ball}${img}</div>`;
  }

  // camera/playbook.ts
  function playbookSections(pattern) {
    const bp = bowlerProfile();
    const owned = ownedBalls();
    const strike = owned.filter((b) => b.specs && !isSpareBall(b.specs));
    const ownedKeys = new Set(S.arsenal.map((b) => b.catalogKey).filter(Boolean));
    const opt = optimizeArsenal({ bowler: bp, owned, catalog: S.catalog, ownedKeys, tonight: pattern ?? null });
    return buildPlaybook({
      name: S.profile?.name,
      style: bp.style,
      hand: bp.hand,
      level: S.profile?.quiz?.level,
      revRpm: bp.revRpm,
      revSource: bp.revSource,
      speedMph: bp.launchSpeed,
      axisRotation: bp.axisRotation,
      axisTilt: bp.axisTilt,
      pap: S.profile?.spin?.pap,
      hasFit: !!S.profile?.fit,
      ownedBalls: owned.length,
      strikeBalls: strike.length,
      hasSpare: owned.some((b) => b.specs && isSpareBall(b.specs)),
      coverageScore: opt.score,
      pattern: pattern ?? null
    });
  }
  function playbookHtml(pattern) {
    return playbookSections(pattern).map((s) => `<div class="card"><div class="k">${esc(s.title)}</div><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("");
  }
  function openPlaybook(pattern) {
    const sections = playbookSections(pattern);
    const el = $("playbook");
    el.classList.add("on");
    el.innerHTML = `
    <div class="row noprint"><h2>Your pro shop playbook</h2><div><button class="btn ghost" onclick="window.print()">Print</button> <button class="btn ghost" id="pb-close">Close</button></div></div>
    <div class="note">Built from your profile${S.profile?.name ? `, ${esc(S.profile.name)}` : ""}. It changes as the app learns more about you: speed from the camera, revs, axis, your PAP and your arsenal.</div>
    ${sections.map((s) => `<div class="card"><div class="k">${esc(s.title)}</div><ul>${s.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}
    <div class="note">General guidance, not a substitute for a fitting by a qualified pro shop operator.</div>`;
    $("pb-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }

  // core/src/drilled.ts
  var G_TO_LB_PER_IN3 = 0.036127;
  var OZ_PER_LB = 16;
  var zero = () => [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  var ident = (k2) => [[k2, 0, 0], [0, k2, 0], [0, 0, k2]];
  var outer = (a, b) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[i] * b[j]));
  var addM = (a, b, k2 = 1) => a.map((r, i) => r.map((v, j) => v + k2 * b[i][j]));
  function eigenvalues(m) {
    const a = m.map((r) => [...r]);
    for (let sweep = 0; sweep < 50; sweep++) {
      let off = 0;
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) off += a[i][j] * a[i][j];
      if (off < 1e-24) break;
      for (let p = 0; p < 2; p++)
        for (let q = p + 1; q < 3; q++) {
          if (Math.abs(a[p][q]) < 1e-30) continue;
          const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
          const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
          const c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let k2 = 0; k2 < 3; k2++) {
            const akp = a[k2][p], akq = a[k2][q];
            a[k2][p] = c * akp - s * akq;
            a[k2][q] = s * akp + c * akq;
          }
          for (let k2 = 0; k2 < 3; k2++) {
            const apk = a[p][k2], aqk = a[q][k2];
            a[p][k2] = c * apk - s * aqk;
            a[q][k2] = s * apk + c * aqk;
          }
        }
    }
    return [a[0][0], a[1][1], a[2][2]].sort((x, y) => x - y);
  }
  function ballProfile(weightLb, meanRg2) {
    const t = 0.5, rf = R - t;
    const cover = 1.15 * G_TO_LB_PER_IN3;
    const vol = (a, b) => 4 * Math.PI / 3 * (b ** 3 - a ** 3);
    const k2 = 8 * Math.PI / 15;
    let best = null;
    for (let rc = 1.2; rc <= 2.8; rc += 0.05) {
      const Vc = vol(0, rc), Vf = vol(rc, rf), Vcov = vol(rf, R);
      const m1 = weightLb - cover * Vcov;
      const i1 = weightLb * meanRg2 / k2 - cover * (R ** 5 - rf ** 5);
      const A = Vf, B = Vc, C2 = rf ** 5 - rc ** 5, D = rc ** 5;
      const det = A * D - B * C2;
      if (Math.abs(det) < 1e-9) continue;
      const a = (m1 * D - B * i1) / det, b = (A * i1 - C2 * m1) / det;
      const aG = a / G_TO_LB_PER_IN3, bG = b / G_TO_LB_PER_IN3;
      if (aG > 0.35 && aG < 1.1 && bG > 2 && bG < 7) {
        const score = Math.abs(rc - 1.8);
        if (!best || score < Math.abs(best.coreRadius - 1.8)) best = { coreRadius: rc, cover, filler: a, core: b, coverThickness: t };
      }
    }
    return best ?? { coreRadius: 2, cover, filler: cover * 0.8, core: cover * 2, coverThickness: t };
  }
  var densityAt = (p, r) => r > R - p.coverThickness ? p.cover : r > p.coreRadius ? p.filler : p.core;
  function halfDifference(holes, n) {
    let diff = 0;
    for (const h of holes)
      for (const s of h.slices) {
        const along = s.r * dot(h.dir, n);
        const w = Math.max(1e-6, h.radius);
        const f = along > w ? 1 : along < -w ? 0 : (along + w) / (2 * w);
        diff += -s.massLb * (f - (1 - f));
      }
    return diff * OZ_PER_LB;
  }
  var word = (v, plus, minus2) => Math.abs(v) < 0.05 ? "even" : `${Math.abs(v).toFixed(1)} oz ${v > 0 ? plus : minus2}`;
  function drillBall(ball, solved2, grip, opt = {}) {
    const notes = [];
    const intDiff = ball.intDiff ?? 0;
    const M = ball.weightLb;
    const p = solved2.points;
    const e1 = unit(p.pin), e3 = unit(p.psa), e2 = unit(p.inter);
    const r1 = ball.rg, r2 = ball.rg + intDiff, r3 = ball.rg + ball.totalDiff;
    const profile = ballProfile(M, (r1 * r1 + r2 * r2 + r3 * r3) / 3);
    let I = zero();
    I = addM(I, outer(e1, e1), M * r1 * r1);
    I = addM(I, outer(e2, e2), M * r2 * r2);
    I = addM(I, outer(e3, e3), M * r3 * r3);
    const fingerDepth = opt.fingerDepth ?? 2.25, thumbDepth = opt.thumbDepth ?? 2.75;
    const holes = [
      { name: "finger", dir: unit(p.middle), radius: grip.fingerDia / 2, depth: fingerDepth },
      { name: "finger", dir: unit(p.ring), radius: grip.fingerDia / 2, depth: fingerDepth }
    ];
    if (p.thumb && !grip.noThumb) holes.push({ name: "thumb", dir: unit(p.thumb), radius: grip.thumbDia / 2, depth: thumbDepth });
    if (fingerDepth > 2.75) notes.push('Finger holes deeper than 2 3/4" raise the RG a lot and make the ball later with less motion (Storm).');
    let removed = 0, thumbOz = 0, fingerOz = 0;
    let moment = [0, 0, 0];
    const held = [];
    const N2 = 40;
    for (const h of holes) {
      const slices = [];
      for (let k2 = 0; k2 < N2; k2++) {
        const s = (k2 + 0.5) / N2 * h.depth;
        const r = R - s;
        const dm = densityAt(profile, r) * Math.PI * h.radius * h.radius * (h.depth / N2);
        slices.push({ r, massLb: dm });
        removed += dm;
        if (h.name === "thumb") thumbOz += dm * OZ_PER_LB;
        else fingerOz += dm * OZ_PER_LB;
        const c = scale(h.dir, r);
        moment = add(moment, scale(c, dm));
        I = addM(I, addM(ident(dot(c, c)), outer(c, c), -1), -dm);
        const dd2 = outer(h.dir, h.dir);
        const own = dd2.map((row, i) => row.map((v, j) => h.radius * h.radius / 2 * v + h.radius * h.radius / 4 * ((i === j ? 1 : 0) - v)));
        I = addM(I, own, -dm);
      }
      held.push({ dir: h.dir, radius: h.radius, slices });
    }
    const Mn = M - removed;
    const d = scale(moment, -1 / Mn);
    const dd = dot(d, d);
    I = addM(I, addM(ident(dd), outer(d, d), -1), -Mn);
    const ev = eigenvalues(I).map((l) => Math.sqrt(Math.max(0, l) / Mn));
    const drilled = { rg: ev[0], intDiff: ev[1] - ev[0], totalDiff: ev[2] - ev[0] };
    const top = halfDifference(held, [0, 0, -1]);
    const finger = halfDifference(held, [0, 1, 0]);
    const side = halfDifference(held, [1, 0, 0]);
    return {
      undrilled: { rg: ball.rg, intDiff, totalDiff: ball.totalDiff },
      drilled,
      removedOz: { thumb: thumbOz, fingers: fingerOz, total: thumbOz + fingerOz },
      weightOz: Mn * OZ_PER_LB,
      comShift: Math.sqrt(dd),
      staticOz: { top, finger, side },
      staticWords: { top: word(top, "on top (away from the grip)", "on the bottom (grip side)"), finger: word(finger, "on the finger side", "on the thumb side"), side: word(side, "to the PAP side", "away from the PAP side") },
      notes
    };
  }
  function checkStaticWeight(w, weightLb = 15, hasBalanceHole = false) {
    const problems = [];
    const notes = [];
    const sft = weightLb > 10 && !hasBalanceHole ? 3 : 1;
    const lim = { topBottom: 3, sideFingerThumb: sft };
    const chk = (label2, v, max) => {
      if (v !== void 0 && Math.abs(v) > max + 1e-9) problems.push(`${label2} weight ${Math.abs(v).toFixed(2)} oz is over the ${max} oz limit.`);
    };
    chk("Top", w.top, lim.topBottom);
    chk("Bottom", w.bottom, lim.topBottom);
    chk("Finger", w.finger, sft);
    chk("Thumb", w.thumb, sft);
    chk("Side", w.side, sft);
    if (hasBalanceHole) notes.push("Balance holes are no longer allowed in USBC competition (since Aug 1, 2020): plug it, or the ball is illegal there.");
    if (weightLb <= 10) notes.push("Balls of 10 lb or less keep the 1 oz side, finger and thumb limits.");
    if (w.finger !== void 0 && w.thumb !== void 0 && w.finger > 0 && w.thumb > 0) notes.push("Finger and thumb weight are opposite sides of one measurement: a ball can't be heavy on both. Check which you read off the scale.");
    return { ok: problems.length === 0, limits: lim, problems, notes };
  }

  // core/src/layoutpro.ts
  var fr = (v) => {
    const w = Math.floor(v + 1e-9);
    const e = Math.round((v - w) * 8);
    if (e === 0) return `${w}"`;
    if (e === 8) return `${w + 1}"`;
    const g = e % 2 === 0 ? e % 4 === 0 ? [e / 4, 2] : [e / 2, 4] : [e, 8];
    return `${w ? w + " " : ""}${g[0]}/${g[1]}"`;
  };
  function checkLayout(input, solved2, opt = {}) {
    const out = [];
    for (const p2 of solved2.problems) out.push({ level: "error", text: p2 });
    const eq = solved2.eq;
    const sum = solved2.angleSum;
    if (input.system === "dual") {
      if (input.drilling < 10 || input.drilling > 90) out.push({ level: "error", text: `A drilling angle runs 10 to 90 degrees; ${input.drilling} is outside it.` });
      if (input.valAngle < 20 || input.valAngle > 70) out.push({ level: "warn", text: `The VAL angle is only effective from 20 to about 70 degrees (Pinel); ${input.valAngle} is outside it.` });
      if (sum < 30 || sum > 160) out.push({ level: "warn", text: `The angle sum ${Math.round(sum)} is outside the 30 to 160 range the system is built for.` });
      if (opt.symmetric && input.pinToPap < 1.5) out.push({ level: "warn", text: "Pinel: Dual Angle is accurate on a symmetric core only with the pin out at least 1 1/2 inches." });
    }
    if (input.system === "2ls" && solved2.ok && input.pinToPap + input.pinToGrip < solved2.papToGrip - 1e-6) out.push({ level: "error", text: "Pin to PAP plus pin to the center of the grip must reach at least the PAP to grip-center distance (the lightning-arc rule)." });
    if (!solved2.ok) return out;
    const ptp = eq.dual.pinToPap;
    if (ptp > 6 + 1e-6) out.push({ level: "warn", text: `Pin to PAP ${fr(ptp)} is past 6": rarely used, and sources warn of unstable reaction near the ends (BowlTecX).` });
    else if (ptp < 1) out.push({ level: "warn", text: `Pin to PAP ${fr(ptp)} is under 1": rarely used, and an independent source (BowlTecX) warns of inverted flare near the ends.` });
    else if (ptp >= 3 && ptp <= 4 && input.system === "pinbuffer") out.push({ level: "info", text: 'Storm calls 3 to 4" pin to PAP very early and possibly unstable on high revs or high-differential cores.' });
    if (opt.axisTilt !== void 0 && opt.axisTilt <= 6 && input.system === "pinbuffer" && eq.pinbuffer.pinBuffer < eq.pinbuffer.pinToPap - 1.5) out.push({ level: "warn", text: "At 6 degrees of axis tilt or less, a pin long relative to the buffer can track over the finger holes (Storm's layout-adapter note)." });
    const p = solved2.points;
    const holes = [["the thumb hole", p.thumb], ["the middle finger hole", p.middle], ["the ring finger hole", p.ring]];
    for (const [name, h] of holes) {
      if (!h) continue;
      const d = surfDist(p.pin, h);
      if (d < 1) out.push({ level: "error", text: `The pin lands ${fr(d)} from ${name}. Storm voids the warranty within 1 inch of any hole: move the grip or drill the pin out completely.` });
    }
    if (sum >= 30 && sum <= 160 && !out.some((f) => f.level === "error")) out.push({ level: "info", text: `Angle sum ${Math.round(sum)}: ${sum < 70 ? "a fast skid-to-hook transition" : sum < 110 ? "a medium transition" : "a slow, late transition"}.` });
    return out;
  }
  var TRACK_TABLE = [
    { label: "High track", tiltRange: "axis tilt under 12 degrees", sharper: "65 x 3 3/8 x 25", midlane: "50 x 4 x 35", control: "85 x 4 1/2 x 45" },
    { label: "Medium track", tiltRange: "axis tilt 12 to 18 degrees", sharper: "55 x 3 3/4 x 25", midlane: "35 x 4 1/4 x 30", control: "65 x 5 x 40" },
    { label: "Low track", tiltRange: "axis tilt over 18 degrees", sharper: "40 x 4 1/4 x 25", midlane: "15 x 4 3/4 x 30", control: "30 x 5 1/4 x 65" }
  ];
  var STORM_LADDER = [
    { layout: "2 x 6 x 1", note: "control, early and smooth" },
    { layout: "6 x 5 x 3", note: "weak, late and smooth" },
    { layout: "5 x 5 x 4", note: "control benchmark" },
    { layout: "4 1/2 x 3 x 2", note: "strong benchmark, early arc" },
    { layout: "5 x 4 x 2", note: "universal benchmark" },
    { layout: "4 x 4 x 1", note: "strong control" },
    { layout: "3 x 4 1/2 x 2", note: "strong, early" }
  ];
  var LS2_LADDER = ["5 1/2 x 5 x 2", "2 x 6 x 5", "5 x 4 x 3 1/2 (benchmark)", "4 1/2 x 3 x 4 1/2", "4 x 4 x 5", "3 1/2 x 4 x 6 1/2"];
  function trackRow(tilt) {
    return TRACK_TABLE[tilt === void 0 || tilt >= 12 && tilt <= 18 ? 1 : tilt < 12 ? 0 : 2];
  }
  var round8 = (v) => Math.round(v * 8) / 8;
  function adviseLayouts(b, pattern, opt = {}) {
    const d = suggestDualAngle(b, pattern, opt.totalDiff);
    const why = [...d.why];
    const pap = opt.pap ?? { over: 4.5, up: 1 };
    const s = solveLayout({ system: "dual", drilling: d.drilling, pinToPap: d.pinToPap, valAngle: d.valAngle }, pap, opt.hand ?? b.hand, opt.grip ?? DEFAULT_GRIP);
    const dom = bowlerDominance(b.revRpm, b.launchSpeed);
    const row = trackRow(b.axisTilt);
    if (b.axisTilt !== void 0) why.push(`${row.label} (${row.tiltRange}): Pinel's table for it runs ${row.sharper}, ${row.midlane} and ${row.control} (drilling x pin to PAP x VAL angle).`);
    if (b.revRpm !== void 0) {
      why.push(b.revRpm < 300 ? 'Lower revs: a pin distance of 3 1/2 to 4" is the usual range.' : b.revRpm < 400 ? 'Medium revs on a house shot: 4 to 4 1/2".' : 'Higher revs: 4 1/2 to 6", and two-handers often live there.');
    }
    if (b.style === "two-handed" || b.style === "one-hand-no-thumb") why.push("Two-handed and thumbless bowlers use 2LS, which measures the PAP from the bridge between the finger holes rather than from a grip center.");
    return {
      dual: { drilling: d.drilling, pinToPap: d.pinToPap, valAngle: d.valAngle },
      pinBuffer: { pinToPap: round8(s.eq.pinbuffer.pinToPap), psaToPap: round8(s.eq.pinbuffer.psaToPap), pinBuffer: round8(s.eq.pinbuffer.pinBuffer) },
      ls2: { pinToPap: round8(s.eq.ls2.pinToPap), psaToPap: round8(s.eq.ls2.psaToPap), pinToGrip: round8(s.eq.ls2.pinToGrip) },
      sumRange: d.sumRange,
      why,
      dominance: dom,
      trackRow: row
    };
  }
  var SYMPTOMS = [
    {
      id: "early",
      label: "Hooks too early, nothing left at the backend",
      reading: "The ball burns its energy before the breakpoint: too much friction too soon for the oil it is on.",
      fixes: [
        { lever: "surface", text: "Raise the grit or add polish: the quickest fix, and the one that costs nothing permanent (Bowling.com, Storm)." },
        { lever: "layout", text: "On the next drilling, a larger angle sum (a longer VAL angle, a bigger drilling angle) and a longer pin buffer delay the transition." },
        { lever: "ball", text: "Move down to a weaker coverstock or a lower-differential core for this condition." },
        { lever: "lane", text: "If the lanes are carrying down or burning up, move in and play straighter before changing equipment." }
      ]
    },
    {
      id: "late",
      label: "Skids too long, reads too late",
      reading: "The ball is still skidding at the breakpoint, so it either misses the pocket or snaps at the pins.",
      fixes: [
        { lever: "surface", text: "Lower the grit (matte it) to read sooner; slick sport patterns often want 500, 1000 or 1500 matte (Bowling.com)." },
        { lever: "layout", text: "A smaller angle sum (VAL angle toward 20 to 35) and a shorter pin buffer move the transition earlier; a pin closer to the PAP gives a smoother, earlier arc." },
        { lever: "ball", text: "A stronger coverstock or a ball with more mid-lane read." },
        { lever: "technique", text: "More revs or a lower launch speed turn more of the ball's energy into hook." }
      ]
    },
    {
      id: "weak-back",
      label: "Good motion in the middle, weak backend",
      reading: "The ball reads fine and then rolls out: not enough energy left past the breakpoint.",
      fixes: [
        { lever: "surface", text: "More polish or a higher grit: 1500 plus polish is the standard backend fix (Bowling.com)." },
        { lever: "layout", text: `A longer pin-to-PAP (past 4 1/2 up to 6") saves energy for later; Pinel's larger angle sums do the same.` },
        { lever: "ball", text: "A ball with a higher differential or a cleaner coverstock." }
      ]
    },
    {
      id: "angular",
      label: "Too sharp and angular at the breakpoint",
      reading: "The ball skids then jumps. Typical of a strong layout on a clean skid, or very long pin-to-PAP.",
      fixes: [
        { lever: "layout", text: "A shorter pin buffer and a smaller VAL angle make a smoother arc; a pin-down placement is also smoother (BowlersMart). BowlTecX disputes the pin up/down effect below about 3 inches apart." },
        { lever: "surface", text: "Lower the grit a step to start the ball earlier so it does not have to turn so hard." },
        { lever: "ball", text: "A pearl or hybrid ball is usually smoother than a solid." }
      ]
    },
    {
      id: "flat",
      label: "Ball goes flat or hooks too little everywhere",
      reading: "Not enough overall motion for the lane.",
      fixes: [
        { lever: "surface", text: "Go lower in grit; on heavy oil 80 to 360 grit, medium to medium-heavy 500 to 1000 (Storm)." },
        { lever: "layout", text: 'A stronger layout: a shorter pin to PAP (about 3 to 4") and a smaller angle sum.' },
        { lever: "ball", text: "A stronger ball (more cover, more differential)." },
        { lever: "technique", text: "A lighter ball you can rev up, or an adjustment to hand position, can add more rotation." }
      ]
    },
    {
      id: "overunder",
      label: "Big swings: sometimes it hooks, sometimes it doesn't",
      reading: "The ball is on the edge of its window: the same layout reads very differently with small changes.",
      fixes: [
        { lever: "technique", text: "Check consistency first: speed and axis rotation changes shift the reaction a lot." },
        { lever: "layout", text: 'A medium angle sum with a pin buffer around 2 to 3" is the least touchy (Storm benchmarks 5 x 4 x 2 as universal).' },
        { lever: "surface", text: "A balanced surface (1000 to 2000) reduces how much the ball cares about small oil changes." }
      ]
    },
    {
      id: "carry",
      label: "Good hits, poor carry",
      reading: "The ball arrives in the pocket but leaves washouts or splits.",
      fixes: [
        { lever: "layout", text: "Entry angle matters: a stronger backend (longer pin buffer, a later breakpoint) often carries better than a ball that rolls early." },
        { lever: "ball", text: "A carrying ball for the first part of a pattern, a rolling ball later, is the usual pro approach." },
        { lever: "technique", text: "Check the entry angle LaneIQ measured: it should reach about 4 to 6 degrees at the pins." }
      ]
    }
  ];
  var SURFACE_TABLE = [
    { oil: "Extremely oily", grits: "80 to 360", why: "Early hook, strong midlane read, smooth backend (Storm)." },
    { oil: "Medium to medium-heavy", grits: "500 to 1000", why: "Balanced; the default family for most house shots (Storm)." },
    { oil: "Medium to dry", grits: "1500 to 3000", why: "Longer skid, more energy for the backend." },
    { oil: "Dry or burnt", grits: "4000 to polish", why: "Slick: it skids through the dry area and saves energy (Storm, Bowling.com). Sources differ on where 3000 and 4000 sit." }
  ];
  function surfaceFor(pattern, dom) {
    let level = 1;
    if (pattern) {
      const vol = pattern.volumeMl ?? 24;
      if (vol >= 28 || pattern.lengthFt >= 44) level = 0;
      else if (vol >= 22 && pattern.lengthFt >= 39) level = 1;
      else if (vol >= 18) level = 2;
      else level = 3;
    }
    const lean = dom === "rev" ? "Rev-dominant: lean toward the higher-grit end of the range, since you create plenty of friction." : dom === "speed" ? "Speed-dominant: lean toward the lower-grit end, to help the ball turn earlier." : "Balanced: the middle of the range is a fine start.";
    return { row: SURFACE_TABLE[level], lean };
  }
  var FIT_SYMPTOMS = [
    { id: "squeeze", label: "I squeeze the ball", causes: ["Thumb hole too loose or span too long, so you grip to feel secure."], fixes: ["Re-fit the span and thumb size; tape can cover a small change; plug and redrill if it persists."] },
    { id: "drag", label: "Thumb drags or hangs on release", causes: ["Thumb hole too tight, or too little reverse pitch, or the span is too short."], fixes: ["Add reverse thumb pitch or open the hole slightly; a half-thumb (cutaway) layout helps bowlers who cannot clear the thumb."] },
    { id: "pinch", label: "Pinching or pain in the thumb", causes: ["A round hole for an oval thumb."], fixes: ["An ovalled thumb hole, then re-check the span."] },
    { id: "callus", label: "Calluses, blisters or torn skin", causes: ["A bad fit in span, pitch or hole size. 'Should not happen with a proper fit' (National Bowling Academy)."], fixes: ["Re-fit; calluses at the index finger may only need tape or a glove (USBC)."] },
    { id: "swell", label: "Fits great in game one, tight later", causes: ["Hands swell during a long session."], fixes: ["Keep tape or inserts to adjust; ask for a fit that works through the middle of the session."] },
    { id: "wrist", label: "Sore wrist or hand after bowling", causes: ["A ball too heavy, or a span that forces the wrist out of neutral."], fixes: ["Try a pound lighter, then re-check the span; fit means no stress on the hand, wrist or arm."] }
  ];
  function suggestWeight(bodyLb) {
    const lb = Math.max(10, Math.min(16, Math.round(bodyLb / 10)));
    return { lb, test: `Test ${lb - 1} and ${Math.min(16, lb + 1)} lb too: pick the heaviest ball you can throw at normal speed with a neutral wrist and good balance.` };
  }
  var GRIP_TYPES = [
    { name: "Conventional", text: 'Fingers in to about 1/4" below the second knuckle: the most secure, the most thumb-and-fingers release, the least revs.' },
    { name: "Semi-fingertip", text: "Between the two: a common compromise." },
    { name: "Fingertip", text: "Finger holes stop at the first knuckle, so you can lift more and rev more, with less feeling of security." }
  ];
  var THEORY = [
    { title: "Pin, PSA, PAP and VAL", kind: "primary", source: "Pinel, Dual Angle Layout Technique", body: `The pin is where the core's low-RG axis comes out. The PSA (high-RG axis) is always 90 degrees, 6 3/4", from the pin on a 27" ball. The PAP is the point that does not rotate at release; the VAL is the vertical line through it parallel to the grip midline. Every layout system places those same few things.` },
    { title: "Dual Angle", kind: "primary", source: "Pinel / MoRich", body: "Drilling angle x pin to PAP x VAL angle. The drilling angle (10 to 90) sets how soon the ball rolls; the pin-to-PAP distance sets how much flare potential is kept; the VAL angle (20 to 70) sets how fast the ball changes from skid to hook. Drilling angle plus VAL angle is the angle sum: 30 is the fastest transition, 160 the slowest." },
    { title: "Pin Buffer / VLS", kind: "vendor", source: "Storm", body: 'Pin to PAP x PSA to PAP x pin buffer. The pin buffer is the distance from the pin to the VAL: 1 to 2" is a faster transition, 4 to 5" slower. Rules: pin to PAP plus PSA to PAP is at least 6 3/4", and the buffer cannot exceed the pin-to-PAP.' },
    { title: "2LS for two-handed bowlers", kind: "vendor", source: "Storm", body: 'The PAP is measured from the bridge between the finger holes. Pin to PAP x PSA to PAP x pin to center of grip. Longer than 3 3/8" pin to PAP is later and more angular; the pin-to-grip distance sets the post-drill total differential. Do not drill the fingers deeper than 2 3/4".' },
    { title: "PAL", kind: "vendor", source: "Bowling Science, via BowlersMart", body: "Pin to PAP x PSA to PAP x pin above the line, with the line running from the PAP through the ring finger. LaneIQ cites the description only; the definition rests on one vendor." },
    { title: "Where sources disagree: pin up vs pin down", kind: "disagreement", source: "BowlersMart vs BowlTecX", body: "BowlersMart: pin up is later and sharper, pin down earlier and smoother. BowlTecX argues the difference is negligible unless the pins are about 3 inches apart. LaneIQ shows the vendor view and flags the disagreement." },
    { title: "Where sources disagree: how much layout matters", kind: "disagreement", source: "Bowling This Month, BowlTecX", body: "Both say coverstock and surface account for roughly 70 to 75 percent of reaction. Neither shows a measurement. So change the surface first, and use layout to fine-tune." },
    { title: "Mass bias", kind: "primary", source: "Bowling This Month, Storm", body: "On an asymmetric ball, the mass bias farther from the thumb gives a stronger, earlier hooking motion; near the thumb or in the track a weaker one. Nobody publishes numbers, so LaneIQ shows only the direction." },
    { title: "Static weight (USBC)", kind: "rule", source: "USBC Equipment Specifications", body: "Balls over 10 lb with no balance hole: 3 oz side, finger or thumb weight and 3 oz top or bottom. Balance holes are banned from Aug 1, 2020. Up to five grip holes and all must be used on every delivery. Check the current Equipment Specifications Manual before a tournament." },
    { title: "Weight selection", kind: "primary", source: "AMF, Spin Bowling Tips", body: "A first guess is 10% of body weight, capped at 16 lb. Choose the heaviest ball you can throw at normal speed with a neutral wrist." },
    { title: "Redrilling", kind: "vendor", source: "BowlersMart", body: "Most balls can be redrilled two or three times before the plug affects the dynamics. A study of five redrills exists behind a paywall; LaneIQ could not read it." }
  ];

  // camera/proshoptools.ts
  var inch2 = (v) => fractionInches(v);
  var num2 = (el) => el && el.value.trim() !== "" ? Number(el.value) : void 0;
  function gripNow() {
    const f = S.profile?.fit;
    const st2 = bowlerProfile().style;
    return { ...DEFAULT_GRIP, ...f?.span ? { span: f.span } : {}, ...f?.thumbDia ? { thumbDia: f.thumbDia } : {}, ...f?.fingerDia ? { fingerDia: f.fingerDia } : {}, ...f?.bridge ? { bridge: f.bridge } : {}, noThumb: st2 === "two-handed" || st2 === "one-hand-no-thumb" };
  }
  function proshopToolsHtml(pattern) {
    const bp = bowlerProfile();
    const grip = gripNow();
    const pap = parsePap(S.profile?.spin?.pap ?? "") ?? void 0;
    const a = adviseLayouts(bp, pattern, { pap, grip });
    const dom = bowlerDominance(bp.revRpm, bp.launchSpeed);
    const surf = surfaceFor(pattern, dom);
    const twoHand = bp.style === "two-handed" || bp.style === "one-hand-no-thumb";
    const known = [bp.revRpm !== void 0 ? `${Math.round(bp.revRpm)} RPM` : null, bp.launchSpeed !== void 0 ? `${bp.launchSpeed.toFixed(1)} mph` : null, bp.axisTilt !== void 0 ? `${Math.round(bp.axisTilt)}\xB0 tilt` : null].filter(Boolean).join(" \xB7 ");
    return `
    <h3>Pro shop toolkit</h3>
    <div class="note">Built from published layout theory (Pinel's Dual Angle, Storm's Pin Buffer and 2LS) and the USBC rules. Every number is a starting point for a driller, and where sources disagree the text says so.</div>
    <details class="card" open><summary class="k">Layout advisor${known ? " \xB7 " + esc(known) : ""}</summary>
      <table>
        <tr><td>Dual Angle (drilling \xD7 pin to PAP \xD7 VAL)</td><td class="n">${a.dual.drilling}\xB0 \xD7 ${inch2(a.dual.pinToPap)} \xD7 ${a.dual.valAngle}\xB0</td></tr>
        <tr><td>Pin Buffer (pin to PAP \xD7 PSA to PAP \xD7 buffer)</td><td class="n">${inch2(a.pinBuffer.pinToPap)} \xD7 ${inch2(a.pinBuffer.psaToPap)} \xD7 ${inch2(a.pinBuffer.pinBuffer)}</td></tr>
        <tr><td>2LS (pin to PAP \xD7 PSA to PAP \xD7 pin to grip)${twoHand ? "" : " <span class='note'>for two-handed</span>"}</td><td class="n">${inch2(a.ls2.pinToPap)} \xD7 ${inch2(a.ls2.psaToPap)} \xD7 ${inch2(a.ls2.pinToGrip)}</td></tr>
        <tr><td>Angle sum range for you</td><td class="n">${a.sumRange[0]} to ${a.sumRange[1]}</td></tr></table>
      <ul>${a.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
      <div class="note">${pap ? "Converted at your saved PAP." : "No PAP saved, so the Pin Buffer and 2LS numbers use a typical 4 1/2 over, 1 up. Enter yours in the Layout Lab."} The three notations are the same layout; the pin goes at the same spot on the ball.</div>
      <div class="k" style="margin-top:8px">Pinel's layouts by track (drilling \xD7 pin to PAP \xD7 VAL angle)</div>
      <table>${TRACK_TABLE.map((r) => `<tr${r === a.trackRow && bp.axisTilt !== void 0 ? ' style="font-weight:600"' : ""}><td>${esc(r.label)} <span class="note">${esc(r.tiltRange)}</span></td><td class="n">${esc(r.sharper)} \xB7 ${esc(r.midlane)} \xB7 ${esc(r.control)}</td></tr>`).join("")}</table>
      <div class="note">Columns: sharper breakpoint, midlane, control (Pinel 2010 table, via BowlersMart).</div>
      <div class="k" style="margin-top:8px">Storm benchmark ladders</div>
      <div class="note">Pin Buffer: ${STORM_LADDER.map((l) => `${esc(l.layout)} (${esc(l.note)})`).join("; ")}.</div>
      <div class="note">2LS, weakest to strongest: ${LS2_LADDER.map(esc).join("; ")}.</div></details>

    <details class="card"><summary class="k">Layout checker and drilled-ball estimate</summary>
      <div class="note">Enter a layout in any system. LaneIQ checks it against the system's rules and the hole-clearance rule, converts it, and estimates what drilling does to the ball.</div>
      <div class="chips"><label>System <select id="pt-sys"><option value="dual">Dual Angle</option><option value="pinbuffer">Pin Buffer</option><option value="2ls">2LS</option></select></label></div>
      <div class="chips"><label id="pt-l1">Drilling angle \xB0 <input id="pt-a" inputmode="decimal" value="${a.dual.drilling}" style="width:70px"></label>
        <label id="pt-l2">Pin to PAP <input id="pt-b" value="${inch2(a.dual.pinToPap)}" style="width:70px"></label>
        <label id="pt-l3">VAL angle \xB0 <input id="pt-c" inputmode="decimal" value="${a.dual.valAngle}" style="width:70px"></label></div>
      <div class="chips"><label>PAP over <input id="pt-over" value="${pap ? inch2(pap.over) : "4 1/2"}" style="width:70px"></label><label>up (negative = down) <input id="pt-up" value="${pap ? inch2(pap.up) : "1"}" style="width:70px"></label></div>
      <div class="chips"><label>Ball lb <input id="pt-w" inputmode="decimal" placeholder="15" style="width:60px"></label><label>RG <input id="pt-rg" inputmode="decimal" placeholder="2.50" style="width:60px"></label><label>Total diff <input id="pt-td" inputmode="decimal" placeholder=".050" style="width:60px"></label><label>Int diff <input id="pt-id" inputmode="decimal" placeholder=".015 (0 = symmetric)" style="width:90px"></label></div>
      <div class="chips"><button class="btn" id="pt-go">Check this layout</button></div>
      <div id="pt-out"></div>
      <div class="k" style="margin-top:10px">Static weight check</div>
      <div class="chips"><label>Top oz <input id="pt-st" inputmode="decimal" style="width:55px"></label><label>Finger oz <input id="pt-sf" inputmode="decimal" style="width:55px"></label><label>Side oz <input id="pt-ss" inputmode="decimal" style="width:55px"></label><label><input type="checkbox" id="pt-bal"> has a balance hole</label><button class="btn ghost" id="pt-sgo">Check</button></div>
      <div id="pt-sout"></div></details>

    <details class="card"><summary class="k">Reaction doctor</summary>
      <div class="chips"><label>What's the ball doing? <select id="pt-sym">${SYMPTOMS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}</select></label></div>
      <div id="pt-sym-out"></div></details>

    <details class="card"><summary class="k">Surface guide</summary>
      <table>${SURFACE_TABLE.map((r) => `<tr${r === surf.row ? ' style="font-weight:600"' : ""}><td>${esc(r.oil)}</td><td class="n">${esc(r.grits)}</td></tr>`).join("")}</table>
      <div class="note">${pattern ? `For ${esc(pattern.name)}: ${esc(surf.row.oil)}, ${esc(surf.row.grits)} grit. ` : ""}${esc(surf.lean)}</div>
      <div class="note">Surface is the quick, reversible fix. Lower grit is more hook and earlier; higher grit or polish is longer skid and more backend. Coverstock and surface are said to account for 70 to 75 percent of reaction (no measurement cited), so change them before the layout.</div></details>

    <details class="card"><summary class="k">Fit, grip and ball weight</summary>
      <div class="chips"><label>Body weight lb <input id="pt-body" inputmode="numeric" style="width:70px"></label><button class="btn ghost" id="pt-wgo">Suggest ball weight</button></div>
      <div id="pt-wout" class="note"></div>
      <ul>${GRIP_TYPES.map((g) => `<li><b>${esc(g.name)}.</b> ${esc(g.text)}</li>`).join("")}</ul>
      <div class="chips"><label>Fit problem <select id="pt-fit">${FIT_SYMPTOMS.map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}</select></label></div>
      <div id="pt-fit-out"></div>
      <div class="note">A good fit means no squeeze and no stress on the hand, wrist or arm. Hands swell during a session, so fit through the middle, not game one.</div></details>

    <details class="card"><summary class="k">Theory library (sources named)</summary>
      ${THEORY.map((t) => `<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${esc(t.title)}</b> <span class="badge ${t.kind === "disagreement" ? "moderate" : "good"}">${t.kind}</span><div class="note">${esc(t.source)}</div><div class="u">${esc(t.body)}</div></div>`).join("")}</details>`;
  }
  function wireProshopTools(el) {
    const q = (id) => el.querySelector("#" + id);
    const sys = q("pt-sys");
    if (!sys) return;
    const bp = bowlerProfile();
    const labels = { dual: ["Drilling angle \xB0", "Pin to PAP", "VAL angle \xB0"], pinbuffer: ["Pin to PAP", "PSA to PAP", "Pin buffer"], "2ls": ["Pin to PAP", "PSA to PAP", "Pin to center of grip"] };
    const setLabels = () => {
      const l = labels[sys.value];
      ["pt-l1", "pt-l2", "pt-l3"].forEach((id, i) => {
        const lab2 = q(id);
        lab2.firstChild.textContent = l[i] + " ";
      });
    };
    sys.onchange = setLabels;
    const readIn = (id) => {
      const v = q(id).value;
      return parseInches(v) ?? Number(v);
    };
    q("pt-go").onclick = () => {
      const out = q("pt-out");
      const a = readIn("pt-a"), b = readIn("pt-b"), c = readIn("pt-c");
      const over = readIn("pt-over"), up = readIn("pt-up");
      if (![a, b, c, over, up].every(Number.isFinite)) return void (out.innerHTML = `<div class="u">Enter all three layout numbers and the PAP. Fractions like 4 1/2 work.</div>`);
      const input = sys.value === "dual" ? { system: "dual", drilling: a, pinToPap: b, valAngle: c } : sys.value === "pinbuffer" ? { system: "pinbuffer", pinToPap: a, psaToPap: b, pinBuffer: c } : { system: "2ls", pinToPap: a, psaToPap: b, pinToGrip: c };
      const grip = gripNow();
      const solved2 = solveLayout(input, { over, up }, bp.hand, grip);
      const ballW = num2(q("pt-w")), rg = num2(q("pt-rg")), td = num2(q("pt-td")), idf = num2(q("pt-id"));
      const f = checkLayout(input, solved2, { axisTilt: bp.axisTilt, symmetric: idf === 0, grip });
      const e = solved2.eq;
      let drilled = "";
      if (ballW && rg && td !== void 0) {
        const r = drillBall({ weightLb: ballW, rg, totalDiff: td, intDiff: idf }, solved2, grip);
        drilled = `<div class="k" style="margin-top:8px">Estimated drilled ball</div>
        <table><tr><td>RG</td><td class="n">${r.undrilled.rg.toFixed(3)} \u2192 ${r.drilled.rg.toFixed(3)}</td></tr>
        <tr><td>Intermediate diff</td><td class="n">${r.undrilled.intDiff.toFixed(3)} \u2192 ${r.drilled.intDiff.toFixed(3)}</td></tr>
        <tr><td>Total diff</td><td class="n">${r.undrilled.totalDiff.toFixed(3)} \u2192 ${r.drilled.totalDiff.toFixed(3)}</td></tr>
        <tr><td>Weight removed</td><td class="n">${r.removedOz.total.toFixed(1)} oz (thumb ${r.removedOz.thumb.toFixed(1)}, fingers ${r.removedOz.fingers.toFixed(1)})</td></tr>
        <tr><td>Static (from drilling alone)</td><td class="n">${esc(r.staticWords.top)} ${Math.abs(r.staticOz.top).toFixed(1)} oz \xB7 ${esc(r.staticWords.finger)} ${Math.abs(r.staticOz.finger).toFixed(1)} oz \xB7 ${esc(r.staticWords.side)} ${Math.abs(r.staticOz.side).toFixed(1)} oz</td></tr></table>
        <div class="note">${idf === 0 ? "On a symmetric core this model gets the RG and differential trends wrong, so trust the weight figures only. " : "Checked against Pinel's measured asymmetric ball. "}A ball's own built-in imbalance is unknown without the scale, so this never replaces the scale.</div>`;
      }
      out.innerHTML = `
      <ul>${f.map((x) => `<li class="${x.level === "error" ? "danger" : ""}"><b>${x.level === "error" ? "Problem" : x.level === "warn" ? "Check" : "Note"}.</b> ${esc(x.text)}</li>`).join("")}</ul>
      <table><tr><td>Dual Angle</td><td class="n">${Math.round(e.dual.drilling)}\xB0 \xD7 ${inch2(e.dual.pinToPap)} \xD7 ${Math.round(e.dual.valAngle)}\xB0</td></tr>
      <tr><td>Pin Buffer</td><td class="n">${inch2(e.pinbuffer.pinToPap)} \xD7 ${inch2(e.pinbuffer.psaToPap)} \xD7 ${inch2(e.pinbuffer.pinBuffer)}</td></tr>
      <tr><td>2LS</td><td class="n">${inch2(e.ls2.pinToPap)} \xD7 ${inch2(e.ls2.psaToPap)} \xD7 ${inch2(e.ls2.pinToGrip)}</td></tr></table>${drilled}`;
    };
    q("pt-sgo").onclick = () => {
      const v = (id) => num2(q(id));
      const bal = q("pt-bal").checked;
      const w = checkStaticWeight({ top: v("pt-st"), finger: v("pt-sf"), side: v("pt-ss") }, num2(q("pt-w")) ?? 15, bal);
      q("pt-sout").innerHTML = `<div class="u">${w.ok ? "Within the USBC limits." : esc(w.problems.join(" "))} Limits: ${w.limits.topBottom} oz top or bottom, ${w.limits.sideFingerThumb} oz side, finger or thumb.</div>${w.notes.map((n) => `<div class="note">${esc(n)}</div>`).join("")}`;
    };
    const sym = q("pt-sym");
    const showSym = () => {
      const s = SYMPTOMS.find((x) => x.id === sym.value);
      q("pt-sym-out").innerHTML = `<div class="u">${esc(s.reading)}</div><ol>${s.fixes.map((f) => `<li><span class="badge good">${esc(f.lever)}</span> ${esc(f.text)}</li>`).join("")}</ol><div class="note">Order matters: surface and lane play are free and reversible; layout and equipment are permanent.</div>`;
    };
    sym.onchange = showSym;
    showSym();
    q("pt-wgo").onclick = () => {
      const lb = Number(q("pt-body").value);
      q("pt-wout").textContent = lb > 0 ? (() => {
        const w = suggestWeight(lb);
        return `About ${w.lb} lb. ${w.test}`;
      })() : "Enter your body weight.";
    };
    const fit = q("pt-fit");
    const showFit = () => {
      const s = FIT_SYMPTOMS.find((x) => x.id === fit.value);
      q("pt-fit-out").innerHTML = `<div class="u"><b>Likely cause.</b> ${s.causes.map(esc).join(" ")}</div><div class="u"><b>Fix.</b> ${s.fixes.map(esc).join(" ")}</div>`;
    };
    fit.onchange = showFit;
    showFit();
  }

  // core/src/scoring.ts
  var ALL_PINS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var minus = (a, b) => a.filter((p) => !b.includes(p));
  function replay(rolls) {
    const states = [];
    let standing = ALL_PINS.slice();
    let frame2 = 1, ball = 1;
    let complete = false;
    let tenthBalls = [];
    for (const r of rolls) {
      if (complete) break;
      const before = standing.slice();
      states.push({ frame: frame2, ball, standingBefore: before, fresh: before.length === 10 });
      const down = r.down.filter((p) => before.includes(p));
      const after = minus(before, down);
      if (frame2 < 10) {
        if (after.length === 0 && ball === 1) {
          frame2++;
          ball = 1;
          standing = ALL_PINS.slice();
        } else if (ball === 1) {
          ball = 2;
          standing = after;
        } else {
          frame2++;
          ball = 1;
          standing = ALL_PINS.slice();
        }
      } else {
        tenthBalls.push(down.length);
        const cleared = after.length === 0;
        if (ball === 1) {
          ball = 2;
          standing = cleared ? ALL_PINS.slice() : after;
        } else if (ball === 2) {
          const first = tenthBalls[0];
          if (first === 10 || cleared) {
            ball = 3;
            standing = cleared ? ALL_PINS.slice() : after;
          } else complete = true;
        } else complete = true;
      }
    }
    if (frame2 > 10) complete = true;
    return { states, standing, frame: complete ? 11 : frame2, ball: complete ? 1 : ball, complete };
  }
  function scoreGame(rolls) {
    const counts = rolls.map((r) => r.down.length);
    const frames = [];
    let i = 0, running = 0;
    for (let f = 1; f <= 10; f++) {
      if (i >= counts.length) break;
      const a = counts[i];
      if (f < 10) {
        if (a === 10) {
          const b = counts[i + 1], c = counts[i + 2];
          const total = b !== void 0 && c !== void 0 ? running += 10 + b + c : null;
          frames.push({ pins: [10], marks: ["X"], total });
          i += 1;
        } else {
          const b = counts[i + 1];
          if (b === void 0) {
            frames.push({ pins: [a], marks: [a === 0 ? "-" : String(a)], total: null });
            i += 1;
            break;
          }
          const spare = a + b === 10;
          const nxt = counts[i + 2];
          const total = spare ? nxt !== void 0 ? running += 10 + nxt : null : running += a + b;
          frames.push({ pins: [a, b], marks: [a === 0 ? "-" : String(a), spare ? "/" : b === 0 ? "-" : String(b)], total });
          i += 2;
        }
      } else {
        const rest = counts.slice(i, i + 3);
        const marks = [];
        let prev = 0;
        rest.forEach((n, k2) => {
          if (n === 10 && (k2 === 0 || prev === 10 || marks[k2 - 1] === "/")) marks.push("X");
          else if (k2 > 0 && marks[k2 - 1] !== "X" && marks[k2 - 1] !== "/" && prev + n === 10) marks.push("/");
          else marks.push(n === 0 ? "-" : String(n));
          prev = marks[k2] === "/" ? 0 : n;
        });
        const done2 = rest.length === 3 || rest.length === 2 && rest[0] !== 10 && rest[0] + rest[1] < 10;
        frames.push({ pins: rest, marks, total: done2 ? running += rest.reduce((x, y) => x + y, 0) : null });
        i = counts.length;
      }
    }
    const last = [...frames].reverse().find((f) => f.total !== null);
    return { frames, total: last?.total ?? 0, complete: replay(rolls).complete };
  }
  var key = (pins) => pins.slice().sort((a, b) => a - b).join("-");
  function bowlingStats(games2) {
    const complete = games2.filter((g) => replay(g.rolls).complete);
    const scores = complete.map((g) => scoreGame(g.rolls).total);
    let fresh2 = 0, strikes = 0, freshPins = 0, spareTry = 0, spareMade = 0, open2 = 0;
    const single = { attempts: 0, made: 0 }, multi = { attempts: 0, made: 0 };
    const byLeave = {};
    for (const g of games2) {
      const rp = replay(g.rolls);
      rp.states.forEach((s, k2) => {
        const down = g.rolls[k2].down.filter((p) => s.standingBefore.includes(p));
        if (s.fresh) {
          fresh2++;
          freshPins += down.length;
          if (down.length === 10) strikes++;
        } else {
          spareTry++;
          const made = down.length === s.standingBefore.length;
          if (made) spareMade++;
          const t = byLeave[key(s.standingBefore)] ??= { attempts: 0, made: 0 };
          t.attempts++;
          if (made) t.made++;
          const bucket = s.standingBefore.length === 1 ? single : multi;
          bucket.attempts++;
          if (made) bucket.made++;
        }
      });
      const frameRolls = /* @__PURE__ */ new Map();
      rp.states.forEach((s, k2) => frameRolls.set(s.frame, [...frameRolls.get(s.frame) ?? [], g.rolls[k2].down.filter((p) => s.standingBefore.includes(p)).length]));
      for (const [f, c] of frameRolls) {
        if (f < 10 && c.length === 2 && c[0] + c[1] < 10) open2++;
        if (f === 10 && c.length >= 2 && c[0] < 10 && c[0] + c[1] < 10) open2++;
      }
    }
    const avg2 = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    return {
      games: games2.length,
      completeGames: complete.length,
      average: avg2(scores),
      high: scores.length ? Math.max(...scores) : null,
      strikePct: fresh2 ? strikes / fresh2 * 100 : null,
      firstBallAvg: fresh2 ? freshPins / fresh2 : null,
      sparePct: spareTry ? spareMade / spareTry * 100 : null,
      openFrames: open2,
      singlePin: single,
      multiPin: multi,
      byLeave
    };
  }
  function whatIf(rolls) {
    const rp = replay(rolls);
    const actual = scoreGame(rolls).total;
    const rescored = (single) => {
      const copy = rolls.map((r) => ({ ...r }));
      let changed2 = 0;
      rp.states.forEach((s, k2) => {
        if (s.fresh || s.frame >= 10) return;
        const downNow = rolls[k2].down.filter((p) => s.standingBefore.includes(p)).length;
        if (downNow === s.standingBefore.length) return;
        if (single && s.standingBefore.length !== 1) return;
        copy[k2] = { ...copy[k2], down: s.standingBefore.slice() };
        changed2++;
      });
      return { total: scoreGame(copy).total, changed: changed2 };
    };
    const a = rescored(true), b = rescored(false);
    return { actual, ifSingles: a.total, ifAllSpares: b.total, missedSingles: a.changed, missedSpares: b.changed };
  }

  // core/src/spares.ts
  var PIN_XY = {
    1: { x: 0, row: 0 },
    2: { x: -6, row: 1 },
    3: { x: 6, row: 1 },
    4: { x: -12, row: 2 },
    5: { x: 0, row: 2 },
    6: { x: 12, row: 2 },
    7: { x: -18, row: 3 },
    8: { x: -6, row: 3 },
    9: { x: 6, row: 3 },
    10: { x: 18, row: 3 }
  };
  var TOUCH = [[1, 2], [1, 3], [2, 3], [2, 4], [2, 5], [3, 5], [3, 6], [4, 5], [5, 6], [4, 7], [4, 8], [5, 8], [5, 9], [6, 9], [6, 10], [7, 8], [8, 9], [9, 10]];
  var touching = (a, b) => TOUCH.some(([x, y]) => x === a && y === b || x === b && y === a);
  var sorted = (pins) => pins.slice().sort((a, b) => a - b);
  function isSplit(leave) {
    if (leave.length < 2 || leave.includes(1)) return false;
    const seen2 = /* @__PURE__ */ new Set([leave[0]]);
    const queue = [leave[0]];
    while (queue.length) {
      const p = queue.pop();
      for (const q of leave) if (!seen2.has(q) && touching(p, q)) seen2.add(q), queue.push(q);
    }
    return seen2.size < leave.length;
  }
  var NAMES2 = {
    "7-10": "the bedposts (7-10)",
    "2-7": "a baby split (2-7)",
    "3-10": "a baby split (3-10)",
    "4-6-7-10": "the big four (4-6-7-10)",
    "5-7-10": "the lily (5-7-10)",
    "8-10": "the Cincinnati (8-10)",
    "1-2-10": "a washout (1-2-10)",
    "1-3-7": "a washout (1-3-7)",
    "2-8": "a sleeper (the 8 hides behind the 2)",
    "3-9": "a sleeper (the 9 hides behind the 3)",
    "1-5": "a sleeper (the 5 hides behind the 1)"
  };
  var MOVE_RIGHT_HANDED = { 1: 0, 5: 0, 2: 3, 8: 3, 4: 6, 7: 9, 3: -3, 9: -3, 6: -6, 10: -9 };
  function keyPinOf(leave) {
    return sorted(leave).sort((a, b) => PIN_XY[a].row - PIN_XY[b].row || Math.abs(PIN_XY[a].x) - Math.abs(PIN_XY[b].x))[0];
  }
  function adviseSpare(leaveIn, hand3 = "R") {
    const leave = sorted(leaveIn);
    const split = isSplit(leave);
    const k2 = leave.join("-");
    const name = NAMES2[k2] ?? (leave.length === 1 ? `the ${leave[0]} pin` : split ? `a split (${k2})` : `${k2}`);
    const keyPin = keyPinOf(leave);
    const notes = [];
    const raw = (MOVE_RIGHT_HANDED[keyPin] ?? 0) * (hand3 === "L" ? -1 : 1);
    const boards = Math.abs(raw);
    const direction = raw === 0 ? "none" : raw > 0 ? "right" : "left";
    let text;
    if (leave.length === 0) text = "Nothing standing: a strike.";
    else if (boards === 0) text = `Key pin ${keyPin}: no move. Throw your regular strike shot at your strike target.`;
    else text = `Key pin ${keyPin}: move your feet ${boards} boards ${direction} from where you stand for a strike, and aim at the same target you use for a strike.`;
    if (split) notes.push("A split is a low-percentage spare whichever system you use. Pick the pin you can hit solidly and expect to leave the other half the time or more.");
    if (leave.length > 1 && !split) notes.push(`With more than one pin, the system uses the key pin, the one closest to you (the ${keyPin}), and lets it carry the rest.`);
    if (keyPin === 10 || keyPin === 7) notes.push(`The ${keyPin} pin is the biggest move, nine boards, because it is the far corner pin on the other side of the deck.`);
    notes.push("The 3-6-9 system assumes your first ball hits the pocket consistently, and lane conditions can change how it works. Adjust if the ball doesn't go where you expect.");
    return { leave, name, split, keyPin, boards: leave.length ? boards : null, direction, text, notes };
  }

  // camera/theme.ts
  var lerp = (a, b, t) => a + (b - a) * t;
  var hsl = (h, s, l, a) => `hsla(${(h % 360 + 360) % 360}, ${s}%, ${l}%, ${a})`;
  var ramp2 = (h0, h1, s = 100, l0 = 62, l1 = 58) => (t, a = 1) => hsl(lerp(h0, h1, t), s, lerp(l0, l1, t), a);
  var TRACERS = {
    "tracer-aurora": { color: ramp2(190, 320), core: "255,255,255", glow: 24, width: 1 },
    "tracer-ember": { color: ramp2(8, 48), core: "255,244,214", glow: 26, width: 1.05 },
    "tracer-lime": { color: ramp2(120, 85), core: "240,255,225", glow: 22, width: 1 },
    "tracer-silver": { color: (t, a = 1) => hsl(215, 12, lerp(55, 88, t), a), core: "255,255,255", glow: 18, width: 0.95 },
    "tracer-sunset": { color: ramp2(335, 40, 95, 60, 62), core: "255,240,225", glow: 28, width: 1.05 },
    "tracer-plasma": { color: ramp2(275, 215, 100, 60, 66), core: "235,225,255", glow: 34, width: 1.15 },
    "tracer-gold": { color: (t, a = 1) => hsl(lerp(38, 50, t), 100, lerp(48, 68, t), a), core: "255,250,220", glow: 36, width: 1.2 },
    "tracer-inferno": { color: (t, a = 1) => hsl(lerp(2, 52, t * t), 100, lerp(45, 72, t), a), core: "255,255,235", glow: 42, width: 1.3 },
    "tracer-prism": { color: (t, a = 1, clock2 = 0) => hsl(clock2 * 90 + t * 300, 100, 62, a), core: "255,255,255", glow: 40, width: 1.2 }
  };
  var PINS = {
    "pins-classic": { standing: { fill: "rgba(90,255,176,.28)", stroke: "rgba(90,255,176,.95)", text: "#fff" }, down: { fill: "rgba(255,90,110,.32)", stroke: "rgba(255,90,110,.95)", text: "rgba(255,255,255,.35)" }, unknown: { fill: "rgba(70,230,255,.10)", stroke: "rgba(70,230,255,.55)" } },
    "pins-ice": { standing: { fill: "rgba(170,225,255,.35)", stroke: "rgba(210,240,255,.95)", text: "#fff" }, down: { fill: "rgba(70,110,170,.35)", stroke: "rgba(110,150,210,.8)", text: "rgba(255,255,255,.35)" }, unknown: { fill: "rgba(170,225,255,.10)", stroke: "rgba(170,225,255,.5)" } },
    "pins-sunny": { standing: { fill: "rgba(255,214,90,.35)", stroke: "rgba(255,226,120,.95)", text: "#fff" }, down: { fill: "rgba(255,120,60,.32)", stroke: "rgba(255,130,70,.9)", text: "rgba(255,255,255,.35)" }, unknown: { fill: "rgba(255,214,90,.10)", stroke: "rgba(255,214,90,.5)" } },
    "pins-mono": { standing: { fill: "rgba(255,255,255,.30)", stroke: "rgba(255,255,255,.95)", text: "#fff" }, down: { fill: "rgba(255,255,255,.04)", stroke: "rgba(255,255,255,.3)", text: "rgba(255,255,255,.3)" }, unknown: { fill: "rgba(255,255,255,.08)", stroke: "rgba(255,255,255,.45)" } },
    "pins-neon": { standing: { fill: "rgba(255,60,220,.30)", stroke: "rgba(255,90,235,1)", text: "#fff" }, down: { fill: "rgba(60,255,240,.16)", stroke: "rgba(60,255,240,.8)", text: "rgba(255,255,255,.35)" }, unknown: { fill: "rgba(255,60,220,.10)", stroke: "rgba(255,60,220,.5)" } },
    "pins-gold": { standing: { fill: "rgba(255,200,60,.42)", stroke: "rgba(255,225,110,1)", text: "#fff" }, down: { fill: "rgba(120,80,20,.30)", stroke: "rgba(190,140,50,.8)", text: "rgba(255,255,255,.35)" }, unknown: { fill: "rgba(255,200,60,.12)", stroke: "rgba(255,200,60,.55)" } },
    "pins-holo": { standing: { fill: "rgba(160,120,255,.34)", stroke: "rgba(120,255,230,1)", text: "#fff" }, down: { fill: "rgba(255,120,200,.22)", stroke: "rgba(255,150,220,.85)", text: "rgba(255,255,255,.35)" }, unknown: { fill: "rgba(160,120,255,.10)", stroke: "rgba(160,120,255,.5)" } }
  };
  var LANES = {
    "lane-house": { fill: "rgba(255,214,150,.07)", edge: "rgba(120,200,255,.8)", major: "rgba(255,255,255,.3)", minor: "rgba(255,255,255,.12)", foul: "rgba(255,90,110,.95)", arrow: "rgba(255,210,90,.8)", backdrop: "#10151f" },
    "lane-ice": { fill: "rgba(150,210,255,.12)", edge: "rgba(190,235,255,.95)", major: "rgba(210,240,255,.4)", minor: "rgba(210,240,255,.16)", foul: "rgba(255,255,255,.95)", arrow: "rgba(200,240,255,.9)", backdrop: "#0b1a2a" },
    "lane-night": { fill: "rgba(120,100,255,.09)", edge: "rgba(160,140,255,.9)", major: "rgba(200,190,255,.28)", minor: "rgba(200,190,255,.1)", foul: "rgba(255,120,200,.95)", arrow: "rgba(190,170,255,.85)", backdrop: "#07070f" },
    "lane-grass": { fill: "rgba(90,200,110,.14)", edge: "rgba(180,255,190,.9)", major: "rgba(230,255,230,.35)", minor: "rgba(230,255,230,.14)", foul: "rgba(255,255,255,.95)", arrow: "rgba(255,255,255,.8)", backdrop: "#0b1a10" },
    "lane-neon": { fill: "rgba(0,255,220,.07)", edge: "rgba(0,255,230,1)", major: "rgba(255,60,220,.5)", minor: "rgba(0,255,230,.2)", foul: "rgba(255,60,220,1)", arrow: "rgba(255,240,60,.95)", backdrop: "#050510" },
    "lane-gold": { fill: "rgba(255,200,70,.14)", edge: "rgba(255,225,120,1)", major: "rgba(255,230,150,.45)", minor: "rgba(255,230,150,.16)", foul: "rgba(255,255,255,1)", arrow: "rgba(255,245,200,.95)", backdrop: "#140e04" },
    "lane-void": { fill: "rgba(255,255,255,.03)", edge: "rgba(255,255,255,.55)", major: "rgba(255,255,255,.18)", minor: "rgba(255,255,255,.06)", foul: "rgba(255,70,70,1)", arrow: "rgba(255,255,255,.55)", backdrop: "#000" }
  };
  var KEY3 = "laneiq.skins";
  var DEFAULTS = { tracer: "tracer-aurora", pins: "pins-classic", lane: "lane-house" };
  var sel = { ...DEFAULTS };
  try {
    Object.assign(sel, JSON.parse(localStorage.getItem(KEY3) ?? "{}"));
  } catch {
  }
  var ON_KEY = "laneiq.skinsOn";
  var skinsOn = false;
  try {
    skinsOn = localStorage.getItem(ON_KEY) === "on";
  } catch {
  }
  var skinsEnabled = () => skinsOn;
  function setSkinsOn(on2) {
    skinsOn = on2;
    try {
      localStorage.setItem(ON_KEY, on2 ? "on" : "off");
    } catch {
    }
  }
  var currentTracer = () => TRACERS[skinsOn ? sel.tracer : DEFAULTS.tracer] ?? TRACERS[DEFAULTS.tracer];
  var currentPins = () => PINS[skinsOn ? sel.pins : DEFAULTS.pins] ?? PINS[DEFAULTS.pins];
  var currentLane = () => LANES[skinsOn ? sel.lane : DEFAULTS.lane] ?? LANES[DEFAULTS.lane];
  var activeSkins = () => skinsOn ? { ...sel } : { ...DEFAULTS };
  var equippedSkins = () => ({ ...sel });
  var skinClock = () => performance.now() / 1e3;
  var GLOW_KEY = "laneiq.glow";
  var glow = true;
  try {
    glow = localStorage.getItem(GLOW_KEY) !== "off";
  } catch {
  }
  var glowEnabled = () => glow;
  function setGlow(on2) {
    glow = on2;
    try {
      localStorage.setItem(GLOW_KEY, on2 ? "on" : "off");
    } catch {
    }
  }
  function equip(slot, id) {
    sel[slot] = id;
    setSkinsOn(true);
    try {
      localStorage.setItem(KEY3, JSON.stringify(sel));
    } catch {
    }
  }

  // core/src/rewards.ts
  var SKINS = [
    // ball tracers
    { id: "tracer-aurora", kind: "tracer", name: "Aurora", unlock: { free: true } },
    { id: "tracer-ember", kind: "tracer", name: "Ember", unlock: { pinfall: 500 } },
    { id: "tracer-lime", kind: "tracer", name: "Lime", unlock: { pinfall: 2e3 } },
    { id: "tracer-silver", kind: "tracer", name: "Silver", unlock: { pinfall: 5e3 } },
    { id: "tracer-sunset", kind: "tracer", name: "Sunset", unlock: { pinfall: 1e4 } },
    { id: "tracer-plasma", kind: "tracer", name: "Plasma", unlock: { points: 100 } },
    { id: "tracer-gold", kind: "tracer", name: "Liquid gold", unlock: { points: 300 } },
    { id: "tracer-inferno", kind: "tracer", name: "Inferno", unlock: { points: 600 } },
    { id: "tracer-prism", kind: "tracer", name: "Prism (color-cycling)", unlock: { points: 1e3 } },
    // pins
    { id: "pins-classic", kind: "pins", name: "Classic", unlock: { free: true } },
    { id: "pins-ice", kind: "pins", name: "Ice", unlock: { pinfall: 1e3 } },
    { id: "pins-sunny", kind: "pins", name: "Sunny", unlock: { pinfall: 4e3 } },
    { id: "pins-mono", kind: "pins", name: "Mono", unlock: { pinfall: 8e3 } },
    { id: "pins-neon", kind: "pins", name: "Neon", unlock: { points: 150 } },
    { id: "pins-gold", kind: "pins", name: "Gold", unlock: { points: 450 } },
    { id: "pins-holo", kind: "pins", name: "Holo", unlock: { points: 800 } },
    // lanes
    { id: "lane-house", kind: "lane", name: "House wood", unlock: { free: true } },
    { id: "lane-ice", kind: "lane", name: "Ice blue", unlock: { pinfall: 1500 } },
    { id: "lane-night", kind: "lane", name: "Night", unlock: { pinfall: 6e3 } },
    { id: "lane-grass", kind: "lane", name: "Fairway", unlock: { pinfall: 12e3 } },
    { id: "lane-neon", kind: "lane", name: "Neon grid", unlock: { points: 200 } },
    { id: "lane-gold", kind: "lane", name: "Gold rush", unlock: { points: 500 } },
    { id: "lane-void", kind: "lane", name: "Void", unlock: { points: 900 } }
  ];
  function totalPinfall(games2, shots) {
    const linked = new Set(games2.flatMap((g) => g.rolls.map((r) => r.shotId)).filter(Boolean));
    const fromGames = games2.reduce((a, g) => a + g.rolls.reduce((b, r) => b + r.down.length, 0), 0);
    const fromShots = shots.filter((s) => !linked.has(s.id) && s.result).reduce((a, s) => a + s.result.pinsDown, 0);
    return fromGames + fromShots;
  }
  var pointsForLevel = (n) => n <= 1 ? 0 : Math.round(40 * (n - 1) ** 1.5 + 60 * (n - 1));
  function levelOf(points) {
    let n = 1;
    while (points >= pointsForLevel(n + 1)) n++;
    return n;
  }
  var GAME_MILESTONES = [[100, 20, "Broke 100"], [150, 30, "Broke 150"], [200, 60, "Broke 200"], [250, 100, "Broke 250"], [300, 300, "A perfect 300"]];
  var STREAKS = [[3, 15, "Turkey: three strikes in a row"], [4, 25, "Four-bagger: four strikes in a row"], [5, 40, "Five-bagger: five strikes in a row"], [6, 60, "Six-bagger: six strikes in a row"], [9, 150, "Nine in a row"], [12, 300, "Twelve in a row"]];
  function strikeRun(g) {
    const rp = replay(g.rolls);
    let best = 0, cur2 = 0;
    rp.states.forEach((s, k2) => {
      if (s.fresh && g.rolls[k2].down.length === 10) best = Math.max(best, ++cur2);
      else if (s.fresh) cur2 = 0;
    });
    return best;
  }
  function achievements(games2, axes) {
    const out = [];
    const done2 = games2.filter((g) => replay(g.rolls).complete).sort((a, b) => a.at.localeCompare(b.at));
    const scores = done2.map((g) => scoreGame(g.rolls).total);
    if (done2.length) out.push({ id: "first-game", title: "First game on the card", detail: "Finish a scored game", points: 10 });
    for (const [min, pts, title] of GAME_MILESTONES) if (scores.some((s) => s >= min)) out.push({ id: `score-${min}`, title, detail: `Score ${min} or more in a game`, points: pts });
    let best = -1, pbs = 0;
    scores.forEach((s) => {
      if (s > best) {
        if (best >= 0) pbs++;
        best = s;
      }
    });
    for (let i = 1; i <= Math.min(pbs, 20); i++) out.push({ id: `pb-${i}`, title: `New high game (#${i})`, detail: "Beat your best game", points: 10 });
    const run = games2.reduce((m, g) => Math.max(m, strikeRun(g)), 0);
    for (const [n, pts, title] of STREAKS) if (run >= n) out.push({ id: `streak-${n}`, title, detail: `${n} strikes in a row in one game`, points: pts });
    const clean = done2.filter((g) => {
      const f = bowlingStats([g]);
      return f.openFrames === 0;
    }).length;
    if (clean >= 1) out.push({ id: "clean-1", title: "Clean game", detail: "A game with no open frames", points: 50 });
    if (clean >= 5) out.push({ id: "clean-5", title: "Five clean games", detail: "Five games with no open frames", points: 150 });
    if (done2.length >= 10) {
      const avg2 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
      const gain = avg2(scores.slice(-5)) - avg2(scores.slice(0, 5));
      for (const [need, pts] of [[5, 30], [10, 60], [20, 120]]) if (gain >= need) out.push({ id: `avg-${need}`, title: `Average up ${need} pins`, detail: "Your last five games against your first five", points: pts });
    }
    let splits = 0;
    for (const g of games2) {
      const rp = replay(g.rolls);
      rp.states.forEach((s, k2) => {
        if (s.fresh) return;
        if (isSplit(s.standingBefore) && g.rolls[k2].down.filter((p) => s.standingBefore.includes(p)).length === s.standingBefore.length) splits++;
      });
    }
    if (splits >= 1) out.push({ id: "split-1", title: "Converted a split", detail: "Pick up a split for the spare", points: 25 });
    if (splits >= 5) out.push({ id: "split-5", title: "Split specialist", detail: "Convert five splits", points: 75 });
    for (const a of axes) {
      if (a.score !== null && a.score >= 85) out.push({ id: `skill-${a.id}-85`, title: `${a.label}: strong`, detail: `${a.label} at 85 or better on the skills chart`, points: 25 });
      if (a.score !== null && a.score >= 100) out.push({ id: `skill-${a.id}-100`, title: `${a.label}: at target`, detail: `${a.label} reached its target`, points: 50 });
      if (a.score !== null && a.earlierScore !== null && a.score - a.earlierScore >= 10) out.push({ id: `skill-${a.id}-up`, title: `${a.label}: improving`, detail: `${a.label} is up 10 points or more since you started`, points: 20 });
    }
    return out;
  }
  function progress(games2, shots, axes, extraPoints = 0) {
    const earned = achievements(games2, axes);
    const points = earned.reduce((a, b) => a + b.points, 0) + extraPoints;
    const level = levelOf(points);
    const lo = pointsForLevel(level), hi = pointsForLevel(level + 1);
    return { pinfall: totalPinfall(games2, shots), points, level, levelProgress: { into: points - lo, span: hi - lo }, earned };
  }
  function isUnlocked(s, p) {
    const u = s.unlock;
    return "free" in u || "pinfall" in u && p.pinfall >= u.pinfall || "points" in u && p.points >= u.points;
  }
  var unlockText = (s) => "free" in s.unlock ? "Free" : "pinfall" in s.unlock ? `${s.unlock.pinfall.toLocaleString()} pins knocked down` : `${s.unlock.points} improvement points`;
  function nextUnlocks(p) {
    const play = SKINS.filter((s) => "pinfall" in s.unlock && p.pinfall < s.unlock.pinfall).sort((a, b) => a.unlock.pinfall - b.unlock.pinfall)[0];
    const imp = SKINS.filter((s) => "points" in s.unlock && p.points < s.unlock.points).sort((a, b) => a.unlock.points - b.unlock.points)[0];
    return {
      play: play ? { skin: play, need: play.unlock.pinfall - p.pinfall } : null,
      improve: imp ? { skin: imp, need: imp.unlock.points - p.points } : null
    };
  }

  // core/src/skills.ts
  var AXES = [
    {
      id: "strikes",
      label: "Strikes",
      group: "Scoring",
      higherBetter: true,
      target: 60.2,
      unit: "%",
      basis: "benchmark",
      at200: 49.7,
      minSample: 20,
      source: "Strike rate of a 220-average bowler: 60.2% (200 average: 49.7%). Bowling This Month, Nov 2020.",
      drill: "Strikes come from hitting the pocket with enough entry angle. Work on the pocket and entry-angle axes first, then match your ball and surface to the lane."
    },
    {
      id: "singles",
      label: "Single-pin spares",
      group: "Scoring",
      higherBetter: true,
      target: 95.1,
      unit: "%",
      basis: "benchmark",
      at200: 85.6,
      minSample: 5,
      source: "Single-pin conversion of a 220-average bowler: 95.1% (200 average: 85.6%). Bowling This Month, Nov 2020.",
      drill: "Use a plastic spare ball (99% of elite bowlers do, Bowling This Month 2016) and the 3-6-9 system: same target as your strike shot, feet moved 3, 6 or 9 boards. Practice the 10 and 7 pins most."
    },
    {
      id: "closed",
      label: "Closed frames",
      group: "Scoring",
      higherBetter: true,
      target: 91.9,
      unit: "%",
      basis: "benchmark",
      at200: 85,
      minSample: 20,
      source: "Frames closed with a strike or spare, 220 average: 91.9% (200 average: 85.0%). Bowling This Month, Nov 2020.",
      drill: "Every open frame is a spare you missed or a split you left. Convert the makeable ones: check the Score tab's list of leaves to practice."
    },
    {
      id: "firstBall",
      label: "First-ball pins",
      group: "Scoring",
      higherBetter: true,
      target: 9.2,
      unit: " pins",
      basis: "benchmark",
      minSample: 20,
      source: 'A first-ball average over 9.2 means most shots reach the pocket (Bowling This Month, "Increasing Your Carry Percentage").',
      drill: "Raise it by repeating your line: same feet, same target, same speed. Fix the arrows and start-board spread first."
    },
    {
      id: "pocket",
      label: "Pocket hits",
      group: "Accuracy",
      higherBetter: true,
      target: 70,
      unit: "%",
      basis: "coaching",
      minSample: 10,
      source: "Share of tracked shots entering within 1 board of the pocket. LaneIQ working target: 70%.",
      drill: "Pick one target arrow and bowl 10 shots at it. Move your feet, not your target, to bring the entry board back to the pocket."
    },
    {
      id: "entry",
      label: "Entry angle",
      group: "Accuracy",
      higherBetter: true,
      target: 4,
      unit: "\xB0",
      basis: "coaching",
      minSample: 8,
      source: "Average entry angle at the pins. LaneIQ working target: at least 4 degrees (below about 3 the ball has little room to carry the pocket).",
      drill: "Test one change: a little less speed or a touch more rotation, and keep your line. Check whether the entry angle passes 4 degrees."
    },
    {
      id: "arrows",
      label: "Target control",
      group: "Repeatability",
      higherBetter: false,
      target: 1,
      unit: " boards \xB1",
      basis: "coaching",
      minSample: 8,
      source: "Spread (standard deviation) of the board you cross at the arrows. LaneIQ working target: under 1 board.",
      drill: "Lay a towel or marker on your target arrow. Throw 10 shots looking only at it, same feet, and check the arrows board after each."
    },
    {
      id: "start",
      label: "Start position",
      group: "Repeatability",
      higherBetter: false,
      target: 1,
      unit: " boards \xB1",
      basis: "coaching",
      minSample: 8,
      source: "Spread of the board the ball starts on. LaneIQ working target: under 1 board.",
      drill: "Mark your feet on the approach with tape and check your slide ends in the same place each shot."
    },
    {
      id: "speed",
      label: "Speed control",
      group: "Repeatability",
      higherBetter: false,
      target: 0.6,
      unit: " mph \xB1",
      basis: "coaching",
      minSample: 8,
      source: "Spread of launch speed. LaneIQ working target: under 0.6 mph.",
      drill: "Throw 10 shots at the same effort and watch the live speed. Keep every shot within half a mile an hour of the first."
    }
  ];
  var sdOf = (v) => {
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1));
  };
  var nums = (xs) => xs.filter((x) => typeof x === "number" && Number.isFinite(x));
  function frameOutcomes(games2) {
    let closed = 0, open2 = 0;
    for (const g of games2) {
      const rp = replay(g.rolls);
      const by = /* @__PURE__ */ new Map();
      rp.states.forEach((s, k2) => by.set(s.frame, [...by.get(s.frame) ?? [], g.rolls[k2].down.filter((p) => s.standingBefore.includes(p)).length]));
      for (const [f, c] of by) {
        if (f < 10) {
          if (c[0] === 10) closed++;
          else if (c.length === 2) c[0] + c[1] === 10 ? closed++ : open2++;
        } else if (rp.complete) {
          c[0] === 10 || c.length >= 2 && c[0] + c[1] >= 10 ? closed++ : open2++;
        }
      }
    }
    return { closed, open: open2 };
  }
  function measure(games2, shots) {
    const st2 = bowlingStats(games2);
    const fo = frameOutcomes(games2);
    const fresh2 = games2.reduce((a, g) => a + replay(g.rolls).states.filter((s) => s.fresh).length, 0);
    const pk = shots.filter((s) => s.m.pocketMiss !== null);
    const sdv = (key2) => {
      const v = nums(shots.map((s) => s.m[key2]));
      return { value: v.length >= 2 ? sdOf(v) : null, n: v.length };
    };
    const ea = nums(shots.map((s) => s.m.entryAngle));
    return {
      strikes: { value: st2.strikePct, n: fresh2 },
      singles: { value: st2.singlePin.attempts ? st2.singlePin.made / st2.singlePin.attempts * 100 : null, n: st2.singlePin.attempts },
      closed: { value: fo.closed + fo.open ? fo.closed / (fo.closed + fo.open) * 100 : null, n: fo.closed + fo.open },
      firstBall: { value: st2.firstBallAvg, n: fresh2 },
      pocket: { value: pk.length ? pk.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / pk.length * 100 : null, n: pk.length },
      entry: { value: ea.length ? ea.reduce((a, b) => a + b, 0) / ea.length : null, n: ea.length },
      arrows: sdv("arrowsBoard"),
      start: sdv("startBoard"),
      speed: sdv("launchSpeed")
    };
  }
  function scoreOf(def, value) {
    if (value === null) return null;
    const s = def.higherBetter ? value / def.target * 100 : value <= 0 ? 100 : def.target / value * 100;
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  function skillsProfile(games2, shots) {
    const now = measure(games2, shots);
    const gh = Math.floor(games2.length / 2), sh = Math.floor(shots.length / 2);
    const early = measure(games2.slice(0, gh), shots.slice(0, sh));
    return AXES.map((d) => {
      const m = now[d.id];
      const e = early[d.id];
      const value = m.n >= d.minSample ? m.value : null;
      return {
        ...d,
        value,
        score: scoreOf(d, value),
        score200: d.at200 === void 0 ? null : scoreOf(d, d.at200),
        earlierScore: e.n >= d.minSample && value !== null && (games2.length >= 4 || shots.length >= 16) ? scoreOf(d, e.value) : null
      };
    });
  }
  function focusList(axes) {
    return axes.filter((a) => a.score !== null && a.score < 100).map((a) => ({ axis: a, gap: 100 - a.score + (a.group === "Scoring" ? 3 : 0) })).sort((a, b) => b.gap - a.gap);
  }
  var strongest = (axes) => axes.filter((a) => a.score !== null).sort((a, b) => b.score - a.score).slice(0, 3);

  // camera/skinscene.ts
  function drawSkinScene(c, tracerId, pinsId, laneId, clock2 = 0, ballT = 1) {
    const g = c.getContext("2d");
    const w = c.width, h = c.height;
    const lane = LANES[laneId] ?? LANES["lane-house"], pins = PINS[pinsId] ?? PINS["pins-classic"], tr = TRACERS[tracerId] ?? TRACERS["tracer-aurora"];
    g.clearRect(0, 0, w, h);
    g.fillStyle = lane.backdrop;
    g.fillRect(0, 0, w, h);
    const P = (u, v) => {
      const half = (0.46 - v * 0.2) * w;
      return { x: w / 2 + (u - 0.5) * 2 * half, y: h * (0.94 - v * 0.82) };
    };
    g.beginPath();
    [P(0, 0), P(1, 0), P(1, 1), P(0, 1)].forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    g.closePath();
    g.fillStyle = lane.fill;
    g.fill();
    for (let i = 0; i <= 39; i++) {
      const edge = i === 0 || i === 39, major = (39 - i) % 5 === 0;
      g.strokeStyle = edge ? lane.edge : major ? lane.major : lane.minor;
      g.lineWidth = edge ? 2 : 1;
      g.beginPath();
      const a = P(i / 39, 0), b = P(i / 39, 1);
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.strokeStyle = lane.foul;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(P(0, 0).x, P(0, 0).y);
    g.lineTo(P(1, 0).x, P(1, 0).y);
    g.stroke();
    g.fillStyle = lane.arrow;
    for (let b = 1; b <= 7; b++) {
      const u = b / 8, v = 0.2 + 0.05 * (1 - Math.abs(b - 4) / 3), p = P(u, v);
      g.beginPath();
      g.moveTo(p.x, p.y - 4);
      g.lineTo(p.x - 4, p.y + 5);
      g.lineTo(p.x + 4, p.y + 5);
      g.closePath();
      g.fill();
    }
    const rows2 = [[0.5], [0.44, 0.56], [0.38, 0.5, 0.62], [0.32, 0.44, 0.56, 0.68]];
    let n = 1;
    rows2.forEach(
      (row, ri) => row.forEach((u) => {
        const p = P(u, 0.88 + ri * 0.045);
        const down = n === 2 || n === 4 || n === 9;
        const st2 = down ? pins.down : pins.standing;
        g.beginPath();
        g.arc(p.x, p.y, 8, 0, 7);
        g.fillStyle = st2.fill;
        g.fill();
        g.strokeStyle = st2.stroke;
        g.lineWidth = 1.8;
        g.stroke();
        n++;
      })
    );
    const pts = [];
    const steps = 60;
    for (let i = 0; i <= steps * ballT; i++) {
      const t = i / steps;
      const u = 0.82 - 0.2 * t - 0.26 * Math.max(0, t - 0.55) ** 2 * 3.2;
      pts.push(P(u, 0.02 + t * 0.9));
    }
    const glow2 = glowEnabled();
    g.save();
    g.globalCompositeOperation = glow2 ? "lighter" : "source-over";
    g.lineCap = "round";
    for (let i = 1; i < pts.length; i++) {
      const t = i / Math.max(1, pts.length - 1);
      if (!glow2) {
        g.shadowBlur = 0;
        g.strokeStyle = tr.color(t, 0.5 + 0.5 * t, clock2);
        g.lineWidth = 1.5 + 2.5 * t;
        g.beginPath();
        g.moveTo(pts[i - 1].x, pts[i - 1].y);
        g.lineTo(pts[i].x, pts[i].y);
        g.stroke();
        continue;
      }
      g.shadowBlur = tr.glow * 0.5;
      g.shadowColor = tr.color(t, 1, clock2);
      g.strokeStyle = tr.color(t, 0.2 + 0.8 * t, clock2);
      g.lineWidth = (2 + 7 * t) * tr.width;
      g.beginPath();
      g.moveTo(pts[i - 1].x, pts[i - 1].y);
      g.lineTo(pts[i].x, pts[i].y);
      g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = `rgba(${tr.core},${t})`;
      g.lineWidth = (0.8 + 2 * t) * tr.width;
      g.stroke();
    }
    g.restore();
  }

  // camera/rewardsui.ts
  var SEEN_KEY = "laneiq.unlockSeen";
  var raf = 0;
  async function current() {
    const games2 = await loadGames();
    const axes = skillsProfile(games2, S.shots);
    return progress(games2, S.shots, axes);
  }
  var toastTimer = 0;
  function toast(text) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.cssText = "position:fixed;left:50%;bottom:calc(86px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:90vw;background:linear-gradient(90deg,#46e6ff,#ff4fd8);color:#06101c;font:700 14px system-ui;padding:11px 16px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.5);text-align:center";
      el.onclick = () => openRewards();
      document.body.append(el);
    }
    el.textContent = text;
    el.style.display = "block";
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.style.display = "none", 6e3);
  }
  async function checkUnlocks() {
    try {
      const p = await current();
      const open2 = SKINS.filter((s) => isUnlocked(s, p)).map((s) => s.id);
      const raw = localStorage.getItem(SEEN_KEY);
      localStorage.setItem(SEEN_KEY, JSON.stringify(open2));
      if (raw === null) return;
      const seen2 = new Set(JSON.parse(raw));
      const fresh2 = SKINS.filter((s) => open2.includes(s.id) && !seen2.has(s.id));
      if (fresh2.length) toast(`Unlocked: ${fresh2.slice(0, 2).map((s) => s.name).join(", ")}${fresh2.length > 2 ? ` and ${fresh2.length - 2} more` : ""}. Tap to equip.`);
    } catch {
    }
  }
  async function summaryHtml() {
    const p = await current();
    const nx = nextUnlocks(p);
    return `<div class="k">Rewards \xB7 level ${p.level}</div><div class="u">${p.points} improvement points \xB7 ${p.pinfall.toLocaleString()} pins knocked down</div>
    <div class="u">${nx.play ? `Next play skin: <b>${esc(nx.play.skin.name)}</b>, ${nx.play.need.toLocaleString()} pins to go.` : ""} ${nx.improve ? `Next improvement skin: <b>${esc(nx.improve.skin.name)}</b>, ${nx.improve.need} points to go.` : ""}</div>`;
  }
  async function openRewards() {
    const el = $("rewards");
    el.classList.add("on");
    const p = await current();
    const lv = p.level, lo = pointsForLevel(lv), hi = pointsForLevel(lv + 1);
    const nx = nextUnlocks(p);
    const eq = skinsEnabled() ? equippedSkins() : { tracer: "", pins: "", lane: "" };
    const base = activeSkins();
    const grid = (kind2, title) => `<h3>${title}</h3><div class="skin-grid">${SKINS.filter((s) => s.kind === kind2).map((s) => {
      const open2 = isUnlocked(s, p);
      return `<button class="skin ${open2 ? "" : "locked"} ${eq[kind2] === s.id ? "on" : ""}" data-skin="${s.id}" data-kind="${kind2}" ${open2 ? "" : "disabled"}><canvas width="150" height="170" data-c="${s.id}"></canvas><div class="n">${esc(s.name)}</div><div class="r ${"points" in s.unlock ? "rare" : ""}">${open2 ? eq[kind2] === s.id ? "Equipped" : "Tap to equip" : "Locked: " + esc(unlockText(s))}</div></button>`;
    }).join("")}</div>`;
    el.innerHTML = `
    <div class="row"><h2>Rewards</h2><button class="btn ghost" id="rw-close">Close</button></div>
    <div class="note">Knock down pins to unlock everyday skins. Improve to earn the rare ones. Points come from getting better, not from throwing more shots.</div>
    <div class="card"><div class="k">Level ${lv}</div>
      <div class="u">${p.points} improvement points \xB7 ${p.pinfall.toLocaleString()} pins knocked down</div>
      <div style="height:8px;border-radius:4px;background:rgba(255,255,255,.1);margin:8px 0"><div style="width:${Math.min(100, (p.points - lo) / Math.max(1, hi - lo) * 100)}%;height:8px;border-radius:4px;background:linear-gradient(90deg,#46e6ff,#ff4fd8)"></div></div>
      <div class="note">${hi - p.points} more points to level ${lv + 1}</div>
      <div class="u" style="margin-top:6px">${nx.play ? `<b>Play:</b> ${esc(nx.play.skin.name)} (${nx.play.skin.kind}): ${nx.play.need.toLocaleString()} more pins` : "Every play skin unlocked."}</div>
      <div class="u">${nx.improve ? `<b>Improve:</b> ${esc(nx.improve.skin.name)} (${nx.improve.skin.kind}): ${nx.improve.need} more points` : "Every improvement skin unlocked."}</div></div>
    <div class="card"><div class="k">Your look</div><div class="chips"><button class="chip ${skinsEnabled() ? "sel" : ""}" id="rw-skins">Skins: ${skinsEnabled() ? "on" : "off"}</button><button class="chip ${glowEnabled() ? "sel" : ""}" id="rw-glow">Glow: ${glowEnabled() ? "on" : "off"}</button></div><div class="note">${skinsEnabled() ? "Your skins are showing in the app." : "Skins are off: the app keeps its standard look. Tap one below to try it."} Turn glow off for crisp lines and no halos, so you can read each shot exactly.</div><canvas id="rw-big" width="360" height="300" style="width:100%;max-width:420px;display:block;margin:0 auto"></canvas></div>
    ${grid("tracer", "Ball tracers")}${grid("pins", "Pins")}${grid("lane", "Lanes")}
    <div class="card"><div class="k">How you earned your points</div>
      ${p.earned.length ? `<ul>${p.earned.map((a) => `<li><b>+${a.points}</b> ${esc(a.title)} <span class="note">${esc(a.detail)}</span></li>`).join("")}</ul>` : `<div class="u">Nothing yet. Finish a game on the Score tab, or reach a target on the skills chart.</div>`}
      <div class="note">Points come from new high games, strike streaks, clean games, scoring milestones, a rising average, converted splits and skills reaching their targets.</div></div>`;
    $("rw-skins").onclick = () => (setSkinsOn(!skinsEnabled()), void openRewards());
    $("rw-glow").onclick = () => (setGlow(!glowEnabled()), void openRewards());
    $("rw-close").onclick = () => (cancelAnimationFrame(raf), el.classList.remove("on"), el.innerHTML = "");
    el.querySelectorAll("canvas[data-c]").forEach((c) => {
      const id = c.dataset.c;
      const k2 = SKINS.find((s) => s.id === id).kind;
      drawSkinScene(c, k2 === "tracer" ? id : base.tracer, k2 === "pins" ? id : base.pins, k2 === "lane" ? id : base.lane);
    });
    el.querySelectorAll(".skin:not(.locked)").forEach((b) => b.onclick = () => {
      equip(b.dataset.kind, b.dataset.skin);
      void openRewards();
    });
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const tick = (now) => {
      const big = document.getElementById("rw-big");
      if (!big) return;
      const e = activeSkins();
      drawSkinScene(big, e.tracer, e.pins, e.lane, skinClock(), Math.min(1, (now - t0) % 3200 / 2400));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  // camera/scorecard.ts
  var games = [];
  var loadedFor = "";
  var leaveSel = /* @__PURE__ */ new Set();
  async function ensureLoaded() {
    const id = S.profile?.id ?? "";
    if (loadedFor === id) return;
    loadedFor = id;
    games = (id && !S.demo ? await dbGet(id, "meta", "games").catch(() => void 0) : void 0) ?? [];
    leaveSel = /* @__PURE__ */ new Set();
  }
  async function persist() {
    if (!S.demo && S.profile) await dbPut(S.profile.id, "meta", games, "games").catch(() => {
    });
    void checkUnlocks();
  }
  var current2 = () => {
    const g = games[games.length - 1];
    return g && !replay(g.rolls).complete ? g : void 0;
  };
  function cameraSuggestion() {
    const used = new Set(games.flatMap((g) => g.rolls.map((r) => r.shotId)).filter(Boolean));
    const s = [...S.shots].reverse().find((x) => x.result?.auto && !used.has(x.id));
    if (!s || !s.result) return null;
    const when3 = Date.now() - new Date(s.at).getTime();
    if (when3 > 15 * 6e4) return null;
    return { shotId: s.id, leave: s.result.pinsDown === 10 ? [] : s.result.leave ?? [] };
  }
  function deckSvg(standing, sel2) {
    const R2 = 19;
    const pin = (p) => {
      const { x, row } = PIN_XY[p];
      const cx = 130 + x * 4.8, cy = 28 + (3 - row) * 52;
      const gone = !standing.includes(p);
      const left = sel2.has(p);
      const ps = currentPins();
      const fill = gone ? "transparent" : left ? "#ffd25a" : ps.standing.fill;
      const stroke = gone ? "rgba(255,255,255,.12)" : left ? "#ffd25a" : ps.standing.stroke;
      return `<g data-pin="${p}" style="cursor:${gone ? "default" : "pointer"}"><circle cx="${cx}" cy="${cy}" r="${R2}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="15" font-weight="700" fill="${gone ? "rgba(255,255,255,.2)" : left ? "#111" : "#fff"}">${p}</text></g>`;
    };
    return `<svg viewBox="0 0 260 200" style="width:100%;max-width:340px;display:block;margin:0 auto;touch-action:manipulation">${ALL_PINS.map(pin).join("")}</svg>`;
  }
  function cardHtml(g) {
    const sc = scoreGame(g.rolls);
    const cells = Array.from({ length: 10 }, (_, i) => {
      const f = sc.frames[i];
      const m = f?.marks ?? [];
      const slots = i < 9 ? 2 : 3;
      const boxes = Array.from({ length: slots }, (_2, k2) => `<span style="display:inline-block;min-width:18px;text-align:center;border:1px solid var(--line);border-radius:3px;margin:0 1px;font-size:13px;${m[k2] === "X" ? "color:#5affb0;font-weight:700" : m[k2] === "/" ? "color:#46e6ff;font-weight:700" : ""}">${m[k2] ?? "&nbsp;"}</span>`).join("");
      return `<td style="text-align:center;padding:4px 2px;border:1px solid var(--line);vertical-align:top"><div style="font-size:10px;opacity:.6">${i + 1}</div><div>${boxes}</div><div style="font-weight:700;font-size:15px;min-height:20px">${f?.total ?? ""}</div></td>`;
    });
    return `<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:620px"><tr>${cells.join("")}</tr></table></div>`;
  }
  async function autoScoreShot(shot) {
    await ensureLoaded();
    if (!shot.result?.auto) return false;
    if (games.some((g) => g.rolls.some((r) => r.shotId === shot.id))) return false;
    let cur2 = current2();
    if (!cur2) {
      cur2 = { id: newId(), at: (/* @__PURE__ */ new Date()).toISOString(), rolls: [], lane: shot.lane };
      games.push(cur2);
    }
    const standing = replay(cur2.rolls).standing;
    const leave = shot.result.pinsDown === 10 && standing.length === 10 ? [] : shot.result.leave ?? [];
    if (!leave.every((p) => standing.includes(p))) return false;
    cur2.rolls.push({ down: standing.filter((p) => !leave.includes(p)), shotId: shot.id });
    leaveSel = /* @__PURE__ */ new Set();
    await persist();
    return true;
  }
  function liveScoreHtml() {
    const g = games[games.length - 1];
    if (!g || !g.rolls.length) return "";
    const rp = replay(g.rolls);
    const sc = scoreGame(g.rolls);
    const head = `<div class="k" style="margin-top:8px">Scorecard \xB7 game ${games.length}</div><div class="u"><b>${sc.total}</b> ${rp.complete ? "final" : `after ${sc.frames.filter((f) => f.total !== null).length} scored frames \xB7 next: frame ${rp.frame}, ball ${rp.ball}`}</div>`;
    if (rp.complete || rp.standing.length === 10) return head;
    const adv = adviseSpare(rp.standing, bowlerProfile().hand);
    return `${head}<div class="u"><b>Spare: ${esc(adv.name)}.</b> ${esc(adv.text)}</div>`;
  }
  setResultExtra(liveScoreHtml);
  var pctStr = (v) => v === null ? "-" : `${Math.round(v)}%`;
  function statsHtml() {
    const st2 = bowlingStats(games);
    if (!st2.games) return `<div class="u">Statistics appear after your first game.</div>`;
    const leaves = Object.entries(st2.byLeave).sort((a, b) => b[1].attempts - a[1].attempts).slice(0, 8);
    return `<table>
    <tr><td>Average</td><td class="n">${st2.average === null ? "-" : st2.average.toFixed(1)} (${st2.completeGames} games)</td></tr>
    <tr><td>High game</td><td class="n">${st2.high ?? "-"}</td></tr>
    <tr><td>Strike %</td><td class="n">${pctStr(st2.strikePct)}</td></tr>
    <tr><td>First-ball average</td><td class="n">${st2.firstBallAvg === null ? "-" : st2.firstBallAvg.toFixed(1)} pins</td></tr>
    <tr><td>Spare conversion</td><td class="n">${pctStr(st2.sparePct)}</td></tr>
    <tr><td>Single-pin spares</td><td class="n">${st2.singlePin.attempts ? `${st2.singlePin.made}/${st2.singlePin.attempts} (${pctStr(st2.singlePin.made / st2.singlePin.attempts * 100)})` : "-"}</td></tr>
    <tr><td>Multi-pin spares</td><td class="n">${st2.multiPin.attempts ? `${st2.multiPin.made}/${st2.multiPin.attempts} (${pctStr(st2.multiPin.made / st2.multiPin.attempts * 100)})` : "-"}</td></tr>
    <tr><td>Open frames</td><td class="n">${st2.openFrames}</td></tr></table>
    ${leaves.length ? `<div class="k" style="margin-top:8px">Spare tries by leave</div><table>${leaves.map(([k2, t]) => `<tr><td>${esc(k2)}</td><td class="n">${t.made}/${t.attempts} (${pctStr(t.made / t.attempts * 100)})</td></tr>`).join("")}</table>` : ""}`;
  }
  function analysisHtml() {
    const done2 = games.filter((g) => replay(g.rolls).complete);
    const out = [];
    if (done2.length) {
      const w = done2.map((g) => whatIf(g.rolls));
      const avg2 = (f) => w.reduce((a, b) => a + f(b), 0) / w.length;
      const gain = avg2((x) => x.ifSingles - x.actual);
      out.push(`<div class="u">Missed single-pin spares cost you <b>${gain.toFixed(1)} pins a game</b> (${avg2((x) => x.missedSingles).toFixed(1)} a game). Make them all and your average would be ${avg2((x) => x.ifSingles).toFixed(0)} instead of ${avg2((x) => x.actual).toFixed(0)}.</div>`);
      out.push(`<div class="note">Missed spares of every kind: ${avg2((x) => x.missedSpares).toFixed(1)} a game; making all of them would score about ${avg2((x) => x.ifAllSpares).toFixed(0)}.</div>`);
    }
    const st2 = bowlingStats(games);
    const weak = Object.entries(st2.byLeave).filter(([, t]) => t.attempts >= 3 && t.made / t.attempts < 0.6).sort((a, b) => b[1].attempts - a[1].attempts).slice(0, 4);
    if (weak.length) out.push(`<div class="k" style="margin-top:8px">Practice these</div><ul>${weak.map(([k2, t]) => {
      const a = adviseSpare(k2.split("-").map(Number), bowlerProfile().hand);
      return `<li><b>${esc(a.name)}</b>: ${t.made}/${t.attempts} made. ${esc(a.text)}</li>`;
    }).join("")}</ul>`);
    const zones = {};
    for (const g of games) {
      const rp = replay(g.rolls);
      g.rolls.forEach((r, k2) => {
        const s = rp.states[k2];
        const shot = r.shotId ? S.shots.find((x) => x.id === r.shotId) : void 0;
        if (!s?.fresh || !shot?.m.zone) return;
        const z = zones[shot.m.zone] ??= { n: 0, x: 0 };
        z.n++;
        if (r.down.length === 10) z.x++;
      });
    }
    const zs = Object.entries(zones).filter(([, v]) => v.n >= 2);
    if (zs.length) {
      const label2 = { ...ZONE_LABEL, pocket: "Pocket hit" };
      out.push(`<div class="k" style="margin-top:8px">Strikes by where the ball hit (camera-tracked first balls)</div><table>${zs.map(([k2, v]) => `<tr><td>${label2[k2] ?? esc(k2)}</td><td class="n">${v.x}/${v.n} strikes (${Math.round(v.x / v.n * 100)}%)</td></tr>`).join("")}</table>`);
    }
    return out.length ? out.join("") : `<div class="u">Play a few games and this will show what is costing you pins.</div>`;
  }
  async function renderScore() {
    await ensureLoaded();
    const el = $("score-page");
    const g = current2();
    const rp = g ? replay(g.rolls) : null;
    const standing = rp?.standing ?? ALL_PINS;
    const advice = g && standing.length < 10 ? adviseSpare(standing, bowlerProfile().hand) : null;
    const cam = g ? cameraSuggestion() : null;
    const done2 = games.slice().reverse().slice(0, 12);
    el.innerHTML = `
    <h2>Score</h2>
    <div class="note">With the camera running, every shot is scored for you: the pins it reads go straight on the card and the spare coach tells you where to move. Tap the pins below only to fix a mistake or to score without the camera. Free, and it stays on this phone.</div>
    ${g ? `<div class="card"><div class="k">Game ${games.length} \xB7 ${rp.frame <= 10 ? `frame ${rp.frame}, ball ${rp.ball}` : ""}</div>${cardHtml(g)}</div>` : `<div class="card"><div class="u">${games.length ? "Game over. Start the next one." : "No game in progress."}</div><div class="chips"><button class="btn" id="sc-new">Start a game</button></div></div>`}
    ${g ? `<div class="card"><div class="k">${standing.length === 10 ? "How many pins are standing after this roll? Tap them" : "Tap the pins still standing"}</div>
      ${deckSvg(standing, leaveSel)}
      <div class="chips" style="justify-content:center">
        <button class="btn" id="sc-record">${leaveSel.size ? `Record: ${leaveSel.size} left (${standing.length - leaveSel.size} down)` : standing.length === 10 ? "Record a strike" : "Record a spare"}</button>
        <button class="btn ghost" id="sc-gutter">All ${standing.length} left</button>
        <button class="btn ghost" id="sc-undo">Undo last roll</button></div>
      ${cam ? `<div class="chips" style="justify-content:center"><button class="chip" id="sc-cam">Use the camera's read: ${cam.leave.length ? `leaves the ${cam.leave.join("-")}` : "a strike"}</button></div>` : ""}</div>` : ""}
    ${advice ? `<div class="card"><div class="k">Spare coach: ${esc(advice.name)}</div><div class="u"><b>${esc(advice.text)}</b></div>${advice.notes.map((n) => `<div class="note">${esc(n)}</div>`).join("")}<div class="note">3-6-9 spare system (USA Bowling and coaching sources): feet move 3, 6 or 9 boards away from the pin, aim stays on your strike target.</div></div>` : ""}
    <div class="card" id="sc-rewards"><div class="note">Loading rewards\u2026</div></div>
    <div class="card"><div class="k">Your statistics</div>${statsHtml()}</div>
    <div class="card"><div class="k">What costs you pins</div>${analysisHtml()}</div>
    ${done2.length ? `<div class="card"><div class="k">Games</div>${done2.map((x) => {
      const s = scoreGame(x.rolls);
      return `<div class="row" style="padding:6px 0;border-top:1px solid var(--line)"><div><b>${s.total}</b> <span class="note">${replay(x.rolls).complete ? "" : "in progress \xB7 "}${esc(new Date(x.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</span></div><button class="chip danger" data-del="${x.id}">Delete</button></div>`;
    }).join("")}</div>` : ""}`;
    void summaryHtml().then((h) => {
      const box = document.getElementById("sc-rewards");
      if (box) {
        box.innerHTML = h + `<div class="chips"><button class="btn" id="sc-rw">Skins and rewards</button></div>`;
        $("sc-rw").onclick = () => void openRewards();
      }
    });
    $("sc-new")?.addEventListener("click", async () => {
      games.push({ id: newId(), at: (/* @__PURE__ */ new Date()).toISOString(), rolls: [] });
      leaveSel = /* @__PURE__ */ new Set();
      await persist();
      renderScore();
    });
    const add2 = async (roll) => {
      const cur2 = current2();
      if (!cur2) return;
      cur2.rolls.push(roll);
      leaveSel = /* @__PURE__ */ new Set();
      await persist();
      renderScore();
    };
    el.querySelectorAll("[data-pin]").forEach((n) => {
      n.addEventListener("click", () => {
        const p = Number(n.getAttribute("data-pin"));
        if (!standing.includes(p)) return;
        if (leaveSel.has(p)) leaveSel.delete(p);
        else leaveSel.add(p);
        renderScore();
      });
    });
    $("sc-record")?.addEventListener("click", () => add2({ down: standing.filter((p) => !leaveSel.has(p)) }));
    $("sc-gutter")?.addEventListener("click", () => add2({ down: [] }));
    $("sc-undo")?.addEventListener("click", async () => {
      const cur2 = current2() ?? games[games.length - 1];
      if (!cur2 || !cur2.rolls.length) return;
      cur2.rolls.pop();
      leaveSel = /* @__PURE__ */ new Set();
      await persist();
      renderScore();
    });
    $("sc-cam")?.addEventListener("click", () => cam && add2({ down: standing.filter((p) => !cam.leave.includes(p)), shotId: cam.shotId }));
    el.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      games = games.filter((x) => x.id !== b.dataset.del);
      await persist();
      renderScore();
    });
  }
  async function loadGames() {
    await ensureLoaded();
    return games;
  }

  // camera/skills.ts
  var SIZE = 320;
  var C = SIZE / 2;
  var RAD = 104;
  var pt = (i, n, v) => {
    const a = -Math.PI / 2 + i / n * Math.PI * 2;
    return [C + Math.cos(a) * RAD * (v / 100), C + Math.sin(a) * RAD * (v / 100)];
  };
  var poly = (vals) => vals.map((v, i) => pt(i, vals.length, v ?? 0).map((x) => x.toFixed(1)).join(",")).join(" ");
  var fmt3 = (a, v) => a.unit.trim() === "%" ? `${v.toFixed(1)}%` : a.unit.trim() === "\xB0" ? `${v.toFixed(1)}\xB0` : `${v.toFixed(a.id === "speed" ? 2 : 1)}${a.unit}`;
  var targetText = (a) => `${a.higherBetter ? "at least " : "under "}${fmt3(a, a.target)}`;
  function radarSvg(axes, sel2) {
    const n = axes.length;
    const rings = [25, 50, 75, 100].map((r) => `<polygon points="${poly(axes.map(() => r))}" fill="none" stroke="rgba(255,255,255,${r === 100 ? 0.35 : 0.12})" stroke-width="${r === 100 ? 1.5 : 1}" ${r === 100 ? 'stroke-dasharray="4 3"' : ""}/>`).join("");
    const spokes = axes.map((_, i) => {
      const [x, y] = pt(i, n, 100);
      return `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.1)"/>`;
    }).join("");
    const earlier = axes.some((a) => a.earlierScore !== null) ? `<polygon points="${poly(axes.map((a) => a.earlierScore))}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5" stroke-dasharray="3 3"/>` : "";
    const now = `<polygon points="${poly(axes.map((a) => a.score))}" fill="rgba(70,230,255,.22)" stroke="#46e6ff" stroke-width="2.2" stroke-linejoin="round"/>`;
    const dots = axes.map((a, i) => {
      const [x, y] = pt(i, n, a.score ?? 0);
      const col = a.score === null ? "none" : a.score >= 85 ? "#5affb0" : a.score >= 60 ? "#ffd25a" : "#ff5a6e";
      return `<circle cx="${x}" cy="${y}" r="${i === sel2 ? 6 : 4.2}" fill="${col}" stroke="${a.score === null ? "rgba(255,255,255,.5)" : "#0b1220"}" stroke-width="1.5"/>`;
    }).join("");
    const ticks = axes.map((a, i) => {
      if (a.score200 === null) return "";
      const [x, y] = pt(i, n, a.score200);
      return `<path d="M${x},${y - 5} l5,5 l-5,5 l-5,-5 z" fill="#ffd25a" stroke="#0b1220" stroke-width="1"/>`;
    }).join("");
    const labels = axes.map((a, i) => {
      const [x, y] = pt(i, n, 126);
      const anchor = x < C - 12 ? "end" : x > C + 12 ? "start" : "middle";
      return `<g data-ax="${i}" style="cursor:pointer"><text x="${x}" y="${y + 4}" text-anchor="${anchor}" font-size="11.5" font-weight="${i === sel2 ? 800 : 600}" fill="${i === sel2 ? "#fff" : "#b6c2d9"}">${esc(a.label)}</text></g>`;
    }).join("");
    return `<svg viewBox="-62 -4 ${SIZE + 124} ${SIZE + 8}" style="width:100%;max-width:420px;display:block;margin:0 auto" role="img" aria-label="Skills radar">${rings}${spokes}${earlier}${now}${ticks}${dots}${labels}</svg>`;
  }
  function detail(a) {
    const have = a.value !== null;
    const bar = a.score === null ? 0 : a.score;
    const col = a.score === null ? "#555" : a.score >= 85 ? "#5affb0" : a.score >= 60 ? "#ffd25a" : "#ff5a6e";
    return `<div class="k">${esc(a.label)} \xB7 ${esc(a.group)}</div>
    <div style="height:8px;border-radius:4px;background:rgba(255,255,255,.1);margin:6px 0"><div style="width:${bar}%;height:8px;border-radius:4px;background:${col}"></div></div>
    <table><tr><td>You</td><td class="n">${have ? fmt3(a, a.value) : "not enough data yet"}</td></tr>
    <tr><td>Target</td><td class="n">${esc(targetText(a))}</td></tr>
    ${a.at200 !== void 0 ? `<tr><td>200-average bowlers</td><td class="n">${esc(fmt3(a, a.at200))}</td></tr>` : ""}
    ${a.earlierScore !== null && a.score !== null ? `<tr><td>Change since earlier</td><td class="n">${a.score - a.earlierScore >= 0 ? "+" : ""}${a.score - a.earlierScore} points</td></tr>` : ""}</table>
    <div class="u">${esc(a.drill)}</div>
    <div class="note"><span class="badge ${a.basis === "benchmark" ? "good" : "moderate"}">${a.basis === "benchmark" ? "published benchmark" : "LaneIQ coaching target"}</span> ${esc(a.source)}</div>`;
  }
  async function mountSkills(host2) {
    const games2 = insightGames(await loadGames());
    const axes = skillsProfile(games2, insightShots());
    const scored = axes.filter((a) => a.score !== null);
    const card = document.createElement("div");
    card.className = "card";
    card.id = "skills-card";
    host2.querySelectorAll("#skills-card").forEach((x) => x.remove());
    const focus = focusList(axes);
    let sel2 = focus.length ? axes.indexOf(focus[0].axis) : 0;
    const draw3 = () => {
      card.innerHTML = `<div class="k">Your skills</div>
      ${scored.length ? radarSvg(axes, sel2) : `<div class="u">Your skills chart fills in as you bowl. Scoring axes come from games on the Score tab; accuracy and repeatability axes come from tracked camera shots.</div>${radarSvg(axes, sel2)}`}
      <div class="note" style="text-align:center"><span style="color:#46e6ff">\u2501 now</span> \xB7 ${axes.some((a) => a.earlierScore !== null) ? '<span style="color:#ccc">\u2505 when you started</span> \xB7 ' : ""}<span style="color:#ffd25a">\u25C6 200-average bowler</span> \xB7 outer ring = target. Tap a skill.</div>
      <div id="sk-detail" style="margin-top:8px">${detail(axes[sel2])}</div>
      ${focus.length ? `<div class="k" style="margin-top:12px">Work on these first</div><ol>${focus.slice(0, 3).map((f) => `<li><b>${esc(f.axis.label)}</b> (${f.axis.score}/100): ${esc(f.axis.drill)}</li>`).join("")}</ol>` : scored.length ? `<div class="u">Every scored skill is at its target. Raise the bar by bowling more games.</div>` : ""}
      ${strongest(axes).length ? `<div class="k" style="margin-top:8px">Your strengths</div><div class="u">${strongest(axes).map((a) => `${esc(a.label)} (${a.score})`).join(" \xB7 ")}</div>` : ""}
      ${axes.some((a) => a.score === null) ? `<div class="note" style="margin-top:8px">Not scored yet: ${axes.filter((a) => a.score === null).map((a) => esc(a.label)).join(", ")}. They need more games or more tracked shots.</div>` : ""}`;
      card.querySelectorAll("[data-ax]").forEach((g) => g.addEventListener("click", () => {
        sel2 = Number(g.getAttribute("data-ax"));
        draw3();
      }));
    };
    draw3();
    const h = host2.querySelector("h2");
    if (h) h.after(card);
    else host2.prepend(card);
  }

  // core/src/papscan.ts
  var dot2 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross2 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var norm3 = (a) => Math.hypot(a[0], a[1], a[2]);
  var unit2 = (a) => {
    const n = norm3(a) || 1;
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  var clamp2 = (v) => Math.max(-1, Math.min(1, v));
  function smallestAxis(c) {
    const tr = c[0][0] + c[1][1] + c[2][2];
    let v = unit2([0.577, 0.5, 0.64]);
    for (let it = 0; it < 80; it++) {
      const w = [0, 1, 2].map((i) => tr * v[i] - (c[i][0] * v[0] + c[i][1] * v[1] + c[i][2] * v[2]));
      v = unit2(w);
    }
    return v;
  }
  function overUpOf(v, hand3) {
    const hs = hand3 === "R" ? 1 : -1;
    const a = Math.asin(clamp2(hs * v[0]));
    const up = Math.asin(clamp2(v[1] / Math.max(1e-9, Math.cos(a))));
    return { over: R * a, up: R * up };
  }
  function poleFromShot(shot, hand3) {
    if (shot.ring.length < 4) return { error: "Tap at least 4 points along one flare ring." };
    const pts = shot.ring.map((p) => toSphere(p, shot.circle));
    const m = [0, 0, 0];
    for (const p of pts) for (let i = 0; i < 3; i++) m[i] += p[i] / pts.length;
    const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const p of pts) {
      const d2 = [p[0] - m[0], p[1] - m[1], p[2] - m[2]];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d2[i] * d2[j];
    }
    let n = smallestAxis(cov);
    const fr2 = scanFrame({ circle: shot.circle, thumb: shot.thumb, fingerA: shot.fingerA, fingerB: shot.fingerB });
    const toGrip = (v) => [dot2(v, fr2.ex), dot2(v, fr2.up), dot2(v, fr2.g)];
    let g = toGrip(n);
    if (!g.every(Number.isFinite)) return { error: "I couldn't work out the ball's orientation from the grip holes. Check that the finger holes (and thumb hole, if there is one) are marked on the right spots, and the outline fits the ball." };
    if (g[2] < 0) {
      n = [-n[0], -n[1], -n[2]];
      g = toGrip(n);
    }
    const d = dot2(m, n);
    let ss = 0;
    for (const p of pts) ss += (dot2(p, n) - d) ** 2;
    const rms = Math.sqrt(ss / pts.length) * R;
    const base = unit2(cross2(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const side = cross2(n, base);
    const ang2 = pts.map((p) => Math.atan2(dot2(p, side), dot2(p, base))).sort((a, b) => a - b);
    let gap = ang2[0] + 2 * Math.PI - ang2[ang2.length - 1];
    for (let i = 1; i < ang2.length; i++) gap = Math.max(gap, ang2[i] - ang2[i - 1]);
    const span = (2 * Math.PI - gap) * 180 / Math.PI;
    const notes = [];
    if (span < 80) notes.push(`The points only cover ${Math.round(span)}\xB0 of the ring. Spread them along as much of it as you can see: a short arc is easy to misread.`);
    if (rms > 0.3) notes.push(`The points sit ${rms.toFixed(2)}" off a single ring. Some may be on different rings, or off the line.`);
    const edge = (p) => Math.hypot(p.x - shot.circle.x, p.y - shot.circle.y) / shot.circle.r;
    if (shot.ring.some((p) => edge(p) > 0.88)) notes.push("Some points are near the edge of the ball in the picture, where the surface is squeezed. Turn the ball so the ring is nearer the middle.");
    const ou = overUpOf(g, hand3);
    return { over: ou.over, up: ou.up, vec: unit2(g), span, rms, notes };
  }
  var textOf = (over, up) => {
    const f = (v) => fractionInches(Math.abs(v)).replace(/"/g, "");
    return `${over < 0 ? "-" : ""}${f(over)} over, ${f(up)} ${up < 0 ? "down" : "up"}`;
  };
  function papEstimate(shots, hand3) {
    const picks = [];
    for (const s of shots) {
      const r = poleFromShot(s, hand3);
      if ("error" in r) return r;
      picks.push(r);
    }
    if (!picks.length) return { error: "No photos yet." };
    const mean9 = unit2(picks.reduce((a, p) => [a[0] + p.vec[0], a[1] + p.vec[1], a[2] + p.vec[2]], [0, 0, 0]));
    const ou = overUpOf(mean9, hand3);
    const spread = picks.length > 1 ? Math.max(...picks.map((p) => surfDist(p.vec, mean9))) : null;
    const notes = [];
    if (spread !== null && spread > 0.75) notes.push(`The photos disagree by up to ${spread.toFixed(2)}". Rings can be misread: retake the photo that's furthest from the others, with the grip square to the camera.`);
    if (spread !== null && spread <= 0.4) notes.push("The photos agree closely, which is a good sign.");
    if (picks.length === 1) notes.push("One photo is a rough estimate. Add two more and I'll average them.");
    for (const p of picks) for (const n of p.notes) if (!notes.includes(n)) notes.push(n);
    notes.push("This is an estimate from photos. A pro shop's PAP measurement (a video of the release, or the layout tools they use) is more exact. Use this to start, and check it against how the ball actually flares.");
    return { picks, over: ou.over, up: ou.up, spreadIn: spread, text: textOf(ou.over, ou.up), notes };
  }

  // camera/papscan.ts
  var KINDS2 = [
    { id: "thumb", label: "One hand, with a thumb hole" },
    { id: "nothumb", label: "One hand, no thumb" },
    { id: "two", label: "Two-handed" }
  ];
  var WANT = 3;
  var MAX_W2 = 960;
  var sheet3 = () => $("papscan");
  var kind = "thumb";
  var hand = "R";
  var done = [];
  var cur = null;
  function openPapScan() {
    const bp = bowlerProfile();
    hand = bp.hand;
    kind = bp.style === "two-handed" ? "two" : bp.style === "one-hand-no-thumb" ? "nothumb" : "thumb";
    done = [];
    cur = null;
    intro();
  }
  var close3 = () => (sheet3().classList.remove("on"), sheet3().innerHTML = "", cur = null);
  function intro() {
    const el = sheet3();
    el.classList.add("on");
    el.innerHTML = `
    <div class="row"><h2>PAP from flare rings</h2><button class="btn ghost" id="pp-close">Close</button></div>
    <div class="note">Your PAP is the spot on the ball that doesn't rotate. The oil rings (flare rings) a ball leaves are circles around it, so photos of the rings can find it. Take 3 photos and I'll average them.</div>
    <div class="card"><div class="k">First, get rings to photograph</div><ul>
      <li>Throw a few shots on a lane with oil, <b>without wiping the ball</b>, so the track rings show. Or use a ball you've just bowled with.</li>
      <li>Photograph the ball with the <b>grip holes and some of a ring in view</b>, grip facing the camera, fingers up, on a towel or stand (no hand holding it). Tilt the ball a little between photos so each shows a different stretch of the ring.</li>
      <li>Good side light so the rings show, the whole ball in the picture, phone a few feet back and zoomed in a little.</li>
      <li>You'll then tap 4 or more points along one ring in each photo.</li></ul></div>
    <div class="card"><div class="k">What grip does this ball have?</div>${KINDS2.map((k2) => `<button class="opt ${k2.id === kind ? "sel" : ""}" data-kind="${k2.id}"><b>${esc(k2.label)}</b></button>`).join("")}
      <div class="chips" style="margin-top:8px"><label class="btn" style="display:inline-block;cursor:pointer">Take or choose photo 1<input id="pp-file" type="file" accept="image/*" capture="environment" style="display:none"></label></div>
      <div class="note" id="pp-msg">Nothing is uploaded: the pictures stay on this phone.</div></div>`;
    $("pp-close").onclick = close3;
    el.querySelectorAll("[data-kind]").forEach((b) => b.onclick = () => (kind = b.dataset.kind, intro()));
    $("pp-file").onchange = onFile;
  }
  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const msg = document.getElementById("pp-msg");
    if (msg) msg.textContent = "Looking at the picture\u2026";
    try {
      const img = await loadImage2(f);
      await new Promise((r) => setTimeout(r, 30));
      begin2(img);
    } catch {
      if (msg) msg.textContent = "That file didn't open as a picture.";
    }
  }
  function loadImage2(f) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(f);
      const im = new Image();
      im.onload = () => {
        const k2 = Math.min(1, MAX_W2 / im.naturalWidth);
        const c = document.createElement("canvas");
        c.width = Math.round(im.naturalWidth * k2);
        c.height = Math.round(im.naturalHeight * k2);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c);
      };
      im.onerror = () => rej(new Error("bad image"));
      im.src = url;
    });
  }
  function grayOf(c) {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const g = new Uint8ClampedArray(c.width * c.height);
    const rgb = new Uint8ClampedArray(c.width * c.height * 3);
    for (let i = 0; i < g.length; i++) {
      rgb[i * 3] = d[i * 4];
      rgb[i * 3 + 1] = d[i * 4 + 1];
      rgb[i * 3 + 2] = d[i * 4 + 2];
      g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    }
    return { g, rgb };
  }
  function begin2(img) {
    const W2 = img.width, H3 = img.height;
    const { g, rgb } = grayOf(img);
    const noThumb = kind !== "thumb";
    const rough = { x: W2 / 2, y: H3 / 2, r: Math.min(W2, H3) * 0.48 };
    const grip = pickGrip(detectHoles(g, W2, H3, rough), rough, noThumb);
    let thumb = null;
    let fa = { x: W2 * 0.42, y: H3 * 0.36 }, fb = { x: W2 * 0.58, y: H3 * 0.36 };
    let holeR = 0;
    const notes = [];
    if (grip) {
      thumb = grip.thumb ? { x: grip.thumb.x, y: grip.thumb.y } : null;
      fa = { x: grip.fingers[0].x, y: grip.fingers[0].y };
      fb = { x: grip.fingers[1].x, y: grip.fingers[1].y };
      if (fa.x > fb.x) [fa, fb] = [fb, fa];
      holeR = (grip.fingers[0].r + grip.fingers[1].r) / 2;
      notes.push("I found the grip holes.");
    } else {
      thumb = noThumb ? null : { x: W2 * 0.5, y: H3 * 0.62 };
      notes.push("I couldn't pick out the grip holes: pick Thumb / Finger 1 / Finger 2 below and tap each hole.");
    }
    let outlines = [];
    if (grip) {
      const pts = [fa, fb, ...thumb ? [thumb] : []];
      const mid2 = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      outlines = findBalls(g, W2, H3, mid2, Math.max(Math.min(W2, H3) * 0.2, Math.min(Math.min(W2, H3) * 0.5, holeR * 9.2)), rgb, 3);
    }
    if (!outlines.length) {
      const edge = detectBall(g, W2, H3);
      if (edge) outlines = [edge];
    }
    notes.push(outlines.length ? "I found the ball's outline." : "I couldn't find the ball's outline: use Ball outline below and tap the ball's center, then adjust the size.");
    cur = { img, circle: outlines[0] ?? { x: W2 / 2, y: H3 / 2, r: Math.min(W2, H3) * 0.4 }, outlines, outlineIx: 0, thumb, fingerA: fa, fingerB: fb, ring: [], mode: "ring", found: notes.join(" ") };
    edit();
  }
  var MODES = [
    { id: "ring", label: "Ring points" },
    { id: "thumb", label: "Thumb hole" },
    { id: "fingerA", label: "Finger 1" },
    { id: "fingerB", label: "Finger 2" },
    { id: "outline", label: "Ball outline" }
  ];
  function edit() {
    if (!cur) return;
    const c = cur;
    const n = done.length + 1;
    const live2 = c.ring.length >= 4 ? poleFromShot({ circle: c.circle, thumb: kind === "thumb" ? c.thumb : null, fingerA: c.fingerA, fingerB: c.fingerB, ring: c.ring }, hand) : null;
    const modes = MODES.filter((m) => m.id !== "thumb" || kind === "thumb");
    sheet3().innerHTML = `
    <div class="row"><h2>Photo ${n} of ${WANT}</h2><button class="btn ghost" id="pp-close">Close</button></div>
    <div class="note">${esc(c.found)} Tap points along <b>one flare ring</b> (a faint oily band that goes around the ball), as far apart as you can: at least 4, spread over as much of the ring as you can see.</div>
    <div class="card"><canvas id="pp-cv" width="${c.img.width}" height="${c.img.height}" style="width:100%;height:auto;touch-action:manipulation;border-radius:10px"></canvas>
      <div class="chips">${modes.map((m) => `<button class="chip ${c.mode === m.id ? "sel" : ""}" data-mode="${m.id}">${m.label}</button>`).join("")}</div>
      <div class="chips"><button class="chip" id="pp-undo">Undo last point</button><button class="chip" id="pp-clear">Clear points</button>${c.outlines.length > 1 ? `<button class="chip" id="pp-next">Try another outline</button>` : ""}<button class="chip" id="pp-smaller">Ball smaller</button><button class="chip" id="pp-bigger">Ball bigger</button></div>
      <div class="u">${c.ring.length} ring point${c.ring.length === 1 ? "" : "s"} placed.${live2 ? "error" in live2 ? "" : ` This photo puts the PAP at about <b>${live2.over.toFixed(2)}" over, ${live2.up.toFixed(2)}" up</b>.` : ""}</div>
      ${live2 && !("error" in live2) ? live2.notes.map((x) => `<div class="note" style="color:var(--gold)">${esc(x)}</div>`).join("") : ""}
      <div class="chips"><button class="btn" id="pp-use" ${live2 && !("error" in live2) ? "" : "disabled"}>Use this photo</button></div></div>`;
    $("pp-close").onclick = close3;
    const cv = $("pp-cv");
    paint(cv, c);
    cv.addEventListener("click", (e) => {
      const r = cv.getBoundingClientRect();
      const p = { x: (e.clientX - r.left) / r.width * cv.width, y: (e.clientY - r.top) / r.height * cv.height };
      if (c.mode === "ring") c.ring.push(p);
      else if (c.mode === "thumb") c.thumb = p;
      else if (c.mode === "fingerA") c.fingerA = p;
      else if (c.mode === "fingerB") c.fingerB = p;
      else c.circle = { ...c.circle, x: p.x, y: p.y };
      edit();
    });
    sheet3().querySelectorAll("[data-mode]").forEach((b) => b.onclick = () => (c.mode = b.dataset.mode, edit()));
    $("pp-undo").onclick = () => (c.ring.pop(), edit());
    $("pp-clear").onclick = () => (c.ring = [], edit());
    document.getElementById("pp-next")?.addEventListener("click", () => (c.outlineIx = (c.outlineIx + 1) % c.outlines.length, c.circle = c.outlines[c.outlineIx], edit()));
    $("pp-smaller").onclick = () => (c.circle = { ...c.circle, r: c.circle.r * 0.97 }, edit());
    $("pp-bigger").onclick = () => (c.circle = { ...c.circle, r: c.circle.r * 1.03 }, edit());
    $("pp-use").onclick = () => {
      done.push({ circle: c.circle, thumb: kind === "thumb" ? c.thumb : null, fingerA: c.fingerA, fingerB: c.fingerB, ring: c.ring.slice() });
      cur = null;
      done.length >= WANT ? result() : between();
    };
  }
  function paint(cv, c) {
    const g = cv.getContext("2d");
    g.drawImage(c.img, 0, 0);
    const s = cv.width / 960;
    g.lineWidth = 3 * s;
    g.strokeStyle = "rgba(70,230,255,.9)";
    g.beginPath();
    g.arc(c.circle.x, c.circle.y, c.circle.r, 0, 7);
    g.stroke();
    const dot5 = (p, col, label2) => {
      if (!p) return;
      g.fillStyle = col;
      g.strokeStyle = "#000";
      g.lineWidth = 2 * s;
      g.beginPath();
      g.arc(p.x, p.y, 7 * s, 0, 7);
      g.fill();
      g.stroke();
      if (label2) {
        g.fillStyle = "#fff";
        g.font = `700 ${14 * s}px system-ui`;
        g.fillText(label2, p.x + 10 * s, p.y - 8 * s);
      }
    };
    if (kind === "thumb") dot5(c.thumb, "#ffffff", "thumb");
    dot5(c.fingerA, "#ff4fd8", "1");
    dot5(c.fingerB, "#ff4fd8", "2");
    g.strokeStyle = "rgba(255,210,90,.7)";
    g.lineWidth = 2 * s;
    g.beginPath();
    c.ring.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    g.stroke();
    c.ring.forEach((p) => dot5(p, "#ffd25a"));
  }
  function between() {
    sheet3().innerHTML = `
    <div class="row"><h2>Photo ${done.length} saved</h2><button class="btn ghost" id="pp-close">Close</button></div>
    <div class="card"><div class="u">${done.length} of ${WANT} photos done. Turn the ball a little so a different stretch of the ring faces the camera, with the grip still in view, then take the next one.</div>
      <div class="chips"><label class="btn" style="display:inline-block;cursor:pointer">Take or choose photo ${done.length + 1}<input id="pp-file" type="file" accept="image/*" capture="environment" style="display:none"></label><button class="btn ghost" id="pp-finish">Use ${done.length === 1 ? "this one photo" : `these ${done.length}`}</button></div>
      <div class="note" id="pp-msg">Nothing is uploaded: the pictures stay on this phone.</div></div>`;
    $("pp-close").onclick = close3;
    $("pp-finish").onclick = result;
    $("pp-file").onchange = onFile;
  }
  function result() {
    const e = papEstimate(done, hand);
    if ("error" in e) {
      sheet3().innerHTML = `<div class="row"><h2>PAP from flare rings</h2><button class="btn ghost" id="pp-close">Close</button></div><div class="card"><div class="u">${esc(e.error)}</div><div class="chips"><button class="btn" id="pp-again">Start over</button></div></div>`;
      $("pp-close").onclick = close3;
      $("pp-again").onclick = openPapScan;
      return;
    }
    sheet3().innerHTML = `
    <div class="row"><h2>Your estimated PAP</h2><button class="btn ghost" id="pp-close">Close</button></div>
    <div class="card"><div class="k">Average of ${e.picks.length} photo${e.picks.length === 1 ? "" : "s"}</div>
      <div class="lr-head" style="font-size:24px">${esc(e.text)}</div>
      <table>${e.picks.map((p, i) => `<tr><td>Photo ${i + 1}</td><td class="n">${p.over.toFixed(2)}" over, ${p.up.toFixed(2)}" up</td></tr>`).join("")}${e.spreadIn !== null ? `<tr><td>Biggest difference from the average</td><td class="n">${e.spreadIn.toFixed(2)}"</td></tr>` : ""}</table>
      ${e.notes.map((n) => `<div class="note">${esc(n)}</div>`).join("")}
      <div class="chips"><button class="btn" id="pp-save">Save as my PAP</button><button class="btn ghost" id="pp-lab">Open the Layout Lab</button><button class="btn ghost" id="pp-again">Start over</button></div><div class="note" id="pp-saved"></div></div>`;
    $("pp-close").onclick = close3;
    $("pp-again").onclick = openPapScan;
    $("pp-save").onclick = () => {
      if (!S.profile) return void ($("pp-saved").textContent = "Set up a profile first.");
      const spin = S.profile.spin ?? { source: "entered", at: (/* @__PURE__ */ new Date()).toISOString() };
      updateProfile({ spin: { ...spin, pap: e.text, papFrom: "photo" } });
      $("pp-saved").textContent = `Saved: ${e.text}. The Layout Lab and the Pro shop will use it.`;
    };
    $("pp-lab").onclick = () => (close3(), openLayoutLab());
  }

  // core/src/layout.ts
  function releaseStrength(b) {
    let v = 0;
    const known = [];
    if (b.revRpm !== void 0) {
      v += Math.max(-1, Math.min(1, (b.revRpm - 350) / 150)) * 0.5;
      known.push("rev rate");
    }
    if (b.axisTilt !== void 0) {
      v += Math.max(-1, Math.min(1, (b.axisTilt - 10) / 12)) * 0.25;
      known.push("axis tilt");
    }
    if (b.axisRotation !== void 0) {
      v += Math.max(-1, Math.min(1, (b.axisRotation - 55) / 35)) * 0.15;
      known.push("axis rotation");
    }
    if (b.launchSpeed !== void 0) {
      v -= Math.max(-1, Math.min(1, (b.launchSpeed - 17) / 4)) * 0.1;
      known.push("ball speed");
    }
    return { value: Math.max(-1, Math.min(1, v)), known };
  }
  var ROLE_NUDGE = { start: 0, early: -0.5, carry: 0.5 };
  var SYM_STRONG = {
    name: "Pin up, close to the PAP: earlier, stronger",
    notation: "3 to 4 in x pin up x 1/2 to 1 in",
    pinToPapIn: [3, 4],
    pinBufferIn: [0.5, 1],
    effect: "Rolls sooner and builds more continuous motion through the mid-lane. Good when the ball needs help reading."
  };
  var SYM_MID = {
    name: "Standard: pin about 4.5 in from the PAP",
    notation: "4 1/2 in x pin up or level x 3/4 in",
    pinToPapIn: [4, 5],
    pinBufferIn: [0.5, 1],
    effect: "The balanced starting layout: the ball's published reaction, nothing exaggerated."
  };
  var SYM_WEAK = {
    name: "Pin down, farther from the PAP: cleaner, later",
    notation: "5 to 6 in x pin down x 3/4 to 1 1/4 in",
    pinToPapIn: [5, 6],
    pinBufferIn: [0.75, 1.25],
    effect: "Holds energy longer for more length and a sharper backend, and calms an overreactive ball."
  };
  var ASYM_STRONG = {
    name: "Short VAL, stronger",
    notation: "4 1/2 in x 30 to 40\xB0 x 1/2 to 1 in",
    pinToPapIn: [4, 5],
    valDeg: [30, 40],
    pinBufferIn: [0.5, 1],
    effect: "Brings the mass bias into play sooner for an earlier, stronger arc. A good fit when you need more motion."
  };
  var ASYM_MID = {
    name: "Medium VAL, balanced",
    notation: "4 1/2 in x 45 to 55\xB0 x 3/4 in",
    pinToPapIn: [4, 5],
    valDeg: [45, 55],
    pinBufferIn: [0.5, 1],
    effect: "The middle-of-the-road starting point for an asymmetric ball."
  };
  var ASYM_WEAK = {
    name: "Long VAL, smoother",
    notation: "5 to 6 in x 60 to 75\xB0 x 3/4 to 1 1/4 in",
    pinToPapIn: [5, 6],
    valDeg: [60, 75],
    pinBufferIn: [0.75, 1.25],
    effect: "Mutes the asymmetry for a smoother, more predictable, later reaction on a ball that already reads strongly."
  };
  function suggestLayouts(ball, bowler, role) {
    const rs = releaseStrength(bowler);
    const asym = ball?.coreSymmetry?.value === "asymmetric";
    const nudge = Math.max(-1, Math.min(1, -rs.value * 1.2 + ROLE_NUDGE[role]));
    const set = asym ? [ASYM_STRONG, ASYM_MID, ASYM_WEAK] : [SYM_STRONG, SYM_MID, SYM_WEAK];
    const pick = nudge > 0.3 ? 0 : nudge < -0.3 ? 2 : 1;
    const order = pick === 1 ? [1, 0, 2] : pick === 0 ? [0, 1, 2] : [2, 1, 0];
    const layouts = order.slice(0, 2).map((i) => set[i]);
    const grip = [];
    const style = bowler.style;
    if (style === "two-handed") grip.push("Two-handed bowlers are usually drilled with no thumb hole (two finger holes, sometimes a small thumb slug position). The driller sets the grip for you; the layout above is about core position, not the holes.");
    else if (style === "one-hand-no-thumb") grip.push("No-thumb bowlers are drilled with two finger holes and no thumb hole, so span and pitch come from your hand, not a thumb. The layout above is about core position only.");
    else grip.push("Span and pitch (thumb and finger fit) come from measuring your hand and are separate from the core layout.");
    const notes = [
      rs.known.length ? `This release looks ${rs.value > 0.25 ? "like it makes a lot of hook" : rs.value < -0.25 ? "like it makes little hook" : "average for hook"} based on your ${rs.known.join(", ")}.` : "Rev rate, axis tilt and rotation aren't known, so this assumes an average release. Get them measured (the Me tab, or a pro shop) for a better pick.",
      nudge > 0.3 ? "That points to a layout that adds motion." : nudge < -0.3 ? "That points to a layout that calms the ball down." : "That points to a balanced layout.",
      "Layouts are starting points. A driller should check your PAP, your span and how the ball reacted before drilling anything."
    ];
    if (role === "early") notes.push('For the "hooks early" role the layout is shifted toward length and control.');
    if (role === "carry") notes.push('For the "skids or carries down" role the layout is shifted toward earlier motion.');
    return { releaseStrength: rs.value, nudge, layouts, grip, notes };
  }

  // camera/scanlab.ts
  var tess = null;
  function loadTesseract() {
    tess ??= new Promise((res, rej) => {
      if (window.Tesseract) return res(window.Tesseract);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      s.onload = () => window.Tesseract ? res(window.Tesseract) : rej(new Error("failed"));
      s.onerror = () => {
        tess = null;
        rej(new Error("offline"));
      };
      document.head.append(s);
    });
    return tess;
  }
  function prepare(src, c, channel, invert) {
    const out = document.createElement("canvas");
    const size = 720;
    out.width = out.height = size;
    const o = out.getContext("2d", { willReadFrequently: true });
    o.drawImage(src, c.cx - c.r, c.cy - c.r, c.r * 2, c.r * 2, 0, 0, size, size);
    const img = o.getImageData(0, 0, size, size);
    const g = new Uint8ClampedArray(size * size);
    for (let i = 0; i < g.length; i++) g[i] = channel === "r" ? img.data[i * 4] : channel === "g" ? img.data[i * 4 + 1] : channel === "b" ? img.data[i * 4 + 2] : 0.299 * img.data[i * 4] + 0.587 * img.data[i * 4 + 1] + 0.114 * img.data[i * 4 + 2];
    const sorted2 = Uint8ClampedArray.from(g).sort();
    const lo = sorted2[Math.floor(sorted2.length * 0.02)];
    const hi = sorted2[Math.floor(sorted2.length * 0.98)] || 255;
    for (let i = 0; i < g.length; i++) {
      let v = Math.max(0, Math.min(255, (g[i] - lo) / Math.max(1, hi - lo) * 255));
      if (invert) v = 255 - v;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    }
    o.putImageData(img, 0, 0);
    return out;
  }
  async function readText(src, c, progress2) {
    const T = await loadTesseract();
    const words = /* @__PURE__ */ new Map();
    const runs = [["lum", false], ["lum", true], ["r", false], ["r", true], ["b", false], ["b", true], ["g", false], ["g", true]];
    let done2 = 0;
    for (const [ch, inv] of runs) {
      progress2(done2++, runs.length);
      const { data } = await T.recognize(prepare(src, c, ch, inv), "eng");
      for (const w of data.words) {
        const clean = w.text.replace(/[^A-Za-z0-9]/g, "");
        if (w.confidence > 40 && clean.length >= 2 && /[A-Za-z]/.test(clean)) words.set(clean.toUpperCase(), Math.max(words.get(clean.toUpperCase()) ?? 0, w.confidence));
      }
    }
    return [...words.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).join(" ");
  }
  var specLine = (b) => [b.rg && `RG ${b.rg.value}`, b.differential && `diff ${b.differential.value}`, b.coverstock?.value, b.core?.value, b.coreSymmetry?.value, b.colorway?.value].filter(Boolean).join(" \xB7 ");
  function openScanLab(onAdded) {
    const el = $("scanlab");
    el.classList.add("on");
    const stream2 = document.getElementById("v");
    const live2 = stream2.videoWidth > 0 && !stream2.paused;
    let circle = null;
    let tap = 0;
    const work2 = document.createElement("canvas");
    let sig = null;
    el.innerHTML = `
    <div class="row"><h2>Scan a ball</h2><button class="btn ghost" id="sc-close">Close</button></div>
    <div class="note">Take a clear photo of the ball with its logo facing the camera, in even light. The app compares what it sees with the balls you've taught it and with ${S.catalog.length} catalog balls. Reading the name needs a one-time download; you can always type the name instead.</div>
    <div class="card">
      <div class="chips"><label class="chip add" style="cursor:pointer">Take or choose a photo<input id="sc-file" type="file" accept="image/*" capture="environment" style="display:none"></label>${live2 ? `<button class="chip add" id="sc-live">Use the live camera</button>` : ""}</div>
    </div>
    <div id="sc-work" class="hide">
      <div class="card"><div class="stagebox" style="position:relative"><canvas id="sc-cv" style="width:100%;height:auto;display:block"></canvas></div>
        <div class="note" id="sc-hint">Tap the center of the ball, then tap its edge. Skip this to use the middle of the photo.</div>
        <div class="field"><label>Name on the ball (read it, or type what you see)</label><input id="sc-text" placeholder="e.g. Ion Max" autocomplete="off"></div>
        <div class="chips"><button class="btn ghost" id="sc-ocr">Read the name from the photo</button><button class="btn" id="sc-go">Identify</button></div>
        <div class="note" id="sc-ocr-note"></div></div>
      <div id="sc-out"></div>
    </div>`;
    const cv = $("sc-cv");
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const base = () => circle ?? { cx: work2.width / 2, cy: work2.height / 2, r: Math.min(work2.width, work2.height) * 0.38 };
    const redraw2 = () => {
      cv.width = work2.width;
      cv.height = work2.height;
      cx.drawImage(work2, 0, 0);
      const c = base();
      cx.strokeStyle = "#46e6ff";
      cx.lineWidth = Math.max(2, work2.width / 250);
      cx.setLineDash([10, 8]);
      cx.beginPath();
      cx.arc(c.cx, c.cy, Math.max(c.r, 4), 0, 7);
      cx.stroke();
      cx.setLineDash([]);
    };
    const show = (img, w, h) => {
      const s = Math.min(1, 1200 / Math.max(w, h));
      work2.width = Math.round(w * s);
      work2.height = Math.round(h * s);
      work2.getContext("2d").drawImage(img, 0, 0, work2.width, work2.height);
      circle = null;
      tap = 0;
      $("sc-work").classList.remove("hide");
      $("sc-out").innerHTML = "";
      redraw2();
    };
    $("sc-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
    $("sc-file").onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const img = new Image();
      img.onload = () => (show(img, img.naturalWidth, img.naturalHeight), URL.revokeObjectURL(img.src));
      img.src = URL.createObjectURL(f);
    };
    $("sc-live")?.addEventListener("click", () => show(stream2, stream2.videoWidth, stream2.videoHeight));
    cv.addEventListener("pointerdown", (e) => {
      const r = cv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * cv.width;
      const y = (e.clientY - r.top) / r.height * cv.height;
      if (tap % 2 === 0) {
        circle = { cx: x, cy: y, r: 0 };
        $("sc-hint").textContent = "Now tap the edge of the ball.";
      } else {
        circle.r = Math.max(20, Math.hypot(x - circle.cx, y - circle.cy));
        $("sc-hint").textContent = "Ball marked. Read the name, type it, or tap Identify.";
      }
      tap++;
      redraw2();
    });
    const signature = () => {
      const c = base();
      const k2 = 32;
      const t = document.createElement("canvas");
      t.width = t.height = k2;
      const tc = t.getContext("2d", { willReadFrequently: true });
      tc.drawImage(work2, c.cx - c.r * 0.8, c.cy - c.r * 0.8, c.r * 1.6, c.r * 1.6, 0, 0, k2, k2);
      return normalize(signatureCounts(tc.getImageData(0, 0, k2, k2).data, k2));
    };
    $("sc-ocr").onclick = async () => {
      const note = $("sc-ocr-note");
      note.textContent = "Reading the name\u2026 (the first time this downloads a small text reader)";
      try {
        const text = await readText(work2, base(), (d, n) => note.textContent = `Reading the name\u2026 (${d + 1}/${n})`);
        $("sc-text").value = text;
        note.textContent = text ? "Read these words. Correct them if they're wrong, then tap Identify." : "Couldn't read any text. Try a closer photo with the logo facing you, or type the name.";
      } catch {
        note.textContent = "The text reader needs an internet connection the first time. Type the name instead, or connect and try again.";
      }
    };
    $("sc-go").onclick = () => {
      sig = signature();
      const text = $("sc-text").value.trim();
      const out = $("sc-out");
      const mine = identifyInArsenal(sig, S.arsenal);
      const myBall = mine && mine.confidence >= 0.45 ? S.arsenal.find((b) => b.id === mine.ballId) : void 0;
      const found = identifyFromCatalog({ text: text || void 0, sig, catalog: S.catalog }, 6);
      out.innerHTML = `
      ${myBall ? `<div class="card"><div class="k">Looks like a ball you already have</div><div class="lr-head">${esc(myBall.name)}</div><div class="u">${Math.round(mine.confidence * 100)}% match to the looks you've taught it.</div></div>` : ""}
      <div class="card"><div class="k">${text ? "Best matches in the catalog" : "Possible matches from colors alone"}</div>
        ${found.length ? found.map((f, i) => card(f, i)).join("") : `<div class="u">No confident match. Type the name printed on the ball and tap Identify again.</div>`}
        ${text ? "" : `<div class="note">Colors alone are weak evidence. Add the name on the ball for a real answer.</div>`}</div>`;
      out.querySelectorAll("[data-add]").forEach(
        (b) => b.onclick = async () => {
          const ball = found[Number(b.dataset.add)].ball;
          const mineAlready = S.arsenal.find((x) => x.catalogKey === ball.key);
          if (mineAlready) mineAlready.exemplars = [...mineAlready.exemplars, sig].slice(-12);
          else {
            const nb = { id: Math.random().toString(36).slice(2, 9), name: `${ball.manufacturer} ${ball.name}`, exemplars: [sig], catalogKey: ball.key };
            S.arsenal.push(nb);
          }
          await saveArsenal();
          onAdded();
          $("sc-close").click();
        }
      );
    };
    function card(f, i) {
      const b = f.ball;
      const inArsenal = S.arsenal.some((x) => x.catalogKey === b.key);
      return `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="row"><b>${esc(b.manufacturer)} ${esc(b.name)}</b><span class="badge ${f.confidence === "strong" ? "good" : f.confidence === "likely" ? "moderate" : "tentative"}">${f.confidence}</span></div>
      <div class="u">${esc(specLine(b))}</div><div class="note">${esc(f.evidence.join(" \xB7 "))}</div>
      <div class="chips"><button class="chip" data-add="${i}">${inArsenal ? "Teach it this look" : "This is my ball: add it"}</button></div></div>`;
    }
  }

  // camera/render.ts
  var k = (v) => v.width / 1280;
  var lerp2 = (a, b, t) => a + (b - a) * t;
  var ramp = (t, alpha = 1) => currentTracer().color(t, alpha, skinClock());
  var DECK_END_FT = 63;
  var ROW_FT = 10.39 / 12;
  var PIN_SPACING_BOARDS = 12 / (41.5 / LANE_BOARDS);
  function strokeTrail(v, points, baseAlpha, headBoost) {
    const n = points.length;
    if (n < 2) return;
    const { ctx: ctx2 } = v;
    const s = k(v);
    const tr = currentTracer();
    const glow2 = glowEnabled();
    ctx2.save();
    ctx2.globalCompositeOperation = glow2 ? "lighter" : "source-over";
    ctx2.lineCap = "round";
    ctx2.lineJoin = "round";
    for (let i = 1; i < n; i++) {
      const t = i / (n - 1);
      const a = points[i - 1];
      const b = points[i];
      if (!glow2) {
        ctx2.shadowBlur = 0;
        ctx2.strokeStyle = ramp(t, Math.min(1, baseAlpha * (headBoost ? 0.35 + 0.65 * t : 0.95)));
        ctx2.lineWidth = (headBoost ? lerp2(2, 4.5, t) : 3.5) * s;
        ctx2.beginPath();
        ctx2.moveTo(a.x, a.y);
        ctx2.lineTo(b.x, b.y);
        ctx2.stroke();
        continue;
      }
      ctx2.shadowBlur = tr.glow * s;
      ctx2.shadowColor = ramp(t);
      ctx2.strokeStyle = ramp(t, baseAlpha * (headBoost ? 0.15 + 0.85 * t : 0.9));
      ctx2.lineWidth = (headBoost ? lerp2(3, 14, t) : 10) * s * tr.width;
      ctx2.beginPath();
      ctx2.moveTo(a.x, a.y);
      ctx2.lineTo(b.x, b.y);
      ctx2.stroke();
      ctx2.shadowBlur = 0;
      ctx2.strokeStyle = `rgba(${tr.core},${baseAlpha * (headBoost ? t : 0.8)})`;
      ctx2.lineWidth = (headBoost ? lerp2(1, 4, t) : 3.5) * s * tr.width;
      ctx2.beginPath();
      ctx2.moveTo(a.x, a.y);
      ctx2.lineTo(b.x, b.y);
      ctx2.stroke();
    }
    ctx2.restore();
  }
  function drawBallHead(v, h) {
    const s = k(v);
    if (!glowEnabled()) {
      v.ctx.save();
      v.ctx.fillStyle = ramp(1, 1);
      v.ctx.strokeStyle = "rgba(0,0,0,.6)";
      v.ctx.lineWidth = 1.5 * s;
      v.ctx.beginPath();
      v.ctx.arc(h.x, h.y, 5 * s, 0, 7);
      v.ctx.fill();
      v.ctx.stroke();
      v.ctx.restore();
      return;
    }
    const g = v.ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 26 * s);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(0.25, ramp(1, 0.6));
    g.addColorStop(1, ramp(1, 0));
    v.ctx.save();
    v.ctx.globalCompositeOperation = "lighter";
    v.ctx.fillStyle = g;
    v.ctx.beginPath();
    v.ctx.arc(h.x, h.y, 26 * s, 0, 7);
    v.ctx.fill();
    v.ctx.restore();
  }
  function label(v, text, p, color) {
    const { ctx: ctx2 } = v;
    const s = k(v);
    ctx2.save();
    ctx2.font = `600 ${15 * s}px -apple-system, system-ui, sans-serif`;
    const w = ctx2.measureText(text).width + 16 * s;
    const h = 24 * s;
    ctx2.fillStyle = "rgba(10,14,22,.75)";
    ctx2.strokeStyle = color;
    ctx2.lineWidth = 1.5 * s;
    ctx2.beginPath();
    ctx2.roundRect(p.x - w / 2, p.y - h - 10 * s, w, h, 12 * s);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = "#fff";
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillText(text, p.x, p.y - h / 2 - 10 * s);
    ctx2.beginPath();
    ctx2.fillStyle = color;
    ctx2.arc(p.x, p.y, 5 * s, 0, 7);
    ctx2.fill();
    ctx2.restore();
  }
  function drawShotMarkers(v, a) {
    if (a.boardAtArrows !== null) label(v, `Arrows ${a.boardAtArrows.toFixed(1)}`, v.P(boardToX(a.boardAtArrows), 15), "#ffd25a");
    if (a.breakpointBoard !== null && a.breakpointFt !== null) label(v, `Breakpoint ${a.breakpointBoard.toFixed(1)}`, v.P(boardToX(a.breakpointBoard), a.breakpointFt), "#ff5ad6");
    if (a.entryBoard !== null) label(v, `Entry ${a.entryBoard.toFixed(1)}`, v.P(boardToX(a.entryBoard), 59.5), "#5affb0");
  }
  function drawCorners(v, corners2) {
    const { ctx: ctx2 } = v;
    const s = k(v);
    ctx2.save();
    corners2.forEach((c, i) => {
      ctx2.fillStyle = "#4da3ff";
      ctx2.shadowColor = "#4da3ff";
      ctx2.shadowBlur = 16 * s;
      ctx2.beginPath();
      ctx2.arc(c.x, c.y, 9 * s, 0, 7);
      ctx2.fill();
      ctx2.shadowBlur = 0;
      ctx2.fillStyle = "#06101c";
      ctx2.font = `700 ${12 * s}px system-ui`;
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.fillText(String(i + 1), c.x, c.y + 0.5 * s);
      if (i > 0) {
        ctx2.strokeStyle = "rgba(77,163,255,.8)";
        ctx2.lineWidth = 2 * s;
        ctx2.beginPath();
        ctx2.moveTo(corners2[i - 1].x, corners2[i - 1].y);
        ctx2.lineTo(c.x, c.y);
        ctx2.stroke();
      }
    });
    ctx2.restore();
  }
  function line(v, a, b) {
    v.ctx.beginPath();
    v.ctx.moveTo(a.x, a.y);
    v.ctx.lineTo(b.x, b.y);
    v.ctx.stroke();
  }
  function drawLaneGrid(v) {
    const { ctx: ctx2, P } = v;
    const s = k(v);
    const L2 = currentLane();
    ctx2.save();
    const quad = [P(0, 0), P(LANE_BOARDS, 0), P(LANE_BOARDS, DECK_END_FT), P(0, DECK_END_FT)];
    ctx2.beginPath();
    quad.forEach((p, i) => i ? ctx2.lineTo(p.x, p.y) : ctx2.moveTo(p.x, p.y));
    ctx2.closePath();
    ctx2.fillStyle = L2.fill;
    ctx2.fill();
    for (let i = 0; i <= LANE_BOARDS; i++) {
      const fromRight = LANE_BOARDS - i;
      const major = fromRight % 5 === 0;
      const edge = i === 0 || i === LANE_BOARDS;
      ctx2.strokeStyle = edge ? L2.edge : major ? L2.major : L2.minor;
      ctx2.lineWidth = (edge ? 2.4 : major ? 1.3 : 0.8) * s;
      line(v, P(i, 0), P(i, LANE_LENGTH_FT));
    }
    ctx2.strokeStyle = L2.foul;
    ctx2.lineWidth = 3 * s;
    ctx2.shadowColor = L2.foul;
    ctx2.shadowBlur = glowEnabled() ? 10 * s : 0;
    line(v, P(0, 0), P(LANE_BOARDS, 0));
    ctx2.shadowBlur = 0;
    ctx2.setLineDash([6 * s, 8 * s]);
    ctx2.lineWidth = 1 * s;
    for (const ft of [30, 45]) {
      ctx2.strokeStyle = "rgba(255,255,255,.2)";
      line(v, P(0, ft), P(LANE_BOARDS, ft));
    }
    ctx2.setLineDash([]);
    ctx2.strokeStyle = "rgba(255,255,255,.35)";
    ctx2.lineWidth = 1.5 * s;
    line(v, P(0, LANE_LENGTH_FT), P(LANE_BOARDS, LANE_LENGTH_FT));
    line(v, P(0, DECK_END_FT), P(LANE_BOARDS, DECK_END_FT));
    ctx2.fillStyle = "rgba(255,255,255,.55)";
    for (let b = 5; b <= 35; b += 5) {
      const c = P(boardToX(b), 7);
      ctx2.beginPath();
      ctx2.arc(c.x, c.y, 2.5 * s, 0, 7);
      ctx2.fill();
    }
    ctx2.shadowBlur = 0;
    ctx2.font = `600 ${12 * s}px -apple-system, system-ui, sans-serif`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillStyle = "rgba(255,255,255,.75)";
    for (let b = 5; b <= 35; b += 5) {
      const c = P(boardToX(b), 3.2);
      ctx2.fillText(String(b), c.x, c.y);
    }
    ctx2.fillStyle = "rgba(255,255,255,.88)";
    ctx2.shadowColor = "rgba(255,255,255,.6)";
    ctx2.shadowBlur = glowEnabled() ? 6 * s : 0;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i <= r; i++) {
        const x = LANE_BOARDS / 2 + (i - r / 2) * PIN_SPACING_BOARDS;
        const y = LANE_LENGTH_FT + r * ROW_FT;
        const c = P(x, y);
        const edge = P(x + 1.2, y);
        ctx2.beginPath();
        ctx2.arc(c.x, c.y, Math.max(2, Math.hypot(edge.x - c.x, edge.y - c.y)), 0, 7);
        ctx2.fill();
      }
    }
    ctx2.restore();
  }
  function drawTopDown(ctx2, w, h, paths, pocket) {
    const padX = 18;
    const top = 24;
    const bottom = 18;
    const laneW = w - padX * 2;
    const laneH = h - top - bottom;
    const px = (x) => padX + x / LANE_BOARDS * laneW;
    const py = (ft) => h - bottom - ft / DECK_END_FT * laneH;
    ctx2.clearRect(0, 0, w, h);
    const L2 = currentLane();
    ctx2.save();
    ctx2.fillStyle = L2.fill;
    ctx2.fillRect(px(0), py(DECK_END_FT), laneW, laneH);
    ctx2.lineWidth = 1;
    for (let i = 0; i <= LANE_BOARDS; i++) {
      const major = (LANE_BOARDS - i) % 5 === 0;
      ctx2.strokeStyle = i === 0 || i === LANE_BOARDS ? L2.edge : major ? L2.major : L2.minor;
      ctx2.beginPath();
      ctx2.moveTo(px(i), py(0));
      ctx2.lineTo(px(i), py(LANE_LENGTH_FT));
      ctx2.stroke();
    }
    ctx2.strokeStyle = L2.foul;
    ctx2.lineWidth = 2.5;
    ctx2.beginPath();
    ctx2.moveTo(px(0), py(0));
    ctx2.lineTo(px(LANE_BOARDS), py(0));
    ctx2.stroke();
    ctx2.setLineDash([4, 6]);
    ctx2.strokeStyle = "rgba(255,255,255,.18)";
    ctx2.lineWidth = 1;
    for (const ft of [15, 30, 45, 60]) {
      ctx2.beginPath();
      ctx2.moveTo(px(0), py(ft));
      ctx2.lineTo(px(LANE_BOARDS), py(ft));
      ctx2.stroke();
    }
    ctx2.setLineDash([]);
    ctx2.fillStyle = L2.arrow;
    for (let b = 5; b <= 35; b += 5) {
      const tip = 12 + 4 * (1 - Math.abs(b - 20) / 15);
      const cx = px(boardToX(b));
      ctx2.beginPath();
      ctx2.moveTo(cx - 4, py(tip - 1.6));
      ctx2.lineTo(cx + 4, py(tip - 1.6));
      ctx2.lineTo(cx, py(tip));
      ctx2.closePath();
      ctx2.fill();
    }
    ctx2.fillStyle = "rgba(255,255,255,.55)";
    ctx2.font = "600 10px system-ui, sans-serif";
    ctx2.textAlign = "center";
    for (let b = 5; b <= 35; b += 5) ctx2.fillText(String(b), px(boardToX(b)), py(0) + 12);
    ctx2.fillStyle = "rgba(255,255,255,.88)";
    for (let r = 0; r < 4; r++)
      for (let i = 0; i <= r; i++) {
        ctx2.beginPath();
        ctx2.arc(px(LANE_BOARDS / 2 + (i - r / 2) * PIN_SPACING_BOARDS), py(LANE_LENGTH_FT + r * ROW_FT), 3.2, 0, 7);
        ctx2.fill();
      }
    if (pocket) {
      ctx2.strokeStyle = "rgba(90,255,176,.7)";
      ctx2.lineWidth = 1.5;
      ctx2.setLineDash([3, 3]);
      ctx2.beginPath();
      ctx2.moveTo(px(boardToX(pocket.board)), py(45));
      ctx2.lineTo(px(boardToX(pocket.board)), py(LANE_LENGTH_FT));
      ctx2.stroke();
      ctx2.setLineDash([]);
    }
    for (const m of paths) {
      if (m.path.length < 2) continue;
      ctx2.strokeStyle = m.color;
      ctx2.globalAlpha = m.alpha ?? 1;
      ctx2.lineWidth = m.width ?? 2;
      ctx2.lineJoin = "round";
      ctx2.beginPath();
      smoothPath(m.path).forEach((s, i) => i ? ctx2.lineTo(px(s.x), py(s.y)) : ctx2.moveTo(px(s.x), py(s.y)));
      ctx2.stroke();
    }
    ctx2.restore();
  }

  // camera/sync.ts
  var ICE = [{ urls: "stun:stun.l.google.com:19302" }];
  var sheet4 = () => $("friends");
  var close4 = () => (sheet4().classList.remove("on"), sheet4().innerHTML = "");
  var live = null;
  var myLane = "";
  var listening = false;
  var me = () => ({ name: S.profile?.name ?? "A bowler", username: S.profile?.username, code: S.profile?.friendCode ?? "" });
  async function gathered(pc) {
    if (pc.iceGatheringState !== "complete")
      await new Promise((res) => {
        const done2 = () => pc.iceGatheringState === "complete" && (pc.removeEventListener("icegatheringstatechange", done2), res());
        pc.addEventListener("icegatheringstatechange", done2);
        setTimeout(res, 5e3);
      });
    return pc.localDescription.sdp;
  }
  function wire2(l, dc) {
    l.dc = dc;
    dc.onopen = () => {
      l.state = "connected";
      send({ t: "hi", who: me(), lane: myLane });
      const mine = S.shots.filter((s) => s.sessionId === S.sessionId).slice(-40).map(sharedShotOf);
      l.mine = mine;
      if (mine.length) send({ t: "shots", shots: mine });
      render();
    };
    dc.onclose = () => {
      if (l.state !== "ended") l.state = "ended";
      render();
    };
    dc.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data));
        if (m.t === "hi" && m.who?.code) {
          l.peer = { name: String(m.who.name ?? "Friend").slice(0, 40), username: isUsername(m.who.username ?? "") ? m.who.username : void 0, code: String(m.who.code).slice(0, 8) };
          l.peerLane = String(m.lane ?? "").slice(0, 60);
        } else if (m.t === "lane") l.peerLane = String(m.lane ?? "").slice(0, 60);
        else if (m.t === "shots" && Array.isArray(m.shots)) l.theirs = m.shots.slice(-60).filter(validShot);
        else if (m.t === "shot" && validShot(m.shot)) l.theirs = [...l.theirs, m.shot].slice(-60);
        render();
      } catch {
      }
    };
  }
  var validShot = (s) => !!s && typeof s.sp === "number" && Array.isArray(s.p) && s.p.length <= 80 && s.p.every((x) => typeof x === "number");
  function send(m) {
    if (live?.dc?.readyState === "open") live.dc.send(JSON.stringify(m));
  }
  function listen() {
    if (listening) return;
    listening = true;
    onShot((s) => {
      if (!live || live.state !== "connected") return;
      const sh = sharedShotOf(s);
      live.mine = [...live.mine, sh].slice(-60);
      send({ t: "shot", shot: sh });
      render();
    });
  }
  function newLive() {
    live?.pc.close();
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const l = { pc, dc: null, peer: null, peerLane: "", mine: [], theirs: [], state: "waiting" };
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(pc.connectionState) && l.state === "connected") {
        l.state = "ended";
        render();
      }
    };
    live = l;
    listen();
    return l;
  }
  function openLive() {
    if (live && live.state !== "ended") return render();
    const el = sheet4();
    el.classList.add("on");
    el.innerHTML = `
    <div class="row"><h2>Bowl together, live</h2><button class="btn ghost" id="lv-close">Close</button></div>
    <div class="note">Connect two phones, even on different lanes, and see each other's shots as they happen. The phones talk directly to each other: nothing is stored on a server, and nothing is sent until you connect.</div>
    <div class="card"><div class="k">You start it</div><div class="u">Make a link, send it to your friend, then paste the reply code they send back.</div><div class="chips"><button class="btn" id="lv-host">Start a live session</button></div></div>
    <div class="card"><div class="k">Your friend started it</div><div class="u">Open the link they sent (it opens this app), or paste it here.</div><div class="field"><input id="lv-link" placeholder="Paste their link or code"></div><div class="chips"><button class="btn ghost" id="lv-join">Join</button></div><div class="note" id="lv-msg"></div></div>
    <div class="note">How it connects: a public STUN server (Google's) is used only so each phone can learn its own network address. Some work or school networks block direct connections; if yours does, share a session link instead.</div>`;
    $("lv-close").onclick = close4;
    $("lv-host").onclick = host;
    $("lv-join").onclick = async () => {
      const raw = $("lv-link").value.trim();
      const code = /#live=(.+)$/.exec(raw)?.[1] ?? raw;
      if (!code) return void ($("lv-msg").textContent = "Paste the link your friend sent.");
      await joinFrom(code);
    };
  }
  async function host() {
    const el = sheet4();
    el.innerHTML = `<div class="row"><h2>Starting\u2026</h2></div><div class="note">Getting your connection ready. Keep the app open.</div>`;
    const l = newLive();
    wire2(l, l.pc.createDataChannel("laneiq"));
    await l.pc.setLocalDescription(await l.pc.createOffer());
    const offer = await packText(JSON.stringify({ v: 1, sdp: await gathered(l.pc), who: me() }));
    const link = `${appLink()}/#live=${offer}`;
    if (location.search.includes("livetest")) globalThis.__live = { link, offer };
    el.innerHTML = `
    <div class="row"><h2>Send this to your friend</h2><button class="btn ghost" id="lv-close">Cancel</button></div>
    <div class="card"><div class="k">1. Send the link</div><div class="u" style="word-break:break-all;max-height:5.5em;overflow:hidden">${esc(link.slice(0, 160))}\u2026</div><div class="chips"><button class="btn" id="lv-send">Send link</button></div><div class="note" id="lv-sent"></div></div>
    <div class="card"><div class="k">2. Paste their reply</div><div class="u">When they open the link they get a short reply code. Paste it here. Keep this screen open until then.</div><div class="field"><input id="lv-reply" placeholder="Paste the reply code"></div><div class="chips"><button class="btn" id="lv-connect">Connect</button></div><div class="note" id="lv-msg"></div></div>`;
    $("lv-close").onclick = () => (live?.pc.close(), live = null, close4());
    $("lv-send").onclick = async () => ($("lv-sent").textContent = await shareLink("Bowl with me on LaneIQ", `${me().name} wants to sync shots live on LaneIQ. Open this to join.`, link), void 0);
    $("lv-connect").onclick = async () => {
      const code = $("lv-reply").value.trim().replace(/^LIVE-/, "");
      const json = code ? await unpackText(code) : null;
      let ans = null;
      try {
        ans = json ? JSON.parse(json) : null;
      } catch {
      }
      if (!ans?.sdp || !ans.who?.code) return void ($("lv-msg").textContent = "That reply code isn't right. Ask your friend to send it again.");
      try {
        await l.pc.setRemoteDescription({ type: "answer", sdp: ans.sdp });
        $("lv-msg").textContent = "Connecting\u2026";
      } catch {
        $("lv-msg").textContent = "Couldn't use that reply. Start a new session and try again.";
      }
    };
  }
  async function joinFrom(code) {
    const json = await unpackText(code);
    let offer = null;
    try {
      offer = json ? JSON.parse(json) : null;
    } catch {
    }
    const el = sheet4();
    el.classList.add("on");
    if (!offer?.sdp || !offer.who?.code) {
      el.innerHTML = `<div class="row"><h2>Live session</h2><button class="btn ghost" id="lv-close">Close</button></div><div class="card"><div class="u">That link is damaged or isn't a LaneIQ live session.</div></div>`;
      $("lv-close").onclick = close4;
      return;
    }
    const from = offer.who;
    el.innerHTML = `<div class="row"><h2>Join ${esc(from.name)}?</h2><button class="btn ghost" id="lv-close">Not now</button></div><div class="card"><div class="lr-head">${esc(from.name)}${from.username ? ` <span class="note">@${esc(from.username)}</span>` : ""}</div><div class="u">wants to sync shots live while you bowl. Your shots go straight to their phone while you're connected.</div><div class="chips"><button class="btn" id="lv-yes">Join</button></div></div>`;
    $("lv-close").onclick = close4;
    $("lv-yes").onclick = async () => {
      el.innerHTML = `<div class="row"><h2>Connecting\u2026</h2></div><div class="note">Getting your reply ready. Keep the app open.</div>`;
      const l = newLive();
      l.pc.ondatachannel = (e) => wire2(l, e.channel);
      await l.pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
      await l.pc.setLocalDescription(await l.pc.createAnswer());
      const reply = await packText(JSON.stringify({ v: 1, sdp: await gathered(l.pc), who: me() }));
      if (location.search.includes("livetest")) globalThis.__live = { reply };
      el.innerHTML = `
      <div class="row"><h2>Send this reply back</h2><button class="btn ghost" id="lv-close">Cancel</button></div>
      <div class="card"><div class="u">Send this code to ${esc(from.name)}. They paste it in their app and you're connected. Keep this screen open until then.</div><div class="u" style="word-break:break-all;user-select:all;max-height:6em;overflow:auto">${esc(reply)}</div><div class="chips"><button class="btn" id="lv-sendreply">Send reply</button></div><div class="note" id="lv-sent"></div></div>`;
      $("lv-close").onclick = () => (live?.pc.close(), live = null, close4());
      $("lv-sendreply").onclick = async () => {
        try {
          await navigator.clipboard.writeText(reply);
        } catch {
        }
        const nav = navigator;
        try {
          if (nav.share) await nav.share({ title: "LaneIQ reply", text: reply });
          $("lv-sent").textContent = "Reply copied. Paste it into a message to them.";
        } catch {
          $("lv-sent").textContent = "Reply copied. Paste it into a message to them.";
        }
      };
    };
  }
  function render() {
    if (!live) return;
    const l = live;
    if (!sheet4().classList.contains("on") || !$("friends").dataset.live) {
      if (l.state === "waiting") return;
    }
    const el = sheet4();
    el.classList.add("on");
    el.dataset.live = "1";
    const peerName = l.peer ? `${esc(l.peer.name)}${l.peer.username ? ` <span class="note">@${esc(l.peer.username)}</span>` : ""}` : "your friend";
    const last = (a) => a[a.length - 1];
    const fmt4 = (v, d = 1) => v === null || v === void 0 ? "-" : v.toFixed(d);
    const row = (label2, a, b, d = 1) => `<tr><td>${label2}</td><td class="n">${fmt4(a, d)}</td><td class="n">${fmt4(b, d)}</td></tr>`;
    const same = !!myLane && !!l.peerLane && myLane.toLowerCase() === l.peerLane.toLowerCase();
    el.innerHTML = `
    <div class="row"><h2>Live with ${peerName}</h2><button class="btn ghost" id="lv-close">${l.state === "connected" ? "Hide" : "Close"}</button></div>
    <div class="card"><span class="badge ${l.state === "connected" ? "good" : "tentative"}">${l.state === "connected" ? "connected" : l.state === "ended" ? "disconnected" : "connecting\u2026"}</span>
      <div class="field" style="margin-top:8px"><label>Where are you bowling? (center and lane)</label><input id="lv-lane" value="${esc(myLane)}" placeholder="e.g. AMF 14"></div>
      <div class="u">${l.peerLane ? `${peerName} is on ${esc(l.peerLane)}${same ? " (the same lane)" : ""}.` : "Waiting for their lane."}</div></div>
    <div class="card"><div class="stagebox"><canvas id="lv-map" width="360" height="560" style="width:100%;height:auto;aspect-ratio:360/560"></canvas></div>
      <div class="note"><span style="color:#46e6ff">Cyan: you (${l.mine.length})</span> \xB7 <span style="color:#ffd25a">Gold: ${peerName} (${l.theirs.length})</span></div></div>
    <div class="card"><table><tr><th>Latest shot</th><th class="n">You</th><th class="n">${l.peer ? esc(l.peer.name) : "Them"}</th></tr>
      ${row("Speed (mph)", last(l.mine)?.sp, last(l.theirs)?.sp)}${row("Board at arrows", last(l.mine)?.ar, last(l.theirs)?.ar)}${row("Breakpoint board", last(l.mine)?.bb, last(l.theirs)?.bb)}${row("Breakpoint (ft)", last(l.mine)?.bf, last(l.theirs)?.bf, 0)}${row("Entry board", last(l.mine)?.en, last(l.theirs)?.en)}${row("Entry angle (\xB0)", last(l.mine)?.an, last(l.theirs)?.an)}</table></div>
    <div class="chips"><button class="btn ghost" id="lv-save">Save their shots to compare later</button><button class="btn ghost" id="lv-end">End session</button></div><div class="note" id="lv-msg">${l.state === "ended" ? "The connection closed. Your shots are saved on this phone as usual." : ""}</div>`;
    $("lv-close").onclick = () => (el.dataset.live = "", close4());
    $("lv-lane").onchange = (e) => {
      myLane = e.target.value.trim();
      send({ t: "lane", lane: myLane });
      render();
    };
    $("lv-end").onclick = () => {
      l.state = "ended";
      send({ t: "bye" });
      l.pc.close();
      live = null;
      el.dataset.live = "";
      close4();
    };
    $("lv-save").onclick = async () => {
      if (!l.peer || !l.theirs.length) return void ($("lv-msg").textContent = "No shots from them yet.");
      const sess = { v: 1, from: { name: l.peer.name, code: l.peer.code }, lane: l.peerLane || "unknown lane", date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), hand: "R", shots: l.theirs };
      S.shared = [...S.shared.filter((x) => !(x.from.code === sess.from.code && x.date === sess.date && x.lane === sess.lane)), sess];
      await saveSocial();
      $("lv-msg").textContent = "Saved. You'll find it under Compare shots.";
    };
    const paths = [
      ...l.theirs.map((s) => ({ path: pathFromShared(s.p), color: "rgba(255,210,90,.75)", width: 1.6, alpha: 0.8 })),
      ...l.mine.map((s) => ({ path: pathFromShared(s.p), color: "rgba(70,230,255,.8)", width: 1.6, alpha: 0.85 }))
    ];
    drawTopDown($("lv-map").getContext("2d"), 360, 560, paths, { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
  }

  // camera/pending.ts
  var HASH_KEY = "laneiq.pendingHash";
  var TAG_KEY = "laneiq.pendingTag";
  var TWO_WEEKS = 14 * 864e5;
  function fresh(raw) {
    if (!raw) return "";
    try {
      const o = JSON.parse(raw);
      return Date.now() - o.at < TWO_WEEKS ? o.v : "";
    } catch {
      return "";
    }
  }
  function readPendingHash() {
    try {
      return sessionStorage.getItem(HASH_KEY) || fresh(localStorage.getItem(HASH_KEY));
    } catch {
      return "";
    }
  }
  function writePendingHash(h) {
    try {
      sessionStorage.setItem(HASH_KEY, h);
      localStorage.setItem(HASH_KEY, JSON.stringify({ v: h, at: Date.now() }));
    } catch {
    }
  }
  function clearPendingHash() {
    try {
      sessionStorage.removeItem(HASH_KEY);
      localStorage.removeItem(HASH_KEY);
    } catch {
    }
  }
  var readPendingTag = () => {
    try {
      return fresh(localStorage.getItem(TAG_KEY));
    } catch {
      return "";
    }
  };
  function writePendingTag(t) {
    try {
      localStorage.setItem(TAG_KEY, JSON.stringify({ v: t, at: Date.now() }));
    } catch {
    }
  }
  function clearPendingTag() {
    try {
      localStorage.removeItem(TAG_KEY);
    } catch {
    }
  }
  function installManifestFor(hash) {
    const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    if (standalone || !hash) return;
    try {
      const here = new URL(location.href);
      here.hash = "";
      const abs = (p) => new URL(p, here).href;
      const manifest = {
        name: "LaneIQ",
        short_name: "LaneIQ",
        description: "Automatic bowling shot tracking",
        start_url: here.href + hash,
        scope: new URL("./", here).href,
        display: "standalone",
        orientation: "any",
        background_color: "#070a10",
        theme_color: "#070a10",
        icons: [
          { src: abs("icon-192.png"), sizes: "192x192", type: "image/png" },
          { src: abs("icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" }
        ]
      };
      const link = document.querySelector('link[rel="manifest"]');
      if (link) link.href = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
    } catch {
    }
  }

  // camera/friends.ts
  var LINK_KEY = "laneiq.appLink";
  var baseUrl = () => new URL(".", location.href).href.replace(/\/+$/, "");
  var PUBLIC_APP = "https://flanxe.github.io/laneiq";
  function appLink() {
    try {
      const stored = localStorage.getItem(LINK_KEY);
      if (stored) return stored.replace(/\/+$/, "");
    } catch {
    }
    return isPrivateHost(baseUrl()) ? PUBLIC_APP : baseUrl();
  }
  function setAppLink(v) {
    try {
      const t = v.trim();
      if (t) localStorage.setItem(LINK_KEY, t);
      else localStorage.removeItem(LINK_KEY);
    } catch {
    }
  }
  function isPrivateHost(link) {
    return /tailscale|\.ts\.net|localhost|127\.0\.0\.1|^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(link);
  }
  async function shareLink(title, text, url) {
    const nav = navigator;
    try {
      if (nav.share) {
        await nav.share({ title, text, url });
        return "Opened the share sheet.";
      }
    } catch (e) {
      if (e.name === "AbortError") return "Cancelled.";
    }
    try {
      await navigator.clipboard.writeText(`${text}
${url}`);
      return "Link copied. Paste it into a message.";
    } catch {
      return "Couldn't copy automatically. Select and copy the link below.";
    }
  }
  var bytesToB64 = (b) => {
    let s = "";
    b.forEach((x) => s += String.fromCharCode(x));
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  var b64ToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  var packSession = (sess) => packText(JSON.stringify(sess));
  async function packText(json) {
    try {
      if ("CompressionStream" in window) {
        const cs = new CompressionStream("gzip");
        const w = cs.writable.getWriter();
        void w.write(new TextEncoder().encode(json));
        void w.close();
        return "z." + bytesToB64(new Uint8Array(await new Response(cs.readable).arrayBuffer()));
      }
    } catch {
    }
    return b64urlEncode(json);
  }
  async function unpackText(payload) {
    try {
      if (payload.startsWith("z.")) {
        const ds = new DecompressionStream("gzip");
        const w = ds.writable.getWriter();
        void w.write(b64ToBytes(payload.slice(2)));
        void w.close();
        const json = await new Response(ds.readable).text();
        return json.length > 4e5 ? null : json;
      }
      return b64urlDecode(payload);
    } catch {
      return null;
    }
  }
  async function unpackSession(payload) {
    const json = await unpackText(payload);
    return json === null ? null : decodeSession(b64urlEncode(json));
  }
  var sheet5 = () => $("friends");
  var close5 = () => (sheet5().classList.remove("on"), sheet5().innerHTML = "");
  var myName = () => S.profile?.name ?? "A bowler";
  var myUser = () => S.profile?.username ?? "";
  var myCode = () => {
    if (S.profile && !S.profile.friendCode) updateProfile({ friendCode: newFriendCode() });
    return S.profile?.friendCode ?? "";
  };
  function askForUsername(then) {
    const el = sheet5();
    el.classList.add("on");
    el.innerHTML = `<div class="row"><h2>Choose an account name</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="note">Friends add you by account name plus your friend code. Pick one (3 to 20 letters, numbers or underscores).</div>
    <div class="card"><div class="field"><label>Account name</label><input id="fr-user" placeholder="e.g. strikeking22" autocomplete="off" autocapitalize="none" spellcheck="false"></div><div class="chips"><button class="btn" id="fr-usersave">Save</button></div><div class="note" id="fr-usermsg"></div></div>`;
    $("fr-close").onclick = close5;
    $("fr-usersave").onclick = () => {
      const u = cleanUsername($("fr-user").value);
      if (!isUsername(u)) return void ($("fr-usermsg").textContent = "Use 3 to 20 letters, numbers or underscores, no spaces.");
      updateProfile({ username: u });
      then();
    };
  }
  function openInvite() {
    if (!myUser()) return askForUsername(openInvite);
    const link = `${appLink()}/#invite=${encodeInvite(myName(), myCode(), myUser())}`;
    const warn = isPrivateHost(appLink());
    const el = sheet5();
    el.classList.add("on");
    el.innerHTML = `
    <div class="row"><h2>Invite a player</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="note">This link brings someone to the app and sends them a friend request from you. When they accept, they can send theirs back so you're both friends. Nothing is uploaded: the link itself carries your name and friend code.</div>
    ${warn ? `<div class="card"><div class="lr-head" style="font-size:16px">This address only works on your own network</div><div class="u">The link points at ${esc(appLink())}, which friends can't open. Set the public address of the app in <b>Me \u2192 Friends</b> before inviting people.</div></div>` : ""}
    <div class="card"><div class="k">Your friend tag</div><div class="u" style="font-size:18px;font-weight:700;word-break:break-all;user-select:all">${esc(friendTag(myUser(), myCode()))}</div>
      <div class="note">If the link doesn't add you, your friend can type this tag in <b>Me \u2192 Friends \u2192 Add a friend</b>, or in the "Invited by a friend?" box when they first set up.</div>
      <div class="chips"><button class="chip" id="fr-copytag2">Copy tag</button><button class="chip" id="fr-copylink">Copy link</button></div></div>
    <div class="card"><div class="k">Your invite link</div><div class="u" style="word-break:break-all;user-select:all">${esc(link)}</div>
      <div class="chips"><button class="btn" id="fr-send">Send invite / friend request</button></div><div class="note" id="fr-msg"></div></div>`;
    $("fr-close").onclick = close5;
    const tag = friendTag(myUser(), myCode());
    $("fr-send").onclick = async () => ($("fr-msg").textContent = await shareLink("Join me on LaneIQ", `${myName()} invited you to LaneIQ, a free bowling coach that uses your phone's camera, and wants to be friends. Open the link, then add it to your Home Screen. If I don't show up as a friend, add me with my tag: ${tag}`, link), void 0);
    const copy = (id, text, label2) => $(id).onclick = async () => {
      try {
        await navigator.clipboard.writeText(text);
        $(id).textContent = "Copied";
      } catch {
        prompt(label2, text);
      }
    };
    copy("fr-copytag2", tag, "Your friend tag:");
    copy("fr-copylink", link, "Your invite link:");
  }
  function openFriendRequest(from, kind2) {
    const el = sheet5();
    el.classList.add("on");
    const already = S.friends.some((f) => f.code === from.code);
    const self = from.code === myCode();
    el.innerHTML = `
    <div class="row"><h2>${kind2 === "invite" ? "Friend request" : "Friend request accepted"}</h2><button class="btn ghost" id="fr-close">Close</button></div>
    ${self ? `<div class="card"><div class="u">That's your own link.</div></div>` : `<div class="card"><div class="lr-head">${esc(from.name)}${from.username ? ` <span class="note">@${esc(from.username)}</span>` : ""}</div><div class="u">${kind2 === "invite" ? "wants to be friends so you can compare shots on the same lane." : "added you. Add them back to finish connecting."}</div><div class="u">Friend code ${esc(from.code)}</div>
    <div class="chips">${already ? `<span class="tag">Already friends</span>` : `<button class="btn" id="fr-accept">${kind2 === "invite" ? `Add ${esc(from.name)} and let them know` : `Add ${esc(from.name)} as a friend`}</button>`}<button class="chip" id="fr-no">Not now</button></div><div class="note" id="fr-msg"></div></div>`}`;
    $("fr-close").onclick = close5;
    $("fr-no")?.addEventListener("click", () => {
      if (!self && !already) deferInvite(from);
      close5();
    });
    $("fr-accept")?.addEventListener("click", async () => {
      S.friends.push({ code: from.code, name: from.name, username: from.username, addedAt: (/* @__PURE__ */ new Date()).toISOString() });
      dropDeferred(from.code);
      await saveSocial();
      if (kind2 === "reply") return close5();
      $("fr-msg").innerHTML = `Added ${esc(from.name)}. Send the confirmation so they can add you back.`;
      const send2 = async () => $("fr-msg").textContent = await shareLink("Friend request accepted", `${myName()} accepted your friend request on LaneIQ. Tap to add them back.`, `${appLink()}/#reply=${encodeInvite(myName(), myCode(), myUser())}`);
      void send2();
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Send confirmation again";
      btn.onclick = () => void send2();
      $("fr-msg").append(document.createElement("br"), btn);
    });
  }
  function buildSession(sessionId, lane) {
    const shots = S.shots.filter((s) => s.sessionId === sessionId).slice(-40);
    if (!shots.length) return null;
    return {
      v: 1,
      from: { name: myName(), code: myCode() },
      lane,
      date: new Date(shots[0].at).toISOString().slice(0, 10),
      hand: S.profile?.hand ?? "R",
      shots: shots.map(sharedShotOf)
    };
  }
  var sharedShotOf = (s) => ({
    sp: Number(s.a.speedMph.toFixed(1)),
    ar: s.m.arrowsBoard === null ? null : Number(s.m.arrowsBoard.toFixed(1)),
    bb: s.m.breakpointBoard === null ? null : Number(s.m.breakpointBoard.toFixed(1)),
    bf: s.m.breakpointFt === null ? null : Number(s.m.breakpointFt.toFixed(0)),
    en: s.m.entryBoard === null ? null : Number(s.m.entryBoard.toFixed(1)),
    an: s.a.impactAngleDeg === null ? null : Number(s.a.impactAngleDeg.toFixed(1)),
    ball: S.arsenal.find((b) => b.id === s.ballId)?.name,
    pins: s.result?.pinsDown,
    p: downsamplePath(s.path)
  });
  var sessionsOf = () => {
    const ids = [...new Set(S.shots.map((s) => s.sessionId))];
    return ids.map((id) => {
      const g = S.shots.filter((s) => s.sessionId === id);
      return { id, n: g.length, date: new Date(g[0].at).toLocaleDateString([], { month: "short", day: "numeric" }) };
    });
  };
  function openShareSession() {
    const el = sheet5();
    el.classList.add("on");
    const list = sessionsOf().reverse();
    const warn = isPrivateHost(appLink());
    el.innerHTML = `
    <div class="row"><h2>Share a session</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="note">Sends a compact copy of your shots from one session (paths, speed, boards, ball and pin counts, no video) so a friend can compare them with theirs on the same lane.</div>
    ${warn ? `<div class="card"><div class="u">The app address ${esc(appLink())} only works on your own network, so friends won't be able to open this link. Set the public address under Me \u2192 Friends first.</div></div>` : ""}
    ${list.length ? "" : `<div class="card"><div class="u">No sessions yet. Bowl some shots first.</div></div>`}
    <div class="field"><label>Where was it? (center and lane, e.g. AMF 14)</label><input id="fr-lane" placeholder="Center and lane"></div>
    ${list.map((s) => `<div class="card"><div class="row"><div><b>${esc(s.date)}</b> <span class="note">${s.n} shots</span></div><button class="chip" data-id="${s.id}">Share</button></div></div>`).join("")}
    <div class="note" id="fr-msg"></div>`;
    $("fr-close").onclick = close5;
    el.querySelectorAll("[data-id]").forEach(
      (b) => b.onclick = async () => {
        const lane = $("fr-lane").value.trim();
        if (!lane) return $("fr-msg").textContent = "Add where it was bowled first, so your friend can tell if it's the same lane.";
        S.laneLabels[b.dataset.id] = lane;
        await saveSocial();
        const sess = buildSession(b.dataset.id, lane);
        if (!sess) return;
        $("fr-msg").textContent = await shareLink("My shots on LaneIQ", `${myName()} shared a session from ${lane}. Open it in LaneIQ to compare with yours.`, `${appLink()}/#session=${await packSession(sess)}`);
      }
    );
  }
  function openReceivedSession(sess) {
    const el = sheet5();
    el.classList.add("on");
    const known = S.friends.some((f) => f.code === sess.from.code);
    el.innerHTML = `
    <div class="row"><h2>Shared session</h2><button class="btn ghost" id="fr-close">Close</button></div>
    <div class="card"><div class="lr-head">${esc(sess.from.name)}</div><div class="u">${esc(sess.lane)} \xB7 ${esc(sess.date)} \xB7 ${sess.shots.length} shots${sess.pattern ? ` \xB7 ${esc(sess.pattern)}` : ""}</div>
      <div class="note">${known ? "A friend of yours." : "Not in your friends yet. Saving this does not add them."}</div>
      <div class="chips"><button class="btn" id="fr-save">Save to compare</button><button class="chip" id="fr-no">Not now</button></div></div>`;
    $("fr-close").onclick = close5;
    $("fr-no").onclick = close5;
    $("fr-save").onclick = async () => {
      S.shared = [...S.shared.filter((x) => !(x.from.code === sess.from.code && x.date === sess.date && x.lane === sess.lane)), sess];
      await saveSocial();
      close5();
      openCompare(sess);
    };
  }
  function openCompare(theirs) {
    const el = sheet5();
    el.classList.add("on");
    const mine = sessionsOf().reverse();
    if (!S.shared.length || !mine.length) {
      el.innerHTML = `<div class="row"><h2>Compare</h2><button class="btn ghost" id="fr-close">Close</button></div><div class="card"><div class="u">${!S.shared.length ? "No friend sessions yet. When a friend shares a session with you and you save it, it shows up here." : "Bowl some shots first so there is something to compare."}</div></div>`;
      $("fr-close").onclick = close5;
      return;
    }
    let pickTheirs = theirs ?? S.shared[S.shared.length - 1];
    let pickMine = mine.find((m) => S.laneLabels[m.id] && pickTheirs.lane && S.laneLabels[m.id].toLowerCase() === pickTheirs.lane.toLowerCase())?.id ?? mine[0].id;
    const draw3 = () => {
      const mySess = buildSession(pickMine, S.laneLabels[pickMine] ?? "");
      const cmp = compareSessions(mySess, pickTheirs);
      const fmt4 = (v, u) => v === null ? "-" : `${v.toFixed(1)}${u === "\xB0" ? "\xB0" : u ? " " + u : ""}`;
      el.innerHTML = `
      <div class="row"><h2>Compare shots</h2><button class="btn ghost" id="fr-close">Close</button></div>
      <div class="field"><label>Their session</label><select id="cp-theirs">${S.shared.map((x, i) => `<option value="${i}" ${x === pickTheirs ? "selected" : ""}>${esc(x.from.name)} \xB7 ${esc(x.lane)} \xB7 ${esc(x.date)}</option>`).join("")}</select></div>
      <div class="field"><label>Your session</label><select id="cp-mine">${mine.map((m) => `<option value="${m.id}" ${m.id === pickMine ? "selected" : ""}>${esc(m.date)} \xB7 ${m.n} shots${S.laneLabels[m.id] ? " \xB7 " + esc(S.laneLabels[m.id]) : ""}</option>`).join("")}</select></div>
      <div class="field"><label>Where was your session? (so it can be matched to their lane)</label><input id="cp-lane" value="${esc(S.laneLabels[pickMine] ?? "")}" placeholder="Center and lane"></div>
      <div class="card"><span class="badge ${cmp.sameLane ? "good" : "tentative"}">${cmp.sameLane ? "same lane" : "different lanes"}</span><div class="stagebox" style="margin-top:10px"><canvas id="cp-map" width="360" height="600" style="width:100%;height:auto;aspect-ratio:360/600"></canvas></div>
        <div class="note"><span style="color:#46e6ff">Cyan: you</span> \xB7 <span style="color:#ffd25a">Gold: ${esc(pickTheirs.from.name)}</span></div></div>
      <div class="card"><table><tr><th></th><th class="n">You</th><th class="n">${esc(pickTheirs.from.name)}</th></tr>${cmp.rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="n">${fmt4(r.mine, r.unit)}</td><td class="n">${fmt4(r.theirs, r.unit)}</td></tr>`).join("")}</table></div>
      <div class="card"><ul>${cmp.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>`;
      $("fr-close").onclick = close5;
      $("cp-theirs").onchange = (e) => (pickTheirs = S.shared[Number(e.target.value)], draw3());
      $("cp-mine").onchange = (e) => (pickMine = e.target.value, draw3());
      $("cp-lane").onchange = async (e) => {
        S.laneLabels[pickMine] = e.target.value.trim();
        await saveSocial();
        draw3();
      };
      const paths = [
        ...pickTheirs.shots.map((s) => ({ path: pathFromShared(s.p), color: "rgba(255,210,90,.75)", width: 1.6, alpha: 0.8 })),
        ...mySess.shots.map((s) => ({ path: pathFromShared(s.p), color: "rgba(70,230,255,.8)", width: 1.6, alpha: 0.85 }))
      ];
      drawTopDown($("cp-map").getContext("2d"), 360, 600, paths, { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
    };
    draw3();
  }
  function captureIncomingHash() {
    if (/^#(invite|reply|session|live)=/.test(location.hash)) {
      const h = location.hash;
      writePendingHash(h);
      installManifestFor(h);
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  async function handleIncoming() {
    if (S.profile) await addPendingTag();
    const h = readPendingHash();
    if (!h || !S.profile) return;
    clearPendingHash();
    const [, kind2, value] = /^#(invite|reply|session|live)=(.+)$/.exec(h) ?? [];
    if (!kind2) return;
    if (kind2 === "live") return void joinFrom(value);
    if (kind2 === "session") {
      const s = await unpackSession(value);
      return s ? openReceivedSession(s) : void alert("That session link is damaged or isn't a LaneIQ session.");
    }
    const inv = decodeInvite(value);
    if (!inv) return void alert("That friend link is damaged.");
    openFriendRequest(inv, kind2);
  }
  var DEFER_KEY = "laneiq.deferredInvites";
  var deferred = () => {
    try {
      return JSON.parse(localStorage.getItem(DEFER_KEY) ?? "[]");
    } catch {
      return [];
    }
  };
  var setDeferred = (v) => {
    try {
      localStorage.setItem(DEFER_KEY, JSON.stringify(v.slice(-20)));
    } catch {
    }
  };
  function deferInvite(from) {
    if (!deferred().some((d) => d.code === from.code)) setDeferred([...deferred(), from]);
  }
  function dropDeferred(code) {
    setDeferred(deferred().filter((d) => d.code !== code));
  }
  async function addPendingTag() {
    const raw = readPendingTag();
    if (!raw) return;
    clearPendingTag();
    const t = parseFriendTag(raw);
    if (!t || t.code === myCode() || S.friends.some((f) => f.code === t.code)) return;
    S.friends.push({ code: t.code, name: t.username, username: t.username, addedAt: (/* @__PURE__ */ new Date()).toISOString() });
    await saveSocial();
    alert(`Added ${t.username} as a friend.`);
  }
  function friendsCardHtml() {
    const link = appLink();
    return `<div class="card"><div class="k">Friends</div>
    ${myUser() ? `<div class="note">Your account name: <b>@${esc(myUser())}</b> \xB7 your friend tag: <b>${esc(friendTag(myUser(), myCode()))}</b></div><div class="chips"><button class="chip" id="fr-copytag">Copy my tag</button></div>` : `<div class="note">Choose an account name so friends can add you.</div><div class="chips"><button class="btn" id="fr-setuser">Choose account name</button></div>`}
    <div class="field"><label>Add a friend by their tag</label><div class="chips"><input id="fr-addtag" placeholder="name#CODE, e.g. strikeking22#K7QP2MXA" autocomplete="off" autocapitalize="none" spellcheck="false" style="flex:1"><button class="chip add" id="fr-addbtn">Add</button></div><div class="note" id="fr-addmsg">Ask your friend for their tag (it is on their Me tab), or send them an invite link. There is no server to search, so a name alone cannot be looked up.</div></div>
    ${deferred().filter((d) => !S.friends.some((f) => f.code === d.code)).map((d) => `<div class="card" style="margin:8px 0"><div class="u"><b>${esc(d.name)}</b>${d.username ? ` <span class="note">@${esc(d.username)}</span>` : ""} sent you a friend request.</div><div class="chips"><button class="chip add" data-def-add="${esc(d.code)}">Add</button><button class="chip" data-def-no="${esc(d.code)}">Dismiss</button></div></div>`).join("")}
    <div class="chips"><button class="btn" id="fr-invite">Invite a player</button><button class="btn ghost" id="fr-sharesess">Share a session</button><button class="btn ghost" id="fr-compare">Compare shots</button><button class="btn" id="fr-live">Bowl together, live</button></div>
    ${S.friends.length ? `<table>${S.friends.map((f) => `<tr><td>${esc(f.name)}${f.username ? ` <span class="note">@${esc(f.username)}</span>` : ""}</td><td class="note">${esc(f.code)}</td><td class="n"><button class="chip" data-rmf="${f.code}">Remove</button></td></tr>`).join("")}</table>` : `<div class="u" style="margin-top:8px">No friends yet.</div>`}
    ${S.shared.length ? `<div class="note" style="margin-top:8px">${S.shared.length} saved session${S.shared.length === 1 ? "" : "s"} from friends.</div>` : ""}
    <div class="field"><label>App address friends will open</label><input id="fr-link" value="${esc(link)}" placeholder="https://\u2026"></div>
    ${isPrivateHost(link) ? `<div class="note" style="color:var(--gold)">That address only works on your own network or Tailscale. Friends need a public address; set it here once the app is hosted for everyone.</div>` : ""}</div>`;
  }
  function wireFriendsCard(rerender) {
    $("fr-setuser")?.addEventListener("click", () => askForUsername(() => (close5(), rerender())));
    $("fr-copytag")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(friendTag(myUser(), myCode()));
        $("fr-copytag").textContent = "Copied";
      } catch {
        prompt("Your friend tag:", friendTag(myUser(), myCode()));
      }
    });
    $("fr-addbtn")?.addEventListener("click", async () => {
      const t = parseFriendTag($("fr-addtag").value);
      const msg = $("fr-addmsg");
      if (!t) return void (msg.textContent = "That doesn't look like a tag. It should be a name, a #, then 8 letters and numbers: strikeking22#K7QP2MXA.");
      if (t.code === myCode()) return void (msg.textContent = "That's your own tag.");
      if (S.friends.some((f) => f.code === t.code)) return void (msg.textContent = "Already in your friends.");
      S.friends.push({ code: t.code, name: t.username, username: t.username, addedAt: (/* @__PURE__ */ new Date()).toISOString() });
      await saveSocial();
      rerender();
    });
    document.querySelectorAll("[data-def-add]").forEach((b) => b.onclick = async () => {
      const d = deferred().find((x) => x.code === b.dataset.defAdd);
      if (d) S.friends.push({ code: d.code, name: d.name, username: d.username, addedAt: (/* @__PURE__ */ new Date()).toISOString() });
      dropDeferred(b.dataset.defAdd);
      await saveSocial();
      rerender();
    });
    document.querySelectorAll("[data-def-no]").forEach((b) => b.onclick = () => (dropDeferred(b.dataset.defNo), rerender()));
    $("fr-invite")?.addEventListener("click", openInvite);
    $("fr-sharesess")?.addEventListener("click", openShareSession);
    $("fr-compare")?.addEventListener("click", () => openCompare());
    $("fr-live")?.addEventListener("click", openLive);
    $("fr-link")?.addEventListener("change", (e) => (setAppLink(e.target.value), rerender()));
    document.querySelectorAll("[data-rmf]").forEach(
      (b) => b.onclick = async () => {
        S.friends = S.friends.filter((f) => f.code !== b.dataset.rmf);
        await saveSocial();
        rerender();
      }
    );
  }

  // camera/quizui.ts
  var REV_OPTS = [
    { id: "unsure", label: "Not sure" },
    { id: "low", label: "Low (under 300)" },
    { id: "medium", label: "Medium (300 to 400)" },
    { id: "high", label: "High (400 to 500)" },
    { id: "very-high", label: "Very high (500+)" }
  ];
  var SPEED_OPTS = [
    { id: "unsure", label: "Not sure" },
    { id: "slow", label: "Slower (under 15 mph)" },
    { id: "medium", label: "Medium (15 to 18)" },
    { id: "fast", label: "Fast (over 18)" }
  ];
  var AVG_OPTS = [
    { id: "", label: "Skip" },
    { id: "under-150", label: "Under 150" },
    { id: "150-179", label: "150 to 179" },
    { id: "180-199", label: "180 to 199" },
    { id: "200-219", label: "200 to 219" },
    { id: "220+", label: "220+" }
  ];
  var PATTERN_OPTS = [
    { id: "unsure", label: "Not sure" },
    { id: "house", label: "House shots" },
    { id: "sport", label: "Sport patterns" },
    { id: "both", label: "Both" }
  ];
  var GOAL_OPTS = [
    { id: "strikes", label: "More strikes" },
    { id: "spares", label: "Better spare shooting" },
    { id: "consistency", label: "More consistency" },
    { id: "compete", label: "Compete" },
    { id: "fun", label: "Just for fun" }
  ];
  function inviteBanner() {
    const h = readPendingHash();
    const m = /^#(invite|reply|session)=(.+)$/.exec(h);
    if (!m) return "";
    if (m[1] === "session") return `<div class="invitebox"><b>A friend shared a session with you</b><div class="note">Set up your profile first. Then you can compare their shots with yours on the same lane.</div></div>`;
    const inv = decodeInvite(m[2]);
    if (!inv) return "";
    const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
    const tag = inv.username ? friendTag(inv.username, inv.code) : "";
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const install = standalone ? "" : `<div class="note" style="margin-top:6px"><b>Keep your data:</b> ${ios ? "tap the Share button, then Add to Home Screen" : "open the browser menu, then Add to Home Screen"}, and open LaneIQ from there. ${tag ? `If ${esc(inv.name)} isn't waiting for you in the app, enter their tag in the "Invited by a friend?" box: <b style="user-select:all">${esc(tag)}</b>` : ""}</div>`;
    return `<div class="invitebox"><b>${esc(inv.name)} invited you</b><div class="note">${m[1] === "invite" ? "Set up your profile first, then you'll see their friend request and can compare shots on the same lane." : "Set up your profile first, then you can add them back."}</div>${install}</div>`;
  }
  function showQuiz(mode2, onDone) {
    const el = $("onboard");
    const base = mode2 === "retake" && S.profile?.quiz ? { ...S.profile.quiz } : defaultAnswers(mode2 === "retake" ? S.profile?.name : "");
    const a = base;
    let step = 0;
    const STEPS2 = 8;
    el.classList.add("on");
    const chips = (opts, cur2, key2) => `<div class="chips">${opts.map((o) => `<button class="chip ${o.id === cur2 ? "sel" : ""}" data-k="${key2}" data-v="${esc(o.id)}">${esc(o.label)}</button>`).join("")}</div>`;
    const body = () => {
      switch (step) {
        case 0:
          return `<div class="welcome"><div class="logo">Lane<b style="background:linear-gradient(90deg,#46e6ff,#ff4fd8);-webkit-background-clip:text;background-clip:text;color:transparent">IQ</b></div><div class="note">Your bowling coach, using your phone's camera</div></div>${inviteBanner()}<h2>What should I call you?</h2><div class="note">A few quick questions so the app understands how you bowl before your first shot. Everything stays on this phone.</div>
          <div class="field"><label>Your name</label><input id="q-name" value="${esc(a.name)}" placeholder="Name" autocomplete="off"></div>
          <div class="field"><label>Account name (how friends find you)</label><input id="q-user" value="${esc(a.username ?? "")}" placeholder="e.g. strikeking22" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="note" id="q-usernote">3 to 20 letters, numbers or underscores. Friends add you with this name plus your friend code, so nobody can pretend to be you. It stays on this phone and in links you send.</div></div>
          ${mode2 === "first" ? `<div class="field"><label>Invited by a friend? (optional)</label><input id="q-invite" placeholder="Their friend tag, or paste their invite link" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="note">If a friend sent you here, enter their tag (it looks like strikeking22#K7QP2MXA) and they are added when you finish.</div></div>` : ""}`;
        case 1:
          return `<h2>How do you bowl?</h2><div class="note">This changes what the app expects from your ball and what it suggests.</div>` + STYLES.map((s) => `<button class="opt ${a.style === s.id ? "sel" : ""}" data-k="style" data-v="${s.id}"><b>${esc(s.label)}</b><span>${esc(s.blurb)}</span></button>`).join("");
        case 2:
          return `<h2>Which is your main hand?</h2><div class="note">${a.style === "two-handed" ? "For two-handed bowlers, pick the hand that stays under the ball at release." : "The hand you throw the ball with."} This sets which pocket you aim for (the 1-3 for right-handed, the 1-2 for left-handed).</div><button class="opt ${a.hand === "R" ? "sel" : ""}" data-k="hand" data-v="R"><b>Right</b></button><button class="opt ${a.hand === "L" ? "sel" : ""}" data-k="hand" data-v="L"><b>Left</b></button>`;
        case 3:
          return `<h2>How experienced are you?</h2>` + LEVELS.map((l) => `<button class="opt ${a.level === l.id ? "sel" : ""}" data-k="level" data-v="${l.id}"><b>${esc(l.label)}</b></button>`).join("") + `<div class="field"><label>Typical average (optional)</label>${chips(AVG_OPTS, a.avgBand, "avgBand")}</div>`;
        case 4:
          return `<h2>Your ball</h2><div class="note">Skip anything you don't know. The camera will measure your speed itself, and you can enter rev rate later.</div>
          <div class="field"><label>Rev rate (revolutions per minute)</label>${chips(REV_OPTS, a.revTier, "revTier")}<input id="q-rev" inputmode="numeric" placeholder="Or type your exact RPM" value="${a.revRpm ?? ""}"></div>
          <div class="field"><label>How fast do you throw?</label>${chips(SPEED_OPTS, a.speedTier, "speedTier")}</div>
          <div class="field"><label>Usual ball weight (lb)</label><select id="q-wt"><option value="">not sure</option>${[10, 11, 12, 13, 14, 15, 16].map((w) => `<option ${a.ballWeight === w ? "selected" : ""}>${w}</option>`).join("")}</select></div>`;
        case 5:
          return `<h2>What do you bowl on?</h2><div class="field"><label>Mostly</label>${chips(PATTERN_OPTS, a.patterns, "patterns")}</div><div class="field"><label>Your main goal</label>${chips(GOAL_OPTS, a.goal, "goal")}</div>`;
        case 6:
          return `<h2>What gives you trouble?</h2><div class="note">Tick anything that sounds like you. The app will look for it first, and still find problems you didn't think of.</div>` + FOCUS_OPTIONS.map((f) => `<button class="opt ${a.focus.includes(f.id) ? "sel" : ""}" data-focus="${f.id}"><b>${esc(f.label)}</b></button>`).join("");
        default: {
          const rev = estimateRev(a);
          return `<h2>Here's what I learned</h2><div class="card"><ul>${summarize(a).map((l) => `<li>${esc(l)}</li>`).join("")}</ul></div>
          <div class="card"><div class="k">What this changes</div><ul>${styleNotes(a.style).map((l) => `<li>${esc(l)}</li>`).join("")}<li>Starting assumption: about ${rev.rpm} RPM. I'll use it for ball recommendations until you enter your own number.</li></ul></div>
          <div class="note">Next: start the camera on the Live tab, let it lock onto the lane, and show it each of your balls so it can recognize them from your first shot.</div>`;
        }
      }
    };
    const draw3 = () => {
      el.innerHTML = `<div style="margin-top:14px" class="prog"><i style="width:${(step + 1) / STEPS2 * 100}%"></i></div><div class="note">Step ${step + 1} of ${STEPS2}</div>${body()}
      <div class="chips" style="margin-top:18px">${step > 0 ? `<button class="btn ghost" id="q-back">Back</button>` : mode2 !== "first" ? `<button class="btn ghost" id="q-cancel">Cancel</button>` : ""}<button class="btn" id="q-next">${step === STEPS2 - 1 ? "Start" : "Continue"}</button></div>`;
      el.querySelectorAll("[data-k]").forEach((b) => {
        b.onclick = () => {
          a[b.dataset.k] = b.dataset.v;
          draw3();
        };
      });
      el.querySelectorAll("[data-focus]").forEach((b) => {
        b.onclick = () => {
          const id = b.dataset.focus;
          a.focus = a.focus.includes(id) ? a.focus.filter((x) => x !== id) : [...a.focus, id];
          draw3();
        };
      });
      $("q-back")?.addEventListener("click", () => (readInputs(), step--, draw3()));
      $("q-cancel")?.addEventListener("click", () => (el.classList.remove("on"), el.innerHTML = ""));
      $("q-next").onclick = async () => {
        readInputs();
        if (step === 0 && !a.name.trim()) return $("q-name").focus();
        if (step === 0 && !isUsername(a.username ?? "")) {
          $("q-usernote").textContent = "Choose an account name: 3 to 20 letters, numbers or underscores (no spaces).";
          $("q-usernote").setAttribute("style", "color:var(--gold)");
          return $("q-user").focus();
        }
        if (step < STEPS2 - 1) return step++, draw3();
        a.takenAt = (/* @__PURE__ */ new Date()).toISOString();
        if (mode2 === "retake") {
          updateProfile({ name: a.name.trim() || S.profile.name, username: isUsername(a.username ?? "") ? a.username : S.profile.username, hand: a.hand, revRpm: a.revRpm, quiz: a });
          el.classList.remove("on");
          el.innerHTML = "";
          return onDone();
        }
        const p = createProfile(a);
        if (mode2 === "add") {
          setCurrentProfile(p.id);
          location.reload();
          return;
        }
        await loadProfile(p.id);
        el.classList.remove("on");
        el.innerHTML = "";
        onDone();
      };
    };
    const readInputs = () => {
      const name = document.getElementById("q-name");
      if (name) a.name = name.value;
      const user = document.getElementById("q-user");
      if (user) a.username = cleanUsername(user.value);
      const inv = document.getElementById("q-invite");
      if (inv && inv.value.trim()) {
        const v = inv.value.trim();
        const link = /#((?:invite|reply)=[^\s]+)/.exec(v);
        if (link) writePendingHash("#" + link[1]);
        else if (parseFriendTag(v)) writePendingTag(v);
      }
      const rev = document.getElementById("q-rev");
      if (rev) {
        const v = parseInt(rev.value, 10);
        a.revRpm = Number.isFinite(v) ? v : void 0;
      }
      const wt = document.getElementById("q-wt");
      if (wt) a.ballWeight = wt.value ? Number(wt.value) : void 0;
    };
    draw3();
  }

  // core/src/spin.ts
  function solveOmega(samples, R2) {
    if (samples.length < 12) return null;
    const rows2 = samples.map((s) => {
      const Pz = -Math.sqrt(Math.max(1e-6, R2 * R2 - s.x * s.x - s.y * s.y));
      return { Px: s.x, Py: s.y, Pz, vx: s.vx, vy: s.vy };
    });
    let w = rows2.map(() => 1);
    let om = { x: 0, y: 0, z: 0 };
    for (let iter = 0; iter < 8; iter++) {
      const A = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ];
      const b = [0, 0, 0];
      rows2.forEach((r, i) => {
        const ax = [0, r.Pz, -r.Py];
        const ay = [-r.Pz, 0, r.Px];
        for (let p = 0; p < 3; p++) {
          b[p] += w[i] * (ax[p] * r.vx + ay[p] * r.vy);
          for (let q = 0; q < 3; q++) A[p][q] += w[i] * (ax[p] * ax[q] + ay[p] * ay[q]);
        }
      });
      const sol = solve3(A, b);
      if (!sol) return null;
      om = { x: sol[0], y: sol[1], z: sol[2] };
      const res2 = rows2.map((r) => Math.hypot(om.y * r.Pz - om.z * r.Py - r.vx, om.z * r.Px - om.x * r.Pz - r.vy));
      const mad2 = [...res2].sort((a, b2) => a - b2)[Math.floor(res2.length / 2)] || 1e-6;
      const thr2 = Math.max(0.15, 2.5 * 1.4826 * mad2);
      w = res2.map((e) => e <= thr2 ? 1 : 0.02);
    }
    const res = rows2.map((r) => Math.hypot(om.y * r.Pz - om.z * r.Py - r.vx, om.z * r.Px - om.x * r.Pz - r.vy));
    const mad = [...res].sort((a, b) => a - b)[Math.floor(res.length / 2)] || 1e-6;
    const thr = Math.max(0.15, 2.5 * 1.4826 * mad);
    const keep = res.filter((e) => e <= thr);
    return { omega: om, inliers: keep.length, rmse: Math.sqrt(keep.reduce((a, e) => a + e * e, 0) / Math.max(1, keep.length)) };
  }
  function solve3(A, b) {
    const M = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < 3; c++) {
      let p = c;
      for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-9) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < 3; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k2 = c; k2 < 4; k2++) M[r][k2] -= f * M[c][k2];
      }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
  }
  function downscale(g) {
    const w = g.w >> 1;
    const h = g.h >> 1;
    const d = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) d[y * w + x] = (g.data[2 * y * g.w + 2 * x] + g.data[2 * y * g.w + 2 * x + 1] + g.data[(2 * y + 1) * g.w + 2 * x] + g.data[(2 * y + 1) * g.w + 2 * x + 1]) / 4;
    return { data: d, w, h };
  }
  var sample = (g, x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    if (x0 < 0 || y0 < 0 || x0 >= g.w - 1 || y0 >= g.h - 1) return NaN;
    const fx = x - x0;
    const fy = y - y0;
    const i = y0 * g.w + x0;
    return g.data[i] * (1 - fx) * (1 - fy) + g.data[i + 1] * fx * (1 - fy) + g.data[i + g.w] * (1 - fx) * fy + g.data[i + g.w + 1] * fx * fy;
  };
  function lkLevel(a, b, px, py, gx, gy, win) {
    let u = gx;
    let v = gy;
    let ok = false;
    for (let it = 0; it < 6; it++) {
      let sxx = 0, sxy = 0, syy = 0, sxt = 0, syt = 0, n = 0;
      for (let j = -win; j <= win; j++)
        for (let i = -win; i <= win; i++) {
          const x = px + i;
          const y = py + j;
          const ix = (sample(a, x + 1, y) - sample(a, x - 1, y)) / 2;
          const iy = (sample(a, x, y + 1) - sample(a, x, y - 1)) / 2;
          const it_ = sample(b, x + u, y + v) - sample(a, x, y);
          if (!Number.isFinite(ix + iy + it_)) continue;
          sxx += ix * ix;
          sxy += ix * iy;
          syy += iy * iy;
          sxt += ix * it_;
          syt += iy * it_;
          n++;
        }
      if (n < win * win) return { u, v, ok: false };
      const det = sxx * syy - sxy * sxy;
      const tr = sxx + syy;
      const minEig = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
      if (minEig / n < 0.5) return { u, v, ok: false };
      const du = (-syy * sxt + sxy * syt) / det;
      const dv = (sxy * sxt - sxx * syt) / det;
      u += du;
      v += dv;
      ok = true;
      if (Math.hypot(du, dv) < 0.02) break;
    }
    return { u, v, ok };
  }
  function flowAt(pyrA, pyrB, x, y, win = 5) {
    let u = 0;
    let v = 0;
    for (let l = pyrA.length - 1; l >= 0; l--) {
      const s = 2 ** l;
      const r = lkLevel(pyrA[l], pyrB[l], x / s, y / s, u / s, v / s, win);
      if (!r.ok && l === 0) return null;
      u = r.u * s;
      v = r.v * s;
    }
    return Number.isFinite(u + v) ? { u, v } : null;
  }
  var pyramid = (g, levels = 4) => {
    const out = [g];
    for (let i = 1; i < levels && out[i - 1].w >= 32; i++) out.push(downscale(out[i - 1]));
    return out;
  };
  function spinFromOmega(om, fps, view3, hand3) {
    const mag = Math.hypot(om.x, om.y, om.z);
    if (mag < 1e-6) return null;
    let f, l, u;
    if (view3 === "behind") [f, l, u] = [om.z, -om.x, -om.y];
    else if (view3 === "side-right") [f, l, u] = [om.x, om.z, -om.y];
    else [f, l, u] = [-om.x, -om.z, -om.y];
    const a = { f: f / mag, l: l / mag, u: u / mag };
    const notes = [];
    if (a.l < 0.2) notes.push("The measured spin doesn't look like a forward-rolling ball: check the camera position you chose.");
    const side = hand3 === "R" ? -a.f : a.f;
    return {
      rpm: mag * fps * 60 / (2 * Math.PI),
      axisRotation: Math.atan2(side, Math.abs(a.l)) * 180 / Math.PI,
      axisTilt: Math.abs(Math.asin(Math.max(-1, Math.min(1, a.u))) * 180 / Math.PI),
      quality: a.l < 0.2 ? 0.1 : 1,
      notes
    };
  }
  function trackCircle(prev, next, c, search = 24) {
    const half = Math.max(8, Math.floor(c.r * 0.45));
    let best = { dx: 0, dy: 0, cost: Infinity };
    for (let dy = -search; dy <= search; dy++)
      for (let dx = -search; dx <= search; dx++) {
        let cost = 0;
        let n = 0;
        for (let y = -half; y <= half; y += 3)
          for (let x = -half; x <= half; x += 3) {
            const a = prev.data[Math.round(c.cy + y) * prev.w + Math.round(c.cx + x)];
            const bx = Math.round(c.cx + x + dx);
            const by = Math.round(c.cy + y + dy);
            if (bx < 0 || by < 0 || bx >= next.w || by >= next.h) {
              cost = Infinity;
              break;
            }
            const d = a - next.data[by * next.w + bx];
            cost += d * d;
            n++;
          }
        if (n && cost / n < best.cost) best = { dx, dy, cost: cost / n };
      }
    return { cx: c.cx + best.dx, cy: c.cy + best.dy, r: c.r };
  }

  // core/src/spinpro.ts
  var I3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  var mul2 = (a, b) => a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
  var tvec = (m, v) => [m[0][0] * v[0] + m[1][0] * v[1] + m[2][0] * v[2], m[0][1] * v[0] + m[1][1] * v[1] + m[2][1] * v[2], m[0][2] * v[0] + m[1][2] * v[1] + m[2][2] * v[2]];
  var dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var unit3 = (a) => {
    const n = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  function rotation(om) {
    const a = Math.hypot(om.x, om.y, om.z);
    if (a < 1e-12) return I3;
    const k2 = [om.x / a, om.y / a, om.z / a];
    const c = Math.cos(a), s = Math.sin(a), v = 1 - c;
    return [
      [c + k2[0] * k2[0] * v, k2[0] * k2[1] * v - k2[2] * s, k2[0] * k2[2] * v + k2[1] * s],
      [k2[1] * k2[0] * v + k2[2] * s, c + k2[1] * k2[1] * v, k2[1] * k2[2] * v - k2[0] * s],
      [k2[2] * k2[0] * v - k2[1] * s, k2[2] * k2[1] * v + k2[0] * s, c + k2[2] * k2[2] * v]
    ];
  }
  function pairOmega(a, b, c, vc, step = 5) {
    const pa = pyramid(a), pb = pyramid(b);
    const samples = [];
    const lim = (c.r * 0.8) ** 2;
    for (let y = -c.r * 0.8; y <= c.r * 0.8; y += step)
      for (let x = -c.r * 0.8; x <= c.r * 0.8; x += step) {
        if (x * x + y * y > lim) continue;
        const fl = flowAt(pa, pb, c.cx + x, c.cy + y);
        if (fl) samples.push({ x, y, vx: fl.u - vc.x, vy: fl.v - vc.y });
      }
    const sol = solveOmega(samples, c.r);
    return sol && sol.inliers >= 20 ? sol : null;
  }
  var med = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  function analyzeClip(omegas, fps, view3, hand3, grip) {
    const notes = [];
    const n = omegas.length;
    const good = omegas.map((o, i) => o ? i : -1).filter((i) => i >= 0);
    if (good.length < 2) return { series: [], start: null, end: null, pap: null, axisTrack: [], flareTravelIn: null, flareMaxIn: null, notes: ["Too few frame pairs could be read."] };
    const filled = omegas.map((o, i) => o ?? omegas[good.reduce((b, j) => Math.abs(j - i) < Math.abs(b - i) ? j : b, good[0])]);
    const half = 2;
    const smooth = filled.map((_, i) => {
      const lo = Math.max(0, i - half), hi = Math.min(n - 1, i + half);
      const w = filled.slice(lo, hi + 1);
      return { x: med(w.map((o) => o.x)), y: med(w.map((o) => o.y)), z: med(w.map((o) => o.z)) };
    });
    const series = [];
    smooth.forEach((o, i) => {
      const s = spinFromOmega(o, fps, view3, hand3);
      if (!s) return;
      const lo = Math.max(0, i - half), hi = Math.min(n - 1, i + half);
      const mags = filled.slice(lo, hi + 1).map((q) => Math.hypot(q.x, q.y, q.z));
      const mean9 = mags.reduce((a, b) => a + b, 0) / mags.length;
      const spread = mags.length > 1 ? Math.sqrt(mags.reduce((a, m) => a + (m - mean9) ** 2, 0) / (mags.length - 1)) / (mean9 || 1) : 0.3;
      series.push({ t: (i + 0.5) / fps, rpm: s.rpm, rotation: s.axisRotation, tilt: s.axisTilt, quality: Math.max(0, Math.min(1, s.quality * (1 - spread * 4))) });
    });
    const take = (a) => a.length ? { t: med(a.map((p) => p.t)), rpm: med(a.map((p) => p.rpm)), rotation: med(a.map((p) => p.rotation)), tilt: med(a.map((p) => p.tilt)), quality: med(a.map((p) => p.quality)) } : null;
    const k2 = Math.max(3, Math.floor(series.length / 4));
    const start = take(series.slice(0, k2));
    const end = series.length >= 8 ? take(series.slice(-k2)) : null;
    if (start && end && end.rpm < start.rpm * 0.7) notes.push(`The rev rate fell ${Math.round((1 - end.rpm / start.rpm) * 100)}% over the clip, which is a lot. Check the ball stayed in frame and the footage is sharp.`);
    let pap = null;
    const axisTrack = [];
    let flareTravelIn = null;
    let flareMaxIn = null;
    if (grip) {
      const toSphere2 = (o) => [o.x, -o.y, -o.z];
      let Rk = I3;
      const g0 = grip.g;
      const raw = [];
      smooth.forEach((o, i) => {
        const os = toSphere2(o);
        const axisNow = unit3(os);
        let body = tvec(Rk, axisNow);
        if (dot3(body, g0) < 0) body = [-body[0], -body[1], -body[2]];
        raw.push({ t: (i + 0.5) / fps, v: [dot3(body, grip.ex), dot3(body, grip.up), dot3(body, grip.g)] });
        Rk = mul2(rotation({ x: os[0], y: os[1], z: os[2] }), Rk);
      });
      const early = raw.slice(0, Math.max(3, Math.min(8, raw.length)));
      const pv = unit3([med(early.map((p) => p.v[0])), med(early.map((p) => p.v[1])), med(early.map((p) => p.v[2]))]);
      const ou = overUpOf(pv, hand3);
      pap = { over: ou.over, up: ou.up, vec: pv };
      for (const p of raw) {
        const v = unit3(p.v);
        const o = overUpOf(v, hand3);
        axisTrack.push({ t: p.t, over: o.over, up: o.up, vec: v });
      }
      let travel = 0, far = 0;
      for (let i = 1; i < axisTrack.length; i++) travel += surfDist(axisTrack[i - 1].vec, axisTrack[i].vec);
      for (const p of axisTrack) far = Math.max(far, surfDist(p.vec, pv));
      flareTravelIn = travel;
      flareMaxIn = far;
      if (pap.vec[2] < 0.2) notes.push("The axis came out far from the grip's side of the ball. Check the grip holes were marked on the right spots in the first frame.");
    }
    return { series, start, end, pap, axisTrack, flareTravelIn, flareMaxIn, notes };
  }

  // core/src/clipspin.ts
  var BOARD_IN2 = 1.0625;
  var BALL_DIAMETER_IN = 8.5;
  var med2 = (v) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : NaN;
  function laneToPicture(cal) {
    const lane = [{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }];
    const Hinv2 = solveHomography(lane, cal);
    return (x, y) => applyHomography(Hinv2, { x, y });
  }
  function ballInPicture(P, x, y) {
    const half = BALL_DIAMETER_IN / 2 / BOARD_IN2;
    const a = P(x - half, y), b = P(x + half, y), c = P(x, y);
    const r = Math.hypot(b.x - a.x, b.y - a.y) / 2;
    return { cx: c.x, cy: c.y - r * 0.95, r };
  }
  function laneBasis(cal, vw, vh) {
    if (cal.length !== 4) return null;
    const lane = [{ x: 0, y: 0 }, { x: LANE_BOARDS * BOARD_IN2, y: 0 }, { x: LANE_BOARDS * BOARD_IN2, y: LANE_LENGTH_FT * 12 }, { x: 0, y: LANE_LENGTH_FT * 12 }];
    const H3 = solveHomography(lane, cal);
    const cx = vw / 2, cy = vh / 2;
    const col = (j) => [H3[j], H3[3 + j], H3[6 + j]];
    const h1 = col(0), h2 = col(1), h3 = col(2);
    const a = (h) => [h[0] - cx * h[2], h[1] - cy * h[2]];
    const a1 = a(h1), a2 = a(h2);
    const A1 = a1[0] * a2[0] + a1[1] * a2[1], B1 = h1[2] * h2[2];
    const A2 = a1[0] ** 2 + a1[1] ** 2 - a2[0] ** 2 - a2[1] ** 2, B2 = h1[2] ** 2 - h2[2] ** 2;
    const s1 = Math.hypot(A1, B1) || 1, s2 = Math.hypot(A2, B2) || 1;
    const uu = -(A1 / s1 * (B1 / s1) + A2 / s2 * (B2 / s2)) / ((A1 / s1) ** 2 + (A2 / s2) ** 2 || 1);
    if (!(uu > 0)) return null;
    const f = Math.sqrt(1 / uu);
    const u1 = -B1 / (A1 || 1e-12), u2 = -B2 / (A2 || 1e-12);
    const agree = u1 > 0 && u2 > 0 ? Math.max(0, 1 - Math.abs(Math.sqrt(1 / u1) - Math.sqrt(1 / u2)) / f) : 0.3;
    const g = (h) => [(h[0] - cx * h[2]) / f, (h[1] - cy * h[2]) / f, h[2]];
    let g1 = g(h1), g2 = g(h2);
    const g3 = g(h3);
    if (g3[2] < 0) g1 = g1.map((v) => -v), g2 = g2.map((v) => -v);
    const u = (v) => {
      const n = Math.hypot(v[0], v[1], v[2]) || 1;
      return [v[0] / n, v[1] / n, v[2] / n];
    };
    const across = u(g1), down = u(g2);
    let up = u([across[1] * down[2] - across[2] * down[1], across[2] * down[0] - across[0] * down[2], across[0] * down[1] - across[1] * down[0]]);
    if (up[1] > 0) up = [-up[0], -up[1], -up[2]];
    const pitch = Math.asin(Math.max(-1, Math.min(1, down[1]))) * 180 / Math.PI;
    if (agree < 0.5 || !(f / Math.max(vw, vh) > 0.4 && f / Math.max(vw, vh) < 3)) return null;
    return { across, down, up, focalPx: f, pitchDeg: pitch, agree };
  }
  function omegaInLane(om, b) {
    const d = (v) => om.x * v[0] + om.y * v[1] + om.z * v[2];
    return { x: d(b.across), y: -d(b.up), z: d(b.down) };
  }
  var at2 = (g, x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    if (x0 < 0 || y0 < 0 || x0 >= g.w - 1 || y0 >= g.h - 1) return NaN;
    const fx = x - x0, fy = y - y0, i = y0 * g.w + x0;
    return g.data[i] * (1 - fx) * (1 - fy) + g.data[i + 1] * fx * (1 - fy) + g.data[i + g.w] * (1 - fx) * fy + g.data[i + g.w + 1] * fx * fy;
  };
  function ringScore(g, cx, cy, r) {
    const n = 40, w = Math.max(2, r * 0.07);
    let sum = 0, pos = 0, cnt = 0;
    const ds = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, ux = Math.cos(t), uy = Math.sin(t);
      const d = at2(g, cx + ux * (r - w), cy + uy * (r - w)) - at2(g, cx + ux * (r + w), cy + uy * (r + w));
      if (!Number.isFinite(d)) continue;
      ds.push(d);
      sum += d;
      cnt++;
    }
    if (cnt < n * 0.7) return 0;
    const s = sum >= 0 ? 1 : -1;
    for (const d of ds) pos += Math.max(0, s * d);
    return pos / cnt;
  }
  function refineCircle(g, c0, reach = 0.6) {
    let best = { cx: c0.cx, cy: c0.cy, r: c0.r, s: ringScore(g, c0.cx, c0.cy, c0.r) };
    for (const [stepF, spanF, rFactors] of [[0.1, reach, [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.12, 1.25, 1.4]], [0.04, 0.12, [0.88, 0.94, 1, 1.06, 1.12]], [0.015, 0.04, [0.97, 1, 1.03]]]) {
      const base = { ...best };
      const step = Math.max(0.5, base.r * stepF), span = base.r * spanF;
      for (let dy = -span; dy <= span + 1e-6; dy += step)
        for (let dx = -span; dx <= span + 1e-6; dx += step)
          for (const rf of rFactors) {
            const r = base.r * rf;
            const s = ringScore(g, base.cx + dx, base.cy + dy, r);
            if (s > best.s) best = { cx: base.cx + dx, cy: base.cy + dy, r, s };
          }
    }
    return { circle: { cx: best.cx, cy: best.cy, r: best.r }, score: best.s };
  }
  function normalized(g, c, rs) {
    const out = new Float32Array(g.w * g.h);
    const k2 = c.r / rs;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const v = at2(g, c.cx + (x - g.w / 2) * k2, c.cy + (y - g.h / 2) * k2);
        out[y * g.w + x] = Number.isFinite(v) ? v : 0;
      }
    return { data: out, w: g.w, h: g.h };
  }
  function markStrength(g, c) {
    const lim = c.r * 0.75, win = Math.max(3, Math.round(c.r / 7));
    const vals = [];
    for (let y = -lim; y <= lim; y += 2)
      for (let x = -lim; x <= lim; x += 2) {
        if (x * x + y * y > lim * lim) continue;
        let s = 0, n = 0;
        for (let j = -win; j <= win; j += 2) for (let i = -win; i <= win; i += 2) {
          const v = at2(g, c.cx + x + i, c.cy + y + j);
          if (Number.isFinite(v)) s += v, n++;
        }
        const v0 = at2(g, c.cx + x, c.cy + y);
        if (n && Number.isFinite(v0)) vals.push(v0 - s / n);
      }
    if (vals.length < 20) return 0;
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.sqrt(vals.reduce((a, b) => a + (b - m) ** 2, 0) / vals.length);
  }
  function searchOmega(a, b, c, maxDeg = 75, seeds = []) {
    const pts = [];
    const lim = c.r * 0.86;
    const stepPx = Math.max(2, c.r / 11);
    for (let y = -lim; y <= lim; y += stepPx)
      for (let x = -lim; x <= lim; x += stepPx) {
        if (x * x + y * y > lim * lim) continue;
        const va = at2(a, c.cx + x, c.cy + y);
        if (!Number.isFinite(va)) continue;
        pts.push({ x, y, z: -Math.sqrt(Math.max(1e-6, c.r * c.r - x * x - y * y)), va });
      }
    if (pts.length < 40) return null;
    const evalOm = (om) => {
      const Rm = rotation(om);
      let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (const p of pts) {
        const x = Rm[0][0] * p.x + Rm[0][1] * p.y + Rm[0][2] * p.z;
        const y = Rm[1][0] * p.x + Rm[1][1] * p.y + Rm[1][2] * p.z;
        const z = Rm[2][0] * p.x + Rm[2][1] * p.y + Rm[2][2] * p.z;
        if (z > -c.r * 0.3 || x * x + y * y > lim * lim) continue;
        const vb2 = at2(b, c.cx + x, c.cy + y);
        if (!Number.isFinite(vb2)) continue;
        n++;
        sa += p.va;
        sb += vb2;
        saa += p.va * p.va;
        sbb += vb2 * vb2;
        sab += p.va * vb2;
      }
      if (n < pts.length * 0.35) return { s: -1, n };
      const ma = sa / n, mb = sb / n;
      const va = saa / n - ma * ma, vb = sbb / n - mb * mb;
      if (va < 4 || vb < 4) return { s: -1, n };
      return { s: (sab / n - ma * mb) / Math.sqrt(va * vb), n };
    };
    const dirs = [];
    const N2 = 90;
    for (let i = 0; i < N2; i++) {
      const z = 1 - 2 * (i + 0.5) / N2, rr = Math.sqrt(1 - z * z), ph = i * 2.399963;
      dirs.push({ x: rr * Math.cos(ph), y: rr * Math.sin(ph), z });
    }
    const cands = [];
    for (let deg2 = 3; deg2 <= maxDeg; deg2 += deg2 < 20 ? 3 : 5) {
      const ang2 = deg2 * Math.PI / 180;
      for (const d of dirs) {
        const om = { x: d.x * ang2, y: d.y * ang2, z: d.z * ang2 };
        const e = evalOm(om);
        cands.push({ om, s: e.s, n: e.n });
      }
    }
    for (const s of seeds) cands.push({ om: s, ...(() => {
      const e = evalOm(s);
      return { s: e.s, n: e.n };
    })() });
    cands.sort((p, q) => q.s - p.s);
    const picks = [];
    for (const cd of cands) {
      if (picks.length >= 4) break;
      if (picks.every((p) => Math.hypot(p.om.x - cd.om.x, p.om.y - cd.om.y, p.om.z - cd.om.z) > 0.12)) picks.push(cd);
    }
    const refined = picks.map((p) => {
      let best = { ...p };
      for (let stepD = 2.5; stepD >= 0.15; stepD /= 2) {
        const st2 = stepD * Math.PI / 180;
        for (let it = 0; it < 6; it++) {
          let moved = false;
          for (const [dx, dy, dz] of [[st2, 0, 0], [-st2, 0, 0], [0, st2, 0], [0, -st2, 0], [0, 0, st2], [0, 0, -st2]]) {
            const om = { x: best.om.x + dx, y: best.om.y + dy, z: best.om.z + dz };
            const e = evalOm(om);
            if (e.s > best.s + 1e-4) best = { om, s: e.s, n: e.n }, moved = true;
          }
          if (!moved) break;
        }
      }
      return best;
    });
    refined.sort((p, q) => q.s - p.s);
    const top = refined[0];
    if (!top || top.s < 0.3) return null;
    const second = refined.find((r) => r !== top && Math.hypot(r.om.x - top.om.x, r.om.y - top.om.y, r.om.z - top.om.z) > 0.2);
    return { omega: top.om, score: top.s, margin: top.s - (second ? Math.max(0, second.s) : 0), overlap: top.n / pts.length };
  }
  function readPair(a, b, c, maxDeg = 75) {
    const lk = pairOmega(a, b, c, { x: 0, y: 0 }, 6);
    const lkOk = lk && lk.rmse < 1.2;
    if (lkOk && Math.hypot(lk.omega.x, lk.omega.y, lk.omega.z) < 9 * Math.PI / 180) return { omega: lk.omega, score: 1 };
    const sr = searchOmega(a, b, c, maxDeg, lkOk ? [lk.omega] : []);
    if (!sr || sr.score < 0.75 || sr.margin < 0.08 || sr.overlap < 0.45) return null;
    return { omega: sr.omega, score: sr.score };
  }
  var MAX_DEG_PER_FRAME = 50;
  var GOOD_DEG_PER_FRAME = 25;
  var MIN_BALL_PX = 26;
  var FAST_RPM = 500;
  var fpsNeeded = (rpm = FAST_RPM) => Math.ceil(rpm / 60 * 360 / GOOD_DEG_PER_FRAME / 60) * 60;
  var none = (fps, reasons, advice, status2, extra = {}) => ({
    status: status2,
    rpm: null,
    axisRotation: null,
    axisTilt: null,
    confidence: 0,
    fps,
    texture: null,
    ballPx: 0,
    degPerFrame: null,
    t0: 0,
    t1: 0,
    pairsRead: 0,
    pairsTried: 0,
    consistency: null,
    cameraPitchDeg: null,
    reasons,
    advice,
    at: (/* @__PURE__ */ new Date()).toISOString(),
    ...extra
  });
  var angleOf = (m) => Math.acos(Math.max(-1, Math.min(1, (m[0][0] + m[1][1] + m[2][2] - 1) / 2)));
  var mulM = (a, b) => a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
  var transpose = (a) => a[0].map((_, j) => a.map((r) => r[j]));
  var SLOW_ADVICE = `Film the release in slow motion (iPhone: Camera, Slo-mo, 240 fps) from behind the bowler with the ball as large as you can get it, then use the Spin lab to measure it.`;
  async function analyzeClipSpin(frames, fps, rs, basis, hand3, pause = async () => {
  }, debug) {
    const pitch = basis ? basis.pitchDeg : null;
    if (frames.length < 5) return none(fps, [`The ball is in only ${frames.length} frame${frames.length === 1 ? "" : "s"} of the clip.`], null, "none", { cameraPitchDeg: pitch });
    let ballPx = med2(frames.map((f) => f.ballPx));
    const base = { fps, ballPx, t0: frames[0].t, t1: frames[frames.length - 1].t, cameraPitchDeg: pitch };
    const held = [];
    for (const f of frames) {
      const c0 = { cx: f.crop.w / 2, cy: f.crop.h / 2, r: rs };
      const { circle, score } = refineCircle(f.crop, c0);
      await pause();
      held.push({ t: f.t, g: f.crop, c: circle, score, px: f.ballPx * circle.r / rs });
    }
    const sc = med2(held.map((h) => h.score));
    const useable = held.filter((h) => h.score >= Math.max(3, sc * 0.5));
    debug?.(held.map((h) => ({ t: h.t, crop: h.g, circle: h.c, score: h.score, kept: useable.includes(h) })));
    if (useable.length < 5) return none(fps, ["The ball's outline couldn't be found in enough frames."], null, "none", base);
    ballPx = med2(useable.map((h) => h.px));
    base.ballPx = ballPx;
    const texture = med2(useable.map((h) => markStrength(h.g, h.c)));
    base.texture = texture;
    if (ballPx < MIN_BALL_PX)
      return none(fps, [`The ball is only about ${Math.round(ballPx)} pixels across in the clip; the surface can't be followed under about ${MIN_BALL_PX}.`], `Move closer or zoom in so the ball fills at least ${MIN_BALL_PX * 2} pixels at the start of the roll, or ${SLOW_ADVICE.charAt(0).toLowerCase() + SLOW_ADVICE.slice(1)}`, "too-coarse", base);
    const cenC = { cx: useable[0].g.w / 2, cy: useable[0].g.h / 2, r: rs };
    const aligned = useable.map((h) => ({ t: h.t, g: normalized(h.g, h.c, rs) }));
    const omegas = [];
    let tried = 0, read2 = 0, inl = 0;
    const period = 1 / fps;
    for (let i = 0; i + 1 < aligned.length; i++) {
      const dt = aligned[i + 1].t - aligned[i].t;
      if (dt < period * 0.5 || dt > period * 1.6) {
        omegas.push(null);
        continue;
      }
      tried++;
      const sol = readPair(aligned[i].g, aligned[i + 1].g, cenC);
      await pause();
      if (sol) {
        read2++;
        inl += sol.score * 100;
        omegas.push({ x: sol.omega.x * period / dt, y: sol.omega.y * period / dt, z: sol.omega.z * period / dt });
      } else omegas.push(null);
    }
    const firstMags = omegas.filter((o) => !!o).map((o) => Math.hypot(o.x, o.y, o.z));
    const firstDeg = med2(firstMags) * 180 / Math.PI;
    let stride = 1;
    if (firstMags.length >= 4 && firstDeg < 9 && aligned.length >= 8) {
      stride = Math.min(8, Math.max(2, Math.round(14 / Math.max(firstDeg, 1))), aligned.length - 3);
      const longer = [];
      let tr2 = 0, rd2 = 0;
      for (let i = 0; i + stride < aligned.length; i++) {
        const dt = aligned[i + stride].t - aligned[i].t;
        if (dt < period * stride * 0.7 || dt > period * stride * 1.3) {
          longer.push(null);
          continue;
        }
        tr2++;
        const sol = readPair(aligned[i].g, aligned[i + stride].g, cenC);
        await pause();
        if (sol) {
          rd2++;
          longer.push({ x: sol.omega.x * period / dt, y: sol.omega.y * period / dt, z: sol.omega.z * period / dt });
        } else longer.push(null);
      }
      if (rd2 >= 4) {
        omegas.length = 0;
        omegas.push(...longer);
        tried = tr2;
        read2 = rd2;
      } else stride = 1;
    }
    let agreeN = 0, agreeOf = 0;
    for (let i = 0; i + 2 < aligned.length && agreeOf < 8 && stride === 1; i++) {
      const a = omegas[i], b = omegas[i + 1];
      if (!a || !b) continue;
      const dt = aligned[i + 2].t - aligned[i].t;
      if (dt > period * 2.6) continue;
      const sol = readPair(aligned[i].g, aligned[i + 2].g, cenC, 140);
      await pause();
      if (!sol && angleOf(mulM(rotation(b), rotation(a))) > 0.7) continue;
      agreeOf++;
      if (!sol) continue;
      const comp = mulM(rotation(b), rotation(a));
      const dir = rotation(sol.omega);
      const resid = angleOf(mulM(transpose(dir), comp));
      const turn = angleOf(comp);
      if (resid <= Math.max(0.05, turn * 0.25)) agreeN++;
    }
    const got = omegas.filter((o) => !!o);
    const mags = got.map((o) => Math.hypot(o.x, o.y, o.z));
    const mx = med2(got.map((o, i) => o.x / (mags[i] || 1))), my = med2(got.map((o, i) => o.y / (mags[i] || 1))), mz = med2(got.map((o, i) => o.z / (mags[i] || 1)));
    const mn = Math.hypot(mx, my, mz) || 1;
    const steady = got.length ? got.filter((o, i) => (o.x * mx + o.y * my + o.z * mz) / (mags[i] * mn || 1) > Math.cos(35 * Math.PI / 180)).length / got.length : 0;
    const consistency = stride > 1 ? steady : agreeOf >= 2 ? agreeN / agreeOf : null;
    const out = { ...base, pairsRead: read2, pairsTried: tried, consistency, cameraPitchDeg: pitch, t0: aligned[0].t, t1: aligned[aligned.length - 1].t };
    if (read2 < 4 || tried === 0)
      return none(fps, [`Only ${read2} of ${tried} frame pairs had enough surface detail to follow. A plain ball with no logo, or a clip too soft to show one, can't be read this way.`], SLOW_ADVICE, "too-coarse", out);
    const magMed = med2(mags);
    const deg2 = magMed * 180 / Math.PI;
    const spread = mags.length > 2 ? Math.sqrt(mags.reduce((a, m) => a + (m - magMed) ** 2, 0) / mags.length) / (magMed || 1) : 1;
    const usedFrac = read2 / tried;
    const rpmNow = magMed * fps * 60 / (2 * Math.PI);
    const reasons = [];
    let advice = null;
    const implausible = rpmNow < 60 || rpmNow > 900;
    const unsteady = steady < 0.6;
    const coarse = deg2 > MAX_DEG_PER_FRAME || stride === 1 && consistency !== null && consistency < 0.5 || spread > 0.6 || usedFrac < 0.5 || implausible || unsteady;
    if (deg2 > MAX_DEG_PER_FRAME) reasons.push(`At ${fps.toFixed(0)} frames a second the surface turns about ${deg2.toFixed(0)}\xB0 between frames; the tracking only follows up to about ${MAX_DEG_PER_FRAME}\xB0, so the rev rate can't be trusted.`);
    if (stride === 1 && consistency !== null && consistency < 0.5) reasons.push(`Two single frame steps don't add up to the direct two-step turn (${Math.round(consistency * 100)}% agree), which is what a spin too fast for the frame rate looks like.`);
    if (usedFrac < 0.5) reasons.push(`Only ${read2} of ${tried} frame pairs could be read.`);
    if (implausible || unsteady || spread > 0.6) {
      const lo = 300 * 6 / fps, hi = 450 * 6 / fps;
      reasons.push(`The turn between frames could not be followed: ${implausible ? `it read as ${rpmNow.toFixed(0)} rpm, which no bowled ball does,` : "the spin axis it read jumps about from pair to pair,"} so what was followed is glare or shading rather than markings on the ball.`);
      if (hi > GOOD_DEG_PER_FRAME) reasons.push(`At ${fps.toFixed(0)} fps a ball spinning at 300 to 450 rpm turns ${lo.toFixed(0)}\xB0 to ${hi.toFixed(0)}\xB0 every frame, more than the ${GOOD_DEG_PER_FRAME}\xB0 or so that can be followed.`);
      if (texture < 3.5) reasons.push("The ball shows hardly any logo or markings in these frames.");
    }
    if (coarse) {
      advice = `${fps.toFixed(0)} fps is too coarse for this ball. To follow about ${FAST_RPM} rpm the camera needs at least ${fpsNeeded()} fps. ${SLOW_ADVICE}`;
      return none(fps, reasons, advice, "too-coarse", { ...out, degPerFrame: deg2, rpm: null });
    }
    const med3 = (k2) => med2(omegas.filter((o) => !!o).map((o) => o[k2]));
    const om = { x: med3("x"), y: med3("y"), z: med3("z") };
    const lane = basis ? omegaInLane(om, basis) : om;
    const s = spinFromOmega(lane, fps, "behind", hand3);
    if (!s) return none(fps, ["The rotation came out as zero."], SLOW_ADVICE, "too-coarse", out);
    const caveats = [...s.notes];
    if (!basis) caveats.push("The lane lock can't say how far the camera tilts down, so axis tilt assumes it looks level down the lane and is off by roughly that tilt.");
    else if (basis.agree < 0.6) caveats.push("The camera tilt taken from the lane lock is shaky, so axis tilt could be off by a few degrees.");
    if (ballPx < 40) caveats.push(`The ball is only about ${Math.round(ballPx)} pixels across, so axis rotation and tilt could be off by 10\xB0 or more.`);
    const sizeF = Math.min(1, ballPx / 60);
    const confidence = Math.max(0, Math.min(1, s.quality * usedFrac * (consistency ?? 0.6) * (1 - Math.min(0.8, spread)) * (0.5 + 0.5 * sizeF) * (deg2 < MAX_DEG_PER_FRAME * 0.7 ? 1 : 0.8) * Math.min(1, inl / Math.max(1, read2) / 120 + 0.4)));
    const status2 = confidence >= 0.55 ? "measured" : confidence >= 0.3 ? "rough" : "too-coarse";
    if (status2 === "too-coarse") return none(fps, [...reasons, `Confidence only ${Math.round(confidence * 100)}%.`], SLOW_ADVICE, "too-coarse", { ...out, degPerFrame: deg2 });
    void rpmNow;
    return { ...none(fps, [...reasons, ...caveats], null, status2, out), status: status2, rpm: s.rpm, axisRotation: s.axisRotation, axisTilt: s.axisTilt, confidence, degPerFrame: deg2 };
  }

  // camera/clipspin.ts
  var esc2 = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var RS = 56;
  var MAX_FRAMES = 26;
  var pathAt = (path2, t) => {
    if (path2.length < 2 || t < path2[0].t - 0.05 || t > path2[path2.length - 1].t + 0.05) return null;
    let i = 1;
    while (i < path2.length - 1 && path2[i].t < t) i++;
    const a = path2[i - 1], b = path2[i];
    const k2 = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
    return { x: a.x + (b.x - a.x) * k2, y: a.y + (b.y - a.y) * k2 };
  };
  var waitFor = (el, ev, ms = 2e4) => new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error(`The video didn't ${ev}.`)), ms);
    el.addEventListener(ev, () => (clearTimeout(to), res()), { once: true });
  });
  async function measureShotSpin(shot, clip, hand3, onProgress, debug) {
    const fail = (msg) => ({ status: "none", rpm: null, axisRotation: null, axisTilt: null, confidence: 0, fps: 0, texture: null, ballPx: 0, degPerFrame: null, t0: 0, t1: 0, pairsRead: 0, pairsTried: 0, consistency: null, cameraPitchDeg: null, reasons: [msg], advice: null, at: (/* @__PURE__ */ new Date()).toISOString() });
    if (shot.cal.length !== 4 || shot.path.length < 4) return fail("This shot has no lane lock or path saved, so the ball can't be found in its video.");
    const url = URL.createObjectURL(clip);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.02;pointer-events:none";
    document.body.appendChild(v);
    v.src = url;
    try {
      onProgress?.("Opening the video\u2026");
      await waitFor(v, "loadedmetadata");
      if (!v.requestVideoFrameCallback) return fail("This browser can't step through video frames, so the spin can't be measured here.");
      const sx = v.videoWidth / shot.vw, sy = v.videoHeight / shot.vh;
      const cal = shot.cal.map((p) => ({ x: p.x * sx, y: p.y * sy }));
      const P = laneToPicture(cal);
      const basis = laneBasis(cal, v.videoWidth, v.videoHeight);
      const ballAt = (clipT) => {
        const lp = pathAt(shot.path, clipT + shot.recStartT);
        return lp ? ballInPicture(P, lp.x, lp.y) : null;
      };
      const tFirst = shot.path[0].t - shot.recStartT, tLast = shot.path[shot.path.length - 1].t - shot.recStartT;
      let tEnd = tFirst;
      for (let t = tFirst; t <= tLast; t += 0.02) {
        const b = ballAt(t);
        if (!b || b.r * 2 < MIN_BALL_PX * 0.8) break;
        tEnd = t;
      }
      const frames = [];
      const times = [];
      const cnv = document.createElement("canvas");
      const ctx2 = cnv.getContext("2d", { willReadFrequently: true });
      ctx2.imageSmoothingQuality = "high";
      const startAt = Math.max(0, tFirst - 0.15);
      const capture = async () => {
        frames.length = 0;
        times.length = 0;
        v.currentTime = startAt;
        await waitFor(v, "seeked").catch(() => {
        });
        v.playbackRate = 0.5;
        await new Promise((resolve) => {
          let done2 = false;
          const finish2 = () => {
            if (done2) return;
            done2 = true;
            v.pause();
            resolve();
          };
          const guard = setTimeout(finish2, Math.max(8e3, (tEnd - startAt) / 0.5 * 1e3 + 8e3));
          const onFrame2 = (_n, meta) => {
            if (done2) return;
            const t = meta.mediaTime;
            if (t >= tFirst - 0.02 && t <= tEnd + 0.02 && frames.length < MAX_FRAMES) {
              const b = ballAt(t);
              if (b) {
                const Sx = b.r * 1.35;
                const scale2 = RS / b.r;
                const size = Math.round(2 * Sx * scale2);
                cnv.width = cnv.height = size;
                ctx2.drawImage(v, b.cx - Sx, b.cy - Sx, 2 * Sx, 2 * Sx, 0, 0, size, size);
                const px = ctx2.getImageData(0, 0, size, size).data;
                const g = new Float32Array(size * size);
                for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
                frames.push({ t: t + shot.recStartT, crop: { data: g, w: size, h: size }, ballPx: b.r * 2 });
                times.push(t);
                onProgress?.(`Reading the video\u2026 frame ${frames.length}`);
              }
            }
            if (t > tEnd + 0.02 || v.ended || frames.length >= MAX_FRAMES) {
              clearTimeout(guard);
              finish2();
            } else v.requestVideoFrameCallback(onFrame2);
          };
          v.requestVideoFrameCallback(onFrame2);
          v.play().catch(() => {
            clearTimeout(guard);
            finish2();
          });
        });
      };
      await capture();
      if (!frames.length) await capture();
      const dts = times.slice(1).map((t, i) => t - times[i]).filter((d) => d > 2e-3).sort((a, b) => a - b);
      const fps = dts.length ? 1 / dts[Math.floor(dts.length / 2)] : 0;
      if (!frames.length || !fps) return fail("No video frames could be read from this clip.");
      onProgress?.("Measuring the spin\u2026");
      return await analyzeClipSpin(frames, fps, RS, basis, hand3, () => new Promise((r) => setTimeout(r, 0)), debug);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "The video could not be read.");
    } finally {
      v.remove();
      v.removeAttribute("src");
      v.load();
      URL.revokeObjectURL(url);
    }
  }
  var STATUS_LABEL = { measured: "from the video", rough: "rough, from the video", "too-coarse": "not measurable from this clip", none: "not measured" };
  function spinCardHtml(s, state = "idle") {
    if (!s)
      return `<div class="card"><div class="k">Spin</div><div class="u">${state === "running" ? "Measuring the spin from this shot's video\u2026" : state === "pending" ? "The spin will be measured from this shot's video shortly." : "Not measured yet."}</div></div>`;
    if (s.status === "measured" || s.status === "rough") {
      const bad = s.status === "rough";
      return `<div class="card"><div class="k">Spin (${STATUS_LABEL[s.status]})</div>
      <div class="grid" style="margin-top:8px">
        <div class="card"><div class="k">Rev rate</div><div class="v">${Math.round(s.rpm)}</div><div class="u">RPM</div></div>
        <div class="card"><div class="k">Axis rotation</div><div class="v">${s.axisRotation.toFixed(0)}\xB0</div><div class="u">0\xB0 = forward roll</div></div>
        <div class="card"><div class="k">Axis tilt</div><div class="v">${s.axisTilt.toFixed(0)}\xB0</div><div class="u">above horizontal</div></div>
      </div>
      <span class="badge ${bad ? "tentative" : "moderate"}">${bad ? "rough" : "measured"} \xB7 confidence ${Math.round(s.confidence * 100)}%</span>
      <div class="note">Read from ${s.pairsRead} frame pairs at ${s.fps.toFixed(0)} fps, ${s.t0.toFixed(2)} to ${s.t1.toFixed(2)} s into the roll, with the ball about ${Math.round(s.ballPx)} pixels across (${s.degPerFrame?.toFixed(0) ?? "?"}\xB0 of turn per frame). Measured near the foul line, not the whole way down the lane.</div>
      ${s.reasons.length ? `<ul>${s.reasons.map((r) => `<li>${esc2(r)}</li>`).join("")}</ul>` : ""}</div>`;
    }
    return `<div class="card"><div class="k">Spin</div><div class="lr-head" style="font-size:17px">${s.status === "none" ? "Couldn't be measured" : "Needs a slow-motion pass to read the spin"}</div>
    <ul>${s.reasons.map((r) => `<li>${esc2(r)}</li>`).join("")}</ul>
    ${s.advice ? `<div class="note">${esc2(s.advice)}</div>` : ""}
    <div class="chips"><button class="btn" data-act="slowmo">Read the spin from a slow-motion clip</button></div></div>`;
  }

  // camera/spinqueue.ts
  var waiting = /* @__PURE__ */ new Map();
  var chain = Promise.resolve();
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function queueSpin(shot, opts = {}) {
    if (!opts.force && shot.spin) return Promise.resolve(shot.spin);
    const key2 = shot.id;
    const have = waiting.get(key2);
    if (have) return have;
    const job = new Promise((resolve) => {
      chain = chain.then(async () => {
        try {
          for (let i = 0; opts.busy?.() && i < 120; i++) await sleep(1e3);
          const blob = opts.blob ?? (shot.hasClip ? await loadClip(shot.id) : void 0);
          if (!blob) return resolve(void 0);
          const hand3 = S.profile?.hand ?? "R";
          const r = await measureShotSpin(shot, blob, hand3, opts.onProgress);
          shot.spin = r;
          await updateShot(shot);
          resolve(r);
        } catch {
          resolve(void 0);
        } finally {
          waiting.delete(key2);
        }
      });
    });
    waiting.set(key2, job);
    return job;
  }

  // camera/spinlab.ts
  function openSpinLab(onSaved) {
    const el = $("spinlab");
    el.classList.add("on");
    let view3 = "behind";
    let fps = 240;
    let frames = 60;
    let circle = null;
    let thumb = null, fingerA = null, fingerB = null;
    let noThumb = (S.profile?.quiz?.style ?? "one-hand-thumb") !== "one-hand-thumb";
    let mark = "ball";
    let tapStage = 0;
    let result2 = null;
    let running = false;
    el.innerHTML = `
    <div class="row"><h2>Spin lab</h2><button class="btn ghost" id="sl-close">Close</button></div>
    <div class="note">Measures your ball's spin through the whole release from a <b>slow-motion video</b>: rev rate, axis rotation and axis tilt <i>over time</i>, and (if you mark the grip) your <b>PAP</b> and how far the axis flares across the ball. Film the ball as large as you can, in good light, camera behind the bowler or to one side, steady (a tripod). 240 fps works best. Validated on simulated footage only, so check a few results against a measurement you trust.</div>
    <div class="card" id="sl-shots"></div>
    <div class="card">
      <div class="field"><label>1. Choose the video</label><input type="file" id="sl-file" accept="video/*"></div>
      <div class="two">
        <div class="field"><label>Camera position</label><select id="sl-view"><option value="behind">Behind the bowler</option><option value="side-right">Side, on the bowler's right</option><option value="side-left">Side, on the bowler's left</option></select></div>
        <div class="field"><label>Frames per second</label><input id="sl-fps" inputmode="numeric" value="240"></div>
      </div>
      <div class="field"><label>How much of the release to read</label><select id="sl-len"><option value="30">Quick (30 frames)</option><option value="60" selected>Standard (60 frames)</option><option value="120">Long (120 frames, slower)</option></select></div>
    </div>
    <div id="sl-work" class="hide">
      <div class="card">
        <div class="field"><label>2. Find a frame just after release, with the ball large and the grip toward the camera if you can</label><input type="range" id="sl-scrub" min="0" max="1" step="0.001" value="0" style="width:100%"></div>
        <div class="stagebox" style="position:relative"><video id="sl-v" playsinline muted style="width:100%;display:block"></video><canvas id="sl-ov" class="ov" style="position:absolute;inset:0;width:100%;height:100%"></canvas></div>
        <div class="chips" id="sl-modes"></div>
        <div class="note" id="sl-hint">3. Tap the center of the ball, then tap its edge.</div>
        <div class="chips"><button class="btn" id="sl-go">Analyze the release</button><button class="chip" id="sl-reset">Re-mark everything</button></div>
        <div class="note" id="sl-prog"></div>
      </div>
      <div id="sl-result"></div>
    </div>`;
    const withClip = S.shots.filter((s) => s.hasClip).slice(-30).reverse();
    const stat = (s) => !s.spin ? "not measured yet" : s.spin.status === "measured" || s.spin.status === "rough" ? `${Math.round(s.spin.rpm)} rpm (${s.spin.status})` : "too coarse";
    const paintShots = () => {
      const done2 = S.shots.filter((s) => s.spin && s.spin.status !== "too-coarse" && s.spin.status !== "none" && s.spin.rpm !== null);
      const medv = (k2) => {
        const a = done2.map((s) => s.spin[k2]).sort((x, y) => x - y);
        return a[Math.floor(a.length / 2)];
      };
      $("sl-shots").innerHTML = `<div class="k">From a shot you recorded</div>
      <div class="note">Every shot's video is read automatically. At 30 or 60 frames a second a ball turning 5 to 7 times a second turns 36\xB0 to 72\xB0 between frames and is only a few dozen pixels wide, so most ordinary clips come back as too coarse; slow-motion clips (120 or 240 fps, ball filling a good part of the frame) can be read.</div>
      ${withClip.length ? `<div class="field"><select id="sl-shotsel">${withClip.map((s) => `<option value="${s.id}">${esc(new Date(s.at).toLocaleString())} \xB7 ${esc(stat(s))}</option>`).join("")}</select></div>
      <div class="chips"><button class="btn" id="sl-shotgo">Measure this shot</button>${done2.length ? `<button class="chip" id="sl-usemed">Use the median of ${done2.length} measured shot${done2.length === 1 ? "" : "s"} (${Math.round(medv("rpm"))} rpm)</button>` : ""}</div>
      <div class="note" id="sl-shotprog"></div><div id="sl-shotres">${spinCardHtml(withClip[0].spin)}</div>` : `<div class="note">No recorded shots with video yet.</div>`}`;
      const sel2 = document.getElementById("sl-shotsel");
      if (!sel2) return;
      sel2.onchange = () => {
        $("sl-shotres").innerHTML = spinCardHtml(withClip.find((x) => x.id === sel2.value)?.spin);
      };
      $("sl-shotgo").onclick = async () => {
        const shot = withClip.find((x) => x.id === sel2.value);
        if (!shot) return;
        $("sl-shotres").innerHTML = spinCardHtml(void 0, "running");
        await queueSpin(shot, { force: true, onProgress: (m) => {
          $("sl-shotprog").textContent = m;
        } });
        paintShots();
        document.getElementById("sl-shotsel").value = shot.id;
        $("sl-shotres").innerHTML = spinCardHtml(shot.spin);
      };
      document.getElementById("sl-usemed")?.addEventListener("click", () => {
        updateProfile({ spin: { ...S.profile?.spin ?? {}, rpm: Math.round(medv("rpm")), axisRotation: Math.round(medv("axisRotation")), axisTilt: Math.round(medv("axisTilt")), source: "video", at: (/* @__PURE__ */ new Date()).toISOString() } });
        onSaved();
        $("sl-close").click();
      });
    };
    paintShots();
    const v = $("sl-v");
    const ov = $("sl-ov");
    const octx = ov.getContext("2d");
    const modeChips = () => {
      const list = [{ id: "ball", label: "Ball" }, ...noThumb ? [] : [{ id: "thumb", label: "Thumb hole" }], { id: "fingerA", label: "Finger hole 1" }, { id: "fingerB", label: "Finger hole 2" }];
      $("sl-modes").innerHTML = list.map((m) => `<button class="chip ${mark === m.id ? "sel" : ""}" data-m="${m.id}">${m.label}${m.id === "ball" ? circle && circle.r ? " \u2713" : "" : (m.id === "thumb" ? thumb : m.id === "fingerA" ? fingerA : fingerB) ? " \u2713" : ""}</button>`).join("") + `<label class="note" style="display:inline-flex;gap:6px;align-items:center;margin-left:6px"><input type="checkbox" id="sl-nothumb" ${noThumb ? "checked" : ""}> no thumb hole</label>`;
      el.querySelectorAll("[data-m]").forEach((b) => b.onclick = () => (mark = b.dataset.m, hint(), modeChips()));
      $("sl-nothumb").onchange = (e) => (noThumb = e.target.checked, thumb = noThumb ? null : thumb, mark = "ball", modeChips(), drawMark());
    };
    const hint = () => {
      $("sl-hint").textContent = mark === "ball" ? "Tap the center of the ball, then tap its edge." : `Tap the ${mark === "thumb" ? "thumb hole" : mark === "fingerA" ? "first finger hole" : "second finger hole"}. Marking the grip is optional, but it's what lets me find your PAP and the flare.`;
    };
    const drawMark = () => {
      octx.clearRect(0, 0, ov.width, ov.height);
      const s = Math.max(1, ov.width / 900);
      if (circle) {
        octx.strokeStyle = "#46e6ff";
        octx.lineWidth = 3 * s;
        octx.beginPath();
        octx.arc(circle.cx, circle.cy, Math.max(circle.r, 3), 0, 7);
        octx.stroke();
      }
      const dot5 = (p, col) => {
        if (!p) return;
        octx.fillStyle = col;
        octx.strokeStyle = "#000";
        octx.lineWidth = 2 * s;
        octx.beginPath();
        octx.arc(p.x, p.y, 7 * s, 0, 7);
        octx.fill();
        octx.stroke();
      };
      dot5(thumb, "#ffffff");
      dot5(fingerA, "#ff4fd8");
      dot5(fingerB, "#ff4fd8");
    };
    const seek = (t) => new Promise((res) => {
      let settled = false;
      const finish2 = (mt) => {
        if (!settled) settled = true, res(mt);
      };
      const onSeeked = () => {
        v.removeEventListener("seeked", onSeeked);
        const rv = v;
        if (rv.requestVideoFrameCallback) {
          rv.requestVideoFrameCallback((_n, m) => finish2(m.mediaTime));
          setTimeout(() => finish2(v.currentTime), 300);
        } else finish2(v.currentTime);
      };
      v.addEventListener("seeked", onSeeked);
      v.currentTime = Math.max(0, Math.min(v.duration || 0, t));
    });
    $("sl-view").onchange = (e) => view3 = e.target.value;
    $("sl-fps").onchange = (e) => fps = Math.max(30, Number(e.target.value) || 240);
    $("sl-len").onchange = (e) => frames = Number(e.target.value);
    $("sl-close").onclick = () => {
      running = false;
      if (v.src) URL.revokeObjectURL(v.src);
      el.classList.remove("on");
      el.innerHTML = "";
    };
    $("sl-file").onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      v.src = URL.createObjectURL(f);
      v.onloadedmetadata = () => {
        ov.width = v.videoWidth;
        ov.height = v.videoHeight;
        $("sl-scrub").max = String(v.duration);
        $("sl-scrub").step = String(1 / fps);
        $("sl-work").classList.remove("hide");
        circle = null;
        thumb = fingerA = fingerB = null;
        tapStage = 0;
        mark = "ball";
        modeChips();
        hint();
        drawMark();
      };
    };
    $("sl-scrub").oninput = (e) => seek(Number(e.target.value)).then(drawMark);
    $("sl-reset").onclick = () => (circle = null, thumb = fingerA = fingerB = null, tapStage = 0, mark = "ball", modeChips(), hint(), drawMark());
    ov.addEventListener("pointerdown", (e) => {
      const r = ov.getBoundingClientRect();
      const p = { x: (e.clientX - r.left) / r.width * ov.width, y: (e.clientY - r.top) / r.height * ov.height };
      if (mark === "ball") {
        if (tapStage === 0 || tapStage === 2) {
          circle = { cx: p.x, cy: p.y, r: 0 };
          tapStage = 1;
          $("sl-hint").textContent = "Now tap the edge of the ball.";
        } else {
          circle.r = Math.hypot(p.x - circle.cx, p.y - circle.cy);
          tapStage = 2;
          $("sl-hint").textContent = `Ball marked (${Math.round(circle.r * 2)} px across). ${circle.r < 40 ? "That's small: results will be rough unless the ball is bigger in frame." : "Good size."} Now mark the grip holes (optional, for the PAP), or tap Analyze.`;
          mark = noThumb ? "fingerA" : "thumb";
        }
      } else if (mark === "thumb") thumb = p, mark = "fingerA";
      else if (mark === "fingerA") fingerA = p, mark = "fingerB";
      else fingerB = p, mark = "ball";
      modeChips();
      if (tapStage === 2 && mark !== "ball") hint();
      drawMark();
    });
    const crop = (cx, cy, S3, scale2, size, cnv, cctx) => {
      cctx.clearRect(0, 0, size, size);
      cctx.drawImage(v, cx - S3, cy - S3, 2 * S3, 2 * S3, 0, 0, size, size);
      const px = cctx.getImageData(0, 0, size, size).data;
      const g = new Float32Array(size * size);
      for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      void cnv;
      void scale2;
      return { data: g, w: size, h: size };
    };
    $("sl-go").onclick = async () => {
      const out = $("sl-result");
      if (running) return;
      if (!circle || circle.r < 15) return void (out.innerHTML = `<div class="card"><div class="u">Mark the ball first: tap its center, then its edge.</div></div>`);
      running = true;
      out.innerHTML = "";
      const rs = 80;
      const scale2 = rs / circle.r;
      const S3 = circle.r * 1.35;
      const size = Math.round(2 * S3 * scale2);
      const cnv = document.createElement("canvas");
      cnv.width = cnv.height = size;
      const cctx = cnv.getContext("2d", { willReadFrequently: true });
      let cx = circle.cx, cy = circle.cy;
      let mtA = await seek(v.currentTime);
      const omegas = [];
      let still = 0;
      let irregular = 0;
      const prog = $("sl-prog");
      for (let k2 = 0; k2 < frames && running; k2++) {
        prog.textContent = `Reading frame pair ${k2 + 1} of ${frames}\u2026`;
        await new Promise((r) => setTimeout(r, 0));
        const a = crop(cx, cy, S3, scale2, size, cnv, cctx);
        let mtB = await seek(mtA + 1 / fps);
        if ((mtB - mtA) * fps < 0.4) mtB = await seek(mtA + 2 / fps);
        const steps = Math.max(0.5, (mtB - mtA) * fps);
        if (Math.abs(steps - 1) > 0.3) irregular++;
        const b = crop(cx, cy, S3, scale2, size, cnv, cctx);
        const c0 = { cx: size / 2, cy: size / 2, r: rs };
        const c1 = trackCircle(a, b, c0, Math.round(Math.min(24, rs * 0.4)));
        const vc = { x: c1.cx - c0.cx, y: c1.cy - c0.cy };
        let d = 0, n = 0;
        for (let y = -rs * 0.5; y <= rs * 0.5; y += 4) for (let x = -rs * 0.5; x <= rs * 0.5; x += 4) d += Math.abs(a.data[Math.round(size / 2 + y) * size + Math.round(size / 2 + x)] - b.data[Math.round(size / 2 + y) * size + Math.round(size / 2 + x)]), n++;
        if (d / n < 0.4) still++;
        const sol = pairOmega(a, b, c0, vc, 5);
        omegas.push(sol ? { x: sol.omega.x / steps, y: sol.omega.y / steps, z: sol.omega.z / steps } : null);
        mtA = mtB;
        cx += vc.x / scale2;
        cy += vc.y / scale2;
        if (cx < 0 || cy < 0 || cx > v.videoWidth || cy > v.videoHeight) break;
      }
      running = false;
      prog.textContent = "";
      const hand3 = S_hand();
      let pose = null;
      if (fingerA && fingerB && (noThumb || thumb)) pose = scanFrame({ circle: { x: circle.cx, y: circle.cy, r: circle.r }, thumb: noThumb ? null : thumb, fingerA, fingerB });
      const an = analyzeClip(omegas, fps, view3, hand3, pose);
      if (irregular > omegas.length * 0.3) an.notes.push(`The video's frames don't step evenly at ${fps} fps (${irregular} of ${omegas.length} pairs were off). Check the frames-per-second setting, or export the clip as a true high-frame-rate file.`);
      result2 = { ...an, pairs: omegas.filter(Boolean).length, still };
      show(pose);
    };
    const S_hand = () => S.profile?.hand ?? "R";
    const chart = (cnv, lines, unit4) => {
      const g = cnv.getContext("2d");
      const w = cnv.width, h = cnv.height;
      g.clearRect(0, 0, w, h);
      const all = lines.flatMap((l) => l.pts);
      if (!all.length) return;
      const t1 = Math.max(...all.map((p) => p.t)) || 1;
      let lo = Math.min(...all.map((p) => p.v)), hi = Math.max(...all.map((p) => p.v));
      if (hi - lo < 1) lo -= 1, hi += 1;
      const pad = 28;
      const X = (t) => pad + t / t1 * (w - pad - 8);
      const Y = (val2) => h - 18 - (val2 - lo) / (hi - lo) * (h - 30);
      g.strokeStyle = "rgba(255,255,255,.15)";
      g.lineWidth = 1;
      g.fillStyle = "rgba(255,255,255,.55)";
      g.font = "11px system-ui";
      for (let i = 0; i <= 3; i++) {
        const val2 = lo + (hi - lo) * i / 3;
        g.beginPath();
        g.moveTo(pad, Y(val2));
        g.lineTo(w - 8, Y(val2));
        g.stroke();
        g.fillText(Math.round(val2) + unit4, 0, Y(val2) + 4);
      }
      g.fillText(t1.toFixed(2) + " s", w - 44, h - 3);
      for (const l of lines) {
        g.strokeStyle = l.color;
        g.lineWidth = 2.5;
        g.beginPath();
        l.pts.forEach((p, i) => i ? g.lineTo(X(p.t), Y(p.v)) : g.moveTo(X(p.t), Y(p.v)));
        g.stroke();
      }
    };
    const show = (pose) => {
      const out = $("sl-result");
      const r = result2;
      if (!r.series.length || !r.start) {
        out.innerHTML = `<div class="card"><div class="lr-head">Couldn't measure the spin</div><ul><li>The ball surface didn't have enough visible markings to track. A logo, finger holes or a two-tone ball work best, and a plain glossy ball often can't be measured this way.</li>${r.still >= 4 ? `<li>Consecutive frames look identical: the video may not be a true ${fps} fps recording.</li>` : ""}${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>`;
        return;
      }
      const q = r.start.quality;
      const label2 = q >= 0.7 ? "good" : q >= 0.4 ? "rough" : "unreliable";
      const e = r.end;
      const flare2 = r.pap && r.flareMaxIn !== null;
      out.innerHTML = `<div class="card"><div class="k">Through the release</div>
      <div class="grid" style="margin-top:8px">
        <div class="card"><div class="k">Rev rate</div><div class="v">${Math.round(r.start.rpm)}</div><div class="u">RPM${e ? `, ${Math.round(e.rpm)} at the end` : ""}</div></div>
        <div class="card"><div class="k">Axis rotation</div><div class="v">${r.start.rotation.toFixed(0)}\xB0</div><div class="u">${e ? `${e.rotation.toFixed(0)}\xB0 at the end` : "0\xB0 = forward roll"}</div></div>
        <div class="card"><div class="k">Axis tilt</div><div class="v">${r.start.tilt.toFixed(0)}\xB0</div><div class="u">${e ? `${e.tilt.toFixed(0)}\xB0 at the end` : "above horizontal"}</div></div>
      </div>
      <span class="badge ${q >= 0.7 ? "good" : q >= 0.4 ? "moderate" : "tentative"}">${label2} \xB7 quality ${Math.round(q * 100)}%</span>
      <div class="note">The numbers are the spin right after release, with the change over the clip beside them.</div>
      <div class="k" style="margin-top:10px">Rev rate over the clip</div><canvas id="sl-c1" width="640" height="170" style="width:100%;height:auto"></canvas>
      <div class="k" style="margin-top:6px">Axis rotation <span style="color:#46e6ff">\u2501</span> and tilt <span style="color:#ffd25a">\u2501</span></div><canvas id="sl-c2" width="640" height="170" style="width:100%;height:auto"></canvas>
      <ul>${[...r.notes, `Read ${r.pairs} frame pairs.`, r.still >= 4 ? `Many consecutive frames look identical: the video may not be a true ${fps} fps recording.` : ""].filter(Boolean).map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      <div class="chips"><button class="btn" id="sl-save" ${q < 0.3 ? "disabled" : ""}>Use rev rate, rotation and tilt</button></div>
      ${q < 0.3 ? `<div class="note">Not reliable enough to save. Try a closer, brighter, higher-frame-rate clip.</div>` : ""}</div>
    ${flare2 ? `<div class="card"><div class="k">Your PAP and flare, from the video</div>
      <div class="lr-head" style="font-size:22px">PAP \u2248 ${esc(fractionInches(Math.abs(r.pap.over)).replace(/"/g, ""))}${r.pap.over < 0 ? " (other side)" : ""} over, ${esc(fractionInches(Math.abs(r.pap.up)).replace(/"/g, ""))} ${r.pap.up < 0 ? "down" : "up"}</div>
      <div class="u">The axis travelled <b>${r.flareTravelIn.toFixed(1)}"</b> across the ball during the clip, reaching <b>${r.flareMaxIn.toFixed(1)}"</b> from where it started. That's the flare: the oil rings are circles around this path.</div>
      <canvas id="sl-c3" width="420" height="420" style="width:100%;max-width:360px;display:block;margin:6px auto"></canvas>
      <div class="note">The ball as you hold it, grip toward you, fingers up. White: thumb. Pink: finger holes. The line is where the spin axis sits on the ball, from release (cyan) to the end (magenta).</div>
      <div class="chips"><button class="btn" id="sl-savepap">Use this PAP</button></div><div class="note" id="sl-papmsg"></div></div>` : pose === null ? `<div class="card"><div class="u">Mark the grip holes in the first frame (finger holes, and thumb hole if there is one) and analyze again to get your PAP and the flare.</div></div>` : ""}`;
      chart($("sl-c1"), [{ pts: r.series.map((p) => ({ t: p.t, v: p.rpm })), color: "#5affb0", label: "rpm" }], "");
      chart($("sl-c2"), [{ pts: r.series.map((p) => ({ t: p.t, v: p.rotation })), color: "#46e6ff", label: "rotation" }, { pts: r.series.map((p) => ({ t: p.t, v: p.tilt })), color: "#ffd25a", label: "tilt" }], "\xB0");
      if (flare2) drawBall2($("sl-c3"), r, pose);
      $("sl-save")?.addEventListener("click", () => {
        updateProfile({ spin: { ...S.profile?.spin ?? {}, rpm: Math.round(r.start.rpm), axisRotation: Math.round(r.start.rotation), axisTilt: Math.round(r.start.tilt), source: "video", at: (/* @__PURE__ */ new Date()).toISOString() } });
        onSaved();
        $("sl-close").click();
      });
      $("sl-savepap")?.addEventListener("click", () => {
        const f = (x) => fractionInches(Math.abs(x)).replace(/"/g, "");
        const text = `${r.pap.over < 0 ? "-" : ""}${f(r.pap.over)} over, ${f(r.pap.up)} ${r.pap.up < 0 ? "down" : "up"}`;
        updateProfile({ spin: { ...S.profile?.spin ?? { source: "video", at: (/* @__PURE__ */ new Date()).toISOString() }, pap: text, papFrom: "video" } });
        $("sl-papmsg").textContent = `Saved: ${text}. The Layout Lab and Pro shop will use it.`;
        onSaved();
      });
    };
    const drawBall2 = (cnv, r, pose) => {
      const g = cnv.getContext("2d");
      const w = cnv.width, c = w / 2, R2 = w * 0.46;
      g.clearRect(0, 0, w, w);
      const grad = g.createRadialGradient(c - R2 * 0.3, c - R2 * 0.3, R2 * 0.1, c, c, R2);
      grad.addColorStop(0, "#2c3e66");
      grad.addColorStop(1, "#0c1424");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(c, c, R2, 0, 7);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,.25)";
      g.lineWidth = 1.5;
      for (const f of [0.33, 0.66]) {
        g.beginPath();
        g.arc(c, c, R2 * f, 0, 7);
        g.stroke();
      }
      const map = (p) => {
        const s = toSphere(p, { x: circle.cx, y: circle.cy, r: circle.r });
        return [s[0] * pose.ex[0] + s[1] * pose.ex[1] + s[2] * pose.ex[2], s[0] * pose.up[0] + s[1] * pose.up[1] + s[2] * pose.up[2]];
      };
      const hole = (p, col) => {
        if (!p) return;
        const [x, y] = map(p);
        g.fillStyle = col;
        g.beginPath();
        g.arc(c + x * R2, c - y * R2, 9, 0, 7);
        g.fill();
      };
      hole(thumb, "#ffffff");
      hole(fingerA, "#ff4fd8");
      hole(fingerB, "#ff4fd8");
      const hs = S_hand() === "R" ? 1 : -1;
      void hs;
      const pt2 = (v2) => [c + v2[0] * R2, c - v2[1] * R2];
      g.lineWidth = 3;
      r.axisTrack.forEach((p, i) => {
        if (!i) return;
        const a = pt2(r.axisTrack[i - 1].vec), b = pt2(p.vec);
        const t = i / Math.max(1, r.axisTrack.length - 1);
        g.strokeStyle = `hsl(${190 + 130 * t}, 100%, 62%)`;
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.stroke();
      });
      const [px, py] = pt2(r.pap.vec);
      g.fillStyle = "#5affb0";
      g.strokeStyle = "#000";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(px, py, 8, 0, 7);
      g.fill();
      g.stroke();
      g.fillStyle = "#fff";
      g.font = "700 12px system-ui";
      g.fillText("PAP", px + 11, py - 9);
    };
  }

  // camera/view3d.ts
  var LANE_W = 41.5;
  var GUTTER = 9.25;
  var FT = 12;
  var DECK_END = 63 * FT;
  var PIN_H = 15;
  var PIN_R = 2.4;
  var BALL_R = 4.25;
  var ROW = 10.39;
  var PIN_SP = 12;
  var toX = (xBoards) => (xBoards / LANE_BOARDS - 0.5) * LANE_W;
  var toIn = (p) => [toX(p.x), p.y * FT, BALL_R];
  var sub2 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  var dot4 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  var cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  var norm4 = (a) => {
    const l = Math.hypot(...a) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  var PRESETS = {
    Behind: { yaw: 0, pitch: 16, dist: 330, target: [0, 18 * FT, 0] },
    Top: { yaw: 90, pitch: 89, dist: 440, target: [0, 31 * FT, 0] },
    Side: { yaw: 90, pitch: 28, dist: 430, target: [0, 31 * FT, 0] },
    Pins: { yaw: 180, pitch: 16, dist: 330, target: [0, 46 * FT, 0] }
  };
  function mount3D(host2) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:none;background:radial-gradient(circle at 50% 30%,#1b2233,#05080f)";
    const bar = document.createElement("div");
    bar.style.cssText = "position:absolute;left:8px;right:8px;bottom:8px;display:flex;gap:6px;flex-wrap:wrap;justify-content:center";
    const hint = document.createElement("div");
    hint.style.cssText = "position:absolute;top:8px;left:10px;font:600 11px system-ui;color:rgba(255,255,255,.55);pointer-events:none";
    hint.textContent = "Drag to orbit \xB7 pinch to zoom \xB7 two fingers to pan";
    host2.append(canvas, bar, hint);
    const ctx2 = canvas.getContext("2d");
    let paths = [];
    let yaw = PRESETS.Behind.yaw;
    let pitch = PRESETS.Behind.pitch;
    let dist2 = PRESETS.Behind.dist;
    let target = [...PRESETS.Behind.target];
    let raf3 = 0;
    const markDirty = () => {
      if (!raf3) raf3 = requestAnimationFrame(draw3);
    };
    for (const name of Object.keys(PRESETS)) {
      const b = document.createElement("button");
      b.textContent = name;
      b.style.cssText = "appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(10,14,22,.7);color:#fff;border-radius:99px;padding:6px 12px;font:600 12px system-ui;cursor:pointer";
      b.onclick = () => setPreset(name);
      bar.append(b);
    }
    function setPreset(name) {
      const p = PRESETS[name];
      if (!p) return;
      yaw = p.yaw;
      pitch = p.pitch;
      dist2 = p.dist;
      target = [...p.target];
      markDirty();
    }
    function basis(w, h) {
      const th = yaw * Math.PI / 180;
      const ph = Math.min(89.5, Math.max(4, pitch)) * Math.PI / 180;
      const C2 = [target[0] + dist2 * Math.sin(th) * Math.cos(ph), target[1] - dist2 * Math.cos(th) * Math.cos(ph), target[2] + dist2 * Math.sin(ph)];
      const F = norm4(sub2(target, C2));
      const R2 = norm4(cross3(F, [0, 0, 1]));
      const U = cross3(R2, F);
      const f = h / 2 / Math.tan(50 * Math.PI / 360);
      return { C: C2, F, R: R2, U, f, w, h };
    }
    const NEAR = 4;
    const proj = (cam, P) => {
      const v = sub2(P, cam.C);
      const z = dot4(v, cam.F);
      if (z < NEAR) return null;
      return [cam.w / 2 + cam.f * dot4(v, cam.R) / z, cam.h / 2 - cam.f * dot4(v, cam.U) / z, z];
    };
    function seg(cam, a, b) {
      const za = dot4(sub2(a, cam.C), cam.F);
      const zb = dot4(sub2(b, cam.C), cam.F);
      if (za < NEAR && zb < NEAR) return null;
      let A = a;
      let B = b;
      if (za < NEAR) {
        const t = (NEAR - za) / (zb - za);
        A = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      } else if (zb < NEAR) {
        const t = (NEAR - zb) / (za - zb);
        B = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, b[2] + (a[2] - b[2]) * t];
      }
      const pa = proj(cam, A);
      const pb = proj(cam, B);
      return pa && pb ? [[pa[0], pa[1]], [pb[0], pb[1]]] : null;
    }
    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(2, Math.round(r.width * dpr));
      const h = Math.max(2, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
    function draw3() {
      raf3 = 0;
      resize();
      const w = canvas.width;
      const h = canvas.height;
      const s = w / 720;
      const cam = basis(w, h);
      ctx2.clearRect(0, 0, w, h);
      ctx2.lineJoin = "round";
      ctx2.lineCap = "round";
      const poly2 = (pts, fill, stroke, lw = 1) => {
        const q = pts.map((p) => proj(cam, p));
        if (q.some((x) => !x)) return;
        ctx2.beginPath();
        q.forEach((p, i) => i ? ctx2.lineTo(p[0], p[1]) : ctx2.moveTo(p[0], p[1]));
        ctx2.closePath();
        ctx2.fillStyle = fill;
        ctx2.fill();
        if (stroke) {
          ctx2.strokeStyle = stroke;
          ctx2.lineWidth = lw * s;
          ctx2.stroke();
        }
      };
      const line2 = (a, b, color, lw = 1) => {
        const sg = seg(cam, a, b);
        if (!sg) return;
        ctx2.strokeStyle = color;
        ctx2.lineWidth = lw * s;
        ctx2.beginPath();
        ctx2.moveTo(sg[0][0], sg[0][1]);
        ctx2.lineTo(sg[1][0], sg[1][1]);
        ctx2.stroke();
      };
      const hw = LANE_W / 2;
      poly2([[-hw - GUTTER - 14, -15 * FT, -0.2], [hw + GUTTER + 14, -15 * FT, -0.2], [hw + GUTTER + 14, 0, -0.2], [-hw - GUTTER - 14, 0, -0.2]], "rgba(140,105,70,.55)");
      poly2([[-hw - GUTTER, 0, -0.2], [-hw, 0, -0.2], [-hw, DECK_END, -0.2], [-hw - GUTTER, DECK_END, -0.2]], "rgba(8,10,16,.95)");
      poly2([[hw, 0, -0.2], [hw + GUTTER, 0, -0.2], [hw + GUTTER, DECK_END, -0.2], [hw, DECK_END, -0.2]], "rgba(8,10,16,.95)");
      poly2([[-hw, 0, 0], [hw, 0, 0], [hw, DECK_END, 0], [-hw, DECK_END, 0]], "rgba(214,170,110,.78)");
      poly2([[-hw - GUTTER, DECK_END, -0.2], [hw + GUTTER, DECK_END, -0.2], [hw + GUTTER, DECK_END + 40, -0.2], [-hw - GUTTER, DECK_END + 40, -0.2]], "rgba(5,6,10,.97)");
      for (let i = 0; i <= LANE_BOARDS; i++) {
        const x = toX(i);
        const major = (LANE_BOARDS - i) % 5 === 0;
        line2([x, 0, 0.05], [x, 60 * FT, 0.05], i === 0 || i === LANE_BOARDS ? "rgba(120,200,255,.9)" : major ? "rgba(255,255,255,.4)" : "rgba(255,255,255,.14)", i === 0 || i === LANE_BOARDS ? 2 : major ? 1.2 : 0.7);
      }
      line2([-hw, 0, 0.1], [hw, 0, 0.1], "rgba(255,90,110,1)", 3);
      for (const ft of [15, 30, 45, 60]) line2([-hw, ft * FT, 0.1], [hw, ft * FT, 0.1], ft === 60 ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.2)", 1);
      for (let b = 5; b <= 35; b += 5) {
        const x = toX(LANE_BOARDS + 0.5 - b);
        const tip = (12 + 4 * (1 - Math.abs(b - 20) / 15)) * FT;
        poly2([[x - 1.1, tip - 20, 0.15], [x + 1.1, tip - 20, 0.15], [x, tip, 0.15]], "rgba(255,210,90,.95)");
      }
      const pins = [];
      for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) pins.push([(i - r / 2) * PIN_SP, 60 * FT + r * ROW, 0]);
      pins.map((p) => ({ p, z: proj(cam, p)?.[2] ?? 0 })).sort((a, b) => b.z - a.z).forEach(({ p }) => {
        const base = proj(cam, p);
        const top = proj(cam, [p[0], p[1], PIN_H]);
        if (!base || !top) return;
        const rr = Math.max(1.5, cam.f * PIN_R / base[2]);
        ctx2.strokeStyle = "rgba(255,255,255,.92)";
        ctx2.lineWidth = rr * 2;
        ctx2.beginPath();
        ctx2.moveTo(base[0], base[1]);
        ctx2.lineTo(top[0], top[1]);
        ctx2.stroke();
        ctx2.fillStyle = "rgba(255,90,110,.9)";
        ctx2.fillRect(top[0] - rr, top[1] + rr * 0.9, rr * 2, Math.max(1, rr * 0.4));
      });
      for (const sp of paths) {
        const pts = sp.path.map(toIn);
        for (let i = 1; i < pts.length; i++) {
          const t = i / (pts.length - 1);
          ctx2.globalAlpha = sp.alpha ?? 1;
          line2(pts[i - 1], pts[i], sp.color.startsWith("ramp") ? `hsl(${190 + 130 * t},100%,62%)` : sp.color, sp.width ?? 3);
        }
        ctx2.globalAlpha = 1;
        const at3 = sp.ballAt;
        const idx = at3 === void 0 || at3 === null ? -1 : Math.max(0, sp.path.findIndex((p) => p.t >= at3));
        const b = idx >= 0 ? pts[Math.min(idx, pts.length - 1)] : sp.ballAt === void 0 ? null : pts[pts.length - 1];
        if (b) {
          const c = proj(cam, b);
          if (c) {
            const r = Math.max(3, cam.f * BALL_R / c[2]);
            const g = ctx2.createRadialGradient(c[0] - r * 0.3, c[1] - r * 0.3, r * 0.1, c[0], c[1], r);
            g.addColorStop(0, "#fff");
            g.addColorStop(0.4, "#7ae6ff");
            g.addColorStop(1, "#2a7bd6");
            ctx2.fillStyle = g;
            ctx2.beginPath();
            ctx2.arc(c[0], c[1], r, 0, 7);
            ctx2.fill();
          }
        }
      }
      ctx2.font = `600 ${11 * s}px system-ui`;
      ctx2.fillStyle = "rgba(255,255,255,.6)";
      ctx2.textAlign = "right";
      for (const ft of [0, 15, 30, 45, 60]) {
        const p = proj(cam, [-hw - 3, ft * FT, 0]);
        if (p) ctx2.fillText(`${ft} ft`, p[0], p[1] - 3 * s);
      }
    }
    const pointers = /* @__PURE__ */ new Map();
    let lastPinch = 0;
    let lastMid = { x: 0, y: 0 };
    const mid2 = () => {
      const v = [...pointers.values()];
      return { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
    };
    const spread = () => {
      const v = [...pointers.values()];
      return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y);
    };
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        lastPinch = spread();
        lastMid = mid2();
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size === 1) {
        yaw -= dx * 0.4;
        pitch = Math.min(89.5, Math.max(4, pitch + dy * 0.4));
      } else if (pointers.size === 2) {
        const sp = spread();
        if (lastPinch > 0) dist2 = Math.min(1800, Math.max(60, dist2 * (lastPinch / sp)));
        lastPinch = sp;
        const m = mid2();
        const k2 = dist2 / 700;
        const th = yaw * Math.PI / 180;
        const right = [Math.cos(th), Math.sin(th), 0];
        const fwd = [-Math.sin(th), Math.cos(th), 0];
        target = [target[0] - (m.x - lastMid.x) * k2 * right[0] + (m.y - lastMid.y) * k2 * fwd[0], target[1] - (m.x - lastMid.x) * k2 * right[1] + (m.y - lastMid.y) * k2 * fwd[1], 0];
        lastMid = m;
      }
      markDirty();
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      lastPinch = 0;
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        dist2 = Math.min(1800, Math.max(60, dist2 * (1 + e.deltaY * 1e-3)));
        markDirty();
      },
      { passive: false }
    );
    const ro = new ResizeObserver(markDirty);
    ro.observe(canvas);
    markDirty();
    return {
      setPaths(p) {
        paths = p;
        markDirty();
      },
      setPreset,
      redraw: markDirty,
      destroy() {
        ro.disconnect();
        cancelAnimationFrame(raf3);
        canvas.remove();
        bar.remove();
        hint.remove();
      }
    };
  }

  // core/src/approach.ts
  var POST_S = 1;
  var ON_TIME_S = 0.1;
  var L = { lSh: 11, rSh: 12, lWr: 15, rWr: 16, lHip: 23, rHip: 24, lAnk: 27, rAnk: 28, lHeel: 29, rHeel: 30, lToe: 31, rToe: 32 };
  var VIS = 0.4;
  var median2 = (v) => {
    if (!v.length) return NaN;
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  var mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  function rows(frames, o) {
    const px = (l) => ({ x: l.x * o.vw, y: l.y * o.vh });
    const seen2 = (f, i) => !!f.lm[i] && f.lm[i].v >= VIS;
    const footOf = (f, heel, toe, ank) => {
      if (seen2(f, heel) && seen2(f, toe)) return mid(px(f.lm[heel]), px(f.lm[toe]));
      if (seen2(f, heel)) return px(f.lm[heel]);
      if (seen2(f, ank)) return px(f.lm[ank]);
      return null;
    };
    const wi = o.hand === "R" ? L.rWr : L.lWr;
    return frames.map((f) => {
      const ok = f.lm.length >= 33 && seen2(f, L.lHip) && seen2(f, L.rHip) && seen2(f, L.lSh) && seen2(f, L.rSh);
      if (!ok) return { t: f.t, ok, hip: { x: 0, y: 0 }, sh: { x: 0, y: 0 }, lSh: { x: 0, y: 0 }, rSh: { x: 0, y: 0 }, scale: 0, foot: [null, null], wrist: null, wristV: 0 };
      const hip = mid(px(f.lm[L.lHip]), px(f.lm[L.rHip]));
      const lSh = px(f.lm[L.lSh]);
      const rSh = px(f.lm[L.rSh]);
      const sh = mid(lSh, rSh);
      return { t: f.t, ok, hip, sh, lSh, rSh, scale: Math.max(1, dist(hip, sh)), foot: [footOf(f, L.lHeel, L.lToe, L.lAnk), footOf(f, L.rHeel, L.rToe, L.rAnk)], wrist: f.lm[wi] ? px(f.lm[wi]) : null, wristV: f.lm[wi]?.v ?? 0 };
    });
  }
  function smoothTrack(p, w = 2) {
    return p.map((q, i) => {
      if (!q) return null;
      const xs = [];
      const ys = [];
      for (let k2 = Math.max(0, i - w); k2 <= Math.min(p.length - 1, i + w); k2++)
        if (p[k2]) {
          xs.push(p[k2].x);
          ys.push(p[k2].y);
        }
      return { x: median2(xs), y: median2(ys) };
    });
  }
  function smoothNums(v, w = 2) {
    return v.map((x, i) => {
      if (!Number.isFinite(x)) return x;
      const win = v.slice(Math.max(0, i - w), i + w + 1).filter((y) => Number.isFinite(y));
      return median2(win);
    });
  }
  function footTracks(r) {
    const A = [];
    const B = [];
    const labA = [];
    let a = null;
    let b = null;
    for (const x of r) {
      const [f0, f12] = x.ok ? x.foot : [null, null];
      if (f0 && f12) {
        if (a && b && dist(a, f12) + dist(b, f0) < dist(a, f0) + dist(b, f12)) {
          [a, b] = [f12, f0];
          labA.push(1);
        } else {
          [a, b] = [f0, f12];
          labA.push(0);
        }
        A.push(a);
        B.push(b);
      } else if (f0 || f12) {
        const f = f0 ?? f12;
        const lab2 = f0 ? 0 : 1;
        if (a && (!b || dist(a, f) <= dist(b, f))) {
          a = f;
          A.push(a);
          B.push(null);
          labA.push(lab2);
        } else {
          b = f;
          A.push(null);
          B.push(b);
          labA.push(lab2 === 0 ? 1 : 0);
        }
      } else {
        A.push(null);
        B.push(null);
        labA.push(null);
      }
    }
    return { A: smoothTrack(A, 3), B: smoothTrack(B, 3), labA };
  }
  function speeds(r, tr, scale2) {
    return r.map((x, i) => {
      let j = i;
      let k2 = i;
      while (j > 0 && x.t - r[j].t < 0.045) j--;
      while (k2 < r.length - 1 && r[k2].t - x.t < 0.045) k2++;
      if (j === k2 || !tr[j] || !tr[k2] || !(scale2[i] > 0)) return NaN;
      const dt = r[k2].t - r[j].t;
      return dt > 0 ? dist(tr[k2], tr[j]) / dt / scale2[i] : NaN;
    });
  }
  function plants(r, sp, from, to, still, moving) {
    const out = [];
    let mov = false;
    for (let i = 0; i < r.length; i++) {
      if (r[i].t < from || r[i].t > to || !Number.isFinite(sp[i])) continue;
      if (sp[i] > moving) mov = true;
      else if (sp[i] < still && mov) {
        out.push(r[i].t);
        mov = false;
      }
    }
    return out;
  }
  var pct = (v, q) => {
    const s = v.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;
  };
  function readApproach(frames, oIn) {
    const notes = [];
    let o = oIn;
    const empty = { version: 1, steps: null, tempoS: null, timing: null, startBoard: null, slideBoard: null, driftBoards: null, laydownBoards: null, heldS: null, posted: null, shoulderTiltDeg: null, quality: 0, notes };
    const r = rows(frames.slice().sort((a, b) => a.t - b.t), o);
    if (r.filter((x) => x.ok && x.t <= o.releaseT + 0.2).length < 8) {
      notes.push("The bowler wasn't found clearly enough in the clip before the release.");
      return empty;
    }
    const hipT = smoothTrack(r.map((x) => x.ok ? x.hip : null));
    const shT = smoothTrack(r.map((x) => x.ok ? x.sh : null));
    const scale2 = smoothNums(r.map((x) => x.ok ? x.scale : NaN), 3);
    const { A: tA, B: tB, labA } = footTracks(r);
    const spA = smoothNums(speeds(r, tA, scale2), 1);
    const spB = smoothNums(speeds(r, tB, scale2), 1);
    const spHip = smoothNums(speeds(r, hipT, scale2), 2);
    const hOf = (i) => r[i].wrist && hipT[i] && shT[i] ? (hipT[i].y - r[i].wrist.y) / Math.max(1, hipT[i].y - shT[i].y) : NaN;
    const near = r.map((x, i) => i).filter((i) => r[i].ok && r[i].wristV >= 0.3 && r[i].t >= o.releaseT - 0.6 && r[i].t <= o.releaseT + 0.1 && Number.isFinite(hOf(i)));
    if (near.length >= 3) {
      const bottom = near.reduce((a, b) => hOf(b) < hOf(a) ? b : a);
      if (hOf(bottom) < 0.1) o = { ...o, releaseT: r[bottom].t };
    }
    const before = r.map((x, i) => i).filter((i) => r[i].t < o.releaseT - 0.6);
    const hipNoise = pct(before.map((i) => spHip[i]), 0.25);
    const footNoise = pct(before.flatMap((i) => [spA[i], spB[i]]), 0.25);
    const HIP_STILL = Math.max(0.35, (Number.isFinite(hipNoise) ? hipNoise : 0.1) * 3);
    const STILL = Math.min(1.6, Math.max(0.45, (Number.isFinite(footNoise) ? footNoise : 0.15) * 3));
    const MOVING = Math.max(1.6, STILL * 2);
    let tStart = null;
    let run = 0;
    for (let i = r.length - 1; i > 0; i--) {
      if (r[i].t > o.releaseT - 0.4) continue;
      const still = Number.isFinite(spHip[i]) && spHip[i] < HIP_STILL;
      run = still ? run + (r[i].t - r[i - 1].t) : 0;
      if (run >= 0.3) {
        let j = i;
        while (j < r.length - 1 && Number.isFinite(spHip[j + 1]) && spHip[j + 1] < HIP_STILL && r[j + 1].t <= o.releaseT - 0.4) j++;
        tStart = r[j].t;
        break;
      }
    }
    if (tStart === null) {
      tStart = r.find((x) => x.ok).t;
      notes.push("The stance wasn't in the clip, so the approach is measured from the first frame.");
    }
    const inApproach = r.filter((x) => x.t >= tStart && x.t <= o.releaseT + 0.2);
    const quality = inApproach.length ? inApproach.filter((x, k2) => x.ok && x.foot[0] && x.foot[1] && k2 >= 0).length / inApproach.length : 0;
    const slideLab = o.hand === "R" ? 0 : 1;
    const votes = r.map((x, i) => i).filter((i) => r[i].t >= o.releaseT - 0.6 && r[i].t <= o.releaseT + 0.3 && labA[i] !== null);
    const useA = votes.filter((i) => labA[i] === slideLab).length >= votes.length / 2;
    const slideT = useA ? tA : tB;
    const spSlide = useA ? spA : spB;
    const slidePlants = plants(r, spSlide, tStart, o.releaseT + 0.5, STILL, MOVING);
    const slideEnd = slidePlants.length ? slidePlants[slidePlants.length - 1] : null;
    let slideStart = null;
    if (slideEnd !== null) {
      const win = r.map((x, i) => ({ t: x.t, s: spSlide[i] })).filter((x) => x.t >= tStart && x.t <= slideEnd && Number.isFinite(x.s));
      const peak = Math.max(0, ...win.map((x) => x.s));
      for (let i = win.length - 1; i >= 0; i--)
        if (win[i].s >= peak * 0.5) {
          slideStart = win[i].t;
          break;
        }
    }
    const endT = slideEnd ?? o.releaseT + 0.3;
    const allPlants = [...plants(r, spA, tStart, endT + 0.05, STILL, MOVING), ...plants(r, spB, tStart, endT + 0.05, STILL, MOVING)].sort((a, b) => a - b);
    const steps = allPlants.length >= 3 && allPlants.length <= 7 ? allPlants.length : null;
    if (steps === null) notes.push("The steps couldn't be counted reliably from this clip.");
    const tempoS = o.releaseT - tStart > 0.6 && o.releaseT - tStart < 6 ? o.releaseT - tStart : null;
    let timing = null;
    let topT = null;
    if (slideStart !== null) {
      const sw = r.map((x, i) => ({ x, i })).filter(({ x, i }) => x.ok && x.wrist && x.wristV >= 0.15 && hipT[i] && shT[i] && x.t >= o.releaseT - 1 && x.t <= o.releaseT - 0.08);
      if (sw.length >= 5) {
        const h = ({ x, i }) => (hipT[i].y - x.wrist.y) / Math.max(1, hipT[i].y - shT[i].y);
        const top = sw.reduce((a, b) => h(b) > h(a) ? b : a);
        topT = top.x.t;
        const offsetS = top.x.t - slideStart;
        timing = { offsetS, label: Math.abs(offsetS) <= ON_TIME_S ? "on time" : offsetS > 0 ? "late" : "early" };
      } else notes.push("The bowling arm was hidden behind the body, so timing wasn't read.");
    }
    const boardAt = (from, to) => {
      const v = [];
      r.forEach((x, i) => {
        if (x.t < from || x.t > to || !slideT[i]) return;
        const p = o.toLane(slideT[i]);
        if (p && p.y < 2 && p.y > -22 && p.x > -6 && p.x < 45) v.push(boardFromRight(p.x));
      });
      return v.length ? median2(v) : null;
    };
    const startBoard = boardAt(tStart - 0.4, tStart);
    const slideBoard = slideEnd !== null ? boardAt(slideEnd, slideEnd + 0.3) : null;
    const driftBoards = startBoard !== null && slideBoard !== null ? slideBoard - startBoard : null;
    const laydownBoards = slideBoard !== null && o.releaseBoard !== null && o.releaseBoard !== void 0 ? o.hand === "R" ? slideBoard - o.releaseBoard : o.releaseBoard - slideBoard : null;
    if (startBoard === null || slideBoard === null) notes.push("The feet couldn't be placed on boards (the lane lock doesn't reach the approach clearly).");
    let heldS = null;
    if (slideEnd !== null) {
      const after = r.map((x, i) => ({ t: x.t, i })).filter(({ t, i }) => t >= slideEnd && hipT[i]);
      const settle = after.find(({ t, i }) => t <= slideEnd + 1 && after.filter((y) => y.t >= t && y.t <= t + 0.15).every((y) => Number.isFinite(spHip[y.i]) && spHip[y.i] < HIP_STILL * 1.5));
      if (settle) {
        const ref = hipT[settle.i];
        const footRef = slideT[settle.i];
        let last = settle.t;
        for (const { t, i } of after) {
          if (t < settle.t) continue;
          const sc = Math.max(1, scale2[i]);
          if (dist(hipT[i], ref) / sc > 0.45 || footRef && slideT[i] && dist(slideT[i], footRef) / sc > 0.6) break;
          last = t;
        }
        heldS = last - slideEnd;
        const clipEnd = after[after.length - 1].t;
        if (clipEnd - slideEnd < POST_S && heldS >= clipEnd - slideEnd - 0.06) notes.push("The clip ends before a full second at the line, so the hold is a minimum.");
      }
    }
    const atRel = r.filter((x) => x.ok).reduce((a, b) => !a || Math.abs(b.t - o.releaseT) < Math.abs(a.t - o.releaseT) ? b : a, null);
    let shoulderTiltDeg = null;
    if (atRel && Math.abs(atRel.t - o.releaseT) < 0.15) {
      const deg2 = Math.atan2(atRel.rSh.y - atRel.lSh.y, atRel.rSh.x - atRel.lSh.x) * 180 / Math.PI;
      shoulderTiltDeg = o.hand === "R" ? deg2 : -deg2;
    }
    return { version: 1, steps, tempoS, timing, startBoard, slideBoard, driftBoards, laydownBoards, heldS, posted: heldS === null ? null : heldS >= POST_S, shoulderTiltDeg, quality, notes, marks: { start: tStart, slideStart, slideEnd, top: topT, release: o.releaseT } };
  }
  function describeBody(b, hand3) {
    const out = [];
    const side = (d) => d > 0 ? "left (toward board 39)" : "right (toward board 1)";
    if (b.steps !== null) out.push(`${b.steps}-step approach${b.tempoS !== null ? `, ${b.tempoS.toFixed(1)} s from first step to release` : ""}.`);
    if (b.timing) out.push(b.timing.label === "on time" ? "Timing on time: the ball was at the top of the swing as the slide began." : b.timing.label === "early" ? `Early timing: the ball reached the top ${Math.abs(b.timing.offsetS).toFixed(2)} s before the slide began (the ball is ahead of your feet).` : `Late timing: the ball reached the top ${b.timing.offsetS.toFixed(2)} s after the slide began (your feet are ahead of the ball).`);
    if (b.startBoard !== null && b.slideBoard !== null && b.driftBoards !== null) out.push(`Slide foot started on board ${b.startBoard.toFixed(0)} and finished on ${b.slideBoard.toFixed(0)}: ${Math.abs(b.driftBoards) < 1 ? "walked straight" : `drifted ${Math.abs(b.driftBoards).toFixed(1)} boards ${side(b.driftBoards)}`}.`);
    if (b.laydownBoards !== null) out.push(`Ball laid down ${Math.abs(b.laydownBoards).toFixed(0)} boards ${b.laydownBoards >= 0 ? `${hand3 === "R" ? "right" : "left"} of` : `${hand3 === "R" ? "left" : "right"} of (inside)`} your slide foot.`);
    if (b.heldS !== null) out.push(b.posted ? `Posted the shot: balanced at the line for ${b.heldS.toFixed(1)} s.` : `Came out of the finish after ${b.heldS.toFixed(1)} s. Hold it at least ${POST_S.toFixed(0)} s.`);
    return out;
  }

  // core/src/execution.ts
  var MARK_TOL = 1;
  var BREAK_TOL = 2;
  function gradeShot(s, plan) {
    if (!plan) return null;
    const markOff = s.m.arrowsBoard === null ? null : s.m.arrowsBoard - plan.arrows;
    const breakOff = plan.breakpoint === void 0 || s.m.breakpointBoard === null ? null : s.m.breakpointBoard - plan.breakpoint;
    return { hitMark: markOff === null ? null : Math.abs(markOff) <= MARK_TOL, markOff, hitBreak: breakOff === null ? null : Math.abs(breakOff) <= BREAK_TOL, breakOff };
  }
  var MIN_GRADED = 6;
  var mean3 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var pct2 = (r) => r.rate === null ? "n/a" : `${Math.round(r.rate * 100)}% (${r.made} of ${r.attempts})`;
  function executionReport(shots) {
    const rows2 = shots.map((s) => ({ s, g: gradeShot(s, s.plan) })).filter((r) => !!r.g && r.g.hitMark !== null);
    const hit = rows2.filter((r) => r.g.hitMark);
    const missed = rows2.filter((r) => !r.g.hitMark);
    const seen2 = (list) => list.filter((r) => r.s.m.pocketMiss !== null);
    const inPocket = (list) => rate(seen2(list).filter((r) => Math.abs(r.s.m.pocketMiss) <= 1).length, seen2(list).length);
    const withRes = (list) => list.filter((r) => r.s.result);
    const strikes = (list) => rate(withRes(list).filter((r) => isStrike(r.s)).length, withRes(list).length);
    const bp = rows2.filter((r) => r.g.hitBreak !== null);
    const hitSeen = seen2(hit);
    const lineBias = hitSeen.length >= 4 ? mean3(hitSeen.map((r) => r.s.m.pocketMiss)) : null;
    const report = {
      verdict: "insufficient",
      graded: rows2.length,
      mark: rate(hit.length, rows2.length),
      breakpoint: bp.length ? rate(bp.filter((r) => r.g.hitBreak).length, bp.length) : null,
      pocketWhenHit: inPocket(hit),
      pocketWhenMissed: inPocket(missed),
      strikeWhenHit: strikes(hit),
      strikeWhenMissed: strikes(missed),
      lineBias,
      headline: "",
      points: [],
      next: ""
    };
    if (rows2.length < MIN_GRADED) {
      report.headline = `Set a target and bowl ${MIN_GRADED - rows2.length} more shot${MIN_GRADED - rows2.length === 1 ? "" : "s"}`;
      report.points.push("Tap Target on the Live screen, say where you stand and which board you aim at the arrows, and every shot is graded against it.");
      report.next = "Pick your normal line and set it as the target before you bowl.";
      return report;
    }
    const markRate = report.mark.rate ?? 0;
    report.points.push(`You hit your mark (within ${MARK_TOL} board at the arrows) on ${pct2(report.mark)} of planned shots.`);
    if (report.breakpoint) report.points.push(`The ball broke within ${BREAK_TOL} boards of where you wanted on ${pct2(report.breakpoint)}.`);
    if (report.pocketWhenHit.attempts && report.pocketWhenMissed.attempts) report.points.push(`In the pocket: ${pct2(report.pocketWhenHit)} when you hit your mark, ${pct2(report.pocketWhenMissed)} when you missed it.`);
    if (report.strikeWhenHit.attempts >= 4 && report.strikeWhenMissed.attempts >= 4) report.points.push(`Strikes: ${pct2(report.strikeWhenHit)} on the mark, ${pct2(report.strikeWhenMissed)} off it.`);
    const offs = missed.map((r) => r.g.markOff).filter((x) => Number.isFinite(x));
    if (offs.length >= 3) {
      const left = offs.filter((x) => x > 0).length / offs.length;
      if (left >= 0.7 || left <= 0.3) report.points.push(`When you miss the mark it's mostly ${left >= 0.7 ? "left of it (toward board 39)" : "right of it (toward board 1)"}: a pattern, not random. Check your shoulders are square to your target and your swing goes straight at it.`);
    }
    const biasWord = (b) => b > 0 ? "high" : "light";
    if (markRate < 0.6) {
      report.verdict = "execution";
      report.headline = "Execution first: you're missing your mark";
      report.next = "Don't move yet. Throw at the same target until you hit it 7 of 10 times; until then a move just chases misses. The Arrow Sniper drill trains exactly this.";
    } else if (lineBias !== null && Math.abs(lineBias) > 1.2) {
      report.verdict = "line";
      report.headline = `Your aim is good; your line is ${biasWord(lineBias)}`;
      report.points.push(`On the shots that hit your mark, the ball still met the pins ${Math.abs(lineBias).toFixed(1)} boards ${biasWord(lineBias)} on average. That's the line, not you.`);
      report.next = "Make a move (see Move Advisor) and keep throwing the same shot.";
    } else if (report.pocketWhenHit.rate !== null && report.pocketWhenHit.rate >= 0.5) {
      report.verdict = "good";
      report.headline = "On your mark, it works";
      report.next = "Keep this line. Your job is repeating it: the misses come from shots off the mark.";
    } else {
      report.verdict = "mixed";
      report.headline = "Hitting the mark, but the pocket comes and goes";
      report.next = "The line looks right on average, so the spread comes from something else: speed or release. Miss Finder ranks which.";
    }
    return report;
  }

  // camera/pose.ts
  var VER = "0.10.14";
  var CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
  var MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
  var AUTO_KEY = "laneiq.bodyAuto";
  var bodyAutoOn = () => {
    try {
      return localStorage.getItem(AUTO_KEY) === "1";
    } catch {
      return false;
    }
  };
  var setBodyAuto = (v) => {
    try {
      localStorage.setItem(AUTO_KEY, v ? "1" : "0");
    } catch {
    }
  };
  var landmarker = null;
  function getLandmarker() {
    if (!landmarker)
      landmarker = (async () => {
        const url = `${CDN}/vision_bundle.mjs`;
        const mod = await import(
          /* @vite-ignore */
          url
        );
        const files = await mod.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
        const make = (delegate) => mod.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "VIDEO", numPoses: 3, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5 });
        try {
          return await make("GPU");
        } catch {
          return await make("CPU");
        }
      })().catch((e) => {
        landmarker = null;
        throw e;
      });
    return landmarker;
  }
  var clock = 0;
  var lastFrames = [];
  var sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
  var seekTo = (v, t) => new Promise((res) => {
    let done2 = false;
    const f = () => {
      if (done2) return;
      done2 = true;
      v.removeEventListener("seeked", f);
      res();
    };
    v.addEventListener("seeked", f);
    v.currentTime = t;
    setTimeout(f, 800);
  });
  function pickBowler(people, s) {
    if (!people.length) return [];
    const fl = s.cal.length === 4 ? [s.cal[0].x / s.vw, s.cal[1].x / s.vw] : [0, 1];
    const lo = Math.min(...fl) - 0.25;
    const hi = Math.max(...fl) + 0.25;
    const scored = people.map((p) => {
      const hipX = (p[23].x + p[24].x) / 2;
      const size = Math.hypot((p[11].x + p[12].x) / 2 - hipX, (p[11].y + p[12].y) / 2 - (p[23].y + p[24].y) / 2);
      return { p, ok: hipX >= lo && hipX <= hi, size };
    }).sort((a, b) => Number(b.ok) - Number(a.ok) || b.size - a.size);
    return scored[0].p.map((l) => ({ x: l.x, y: l.y, v: l.visibility ?? 1 }));
  }
  async function measureBody(s, blob, onProgress) {
    onProgress?.("Loading the pose model (first time only, a few MB)\u2026");
    const lm = await getLandmarker();
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    const url = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: "video/mp4" }));
    v.src = url;
    try {
      await new Promise((res, rej) => {
        v.onloadedmetadata = () => res();
        v.onerror = () => rej(new Error("the clip would not open"));
        setTimeout(() => rej(new Error("the clip took too long to open")), 8e3);
      });
      const firstFt = Math.max(0, s.path[0]?.y ?? s.a.release?.ft ?? 0);
      const ftPerS = Math.max(8, (s.a.speedMph || 17) * (5280 / 3600));
      const releaseT = -s.recStartT - Math.min(0.5, firstFt / ftPerS);
      const dur = Number.isFinite(v.duration) ? v.duration : releaseT + 3;
      const t0 = Math.max(0, releaseT - 5);
      const t1 = Math.min(dur - 0.05, releaseT + 2);
      const frames = [];
      for (let t = t0; t <= t1; t += t >= releaseT - 2.5 ? 1 / 30 : 1 / 10) {
        await seekTo(v, t);
        const res = lm.detectForVideo(v, clock += 50);
        frames.push({ t, lm: pickBowler(res.landmarks ?? [], s) });
        if (frames.length % 10 === 0) {
          onProgress?.(`Reading the approach\u2026 ${Math.round((t - t0) / Math.max(0.1, t1 - t0) * 100)}%`);
          await sleep2(0);
        }
      }
      let toLane = () => null;
      if (s.cal.length === 4) {
        const H3 = solveHomography(s.cal, [{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }]);
        toLane = (p) => {
          const q = applyHomography(H3, p);
          return Number.isFinite(q.x) && Number.isFinite(q.y) ? q : null;
        };
      }
      lastFrames = frames;
      const body = readApproach(frames, { vw: s.vw, vh: s.vh, toLane, hand: S.profile?.hand ?? "R", releaseT, releaseBoard: s.a.release?.board ?? null });
      logTrack("body read", { frames: frames.length, found: frames.filter((f) => f.lm.length).length, steps: body.steps, timing: body.timing?.label ?? null, drift: body.driftBoards, quality: +body.quality.toFixed(2) });
      return body;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  var waiting2 = /* @__PURE__ */ new Map();
  var chain2 = Promise.resolve();
  function queueBody(shot, opts = {}) {
    if (opts.auto && !bodyAutoOn()) return Promise.resolve(void 0);
    if (!opts.force && shot.body) return Promise.resolve(shot.body);
    const have = waiting2.get(shot.id);
    if (have) return have;
    const job = new Promise((resolve) => {
      chain2 = chain2.then(async () => {
        try {
          for (let i = 0; opts.busy?.() && i < 120; i++) await sleep2(1e3);
          const blob = opts.blob ?? (shot.hasClip ? await loadClip(shot.id) : void 0);
          if (!blob) return resolve(void 0);
          const b = await measureBody(shot, blob, opts.onProgress);
          shot.body = b;
          await updateShot(shot);
          resolve(b);
        } catch (e) {
          logTrack("body read failed", { error: String(e) });
          opts.onProgress?.(`Couldn't read the approach: ${e instanceof Error ? e.message : String(e)}`);
          resolve(void 0);
        } finally {
          waiting2.delete(shot.id);
        }
      });
    });
    waiting2.set(shot.id, job);
    return job;
  }
  var bodyPending = (id) => waiting2.has(id);

  // camera/sharefiles.ts
  function offerShare(box, files, opts = {}) {
    box.innerHTML = "";
    const row = document.createElement("div");
    row.className = "chips";
    const nav = navigator;
    const note = document.createElement("div");
    note.className = "note";
    const data = { files, title: opts.title, text: opts.text };
    if (nav.share && (!nav.canShare || nav.canShare({ files }))) {
      const b = document.createElement("button");
      b.className = "btn";
      b.textContent = opts.label ?? "Share";
      b.onclick = () => {
        nav.share(data).then(() => note.textContent = "Shared.").catch((e) => {
          if (e.name !== "AbortError") note.textContent = `Couldn't open the share sheet (${e.message}). Use Save instead.`;
        });
      };
      row.append(b);
    }
    const save = document.createElement("button");
    save.className = "btn ghost";
    save.textContent = files.length > 1 ? "Save the files" : "Save";
    save.onclick = () => {
      const all = opts.text ? [...files, new File([opts.text], "laneiq-notes.txt", { type: "text/plain" })] : files;
      for (const f of all) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 8e3);
      }
      note.textContent = "Saved.";
    };
    row.append(save);
    box.append(row, note);
  }

  // camera/compare.ts
  var raf2 = 0;
  var sides = [];
  var tool = "line";
  var rate2 = 0.5;
  var lead = 2.5;
  var when = (iso) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  var ballName = (id) => S.arsenal.find((b) => b.id === id)?.name ?? "Unknown ball";
  function bestShotFor(s) {
    const pool = S.shots.filter((x) => x.id !== s.id && x.hasClip && (!s.ballId || x.ballId === s.ballId));
    const scored = pool.filter((x) => x.m.pocketMiss !== null).sort((a, b) => Number(b.result?.pinsDown === 10) - Number(a.result?.pinsDown === 10) || Math.abs(a.m.pocketMiss) - Math.abs(b.m.pocketMiss));
    return scored[0] ?? pool[pool.length - 1] ?? null;
  }
  function close6() {
    cancelAnimationFrame(raf2);
    for (const s of sides) if (s.url) URL.revokeObjectURL(s.url);
    sides = [];
    $("compare").classList.remove("on");
    $("compare").innerHTML = "";
  }
  async function sideFor(shot) {
    const stored = shot.hasClip ? await loadClip(shot.id) : void 0;
    const clip = stored ? stored.type ? stored : new Blob([stored], { type: "video/mp4" }) : null;
    return { shot, clip, url: clip ? URL.createObjectURL(clip) : null, v: null, ov: null, draw: null, shapes: [], rel: -shot.recStartT };
  }
  function angleAt(a, b, c, w, h) {
    const v1 = { x: (a.x - b.x) * w, y: (a.y - b.y) * h };
    const v2 = { x: (c.x - b.x) * w, y: (c.y - b.y) * h };
    const d = Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1))));
    return d * 180 / Math.PI;
  }
  function paintShapes(cv, shapes, pending2) {
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(r.width * dpr)) {
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
    }
    const g = cv.getContext("2d");
    g.clearRect(0, 0, cv.width, cv.height);
    const W2 = cv.width;
    const H3 = cv.height;
    const P = (p) => ({ x: p.x * W2, y: p.y * H3 });
    g.lineWidth = 3 * dpr;
    g.strokeStyle = "#ffd25a";
    g.fillStyle = "#ffd25a";
    g.font = `800 ${14 * dpr}px system-ui`;
    for (const s of pending2 ? [...shapes, pending2] : shapes) {
      const p = s.pts.map(P);
      g.beginPath();
      if (s.tool === "circle" && p.length >= 2) g.arc(p[0].x, p[0].y, Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y), 0, Math.PI * 2);
      else p.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y));
      g.stroke();
      for (const q of s.tool === "free" ? [] : p) {
        g.beginPath();
        g.arc(q.x, q.y, 4 * dpr, 0, Math.PI * 2);
        g.fill();
      }
      if (s.tool === "angle" && s.pts.length === 3) {
        const deg2 = angleAt(s.pts[0], s.pts[1], s.pts[2], W2, H3);
        g.fillText(`${deg2.toFixed(0)}\xB0`, p[1].x + 8 * dpr, p[1].y - 8 * dpr);
      }
    }
  }
  function wireDraw(side) {
    const cv = side.draw;
    let cur2 = null;
    const at3 = (e) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };
    cv.onpointerdown = (e) => {
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      const p = at3(e);
      if (tool === "angle" && cur2?.tool === "angle" && cur2.pts.length === 2) {
        cur2.pts.push(p);
        side.shapes.push(cur2);
        cur2 = null;
        return paintShapes(cv, side.shapes);
      }
      cur2 = { tool, pts: tool === "free" ? [p] : [p, p] };
    };
    cv.onpointermove = (e) => {
      if (!cur2) return;
      const p = at3(e);
      if (cur2.tool === "free") cur2.pts.push(p);
      else cur2.pts[cur2.pts.length - 1] = p;
      paintShapes(cv, side.shapes, cur2);
    };
    cv.onpointerup = () => {
      if (!cur2) return;
      if (cur2.tool === "angle" && cur2.pts.length === 2) return paintShapes(cv, side.shapes, cur2);
      side.shapes.push(cur2);
      cur2 = null;
      paintShapes(cv, side.shapes);
    };
  }
  function trailLoop() {
    for (const s of sides) {
      if (!s.v || !s.ov || s.shot.cal.length !== 4) continue;
      const g = s.ov.getContext("2d");
      g.clearRect(0, 0, s.ov.width, s.ov.height);
      const Hinv2 = solveHomography([{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }], s.shot.cal);
      const P = (x, y) => applyHomography(Hinv2, { x, y });
      const view3 = { ctx: g, width: s.shot.vw, P };
      const t = s.v.currentTime + s.shot.recStartT;
      const last = s.shot.path[s.shot.path.length - 1]?.t ?? 0;
      strokeTrail(view3, s.shot.path.filter((p) => p.t <= t).map((p) => P(p.x, p.y)), 1, t < last);
    }
    const [a, b] = sides;
    if (a?.v && b?.v && !a.v.paused) {
      const want = b.rel + (a.v.currentTime - a.rel);
      if (want >= 0 && Math.abs(b.v.currentTime - want) > 0.08) b.v.currentTime = want;
      if (b.v.paused && want >= 0 && want < (b.v.duration || 99)) void b.v.play().catch(() => {
      });
    }
    const slider = document.getElementById("cp-scrub");
    if (slider && a?.v && document.activeElement !== slider) slider.value = String(a.v.currentTime - a.rel);
    raf2 = requestAnimationFrame(trailLoop);
  }
  function seekAll(rel) {
    for (const s of sides) if (s.v) s.v.currentTime = Math.max(0, s.rel + rel);
  }
  async function playAll() {
    seekAll(-lead);
    await new Promise((r) => setTimeout(r, 150));
    for (const s of sides)
      if (s.v) {
        s.v.playbackRate = rate2;
        void s.v.play().catch(() => {
        });
      }
  }
  function stepAll(dt) {
    for (const s of sides)
      if (s.v) {
        s.v.pause();
        s.v.currentTime = Math.max(0, s.v.currentTime + dt);
      }
  }
  async function snapshot(side) {
    if (!side.v || !side.v.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = side.v.videoWidth;
    c.height = side.v.videoHeight;
    const g = c.getContext("2d");
    g.drawImage(side.v, 0, 0, c.width, c.height);
    if (side.ov) g.drawImage(side.ov, 0, 0, c.width, c.height);
    if (side.draw) g.drawImage(side.draw, 0, 0, c.width, c.height);
    return new Promise((r) => c.toBlob((b) => r(b), "image/jpeg", 0.9));
  }
  function summaryText() {
    const hand3 = S.profile?.hand ?? "R";
    const lines = [`LaneIQ shot comparison${S.profile ? ` for ${S.profile.name}` : ""}`];
    sides.forEach((s, i) => {
      const m = s.shot.m;
      lines.push("", `${i ? "B" : "A"}: ${when(s.shot.at)}, ${ballName(s.shot.ballId)}${s.shot.result ? `, ${s.shot.result.pinsDown === 10 ? "strike" : `${s.shot.result.pinsDown} pins`}` : ""}`);
      for (const f of FEATURES) {
        const v = m[f.key];
        if (typeof v === "number") lines.push(`  ${f.label}: ${v.toFixed(1)} ${f.unit}`.trimEnd());
      }
      const g = gradeShot(s.shot, s.shot.plan);
      if (g && g.markOff !== null) lines.push(`  Target: aimed at ${s.shot.plan.arrows}, ${g.hitMark ? "hit it" : `missed by ${Math.abs(g.markOff).toFixed(1)} ${g.markOff > 0 ? "left" : "right"}`}`);
      if (s.shot.body) for (const d of describeBody(s.shot.body, hand3)) lines.push(`  ${d}`);
    });
    lines.push("", "Boards are counted from the right gutter. Measured from one phone camera; treat as estimates.");
    return lines.join("\n");
  }
  async function sharePacket() {
    const box = $("cp-share-note");
    box.textContent = "Getting the pictures ready\u2026";
    const files = [];
    for (const [i, s] of sides.entries()) {
      const snap = await snapshot(s);
      if (snap) files.push(new File([snap], `laneiq-shot-${i ? "B" : "A"}.jpg`, { type: "image/jpeg" }));
      if (s.clip) files.push(new File([s.clip], `laneiq-shot-${i ? "B" : "A"}.${/mp4/.test(s.clip.type) ? "mp4" : "webm"}`, { type: s.clip.type || "video/mp4" }));
    }
    offerShare(box, files, { text: summaryText(), title: "LaneIQ shots", label: "Share with my coach" });
  }
  async function openCompare2(a, b) {
    close6();
    const el = $("compare");
    el.classList.add("on");
    const other = b ?? bestShotFor(a);
    sides = [await sideFor(a), ...other ? [await sideFor(other)] : []];
    const pickList = S.shots.filter((x) => x.id !== a.id && x.hasClip).slice(-60).reverse();
    const head = (s, i) => `<div class="note"><b style="color:${i ? "var(--mg)" : "var(--cy)"}">${i ? "B" : "A"}</b> ${esc(when(s.shot.at))} \xB7 ${esc(ballName(s.shot.ballId))} \xB7 ${s.shot.a.speedMph.toFixed(1)} mph${s.shot.result ? ` \xB7 ${s.shot.result.pinsDown === 10 ? "strike" : s.shot.result.pinsDown + " pins"}` : ""}</div>`;
    const stage = (s, i) => s.url ? `<div style="flex:1;min-width:0">${head(s, i)}<div class="stagebox" style="margin:4px 0"><video id="cp-v${i}" src="${s.url}" playsinline muted preload="auto"></video><canvas class="ov" id="cp-o${i}" width="${s.shot.vw}" height="${s.shot.vh}"></canvas><canvas class="ov" id="cp-d${i}" style="touch-action:none"></canvas></div></div>` : `<div style="flex:1;min-width:0">${head(s, i)}<div class="note">No video for this shot.</div></div>`;
    const rows2 = FEATURES.filter((f) => sides.some((s) => typeof s.shot.m[f.key] === "number"));
    el.innerHTML = `<div class="row"><h2>Side by side</h2><button class="btn ghost" id="cp-close">Close</button></div>
    <div class="note">Both clips are lined up at the moment the ball leaves the hand. Draw on either picture to mark it up.</div>
    <div class="field"><label>Compare with</label><select id="cp-pick">${other ? "" : `<option value="">choose a shot\u2026</option>`}${pickList.map((x) => `<option value="${x.id}" ${other?.id === x.id ? "selected" : ""}>${esc(when(x.at))} \xB7 ${esc(ballName(x.ballId))} \xB7 ${x.a.speedMph.toFixed(1)} mph${x.result?.pinsDown === 10 ? " \xB7 strike" : ""}${x.id === bestShotFor(a)?.id ? " (your best)" : ""}</option>`).join("")}</select></div>
    <div style="display:flex;gap:8px">${sides.map(stage).join("")}</div>
    <div class="field"><label>From release (s)</label><input id="cp-scrub" type="range" min="-3" max="3" step="0.02" value="-${lead}"></div>
    <div class="chips"><button class="btn" id="cp-play">Play both</button><button class="chip" id="cp-back">\u25C0 frame</button><button class="chip" id="cp-fwd">frame \u25B6</button>${[0.25, 0.5, 1].map((r) => `<button class="chip ${r === rate2 ? "sel" : ""}" data-rate="${r}">${r}\xD7</button>`).join("")}</div>
    <div class="chips">${["line", "angle", "circle", "free"].map((t) => `<button class="chip ${t === tool ? "sel" : ""}" data-tool="${t}">${t === "line" ? "Line" : t === "angle" ? "Angle" : t === "circle" ? "Circle" : "Draw"}</button>`).join("")}<button class="chip danger" id="cp-clear">Clear marks</button></div>
    <div class="note">Angle: drag the first arm, then tap where the second arm ends. The degrees show at the corner.</div>
    <h3>Both paths from above</h3>
    <div class="card"><canvas id="cp-top" width="360" height="600" style="width:100%;height:auto;aspect-ratio:360/600"></canvas><div class="note"><b style="color:var(--cy)">A</b> cyan, <b style="color:var(--mg)">B</b> magenta. The dashed green line is the pocket.</div></div>
    <h3>Numbers</h3>
    <div class="card"><table><tr><th>Metric</th><th class="n">A</th><th class="n">B</th></tr>${rows2.map((f) => `<tr><td>${esc(f.label)}</td>${sides.map((s) => `<td class="n">${typeof s.shot.m[f.key] === "number" ? s.shot.m[f.key].toFixed(1) : "\u2013"}</td>`).join("")}${sides.length < 2 ? "<td></td>" : ""}</tr>`).join("")}</table></div>
    ${sides.some((s) => s.shot.body) ? `<h3>Body and approach</h3><div class="card">${sides.map((s, i) => `<div><b>${i ? "B" : "A"}</b><ul>${s.shot.body ? describeBody(s.shot.body, S.profile?.hand ?? "R").map((d) => `<li>${esc(d)}</li>`).join("") : "<li>Not read yet: open the shot and tap Read my approach.</li>"}</ul></div>`).join("")}</div>` : ""}
    <h3>Send to a coach</h3>
    <div class="card"><div class="u">Shares both clips, a picture of each as it's shown now (with your marks) and the numbers, through your phone's share sheet. Nothing goes anywhere until you pick who to send it to.</div><div class="chips"><button class="btn ghost" id="cp-share">Get the packet ready</button></div><div id="cp-share-note"></div></div>`;
    sides.forEach((s, i) => {
      s.v = document.getElementById(`cp-v${i}`);
      s.ov = document.getElementById(`cp-o${i}`);
      s.draw = document.getElementById(`cp-d${i}`);
      if (s.draw) wireDraw(s);
      s.v?.addEventListener("loadedmetadata", () => s.v.currentTime = Math.max(0, s.rel - lead), { once: true });
    });
    drawTopDown($("cp-top").getContext("2d"), 360, 600, sides.map((s, i) => ({ path: s.shot.path, color: i ? "#ff4fd8" : "#46e6ff", width: 3.2 })), { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
    $("cp-close").onclick = close6;
    $("cp-play").onclick = () => void playAll();
    $("cp-back").onclick = () => stepAll(-1 / 30);
    $("cp-fwd").onclick = () => stepAll(1 / 30);
    $("cp-scrub").oninput = (e) => {
      for (const s of sides) s.v?.pause();
      seekAll(Number(e.target.value));
    };
    el.querySelectorAll("[data-rate]").forEach(
      (b2) => b2.onclick = () => {
        rate2 = Number(b2.dataset.rate);
        for (const s of sides) if (s.v) s.v.playbackRate = rate2;
        el.querySelectorAll("[data-rate]").forEach((x) => x.classList.toggle("sel", x === b2));
      }
    );
    el.querySelectorAll("[data-tool]").forEach(
      (b2) => b2.onclick = () => {
        tool = b2.dataset.tool;
        el.querySelectorAll("[data-tool]").forEach((x) => x.classList.toggle("sel", x === b2));
      }
    );
    $("cp-clear").onclick = () => sides.forEach((s) => (s.shapes = [], s.draw && paintShapes(s.draw, [])));
    $("cp-pick").onchange = (e) => {
      const id = e.target.value;
      const pick = S.shots.find((x) => x.id === id);
      if (pick) void openCompare2(a, pick);
    };
    $("cp-share").onclick = () => void sharePacket();
    trailLoop();
  }

  // core/src/missfinder.ts
  var MIN_FINDER = 12;
  var CAUSES = [
    { id: "speed", label: "Ball speed", unit: "mph", digits: 1, get: (s) => s.m.launchSpeed ?? s.a.speedMph ?? null, fixDir: (h, lo, hi) => `Your better shots come at ${h ? hi : lo} mph. Throw 10 at that speed (the Speed Lock drill) and keep the line.`, fixCons: (c) => `Your speed is fine on average (${c} mph); it's the spread. Same pushaway, same number of steps, same tempo every time. Speed Lock trains it.` },
    { id: "arrows", label: "Board at the arrows", unit: "", digits: 1, get: (s) => s.m.arrowsBoard, fixDir: (h, lo, hi) => `Your better shots cross the arrows on ${h ? hi : lo}. Set that as your target and hit it.`, fixCons: (c) => `You aim around board ${c}, but the ball wanders off it. Arrow Sniper trains hitting the same board.` },
    { id: "mark", label: "Missing your target", unit: "boards", digits: 1, get: (s) => s.plan && s.m.arrowsBoard !== null ? s.m.arrowsBoard - s.plan.arrows : null, fixDir: (h) => `Your misses follow your aim: when the ball crosses ${h ? "left" : "right"} of your target it goes the matching way at the pins. Square your shoulders to the target and swing straight at it.`, fixCons: () => "When you hit your target the pocket follows; when you miss it, so do the pins. Accuracy is the job: Arrow Sniper." },
    { id: "laydown", label: "Where the ball lands", unit: "", digits: 1, get: (s) => s.m.startBoard, fixDir: (h, lo, hi) => `Your better shots land on the lane around board ${h ? hi : lo}. Watch the laydown point as well as the arrows.`, fixCons: (c) => `The ball lands around board ${c}, but not consistently. Keep the swing close to the body and the release the same.` },
    { id: "launch", label: "Launch angle", unit: "\xB0", digits: 1, get: (s) => s.m.launchAngle, fixDir: (h, lo, hi) => `Your better shots leave the hand at ${h ? hi : lo}\xB0. Feel the line from your release point through your target.`, fixCons: () => "The angle the ball leaves your hand changes shot to shot. A straight swing and a still head at release keep it the same." },
    { id: "breakpoint", label: "Where it starts to hook", unit: "ft", digits: 0, get: (s) => s.m.breakpointFt, fixDir: (h) => h ? "When the ball hooks later it does better: a smoother ball, more speed or a little less rotation pushes the breakpoint down-lane." : "When the ball hooks sooner it does better: a stronger ball, less speed or moving in a little brings it back.", fixCons: () => "The hook point jumps around. That is usually the hand at release: same wrist, same rotation, every time." },
    { id: "drift", label: "Drift in the approach", unit: "boards", digits: 1, get: (s) => s.body?.driftBoards ?? null, fixDir: (h) => `Your misses go with your walk: drifting ${h ? "left" : "right"} goes with the better shots, the other way with the worse ones. Walk at your target.`, fixCons: () => "Your walk isn't the same every time. Tape your start board and check where you slide: walk straight at your target." },
    { id: "timing", label: "Timing", unit: "s", digits: 2, get: (s) => s.body?.timing?.offsetS ?? null, fixDir: (h) => h ? "Your better shots have the ball a touch later relative to your slide. Don't rush the pushaway." : "Your better shots have the ball a touch earlier relative to your slide. Start the pushaway with your first step.", fixCons: () => "Your timing changes shot to shot. Count your steps and start the pushaway on the same step every time." },
    { id: "hold", label: "Holding your finish", unit: "s", digits: 1, get: (s) => s.body?.heldS ?? null, fixDir: (h) => h ? "Your better shots are the ones you hold at the line. Post every shot until the ball reaches the pins." : "Shots you hold longest aren't helping here, so check something else first.", fixCons: () => "Some shots you post, some you fall out of. Hold the finish every time." },
    { id: "fatigue", label: "Shots into the session", unit: "shots", digits: 0, get: (s, ctx2) => ctx2.order.get(s.id) ?? null, fixDir: (h) => h ? "You get better as the session goes on: warm up longer before it counts." : "You fade as the session goes on: keep your legs under you, slow down between shots and stay with the same tempo.", fixCons: () => "Your misses get wider at one end of the session." }
  ];
  var mean4 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var sdOf2 = (v) => {
    if (v.length < 2) return 0;
    const m = mean4(v);
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
  };
  var median3 = (v) => {
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  function pearson(x, y) {
    if (x.length < 3) return 0;
    const mx = mean4(x);
    const my = mean4(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < x.length; i++) {
      sxy += (x[i] - mx) * (y[i] - my);
      sxx += (x[i] - mx) ** 2;
      syy += (y[i] - my) ** 2;
    }
    return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  }
  var tOf = (r, n) => Math.abs(r) >= 0.9999 ? 99 : Math.abs(r) * Math.sqrt(n - 2) / Math.sqrt(1 - r * r);
  var missWord = (m) => Math.abs(m) <= 1 ? "in the pocket" : m > 0 ? `${m.toFixed(1)} boards high` : `${Math.abs(m).toFixed(1)} boards light`;
  function findMisses(shots) {
    const used = shots.filter((s) => s.m.pocketMiss !== null && Number.isFinite(s.m.pocketMiss));
    const order = /* @__PURE__ */ new Map();
    const bySession = /* @__PURE__ */ new Map();
    for (const s of shots) bySession.set(s.sessionId, [...bySession.get(s.sessionId) ?? [], s]);
    for (const list of bySession.values()) list.sort((a, b) => a.at.localeCompare(b.at)).forEach((s, i) => order.set(s.id, i + 1));
    const miss = used.map((s) => s.m.pocketMiss);
    const out = { status: "insufficient", shotsUsed: used.length, needed: MIN_FINDER, bias: miss.length ? mean4(miss) : null, spread: miss.length >= 2 ? sdOf2(miss) : null, factors: [], headline: "", summary: "" };
    if (used.length < MIN_FINDER) {
      out.headline = `Miss Finder needs ${MIN_FINDER - used.length} more shot${MIN_FINDER - used.length === 1 ? "" : "s"} seen to the pins`;
      out.summary = "It ranks what goes with your misses: speed, aim, where the ball lands, your walk and timing, the time into the session. It needs shots the camera saw reach the pins.";
      return out;
    }
    out.status = "ok";
    const factors = [];
    const values = /* @__PURE__ */ new Map();
    for (const c of CAUSES) {
      const rows2 = used.map((s) => ({ x: c.get(s, { order }), y: s.m.pocketMiss })).filter((r) => typeof r.x === "number" && Number.isFinite(r.x));
      if (rows2.length < MIN_FINDER - 2) continue;
      const xs = rows2.map((r) => r.x);
      if (sdOf2(xs) < 1e-6) continue;
      const ys = rows2.map((r) => r.y);
      const fmt4 = (v) => v.toFixed(c.digits);
      const u = c.unit && c.unit !== "\xB0" ? ` ${c.unit}` : c.unit;
      const rd = pearson(xs, ys);
      const cx = median3(xs);
      const rc = pearson(xs.map((x) => Math.abs(x - cx)), ys.map((y) => Math.abs(y)));
      const sorted2 = rows2.slice().sort((a, b) => a.x - b.x);
      const third = Math.max(3, Math.floor(sorted2.length / 3));
      const lo = sorted2.slice(0, third);
      const hi = sorted2.slice(-third);
      const range = (g) => `${fmt4(g[0].x)}\u2013${fmt4(g[g.length - 1].x)}${u}`;
      values.set(c.id, new Map(used.map((s) => [s.id, c.get(s, { order })])));
      if (rd * rd >= rc * rc || rc <= 0) {
        if (tOf(rd, rows2.length) < 2 || rd * rd < 0.08) continue;
        const mLo = mean4(lo.map((r) => r.y));
        const mHi = mean4(hi.map((r) => r.y));
        const betterHigh = Math.abs(mHi) < Math.abs(mLo);
        factors.push({ id: c.id, label: c.label, unit: c.unit, kind: "direction", explained: rd * rd, n: rows2.length, text: `At ${range(lo)} you meet the pins ${missWord(mLo)} on average; at ${range(hi)}, ${missWord(mHi)}.`, fix: c.fixDir(betterHigh, range(lo), range(hi)) });
      } else {
        if (rc <= 0 || tOf(rc, rows2.length) < 2 || rc * rc < 0.08) continue;
        const devs = rows2.map((r) => ({ d: Math.abs(r.x - cx), y: Math.abs(r.y) })).sort((a, b) => a.d - b.d);
        const near = devs.slice(0, Math.floor(devs.length / 2));
        const far = devs.slice(Math.floor(devs.length / 2));
        const cut = far[0].d;
        factors.push({ id: c.id, label: c.label, unit: c.unit, kind: "consistency", explained: rc * rc, n: rows2.length, text: `Your usual is ${fmt4(cx)}${u}. Within ${fmt4(cut)}${u} of it you miss the pocket by ${mean4(near.map((r) => r.y)).toFixed(1)} boards on average; further off, by ${mean4(far.map((r) => r.y)).toFixed(1)}.`, fix: c.fixCons(fmt4(cx)) });
      }
    }
    factors.sort((a, b) => b.explained - a.explained);
    const together = (a, b) => {
      const va = values.get(a);
      const vb = values.get(b);
      const ids = [...va.keys()].filter((k2) => typeof va.get(k2) === "number" && typeof vb.get(k2) === "number");
      return ids.length >= 6 && Math.abs(pearson(ids.map((k2) => va.get(k2)), ids.map((k2) => vb.get(k2)))) >= 0.85;
    };
    const kept = [];
    for (const f of factors) if (kept.every((k2) => !together(k2.id, f.id))) kept.push(f);
    out.factors = kept.slice(0, 4);
    const bias = out.bias;
    const spread = out.spread;
    const top = out.factors[0];
    const lineNote = Math.abs(bias) > 1.2 && spread < 2.2 ? ` On average you're ${missWord(bias)}, and fairly tight about it: that part is your line, so a move fixes it (see Move Advisor).` : "";
    out.headline = top ? `${top.label} goes with your misses most` : Math.abs(bias) > 1.2 ? `Your misses are mostly one way: ${bias > 0 ? "high" : "light"}` : "No single thing explains your misses yet";
    out.summary = top ? `It accounts for about ${Math.round(top.explained * 100)}% of where your ball meets the pins over ${top.n} shots. ${top.text}${lineNote}` : `${used.length} shots: you meet the pins ${missWord(bias)} on average, give or take ${spread.toFixed(1)} boards.${lineNote || " Nothing measured stands out yet, so keep the same line and let more shots build up."}`;
    return out;
  }

  // core/src/moves.ts
  var MOVE_MIN = 3;
  var mean5 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var sdOf3 = (v) => {
    if (v.length < 2) return 0;
    const m = mean5(v);
    return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1));
  };
  var median4 = (v) => {
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  var dirWord = (b) => b > 0 ? "left" : "right";
  function adviseMove(recent, hand3, plan, lane) {
    const last = recent[recent.length - 1];
    const sameBall = last?.ballId ? recent.filter((s) => s.ballId === last.ballId) : recent;
    const window2 = sameBall.slice(-6);
    const base = { kind: "insufficient", headline: "", feet: 0, eyes: 0, from: { stand: null, arrows: null }, to: { stand: null, arrows: null }, why: [], shotsUsed: 0 };
    const stands = window2.map((s) => s.plan?.stand ?? s.body?.startBoard ?? null).filter((x) => x !== null);
    const aims = window2.map((s) => s.plan?.arrows ?? s.m.arrowsBoard).filter((x) => x !== null);
    base.from = { stand: plan?.stand ?? (stands.length ? Math.round(median4(stands)) : null), arrows: plan?.arrows ?? (aims.length ? Math.round(median4(aims)) : null) };
    const graded = window2.map((s) => ({ s, g: gradeShot(s, s.plan) }));
    const planned = graded.filter((r) => r.g && r.g.hitMark !== null);
    const onMark = planned.length >= 3 ? planned.filter((r) => r.g.hitMark).map((r) => r.s) : window2;
    if (planned.length >= 4 && planned.filter((r) => r.g.hitMark).length / planned.length < 0.5) {
      return { ...base, kind: "fix-aim", headline: "Don't move yet: you're missing your target", why: [`You hit your target on ${planned.filter((r) => r.g.hitMark).length} of the last ${planned.length} planned shots.`, "A move only helps when the ball goes where you aim. Hit the mark first, then judge the line."], shotsUsed: planned.length };
    }
    const seen2 = onMark.filter((s) => s.m.pocketMiss !== null);
    base.shotsUsed = seen2.length;
    if (seen2.length < MOVE_MIN) {
      return { ...base, headline: `Bowl ${MOVE_MIN - seen2.length} more shot${MOVE_MIN - seen2.length === 1 ? "" : "s"} with this ball`, why: ["The advisor needs a few shots with the same ball that the camera saw reach the pins."] };
    }
    const misses = seen2.map((s) => s.m.pocketMiss);
    const bias = mean5(misses);
    const spread = sdOf3(misses);
    const highs = misses.filter((m) => m > 1).length;
    const lights = misses.filter((m) => m < -1).length;
    const why = [`Last ${seen2.length} shots with this ball: ${misses.map((m) => Math.abs(m) <= 1 ? "pocket" : m > 0 ? `+${m.toFixed(1)}` : m.toFixed(1)).join(", ")} (boards from the pocket, + high).`];
    if (Math.abs(bias) <= 1) return { ...base, kind: "stay", headline: "Stay where you are", why: [...why, "On average the ball is meeting the pocket. Keep the line and repeat the shot."] };
    if (highs && lights && Math.min(highs, lights) / seen2.length >= 0.3) return { ...base, kind: "stay", headline: "Don't move: the misses go both ways", why: [...why, "Some high and some light is repeatability, not the line. A move would chase it. Look at Miss Finder for what changes between them."] };
    if (spread > 3) return { ...base, kind: "stay", headline: "Too scattered to call a move", why: [...why, `The misses spread \xB1${spread.toFixed(1)} boards. Tighten up the shot first.`] };
    const pocket = POCKET_BOARD[hand3];
    const entries = seen2.map((s) => s.m.entryBoard).filter((x) => x !== null);
    const side = entries.length ? Math.sign(mean5(entries) - pocket) : hand3 === "R" ? Math.sign(bias) : -Math.sign(bias);
    const size = Math.abs(bias);
    const high = bias > 0;
    if (lane?.status === "ok" && /earlier/.test(lane.headline) && high) why.push("The lane read agrees: the ball is reading the lane earlier as the oil dries up.");
    if (lane?.status === "ok" && /skidding farther/.test(lane.headline) && !high) why.push("The lane read agrees: oil is carrying down and the ball is skidding farther.");
    if (size > 4.5) {
      return { ...base, kind: "ball", ball: high ? "cleaner" : "stronger", headline: `Change balls: ${size.toFixed(1)} boards ${high ? "high" : "light"} is more than a move should fix`, why: [...why, high ? "A cleaner, later-reading ball lets you stay on a line you can repeat." : "A stronger, earlier-reading ball gets back the hook you're missing."], feet: 0, eyes: 0 };
    }
    const feet = side * (size > 2.5 ? 4 : 2);
    const eyes = side * (size > 2.5 ? 2 : 1);
    const to = { stand: base.from.stand !== null ? base.from.stand + feet : null, arrows: base.from.arrows !== null ? base.from.arrows + eyes : null };
    why.push(`Averaging ${size.toFixed(1)} boards ${high ? "high" : "light"}: move toward the miss, feet ${Math.abs(feet)} boards and eyes ${Math.abs(eyes)} ${dirWord(feet)} (the ${Math.abs(feet)}-and-${Math.abs(eyes)} move).`);
    why.push("Judge two shots after the move before changing anything else.");
    return {
      ...base,
      kind: "move",
      feet,
      eyes,
      to,
      headline: `Move ${Math.abs(feet)} and ${Math.abs(eyes)} ${dirWord(feet)}${to.stand !== null && to.arrows !== null ? `: stand on ${to.stand}, aim at ${to.arrows}` : ""}`,
      why
    };
  }

  // core/src/balladvisor.ts
  var BALL_MIN_SHOTS = 10;
  var STEP = 0.4;
  var mean6 = (v) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  var nums2 = (v) => v.filter((x) => typeof x === "number" && Number.isFinite(x));
  function ballStats(shots) {
    const seen2 = shots.filter((s) => s.m.pocketMiss !== null);
    const miss = seen2.map((s) => s.m.pocketMiss);
    const res = shots.filter((s) => s.result);
    return {
      shots: shots.length,
      seen: seen2.length,
      pocketPct: seen2.length ? miss.filter((m) => Math.abs(m) <= 1).length / seen2.length * 100 : null,
      highPct: seen2.length ? miss.filter((m) => m > 1).length / seen2.length * 100 : null,
      lightPct: seen2.length ? miss.filter((m) => m < -1).length / seen2.length * 100 : null,
      meanMiss: mean6(miss),
      entryAngle: mean6(nums2(shots.map((s) => s.m.entryAngle))),
      breakpointFt: mean6(nums2(shots.map((s) => s.m.breakpointFt))),
      strikePct: res.length >= 8 ? res.filter(isStrike).length / res.length * 100 : null,
      speed: mean6(nums2(shots.map((s) => s.m.launchSpeed)))
    };
  }
  function judgeBall(st2) {
    const why = [];
    if (st2.shots < BALL_MIN_SHOTS || st2.seen < 6) return { verdict: "need-shots", why: [`${st2.shots} shot${st2.shots === 1 ? "" : "s"} so far; the advisor judges a ball from ${BALL_MIN_SHOTS} (with at least 6 seen to the pins).`], delta: 0 };
    const high = (st2.highPct ?? 0) >= 55 && (st2.meanMiss ?? 0) > 1;
    const light = (st2.lightPct ?? 0) >= 55 && (st2.meanMiss ?? 0) < -1;
    const early = st2.breakpointFt !== null && st2.breakpointFt < 37 || st2.entryAngle !== null && st2.entryAngle > 7;
    const late = st2.breakpointFt !== null && st2.breakpointFt > 46 || st2.entryAngle !== null && st2.entryAngle < 3.5;
    const veryEarly = st2.entryAngle !== null && st2.entryAngle > 8 || st2.breakpointFt !== null && st2.breakpointFt < 33;
    const veryLate = st2.entryAngle !== null && st2.entryAngle < 2.5 || st2.breakpointFt !== null && st2.breakpointFt > 50;
    const shape = `breakpoint ${st2.breakpointFt !== null ? `at ${st2.breakpointFt.toFixed(0)} ft` : "not measured"}, entry angle ${st2.entryAngle !== null ? `${st2.entryAngle.toFixed(1)}\xB0` : "not measured"}`;
    if (high && early || veryEarly) {
      why.push(`It meets the pins high on ${Math.round(st2.highPct ?? 0)}% of shots${high ? "" : " some of the time"}, with an early, strong shape (${shape}).`);
      why.push("That's a ball reading the lane before you want it to. Moving left buys some room, but a cleaner, later-reading ball lets you stay on a line you can repeat.");
      return { verdict: "too-strong", why, delta: veryEarly && high ? -STEP * 1.5 : -STEP };
    }
    if (light && late || veryLate) {
      why.push(`It meets the pins light on ${Math.round(st2.lightPct ?? 0)}% of shots${light ? "" : " some of the time"}, with a late, flat shape (${shape}).`);
      why.push("That's a ball that isn't reading the lane enough for you. A stronger, earlier-reading ball gets back the angle that carries.");
      return { verdict: "too-weak", why, delta: veryLate && light ? STEP * 1.5 : STEP };
    }
    if ((st2.pocketPct ?? 0) >= 45) {
      why.push(`In the pocket on ${Math.round(st2.pocketPct)}% of shots seen to the pins (${shape}). This ball fits how you throw it.`);
      return { verdict: "good", why, delta: 0 };
    }
    why.push(high || light ? `It misses ${high ? "high" : "light"} mostly, but its shape (${shape}) doesn't say the ball is the problem: try a move before a new ball.` : `The misses go both ways (${shape}): that is repeatability, not the ball.`);
    return { verdict: "unclear", why, delta: 0 };
  }
  function adviseBalls(owned, shots, catalog, ownedKeys, filter) {
    const caveats = [
      "Judged from your own shots with each ball on the lanes you bowled. A different pattern can change the answer.",
      "The wanted ball is placed on the app's motion index, built from published specs (RG, differential, cover). Have a pro shop confirm the surface and layout before you buy."
    ];
    const reads = owned.map((b) => {
      const mine = shots.filter((s) => s.ballId === b.id);
      const st2 = ballStats(mine);
      const index = b.specs ? motionIndex(b.specs) : null;
      const j = judgeBall(st2);
      const read2 = { ballId: b.id, name: b.name, index, stats: st2, verdict: j.verdict, headline: "", why: j.why, want: null, owned: null, buys: [] };
      if (j.verdict === "too-strong" || j.verdict === "too-weak") {
        if (index === null) {
          read2.verdict = "no-specs";
          read2.headline = `${b.name}: ${j.verdict === "too-strong" ? "reads the lane too early for you" : "doesn't read the lane enough for you"}`;
          read2.why.push("It has no RG and differential on file, so there's nothing to measure a replacement against. Pick it from the catalog or enter its specs in Arsenal.");
          return read2;
        }
        const want = index + j.delta;
        read2.want = want;
        const near = owned.filter((o) => o.id !== b.id && o.specs).map((o) => ({ o, m: motionIndex(o.specs) })).filter((x) => x.m !== null && Math.abs(x.m - want) <= 0.2).sort((a, c) => Math.abs(a.m - want) - Math.abs(c.m - want))[0];
        read2.owned = near?.o ?? null;
        read2.buys = rankCatalog(catalog, ownedKeys, want, 4, 1, filter);
        read2.headline = `${b.name} is ${j.verdict === "too-strong" ? "too strong" : "too weak"} for how you're using it`;
      } else if (j.verdict === "good") read2.headline = `${b.name} fits you`;
      else if (j.verdict === "need-shots") read2.headline = `${b.name}: bowl more shots with it`;
      else read2.headline = `${b.name}: no clear call yet`;
      return read2;
    });
    const judged = reads.filter((r) => r.stats.seen >= 6);
    const best = judged.filter((r) => r.stats.pocketPct !== null).sort((a, c) => (c.stats.strikePct ?? c.stats.pocketPct) - (a.stats.strikePct ?? a.stats.pocketPct))[0] ?? null;
    const change = reads.find((r) => r.verdict === "too-strong" || r.verdict === "too-weak");
    let headline;
    if (!owned.length) headline = "Add the balls you throw (Arsenal) and bowl with them: the advisor learns how each one works for you.";
    else if (!judged.length) headline = `Bowl ${BALL_MIN_SHOTS} shots with a ball and the advisor will say how it fits you.`;
    else if (change) headline = change.owned ? `Try your ${change.owned.name} where you'd throw the ${change.name}` : change.buys.length ? `Your next ball: ${change.verdict === "too-strong" ? "a cleaner" : "a stronger"} one than the ${change.name}, like the ${change.buys[0].ball.manufacturer} ${change.buys[0].ball.name}` : change.headline;
    else headline = best ? `Your best ball right now is the ${best.name}` : "Nothing in your bag needs replacing on this evidence.";
    return { balls: reads, headline, best, caveats };
  }

  // core/src/carry.ts
  var BANDS = [
    [0, 3, "under 3\xB0"],
    [3, 4.5, "3\u20134.5\xB0"],
    [4.5, 6, "4.5\u20136\xB0"],
    [6, 99, "6\xB0 and up"]
  ];
  var CARRY_MIN = 12;
  function entryCarry(shots) {
    const pocket = shots.filter((s) => s.result && s.m.entryAngle !== null && s.m.pocketMiss !== null && Math.abs(s.m.pocketMiss) <= 1.5);
    const angles = shots.map((s) => s.m.entryAngle).filter((x) => x !== null);
    const meanAngle = angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : null;
    const bands = BANDS.map(([lo, hi, label2]) => {
      const g = pocket.filter((s) => s.m.entryAngle >= lo && s.m.entryAngle < hi);
      return { lo, hi, label: label2, strikes: rate(g.filter(isStrike).length, g.length) };
    });
    const out = { status: "insufficient", pocketShots: pocket.length, bands, meanAngle, headline: "", points: [] };
    if (pocket.length < CARRY_MIN) {
      out.headline = `Carry needs ${CARRY_MIN - pocket.length} more pocket hit${CARRY_MIN - pocket.length === 1 ? "" : "s"} with a pin count`;
      out.points.push(meanAngle !== null ? `Your entry angle averages ${meanAngle.toFixed(1)}\xB0 so far.` : "Entry angle is measured when the camera sees the last stretch to the pins.");
      return out;
    }
    out.status = "ok";
    const usable = bands.filter((b) => b.strikes.attempts >= 4);
    const best = usable.slice().sort((a, b) => (b.strikes.rate ?? 0) - (a.strikes.rate ?? 0))[0];
    const worst = usable.slice().sort((a, b) => (a.strikes.rate ?? 0) - (b.strikes.rate ?? 0))[0];
    for (const b of usable) out.points.push(`Pocket hits at ${b.label}: ${Math.round((b.strikes.rate ?? 0) * 100)}% strikes (${b.strikes.made} of ${b.strikes.attempts}).`);
    if (best && worst && best !== worst && (best.strikes.rate ?? 0) - (worst.strikes.rate ?? 0) >= 0.2) {
      out.headline = `You carry best at ${best.label}`;
      out.points.push(best.lo >= worst.lo ? "More angle is helping you carry. More hook (a stronger ball, a deeper line or a touch less speed) gets more shots there." : "Your carry drops at the steepest angles: the ball may be hooking too hard into the pins. A smoother ball or a little more speed evens it out.");
    } else out.headline = "Your carry doesn't change much with entry angle yet";
    out.points.push("USBC's ball motion research put the best pocket hit at the 17.5 board with about 6\xB0 of entry angle.");
    return out;
  }
  var mean7 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  function fatigue(shots) {
    const bySession = /* @__PURE__ */ new Map();
    for (const s of shots) bySession.set(s.sessionId, [...bySession.get(s.sessionId) ?? [], s]);
    const sp = [];
    const pk = [];
    let sessions = 0;
    for (const list of bySession.values()) {
      if (list.length < 9) continue;
      const o = list.slice().sort((a2, b2) => a2.at.localeCompare(b2.at));
      const k2 = Math.floor(o.length / 3);
      const first = o.slice(0, k2);
      const lastT = o.slice(-k2);
      const speed = (g) => g.map((s) => s.m.launchSpeed).filter((x) => x !== null);
      const pocket = (g) => {
        const seen2 = g.filter((s) => s.m.pocketMiss !== null);
        return seen2.length >= 3 ? seen2.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / seen2.length * 100 : null;
      };
      const a = speed(first);
      const b = speed(lastT);
      if (a.length >= 3 && b.length >= 3) sp.push(mean7(b) - mean7(a));
      const pa = pocket(first);
      const pb = pocket(lastT);
      if (pa !== null && pb !== null) pk.push(pb - pa);
      sessions++;
    }
    const out = { status: sessions ? "ok" : "insufficient", sessions, speedChange: sp.length ? mean7(sp) : null, pocketChange: pk.length ? mean7(pk) : null, headline: "", points: [] };
    if (!sessions) {
      out.headline = "Fatigue needs a session of 9 or more shots";
      return out;
    }
    if (out.speedChange !== null) out.points.push(`Speed from the first third of a session to the last: ${out.speedChange >= 0 ? "+" : ""}${out.speedChange.toFixed(1)} mph (${sessions} session${sessions === 1 ? "" : "s"}).`);
    if (out.pocketChange !== null) out.points.push(`In the pocket: ${out.pocketChange >= 0 ? "+" : ""}${Math.round(out.pocketChange)} points from the first third to the last.`);
    const tired = out.speedChange !== null && out.speedChange <= -0.5 || out.pocketChange !== null && out.pocketChange <= -15;
    const warm = out.pocketChange !== null && out.pocketChange >= 15 || out.speedChange !== null && out.speedChange >= 0.5;
    out.headline = tired ? "You fade late in a session" : warm ? "You start slow and get better" : "You hold steady through a session";
    if (tired) out.points.push("Slow down between shots, keep your legs under you and keep the same tempo. Speed that drops late usually means the legs, not the arm.");
    if (warm) out.points.push("Your first shots are your weakest: warm up properly before the ones that count.");
    return out;
  }

  // core/src/drills.ts
  var DRILLS2 = [
    { id: "arrow-sniper", name: "Arrow Sniper", blurb: "Hit your board at the arrows, within 1 board, 10 times.", shots: 10, needs: ["board"] },
    { id: "speed-lock", name: "Speed Lock", blurb: "Throw the same speed, within 0.5 mph, 10 times.", shots: 10, needs: ["mph"] },
    { id: "pocket-hunter", name: "Pocket Hunter", blurb: "Meet the pocket within a board, 10 times.", shots: 10, needs: [] },
    { id: "speed-ladder", name: "Speed Ladder", blurb: "Slow, normal, fast on call: 1.5 mph either side of your speed, within 0.6 mph. 9 shots.", shots: 9, needs: ["mph"] },
    { id: "corner-pins", name: "Corner Pins", blurb: "Spare practice: alternate the 10 pin and the 7 pin. A ball that reaches the pins close enough to take the pin counts. 10 shots.", shots: 10, needs: [] }
  ];
  var pinBoard = (pin) => (LANE_BOARDS + 1) / 2 - PIN_XY[pin].x / (41.5 / LANE_BOARDS);
  var PIN_REACH = 5;
  function drillTarget(run, i = run.results.filter((r) => r.ok !== null).length) {
    switch (run.id) {
      case "arrow-sniper":
        return { kind: "arrows", target: run.board ?? 10, label: `board ${run.board ?? 10} at the arrows` };
      case "speed-lock":
        return { kind: "mph", target: run.mph ?? 17, label: `${(run.mph ?? 17).toFixed(1)} mph` };
      case "pocket-hunter":
        return { kind: "pocket", target: 0, label: "the pocket" };
      case "speed-ladder": {
        const step = [-1.5, 0, 1.5][i % 3];
        const t = (run.mph ?? 17) + step;
        return { kind: "mph", target: t, label: `${step < 0 ? "slow" : step > 0 ? "fast" : "normal"}: ${t.toFixed(1)} mph` };
      }
      case "corner-pins": {
        const pin = i % 2 === 0 ? run.hand === "R" ? 10 : 7 : run.hand === "R" ? 7 : 10;
        return { kind: "pin", target: pin, label: `the ${pin} pin` };
      }
    }
  }
  function scoreDrillShot(run, s) {
    const t = drillTarget(run);
    const base = { shotId: s.id, target: t.target };
    if (t.kind === "arrows") {
      const v = s.m.arrowsBoard;
      return { ...base, value: v, ok: v === null ? null : Math.abs(v - t.target) <= 1, note: v === null ? "arrows board not measured" : `board ${v.toFixed(1)}` };
    }
    if (t.kind === "mph") {
      const v = s.m.launchSpeed ?? s.a.speedMph;
      const tol = run.id === "speed-ladder" ? 0.6 : 0.5;
      return { ...base, value: v, ok: Math.abs(v - t.target) <= tol, note: `${v.toFixed(1)} mph` };
    }
    if (t.kind === "pocket") {
      const v = s.m.pocketMiss;
      return { ...base, value: v, ok: v === null ? null : Math.abs(v) <= 1, note: v === null ? "not seen to the pins" : Math.abs(v) <= 1 ? "pocket" : `${Math.abs(v).toFixed(1)} ${v > 0 ? "high" : "light"}` };
    }
    const atPins = s.a.entryMeasured ? s.a.entryBoard : s.a.lastSeen && s.a.lastSeen.ft >= 52 ? s.a.lastSeen.board : null;
    const pb = pinBoard(t.target);
    return { ...base, value: atPins, ok: atPins === null ? null : Math.abs(atPins - pb) <= PIN_REACH, note: atPins === null ? "not seen near the pins" : `board ${atPins.toFixed(0)} at the pins (the ${t.target} is on ${pb.toFixed(0)})` };
  }
  function summarize2(run) {
    const def = DRILLS2.find((d) => d.id === run.id);
    const scored = run.results.filter((r) => r.ok !== null);
    const made = scored.filter((r) => r.ok).length;
    let streak = 0, cur2 = 0;
    for (const r of scored) {
      cur2 = r.ok ? cur2 + 1 : 0;
      streak = Math.max(streak, cur2);
    }
    const done2 = scored.length >= def.shots;
    return { made, scored: scored.length, total: def.shots, done: done2, streak, text: `${made} of ${scored.length}${done2 ? "" : ` (${def.shots - scored.length} to go)`}${streak >= 3 ? ` \xB7 best streak ${streak}` : ""}` };
  }
  function addDrillShot(run, s) {
    if (summarize2(run).done) return run;
    const r = scoreDrillShot(run, s);
    const next = { ...run, results: [...run.results, r] };
    if (summarize2(next).done) next.finishedAt = s.at;
    return next;
  }
  function personalBest(history2, id) {
    const done2 = history2.filter((h) => h.id === id && h.finishedAt).map((h) => ({ s: summarize2(h), at: h.finishedAt }));
    if (!done2.length) return null;
    const best = done2.sort((a, b) => b.s.made - a.s.made || a.at.localeCompare(b.at))[0];
    return { made: best.s.made, of: best.s.scored, at: best.at };
  }

  // core/src/lanememory.ts
  function pairOf(lane) {
    const n = parseInt(lane, 10);
    if (!Number.isFinite(n) || String(n) !== lane.trim()) return lane.trim();
    const lo = n % 2 ? n : n - 1;
    return `${lo}-${lo + 1}`;
  }
  var placeKey = (center, lane) => `${center.trim().toLowerCase()}|${pairOf(lane)}`;
  var median5 = (v) => {
    if (!v.length) return null;
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  function summarizeSession(list) {
    const seen2 = list.filter((s) => s.m.pocketMiss !== null);
    const res = list.filter((s) => s.result);
    const nums3 = (v) => v.filter((x) => typeof x === "number");
    const sp = nums3(list.map((s) => s.m.launchSpeed));
    return {
      sessionId: list[0].sessionId,
      date: list[0].at,
      shots: list.length,
      ballIds: [...new Set(list.map((s) => s.ballId).filter(Boolean))],
      stand: median5(nums3(list.map((s) => s.plan?.stand ?? s.body?.startBoard))),
      arrows: median5(nums3(list.map((s) => s.m.arrowsBoard))),
      pocketPct: seen2.length >= 3 ? seen2.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / seen2.length * 100 : null,
      strikePct: res.length >= 5 ? res.filter(isStrike).length / res.length * 100 : null,
      speed: sp.length ? sp.reduce((a, b) => a + b, 0) / sp.length : null
    };
  }
  function laneMemories(shots, excludeSession) {
    const groups = /* @__PURE__ */ new Map();
    for (const s of shots) {
      if (!s.center || !s.lane || s.sessionId === excludeSession) continue;
      const k2 = placeKey(s.center, s.lane);
      const g = groups.get(k2) ?? { center: s.center.trim(), pair: pairOf(s.lane), bySession: /* @__PURE__ */ new Map() };
      g.bySession.set(s.sessionId, [...g.bySession.get(s.sessionId) ?? [], s]);
      groups.set(k2, g);
    }
    return [...groups.values()].map((g) => {
      const sessions = [...g.bySession.values()].map((l) => summarizeSession(l.sort((a, b) => a.at.localeCompare(b.at)))).sort((a, b) => b.date.localeCompare(a.date));
      const best = sessions.filter((s) => s.pocketPct !== null && s.shots >= 6).sort((a, b) => b.pocketPct - a.pocketPct)[0] ?? null;
      return { center: g.center, pair: g.pair, sessions, best };
    }).sort((a, b) => b.sessions[0].date.localeCompare(a.sessions[0].date));
  }
  function memoryFor(shots, center, lane, excludeSession) {
    const k2 = placeKey(center, lane);
    return laneMemories(shots, excludeSession).find((m) => placeKey(m.center, m.pair) === k2 || placeKey(m.center, m.pair.split("-")[0]) === k2) ?? null;
  }

  // core/src/dna.ts
  function revBand(rpm) {
    return rpm < 300 ? "Stroker (under 300 RPM)" : rpm <= 400 ? "Tweener (300\u2013400 RPM)" : "Cranker (over 400 RPM)";
  }
  var median6 = (v) => {
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  function bowlerDna(name, bowler, shots, extra = {}) {
    const p = computeProfile(shots);
    const rows2 = [];
    const st2 = (k2) => p.stats[k2];
    const sp = st2("launchSpeed");
    if (sp && sp.n >= 5) rows2.push({ label: "Ball speed", value: `${sp.mean.toFixed(1)} mph \xB1${sp.sd.toFixed(1)}`, source: "measured" });
    if (bowler.revRpm) rows2.push({ label: "Rev rate", value: `${Math.round(bowler.revRpm)} RPM`, source: bowler.revSource === "measured" ? "measured" : bowler.revSource === "entered" ? "entered" : "estimated" });
    if (bowler.axisRotation !== void 0) rows2.push({ label: "Axis rotation", value: `${Math.round(bowler.axisRotation)}\xB0`, source: extra.spinSource ?? "entered" });
    if (bowler.axisTilt !== void 0) rows2.push({ label: "Axis tilt", value: `${Math.round(bowler.axisTilt)}\xB0`, source: extra.spinSource ?? "entered" });
    if (extra.pap) rows2.push({ label: "PAP", value: extra.pap, source: "entered" });
    const ea = st2("entryAngle");
    if (ea && ea.n >= 5) rows2.push({ label: "Entry angle", value: `${ea.mean.toFixed(1)}\xB0`, source: "measured" });
    const bp = st2("breakpointFt");
    if (bp && bp.n >= 5) rows2.push({ label: "Breakpoint", value: `${bp.mean.toFixed(0)} ft${st2("breakpointBoard") ? `, board ${st2("breakpointBoard").mean.toFixed(0)}` : ""}`, source: "measured" });
    const seen2 = shots.filter((s) => s.m.pocketMiss !== null);
    if (seen2.length >= 5) rows2.push({ label: "In the pocket", value: `${Math.round(seen2.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / seen2.length * 100)}%`, source: "measured" });
    if (p.strike.rate !== null && p.strike.attempts >= 8) rows2.push({ label: "Strike rate", value: `${Math.round(p.strike.rate * 100)}%`, source: "measured" });
    const graded = shots.map((s) => gradeShot(s, s.plan)).filter((g) => g && g.hitMark !== null);
    if (graded.length >= 5) rows2.push({ label: "Hits the mark", value: `${Math.round(graded.filter((g) => g.hitMark).length / graded.length * 100)}%`, source: "measured" });
    const bodies = shots.map((s) => s.body).filter((b) => !!b);
    const steps = bodies.map((b) => b.steps).filter((x) => x !== null);
    if (steps.length >= 3) rows2.push({ label: "Approach", value: `${median6(steps)} steps`, source: "measured" });
    const drift = bodies.map((b) => b.driftBoards).filter((x) => x !== null);
    if (drift.length >= 3) {
      const d = median6(drift);
      rows2.push({ label: "Drift", value: Math.abs(d) < 1 ? "straight" : `${Math.abs(d).toFixed(1)} boards ${d > 0 ? "left" : "right"}`, source: "measured" });
    }
    if (extra.bestBall) rows2.push({ label: "Best ball", value: extra.bestBall, source: "measured" });
    return { name, hand: bowler.hand, revBand: bowler.revRpm ? revBand(bowler.revRpm) : null, rows: rows2, shots: shots.length };
  }

  // camera/voice.ts
  var KEY4 = "laneiq.voice";
  var on = (() => {
    try {
      return localStorage.getItem(KEY4) === "1";
    } catch {
      return false;
    }
  })();
  var voiceOn = () => on && "speechSynthesis" in window;
  function setVoice(v) {
    on = v;
    try {
      localStorage.setItem(KEY4, v ? "1" : "0");
    } catch {
    }
    if (v) say("Voice caddie on.");
    else if ("speechSynthesis" in window) speechSynthesis.cancel();
  }
  function say(text) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.lang = navigator.language || "en-US";
      speechSynthesis.speak(u);
    } catch {
    }
  }
  var spokenNumber = (n, digits = 1) => {
    const s = n.toFixed(digits);
    return s.endsWith(".0") ? s.slice(0, -2) : s.replace(".", " point ");
  };

  // camera/coachlive.ts
  var hand2 = () => S.profile?.hand ?? "R";
  var ballName2 = (id) => S.arsenal.find((b) => b.id === id)?.name ?? "unknown ball";
  var day = (iso) => new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  function moveNow() {
    const shots = sessionShots();
    return adviseMove(shots, hand2(), S.target, readLane(shots.map((x) => ({ a: x.a, ballId: x.ballId }))));
  }
  function openTarget(prefill) {
    const el = $("target");
    el.classList.add("on");
    const t = { ...S.target ?? { arrows: 10, at: "" }, ...prefill ?? {} };
    const field = (id, label2, v, hint) => `<div class="field"><label>${label2}</label><div class="chips" style="margin:0;align-items:center"><button class="chip" data-step="${id}" data-d="-1">\u2212</button><input id="${id}" inputmode="decimal" value="${v ?? ""}" placeholder="${hint}" style="width:80px;text-align:center"><button class="chip" data-step="${id}" data-d="1">+</button></div></div>`;
    el.innerHTML = `<div class="row"><h2>My target</h2><button class="btn ghost" id="tg-close">Close</button></div>
    <div class="note">Boards are counted from the right gutter, as everywhere in LaneIQ (board 1 on the right, 39 on the left; the arrows are on boards 5, 10, 15, 20, 25, 30, 35). Every shot from now on is graded against this, so the app can tell a bad line from a missed shot.</div>
    <div class="card">
      ${field("tg-stand", "Where my slide foot starts (board)", t.stand, "e.g. 25")}
      ${field("tg-arrows", "Board I aim at, at the arrows", t.arrows, "e.g. 10")}
      ${field("tg-bp", "Where I want it to break (board, optional)", t.breakpoint, "e.g. 7")}
    </div>
    <div class="card"><div class="k">Where I'm bowling</div>
      <div class="two"><div class="field"><label>Centre</label><input id="tg-center" value="${esc(S.where.center)}" placeholder="Centre name" autocomplete="off"></div><div class="field"><label>Lane</label><input id="tg-lane" inputmode="numeric" value="${esc(S.where.lane)}" placeholder="e.g. 17"></div></div>
      <div class="note">Used to remember how each pair played for you. It stays on this phone.</div></div>
    <div class="chips"><button class="btn" id="tg-save">Save target</button>${S.target ? `<button class="btn ghost" id="tg-clear">No target</button>` : ""}</div>`;
    const num3 = (id) => {
      const v = parseFloat($(id).value);
      return Number.isFinite(v) ? Math.max(1, Math.min(39, v)) : void 0;
    };
    el.querySelectorAll("[data-step]").forEach(
      (b) => b.onclick = () => {
        const i = $(b.dataset.step);
        const v = parseFloat(i.value);
        i.value = String(Math.max(1, Math.min(39, (Number.isFinite(v) ? v : b.dataset.step === "tg-stand" ? 25 : 10) + Number(b.dataset.d))));
      }
    );
    $("tg-close").onclick = () => el.classList.remove("on");
    $("tg-clear")?.addEventListener("click", async () => {
      S.target = null;
      await saveCoach();
      el.classList.remove("on");
      renderTonight();
    });
    $("tg-save").onclick = async () => {
      const arrows = num3("tg-arrows");
      if (arrows === void 0) return void $("tg-arrows").focus();
      S.target = { arrows, stand: num3("tg-stand"), breakpoint: num3("tg-bp"), at: (/* @__PURE__ */ new Date()).toISOString() };
      S.where = { center: $("tg-center").value.trim(), lane: $("tg-lane").value.trim() };
      await saveCoach();
      el.classList.remove("on");
      renderTonight();
      renderMove();
    };
  }
  function paintDrill() {
    const chip = $("drill-chip");
    if (!chip) return;
    const run = S.drill;
    chip.classList.toggle("hide", !run);
    if (!run) return;
    const def = DRILLS2.find((d) => d.id === run.id);
    const s = summarize2(run);
    chip.textContent = `${def.name}: ${s.made}/${s.scored} \xB7 next ${drillTarget(run).label}`;
  }
  function openDrillStatus() {
    const run = S.drill;
    if (!run) return;
    const el = $("target");
    el.classList.add("on");
    const def = DRILLS2.find((d) => d.id === run.id);
    const s = summarize2(run);
    el.innerHTML = `<div class="row"><h2>${esc(def.name)}</h2><button class="btn ghost" id="dr-close">Close</button></div>
    <div class="card"><div class="u">${esc(def.blurb)}</div><div class="lr-head" style="margin-top:8px">${esc(s.text)}</div><div class="u">Next: ${esc(drillTarget(run).label)}</div>
    <table>${run.results.map((r, i) => `<tr><td>${i + 1}</td><td>${r.ok === null ? "not judged" : r.ok ? "\u2713 made" : "\u2717 missed"}</td><td class="n">${esc(r.note)}</td></tr>`).join("")}</table></div>
    <div class="chips"><button class="btn ghost danger" id="dr-stop">Stop this drill</button></div>`;
    $("dr-close").onclick = () => el.classList.remove("on");
    $("dr-stop").onclick = async () => {
      if (S.drill && S.drill.results.length) S.drills = [...S.drills, { ...S.drill, finishedAt: S.drill.finishedAt ?? (/* @__PURE__ */ new Date()).toISOString() }].slice(-200);
      S.drill = null;
      await saveCoach();
      el.classList.remove("on");
      paintDrill();
    };
  }
  function renderTonight() {
    const el = document.getElementById("tonight");
    if (!el) return;
    const t = S.target;
    const mem = S.where.center && S.where.lane ? memoryFor(S.shots, S.where.center, S.where.lane, S.sessionId) : null;
    const last = mem?.sessions[0];
    const best = mem?.best;
    const lineOf = (x) => [x.stand !== null ? `stood on ${x.stand.toFixed(0)}` : "", x.arrows !== null ? `crossed the arrows on ${x.arrows.toFixed(0)}` : ""].filter(Boolean).join(", ");
    el.innerHTML = `<div class="card"><div class="row"><div><div class="k">My target</div><div class="lr-head" style="font-size:16px">${t ? `${t.stand !== void 0 ? `Stand ${t.stand} \xB7 ` : ""}aim ${t.arrows} at the arrows${t.breakpoint !== void 0 ? ` \xB7 break at ${t.breakpoint}` : ""}` : "No target set"}</div></div><button class="chip" id="tn-edit">${t ? "Change" : "Set target"}</button></div>
    ${S.where.center ? `<div class="note">${esc(S.where.center)}${S.where.lane ? ` \xB7 lanes ${esc(pairOf(S.where.lane))}` : ""}</div>` : `<div class="note">Set a target to have every shot graded against it, and your centre and lane so the app remembers how each pair played.</div>`}
    ${last ? `<div class="lr-next"><b>Last time on this pair</b> (${esc(day(last.date))}): ${esc(lineOf(last) || "no line recorded")}${last.ballIds.length ? ` with the ${esc(last.ballIds.map(ballName2).join(", "))}` : ""}${last.pocketPct !== null ? `, ${Math.round(last.pocketPct)}% in the pocket` : ""}${last.strikePct !== null ? `, ${Math.round(last.strikePct)}% strikes` : ""}.${best && best !== last ? `<div class="u">Best here: ${esc(day(best.date))}, ${esc(lineOf(best))}, ${Math.round(best.pocketPct)}% in the pocket.</div>` : ""}${(best ?? last).arrows !== null ? `<div class="chips"><button class="chip" id="tn-use">Start on that line</button></div>` : ""}</div>` : ""}</div>`;
    $("tn-edit").onclick = () => openTarget();
    $("tn-use")?.addEventListener("click", () => {
      const src = best ?? last;
      openTarget({ stand: src.stand !== null ? Math.round(src.stand) : void 0, arrows: Math.round(src.arrows) });
    });
  }
  function renderMove() {
    const el = document.getElementById("move-card");
    if (!el) return;
    const m = moveNow();
    el.innerHTML = `<div class="lr-head">${esc(m.headline)}</div><span class="badge ${m.kind === "move" ? "good" : m.kind === "insufficient" ? "low" : "moderate"}">${m.kind === "move" ? "move" : m.kind === "fix-aim" ? "aim first" : m.kind === "ball" ? "ball change" : m.kind === "stay" ? "stay" : "waiting"} \xB7 ${m.shotsUsed} shot${m.shotsUsed === 1 ? "" : "s"}</span><ul>${m.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>${m.kind === "move" && m.to.arrows !== null ? `<div class="chips"><button class="chip sel" id="mv-take">Make this my target</button></div>` : ""}`;
    $("mv-take")?.addEventListener("click", async () => {
      S.target = { arrows: m.to.arrows, stand: m.to.stand ?? S.target?.stand, breakpoint: S.target?.breakpoint, at: (/* @__PURE__ */ new Date()).toISOString() };
      await saveCoach();
      renderTonight();
      renderMove();
      if (voiceOn()) say(`Target set. ${m.to.stand !== null ? `Stand on ${m.to.stand}, ` : ""}aim at ${m.to.arrows}.`);
    });
  }
  function caddieLine(s, move) {
    const bits = [spokenNumber(s.a.speedMph)];
    if (s.m.arrowsBoard !== null) bits.push(`board ${Math.round(s.m.arrowsBoard)} at the arrows`);
    if (s.m.breakpointBoard !== null) bits.push(`breakpoint ${Math.round(s.m.breakpointBoard)}`);
    if (s.m.pocketMiss !== null) bits.push(Math.abs(s.m.pocketMiss) <= 1 ? "pocket" : `${spokenNumber(Math.abs(s.m.pocketMiss))} ${s.m.pocketMiss > 0 ? "high" : "light"}`);
    const g = gradeShot(s, s.plan);
    if (g?.hitMark === true) bits.push("on your mark");
    else if (g?.hitMark === false && g.markOff !== null) bits.push(`missed your mark ${Math.abs(g.markOff).toFixed(0)} ${g.markOff > 0 ? "left" : "right"}`);
    if (s.drill) {
      const run = S.drill ?? S.drills[S.drills.length - 1];
      const def = DRILLS2.find((d) => d.id === s.drill.id);
      if (run && def) bits.push(`${def.name}: ${s.drill.ok === null ? "not judged" : s.drill.ok ? "made it" : "missed"}, ${summarize2(run).made} of ${summarize2(run).scored}`);
    }
    if (move.kind === "move") bits.push(`try ${Math.abs(move.feet)} and ${Math.abs(move.eyes)} ${move.feet > 0 ? "left" : "right"}`);
    else if (move.kind === "fix-aim") bits.push("hit your target before you move");
    return bits.join(". ") + ".";
  }
  function paintVoice() {
    const b = document.getElementById("voice-btn");
    if (b) {
      b.textContent = voiceOn() ? "Voice: on" : "Voice: off";
      b.classList.toggle("sel", voiceOn());
    }
  }
  function initCoachLive() {
    onBeforeSave((s) => {
      if (S.target) s.plan = { ...S.target };
      if (S.where.center) s.center = S.where.center;
      if (S.where.lane && !s.lane) s.lane = S.where.lane;
      if (S.drill) {
        const run = addDrillShot(S.drill, s);
        const r = run.results[run.results.length - 1];
        s.drill = { id: run.id, ok: r?.ok ?? null };
        if (run.finishedAt) {
          S.drills = [...S.drills, run].slice(-200);
          S.drill = null;
        } else S.drill = run;
        void saveCoach();
      }
    });
    onAfterShot((s) => {
      renderTonight();
      const m = moveNow();
      renderMove();
      paintDrill();
      if (voiceOn()) say(caddieLine(s, m));
    });
    document.getElementById("target-btn")?.addEventListener("click", () => openTarget());
    document.getElementById("voice-btn")?.addEventListener("click", () => {
      setVoice(!voiceOn());
      paintVoice();
    });
    document.getElementById("drill-chip")?.addEventListener("click", () => openDrillStatus());
    onChange(() => {
      paintDrill();
      if (document.getElementById("tab-live")?.classList.contains("on")) renderTonight();
    });
    paintVoice();
    paintDrill();
    renderTonight();
    renderMove();
  }

  // camera/reel.ts
  var W = 720;
  var H = 1280;
  var PRE = 1.2;
  var POST = 3.2;
  function pickMime() {
    const MR = window.MediaRecorder;
    if (!MR) return void 0;
    return ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => MR.isTypeSupported?.(m));
  }
  function reelPicks(sess, max = 6) {
    const withClip = sess.filter((s) => s.hasClip);
    const rank = (s) => (s.result?.pinsDown === 10 ? 0 : 1) * 100 + (s.m.pocketMiss === null ? 50 : Math.abs(s.m.pocketMiss));
    return withClip.slice().sort((a, b) => rank(a) - rank(b)).slice(0, max).sort((a, b) => a.at.localeCompare(b.at));
  }
  var frame = () => new Promise((r) => requestAnimationFrame(r));
  async function makeReel(sess, progress2) {
    const picks = reelPicks(sess);
    if (!picks.length) return "No clips in this session.";
    const mime = pickMime();
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const cs = c.captureStream;
    if (!window.MediaRecorder || !cs) return "This browser can't record video from the page.";
    const stream2 = cs.call(c, 30);
    const rec2 = new MediaRecorder(stream2, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : void 0);
    const chunks = [];
    rec2.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => rec2.onstop = () => r());
    rec2.start(250);
    const brand = () => {
      g.font = "900 34px system-ui";
      g.textAlign = "left";
      g.fillStyle = "#fff";
      g.fillText("Lane", 36, 70);
      const w = g.measureText("Lane").width;
      g.fillStyle = "#46e6ff";
      g.fillText("IQ", 36 + w, 70);
    };
    const card = async (lines, secs) => {
      const t0 = performance.now();
      while (performance.now() - t0 < secs * 1e3) {
        const bg = g.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, "#070b18");
        bg.addColorStop(1, "#1a0b2a");
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        brand();
        g.textAlign = "center";
        lines.forEach(([s, size, color], i) => {
          g.font = `900 ${size}px system-ui`;
          g.fillStyle = color;
          g.fillText(s, W / 2, H / 2 - 40 + i * (size + 22));
        });
        await frame();
      }
    };
    const host2 = document.createElement("div");
    host2.style.cssText = "position:fixed;inset:0;z-index:60;background:#000;display:flex;align-items:center;justify-content:center";
    const label2 = document.createElement("div");
    label2.style.cssText = "position:absolute;left:0;right:0;bottom:calc(16px + env(safe-area-inset-bottom));text-align:center;color:#c9d4ee;font:700 14px system-ui;z-index:3";
    label2.textContent = "Recording your highlight reel\u2026";
    c.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:2;background:#000";
    host2.append(c, label2);
    document.body.append(host2);
    try {
      const date = new Date(picks[0].at).toLocaleDateString([], { month: "long", day: "numeric" });
      await card([[S.profile?.name ?? "Highlights", 64, "#fff"], [date, 36, "#c9d4ee"]], 1.2);
      for (const [i, s] of picks.entries()) {
        progress2(`Recording shot ${i + 1} of ${picks.length}\u2026`);
        const stored = await loadClip(s.id);
        if (!stored) continue;
        const blob = stored.type ? stored : new Blob([stored], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        const v = document.createElement("video");
        v.muted = true;
        v.playsInline = true;
        v.src = url;
        v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1";
        host2.append(v);
        try {
          await new Promise((res, rej) => {
            v.onloadedmetadata = () => res();
            v.onerror = () => rej(new Error("clip"));
          });
          const rel = -s.recStartT;
          v.currentTime = Math.max(0, rel - PRE);
          await new Promise((r) => {
            v.onseeked = r;
            setTimeout(r, 1500);
          });
          await v.play().catch(() => {
          });
          const vw = v.videoWidth || s.vw;
          const vh = v.videoHeight || s.vh;
          const sc = Math.max(W / vw, H / vh);
          const ox = (W - vw * sc) / 2;
          const oy = (H - vh * sc) / 2;
          const k2 = vw / s.vw;
          const Hinv2 = s.cal.length === 4 ? solveHomography([{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }], s.cal) : null;
          const P = (x, y) => {
            const p = applyHomography(Hinv2, { x, y });
            return { x: ox + p.x * k2 * sc, y: oy + p.y * k2 * sc };
          };
          const view3 = { ctx: g, width: 1900, P };
          const last = s.path[s.path.length - 1]?.t ?? 0;
          const began = performance.now();
          const limit = (PRE + POST + 4) * 1e3;
          while (!v.ended && v.currentTime < rel + POST && performance.now() - began < limit) {
            g.fillStyle = "#000";
            g.fillRect(0, 0, W, H);
            g.drawImage(v, ox, oy, vw * sc, vh * sc);
            const t = v.currentTime + s.recStartT;
            if (Hinv2) strokeTrail(view3, s.path.filter((p) => p.t <= t).map((p) => P(p.x, p.y)), 1, t < last);
            const grad = g.createLinearGradient(0, H - 260, 0, H);
            grad.addColorStop(0, "rgba(0,0,0,0)");
            grad.addColorStop(1, "rgba(0,0,0,.8)");
            g.fillStyle = grad;
            g.fillRect(0, H - 260, W, 260);
            brand();
            g.textAlign = "left";
            g.font = "900 72px system-ui";
            g.fillStyle = "#fff";
            g.fillText(`${s.a.speedMph.toFixed(1)} mph`, 36, H - 110);
            g.font = "800 34px system-ui";
            g.fillStyle = s.result?.pinsDown === 10 ? "#5affb0" : "#ffd25a";
            const tag = s.result?.pinsDown === 10 ? "STRIKE" : s.m.pocketMiss !== null && Math.abs(s.m.pocketMiss) <= 1 ? "IN THE POCKET" : s.result ? `${s.result.pinsDown} PINS` : "";
            g.fillText(`${tag}${s.m.entryAngle !== null ? `${tag ? " \xB7 " : ""}${s.m.entryAngle.toFixed(1)}\xB0 ENTRY` : ""}`, 36, H - 56);
            await frame();
          }
          v.pause();
        } catch {
        } finally {
          v.remove();
          URL.revokeObjectURL(url);
        }
      }
      await card([["Every shot, measured.", 50, "#fff"], ["LaneIQ", 44, "#46e6ff"]], 1.6);
    } finally {
      rec2.stop();
      await stopped;
      host2.remove();
    }
    const type = rec2.mimeType || mime || "video/webm";
    const out = new Blob(chunks, { type });
    const name = `laneiq-highlights.${/mp4/.test(type) ? "mp4" : "webm"}`;
    return new File([out], name, { type });
  }

  // camera/dnacard.ts
  function rounded(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function drawDnaCard(d) {
    const W2 = 1080;
    const H3 = 1350;
    const c = document.createElement("canvas");
    c.width = W2;
    c.height = H3;
    const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, W2, H3);
    bg.addColorStop(0, "#070b18");
    bg.addColorStop(1, "#1a0b2a");
    g.fillStyle = bg;
    g.fillRect(0, 0, W2, H3);
    g.strokeStyle = "rgba(255,255,255,.05)";
    for (let x = 0; x < W2; x += 54) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H3);
      g.stroke();
    }
    const text = (s, x, y, size, color, weight = 800, align = "left") => {
      g.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
      g.fillStyle = color;
      g.textAlign = align;
      g.fillText(s, x, y);
    };
    g.font = "900 64px system-ui";
    const w1 = g.measureText("Lane").width;
    text("Lane", 80, 130, 64, "#fff", 900);
    const gr = g.createLinearGradient(80 + w1, 60, 80 + w1 + 90, 130);
    gr.addColorStop(0, "#46e6ff");
    gr.addColorStop(1, "#ff4fd8");
    g.font = "900 64px system-ui";
    g.fillStyle = gr;
    g.fillText("IQ", 80 + w1, 130);
    text("BOWLER DNA", W2 - 80, 128, 34, "#ffd25a", 900, "right");
    text(d.name, 80, 240, 76, "#fff", 900);
    text(`${d.hand === "R" ? "Right" : "Left"}-handed${d.revBand ? ` \xB7 ${d.revBand}` : ""}`, 80, 300, 34, "#c9d4ee", 600);
    const rows2 = d.rows.slice(0, 12);
    const top = 370;
    const rowH = Math.min(78, (H3 - top - 150) / Math.max(1, rows2.length));
    rows2.forEach((r, i) => {
      const y = top + i * rowH;
      g.fillStyle = i % 2 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.07)";
      rounded(g, 60, y, W2 - 120, rowH - 10, 18);
      g.fill();
      text(r.label, 90, y + rowH / 2 + 8, 34, "#c9d4ee", 700);
      text(r.value, W2 - 250, y + rowH / 2 + 10, 40, "#fff", 900, "right");
      text(r.source, W2 - 90, y + rowH / 2 + 8, 22, r.source === "measured" ? "#5affb0" : r.source === "entered" ? "#46e6ff" : "#ffd25a", 800, "right");
    });
    text(`${d.shots} tracked shots \xB7 measured with one phone camera, so treat as estimates`, W2 / 2, H3 - 70, 24, "#8a97b2", 600, "center");
    return c;
  }
  async function dnaCardFile(d) {
    if (!d.rows.length) return "Bowl a few tracked shots first: the card is built from your own numbers.";
    const blob = await new Promise((r) => drawDnaCard(d).toBlob((b) => r(b), "image/png"));
    return blob ? new File([blob], "laneiq-bowler-dna.png", { type: "image/png" }) : "Couldn't draw the card.";
  }

  // camera/coachhub.ts
  var median7 = (v) => {
    const s = [...v].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  var mean8 = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  var day2 = (iso) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
  var ballName3 = (id) => S.arsenal.find((b) => b.id === id)?.name ?? "unknown ball";
  var specLine2 = (b) => [b.rg && `RG ${b.rg.value}`, b.differential && `diff ${b.differential.value}`, b.coverstock?.value ?? b.coverstockType?.value, b.core?.value].filter(Boolean).join(" \xB7 ");
  var badge = (ok, text, warn = false) => `<span class="badge ${ok ? "good" : warn ? "low" : "moderate"}">${esc(text)}</span>`;
  function lastSession(shots) {
    const last = shots[shots.length - 1];
    return last ? shots.filter((s) => s.sessionId === last.sessionId) : [];
  }
  function bodySummary(shots) {
    const bodies = shots.map((s) => s.body).filter((b) => !!b);
    const withClip = shots.filter((s) => s.hasClip && !s.body).slice(-10);
    const steps = bodies.map((b) => b.steps).filter((x) => x !== null);
    const drift = bodies.map((b) => b.driftBoards).filter((x) => x !== null);
    const timing = bodies.map((b) => b.timing?.label).filter(Boolean);
    const held = bodies.map((b) => b.posted).filter((x) => x !== null);
    const lay = bodies.map((b) => b.laydownBoards).filter((x) => x !== null);
    const pts = [];
    if (steps.length) pts.push(`Steps: ${median7(steps)} (over ${steps.length} shots${new Set(steps).size > 1 ? `; it varies from ${Math.min(...steps)} to ${Math.max(...steps)}` : ""}).`);
    if (drift.length) {
      const m = mean8(drift);
      const sd3 = drift.length > 1 ? Math.sqrt(drift.reduce((a, b) => a + (b - m) ** 2, 0) / (drift.length - 1)) : 0;
      pts.push(`Drift: ${Math.abs(m) < 1 ? "you walk straight on average" : `${Math.abs(m).toFixed(1)} boards ${m > 0 ? "left" : "right"} on average`}, give or take ${sd3.toFixed(1)}.${Math.abs(m) >= 2 ? " Some drift is fine if it's the same every time; start that much to the other side, or walk at your target." : ""}`);
    }
    if (timing.length) {
      const c = (l) => timing.filter((t) => t === l).length;
      pts.push(`Timing: on time ${c("on time")}, early ${c("early")}, late ${c("late")} of ${timing.length}.`);
    }
    if (held.length) pts.push(`Held the finish on ${held.filter(Boolean).length} of ${held.length} shots.`);
    if (lay.length) pts.push(`Ball lands about ${median7(lay).toFixed(0)} boards from your slide foot.`);
    return `<div class="card"><div class="lr-head" style="font-size:17px">${bodies.length ? `${bodies.length} approach${bodies.length === 1 ? "" : "es"} read` : "Your approach, read from your clips"}</div>
    ${pts.length ? `<ul>${pts.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : `<div class="u">A pose model on your phone reads the steps, timing, drift, laydown and finish from each shot's clip (filmed from behind). The first time, it downloads the model (a few MB); the clips never leave the phone.</div>`}
    <div class="chips"><button class="chip ${bodyAutoOn() ? "sel" : ""}" id="co-bodyauto">Read every new shot: ${bodyAutoOn() ? "on" : "off"}</button>${withClip.length ? `<button class="chip" id="co-bodyrun">Read my last ${withClip.length} clip${withClip.length === 1 ? "" : "s"}</button>` : ""}</div><div class="note" id="co-bodyprog"></div></div>`;
  }
  function drillsHtml(shots) {
    const run = S.drill;
    const speeds2 = shots.map((s) => s.m.launchSpeed).filter((x) => x !== null);
    const mph = speeds2.length ? Math.round(median7(speeds2) * 10) / 10 : 17;
    const arrows = shots.map((s) => s.m.arrowsBoard).filter((x) => x !== null);
    const board = S.target?.arrows ?? (arrows.length ? Math.round(median7(arrows)) : 10);
    return `${run ? `<div class="card"><div class="row"><div class="lr-head" style="font-size:16px">${esc(DRILLS2.find((d) => d.id === run.id).name)} under way</div>${badge(true, summarize2(run).text)}</div><div class="chips"><button class="chip" id="co-drillopen">Open</button></div></div>` : ""}
    ${DRILLS2.map((d) => {
      const pb = personalBest(S.drills, d.id);
      return `<div class="card"><div class="row"><div class="lr-head" style="font-size:16px">${esc(d.name)}</div>${pb ? badge(true, `best ${pb.made}/${pb.of}`) : ""}</div><div class="u">${esc(d.blurb)}</div>
        <div class="chips" style="align-items:center">${d.needs.includes("board") ? `<label class="note">Board <input data-board="${d.id}" inputmode="numeric" value="${board}" style="width:56px"></label>` : ""}${d.needs.includes("mph") ? `<label class="note">mph <input data-mph="${d.id}" inputmode="decimal" value="${mph}" style="width:62px"></label>` : ""}<button class="chip" data-start="${d.id}" ${run ? "disabled" : ""}>Start</button></div></div>`;
    }).join("")}
    <div class="note">Start a drill, then bowl with the camera running: every shot is scored by itself and the Live screen shows your count.</div>`;
  }
  function renderCoach(el, seg, wireSeg2) {
    const shots = insightShots();
    const hand3 = S.profile?.hand ?? "R";
    const miss = findMisses(shots);
    const exec = executionReport(shots);
    const sess = lastSession(shots);
    const move = adviseMove(sess, hand3, S.target, readLane(sess.map((x) => ({ a: x.a, ballId: x.ballId }))));
    const ownedKeys = new Set(S.arsenal.map((b) => b.catalogKey).filter(Boolean));
    const balls = adviseBalls(ownedBalls(), shots, S.catalog, ownedKeys);
    const carry = entryCarry(shots);
    const tired = fatigue(shots);
    const mems = laneMemories(S.shots);
    const one = exec.verdict === "execution" ? { title: exec.headline, body: exec.next } : miss.status === "ok" && miss.factors[0] ? { title: miss.headline, body: miss.factors[0].fix } : exec.verdict === "line" || move.kind === "move" ? { title: move.kind === "move" ? move.headline : exec.headline, body: move.kind === "move" ? move.why.slice(-2).join(" ") : exec.next } : null;
    el.innerHTML = `${seg}<h2>Coach</h2>
    <div class="note">Everything here comes from your own shots${S.insightsSince ? " since you reset Insights" : ""}: ${shots.length} tracked. Each card says what it's based on.</div>
    ${one ? `<div class="card" style="border-color:var(--cy)"><div class="k">Your one thing right now</div><div class="lr-head">${esc(one.title)}</div><div class="lr-next">${esc(one.body)}</div></div>` : ""}

    <h3>Miss Finder</h3>
    <div class="card"><div class="lr-head" style="font-size:17px">${esc(miss.headline)}</div>${miss.status === "ok" ? badge(true, `${miss.shotsUsed} shots seen to the pins`) : badge(false, `${miss.shotsUsed}/${miss.needed} shots`, true)}
      <div class="u" style="margin-top:6px">${esc(miss.summary)}</div>
      ${miss.factors.length ? `<table style="margin-top:8px">${miss.factors.map((f) => `<tr><td><b>${esc(f.label)}</b><div class="note">${esc(f.text)}</div><div class="u" style="margin-top:4px">${esc(f.fix)}</div></td><td class="n">${Math.round(f.explained * 100)}%</td></tr>`).join("")}</table><div class="note">The percentage is how much of the spread in where your ball meets the pins goes with that one thing. It goes with your misses; it doesn't prove it causes them, so treat the fix as a test.</div>` : ""}</div>

    <h3>Plan vs execution</h3>
    <div class="card"><div class="lr-head" style="font-size:17px">${esc(exec.headline)}</div>${exec.verdict === "insufficient" ? badge(false, `${exec.graded} planned shots`, true) : badge(exec.verdict === "good", exec.verdict === "execution" ? "aim" : exec.verdict === "line" ? "line" : exec.verdict === "good" ? "on track" : "mixed")}
      <ul>${exec.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul><div class="lr-next">${esc(exec.next)}</div>
      <div class="chips"><button class="chip" id="co-target">${S.target ? `Target: aim ${S.target.arrows}${S.target.stand !== void 0 ? ` from ${S.target.stand}` : ""}` : "Set my target"}</button></div></div>

    <h3>Move advisor</h3>
    <div class="card"><div class="lr-head" style="font-size:17px">${esc(move.headline)}</div><div class="note">${sess.length ? `From your latest session (${day2(sess[0].at)}, ${sess.length} shots).` : "Bowl a session first."}</div><ul>${move.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>

    <h3>Ball advisor</h3>
    <div class="card"><div class="lr-head" style="font-size:17px">${esc(balls.headline)}</div>
      ${balls.balls.map((b) => `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="row"><b>${esc(b.name)}</b>${badge(b.verdict === "good", b.verdict === "too-strong" ? "too strong" : b.verdict === "too-weak" ? "too weak" : b.verdict === "good" ? "fits you" : b.verdict === "need-shots" ? `${b.stats.shots} shots` : b.verdict === "no-specs" ? "no specs" : "no call yet", b.verdict === "need-shots")}</div>
        <div class="note">${b.stats.seen ? `${b.stats.seen} shots seen to the pins \xB7 ${b.stats.pocketPct !== null ? `${Math.round(b.stats.pocketPct)}% pocket` : ""}${b.stats.highPct !== null ? ` \xB7 ${Math.round(b.stats.highPct)}% high \xB7 ${Math.round(b.stats.lightPct)}% light` : ""}${b.stats.strikePct !== null ? ` \xB7 ${Math.round(b.stats.strikePct)}% strikes` : ""}` : ""}</div>
        <ul>${b.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
        ${b.owned ? `<div class="lr-next">You already own a ball close to what's wanted: try your <b>${esc(b.owned.name)}</b> first.</div>` : ""}
        ${b.buys.length ? `<div class="k" style="margin-top:6px">${b.verdict === "too-strong" ? "Cleaner" : "Stronger"} balls to look at</div>${b.buys.map((c) => `<div style="display:flex;gap:10px;margin-top:8px">${ballThumb(c.ball, 56)}<div style="flex:1;min-width:0"><b>${esc(c.ball.manufacturer)} ${esc(c.ball.name)}</b><div class="note">${esc(specLine2(c.ball))}${c.ball.releaseYear ? ` \xB7 ${c.ball.releaseYear.value}` : ""} \xB7 motion ${c.index.toFixed(2)} (want ${b.want.toFixed(2)})</div>${c.ball.rg ? `<div class="note">Specs: <a style="color:var(--cy)" href="${esc(c.ball.rg.source.url)}" target="_blank" rel="noopener">source</a>, ${esc(c.ball.rg.source.retrievedOn)}</div>` : ""}</div></div>`).join("")}` : ""}</div>`).join("") || `<div class="u">Add your balls in Arsenal and pick which one each shot was.</div>`}
      <div class="note">${balls.caveats.map(esc).join(" ")} Only current, USBC-approved balls from the last two years are suggested.</div></div>

    <h3>Body and approach</h3>
    ${bodySummary(shots)}

    <h3>Drills</h3>
    ${drillsHtml(shots)}

    <h3>Entry angle and carry</h3>
    <div class="card"><div class="lr-head" style="font-size:17px">${esc(carry.headline)}</div><ul>${carry.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>

    <h3>Through a session</h3>
    <div class="card"><div class="lr-head" style="font-size:17px">${esc(tired.headline)}</div><ul>${tired.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>

    <h3>Lane-pair memory</h3>
    <div class="card">${mems.length ? mems.slice(0, 8).map((m) => `<div style="padding:8px 0;border-top:1px solid var(--line)"><b>${esc(m.center)} \xB7 lanes ${esc(m.pair)}</b><div class="note">${m.sessions.length} session${m.sessions.length === 1 ? "" : "s"}, last ${esc(day2(m.sessions[0].date))}${m.best ? ` \xB7 best: ${m.best.stand !== null ? `stood ${m.best.stand.toFixed(0)}, ` : ""}${m.best.arrows !== null ? `arrows ${m.best.arrows.toFixed(0)}, ` : ""}${Math.round(m.best.pocketPct)}% pocket with the ${esc(m.best.ballIds.map(ballName3).join(", ") || "unknown ball")}` : ""}</div></div>`).join("") : `<div class="u">Type your centre and lane under Target on the Live screen. Next time you're on that pair, the app shows where you stood, what you aimed at and how it went.</div>`}</div>

    <h3>Share</h3>
    <div class="card"><div class="k">Bowler DNA card</div><div class="u">Your speed, rev rate, axis, PAP, entry angle, pocket and strike rate on one picture, each marked measured or entered. For your coach, your pro shop or your friends.</div><div class="chips"><button class="btn" id="co-dna">Make my card</button></div><div class="note" id="co-dna-note"></div></div>
    <div class="card"><div class="k">Highlight reel</div><div class="u">Your best shots from the latest session (strikes first, then pocket hits), each with its ball path, cut into one short vertical video you can share.</div><div class="chips"><button class="btn" id="co-reel" ${sess.some((s) => s.hasClip) ? "" : "disabled"}>Make my highlight reel</button></div><div class="note" id="co-reel-note">${sess.some((s) => s.hasClip) ? "" : "The latest session has no clips."}</div></div>`;
    wireSeg2();
    $("co-target").onclick = () => openTarget();
    $("co-bodyauto").onclick = () => {
      setBodyAuto(!bodyAutoOn());
      renderCoach(el, seg, wireSeg2);
    };
    document.getElementById("co-bodyrun")?.addEventListener("click", async () => {
      const list = shots.filter((s) => s.hasClip && !s.body && !bodyPending(s.id)).slice(-10);
      const note = $("co-bodyprog");
      let done2 = 0;
      for (const s of list) {
        await queueBody(s, { onProgress: (m) => note.textContent = `Clip ${done2 + 1} of ${list.length}: ${m}` });
        done2++;
      }
      renderCoach(el, seg, wireSeg2);
    });
    document.getElementById("co-drillopen")?.addEventListener("click", () => openDrillStatus());
    el.querySelectorAll("[data-start]").forEach(
      (b) => b.onclick = async () => {
        const id = b.dataset.start;
        const boardIn = el.querySelector(`[data-board="${id}"]`);
        const mphIn = el.querySelector(`[data-mph="${id}"]`);
        const board = boardIn ? parseFloat(boardIn.value) : void 0;
        const mph = mphIn ? parseFloat(mphIn.value) : void 0;
        S.drill = { id, startedAt: (/* @__PURE__ */ new Date()).toISOString(), hand: hand3, board: Number.isFinite(board) ? board : void 0, mph: Number.isFinite(mph) ? mph : void 0, results: [] };
        await saveCoach();
        renderCoach(el, seg, wireSeg2);
      }
    );
    $("co-dna").onclick = async () => {
      const best = balls.best;
      const sp = S.profile?.spin;
      const dna = bowlerDna(S.profile?.name ?? "Bowler", bowlerProfile(), shots, { pap: sp?.pap, bestBall: best ? best.name : void 0, spinSource: sp?.source === "video" ? "measured" : "entered" });
      const r = await dnaCardFile(dna);
      const box = $("co-dna-note");
      if (typeof r === "string") return void (box.textContent = r);
      const url = URL.createObjectURL(r);
      box.innerHTML = `<img src="${url}" alt="Your bowler DNA card" style="width:100%;max-width:360px;border-radius:14px;margin-top:10px;display:block"><div id="co-dna-share"></div>`;
      offerShare($("co-dna-share"), [r], { title: "My LaneIQ bowler DNA" });
    };
    $("co-reel").onclick = async () => {
      const btn = $("co-reel");
      const box = $("co-reel-note");
      btn.disabled = true;
      try {
        const r = await makeReel(sess, (m) => box.textContent = m);
        if (typeof r === "string") return void (box.textContent = r);
        box.innerHTML = `<video src="${URL.createObjectURL(r)}" controls playsinline muted style="width:100%;max-width:300px;border-radius:14px;margin-top:10px;display:block"></video><div class="note">${(r.size / 1e6).toFixed(1)} MB</div><div id="co-reel-share"></div>`;
        offerShare($("co-reel-share"), [r], { title: "My LaneIQ highlights" });
      } finally {
        btn.disabled = false;
      }
    };
  }

  // camera/tabs.ts
  var current3 = "live";
  function showTab(t) {
    current3 = t;
    document.querySelectorAll(".tab").forEach((el) => el.classList.toggle("on", el.id === `tab-${t}`));
    document.querySelectorAll(".tb").forEach((el) => el.classList.toggle("on", el.dataset.tab === t));
    window.scrollTo(0, 0);
    render2();
  }
  var learnQuery = "";
  var learnCat = "all";
  function showLearn(term) {
    learnQuery = term ?? "";
    learnCat = "all";
    showTab("learn");
  }
  function renderLearn() {
    const el = $("learn-page");
    const cats = ["all", ...Array.from(new Set(GLOSSARY.map((t) => t.cat)))];
    el.innerHTML = `<h2>Learn</h2>
    <div class="note">The bowling words LaneIQ uses, and exactly what each one means in the app. Lane sizes and markings follow the USBC Equipment Specifications; where coaches use a word in different ways, that is said.</div>
    <div class="field"><input id="ln-q" type="search" placeholder="Search a word (pocket, breakpoint, PAP...)" value="${esc(learnQuery)}" autocomplete="off"></div>
    <div class="chips" id="ln-cats">${cats.map((c) => `<button class="chip ${learnCat === c ? "sel" : ""}" data-c="${esc(c)}">${c === "all" ? "All" : esc(c)}</button>`).join("")}</div>
    <div id="ln-list"></div>`;
    const paint2 = () => {
      const q = learnQuery.trim().toLowerCase();
      const items = GLOSSARY.filter((t) => (learnCat === "all" || t.cat === learnCat) && (!q || t.term.toLowerCase().includes(q) || (t.aka ?? []).some((a) => a.toLowerCase().includes(q)) || t.def.toLowerCase().includes(q)));
      items.sort((a, b) => Number(b.term.toLowerCase() === q) - Number(a.term.toLowerCase() === q));
      $("ln-list").innerHTML = items.length ? items.map((t) => `<div class="card" style="margin-top:10px"><div class="k">${esc(t.cat)}</div><div class="lr-head" style="font-size:17px">${esc(t.term)}</div>${t.aka?.length ? `<div class="note">Also called: ${esc(t.aka.join(", "))}</div>` : ""}<div style="margin-top:6px;line-height:1.45">${esc(t.def)}</div>${t.app ? `<div class="note" style="margin-top:8px"><b>In LaneIQ:</b> ${esc(t.app)}</div>` : ""}</div>`).join("") : `<div class="note" style="margin-top:12px">No word matches that. Try a shorter search.</div>`;
    };
    paint2();
    $("ln-q").addEventListener("input", (e) => {
      learnQuery = e.target.value;
      paint2();
    });
    el.querySelectorAll("#ln-cats button").forEach(
      (b) => b.onclick = () => {
        learnCat = b.dataset.c ?? "all";
        renderLearn();
      }
    );
  }
  function initTabs() {
    document.querySelectorAll(".tb").forEach((b) => b.onclick = () => showTab(b.dataset.tab));
    $("avatar").onclick = () => showTab("me");
    onChange(() => {
      const p = S.profile;
      $("avatar").textContent = (p?.name?.[0] ?? "?").toUpperCase();
      render2();
    });
  }
  function render2() {
    if (current3 === "shots") renderShots();
    else if (current3 === "score") void renderScore();
    else if (current3 === "insights") renderInsights();
    else if (current3 === "arsenal") renderArsenal();
    else if (current3 === "proshop") renderProshop();
    else if (current3 === "learn") renderLearn();
    else if (current3 === "me") renderMe();
  }
  var ballName4 = (id) => S.arsenal.find((b) => b.id === id)?.name ?? "Unknown ball";
  var when2 = (iso) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  var ZONE = ZONE_LABEL;
  var pct3 = (n) => `${Math.round(n)}%`;
  function renderShots() {
    const el = $("shots-page");
    const list = [...S.shots].reverse().slice(0, 200);
    el.innerHTML = `<h2>Shots</h2><div class="chips"><button class="btn ghost" id="sh-share">Share a session</button><button class="btn ghost" id="sh-compare">Compare with a friend</button></div><div class="note">Every tracked shot is saved on this phone with its raw footage. Tap one to replay it, flip between the lane view and the raw video, and fix its ball or result.</div>` + (list.length ? "" : `<div class="card"><div class="u">No shots yet. Start the camera on the Live tab and bowl.</div></div>`) + list.map(
      (s) => `<div class="card shot" data-id="${s.id}"><div class="big">${s.a.speedMph.toFixed(1)}<small style="font-size:12px;color:var(--dim)"> mph</small></div><div style="flex:1"><div>${esc(when2(s.at))} \xB7 ${esc(ballName4(s.ballId))}</div><div>${s.m.zone ? `<span class="tag ${s.m.zone}">${ZONE[s.m.zone]}</span>` : ""}${s.result ? `<span class="tag ${s.result.pinsDown === 10 ? "strike" : ""}">${s.result.pinsDown === 10 ? "Strike" : s.result.pinsDown + " pins"}</span>` : `<span class="tag">no result</span>`}${s.hasClip ? `<span class="tag">video</span>` : ""}<span class="tag">entry ${f1(s.a.entryBoard)}</span></div></div></div>`
    ).join("");
    $("sh-share").onclick = openShareSession;
    $("sh-compare").onclick = () => openCompare();
    el.querySelectorAll(".shot").forEach((c) => c.onclick = () => openReview(S.shots.find((s) => s.id === c.dataset.id)));
  }
  var reviewUrl = null;
  var reviewRaf = 0;
  var review3d = null;
  var play3dRaf = 0;
  function closeReview() {
    reviewShotId = "";
    cancelAnimationFrame(reviewRaf);
    cancelAnimationFrame(play3dRaf);
    review3d?.destroy();
    review3d = null;
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    reviewUrl = null;
    $("review").classList.remove("on");
    $("review").innerHTML = "";
  }
  var reviewShotId = "";
  async function openReview(s) {
    const el = $("review");
    el.classList.add("on");
    const stored = s.hasClip ? await loadClip(s.id) : void 0;
    const clip = stored ? stored.type ? stored : new Blob([stored], { type: "video/mp4" }) : void 0;
    reviewUrl = clip ? URL.createObjectURL(clip) : null;
    const canOverlay = s.cal.length === 4;
    let modeSel = clip && canOverlay ? "lane" : "top";
    el.innerHTML = `
    <div class="row"><h2>${esc(when2(s.at))}</h2><button class="btn ghost" id="rv-close">Close</button></div>
    <div class="note">${esc(ballName4(s.ballId))} \xB7 ${s.a.speedMph.toFixed(1)} mph \xB7 ${s.a.entryMeasured ? `entry board ${f1(s.a.entryBoard)}` : s.a.lastSeen ? `last seen on board ${f1(s.a.lastSeen.board)}, ${s.a.lastSeen.ft.toFixed(0)} ft down` : "entry board not seen"}${s.m.zone ? ` \xB7 ${esc(zoneText(s.m.zone, s.m.pocketMiss, s.m.hand))}` : " \xB7 hit not judged (the ball was not seen reaching the pins)"} \xB7 ${s.m.hand === "L" ? "left-handed: pocket 1-2" : "right-handed: pocket 1-3"} <a href="#" data-learn="${s.m.zone ? ZONE_LABEL[s.m.zone] : "Pocket"}">what is this?</a></div>
    <div class="chips" id="rv-modes">
      ${clip && canOverlay ? `<button class="chip ${modeSel === "lane" ? "sel" : ""}" data-m="lane">Lane view</button>` : ""}
      ${clip ? `<button class="chip ${modeSel === "raw" ? "sel" : ""}" data-m="raw">Raw footage</button>` : ""}
      <button class="chip ${modeSel === "top" ? "sel" : ""}" data-m="top">Top-down</button>
      <button class="chip" data-m="3d">3D</button>
    </div>
    ${clip ? `<div class="stagebox" id="rv-video"><video id="rv-v" src="${reviewUrl}" playsinline controls muted></video><canvas class="ov" id="rv-ov" width="${s.vw}" height="${s.vh}"></canvas></div>` : `<div class="note">${s.hasClip ? "The video clip couldn't be loaded." : "No video was saved for this shot (the browser may not support recording)."}</div>`}
    <div class="stagebox" id="rv-top" style="display:none"><canvas id="rv-topc" width="360" height="600" style="width:100%;height:auto;aspect-ratio:360/600"></canvas></div>
    <div id="rv-3d" style="display:none"><div class="stagebox"><div id="rv-3d-host" style="position:relative;width:100%;aspect-ratio:4/3"></div></div><div class="chips"><button class="chip" id="rv-replay">Replay shot in 3D</button></div></div>
    <h3>Metrics</h3>
    <div class="card"><table>${FEATURES.map((f) => ({ f, v: s.m[f.key] })).filter((x) => typeof x.v === "number").map(({ f, v }) => `<tr><td>${esc(f.label)}</td><td class="n">${v.toFixed(f.unit === "\xB0" || f.unit === "mph" || f.unit === "ft" ? 1 : 1)} ${esc(f.unit)}</td></tr>`).join("")}</table></div>
    ${clip ? `<div class="chips"><button class="btn ghost" id="rv-compare">Side by side with another shot</button></div>` : ""}
    ${s.plan ? `<h3>Target</h3><div class="card"><div class="u">${(() => {
      const g = gradeShot(s, s.plan);
      return `Aimed at board ${s.plan.arrows} at the arrows${s.plan.stand !== void 0 ? ` from ${s.plan.stand}` : ""}: ${!g || g.markOff === null ? "the arrows board wasn't measured" : g.hitMark ? "hit the mark" : `missed by ${Math.abs(g.markOff).toFixed(1)} boards ${g.markOff > 0 ? "left" : "right"}`}${g?.breakOff !== null && g?.breakOff !== void 0 ? `; broke ${Math.abs(g.breakOff).toFixed(1)} boards ${g.breakOff > 0 ? "left" : "right"} of where you wanted` : ""}.`;
    })()}</div></div>` : ""}
    <h3>Body and approach</h3>
    <div id="rv-body"></div>
    <h3>Spin</h3>
    <div id="rv-spin"></div>
    <h3>Result</h3>
    <div class="chips">${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((n) => `<button class="chip ${s.result?.pinsDown === n ? "sel" : n === 10 ? "x" : ""}" data-n="${n}">${n === 10 ? "Strike" : n}</button>`).join("")}</div>
    <h3>Ball</h3>
    <div class="chips">${S.arsenal.map((b) => `<button class="chip ${s.ballId === b.id ? "sel" : ""}" data-b="${b.id}">${esc(b.name)}</button>`).join("") || `<span class="note">Add balls in the Arsenal tab.</span>`}</div>
    <div class="chips"><button class="btn ghost danger" id="rv-del">Delete this shot</button></div>`;
    el.querySelectorAll("a[data-learn]").forEach(
      (a) => a.onclick = (e) => {
        e.preventDefault();
        closeReview();
        showLearn(a.dataset.learn);
      }
    );
    const paintSpin = (state) => {
      const box = document.getElementById("rv-spin");
      if (!box || reviewShotId !== s.id) return;
      box.innerHTML = spinCardHtml(s.spin, state) + (clip ? `<div class="chips"><button class="btn ghost" id="rv-respin" ${state === "running" ? "disabled" : ""}>Measure the spin again</button></div><div class="note" id="rv-spinprog"></div>` : "");
      document.getElementById("rv-respin")?.addEventListener("click", () => runSpin(true));
      box.querySelector("[data-act=slowmo]")?.addEventListener("click", () => openSpinLab(() => {
      }));
    };
    const runSpin = (force) => {
      paintSpin("running");
      void queueSpin(s, { force, onProgress: (m) => {
        const el2 = document.getElementById("rv-spinprog");
        if (el2 && reviewShotId === s.id) el2.textContent = m;
      } }).then(() => paintSpin("idle"));
    };
    const paintBody = (running, msg = "") => {
      const box = document.getElementById("rv-body");
      if (!box || reviewShotId !== s.id) return;
      const lines = s.body ? describeBody(s.body, S.profile?.hand ?? "R") : [];
      box.innerHTML = `<div class="card">${s.body ? (lines.length ? `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : `<div class="u">The bowler wasn't followed clearly enough in this clip.</div>`) + (s.body.notes.length ? `<div class="note">${esc(s.body.notes.join(" "))}</div>` : "") + `<div class="note">Seen clearly in ${Math.round(s.body.quality * 100)}% of the approach. From behind, forward lean and loft can't be seen, so they aren't measured.</div>` : `<div class="u">${clip ? "Steps, timing, drift, where the ball lands next to your slide foot, and whether you held your finish, read from this clip by a pose model that runs on your phone. The first time, the model (a few MB) is downloaded; the clip never leaves the phone." : "This shot has no clip to read."}</div>`}
      ${clip ? `<div class="chips"><button class="btn ${s.body ? "ghost" : ""}" id="rv-readbody" ${running ? "disabled" : ""}>${running ? "Reading\u2026" : s.body ? "Read it again" : "Read my approach"}</button></div>` : ""}<div class="note" id="rv-bodyprog">${esc(msg)}</div></div>`;
      document.getElementById("rv-readbody")?.addEventListener("click", () => {
        paintBody(true);
        void queueBody(s, { force: !!s.body, onProgress: (m) => {
          const p = document.getElementById("rv-bodyprog");
          if (p && reviewShotId === s.id) p.textContent = m;
        } }).then((b) => paintBody(false, b ? "" : "Couldn't read this clip."));
      });
    };
    reviewShotId = s.id;
    paintBody(bodyPending(s.id));
    document.getElementById("rv-compare")?.addEventListener("click", () => void openCompare2(s));
    const player = document.getElementById("rv-v");
    if (player) {
      player.addEventListener("error", () => {
        const err = player.error;
        logTrack("replay failed", { code: err?.code ?? null, message: err?.message ?? null, type: clip?.type ?? null, bytes: clip?.size ?? 0 });
        const note = document.createElement("div");
        note.className = "note";
        note.textContent = `This clip would not play (${err?.message || "error " + (err?.code ?? "?")}, ${clip ? Math.round(clip.size / 1024) + " KB" : "no data"}). It is kept; Copy diagnostics in the Me tab has the details.`;
        player.insertAdjacentElement("afterend", note);
      });
    }
    if (s.spin || !clip) paintSpin("idle");
    else {
      paintSpin("idle");
      player?.addEventListener("ended", () => runSpin(false), { once: true });
    }
    const topc = $("rv-topc");
    const drawTop = () => {
      const others = S.shots.filter((x) => x.id !== s.id && x.ballId === s.ballId).slice(-25).map((x) => ({ path: x.path, color: "rgba(255,255,255,.35)", width: 1.2, alpha: 0.5 }));
      drawTopDown(topc.getContext("2d"), 360, 600, [...others, { path: s.path, color: ramp(0.7), width: 3.5 }], { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
    };
    const endT = s.path[s.path.length - 1]?.t ?? 0;
    const paths3D = (ballAt) => [
      ...S.shots.filter((x) => x.id !== s.id && x.ballId === s.ballId).slice(-15).map((x) => ({ path: x.path, color: "rgba(255,255,255,.35)", width: 1.5, alpha: 0.5 })),
      { path: s.path, color: "ramp", width: 4, ballAt }
    ];
    const show3D = () => {
      if (!review3d) review3d = mount3D($("rv-3d-host"));
      review3d.setPaths(paths3D(endT));
    };
    const replay3D = () => {
      cancelAnimationFrame(play3dRaf);
      const t0 = performance.now();
      const tick = () => {
        const t = (performance.now() - t0) / 1e3;
        review3d?.setPaths(paths3D(Math.min(t, endT)));
        if (t < endT) play3dRaf = requestAnimationFrame(tick);
      };
      tick();
    };
    const apply2 = () => {
      $("rv-top").style.display = modeSel === "top" ? "block" : "none";
      $("rv-3d").style.display = modeSel === "3d" ? "block" : "none";
      if (clip) $("rv-video").style.display = modeSel === "top" || modeSel === "3d" ? "none" : "block";
      $("rv-ov")?.classList.toggle("hide", modeSel !== "lane");
      el.querySelectorAll("#rv-modes .chip").forEach((c) => c.classList.toggle("sel", c.dataset.m === modeSel));
      if (modeSel === "top") drawTop();
      if (modeSel === "3d") show3D();
    };
    el.querySelectorAll("#rv-modes .chip").forEach((c) => c.onclick = () => (modeSel = c.dataset.m, apply2()));
    apply2();
    if (clip && canOverlay) {
      const v = $("rv-v");
      const cv = $("rv-ov");
      const cx = cv.getContext("2d");
      const Hinv2 = solveHomography([{ x: 0, y: 0 }, { x: LANE_BOARDS, y: 0 }, { x: LANE_BOARDS, y: LANE_LENGTH_FT }, { x: 0, y: LANE_LENGTH_FT }], s.cal);
      const P = (x, y) => applyHomography(Hinv2, { x, y });
      const view3 = { ctx: cx, width: s.vw, P };
      const last = s.path[s.path.length - 1]?.t ?? 0;
      const loop = () => {
        cx.clearRect(0, 0, s.vw, s.vh);
        if (modeSel === "lane") {
          drawLaneGrid(view3);
          const t = v.currentTime + s.recStartT;
          const upto = s.path.filter((p) => p.t <= t).map((p) => P(p.x, p.y));
          strokeTrail(view3, upto, 1, t < last);
          if (t >= last) drawShotMarkers(view3, s.a);
        }
        reviewRaf = requestAnimationFrame(loop);
      };
      loop();
    }
    $("rv-replay").onclick = replay3D;
    $("rv-close").onclick = closeReview;
    $("rv-del").onclick = async () => {
      if (confirm("Delete this shot and its video?")) {
        await removeShot(s.id);
        closeReview();
      }
    };
    el.querySelectorAll("button[data-n]").forEach((b) => b.onclick = async () => (s.result = { pinsDown: Number(b.dataset.n) }, await updateShot(s), openReview(s)));
    el.querySelectorAll("button[data-b]").forEach(
      (b) => b.onclick = async () => {
        s.ballId = b.dataset.b;
        const ball = S.arsenal.find((x) => x.id === b.dataset.b);
        if (ball && s.sig) ball.exemplars = [...ball.exemplars, s.sig].slice(-12);
        await Promise.all([saveArsenal(), updateShot(s)]);
        openReview(s);
      }
    );
  }
  var STATE_PLAN_RECENT = 15;
  var resetCardHtml = () => `<h3>Reset</h3><div class="card"><div class="u">Start Insights again from zero: the averages, common errors, improvement plan, shot map and skills chart. Your shots and their videos stay in the Shots tab, and your scorecards stay in Score. Use this when somebody else has bowled on your app.</div><div class="chips"><button class="btn ghost danger" id="ins-reset">Reset insights</button></div></div>`;
  function wireReset() {
    $("ins-reset")?.addEventListener("click", async () => {
      if (!confirm("Reset Insights?\n\nThis starts your averages, common errors, improvement plan, shot map and skills chart again from zero.\n\nYour shots and their videos stay in the Shots tab. Your scorecards stay in Score.")) return;
      await resetInsights();
    });
  }
  var insView = "coach";
  var segHtml = () => `<div class="chips" id="ins-seg" style="margin:0 0 4px"><button class="chip ${insView === "coach" ? "sel" : ""}" data-v="coach">Coach</button><button class="chip ${insView === "stats" ? "sel" : ""}" data-v="stats">My numbers</button></div>`;
  function wireSeg() {
    $("insights-page").querySelectorAll("#ins-seg [data-v]").forEach(
      (b) => b.onclick = () => {
        insView = b.dataset.v;
        renderInsights();
        window.scrollTo(0, 0);
      }
    );
  }
  function renderInsights() {
    if (insView === "coach") return renderCoach($("insights-page"), segHtml(), wireSeg);
    renderInsightsBody();
    $("insights-page").insertAdjacentHTML("afterbegin", segHtml());
    wireSeg();
    void mountSkills($("insights-page"));
  }
  function renderInsightsBody() {
    const el = $("insights-page");
    const mine = insightShots();
    const shots = mine;
    if (!shots.length) {
      el.innerHTML = `<h2>My numbers</h2><div class="card"><div class="u">${S.insightsSince ? `Insights were reset on ${esc(when2(S.insightsSince))}. They start again from the next shot you bowl. Your earlier shots and their videos are still in the Shots tab.` : "Bowl a few shots first. Your averages, common errors and improvement plan build up here, and everything stays on this phone."}</div>${S.insightsSince ? `<div class="chips"><button class="btn ghost" id="ins-restore">Count my earlier shots again</button></div>` : ""}</div>${resetCardHtml()}`;
      $("ins-restore")?.addEventListener("click", () => void restoreInsights());
      wireReset();
      return;
    }
    const p = computeProfile(shots);
    const issues = findIssues(shots, S.profile?.quiz?.focus ?? []);
    const sessions = [...new Set(mine.map((s) => s.sessionId))];
    const zoneTotal = Object.values(p.zones).reduce((a, b) => a + b, 0) || 1;
    const zoneColor = { pocket: "#5affb0", high: "#ffd25a", light: "#ffd25a", "very-high": "#ff5a6e", "very-light": "#ff5a6e" };
    const sessionRows = sessions.map((id) => {
      const g = mine.filter((s) => s.sessionId === id);
      const pp = computeProfile(g);
      const inPocket = g.filter((s) => s.m.pocketMiss !== null && Math.abs(s.m.pocketMiss) <= 1).length / (g.filter((s) => s.m.pocketMiss !== null).length || 1);
      return `<tr><td>${esc(when2(g[0].at))}</td><td class="n">${g.length}</td><td class="n">${pp.stats.launchSpeed ? pp.stats.launchSpeed.mean.toFixed(1) : "-"}</td><td class="n">${pct3(inPocket * 100)}</td><td class="n">${pp.strike.rate === null ? "-" : pct3(pp.strike.rate * 100)}</td></tr>`;
    }).reverse().join("");
    const ballIds = [...new Set(mine.map((s) => s.ballId).filter(Boolean))];
    const ballRows = ballIds.map((id) => {
      const g = mine.filter((s) => s.ballId === id);
      const pp = computeProfile(g);
      return `<tr><td>${esc(ballName4(id))}</td><td class="n">${g.length}</td><td class="n">${pp.stats.launchSpeed ? pp.stats.launchSpeed.mean.toFixed(1) : "-"}</td><td class="n">${pp.stats.entryAngle ? pp.stats.entryAngle.mean.toFixed(1) + "\xB0" : "-"}</td><td class="n">${pp.strike.rate === null ? "-" : pct3(pp.strike.rate * 100)}</td></tr>`;
    }).join("");
    const needMore = Math.max(0, MIN_OUTCOMES - p.withResults);
    el.innerHTML = `
    <h2>My numbers</h2>
    <div class="grid">
      <div class="card"><div class="k">Shots tracked</div><div class="v">${p.shots}</div><div class="u">${sessions.length} session${sessions.length === 1 ? "" : "s"}</div></div>
      <div class="card"><div class="k">Strike rate</div><div class="v">${p.strike.rate === null ? "--" : pct3(p.strike.rate * 100)}</div><div class="u">${p.strike.attempts} shots with results${p.strike.attempts && !p.strike.sufficient ? ", low sample" : ""}</div></div>
      <div class="card"><div class="k">In the pocket</div><div class="v">${(() => {
      const m = mine.filter((s) => s.m.pocketMiss !== null);
      return m.length ? pct3(m.filter((s) => Math.abs(s.m.pocketMiss) <= 1).length / m.length * 100) : "--";
    })()}</div><div class="u">within 1 board</div></div>
    </div>

    <h3>Common errors</h3>
    ${issues.length ? issues.map((i) => `<div class="card"><div class="row"><div class="lr-head" style="font-size:16px">${esc(i.title)}</div><span class="badge ${i.confidence}">${i.confidence}${i.impactPts !== null ? ` \xB7 ${i.impactPts} pts` : ""}${i.flagged ? " \xB7 you flagged this" : ""}</span></div><div class="u" style="margin-top:6px">${esc(i.detail)}</div><ul>${i.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`).join("") : `<div class="card"><div class="u">${needMore > 0 ? `Enter the pin count after ${needMore} more shots so I can connect your habits to strikes. Until then I can still flag consistency problems once there are 8 or more tracked shots.` : "No clear problems found yet. Keep bowling and I'll keep checking."}</div></div>`}

    <h3>Improvement plan</h3>
    <div id="plan-box"></div>

    <h3>Where you enter the pocket</h3>
    <div class="card"><div class="bar">${Object.entries(p.zones).map(([z, n]) => `<i style="width:${n / zoneTotal * 100}%;background:${zoneColor[z]}" title="${z}"></i>`).join("")}</div><div class="chips">${Object.entries(p.zones).map(([z, n]) => `<span class="tag ${z}">${ZONE[z]} ${pct3(n / zoneTotal * 100)}</span>`).join("")}</div></div>

    <h3>Shot map</h3>
    <div class="card"><canvas id="ins-map" width="360" height="600" style="width:100%;height:auto;aspect-ratio:360/600"></canvas><div class="note">Green lines are strikes, red lines are shots that left pins, white lines have no result yet. The dashed green line is the pocket.</div></div>

    <h3>My averages (saved baseline)</h3>
    <div class="card"><table><tr><th>Metric</th><th class="n">Average</th><th class="n">\xB1 Spread</th><th class="n">Shots</th></tr>${FEATURES.filter((f) => p.stats[f.key]).map((f) => `<tr><td>${esc(f.label)}</td><td class="n">${p.stats[f.key].mean.toFixed(1)} ${esc(f.unit)}</td><td class="n">${p.stats[f.key].sd.toFixed(1)}</td><td class="n">${p.stats[f.key].n}</td></tr>`).join("")}</table></div>

    ${ballRows ? `<h3>By ball</h3><div class="card"><table><tr><th>Ball</th><th class="n">Shots</th><th class="n">Speed</th><th class="n">Entry</th><th class="n">Strikes</th></tr>${ballRows}</table></div>` : ""}
    <h3>Sessions</h3>
    <div class="card"><table><tr><th>Date</th><th class="n">Shots</th><th class="n">mph</th><th class="n">Pocket</th><th class="n">Strikes</th></tr>${sessionRows}</table></div>
    ${resetCardHtml()}`;
    wireReset();
    const map = $("ins-map");
    const paths = mine.slice(-80).map((s) => ({ path: s.path, color: !s.result ? "rgba(255,255,255,.4)" : s.result.pinsDown === 10 ? "rgba(90,255,176,.7)" : "rgba(255,90,110,.6)", width: 1.4, alpha: 0.75 }));
    drawTopDown(map.getContext("2d"), 360, 600, paths, { board: S.profile?.hand === "L" ? 22.5 : 17.5 });
    const box = $("plan-box");
    const plan = S.plan;
    if (!plan) {
      box.innerHTML = `<div class="card"><div class="u">${issues.length ? "Build a plan from the problems above: specific targets, a drill for each, and progress tracked against your saved baseline." : "Nothing to build a plan from yet. I need a few more tracked shots or results."}</div>${issues.length ? `<div class="chips"><button class="btn" id="plan-make">Create my plan</button></div>` : ""}</div>`;
      $("plan-make")?.addEventListener("click", async () => {
        S.plan = buildPlan(shots, issues, /* @__PURE__ */ new Date(), S.profile?.quiz?.style);
        await savePlan();
      });
      return;
    }
    const after = mine.filter((s) => s.at > plan.createdAt).slice(-STATE_PLAN_RECENT);
    const prog = planProgress(plan, after);
    box.innerHTML = `<div class="note">Plan made ${esc(when2(plan.createdAt))} from ${plan.basedOnShots} shots. Progress uses your shots since then (needs 5 or more).</div>` + prog.map(
      ({ item, current: current4, progress: progress2, met }) => `<div class="card"><div class="row"><div class="lr-head" style="font-size:16px">${esc(item.title)}</div><span class="badge ${met ? "good" : "moderate"}">${met ? "target met" : "in progress"}</span></div>
      <div class="u">Baseline ${item.baseline} \u2192 target ${item.target} ${esc(item.unit)} \xB7 now ${current4 === null ? "need 5+ new shots" : current4}</div>
      <div class="prog"><i style="width:${Math.round((progress2 ?? 0) * 100)}%"></i></div>
      <div class="lr-next">Drill: ${esc(item.drill)}</div></div>`
    ).join("") + `<div class="chips"><button class="btn ghost" id="plan-redo">Rebuild plan from all shots</button></div>`;
    $("plan-redo").onclick = async () => {
      S.plan = buildPlan(shots, findIssues(shots, S.profile?.quiz?.focus ?? []), /* @__PURE__ */ new Date(), S.profile?.quiz?.style);
      await savePlan();
    };
  }
  var selPattern = "";
  var custom = { len: 39, vol: 24, ratio: 3, name: "" };
  try {
    custom = { ...custom, ...JSON.parse(localStorage.getItem("laneiq.customPattern") ?? "{}") };
  } catch {
  }
  var showOlder = false;
  var srcWord = (kind2) => kind2 === "manufacturer" ? "manufacturer page" : kind2 === "retailer" ? "retailer's announcement" : kind2 === "reviewer" ? "review site" : kind2;
  var selSeries = "";
  var patFind = "";
  function patOptions() {
    const q = patFind.trim().toLowerCase();
    const shown = S.patterns.filter((p) => p.key === selPattern || (!selSeries || p.series === selSeries) && (!q || `${p.name} ${p.series ?? ""} ${p.lengthFt}`.toLowerCase().includes(q)));
    const label2 = (p) => `${p.name}${p.series && !p.name.toLowerCase().includes(p.series.toLowerCase()) ? " \xB7 " + p.series : ""} \xB7 ${p.lengthFt} ft`;
    return `<option value="">Custom (enter from the center's sheet)</option>` + shown.sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${esc(p.key)}" ${p.key === selPattern ? "selected" : ""}>${esc(label2(p))}</option>`).join("") + (shown.length === 0 ? `<option disabled>No patterns match</option>` : "");
  }
  function currentPattern() {
    const found = S.patterns.find((p) => p.key === selPattern);
    return found ?? customPattern(custom.len, custom.vol || void 0, custom.ratio || void 0, custom.name || "Custom pattern");
  }
  function renderArsenal() {
    const el = $("arsenal-page");
    const owned = ownedBalls();
    const pat = currentPattern();
    const bowler = bowlerProfile();
    const lineup = buildLineup(pat, bowler, owned);
    const ownedKeys = new Set(S.arsenal.map((b) => b.catalogKey).filter(Boolean));
    el.innerHTML = `
    <h2>Arsenal</h2>
    <h3>My balls</h3>
    <div class="note">${S.demo ? "Demo mode: balls here are not saved." : S.profile ? `Saved automatically to ${esc(S.profile.name)}'s profile on this phone (${S.arsenal.length} ball${S.arsenal.length === 1 ? "" : "s"}). Lineups and next-ball picks use these.` : ""}</div>
    ${S.arsenal.length ? "" : `<div class="card"><div class="u">No balls yet. Add them here or from the Live tab (where you can also show each ball to the camera so it recognizes it).</div></div>`}
    ${S.arsenal.map((b) => {
      const o = owned.find((x) => x.id === b.id);
      const spec = o.specs;
      const idx = spec ? motionIndex(spec) : null;
      return `<div class="card" data-ball="${b.id}"><div class="row"><div class="lr-head" style="font-size:16px">${esc(b.name)}</div><span class="badge ${spec ? "good" : "tentative"}">${spec ? b.catalogKey ? "catalog specs" : "your specs" : "no specs"}</span></div>
          <div class="u">${b.exemplars.length} look${b.exemplars.length === 1 ? "" : "s"} learned${idx !== null ? ` \xB7 motion index ${idx.toFixed(2)}` : ""}${o.observed ? ` \xB7 ${o.observed.shots} shots, ${f1(o.observed.entryAngle)}\xB0 entry, breakpoint ${f1(o.observed.breakpointFt, 0)} ft` : ""}</div>
          ${b.catalogKey ? "" : `<div class="two"><div class="field"><label>RG</label><input data-f="rg" inputmode="decimal" value="${b.rg ?? ""}" placeholder="2.50"></div><div class="field"><label>Differential</label><input data-f="diff" inputmode="decimal" value="${b.diff ?? ""}" placeholder="0.045"></div></div>
          <div class="field"><label>Cover</label><select data-f="cover"><option value="">choose\u2026</option>${["solid", "hybrid", "pearl", "urethane", "plastic"].map((c) => `<option ${b.cover === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>`}
          <div class="chips">${b.catalogKey ? "" : `<button class="chip" data-act="save">Save specs</button>`}<button class="chip danger" data-act="del">Remove</button></div></div>`;
    }).join("")}
    <div class="card"><div class="k">Add a ball</div><div class="chips"><input id="ab-name" class="ballinput" placeholder="${S.catalog.length ? `Search ${S.catalog.length} catalog balls or type a name` : "Ball name"}"><button class="chip add" id="ab-add">+ Add</button><button class="chip add" id="ab-scan">+ Scan a ball (photo)</button></div></div>

    <h3>Build my arsenal for a pattern</h3>
    <div class="card">
      <div class="field"><label>Oil pattern (${S.patterns.length} in the library)</label>
        ${S.patterns.length > 12 ? `<div class="two"><select id="pat-series"><option value="">All groups</option>${[...new Set(S.patterns.map((p) => p.series).filter(Boolean))].sort().map((s) => `<option ${s === selSeries ? "selected" : ""}>${esc(s)}</option>`).join("")}</select><input id="pat-find" placeholder="Search (name, length)" value="${esc(patFind)}" autocomplete="off"></div>` : ""}
        <select id="pat-sel">${patOptions()}</select></div>
      ${selPattern ? "" : `<div class="two"><div class="field"><label>Length (ft)</label><input id="cp-len" inputmode="decimal" value="${custom.len}"></div><div class="field"><label>Volume (mL)</label><input id="cp-vol" inputmode="decimal" value="${custom.vol}"></div></div><div class="field"><label>Ratio (the first number of N:1)</label><input id="cp-ratio" inputmode="decimal" value="${custom.ratio}"></div>`}
      <div class="u">${lengthClass(pat.lengthFt)} pattern${pat.ratio !== void 0 ? ` \xB7 ${pat.ratio}:1 ratio, ${isSportRatio(pat.ratio) ? `within the ${SPORT_RATIO_LIMIT}:1 sport limit` : `above the ${SPORT_RATIO_LIMIT}:1 sport limit`}` : ""}${pat.volumeMl !== void 0 ? ` \xB7 ${pat.volumeMl} mL` : ""}</div>
      ${pat.source.kind === "user" ? "" : `<div class="note">Source: <a style="color:var(--cy)" href="${esc(pat.source.url)}" target="_blank" rel="noopener">${esc(pat.source.kind)}</a>, retrieved ${esc(pat.source.retrievedOn)}.${pat.note ? " " + esc(pat.note) : ""}</div>`}
      ${S.patterns.length ? "" : `<div class="note">The pattern library is empty. Enter any pattern from the center's sheet above, or import more with tools/import-patterns.ts.</div>`}
    </div>
    <div id="lineup"></div>`;
    el.querySelectorAll("[data-ball]").forEach((card) => {
      const b = S.arsenal.find((x) => x.id === card.dataset.ball);
      card.querySelector("[data-act=save]")?.addEventListener("click", async () => {
        const num3 = (f) => parseFloat(card.querySelector(`[data-f=${f}]`).value);
        const rg = num3("rg");
        const diff = num3("diff");
        b.rg = Number.isFinite(rg) ? rg : void 0;
        b.diff = Number.isFinite(diff) ? diff : void 0;
        b.cover = card.querySelector("[data-f=cover]").value || void 0;
        await saveArsenal();
      });
      card.querySelector("[data-act=del]")?.addEventListener("click", async () => {
        if (confirm(`Remove ${b.name} from your arsenal?`)) {
          S.arsenal = S.arsenal.filter((x) => x.id !== b.id);
          await saveArsenal();
        }
      });
    });
    attachSuggest($("ab-name"));
    $("ab-scan").onclick = () => openScanLab(() => renderArsenal());
    $("ab-add").onclick = async () => {
      const n = $("ab-name").value.trim();
      if (!n) return;
      const hit = S.catalog.find((c) => `${c.manufacturer} ${c.name}`.toLowerCase() === n.toLowerCase());
      S.arsenal.push({ id: Math.random().toString(36).slice(2, 9), name: n, exemplars: [], catalogKey: hit?.key });
      await saveArsenal();
    };
    $("pat-series")?.addEventListener("change", (e) => {
      selSeries = e.target.value;
      $("pat-sel").innerHTML = patOptions();
    });
    $("pat-find")?.addEventListener("input", (e) => {
      patFind = e.target.value;
      $("pat-sel").innerHTML = patOptions();
    });
    $("pat-sel").onchange = (e) => {
      selPattern = e.target.value;
      renderArsenal();
    };
    const bindCustom = (id, key2) => {
      const i = document.getElementById(id);
      if (!i) return;
      i.onchange = () => {
        const v = parseFloat(i.value);
        if (Number.isFinite(v)) custom[key2] = v;
        try {
          localStorage.setItem("laneiq.customPattern", JSON.stringify(custom));
        } catch {
        }
        renderArsenal();
      };
    };
    bindCustom("cp-len", "len");
    bindCustom("cp-vol", "vol");
    bindCustom("cp-ratio", "ratio");
    renderLineup($("lineup"), lineup, pat, bowler, ownedKeys);
    renderOptimizer($("lineup"), pat, bowler, owned, ownedKeys);
    renderNext($("lineup"), pat, bowler, ownedKeys, lineup);
    renderUpcoming($("lineup"), pat, bowler, owned, ownedKeys, lineup);
  }
  function renderOptimizer(el, pat, bowler, owned, ownedKeys) {
    const r = optimizeArsenal({ bowler, owned, catalog: S.catalog, ownedKeys, tonight: pat.source.url === "typical condition used by the optimizer" ? null : pat });
    const box = document.createElement("div");
    const col = r.score === null ? "var(--dim)" : r.score >= 80 ? "var(--mint)" : r.score >= 55 ? "var(--gold)" : "var(--red)";
    const mark = (s) => s === "covered" ? `<span class="badge good">covered</span>` : s === "stretch" ? `<span class="badge moderate">stretch</span>` : `<span class="badge tentative">gap</span>`;
    box.innerHTML = `<h3>Arsenal optimizer</h3>
    <div class="card"><div class="row"><div><div class="k">Coverage score</div><div style="font-size:40px;font-weight:800;color:${col}">${r.score === null ? "\u2013" : r.score}<span class="note" style="font-size:16px"> / 100</span></div></div>
      <div class="u" style="max-width:60%">${r.score === null ? "Add balls with RG and differential (or pick them from the catalog) and I'll score how well they cover the conditions you meet." : "How well your balls cover heavy oil, a typical house shot, dry lanes and short and long sport patterns, for how you bowl."}</div></div>
      ${r.profile.length ? `<div class="k" style="margin-top:10px">What your numbers say</div><ul>${r.profile.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</div>
    <div class="card"><div class="k">Conditions and the ball that covers each</div><table>${r.scenarios.map((s) => `<tr><td>${esc(s.name)}<div class="note">${esc(s.blurb)}</div></td><td>${s.best ? esc(s.best.ball.name) : "nothing yet"}</td><td class="n">${mark(s.status)}</td></tr>`).join("")}</table></div>
    ${r.overlaps.length ? `<div class="card"><div class="k">Overlap</div><ul>${r.overlaps.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    ${r.buys.length ? `<div class="card"><div class="k">Best next balls</div>${r.buys.map((b) => `<div style="padding:8px 0;border-top:1px solid var(--line)"><b>Fills: ${esc(b.fixes.join(", "))}</b><div class="u">You're missing a ${b.direction} ball (motion index near ${b.target.toFixed(2)}).</div>${b.picks.map((c) => `<div style="margin-top:8px;display:flex;gap:12px">${ballThumb(c.ball, 64)}<div style="flex:1;min-width:0"><b>${esc(c.ball.manufacturer)} ${esc(c.ball.name)}</b> <span class="note">${esc(specLine3(c.ball))}</span>${layoutHtml(c.ball, bowler, b.direction === "stronger" ? "carry" : "early")}</div></div>`).join("")}</div>`).join("")}</div>` : r.score !== null ? `<div class="card"><div class="u">Your arsenal covers every condition I check. Nothing to add right now.</div></div>` : ""}
    ${r.spare.has ? "" : `<div class="card"><div class="k">No spare ball</div><div class="u">A plastic spare ball keeps your strike balls from hooking on spares.${r.spare.picks.length ? ` From the catalog: ${r.spare.picks.map((c) => esc(`${c.manufacturer} ${c.name}`)).join(", ")}.` : ""}</div></div>`}
    <div class="card"><div class="k">Read this first</div><ul>${r.notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`;
    el.append(box);
  }
  function renderUpcoming(el, pat, bowler, owned, ownedKeys, lineup) {
    const opt = optimizeArsenal({ bowler, owned, catalog: S.catalog, ownedKeys, tonight: pat.source.url === "typical condition used by the optimizer" ? null : pat });
    const targets = [{ target: lineup.target, label: `tonight's pattern (${pat.name})` }, ...opt.scenarios.filter((s) => s.status !== "covered").map((s) => ({ target: s.target, label: `a gap in your arsenal: ${s.name.toLowerCase()}` }))];
    const picks = upcomingForBowler(S.catalog, ownedKeys, targets, 6);
    const box = document.createElement("div");
    const when3 = (d) => d ? (/* @__PURE__ */ new Date(d + "T12:00:00")).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) : "date not announced";
    box.innerHTML = `<h3>New balls coming out you might be interested in</h3>
    <div class="card">${picks.length ? picks.map((p) => `<div style="padding:8px 0;border-top:1px solid var(--line);display:flex;gap:12px">${ballThumb(p.ball)}<div style="flex:1;min-width:0"><div class="row"><b>${esc(p.ball.manufacturer)} ${esc(p.ball.name)}</b><span class="badge ${p.index !== null ? "good" : "tentative"}">${esc(p.ball.availableOn ? "out " + when3(p.ball.availableOn.value) : "date not announced")}</span></div>
        <div class="u">${p.index !== null ? esc(specLine3(p.ball)) : "Specs not published yet"}</div><div class="u">${esc(p.why)}</div>
        <div class="note">Source: <a style="color:var(--cy)" href="${esc((p.ball.rg ?? p.ball.status).source.url)}" target="_blank" rel="noopener">${esc(srcWord((p.ball.rg ?? p.ball.status).source.kind))}</a>, ${esc((p.ball.rg ?? p.ball.status).source.retrievedOn)}</div></div></div>`).join("") : `<div class="u">Nothing announced that fits yet. This list fills in when manufacturers announce new balls and the catalog is refreshed.</div>`}
      <div class="note">Release dates and specs come from the manufacturers' announcements and can change before a ball ships.</div></div>`;
    el.append(box);
  }
  function renderProshop() {
    const el = $("proshop-page");
    const p = S.profile;
    const bp = bowlerProfile();
    const pat = currentPattern();
    const lineup = buildLineup(pat, bp, ownedBalls());
    const ownedKeys = new Set(S.arsenal.map((b) => b.catalogKey).filter(Boolean));
    const inch3 = (v) => v === void 0 ? "not entered" : fractionInches(v);
    const fit = p?.fit;
    const sheets = p?.sheets ?? [];
    const realPat = pat.source.url === "typical condition used by the optimizer" ? null : pat;
    el.innerHTML = `
    <h2>Pro shop</h2>
    <div class="note">Tools for fitting, layout and drilling, for bowlers and for pro shop operators, plus what to look for at a pro shop.</div>
    <div class="card"><div class="k">Layout and drilling</div>
      <div class="chips"><button class="btn" id="ps-lab">Layout Lab: see a layout on the ball</button><button class="btn" id="ps-scan">Scan a drilled ball</button><button class="btn" id="ps-pap">Estimate my PAP from photos</button><button class="btn ghost" id="ps-report">Fitting report (print or save PDF)</button></div>
      <div class="note">The Layout Lab draws the ball with its holes, pin, PSA, PAP and VAL in Dual Angle, Pin Buffer and 2LS, previews the flare, and prints a drill sheet. Scan reads the layout off a photo of a drilled ball.</div></div>
    <div class="card"><div class="k">${p ? esc(p.name) + "'s" : "This"} fit</div>
      <table><tr><td>Hand</td><td class="n">${bp.hand === "R" ? "Right" : "Left"}${bp.style === "two-handed" ? ", two-handed" : bp.style === "one-hand-no-thumb" ? ", no thumb" : ""}</td></tr>
      <tr><td>PAP</td><td class="n">${esc(p?.spin?.pap ?? "not entered")}</td></tr>
      <tr><td>Rev rate \xB7 speed</td><td class="n">${bp.revRpm ? Math.round(bp.revRpm) + " RPM" : "unknown"} \xB7 ${bp.launchSpeed ? bp.launchSpeed.toFixed(1) + " mph" : "unknown"}</td></tr>
      <tr><td>Axis rotation \xB7 tilt</td><td class="n">${bp.axisRotation !== void 0 ? Math.round(bp.axisRotation) + "\xB0" : "-"} \xB7 ${bp.axisTilt !== void 0 ? Math.round(bp.axisTilt) + "\xB0" : "-"}</td></tr>
      <tr><td>Span</td><td class="n">${inch3(fit?.span)}</td></tr><tr><td>Thumb \xB7 finger holes \xB7 bridge</td><td class="n">${inch3(fit?.thumbDia)} \xB7 ${inch3(fit?.fingerDia)} \xB7 ${inch3(fit?.bridge)}</td></tr></table>
      <div class="note">Enter or change these in the Layout Lab (Hand and grip), and the ball-motion numbers under Me.</div></div>
    <div class="card"><div class="k">Saved layouts${p ? " for " + esc(p.name) : ""}</div>
      ${sheets.length ? sheets.map((x) => `<div class="row" style="padding:6px 0;border-top:1px solid var(--line)"><div><b>${esc(x.ball.name)}</b> <span class="note">${esc(x.layoutText)} \xB7 ${esc(new Date(x.at).toLocaleDateString())}</span></div><div><button class="chip" data-open="${x.id}">Open</button><button class="chip danger" data-rm="${x.id}">Delete</button></div></div>`).join("") : `<div class="u">None yet. Save a layout from the Layout Lab and it appears here, with the bowler's profile.</div>`}</div>
    ${proshopToolsHtml(realPat)}
    <h3>What to look for at a pro shop</h3>
    <div class="chips"><button class="chip" id="ps-print">Open as a printable sheet</button></div>
    ${playbookHtml(realPat)}`;
    wireProshopTools(el);
    $("ps-lab").onclick = () => openLayoutLab();
    $("ps-scan").onclick = () => openBallScan();
    $("ps-pap").onclick = () => openPapScan();
    $("ps-report").onclick = () => openReport(pat, bp, lineup, ownedKeys);
    $("ps-print").onclick = () => openPlaybook(realPat);
    el.querySelectorAll("[data-open]").forEach((b) => b.onclick = () => openLayoutLab({ sheetId: b.dataset.open }));
    el.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => (updateProfile({ sheets: (S.profile?.sheets ?? []).filter((x) => x.id !== b.dataset.rm) }), renderProshop()));
  }
  function renderLineup(el, l, pat, bowler, ownedKeys) {
    const dem2 = patternDemand(pat, bowler);
    const data = [
      `${bowler.style ? styleLabel(bowler.style) + ", " : ""}${bowler.hand === "R" ? "right" : "left"}-handed`,
      bowler.launchSpeed !== void 0 ? `speed ${bowler.launchSpeed.toFixed(1)} mph (measured)` : "speed not measured yet",
      bowler.entryAngle !== void 0 ? `entry angle ${bowler.entryAngle.toFixed(1)}\xB0 (measured)` : "entry angle not measured yet",
      bowler.revRpm !== void 0 ? `rev rate ${bowler.revRpm} RPM (${bowler.revSource === "entered" ? "entered" : "estimated, not measured"})` : "rev rate not entered"
    ];
    el.innerHTML = `
    <h3>Your lineup for ${esc(pat.name)}</h3>
    ${l.slots.length ? l.slots.map((s) => `<div class="card"><div class="k">${esc(s.role)}</div><div class="row"><div class="lr-head">${s.ball ? esc(s.ball.name) : "No suitable ball"}</div><span class="badge ${s.fit === "good" ? "good" : s.fit === "stretch" ? "moderate" : "tentative"}">${s.fit === "gap" ? "gap" : s.fit}</span></div><div class="u">${esc(s.why)}</div></div>`).join("") : `<div class="card"><div class="u">${esc(l.gaps[0] ?? "Add balls with specs to build a lineup.")}</div></div>`}
    <div class="card"><div class="k">Why these picks</div><ul>${dem2.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul><div class="note">Based on: ${esc(data.join(" \xB7 "))}.</div></div>
    ${l.gaps.length && l.slots.length ? `<div class="card"><div class="k">Gaps in your arsenal</div><ul>${l.gaps.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>${l.slots.filter((s) => s.fit === "gap" && s.index !== null).map((s) => {
      const want = Number(/near (-?[\d.]+)/.exec(l.gaps.find((g) => g.includes(s.role)) ?? "")?.[1]);
      const fill = Number.isFinite(want) ? gapFillers(S.catalog, ownedKeys, want) : [];
      return fill.length ? `<div class="u">Catalog balls that would fill "${esc(s.role)}": ${fill.map((f) => esc(`${f.ball.manufacturer} ${f.ball.name} (${f.index.toFixed(2)})`)).join(", ")}</div>` : "";
    }).join("")}</div>` : ""}
    <div class="card"><div class="k">Read this first</div><ul>${l.caveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></div>`;
  }
  var nextRole = "start";
  var ROLE_OFFSET = { start: 0, early: -0.35, carry: 0.35 };
  var ROLE_LABEL = { start: "Start ball", early: "When it hooks early", carry: "When it skids or carries down" };
  var specLine3 = (b) => [b.rg && `RG ${b.rg.value}`, b.differential && `diff ${b.differential.value}`, b.coverstock?.value, b.core?.value, b.coreSymmetry?.value, b.specWeightLb && `${b.specWeightLb.value} lb specs`, b.weightSpecs && b.weightSpecs.value.length > 1 && `specs for ${b.weightSpecs.value.map((w) => w.lb).join("/")} lb in the Layout Lab`].filter(Boolean).join(" \xB7 ");
  function layoutHtml(ball, bowler, role) {
    const adv = suggestLayouts(ball, bowler, role);
    return `<details style="margin-top:6px"><summary class="u" style="cursor:pointer;color:var(--cy)">Suggested layout</summary>
    ${adv.layouts.map((l, i) => `<div style="padding:6px 0"><b>${i === 0 ? "Best fit: " : "Alternative: "}${esc(l.name)}</b><div class="u">${esc(l.notation)} (pin to PAP x ${l.valDeg ? "VAL angle x " : ""}pin buffer)</div><div class="note">${esc(l.effect)}</div></div>`).join("")}
    <ul>${[...adv.notes, ...adv.grip].map((n) => `<li>${esc(n)}</li>`).join("")}</ul></details>`;
  }
  function renderNext(el, pat, bowler, ownedKeys, lineup) {
    const want = lineup.target + ROLE_OFFSET[nextRole];
    const cands = rankCatalog(S.catalog, ownedKeys, want, 8, 2, { includeOlder: showOlder });
    const box = document.createElement("div");
    box.innerHTML = `<h3>Find my next ball</h3>
    <div class="card"><div class="u">Catalog balls whose published specs best match what this role wants for ${esc(pat.name)}, excluding balls you already own and at most two per brand. ${showOlder ? "Older and retired balls are included (for shopping used)." : "Only balls the manufacturer still sells that came out last year or this year are suggested."} ${S.catalog.length} balls in the catalog.</div>
      <div class="chips"><button class="chip ${showOlder ? "sel" : ""}" id="older-toggle">${showOlder ? "Showing older balls too" : "Include older or retired balls"}</button></div>
      <div class="chips">${Object.keys(ROLE_LABEL).map((r) => `<button class="chip ${r === nextRole ? "sel" : ""}" data-role="${r}">${ROLE_LABEL[r]}</button>`).join("")}</div>
      ${cands.length ? cands.map((c, i) => `<div style="padding:10px 0;border-top:1px solid var(--line);display:flex;gap:12px">${ballThumb(c.ball)}<div style="flex:1;min-width:0"><div class="row"><b>${i + 1}. ${esc(c.ball.manufacturer)} ${esc(c.ball.name)}</b><span class="badge ${c.off <= 0.15 ? "good" : "moderate"}">motion ${c.index.toFixed(2)}</span></div><div class="u">${esc(specLine3(c.ball))}${c.ball.releaseYear ? ` \xB7 ${c.ball.releaseYear.value}` : ""}</div><div class="note">Source: <a style="color:var(--cy)" href="${esc(c.ball.rg.source.url)}" target="_blank" rel="noopener">${esc(srcWord(c.ball.rg.source.kind))}</a>, ${esc(c.ball.rg.source.retrievedOn)}${c.ball.releaseYear ? ` \xB7 ${esc(String(c.ball.availableOn ? c.ball.availableOn.value : c.ball.releaseYear.value))}` : ""}</div>${layoutHtml(c.ball, bowler, nextRole)}<div class="chips"><button class="chip" data-lab="${esc(c.ball.key)}">Preview a layout on this ball</button></div></div></div>`).join("") : `<div class="u">No catalog balls with RG and differential to rank.</div>`}
      <div class="note">Spec-based ranking. Confirm on the lanes: drill and test before buying.</div></div>
    <div class="chips"><button class="btn ghost" id="to-proshop">Pro shop tools: layouts, fitting report, playbook</button></div>`;
    el.append(box);
    box.querySelector("#older-toggle").onclick = () => (showOlder = !showOlder, renderArsenal());
    box.querySelectorAll("[data-role]").forEach((b) => b.onclick = () => (nextRole = b.dataset.role, renderArsenal()));
    $("to-proshop").onclick = () => showTab("proshop");
    box.querySelectorAll("[data-lab]").forEach((b) => b.onclick = () => openLayoutLab({ catalogKey: b.dataset.lab }));
  }
  function openReport(pat, bowler, lineup, ownedKeys) {
    const el = $("report");
    const p = S.profile;
    const prof = computeProfile(S.shots);
    const st2 = (k2, d = 1, u = "") => prof.stats[k2] ? `${prof.stats[k2].mean.toFixed(d)}${u} (\xB1${prof.stats[k2].sd.toFixed(d)}, ${prof.stats[k2].n} shots)` : "not measured";
    const sp = p?.spin;
    const picks = ["start", "early", "carry"].map((r) => ({ r, c: rankCatalog(S.catalog, ownedKeys, lineup.target + ROLE_OFFSET[r], 3, 1) }));
    el.classList.add("on");
    el.innerHTML = `
    <div class="row noprint"><button class="btn" onclick="window.print()">Print or save PDF</button><button class="btn ghost" id="rp-close">Close</button></div>
    <h2>LaneIQ fitting report</h2>
    <div class="note">${esc((/* @__PURE__ */ new Date()).toLocaleDateString([], { dateStyle: "long" }))}</div>
    <div class="card"><div class="k">Bowler</div><b>${esc(p?.name ?? "")}</b>
      <ul><li>${p?.quiz ? esc(summarize(p.quiz)[0]) : `${bowler.hand === "R" ? "Right" : "Left"}-handed`}</li>
      <li>Rev rate: ${bowler.revRpm ? `${bowler.revRpm} RPM (${bowler.revSource === "entered" ? "entered" : bowler.revSource === "measured" ? "measured from release video" : "estimated, not measured"})` : "not known"}</li>
      <li>Axis rotation: ${sp?.axisRotation !== void 0 ? sp.axisRotation + "\xB0" : "not measured"} \xB7 axis tilt: ${sp?.axisTilt !== void 0 ? sp.axisTilt + "\xB0" : "not measured"}${sp?.pap ? ` \xB7 PAP: ${esc(sp.pap)}` : ""}</li></ul></div>
    <div class="card"><div class="k">Measured on the lane by the camera</div><table>
      <tr><td>Launch speed</td><td class="n">${st2("launchSpeed", 1, " mph")}</td></tr>
      <tr><td>Entry angle</td><td class="n">${st2("entryAngle", 1, "\xB0")}</td></tr>
      <tr><td>Breakpoint distance</td><td class="n">${st2("breakpointFt", 0, " ft")}</td></tr>
      <tr><td>Breakpoint board</td><td class="n">${st2("breakpointBoard", 1)}</td></tr>
      <tr><td>Entry board</td><td class="n">${st2("entryBoard", 1)}</td></tr>
      <tr><td>Hook (breakpoint to entry)</td><td class="n">${st2("hookBoards", 1, " boards")}</td></tr></table>
      <div class="note">${prof.shots} tracked shots.${prof.strike.attempts ? ` Strike rate ${Math.round((prof.strike.rate ?? 0) * 100)}% over ${prof.strike.attempts} shots with results.` : ""}</div></div>
    <div class="card"><div class="k">Pattern</div><b>${esc(pat.name)}</b><div class="u">${pat.lengthFt} ft${pat.volumeMl !== void 0 ? ` \xB7 ${pat.volumeMl} mL` : ""}${pat.ratio !== void 0 ? ` \xB7 ${pat.ratio}:1` : ""} (${pat.source.kind === "user" ? "entered by the bowler" : "source: " + esc(pat.source.url)})</div></div>
    <div class="card"><div class="k">Recommended lineup from the arsenal</div>${lineup.slots.length ? `<ul>${lineup.slots.map((s) => `<li><b>${esc(s.role)}:</b> ${s.ball ? esc(s.ball.name) : "no suitable ball"}. ${esc(s.why)}</li>`).join("")}</ul>` : `<div class="u">No arsenal specs on file.</div>`}
      <ul>${dem(pat, bowler)}</ul></div>
    <div class="card"><div class="k">Suggested additions from the catalog</div>${picks.map(({ r, c }) => `<div style="margin:8px 0"><b>${ROLE_LABEL[r]}</b><ul>${c.map((x) => `<li>${esc(x.ball.manufacturer)} ${esc(x.ball.name)} (${esc(specLine3(x.ball))})<br><span class="u">Layout: ${esc(suggestLayouts(x.ball, bowler, r).layouts[0].name)}, ${esc(suggestLayouts(x.ball, bowler, r).layouts[0].notation)}</span></li>`).join("") || "<li>none found</li>"}</ul></div>`).join("")}</div>
    <div class="card"><div class="k">Read this first</div><ul>${lineup.caveats.map((c) => `<li>${esc(c)}</li>`).join("")}<li>Camera measurements carry uncertainty. Specs are the manufacturers' published numbers, not a measure of how a ball behaves for this bowler. Confirm with test shots before drilling.</li></ul></div>`;
    $("rp-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }
  var dem = (pat, bowler) => patternDemand(pat, bowler).reasons.map((r) => `<li>${esc(r)}</li>`).join("");
  function renderMe() {
    const el = $("me-page");
    const p = S.profile;
    const profs = listProfiles();
    el.innerHTML = `
    <h2>Me</h2>
    <div class="card"><div class="k">Rewards</div><div class="note">Unlock ball tracers, pin looks and lane looks by playing and by improving.</div><div class="chips"><button class="btn" id="me-rewards">Skins and rewards</button><button class="chip ${glowEnabled() ? "sel" : ""}" id="me-glow">Glow: ${glowEnabled() ? "on" : "off"}</button></div><div class="note">Glow off gives crisp lines with no halos, for reading shots exactly.</div></div>
    ${p?.quiz ? `<div class="card"><div class="k">Your bowler profile</div><ul>${summarize(p.quiz).map((l) => `<li>${esc(l)}</li>`).join("")}</ul><div class="note">${esc(styleNotes(p.quiz.style).join(" "))}</div><div class="chips"><button class="btn ghost" id="me-quiz">Retake the quiz</button></div></div>` : p ? `<div class="card"><div class="u">Take the short bowler quiz so the app knows how you bowl.</div><div class="chips"><button class="btn" id="me-quiz">Take the quiz</button></div></div>` : ""}
    ${p ? `<div class="card"><div class="k">Ball motion (pro shop)</div>
      <div class="note">The live camera can't measure these. Enter numbers from a pro-shop tool, or measure them from a slow-motion release video.${p.spin ? ` Last set ${esc(when2(p.spin.at))} (${p.spin.source === "video" ? "from video" : "entered"}).` : ""}</div>
      <div class="two"><div class="field"><label>Rev rate (RPM)</label><input id="sp-rpm" inputmode="numeric" value="${p.spin?.rpm ?? ""}"></div><div class="field"><label>Axis rotation (\xB0)</label><input id="sp-rot" inputmode="decimal" value="${p.spin?.axisRotation ?? ""}"></div></div>
      <div class="two"><div class="field"><label>Axis tilt (\xB0)</label><input id="sp-tilt" inputmode="decimal" value="${p.spin?.axisTilt ?? ""}"></div><div class="field"><label>PAP (e.g. 4 1/4 over, 1/2 up)</label><input id="sp-pap" value="${esc(p.spin?.pap ?? "")}"></div></div>
      <div class="chips"><button class="btn ghost" id="sp-save">Save</button><button class="btn ghost" id="sp-lab">Measure from a release video</button><button class="btn ghost" id="sp-pap">Estimate PAP from photos of the flare rings</button></div>${p.spin?.papFrom ? `<div class="note">Your PAP was ${p.spin.papFrom === "photo" ? "estimated from photos of the flare rings" : "measured from your release video"}.</div>` : ""}</div>` : ""}
    ${p ? `<div class="card"><div class="k">Profile</div>
      <div class="field"><label>Name</label><input id="me-name" value="${esc(p.name)}"></div>
      <div class="two"><div class="field"><label>Throws</label><select id="me-hand"><option value="R" ${p.hand === "R" ? "selected" : ""}>Right-handed</option><option value="L" ${p.hand === "L" ? "selected" : ""}>Left-handed</option></select></div>
      <div class="field"><label>Rev rate (RPM, optional)</label><input id="me-rev" inputmode="numeric" value="${p.revRpm ?? ""}" placeholder="not measured"></div></div>
      <div class="chips"><button class="btn ghost" id="me-save">Save</button></div></div>` : ""}
    ${p ? friendsCardHtml() : ""}
    <h3>Profiles on this phone</h3>
    <div class="card">${profs.map((x) => `<div class="row" style="padding:6px 0"><div><b>${esc(x.name)}</b> <span class="note">${x.hand === "R" ? "right" : "left"}-handed${x.id === p?.id ? " \xB7 current" : ""}</span></div><div>${x.id === p?.id ? "" : `<button class="chip" data-sw="${x.id}">Switch</button>`}<button class="chip danger" data-rm="${x.id}">Delete</button></div></div>`).join("") || `<div class="u">No profiles yet.</div>`}<div class="chips"><button class="btn ghost" id="me-new">+ Add a profile</button></div>
      <div class="note">Each profile keeps its own balls, shots, videos, averages and plan, and they never mix. Use one per person if you share a phone.</div></div>
    <h3>How LaneIQ is doing</h3>
    <div class="card"><ul>${healthSummary().lines.map((l) => `<li>${esc(l)}</li>`).join("")}<li>Ball catalog: ${S.catalog.length} balls, each spec with its source.</li></ul>
      <div class="note">The app keeps these numbers on this phone only. If lane lock keeps struggling, copy them and send them with a Save frame picture so detection can be improved from real examples.</div>
      <div class="chips"><button class="btn ghost" id="me-diag">Copy diagnostics</button></div></div>
    <h3>Your data</h3>
    <div class="card"><div class="note">Everything is stored only on this phone. Nothing is uploaded, and there is no account to sign in to. If you delete the app's website data or switch phones, your history doesn't come along unless you export it.</div><div id="me-storage" class="u" style="margin-top:6px"></div><div class="chips"><button class="btn ghost" id="me-export">Export my data</button></div></div>
    <h3>Legal</h3>
    <div class="card"><div class="note">LaneIQ is not affiliated with, endorsed by or sponsored by the USBC, the PBA or any ball maker. Their names and marks belong to their owners. Ball and pattern information comes from public sources, listed in the credits, and may be out of date or wrong.</div><div class="chips"><a class="chip" href="privacy.html">Privacy policy</a><a class="chip" href="terms.html">Terms of use</a><a class="chip" href="credits.html">Credits and data sources</a></div></div>
    <h3>About</h3>
    <div class="card"><div class="note">Measurements come from one phone camera, so they carry uncertainty. The coaching only links your habits to strikes once there are at least ${MIN_OUTCOMES} shots with a pin count entered, and calls small samples "tentative". Ball and pattern numbers are published specs, not measurements of how a ball behaves for you. Minimum sample for a reliable percentage is ${MIN_SAMPLE}.</div></div>`;
    $("me-save")?.addEventListener("click", () => {
      const rev = parseInt($("me-rev").value, 10);
      const name = $("me-name").value.trim() || p.name;
      const hand3 = $("me-hand").value;
      const revRpm = Number.isFinite(rev) ? rev : void 0;
      updateProfile({ name, hand: hand3, revRpm, quiz: p.quiz ? { ...p.quiz, name, hand: hand3, revRpm } : void 0 });
    });
    el.querySelectorAll("[data-sw]").forEach((b) => b.onclick = () => (setCurrentProfile(b.dataset.sw), location.reload()));
    el.querySelectorAll("[data-rm]").forEach(
      (b) => b.onclick = async () => {
        const x = profs.find((q) => q.id === b.dataset.rm);
        if (!confirm(`Delete ${x.name} and all their shots, videos and plan from this phone? This can't be undone.`)) return;
        saveProfiles(profs.filter((q) => q.id !== x.id));
        await deleteProfileData(x.id);
        location.reload();
      }
    );
    wireFriendsCard(renderMe);
    $("me-rewards").onclick = () => void openRewards();
    $("me-glow").onclick = () => (setGlow(!glowEnabled()), renderMe());
    $("me-new").onclick = () => showQuiz("add", () => {
    });
    $("sp-save")?.addEventListener("click", () => {
      const num3 = (id) => {
        const v = parseFloat($(id).value);
        return Number.isFinite(v) ? v : void 0;
      };
      updateProfile({ spin: { rpm: num3("sp-rpm"), axisRotation: num3("sp-rot"), axisTilt: num3("sp-tilt"), pap: $("sp-pap").value.trim() || void 0, source: "entered", at: (/* @__PURE__ */ new Date()).toISOString() } });
    });
    $("sp-lab")?.addEventListener("click", () => openSpinLab(() => renderMe()));
    $("sp-pap")?.addEventListener("click", () => openPapScan());
    $("me-quiz")?.addEventListener("click", () => showQuiz("retake", () => renderMe()));
    $("me-diag").onclick = async () => {
      const txt = diagnosticsText();
      try {
        await navigator.clipboard.writeText(txt);
        $("me-diag").textContent = "Copied";
      } catch {
        prompt("Copy these diagnostics:", txt);
      }
    };
    $("me-export").onclick = () => {
      const blob = new Blob([JSON.stringify({ exportedAt: (/* @__PURE__ */ new Date()).toISOString(), profile: S.profile, arsenal: S.arsenal.map(({ exemplars, ...b }) => b), plan: S.plan, shots: S.shots.map(({ sig, ...s }) => s) }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `laneiq-${(S.profile?.name ?? "me").replace(/\W+/g, "-")}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    };
    navigator.storage?.estimate?.().then((e) => {
      const mb = (n = 0) => (n / 1048576).toFixed(0);
      $("me-storage").textContent = e.quota ? `Storage used: ${mb(e.usage)} MB of about ${mb(e.quota)} MB available.` : "";
    });
  }

  // camera/tour.ts
  var STEPS = [
    { tab: "live", sel: "#hero", title: "Point. Lock. Bowl.", text: "LaneIQ turns your phone's camera into a bowling coach. There is nothing to put in your ball and nothing to buy. Put the phone where the whole lane is in view, from the foul line to the pins." },
    { tab: "live", sel: "#start", title: "Start the camera", text: "Tap Start camera and allow the camera. The app asks for 60 frames a second so it can follow a fast ball. Everything stays on your phone." },
    { tab: "live", sel: "#guide-open", title: "Where to put the phone", text: "Behind the approach, or off to one side, steady, with both gutters, the foul line and the pins in view. This guide has pictures and tips for a clean lock." },
    { tab: "live", sel: "#status", title: "It finds the lane by itself", text: "The app scans the lane, and the biggest lane that stays steady in view is locked. This line always says what it is doing: scanning, locked, ball detected, shot captured." },
    { tab: "live", sel: "#tracebtn, #reset", title: "If the lock is off, fix it", text: "Fix my lane freezes the picture so you can drag four numbered dots onto the lane, use Snap to edges, then place the head pin, the 7 and the 10. The yellow rings are the arrows the app found on your lane. Re-lock throws a bad lock away and starts again." },
    { tab: "live", sel: "#startstop", title: "Start and Stop: just your shots", text: `In league the camera sees everyone's ball. Tap Stop and nothing is followed, recorded or saved (the lane stays locked); tap Start on your turn. Turn on "One shot at a time" and it stops by itself after each of your shots, so you only tap Start when it is your turn.` },
    { tab: "live", sel: ".grid", title: "Every shot, measured", text: "After each ball you get speed, the board at the arrows (read from the real arrows on your lane), breakpoint, the board where the ball was last seen, launch angle and more. Only what the camera saw is shown: nothing is guessed past it." },
    { tab: "live", sel: "#result-card", title: "Pins are read from the camera", text: "The pins that fell are read from the deck. If it ever gets one wrong, tap the right number and the app learns from it." },
    { tab: "shots", sel: ".tb[data-tab='shots']", title: "Shots", text: "Every shot is saved with its video, from the bowler's approach until the rack is full again. Open one to replay it with the ball's path drawn on the lane, switch to the raw video, a top-down map, or 3D." },
    { tab: "score", sel: ".tb[data-tab='score']", title: "Score", text: "A scorecard that scores itself from the camera, with a spare coach that suggests where to throw your second ball." },
    { tab: "insights", sel: ".tb[data-tab='insights']", title: "Coach", text: "Your one thing to work on, what goes with your misses (Miss Finder), whether it's your aim or your line, the move to make, which ball to throw or buy next, your approach read from your clips, and drills that score themselves. My numbers has your averages and skills chart." },
    { tab: "arsenal", sel: ".tb[data-tab='arsenal']", title: "Arsenal", text: "Your bowling balls. Photograph a ball to add it, estimate its PAP from three photos of the flare rings, and use the Spin lab on slow-motion video for rev rate, axis rotation and tilt." },
    { tab: "proshop", sel: ".tb[data-tab='proshop']", title: "Pro shop", text: "Layouts, drilling and surface advice built around how you throw and the balls you own." },
    { tab: "learn", sel: ".tb[data-tab='learn']", title: "Learn", text: 'Every bowling word the app uses, and exactly what it means in the app: pocket, breakpoint, high hit, Brooklyn, PAP and more. Search a word, or tap "what is this?" on a shot to jump straight to it.' },
    { tab: "me", sel: ".tb[data-tab='me']", title: "Me", text: "Your profile, friends, rewards and skins, and settings such as turning the glow off for a plain view. You can take this tour again any time from the start screen." }
  ];
  function startTour(onDone) {
    document.getElementById("tour")?.remove();
    let i = 0;
    const root = document.createElement("div");
    root.id = "tour";
    root.style.cssText = "position:fixed;inset:0;z-index:400;font-family:system-ui,sans-serif";
    root.innerHTML = `
    <div id="tour-spot" style="position:fixed;border-radius:16px;border:2px solid #46e6ff;box-shadow:0 0 0 9999px rgba(3,7,16,.78);transition:all .25s ease;pointer-events:none"></div>
    <div id="tour-card" style="position:fixed;left:12px;right:12px;max-width:380px;margin:0 auto;background:#0d1626;border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:14px 14px 12px;color:#fff;box-shadow:0 12px 40px rgba(0,0,0,.5)">
      <div id="tour-n" style="font-size:11px;color:#9fb0cc;letter-spacing:.06em;text-transform:uppercase"></div>
      <div id="tour-t" style="font-weight:800;font-size:18px;margin:4px 0 6px"></div>
      <div id="tour-x" style="font-size:14px;line-height:1.45;color:#d6e2f5"></div>
      <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
        <button id="tour-skip" class="btn ghost" style="padding:9px 12px">Skip</button>
        <span style="flex:1"></span>
        <button id="tour-back" class="btn ghost" style="padding:9px 14px">Back</button>
        <button id="tour-next" class="btn" style="padding:9px 18px">Next</button>
      </div>
    </div>`;
    document.body.append(root);
    const spot = root.querySelector("#tour-spot");
    const card = root.querySelector("#tour-card");
    const q = (id) => root.querySelector(id);
    const place = () => {
      const s = STEPS[i];
      const el = Array.from(document.querySelectorAll(s.sel)).find((e) => e.offsetParent !== null || getComputedStyle(e).position === "fixed");
      const vh = window.innerHeight;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "instant" });
        const r = el.getBoundingClientRect();
        const pad = 6;
        const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
        const w = Math.min(window.innerWidth - 8, r.width + pad * 2) - (left - (r.left - pad) > 0 ? left - (r.left - pad) : 0);
        const h = Math.min(vh - 8, r.height + pad * 2);
        Object.assign(spot.style, { display: "block", top: `${top}px`, left: `${left}px`, width: `${Math.max(24, w)}px`, height: `${Math.max(24, h)}px` });
        const cardH = card.offsetHeight || 190;
        const below = vh - (top + h);
        card.style.top = below >= cardH + 16 ? `${top + h + 12}px` : `${Math.max(8, top - cardH - 12)}px`;
        if (below < cardH + 16 && top < cardH + 20) card.style.top = `${Math.max(8, vh - cardH - 12)}px`;
      } else {
        spot.style.display = "none";
        card.style.top = `${Math.max(8, (vh - (card.offsetHeight || 190)) / 2)}px`;
      }
    };
    const show = () => {
      const s = STEPS[i];
      showTab(s.tab);
      q("#tour-n").textContent = `${i + 1} of ${STEPS.length}`;
      q("#tour-t").textContent = s.title;
      q("#tour-x").textContent = s.text;
      q("#tour-back").style.visibility = i === 0 ? "hidden" : "visible";
      q("#tour-next").textContent = i === STEPS.length - 1 ? "Done" : "Next";
      requestAnimationFrame(() => requestAnimationFrame(place));
    };
    const finish2 = () => {
      window.removeEventListener("resize", place);
      root.remove();
      try {
        localStorage.setItem("laneiq.tour", "1");
      } catch {
      }
      showTab("live");
      onDone?.();
    };
    window.addEventListener("resize", place);
    q("#tour-next").onclick = () => i === STEPS.length - 1 ? finish2() : (i++, show());
    q("#tour-back").onclick = () => i > 0 ? (i--, show()) : void 0;
    q("#tour-skip").onclick = finish2;
    show();
  }
  var tourSeen = () => {
    try {
      return localStorage.getItem("laneiq.tour") === "1";
    } catch {
      return true;
    }
  };

  // core/src/sharpen.ts
  function sharpen(src, w, h, out, tmp, amount = 0.8) {
    for (let y = 0; y < h; y++) {
      const r = y * w;
      tmp[r] = (src[r] * 2 + src[r + 1]) / 3;
      for (let x = 1; x < w - 1; x++) tmp[r + x] = (src[r + x - 1] + src[r + x] + src[r + x + 1]) / 3;
      tmp[r + w - 1] = (src[r + w - 2] + src[r + w - 1] * 2) / 3;
    }
    for (let y = 0; y < h; y++) {
      const up = (y > 0 ? y - 1 : 0) * w, mid2 = y * w, dn = (y < h - 1 ? y + 1 : h - 1) * w;
      for (let x = 0; x < w; x++) {
        const blur = (tmp[up + x] + tmp[mid2 + x] + tmp[dn + x]) / 3;
        const v = src[mid2 + x] + amount * (src[mid2 + x] - blur);
        out[mid2 + x] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
    return out;
  }

  // core/src/lanefit.ts
  var white = (rgba, i) => {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn > 150 && mx - mn < 45;
  };
  function pinSnap(rgba, w, h, c) {
    const out = c.map((p) => ({ ...p }));
    const none2 = { corners: out, moved: 0, found: false };
    const farY = (c[2].y + c[3].y) / 2, nearY = (c[0].y + c[1].y) / 2;
    const len = Math.abs(nearY - farY);
    const dir = Math.sign(nearY - farY) || 1;
    if (len < 40) return none2;
    const xa = Math.min(c[2].x, c[3].x), xb = Math.max(c[2].x, c[3].x);
    const pad = (xb - xa) * 0.12;
    const x0 = Math.max(0, Math.round(xa + pad)), x1 = Math.min(w - 1, Math.round(xb - pad));
    if (x1 - x0 < 8) return none2;
    const reach = 0.14 * len;
    const y0 = Math.max(0, Math.round(farY - dir * reach - (dir > 0 ? 0 : 0)));
    const rows2 = [];
    for (let k2 = -Math.round(reach); k2 <= Math.round(reach); k2++) {
      const y = Math.round(farY - dir * k2);
      if (y < 0 || y >= h) continue;
      let n = 0;
      for (let x = x0; x <= x1; x++) if (white(rgba, (y * w + x) * 4)) n++;
      rows2.push({ y, f: n / (x1 - x0 + 1) });
    }
    void y0;
    if (rows2.length < 10) return none2;
    rows2.sort((a, b) => dir > 0 ? a.y - b.y : b.y - a.y);
    const f = rows2.map((r, i2) => (rows2[Math.max(0, i2 - 1)].f + r.f + rows2[Math.min(rows2.length - 1, i2 + 1)].f) / 3);
    let i = 0;
    while (i < f.length && f[i] < 0.55) i++;
    if (i >= f.length) return none2;
    let peak = f[i], j = i;
    while (j < f.length && f[j] >= 0.5 * peak) {
      peak = Math.max(peak, f[j]);
      j++;
    }
    if (j >= f.length) return none2;
    const baseY = rows2[j - 1].y;
    const moved = (baseY - farY) * dir * -1;
    if (Math.abs(baseY - farY) > reach) return none2;
    const slide = (near, far) => {
      const dy = far.y - near.y;
      if (Math.abs(dy) < 1e-6) return far;
      const t = (baseY - near.y) / dy;
      return { x: near.x + (far.x - near.x) * t, y: baseY };
    };
    out[3] = slide(c[0], c[3]);
    out[2] = slide(c[1], c[2]);
    return { corners: out, moved, found: true };
  }

  // core/src/retrace.ts
  var MAX_SKIP = 24;
  var MAX_GAP = 0.32;
  function tracePath(frames) {
    const nodes = frames.map((fr2) => fr2.cands.map(() => ({ f: 0, c: 0, q: 0, score: 0, prev: null })));
    let best = null;
    for (let f = 0; f < frames.length; f++) {
      for (let c = 0; c < frames[f].cands.length; c++) {
        const cj = frames[f].cands[c];
        const reward = Math.max(0.1, 1.2 - 0.5 * Math.max(cj.q, -0.5));
        let bestScore = reward;
        let bestPrev = null;
        for (let g = 1; g <= MAX_SKIP && f - g >= 0; g++) {
          const fi = f - g;
          const dt = frames[f].t - frames[fi].t;
          if (dt <= 0) continue;
          if (dt > MAX_GAP) break;
          for (let i = 0; i < frames[fi].cands.length; i++) {
            const ci = frames[fi].cands[i];
            const dly = cj.ly - ci.ly;
            const dlx = Math.abs(cj.lx - ci.lx);
            if (dly < -0.8 || dly / dt > 62 || dlx > 3 + 8 * dt) continue;
            const progress2 = Math.min(dly, 4);
            const link = progress2 >= 0.06 ? 0.35 * progress2 : -0.9;
            const sideways = 0.12 * Math.max(0, dlx / dt - 3);
            const skip = 0.5 * Math.max(0, dt - 0.045);
            const s = nodes[fi][i].score + reward + link - sideways - skip;
            if (s > bestScore) bestScore = s, bestPrev = [fi, i];
          }
        }
        nodes[f][c] = { f, c, q: cj.q, score: bestScore, prev: bestPrev };
        if (!best || bestScore > best.score) best = { f, c, score: bestScore };
      }
    }
    if (!best) return null;
    const chain3 = [];
    let cur2 = [best.f, best.c];
    while (cur2) {
      const [f, c] = cur2;
      chain3.push({ t: frames[f].t, lx: frames[f].cands[c].lx, ly: frames[f].cands[c].ly, q: frames[f].cands[c].q });
      cur2 = nodes[f][c].prev;
    }
    chain3.reverse();
    if (chain3.length < 8) return null;
    const span = chain3[chain3.length - 1].ly - chain3[0].ly;
    const mph = span / Math.max(1e-6, chain3[chain3.length - 1].t - chain3[0].t) * (3600 / 5280);
    if (span < 12 || mph < 6 || mph > 40) return null;
    if (chain3.reduce((s, p) => s + p.q, 0) / chain3.length > 1) return null;
    return chain3.map((p) => ({ t: p.t, x: p.lx, y: p.ly }));
  }

  // core/src/stabilize.ts
  var POINTS = 3500;
  var Stabilizer = class {
    w;
    h;
    ready = false;
    dx = 0;
    dy = 0;
    /** frames in a row without a trustworthy match */
    bad = 0;
    pts = new Int32Array(0);
    vals = new Float32Array(0);
    meanRef = 0;
    region = { x0: 0, y0: 0, x1: 0, y1: 0 };
    edge;
    constructor(w, h) {
      this.w = w;
      this.h = h;
      this.edge = new Float32Array(w * h);
    }
    reset() {
      this.ready = false;
      this.dx = this.dy = 0;
      this.bad = 0;
    }
    /** Gradient strength over a region of the picture (only what the search will look at). */
    edges(gray, r) {
      const { w } = this;
      const e = this.edge;
      for (let y = Math.max(1, r.y0); y < Math.min(this.h - 1, r.y1); y++)
        for (let x = Math.max(1, r.x0); x < Math.min(w - 1, r.x1); x++) {
          const i = y * w + x;
          e[i] = Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + w] - gray[i - w]);
        }
    }
    /** Take the reference from this frame, using the lane's bounding box. */
    setReference(gray, box) {
      const { w, h } = this;
      const m = 3;
      this.region = { x0: Math.max(m, Math.floor(box.x0)), y0: Math.max(m, Math.floor(box.y0)), x1: Math.min(w - m, Math.ceil(box.x1)), y1: Math.min(h - m, Math.ceil(box.y1)) };
      const r = this.region;
      this.edges(gray, r);
      let sum = 0, n = 0;
      for (let y = r.y0; y < r.y1; y += 2) for (let x = r.x0; x < r.x1; x += 2) sum += this.edge[y * w + x], n++;
      const mean9 = n ? sum / n : 0;
      const cand = [];
      for (let y = r.y0; y < r.y1; y += 2) for (let x = r.x0; x < r.x1; x += 2) {
        const v = this.edge[y * w + x];
        if (v > 2.2 * mean9) cand.push({ i: y * w + x, v });
      }
      cand.sort((a, b) => b.v - a.v);
      const take = cand.slice(0, POINTS);
      this.pts = Int32Array.from(take.map((c) => c.i));
      this.vals = Float32Array.from(take.map((c) => c.v));
      this.meanRef = take.length ? take.reduce((a, c) => a + c.v, 0) / take.length : 0;
      this.dx = this.dy = 0;
      this.bad = 0;
      this.ready = take.length >= 150;
    }
    cost(dx, dy, cap, stride = 1) {
      const { w } = this;
      const off = dy * w + dx;
      const e = this.edge;
      let s = 0, c = 0;
      for (let k2 = 0; k2 < this.pts.length; k2 += stride) {
        const d = Math.abs(this.vals[k2] - e[this.pts[k2] + off]);
        s += d < cap ? d : cap;
        c++;
      }
      return c ? s / c : Infinity;
    }
    /** Find how far the picture has slid. Call once per frame, in order. */
    update(gray) {
      if (!this.ready) return { dx: 0, dy: 0, ok: false };
      const R2 = this.bad >= 3 ? 26 : 12;
      const pad = R2 + 6;
      const r = { x0: this.region.x0 - pad, y0: this.region.y0 - pad, x1: this.region.x1 + pad, y1: this.region.y1 + pad };
      this.edges(gray, r);
      const cap = Math.max(4, 2.5 * this.meanRef);
      const cx = Math.round(this.dx), cy = Math.round(this.dy);
      const reg = this.region;
      const inside2 = (dx, dy) => reg.x0 + dx >= 1 && reg.x1 + dx <= this.w - 1 && reg.y0 + dy >= 1 && reg.y1 + dy <= this.h - 1;
      let best = Infinity, bx = cx, by = cy;
      for (let dy = cy - R2; dy <= cy + R2; dy += 2)
        for (let dx = cx - R2; dx <= cx + R2; dx += 2) {
          if (!inside2(dx, dy)) continue;
          const v = this.cost(dx, dy, cap, 3);
          if (v < best) best = v, bx = dx, by = dy;
        }
      const cx2 = bx, cy2 = by;
      best = Infinity;
      for (let dy = cy2 - 2; dy <= cy2 + 2; dy++)
        for (let dx = cx2 - 2; dx <= cx2 + 2; dx++) {
          if (!inside2(dx, dy)) continue;
          const v = this.cost(dx, dy, cap);
          if (v < best) best = v, bx = dx, by = dy;
        }
      const sub3 = (p, q, t) => {
        const d = p - 2 * q + t;
        return d > 1e-9 ? Math.max(-0.5, Math.min(0.5, (p - t) / (2 * d))) : 0;
      };
      let fx = bx, fy = by;
      if (inside2(bx - 1, by) && inside2(bx + 1, by) && inside2(bx, by - 1) && inside2(bx, by + 1)) {
        fx = bx + sub3(this.cost(bx - 1, by, cap), best, this.cost(bx + 1, by, cap));
        fy = by + sub3(this.cost(bx, by - 1, cap), best, this.cost(bx, by + 1, cap));
      }
      const ok = best < 0.5 * this.meanRef;
      if (ok) {
        this.dx = fx;
        this.dy = fy;
        this.bad = 0;
      } else this.bad++;
      return { dx: this.dx, dy: this.dy, ok };
    }
    /** Slide a frame back by (dx, dy): out[y][x] = src[y + dy][x + dx], interpolated. */
    warp(src, out, dx = this.dx, dy = this.dy) {
      const { w, h } = this;
      const ix = Math.floor(dx), iy = Math.floor(dy);
      const fx = dx - ix, fy = dy - iy;
      for (let y = 0; y < h; y++) {
        const y0 = Math.min(h - 1, Math.max(0, y + iy)), y1 = Math.min(h - 1, y0 + 1);
        for (let x = 0; x < w; x++) {
          const x0 = Math.min(w - 1, Math.max(0, x + ix)), x1 = Math.min(w - 1, x0 + 1);
          const a = src[y0 * w + x0], b = src[y0 * w + x1], c = src[y1 * w + x0], d = src[y1 * w + x1];
          out[y * w + x] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
        }
      }
      return out;
    }
  };

  // core/src/lanedetect.ts
  var LANE_END_FT = 62.85;
  var ASSUMED_HFOV_DEG = 63;
  var LANE_LEN = 60;
  var newDiag = () => ({ edgePixels: 0, leftLines: 0, rightLines: 0, pairs: 0, guess: null, foulRow: null, pitRow: null, hint: "" });
  function detectLanes(gray, w, h, maxCandidates = 3, seed, diag2) {
    const first = detectLanesOnce(gray, w, h, maxCandidates, seed, diag2);
    if (first.length && first.some(isSolid)) return first;
    const inv = new Uint8ClampedArray(w * h);
    for (let i = 0; i < inv.length; i++) inv[i] = 255 - gray[i];
    const dg2 = diag2 ? newDiag() : void 0;
    const second = detectLanesOnce(inv, w, h, maxCandidates, seed, dg2);
    const best = (l) => l.reduce((m, d) => Math.max(m, d.confidence), 0);
    if (best(second) > best(first)) {
      if (diag2 && dg2) Object.assign(diag2, dg2);
      return second;
    }
    return first;
  }
  function detectLanesOnce(gray, w, h, maxCandidates = 3, seed, diag2) {
    const dbg = (m) => globalThis.__laneDbg?.push(m);
    const sm = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        sm[i] = (4 * gray[i] + 2 * (gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w]) + gray[i - w - 1] + gray[i - w + 1] + gray[i + w - 1] + gray[i + w + 1]) / 16;
      }
    const gx = new Float32Array(w * h);
    const gy = new Float32Array(w * h);
    const mag = new Float32Array(w * h);
    for (let y = 2; y < h - 2; y++)
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        const dx = -sm[i - w - 1] + sm[i - w + 1] - 2 * sm[i - 1] + 2 * sm[i + 1] - sm[i + w - 1] + sm[i + w + 1];
        const dy = -sm[i - w - 1] - 2 * sm[i - w] - sm[i - w + 1] + sm[i + w - 1] + 2 * sm[i + w] + sm[i + w + 1];
        gx[i] = dx;
        gy[i] = dy;
        mag[i] = Math.hypot(dx, dy);
      }
    const sample2 = Float32Array.from({ length: 4e3 }, (_, k2) => mag[Math.floor(k2 / 4e3 * mag.length)]).sort();
    let thr = Math.max(14, sample2[Math.floor(sample2.length * 0.9)], 7 * sample2[Math.floor(sample2.length * 0.5)]);
    if (seed) {
      const near = [];
      for (let y = Math.max(2, Math.round(seed.y - h * 0.2)); y < Math.min(h - 2, Math.round(seed.y + h * 0.2)); y += 2)
        for (let x = Math.max(2, Math.round(seed.x - w * 0.25)); x < Math.min(w - 2, Math.round(seed.x + w * 0.25)); x += 2) near.push(mag[y * w + x]);
      near.sort((a, b) => a - b);
      thr = Math.max(14, near[Math.floor(near.length * 0.85)] * 0.7, 6 * near[Math.floor(near.length * 0.5)]);
    }
    const yA = Math.round(h * 0.1);
    const yB = Math.round(h * 0.9);
    const span = yB - yA;
    const yMin = seed ? 2 : Math.round(h * 0.1);
    const STEP2 = Math.max(1, Math.round(w / 320));
    const PHI_MAX = 68 * Math.PI / 180;
    const DPHI = 0.4 * Math.PI / 180;
    const WIN = 15 * Math.PI / 180;
    const NPHI = Math.floor(2 * PHI_MAX / DPHI) + 1;
    const tanTab = Float32Array.from({ length: NPHI }, (_, k2) => Math.tan(-PHI_MAX + k2 * DPHI));
    const lo = -w * 1.5;
    const NX = Math.ceil(w * 4 / STEP2);
    const accL = new Float32Array(seed ? 0 : NPHI * NX);
    const accR = new Float32Array(seed ? 0 : NPHI * NX);
    const agrees = (i, slope, sign) => (gx[i] - gy[i] * slope) / Math.sqrt(1 + slope * slope) / mag[i] * sign > 0.93;
    const edges = [];
    for (let y = yMin; y < h - 2; y++)
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        if (mag[i] < thr || Math.abs(gx[i]) < (seed ? 0.55 : 0.4) * Math.abs(gy[i])) continue;
        edges.push(i);
        if (seed) continue;
        const acc = gx[i] > 0 ? accL : accR;
        const sgn = gx[i] > 0 ? 1 : -1;
        void sgn;
        const phiE = Math.atan(-gy[i] / gx[i]);
        const k0 = Math.max(0, Math.ceil((phiE - WIN + PHI_MAX) / DPHI));
        const k1 = Math.min(NPHI - 1, Math.floor((phiE + WIN + PHI_MAX) / DPHI));
        for (let k2 = k0; k2 <= k1; k2++) {
          const xi = Math.round((x - tanTab[k2] * (y - yA) - lo) / STEP2);
          if (xi >= 0 && xi < NX) acc[k2 * NX + xi]++;
        }
      }
    dbg(`thr ${thr.toFixed(1)} edges ${edges.length}`);
    if (diag2) diag2.edgePixels = edges.length;
    if (edges.length < 60) {
      if (diag2) diag2.hint = "I can barely see any edges: the picture may be too dark, blurry or flat.";
      return [];
    }
    const xAt = (l, y) => l.xa + (l.xb - l.xa) * (y - yA) / span;
    const supportOf = (xa, xb, sign) => {
      const rows2 = new Uint8Array(h);
      const slope = (xb - xa) / span;
      for (const i of edges) {
        if (gx[i] * sign <= 0 || !agrees(i, slope, sign)) continue;
        const y = Math.floor(i / w);
        if (Math.abs(i % w - (xa + (xb - xa) * (y - yA) / span)) <= 2.5 * STEP2 * Math.sqrt(1 + slope * slope)) rows2[y] = 1;
      }
      let top = -1;
      let bot = -1;
      for (let y = 0; y < h - 8; y++) {
        let c = 0;
        for (let k2 = 0; k2 < 8; k2++) c += rows2[y + k2];
        if (c >= 6) {
          if (top < 0) top = y;
          bot = y + 7;
        }
      }
      return { top, bot, rows: rows2 };
    };
    const refine = (xa, xb, sign, top, bot, tol = 2.5 * STEP2) => {
      for (let it = 0; it < 3; it++) {
        let sw = 0, sy = 0, sx = 0, syy = 0, sxy = 0;
        const cur2 = (xb - xa) / span;
        for (const i of edges) {
          if (gx[i] * sign <= 0 || !agrees(i, cur2, sign)) continue;
          const y = Math.floor(i / w);
          if (y < top || y > bot) continue;
          const px = i % w;
          const lx = xa + (xb - xa) * (y - yA) / span;
          if (Math.abs(px - lx) > tol * Math.sqrt(1 + cur2 * cur2)) continue;
          const wgt = mag[i];
          sw += wgt;
          sy += wgt * y;
          sx += wgt * px;
          syy += wgt * y * y;
          sxy += wgt * y * px;
        }
        const den = sw * syy - sy * sy;
        if (sw < 1 || Math.abs(den) < 1e-6) break;
        const slope = (sw * sxy - sy * sx) / den;
        const icpt = (sx - slope * sy) / sw;
        xa = icpt + slope * yA;
        xb = icpt + slope * yB;
      }
      return { xa, xb };
    };
    const linesOf = (acc, sign, k2) => {
      let best = 0;
      for (let i = 0; i < acc.length; i++) if (acc[i] > best) best = acc[i];
      const floorV = Math.max(10, best * 0.15);
      const cells = [];
      for (let i = 0; i < acc.length; i++) if (acc[i] >= floorV) cells.push(i);
      cells.sort((p, q) => acc[q] - acc[p]);
      const out = [];
      const taken = [];
      for (const c of cells.slice(0, 8e3)) {
        const xa = lo + c % NX * STEP2;
        const xb = xa + tanTab[Math.floor(c / NX)] * span;
        if (taken.some((p) => Math.abs(p.a - xa) <= 6 * STEP2 && Math.abs(p.b - xb) <= 8 * STEP2)) continue;
        taken.push({ a: xa, b: xb });
        let s = supportOf(xa, xb, sign);
        if (s.top < 0 || s.bot - s.top < h * 0.06) continue;
        const ref = refine(xa, xb, sign, s.top, s.bot);
        s = supportOf(ref.xa, ref.xb, sign);
        if (s.top < 0 || s.bot - s.top < h * 0.06) continue;
        out.push({ xa: ref.xa, xb: ref.xb, votes: acc[c], top: s.top, bot: s.bot, rows: s.rows });
        if (out.length >= k2) break;
      }
      return out;
    };
    const seededLines = (sign) => {
      if (!seed) return [];
      const sx = Math.round(seed.x);
      const sy = Math.round(seed.y);
      const g = (x, y) => x < 2 || x >= w - 2 || y < 2 || y >= h - 2 ? 0 : gx[y * w + x] * sign;
      let x0 = -1;
      for (let d = 4; d < w; d++) {
        const x = sign > 0 ? sx - d : sx + d;
        if (x < 3 || x > w - 4) break;
        if (g(x, sy) > thr) {
          let bx = x;
          for (let k2 = -3; k2 <= 3; k2++) if (g(x + k2, sy) > g(bx, sy)) bx = x + k2;
          x0 = bx;
          break;
        }
      }
      if (x0 < 0) return [];
      const pts = [{ x: x0, y: sy }];
      for (const dir of [1, -1]) {
        let x = x0;
        let slope = 0;
        let miss = 0;
        const recent = [{ x: x0, y: sy }];
        for (let y = sy + dir; y > 2 && y < h - 3; y += dir) {
          const tol = recent.length < 12 ? 6 : 3;
          const pred = x + slope * dir;
          let best = -1;
          let bv = thr * 0.6;
          for (let cx = Math.round(pred - tol); cx <= Math.round(pred + tol); cx++) {
            const v = g(cx, y);
            if (v > bv && Math.abs(gx[y * w + cx]) >= 0.4 * Math.abs(gy[y * w + cx])) {
              bv = v;
              best = cx;
            }
          }
          if (best < 0) {
            if (++miss > 8) break;
            x = pred;
            continue;
          }
          miss = 0;
          x = best;
          pts.push({ x, y });
          recent.push({ x, y });
          if (recent.length > 14) recent.shift();
          if (recent.length >= 6) slope = (recent[recent.length - 1].x - recent[0].x) / (recent[recent.length - 1].y - recent[0].y);
        }
      }
      if (pts.length < 40) return [];
      let inl = pts;
      let a = 0;
      let b = 0;
      for (let round = 0; round < 4; round++) {
        let sw = 0, sy2 = 0, sx2 = 0, syy = 0, sxy = 0;
        for (const p of inl) {
          sw++;
          sy2 += p.y;
          sx2 += p.x;
          syy += p.y * p.y;
          sxy += p.y * p.x;
        }
        const den = sw * syy - sy2 * sy2;
        if (Math.abs(den) < 1e-9) return [];
        b = (sw * sxy - sy2 * sx2) / den;
        a = (sx2 - b * sy2) / sw;
        const res = pts.map((p) => Math.abs(p.x - (a + b * p.y)));
        const med3 = [...res].sort((p, q) => p - q)[Math.floor(res.length / 2)];
        const lim = Math.max(1.5, 2.5 * med3);
        inl = pts.filter((_, k2) => res[k2] <= lim);
        if (inl.length < 30) return [];
      }
      const ys = inl.map((p) => p.y);
      const top = Math.min(...ys);
      const bot = Math.max(...ys);
      const rows2 = new Uint8Array(h);
      for (const p of inl) for (let k2 = -2; k2 <= 2; k2++) if (p.y + k2 >= 0 && p.y + k2 < h) rows2[p.y + k2] = 1;
      return [{ xa: a + b * yA, xb: a + b * yB, votes: inl.length, top, bot, rows: rows2 }];
    };
    const Ls = seed ? seededLines(1) : linesOf(accL, 1, 16);
    const Rs = seed ? seededLines(-1) : linesOf(accR, -1, 16);
    globalThis.__laneLines = { Ls, Rs, yA, span };
    dbg(`lines L ${Ls.length} R ${Rs.length}`);
    if (diag2) {
      diag2.leftLines = Ls.length;
      diag2.rightLines = Rs.length;
    }
    dbg("L lines @row200: " + Ls.map((l) => `${(l.xa + (l.xb - l.xa) * (200 - yA) / span).toFixed(0)}[v${l.votes},${l.top}-${l.bot}]`).join(" "));
    dbg("R lines @row200: " + Rs.map((l) => `${(l.xa + (l.xb - l.xa) * (200 - yA) / span).toFixed(0)}[v${l.votes},${l.top}-${l.bot}]`).join(" "));
    if (!Ls.length || !Rs.length) {
      if (diag2) diag2.hint = Ls.length || Rs.length ? "I can see one edge of the lane but not the other. Make sure both gutters are in view." : "I can't pick out the lane edges. Aim so the whole lane, with both gutters, fills the middle of the picture.";
      return [];
    }
    const rowMean = (y, xl, xr) => {
      let s = 0;
      let n = 0;
      for (let x = Math.max(0, Math.ceil(xl)); x <= Math.min(w - 1, Math.floor(xr)); x++) {
        s += sm[Math.round(y) * w + x];
        n++;
      }
      return n ? s / n : NaN;
    };
    const cands = [];
    const maxV = Math.max(Ls[0].votes, Rs[0].votes);
    let why = { range: 0, shape: 0, contrast: 0 };
    for (const L2 of Ls)
      for (const R2 of Rs) {
        const t = Math.max(L2.top, R2.top);
        const b = Math.min(L2.bot, R2.bot);
        if (b - t < h * 0.06) {
          why.range++;
          continue;
        }
        const wt = xAt(R2, t) - xAt(L2, t);
        const wb = xAt(R2, b) - xAt(L2, b);
        if (wt < 2 || wb < wt * 1.02 || wb > w * 1.05) {
          why.shape++;
          continue;
        }
        let good = 0;
        let rowsN = 0;
        let strengthSum = 0;
        for (let y = t + 2; y <= b - 2; y += 3) {
          const xl = xAt(L2, y);
          const xr = xAt(R2, y);
          const wid = xr - xl;
          if (wid < 3) continue;
          const inside2 = rowMean(y, xl + wid * 0.2, xr - wid * 0.2);
          const left = xl - wid * 0.2 < 1 ? NaN : rowMean(y, xl - wid * 0.3, xl - wid * 0.08);
          const right = xr + wid * 0.2 > w - 2 ? NaN : rowMean(y, xr + wid * 0.08, xr + wid * 0.3);
          if (!Number.isFinite(left) && !Number.isFinite(right)) continue;
          rowsN++;
          if ((!Number.isFinite(left) || inside2 - left > 6) && (!Number.isFinite(right) || inside2 - right > 6)) good++;
          strengthSum += Math.max(0, Math.min(100, Math.min(Number.isFinite(left) ? inside2 - left : 100, Number.isFinite(right) ? inside2 - right : 100)));
        }
        if (rowsN < 5 || good / rowsN < 0.45) {
          why.contrast++;
          continue;
        }
        const contrast = good / rowsN;
        const votes = (L2.votes + R2.votes) / (2 * maxV);
        const cb = (xAt(L2, b) + xAt(R2, b)) / 2;
        const centered = 1 - 0.12 * Math.min(1, Math.abs(cb - w / 2) / (w * 0.5));
        const lenScore = Math.min(1, (b - t) / (h * 0.25));
        cands.push({ L: L2, R: R2, t, b, base: (votes + contrast + 0.5 * lenScore + 1.2 * (strengthSum / rowsN / 100)) * centered });
      }
    dbg(`pairs ${cands.length}; rejected ${JSON.stringify(why)}`);
    if (diag2) {
      diag2.pairs = cands.length;
      if (!cands.length) diag2.hint = "I see edges, but nothing that looks like a bright lane between two dark gutters yet.";
    }
    cands.sort((p, q) => q.base - p.base);
    const distinct = [];
    for (const c of cands) {
      const cb = (xAt(c.L, c.b) + xAt(c.R, c.b)) / 2;
      const isSame = (d) => {
        if (Math.abs((xAt(d.L, d.b) + xAt(d.R, d.b)) / 2 - cb) > 0.04 * w) return false;
        const y = Math.min(c.b, d.b) - 2;
        const wc = xAt(c.R, y) - xAt(c.L, y);
        const wd = xAt(d.R, y) - xAt(d.L, y);
        return wd > 0 && wc / wd > 0.85 && wc / wd < 1.18;
      };
      if (!distinct.some(isSame)) distinct.push(c);
      if (distinct.length >= maxCandidates + 9) break;
    }
    if (diag2 && distinct[0]) {
      const c = distinct[0];
      diag2.guess = { left: { x0: xAt(c.L, c.t), y0: c.t, x1: xAt(c.L, c.b), y1: c.b }, right: { x0: xAt(c.R, c.t), y0: c.t, x1: xAt(c.R, c.b), y1: c.b } };
    }
    dbg(`candidates: ${distinct.map((c) => `[${xAt(c.L, c.b).toFixed(0)}-${xAt(c.R, c.b).toFixed(0)}@${c.b} t${c.t} base ${c.base.toFixed(2)}]`).join(" ")}`);
    const results = [];
    for (const c of distinct) {
      const r = geometry(c);
      if (r) results.push(r);
    }
    const sorted2 = results.sort((p, q) => q.confidence - p.confidence).slice(0, maxCandidates);
    if (diag2 && sorted2.length) diag2.hint = "";
    return sorted2;
    function geometry(c) {
      let { L: L2, R: R2 } = c;
      const { t, b } = c;
      const notes = [];
      const sL = (L2.xb - L2.xa) / span;
      const sR = (R2.xb - R2.xa) / span;
      if (Math.abs(sL - sR) < 1e-6) return dbg("reject: parallel lines"), null;
      const yv = yA + (R2.xa - L2.xa) / (sL - sR);
      if (!Number.isFinite(yv) || yv > t - 3) return dbg(`reject: vanishing row ${yv.toFixed(1)} vs top ${t}`), null;
      const prof = new Float32Array(h);
      const up = new Float32Array(h);
      const yStart = Math.max(3, Math.ceil(yv) + 3);
      for (let y = yStart; y < h - 3; y++) {
        const cl = xAt(L2, y) + 2 * STEP2;
        const cr = xAt(R2, y) - 2 * STEP2;
        if (cr - cl < 4) continue;
        let cnt = 0;
        let s = 0;
        let n = 0;
        for (let x = Math.max(2, Math.ceil(cl)); x <= Math.min(w - 3, Math.floor(cr)); x++) {
          const i = y * w + x;
          n++;
          if (Math.abs(gy[i]) > thr * 0.6 && Math.abs(gy[i]) > 1.3 * Math.abs(gx[i])) {
            cnt++;
            s += gy[i];
          }
        }
        if (n) {
          prof[y] = cnt / n;
          up[y] = s / n / Math.max(1, thr);
        }
      }
      const localMax = (arr, min, k2, from = yStart + 1, to = h - 4) => {
        const out = [];
        for (let y = Math.max(from, yStart + 1); y < to; y++) if (arr[y] >= min && arr[y] >= arr[y - 1] && arr[y] >= arr[y + 1]) out.push(y);
        return out.sort((p, q) => arr[q] - arr[p]).slice(0, k2);
      };
      const topRows = (arr) => Array.from({ length: h }, (_, y) => y).filter((y) => y >= yStart && y < h - 4).sort((p, q) => arr[q] - arr[p]).slice(0, 6).map((y) => `${y}:${arr[y].toFixed(2)}`).join(" ");
      const prow = new Float32Array(h).fill(NaN);
      const plow = new Float32Array(h).fill(NaN);
      const phigh = new Float32Array(h).fill(NaN);
      for (let y = yStart; y < h - 3; y++) {
        const wid = xAt(R2, y) - xAt(L2, y);
        if (wid < 6) continue;
        const a = Math.max(2, Math.ceil(xAt(L2, y) + 0.2 * wid));
        const b2 = Math.min(w - 3, Math.floor(xAt(R2, y) - 0.2 * wid));
        if (b2 - a < 3) continue;
        const vals = [];
        for (let x = a; x <= b2; x++) vals.push(sm[y * w + x]);
        vals.sort((p, q) => p - q);
        prow[y] = vals[vals.length >> 1];
        plow[y] = vals[vals.length >> 2];
        phigh[y] = vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.9))];
      }
      const pAvg = (ya, yb, y, src = prow) => {
        let s = 0, n = 0;
        for (let k2 = ya; k2 <= yb; k2++) {
          const v = src[Math.round(y + k2)];
          if (Number.isFinite(v)) {
            s += v;
            n++;
          }
        }
        return n >= Math.max(1, (yb - ya + 1) / 2) ? s / n : NaN;
      };
      const foulCands = localMax(prof, 0.2, 8, Math.floor(t + h * 0.05), h - 4);
      const pitBefore = Math.max(14, Math.round(0.045 * h));
      const pitAfter = Math.max(18, Math.round(0.055 * h));
      const pitCands = localMax(up, 0.3, 6, Math.floor(t - pitBefore), Math.floor(t + pitAfter));
      {
        const dip = new Float32Array(h);
        const stp = new Float32Array(h);
        for (let y = yStart + 11; y < h - 12; y++) {
          const a = pAvg(-9, -4, y), b2 = pAvg(4, 9, y), m = pAvg(-1, 1, y);
          if (Number.isFinite(a) && Number.isFinite(b2) && Number.isFinite(m)) dip[y] = Math.max(Math.min(a, b2) - m, m - Math.max(a, b2));
          const la = pAvg(-9, -4, y, plow), lb = pAvg(4, 9, y, plow), lm = pAvg(-1, 1, y, plow);
          if (Number.isFinite(la) && Number.isFinite(lb)) stp[y] = Math.abs(la - lb) - 0.5 * (Number.isFinite(lm) ? Math.max(0, Math.max(Math.min(la, lb) - lm, lm - Math.max(la, lb))) : 0);
        }
        const peaks = (arr, min, k2, from, to) => {
          const out = [];
          for (let y = Math.max(from, yStart + 12); y < Math.min(to, h - 13); y++) if (arr[y] >= min && arr[y] >= arr[y - 1] && arr[y] >= arr[y + 1]) out.push(y);
          return out.sort((p, q) => arr[q] - arr[p]).slice(0, k2);
        };
        for (const y of peaks(dip, 2.5, 8, Math.floor(t + h * 0.05), h - 4)) if (!foulCands.some((c2) => Math.abs(c2 - y) <= 2)) foulCands.push(y);
        for (const y of peaks(stp, 6, 6, Math.floor(t - pitBefore), Math.floor(t + pitAfter))) if (!pitCands.some((c2) => Math.abs(c2 - y) <= 2)) pitCands.push(y);
        for (const y of peaks(stp, 4, 4, Math.floor(b - 0.05 * h), Math.floor(b + 0.05 * h))) if (!foulCands.some((c2) => Math.abs(c2 - y) <= 2)) foulCands.push(y);
      }
      const supported = (y) => (L2.rows[y] || L2.rows[y - 1] || L2.rows[y + 1] || L2.rows[y - 2] || L2.rows[y + 2]) && (R2.rows[y] || R2.rows[y - 1] || R2.rows[y + 1] || R2.rows[y - 2] || R2.rows[y + 2]);
      const bandMean = (ya, yb, y) => {
        let s = 0, n = 0;
        for (let k2 = ya; k2 <= yb; k2++) {
          const yy = Math.round(y + k2);
          if (yy < 2 || yy >= h - 2) return NaN;
          const wid = xAt(R2, yy) - xAt(L2, yy);
          if (wid < 3) return NaN;
          const m = rowMean(yy, xAt(L2, yy) + 0.2 * wid, xAt(R2, yy) - 0.2 * wid);
          if (Number.isFinite(m)) {
            s += m;
            n++;
          }
        }
        return n ? s / n : NaN;
      };
      const isThinLine = (f) => {
        const above = pAvg(-9, -4, f);
        const below = pAvg(4, 9, f);
        const mid2 = pAvg(-1, 1, f);
        if (![above, below, mid2].every(Number.isFinite)) return false;
        const margin = Math.max(2.5, (above + below) / 2 * 0.03);
        return mid2 < Math.min(above, below) - margin || mid2 > Math.max(above, below) + margin;
      };
      const isLaneToApproach = (f) => {
        const a = pAvg(-9, -4, f);
        const c2 = pAvg(4, 9, f);
        return Number.isFinite(a) && Number.isFinite(c2) && Math.abs(a - c2) > Math.max(5, Math.max(a, c2) * 0.07);
      };
      const isPitStep = (p) => {
        const above = pAvg(-10, -4, p, plow);
        const below = pAvg(4, 10, p, plow);
        return Number.isFinite(above) && Number.isFinite(below) && Math.abs(above - below) > Math.max(6, Math.max(above, below) * 0.12);
      };
      let walk2 = NaN;
      {
        const lane0 = pAvg(-6, 6, Math.round(t + 0.45 * (b - t)), plow);
        const lowRun = Math.max(6, Math.round(0.022 * h));
        if (Number.isFinite(lane0)) {
          let low = 0;
          for (let y = Math.floor(b) - 3; y > yStart + 2; y--) {
            const v = plow[y];
            if (!Number.isFinite(v)) continue;
            if (v < lane0 * 0.78) {
              if (++low >= lowRun) {
                walk2 = y + low;
                break;
              }
            } else low = 0;
          }
        }
        if (Number.isFinite(walk2) && !pitCands.some((c2) => Math.abs(c2 - walk2) <= 2)) pitCands.push(Math.round(walk2));
      }
      const lane1 = pAvg(-6, 6, Math.round(t + 0.45 * (b - t)), plow);
      const validPits = pitCands.filter((p) => {
        const below = pAvg(4, 10, p, plow);
        return Number.isFinite(lane1) && Number.isFinite(below) && Math.abs(below - lane1) <= Math.max(20, lane1 * 0.2) && isPitStep(p);
      });
      let lowestPit = validPits.length ? Math.max(...validPits) : NaN;
      let pinPit = NaN;
      {
        const ref = pAvg(10, 18, Math.round(t), prow);
        const whiteAt = Number.isFinite(ref) ? Math.max(150, ref + 34) : 230;
        for (let y = Math.max(yStart + 2, Math.floor(t - pitBefore)); y < Math.min(h - 3, Math.floor(t + pitAfter)); y++) {
          const white2 = (yy) => Number.isFinite(phigh[yy]) && phigh[yy] >= whiteAt;
          if (!white2(y) || white2(y - 1)) continue;
          let e = y;
          while (e < h - 3 && white2(e + 1)) e++;
          const wid = xAt(R2, y) - xAt(L2, y);
          const pinH = wid * (15 / 41.5) * 0.95;
          if (e - y + 1 >= 0.55 * pinH && e - y + 1 <= 2.8 * pinH + 1) {
            pinPit = y + 0.85 * pinH;
            break;
          }
        }
      }
      const laneMed = pAvg(-6, 6, Math.round(t + 0.45 * (b - t)), prow);
      if (!Number.isFinite(pinPit) && Number.isFinite(laneMed)) {
        const bright = (y) => Number.isFinite(prow[y]) && prow[y] >= laneMed * 1.08 + 4;
        for (let y = Math.max(yStart + 2, Math.floor(t - pitBefore)); y < Math.min(h - 3, Math.floor(t + pitAfter)); y++) {
          if (!bright(y) || bright(y - 1)) continue;
          let e = y;
          while (e < h - 3 && bright(e + 1)) e++;
          const wid = xAt(R2, y) - xAt(L2, y);
          const pinH = wid * (15 / 41.5) * 0.95;
          if (e - y + 1 >= 0.45 * pinH && e - y + 1 <= 1.6 * pinH + 1) {
            pinPit = y + pinH;
            break;
          }
        }
      }
      if (Number.isFinite(pinPit) && !pitCands.some((c2) => Math.abs(c2 - pinPit) <= 1.5)) pitCands.push(Math.round(pinPit));
      if (Number.isFinite(pinPit)) {
        const pc = pitCands.find((c2) => Math.abs(c2 - pinPit) <= 2);
        if (pc !== void 0 && (!Number.isFinite(lowestPit) || pc > lowestPit)) lowestPit = pc;
      }
      const laneLevel = pAvg(-6, 6, Math.round(t + 0.45 * (b - t)), plow);
      let best = null;
      const tried = [];
      for (let pass = 0; pass < 2 && !best; pass++)
        for (const f of foulCands) {
          if (pass === 0 ? !isThinLine(f) && !(Math.abs(f - b) <= 0.05 * h && isLaneToApproach(f)) : Math.abs(f - b) > 0.04 * h) continue;
          for (const p of pitCands) {
            if (f - p < h * 0.06 || !(isPitStep(p) || Number.isFinite(pinPit) && Math.abs(p - pinPit) <= 2)) continue;
            const rho = (p - yv) / (f - yv);
            if (!(rho > 0.03 && rho < 0.75)) continue;
            let cov = 0;
            let n = 0;
            for (let y = p + 3; y <= f - 3; y += 2) {
              n++;
              if (supported(y)) cov++;
            }
            tried.push(`f${f}/p${p}:cov${n ? (cov / n).toFixed(2) : "-"}`);
            if (!n || cov / n < 0.5) continue;
            const nearB = Math.max(0, 1 - Math.abs(f - b) / (0.06 * h));
            const nearT = Math.max(0, 1 - Math.abs(p - t) / (0.05 * h));
            const pitLow = Math.max(0, Math.min(1, (p - (t - pitBefore)) / (pitBefore + pitAfter)));
            const belowP = pAvg(4, 10, p, plow);
            const laneMatch = Number.isFinite(laneLevel) && Number.isFinite(belowP) ? 1 - Math.min(1, Math.abs(belowP - laneLevel) / Math.max(20, laneLevel * 0.35)) : 0;
            const wF = Math.max(1, xAt(R2, f) - xAt(L2, f));
            const dRows = LANE_END_FT * rho / (1 - rho);
            const fovDeg = 2 * Math.atan(Math.max(w, h) / 2 * (41.5 / 12) / (wF * dRows)) * 180 / Math.PI;
            const fovFit = h > w ? Math.exp(-0.5 * ((fovDeg - 58) / 28) ** 2) : Math.exp(-0.5 * ((fovDeg - 66) / 22) ** 2);
            const score = cov / n * 1 + prof[f] * 0.5 + Math.min(1, up[p]) * 0.5 + 1.2 * nearB + 0.6 * nearT + 0.8 * pitLow + 1.3 * laneMatch + 1.6 * fovFit + (Number.isFinite(walk2) && Math.abs(p - walk2) <= 2.5 ? 0.6 : 0) + (p === lowestPit ? 1.6 : 0) + (Number.isFinite(pinPit) && Math.abs(p - pinPit) <= 2 ? 2.2 : 0);
            if (!best || score > best.score) best = { pit: p, foul: f, score };
          }
        }
      if (!best && diag2 && !diag2.hint) diag2.hint = "I found both lane edges but not the foul line and the end of the lane together. Tilt the phone so the foul line, the arrows and the pins are all in view.";
      if (!best) return fallback(L2, R2, t, b, yv, up, notes) ?? (dbg(`reject: no foul/pit pair foul ${foulCands.join(",")} pit ${pitCands.join(",")} yv ${yv.toFixed(1)} t ${t} b ${b} | ${tried.slice(0, 8).join(" ")} | L(${L2.xa.toFixed(0)},${L2.xb.toFixed(0)}) R(${R2.xa.toFixed(0)},${R2.xb.toFixed(0)})`), null);
      const centroid = (arr, y, r, base) => {
        let sw = 0;
        let sy = 0;
        for (let k2 = Math.max(3, y - r); k2 <= Math.min(h - 4, y + r); k2++) {
          const v = Math.max(0, arr[k2] - base);
          sw += v;
          sy += v * k2;
        }
        return sw > 0 ? sy / sw : y;
      };
      const foul = prof[best.foul] > 0.05 ? centroid(prof, best.foul, 4, prof[best.foul] * 0.4) : best.foul;
      const halfway = (p) => {
        const A = pAvg(-10, -4, p, plow);
        const B = pAvg(4, 10, p, plow);
        if (!Number.isFinite(A) || !Number.isFinite(B) || Math.abs(A - B) < 6) return NaN;
        const mid2 = (A + B) / 2;
        const rising = B > A;
        for (let y = p - 5; y <= p + 5; y++) {
          const a = plow[y], c2 = plow[y + 1];
          if (!Number.isFinite(a) || !Number.isFinite(c2)) continue;
          if (rising ? a < mid2 && c2 >= mid2 : a > mid2 && c2 <= mid2) return y + (mid2 - a) / (c2 - a || 1) + 0.5;
        }
        return NaN;
      };
      const hw = halfway(best.pit);
      const pit = Number.isFinite(pinPit) && Math.abs(best.pit - pinPit) <= 2 ? pinPit : Number.isFinite(hw) && Math.abs(hw - best.pit) <= (Number.isFinite(pinPit) ? 1.5 : 4) ? hw : up[best.pit] > 0.1 ? centroid(up, best.pit, 3, up[best.pit] * 0.3) : best.pit;
      if (diag2 && !diag2.foulRow) {
        diag2.foulRow = foul;
        diag2.pitRow = pit;
      }
      const foulOk = true;
      const pitOk = true;
      const LR = refine(L2.xa, L2.xb, 1, Math.ceil(pit) + 4, Math.floor(foul) - 3, 2 * STEP2);
      const RR = refine(R2.xa, R2.xb, -1, Math.ceil(pit) + 4, Math.floor(foul) - 3, 2 * STEP2);
      L2 = { ...L2, xa: LR.xa, xb: LR.xb };
      R2 = { ...R2, xa: RR.xa, xb: RR.xb };
      const sideRow = (guess, side, kind2) => {
        let sw = 0;
        let sy = 0;
        for (let y = Math.round(guess) - 7; y <= Math.round(guess) + 7; y++) {
          if (y < 3 || y >= h - 3) continue;
          const xl = xAt(L2, y);
          const xr = xAt(R2, y);
          const wid = xr - xl;
          if (wid < 6) continue;
          const x0 = side === "L" ? xl + 0.08 * wid : xl + 0.55 * wid;
          const x1 = side === "L" ? xl + 0.45 * wid : xr - 0.08 * wid;
          let c2 = 0;
          let n = 0;
          for (let x = Math.max(2, Math.ceil(x0)); x <= Math.min(w - 3, Math.floor(x1)); x++) {
            const i = y * w + x;
            n++;
            if (kind2 === "foul") {
              if (Math.abs(gy[i]) > thr * 0.6 && Math.abs(gy[i]) > 1.3 * Math.abs(gx[i])) c2++;
            } else if (gy[i] > thr * 0.6 && gy[i] > 1.3 * Math.abs(gx[i])) c2++;
          }
          const v = n ? c2 / n : 0;
          sw += v * v;
          sy += v * v * y;
        }
        return sw > 0 ? sy / sw : guess;
      };
      let fyL = sideRow(foul, "L", "foul");
      let fyR = sideRow(foul, "R", "foul");
      let pL = sideRow(pit, "L", "pit");
      let pR = sideRow(pit, "R", "pit");
      const dF = fyR - fyL;
      const dP = pR - pL;
      if (Math.abs(dF) < 1.5 || Math.abs(dP) < 1.5 || Math.sign(dF) !== Math.sign(dP) || Math.abs(dP / dF) > 1.6 || Math.abs(dP / dF) < 0.15) {
        fyL = fyR = foul;
        pL = pR = pit;
      }
      const rowFor = (fyS, pS) => {
        const rho = (pS - yv) / (fyS - yv);
        if (!(rho > 0.03 && rho < 0.75)) return null;
        const K = LANE_END_FT * rho / (1 - rho);
        return yv + (fyS - yv) * K / (K + LANE_LEN);
      };
      const r60L = rowFor(fyL, pL);
      const r60R = rowFor(fyR, pR);
      if (r60L === null || r60R === null) return dbg(`reject: rho out of range yv ${yv.toFixed(1)} foul ${fyL.toFixed(1)}/${fyR.toFixed(1)} pit ${pL.toFixed(1)}/${pR.toFixed(1)}`), null;
      if (!(r60L < fyL - 4 && r60R < fyR - 4)) return dbg(`reject: row60 ${r60L} ${r60R}`), null;
      const fy = (fyL + fyR) / 2;
      const row60 = (r60L + r60R) / 2;
      const corners2 = [
        { x: xAt(L2, fyL), y: fyL },
        { x: xAt(R2, fyR), y: fyR },
        { x: xAt(R2, r60R), y: r60R },
        { x: xAt(L2, r60L), y: r60L }
      ];
      const wFoul = corners2[1].x - corners2[0].x;
      const fPx = Math.max(w, h) / 2 / Math.tan(ASSUMED_HFOV_DEG * Math.PI / 360);
      const distFromWidth = fPx * (41.5 / 12) / Math.max(1, wFoul);
      const rhoMid = (pit - yv) / (fy - yv);
      const distFromRows = LANE_END_FT * rhoMid / (1 - rhoMid);
      const impliedHfov = 2 * Math.atan(Math.max(w, h) / 2 * (41.5 / 12) / (Math.max(1, wFoul) * distFromRows)) * 180 / Math.PI;
      if (!(impliedHfov > (h > w ? 10 : 30) && impliedHfov < 118)) return dbg(`reject: the rows and the lane width imply a ${impliedHfov.toFixed(0)} degree field of view`), null;
      const agree = distFromWidth / distFromRows;
      const wBot = corners2[1].x - corners2[0].x;
      const wTop = corners2[2].x - corners2[3].x;
      if (!(wBot > 6 && wTop > 0.3 && wTop < wBot)) return dbg(`reject: widths ${wBot.toFixed(1)} ${wTop.toFixed(1)}`), null;
      const confidence = Math.max(0, Math.min(1, 0.35 * Math.min(1, c.base / 1.6) + 0.25 * (foulOk ? 1 : 0.2) + 0.3 * (pitOk ? 1 : 0) + 0.1 * Math.min(1, (fy - row60) / (h * 0.15))));
      return { corners: corners2, confidence, notes, rows: { foul: foulOk ? foul : null, pit: pitOk ? pit : null, vanishing: yv } };
    }
    function fallback(L2, R2, t, b, yv, up, notes) {
      let pit = t;
      let pv = 0;
      for (let y = Math.max(3, Math.floor(t - 12)); y <= Math.min(h - 4, Math.floor(t + 16)); y++) if (up[y] > pv) pv = up[y], pit = y;
      const stepFound = pv > 0.2;
      if (!stepFound) pit = t;
      const wPit = xAt(R2, pit) - xAt(L2, pit);
      if (wPit < 4) return null;
      const fPx = w / 2 / Math.tan(ASSUMED_HFOV_DEG * Math.PI / 360);
      const zPit = fPx * (41.5 / 12) / wPit;
      const zFoul = zPit - LANE_END_FT;
      if (zFoul < 3 || pit - yv < 2) return null;
      const c = (pit - yv) * zPit;
      const rowAt = (ft) => yv + c / (zFoul + ft);
      const fy = rowAt(0);
      const r60 = rowAt(LANE_LEN);
      const corners2 = [
        { x: xAt(L2, fy), y: fy },
        { x: xAt(R2, fy), y: fy },
        { x: xAt(R2, r60), y: r60 },
        { x: xAt(L2, r60), y: r60 }
      ];
      notes.push("foul line not visible: distances come from the lane's width and a typical phone field of view, so they are approximate");
      if (!stepFound) notes.push("end of lane not clearly visible");
      return { corners: corners2, confidence: stepFound ? 0.6 : 0.45, notes, rows: { foul: null, pit: stepFound ? pit : null, vanishing: yv } };
    }
  }
  var isSolid = (d) => d.confidence >= 0.85 && d.rows.foul !== null && d.rows.pit !== null;
  function oneOfEach(list, w) {
    const mid2 = (d) => (d.corners[0].x + d.corners[1].x) / 2;
    const wid = (d) => Math.abs(d.corners[1].x - d.corners[0].x);
    const out = [];
    for (const d of [...list].sort((a, b) => b.confidence - a.confidence)) {
      const sharesEdge = (o) => {
        const r = wid(o) / Math.max(1, wid(d));
        return (r > 1.15 && r < 2.4 || r < 1 / 1.15 && r > 1 / 2.4) && (Math.abs(o.corners[0].x - d.corners[0].x) < 0.03 * w || Math.abs(o.corners[1].x - d.corners[1].x) < 0.03 * w);
      };
      const i = out.findIndex((o) => Math.abs(mid2(o) - mid2(d)) < 0.05 * w && wid(o) / Math.max(1, wid(d)) > 0.6 && wid(o) / Math.max(1, wid(d)) < 1.7 || sharesEdge(o));
      if (i < 0) out.push(d);
      else if (wid(d) < 0.85 * wid(out[i])) out[i] = d;
    }
    return out;
  }
  function chooseLane(cands, w) {
    const solid2 = oneOfEach(cands.filter(isSolid), w);
    if (solid2.length <= 1) return { pick: solid2[0] ?? null, choices: solid2 };
    const off = (d) => Math.abs((d.corners[0].x + d.corners[1].x) / 2 - w / 2) / w;
    const ranked = [...solid2].sort((a, b) => off(a) - off(b));
    if (off(ranked[0]) < 0.12 && off(ranked[1]) - off(ranked[0]) > 0.1) return { pick: ranked[0], choices: solid2 };
    return { pick: null, choices: ranked };
  }
  function detectLaneAt(gray, w, h, x, y) {
    return detectLanes(gray, w, h, 1, { x, y })[0] ?? null;
  }
  function detectionsAgree(a, b, tol) {
    return a.every((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y) <= tol);
  }

  // camera/guide.ts
  function openGuide() {
    const el = $("guide");
    el.classList.add("on");
    el.innerHTML = `
    <div class="row"><h2>Getting a good lock</h2><button class="btn ghost" id="gd-close">Close</button></div>
    <div class="note">The app finds the lane by itself. These steps give it the best chance, and they're also what makes the speed and board readings accurate.</div>

    <div class="card">
      <div class="k">What the camera should see</div>
      <svg viewBox="0 0 360 230" style="width:100%;height:auto;display:block;margin-top:8px" role="img" aria-label="Phone view: the lane narrows from the foul line at the bottom to the pins at the top, centered, with both gutters visible">
        <rect x="6" y="6" width="348" height="218" rx="14" fill="#0b1220" stroke="rgba(255,255,255,.25)"/>
        <polygon points="120,200 240,200 196,52 164,52" fill="rgba(214,170,110,.35)" stroke="#46e6ff" stroke-width="2"/>
        <polygon points="104,200 120,200 164,52 160,52" fill="rgba(120,160,255,.35)"/>
        <polygon points="240,200 256,200 200,52 196,52" fill="rgba(120,160,255,.35)"/>
        <line x1="110" y1="196" x2="250" y2="196" stroke="#ff5a6e" stroke-width="3"/>
        <line x1="160" y1="52" x2="200" y2="52" stroke="#fff" stroke-width="3"/>
        <circle cx="170" cy="44" r="3" fill="#fff"/><circle cx="180" cy="44" r="3" fill="#fff"/><circle cx="190" cy="44" r="3" fill="#fff"/><circle cx="175" cy="38" r="3" fill="#fff"/><circle cx="185" cy="38" r="3" fill="#fff"/><circle cx="180" cy="32" r="3" fill="#fff"/>
        <g font-family="system-ui" font-size="11" font-weight="700">
          <text x="262" y="199" fill="#ff5a6e">foul line: keep it in view</text>
          <text x="214" y="56" fill="#fff">end of the lane and the pins</text>
          <text x="14" y="120" fill="#9db2ff">both gutters</text><line x1="62" y1="116" x2="108" y2="116" stroke="#9db2ff"/>
          <text x="14" y="214" fill="#8a97b2">leave a little room below the foul line</text>
          <text x="86" y="22" fill="#8a97b2">best view: straight behind. Off to one side works too</text>
        </g>
      </svg>
    </div>

    <div class="card"><div class="k">Set up, in order</div><ol style="padding-left:20px;line-height:1.5;margin:8px 0">
      <li><b>Behind the approach, or off to one side.</b> Dead center is easiest, but it does not have to be. A spot beside the approach or behind the next lane works as long as the whole lane, foul line to pins, is in view. Use a tripod or a steady spot, about chest to head height, with the phone turned sideways (landscape).</li>
      <li><b>Frame the whole lane.</b> The foul line near the bottom, the pins at the top, both gutters in view. Leave a little room below the foul line so it isn't cut off.</li>
      <li><b>Aim slightly down</b> so the lane fills the middle of the picture, not just a thin strip.</li>
      <li><b>Keep it level.</b> The foul line should look flat across the screen, not tilted.</li>
      <li><b>Distance:</b> about 10 to 20 feet behind the foul line works best. If the lane looks thin, move closer or lower. Don't zoom in; the normal 1&times; camera is what the app expects.</li>
      <li><b>Light:</b> even lighting is best. Avoid pointing into bright lights or the shiny reflections on the lane, and wipe the lens.</li>
      <li><b>Clear the view.</b> Nobody standing in front of the lens or on the lane while it locks. It takes a second or two.</li>
      <li><b>Then leave it.</b> Once it says READY, don't bump the phone. It re-checks every few seconds and re-locks on its own if it moves. Put it in the same spot next time and it's ready straight away.</li>
    </ol></div>

    <div class="card"><div class="k">What the checklist means</div><ul>
      <li><b>Left edge / Right edge:</b> the two sides of the lane. Drawn in blue and pink as soon as they're found.</li>
      <li><b>Lane shape:</b> the two edges together look like a bright lane between dark gutters.</li>
      <li><b>Foul line / Lane end:</b> the red and white lines. Both must be seen, because they set the distances.</li>
      <li><b>Steady 3/3:</b> three checks in a row agree. Then it locks.</li>
    </ul></div>

    <div class="card"><div class="k">If it won't lock</div><ul>
      <li>Read the hint under the video. It says what's missing: both gutters, the foul line, too dark, glare.</li>
      <li>After about 12 seconds it asks you to <b>tap your lane once</b>. It then follows that lane's edges. Distances are approximate if the foul line isn't in view.</li>
      <li>Last resort: <b>Place corners</b> and tap the four corners yourself.</li>
      <li>Several lanes in view? If yours is not clearly in the middle, the lanes are numbered on screen: <b>tap yours</b>. Picked the wrong one? Tap <b>Re-lock</b>.</li>
      <li>Speed reads far off? That usually means a wrong lock. Tap <b>Re-lock</b>.</li>
      <li>Tap <b>Save frame</b> if it keeps failing and send me the files. Real frames are how I improve this.</li>
    </ul></div>`;
    $("gd-close").onclick = () => (el.classList.remove("on"), el.innerHTML = "");
  }

  // core/src/track.ts
  var BALL_RADIUS_IN = 4.25;
  var INCH_PER_X = 41.5 / 39;
  var BallTracker = class {
    bg = null;
    /** what the empty lane looks like in colour (red minus blue), so a ball the same brightness as the lane is still seen */
    bgC = null;
    path = [];
    /** ball positions in picture pixels, for drawing */
    trail = [];
    confirmed = false;
    /** every ball-like blob seen in the latest frame, in lane coordinates (the recording of these, over a whole shot, is what the shot is traced from) */
    lastCands = [];
    /** chains that were thrown out as "something else" (a person, a pin), and how they moved: so a ball that is missed can be explained */
    /** the frame interval, smoothed: how long a missed frame is depends on the frame rate (60 fps gives 17 ms, 30 fps 33 ms) */
    dtEma = 1 / 30;
    lastT = -1;
    rejects = [];
    /** last blob (grid pixels) and its speed per frame */
    last = null;
    lost = 0;
    /** what the last frame looked like to the tracker, so a silent screen can be explained: moving pixels, blobs, ball-like blobs and why others were dropped */
    stats = { fg: 0, blobs: 0, cands: 0, tiny: 0, offLane: 0, size: 0, shape: 0, hyps: 0 };
    /** the ball's expected radius at the last position, in grid pixels */
    lastR = 0;
    t0 = 0;
    lanePrev = -1;
    /** where the ball was last seen on the lane (boards, feet) and when, to judge where it can be next however sparse the frames are */
    lastLane = null;
    /** how far down the lane the last dozen frames were, to notice a "ball" that has stopped getting anywhere */
    recent = [];
    sampleIdx = [];
    fgAge = new Uint8Array(0);
    hyps = [];
    nextId = 1;
    lead = null;
    leadSeen = -1;
    s;
    /** set to true to keep what was seen each frame (candidates and the chains being followed), for drawing what the tracker is doing */
    debug = false;
    dbg = null;
    constructor(setup) {
      this.s = setup;
      for (let i = 0; i < setup.mask.length; i += 5) if (setup.mask[i]) this.sampleIdx.push(i);
    }
    reset(keepBackground = true) {
      this.path = [];
      this.trail = [];
      this.confirmed = false;
      this.last = null;
      this.lost = 0;
      this.lanePrev = -1;
      this.lastLane = null;
      this.recent = [];
      this.hyps = [];
      this.lead = null;
      this.leadSeen = -1;
      if (!keepBackground) {
        this.bg = null;
        this.bgC = null;
      }
    }
    /** Learn the empty lane again (after a shot, or when the lighting has changed). */
    forgetBackground() {
      this.bg = null;
      this.bgC = null;
    }
    lane(x, y) {
      return applyHomography(this.s.H, { x: x * this.s.scale, y: y * this.s.scale });
    }
    /** How big a ball looks, in grid pixels (radius), at a spot on the lane. */
    expectedRadius(laneX, laneY) {
      const r = BALL_RADIUS_IN / INCH_PER_X;
      const a = applyHomography(this.s.Hinv, { x: laneX - r, y: laneY });
      const b = applyHomography(this.s.Hinv, { x: laneX + r, y: laneY });
      return Math.max(1.2, Math.hypot(b.x - a.x, b.y - a.y) / 2 / this.s.scale);
    }
    blobs(fg, chroma) {
      const { w, h } = this.s;
      const seen2 = new Uint8Array(w * h);
      const out = [];
      const stack = [];
      for (let i = 0; i < fg.length; i++) {
        if (!fg[i] || seen2[i]) continue;
        let sx = 0, sy = 0, n = 0, sc = 0;
        let x0 = w, x1 = 0, y0 = h, y1 = 0;
        stack.push(i);
        seen2[i] = 1;
        while (stack.length) {
          const k2 = stack.pop();
          const x = k2 % w;
          const y = k2 / w | 0;
          sx += x;
          sy += y;
          n++;
          if (chroma) sc += chroma[k2];
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          for (const q of [k2 - 1, k2 + 1, k2 - w, k2 + w]) {
            if (q < 0 || q >= fg.length || !fg[q] || seen2[q]) continue;
            if (q === k2 - 1 && x === 0 || q === k2 + 1 && x === w - 1) continue;
            seen2[q] = 1;
            stack.push(q);
          }
        }
        out.push({ x: sx / n, y: sy / n, area: n, w: x1 - x0 + 1, h: y1 - y0 + 1, c: chroma ? sc / n : 128 });
      }
      return out;
    }
    /** Miles per hour between the first and last point of a chain, and the share of its steps that went down the lane. */
    motion(h) {
      const a = h.pts[0], b = h.pts[h.pts.length - 1];
      const mph = (b.ly - a.ly) / Math.max(1e-6, b.t - a.t) * (3600 / 5280);
      let fwd = 0;
      for (let i = 1; i < h.pts.length; i++) if (h.pts[i].ly > h.pts[i - 1].ly + 0.05) fwd++;
      const st2 = [];
      for (let i = 1; i < h.pts.length; i++) st2.push({ x: h.pts[i].x - h.pts[i - 1].x, y: h.pts[i].y - h.pts[i - 1].y });
      const mean9 = st2.length ? st2.reduce((acc, v) => acc + Math.hypot(v.x, v.y), 0) / st2.length : 0;
      let jerk = 0;
      for (let i = 1; i < st2.length; i++) jerk += Math.hypot(st2[i].x - st2[i - 1].x, st2[i].y - st2[i - 1].y);
      jerk = st2.length > 1 ? jerk / (st2.length - 1) / Math.max(3, mean9) : 0;
      const maxStep = st2.reduce((acc, v) => Math.max(acc, Math.hypot(v.x, v.y)), 0);
      return { mph, fwd: h.pts.length > 1 ? fwd / (h.pts.length - 1) : 0, span: b.ly - a.ly, jerk, jumpy: maxStep > 3 * mean9 + 8 };
    }
    /** Feed one frame (grayscale, grid size, and optionally red-minus-blue). `t` is the frame's time in seconds. */
    step(gray, t, chroma) {
      const { w, h, mask } = this.s;
      if (this.lastT >= 0) {
        const d2 = t - this.lastT;
        if (d2 > 0 && d2 < 0.5) this.dtEma = 0.9 * this.dtEma + 0.1 * d2;
      }
      this.lastT = t;
      if (!this.bg) {
        this.bg = gray.slice();
        this.bgC = chroma ? chroma.slice() : null;
        return "idle";
      }
      const bg = this.bg;
      const bgC = chroma && this.bgC ? this.bgC : null;
      const d = this.sampleIdx.map((i) => gray[i] - bg[i]).sort((a, b) => a - b);
      const off = d.length ? d[d.length >> 1] : 0;
      const mad = d.length ? [...d].map((v) => Math.abs(v - off)).sort((a, b) => a - b)[d.length >> 1] * 1.4826 : 4;
      const thr = Math.max(18, 4.5 * mad);
      const fg = new Uint8Array(w * h);
      let fgCount = 0;
      for (let i = 0; i < gray.length; i++) if (mask[i] && Math.abs(gray[i] - off - bg[i]) > thr) fg[i] = 1, fgCount++;
      let offC = 0;
      if (bgC && chroma) {
        const dc = this.sampleIdx.map((i) => chroma[i] - bgC[i]).sort((a, b) => a - b);
        offC = dc.length ? dc[dc.length >> 1] : 0;
        const madC = dc.length ? [...dc].map((v) => Math.abs(v - offC)).sort((a, b) => a - b)[dc.length >> 1] * 1.4826 : 4;
        const thrC = Math.max(22, 5 * madC);
        for (let i = 0; i < gray.length; i++) if (mask[i] && !fg[i] && Math.abs(chroma[i] - offC - bgC[i]) > thrC) fg[i] = 1, fgCount++;
      }
      if (this.fgAge.length !== fg.length) this.fgAge = new Uint8Array(fg.length);
      const following = !!this.lead && this.lead.pts.length >= 2;
      if (following) this.fgAge.fill(0);
      else
        for (let i = 0; i < fg.length; i++) {
          if (!fg[i]) this.fgAge[i] = 0;
          else if (++this.fgAge[i] >= 24) {
            bg[i] = gray[i] - off;
            if (bgC && chroma) bgC[i] = chroma[i] - offC;
            this.fgAge[i] = 0;
            fg[i] = 0;
          }
        }
      const cands = [];
      const st2 = { fg: fgCount, blobs: 0, cands: 0, tiny: 0, offLane: 0, size: 0, shape: 0, hyps: 0 };
      this.stats = st2;
      for (const b of this.blobs(fg, chroma)) {
        st2.blobs++;
        if (b.area < 2) {
          st2.tiny++;
          continue;
        }
        const l0 = this.lane(b.x, b.y);
        const cy = Math.min(h - 1, b.y + 0.95 * this.expectedRadius(l0.x, l0.y));
        if (!mask[Math.round(cy) * w + Math.round(b.x)]) {
          st2.offLane++;
          continue;
        }
        const l = this.lane(b.x, cy);
        if (l.y < -4 || l.y > 66 || l.x < -1 || l.x > 40) {
          st2.offLane++;
          continue;
        }
        const er = this.expectedRadius(l.x, l.y);
        const r = Math.sqrt(b.area / Math.PI);
        const ratio = r / er;
        if (ratio < 0.3 || ratio > 2.6) {
          st2.size++;
          continue;
        }
        const aspect = b.h / Math.max(1, b.w);
        if (aspect > 3.5 || aspect < 0.25) {
          st2.shape++;
          continue;
        }
        const fill = b.area / (b.w * b.h);
        if (fill < 0.28) {
          st2.shape++;
          continue;
        }
        st2.cands++;
        const blue = (128 - b.c) / 0.6;
        const q = Math.abs(Math.log(ratio)) + Math.abs(Math.log(Math.max(0.3, Math.min(3, aspect)))) * 0.6 + Math.abs(fill - 0.78) * 1.5 - 0.5 * Math.max(0, Math.min(1, (blue - 15) / 60));
        cands.push({ ...b, y: b.y, lx: l.x, ly: l.y, er, q, by: cy });
      }
      this.lastCands = cands.map((c) => ({ lx: c.lx, ly: c.ly, q: c.q }));
      const used = /* @__PURE__ */ new Set();
      for (const hy of this.hyps) {
        const lastPt = hy.pts[hy.pts.length - 1];
        const px = lastPt.x + hy.vx, py = lastPt.y + hy.vy;
        const reach = Math.max(8, 2 * Math.hypot(hy.vx, hy.vy) + 1.4 * lastPt.er);
        let bi = -1, bs = Infinity;
        cands.forEach((c, i) => {
          if (used.has(i) || c.ly < lastPt.ly - 1.2) return;
          const dd = Math.hypot(c.x - px, c.y - py);
          if (dd >= reach) return;
          const sc = dd + 6 * c.q;
          if (sc < bs) bs = sc, bi = i;
        });
        if (bi < 0) {
          const dt = Math.max(5e-3, t - lastPt.t);
          let bq = Infinity;
          cands.forEach((c, i) => {
            if (used.has(i)) return;
            if (c.ly >= lastPt.ly - 0.8 && c.ly <= lastPt.ly + 51 * dt + 2 && Math.abs(c.lx - lastPt.lx) <= 4 + 9 * dt && c.q < bq) bq = c.q, bi = i;
          });
          if (bi >= 0 && hy.pts.length < 3 && dt < 0.12) bi = -1;
        }
        if (bi >= 0) {
          const c = cands[bi];
          used.add(bi);
          hy.vx = hy.pts.length ? 0.6 * (c.x - lastPt.x) + 0.4 * hy.vx : 0;
          hy.vy = hy.pts.length ? 0.6 * (c.y - lastPt.y) + 0.4 * hy.vy : 0;
          hy.pts.push({ x: c.x, y: c.y, lx: c.lx, ly: c.ly, t, er: c.er, by: c.by });
          hy.qsum += c.q;
          hy.miss = 0;
        } else {
          hy.miss++;
          lastPt.x += 0;
        }
      }
      if (!this.confirmed) {
        cands.forEach((c, i) => {
          if (used.has(i) || c.ly >= 48 || this.hyps.length >= 16) return;
          this.hyps.push({ id: this.nextId++, pts: [{ x: c.x, y: c.y, lx: c.lx, ly: c.ly, t, er: c.er, by: c.by }], vx: 0, vy: 0, miss: 0, qsum: c.q, confirmed: false });
        });
      } else if (this.lead && this.lead.miss > 0) {
        cands.forEach((c, i) => {
          if (used.has(i)) return;
          const lp = this.lead.pts[this.lead.pts.length - 1];
          const dt = Math.max(5e-3, t - lp.t);
          if (c.ly >= lp.ly - 0.8 && c.ly <= lp.ly + 51 * dt + 2 && Math.abs(c.lx - lp.lx) <= 4 + 9 * dt) {
            this.lead.pts.push({ x: c.x, y: c.y, lx: c.lx, ly: c.ly, t, er: c.er, by: c.by });
            this.lead.miss = 0;
            used.add(i);
          }
        });
      }
      const perFrame = Math.max(1, 0.0333 / this.dtEma);
      const maxMiss = (hy) => hy.confirmed ? Math.round((this.lanePrev > 45 ? 10 : 40) * perFrame) : Math.max(4, Math.round(0.28 / this.dtEma));
      this.hyps = this.hyps.filter((hy) => hy.miss <= maxMiss(hy));
      st2.hyps = this.hyps.length;
      let justConfirmed = false;
      if (!this.confirmed) {
        let pick = null;
        let pickScore = -Infinity;
        for (const hy of this.hyps) {
          if (hy.pts.length < 5) continue;
          const m = this.motion(hy);
          const steady = m.fwd >= 0.7 && m.span >= 3 && m.jerk <= 0.8 && !m.jumpy;
          const farAndFast = hy.pts.length >= 12 && m.mph >= 9 && m.mph <= 32 && m.fwd >= 0.55 && m.span >= 12 && hy.qsum / hy.pts.length <= 0.95;
          if (m.mph >= 6 && m.mph <= 35 && (steady || farAndFast)) {
            const score = hy.pts.length - 3 * (hy.qsum / hy.pts.length) - 2 * m.jerk;
            if (score > pickScore) pick = hy, pickScore = score;
          } else if (hy.pts.length >= 9 && !(m.fwd >= 0.4 && m.span >= 2 && m.mph >= 3)) {
            hy.miss = 99;
            if (this.rejects.length < 12) this.rejects.push({ n: hy.pts.length, mph: +m.mph.toFixed(1), fwd: +m.fwd.toFixed(2), span: +m.span.toFixed(1), jerk: +m.jerk.toFixed(2), jumpy: m.jumpy, q: +(hy.qsum / hy.pts.length).toFixed(2) });
          }
        }
        if (pick) {
          pick.confirmed = true;
          this.confirmed = true;
          justConfirmed = true;
          this.hyps = [pick];
        }
      }
      let lead2 = null;
      if (this.confirmed) lead2 = this.hyps[0] ?? this.lead;
      else lead2 = this.hyps.filter((x) => x.miss === 0 && x.pts.length >= 1).sort((a, b) => b.pts.length - 3 * (b.qsum / b.pts.length) - 2 * this.motion(b).jerk - (a.pts.length - 3 * (a.qsum / a.pts.length) - 2 * this.motion(a).jerk))[0] ?? null;
      this.lead = lead2;
      if (this.debug) this.dbg = { cands: cands.map((c) => ({ x: c.x, y: c.y, q: c.q, er: c.er, lx: c.lx, ly: c.ly, area: c.area })), hyps: this.hyps.map((x) => {
        const p = x.pts[x.pts.length - 1];
        return { id: x.id, n: x.pts.length, x: p.x, y: p.y, vx: x.vx, vy: x.vy, conf: x.confirmed, miss: x.miss };
      }), lead: lead2 ? lead2.id : null, fgBox: null };
      if (lead2) {
        const n = lead2.pts.length;
        const pt2 = lead2.pts[n - 1];
        const matched = lead2.miss === 0;
        this.last = { x: pt2.x + (matched ? 0 : lead2.vx * lead2.miss), y: pt2.y + (matched ? 0 : lead2.vy * lead2.miss), vx: lead2.vx, vy: lead2.vy };
        this.lost = lead2.miss;
        this.lastR = pt2.er;
        this.lanePrev = Math.max(...lead2.pts.map((p) => p.ly));
        if (this.leadSeen !== lead2.id) {
          this.leadSeen = lead2.id;
          this.recent = [];
        }
        this.lastLane = { x: pt2.lx, y: pt2.ly, t: pt2.t };
        this.t0 = lead2.pts[0].t;
        this.path = lead2.pts.map((p) => ({ t: p.t - this.t0, x: p.lx, y: p.ly }));
        this.trail = lead2.pts.map((p) => ({ x: p.x * this.s.scale, y: (p.by ?? p.y) * this.s.scale }));
        if (matched) {
          for (let i = 0; i < bg.length; i++) if (!fg[i]) bg[i] += (gray[i] - off - bg[i]) * 0.01;
          if (bgC && chroma) {
            for (let i = 0; i < bgC.length; i++) if (!fg[i]) bgC[i] += (chroma[i] - offC - bgC[i]) * 0.01;
          }
          this.recent.push(pt2.ly);
          if (this.recent.length > 12) this.recent.shift();
          const progress2 = this.recent.length >= 12 ? pt2.ly - this.recent[0] : Infinity;
          if (progress2 < 1 && this.confirmed && this.lanePrev > 40) return "finished";
          if (this.path.length > 500) return this.confirmed ? "finished" : (this.reset(), "reset");
          if (pt2.ly > 56) return this.confirmed ? "finished" : (this.reset(), "reset");
          return justConfirmed ? "confirmed" : "tracking";
        }
        const limit = this.lanePrev > 45 ? 10 : 40;
        if (this.lost > limit) {
          if (this.confirmed && this.lanePrev > 30) return "finished";
          this.reset();
          return "reset";
        }
        return "tracking";
      }
      if (this.last && !this.hyps.length) {
        this.reset();
        return "reset";
      }
      this.last = null;
      for (let i = 0; i < bg.length; i++) bg[i] += (gray[i] - off - bg[i]) * 0.04;
      if (bgC && chroma) for (let i = 0; i < bgC.length; i++) bgC[i] += (chroma[i] - offC - bgC[i]) * 0.04;
      return "idle";
    }
  };
  function edgeMap(gray, w, h) {
    const g = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        g[i] = Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + w] - gray[i - w]);
      }
    return g;
  }
  function measureShift(ref, cur2, w, h, box, range = 10) {
    const x0 = Math.max(range + 1, Math.floor(box.x0));
    const x1 = Math.min(w - range - 2, Math.ceil(box.x1));
    const y0 = Math.max(range + 1, Math.floor(box.y0));
    const y1 = Math.min(h - range - 2, Math.ceil(box.y1));
    let energy = 0;
    let n = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) energy += ref[y * w + x], n++;
    energy = n ? energy / n : 0;
    const score = (dx, dy) => {
      let s = 0;
      let c = 0;
      for (let y = y0; y < y1; y += 2)
        for (let x = x0; x < x1; x += 2) {
          s += Math.abs(ref[y * w + x] - cur2[(y + dy) * w + x + dx]);
          c++;
        }
      return c ? s / c : Infinity;
    };
    const none2 = score(0, 0);
    let best = none2;
    let bdx = 0;
    let bdy = 0;
    for (let dy = -range; dy <= range; dy++)
      for (let dx = -range; dx <= range; dx++) {
        if (!dx && !dy) continue;
        const v = score(dx, dy);
        if (v < best) best = v, bdx = dx, bdy = dy;
      }
    return { dx: bdx, dy: bdy, best, none: none2, energy, atLimit: Math.max(Math.abs(bdx), Math.abs(bdy)) >= range };
  }

  // core/src/pins.ts
  var PIN_INCHES = [
    [0, 0],
    [-6, 10.392],
    [6, 10.392],
    [-12, 20.785],
    [0, 20.785],
    [12, 20.785],
    [-18, 31.177],
    [-6, 31.177],
    [6, 31.177],
    [18, 31.177]
  ];
  var INCH_PER_X2 = 41.5 / 39;
  var PIN_W = 4.766;
  var PIN_H2 = 15;
  var COLS = 5;
  var ROWS = 9;
  function pinBoxes(P) {
    return PIN_INCHES.map(([lat, behind], i) => {
      const x = 19.5 + lat / INCH_PER_X2;
      const y = 60 + behind / 12;
      const base = P(x, y);
      const r = PIN_W / 2 / INCH_PER_X2;
      const wpx = Math.abs(P(x + r, y).x - P(x - r, y).x);
      const hpx = wpx * (PIN_H2 / PIN_W) * 0.95;
      return { id: i + 1, x0: base.x - wpx * 0.45, x1: base.x + wpx * 0.45, y0: base.y - hpx, y1: base.y };
    });
  }
  function deckRegion(boxes) {
    const wide = Math.max(...boxes.map((b) => b.x1 - b.x0));
    return {
      x0: Math.min(...boxes.map((b) => b.x0)) - wide * 1.2,
      x1: Math.max(...boxes.map((b) => b.x1)) + wide * 1.2,
      y0: Math.min(...boxes.map((b) => b.y0)) - wide * 0.5,
      y1: Math.max(...boxes.map((b) => b.y1)) + wide * 0.5
    };
  }
  function samplePins(gray, w, h, boxes, ox = 0, oy = 0) {
    const mean9 = (x0, y0, x1, y1) => {
      const a = Math.max(0, Math.floor(x0 - ox));
      const b = Math.min(w - 1, Math.ceil(x1 - ox) - 1);
      const c = Math.max(0, Math.floor(y0 - oy));
      const d = Math.min(h - 1, Math.ceil(y1 - oy) - 1);
      if (b < a || d < c) return NaN;
      let s = 0;
      let n = 0;
      for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) s += gray[y * w + x], n++;
      return n ? s / n : NaN;
    };
    const wide = Math.max(...boxes.map((b) => b.x1 - b.x0));
    const cx0 = Math.min(...boxes.map((b) => b.x0));
    const cx1 = Math.max(...boxes.map((b) => b.x1));
    const cy0 = Math.min(...boxes.map((b) => b.y0));
    const cy1 = Math.max(...boxes.map((b) => b.y1));
    const left = mean9(cx0 - wide * 2.4, cy0, cx0 - wide * 0.5, cy1);
    const right = mean9(cx1 + wide * 0.5, cy0, cx1 + wide * 2.4, cy1);
    const ref = Number.isFinite(left) && Number.isFinite(right) ? (left + right) / 2 : Number.isFinite(left) ? left : right;
    return boxes.map((bx) => {
      const bw = bx.x1 - bx.x0;
      const bh = bx.y1 - bx.y0;
      const cells = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push(mean9(bx.x0 + bw * c / COLS, bx.y0 + bh * r / ROWS, bx.x0 + bw * (c + 1) / COLS, bx.y0 + bh * (r + 1) / ROWS));
      const m = cells.reduce((s, v) => s + v, 0) / cells.length;
      return { id: bx.id, cells, mean: m, ref, ok: cells.every(Number.isFinite) && Number.isFinite(ref) };
    });
  }
  var pinContrast = (s) => s.ok ? Math.abs(s.mean - s.ref) : 0;
  function pinsReadable(base) {
    return base.filter((s) => pinContrast(s) >= 8).length >= 8;
  }
  function readPins(base, now) {
    const standing = base.map((b, i) => {
      const n = now[i];
      const c = pinContrast(b);
      if (!n || !n.ok || c < 8) return null;
      const shift = n.ref - b.ref;
      let d = 0;
      for (let k2 = 0; k2 < b.cells.length; k2++) d += Math.abs(n.cells[k2] - shift - b.cells[k2]);
      d /= b.cells.length;
      return d < 0.4 * c + 2;
    });
    const readable = standing.filter((s) => s !== null).length;
    return { standing, down: standing.filter((s) => s === false).length, readable };
  }
  function settledCount(counts) {
    const c = counts.filter((v) => v !== null);
    for (let i = 0; i + 1 < c.length; i++) if (c[i] === c[i + 1]) return c[i];
    return c.length ? c[Math.floor(c.length / 2)] : null;
  }

  // camera/camera.ts
  var video = $("v");
  var overlay = $("o");
  var ctx = overlay.getContext("2d");
  var status = $("status");
  var GW = 640;
  var GH = 360;
  var work = document.createElement("canvas");
  var wctx = work.getContext("2d", { willReadFrequently: true });
  var CORNER_PROMPTS = ["Tap the LEFT edge of the lane at the foul line", "Tap the RIGHT edge of the lane at the foul line", "Tap the RIGHT edge of the lane at the pins end", "Tap the LEFT edge of the lane at the pins end"];
  var LANE_CORNERS = [
    { x: 0, y: 0 },
    { x: LANE_BOARDS, y: 0 },
    { x: LANE_BOARDS, y: LANE_LENGTH_FT },
    { x: 0, y: LANE_LENGTH_FT }
  ];
  var stream = null;
  var corners = [];
  var H2 = null;
  var Hinv = null;
  var trail = [];
  var lastShot = null;
  var tracker = null;
  var laneMask = null;
  var armed = false;
  var stab = null;
  var shakeVX = 0;
  var shakeVY = 0;
  var stabG = null;
  var stabC = null;
  var lastShakeWarn = 0;
  var path = [];
  var lastBlob = null;
  var lost = 0;
  var viewMode = "lane";
  var view3d = null;
  var host3d = null;
  var shown3dKey = "";
  var laneToPx = (x, y) => Hinv ? applyHomography(Hinv, { x, y }) : { x: 0, y: 0 };
  var view2 = () => ({ ctx, width: overlay.width, P: laneToPx });
  function schedule() {
    if (typeof video.requestVideoFrameCallback === "function") video.requestVideoFrameCallback((n, m) => onFrame(n, m));
    else requestAnimationFrame((t) => onFrame(t, { mediaTime: video.currentTime }));
  }
  async function openCamera() {
    const sz = (w, h) => ({ width: { ideal: w }, height: { ideal: h } });
    const tries = [
      { ...sz(1920, 1080), frameRate: { exact: 60 } },
      { ...sz(1280, 720), frameRate: { exact: 60 } },
      { ...sz(1920, 1080), frameRate: { min: 50, ideal: 60 } },
      { ...sz(1280, 720), frameRate: { min: 50, ideal: 60 } },
      { frameRate: { min: 50, ideal: 60 } },
      { ...sz(960, 540), frameRate: { exact: 60 } },
      { ...sz(640, 480), frameRate: { exact: 60 } },
      { ...sz(1920, 1080), frameRate: { ideal: 60, min: 30 } },
      { frameRate: { ideal: 60 } }
    ];
    let best = null;
    let bestFps = 0;
    let lastErr = null;
    for (const t of tries) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", ...t }, audio: false });
        const f = s.getVideoTracks()[0].getSettings().frameRate ?? 30;
        if (f > bestFps) {
          best?.getTracks().forEach((x) => x.stop());
          best = s;
          bestFps = f;
        } else s.getTracks().forEach((x) => x.stop());
        if (bestFps >= 55) break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!best) throw lastErr ?? new Error("no camera");
    const track = best.getVideoTracks()[0];
    if (bestFps < 55) {
      const cap = track.getCapabilities?.()?.frameRate?.max ?? 0;
      capFps = cap;
      for (const c of [{ frameRate: { exact: 60 } }, { frameRate: { ideal: 60 } }, { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }]) {
        try {
          await track.applyConstraints(c);
          const f = track.getSettings().frameRate ?? bestFps;
          if (f > bestFps) bestFps = f;
          if (bestFps >= 55) break;
        } catch {
        }
      }
    } else capFps = track.getCapabilities?.()?.frameRate?.max ?? bestFps;
    if (capFps >= 100) {
      for (const f of [Math.min(capFps, 240), 120]) {
        try {
          await track.applyConstraints({ frameRate: { exact: f } });
          const got = track.getSettings().frameRate ?? 0;
          if (got > bestFps) bestFps = got;
          if (bestFps >= 100) break;
        } catch {
        }
      }
    }
    return best;
  }
  var capFps = 0;
  var deliv = { n: 0, t0: 0, fps: 0 };
  async function startCamera() {
    stream = await openCamera();
    video.srcObject = stream;
    await video.play();
    if (!video.videoWidth || !video.videoHeight) {
      await new Promise((res) => {
        const done2 = () => (video.removeEventListener("loadedmetadata", done2), video.removeEventListener("resize", done2), res());
        video.addEventListener("loadedmetadata", done2);
        video.addEventListener("resize", done2);
        setTimeout(done2, 4e3);
      });
    }
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    await setupZoom();
    const portrait = video.videoHeight > video.videoWidth;
    GW = portrait ? Math.max(240, Math.round(640 * video.videoWidth / video.videoHeight)) : 640;
    GH = portrait ? 640 : Math.round(GW * video.videoHeight / video.videoWidth);
    const stageEl2 = document.getElementById("stage");
    if (stageEl2) {
      stageEl2.classList.toggle("portrait", portrait);
      stageEl2.style.setProperty("--par", String(video.videoWidth / video.videoHeight));
    }
    work.width = GW;
    work.height = GH;
    document.body.classList.add("live");
    const fps = stream.getVideoTracks()[0].getSettings().frameRate;
    setText("fps", fps ? `${Math.round(fps)} FPS` : "LIVE");
    cameraFps = fps ? Math.round(fps) : 0;
    const saved = savedCalibration();
    if (saved) {
      applyCalibration(saved, "your saved setup, verifying");
      verifyUntil = performance.now() + 12e3;
    } else status.textContent = `Camera on (${fps ? Math.round(fps) : "?"} fps). Looking for the lane\u2026`;
    schedule();
  }
  var mode = "auto";
  var detectStartedAt = 0;
  var lastDetectAt = 0;
  var locks = [];
  var candidate = null;
  var verifyUntil = 0;
  var MAX_DW = 640;
  var pending = null;
  var lastCandidates = [];
  var dcanvas = document.createElement("canvas");
  var dctx = dcanvas.getContext("2d", { willReadFrequently: true });
  var laneNo = "";
  var calKey = () => laneNo ? `laneiq.calibration.${laneNo}` : "laneiq.calibration";
  var lastLockConf = null;
  function applyCalibration(c, how) {
    arrowsRead = [];
    arrowTries = 0;
    if (!refiningLock && (how !== "automatic" || lastLockHow !== "automatic")) pinRefs = [], pinTries = 0, pinRefDone = false;
    if (how !== "automatic") rejected = [], redoStreak = 0;
    logLock({ how, secs: /saved setup/.test(how) || !detectStartedAt ? null : Math.round((performance.now() - detectStartedAt) / 100) / 10, confidence: lastLockConf, foulSeen: lastCandidates[0] ? lastCandidates[0].rows.foul !== null : null });
    corners = c;
    lastLockHow = how;
    driftRef = null;
    driftBad = 0;
    lastDriftCheck = performance.now();
    H2 = solveHomography(corners, LANE_CORNERS);
    Hinv = solveHomography(LANE_CORNERS, corners);
    buildMask();
    stab = new Stabilizer(GW, GH);
    stab.setReference(gridGray(), laneBoxGrid());
    shakeVX = shakeVY = 0;
    tracker = null;
    armed = true;
    candidate = null;
    setStep(4);
    setReady(true);
    status.textContent = `Lane locked (${how}). Ready: just bowl. If the lines are not on your lane, tap Fix my lane.`;
    if (!shotsOn) status.textContent = "Lane locked. League mode: tap Start when it is your turn.";
    paintStartStop();
    renderScan();
    try {
      localStorage.setItem(calKey(), JSON.stringify({ v: 2, z: zoomCaps ? zoomNow : 1, n: corners.map((p) => ({ x: p.x / video.videoWidth, y: p.y / video.videoHeight })) }));
    } catch {
    }
  }
  function savedCalibration() {
    try {
      const raw = JSON.parse(localStorage.getItem(calKey()) ?? "null");
      if (raw && raw.v !== 2) return null;
      if (raw?.n?.length === 4 && Math.abs((raw.z ?? 1) - (zoomCaps ? zoomNow : 1)) > 0.01) return null;
      if (raw?.n?.length === 4) return raw.n.map((p) => ({ x: p.x * video.videoWidth, y: p.y * video.videoHeight }));
    } catch {
    }
    return null;
  }
  function grabGray() {
    const w = Math.min(MAX_DW, video.videoWidth);
    dcanvas.width = w;
    dcanvas.height = Math.round(w * video.videoHeight / video.videoWidth);
    dctx.drawImage(video, 0, 0, dcanvas.width, dcanvas.height);
    const px = dctx.getImageData(0, 0, dcanvas.width, dcanvas.height).data;
    const g = new Uint8ClampedArray(dcanvas.width * dcanvas.height);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    if (prevGray && prevGray.length === g.length && !H2) {
      let d = 0, c = 0;
      for (let i = 0; i < g.length; i += 31) {
        d += Math.abs(g[i] - prevGray[i]);
        c++;
      }
      if (d / c < 7) for (let i = 0; i < g.length; i++) g[i] = g[i] + prevGray[i] >> 1;
    }
    prevGray = Uint8ClampedArray.from(g);
    let sum = 0, sq = 0, n = 0;
    for (let i = 0; i < g.length; i += 23) {
      sum += g[i];
      sq += g[i] * g[i];
      n++;
    }
    const mean9 = sum / n;
    const sd3 = Math.sqrt(Math.max(0, sq / n - mean9 * mean9));
    frameHint = mean9 < 38 ? "It's too dark to see the lane. Add light or move the phone toward the lights." : mean9 > 232 ? "The picture is washed out by glare. Angle the phone away from the bright reflections." : sd3 < 14 ? "The picture looks flat or out of focus. Wipe the lens and check the phone is focused on the lane." : "";
    return { g, w: dcanvas.width, h: dcanvas.height, k: video.videoWidth / dcanvas.width, px };
  }
  function chromaChannels(px, n) {
    const a = new Uint8ClampedArray(n);
    const b = new Uint8ClampedArray(n);
    for (let i = 0; i < n; i++) {
      const r = px[i * 4], g = px[i * 4 + 1], bl = px[i * 4 + 2];
      a[i] = 128 + (r - bl) * 0.9;
      b[i] = 128 + (g - (r + bl) / 2) * 1.6;
    }
    return [a, b];
  }
  var frameHint = "";
  var voter = new LaneVoter();
  var lastRgba = null;
  var prevGray = null;
  var diagView = null;
  var scaled = (d, k2) => ({ ...d, corners: d.corners.map((p) => ({ x: p.x * k2, y: p.y * k2 })) });
  var solid = isSolid;
  var chooseList = [];
  var chooseSeen = 0;
  var polyHas = (poly2, x, y) => {
    let inside2 = false;
    for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) if (poly2[i].y > y !== poly2[j].y > y && x < (poly2[j].x - poly2[i].x) * (y - poly2[i].y) / (poly2[j].y - poly2[i].y) + poly2[i].x) inside2 = !inside2;
    return inside2;
  };
  var centerOf = (c) => ({ x: c.reduce((s, p) => s + p.x, 0) / c.length, y: c.reduce((s, p) => s + p.y, 0) / c.length });
  window.__lane = { get groups() {
    return voter.groups(video.videoWidth, video.videoHeight);
  }, get tracker() {
    return tracker;
  }, get path() {
    return path;
  }, get corners() {
    return corners;
  } };
  var adjusted = false;
  var dragIx = -1;
  var detectMs = 0;
  function detectNow() {
    const t0 = performance.now();
    try {
      return detectNow2();
    } finally {
      detectMs = performance.now() - t0;
    }
  }
  function detectNow2() {
    const f = grabGray();
    const dg = newDiag();
    let found = detectLanes(f.g, f.w, f.h, 4, void 0, dg);
    if (!found.some(solid)) {
      for (const ch of chromaChannels(f.px, f.g.length)) {
        const dg2 = newDiag();
        const alt = detectLanes(ch, f.w, f.h, 4, void 0, dg2);
        if (alt.length && alt.reduce((m, d) => Math.max(m, d.confidence), 0) > found.reduce((m, d) => Math.max(m, d.confidence), 0)) {
          found = alt;
          Object.assign(dg, dg2);
        }
      }
    }
    lastCandidates = found.map((d) => scaled(d, f.k));
    lastRgba = { px: f.px, w: f.w, h: f.h, k: f.k };
    const k2 = f.k;
    const seg = (s) => ({ x0: s.x0 * k2, y0: s.y0 * k2, x1: s.x1 * k2, y1: s.y1 * k2 });
    diagView = { ...dg, guess: dg.guess ? { left: seg(dg.guess.left), right: seg(dg.guess.right) } : null, foulRow: dg.foulRow === null ? null : dg.foulRow * k2, pitRow: dg.pitRow === null ? null : dg.pitRow * k2 };
    return lastCandidates[0] ?? null;
  }
  function pill(text, cls) {
    const el = $("ready");
    el.textContent = text;
    el.classList.remove("go", "scan", "ask");
    if (cls) el.classList.add(cls);
  }
  function renderScan(hint = "") {
    const el = $("scan");
    const show = document.body.classList.contains("live") && !H2 && mode !== "manual";
    el.classList.toggle("hide", !show);
    $("tracebtn").classList.toggle("hide", !(document.body.classList.contains("live") && mode !== "manual"));
    $("tracebtn").textContent = H2 ? "Fix my lane" : "Trace my lane";
    $("snapbtn").classList.toggle("hide", !(show && adjusted && pending));
    if (!show) return;
    if (mode === "choose") {
      el.innerHTML = `<span class="sc ask">\u261D Tap your lane</span><div class="note" style="flex-basis:100%">${hint || "I can see more than one lane. Tap the one you are bowling on."}</div>`;
      return;
    }
    if (mode === "tap") {
      el.innerHTML = `<span class="sc ask">\u261D Tap your lane</span><div class="note" style="flex-basis:100%">${hint || "Tap on the lane surface, between its two gutters, and I'll follow the edges from there."}</div>`;
      return;
    }
    const g = diagView;
    const items = [
      ["Left edge", !!g && g.leftLines > 0],
      ["Right edge", !!g && g.rightLines > 0],
      ["Lane shape", !!g?.guess],
      ["Foul line", g?.foulRow != null],
      ["Lane end", g?.pitRow != null],
      [`Steady ${Math.min(locks.length, 3)}/3`, locks.length >= 3]
    ];
    el.innerHTML = items.map(([l, ok]) => `<span class="sc ${ok ? "ok" : ""}">${ok ? "\u2713" : "\u25CB"} ${l}</span>`).join("") + (hint ? `<div class="note" style="flex-basis:100%">${hint}</div>` : "");
  }
  function drawScanner(now) {
    const s = overlay.width / 1280;
    const W2 = overlay.width;
    const Hh = overlay.height;
    ctx.save();
    const y = now / 2200 % 1 * Hh;
    const grad = ctx.createLinearGradient(0, y - 60 * s, 0, y + 6 * s);
    grad.addColorStop(0, "rgba(70,230,255,0)");
    grad.addColorStop(1, "rgba(70,230,255,.28)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, y - 60 * s, W2, 66 * s);
    ctx.fillStyle = "rgba(160,245,255,.9)";
    ctx.shadowColor = "rgba(70,230,255,.9)";
    ctx.shadowBlur = 14 * s;
    ctx.fillRect(0, y, W2, 2.5 * s);
    ctx.shadowBlur = 0;
    const pad = 22 * s;
    const len = 48 * s;
    ctx.strokeStyle = `rgba(70,230,255,${0.55 + 0.4 * Math.sin(now / 350)})`;
    ctx.lineWidth = 4 * s;
    for (const [cx, cy, dx, dy] of [[pad, pad, 1, 1], [W2 - pad, pad, -1, 1], [pad, Hh - pad, 1, -1], [W2 - pad, Hh - pad, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * len);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * len, cy);
      ctx.stroke();
    }
    const g = diagView;
    if (g?.guess) {
      const seg = (a, color, text) => {
        ctx.setLineDash([14 * s, 10 * s]);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(a.x0, a.y0);
        ctx.lineTo(a.x1, a.y1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = `700 ${15 * s}px system-ui`;
        ctx.fillText(text, (a.x0 + a.x1) / 2 + 10 * s, (a.y0 + a.y1) / 2);
      };
      seg(g.guess.left, "#46e6ff", "left edge");
      seg(g.guess.right, "#ff4fd8", "right edge");
      const rowLine = (row, color, text) => {
        if (row === null) return;
        const lx = g.guess.left.x0 + (g.guess.left.x1 - g.guess.left.x0) * (row - g.guess.left.y0) / Math.max(1, g.guess.left.y1 - g.guess.left.y0);
        const rx = g.guess.right.x0 + (g.guess.right.x1 - g.guess.right.x0) * (row - g.guess.right.y0) / Math.max(1, g.guess.right.y1 - g.guess.right.y0);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4 * s;
        ctx.beginPath();
        ctx.moveTo(lx - 20 * s, row);
        ctx.lineTo(rx + 20 * s, row);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = `700 ${15 * s}px system-ui`;
        ctx.fillText(text, rx + 26 * s, row + 5 * s);
      };
      rowLine(g.foulRow, "#ff5a6e", "foul line");
      rowLine(g.pitRow, "#ffffff", "lane end");
    }
    chooseList.forEach((c, i) => {
      ctx.setLineDash([10 * s, 8 * s]);
      ctx.strokeStyle = "rgba(90,255,176,.95)";
      ctx.fillStyle = "rgba(90,255,176,.14)";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      c.forEach((p, k2) => k2 ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      const m = centerOf(c);
      ctx.fillStyle = "#06121a";
      ctx.beginPath();
      ctx.arc(m.x, m.y, 20 * s, 0, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(90,255,176,1)";
      ctx.font = `800 ${22 * s}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), m.x, m.y + 8 * s);
      ctx.textAlign = "start";
    });
    if (pending) {
      pending.corners.forEach((p, i) => {
        ctx.fillStyle = adjusted ? "rgba(90,255,176,1)" : "rgba(255,255,255,.95)";
        ctx.strokeStyle = "rgba(0,0,0,.7)";
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(p.x, p.y, (i === dragIx ? 24 : 18) * (overlay.width / Math.max(1, overlay.getBoundingClientRect().width)), 0, 7);
        ctx.fill();
        ctx.stroke();
      });
    }
    if (candidate) {
      ctx.setLineDash([10 * s, 8 * s]);
      ctx.strokeStyle = "rgba(90,255,176,.9)";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      candidate.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }
  function enterTap(reason) {
    mode = "tap";
    corners = [];
    candidate = null;
    pending = null;
    setStep(0);
    setReady(false);
    $("confirm").classList.add("hide");
    $("manualbtn").classList.remove("hide");
    status.textContent = `${reason} Tap your lane once and I'll follow its edges.`;
    pill("TAP LANE", "ask");
    renderScan();
  }
  function enterChoose(list) {
    mode = "choose";
    chooseList = list;
    candidate = null;
    pending = null;
    locks = [];
    setStep(0);
    setReady(false);
    $("manualbtn").classList.remove("hide");
    status.textContent = `I can see ${list.length} lanes. Tap the one you are bowling on.`;
    pill("TAP YOUR LANE", "ask");
    renderScan();
  }
  var nearMid = (d) => (d.corners[0].x + d.corners[1].x) / 2 / video.videoWidth;
  function rememberedLane() {
    try {
      const v = Number(localStorage.getItem("laneiq.pickedLane"));
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  }
  function autoDetectTick(now) {
    if (mode !== "auto") return;
    if (!detectStartedAt) detectStartedAt = now;
    if (adjusted && pending) return;
    if (now - lastDetectAt < Math.max(400, detectMs * 2)) return;
    lastDetectAt = now;
    detectNow();
    if (rejected.length) lastCandidates = lastCandidates.filter((d2) => !rejected.some((r) => detectionsAgree(r, d2.corners, video.videoWidth * 0.05)));
    voter.add(lastCandidates.filter(solid), now);
    const vr = voter.result(video.videoWidth, video.videoHeight);
    if (vr.lock) {
      let c = vr.lock;
      if (lastRgba) {
        const k2 = lastRgba.k;
        const ps = pinSnap(lastRgba.px, lastRgba.w, lastRgba.h, c.map((p) => ({ x: p.x / k2, y: p.y / k2 })));
        if (ps.found) c = ps.corners.map((p) => ({ x: p.x * k2, y: p.y * k2 }));
      }
      voter.reset();
      pending = null;
      locks = [];
      return applyCalibration(c, "automatic");
    }
    const ch = chooseLane(lastCandidates, video.videoWidth);
    let picked = ch.pick;
    let usedMemory = false;
    if (!picked && ch.choices.length > 1) {
      const mem = rememberedLane();
      const near = mem === null ? null : [...ch.choices].sort((a, b) => Math.abs(nearMid(a) - mem) - Math.abs(nearMid(b) - mem))[0];
      if (near && mem !== null && Math.abs(nearMid(near) - mem) < 0.08) picked = near, usedMemory = true;
    }
    chooseSeen = !picked && ch.choices.length > 1 ? chooseSeen + 1 : 0;
    lastLockConf = picked?.confidence ?? lastCandidates[0]?.confidence ?? null;
    if (chooseSeen >= 2 && (vr.choices.length > 1 || now - detectStartedAt > 14e3)) return enterChoose(ch.choices.map((c) => c.corners));
    const d = picked ?? lastCandidates[0] ?? null;
    pill("SCANNING\u2026", "scan");
    const tol = video.videoWidth * 0.03;
    if (d && solid(d)) {
      pending = null;
      $("confirm").classList.add("hide");
      candidate = d.corners;
      locks.push(d.corners);
      locks = locks.slice(-3);
      setStep(Math.min(3, locks.length));
      status.textContent = "Found the lane, confirming\u2026";
      renderScan("Hold still for a moment while I confirm it.");
      if ((ch.choices.length <= 1 || usedMemory) && locks.length === 3 && locks.every((l) => detectionsAgree(locks[0], l, tol))) {
        applyCalibration(d.corners, "automatic");
        locks = [];
        return;
      }
    } else {
      locks = [];
      candidate = d ? d.corners : null;
      setStep(0);
      let hint = frameHint || diagView?.hint || "Scanning for the lane. Keep both gutters, the foul line and the pins in view.";
      if (d && d.confidence >= 0.4 && now - detectStartedAt > 5e3) {
        pending = d;
        $("confirm").classList.remove("hide");
        hint = d.rows.foul === null ? "Is this your lane? The dashed outline is my best guess (distances will be approximate: I can't see the foul line). Confirm it, or keep scanning." : "Is this your lane? The dashed outline is my best guess. Confirm it, or keep scanning.";
        status.textContent = hint;
      } else {
        pending = null;
        $("confirm").classList.add("hide");
        status.textContent = hint;
      }
      renderScan(hint);
    }
    if (now - detectStartedAt > (pending ? 25e3 : 18e3)) enterTap("Couldn't lock on automatically.");
  }
  var lastLockHow = "";
  var driftRef = null;
  var driftBad = 0;
  var lastDriftCheck = 0;
  function gridGray() {
    wctx.drawImage(video, 0, 0, GW, GH);
    const px = wctx.getImageData(0, 0, GW, GH).data;
    const g = new Float32Array(GW * GH);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    return g;
  }
  function laneBoxGrid() {
    const k2 = GW / video.videoWidth;
    return { x0: Math.min(...corners.map((p) => p.x)) * k2, x1: Math.max(...corners.map((p) => p.x)) * k2, y0: Math.min(...corners.map((p) => p.y)) * k2, y1: Math.max(...corners.map((p) => p.y)) * k2 };
  }
  function lockFits(e) {
    const k2 = GW / video.videoWidth;
    const b = laneBoxGrid();
    let energy = 0;
    let n = 0;
    for (let y = Math.max(1, Math.floor(b.y0)); y < Math.min(GH - 1, b.y1); y += 3) for (let x = Math.max(1, Math.floor(b.x0)); x < Math.min(GW - 1, b.x1); x += 3) energy += e[y * GW + x], n++;
    energy = n ? energy / n : 0;
    let hit = 0;
    let tot = 0;
    for (const [a, c] of [[corners[0], corners[3]], [corners[1], corners[2]]])
      for (let t = 0.08; t <= 0.9; t += 0.04) {
        const x = (a.x + (c.x - a.x) * t) * k2;
        const y = (a.y + (c.y - a.y) * t) * k2;
        let m = 0;
        for (let dx = -4; dx <= 4; dx++) {
          const xi = Math.round(x + dx);
          const yi = Math.round(y);
          if (xi > 0 && xi < GW - 1 && yi > 0 && yi < GH - 1) m = Math.max(m, e[yi * GW + xi]);
        }
        tot++;
        if (m > 1.8 * energy) hit++;
      }
    return tot > 0 && hit / tot >= 0.5;
  }
  function driftCheck(now) {
    if (!H2 || mode !== "auto" || path.length || now < cooldownUntil || now - lastDriftCheck < 2500) return;
    lastDriftCheck = now;
    const cur2 = edgeMap(gridGray(), GW, GH);
    if (!driftRef) {
      if (/saved setup/.test(lastLockHow) && !lockFits(cur2)) {
        relock(false);
        status.textContent = "Your saved lane doesn't match what the camera sees now (the phone has moved). Looking for the lane again\u2026";
        return;
      }
      driftRef = cur2;
      return;
    }
    if (stab?.ready) return;
    const m = measureShift(driftRef, cur2, GW, GH, laneBoxGrid(), 12);
    const moved = (m.dx !== 0 || m.dy !== 0) && m.best < 0.85 * m.none && m.best < 0.7 * m.energy && !m.atLimit;
    if (moved) {
      const k2 = video.videoWidth / GW;
      corners = corners.map((p) => ({ x: p.x + m.dx * k2, y: p.y + m.dy * k2 }));
      H2 = solveHomography(corners, LANE_CORNERS);
      Hinv = solveHomography(LANE_CORNERS, corners);
      buildMask();
      tracker = null;
      driftRef = cur2;
      driftBad = 0;
      try {
        localStorage.setItem(calKey(), JSON.stringify({ v: 2, z: zoomCaps ? zoomNow : 1, n: corners.map((p) => ({ x: p.x / video.videoWidth, y: p.y / video.videoHeight })) }));
      } catch {
      }
      status.textContent = "The phone shifted a little: I moved the lane lock with it.";
      return;
    }
    if (m.atLimit || m.best > 0.9 * m.energy) {
      if (++driftBad === 4) status.textContent = "The picture looks different from when the lane was locked. If the phone moved, tap Re-lock; otherwise ignore this.";
    } else driftBad = 0;
  }
  var arrowsRead = [];
  var arrowTries = 0;
  var lastArrowAt = 0;
  function arrowTick(now) {
    if (arrowTries >= 10 || !H2 || !armed || path.length || now < cooldownUntil || now - lastArrowAt < 1500) return;
    lastArrowAt = now;
    arrowTries++;
    const w = Math.min(MAX_DW, video.videoWidth);
    const h = Math.round(w * video.videoHeight / video.videoWidth);
    const k2 = video.videoWidth / w;
    dcanvas.width = w;
    dcanvas.height = h;
    dctx.drawImage(video, 0, 0, w, h);
    const px = dctx.getImageData(0, 0, w, h).data;
    const g = new Uint8ClampedArray(w * h);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    const a = readArrows(g, w, h, corners.map((p) => ({ x: p.x / k2, y: p.y / k2 })));
    if (a.length >= arrowsRead.length) arrowsRead = a.map((r) => ({ board: r.board, x: r.img.x * k2, y: r.img.y * k2 }));
  }
  var candHist = [];
  var lastShotMedia = -1;
  var lastTrackLog = 0;
  var histActive = false;
  var histTrail = [];
  var lastHistAt = 0;
  function ballArrived(media) {
    status.textContent = "Ball detected, tracking\u2026";
    if (pendingClip) void attachClip().then(() => beginRecording(media));
    else beginRecording(media);
  }
  function historyDetect(now, media) {
    if (now - lastHistAt < 250) return;
    lastHistAt = now;
    const frames = candHist.filter((f) => f.t > lastShotMedia && f.t > media - 7);
    if (frames.length < 10) {
      histActive = false;
      return;
    }
    const p = tracePath(frames);
    const first = p?.[0];
    const last = p?.[p.length - 1];
    const mph = first && last ? (last.y - first.y) / Math.max(1e-6, last.t - first.t) * (3600 / 5280) : 0;
    if (!p || !first || !last || mph < 8) {
      histActive = false;
      return;
    }
    if (!histActive) {
      histActive = true;
      logTrack("ball found by looking back", { points: p.length, mph: +mph.toFixed(1), fromFt: +first.y.toFixed(1), toFt: +last.y.toFixed(1) });
      ballArrived(media);
    }
    histTrail = p.map((s) => laneToPx(s.x, s.y));
    if (media - last.t > 0.8 || last.y >= 56) {
      histActive = false;
      void finish();
    }
  }
  var refiningLock = false;
  var pinRefs = [];
  var pinTries = 0;
  var pinRefDone = false;
  var lastPinRefAt = 0;
  function pinRefineTick(now) {
    if (pinRefDone || !H2 || !armed || path.length || now < cooldownUntil || now - lastPinRefAt < 1200) return;
    if (!/^(automatic|you picked it|your saved setup)/.test(lastLockHow)) return void (pinRefDone = true);
    lastPinRefAt = now;
    const w = Math.min(MAX_DW, video.videoWidth);
    const h = Math.round(w * video.videoHeight / video.videoWidth);
    const k2 = video.videoWidth / w;
    dcanvas.width = w;
    dcanvas.height = h;
    dctx.drawImage(video, 0, 0, w, h);
    const ps = pinSnap(dctx.getImageData(0, 0, w, h).data, w, h, corners.map((p) => ({ x: p.x / k2, y: p.y / k2 })));
    pinTries++;
    if (ps.found) pinRefs.push(ps.corners[2].y * k2);
    if (pinTries >= 16 || pinRefs.length >= 6) {
      pinRefDone = true;
      if (pinRefs.length >= 4) {
        const s2 = [...pinRefs].sort((a, b) => a - b);
        const yr = s2[s2.length >> 1];
        const mad = [...s2].map((v) => Math.abs(v - yr)).sort((a, b) => a - b)[s2.length >> 1];
        const len = Math.abs((corners[0].y + corners[1].y) / 2 - (corners[2].y + corners[3].y) / 2);
        const farNow = (corners[2].y + corners[3].y) / 2;
        if (mad <= 0.012 * len && Math.abs(yr - farNow) >= 0.012 * len && Math.abs(yr - farNow) <= 0.14 * len) {
          const slide = (near, far) => ({ x: near.x + (far.x - near.x) * (yr - near.y) / (far.y - near.y), y: yr });
          const nc = [corners[0], corners[1], slide(corners[1], corners[2]), slide(corners[0], corners[3])];
          refiningLock = true;
          applyCalibration(nc, lastLockHow);
          refiningLock = false;
          status.textContent = "Lane locked, foul line to pins. Ready: just bowl. If the lines are not on your lane, tap Fix my lane.";
        }
      }
    }
  }
  var overlayPt = (e) => {
    const r = overlay.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * overlay.width, y: (e.clientY - r.top) / r.height * overlay.height };
  };
  overlay.addEventListener("pointermove", (e) => {
    if (dragIx < 0 || !pending) return;
    const p = overlayPt(e);
    pending.corners[dragIx] = { x: Math.max(0, Math.min(overlay.width, p.x)), y: Math.max(0, Math.min(overlay.height, p.y)) };
    candidate = pending.corners;
  });
  var endDrag = () => dragIx = -1;
  overlay.addEventListener("pointerup", endDrag);
  overlay.addEventListener("pointercancel", endDrag);
  overlay.addEventListener("pointerdown", (e) => {
    if (H2) return;
    if (pending && (mode === "auto" || mode === "tap")) {
      const p = overlayPt(e);
      const reach = 56 * (overlay.width / Math.max(1, overlay.getBoundingClientRect().width));
      let bi = -1;
      let bd = reach;
      pending.corners.forEach((c, i) => {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bd) bd = d, bi = i;
      });
      if (bi >= 0) {
        dragIx = bi;
        adjusted = true;
        renderScan();
        overlay.setPointerCapture?.(e.pointerId);
        status.textContent = "Drag each corner onto the lane: the two nearest corners onto the foul line at the gutter edges, the two far ones onto the lane at the pins. Then Confirm.";
        return;
      }
    }
    if (mode === "choose") {
      const r1 = overlay.getBoundingClientRect();
      const px = (e.clientX - r1.left) / r1.width * overlay.width;
      const py = (e.clientY - r1.top) / r1.height * overlay.height;
      const hit = chooseList.find((c) => polyHas(c, px, py)) ?? [...chooseList].sort((a, b) => Math.hypot(centerOf(a).x - px, centerOf(a).y - py) - Math.hypot(centerOf(b).x - px, centerOf(b).y - py))[0];
      chooseList = [];
      mode = "auto";
      $("manualbtn").classList.add("hide");
      if (hit) {
        try {
          localStorage.setItem("laneiq.pickedLane", String((hit[0].x + hit[1].x) / 2 / video.videoWidth));
        } catch {
        }
        applyCalibration(hit, "you picked it");
      }
      return;
    }
    if (mode === "tap") {
      const r0 = overlay.getBoundingClientRect();
      const tx = (e.clientX - r0.left) / r0.width * video.videoWidth;
      const ty = (e.clientY - r0.top) / r0.height * video.videoHeight;
      const f = grabGray();
      const d = detectLaneAt(f.g, f.w, f.h, tx / f.k, ty / f.k);
      if (!d) {
        pending = null;
        candidate = null;
        $("confirm").classList.add("hide");
        status.textContent = "Couldn't follow the lane edges from there. Tap on the lane surface between its two gutters, or use Place corners.";
        return;
      }
      pending = scaled(d, f.k);
      candidate = pending.corners;
      $("confirm").classList.remove("hide");
      status.textContent = pending.rows.foul === null ? "Is this your lane? Distances will be approximate because the foul line isn't in view. Confirm, or tap again." : "Is this your lane? Confirm, or tap again.";
      return;
    }
    if (mode !== "manual") return;
    const r = overlay.getBoundingClientRect();
    corners.push({ x: (e.clientX - r.left) / r.width * overlay.width, y: (e.clientY - r.top) / r.height * overlay.height });
    if (corners.length === 4) applyCalibration(corners, "manual");
    else {
      setStep(corners.length);
      status.textContent = CORNER_PROMPTS[corners.length];
    }
  });
  watchForUpdates((msg, reload) => {
    const bar = document.createElement("div");
    bar.className = "invitebox";
    bar.style.cssText = "position:fixed;left:12px;right:12px;bottom:78px;z-index:50;display:flex;gap:10px;align-items:center;justify-content:space-between";
    bar.innerHTML = `<b id="upd-msg">${msg}</b><button class="btn" id="upd-go">Update</button>`;
    document.body.append(bar);
    bar.querySelector("button").onclick = reload;
    let left = 12;
    const tick = setInterval(() => {
      const busy = tracing || path.length > 0 || recActive || !!pendingClip || histActive;
      if (busy) {
        left = 12;
        return;
      }
      left--;
      const m = document.getElementById("upd-msg");
      if (m) m.textContent = `A newer LaneIQ is ready. Updating in ${Math.max(0, left)} s\u2026`;
      if (left <= 0) {
        clearInterval(tick);
        reload();
      }
    }, 1e3);
  }, () => !document.body.classList.contains("live"));
  $("guide-open").onclick = openGuide;
  $("guide-hud").onclick = openGuide;
  $("confirm").onclick = () => {
    if (!pending) return;
    $("confirm").classList.add("hide");
    $("manualbtn").classList.add("hide");
    applyCalibration(pending.corners, adjusted ? "placed by hand from my guess" : pending.rows.foul === null ? "one tap, approximate" : "one tap");
    pending = null;
    adjusted = false;
  };
  var tracing = false;
  $("manualbtn").onclick = () => openTrace();
  $("tracebtn").onclick = () => openTrace();
  function openTrace(from) {
    const W2 = video.videoWidth;
    const Hh = video.videoHeight;
    if (!W2 || tracing) return;
    const frame2 = document.createElement("canvas");
    frame2.width = W2;
    frame2.height = Hh;
    frame2.getContext("2d").drawImage(video, 0, 0);
    const start = from ?? (H2 && corners.length === 4 ? corners.map((p) => ({ ...p })) : null) ?? lastCandidates[0]?.corners ?? [
      { x: W2 * 0.22, y: Hh * 0.92 },
      { x: W2 * 0.78, y: Hh * 0.92 },
      { x: W2 * 0.55, y: Hh * 0.36 },
      { x: W2 * 0.45, y: Hh * 0.36 }
    ];
    tracing = true;
    chooseList = [];
    chooseSeen = 0;
    mode = "auto";
    locks = [];
    pending = null;
    candidate = null;
    adjusted = false;
    $("confirm").classList.add("hide");
    $("manualbtn").classList.add("hide");
    openLaneTrace({
      frame: frame2,
      start,
      snap: (c) => {
        const k2 = Math.min(1, 640 / Math.max(W2, Hh));
        const tmp = document.createElement("canvas");
        tmp.width = Math.round(W2 * k2);
        tmp.height = Math.round(Hh * k2);
        const tctx = tmp.getContext("2d", { willReadFrequently: true });
        tctx.drawImage(frame2, 0, 0, tmp.width, tmp.height);
        const px = tctx.getImageData(0, 0, tmp.width, tmp.height).data;
        const gr = new Uint8ClampedArray(tmp.width * tmp.height);
        for (let i = 0; i < gr.length; i++) gr[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
        const mid2 = { x: (c[0].x + c[1].x + c[2].x + c[3].x) / 4, y: (c[0].y + c[1].y + c[2].y + c[3].y) / 4 };
        let d = detectLaneAt(gr, tmp.width, tmp.height, mid2.x * k2, mid2.y * k2);
        if (!d) {
          const alts = detectLanes(gr, tmp.width, tmp.height, 4);
          d = alts.sort((a, b) => Math.hypot(centerOf(a.corners).x - mid2.x * k2, centerOf(a.corners).y - mid2.y * k2) - Math.hypot(centerOf(b.corners).x - mid2.x * k2, centerOf(b.corners).y - mid2.y * k2))[0] ?? null;
        }
        return d ? d.corners.map((p) => ({ x: p.x / k2, y: p.y / k2 })) : null;
      },
      onConfirm: (c) => {
        tracing = false;
        applyCalibration(c, "placed by hand from my guess");
      },
      onCancel: () => {
        tracing = false;
        status.textContent = H2 ? "Kept your lane lock." : "Looking for the lane again\u2026";
        renderScan();
      }
    });
  }
  $("snapbtn").onclick = () => {
    if (!pending) return;
    const f = grabGray();
    const c = pending.corners;
    const mid2 = { x: (c[0].x + c[1].x + c[2].x + c[3].x) / 4, y: (c[0].y + c[1].y + c[2].y + c[3].y) / 4 };
    let d = detectLaneAt(f.g, f.w, f.h, mid2.x / f.k, mid2.y / f.k);
    if (!d) {
      const alts = detectLanes(f.g, f.w, f.h, 4).map((x) => scaled(x, f.k));
      const near = alts.sort((a, b) => Math.hypot(centerOf(a.corners).x - mid2.x, centerOf(a.corners).y - mid2.y) - Math.hypot(centerOf(b.corners).x - mid2.x, centerOf(b.corners).y - mid2.y))[0];
      if (near) d = { ...near, corners: near.corners.map((p) => ({ x: p.x / f.k, y: p.y / f.k })) };
    }
    if (!d) {
      status.textContent = "I couldn't find clear lane edges there. Drag the corners onto the lane yourself, then Confirm.";
      return;
    }
    pending = scaled(d, f.k);
    candidate = pending.corners;
    status.textContent = "Snapped to the lane edges. If it sits right, Confirm lane; otherwise drag a corner to fix it.";
  };
  $("saveframe").onclick = async () => {
    const f = grabGray();
    const full = document.createElement("canvas");
    full.width = video.videoWidth;
    full.height = video.videoHeight;
    full.getContext("2d").drawImage(video, 0, 0);
    const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const dl = (blob, name) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4e3);
    };
    const dets = detectLanes(f.g, f.w, f.h, 3).map((d) => scaled(d, f.k));
    dl(new Blob([JSON.stringify({ video: { w: video.videoWidth, h: video.videoHeight }, lockedCorners: H2 ? corners : null, candidates: dets.map((d) => ({ corners: d.corners, confidence: d.confidence, rows: d.rows, notes: d.notes })), at: (/* @__PURE__ */ new Date()).toISOString() }, null, 2)], { type: "application/json" }), `laneiq-frame-${stamp}.json`);
    await new Promise((r) => setTimeout(r, 500));
    full.toBlob((b) => b && dl(b, `laneiq-frame-${stamp}.jpg`), "image/jpeg", 0.92);
    status.textContent = "Saved the frame and the detector's results to your downloads.";
  };
  var rejected = [];
  var redoStreak = 0;
  var lastRedoAt = 0;
  function relock(logMiss = true) {
    let traceFrom = null;
    if (logMiss) {
      markRedone();
      const now = performance.now();
      redoStreak = now - lastRedoAt < 18e4 ? redoStreak + 1 : 1;
      if (redoStreak === 1) rejected = [];
      lastRedoAt = now;
      if (corners.length === 4) {
        rejected = [...rejected, corners.map((p) => ({ ...p }))].slice(-4);
        if (redoStreak >= 2) traceFrom = corners.map((p) => ({ ...p }));
      }
    }
    $("confirm").classList.add("hide");
    $("manualbtn").classList.add("hide");
    pending = null;
    adjusted = false;
    corners = [];
    H2 = null;
    Hinv = null;
    lastShot = null;
    trail = [];
    path = [];
    mode = "auto";
    detectStartedAt = 0;
    arrowsRead = [];
    arrowTries = 0;
    pinRefs = [];
    pinTries = 0;
    pinRefDone = false;
    voter.reset();
    locks = [];
    chooseList = [];
    chooseSeen = 0;
    verifyUntil = 0;
    try {
      localStorage.removeItem(calKey());
    } catch {
    }
    setStep(0);
    setReady(false);
    status.textContent = "Looking for the lane again\u2026";
    pill("SCANNING\u2026", "scan");
    renderScan();
    tracker = null;
    laneMask = null;
    armed = false;
    if (traceFrom) {
      status.textContent = "The automatic lock keeps missing here, so trace it by hand.";
      openTrace(traceFrom);
    }
  }
  $("reset").onclick = () => relock();
  var ZOOM_KEY = "laneiq.zoom";
  var zoomCaps = null;
  var zoomNow = 1;
  var zoomLevels = [1];
  var panX = 0;
  var panY = 0;
  var DIGITAL_MAX = 6;
  function drawZoomBar() {
    const bar = $("zoombar");
    bar.innerHTML = zoomLevels.map((z) => `<button class="seg ${Math.abs(z - zoomNow) < 0.05 ? "on" : ""}" data-z="${z}">${z}\xD7</button>`).join("") + (Math.abs(zoomNow - Math.round(zoomNow * 2) / 2) > 0.05 || !zoomLevels.some((z) => Math.abs(z - zoomNow) < 0.05) ? `<button class="seg on" disabled>${zoomNow.toFixed(1)}\xD7</button>` : "");
    bar.querySelectorAll("button[data-z]").forEach((b) => b.onclick = () => void setZoom(Number(b.dataset.z)));
  }
  async function setupZoom() {
    const track = stream?.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() ?? {};
    zoomCaps = caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max } : null;
    zoomLevels = zoomCaps ? [0.5, 1, 2, 3, 5, 8].filter((z) => z >= zoomCaps.min - 1e-6 && z <= zoomCaps.max + 1e-6) : [1, 1.5, 2, 3];
    if (!zoomLevels.includes(1)) zoomLevels.unshift(Math.max(zoomCaps?.min ?? 1, 1));
    let saved = 1;
    try {
      saved = Number(localStorage.getItem(ZOOM_KEY) ?? 1) || 1;
    } catch {
    }
    zoomNow = zoomLevels.includes(saved) ? saved : zoomLevels[0];
    await setZoom(zoomNow, false);
  }
  function applyView() {
    const stage = $("stage");
    const W2 = stage.clientWidth;
    const Hh = stage.clientHeight;
    const z = zoomCaps ? 1 : zoomNow;
    const mx = (z - 1) * W2 / 2;
    const my = (z - 1) * Hh / 2;
    panX = Math.max(-mx, Math.min(mx, panX));
    panY = Math.max(-my, Math.min(my, panY));
    for (const el of [video, overlay]) {
      el.style.transformOrigin = "50% 50%";
      el.style.transform = z === 1 && !panX && !panY ? "" : `translate(${panX}px, ${panY}px) scale(${z})`;
    }
  }
  async function setZoom(z, dropLock = true) {
    const lo = zoomCaps ? zoomCaps.min : 1;
    const hi = zoomCaps ? zoomCaps.max : DIGITAL_MAX;
    zoomNow = Math.max(lo, Math.min(hi, z));
    const track = stream?.getVideoTracks()[0];
    if (zoomCaps && track) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: zoomNow }] });
      } catch {
        status.textContent = "This phone would not change the camera zoom.";
      }
      applyView();
      if (dropLock && (H2 || pending)) {
        relock(false);
        status.textContent = `Zoom ${zoomNow.toFixed(1)}\xD7: looking for the lane again at this zoom\u2026`;
      }
    } else {
      if (zoomNow === 1) panX = panY = 0;
      applyView();
      if (zoomNow !== 1) status.textContent = `Zoom ${zoomNow.toFixed(1)}\xD7 (on screen only: this phone does not let the app zoom the lens, so detection still uses the whole picture).`;
    }
    try {
      localStorage.setItem(ZOOM_KEY, String(zoomNow));
    } catch {
    }
    drawZoomBar();
  }
  var touches = /* @__PURE__ */ new Map();
  var gesture = null;
  var gestureActive = false;
  var zoomDirty = false;
  var relockTimer;
  var stageEl = $("stage");
  var gestureState = () => {
    const [a, b] = Array.from(touches.values());
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };
  stageEl.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target.closest("#zoombar,#expandbtn,#viewtoggle,#hero")) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2) {
        gestureActive = true;
        dragIx = -1;
        const g = gestureState();
        gesture = { d0: Math.max(10, g.d), z0: zoomNow, mx0: g.mx, my0: g.my, px0: panX, py0: panY };
        e.stopPropagation();
      }
    },
    true
  );
  stageEl.addEventListener(
    "pointermove",
    (e) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size >= 2 && gesture) {
        const g = gestureState();
        zoomNow = Math.max(zoomCaps ? zoomCaps.min : 1, Math.min(zoomCaps ? zoomCaps.max : DIGITAL_MAX, gesture.z0 * (g.d / gesture.d0)));
        panX = gesture.px0 + (g.mx - gesture.mx0);
        panY = gesture.py0 + (g.my - gesture.my0);
        zoomDirty = true;
        if (zoomCaps) void stream?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ zoom: zoomNow }] }).catch(() => {
        });
        applyView();
        drawZoomBar();
        e.stopPropagation();
      } else if (gestureActive) e.stopPropagation();
    },
    true
  );
  var liftFinger = (e) => {
    if (!touches.delete(e.pointerId)) return;
    if (touches.size < 2) gesture = null;
    if (touches.size === 0) {
      gestureActive = false;
      if (zoomDirty) {
        zoomDirty = false;
        try {
          localStorage.setItem(ZOOM_KEY, String(zoomNow));
        } catch {
        }
        if (zoomCaps && (H2 || pending)) {
          clearTimeout(relockTimer);
          relockTimer = setTimeout(() => {
            relock(false);
            status.textContent = `Zoom ${zoomNow.toFixed(1)}\xD7: looking for the lane again at this zoom\u2026`;
          }, 500);
        }
      }
    }
  };
  stageEl.addEventListener("pointerup", liftFinger, true);
  stageEl.addEventListener("pointercancel", liftFinger, true);
  stageEl.addEventListener(
    "wheel",
    (e) => {
      if (!document.body.classList.contains("live")) return;
      e.preventDefault();
      const z = zoomNow * Math.exp(-e.deltaY * 15e-4);
      void setZoom(z, false).then(() => {
        if (zoomCaps && (H2 || pending)) {
          clearTimeout(relockTimer);
          relockTimer = setTimeout(() => relock(false), 700);
        }
      });
    },
    { passive: false }
  );
  $("expandbtn").onclick = () => {
    const on2 = document.body.classList.toggle("expanded");
    $("expandbtn").textContent = on2 ? "Close" : "Expand";
    window.scrollTo(0, 0);
    applyView();
  };
  $("vt-lane").onclick = () => setMode("lane");
  $("vt-raw").onclick = () => setMode("raw");
  $("vt-3d").onclick = () => setMode("3d");
  function setMode(m) {
    viewMode = m;
    $("vt-lane").classList.toggle("on", m === "lane");
    $("vt-raw").classList.toggle("on", m === "raw");
    $("vt-3d").classList.toggle("on", m === "3d");
    if (m === "3d" && !host3d) {
      host3d = document.createElement("div");
      host3d.style.cssText = "position:absolute;inset:0;z-index:2";
      $("stage").insertBefore(host3d, $("viewtoggle"));
      view3d = mount3D(host3d);
    }
    if (host3d) host3d.style.display = m === "3d" ? "block" : "none";
    overlay.style.display = m === "3d" ? "none" : "block";
    video.style.visibility = m === "3d" ? "hidden" : "visible";
    shown3dKey = "";
  }
  function sync3D() {
    if (!view3d) return;
    const live2 = path.length > 1;
    const src = live2 ? path : lastShot?.path;
    const key2 = `${live2 ? "L" : "S"}${src?.length ?? 0}${lastShot?.at ?? 0}`;
    if (key2 === shown3dKey) return;
    shown3dKey = key2;
    view3d.setPaths(src ? [{ path: src, color: "ramp", width: 4, ballAt: live2 ? null : void 0 }] : []);
  }
  function inPolygon(p, poly2) {
    let inside2 = false;
    for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) {
      const a = poly2[i];
      const b = poly2[j];
      if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside2 = !inside2;
    }
    return inside2;
  }
  function buildMask() {
    const sx = video.videoWidth / GW;
    const sy = video.videoHeight / GH;
    laneMask = new Uint8Array(GW * GH);
    const area2 = Hinv ? [laneToPx(0, -2), laneToPx(LANE_BOARDS, -2), laneToPx(LANE_BOARDS, 64.5), laneToPx(0, 64.5)] : corners;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) laneMask[y * GW + x] = inPolygon({ x: (x + 0.5) * sx, y: (y + 0.5) * sy }, area2) ? 1 : 0;
  }
  var sigAcc = new Array(SIG_LEN).fill(0);
  var CROP = 24;
  var cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropCanvas.height = CROP;
  var cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
  function circleCounts(cx, cy, r) {
    cropCtx.drawImage(video, cx - r, cy - r, r * 2, r * 2, 0, 0, CROP, CROP);
    return signatureCounts(cropCtx.getImageData(0, 0, CROP, CROP).data, CROP);
  }
  function captureBall(cx, cy, radius) {
    const counts = circleCounts(cx, cy, Math.max(5, Math.min(60, radius * 1.2)));
    for (let i = 0; i < SIG_LEN; i++) sigAcc[i] += counts[i];
  }
  onScan(() => openScanLab(() => renderBall(S.shots.at(-1))));
  var enrolling = null;
  onEnroll((name, catalogKey) => {
    if (!stream) return void (status.textContent = "Start the camera first, then show me the ball.");
    setMode("lane");
    enrolling = { name, catalogKey, sigs: [], nextAt: 0, until: performance.now() + 6e3 };
    status.textContent = `Hold ${name} inside the circle and rotate it slowly\u2026`;
  });
  function enrollTick(now) {
    if (!enrolling) return;
    const r = Math.min(video.videoWidth, video.videoHeight) * 0.2;
    const cx = video.videoWidth / 2;
    const cy = video.videoHeight / 2;
    if (now >= enrolling.nextAt) {
      enrolling.nextAt = now + 450;
      enrolling.sigs.push(normalize(circleCounts(cx, cy, r)));
    }
    const left = Math.max(0, enrolling.until - now) / 6e3;
    const s = overlay.width / 1280;
    ctx.save();
    ctx.strokeStyle = "rgba(70,230,255,.9)";
    ctx.lineWidth = 4 * s;
    ctx.setLineDash([10 * s, 8 * s]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,79,216,.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - left));
    ctx.stroke();
    ctx.restore();
    if (now >= enrolling.until) finishEnroll();
  }
  async function finishEnroll() {
    const e = enrolling;
    enrolling = null;
    const picked = e.sigs.filter((_, i) => i % 2 === 0).slice(0, 8);
    const ball = { id: newId(), name: e.name, exemplars: picked, catalogKey: e.catalogKey };
    S.arsenal.push(ball);
    await saveArsenal();
    status.textContent = `Learned ${e.name} from ${picked.length} views. I'll recognize it on the lane.`;
    renderBall(S.shots.at(-1));
  }
  var rec = null;
  function pickMime2() {
    for (const m of ["video/mp4", "video/webm;codecs=vp9", "video/webm"]) if (window.MediaRecorder?.isTypeSupported?.(m)) return m;
    return void 0;
  }
  function startRecording(startT) {
    if (!stream || !window.MediaRecorder || S.demo) return;
    try {
      const mime = pickMime2();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : void 0);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onerror = (e) => logTrack("recorder error", { error: String(e.error ?? e) });
      mr.start(1e3);
      rec = { mr, chunks, startT };
    } catch (e) {
      rec = null;
      logTrack("recorder could not start", { error: String(e) });
    }
  }
  function stopRecording(tailMs) {
    const r = rec;
    rec = null;
    if (!r) return Promise.resolve(null);
    return new Promise((resolve) => {
      r.mr.onstop = () => resolve(r.chunks.length ? { blob: new Blob(r.chunks, { type: r.mr.mimeType || "video/mp4" }), startT: r.startT } : null);
      setTimeout(() => r.mr.state !== "inactive" && r.mr.stop(), tailMs);
    });
  }
  function drawOverlay(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    if (H2 && armed && stab?.ready && viewMode === "lane") ctx.translate(shakeVX, shakeVY);
    if (viewMode === "3d") return sync3D();
    if (enrolling) return;
    if (!H2) drawScanner(now);
    if (viewMode !== "lane") return;
    const v = view2();
    drawCorners(v, corners);
    if (!H2 && candidate) {
      const s = overlay.width / 1280;
      ctx.save();
      ctx.setLineDash([10 * s, 8 * s]);
      ctx.strokeStyle = "rgba(70,230,255,.85)";
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      candidate.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    if (!H2 || !Hinv) return;
    drawLaneGrid(v);
    for (const a of arrowsRead) {
      const s = overlay.width / 1280;
      ctx.save();
      ctx.strokeStyle = "rgba(255,210,90,.95)";
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(a.x, a.y, 7 * s, 0, 7);
      ctx.stroke();
      ctx.restore();
    }
    if (lastShot) {
      const age = (now - lastShot.at) / 1e3;
      strokeTrail(v, lastShot.trail, age < 10 ? 1 : Math.max(0.35, 1 - (age - 10) / 10), false);
      drawShotMarkers(v, lastShot.a);
    }
    if ((confirmed || histActive) && trail.length > 1) {
      strokeTrail(v, trail.slice(-40), 1, true);
      drawBallHead(v, trail[trail.length - 1]);
    }
    drawPinSpots(now);
  }
  var confirmed = false;
  var cooldownUntil = 0;
  function resetTrack() {
    tracker?.reset();
    sigAcc = new Array(SIG_LEN).fill(0);
    path = [];
    trail = [];
    lastBlob = null;
    lost = 0;
    confirmed = false;
  }
  var cameraFps = 0;
  var diag = { frames: 0, since: 0, perSec: 0, ballFrames: 0, ballSeen: 0 };
  function diagTick(now, analysed, ball) {
    if (analysed) diag.frames++;
    if (ball) diag.ballFrames++;
    if (!diag.since) diag.since = now;
    if (now - diag.since < 1e3) return;
    diag.perSec = Math.round(diag.frames * 1e3 / (now - diag.since));
    diag.ballSeen = diag.ballFrames;
    diag.frames = diag.ballFrames = 0;
    diag.since = now;
    const el = document.getElementById("diag");
    const ts = tracker?.stats;
    const lockPct = laneMask ? Math.round(laneMask.reduce((a, m) => a + m, 0) / laneMask.length * 100) : 0;
    if (el) el.textContent = `Camera ${cameraFps || "?"} fps${cameraFps && cameraFps < 50 ? capFps >= 50 ? " (the phone can do " + Math.round(capFps) + " but gave this: try more light)" : " (all this phone gave the browser)" : ""}${deliv.fps ? ` \xB7 arriving ${deliv.fps}/s` : ""} \xB7 analysing ${diag.perSec}/s \xB7 ball ${diag.ballSeen ? "seen" : "not seen"} \xB7 lane lock ${H2 ? armed ? `on, covers ${lockPct}% of the picture` : "paused" : "searching"}${ts && H2 && armed ? ` \xB7 moving pixels ${ts.fg}, blobs ${ts.blobs}, ball-like ${ts.cands} (dropped: wrong size ${ts.size}, wrong shape ${ts.shape}, off the lane ${ts.offLane})` : ""}`;
  }
  var shotsOn = true;
  var oneShot = false;
  try {
    oneShot = localStorage.getItem("laneiq.oneShot") === "1";
  } catch {
  }
  if (oneShot) shotsOn = false;
  function paintStartStop() {
    const b = $("startstop");
    const o = $("oneshot");
    b.textContent = shotsOn ? "Stop" : "Start";
    b.style.background = shotsOn ? "linear-gradient(90deg,#ff6a7a,#ff4fd8)" : "linear-gradient(90deg,#46e6ff,#5affb0)";
    o.textContent = `One shot at a time: ${oneShot ? "on" : "off"}`;
    o.classList.toggle("sel", oneShot);
    const el = $("ready");
    if (H2 && armed && !shotsOn) {
      el.textContent = "STOPPED";
      el.classList.remove("go", "scan");
      el.classList.add("ask");
    } else if (el.textContent === "STOPPED") {
      setReady(!!(H2 && armed));
      el.classList.remove("ask");
    }
  }
  function setShotsOn(on2, msg, keepClip = false) {
    if (on2 === shotsOn) return paintStartStop();
    shotsOn = on2;
    logTrack(on2 ? "started" : "stopped", { oneShot });
    resetTrack();
    candHist.length = 0;
    histActive = false;
    if (!on2) {
      if (pendingClip && !keepClip) void attachClip();
      else if (recActive && !pendingClip) discardRecording();
      status.textContent = msg ?? (oneShot ? "Stopped. Tap Start when it is your turn." : "Stopped: no shots are being recorded. Tap Start to record again.");
    } else {
      lastShotMedia = lastFrameT;
      cooldownUntil = performance.now() + 400;
      tracker?.forgetBackground();
      status.textContent = msg ?? "Recording. Bowl when ready.";
    }
    paintStartStop();
  }
  $("startstop").onclick = () => setShotsOn(!shotsOn);
  $("oneshot").onclick = () => {
    oneShot = !oneShot;
    try {
      localStorage.setItem("laneiq.oneShot", oneShot ? "1" : "0");
    } catch {
    }
    if (oneShot && shotsOn) setShotsOn(false, "League mode: tap Start when it is your turn. It stops by itself after your shot.");
    else paintStartStop();
  };
  paintStartStop();
  var recActive = false;
  var recBeganAt = 0;
  var pendingClip = null;
  var resetLooks = 0;
  var lastResetLook = 0;
  var motionRun = 0;
  var prevMotion = null;
  var approachAfter = 0;
  var MOTION_STEP = 9;
  function beginRecording(media) {
    if (recActive) return;
    recActive = true;
    recBeganAt = performance.now();
    startRecording(media);
    logTrack("recording started", { recorder: !!rec, mime: pickMime2() ?? "default", hasMediaRecorder: !!window.MediaRecorder });
  }
  function discardRecording() {
    recActive = false;
    void stopRecording(0);
  }
  async function attachClip() {
    const p = pendingClip;
    pendingClip = null;
    resetLooks = 0;
    recActive = false;
    const clip = await stopRecording(250);
    logTrack("recording stopped", { clip: !!clip, bytes: clip ? clip.blob.size : 0, type: clip ? clip.blob.type : null, forShot: !!p });
    if (!p || !clip) return;
    p.shot.recStartT = clip.startT - p.t0Abs;
    p.shot.hasClip = true;
    try {
      await saveClip(p.shot.id, clip.blob);
      logTrack("clip saved", { bytes: clip.blob.size });
    } catch (e) {
      p.shot.hasClip = false;
      logTrack("clip save failed", { error: String(e) });
    }
    await updateShot(p.shot);
    if (p.shot.hasClip) void queueSpin(p.shot, { blob: clip.blob, busy: () => recActive || !!pendingClip });
    if (p.shot.hasClip) void queueBody(p.shot, { blob: clip.blob, busy: () => recActive || !!pendingClip, auto: true });
  }
  function approachWatch(g, media, now) {
    const sm = new Float32Array(Math.ceil(g.length / MOTION_STEP));
    for (let i = 0, n = 0; i < g.length; i += MOTION_STEP) sm[n++] = g[i];
    if (prevMotion && prevMotion.length === sm.length) {
      let d = 0;
      for (let i = 0; i < sm.length; i++) d += Math.abs(sm[i] - prevMotion[i]);
      d /= sm.length;
      motionRun = d > 6 ? motionRun + 1 : Math.max(0, motionRun - 1);
      if (motionRun >= 5 && now >= approachAfter && now >= cooldownUntil) beginRecording(media);
    }
    prevMotion = sm;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && pendingClip) void attachClip();
  });
  window.addEventListener("pagehide", () => {
    if (pendingClip) void attachClip();
  });
  function resetWatch(now) {
    const p = pendingClip;
    if (!p) return;
    if (now - p.at > 6e4) return void attachClip();
    if (now - lastResetLook < 1200 || now - p.at < 3e3) return;
    lastResetLook = now;
    const cur2 = lookAtPins();
    if (!cur2 || !fullDeck || !pinsReadable(fullDeck)) return;
    const r = readPins(fullDeck, cur2);
    if (r.readable >= 6 && r.down === 0) {
      if (++resetLooks >= 2) void attachClip();
    } else resetLooks = 0;
  }
  var sharpA = null;
  var sharpB = null;
  var sharpenOn = (() => {
    try {
      return localStorage.getItem("laneiq.sharpen") !== "0";
    } catch {
      return true;
    }
  })();
  var skipCount = 0;
  var lastFrameT = -1;
  var lastPres = -1;
  function frameClock(meta, now) {
    const pt2 = meta.presentationTime;
    let t;
    if (typeof pt2 === "number" && pt2 > 0 && pt2 > lastPres) {
      lastPres = pt2;
      t = pt2 / 1e3;
    } else t = now / 1e3;
    if (t <= lastFrameT) t = lastFrameT + 1e-3;
    lastFrameT = t;
    return t;
  }
  function onFrame(_now, meta) {
    schedule();
    deliv.n++;
    {
      const t = performance.now();
      if (!deliv.t0) deliv.t0 = t;
      else if (t - deliv.t0 >= 1500) {
        deliv.fps = Math.round(deliv.n * 1e3 / (t - deliv.t0));
        deliv.n = 0;
        deliv.t0 = t;
        setText("fps", `${deliv.fps} FPS`);
      }
    }
    if (tracing) return;
    const now = performance.now();
    diagTick(now, !!(H2 && laneMask && armed && !enrolling), !!lastBlob);
    drawOverlay(now);
    enrollTick(now);
    if (!H2) autoDetectTick(now);
    else if (armed) driftCheck(now), pinWatch(now), pinRefineTick(now), arrowTick(now), resetWatch(now);
    if (!H2 || !laneMask || !armed || enrolling) return;
    if (!shotsOn) return;
    if (cameraFps > 90 && ++skipCount % Math.round(cameraFps / 60) !== 0) return;
    wctx.drawImage(video, 0, 0, GW, GH);
    const px = wctx.getImageData(0, 0, GW, GH).data;
    const gray = new Float32Array(GW * GH);
    const chroma = new Float32Array(GW * GH);
    for (let i = 0; i < gray.length; i++) {
      gray[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
      chroma[i] = 128 + (px[i * 4] - px[i * 4 + 2]) * 0.6;
    }
    let g2 = gray, c2 = chroma;
    if (stab?.ready) {
      stab.update(gray);
      const k2 = video.videoWidth / GW;
      shakeVX = stab.dx * k2;
      shakeVY = stab.dy * k2;
      if (stab.dx !== 0 || stab.dy !== 0) {
        stabG ??= new Float32Array(GW * GH);
        stabC ??= new Float32Array(GW * GH);
        g2 = stab.warp(gray, stabG);
        c2 = stab.warp(chroma, stabC);
      }
      if (stab.bad > 45 && now - lastShakeWarn > 8e3) {
        lastShakeWarn = now;
        status.textContent = "The picture is moving too much for me to follow. Hold the phone steadier, or tap Re-lock.";
      }
    }
    if (!tracker) tracker = new BallTracker({ w: GW, h: GH, mask: laneMask, H: H2, Hinv, scale: video.videoWidth / GW });
    const ft = frameClock(meta, now);
    if (!tracker.confirmed && !pendingClip) approachWatch(g2, ft, now);
    if (recActive && !pendingClip && !tracker.confirmed && now - recBeganAt > 3e4) {
      discardRecording();
      motionRun = 0;
      approachAfter = now + 5e3;
    }
    if (now < cooldownUntil) return;
    let gT = g2;
    if (sharpenOn) {
      sharpA ??= new Float32Array(GW * GH);
      sharpB ??= new Float32Array(GW * GH);
      gT = sharpen(g2, GW, GH, sharpA, sharpB, 0.8);
    }
    const ev = tracker.step(gT, ft, c2);
    candHist.push({ t: ft, cands: tracker.lastCands.map((c) => ({ ...c })) });
    while (candHist.length && candHist[0].t < ft - 14) candHist.shift();
    if (tracker.rejects.length) for (const r of tracker.rejects.splice(0)) logTrack("chain thrown out", r);
    if (now - lastTrackLog > 5e3) {
      lastTrackLog = now;
      const s = tracker.stats;
      if (s && (s.blobs > 0 || tracker.confirmed)) logTrack("sample", { fps: cameraFps, arriving: deliv.fps, analysed: diag.perSec, blobs: s.blobs, ballLike: s.cands, tiny: s.tiny, wrongSize: s.size, wrongShape: s.shape, offLane: s.offLane, chains: s.hyps, confirmed: tracker.confirmed, lanePct: laneMask ? Math.round(laneMask.reduce((a, m) => a + m, 0) / laneMask.length * 100) : 0 });
    }
    if (!tracker.confirmed && now >= cooldownUntil) historyDetect(now, ft);
    path = tracker.path;
    trail = histActive && !tracker.confirmed ? histTrail : tracker.trail;
    lastBlob = tracker.last ? { gx: tracker.last.x, gy: tracker.last.y } : null;
    confirmed = tracker.confirmed;
    if (ev === "tracking" || ev === "confirmed") {
      const here = path[path.length - 1];
      if (here && here.y < 30 && trail.length) captureBall(trail[trail.length - 1].x, trail[trail.length - 1].y, tracker.lastR * (video.videoWidth / GW));
    }
    if (ev === "confirmed") {
      logTrack("ball confirmed live", { points: path.length, atFt: path.length ? +path[path.length - 1].y.toFixed(1) : null });
      ballArrived(ft);
    } else if (ev === "finished") void finish();
    else if (ev === "reset") resetTrack();
  }
  var idleDeck = null;
  var fullDeck = null;
  var deckCand = null;
  var lastPinLook = 0;
  var pinCanvas = document.createElement("canvas");
  var pinCtx = pinCanvas.getContext("2d", { willReadFrequently: true });
  function lookAtPins() {
    if (!Hinv || S.demo || !video.videoWidth) return null;
    const boxes = pinBoxes((x, y) => {
      const p = laneToPx(x, y);
      return { x: p.x + shakeVX, y: p.y + shakeVY };
    });
    const r = deckRegion(boxes);
    const x0 = Math.max(0, Math.floor(r.x0));
    const y0 = Math.max(0, Math.floor(r.y0));
    const w = Math.min(video.videoWidth, Math.ceil(r.x1)) - x0;
    const h = Math.min(video.videoHeight, Math.ceil(r.y1)) - y0;
    if (w < 24 || h < 8 || w > 1e3 || h > 600) return null;
    pinCanvas.width = w;
    pinCanvas.height = h;
    pinCtx.drawImage(video, x0, y0, w, h, 0, 0, w, h);
    const px = pinCtx.getImageData(0, 0, w, h).data;
    const g = new Uint8ClampedArray(w * h);
    for (let i = 0; i < g.length; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
    return samplePins(g, w, h, boxes, x0, y0);
  }
  function pinWatch(now) {
    if (path.length || lastBlob || now < cooldownUntil || now - lastPinLook < 1200) return;
    lastPinLook = now;
    const cur2 = lookAtPins();
    if (!cur2) return;
    if (deckCand && readPins(deckCand, cur2).readable >= 6 && readPins(deckCand, cur2).down === 0) {
      idleDeck = cur2;
      if (pinsReadable(cur2)) fullDeck = cur2;
    }
    const seen2 = cur2.filter((p) => pinContrast(p) >= 8).length;
    $("pinstat").textContent = seen2 >= 8 ? `Pins: ready (${seen2} of 10 seen)` : seen2 > 0 ? `Pins: only ${seen2} of 10 stand out, so pinfall may be missed. Zoom in on them.` : "Pins: can't tell them from the deck. Zoom in on them or add light.";
    deckCand = cur2;
  }
  function pinfallNow(start, full, now) {
    if (start && readPins(start, now).readable >= 5 && !(full && pinsReadable(full) && readPins(full, start).down >= 5)) {
      const r = readPins(start, now);
      return { down: r.down, standing: full ? readPins(full, now).standing : r.standing };
    }
    if (full && start) {
      const before = readPins(full, start).standing;
      const after = readPins(full, now).standing;
      return { down: after.filter((s, i) => before[i] === true && s === false).length, standing: after };
    }
    return null;
  }
  var lastPinRead = null;
  function drawPinSpots(now) {
    if (!Hinv || S.demo || viewMode !== "lane") return;
    const s = overlay.width / 1280;
    const fresh2 = lastPinRead && now - lastPinRead.at < 14e3 ? lastPinRead : null;
    const boxes = pinBoxes(laneToPx);
    ctx.save();
    ctx.lineWidth = Math.max(1, 1.8 * s);
    boxes.forEach((b, i) => {
      const st2 = fresh2 ? fresh2.standing[i] : void 0;
      const pad = 3 * s;
      const x = b.x0 - pad, y = b.y0 - pad, w = b.x1 - b.x0 + 2 * pad, h = b.y1 - b.y0 + 2 * pad;
      const ps = currentPins();
      ctx.strokeStyle = st2 === true ? ps.standing.stroke : st2 === false ? ps.down.stroke : ps.unknown.stroke;
      ctx.fillStyle = st2 === true ? ps.standing.fill : st2 === false ? ps.down.fill : ps.unknown.fill;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      if (st2 === false) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.moveTo(x + w, y);
        ctx.lineTo(x, y + h);
        ctx.stroke();
      }
    });
    if (fresh2) {
      const top = Math.min(...boxes.map((b) => b.y0)) - 34 * s;
      const mid2 = (Math.min(...boxes.map((b) => b.x0)) + Math.max(...boxes.map((b) => b.x1))) / 2;
      const text = fresh2.down === 10 ? "STRIKE" : `${fresh2.down} DOWN`;
      ctx.font = `800 ${16 * s}px system-ui`;
      ctx.textAlign = "center";
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = "rgba(0,0,0,.85)";
      ctx.strokeText(text, mid2, top);
      ctx.fillStyle = fresh2.down === 10 ? "#5affb0" : "#ffd25a";
      ctx.fillText(text, mid2, top);
    }
    ctx.restore();
  }
  var sleep3 = (ms) => new Promise((r) => setTimeout(r, ms));
  async function readPinfall(shot, start, full) {
    if (!start && !full) return;
    const counts = [];
    const stands = [];
    for (const wait of [900, 400, 400, 400, 400, 400]) {
      await sleep3(wait);
      const cur2 = lookAtPins();
      const r = cur2 ? pinfallNow(start, full, cur2) : null;
      counts.push(r ? r.down : null);
      stands.push(r ? r.standing : []);
      if (counts.length >= 2 && counts[counts.length - 1] !== null && counts[counts.length - 1] === counts[counts.length - 2]) break;
    }
    const n = settledCount(counts);
    if (n === null || shot.result) return;
    const at3 = counts.findIndex((c, i) => c === n && (counts[i + 1] === n || i === counts.length - 1));
    const standing = stands[Math.max(0, at3)] ?? [];
    const leave = n === 10 ? [] : standing.map((s, i) => s ? i + 1 : 0).filter(Boolean);
    shot.result = { pinsDown: n, auto: true, ...leave.length ? { leave } : {} };
    lastPinRead = { standing, at: performance.now(), down: n };
    await updateShot(shot);
    await autoScoreShot(shot);
    renderResult(shot);
    status.textContent = n === 10 ? "Strike, read from the camera." : `${n} pins down, read from the camera.`;
  }
  async function finish() {
    const startDeck = idleDeck;
    const fullRack = fullDeck;
    const points = path.length;
    const liveSmooth = smoothPath(path);
    const frames = candHist.filter((f) => f.t > lastShotMedia);
    if (frames.length) lastShotMedia = frames[frames.length - 1].t;
    const whole = tracePath(frames);
    const t0Abs = whole && whole.length ? whole[0].t : tracker?.t0 ?? 0;
    const wholeRel = whole ? whole.map((p) => ({ ...p, t: p.t - whole[0].t })) : null;
    const wholeSmooth = wholeRel ? smoothPath(wholeRel) : null;
    const reach = (p) => p.length ? p[p.length - 1].y - p[0].y : 0;
    const smooth = wholeSmooth && reach(wholeSmooth) >= reach(liveSmooth) - 0.5 ? wholeSmooth : liveSmooth;
    const a = analyzeShot(smooth) ?? partialShot(smooth);
    const saved = forwardPath(smooth);
    const r2 = (n) => Math.round(n * 100) / 100;
    const rawRecord = {
      live: path.map((p) => ({ t: r2(p.t), x: r2(p.x), y: r2(p.y) })),
      whole: wholeRel ? wholeRel.map((p) => ({ t: r2(p.t), x: r2(p.x), y: r2(p.y) })) : null,
      smooth: smooth.map((p) => ({ t: r2(p.t), x: r2(p.x), y: r2(p.y) })),
      cands: frames.map((f) => ({ t: r2(f.t), cands: f.cands.map((c) => ({ lx: r2(c.lx), ly: r2(c.ly), q: r2(c.q) })) })),
      arrows: arrowsRead.map((a2) => ({ board: a2.board, x: Math.round(a2.x), y: Math.round(a2.y) })),
      lock: lastLockHow
    };
    const sig = sigAcc.some((x) => x > 0) ? normalize(sigAcc) : null;
    resetTrack();
    tracker?.forgetBackground();
    cooldownUntil = performance.now() + 3e3;
    logTrack("shot finished", { livePoints: points, wholePoints: whole ? whole.length : 0, usedWhole: !!(wholeSmooth && reach(wholeSmooth) >= reach(liveSmooth) - 0.5), reachFt: +reach(smooth).toFixed(1), analysed: !!a, mph: a ? +a.speedMph.toFixed(1) : null, lastSeenFt: a?.lastSeen ? +a.lastSeen.ft.toFixed(1) : null });
    if (!a) {
      if (!pendingClip) discardRecording();
      status.textContent = `Ball seen but not enough evidence (${points} points). Watching for the next shot.`;
      return;
    }
    cooldownUntil = performance.now() + 8e3;
    status.textContent = a.speedMph < 8 || a.speedMph > 26 ? `Speed reads ${a.speedMph.toFixed(1)} mph, which looks off. The lane lock may be wrong: tap Re-lock.` : "Shot captured. Watching for the next shot.";
    const drawn = saved.map((p) => laneToPx(p.x, p.y));
    lastShot = { trail: drawn, a, at: performance.now(), path: saved };
    const shot = {
      id: newId(),
      at: (/* @__PURE__ */ new Date()).toISOString(),
      sessionId: S.sessionId,
      ballId: null,
      a,
      m: deriveMetrics(a, saved, S.profile?.hand ?? "R"),
      path: saved,
      cal: corners.map((p) => ({ ...p })),
      vw: video.videoWidth,
      vh: video.videoHeight,
      lane: laneNo || void 0,
      recStartT: 0,
      hasClip: false,
      sig,
      raw: rawRecord
    };
    await registerShot(shot);
    pendingClip = { shot, t0Abs, at: performance.now() };
    if (oneShot) setShotsOn(false, "Shot recorded. Tap Start for your next turn.", true);
    void readPinfall(shot, startDeck, fullRack);
  }
  try {
    localStorage.removeItem("laneiq.laneNo");
  } catch {
  }
  (function setupStartScreen() {
    const v = Array.from(document.scripts).map((x) => x.src).find((x) => /camera\.js\?v=/.test(x));
    $("ver").textContent = v ? `version ${v.split("?v=")[1]}` : "";
    initPatchNotes();
  })();
  $("tour-open").onclick = () => startTour();
  $("start").onclick = () => Promise.resolve().then(() => startCamera()).catch((e) => status.textContent = `Camera error: ${e.message}. Camera needs an https:// address.`);
  function synthPath(startX, bp, entryX, speedFtS) {
    const out = [];
    const mid2 = startX + 3;
    for (let i = 0; i < 400; i++) {
      const t = i / 60;
      const y = speedFtS * t;
      if (y > 59) break;
      const x = y <= bp ? startX + (mid2 - startX) * Math.sin(Math.PI / 2 * (y / bp)) : mid2 + (entryX - mid2) * ((y - bp) / (59.5 - bp)) ** 2;
      out.push({ t, x, y });
    }
    return out;
  }
  async function runDemo() {
    S.demo = true;
    window.__laneiq = { S };
    S.profile = { id: "demo", name: "Demo bowler", hand: "R", quiz: { ...defaultAnswers("Demo bowler"), style: "two-handed", level: "league", focus: ["speed-consistency"] }, created: (/* @__PURE__ */ new Date()).toISOString() };
    const sigFor = (rgb) => {
      const px = new Uint8ClampedArray(CROP * CROP * 4);
      for (let i = 0; i < CROP * CROP; i++) {
        const c = i * 7919 % 100 < 60 ? rgb : [15, 15, 15];
        px.set([c[0] + i * 13 % 9, c[1], c[2], 255], i * 4);
      }
      return normalize(signatureCounts(px, CROP));
    };
    const red = [200, 30, 40];
    const ranked = S.catalog.filter((c) => motionIndex(c) !== null).sort((x, y) => motionIndex(y) - motionIndex(x));
    const chosen = ranked.length >= 3 ? [ranked[0], ranked[Math.floor(ranked.length / 2)], ranked[ranked.length - 1]] : ranked;
    const looks = [red, [30, 60, 210], [40, 160, 80]];
    S.arsenal = chosen.map((c, i) => ({ id: ["a", "b", "c"][i], name: `${c.manufacturer} ${c.name}`, exemplars: [sigFor(looks[i]), sigFor(looks[i])], catalogKey: c.key }));
    let seed = 7;
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const base = Date.now() - 3 * 864e5;
    for (let i = 0; i < 48; i++) {
      const high = i % 3 === 0;
      const entryBoard = 17.5 + (high ? 2 + rnd() * 2 : (rnd() - 0.5) * 1.6);
      const speed = (16.2 + (rnd() - 0.5) * 3.2) * (5280 / 3600);
      const p = synthPath(boardToX(10) + (rnd() - 0.5) * 2, 44 - i % 12 * 0.4, boardToX(entryBoard), speed);
      const a = analyzeShot(p);
      const m = deriveMetrics(a, p, "R");
      const strike = m.pocketMiss !== null && Math.abs(m.pocketMiss) <= 1 ? rnd() < 0.8 : rnd() < 0.15;
      S.shots.push({ id: `demo${i}`, at: new Date(base + i * 24e4 + (i > 24 ? 864e5 : 0)).toISOString(), sessionId: i > 24 ? "demoB" : "demoA", ballId: "a", a, m, path: p, cal: [], vw: 1280, vh: 720, recStartT: 0, hasClip: false, sig: sigFor(red), result: { pinsDown: strike ? 10 : 7 + Math.floor(rnd() * 3) } });
    }
    document.body.classList.add("live");
    setText("fps", "DEMO");
    setMode("lane");
    overlay.width = 1280;
    overlay.height = 720;
    $("stage").style.background = "linear-gradient(#1a1410, #3a2a1c 55%, #8a6a44)";
    corners = [{ x: 330, y: 640 }, { x: 950, y: 640 }, { x: 700, y: 200 }, { x: 580, y: 200 }];
    H2 = solveHomography(corners, LANE_CORNERS);
    Hinv = solveHomography(LANE_CORNERS, corners);
    setStep(4);
    setReady(true);
    status.textContent = "Demo: simulated shots on a mock lane";
    changed();
    let t0d = performance.now();
    let n = 0;
    const tick = () => {
      const t = (performance.now() - t0d) / 1e3;
      const bp = 46 - n * 1.8;
      const speed = 17.2 * (5280 / 3600);
      const y = speed * t;
      if (t >= 0 && y <= 59) {
        const x = y <= bp ? boardToX(10) + 3 * Math.sin(Math.PI / 2 * (y / bp)) : boardToX(10) + 3 + (boardToX(17.5) - boardToX(10) - 3) * ((y - bp) / (59.5 - bp)) ** 2;
        path.push({ t, x, y });
        trail.push(laneToPx(x, y));
      } else if (path.length) {
        const a = analyzeShot(path);
        if (a) {
          const shot = { id: newId(), at: (/* @__PURE__ */ new Date()).toISOString(), sessionId: S.sessionId, ballId: "a", a, m: deriveMetrics(a, path, "R"), path, cal: corners, vw: 1280, vh: 720, recStartT: 0, hasClip: false, sig: sigFor(red) };
          lastShot = { trail: [...trail], a, at: performance.now(), path: [...path] };
          void registerShot(shot);
          status.textContent = "Shot captured. Watching for the next shot.";
        }
        path = [];
        trail = [];
        n++;
        t0d = performance.now() + 2500;
      }
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      drawOverlay(performance.now());
      requestAnimationFrame(tick);
    };
    tick();
    renderBall(void 0);
    renderResult(void 0);
    renderLane();
  }
  window.addEventListener("hashchange", () => {
    captureIncomingHash();
    void handleIncoming();
  });
  (async () => {
    captureIncomingHash();
    initTabs();
    initCoachLive();
    await loadReference();
    const dl = document.getElementById("catalog-list");
    const fill = () => dl && (dl.innerHTML = S.catalog.map((b) => `<option value="${(b.manufacturer + " " + b.name).replace(/"/g, "&quot;")}">`).join(""));
    fill();
    if (location.search.includes("demo")) return void runDemo().then(() => (fill(), handleIncoming()));
    const has = await bootProfile();
    if (has) {
      renderBall(void 0);
      renderResult(void 0);
      renderLane();
      handleIncoming();
    } else showQuiz("first", () => (showTab("live"), handleIncoming(), tourSeen() || startTour()));
    changed();
  })();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(() => navigator.serviceWorker.ready).then(() => setText("offline", "Ready offline \u2713")).catch(() => {
    });
  }
})();
