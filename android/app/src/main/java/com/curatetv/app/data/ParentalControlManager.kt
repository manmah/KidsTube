package com.curatetv.app.data

import android.content.Context
import android.content.SharedPreferences

class ParentalControlManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("greenkid_parental_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_BLOCKED_VIDEOS = "blocked_video_ids"
        private const val KEY_PARENT_PIN = "parent_pin"
        private const val KEY_FEED_URL = "custom_feed_url"
        const val DEFAULT_FEED_URL = "https://raw.githubusercontent.com/manmah/KidsTube/main/public/sample-tv-feed.json"
    }

    fun getBlockedVideoIds(): Set<String> {
        return prefs.getStringSet(KEY_BLOCKED_VIDEOS, emptySet()) ?: emptySet()
    }

    fun blockVideo(videoId: String) {
        val current = getBlockedVideoIds().toMutableSet()
        current.add(videoId)
        prefs.edit().putStringSet(KEY_BLOCKED_VIDEOS, current).apply()
    }

    fun unblockVideo(videoId: String) {
        val current = getBlockedVideoIds().toMutableSet()
        current.remove(videoId)
        prefs.edit().putStringSet(KEY_BLOCKED_VIDEOS, current).apply()
    }

    fun isVideoBlocked(videoId: String): Boolean {
        return getBlockedVideoIds().contains(videoId)
    }

    fun getFeedUrl(): String {
        return prefs.getString(KEY_FEED_URL, DEFAULT_FEED_URL) ?: DEFAULT_FEED_URL
    }

    fun setFeedUrl(url: String) {
        prefs.edit().putString(KEY_FEED_URL, url.trim()).apply()
    }

    fun verifyPin(input: String): Boolean {
        val savedPin = prefs.getString(KEY_PARENT_PIN, "1234") ?: "1234"
        return input == savedPin
    }

    fun setPin(pin: String) {
        prefs.edit().putString(KEY_PARENT_PIN, pin).apply()
    }
}
