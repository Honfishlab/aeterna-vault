# Aeterna Vault Landing Page Handoff

## Goal

Create or integrate a cinematic first-visitor landing page for Aeterna Vault.

The landing page should feel like a moving, emotional video experience: warm, futuristic, permanent, and family-centered. It should introduce Aeterna Vault as a happy place to store photos, videos, written memories, and time capsules for future generations, with AI guiding the user through the process.

## Brand

Product name: Aeterna Vault

Tagline:

Your AI-guided memory storage for generations over time.

Preferred supporting line:

AI-guided memory storage.

Tone:

Elegant, emotional, cinematic, trustworthy, generational, hopeful.

Avoid:

Generic SaaS layout, cartoon graphics, plain floating boxes, duplicate cards, or visible explanatory text that says "new visitor."

## Current Prototype

Use the included prototype as the visual direction.

Source prototype:

`landing-page-source/`

Static built preview:

`preview-build/index.html`

Important assets:

`assets/aeterna-vault-hero.png`

`assets/aeterna-vault-hero-export.jpg`

`assets/aeterna-vault-mark.png`

`assets/aeterna-vault-logo-bg.png`

`assets/memories/`

## Visual Direction

Hero background:

Use the existing cinematic Aeterna Vault background. The PNG is the safest version and should be preferred if file size is acceptable. The JPG export is included only for convenience.

Main hero should include:

- Aeterna Vault logo in the top-left brand area.
- Purple, gold, and soft cosmic/futuristic lighting.
- Moving/fading real photos and video-memory thumbnails floating around the hero.
- No fake empty floating UI blocks.
- No duplicate timeline/card rows.

Hero headline:

Preserve the moments that make a family eternal.

Hero body copy:

Aeterna Vault helps you store beautiful photos, meaningful videos, written time capsules, and the stories behind them so future generations can feel where they came from.

Lower section headline:

Photos, videos, and time capsules become a living archive for generations.

Lower cards:

- Photos stay meaningful
- Videos become searchable
- Time capsules wait

Each lower card should include real imagery, not abstract icon-only placeholders.

## Login And Signup Link Instructions

The current prototype opens a modal. For the real website, replace the modal behavior with direct links into the app.

Use these two destination routes unless the app has different existing routes:

Login destination:

`/login`

Signup/Create Vault destination:

`/signup`

Wire the buttons this way:

Top-right "Log In" button:

`href="/login"`

Top-right "Create Vault" button:

`href="/signup"`

Hero "Start a Family Vault" button:

`href="/signup"`

Hero "I Already Have One" button:

`href="/login"`

If integrating into the live domain, these become:

`https://aeterna-vault.ai.studio/login`

`https://aeterna-vault.ai.studio/signup`

Important:

The landing page should appear only for first-time visitors or visitors not recognized as signed-in users. Recognized/signed-in users should bypass this page and go directly into the app/dashboard.

## Suggested Implementation Notes

Replace prototype buttons like this:

```html
<a class="ghost-button" href="/login">Log In</a>
<a class="solid-button" href="/signup">Create Vault</a>
<a class="solid-button large" href="/signup">Start a Family Vault</a>
<a class="ghost-button large" href="/login">I Already Have One</a>
```

Remove the modal markup and JavaScript if the real app already has login/signup pages.

Keep the motion subtle:

- Slow background drift.
- Soft film grain.
- Gentle light ribbons.
- Real memory images fading in and out around the hero.
- Respect `prefers-reduced-motion`.

## Asset Notes

Use:

`assets/aeterna-vault-mark.png`

for the small logo mark in the header.

Use:

`assets/aeterna-vault-hero.png`

for the hero background.

Use:

`assets/memories/*.jpg`

for floating photo/video memories and lower section imagery.

Use:

`assets/aeterna-vault-logo-bg.png`

as a full branded reference image only when needed for brand presentation or social sharing.

## Delivery Expectations

Final page should be responsive on desktop and mobile.

Buttons should be real navigation links into the app.

The page should not show duplicate cards.

The page should not show placeholder boxes where real memory imagery should appear.

The landing page should feel like a cinematic video-format intro, but it can be implemented using HTML/CSS animation rather than an actual video file if that performs better.
