package com.greenkidtv.app.data

import android.content.Context
import android.util.Log
import com.greenkidtv.app.model.CategorySection
import com.greenkidtv.app.model.TvFeed
import com.greenkidtv.app.model.VideoItem
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
        val targetUrl = normalizeGitHubUrl(ParentalControlManager.DEFAULT_FEED_URL)

        var jsonString: String? = null
        var isFromNetwork = false

        if (forceNetwork) {
            try {
                Log.d(TAG, "Fetching feed from GitHub: $targetUrl")
                val connection = URL(targetUrl).openConnection() as HttpURLConnection
                connection.connectTimeout = 6000
                connection.readTimeout = 8000
                connection.requestMethod = "GET"
                connection.setRequestProperty("User-Agent", "GreenKidTV-Android/2.0")
                connection.setRequestProperty("Accept", "application/json")

                if (connection.responseCode in 200..299) {
                    val reader = BufferedReader(InputStreamReader(connection.inputStream, "UTF-8"))
                    jsonString = reader.readText()
                    reader.close()
                    isFromNetwork = true

                    // Persist to local storage for offline resilience
                    try {
                        val cacheFile = File(context.cacheDir, cacheFileName)
                        cacheFile.writeText(jsonString, Charsets.UTF_8)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to cache feed to disk", e)
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Network fetch failed, attempting cache fallback", e)
            }
        }

        // Fallback 1: Local disk cache
        if (jsonString.isNullOrBlank()) {
            try {
                val cacheFile = File(context.cacheDir, cacheFileName)
                if (cacheFile.exists()) {
                    jsonString = cacheFile.readText(Charsets.UTF_8)
                    Log.d(TAG, "Loaded feed from local disk cache")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to read local disk cache", e)
            }
        }

        // Fallback 2: Bundled APK assets (sample-tv-feed.json)
        if (jsonString.isNullOrBlank()) {
            try {
                val assetStream = context.assets.open("sample-tv-feed.json")
                val reader = BufferedReader(InputStreamReader(assetStream, "UTF-8"))
                jsonString = reader.readText()
                reader.close()
                Log.d(TAG, "Loaded feed from bundled APK assets (sample-tv-feed.json)")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to read bundled assets feed", e)
            }
        }

        if (jsonString.isNullOrBlank()) {
            return@withContext Result.failure(Exception("Could not load feed from network, cache, or assets."))
        }

        try {
            val feed = parseFeedJson(jsonString!!)
            Result.success(feed)
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing feed JSON", e)
            Result.failure(e)
        }
    }

    /**
     * Loads full unfiltered feed containing all videos (including blocked ones) for Parental Control management
     */
    suspend fun getUnfilteredFeed(): Result<TvFeed> = withContext(Dispatchers.IO) {
        var jsonString: String? = null
        try {
            val cacheFile = File(context.cacheDir, cacheFileName)
            if (cacheFile.exists()) {
                jsonString = cacheFile.readText(Charsets.UTF_8)
            }
        } catch (e: Exception) {}

        if (jsonString.isNullOrBlank()) {
            try {
                val assetStream = context.assets.open("sample-tv-feed.json")
                val reader = BufferedReader(InputStreamReader(assetStream, "UTF-8"))
                jsonString = reader.readText()
                reader.close()
            } catch (e: Exception) {}
        }

        if (jsonString.isNullOrBlank()) {
            return@withContext Result.failure(Exception("No feed data available."))
        }

        try {
            val root = JSONObject(jsonString!!)
            val categoriesArray = root.optJSONArray("categories") ?: JSONArray()
            val categoriesList = mutableListOf<CategorySection>()

            for (i in 0 until categoriesArray.length()) {
                val catObj = categoriesArray.optJSONObject(i) ?: continue
                val catId = catObj.optString("id", "")
                val catTitle = catObj.optString("title", "")
                val catDesc = catObj.optString("description", "")

                val videosArray = catObj.optJSONArray("videos") ?: JSONArray()
                val videosList = mutableListOf<VideoItem>()

                for (j in 0 until videosArray.length()) {
                    val vObj = videosArray.optJSONObject(j) ?: continue
                    videosList.add(
                        VideoItem(
                            id = vObj.optString("id", ""),
                            youtubeId = vObj.optString("youtubeId", ""),
                            title = vObj.optString("title", ""),
                            channel = vObj.optString("channel", ""),
                            duration = vObj.optString("duration", "00:00"),
                            description = vObj.optString("description", ""),
                            thumbnail = vObj.optString("thumbnail", ""),
                            badge = vObj.optString("badge", "")
                        )
                    )
                }
                categoriesList.add(CategorySection(catId, catTitle, catDesc, videosList))
            }
            Result.success(TvFeed(categories = categoriesList))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseFeedJson(jsonStr: String): TvFeed {
        val root = JSONObject(jsonStr)
        val version = root.optString("version", "2.0")
        val appTitle = root.optString("appTitle", "GreenKid TV")
        val channelHandle = root.optString("channelHandle", "")
        val description = root.optString("description", "")
        val lastUpdated = root.optString("lastUpdated", "")
        val kioskModeRestricted = root.optBoolean("kioskModeRestricted", true)

        val blockedIds = parentalManager.getBlockedVideoIds()
        val categoriesArray = root.optJSONArray("categories") ?: JSONArray()
        val categoriesList = mutableListOf<CategorySection>()

        for (i in 0 until categoriesArray.length()) {
            val catObj = categoriesArray.optJSONObject(i) ?: continue
            val catId = catObj.optString("id", "")
            val catTitle = catObj.optString("title", "")
            val catDesc = catObj.optString("description", "")

            val videosArray = catObj.optJSONArray("videos") ?: JSONArray()
            val videosList = mutableListOf<VideoItem>()

            for (j in 0 until videosArray.length()) {
                val vObj = videosArray.optJSONObject(j) ?: continue
                val id = vObj.optString("id", "")
                val youtubeId = vObj.optString("youtubeId", "")

                // Skip blocked videos
                if (blockedIds.contains(id) || blockedIds.contains(youtubeId)) {
                    continue
                }

                val title = vObj.optString("title", "")
                val channel = vObj.optString("channel", "")
                val duration = vObj.optString("duration", "00:00")
                val vDesc = vObj.optString("description", "")
                val thumbnail = vObj.optString("thumbnail", "")
                val badge = vObj.optString("badge", "")

                videosList.add(
                    VideoItem(
                        id = id,
                        youtubeId = youtubeId,
                        title = title,
                        channel = channel,
                        duration = duration,
                        description = vDesc,
                        thumbnail = thumbnail,
                        badge = badge
                    )
                )
            }

            categoriesList.add(
                CategorySection(
                    id = catId,
                    title = catTitle,
                    description = catDesc,
                    videos = videosList
                )
            )
        }

        return TvFeed(
            version = version,
            appTitle = appTitle,
            channelHandle = channelHandle,
            description = description,
            lastUpdated = lastUpdated,
            kioskModeRestricted = kioskModeRestricted,
            categories = categoriesList
        )
    }
}
