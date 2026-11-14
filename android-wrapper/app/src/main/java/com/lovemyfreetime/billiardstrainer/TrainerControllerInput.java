package com.lovemyfreetime.billiardstrainer;

import android.content.Context;
import android.hardware.input.InputManager;
import android.os.Handler;
import android.os.Looper;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Consumer;

/** Optional, normalized input for the embedded Trainer. All methods run on the UI thread. */
final class TrainerControllerInput implements InputManager.InputDeviceListener {
    private final InputManager manager;
    private final Consumer<String> emit;
    private final Map<Integer, Pad> pads = new LinkedHashMap<>();
    private boolean enabled, focused = true;

    private static final class Pad {
        final InputDevice device;
        final float[] axes = new float[4], keys = new float[17], analog = new float[17];
        boolean ready;
        Pad(InputDevice device) { this.device = device; }
    }

    TrainerControllerInput(Context context, Consumer<String> emit) {
        this.emit = emit;
        manager = (InputManager) context.getSystemService(Context.INPUT_SERVICE);
        if (manager != null) manager.registerInputDeviceListener(this, new Handler(Looper.getMainLooper()));
    }

    private static boolean gamepad(InputDevice device) {
        return device != null && (device.supportsSource(InputDevice.SOURCE_GAMEPAD)
                || device.supportsSource(InputDevice.SOURCE_JOYSTICK));
    }

    void setEnabled(boolean value) {
        enabled = value;
        refresh();
    }

    void setFocused(boolean value) {
        focused = value;
        refresh();
    }

    private void refresh() {
        pads.clear();
        if (enabled && focused) for (int id : InputDevice.getDeviceIds()) {
            InputDevice d = InputDevice.getDevice(id);
            if (gamepad(d)) pads.put(id, new Pad(d));
        }
        publish();
    }

    private Pad pad(InputDevice device) {
        if (!enabled || !focused || !gamepad(device)) return null;
        Pad p = pads.get(device.getId());
        if (p == null) { p = new Pad(device); pads.put(device.getId(), p); }
        return p;
    }

    static int button(int key) {
        switch (key) {
            case KeyEvent.KEYCODE_BUTTON_A: return 0;
            case KeyEvent.KEYCODE_BUTTON_B: return 1;
            case KeyEvent.KEYCODE_BUTTON_X: return 2;
            case KeyEvent.KEYCODE_BUTTON_Y: return 3;
            case KeyEvent.KEYCODE_BUTTON_L1: return 4;
            case KeyEvent.KEYCODE_BUTTON_R1: return 5;
            case KeyEvent.KEYCODE_BUTTON_L2: return 6;
            case KeyEvent.KEYCODE_BUTTON_R2: return 7;
            case KeyEvent.KEYCODE_BUTTON_SELECT: return 8;
            case KeyEvent.KEYCODE_BUTTON_START: return 9;
            case KeyEvent.KEYCODE_BUTTON_THUMBL: return 10;
            case KeyEvent.KEYCODE_BUTTON_THUMBR: return 11;
            case KeyEvent.KEYCODE_DPAD_UP: return 12;
            case KeyEvent.KEYCODE_DPAD_DOWN: return 13;
            case KeyEvent.KEYCODE_DPAD_LEFT: return 14;
            case KeyEvent.KEYCODE_DPAD_RIGHT: return 15;
            default: return -1; // PS / Home and Android Back remain with the OS.
        }
    }

    boolean key(KeyEvent event) {
        if (event.getAction() != KeyEvent.ACTION_DOWN && event.getAction() != KeyEvent.ACTION_UP) return false;
        int index = button(event.getKeyCode());
        if (index < 0) return false;
        Pad p = pad(event.getDevice());
        if (p == null) return false;
        p.keys[index] = event.getAction() == KeyEvent.ACTION_DOWN ? 1 : 0;
        // Trigger release can arm button-only devices; sticks require a motion sample.
        if (index == 7 && event.getAction() == KeyEvent.ACTION_UP) p.ready = true;
        publish();
        return true;
    }

