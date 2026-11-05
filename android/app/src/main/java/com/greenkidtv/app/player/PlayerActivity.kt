package com.greenkidtv.app.player

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.os.CountDownTimer
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import com.greenkidtv.app.model.VideoItem
import java.io.Serializable

class PlayerActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var hudOverlay: View
    private lateinit var safePauseOverlay: View
    private lateinit var upNextOverlay: View
    private lateinit var tvTitle: TextView
    private lateinit var tvChannel: TextView
    private lateinit var tvTimeDisplay: TextView
    private lateinit var tvNextTitle: TextView
    private lateinit var tvNextCountdown: TextView
    private lateinit var pauseVideoTitle: TextView
    private lateinit var pauseNextTitle: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnPlayPause: ImageButton
    private lateinit var btnPrev: ImageButton
    private lateinit var btnNext: ImageButton

    private var playlist: ArrayList<VideoItem> = arrayListOf()
    private var currentIndex: Int = 0
    private var isPlaying: Boolean = true
    private var isHudVisible: Boolean = true
    private var autoAdvanceTimer: CountDownTimer? = null

    private val hideHudHandler = Handler(Looper.getMainLooper())
    private val hideHudRunnable = Runnable { hideHud() }

    companion object {
        private const val EXTRA_PLAYLIST = "extra_playlist"
        private const val EXTRA_CURRENT_INDEX = "extra_current_index"

        fun launch(context: Context, playlist: List<VideoItem>, startIndex: Int) {
            val intent = Intent(context, PlayerActivity::class.java).apply {
                putExtra(EXTRA_PLAYLIST, ArrayList(playlist))
                putExtra(EXTRA_CURRENT_INDEX, startIndex)
            }
            context.startActivity(intent)
        }
    }

    @Suppress("UNCHECKED_CAST")
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on for playback
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Immersive sticky fullscreen
        try {
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        } catch (e: Exception) {
            // Ignore system UI flags on strict OEM skins if unsupported
        }

        val passedList = intent.getSerializableExtra(EXTRA_PLAYLIST) as? ArrayList<VideoItem>
        if (!passedList.isNullOrEmpty()) {
            playlist = passedList
        }
        currentIndex = intent.getIntExtra(EXTRA_CURRENT_INDEX, 0).coerceIn(0, (playlist.size - 1).coerceAtLeast(0))

        setupViews()
        loadCurrentVideo()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupViews() {
        try {
            setContentView(createPlayerLayout())

            webView.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_DEFAULT
            }

            webView.webChromeClient = WebChromeClient()
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    injectKidShieldCss()
                }
            }

            webView.addJavascriptInterface(YouTubeInterface(), "AndroidKidShield")
        } catch (e: Exception) {
            Toast.makeText(this, "تعذر تشغيل المشغل: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun createPlayerLayout(): View {
        val root = android.widget.FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.BLACK)
        }

        // WebView for YouTube embedded player
        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }
        root.addView(webView)

        // 1. Safe Pause Shield Overlay (Blocks YouTube recommendations on pause)
        safePauseOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#EE090D16"))
            setPadding(60, 60, 60, 60)
            visibility = View.GONE
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )

            val pauseIcon = TextView(context).apply {
                text = "⏸ متوقف مؤقتاً"
                textSize = 28f
                setTextColor(Color.WHITE)
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 16)
            }
            addView(pauseIcon)

            pauseVideoTitle = TextView(context).apply {
                text = ""
                textSize = 20f
                setTextColor(Color.parseColor("#34D399"))
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 8)
            }
            addView(pauseVideoTitle)

            val hintText = TextView(context).apply {
                text = "اضغط زر التشغيل (OK) للمتابعة بأمان"
                textSize = 14f
                setTextColor(Color.parseColor("#94A3B8"))
                gravity = Gravity.CENTER
            }
            addView(hintText)
        }
        root.addView(safePauseOverlay)

        // 2. Up Next Auto-Advance Overlay
        upNextOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#F0090D16"))
            setPadding(60, 60, 60, 60)
            visibility = View.GONE
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )

            val upNextHeader = TextView(context).apply {
                text = "📺 الفيديو التالي في القائمة الآمنة"
                textSize = 20f
                setTextColor(Color.parseColor("#34D399"))
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 12)
            }
            addView(upNextHeader)

            tvNextTitle = TextView(context).apply {
                text = ""
                textSize = 24f
                setTextColor(Color.WHITE)
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 16)
            }
            addView(tvNextTitle)

            tvNextCountdown = TextView(context).apply {
                text = "يبدأ تلقائياً خلال 5 ثوانٍ..."
                textSize = 14f
                setTextColor(Color.parseColor("#FBBF24"))
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, 24)
            }
            addView(tvNextCountdown)

            val skipButton = Button(context).apply {
                text = "▶ تشغيل الآن (OK)"
                textSize = 14f
                setTextColor(Color.WHITE)
                setTypeface(null, Typeface.BOLD)
                setPadding(32, 16, 32, 16)
                background = createButtonDrawable("#059669", "#10B981")
                setOnClickListener {
                    autoAdvanceTimer?.cancel()
                    upNextOverlay.visibility = View.GONE
                    playNextApprovedVideo()
                }
            }
            addView(skipButton)
        }
        root.addView(upNextOverlay)

        // 3. Floating HUD Controls Overlay (Top bar)
        hudOverlay = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#99000000"))
            setPadding(32, 24, 32, 24)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )

            val topRow = LinearLayout(context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

            tvTitle = TextView(context).apply {
                text = "عنوان الفيديو"
                textSize = 18f
                setTextColor(Color.WHITE)
                setTypeface(null, Typeface.BOLD)
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            }
            topRow.addView(tvTitle)

            tvChannel = TextView(context).apply {
                text = "القناة"
                textSize = 14f
                setTextColor(Color.parseColor("#34D399"))
            }
            topRow.addView(tvChannel)

            addView(topRow)
        }
        root.addView(hudOverlay)

        return root
    }

    private fun loadCurrentVideo() {
        if (playlist.isEmpty()) return
        val currentVideo = playlist[currentIndex]

        tvTitle.text = currentVideo.title
        tvChannel.text = "${currentVideo.channel} • (${currentIndex + 1}/${playlist.size})"
        pauseVideoTitle.text = currentVideo.title

        val nextIndex = (currentIndex + 1) % playlist.size
        val nextVideo = playlist[nextIndex]
        pauseNextTitle.text = "التالي: ${nextVideo.title}"

        safePauseOverlay.visibility = View.GONE
        upNextOverlay.visibility = View.GONE
        autoAdvanceTimer?.cancel()

        val embedHtml = generateSandboxedHtml(currentVideo.youtubeId)
        webView.loadDataWithBaseURL("https://greenkidtv.app", embedHtml, "text/html", "UTF-8", null)
        showHudTemporarily()
    }

    private fun generateSandboxedHtml(youtubeId: String): String {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; background: #000; overflow: hidden; }
                    html, body, #player { width: 100vw; height: 100vh; }
                    /* Strict Shield: Hide YouTube UI, More Videos icon, channel logo, annotations */
                    .ytp-watermark, .ytp-youtube-button, .ytp-pause-overlay, 
                    .ytp-scroll-min, .ytp-endscreen-content, .ytp-ce-element,
                    .ytp-show-cards-title, .ytp-cards-teaser, .ytp-paid-content-overlay {
                        display: none !important;
                        opacity: 0 !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                    }
                </style>
            </head>
            <body>
                <div id="player"></div>
                <script>
                    var tag = document.createElement('script');
                    tag.src = "https://www.youtube.com/iframe_api";
                    var firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                    var player;
                    function onYouTubeIframeAPIReady() {
                        player = new YT.Player('player', {
                            videoId: '$youtubeId',
                            playerVars: {
                                'autoplay': 1,
                                'controls': 0,
                                'disablekb': 1,
                                'fs': 0,
                                'modestbranding': 1,
                                'rel': 0,
                                'iv_load_policy': 3,
                                'playsinline': 1,
                                host: 'https://www.youtube-nocookie.com',
                                'origin': 'https://greenkidtv.app'
                            },
                            events: {
                                'onReady': onPlayerReady,
                                'onStateChange': onPlayerStateChange
                            }
                        });
                    }

                    function onPlayerReady(event) {
                        event.target.playVideo();
                    }

                    function onPlayerStateChange(event) {
                        // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
                        if (window.AndroidKidShield) {
                            window.AndroidKidShield.onStateChanged(event.data);
                        }
                    }

                    function sendCommand(cmd, arg) {
                        if (!player) return;
                        if (cmd === 'play') player.playVideo();
                        if (cmd === 'pause') player.pauseVideo();
                        if (cmd === 'seekRelative') {
                            var cur = player.getCurrentTime() || 0;
                            player.seekTo(cur + arg, true);
                        }
                    }
                </script>
            </body>
            </html>
        """.trimIndent()
    }

    private fun injectKidShieldCss() {
        val css = ".ytp-watermark, .ytp-youtube-button, .ytp-pause-overlay, .ytp-scroll-min, .ytp-endscreen-content { display: none !important; }"
        val js = "var style = document.createElement('style'); style.innerHTML = '$css'; document.head.appendChild(style);"
        webView.evaluateJavascript(js, null)
    }

    fun playNextApprovedVideo() {
        if (playlist.isEmpty()) return
        currentIndex = (currentIndex + 1) % playlist.size
        loadCurrentVideo()
    }

    fun playPreviousApprovedVideo() {
        if (playlist.isEmpty()) return
        currentIndex = if (currentIndex - 1 < 0) playlist.size - 1 else currentIndex - 1
        loadCurrentVideo()
    }

    fun togglePlayPause() {
        if (isPlaying) {
            webView.evaluateJavascript("sendCommand('pause');", null)
            isPlaying = false
            safePauseOverlay.visibility = View.VISIBLE
        } else {
            webView.evaluateJavascript("sendCommand('play');", null)
            isPlaying = true
            safePauseOverlay.visibility = View.GONE
        }
        showHudTemporarily()
    }

    fun seekRelative(seconds: Int) {
        webView.evaluateJavascript("sendCommand('seekRelative', $seconds);", null)
        showHudTemporarily()
    }

    private fun showHudTemporarily() {
        hudOverlay.visibility = View.VISIBLE
        isHudVisible = true
        scheduleHideHud()
    }

    private fun scheduleHideHud() {
        hideHudHandler.removeCallbacks(hideHudRunnable)
        hideHudHandler.postDelayed(hideHudRunnable, 4500)
    }

    private fun hideHud() {
        hudOverlay.visibility = View.GONE
        isHudVisible = false
    }

    // Handle Smart TV remote D-Pad buttons
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                if (upNextOverlay.visibility == View.VISIBLE) {
                    autoAdvanceTimer?.cancel()
                    playNextApprovedVideo()
                } else {
                    togglePlayPause()
                }
                return true
            }
            KeyEvent.KEYCODE_DPAD_RIGHT -> {
                seekRelative(10)
                return true
            }
            KeyEvent.KEYCODE_DPAD_LEFT -> {
                seekRelative(-10)
                return true
            }
            KeyEvent.KEYCODE_MEDIA_NEXT, KeyEvent.KEYCODE_CHANNEL_UP -> {
                playNextApprovedVideo()
                return true
            }
            KeyEvent.KEYCODE_MEDIA_PREVIOUS, KeyEvent.KEYCODE_CHANNEL_DOWN -> {
                playPreviousApprovedVideo()
                return true
            }
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_DPAD_DOWN -> {
                showHudTemporarily()
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (safePauseOverlay.visibility == View.VISIBLE) {
                    togglePlayPause()
                    return true
                }
                finish()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        autoAdvanceTimer?.cancel()
        hideHudHandler.removeCallbacks(hideHudRunnable)
        webView.destroy()
    }

    inner class YouTubeInterface {
        @JavascriptInterface
        fun onStateChanged(state: Int) {
            runOnUiThread {
                when (state) {
                    0 -> { // Ended -> Auto advance strictly from approved list
                        isPlaying = false
                        safePauseOverlay.visibility = View.GONE
                        showUpNextAutoAdvance()
                    }
                    1 -> { // Playing
                        isPlaying = true
                        safePauseOverlay.visibility = View.GONE
                        upNextOverlay.visibility = View.GONE
                    }
                    2 -> { // Paused -> Shield against YouTube recommendations
                        isPlaying = false
                        safePauseOverlay.visibility = View.VISIBLE
                    }
                }
            }
        }
    }

    private fun showUpNextAutoAdvance() {
        val nextIndex = (currentIndex + 1) % playlist.size
        val nextVideo = playlist[nextIndex]
        tvNextTitle.text = nextVideo.title
        upNextOverlay.visibility = View.VISIBLE

        autoAdvanceTimer?.cancel()
        autoAdvanceTimer = object : CountDownTimer(5000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val sec = millisUntilFinished / 1000
                tvNextCountdown.text = "يبدأ تلقائياً خلال $sec ثوانٍ..."
            }

            override fun onFinish() {
                upNextOverlay.visibility = View.GONE
                playNextApprovedVideo()
            }
        }.start()
    }

    private fun createButtonDrawable(normalColor: String, focusedColor: String): android.graphics.drawable.StateListDrawable {
        val normal = android.graphics.drawable.GradientDrawable().apply {
            shape = android.graphics.drawable.GradientDrawable.RECTANGLE
            cornerRadius = 12f
            setColor(android.graphics.Color.parseColor(normalColor))
        }
        val focused = android.graphics.drawable.GradientDrawable().apply {
            shape = android.graphics.drawable.GradientDrawable.RECTANGLE
            cornerRadius = 12f
            setColor(android.graphics.Color.parseColor(focusedColor))
            setStroke(3, android.graphics.Color.WHITE)
        }

        return android.graphics.drawable.StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_focused), focused)
            addState(intArrayOf(), normal)
        }
    }
}
