# Live prototype evidence

| File | Evidence |
| --- | --- |
| [guest-marketplace.png](guest-marketplace.png) | Original report Figure 4. |
| [guest-sign-in.png](guest-sign-in.png) | Original Figure 5; interface only, not successful login. |
| [completed-listings.png](completed-listings.png) | Original Figure 6; not an active bid. |
| [capture-register.json](capture-register.json) | Source member names, hashes and evidence boundaries. |
| [health_observations.json](health_observations.json) | New browser-visible response bodies at 15:25 on 24 October 2026, UTC+05:00. |
| [health-visible-text.txt](health-visible-text.txt) | Human-readable body observations. |
| [marketplace-accessibility-excerpt.txt](marketplace-accessibility-excerpt.txt) | New DOM excerpt at 15:26; existing signed-in session restored. |

The report captions date the three PNGs to 24 October; independent capture timestamps are unavailable. The earlier approximately 02:59 HTTP record was not recovered. The new JSON is not a recreation of that record. HTTP status codes and request durations were not measured. The smoke CLI was not rerun. Render first showed its cold-start page, then the application JSON.

The new marketplace text excerpt is a separate current observation from an existing session, not the original accessibility text accompanying the historical guest images. No new login, bid, sale or listing creation was performed.
