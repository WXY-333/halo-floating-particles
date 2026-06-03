package com.wangxinyang.floatingparticles;

public record ParticleSettings(
    Boolean enabled,
    String effect,
    String cursorEffect,
    Integer count,
    String color,
    Double opacity,
    Double speed
) {
    public static final String GROUP = "appearance";

    public boolean isEnabled() {
        return enabled == null || enabled;
    }

    public String safeEffect() {
        if (effect == null || effect.isBlank()) {
            return "snow";
        }
        return switch (effect) {
            case "none", "snow", "stars", "bubbles", "fireflies", "sakura", "ripple",
                "meteors", "leaves", "network", "stardust", "confetti", "rain" -> effect;
            default -> "snow";
        };
    }

    public String safeCursorEffect() {
        if (cursorEffect == null || cursorEffect.isBlank()) {
            return "none";
        }
        return switch (cursorEffect) {
            case "none", "fireworks", "ripple", "trail", "stars", "preset-stars", "hearts", "halo",
                "webgl-tail" -> cursorEffect;
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
}
