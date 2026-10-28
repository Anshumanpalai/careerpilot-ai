package com.careerpilot.service.ai;

public record AiRawResult(
        String provider,
        String model,
        String content
) {
}
