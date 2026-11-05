# Proguard / R8 Configuration for GreenKid TV

# Keep WebView JavaScript Interface callbacks for YouTube Player integration
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Data Models (used in JSON parsing & Intent serialization)
-keep class com.greenkidtv.app.model.** { *; }
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# AndroidX WebKit support
-keep class androidx.webkit.** { *; }

# Kotlin Coroutines reflection & dispatchers
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-dontwarn kotlinx.coroutines.**
