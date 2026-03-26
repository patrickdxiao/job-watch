package com.jobwatch.apiservice.services;

import com.jobwatch.apiservice.models.Company;
import com.jobwatch.apiservice.models.Job;
import com.jobwatch.apiservice.models.User;
import com.jobwatch.apiservice.repositories.CompanyRepository;
import com.jobwatch.apiservice.repositories.JobRepository;
import com.jobwatch.apiservice.repositories.UserRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Collection;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    public JobService(JobRepository jobRepository, CompanyRepository companyRepository,
                      UserRepository userRepository) {
        this.jobRepository = jobRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    public List<Job> getJobsForUser(String email, List<String> categories, List<String> seniorities, boolean usOnly) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return jobRepository.findJobsForWatchlistFiltered(user, categories, seniorities, usOnly);
    }

    public Job ingestJob(String externalId, String title, String location,
                         String url, String updatedAt, String platform, String companySlug) {

        if (jobRepository.existsByExternalId(externalId)) {
            return null;
        }

        Company company = companyRepository.findBySlug(companySlug)
                .orElseThrow(() -> new RuntimeException("Company not found: " + companySlug));

        Job job = new Job();
        job.setExternalId(externalId);
        job.setTitle(title);
        job.setLocation(location);
        job.setUrl(url);
        job.setUpdatedAt(updatedAt);
        job.setPlatform(platform);
        job.setCompany(company);
        job.setCategory(JobClassifier.classifyCategory(title));
        job.setSeniority(JobClassifier.classifySeniority(title));

        return jobRepository.save(job);
    }
}
