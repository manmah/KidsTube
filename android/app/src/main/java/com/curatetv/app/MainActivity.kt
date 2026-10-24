package com.curatetv.app

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.curatetv.app.data.FeedRepository
import com.curatetv.app.data.ParentalControlManager
import com.curatetv.app.model.CategorySection
import com.curatetv.app.model.TvFeed
import com.curatetv.app.model.VideoItem
import com.curatetv.app.player.PlayerActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URL
import kotlin.random.Random

class MainActivity : AppCompatActivity() {

    private lateinit var repository: FeedRepository
    private lateinit var parentalManager: ParentalControlManager

    private var currentFeed: TvFeed? = null
    private var highlightedVideo: VideoItem? = null
    private var highlightedCategoryVideos: List<VideoItem> = emptyList()

    private lateinit var rootScroll: ScrollView
    private lateinit var loadingBar: ProgressBar
    private lateinit var heroLayout: LinearLayout
    private lateinit var heroTitle: TextView
    private lateinit var heroChannel: TextView
    private lateinit var heroDescription: TextView
    private lateinit var heroWatchButton: Button
    private lateinit var syncBadge: TextView
    private lateinit var categoriesContainer: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // TV screen awake & fullscreen
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        repository = FeedRepository(this)
        parentalManager = ParentalControlManager(this)

