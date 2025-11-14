// src/main/java/io/github/hayo02/proxyshopping/ai/dto/CrawlerEnvelope.java
package io.github.hayo02.proxyshopping.ai.dto;

public class CrawlerEnvelope {
    private Boolean success;
    private AiPredictRequest data;
    private Object error;

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }
    public AiPredictRequest getData() { return data; }
    public void setData(AiPredictRequest data) { this.data = data; }
    public Object getError() { return error; }
    public void setError(Object error) { this.error = error; }
}
