# Controller setup scroll review

A temporary loss of controller availability used to remove the stick and button mapping rows. The form then shrank and its scroll position could jump to the top. The adapter now keeps the form mounted, disables unavailable mapping fields, and re-enables them when the controller returns. Unchanged live readouts are no longer rewritten repeatedly.

Focused comparison: https://github.com/lovemyfreetime/billiards-trainer/actions/runs/43595289577
The original adapter reproduced the scroll displacement on tablet, landscape phone and portrait phone; the patched adapter retained the scroll position on all three. All 29 controller adapter checks passed. This browser comparison does not establish the exact focus/input event behind every physical-device occurrence; Android device confirmation remains required.

This review rebuild includes that patch and the previously verified Guide sidebar wrapping fix. It retains the normal signing identity, package IDs, full bundled content and normal native checks. No public release or Windows rebuild is requested by this note.

## Stick click names

L3 means pressing the left analog stick straight down until it clicks. R3 means pressing the right analog stick straight down. The current defaults use L3 for the positioning cursor and R3 for reset view. They are not separate shoulder buttons.

Sony's CUH-ZCT2 specifications list Left stick / L3 button and Right stick / R3 button:
https://sonyinteractive.com/en/press-releases/2016/sony-interactive-entertainment-introduces-new-peripherals-for-playstation4/
