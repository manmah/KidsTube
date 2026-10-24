package com.curatetv.app.player

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import com.curatetv.app.model.VideoItem
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

        // Keep screen on for TV playback
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Immersive sticky fullscreen
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        val passedList = intent.getSerializableExtra(EXTRA_PLAYLIST) as? ArrayList<VideoItem>
        if (!passedList.isNullOrEmpty()) {
            playlist = passedList
        }
        currentIndex = intent.getIntExtra(EXTRA_CURRENT_INDEX, 0).coerceIn(0, (playlist.size - 1).coerceAtLeast(0))

        setupViews()
        loadCurrentVideo()
    }

    private fun setupViews() {
        // Build the player layout programmatically to guarantee 100% reliable execution
        val rootLayout = android.widget.FrameLayout(this).apply {
            setBackgroundColor(0xFF000000.toInt())
        }

        // 1. Sandboxed WebView for restricted YouTube playback
        webView = WebView(this).apply {
            layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT
            )
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_NO_CACHE
            }
            addJavascriptInterface(YouTubeInterface(), "AndroidKidShield")
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    injectKidShieldCss()
                }
            }
        }
        rootLayout.addView(webView)

        // 2. Safe Pause Screen Overlay (Prevents YouTube "More Videos" recommendations)
        safePauseOverlay = createSafePauseOverlay().apply {
            visibility = View.GONE
        }
        rootLayout.addView(safePauseOverlay)

        // 3. Up Next Auto-Advance Overlay
        upNextOverlay = createUpNextOverlay().apply {
            visibility = View.GONE
        }
        rootLayout.addView(upNextOverlay)

        // 4. TV Remote OSD HUD
        hudOverlay = createHudOverlay()
        rootLayout.addView(hudOverlay)

        setContentView(rootLayout)
        scheduleHideHud()
    }

    private fun createSafePauseOverlay(): View {
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(0xEE090D16.toInt()) // 93% opaque dark slate
            setPadding(60, 40, 60, 40)
            isClickable = true
            isFocusable = false
        }

        val badge = TextView(this).apply {
            text = "🛡️ GreenKid Safe Pause"
            setTextColor(0xFF34D399.toInt()) // emerald 400
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(badge)

        pauseVideoTitle = TextView(this).apply {
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 22f
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = android.view.Gravity.CENTER
            setPadding(0, 16, 0, 8)
        }
        layout.addView(pauseVideoTitle)

        val hint = TextView(this).apply {
            text = "اضغط على زر (OK / Play) في الريموت للاستئناف"
            setTextColor(0xFF94A3B8.toInt()) // slate 400
            textSize = 15f
            setPadding(0, 0, 0, 20)
        }
        layout.addView(hint)

        pauseNextTitle = TextView(this).apply {
            setTextColor(0xFF38BDF8.toInt()) // sky 400
            textSize = 14f
            gravity = android.view.Gravity.CENTER
        }
        layout.addView(pauseNextTitle)

        return layout
    }

    private fun createUpNextOverlay(): View {
        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(0xF0020617.toInt())
            setPadding(50, 40, 50, 40)
            isClickable = true
        }

        val badge = TextView(this).apply {
            text = "الفيديو التالي من قائمتك المختارة"
            setTextColor(0xFF10B981.toInt())
            textSize = 14f
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        layout.addView(badge)

        tvNextTitle = TextView(this).apply {
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 20f
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = android.view.Gravity.CENTER
            setPadding(0, 12, 0, 8)
        }
        layout.addView(tvNextTitle)

        tvNextCountdown = TextView(this).apply {
            text = "يبدأ تلقائياً خلال 5 ثوانٍ..."
            setTextColor(0xFF94A3B8.toInt())
            textSize = 15f
            setPadding(0, 0, 0, 20)
        }
        layout.addView(tvNextCountdown)

        val btnWatchNow = android.widget.Button(this).apply {
            text = "تشغيل الآن (OK)"
            setBackgroundColor(0xFF059669.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setOnClickListener {
                autoAdvanceTimer?.cancel()
                playNextApprovedVideo()
            }
        }
        layout.addView(btnWatchNow)

        return layout
    }

    private fun createHudOverlay(): View {
        val container = android.widget.RelativeLayout(this).apply {
            setPadding(48, 32, 48, 32)
        }

        // Top info bar
        val topBar = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            val params = android.widget.RelativeLayout.LayoutParams(
                android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT,
                android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                addRule(android.widget.RelativeLayout.ALIGN_PARENT_TOP)
                addRule(android.widget.RelativeLayout.ALIGN_PARENT_LEFT)
            }
            layoutParams = params
        }

        tvTitle = TextView(this).apply {
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 18f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setShadowLayer(4f, 0f, 2f, 0xFF000000.toInt())
        }
        topBar.addView(tvTitle)

        tvChannel = TextView(this).apply {
            setTextColor(0xFF34D399.toInt()) // emerald
            textSize = 13f
            setShadowLayer(3f, 0f, 1f, 0xFF000000.toInt())
        }
        topBar.addView(tvChannel)

        container.addView(topBar)

        // Bottom Controls HUD
        val bottomControls = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            val params = android.widget.RelativeLayout.LayoutParams(
                android.widget.RelativeLayout.LayoutParams.MATCH_PARENT,
                android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                addRule(android.widget.RelativeLayout.ALIGN_PARENT_BOTTOM)
            }
            layoutParams = params
            setPadding(0, 20, 0, 0)
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            progressDrawable.setColorFilter(0xFF10B981.toInt(), android.graphics.PorterDuff.Mode.SRC_IN)
        }
        bottomControls.addView(progressBar)

        val buttonRow = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(0, 16, 0, 0)
        }

        btnPrev = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_media_previous)
            setBackgroundColor(0x33FFFFFF.toInt())
            setOnClickListener { playPreviousApprovedVideo() }
            setPadding(24, 24, 24, 24)
        }
        buttonRow.addView(btnPrev)

        btnPlayPause = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_media_pause)
            setBackgroundColor(0xFF059669.toInt())
            setOnClickListener { togglePlayPause() }
            setPadding(32, 32, 32, 32)
        }
        val playParams = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            setMargins(32, 0, 32, 0)
        }
        btnPlayPause.layoutParams = playParams
        buttonRow.addView(btnPlayPause)

        btnNext = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_media_next)
            setBackgroundColor(0x33FFFFFF.toInt())
            setOnClickListener { playNextApprovedVideo() }
            setPadding(24, 24, 24, 24)
        }
        buttonRow.addView(btnNext)

        bottomControls.addView(buttonRow)
        container.addView(bottomControls)

        return container
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
        webView.loadDataWithBaseURL("https://www.youtube.com", embedHtml, "text/html", "UTF-8", null)
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
                                'origin': 'https://www.youtube.com'
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
            btnPlayPause.setImageResource(android.R.drawable.ic_media_play)
            safePauseOverlay.visibility = View.VISIBLE
        } else {
            webView.evaluateJavascript("sendCommand('play');", null)
            isPlaying = true
            btnPlayPause.setImageResource(android.R.drawable.ic_media_pause)
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
                        btnPlayPause.setImageResource(android.R.drawable.ic_media_pause)
                        safePauseOverlay.visibility = View.GONE
                        upNextOverlay.visibility = View.GONE
                    }
                    2 -> { // Paused -> Shield against YouTube recommendations
                        isPlaying = false
                        btnPlayPause.setImageResource(android.R.drawable.ic_media_play)
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
}
