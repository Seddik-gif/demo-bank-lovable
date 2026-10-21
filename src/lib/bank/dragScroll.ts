import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

/** Mouse dragging can be switched off (the phone preview's "Click mode"). Missing or true means on. */
export function mouseSwipeOn(): boolean {
  return (window as unknown as { __mouseSwipe?: boolean }).__mouseSwipe !== false;
}

/** How far the mouse must move before a press counts as a drag rather than a click. */
const DRAG_START = 5;

/**
 * Lets a horizontal snap carousel be swiped with a mouse: hold the button and drag.
 * A press that doesn't move is a normal click, so buttons inside the carousel still work.
 * Touch and trackpads already scroll natively, so only mouse drags are handled here.
 * Releasing after a drag snaps to the nearest slide, and the drag doesn't also count as a click.
 */
export function mouseDragHandlers(el: () => HTMLElement | null) {
  let pressed = false;
  let dragging = false;
  let startX = 0;
  let startLeft = 0;
  let pointer = -1;
  let dragJustEnded = false;

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!mouseSwipeOn() || e.pointerType !== "mouse" || e.button !== 0) return;
    const node = el();
    if (!node) return;
    pressed = true;
    dragging = false;
    pointer = e.pointerId;
    startX = e.clientX;
    startLeft = node.scrollLeft;
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const node = el();
    if (!pressed || !node) return;
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_START) return;
      // Only now does the carousel take over the pointer, so a plain click never reaches here.
      dragging = true;
      node.setPointerCapture(pointer);
      node.style.scrollSnapType = "none";
      node.style.scrollBehavior = "auto";
      node.style.userSelect = "none";
      node.style.cursor = "grabbing";
    }
    node.scrollLeft = startLeft - dx;
  };

  const release = () => {
    const node = el();
    pressed = false;
    if (!dragging || !node) return;
    dragging = false;
    node.style.cursor = "";
    node.style.userSelect = "";
    // Snap to the nearest slide, then hand snapping back to CSS.
    const width = node.clientWidth || 1;
    node.scrollTo({ left: Math.round(node.scrollLeft / width) * width, behavior: "smooth" });
    window.setTimeout(() => {
      node.style.scrollSnapType = "";
      node.style.scrollBehavior = "";
    }, 350);
  };

  // A drag that moved the carousel should not also trigger a click on the slide under the pointer.
  const onClickCapture = (e: ReactMouseEvent<HTMLElement>) => {
    if (dragJustEnded) {
      dragJustEnded = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };
  const onPointerUp = () => {
    if (dragging) dragJustEnded = true;
    release();
  };

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: release, onClickCapture };
}
