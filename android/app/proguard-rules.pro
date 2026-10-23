# R8/ProGuard 규칙
# -------------------------------------------------
# minifyEnabled 는 android/gradle.properties 의 android.enableMinifyInReleaseBuilds=true 로 켜져 있다.
# 대부분의 라이브러리는 자체 consumer 룰(aar 안에 포함)을 들고 오므로 여기에는
# 리플렉션으로만 접근돼 R8 이 못 보는 것과, 크래시 로그 판독에 필요한 속성만 남긴다.

# ────────────────────────────── 크래시 판독 (Play Console 난독화 매핑)
# 스택트레이스에 원본 파일명·줄번호를 남긴다. 이 속성이 없으면 mapping.txt 를 올려도
# 줄번호가 복원되지 않아 ANR/비정상 종료 분석이 반쪽이 된다.
-keepattributes SourceFile,LineNumberTable
# 원본 파일명은 감추고 줄번호만 살린다 (mapping.txt 로 복원 가능)
-renamesourcefileattribute SourceFile
# 제네릭·애노테이션·예외 정보 — 리플렉션 기반 라이브러리(Firebase, Gson 계열)가 참조한다
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*,Exceptions

# ────────────────────────────── React Native 코어
# @DoNotStrip / @ReactModule 로 표시된 네이티브 브릿지 진입점은 JS 에서 이름으로 찾는다
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keep @com.facebook.jni.annotations.DoNotStrip class * { *; }
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.jni.annotations.DoNotStrip *;
}
# JNI 로 호출되는 네이티브 메서드
-keepclasseswithmembernames class * {
    native <methods>;
}
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.jni.** { *; }

# ────────────────────────────── Expo 모듈
# expo-modules-core 는 모듈/뷰를 리플렉션으로 등록한다 (expo-audio, expo-font, expo-image 등 전부 해당)
-keep class expo.modules.** { *; }
-keep class * extends expo.modules.core.interfaces.Package { *; }
-keep class * extends expo.modules.kotlin.modules.Module { *; }

# ────────────────────────────── Reanimated / Worklets
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.common.** { *; }

# ────────────────────────────── Notifee (알림)
# 알림 데이터 클래스를 JSON 으로 직렬화해 주고받아 필드명이 그대로 유지돼야 한다
-keep class io.invertase.notifee.** { *; }
-keep class app.notifee.core.** { *; }
-keep interface app.notifee.core.** { *; }

# ────────────────────────────── Firebase (Analytics / Crashlytics)
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
# Crashlytics 가 심볼을 붙일 수 있도록 예외 클래스명은 지우지 않는다
-keep public class * extends java.lang.Exception

# ────────────────────────────── 광고 (Google Mobile Ads)
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.**

# ────────────────────────────── 그 외 네이티브 모듈
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.horcrux.svg.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.zoontek.rnpermissions.** { *; }
-keep class com.learnium.RNDeviceInfo.** { *; }
-keep class com.reactnativecommunity.netinfo.** { *; }
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ────────────────────────────── 경고 억제 (빌드만 막고 실제로는 쓰이지 않는 참조)
-dontwarn javax.annotation.**
-dontwarn org.jetbrains.annotations.**
-dontwarn kotlin.Unit
