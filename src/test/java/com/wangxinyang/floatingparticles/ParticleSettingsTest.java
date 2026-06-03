package com.wangxinyang.floatingparticles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ParticleSettingsTest {

    @Test
    void shouldUseSafeDefaults() {
        var settings = new ParticleSettings(null, "unknown", "unknown", 999, "red", 3.5, 0.1);

        assertTrue(settings.isEnabled());
        assertEquals("snow", settings.safeEffect());
        assertEquals("none", settings.safeCursorEffect());
        assertEquals(200, settings.safeCount());
        assertEquals("#ffffff", settings.safeColor());
        assertEquals(1, settings.safeOpacity());
        assertEquals(0.2, settings.safeSpeed());
    }

    @Test
    void shouldAllowPageRippleEffect() {
        var settings = new ParticleSettings(true, "ripple", "ripple", 80, "#ffffff", 0.55, 1.0);

        assertEquals("ripple", settings.safeEffect());
        assertEquals("ripple", settings.safeCursorEffect());
    }

    @Test
    void shouldAllowNewParticleEffects() {
        assertEquals("meteors", new ParticleSettings(true, "meteors", "none", 80, "#ffffff", 0.55, 1.0).safeEffect());
        assertEquals("leaves", new ParticleSettings(true, "leaves", "none", 80, "#ffffff", 0.55, 1.0).safeEffect());
        assertEquals("network", new ParticleSettings(true, "network", "none", 80, "#ffffff", 0.55, 1.0).safeEffect());
        assertEquals("stardust", new ParticleSettings(true, "stardust", "none", 80, "#ffffff", 0.55, 1.0).safeEffect());
        assertEquals("confetti", new ParticleSettings(true, "confetti", "none", 80, "#ffffff", 0.55, 1.0).safeEffect());
        assertEquals("rain", new ParticleSettings(true, "rain", "none", 80, "#ffffff", 0.55, 1.0).safeEffect());
    }

    @Test
    void shouldAllowNewCursorEffects() {
        assertEquals("trail", new ParticleSettings(true, "snow", "trail", 80, "#ffffff", 0.55, 1.0).safeCursorEffect());
        assertEquals("stars", new ParticleSettings(true, "snow", "stars", 80, "#ffffff", 0.55, 1.0).safeCursorEffect());
        assertEquals("preset-stars", new ParticleSettings(true, "snow", "preset-stars", 80, "#ffffff", 0.55, 1.0).safeCursorEffect());
        assertEquals("hearts", new ParticleSettings(true, "snow", "hearts", 80, "#ffffff", 0.55, 1.0).safeCursorEffect());
        assertEquals("halo", new ParticleSettings(true, "snow", "halo", 80, "#ffffff", 0.55, 1.0).safeCursorEffect());
        assertEquals("webgl-tail", new ParticleSettings(true, "snow", "webgl-tail", 80, "#ffffff", 0.55, 1.0).safeCursorEffect());
    }
}
