# Lockout

**A countdown lock screen for deadlines other people hold the keys to.**
Live: https://arshdwani.github.io/lockout-countdown/

In a factory, a machine can't be switched on until every worker has taken their own padlock off the switch, and
nobody may remove someone else's lock (OSHA lockout/tagout, 29 CFR 1910.147). A grad school application works the
same way: 5 of its 7 locks belong to someone else (three recommenders, the registrar, ETS).

The lock screen is that switch. Each milestone is a padlock with a tag: red for **their key**, yellow for **your
key**. Rubber stamps track each lock day by day (agreed, packet sent, invited, nudged ×2), today's lock gets a TODAY
tape, a flip counter counts down to your own submit date, and the switch flips to ON the morning after you submit.
A lock reads DUE TODAY on its due date and OVERDUE after it; it only comes off on the day you enter for its key
coming back. (The example shows one sample run in which the locks started first come back first.)

## The example plan
Six CS master's/PhD programs due Tue Dec 15 2026, planned backward with Gemini: start every lock someone else holds
in the first 72 hours, build in nudge days, keep Thanksgiving light, submit on Sun Dec 13 and keep two buffer days.

## Make your own
Open the page, scroll to **Hang your own locks**, edit the keyholders, stamps and dates, and press **Make my
lockout**. The plan lives in the link. **Every day (.zip)** gives one dated PNG per day (iPhone 1290×2796 or
Android 1080×2400); an iOS Shortcuts automation can set the right one each morning (steps on the page).

## Files
- `lockout.js`: the whole picture, drawn as one SVG (switch, lockout bar, padlocks, tags, stamps, flip counter).
- `plan.js`: the example plan. `frame.html?date=YYYY-MM-DD&clock=1`: one frame, for headless rendering.
- `fonts.js`: Archivo and IBM Plex Mono (SIL Open Font License, `fonts/`), embedded so exported PNGs keep their type.

MIT licensed.
