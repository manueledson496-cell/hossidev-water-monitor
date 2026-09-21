package com.hossidev.watermonitor.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.hossidev.watermonitor.MainActivity
import com.hossidev.watermonitor.R

/**
 * Hossidev Mobile Push Notification Service
 * Enforces brand prominence on Android status bar, lock screen and expanded notification drawer.
 */
class HossidevFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val title = remoteMessage.notification?.title ?: remoteMessage.data["title"] ?: "Hossidev - Monitor de Água"
        val body = remoteMessage.notification?.body ?: remoteMessage.data["body"] ?: "Atualização de telemetria recebida."
        val level = remoteMessage.data["level"]?.toIntOrNull() ?: 50
        val isCritical = level <= 15

        showHossidevRichNotification(title, body, isCritical, level)
    }

    private fun showHossidevRichNotification(
        title: String,
        body: String,
        isCritical: Boolean,
        level: Int
    ) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = if (isCritical) CHANNEL_CRITICAL_ALERTS else CHANNEL_STATUS_UPDATES

        // Create Android O+ Notification Channels with high importance for critical water alerts
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelName = if (isCritical) "Alertas Críticos de Nível (Hossidev)" else "Status dos Reservatórios"
            val importance = if (isCritical) NotificationManager.IMPORTANCE_HIGH else NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel(channelId, channelName, importance).apply {
                description = "Notificações oficiais do sistema de telemetria Hossidev Water Monitor"
                enableLights(true)
                lightColor = if (isCritical) Color.RED else Color.CYAN
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 150, 300, 150, 500)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(channel)
        }

        // Tap action: open main app
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data = Uri.parse("https://hossidev.watermonitor.app/?view=tanks")
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decode Hossidev brand colored icon bitmap for large notification icon
        val largeBrandBitmap = BitmapFactory.decodeResource(resources, R.drawable.ic_hossidev_logo_large)

        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            // 1. Small silhouette icon for the Status Bar (Monochrome white)
            .setSmallIcon(R.drawable.ic_stat_hossidev_water)
            // 2. Large Brand Logo Icon on the right side of the notification
            .setLargeIcon(largeBrandBitmap)
            .setContentTitle(title)
            .setContentText(body)
            .setSubText("HOSSIDEV SCADA")
            .setColor(Color.parseColor("#0EA5E9")) // Hossidev Cyan Accent
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(if (isCritical) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Visible on Lock Screen
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText(body)
                    .setBigContentTitle(title)
                    .setSummaryText("Condomínio Kizomba - Reservatório T1: $level%")
            )

        if (isCritical) {
            notificationBuilder.setCategory(NotificationCompat.CATEGORY_ALARM)
        }

        notificationManager.notify(NOTIFICATION_TAG, NOTIFICATION_ID, notificationBuilder.build())
    }

    companion object {
        const val CHANNEL_CRITICAL_ALERTS = "hossidev_water_critical_alerts"
        const val CHANNEL_STATUS_UPDATES = "hossidev_water_status_updates"
        const val NOTIFICATION_TAG = "HOSSIDEV_TELEMETRY"
        const val NOTIFICATION_ID = 1001
    }
}
