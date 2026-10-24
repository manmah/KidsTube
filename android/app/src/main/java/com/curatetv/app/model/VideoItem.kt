package com.curatetv.app.model

import java.io.Serializable

data class VideoItem(
    val id: String,
    val youtubeId: String,
    val title: String,
    val channel: String = "",
    val duration: String = "00:00",
    val description: String = "",
    val thumbnail: String = "",
    val badge: String = ""
) : Serializable {
    fun getResolvedThumbnail(): String {
        return if (thumbnail.isNotBlank()) {
            thumbnail
        } else {
            "https://img.youtube.com/vi/$youtubeId/hqdefault.jpg"
        }
    }
}
