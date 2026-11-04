# Architecture rules
- Liturgical pinch gestures resize the reading text rather than scaling the page, so lines reflow within the available width; keep native browser zoom outside the reading area.
- Register the production service worker through the PWA plugin's prompt flow only, checking on foreground return; offer updates without discarding drafts or clearing user storage.