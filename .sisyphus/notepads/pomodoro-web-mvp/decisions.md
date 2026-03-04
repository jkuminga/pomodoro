# Decisions

- Platform: web app.
- Persistence: localStorage only; no Notification API.
- Catch-up semantics: if expired while closed, apply ONE boundary transition then pause.
