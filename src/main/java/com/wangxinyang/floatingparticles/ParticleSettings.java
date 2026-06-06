package com.wangxinyang.floatingparticles;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

public record ParticleSettings(
    Boolean enabled,
    String effect,
    String cursorEffect,
    Integer count,
    String color,
    Double opacity,
    Double speed,
    Boolean enableMobile,
    String pageMode,
    String includePaths,
    String excludePaths,
    Boolean cursorStyleEnabled,
    String cursorStyleTemplate,
    String cursorStyleImage,
    Integer zIndex
) {
    public static final String GROUP = "appearance";

    public boolean isEnabled() {
        return enabled == null || enabled;
    }

    public boolean isMobileEnabled() {
        return enableMobile == null || enableMobile;
    }

    public String safeEffect() {
        if (effect == null || effect.isBlank()) {
            return "snow";
        }
        return switch (effect) {
            case "none", "snow", "stars", "bubbles", "fireflies", "sakura", "ripple",
                "meteors", "leaves", "network", "stardust", "confetti", "rain",
                "dandelion", "feathers", "aurora", "constellations", "notes", "lightspots",
                "firefly-cluster" -> effect;
            default -> "snow";
        };
    }

    public String safeCursorEffect() {
        if (cursorEffect == null || cursorEffect.isBlank()) {
            return "none";
        }
        return switch (cursorEffect) {
            case "none", "fireworks", "ripple", "trail", "stars", "preset-stars", "hearts", "halo",
                "webgl-tail", "click-bubbles", "click-flowers", "rainbow-trail", "magnet" -> cursorEffect;
            default -> "none";
        };
    }

    public int safeCount() {
        var value = count == null ? 80 : count;
        return Math.max(20, Math.min(value, 200));
    }

    public String safeColor() {
        if (color == null || !color.matches("^#[0-9a-fA-F]{6}$")) {
            return "#ffffff";
        }
        return color;
    }

    public double safeOpacity() {
        var value = opacity == null ? 0.55 : opacity;
        return Math.max(0.1, Math.min(value, 1));
    }

    public double safeSpeed() {
        var value = speed == null ? 1 : speed;
        return Math.max(0.2, Math.min(value, 3));
    }

    public String safePageMode() {
        if (pageMode == null || pageMode.isBlank()) {
            return "all";
        }
        return switch (pageMode) {
            case "all", "include", "exclude" -> pageMode;
            default -> "all";
        };
    }

    public int safeZIndex() {
        var value = zIndex == null ? 2147483000 : zIndex;
        return Math.max(0, value);
    }

    public boolean isCursorStyleEnabled() {
        return cursorStyleEnabled != null && cursorStyleEnabled;
    }

    public String safeCursorStyleTemplate() {
        if (cursorStyleTemplate == null || cursorStyleTemplate.isBlank()) {
            return "bocchi-gotou";
        }
        return switch (cursorStyleTemplate) {
            case "pink-pig", "nyanko", "miku", "miku-blz", "anya", "bocchi-nijika", "bocchi-gotou",
                "bocchi-ryo", "kuroko-tetsuya" -> cursorStyleTemplate;
            default -> "bocchi-gotou";
        };
    }

    public String safeCursorStyleImage() {
        if (cursorStyleImage == null || cursorStyleImage.isBlank()) {
            return "";
        }
        var value = cursorStyleImage.trim();
        var lowerValue = value.toLowerCase(Locale.ROOT);
        if (lowerValue.startsWith("javascript:") || lowerValue.startsWith("data:")
            || lowerValue.split("[?#]", 2)[0].endsWith(".ani")) {
            return "";
        }
        return value;
    }

    public String cacheKey() {
        return Integer.toHexString(Objects.hash(
            safeEffect(),
            safeCursorEffect(),
            safeCount(),
            safeColor(),
            safeOpacity(),
            safeSpeed(),
            isMobileEnabled(),
            safePageMode(),
            safeIncludePaths(),
            safeExcludePaths(),
            isCursorStyleEnabled(),
            safeCursorStyleTemplate(),
            safeCursorStyleImage(),
            safeZIndex()
        ));
    }

    public List<String> safeIncludePaths() {
        return safePathLines(includePaths);
    }

    public List<String> safeExcludePaths() {
        return safePathLines(excludePaths);
    }

    private List<String> safePathLines(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split("\\R"))
            .map(String::trim)
            .filter(path -> !path.isBlank())
            .map(this::normalizePath)
            .distinct()
            .limit(60)
            .toList();
    }

    private String normalizePath(String path) {
        if (!path.startsWith("/")) {
            return "/" + path;
        }
        return path;
    }
}
