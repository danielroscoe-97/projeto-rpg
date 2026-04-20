/**
 * getCaretCoordinates — computes the pixel position of the caret inside a
 * <textarea> or <input>, relative to the element's bounding box.
 *
 * Ported in-line (≈40 LOC) instead of adding the `textarea-caret-position`
 * npm package: the algorithm is small and well-known (clone the textarea as
 * a hidden div, mirror every style that affects text flow, measure where a
 * marker span lands after `text.slice(0, caretPos)`).
 *
 * Intended for popover anchoring, not pixel-perfect cursor overlays — a few
 * sub-pixel rounding errors are acceptable.
 */

const MIRRORED_STYLE_PROPS = [
  "direction",
  "boxSizing",
  "width",
  "height",
  "overflowX",
  "overflowY",

  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderStyle",

  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",

  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontSizeAdjust",
  "lineHeight",
  "fontFamily",

  "textAlign",
  "textTransform",
  "textIndent",
  "textDecoration",

  "letterSpacing",
  "wordSpacing",
  "tabSize",

  "whiteSpace",
  "wordBreak",
  "overflowWrap",
] as const;

export interface CaretCoords {
  /** Horizontal pixel offset of the caret relative to element's border-box. */
  left: number;
  /** Vertical pixel offset of the caret (top of line). */
  top: number;
  /** Height of the line the caret is on. */
  height: number;
}

export function getCaretCoordinates(
  element: HTMLTextAreaElement | HTMLInputElement,
  position: number,
): CaretCoords {
  const doc = element.ownerDocument;
  const win = doc.defaultView ?? window;

  const mirror = doc.createElement("div");
  mirror.setAttribute("aria-hidden", "true");
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";

  const computed = win.getComputedStyle(element);
  for (const prop of MIRRORED_STYLE_PROPS) {
    // `style` is a CSSStyleDeclaration; we can safely copy through.
    (mirror.style as unknown as Record<string, string>)[prop as string] =
      computed[prop as keyof CSSStyleDeclaration] as string;
  }

  // <input> is single-line, so strip whitespace behaviour that would wrap.
  if (element.nodeName === "INPUT") {
    mirror.style.whiteSpace = "normal";
    mirror.style.wordWrap = "normal";
    mirror.style.overflowWrap = "normal";
  }

  mirror.textContent = element.value.slice(0, position);

  const marker = doc.createElement("span");
  // Zero-width space so the span gains layout but doesn't widen text.
  marker.textContent = element.value.slice(position) || ".";
  mirror.appendChild(marker);

  doc.body.appendChild(mirror);

  const markerRect = {
    top: marker.offsetTop,
    left: marker.offsetLeft,
    height: marker.offsetHeight || parseInt(computed.lineHeight, 10) || 0,
  };

  doc.body.removeChild(mirror);

  return {
    left: markerRect.left - element.scrollLeft,
    top: markerRect.top - element.scrollTop,
    height: markerRect.height,
  };
}
