// src/main/java/io/github/hayo02/proxyshopping/ai/dto/AiPredictResponse.java
package io.github.hayo02.proxyshopping.ai.dto;

public class AiPredictResponse {
    private Double weight; // kg
    private Double volume; // m^3

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }
    public Double getVolume() { return volume; }
    public void setVolume(Double volume) { this.volume = volume; }
}
