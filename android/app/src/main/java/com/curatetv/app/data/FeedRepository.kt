package com.curatetv.app.data

import android.content.Context
import android.util.Log
import com.curatetv.app.model.CategorySection
import com.curatetv.app.model.TvFeed
import com.curatetv.app.model.VideoItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class FeedRepository(private val context: Context) {

    private val parentalManager = ParentalControlManager(context)
    private val cacheFileName = "cached_feed.json"

    companion object {
        private const val TAG = "FeedRepository"

        /**
         * Converts GitHub blob/tree URLs into direct raw.githubusercontent.com URLs
         * Example: https://github.com/manmah/KidsTube/blob/main/public/sample-tv-feed.json
         *       -> https://raw.githubusercontent.com/manmah/KidsTube/main/public/sample-tv-feed.json
         */
        fun normalizeGitHubUrl(url: String): String {
            var trimmed = url.trim()
            if (trimmed.contains("github.com") && trimmed.contains("/blob/")) {
                trimmed = trimmed.replace("github.com", "raw.githubusercontent.com")
                    .replace("/blob/", "/")
            }
            return trimmed
        }
    }

    /**
     * Loads feed with auto-update from GitHub:
     * 1. Attempts to fetch latest feed from GitHub
     * 2. If successful, writes to local disk cache and parses
     * 3. If network fails or offline, falls back to local cached feed
     * 4. If local cache missing, falls back to bundled sample-tv-feed.json in assets
     */
    suspend fun getFeed(forceNetwork: Boolean = true): Result<TvFeed> = withContext(Dispatchers.IO) {
        val targetUrl = normalizeGitHubUrl(parentalManager.getFeedUrl())

        var jsonString: String? = null
        var isFromNetwork = false

        if (forceNetwork) {
            try {
                Log.d(TAG, "Fetching feed from GitHub: $targetUrl")
                val connection = URL(targetUrl).openConnection() as HttpURLConnection
                connection.connectTimeout = 6000
                connection.readTimeout = 8000
                connection.requestMethod = "GET"
                connection.setRequestProperty("User-Agent", "CurateTV-Android/2.0")
                connection.setRequestProperty("Accept", "application/json")

                if (connection.responseCode in 200..299) {
                    val reader = BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
                    jsonString = reader.readText()
                    reader.close()
                    isFromNetwork = true

                    // Persist to local storage for offline resilience
                    saveToLocalCache(jsonString)
                    Log.d(TAG, "Successfully updated and cached feed from GitHub")
                } else {
                    Log.w(TAG, "GitHub returned HTTP ${connection.responseCode}, falling back to local list")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching from GitHub (${e.message}), falling back to local list", e)
            }
        }

        // Fallback: Read cached feed from disk
        if (jsonString.isNullOrBlank()) {
            jsonString = readFromLocalCache()
            if (!jsonString.isNullOrBlank()) {
                Log.d(TAG, "Loaded feed from local cached disk file")
            }
        }

        // Ultimate Fallback: Read bundled assets
        if (jsonString.isNullOrBlank()) {
            try {
                val assetStream = context.assets.open("sample-tv-feed.json")
                val reader = BufferedReader(InputStreamReader(assetStream, "UTF-8"))
                jsonString = reader.readText()
                reader.close()
                Log.d(TAG, "Loaded feed from bundled APK assets (sample-tv-feed.json)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to read bundled assets feed", e)
                return@withContext Result.failure(e)
            }
        }

        try {
            val feed = parseFeedJson(jsonString)
            Result.success(feed)
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing feed JSON: ${e.message}", e)
            Result.failure(e)
        }
    }

    private fun saveToLocalCache(json: String) {
        try {
            val file = File(context.filesDir, cacheFileName)
            file.writeText(json, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save feed to local cache file", e)
        }
    }

    private fun readFromLocalCache(): String? {
        return try {
            val file = File(context.filesDir, cacheFileName)
            if (file.exists() && file.length() > 0) {
                file.readText(Charsets.UTF_8)
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed reading local cache file", e)
            null
        }
    }

    private fun parseFeedJson(jsonStr: String): TvFeed {
        val root = JSONObject(jsonStr)
        val version = root.optString("version", "2.0")
        val appTitle = root.optString("appTitle", "GreenKid TV")
        val channelHandle = root.optString("channelHandle", "@Maher.Ismaail")
        val description = root.optString("description", "")
        val lastUpdated = root.optString("lastUpdated", "")
        val kioskModeRestricted = root.optBoolean("kioskModeRestricted", true)

        val categoriesArray = root.optJSONArray("categories") ?: JSONArray()
        val blockedIds = parentalManager.getBlockedVideoIds()
        val categories = mutableListOf<CategorySection>()

        for (i in 0 until categoriesArray.length()) {
            val catObj = categoriesArray.getJSONObject(i)
            val catId = catObj.optString("id", "cat-$i")
            val catTitle = catObj.optString("title", "Category $i")
            val catDesc = catObj.optString("description", "")

            val videosArray = catObj.optJSONArray("videos") ?: JSONArray()
            val videos = mutableListOf<VideoItem>()

            for (j in 0 until videosArray.length()) {
                val vidObj = videosArray.getJSONObject(j)
                val id = vidObj.optString("id", "vid-$i-$j")
                val youtubeId = vidObj.optString("youtubeId", "")
                val title = vidObj.optString("title", "Untitled Video")
                val channel = vidObj.optString("channel", "Omar & Hana Arabic")
                val duration = vidObj.optString("duration", "00:00")
                val vidDesc = vidObj.optString("description", "")
                val thumbnail = vidObj.optString("thumbnail", "")
                val badge = vidObj.optString("badge", "")

                // Only include if not blocked by parental controls
                if (!blockedIds.contains(id)) {
                    videos.add(
                        VideoItem(
                            id = id,
                            youtubeId = youtubeId,
                            title = title,
                            channel = channel,
                            duration = duration,
                            description = vidDesc,
                            thumbnail = thumbnail,
                            badge = badge
                        )
                    )
                }
            }

            if (videos.isNotEmpty()) {
                categories.add(
                    CategorySection(
                        id = catId,
                        title = catTitle,
                        description = catDesc,
                        videos = videos
                    )
                )
            }
        }

        return TvFeed(
            version = version,
            appTitle = appTitle,
            channelHandle = channelHandle,
            description = description,
            lastUpdated = lastUpdated,
            kioskModeRestricted = kioskModeRestricted,
            categories = categories
        )
    }
}
