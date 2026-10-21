package com.curatetv.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    // Points to the live hosted CurateTV deployment
    private val appUrl = "https://ais-pre-eb3zgm5puel3wpubvj5hdu-599766215321.europe-west3.run.app"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Keep screen on for TV leanback playback
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Immersive Sticky Fullscreen for Smart TVs
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                loadsImagesAutomatically = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                useWideViewPort = true
                loadWithOverviewMode = true
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    // Prevent external browser from intercepting internal routes
                    return false
                }
            }

            webChromeClient = WebChromeClient()
            loadUrl(appUrl)
        }

        setContentView(webView)
    }

    // Forward Smart TV Remote D-Pad & Back key events to web app
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }
}
