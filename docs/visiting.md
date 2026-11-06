# Visiting the Atlas

**[Open Diorama Atlas](https://paulosalem.github.io/diorama-atlas/)**.
There is no account, installation or API key. Use a modern browser with
WebGL 2 and hardware acceleration; these are substantial real-time 3D scenes.

## Find a place

Drag the globe, scroll to zoom, or open **Places** to choose a region. Preview
its settings and enter one. With a mouse, hover over a marker to preview it or
click to enter directly. On a touch screen, tap a marker to keep its preview card
open, then choose **Step inside** or **Explore this place** in the card to enter.
Close the card with its close button or touch the globe to continue exploring.
Regional markers identify the source of inspiration, not the address of the
anonymous modeled scene.

Inside, drag or use arrow keys to look around. Scroll or press `+` / `-` to
zoom. Named viewpoint buttons move you between authored positions; this is not
a free-walking game. The Roman domus additionally supports walking with W/A/S/D
or its on-screen directional pad. **Reset view** returns to the arrival framing.
**Back to world** returns to the globe, preserving its orientation.

## Use the whole screen

The **Full screen** control in the header hides the browser bars where supported,
on desktop, iPad and Android. On compact screens it uses an expanding-corners
icon. It opens the whole Atlas, so navigation, sound settings and dialogs remain
available. Choose **Exit full screen**, or use the browser's Escape key or exit
gesture, to return. Entering fullscreen always requires your tap or click.

If the browser does not allow fullscreen, the same control explains how to open
Atlas as a Home Screen app. In Safari, use **Share → Add to Home Screen** and
enable **Open as Web App** if offered. On Android or desktop, use the browser's
**Install app** or **Add to Home screen** menu when available. Launch the new icon
to open without the normal address and navigation bars; system indicators may
remain. Installation does not download the collection for offline use.

Fullscreen requests are feature-detected, not inferred from a device name.
Restricted embedded browsers can refuse them; open the site in a full browser
or use the Home Screen option. Browser and device settings still control whether
these modes are available.

## Explore the details

Each interior offers a connected-space view as well as the main room and
details. Outdoors, four viewpoints reveal the setting at walking scale.
**Show details** exposes object annotations. **References** on outdoor scenes
shows credited source photographs; **About** contains the consolidated credits.

## Hold a miniature

Choose **Miniature** beside **Interior** or **Landscape** to see the same place
as a floating object. Drag to turn it, scroll or pinch to zoom, and use the
named views to look closely. **Whole miniature** returns to the complete piece.
Your original full-scale visit remains available beside it.

Landscapes have two separated sections, including the ground beneath them.
Interiors begin enclosed: **Crack it open** lifts the roof and exterior shell
up and sideways, revealing the rooms and passages. **Close miniature** brings
the pieces back together. Choosing an interior detail opens the shell
automatically; closing from a detail returns to the whole-object view.
Reduced-motion preferences make the same change immediately.

The Roman domus starts as a cutaway. **Cutaway** closes or lifts its roof;
**Whole house**, **Courtyards**, **Peristyle garden**, **Working household**
and **House plan** reveal its organization. Switching back to **Interior**
restores your walking position. Its familiar Play/Pause narration panel serves
both representations.

**Listen to this view** plays an OpenAI recording of the accompanying passage.
It remains silent until selected, stops when you change views or hide
the page, and shares the Soundscape mute controls.

## Listen and read

The language selector changes **all interface text and guided narration**
between English (US) and Português (Brasil), without rebuilding the scene.
Each place and viewpoint has a prerecorded cultural paragraph.

The floating narration panel offers **Play**, pause, elapsed time and minimize.
Playing enables later automatic arrival/view narration; switching views or a
sustained close look can select a focused passage. Pausing suspends look-based
triggers. Opening object details pauses and replaces the guided panel rather
than placing two captions over the scenery.

**Soundscape** has independent music and ambience controls, volumes,
**Follow the place**, **Atlas theme everywhere**, and **Mute all**.
Both sound channels default to enabled, but first-time playback waits for
**Resume**. Existing saved mute settings are not overwritten. Narration remains
off until selected separately.

Sound choices persist for one year on that browser origin. One Atlas tab owns
playback at a time. Hiding a page stops sound; returning requires Resume.
Browser-blocked playback also offers Resume without discarding saved settings.
Reduced motion stops scenery animation, not deliberate listening.

## Share a view

Use a scene's link in the [collection index](scenes/README.md).
For example:

<https://paulosalem.github.io/diorama-atlas/?scene=kissaten&inspect=1&view=coffee>

The optional `view` key is specific to the scene. The briefs list the available
keys. English and Portuguese use the same scene IDs and links.
Miniature links include `version=miniature`; `open=1` restores an open interior
shell. For example:

<https://paulosalem.github.io/diorama-atlas/?scene=textile&version=miniature&open=1>

## What the public edition includes

All 28 bundled scenes, material imagery, references, music, ambience and
646 OpenAI recordings are served as static files. Guided visits, Miniatures
and object-detail **Listen** use these recordings in both languages.
The public edition cannot create scenes or generate recordings; those optional
tools belong to the [local development environment](development.md).

If loading fails, use the visible recovery link or reload. Check hardware
acceleration for rendering problems. The full asset collection is substantial;
network speed and device capabilities affect first visits.
