package com.raincatcher.backend.camera;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;

@RestController
@RequestMapping("/api/camera-frame")
public class CameraFrameController {

    private final RestClient restClient;

    public CameraFrameController(@Value("${camera.rpi.base-url}") String rpiBaseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(4));
        requestFactory.setReadTimeout(Duration.ofSeconds(8));
        this.restClient = RestClient.builder()
                .baseUrl(stripTrailingSlash(rpiBaseUrl))
                .requestFactory(requestFactory)
                .build();
    }

    @GetMapping("/latest")
    public ResponseEntity<byte[]> latestFrame() {
        return proxyFrame("/api/camera/latest-frame");
    }

    @GetMapping("/yolo")
    public ResponseEntity<byte[]> yoloFrame() {
        return proxyFrame("/api/camera/yolo-frame");
    }

    private ResponseEntity<byte[]> proxyFrame(String path) {
        try {
            ResponseEntity<byte[]> upstream = restClient.get()
                    .uri(path)
                    .retrieve()
                    .toEntity(byte[].class);

            HttpHeaders headers = new HttpHeaders();
            MediaType contentType = upstream.getHeaders().getContentType();
            headers.setContentType(contentType == null ? MediaType.IMAGE_JPEG : contentType);
            headers.setCacheControl(CacheControl.noCache().cachePrivate().getHeaderValue());
            headers.setPragma("no-cache");
            headers.setExpires(0);
            return new ResponseEntity<>(upstream.getBody(), headers, upstream.getStatusCode());
        } catch (RestClientException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
