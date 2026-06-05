package com.wangxinyang.floatingparticles;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IModel;
import org.thymeleaf.processor.element.IElementModelStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.app.theme.dialect.TemplateHeadProcessor;

@Component
@RequiredArgsConstructor
public class FloatingParticlesHeadProcessor implements TemplateHeadProcessor {

    private static final String SCRIPT_URL =
        "/plugins/floating-particles/assets/static/floating-particles.js";

    private final ReactiveSettingFetcher settingFetcher;

    @Override
    public Mono<Void> process(ITemplateContext context, IModel model,
        IElementModelStructureHandler structureHandler) {
        return settingFetcher.fetch(ParticleSettings.GROUP, ParticleSettings.class)
            .defaultIfEmpty(new ParticleSettings(true, "snow", "none", 80, "#ffffff", 0.55, 1.0,
                true, "all", "", "", false, "pink-pig", "", 2147483000))
            .doOnNext(settings -> addScriptIfEnabled(context, model, settings))
            .then();
    }

    private void addScriptIfEnabled(ITemplateContext context, IModel model,
        ParticleSettings settings) {
        if (!settings.isEnabled()) {
            return;
        }

        var factory = context.getModelFactory();
        model.add(factory.createText("""
            <script>
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
                zIndex: %d
              };
            </script>
            <script defer src="%s"></script>
            """.formatted(
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
            settings.safeZIndex(),
            SCRIPT_URL
        )));
    }

    private String toJsArray(Iterable<String> values) {
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

    private String escapeJs(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("<", "\\u003c")
            .replace(">", "\\u003e")
            .replace("&", "\\u0026");
    }
}
