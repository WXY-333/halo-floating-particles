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
}
