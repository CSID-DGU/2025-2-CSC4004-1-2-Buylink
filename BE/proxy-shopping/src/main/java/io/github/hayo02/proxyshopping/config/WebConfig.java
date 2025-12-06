package io.github.hayo02.proxyshopping.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry reg) {
        reg.addMapping("/api/**")
                .allowedOrigins(
                        "http://localhost:3000",
                        "http://localhost:17780",
                        "http://211.188.56.255:17780",
                        "https://dgu-buylink.vercel.app"
                )
                .allowedMethods("GET","POST","PUT","DELETE","PATCH","OPTIONS")
                .allowCredentials(true);
    }
}
