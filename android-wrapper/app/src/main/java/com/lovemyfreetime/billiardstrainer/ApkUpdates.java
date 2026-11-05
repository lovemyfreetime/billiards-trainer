package com.lovemyfreetime.billiardstrainer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONObject;

final class ApkUpdates {
    static final boolean SUPPORTED = "com.lovemyfreetime.billiardstrainer".equals(BuildConfig.APPLICATION_ID);
    private static final String RELEASE = "https://github.com/lovemyfreetime/billiards-trainer/releases/download/android-app/";
    private static final long MAX_APK_BYTES = 500L * 1024 * 1024;
    private final Activity activity;
    private final AtomicBoolean running = new AtomicBoolean();

    ApkUpdates(Activity activity) { this.activity = activity; }

    void check() {
        if (!SUPPORTED || !running.compareAndSet(false, true)) return;
        new Thread(() -> {
            try (InputStream stream = open("trainer-update.json")) {
                ByteArrayOutputStream metadata = new ByteArrayOutputStream();
                byte[] buffer = new byte[1024];
                int count;
                while ((count = stream.read(buffer)) != -1) {
                    if (metadata.size() + count > 8192) throw new IOException("Update metadata is too large");
                    metadata.write(buffer, 0, count);
                }
                JSONObject release = new JSONObject(new String(metadata.toByteArray(), StandardCharsets.UTF_8));
                long version = release.getLong("versionCode");
                if (version <= BuildConfig.VERSION_CODE) {
                    message("Android app is up to date.");
                    return;
                }
                long size = release.getLong("size");
                String digest = release.getString("sha256");
                if (size < 1 || size > MAX_APK_BYTES || !digest.matches("[0-9a-f]{64}"))
                    throw new IOException("Invalid update metadata");
                activity.runOnUiThread(() -> {
                    if (activity.isFinishing() || activity.isDestroyed()) return;
                    new AlertDialog.Builder(activity)
                        .setTitle("Android app update available")
                        .setMessage("Download " + ((size + 1048575) / 1048576) + " MB and open Android’s installer?")
                        .setNegativeButton("Later", null)
                        .setPositiveButton("Install app update", (dialog, button) -> install(version, size, digest))
                        .show();
                });
            } catch (Exception e) {
                message("Could not check for an Android app update. Try again when connected.");
            } finally {
                running.set(false);
            }
        }, "trainer-apk-check").start();
    }

    private void install(long version, long size, String digest) {
        if (!activity.getPackageManager().canRequestPackageInstalls()) {
            new AlertDialog.Builder(activity)
                .setTitle("Allow app updates")
                .setMessage("Allow installs from Billiards Trainer in Android settings, then tap Updates again.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Open settings", (dialog, button) -> {
                    try {
                        activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + activity.getPackageName())));
                    } catch (Exception e) {
                        message("Open Android settings and allow installs from Billiards Trainer.");
                    }
                }).show();
            return;
        }
        if (!running.compareAndSet(false, true)) return;
        message("Downloading Android app update…");
        new Thread(() -> {
            File apk = new File(new File(activity.getCacheDir(), "apk-updates"), "Billiards-Trainer-Android.apk");
            try {
                if (!apk.getParentFile().isDirectory() && !apk.getParentFile().mkdirs())
                    throw new IOException("Update storage unavailable");
                MessageDigest hash = MessageDigest.getInstance("SHA-256");
                long total = 0;
                try (InputStream input = open("Billiards-Trainer-Android.apk");
                     FileOutputStream output = new FileOutputStream(apk)) {
                    byte[] buffer = new byte[65536];
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > size) throw new IOException("Unexpected APK size");
                        hash.update(buffer, 0, count);
                        output.write(buffer, 0, count);
                    }
                }
                StringBuilder hex = new StringBuilder(64);
                for (byte value : hash.digest()) hex.append(String.format(java.util.Locale.ROOT, "%02x", value & 255));
                if (total != size || !digest.contentEquals(hex)) throw new IOException("APK checksum mismatch");
                verifyPackage(apk, version);
                activity.runOnUiThread(() -> openInstaller(apk));
            } catch (Exception e) {
                apk.delete();
                message("Android app update could not be verified or downloaded. Try again from Updates.");
            } finally {
                running.set(false);
            }
        }, "trainer-apk-download").start();
    }

    private void verifyPackage(File apk, long version) throws Exception {
        PackageManager manager = activity.getPackageManager();
        int flags = PackageManager.GET_SIGNING_CERTIFICATES;
        PackageInfo installed = manager.getPackageInfo(activity.getPackageName(), flags);
        PackageInfo candidate = manager.getPackageArchiveInfo(apk.getAbsolutePath(), flags);
        if (candidate == null || !activity.getPackageName().equals(candidate.packageName)
                || candidate.getLongVersionCode() != version || version <= installed.getLongVersionCode()
                || candidate.signingInfo == null || installed.signingInfo == null
                || !Arrays.equals(candidate.signingInfo.getApkContentsSigners(), installed.signingInfo.getApkContentsSigners()))
            throw new IOException("APK identity does not match the installed app");
    }

    private void openInstaller(File apk) {
        if (activity.isFinishing() || activity.isDestroyed()) return;
        try {
            Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".apkupdates", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        } catch (Exception e) {
            message("Could not open Android’s installer. Try again from Updates.");
        }
    }

    private static InputStream open(String name) throws IOException {
        URLConnection connection = new URL(RELEASE + name).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setUseCaches(false);
        return connection.getInputStream();
    }

    private void message(String message) {
        activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
    }
}
