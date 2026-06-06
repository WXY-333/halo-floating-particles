package com.wangxinyang.floatingparticles;

import static org.springframework.http.MediaType.APPLICATION_JSON;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.RequestPredicates;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;
import run.halo.app.core.extension.endpoint.CustomEndpoint;
import run.halo.app.extension.GroupVersion;
import run.halo.app.plugin.ReactiveSettingFetcher;

@Component
@RequiredArgsConstructor
public class FloatingParticlesSettingsEndpoint implements CustomEndpoint {

    private final ReactiveSettingFetcher settingFetcher;

    @Override
    public RouterFunction<ServerResponse> endpoint() {
        return RouterFunctions.route()
            .GET("/settings", RequestPredicates.accept(APPLICATION_JSON), request -> getSettings())
            .GET("/settings/latest", RequestPredicates.accept(APPLICATION_JSON), request -> getSettings())
            .build();
    }

    private Mono<ServerResponse> getSettings() {
        return settingFetcher.fetch(ParticleSettings.GROUP, ParticleSettings.class)
            .defaultIfEmpty(FloatingParticlesHeadProcessor.defaultSettings())
            .map(this::toResponse)
            .flatMap(response -> ServerResponse.ok()
                .contentType(APPLICATION_JSON)
                .cacheControl(CacheControl.noStore())
                .bodyValue(response));
    }

    private RuntimeSettingsResponse toResponse(ParticleSettings settings) {
        return new RuntimeSettingsResponse(
            settings.isEnabled(),
            settings.safeEffect(),
            settings.safeCursorEffect(),
            settings.safeCount(),
            settings.safeColor(),
            settings.safeOpacity(),
            settings.safeSpeed(),
            settings.isMobileEnabled(),
            settings.safePageMode(),
            settings.safeIncludePaths(),
            settings.safeExcludePaths(),
            settings.isCursorStyleEnabled(),
            settings.safeCursorStyleTemplate(),
            settings.safeCursorStyleImage(),
            settings.cacheKey(),
            settings.safeZIndex()
        );
    }

    @Override
    public GroupVersion groupVersion() {
        return new GroupVersion("api.floating-particles.halo.run", "v1alpha1");
    }

    record RuntimeSettingsResponse(
        boolean enabled,
        String effect,
        String cursorEffect,
        int count,
        String color,
        double opacity,
        double speed,
        boolean enableMobile,
        String pageMode,
        List<String> includePaths,
        List<String> excludePaths,
        boolean cursorStyleEnabled,
        String cursorStyleTemplate,
        String cursorStyleImage,
        String cacheKey,
        int zIndex
    ) {
    }
}