        setupUI()
        loadFeed(forceNetwork = true)
    }

    private fun setupUI() {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#090D16"))
            setPadding(40, 24, 40, 40)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Header Navigation Bar
        val navBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, 24)
        }

        val logoText = TextView(this).apply {
            text = "📺 GreenKid TV"
            textSize = 22f
            setTextColor(Color.WHITE)
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        navBar.addView(logoText)

        syncBadge = TextView(this).apply {
            text = "● Live GitHub Synced"
            textSize = 12f
            setTextColor(Color.parseColor("#34D399"))
            setPadding(16, 8, 16, 8)
            background = createRoundedDrawable("#064E3B", "#059669")
        }
        val badgeParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            setMargins(0, 0, 16, 0)
        }
        syncBadge.layoutParams = badgeParams
        navBar.addView(syncBadge)

        val btnRefresh = Button(this).apply {
            text = "تحديث القائمة"
            textSize = 12f
            setTextColor(Color.WHITE)
            background = createFocusableButtonDrawable("#1E293B", "#10B981")
            setOnClickListener { loadFeed(forceNetwork = true) }
        }
        val refreshParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            setMargins(0, 0, 12, 0)
        }
        btnRefresh.layoutParams = refreshParams
        navBar.addView(btnRefresh)

        val btnParental = Button(this).apply {
            text = "الرقابة الأبوية 🔒"
            textSize = 12f
            setTextColor(Color.WHITE)
            background = createFocusableButtonDrawable("#1E293B", "#10B981")
            setOnClickListener { showParentalGateDialog() }
        }
        navBar.addView(btnParental)

        rootLayout.addView(navBar)

        // Loading Bar
        loadingBar = ProgressBar(this).apply {
            indeterminateDrawable.setColorFilter(Color.parseColor("#10B981"), android.graphics.PorterDuff.Mode.SRC_IN)
        }
        rootLayout.addView(loadingBar)

        // Scrollable Main Section
        rootScroll = ScrollView(this).apply {
            isFillViewport = true
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }

        val scrollContent = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        // Hero Spotlight Header
        heroLayout = createHeroSpotlight()
        scrollContent.addView(heroLayout)

        // Category Rows Container
        categoriesContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 20, 0, 40)
        }
        scrollContent.addView(categoriesContainer)

        rootScroll.addView(scrollContent)
        rootLayout.addView(rootScroll)

        setContentView(rootLayout)
    }

    private fun createHeroSpotlight(): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = createRoundedDrawable("#111827", "#1E293B")
            setPadding(32, 28, 32, 28)

            val badge = TextView(context).apply {
                text = "⭐ الفيديو المميز المختصر"
                textSize = 12f
                setTextColor(Color.parseColor("#34D399"))
                setTypeface(null, Typeface.BOLD)
            }
            addView(badge)

            heroTitle = TextView(context).apply {
                text = "جاري تحميل محتوى آمن للأطفال..."
                textSize = 24f
                setTextColor(Color.WHITE)
                setTypeface(null, Typeface.BOLD)
                setPadding(0, 8, 0, 4)
            }
            addView(heroTitle)

            heroChannel = TextView(context).apply {
                text = "قناة عمر وهنا الرسمية"
                textSize = 14f
                setTextColor(Color.parseColor("#94A3B8"))
                setPadding(0, 0, 0, 8)
            }
            addView(heroChannel)

            heroDescription = TextView(context).apply {
                text = "فيديوهات تعليمية وتربوية مختارة بعناية لحماية الأطفال من المحتوى غير المرغوب فيه."
                textSize = 13f
                setTextColor(Color.parseColor("#CBD5E1"))
                maxLines = 2
                setPadding(0, 0, 0, 16)
            }
            addView(heroDescription)

            heroWatchButton = Button(context).apply {
                text = "▶ مشاهدة الآن (OK)"
                textSize = 14f
                setTextColor(Color.WHITE)
                setTypeface(null, Typeface.BOLD)
                setPadding(32, 16, 32, 16)
                background = createFocusableButtonDrawable("#059669", "#10B981")
                setOnClickListener {
                    highlightedVideo?.let { vid ->
                        val targetList = if (highlightedCategoryVideos.isNotEmpty()) {
                            highlightedCategoryVideos
                        } else {
                            listOf(vid)
                        }
                        val index = targetList.indexOfFirst { it.id == vid.id }.coerceAtLeast(0)
                        PlayerActivity.launch(this@MainActivity, targetList, index)
                    }
                }
            }
            val btnParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            heroWatchButton.layoutParams = btnParams
            addView(heroWatchButton)
        }
    }

    private fun loadFeed(forceNetwork: Boolean) {
        loadingBar.visibility = View.VISIBLE
        lifecycleScope.launch {
            val result = repository.getFeed(forceNetwork = forceNetwork)
            loadingBar.visibility = View.GONE

            if (result.isSuccess) {
                val feed = result.getOrNull()
                currentFeed = feed
                syncBadge.text = "● Live GitHub Synced"
                syncBadge.setTextColor(Color.parseColor("#34D399"))
                renderFeed(feed)
            } else {
                syncBadge.text = "● Local Cached List"
                syncBadge.setTextColor(Color.parseColor("#FBBF24"))
                Toast.makeText(this@MainActivity, "تعذر التحديث من الإنترنت، تم تحميل القائمة المحلية", Toast.LENGTH_SHORT).show()
                val fallback = repository.getFeed(forceNetwork = false).getOrNull()
                renderFeed(fallback)
            }
        }
    }

    private fun renderFeed(feed: TvFeed?) {
        if (feed == null || feed.categories.isEmpty()) return

        categoriesContainer.removeAllViews()

        // Default hero spotlight to first video
        val firstCategory = feed.categories.firstOrNull()
        val firstVideo = firstCategory?.videos?.firstOrNull()
        if (firstVideo != null) {
            updateSpotlight(firstVideo, firstCategory.videos)
        }

        // Build Category Rails
        for (category in feed.categories) {
            if (category.videos.isEmpty()) continue

            val catHeader = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(0, 24, 0, 12)
            }

            val catTitle = TextView(this).apply {
                text = category.title
                textSize = 18f
                setTextColor(Color.WHITE)
                setTypeface(null, Typeface.BOLD)
            }
            catHeader.addView(catTitle)

            category.description?.let { desc ->
                if (desc.isNotBlank()) {
                    val catDesc = TextView(this).apply {
                        text = desc
                        textSize = 12f
                        setTextColor(Color.parseColor("#94A3B8"))
                    }
                    catHeader.addView(catDesc)
                }
            }

            categoriesContainer.addView(catHeader)

            // Horizontal Scroll Rail
            val horizontalScroll = HorizontalScrollView(this).apply {
                isHorizontalScrollBarEnabled = false
                isFillViewport = true
            }

            val rowLayout = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, 4, 0, 8)
            }

            for ((index, video) in category.videos.withIndex()) {
                val card = createVideoCard(video, category.videos, index)
                rowLayout.addView(card)
            }

            horizontalScroll.addView(rowLayout)
            categoriesContainer.addView(horizontalScroll)
        }
    }

    private fun createVideoCard(video: VideoItem, categoryList: List<VideoItem>, index: Int): LinearLayout {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = createFocusableCardDrawable()
            isFocusable = true
            isFocusableInTouchMode = true
            isClickable = true
            setPadding(16, 16, 16, 16)
        }

        val cardParams = LinearLayout.LayoutParams(360, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            setMargins(0, 0, 20, 0)
        }
        card.layoutParams = cardParams

        // Thumbnail ImageView
        val thumbnailView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                200
            )
            background = createRoundedDrawable("#1E293B", "#334155")
        }
        card.addView(thumbnailView)

        // Async load thumbnail image
        loadThumbnailAsync(thumbnailView, video.getResolvedThumbnail())

        val titleView = TextView(this).apply {
            text = video.title
            textSize = 14f
            setTextColor(Color.WHITE)
            setTypeface(null, Typeface.BOLD)
            maxLines = 2
            setPadding(0, 8, 0, 4)
        }
        card.addView(titleView)

        val channelView = TextView(this).apply {
            text = "${video.channel} • ${video.duration}"
            textSize = 12f
            setTextColor(Color.parseColor("#94A3B8"))
        }
        card.addView(channelView)

        // TV Remote Focus Events
        card.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                card.scaleX = 1.05f
                card.scaleY = 1.05f
                card.elevation = 12f
                updateSpotlight(video, categoryList)
            } else {
                card.scaleX = 1.0f
                card.scaleY = 1.0f
                card.elevation = 0f
            }
        }

        // On Click / Remote Enter: Launch Player with Category Playlist
        card.setOnClickListener {
            PlayerActivity.launch(this, categoryList, index)
        }

        return card
    }

    private fun updateSpotlight(video: VideoItem, categoryList: List<VideoItem>) {
        highlightedVideo = video
        highlightedCategoryVideos = categoryList
        heroTitle.text = video.title
        heroChannel.text = "${video.channel} • ${video.duration} ${if (video.badge.isNotBlank()) "• ${video.badge}" else ""}"
        heroDescription.text = if (video.description.isNotBlank()) video.description else "شاهد هذا المقطع المميز والآمن من قائمتك المختارة."
    }

    private fun loadThumbnailAsync(imageView: ImageView, url: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val stream = URL(url).openStream()
                val bitmap = android.graphics.BitmapFactory.decodeStream(stream)
                stream.close()
                withContext(Dispatchers.Main) {
                    imageView.setImageBitmap(bitmap)
                }
            } catch (e: Exception) {
                // Fallback to placeholder color
            }
        }
    }

    private fun showParentalGateDialog() {
        val num1 = Random.nextInt(3, 9)
        val num2 = Random.nextInt(3, 9)
        val answer = num1 * num2

        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            hint = "الناتج؟"
            setTextColor(Color.WHITE)
            setHintTextColor(Color.GRAY)
        }

        AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle("🔒 سؤال التحقق الأبوي")
            .setMessage("للأمان، يرجى حل هذه المسألة الحسابية للوصول لإعدادات الرقابة الأبوية:\n\nما هو حاصل ضرب $num1 × $num2 ؟")
            .setView(input)
            .setPositiveButton("تأكيد") { _, _ ->
                val entered = input.text.toString().trim()
                if (entered == answer.toString()) {
                    showParentalSettings()
                } else {
                    Toast.makeText(this, "الإجابة غير صحيحة", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun showParentalSettings() {
        val inputUrl = EditText(this).apply {
            setText(parentalManager.getFeedUrl())
            setTextColor(Color.WHITE)
            textSize = 13f
        }

        AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle("إعدادات رابط القائمة من GitHub")
            .setMessage("يمكنك تعديل رابط ملف JSON لقائمتك على GitHub. سيتم تحديث القائمة تلقائياً:")
            .setView(inputUrl)
            .setPositiveButton("حفظ وتحديث") { _, _ ->
                val newUrl = inputUrl.text.toString().trim()
                if (newUrl.isNotBlank()) {
                    parentalManager.setFeedUrl(newUrl)
                    loadFeed(forceNetwork = true)
                    Toast.makeText(this, "تم تحديث الرابط بنجاح", Toast.LENGTH_SHORT).show()
                }
            }
            .setNeutralButton("استعادة الرابط الافتراضي") { _, _ ->
                parentalManager.setFeedUrl(ParentalControlManager.DEFAULT_FEED_URL)
                loadFeed(forceNetwork = true)
            }
            .setNegativeButton("إغلاق", null)
            .show()
    }

    private fun createRoundedDrawable(bgColor: String, borderColor: String): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 16f
            setColor(Color.parseColor(bgColor))
            setStroke(2, Color.parseColor(borderColor))
        }
    }

    private fun createFocusableCardDrawable(): android.graphics.drawable.StateListDrawable {
        val normal = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 18f
            setColor(Color.parseColor("#131C2E"))
            setStroke(2, Color.parseColor("#1E293B"))
        }
        val focused = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 18f
            setColor(Color.parseColor("#1B2942"))
            setStroke(4, Color.parseColor("#10B981")) // Emerald glowing focus border
        }

        return android.graphics.drawable.StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_focused), focused)
            addState(intArrayOf(android.R.attr.state_selected), focused)
            addState(intArrayOf(), normal)
        }
    }

    private fun createFocusableButtonDrawable(normalColor: String, focusedColor: String): android.graphics.drawable.StateListDrawable {
        val normal = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 12f
            setColor(Color.parseColor(normalColor))
        }
        val focused = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = 12f
            setColor(Color.parseColor(focusedColor))
            setStroke(3, Color.WHITE)
        }

        return android.graphics.drawable.StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_focused), focused)
            addState(intArrayOf(), normal)
        }
    }
}
