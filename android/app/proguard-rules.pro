# ─────────────────────────────────────────────────────────────
# R8 / ProGuard 규칙 (release 빌드에서만 적용)
#  - mapping 파일: app/build/outputs/mapping/release/mapping.txt
#  - Play Console 업로드 시 이 파일을 함께 올려야 스택트레이스가 복원된다.
# ─────────────────────────────────────────────────────────────

# 난독화된 스택트레이스 복원용 정보 유지 (Crashlytics/Play 크래시 분석)
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-renamesourcefileattribute SourceFile

# ── React Native 코어 ──
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keepclassmembers class * { @com.facebook.common.internal.DoNotStrip *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod <methods>; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-dontwarn com.facebook.react.**

# JNI 로 접근하는 네이티브 메서드
-keepclasseswithmembernames class * { native <methods>; }

# ── Hermes ──
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jsi.** { *; }

# ── Reanimated / Worklets / Gesture Handler ──
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# ── Expo ──
-keep class expo.modules.** { *; }
-keepclassmembers class * { @expo.modules.core.interfaces.ExpoProp <methods>; }
-keepclassmembers class * { @expo.modules.core.interfaces.ExpoMethod <methods>; }
-dontwarn expo.modules.**

# ── Firebase / Crashlytics / Analytics ──
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-dontwarn com.google.firebase.**
-dontwarn io.invertase.firebase.**

# ── Google Mobile Ads (AdMob) / Play Services ──
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-dontwarn com.google.android.gms.**

# ── 인앱 결제 (react-native-iap / Play Billing) ──
-keep class com.android.billingclient.** { *; }
-keep class com.dooboolab.** { *; }
-dontwarn com.android.billingclient.**

# ── notifee (알림) ──
-keep class app.notifee.** { *; }
-dontwarn app.notifee.**

# ── OkHttp / Okio (네트워크) ──
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**

# ── Kotlin ──
-dontwarn kotlin.**
-dontwarn kotlinx.**
-keepclassmembers class **$WhenMappings { <fields>; }

# ── Enum (직렬화·Bridge 변환에서 이름으로 접근) ──
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Parcelable / Serializable ──
-keepclassmembers class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
