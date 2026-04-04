package com.jobwatch.apiservice.controllers;

import com.jobwatch.apiservice.models.Company;
import com.jobwatch.apiservice.models.Job;
import com.jobwatch.apiservice.repositories.CompanyRepository;
import com.jobwatch.apiservice.repositories.JobRepository;
import com.jobwatch.apiservice.services.JobService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
public class JobController {

    private final JobService jobService;
    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;

    public JobController(JobService jobService, CompanyRepository companyRepository, JobRepository jobRepository) {
        this.jobService = jobService;
        this.companyRepository = companyRepository;
        this.jobRepository = jobRepository;
    }

    @GetMapping("/internal/companies")
    public ResponseEntity<List<Company>> getCompanies() {
        return ResponseEntity.ok(companyRepository.findAll());
    }

    @GetMapping("/internal/jobs/external-ids")
    public ResponseEntity<List<String>> getExternalIds(@RequestParam String companySlug) {
        return ResponseEntity.ok(jobRepository.findExternalIdsByCompanySlug(companySlug));
    }

    @DeleteMapping("/internal/jobs/stale")
    public ResponseEntity<?> deleteStaleJobs(@RequestParam String companySlug, @RequestBody List<String> liveIds) {
        jobRepository.deleteStaleByCompanySlug(companySlug, liveIds);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/api/jobs")
    public ResponseEntity<List<Job>> getJobs(
            Authentication authentication,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) List<String> seniority,
            @RequestParam(defaultValue = "false") boolean usOnly) {
        List<Job> jobs = jobService.getJobsForUser(authentication.getName(), category, seniority, usOnly);
        return ResponseEntity.ok(jobs);
    }

    @PostMapping("/internal/jobs")
    public ResponseEntity<?> ingestJob(@RequestBody JobIngestRequest request) {
        Job job = jobService.ingestJob(
                request.externalId(),
                request.title(),
                request.location(),
                request.url(),
                request.updatedAt(),
                request.platform(),
                request.companySlug()
        );

        if (job == null) {
            return ResponseEntity.ok("duplicate");
        }

        return ResponseEntity.ok(job);
    }

    record JobIngestRequest(
            String externalId,
            String title,
            String location,
            String url,
            String updatedAt,
            String platform,
            String companySlug
    ) {}
}
