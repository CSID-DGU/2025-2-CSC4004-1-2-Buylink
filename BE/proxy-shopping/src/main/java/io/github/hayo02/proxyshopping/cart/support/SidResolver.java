package io.github.hayo02.proxyshopping.cart.support;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.UUID;

@Component
public class SidResolver {

    public String resolve(HttpServletRequest req, HttpServletResponse res) {

        // 디버깅용: 들어온 쿠키 / 헤더 확인
        System.out.println("[SID] cookies = " + Arrays.toString(req.getCookies()));

        // 1) 쿠키 우선
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if ("proxy_sid".equals(c.getName())
                        && c.getValue() != null
                        && !c.getValue().isBlank()) {
                    System.out.println("[SID] from cookie = " + c.getValue());
                    return c.getValue();
                }
            }
        }

        // 2) 헤더 SID (테스트용/도구용)
        String hdr = req.getHeader("X-Proxy-SID");
        System.out.println("[SID] header X-Proxy-SID = " + hdr);
        if (hdr != null && !hdr.isBlank()) {
            System.out.println("[SID] from header = " + hdr);
            return hdr;
        }

        // 3) 아무 것도 없으면 새로 발급
        String sid = "sid-" + UUID.randomUUID();
        System.out.println("[SID] generated new sid = " + sid);

        Cookie cookie = new Cookie("proxy_sid", sid);
        cookie.setHttpOnly(false); // 프론트 JS에서 읽으려면 false
        cookie.setPath("/");       // 전체 경로에서 사용

        res.addCookie(cookie);

        return sid;
    }
}
