package com.hossidev.watermonitor.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import com.hossidev.watermonitor.MainActivity
import com.hossidev.watermonitor.R
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Hossidev Home Screen Water Monitoring AppWidget Provider (2x2 and 4x2 support)
 * Features live telemetry polling, brand watermark icon, and fast SCADA deep linking.
 */
class WaterTankWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_WIDGET_REFRESH) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val thisWidget = ComponentName(context, WaterTankWidgetProvider::class.java)
            val allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget)

            // Trigger background telemetry fetch and update views
            thread {
                fetchLatestTelemetry(context) { levelPercent, volumeLiters, pumpActive ->
                    for (widgetId in allWidgetIds) {
                        val views = RemoteViews(context.packageName, R.layout.widget_water_tank_2x2)
                        views.setTextViewText(R.id.tv_level_percentage, "${levelPercent}%")
                        views.setProgressBar(R.id.pb_water_level, 100, levelPercent, false)
                        views.setTextViewText(R.id.tv_volume_liters, "${volumeLiters} L / 20.000 L")
                        views.setTextViewText(
                            R.id.tv_pump_badge,
                            if (pumpActive) "BOMBA ATIVA" else "BOMBA STANDBY"
                        )
                        appWidgetManager.updateAppWidget(widgetId, views)
                    }
                }
            }
        }
    }

    companion object {
        const val ACTION_WIDGET_REFRESH = "com.hossidev.watermonitor.ACTION_WIDGET_REFRESH"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_water_tank_2x2)

            // 1. Deep Link Intent to launch the main app directly on click
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                data = Uri.parse("https://hossidev.watermonitor.app/?view=tanks")
            }
            val pendingLaunch = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingLaunch)

            // 2. Refresh Button Action
            val refreshIntent = Intent(context, WaterTankWidgetProvider::class.java).apply {
                action = ACTION_WIDGET_REFRESH
            }
            val pendingRefresh = PendingIntent.getBroadcast(
                context,
                1,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_widget_refresh, pendingRefresh)

            // 3. Set default initial values
            views.setTextViewText(R.id.tv_app_label, "HOSSIDEV ÁGUA")
            views.setTextViewText(R.id.tv_tank_name, "Tanque 1 - Filtrada")
            views.setTextViewText(R.id.tv_level_percentage, "78%")
            views.setProgressBar(R.id.pb_water_level, 100, 78, false)
            views.setTextViewText(R.id.tv_volume_liters, "15.600 L / 20.000 L")
            views.setTextViewText(R.id.tv_pump_badge, "BOMBA ATIVA")

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun fetchLatestTelemetry(
            context: Context,
            onResult: (level: Int, volume: Int, pumpActive: Boolean) -> Unit
        ) {
            try {
                val url = URL("https://hossidev.watermonitor.app/api/telemetry/live")
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 4000
                connection.readTimeout = 4000
                connection.requestMethod = "GET"

                if (connection.responseCode == 200) {
                    val responseText = connection.inputStream.bufferedReader().readText()
                    val json = JSONObject(responseText)
                    val tanks = json.optJSONArray("tanks")
                    if (tanks != null && tanks.length() > 0) {
                        val t1 = tanks.getJSONObject(0)
                        val level = t1.optInt("levelPercentage", 78)
                        val volume = t1.optInt("currentVolumeLiters", 15600)
                        val pump = json.optBoolean("pumpActive", true)
                        onResult(level, volume, pump)
                        return
                    }
                }
            } catch (e: Exception) {
                // Fallback default
            }
            onResult(78, 15600, true)
        }
    }
}
