package com.wangxinyang.floatingparticles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class ParticleSettingsTest {

    @Test
    void shouldUseSafeDefaults() {
        var settings = new ParticleSettings(null, "unknown", "unknown", 999, "red", 3.5, 0.1,
            null, "bad", "/about\narchives", "/admin\n\nlinks", null, "bad", "javascript:alert(1)", -10);

        assertTrue(settings.isEnabled());
        assertTrue(settings.isMobileEnabled());
        assertEquals("snow", settings.safeEffect());
        assertEquals("none", settings.safeCursorEffect());
        assertEquals(200, settings.safeCount());
        assertEquals("#ffffff", settings.safeColor());
        assertEquals(1, settings.safeOpacity());
        assertEquals(0.2, settings.safeSpeed());
        assertEquals("all", settings.safePageMode());
        assertTrue(!settings.isCursorStyleEnabled());
        assertEquals("pink-pig", settings.safeCursorStyleTemplate());
        assertEquals("", settings.safeCursorStyleImage());
        assertEquals(0, settings.safeZIndex());
        assertEquals(List.of("/about", "/archives"), settings.safeIncludePaths());
        assertEquals(List.of("/admin", "/links"), settings.safeExcludePaths());
    }

    @Test
    void shouldAllowPageRippleEffect() {
        var settings = new ParticleSettings(true, "ripple", "ripple", 80, "#ffffff", 0.55, 1.0,
            true, "all", "", "", false, "pink-pig", "", 2147483000);

        assertEquals("ripple", settings.safeEffect());
        assertEquals("ripple", settings.safeCursorEffect());
    }

    @Test
    void shouldAllowNewParticleEffects() {
        assertEquals("meteors", settings("meteors", "none").safeEffect());
        assertEquals("leaves", settings("leaves", "none").safeEffect());
        assertEquals("network", settings("network", "none").safeEffect());
        assertEquals("stardust", settings("stardust", "none").safeEffect());
        assertEquals("confetti", settings("confetti", "none").safeEffect());
        assertEquals("rain", settings("rain", "none").safeEffect());
        assertEquals("dandelion", settings("dandelion", "none").safeEffect());
        assertEquals("feathers", settings("feathers", "none").safeEffect());
        assertEquals("aurora", settings("aurora", "none").safeEffect());
        assertEquals("constellations", settings("constellations", "none").safeEffect());
        assertEquals("notes", settings("notes", "none").safeEffect());
        assertEquals("lightspots", settings("lightspots", "none").safeEffect());
        assertEquals("firefly-cluster", settings("firefly-cluster", "none").safeEffect());
    }

    @Test
    void shouldAllowNewCursorEffects() {
        assertEquals("trail", settings("snow", "trail").safeCursorEffect());
        assertEquals("stars", settings("snow", "stars").safeCursorEffect());
        assertEquals("preset-stars", settings("snow", "preset-stars").safeCursorEffect());
        assertEquals("hearts", settings("snow", "hearts").safeCursorEffect());
        assertEquals("halo", settings("snow", "halo").safeCursorEffect());
        assertEquals("webgl-tail", settings("snow", "webgl-tail").safeCursorEffect());
        assertEquals("click-bubbles", settings("snow", "click-bubbles").safeCursorEffect());
        assertEquals("click-flowers", settings("snow", "click-flowers").safeCursorEffect());
        assertEquals("rainbow-trail", settings("snow", "rainbow-trail").safeCursorEffect());
        assertEquals("magnet", settings("snow", "magnet").safeCursorEffect());
    }

    @Test
    void shouldAllowCursorStyleSettings() {
        var settings = new ParticleSettings(true, "snow", "none", 80, "#ffffff", 0.55, 1.0,
            true, "all", "", "", true, "nyanko", "/upload/cursor.cur", 2147483000);

        assertTrue(settings.isCursorStyleEnabled());
        assertEquals("nyanko", settings.safeCursorStyleTemplate());
        assertEquals("/upload/cursor.cur", settings.safeCursorStyleImage());
    }

    @Test
    void shouldAllowKurokoTetsuyaCursorTemplate() {
        var settings = new ParticleSettings(true, "snow", "none", 80, "#ffffff", 0.55, 1.0,
            true, "all", "", "", true, "kuroko-tetsuya", "", 2147483000);

        assertEquals("kuroko-tetsuya", settings.safeCursorStyleTemplate());
    }

    @Test
    void shouldRejectAniCursorStyleImage() {
        var settings = new ParticleSettings(true, "snow", "none", 80, "#ffffff", 0.55, 1.0,
            true, "all", "", "", true, "nyanko", "/upload/cursor.ani?version=1", 2147483000);

        assertEquals("", settings.safeCursorStyleImage());
    }

    private ParticleSettings settings(String effect, String cursorEffect) {
        return new ParticleSettings(true, effect, cursorEffect, 80, "#ffffff", 0.55, 1.0,
            true, "all", "", "", false, "pink-pig", "", 2147483000);
    }
}
