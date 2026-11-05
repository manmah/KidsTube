package com.greenkidtv.app

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
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.greenkidtv.app.data.FeedRepository
import com.greenkidtv.app.data.ParentalControlManager
import com.greenkidtv.app.model.CategorySection
import com.greenkidtv.app.model.TvFeed
import com.greenkidtv.app.model.VideoItem
import com.greenkidtv.app.player.PlayerActivity
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
                renderFeed(feed)
            } else {
                Toast.makeText(this@MainActivity, "تعذر التحديث من الإنترنت، تم تحميل القائمة المحلية", Toast.LENGTH_SHORT).show()
                val fallback = repository.getFeed(forceNetwork = false).getOrNull()
                renderFeed(fallback)
            }
        }
    }

    private fun renderFeed(feed: TvFeed?) {
        if (feed == null || feed.categories.isEmpty()) return

        categoriesContainer.removeAllViews()

        // Gather all videos across all categories
        val allVideos = mutableListOf<VideoItem>()
        feed.categories.forEach { cat ->
            allVideos.addAll(cat.videos)
        }
        val distinctVideos = allVideos.distinctBy { it.youtubeId }

        // 1. First Row: Latest / Recently Added Videos
        val latestVideos = distinctVideos.take(12)
        val latestCategory = CategorySection(
            id = "latest-added",
            title = "⭐ أحدث الفيديوهات المضافة",
            description = "أحدث المقاطع المضافة خصيصاً لأطفالنا الأعزاء.",
            videos = latestVideos
        )

        // 2. Second Row: Random Mix of Videos (shuffled each time the app opens)
        val randomVideos = distinctVideos.shuffled(Random(System.currentTimeMillis())).take(12)
        val randomCategory = CategorySection(
            id = "random-mix",
            title = "🎲 مقاطع متنوعة ومقترحة",
            description = "مجموعة منوعة ومسلية من الفيديوهات المقترحة.",
            videos = randomVideos
        )

        val displayCategories = mutableListOf<CategorySection>()
        if (latestVideos.isNotEmpty()) displayCategories.add(latestCategory)
        if (randomVideos.isNotEmpty()) displayCategories.add(randomCategory)
        displayCategories.addAll(feed.categories)

        // Default hero spotlight to first video of latest category
        val firstVideo = latestVideos.firstOrNull() ?: feed.categories.firstOrNull()?.videos?.firstOrNull()
        if (firstVideo != null) {
            updateSpotlight(firstVideo, latestVideos.ifEmpty { feed.categories.first().videos })
        }

        // Build Category Rails
        for (category in displayCategories) {
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

        // Thumbnail FrameLayout with overlay Hide button
        val frameLayout = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                200
            )
            background = createRoundedDrawable("#1E293B", "#334155")
        }

        val thumbnailView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        frameLayout.addView(thumbnailView)

        // Async load thumbnail image
        loadThumbnailAsync(thumbnailView, video.getResolvedThumbnail())

        // Hide / Lock button on card
        val hideButton = TextView(this).apply {
            text = "❌ إخفاء"
            textSize = 11f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#CCEF4444")) // Red badge
            setPadding(12, 6, 12, 6)
            isClickable = true
            isFocusable = false
            setOnClickListener {
                showParentalGateForHiding(video)
            }
        }
        val hideParams = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            setMargins(8, 8, 8, 8)
        }
        hideButton.layoutParams = hideParams
        frameLayout.addView(hideButton)

        card.addView(frameLayout)

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
            .setMessage("للأمان، يرجى حل هذه المسألة الحسابية للوصول لإعدادات الرقابة الأبوية (إدارة الفيديوهات المخفية):\n\nما هو حاصل ضرب $num1 × $num2 ؟")
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

    private fun showParentalGateForHiding(video: VideoItem) {
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
            .setTitle("🔒 سؤال التحقق الأبوي لإخفاء الفيديو")
            .setMessage("للأمان، يرجى حل هذه المسألة لإخفاء هذا الفيديو:\n\nما هو حاصل ضرب $num1 × $num2 ؟")
            .setView(input)
            .setPositiveButton("إخفاء الفيديو") { _, _ ->
                val entered = input.text.toString().trim()
                if (entered == answer.toString()) {
                    parentalManager.blockVideo(video.id)
                    parentalManager.blockVideo(video.youtubeId)
                    loadFeed(forceNetwork = false)
                    Toast.makeText(this, "تم إخفاء الفيديو بنجاح", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this, "الإجابة غير صحيحة", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("إلغاء", null)
            .show()
    }

    private fun showParentalSettings() {
        lifecycleScope.launch {
            val result = repository.getUnfilteredFeed()
            val unfilteredFeed = result.getOrNull()
            if (unfilteredFeed == null || unfilteredFeed.categories.isEmpty()) {
                Toast.makeText(this@MainActivity, "تعذر تحميل قائمة الفيديوهات", Toast.LENGTH_SHORT).show()
                return@launch
            }

            val allVideos = mutableListOf<VideoItem>()
            unfilteredFeed.categories.forEach { cat ->
                allVideos.addAll(cat.videos)
            }

            val blockedIds = parentalManager.getBlockedVideoIds()
            val hiddenVideos = allVideos.filter { blockedIds.contains(it.id) || blockedIds.contains(it.youtubeId) }

            if (hiddenVideos.isEmpty()) {
                AlertDialog.Builder(this@MainActivity, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                    .setTitle("🔒 الفيديوهات المخفية")
                    .setMessage("لا توجد أي فيديوهات مخفية حالياً.\n\nيمكنك إخفاء أي فيديو في أي وقت بالضغط على زر (❌ إخفاء) الموجود على بطاقة الفيديو.")
                    .setPositiveButton("حسناً", null)
                    .show()
                return@launch
            }

            val videoTitles = hiddenVideos.map { "📺 ${it.title}" }.toTypedArray()
            val selectedToRestore = BooleanArray(hiddenVideos.size) { false }

            AlertDialog.Builder(this@MainActivity, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("🔒 الفيديوهات المخفية حالياً (اختر لإظهارها)")
                .setMultiChoiceItems(videoTitles, selectedToRestore) { _, which, isChecked ->
                    if (isChecked) {
                        val vid = hiddenVideos[which]
                        parentalManager.unblockVideo(vid.id)
                        parentalManager.unblockVideo(vid.youtubeId)
                    }
                }
                .setPositiveButton("إظهار المحدد") { _, _ ->
                    loadFeed(forceNetwork = false)
                    Toast.makeText(this@MainActivity, "تم إظهار الفيديوهات المحددة بنجاح", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("إغلاق", null)
                .show()
        }
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
