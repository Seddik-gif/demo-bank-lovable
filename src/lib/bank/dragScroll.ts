import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * Lets a horizontal snap carousel be swiped with a mouse: hold the button and drag.
 * Touch and trackpads already scroll natively, so only mouse drags are handled here.
 * Releasing snaps to the nearest slide. A drag that moved the carousel doesn't also count as a click.
 */
export function mouseDragHandlers(el: () => HTMLElement | null) {
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startLeft = 0;

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    const node = el();
    if (!node || e.pointerType !== "mouse" || e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startLeft = node.scrollLeft;
    node.style.scrollSnapType = "none";
    node.style.scrollBehavior = "auto";
    node.style.userSelect = "none";
    node.style.cursor = "grabbing";
    node.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const node = el();
    if (!dragging || !node) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 4) moved = true;
    node.scrollLeft = startLeft - dx;
  };

  const release = (e: ReactPointerEvent<HTMLElement>) => {
    const node = el();
    if (!dragging || !node) return;
    dragging = false;
    if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
    node.style.cursor = "";
    node.style.userSelect = "";
    // Snap to the nearest slide, then hand snapping back to CSS.
    const width = node.clientWidth || 1;
    const target = Math.round(node.scrollLeft / width) * width;
    node.scrollTo({ left: target, behavior: "smooth" });
    window.setTimeout(() => {
      node.style.scrollSnapType = "";
      node.style.scrollBehavior = "";
    }, 350);
  };

  // A drag that moved the carousel should not also trigger a click on the slide under the pointer.
  const onClickCapture = (e: ReactMouseEvent<HTMLElement>) => {
    if (moved) {
      e.stopPropagation();
      e.preventDefault();
      moved = false;
    }
  };

  return { onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release, onClickCapture };
}
