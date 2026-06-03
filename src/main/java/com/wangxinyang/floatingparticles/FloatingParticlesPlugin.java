package com.wangxinyang.floatingparticles;

import org.springframework.stereotype.Component;
import run.halo.app.plugin.BasePlugin;
import run.halo.app.plugin.PluginContext;

/**
 * Plugin main class to manage the lifecycle of the plugin.
 *
 * @author Wangxinyng
 * @since 1.0.0
 */
@Component
public class FloatingParticlesPlugin extends BasePlugin {

    public FloatingParticlesPlugin(PluginContext pluginContext) {
        super(pluginContext);
    }

    @Override
    public void start() {
        System.out.println("Floating Particles plugin started.");
    }

    @Override
    public void stop() {
        System.out.println("Floating Particles plugin stopped.");
    }
}
