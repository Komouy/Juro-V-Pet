package com.jurovpet.app;

import android.app.PictureInPictureParams;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(JuroGlancePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        // Jangan hancurkan activity saat tombol back ditekan di halaman utama,
        // melainkan minimalkan aplikasi ke latar belakang (background) agar tetap hidup.
        moveTaskToBack(true);
    }

    public boolean isPipSupported() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
    }

    public boolean enterGlancePip() {
        if (isPipSupported()) {
            try {
                PictureInPictureParams params = new PictureInPictureParams.Builder()
                        .setAspectRatio(new Rational(3, 4))
                        .build();
                return enterPictureInPictureMode(params);
            } catch (Exception e) {
                return false;
            }
        }
        return false;
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (getBridge() != null && getBridge().getWebView() != null) {
            String js = "window.dispatchEvent(new CustomEvent('juroPipModeChanged', { detail: { isPip: " + isInPictureInPictureMode + " } }));";
            getBridge().getWebView().evaluateJavascript(js, null);
        }
    }
}
