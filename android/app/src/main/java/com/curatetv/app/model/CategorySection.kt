package com.curatetv.app.model

import java.io.Serializable

data class CategorySection(
    val id: String,
    val title: String,
    val description: String? = null,
    val videos: List<VideoItem> = emptyList()
) : Serializable
