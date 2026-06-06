package com.wangxinyang.floatingparticles;

final class FloatingParticlesScriptRenderer {

    private static final String SCRIPT_URL =
        "/plugins/floating-particles/assets/static/floating-particles.js";
    private static final String SETTINGS_URL =
        "/apis/api.floating-particles.halo.run/v1alpha1/settings/latest";
    static final String BUILD_VERSION = "1.0.8";

    private FloatingParticlesScriptRenderer() {
    }

    static String lightweightLoader() {
        var scriptUrl = SCRIPT_URL + "?v=" + BUILD_VERSION;
        return """
            <!-- Floating Particles v%s fallback -->
            <script>
            (function () {
              if (document.querySelector('script[data-halo-floating-particles="true"]')) return;
              var script = document.createElement("script");
              script.defer = true;
              script.src = "%s";
              script.dataset.haloFloatingParticles = "true";
              (document.head || document.documentElement).appendChild(script);
            })();
            </script>
            """.formatted(BUILD_VERSION, escapeJs(scriptUrl));
    }

    static String render(ParticleSettings settings) {
        if (!settings.isEnabled()) {
            return "";
        }

        var scriptUrl = SCRIPT_URL + "?v=" + BUILD_VERSION + "-" + settings.cacheKey();
        return """
            <!-- Floating Particles v%s -->
            <script>
            (function () {
              window.__HALO_FLOATING_PARTICLES__ = {
                effect: "%s",
                cursorEffect: "%s",
                count: %d,
                color: "%s",
                opacity: %.2f,
                speed: %.2f,
                enableMobile: %s,
                pageMode: "%s",
                includePaths: %s,
                excludePaths: %s,
                cursorStyleEnabled: %s,
                cursorStyleTemplate: "%s",
                cursorStyleImage: "%s",
                cacheKey: "%s",
                runtimeSettingsUrl: "%s",
                zIndex: %d
              };
              if (!document.querySelector('script[data-halo-floating-particles="true"]')) {
                var script = document.createElement("script");
                script.defer = true;
                script.src = "%s";
                script.dataset.haloFloatingParticles = "true";
                (document.head || document.documentElement).appendChild(script);
              }
            })();
            </script>
            """.formatted(
            BUILD_VERSION,
            settings.safeEffect(),
            settings.safeCursorEffect(),
            settings.safeCount(),
            settings.safeColor(),
            settings.safeOpacity(),
            settings.safeSpeed(),
            settings.isMobileEnabled(),
            settings.safePageMode(),
            toJsArray(settings.safeIncludePaths()),
            toJsArray(settings.safeExcludePaths()),
            settings.isCursorStyleEnabled(),
            settings.safeCursorStyleTemplate(),
            escapeJs(settings.safeCursorStyleImage()),
            settings.cacheKey(),
            SETTINGS_URL,
            settings.safeZIndex(),
            escapeJs(scriptUrl)
        );
    }

    private static String toJsArray(Iterable<String> values) {
        var builder = new StringBuilder("[");
        var first = true;
        for (var value : values) {
            if (!first) {
                builder.append(", ");
            }
            builder.append("\"").append(escapeJs(value)).append("\"");
            first = false;
        }
        return builder.append("]").toString();
    }

    private static String escapeJs(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("<", "\\u003c")
            .replace(">", "\\u003e")
            .replace("&", "\\u0026");
    }
}