    private static float axis(MotionEvent event, InputDevice device, int axis) {
        InputDevice.MotionRange range = device.getMotionRange(axis, event.getSource());
        if (range == null) return 0;
        float value = event.getAxisValue(axis);
        return Math.abs(value) <= range.getFlat() ? 0 : Math.max(-1, Math.min(1, value));
    }

    private static float trigger(MotionEvent event, InputDevice device, int axis) {
        InputDevice.MotionRange range = device.getMotionRange(axis, event.getSource());
        if (range == null) return 0;
        float span = range.getMax() - range.getMin();
        return span <= 0 ? 0 : Math.max(0, Math.min(1, (event.getAxisValue(axis) - range.getMin()) / span));
    }

    boolean motion(MotionEvent event) {
        if ((event.getSource() & InputDevice.SOURCE_JOYSTICK) != InputDevice.SOURCE_JOYSTICK
                || event.getActionMasked() != MotionEvent.ACTION_MOVE) return false;
        Pad p = pad(event.getDevice());
        if (p == null) return false;
        InputDevice d = p.device;
        p.axes[0] = axis(event, d, MotionEvent.AXIS_X);
        p.axes[1] = axis(event, d, MotionEvent.AXIS_Y);
        p.axes[2] = axis(event, d, d.getMotionRange(MotionEvent.AXIS_Z, event.getSource()) != null ? MotionEvent.AXIS_Z : MotionEvent.AXIS_RX);
        p.axes[3] = axis(event, d, d.getMotionRange(MotionEvent.AXIS_RZ, event.getSource()) != null ? MotionEvent.AXIS_RZ : MotionEvent.AXIS_RY);
        p.analog[6] = Math.max(trigger(event, d, MotionEvent.AXIS_LTRIGGER), trigger(event, d, MotionEvent.AXIS_BRAKE));
        p.analog[7] = Math.max(trigger(event, d, MotionEvent.AXIS_RTRIGGER), trigger(event, d, MotionEvent.AXIS_GAS));
        float x = axis(event, d, MotionEvent.AXIS_HAT_X), y = axis(event, d, MotionEvent.AXIS_HAT_Y);
        p.analog[12] = y < -.5f ? 1 : 0; p.analog[13] = y > .5f ? 1 : 0;
        p.analog[14] = x < -.5f ? 1 : 0; p.analog[15] = x > .5f ? 1 : 0;
        p.ready = true;
        publish();
        return true;
    }

    private void publish() {
        JSONArray result = new JSONArray();
        if (enabled && focused) for (Map.Entry<Integer, Pad> entry : pads.entrySet()) {
            Pad p = entry.getValue();
            JSONArray axes = new JSONArray(), buttons = new JSONArray();
            for (float value : p.axes) axes.put((Object) Float.valueOf(value));
            for (int i = 0; i < p.keys.length; i++) buttons.put((Object) Float.valueOf(Math.max(p.keys[i], p.analog[i])));
            JSONObject data = new JSONObject();
            try {
                data.put("index", entry.getKey()); data.put("id", p.device.getName() + " (" + p.device.getVendorId() + ":" + p.device.getProductId() + ")");
                data.put("mapping", "standard"); data.put("ready", p.ready); data.put("axes", axes); data.put("buttons", buttons);
                result.put(data);
            } catch (org.json.JSONException ignored) { }
        }
        emit.accept(result.toString());
    }

    @Override public void onInputDeviceAdded(int id) {
        if (enabled && focused) { InputDevice d = InputDevice.getDevice(id); if (gamepad(d)) { pads.put(id, new Pad(d)); publish(); } }
    }
    @Override public void onInputDeviceRemoved(int id) { if (pads.remove(id) != null) publish(); }
    @Override public void onInputDeviceChanged(int id) {
        if (pads.containsKey(id)) { pads.remove(id); onInputDeviceAdded(id); publish(); }
    }
    void close() { enabled = false; pads.clear(); if (manager != null) manager.unregisterInputDeviceListener(this); }
}
