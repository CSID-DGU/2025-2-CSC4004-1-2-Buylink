// cart/support/SidResolver.java
package io.github.hayo02.proxyshopping.cart.support;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SidResolver {

    private final String defaultSid;

    public SidResolver(@Value("${app.cart.default-sid:sid-demo-1}") String defaultSid) {
        this.defaultSid = defaultSid;
    }

    public String resolve(HttpServletRequest req, HttpServletResponse res) {
        // 1) 쿠키 우선
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if ("proxy_sid".equals(c.getName()) && c.getValue() != null && !c.getValue().isBlank()) {
                    return c.getValue();
                }
            }
        }
        // 2) 헤더(선택)
        String hdr = req.getHeader("X-Proxy-SID");
        if (hdr != null && !hdr.isBlank()) return hdr;

        // 3) 없으면 발급 후 쿠키 세팅
        String sid = defaultSid != null && !defaultSid.isBlank() ? defaultSid : "sid-" + UUID.randomUUID();
        System.out.println("[SID] default=" + defaultSid + " -> using=" + sid);  // ← 바인딩 확인
        Cookie cookie = new Cookie("proxy_sid", sid);
        cookie.setHttpOnly(false);
        cookie.setPath("/");
        // 개발 편의상 만료 미설정(세션 쿠키) — 필요 시 setMaxAge(7*24*3600)
        res.addCookie(cookie);

        return sid;

    }
}