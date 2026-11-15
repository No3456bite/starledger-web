# Keyboard focus follow-up — 2026-11-15

The user's iPhone screenshot disproved the previous fix: the entry header moved down into the middle of the screen while the keyboard was visible. Desktop WebKit and a mocked VisualViewport cannot reproduce the iOS keyboard compositor.

## Source comparison

- Bing, Google and DuckDuckGo public search pages were opened through the web connector. Direct Bing access from the development browser/network returned HTTP 403. The text view exposes input controls but not their complete dynamic JavaScript/CSS. We cannot claim to have reverse-engineered Bing's keyboard implementation, or infer that a search page and a modal use the same positioning system.
- [Microsoft Fluent UI DialogSurface](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-dialog/library/src/components/DialogSurface/useDialogSurface.ts) separates dialog focus/modal attributes from its body-scroll lock. The inspected component does not implement keyboard pan correction; it is an architectural comparison, not an iOS-specific solution.
- [Adobe React Aria usePreventScroll](https://github.com/adobe/react-spectrum/blob/main/packages/react-aria/src/overlays/usePreventScroll.ts) documents Safari's tendency to center focused inputs even inside nested scrollable regions. It separates internal reveal from root scrolling. Its current global focus override is inappropriate for our single-dialog controller, so we do not copy it.
- [Ionic scroll assist](https://github.com/ionic-team/ionic-framework/blob/main/core/src/utils/input-shims/hacks/scroll-assist.ts) and [input relocation](https://github.com/ionic-team/ionic-framework/blob/main/core/src/utils/input-shims/hacks/common.ts) guard the focused input geometry to prevent native page pan, then scroll the content. Our scoped focus handler adopts that principle without replacing/cloning the input, maintaining a second focus target or importing the framework.
- [Adobe issue #7131](https://github.com/adobe/react-spectrum/issues/7131) explains why cancelling touchend can accidentally focus an input after a drag. We leave tap, drag, selection and pinch gestures native rather than adding that older workaround.

## Correction

The previous absolute dialog wrote `scrollY + visualViewport.offsetTop` to `top`. This translated the sheet in response to keyboard pan. The native fixed top layer now retains its own position; viewport height only determines the obscured part of each internal scroll region. The focused control is revealed conservatively within that region, excluding the keyboard.

On iOS, a capture-phase focus handler applies temporary safe geometry to the real text input and restores its exact inline transform on the next animation frame or immediately on blur/close. It does not refocus, replace the node, alter its value/selection, or run again when the already-focused input is tapped. This also covers native Next/Previous focus changes. Native date/select pickers remain native.

## What the checks establish

The old test subtracted the synthetic viewport offset from the real DOM rectangle. That cancelled the erroneous displacement and produced a false pass. The corrected check asserts raw dialog/header rectangles. Running it against the old implementation fails at the first note check: `y 0 -> 160`.

Checks cover secondary forms, actual touch focus event dispatch with an iPhone user agent, repeated taps, fast field changes, composition node identity, selection support, close during pending focus cleanup, screen rotation, layout shrink, root scroll restoration and standalone configuration. Mocked viewport events establish our code's contract; they do not establish how an actual iOS keyboard/compositor behaves.

Device acceptance remains: Safari with address bar expanded/collapsed, first focus and repeated taps, Done then refocus, keyboard Next/Previous, Chinese composition and candidate bar changes, selection handles, rotation, OCR-opened entry, settings and backup forms, and installed PWA. The frame must stay stable and only the internal form may scroll enough to show the field.
