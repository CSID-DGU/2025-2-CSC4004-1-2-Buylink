// ai/config/AiUrlPresent.java
package io.github.hayo02.proxyshopping.ai.config;

import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

public class AiUrlPresent implements Condition {
    @Override
    public boolean matches(ConditionContext ctx, AnnotatedTypeMetadata md) {
        String v = ctx.getEnvironment().getProperty("ai.base-url");
        return v != null && !v.isBlank();
    }
}
