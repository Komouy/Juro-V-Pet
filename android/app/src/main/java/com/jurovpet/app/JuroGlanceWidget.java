package com.jurovpet.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Android Homescreen AppWidget Provider for Juro Pet Glance.
 * Menampilkan status pet Juro secara persisten di layar beranda ponsel pengguna.
 */
public class JuroGlanceWidget extends AppWidgetProvider {

    private static final String PREFS_NAME = "juro_widget_prefs";
    private static final String KEY_NAME = "pet_name";
    private static final String KEY_STATUS = "pet_status";
    private static final String KEY_HUNGER = "pet_hunger";
    private static final String KEY_ENERGY = "pet_energy";

    public static void updateWidgetData(Context context, String name, String status, int hunger, int energy) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(KEY_NAME, name)
                .putString(KEY_STATUS, status)
                .putInt(KEY_HUNGER, hunger)
                .putInt(KEY_ENERGY, energy)
                .apply();

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName widgetComponent = new ComponentName(context, JuroGlanceWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(widgetComponent);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            for (int id : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, id);
            }
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.juro_glance_widget);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String petName = prefs.getString(KEY_NAME, "Juro Virtual Pet");
        String petStatus = prefs.getString(KEY_STATUS, "Juro sedang santai di lembah.");

        views.setTextViewText(R.id.widget_pet_name, petName);
        views.setTextViewText(R.id.widget_pet_status, petStatus);

        // Mengetuk widget akan membuka aplikasi utama secara langsung
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
