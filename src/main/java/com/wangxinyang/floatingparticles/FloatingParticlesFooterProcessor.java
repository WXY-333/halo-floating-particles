package com.wangxinyang.floatingparticles;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.ITemplateContext;
import org.thymeleaf.model.IModel;
import org.thymeleaf.model.IProcessableElementTag;
import org.thymeleaf.processor.element.IElementTagStructureHandler;
import reactor.core.publisher.Mono;
import run.halo.app.plugin.ReactiveSettingFetcher;
import run.halo.app.theme.dialect.TemplateFooterProcessor;

@Component
@RequiredArgsConstructor
public class FloatingParticlesFooterProcessor implements TemplateFooterProcessor {

    private final ReactiveSettingFetcher settingFetcher;

    @Override
    public Mono<Void> process(ITemplateContext context, IProcessableElementTag tag,
        IElementTagStructureHandler structureHandler, IModel model) {
        return settingFetcher.fetch(ParticleSettings.GROUP, ParticleSettings.class)
            .defaultIfEmpty(FloatingParticlesHeadProcessor.defaultSettings())
            .doOnNext(settings -> addScriptIfEnabled(context, model, settings))
            .then();
    }

    private void addScriptIfEnabled(ITemplateContext context, IModel model,
        ParticleSettings settings) {
        var script = FloatingParticlesScriptRenderer.render(settings);
        if (script.isBlank()) {
            return;
        }

        var factory = context.getModelFactory();
        model.add(factory.createText(script));
    }
}
