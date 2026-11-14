package com.lovemyfreetime.billiardstrainer;

import android.view.KeyEvent;

/** Plain Java checks of Android's public gamepad button contract. */
public final class TrainerControllerInputTest {
    public static void main(String[] args) {
        int[] keys = {KeyEvent.KEYCODE_BUTTON_A, KeyEvent.KEYCODE_BUTTON_B,
            KeyEvent.KEYCODE_BUTTON_X, KeyEvent.KEYCODE_BUTTON_Y,
            KeyEvent.KEYCODE_BUTTON_L1, KeyEvent.KEYCODE_BUTTON_R1,
            KeyEvent.KEYCODE_BUTTON_L2, KeyEvent.KEYCODE_BUTTON_R2,
            KeyEvent.KEYCODE_BUTTON_SELECT, KeyEvent.KEYCODE_BUTTON_START,
            KeyEvent.KEYCODE_BUTTON_THUMBL, KeyEvent.KEYCODE_BUTTON_THUMBR,
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT};
        for (int i = 0; i < keys.length; i++) {
            if (TrainerControllerInput.button(keys[i]) != i) throw new AssertionError("Button index " + i);
        }
        for (int key : new int[]{KeyEvent.KEYCODE_BUTTON_MODE, KeyEvent.KEYCODE_HOME,
                KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_SPACE}) {
            if (TrainerControllerInput.button(key) != -1) throw new AssertionError("System/keyboard key intercepted: " + key);
        }
        System.out.println("PASS: Android API 35 bridge compiled; 16 gamepad mappings and 5 OS/keyboard exclusions checked.");
    }
}
