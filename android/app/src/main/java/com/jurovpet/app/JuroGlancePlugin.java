package com.jurovpet.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Native Capacitor Plugin for Juro Pet Glance on Android.
 * Enables Picture-in-Picture (PiP) mode and updates Android AppWidget state.
 */
@CapacitorPlugin(name = "JuroGlanceNative")
public class JuroGlancePlugin extends Plugin {

    @PluginMethod
    public void enterPip(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                boolean success = activity.enterGlancePip();
                JSObject ret = new JSObject();
                ret.put("success", success);
                call.resolve(ret);
            });
        } else {
            call.reject("MainActivity tidak tersedia");
        }
    }

    @PluginMethod
    public void isPipSupported(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        boolean supported = activity != null && activity.isPipSupported();
        JSObject ret = new JSObject();
        ret.put("supported", supported);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateWidgetState(PluginCall call) {
        String petName = call.getString("name", "Juro");
        String status = call.getString("status", "Juro sedang santai di lembah.");
        int hunger = call.getInt("hunger", 100);
        int energy = call.getInt("energy", 100);

        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            JuroGlanceWidget.updateWidgetData(activity, petName, status, hunger, energy);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("Activity context tidak tersedia");
        }
    }
}
