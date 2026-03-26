package com.jobwatch.apiservice.controllers;

import com.jobwatch.apiservice.models.Company;
import com.jobwatch.apiservice.models.PushSubscription;
import com.jobwatch.apiservice.models.User;
import com.jobwatch.apiservice.models.Watchlist;
import com.jobwatch.apiservice.repositories.CompanyRepository;
import com.jobwatch.apiservice.repositories.PushSubscriptionRepository;
import com.jobwatch.apiservice.repositories.UserRepository;
import com.jobwatch.apiservice.repositories.WatchlistRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final UserRepository userRepository;
    private final WatchlistRepository watchlistRepository;
    private final CompanyRepository companyRepository;

    public PushController(PushSubscriptionRepository pushSubscriptionRepository,
                          UserRepository userRepository,
                          WatchlistRepository watchlistRepository,
                          CompanyRepository companyRepository) {
        this.pushSubscriptionRepository = pushSubscriptionRepository;
        this.userRepository = userRepository;
        this.watchlistRepository = watchlistRepository;
        this.companyRepository = companyRepository;
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody SubscribeRequest request,
                                       Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (pushSubscriptionRepository.existsByUserAndEndpoint(user, request.endpoint())) {
            return ResponseEntity.ok("already subscribed");
        }

        PushSubscription subscription = new PushSubscription();
        subscription.setUser(user);
        subscription.setEndpoint(request.endpoint());
        subscription.setP256dh(request.p256dh());
        subscription.setAuth(request.auth());

        pushSubscriptionRepository.save(subscription);
        return ResponseEntity.ok("subscribed");
    }

    @GetMapping("/internal/subscriptions")
    public ResponseEntity<List<SubscriptionResponse>> getSubscriptionsForCompany(
            @RequestParam String companySlug) {

        Company company = companyRepository.findBySlug(companySlug)
                .orElseThrow(() -> new RuntimeException("Company not found: " + companySlug));

        List<Watchlist> watchers = watchlistRepository.findByCompany(company);

        List<SubscriptionResponse> subscriptions = watchers.stream()
                .flatMap(w -> pushSubscriptionRepository.findByUser(w.getUser()).stream()
                        .map(s -> new SubscriptionResponse(s.getEndpoint(), s.getP256dh(), s.getAuth(), w.getUser().getEmail())))
                .toList();

        return ResponseEntity.ok(subscriptions);
    }

    record SubscribeRequest(String endpoint, String p256dh, String auth) {}
    record SubscriptionResponse(String endpoint, String p256dh, String auth, String userEmail) {}
}
