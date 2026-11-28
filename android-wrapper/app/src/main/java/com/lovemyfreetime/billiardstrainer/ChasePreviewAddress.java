package com.lovemyfreetime.billiardstrainer;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Pattern;

final class ChasePreviewAddress {
    private static final Pattern HOST = Pattern.compile(
        "(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.){2,}ts\\.net");

    static String normalize(String input) {
        if (input == null || input.length() > 320) return null;
        try {
            URI uri = URI.create(input.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null
                    || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || !uri.getRawPath().isEmpty() && !"/".equals(uri.getRawPath())) return null;
            String host = uri.getHost().toLowerCase(Locale.ROOT);
            int port = uri.getPort();
            if (host.length() > 253 || !HOST.matcher(host).matches()
                    || (port != -1 && (port < 1 || port > 65535))) return null;
            return "https://" + host + (port == -1 || port == 443 ? "" : ":" + port) + "/";
        } catch (IllegalArgumentException invalid) {
            return null;
        }
    }

    static boolean sameOrigin(String configured, String requested) {
        try {
            URI uri = URI.create(requested);
            return configured.equals(normalize("https://" + uri.getRawAuthority() + "/"))
                && "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                && uri.getUserInfo() == null;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }
}
