package com.jobwatch.notificationservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Collection;

@Service
public class PushNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PushNotificationService.class);

    private final PushService pushService;
    private final RestTemplate restTemplate;

    @Value("${api.base-url}")
    private String apiBaseUrl;

    public PushNotificationService(
            @Value("${vapid.public-key}") String publicKey,
            @Value("${vapid.private-key}") String privateKey,
            @Value("${vapid.subject}") String subject) throws Exception {
        this.pushService = new PushService(publicKey, privateKey, subject);
        this.restTemplate = new RestTemplate();
    }

    public void notifySubscribersForCompany(String companySlug, String companyName, String companyLogo, String jobTitle, String jobUrl, String jobCategory, String jobSeniority) {
        String url = apiBaseUrl + "/api/push/internal/subscriptions?companySlug=" + companySlug;

        List<Map> subscriptions = restTemplate.getForObject(url, List.class);
        log.info("Notifying for company {}: {} subscribers found", companySlug, subscriptions == null ? 0 : subscriptions.size());
        if (subscriptions == null || subscriptions.isEmpty()) return;

        String payload;
        try {
            payload = new ObjectMapper().writeValueAsString(Map.of(
                "title", companyName != null ? companyName : companySlug,
                "body", jobTitle != null ? jobTitle : "New job posted",
                "icon", companyLogo != null ? companyLogo : "",
                "url", jobUrl != null ? jobUrl : ""
            ));
        } catch (Exception e) {
            payload = "{\"title\":\"JobWatch\",\"body\":\"New job posted\",\"icon\":\"\"}";
        }

        for (Map sub : subscriptions) {
            String userEmail = (String) sub.get("userEmail");
            if (userEmail != null && !matchesPreferences(userEmail, companySlug, jobCategory, jobSeniority)) {
                continue;
            }

            String endpoint = (String) sub.get("endpoint");
            String p256dh = (String) sub.get("p256dh");
            String auth = (String) sub.get("auth");

            try {
                Subscription subscription = new Subscription(endpoint,
                        new Subscription.Keys(p256dh, auth));
                Notification notification = new Notification(subscription, payload);
                org.apache.http.HttpResponse response = pushService.send(notification);
                int statusCode = response.getStatusLine().getStatusCode();
                String body = new String(response.getEntity().getContent().readAllBytes());
                log.info("Push response: {} body: {} for endpoint {}", statusCode, body, endpoint);
            } catch (Exception e) {
                log.error("Failed to send push to {}: {}: {}", endpoint, e.getClass().getName(), e.getMessage(), e);
            }
        }
    }

    private boolean matchesPreferences(String userEmail, String companySlug, String jobCategory, String jobSeniority) {
        try {
            String url = apiBaseUrl + "/internal/preferences?email=" + userEmail;
            Map prefs = restTemplate.getForObject(url, Map.class);
            if (prefs == null) return true;

            List<String> categories = (List<String>) prefs.get("categories");
            List<String> seniorities = (List<String>) prefs.get("seniorities");
            List<String> mutedCompanies = (List<String>) prefs.get("mutedCompanies");

            // Muted company — skip entirely
            if (mutedCompanies != null && mutedCompanies.contains(companySlug)) return false;

            // Empty list = no filter = allow all
            if (categories != null && !categories.isEmpty() && !categories.contains(jobCategory)) return false;
            if (seniorities != null && !seniorities.isEmpty() && !seniorities.contains(jobSeniority)) return false;

            return true;
        } catch (Exception e) {
            // If preferences can't be fetched, default to sending the notification
            return true;
        }
    }
}
