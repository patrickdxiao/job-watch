package com.jobwatch.notificationservice;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal")
public class JobListener {

    private final PushNotificationService pushNotificationService;

    public JobListener(PushNotificationService pushNotificationService) {
        this.pushNotificationService = pushNotificationService;
    }

    @PostMapping("/notify")
    public ResponseEntity<?> onNewJob(@RequestBody NotifyRequest request) {
        if (request.companySlug() != null) {
            pushNotificationService.notifySubscribersForCompany(
                request.companySlug(), request.companyName(), request.companyLogo(),
                request.jobTitle(), request.jobUrl(), request.category(), request.seniority()
            );
        }
        return ResponseEntity.ok().build();
    }

    record NotifyRequest(String companySlug, String companyName, String companyLogo, String jobTitle, String jobUrl, String category, String seniority) {}
}
