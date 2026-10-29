# Global Connections — one-page site

Static HTML/CSS/JS, no build step. Open `index.html` in a browser (double-click), or serve the folder:

    python3 -m http.server 8000   # then open http://localhost:8000

Copy: Global_Connections_EN (condensed spec), gaps filled from Global_Connections_Website_EN.
Visual style taken from the Gia site (tokens, components, header and footer styles).

## Blocks

    01  Hero: scroll-driven frame sequence + captions   #intro
    02  How it works (4 story cards)       #how-it-works
    03  What Gia can do (Save / Earn extra / Work & goals; pinned, tabs switch on scroll)   #what-gia-does
    04  Example dialogue                   #example
        (photo breather between 04 and 05)
    05  Personal & trust                   #trust
    06  Final CTA: prompt chips + input    #final

## Files

    index.html          the page
    css/tokens.css      colors, type, spacing (from the Gia site)
    css/base.css        reset, type, sections, buttons (from the Gia site)
    css/components.css  shared components: glass, chat bubbles, badges, page hero, vista, quiet effects (from the Gia site)
    css/shell.css       header, mobile menu, footer styles (from the Gia site)
    css/page.css        everything specific to this page
    js/site.js          menu, scroll progress, reveal (from the Gia site)
    js/scroll-hero.js   01 hero: draws the frame for the scroll position on a canvas, captions, frame loading
    js/components.js    play-once video, photo breather, staggered entry, shine (from the Gia site)
    js/page.js          chats, story cards, area tabs, prompt chips, header links
    assets/             logo, Gia's photo, photos
    assets/scroll-hero/ 01 hero frames (one shot: dark corridor -> lobby -> Gia close up on the right)
        desktop/f000.webp ... f182.webp   183 frames 1280x720 (24 fps, about 7.6 s)
        mobile/f000.webp ... f182.webp    the same frames 960x540, used up to 768px wide
        poster-first.webp                 first frame, shown at once while the frames load
        still-last.webp                   last frame, the still without JS or under reduced motion
    assets/video/       old hero video (hero-gc.mp4), no longer used on the page

## Temporary photos (replace with final ones: 16:9, no readable numbers or charts)

    How it works        step 1 quiet-moment, step 2 enables-capabilities, step 3 pick-option, step 4 hgw-direction
    What Gia can do     Save mp-money, Earn extra enables-economic, Work & goals enables-connections
    Personal & trust    Gia remembers mem-pro, Your interests come first gc-hero-workspace
    Photo breather      vista-gc

To replace one, put a new file in assets/images/ with the same names (-800 and the large version, .webp and .jpg),
or change the file names in index.html.

## Open items

- "Explore with Gia": there is no live chat yet; the final block shows a demo answer from Gia labeled "Demo".
  Connect the real chat (or sign-up) when it exists.
- Status "Coming next" on the page and on each area is a draft.
