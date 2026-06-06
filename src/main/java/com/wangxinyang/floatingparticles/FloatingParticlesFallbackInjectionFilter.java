package com.wangxinyang.floatingparticles;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.reactivestreams.Publisher;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.http.server.reactive.ServerHttpResponseDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.ServerWebExchangeDecorator;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Component
public class FloatingParticlesFallbackInjectionFilter implements WebFilter, Ordered {

    private static final List<String> EXCLUDED_PREFIXES = List.of(
        "/apis/",
        "/plugins/",
        "/console",
        "/login",
        "/upload/",
        "/assets/",
        "/themes/",
        "/actuator/"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        if (!shouldHandle(exchange)) {
            return chain.filter(exchange);
        }

        exchange.getResponse().beforeCommit(() -> {
            var headers = exchange.getResponse().getHeaders();
            if (isHtmlResponse(exchange.getResponse())) {
                headers.setCacheControl("no-cache, max-age=0, must-revalidate");
                headers.setPragma("no-cache");
                headers.setExpires(0);
            }
            return Mono.empty();
        });

        var originalResponse = exchange.getResponse();
        var decoratedResponse = new ServerHttpResponseDecorator(originalResponse) {
            @Override
            public Mono<Void> writeWith(Publisher<? extends DataBuffer> body) {
                if (!isHtmlResponse(getDelegate())) {
                    return super.writeWith(body);
                }

                return DataBufferUtils.join(Flux.from(body))
                    .flatMap(dataBuffer -> {
                        var bytes = new byte[dataBuffer.readableByteCount()];
                        dataBuffer.read(bytes);
                        DataBufferUtils.release(dataBuffer);
                        var html = new String(bytes, StandardCharsets.UTF_8);
                        var updatedHtml = injectIfNeeded(html);
                        var updatedBytes = updatedHtml.getBytes(StandardCharsets.UTF_8);
                        getHeaders().setContentLength(updatedBytes.length);
                        return super.writeWith(Mono.just(bufferFactory().wrap(updatedBytes)));
                    });
            }
        };

        return chain.filter(new ServerWebExchangeDecorator(exchange) {
            @Override
            public ServerHttpResponse getResponse() {
                return decoratedResponse;
            }
        });
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE - 20;
    }

    private boolean shouldHandle(ServerWebExchange exchange) {
        var method = exchange.getRequest().getMethod();
        if (method != HttpMethod.GET) {
            return false;
        }

        var path = exchange.getRequest().getPath().pathWithinApplication().value();
        if (EXCLUDED_PREFIXES.stream().anyMatch(path::startsWith)) {
            return false;
        }

        var acceptedTypes = exchange.getRequest().getHeaders().getAccept();
        return acceptedTypes.isEmpty() || acceptedTypes.stream()
            .anyMatch(type -> type.isCompatibleWith(MediaType.TEXT_HTML)
                || type.isCompatibleWith(MediaType.ALL));
    }

    private boolean isHtmlResponse(ServerHttpResponse response) {
        var contentType = response.getHeaders().getContentType();
        return contentType == null || MediaType.TEXT_HTML.isCompatibleWith(contentType);
    }

    private String injectIfNeeded(String html) {
        if (html.contains("floating-particles.js")
            || html.contains("__HALO_FLOATING_PARTICLES__")
            || html.contains("Floating Particles v")) {
            return html;
        }

        var script = FloatingParticlesScriptRenderer.lightweightLoader();
        var lowerHtml = html.toLowerCase();
        var bodyEnd = lowerHtml.indexOf("</body>");
        if (bodyEnd >= 0) {
            return html.substring(0, bodyEnd) + script + html.substring(bodyEnd);
        }

        var headEnd = lowerHtml.indexOf("</head>");
        if (headEnd >= 0) {
            return html.substring(0, headEnd) + script + html.substring(headEnd);
        }

        return html + script;
    }
}
