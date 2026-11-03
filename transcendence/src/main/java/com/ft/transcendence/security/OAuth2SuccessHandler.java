package com.ft.transcendence.security;

import com.ft.transcendence.model.RefreshToken;
import com.ft.transcendence.model.User;
import com.ft.transcendence.service.MarketGenerationService;
import com.ft.transcendence.service.OAuth2UserService;
import com.ft.transcendence.service.RefreshTokenService;
import com.ft.transcendence.utils.JwtUtils;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2SuccessHandler.class);

    private final OAuth2UserService oauth2UserService;
    private final MarketGenerationService marketGenerationService;
    private final RefreshTokenService refreshTokenService;
    private final JwtUtils jwtUtils;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Value("${server.ssl.enabled:false}")
    private boolean sslEnabled;

    public OAuth2SuccessHandler(OAuth2UserService oauth2UserService,
                                MarketGenerationService marketGenerationService,
                                RefreshTokenService refreshTokenService,
                                JwtUtils jwtUtils) {
        this.oauth2UserService = oauth2UserService;
        this.marketGenerationService = marketGenerationService;
        this.refreshTokenService = refreshTokenService;
        this.jwtUtils = jwtUtils;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        try {
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();

            // Get OAuth2 provider name (from OAuth2AuthenticationToken)
            String provider = getOAuth2Provider(authentication);

            log.debug("OAuth2 login successful for provider: {}", provider);

            // Process OAuth2 user (create or update)
            Map<String, Object> attributes = oauth2User.getAttributes();
            User user = oauth2UserService.processOAuth2User(provider, attributes);

            if ("42".equals(provider) && user.isMarketGenerationConsent()) {
                marketGenerationService.generateMissingMarkets();
            }

            // Generate JWT tokens
            String accessToken = jwtUtils.generateAccessToken(user.getUsername(), user.getRole().toString());
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getUsername());

            // Build redirect URL with tokens
                String resolvedFrontendUrl = resolveFrontendBaseUrl(request);

                String redirectUrl = UriComponentsBuilder
                    .fromUriString(resolvedFrontendUrl + "/auth/oauth2-callback")
                    .queryParam("accessToken", accessToken)
                    .queryParam("refreshToken", refreshToken.getToken())
                    .queryParam("username", user.getUsername())
                    .queryParam("email", user.getEmail())
                    .queryParam("avatarUrl", user.getAvatarUrl())
                    .queryParam("provider", provider)
                    .queryParam("marketConsent", user.isMarketGenerationConsent())
                    .toUriString();

            // Set cookie for refresh token (HttpOnly)
            String refreshTokenCookie = String.format(
                    "refreshToken=%s; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=%d%s",
                    refreshToken.getToken(),
                    7 * 24 * 60 * 60, // 7 days
                    sslEnabled ? "; Secure" : ""
            );
            response.addHeader("Set-Cookie", refreshTokenCookie);

            log.info("OAuth2 user {} authenticated successfully", user.getUsername());
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);

        } catch (Exception e) {
            log.error("OAuth2 authentication failed", e);
            String errorUrl = UriComponentsBuilder
                    .fromUriString(resolveFrontendBaseUrl(request) + "/login")
                    .queryParam("error", "oauth2_failed")
                    .queryParam("message", e.getMessage())
                    .toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorUrl);
        }
    }

    private String resolveFrontendBaseUrl(HttpServletRequest request) {
        // Always use the configured frontend URL. We must NOT trust the OAuth
        // provider's Origin/Referer headers here: after the provider redirects
        // the browser back to our callback, those headers point to the provider
        // (e.g. https://github.com or https://api.intra.42.fr), which would send
        // the user off-site instead of to our app.
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            return frontendUrl.replaceAll("/$", "");
        }

        String scheme = request.getHeader("X-Forwarded-Proto");
        if (scheme == null || scheme.isBlank()) {
            scheme = request.getScheme();
        }

        return scheme + "://" + request.getServerName();
    }

    private String getOAuth2Provider(Authentication authentication) {
        // Extract provider name from OAuth2AuthenticationToken
        if (authentication.getName() != null && !authentication.getName().isBlank()) {
            // Spring sets the principal to the user info, we need to get provider from the token
            try {
                // The authentication object should have the provider information
                if (authentication instanceof org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) {
                    org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken token = 
                        (org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) authentication;
                    return token.getAuthorizedClientRegistrationId(); // Returns "42" or "github"
                }
            } catch (Exception e) {
                log.warn("Could not extract provider from authentication token", e);
            }
        }
        return "unknown";
    }
}
