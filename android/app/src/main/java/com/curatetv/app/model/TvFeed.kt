package com.curatetv.app.model

import java.io.Serializable

data class TvFeed(
    val version: String? = "2.0",
    val appTitle: String? = "GreenKid TV",
    val channelHandle: String? = null,
    val description: String? = null,
    val lastUpdated: String? = null,
    val kioskModeRestricted: Boolean? = true,
    val categories: List<CategorySection> = emptyList()
) : Serializable
